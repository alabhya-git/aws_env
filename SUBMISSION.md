# ProofPlate — Environmental Hacks submission

**Track:** Waste and Energy
**One line:** Serve a better first portion, keep seconds available, and show what actually changed.

| | |
|---|---|
| Live app | see `DEPLOYMENT.md` |
| Repository | *(add the public repo URL)* |
| Demo video | *(add the YouTube URL)* |
| Team | *(add names)* |

## The problem

A college mess serves hundreds of plates in an hour. The person with the ladle decides each first portion before knowing how hungry the diner is. Serve too much and edible food is scraped into the bin. Serve too little and someone leaves hungry, or gives up on the queue for seconds.

Kitchens that try to learn from leftovers hit a trap: **an empty plate is ambiguous.** It can mean "that was enough" or "I wanted more". A scale cannot tell the difference. Any system that reads every empty plate as "that portion was right" will keep under-serving exactly the diners who are hungriest.

## What we built

A working tool for the serving counter and the kitchen manager.

1. **Calibrate** the serving scoop for a dish by weighing about twenty scoops.
2. **Suggest** each diner's first portion, with the likely range and the reason. The diner can always ask for something else, and seconds are always one tap away.
3. **Record** seconds, the grams left on the plate, and one question: *was that enough?*
4. **Learn** correctly. "Enough" means appetite was about this much. "Wanted more" means at least this much, and can only raise an estimate. Unclear plates, and leftovers caused by dislike or interruption, are recorded but do not move anyone's estimate.
5. **Plan the kitchen**: how much to cook before service, how much to hold in reserve, when to start each batch, and the modelled chance of running short. When stock or the refill station cannot support the plan, the app says "not feasible" and why. It never quietly lowers its own target.
6. **Show the evidence** split into observed, predicted and simulated, each with its sample size.

Diners are anonymous tokens. No names, faces, body data or health data. This is not a diet tool.

## What makes it different

- **Censored learning.** The model is a Bayesian lognormal with interval and right-censored likelihoods. The Learn page runs the real model three ways on the same empty plate so you can see the difference.
- **Seconds are part of the design**, not an afterthought. The policy minimises expected leftover plus an explicit cost for a trip back, and the kitchen plan forecasts what will be *served*, including refills and scoop rounding.
- **Honest accounting.** A missing return is missing, not zero waste. Simulated, imported and measured records are stored with their provenance and never mixed. A simple baseline that wins is shown as winning.

## Where AWS fits

Everything runs on AWS, defined in one SAM template (`infra/template.yaml`).

| Service | Role |
|---|---|
| **AWS Lambda** (Python 3.13) | Runs the model, the serving policy and the Monte Carlo kitchen planner on every request |
| **Amazon API Gateway** (HTTP API) | HTTPS front door for the API, with throttling and a JWT authorizer on pilot routes |
| **Amazon DynamoDB** | Durable pilot records. Events are immutable; one transaction per write enforces idempotency and a per-plate counter so two stations cannot corrupt a plate |
| **Amazon Cognito** | Operator sign-in for the pilot workspace. No public sign-up |
| **Amazon S3 + CloudFront** | Private bucket behind Origin Access Control serves the web app; CloudFront routes `/api/*` to the API so everything is one origin |
| **CloudWatch Logs** | Structured request logs without diner payloads |
| **AWS SAM / CloudFormation** | Repeatable deployment; the Lambda package is built without Docker |

It is serverless and scales to zero. Estimated cost for a week of demo traffic is under one US dollar; see `DEPLOYMENT.md`.

## Evidence

**Observed (field) evidence: none.** No real kitchen has been measured. The pilot workspace starts empty, and `PILOT_PROTOCOL.md` describes how to collect real data.

**Simulated evidence.** A labelled simulator compares serving policies on identical diners, attendance and appetites (nine scenarios, eight seeds, metrics on the final third of meals). Full tables with intervals are in `EVALUATION.md`; the app's Evidence page reads the same file.

In the baseline scenario:

| Policy | Food left per plate | Diners left wanting more | Trips for seconds per plate |
|---|---|---|---|
| Usual fixed portion, 3 scoops | 28.9 g | 19.8% | 1.08 |
| Smaller fixed portion, 2 scoops, plus seconds | 12.4 g | 35.8% | 1.91 |
| ProofPlate, default setting | 29.5 g | 10.8% | 0.66 |

What this says, and does not say:

- At its default setting ProofPlate did **not** leave less on the plate than the usual portion. It left about the same, and roughly halved the diners left wanting more.
- Serving everyone less cuts plate waste the most, and leaves the most diners hungry.
- Like for like: for a fixed portion to leave as few diners wanting more as ProofPlate did (10.8%), it left about 55 g per plate, against ProofPlate's 29.5 g. That figure is interpolated between two fixed portions.
- When only half of diners walk back for seconds, a personal moving average without the censoring logic left less food (13.6 g) but 47.9% of diners wanting more, worse than the usual portion's 39.6%. ProofPlate left 25.1 g with 28.4%.

These are properties of a simulator built on stated assumptions. They are not measured savings.

## Verification

- 78 automated tests pass: numerics against SciPy, likelihoods against analytic values, censoring behaviour, policy and planner constraints, mass balance, idempotency, corrections, tenant isolation, demo/pilot isolation, and one storage contract run against in-memory, SQLite and DynamoDB (moto) adapters.
- A scripted Chrome walkthrough covers serve → seconds → return → changed suggestion → kitchen recompute → infeasible plan → evidence export, at desktop and phone widths.
- Deployment checks are recorded in `DEPLOYMENT.md`.

## Limitations

- No field data. Effect in a real mess is unproven.
- One food at a time, weighed separately. Mixed plates are out of scope.
- Satisfaction is self-reported and can be wrong.
- The simulator's behaviour model (who walks back for seconds, who answers the question) is an assumption.
- Offline entry is by paper sheet and CSV import, not an offline app.

## AI tools used

- **Claude Code (Anthropic)** — used to implement the application, tests, infrastructure and documentation from the team's specification, during the event.
- *(List any other AI tool the team used, for example to draft the specification.)*

## Third-party work

Open-source libraries only, listed with licenses in `README.md`. All graphics are original SVG. No external datasets.
