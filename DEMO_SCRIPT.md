# Three-minute demo script

Target length 2:50. Record the deployed site, not localhost: the footer shows the Lambda function, region and request id on every screen, which is how the video shows AWS.

Before recording: open the app URL, click **Try the demo**, then **Reset demo** if the button shows a count. Browser at 100% zoom, window about 1366 × 860.

Everything in the demo is generated data. Say so once, early. Do not quote any figure as measured.

| Time | On screen | Say |
|---|---|---|
| 0:00–0:18 | Landing page. Point at the two empty plates. | "A college mess decides the first portion before it knows how hungry each diner is. Too much gets thrown away; too little, and someone leaves hungry. And here is the catch: an empty plate looks the same whether the diner had enough or wanted more." |
| 0:18–0:35 | **Try the demo** → Serve. Click **T-104**. | "This is ProofPlate, running on AWS. Everything in this demo is simulated data, and it is labelled. Diner T-104 was served three scoops six times and left about one each time. The suggestion is two scoops, with the range and the reason." |
| 0:35–1:05 | Click **T-309**. **Serve 3½ scoops**. Under **Leftovers from two photos**, add the **Before eating** photo (your own plate, or **Try a generated before and after pair**). Wait for the outline, **Use this outline**. Add the **After eating** photo, show one correction (**Not food** or **Add food**, then tap), **Use this outline**, then **Use … g as the returned amount**. Choose **Enough**, **Had enough**, **Save return**. | "A new diner has no history, so the suggestion comes from the cohort. We serve it and take a photo. When the plate comes back we take another. The app finds the plate and the food in each, in the browser, and I can correct the outline with a tap. Because we know what was served, the change in area becomes grams left, with a range, since a photo cannot see depth. The photos never leave the device. Then the one question: was that enough? Save. That went through the API into the model, and the next first portion changed." |
| 1:05–1:20 | Click **T-221**. Press **−** once, **Serve**, then **+ ½ scoop**. | "T-221 finishes every plate and says they wanted more. So the suggestion goes up, not down. The diner can still ask for less, and seconds are one tap. A suggestion never overrides a request." |
| 1:20–1:50 | **Learn**. Scroll to **Same empty plate, different evidence**. Click the three buttons in turn. | "This is the core idea. Same plate, same scale reading. If nobody asked, the model learns nothing. If they said enough, appetite was about this much. If they wanted more, it was at least this much, and the estimate can only go up. A plain average would treat all three the same and keep serving three scoops." |
| 1:50–2:15 | **Kitchen**. Change **Expected diners** to 200. Then **Stock on hand** to 25. | "Those estimates roll up into the kitchen plan: how much to cook before service, how much to hold in reserve, and when to start each batch. Raise attendance and it recomputes. Cut the stock and it does not pretend: the plan is marked not feasible, with the reason and the options." |
| 2:15–2:40 | **Evidence** → Simulated. Point at the chart and the "Like for like" note. Click **Observed**. | "Evidence is split into observed, predicted and simulated. In simulation, to leave as few diners wanting more as ProofPlate does, a fixed portion left about 55 grams per plate; ProofPlate left about 29. That is a simulator result. The observed tab is empty, because no real kitchen has been measured yet." |
| 2:40–2:55 | Scroll to the footer. Then the architecture diagram in the README (optional cut). | "It runs on CloudFront and S3, API Gateway and Lambda for the model, DynamoDB for pilot records, and Cognito for operators. No servers left running. ProofPlate links serving, seconds and leftovers into the next meal's plan. The next step is a real pilot." |

## If you have ten spare seconds

After saving T-309's return, refresh the page and click **T-309** again: the plate is still there. In the demo this is your browser's sandbox; in the pilot workspace it is DynamoDB.

## Using your own plate for the photo step

It is more convincing than the generated pair, and it is the only real-food evidence you will have on camera.

- Shoot from directly above with the whole plate in frame, roughly centred. Use a plate that contrasts with the food.
- Take the before photo right after serving, before any seconds. Take the after photo of the same plate.
- The first photo takes longer (a one-time 14 MB download). Open the photo step once before recording so it is cached.
- If an outline is off, fix it on camera: that is the feature, not a failure.
- Say that the grams are an estimate with a range and have not been checked against a scale. If you have a kitchen scale, weigh the leftovers and say both numbers, whatever they are.
- If you use the generated pair instead, say that the images are generated.

## Numbers you may quote, and how

Check them against `EVALUATION.md` before recording; they come from the evaluation run stored in the repository.

- "In simulation" or "in the simulator" must be said with every figure.
- Baseline world, 8 seeds: usual 3-scoop portion left 28.9 g per plate with 19.8% of plates leaving the diner wanting more; ProofPlate left 29.5 g with 10.8%.
- Like for like: a fixed portion matching 10.8% would leave about 55 g per plate (interpolated).
- Do not say "reduces waste by X%" without "in simulation, at the same availability".

## Recording

- Windows 11: Snipping Tool → Record, with microphone on. Or Xbox Game Bar (Win + Alt + R).
- Keep it under 3:00. Upload to YouTube as public or unlisted.

## A silent guide video

`python tests/e2e/walkthrough.py <app-url> --video` drives the same path in Chrome and saves a silent recording under `build/video/`. Use it to rehearse timing, or as B-roll under your narration. It contains no narration and makes no claims.
