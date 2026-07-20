# Judge testing guide

ReplayCS is live at <https://replaycs.vercel.app>. No account, test credential, browser extension, or
OpenAI key is required. Use a fresh Chromium-based browser window at 1280 px or wider for the
curated path; the Binary Search flagship also has an automated 390 × 844 production smoke test.

The fastest entry point is <https://replaycs.vercel.app/judge-demo>. It is a browser-local checklist
that links to real, stable lab states. Tour markers do not award XP. Predictions, recoveries, lesson
completion, and Challenge Arena bosses use the actual product logic and update local progress.
After onboarding has been completed once, the home-page **Start tracing** action becomes a
personalized **Continue · [recommended lesson]** link derived from that same progress record.

## Before testing

1. Open <https://replaycs.vercel.app/api/health>.
2. Confirm `status` is `ok`, `app` is `ReplayCS`, and `aiConfigured` is a boolean.
3. Use a private window, or reset existing progress from `/progress`, if you want a clean run.
4. Keep JavaScript and browser local storage enabled. No personal data is requested.

Production currently reports `aiConfigured: true`, so the mentor should identify a structured
GPT-5.6 response. `false` remains an expected supported mode after configuration removal: the same
panel visibly labels and returns a deterministic fallback.

## Curated under-three-minute path

### 1. Binary Search: prediction, recovery, language, and mentor

Open the first Judge Demo stop, or go directly to:

<https://replaycs.vercel.app/lesson/dsa-1/binary-search?values=2%2C5%2C8%2C12%2C16%2C23%2C38%2C56&target=23&lang=python&step=2>

1. Enter `4` in **Your prediction** and choose **Lock prediction**.
2. Expected: **Replay My Mistake** compares `mid = 4` with deterministic `mid = 3` and labels the
   first divergence.
3. Choose **Replay correct transition**, enter `3` in the recovery challenge, then check it.
4. Expected: `Recovered · +6 XP` appears and the score changes once. Repeating the recovery does not
   farm XP.
5. Switch the source tab from **PYTHON** to **C++**, then back to **PYTHON**.
6. Expected: the current semantic step and array state remain selected while the source syntax
   changes.
7. Choose **Explain my mistake** in the now-unlocked mentor.
8. Expected with no key: a **Deterministic** badge and the message that AI is not configured.
   Expected with a configured key: a **GPT-5.6** badge and a response grounded in the same midpoint
   state. Either source is a passing state; neither changes the canonical trace.
9. Optional persistence check: choose **Give me a hint**, then later confirm that **Hints used** on
   `/progress` increments. A hint is recorded as evidence; it does not alter the trace or award XP.

Optional accuracy check: replace the values with an unsorted list such as `9, 3, 7`. **Build trace**
must reject it with an ascending-input message rather than silently running invalid binary search.

### 2. SQL: logical stages and aggregate-filter prediction

Open the SQL Judge Demo stop, or:

<https://replaycs.vercel.app/lesson/dbms/query-pipeline?scenario=dhaka-department-capacity&step=3>

1. Confirm the page distinguishes the educational logical order from an illustrative physical
   plan; it does not claim to display optimizer output.
2. Inspect the source tables and the `JOIN` relation. The LEFT JOIN scenario preserves unmatched
   departments with `NULL` values.
3. At the **WHERE or HAVING?** checkpoint choose **HAVING**.
4. Expected: **Correct prediction** appears and the aggregate filter can be revealed.
5. Move to `LIMIT`.
6. Expected: the final table contains `Engineering`, reports `1 row`, and saves scenario completion
   locally. The trace follows
   `FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`.

To test SQL recovery instead, use the default scenario, choose **WHERE** at the checkpoint, then
choose **HAVING** in the recovery challenge. The page must show the first `where-vs-having`
divergence and award recovery only once.

### 3. Operating Systems: deterministic scheduling

Open <https://replaycs.vercel.app/lesson/operating-systems/cpu-scheduling#algorithm-heading>.

1. Leave the default **Round Robin** workload and quantum at `2`.
2. Try **Next** before answering.
3. Expected: the Gantt trace remains gated and asks for a prediction.
4. Enter `P1`, lock the prediction, and advance.
5. Expected: the first dispatch is revealed, forward/back/restart restore exact clock states, and the
   page shows turnaround, waiting, response, and completion metrics.
6. Confirm the comparison includes **FCFS, SJF, SRTF, Priority, and Round Robin**. Lower average
   metrics are highlighted as a comparison, not asserted to be universally optimal.

### 4. Networks: cold versus warm packet journey

Open <https://replaycs.vercel.app/lesson/computer-networks/packet-journey#timeline-heading>.

1. In the default cold scenario, confirm the page reports `18 deterministic events` and explains
   that the topology and addresses are educational.
2. Switch **Browser response cache** to **Warm · fresh response**, then choose **Build journey**.
3. Expected: the bounded path has `3 deterministic events`.
4. Select **Hand cached bytes to the renderer**, lock the prediction, and advance.
5. Expected: the answer is correct; Previous returns to event 1 exactly. The page distinguishes
   hop-local MAC addressing from end-to-end IP addressing.

### 5. Challenge Arena and progress

Open <https://replaycs.vercel.app/challenges>.

1. Confirm the map contains all five shipped bosses: **Binary Bounds Boss**, **BFS Frontier Boss**,
   **SQL Pipeline Boss**, **Round Robin Boss**, and **Packet Route Boss**.
2. Keep the default Binary Bounds Boss. For checkpoint 1 choose `low = 4, high = 6`; for checkpoint
   2 choose `31 at index 5`. Check each prediction and complete the challenge.
3. Expected: the boss clears and awards `30 XP` once. Replaying a completed boss awards no
   additional XP.
4. Optional practice-mode check: on an unbeaten boss, answer incorrectly, choose **Reveal answer**,
   and finish both checkpoints. Expected: the run says **Guided practice** and awards neither a
   clear nor XP. **Replay without reveals** starts the fresh unassisted run required to clear it.
5. Open <https://replaycs.vercel.app/progress>.
6. Expected: the dashboard derives all of these panels from browser-local evidence:
   - prediction accuracy, first-attempt accuracy, and average attempts;
   - hints used, code-language activity, and recent rewarded activity;
   - boss progress out of five, subject mastery, misconception history, badges, and the next
     deterministic recommendation.
7. Mastery is intentionally explainable per live lesson: `50` points for trace completion, `30` for
   a correct prediction or recovery, and `20` for a first-try answer without a hint or for fully
   recovering every recorded mistake. A boss clear records `100%` for that boss, while the subject
   rows summarize live lesson evidence rather than AI opinion.
8. Export produces JSON; reset requires confirmation.

### 6. Returning learner handoff

Complete onboarding through the UI, return to <https://replaycs.vercel.app>, and reload if needed.
Expected: the primary action reads **Continue · [lesson title]** and links to the same deterministic
recommendation shown on `/progress`. Unfinished recovery evidence takes priority; otherwise ReplayCS
uses the learner's subject interests and incomplete live lessons. Fresh learners still see **Start
tracing** and go to onboarding.

## What GPT-5.6 contributes

GPT-5.6 explains an already-computed transition using bounded trace context: active operation,
before/after state, mutation, learner answer, misconception tags, selected programming language,
learner level, and requested English/Bangla explanation depth. It does not generate trace steps,
score predictions, compute mastery, schedule processes, execute SQL, or decide packet order. The
deterministic fallback demonstrates the same trust boundary when the key is absent, its output is
invalid, or the upstream call fails.

## Automated verification

From a local clone with Node.js 22:

```bash
npm ci
npm run check
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Run the safe production smoke test against the deployed site:

```bash
REPLAYCS_BASE_URL=https://replaycs.vercel.app \
  npx playwright test e2e/production-smoke.spec.ts
```

## Troubleshooting and accepted boundaries

- **Mentor says Deterministic:** expected while `/api/health` reports `aiConfigured: false`; the lab
  remains fully usable.
- **Progress is empty:** use the same non-private browser tab for the whole path and allow local
  storage. Progress intentionally does not sync between devices.
- **Home still says Start tracing:** that is the correct fresh-learner state. Complete onboarding
  once to activate the personalized returning-learner CTA.
- **A planned lesson card does not open:** only the functional labs listed in the README are shipped;
  roadmap cards are deliberately labeled planned.
- **A trace differs from a real production system:** SQL physical plans, packet timing/topology, and
  scheduler assumptions are explicitly bounded teaching models, not telemetry from an external
  system.
- **A release page fails:** recheck `/api/health`, then use the production workflow in
  [deployment.md](deployment.md). The documented rollback does not require rewriting Git history.

The complete honest boundary is in [known-limitations.md](known-limitations.md).
