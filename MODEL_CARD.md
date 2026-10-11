# Model card — ProofPlate demand model and serving policy

Model `censored-lognormal-grid/1.0` · policy `first-portion/1.0` · planner `kitchen-plan/1.0`

## What is being estimated

For one diner, one food and one recipe: **D**, the amount the diner would choose to eat at this meal if seconds were easy to get.

D is a choice, observed in a mess hall. It is **not** a nutritional need, a calorie target or a medical measure, and nothing in the product treats it as one.

## Why not just average what people ate

A plate that comes back empty is ambiguous. The diner may have had exactly enough, or may still be hungry. A scale cannot tell these apart.

A learner that treats every empty plate as "that amount was right" will keep serving a hungry diner the same portion. In the simulator's low-uptake scenario (`seconds_friction`), that learner (`naive_average`) leaves less on the plate but more diners wanting more than the fixed conventional portion does. See `EVALUATION.md`.

ProofPlate asks one question when the plate comes back, "was that enough?", and uses the answer to decide what the plate is allowed to teach.

## How a plate becomes evidence

Implemented in `services/api/proofplate/domain/rules.py::classify`.

| What was recorded | Used as | Likelihood |
|---|---|---|
| "Enough", amount eaten known, no confounding reason | D was about what was eaten | interval: F(hi) − F(lo) |
| "Wanted more", amount eaten known | D was at least what was eaten | right-censored: 1 − F(lo) |
| "Not sure", food left, reason "had enough" | D was about what was eaten | interval |
| Empty plate, "not sure / not asked" | nothing | not used |
| Food left because of dislike, interruption or sharing | waste is recorded | not used |
| Food shared in unknown amounts | consumption unknown | not used |
| No return recorded | missing, never zero waste | not used |
| Declined the food | counted separately | not used |

"Wanted more" stays a lower bound whatever leftover reason is given. A right-censored plate can only move the estimate up (tested in `tests/test_model.py`).

The interval half-width comes from how the plate was measured: the scoop calibration's spread for scoop-estimated servings, the scale resolution for weighed returns, plus 3% for the behavioural assumption that "enough" means demand was about what was eaten.

## The model

D is lognormal with unknown location μ and spread σ. The posterior over (μ, σ) is held as normalised log-weights on a bounded grid: 72 values of μ covering 15 g to 1,200 g, and 30 values of σ from 0.06 to 1.0.

- Updates add log-likelihoods and renormalise. The model for a diner is rebuilt by replaying their eligible plates in event-time order, so a duplicate event or a correction can never be counted twice.
- Normal CDFs use a NumPy-only implementation, evaluated in the log domain so far-tail probabilities stay finite. It is checked against SciPy in `tests/test_numerics.py`.
- Predictions are the posterior *predictive*: they include meal-to-meal variation as well as uncertainty about the average, so the stated range does not collapse as plates accumulate.
- Posterior mass on a grid edge raises a flag that is shown to the operator instead of silently truncating.

This is a deliberately simple probabilistic model. It is not claimed to be better than other censored models; a moving average is not Bayesian and is used only as a comparator.

## Priors (assumptions, not standards)

| Quantity | Default | Meaning |
|---|---|---|
| Typical amount | 180 g, log-sd 0.70 | broad starting guess for cooked rice |
| Meal-to-meal spread σ | mode 0.25, log-sd 0.60 | how much one diner varies |

When at least 20 eligible plates from at least 5 *other* diners exist for the same food and data source, the prior's centre moves to their pooled median (log-sd 0.5). The pooling is exact leave-one-out, so a diner's own plates are never counted in both the prior and the likelihood. Measured and simulated evidence are never pooled together.

## Serving policy

Candidates are half-scoop steps of the calibrated scoop. Under the stated simplification that a diner offered `s` takes refills of size `r` until satisfied,

    served A(D, s, r) = s + r · ceil(max(D − s, 0) / r),   leftover = max(A − D, 0)

the policy picks the portion that minimises **expected leftover + (cost of one trip for seconds) × expected trips**.

| Default | Value | Why |
|---|---|---|
| Cost of one trip for seconds | 20 g-equivalent | balances waste against walking back |
| Chance of needing two trips | at most 50% | availability limit |
| Change from the last portion received | at most 1 scoop per meal | conservative movement |
| Smallest portion | 1 scoop | a zero portion can never be recommended |
| Seconds not accessible | cover the 80th percentile | small first portions are only acceptable with seconds |

A diner's request always wins. Opting out gives the usual serving. With no history the suggestion comes from the cohort, or from the kitchen's usual portion if there is no cohort yet.

The two-trip limit was chosen with `evaluation/explore_policy.py` on development seeds 9001–9002, which are not among the reported evaluation seeds. Nothing was tuned on reported results.

## Kitchen planner

Fixed-seed Monte Carlo over what will be **served** (first portions, refills and rounding), not just what will be eaten. It includes head-count uncertainty, a shared appetite effect for the whole meal, arrival timing, refill uptake and refill-station capacity, and checks cooked food against need interval by interval given batch size, lead time and stock.

If stock or refill capacity cannot meet the target, the plan is returned as **infeasible** with the reason and options. The target is never quietly relaxed. "Chance of running short" is a modelled quantity under the listed assumptions, not a promise.

## Known limits

- A diner with only "wanted more" plates has no upper evidence, so their estimate has a long upper tail. The per-meal change limit keeps suggestions from jumping.
- Recipe changes, weather, exams and menu pairings are not modelled. A new recipe is a new food version with its own calibration and history.
- Self-reported satisfaction can be wrong. Walking back for seconds takes effort, so "didn't ask" is not treated as "was full".
- A recency-weighting option exists (`recency_half_life`) and is off by default.
- No field data has been collected. Effect in a real kitchen is unproven.
