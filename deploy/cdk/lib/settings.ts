// What may differ from one AWS account to another, read from the CDK context:
// cdk.json's "context", or -c key=value on the command line. The defaults are
// glazecalc's own values, which deploy/aws/*.json and the READMEs already
// publish. Nothing secret is a setting: secrets stay in Parameter Store, and
// the stacks name them, never their values.
import type { Node } from 'constructs';

export interface Settings {
  /** The AWS account the stacks belong to. */
  readonly account: string;
  readonly region: string;
  /** The site's domain: SES sends and receives mail for it. */
  readonly domain: string;
  /** owner/name on GitHub: only its production and staging environments may assume the deploy roles. */
  readonly repository: string;
  /** The launch template's instance type (deploy/aws/README.md, "Defaults"). */
  readonly instanceType: string;
  /**
   * The launch template version the instance was started from. CloudFormation
   * replaces an instance whose launch template changes, so this is pinned: a
   * new launch template version never touches the running instance.
   */
  readonly launchTemplateVersion: string;
  /** The root device of the Debian 13 AMI (deploy/aws/README.md, step 7). */
  readonly rootDeviceName: string;
  /**
   * Whether the optional S3 route for staging images is set up (deploy/README.md,
   * Staging, step 8): the instance may read staging-images/ in the backup
   * bucket, and a lifecycle rule deletes those uploads after 7 days.
   */
  readonly stagingImages: boolean;
  /**
   * The version of /glazecalc/owner-inbox the mail forwarder is deployed with.
   * CloudFormation reads a parameter only when the template changes, so a new
   * inbox is a new parameter version and this number raised to match.
   */
  readonly ownerInboxVersion: number;
  /**
   * The instances from before this setup, which the operator policy lets the
   * CLI user stop or terminate (deploy/aws/README.md, step 0). Empty once they
   * are gone, and the policy's OldServers statement goes with them.
   */
  readonly oldServers: readonly string[];
  /** The SES reputation alarms (deploy/aws/README.md, section 14 gives no names). */
  readonly bounceAlarmName: string;
  readonly complaintAlarmName: string;
  /**
   * The stacks as they are live today, for cdk import (README.md, "Bringing the
   * live resources under CDK"): without the changes this app makes on top
   * (TLS-only bucket policies, termination protection), which the first
   * cdk deploy after the import then makes in the open.
   */
  readonly import: boolean;
}

export const DEFAULTS: Settings = {
  account: '724654236968',
  region: 'us-west-2',
  domain: 'glazecalcapp.com',
  repository: 'AaronFilson/glazecalc',
  instanceType: 't4g.micro',
  launchTemplateVersion: '1',
  rootDeviceName: '/dev/xvda',
  stagingImages: false,
  ownerInboxVersion: 1,
  oldServers: ['i-07a925b2d7d19f991', 'i-052d3dcd53fa88288'],
  bounceAlarmName: 'glazecalc-ses-bounce-rate',
  complaintAlarmName: 'glazecalc-ses-complaint-rate',
  import: false
};

/** Each setting's check: a value that would make a wrong ARN or name stops the synth. */
const PATTERNS: Partial<Record<keyof Settings, RegExp>> = {
  account: /^\d{12}$/,
  region: /^[a-z]{2}(-[a-z]+)+-\d$/,
  domain: /^([a-z0-9-]+\.)+[a-z]{2,}$/,
  repository: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  instanceType: /^[a-z][a-z0-9-]*\.[a-z0-9]+$/,
  launchTemplateVersion: /^[1-9]\d*$/,
  rootDeviceName: /^\/dev\/[a-z0-9]+$/,
  bounceAlarmName: /^glazecalc-[A-Za-z0-9_.-]+$/,
  complaintAlarmName: /^glazecalc-[A-Za-z0-9_.-]+$/
};

/** Reads the settings from the context, with the defaults above for what is not given. */
export function readSettings(node: Node): Settings {
  const read = <K extends keyof Settings>(key: K): Settings[K] => {
    const given: unknown = node.tryGetContext(key);
    const fallback = DEFAULTS[key];
    if (given === undefined) return fallback;
    // -c key=value always gives a string; cdk.json gives JSON types.
    if (Array.isArray(fallback)) {
      const list = Array.isArray(given) ? given.map(String) : String(given).split(',').filter(Boolean);
      for (const id of list) {
        if (!/^i-[0-9a-f]{8,17}$/.test(id))
          throw new Error(`Context ${key}: ${JSON.stringify(id)} is not an instance id.`);
      }
      return list as unknown as Settings[K];
    }
    if (typeof fallback === 'boolean') {
      if (given === true || given === 'true') return true as Settings[K];
      if (given === false || given === 'false') return false as Settings[K];
      throw new Error(`Context ${key} must be true or false, not ${JSON.stringify(given)}.`);
    }
    if (typeof fallback === 'number') {
      const value = typeof given === 'number' ? given : Number(given);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Context ${key} must be a whole number of 1 or more, not ${JSON.stringify(given)}.`);
      }
      return value as Settings[K];
    }
    const value = String(given);
    const pattern = PATTERNS[key];
    if (pattern && !pattern.test(value)) {
      throw new Error(`Context ${key} must match ${pattern}, not ${JSON.stringify(given)}.`);
    }
    return value as Settings[K];
  };
  return {
    account: read('account'),
    region: read('region'),
    domain: read('domain'),
    repository: read('repository'),
    instanceType: read('instanceType'),
    launchTemplateVersion: read('launchTemplateVersion'),
    rootDeviceName: read('rootDeviceName'),
    stagingImages: read('stagingImages'),
    ownerInboxVersion: read('ownerInboxVersion'),
    oldServers: read('oldServers'),
    bounceAlarmName: read('bounceAlarmName'),
    complaintAlarmName: read('complaintAlarmName'),
    import: read('import')
  };
}

/** The tag every glazecalc resource the manual steps tagged carries; the deploy roles' policies depend on it. */
export const APP_TAG = { key: 'app', value: 'glazecalc' } as const;
