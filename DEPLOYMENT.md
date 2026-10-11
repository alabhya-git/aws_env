# Deployment

## Status

**Not deployed yet.** The application, the Lambda package and the infrastructure template are built and tested locally. Deployment is waiting on one external step: an AWS session on the build machine (`aws login`). No URL exists until that is done; this section is replaced with real values by the first successful `scripts\deploy.ps1` run.

| Check | Result |
|---|---|
| Lambda package builds without Docker (Linux wheels, python3.13, x86_64) | Done locally: 59 MB unzipped |
| Stack deployed | Pending AWS sign-in |
| HTTPS app URL | Pending |
| Live smoke test, deep links, model update, persistence across redeploy, tenant isolation | Pending |

## What gets created

One CloudFormation stack, `proofplate-prod`, in `ap-south-1`, from `infra/template.yaml` (AWS SAM).

| Resource | Purpose | Notes |
|---|---|---|
| CloudFront distribution | Public HTTPS entry point | Default CloudFront hostname; no custom domain |
| S3 bucket (web) | Built web app | Private; read only by CloudFront through Origin Access Control |
| CloudFront function | Sends extension-less paths to the app shell | A missing asset stays an error, not HTML |
| API Gateway HTTP API | `/api/*` | Throttled at 20 requests/s, burst 40 |
| Lambda function | FastAPI app: model, policy, planner | python3.13, 1536 MB, 25 s timeout |
| DynamoDB table | Pilot records | On-demand, encrypted, point-in-time recovery, **retained on teardown** |
| Cognito user pool + client | Operator sign-in | Admin-created users only; JWT authorizer on `/api/pilot/*` |
| CloudWatch log group | Request logs | 14-day retention; no diner payloads |
| S3 bucket (artifacts) | Deployment packages | Created by the deploy script; objects expire after 14 days |

IAM: the function's role may read and write only its own table. No credentials are bundled in the web app; its runtime settings come from `/api/config`.

Not used: NAT gateways, VPCs, containers or Kubernetes, GPUs, provisioned capacity, foundation models.

## Cost estimate

For one week at about 1,000 visits and 10,000 API calls, using public on-demand list prices for `ap-south-1` as understood at build time. **Check current pricing before relying on this.** Promotional credits and free-tier allowances are not counted.

| Service | Assumed usage | Rough cost |
|---|---|---|
| Lambda | 10,000 requests × ~0.5 s × 1.5 GB ≈ 7,500 GB-s | about $0.13 |
| API Gateway HTTP API | 10,000 requests | about $0.01 |
| DynamoDB on-demand | a few thousand reads and writes, < 10 MB stored | under $0.01 |
| CloudFront | ~1,000 visits × ~0.35 MB ≈ 0.35 GB out | about $0.04 |
| S3 | < 100 MB stored | under $0.01 |
| Cognito | a handful of operators | $0 at this scale |
| CloudWatch Logs | < 50 MB | about $0.03 |
| **Total** | | **well under US$1 for the week** |

This is an estimate, not a bill and not a spending cap. A budget alert in AWS Budgets is recommended; it notifies, it does not stop spending.

## Deploy

Requires AWS CLI v2.32+ with an active session, Python 3.13 and Node 20+. No Docker.

```powershell
aws login                                                       # browser sign-in; region ap-south-1
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

The script: checks identity → builds the web app → assembles the Lambda package → creates the artifact bucket if needed → packages and deploys the stack → uploads the web app to the private bucket → invalidates `index.html` → calls `/api/health` → writes `build\stack-outputs.json`.

If the account cannot create CloudFront distributions yet (new accounts sometimes need verification), deploy with `-NoCloudFront`. The Lambda then serves the web app through the API Gateway URL.

## Invite an operator

```powershell
powershell -ExecutionPolicy Bypass -File scripts\create_operator.ps1 -Email you@example.org -Site hostel-4 -Role manager
```

Cognito emails a temporary password; the first sign-in sets a new one. The script writes the site membership the API trusts. No password is passed on a command line or stored in the repository.

## Verify a deployment

```powershell
$o = Get-Content build\stack-outputs.json | ConvertFrom-Json
python tests\e2e\walkthrough.py $o.AppUrl                           # public demo, desktop and phone
$env:PP_PASSWORD = Read-Host -AsSecureString | ConvertFrom-SecureString -AsPlainText   # PowerShell 7; or set it in your shell
python tests\e2e\pilot_flow.py $o.AppUrl --user you@example.org     # pilot workspace
```

## Rollback

Packages are stored under a content hash in the artifact bucket for 14 days, and the function's `PROOFPLATE_REVISION` records the git revision.

```powershell
git checkout <previous-revision>
powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
```

A failed stack update rolls back by itself. Pilot records are untouched by any redeploy.

## Teardown

```powershell
$o = Get-Content build\stack-outputs.json | ConvertFrom-Json
aws s3 rm "s3://$($o.WebBucketName)" --recursive --region $o.Region
aws cloudformation delete-stack --stack-name $o.Stack --region $o.Region
aws cloudformation wait stack-delete-complete --stack-name $o.Stack --region $o.Region
```

The DynamoDB table is **kept** on purpose. To delete pilot data as well:

```powershell
aws dynamodb delete-table --table-name $o.TableName --region $o.Region
```

Also remove the artifact bucket `proofplate-artifacts-<account>-<region>` if it is no longer needed.
