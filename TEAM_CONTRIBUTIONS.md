# Team deliverables and AI disclosure

**Proposed ownership for the three-person team:** Agrim Jindal, Alabhya Jha, and Bhuvan Raju. These assignments describe who should own, verify, and present each deliverable. They are not claims that a named person personally wrote every file. Confirm them against the team's actual work before publishing a contribution statement.

| Owner | Major deliverables | Demo and submission role |
|---|---|---|
| **Agrim Jindal** | Problem definition, product requirements, censored demand model and serving policy (`services/api/proofplate/model/`, `planning/`, `MODEL_CARD.md`); simulator, policy comparisons, and limitations (`evaluation/`, `EVALUATION.md`); real-world measurement plan (`PILOT_PROTOCOL.md`, `docs/STATION_SHEET.md`). Verify the assumptions, reported figures, and distinction between simulated and observed results. | Explain the empty-plate problem, the Learn view, the evaluation, and the proposed pilot. Review every outcome claim in the final entry. |
| **Alabhya Jha** | Backend and data flow (`services/api/proofplate/domain/`, `repositories/`, `service.py`, `main.py`); demo/pilot isolation, import/export, data provenance (`DATA_MANIFEST.md`), and API/storage tests; AWS infrastructure and deployment (`infra/`, deployment scripts, `DEPLOYMENT.md`), including operator access, production checks, and cost assumptions. | Demonstrate serving, recording a return, and persistence. Explain the AWS architecture and verify every live URL and deployment claim. |
| **Bhuvan Raju** | Web app, interaction design, and two-photo leftover estimate (`apps/web/`, `DESIGN.md`); mobile and desktop browser checks, generated demo photos, screenshots, and walkthroughs (`tests/e2e/`, `docs/screenshots/`); final `README.md`, `SUBMISSION.md`, and `DEMO_SCRIPT.md` coordination. Verify photo uncertainty and keep the browser flow reproducible. | Demonstrate photo correction and kitchen planning. Rehearse and coordinate the recording, then assemble the reviewed submission materials. |

## Shared review

- Each owner checks the deliverables in their row. All three review the final submission and demo before they are published.
- There are no real kitchen measurements yet. The evaluation is simulated; the photo-derived grams have not been validated against weighed leftovers. Keep those limits next to any results.
- Add the verified team contributions and AI disclosure to the final `SUBMISSION.md` before sending the entry.

## AI-use disclosure for the submission

> We used **Claude Code (Anthropic)** extensively while building ProofPlate. It wrote the majority of the application code, tests, AWS infrastructure template, and documentation from the team's specification. Agrim Jindal, Alabhya Jha, and Bhuvan Raju own the project decisions, review, verification, and claims described in their confirmed contributions. The optional photo estimate uses SlimSAM through Transformers.js in the browser; this is a runtime model used by the product.

The statement about Claude Code reflects the last committed `SUBMISSION.md` and the existing blog drafts. Confirm which human reviews and checks each member actually performed before publishing. List any other AI tools and their specific contributions if the team used them. Do not describe AI-generated implementation as solely handwritten by a teammate.
