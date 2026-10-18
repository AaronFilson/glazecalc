#!/usr/bin/env bash
# Sets up, or brings up to date, everything AWS needs for the Deploy and Deploy
# staging workflows (deploy/aws/README.md, section 5): GitHub's OIDC provider,
# and for each of production and staging a role that only that GitHub
# environment can assume, its one inline policy, and the one SSM command
# document it may run. Safe to run again: what exists is updated to match the
# files here (a document's new version becomes its default), nothing else is
# changed or deleted. Run as the admin, from the repository root, in CloudShell:
#
#   bash deploy/aws/setup-github-deploy.sh
set -euo pipefail

region=us-west-2
here=deploy/aws
[ -f "$here/deploy-document.json" ] || { echo "Run it from the repository root." >&2; exit 1; }
account=$(aws sts get-caller-identity --query Account --output text)
[ "$account" = 724654236968 ] || { echo "This is account $account, not glazecalc's (724654236968)." >&2; exit 1; }

provider=arn:aws:iam::$account:oidc-provider/token.actions.githubusercontent.com
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$provider" > /dev/null 2>&1; then
  echo "OIDC provider: there."
else
  aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com > /dev/null
  echo "OIDC provider: made."
fi

# role <name> <trust file> <policy name> <policy file>
role() {
  if aws iam get-role --role-name "$1" > /dev/null 2>&1; then
    aws iam update-assume-role-policy --role-name "$1" --policy-document "file://$here/$2"
    echo "Role $1: there; trust brought up to date."
  else
    aws iam create-role --role-name "$1" --assume-role-policy-document "file://$here/$2" \
      --tags Key=app,Value=glazecalc > /dev/null
    echo "Role $1: made."
  fi
  aws iam put-role-policy --role-name "$1" --policy-name "$3" --policy-document "file://$here/$4"
  echo "Role $1: policy $3 from $4."
}

# document <name> <file>
document() {
  if aws ssm describe-document --region "$region" --name "$1" > /dev/null 2>&1; then
    local out version
    if out=$(aws ssm update-document --region "$region" --name "$1" --content "file://$here/$2" \
      --document-version '$LATEST' --query DocumentDescription.DocumentVersion --output text 2>&1); then
      version=$out
      aws ssm update-document-default-version --region "$region" --name "$1" --document-version "$version" > /dev/null
      echo "Document $1: updated to version $version, now the default."
    elif [[ "$out" == *DuplicateDocumentContent* ]]; then
      echo "Document $1: already the same as $2."
    else
      echo "$out" >&2
      exit 1
    fi
  else
    aws ssm create-document --region "$region" --name "$1" --document-type Command --document-format JSON \
      --content "file://$here/$2" --tags Key=app,Value=glazecalc > /dev/null
    echo "Document $1: made."
  fi
}

role glazecalc-github-deploy github-oidc-trust.json ssm-deploy deploy-policy.json
document glazecalc-deploy deploy-document.json
role glazecalc-github-staging github-oidc-trust-staging.json ssm-staging-deploy staging-deploy-policy.json
document glazecalc-staging-deploy staging-deploy-document.json

echo
echo "Done. In GitHub's environments, AWS_DEPLOY_ROLE_ARN (production) and AWS_STAGING_ROLE_ARN (staging):"
echo "  arn:aws:iam::$account:role/glazecalc-github-deploy"
echo "  arn:aws:iam::$account:role/glazecalc-github-staging"
