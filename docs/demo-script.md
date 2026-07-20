# ReplayCS under-three-minute demo

Target runtime: **2:55**. Use the public site at <https://replaycs.vercel.app>, a fresh browser
profile, 1440 × 900 capture, 100% zoom, and the real `/judge-demo` links. Rehearse once after the
final deployment. Do not edit local storage, mock API output, or use developer tools in the video.

## Exact shot list and narration

| Time      | Page and exact interaction                                                                                           | Required on-screen proof                                                                            | Narration                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:12 | `/` — hold on the hero and live Binary Search preview; select **Judge Demo**.                                        | “Pause computer science. Trace every state.” and the prediction-first preview.                      | “Students can often recognize an answer but still cannot predict what the computer will do next. ReplayCS trains that missing execution skill.”                                                    |
| 0:12–0:34 | Judge stop 1 → Binary Search at step 2. Enter `4`; **Lock prediction**.                                              | Predicted `mid = 4`, actual `mid = 3`, and **First divergence**.                                    | “The learner commits before reveal. Deterministic trace truth catches an index-reasoning mistake at the first divergent state.”                                                                    |
| 0:34–0:50 | **Replay correct transition**; enter recovery `3`; **Check recovery**.                                               | Before/after transition, `Recovered · +6 XP`, updated score.                                        | “Replay My Mistake preserves the wrong state, replays the correct mutation, and turns it into a rewarded recovery—not a dead-end red mark.”                                                        |
| 0:50–1:08 | Switch from **PYTHON** to **C++** and back, then choose **Explain this step**.                                       | Step stays selected; source changes; mentor displays **GPT-5.6** or **Deterministic** source badge. | “The same semantic step survives a language switch. GPT-5.6 can explain this exact trace context; this deployment also degrades visibly to deterministic teaching text when no key is configured.” |
| 1:08–1:27 | Return to Judge Demo → SQL stop. Show logical/physical distinction; at **WHERE or HAVING?**, choose **HAVING**.      | Source/intermediate tables, “Logical order ≠ physical plan,” and correct prediction.                | “The architecture transfers beyond code. SQL becomes intermediate relations, and the learner predicts why an aggregate filter belongs in HAVING.”                                                  |
| 1:27–1:47 | Judge Demo → CPU stop. With Round Robin q=2, enter `P1`, lock, advance, then show comparison.                        | Gated first dispatch, Gantt state, and all five scheduler cards.                                    | “CPU scheduling uses the same predict-and-replay loop. Five tested policies produce exact Gantt and response, wait, and turnaround metrics.”                                                       |
| 1:47–2:06 | Judge Demo → Packet Journey. Switch cache to **Warm**, build, choose **Hand cached bytes to the renderer**, advance. | Three-event warm path, correct checkpoint, topology/layer labels.                                   | “Packet Journey follows a browser request across bounded cache, DNS, ARP, TCP, TLS, HTTP, and render states while keeping its simplifications explicit.”                                           |
| 2:06–2:24 | `/challenges` — open one subject boss, show two checkpoints, then a completed state.                                 | Deterministic check/retry/reveal and one-time `30 XP` reward.                                       | “Five subject bosses reuse deterministic truth. Replays remain available, but idempotent rewards prevent XP farming.”                                                                              |
| 2:24–2:40 | `/progress` — show XP, accuracy, misconception, mastery rows, and recommendation.                                    | Activity-derived progress and the next recommended action.                                          | “Real interactions—not model opinion—update browser-local mastery, misconception evidence, and the next recommendation.”                                                                           |
| 2:40–2:50 | GitHub `commits/main` in a prepared tab, then `docs/architecture.md`.                                                | Focused commit history and deterministic-engine → snapshot → optional-mentor boundary.              | “Codex helped audit, implement, test, and document the architecture through recoverable commits. Execution truth stays separate from AI explanation.”                                              |
| 2:50–2:55 | Return to `/` hero.                                                                                                  | ReplayCS mark and closing promise.                                                                  | “ReplayCS does not give students another answer. It teaches them to predict what the computer will do next.”                                                                                       |

## Recording checklist

- Confirm <https://replaycs.vercel.app/api/health> is healthy immediately before recording.
- Check whether the mentor source will be `GPT-5.6` or `Deterministic`, and use the matching truthful
  narration; never imply a fallback response came from the model.
- Start with empty progress and use only the interactions in this script to populate it.
- Pre-open only the public app, the public commit history, and the repository architecture document.
- Keep the pointer still during narration and avoid scrolling past planned cards.
- Retake if a toast, prediction, XP value, or model-source badge is not readable.
- Export at 1080p and verify the final file is strictly shorter than three minutes.

For reproducible expected results, see [judge-testing-guide.md](judge-testing-guide.md). Generate the
real screenshot set with `npm run screenshots`; do not substitute mockups for application output.
