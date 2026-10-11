# Progress

Updated 11 October 2026, evening IST. Three statuses are kept apart on purpose.

| | Status |
|---|---|
| Software implemented | **Yes**, tested locally (details below) |
| Cloud deployment verified | **No.** Waiting on an AWS session (`aws login`) on the build machine |
| Field evidence collected | **No.** Nothing has been measured in a real kitchen |

## Built

- Censored Bayesian demand model, NumPy-only numerics, baselines
- First-portion policy; Monte Carlo kitchen planner with stock, lead-time and refill-capacity checks
- Domain rules: event projection, mass balance, corrections, plate → evidence classification
- Storage: one contract, three adapters (memory, SQLite, DynamoDB)
- API: isolated public demo (stateless) and authenticated pilot (durable), import/export, diner export and deletion
- Web app: Landing, Serve, Learn, Kitchen, Evidence, Setup, Sign-in
- Simulator, policy evaluation (9 scenarios × 8 seeds), frontier sweep
- AWS SAM template, Docker-free Lambda build, deploy and operator-invite scripts
- Documentation set listed in `README.md`

## Verification results (local)

| Check | Command | Result |
|---|---|---|
| Unit, API and storage tests | `python -m pytest tests` | 79 passed |
| Web type-check (request types generated from the API's OpenAPI schema) and production build | `npm run build` in `apps/web` | passed |
| Demo browser walkthrough, desktop 1366 px and phone 390 px | `python tests/e2e/walkthrough.py http://127.0.0.1:8000` | passed; screenshots in `docs/screenshots/` |
| Pilot browser flow (local dev sign-in, SQLite) | `python tests/e2e/pilot_flow.py http://127.0.0.1:8000 --user manager` | passed |
| Silent guide video of the demo walkthrough (local server) | `python tests/e2e/walkthrough.py http://127.0.0.1:8000 --video` | recorded to `build/video/`; to be re-recorded against the live URL |
| Lambda package build | `python scripts/build_lambda.py` | 59 MB unzipped, Linux NumPy binaries present |
| Simulated evaluation | `python -m evaluation.run_evaluation`, `python -m evaluation.run_frontier` | completed; see `EVALUATION.md` |

Local response times seen while the evaluation was also using the CPU: diner lookup about 0.2 s, Learn about 0.65 s, kitchen plan 0.9–1.4 s. Deployed warm and cold times are not measured yet.

Not verified: anything on AWS, including the DynamoDB adapter against a real table (it is tested against moto), Cognito sign-in in the browser, CloudFront deep links, and the Linux Lambda artifact actually starting.

## Bugs found by the browser tests and fixed

- A food without a calibration that happened to be first in the list locked the Serve page with no way to pick another food.
- A food not on the selected service's menu could be selected, giving an error on lookup.
- Overlapping labels on the "same empty plate" chart.
- Six request-shape mismatches surfaced when the web client was typed against the generated API schema.

## Decisions

| Decision | Why |
|---|---|
| Zip Lambda with pip `--platform` wheels instead of a container image | Docker is not installed on the build machine; the package is 59 MB |
| No SciPy at runtime; own log-CDF checked against SciPy in tests | Keeps the package small and cold starts short |
| SAM template deployed with `aws cloudformation package/deploy` | The SAM transform runs in CloudFormation; the SAM CLI is not needed |
| Model state rebuilt by replaying events on each request | Duplicates and corrections can never double-count; fast enough at pilot scale |
| Demo state lives in the browser and is replayed to a stateless endpoint | The public endpoint has no path to pilot data and stores nothing |
| Change limit is relative to the portion the diner last received | Diners experience the change from their last plate, not from a past suggestion |
| Two-trip availability limit set to 50% | Chosen on development seeds 9001–9002 with `evaluation/explore_policy.py`, not on reported seeds |
| Offline entry by paper sheet and CSV import, not an offline outbox | A half-reliable outbox loses data silently |

## Not built (optional in the specification)

Photo attachments, camera plate matching, connected scale, bilingual text, offline outbox.

## Waiting on people

1. `aws login` on the build machine, then `scripts\deploy.ps1`.
2. A public GitHub repository URL to push to.
3. Narrated demo recording, YouTube upload and form submission.
4. The team's list of any other AI tools used, for `SUBMISSION.md`.
5. A real pilot, if and when a kitchen agrees.
