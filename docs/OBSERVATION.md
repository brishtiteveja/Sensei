# Session observation — the tutor watches the work, not the screen

## The decision

On web the observer is an **event-sourced flight recorder, not video**.

The mobile research (view-shot frames + structured events, batched to a server)
is the right answer for a platform that cannot see inside its own UI. The web
app is in a stronger position: **we own every surface the student works on**.
The notebook is structured blocks, the scratchpad is a vector shape list,
practice answers and tutor turns are already ours. Recording semantic events
gives:

- **Lossless replay.** A stroke list replays perfectly at any resolution;
  video of the same canvas is lossy and orders of magnitude larger.
- **No capture prompt.** `getDisplayMedia` throws a browser permission dialog
  and can capture other tabs. Structured JSON to our own box keeps the
  "no third-party requests" promise intact.
- **A tutor that can actually read it.** The digest goes into the system prompt
  as text on every turn. Feeding video would mean running a vision model
  continuously, which the one-model-resident constraint makes ruinous.
- **The dataset falls out for free.** Append-only JSONL per session already is
  the training corpus: timestamped mistakes, corrections and hesitations
  (visible as gaps between events), joinable to ability level by learner id.

Pixels enter only where pixels *are* the content — an inserted sketch or an
uploaded photo — and then they go through `/tutor/see` once, not as a stream.

## Event schema

One JSON object per line, one file per session per day:

```json
{"t": 1786868812231, "type": "practice.check", "data": {"qid": "…", "picked": "B", "correct": false}}
```

| type | fired when |
|---|---|
| `route` | navigation |
| `practice.question` | a question is shown |
| `practice.pick` | an option is selected (click or 1-9 key) |
| `practice.check` | answer checked — carries `correct` |
| `practice.special` | curated-examples toggle |
| `notebook.open` | a notebook is opened |
| `notebook.block` | add / edit (final text on blur) / remove / move |
| `sketch.shape` | each committed stroke or shape |
| `sketch.undo`, `sketch.clear` | canvas edits |
| `sketch.insert`, `image.insert` | work put into the conversation |
| `tutor.user` | student message sent |

## Flow

```
web app ──batch (5 s or 25 events, fetch keepalive)──▶ POST /observe
   │                                                     └─ data/observations/<date>/<session>.jsonl
   └─ in-memory tail ──▶ digest() ──▶ context_data.observation on every turn
                                       └─ prompt section "What the student has just been doing"

inserted sketch/photo ──▶ POST /tutor/see (same pinned model, so no swap)
                            └─ note ──▶ context_data.seen_work
                                          └─ prompt section "The student's own work"
```

`digest()` collapses repeats (`drew freehand (x20)`) and keeps the last ~2.5
minutes, so the prompt stays small while still saying what just happened.

Both prompt sections are appended after the context-type block in
`build_dikkha_prompt`, because a student can be drawing during a lesson, a
practice question or a free chat — workspace awareness is orthogonal to type.

## Degradation

Every layer fails soft, because telemetry must never interrupt a lesson:
`/observe` returns ok:false and logs rather than raising; `postObservations`
swallows network errors; `/tutor/see` returns `{note: null, reason}` when no
vision model is configured, and the client then sends the message without
pretending the work was read.

## Mobile (later)

Same schema and same endpoint. Add `frame` events carrying a view-shot JPEG on
navigation / meaningful gestures / at most one per second, per the researched
hybrid. Nothing on the server needs to change to accept them.

## Privacy

Anonymous per-tab session id, sent only to our own box. Before collecting
across real students: a consent screen, learner-id opt-in, and a retention
window. The plumbing exists; the collection phase is a deliberate later step.
