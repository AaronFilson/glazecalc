// What the tests share: the app built in memory, the documents in deploy/aws/
// it must agree with, and a resolver that turns CDK's references back into
// the plain ARNs those documents spell out.
import { readFileSync } from 'node:fs';
import { Template } from 'aws-cdk-lib/assertions';
import { glazecalcApp, type GlazecalcApp } from '../lib/app.ts';
import { DEFAULTS, type Settings } from '../lib/settings.ts';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Resource = { Type: string; Properties?: Record<string, Json>; [key: string]: Json | undefined };

export interface Built extends GlazecalcApp {
  readonly templates: { access: Template; server: Template; mail: Template; inbound: Template };
}

/** cdk.json's context (the feature flags), which the CLI gives the app: the tests build what cdk synth builds. */
export const CDK_JSON_CONTEXT = (
  JSON.parse(readFileSync(new URL('../cdk.json', import.meta.url), 'utf8')) as { context: Record<string, unknown> }
).context;

/**
 * Builds the four stacks with the given context and synthesizes them. In
 * memory, an unacknowledged cdk-nag finding throws with the report, so every
 * build is also a cdk-nag check.
 */
export function build(context: Record<string, unknown> = {}): Built {
  const built = glazecalcApp({
    context: {
      ...CDK_JSON_CONTEXT,
      // What cdk synth turns on by default: each resource's construct path,
      // which cdk import shows, and the forwarder's asset.
      'aws:cdk:enable-path-metadata': true,
      'aws:cdk:enable-asset-metadata': true,
      '@aws-cdk/core:appMode': 'inmemory',
      ...context
    }
  });
  return {
    ...built,
    templates: {
      access: Template.fromStack(built.access),
      server: Template.fromStack(built.server),
      mail: Template.fromStack(built.mail),
      inbound: Template.fromStack(built.inbound)
    }
  };
}

let defaults: Built | undefined;
/** The app as cdk synth makes it with no context: glazecalc's own account. */
export function builtWithDefaults(): Built {
  defaults ??= build();
  return defaults;
}

/** A policy or document from deploy/aws/, which the manual setup used. */
export function awsDocument(name: string): Json {
  return JSON.parse(readFileSync(new URL(`../../aws/${name}`, import.meta.url), 'utf8')) as Json;
}

/** The one resource of a type that has the given property value (a name, mostly). */
export function resourceNamed(template: Template, type: string, property: string, value: string): Resource {
  const found = Object.values(template.findResources(type) as Record<string, Resource>).filter(
    (resource) => resource.Properties?.[property] === value
  );
  if (found.length !== 1) throw new Error(`Expected one ${type} with ${property} ${value}, found ${found.length}.`);
  return found[0];
}

/** An inline policy of a role or user, by its name. */
export function inlinePolicyOf(resource: Resource, name: string): Json {
  const policies = (resource.Properties?.Policies ?? []) as { PolicyName: string; PolicyDocument: Json }[];
  const policy = policies.find((p) => p.PolicyName === name);
  if (!policy) throw new Error(`No inline policy ${name}; there are ${policies.map((p) => p.PolicyName).join(', ')}.`);
  return policy.PolicyDocument;
}

/**
 * Resolves the intrinsic functions CDK writes (Ref, Fn::GetAtt of an ARN,
 * Fn::Join, the pseudo parameters) into the literal strings deploy/aws/*.json
 * use, for the resources these stacks make.
 */
export function resolve(value: Json, template: Template, settings: Settings = DEFAULTS): Json {
  const { account, region } = settings;
  const resources = template.toJSON().Resources as Record<string, Resource>;
  const props = (id: string) => {
    const resource = resources[id];
    if (!resource) throw new Error(`No resource ${id} in this template.`);
    return { type: resource.Type, p: resource.Properties ?? {} };
  };
  const arnOf = (id: string): string => {
    const { type, p } = props(id);
    switch (type) {
      case 'AWS::S3::Bucket':
        return `arn:aws:s3:::${p.BucketName}`;
      case 'AWS::IAM::Role':
        return `arn:aws:iam::${account}:role/${p.RoleName}`;
      case 'AWS::Lambda::Function':
        return `arn:aws:lambda:${region}:${account}:function:${p.FunctionName}`;
      default:
        throw new Error(`No ARN rule for ${type}.`);
    }
  };
  const ref = (id: string): string => {
    const pseudo: Record<string, string> = {
      'AWS::Partition': 'aws',
      'AWS::Region': region,
      'AWS::AccountId': account,
      'AWS::URLSuffix': 'amazonaws.com'
    };
    if (id in pseudo) return pseudo[id];
    const { type, p } = props(id);
    switch (type) {
      case 'AWS::S3::Bucket':
        return String(p.BucketName);
      case 'AWS::Lambda::Function':
        return String(p.FunctionName);
      case 'AWS::IAM::OIDCProvider':
        return `arn:aws:iam::${account}:oidc-provider/${String(p.Url).replace('https://', '')}`;
      case 'AWS::SNS::Topic':
        return `arn:aws:sns:${region}:${account}:${p.TopicName}`;
      default:
        throw new Error(`No Ref rule for ${type}.`);
    }
  };
  const walk = (v: Json): Json => {
    if (Array.isArray(v)) return v.map(walk);
    if (v === null || typeof v !== 'object') return v;
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === 'Ref') return ref(String(v.Ref));
    if (keys.length === 1 && keys[0] === 'Fn::GetAtt') {
      const [id, attribute] = v['Fn::GetAtt'] as [string, string];
      if (attribute !== 'Arn') throw new Error(`No rule for Fn::GetAtt ${attribute}.`);
      return arnOf(id);
    }
    if (keys.length === 1 && keys[0] === 'Fn::Join') {
      const [separator, parts] = v['Fn::Join'] as [string, Json[]];
      return parts.map((part) => String(walk(part))).join(separator);
    }
    return Object.fromEntries(keys.map((key) => [key, walk(v[key])]));
  };
  return walk(value);
}

/** Every resource of every stack, with the stack it is in. */
export function allResources(built: Built): { stack: string; id: string; resource: Resource }[] {
  return Object.entries(built.templates).flatMap(([stack, template]) =>
    Object.entries(template.toJSON().Resources as Record<string, Resource>).map(([id, resource]) => ({
      stack,
      id,
      resource
    }))
  );
}
