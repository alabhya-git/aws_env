# ProofPlate

**An empty plate doesn't mean "enough". ProofPlate learns the difference, and turns it into the next meal's portion and cooking plan.**

Environmental Hacks · Waste and Energy track

| | |
|---|---|
| Live app | https://imh92ymqaa.execute-api.ap-south-1.amazonaws.com (open **Open the demo**) |
| Repository | https://github.com/alabhya-git/aws_env |
| Demo video | *(add the YouTube URL)* |
| Team | *(add names)* |

## The problem

A college mess serves hundreds of plates an hour, and the person at the counter chooses each first portion without knowing how hungry the diner is. Too much goes in the bin. Too little and the diner leaves hungry or gives up on the queue for seconds.

Kitchens that try to learn from leftovers hit a trap: **an empty plate is ambiguous.** It can mean "that was enough" or "I wanted more", and a scale can't tell which. A system that reads every empty plate as "the portion was right" keeps under-serving the hungriest diners, and calls it optimisation.

## What we built

A working tool for the serving counter and the kitchen manager, deployed on AWS.

- **Serve.** Enter a diner token and get a first portion in scoops, with the likely range and the reason. The diner can always choose differently, and seconds are one tap.
- **Return.** Record grams left and ask one question: *was that enough?* Grams come from a scale, or from a photo when there isn't one.
- **Learn.** "Enough" means appetite was about this much. "Wanted more" means *at least* this much and can only raise an estimate. Unclear plates and leftovers caused by dislike or interruption are recorded but never lower anyone's estimate. The Learn page runs the real model three ways on the same empty plate so the difference is visible.
- **Kitchen.** The estimates become how much to cook before service, how much to hold in reserve, when to start each batch and the modelled chance of running short. When stock or the refill station can't support the plan, it says *not feasible* and why. It never quietly lowers its own target.
- **Evidence.** Observed, predicted and simulated results are kept apart, each with its sample size, and exportable.

Diners are anonymous tokens. No names, faces, calories or body data. Suggestions never override a request.

## What is different

1. **Censored learning.** A Bayesian lognormal model with interval and right-censored likelihoods, so "wanted more" is treated as a lower bound rather than a target.
2. **Seconds are designed in.** The portion policy trades leftover against trips back, and the kitchen plan forecasts what will be *served*, including refills and scoop rounding.
3. **Photo estimate without a model download.** Compare the returned plate with an empty-plate photo, fit grams on a few weighed plates, and carry the estimate's own uncertainty into the model. Photos are analysed in the browser and never uploaded.
4. **Honest accounting.** A missing return is missing, not zero waste. Measured, simulated and imported records never mix. Nothing is claimed as "meals saved" or CO₂.

## Where AWS fits

Defined in one SAM template (`infra/template.yaml`) and deployed to `ap-south-1`.

| Service | Role |
|---|---|
| **AWS Lambda** | Runs the demand model, serving policy and Monte Carlo kitchen planner on every request, and serves the web app |
| **Amazon API Gateway** | HTTPS front door with throttling and a JWT authorizer on pilot routes |
| **Amazon DynamoDB** | Durable pilot records. Immutable events; each write is one transaction enforcing idempotency and a per-plate counter, so two stations can't corrupt a plate |
| **Amazon Cognito** | Operator sign-in for the pilot workspace; no public sign-up |
| **Amazon CloudWatch** | Request logs without diner data |
| **CloudFormation / SAM** | Repeatable deployment, built without Docker |

The template also defines S3 and CloudFront, but new AWS accounts must be verified before CloudFront can be created, so the live deployment serves the web app from Lambda instead. The video footer shows the Lambda function and region on every screen.

## Evidence, and what it does not show

**No real kitchen has been measured.** The pilot workspace starts empty, and `PILOT_PROTOCOL.md` describes how to collect real data. Everything below comes from a labelled simulator with nine scenarios and eight seeds, comparing policies on identical diners and appetites (`EVALUATION.md`).

| Baseline scenario | Food left per plate | Diners left wanting more |
|---|---|---|
| Usual fixed portion, 3 scoops | 28.9 g | 19.8% |
| Smaller fixed portion + seconds | 12.4 g | 35.8% |
| **ProofPlate** | 29.5 g | **10.8%** |

- At the default setting ProofPlate does **not** leave less on the plate than the usual portion. It leaves about the same and roughly halves the diners left wanting more.
- Like for like: a fixed portion that leaves as few diners wanting more as ProofPlate (10.8%) would leave about 55 g per plate, against ProofPlate's 29.5 g. That figure is interpolated.
- When only half of diners walk back for seconds, a personal average without the censoring logic leaves less food (13.6 g) but 47.9% of diners wanting more, worse than the usual portion's 39.6%. ProofPlate leaves 25.1 g with 28.4%.

These are properties of a simulator built on stated assumptions, not measured savings. The photo estimate has been checked on generated images only.

## Verification

- 80 Python tests and 8 photo-estimate unit tests pass, covering likelihoods against analytic values, censoring behaviour, mass balance, idempotency, corrections, tenant isolation, and one storage contract run on memory, SQLite and DynamoDB adapters.
- Scripted Chrome flows pass locally and against the live AWS URL: the public demo at desktop and phone widths, a Cognito-signed-in pilot flow against DynamoDB, and the photo estimate against generated truth.
- Results and what was not verified are in `DEPLOYMENT.md`.

## Limitations

- No field data, so effect in a real mess is unproven.
- The photo estimate needs a fixed camera and a plate that contrasts with the food, and has not been validated on real photographs.
- Satisfaction is self-reported; one food is weighed at a time.
- The simulator's behaviour model is an assumption.

## Next

Run the pilot in `PILOT_PROTOCOL.md` with one hostel kitchen and one dish, calibrate on real plates, and report observed results with denominators.

## How it was built, and AI tools used

Disclosed as the rules require.

- **Claude Code (Anthropic)** was used during the event to write most of the implementation, tests, infrastructure template and documentation, working from the team's written specification.
- An AI assistant was also used to help draft that specification. *(Name it here.)*
- The team chose the problem and the approach, set the honesty and privacy constraints the product follows, directed and reviewed the work, and ran the deployment on its own AWS account. *(Edit to say exactly what each member did.)*

Open-source libraries only (FastAPI, Pydantic, Mangum, NumPy, React, Vite, IBM Plex fonts under the SIL OFL), listed in `README.md`. Plate graphics are original SVG, and the demo photos are rendered by `scripts/make_sample_photos.py`. No external datasets.
