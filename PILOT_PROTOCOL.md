# Pilot protocol

A feasibility pilot for one dining hall, one food (cooked rice), 10–20 consenting adult diners, over several repeated meals of the same recipe.

**What this pilot can show:** whether the serve → return → update loop is usable at a real counter, and how well the measurements hold up.
**What it cannot show:** a proven reduction in waste. The sample is small and self-selected, staff know they are being observed, and menus differ between days. Report results as exploratory, with denominators.

No pilot has been run yet. The pilot workspace starts empty.

## Ground rules

1. **Food access comes first.** Every diner can ask for any portion and can always have seconds. Never hold food back to improve a number.
2. **Voluntary.** Adults only. Anyone can stop at any time; their token and plates can be deleted on request (Setup → Diner tokens → Delete).
3. **Minimum data.** A token on a card. No names, faces, body measurements or health details.
4. **Food safety.** Follow the kitchen's existing procedures. The app makes no food-safety decisions.

## Equipment

- A kitchen scale reading to 1 g, checked against a known weight at the start of each service.
- One serving scoop, labelled (for example `ladle-A`).
- Token cards (for example `T-501`).
- A tablet or phone at the serving counter and at the plate-return point.

## Before the first service: calibrate the scoop

Repeat for each food, recipe and scoop. Do it again whenever the scoop, recipe, consistency or serving style changes.

1. Tare the container.
2. Serve a normal scoop into it, as you would for a diner. Record the weight.
3. Repeat about 20 times, taring each time.
4. Enter the weights in **Setup → Record a scoop calibration**. The app stores the individual weights, mean, spread and scale resolution as a new version.

Weighed quantities and scoop-estimated quantities stay labelled as such in every record.

## At the serving counter

1. Enter the diner's token.
2. The screen shows a suggested first portion with its range and reason.
3. If the diner wants a different amount, use **Choose a different portion**. The request is served and recorded.
4. Tap **Serve**. For seconds, tap **+ ½ scoop** or **+ 1 scoop** each time.
5. If the diner does not want this food, tap **Doesn't want this food**.

## At the plate return

1. Enter the token.
2. Weigh the edible food left. Subtract the empty plate (tare). Enter grams.
3. Ask: **"Was that enough?"** Record *Enough*, *Wanted more*, or *Not sure / not asked*.
4. If food is left, ask why: had enough, didn't like it, had to leave, shared, don't know.
5. Under "Seconds, spills and sharing" record whether seconds were asked for and available, anything spilled, and whether food was shared.

If a step is missed, leave it blank. Do not guess. A missing return is recorded as missing, not as zero waste.

## Things that make a plate unusable for learning

These are still recorded; they just do not move anyone's estimate.

- Food shared in unknown amounts.
- Leftovers because of dislike or interruption.
- An empty plate where nobody asked whether it was enough.

## After each service

In **Setup → Meal services → Close**, enter:

- cooked in total (kg),
- cooked but not served (kg),
- what happened to it: kept, donated, discarded, not recorded.

Plate waste, kitchen surplus and preparation losses are separate quantities and are never added twice.

## If the tablet is offline

Use the paper sheet in `docs/STATION_SHEET.md`. Enter it later through **Setup → Import**, declaring the file as *really measured*, with how it was collected. Imported rows keep the label "imported".

## If comparing a baseline period with an intervention period

- Use comparable menus and weekdays. Report attendance and anything else that differed.
- Assign by random draw or crossover only with voluntary participation and full food access in both arms.
- Report effect sizes with sample sizes and uncertainty. Do not call an uncontrolled before/after difference causal.

## Reporting

Use the **Evidence** page and its export. Always state: site, dates, food and recipe, number of plates, return coverage, what was excluded and why, and that values are operator-declared measurements.
