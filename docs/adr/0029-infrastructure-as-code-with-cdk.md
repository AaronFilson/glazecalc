# 29. The AWS setup as code, with AWS CDK in TypeScript

Accepted, 2026-11-12.

## Context

Every AWS resource glazecalc uses was made by hand: the commands in `deploy/aws/README.md`, run in order, with 19 JSON
policy and command documents beside them and the scripts `setup-github-deploy.sh`, `create-mailer.sh` and
`create-inbound.sh` (see [0001](0001-one-ec2-instance.md), [0002](0002-keyless-deploys.md) and
[0006](0006-email-through-ses-smtp.md)). That works, and every step is written down, but nothing says whether the
account still matches what is written: a change made in the console stays unseen until it causes trouble. A rebuild
means following fifteen sections in the right order. A change to a role is reviewed as a JSON diff, then applied by
whoever remembers to run the script again. The owner asked for the setup as code.

## Decision

- **AWS CDK in TypeScript, in `deploy/cdk/`.** The app's own language, so it reads like the rest of the code and the
  types catch a misspelled property; CloudFormation underneath, so AWS keeps the record of what was deployed and there
  is no state file to store, lock and back up. Node runs the TypeScript as it is, as it does the server's
  ([0008](0008-typescript-server-without-a-build.md)), and `tsc` only checks it. CDK, its CLI and cdk-nag are
  installed apart from the app at exact versions, as Lighthouse CI is.
- **Four stacks, each brought in with `cdk import`:** `glazecalc-access` (GitHub's OIDC provider, the two deploy roles
  and their SSM documents, the operator policy), `glazecalc-server` (the instance, its role, network, backups, snapshots
  and alarms), `glazecalc-mail` (SES sending) and `glazecalc-mail-inbound` (SES receiving and the forwarder). Smaller
  stacks make each import small enough to check by eye, and one that goes wrong touches nothing else.
- **The same resources as now, with the same names, conditions and permissions.** The tests hold every policy, trust
  policy and command document to its JSON file in `deploy/aws/`, so the code and the documents the scripts still read
  cannot drift apart, and a snapshot of each whole template shows any change to what would be deployed. `grant…()`
  and the L2 constructs are used where they give the same policy, and explicit statements where they would give more.
  Inline policies stay inside their role or user, where an import takes them along.
- **Nothing is deleted by CloudFormation.** Every resource is retained when it leaves its stack or the stack is
  deleted, and every stack has termination protection.
- **cdk-nag's AWS Solutions rules on every template.** A finding is fixed, or acknowledged next to its resource with the
  reason the current design is deliberate (one instance open on ports 80 and 443, no load balancer). Two were fixed:
  the buckets refuse requests without TLS, and the instance has termination protection.
- **An import mode** (`-c import=true`) gives the templates without those two fixes. CloudFormation does not compare a
  template with the resource it imports, and later applies only what changes between templates, so the import records
  the resources as they are and the next deploy makes the fixes, where `cdk diff` shows them.
- **What CDK should not own stays outside:** secrets (the SecureString parameters, access keys, the owner's inbox,
  which the forwarder reads from Parameter Store by a dynamic reference), DNS records (CloudFormation cannot import
  them, and remaking them would take the site or the mail down), account settings, and the few SES settings
  CloudFormation has no property for. `deploy/cdk/README.md` lists each with its reason.
- **CI synthesizes and tests; people deploy.** A workflow runs the type check, the synth with cdk-nag in both modes and
  the tests on every change under `deploy/`, with no AWS credentials. Deploys stay with the admin, as the IAM changes
  always have.

## Alternatives

- **Terraform or OpenTofu:** the most used, with `import` blocks and providers that can import DNS records. But HCL is
  another language, and the state file holds every attribute it reads, so it needs a bucket, a lock and its own
  protection, made by hand before anything else.
- **Pulumi:** TypeScript too, but its state lives in Pulumi's service or a backend of our own, and it is one more vendor.
- **CloudFormation templates written by hand:** no extra tools, but no types, loops or tests in the app's language,
  and cdk-nag's checks would need other tools.
- **Keep the scripts:** nothing to learn, but drift stays invisible and a rebuild still depends on fifteen manual
  sections.

## Consequences

- A change to AWS is a pull request: reviewed as code, tested against the documents, checked by cdk-nag, and shown by
  `cdk diff` before the admin deploys it. A change made by hand shows up as drift.
- `cdk bootstrap` adds the stack `CDKToolkit`: a bucket for the forwarder's zip and roles CDK deploys through, which
  act with administrator rights, so only the admin may assume them.
- The receipt rule set and rule and the snapshot policy are not on CloudFormation's list of types it can import. If an
  import cannot take them, they are made again: the snapshot policy beside the old one, the rule set after the old is
  deleted, which stops mail to the six addresses for a minute.
- Until every stack is imported, the scripts and the CDK app describe the same resources; the tests keep them equal.
  After that, the scripts' setup parts are retired, and only the key rotations remain.
- CDK and its CLI move together, as Dependabot groups them: a CLI older than the library cannot read what it writes.
