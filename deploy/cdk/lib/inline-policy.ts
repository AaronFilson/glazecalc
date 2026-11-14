// An IAM user's inline policy, kept inside the user's own resource
// (AWS::IAM::User's Policies). The L2 User has no inlinePolicies property, and
// its addToPolicy would make a separate AWS::IAM::Policy: CloudFormation cannot
// import that type, and it would sit beside the live policy under another
// name. Inside the user, the policy is imported with it, under its own name.
import type { CfnUser, PolicyDocument, User } from 'aws-cdk-lib/aws-iam';

export function inlinePolicy(user: User, policyName: string, policyDocument: PolicyDocument): void {
  const resource = user.node.defaultChild as CfnUser;
  resource.policies = [
    ...((resource.policies as CfnUser.PolicyProperty[] | undefined) ?? []),
    { policyName, policyDocument }
  ];
}
