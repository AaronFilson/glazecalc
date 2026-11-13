// Helpers for acknowledging cdk-nag findings (AwsSolutions rules, lib/app.ts).
import { Stack } from 'aws-cdk-lib';
import type { Bucket, CfnBucket } from 'aws-cdk-lib/aws-s3';

/**
 * How cdk-nag writes a bucket's ARN in a wildcard finding: <LogicalId.Arn>,
 * the Fn::GetAtt it sees in the template. Worked out from the construct, so an
 * acknowledgment never goes stale when the logical id is the one CDK made.
 */
export function bucketArnInFinding(bucket: Bucket): string {
  const stack = Stack.of(bucket);
  return `<${stack.resolve(stack.getLogicalId(bucket.node.defaultChild as CfnBucket))}.Arn>`;
}
