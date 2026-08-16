# Sensei — deferred work (parked, not lost)

Short list of things intentionally left for later, so they don't get forgotten.

## Mobile notebook parity with web
- **Per-lesson / per-practice entry buttons on mobile.** The web app has a
  "Notebook" button on Practice, Lesson, and the tutor that opens the notebook
  bound to that specific problem. Mobile has the notebook reachable from the
  chat's Quick Tools bar and the library, and the per-context capability exists
  via the `?k=lesson:<id>` / `?k=practice:<id>` route param — but there is no
  button yet on the mobile lesson-detail / quiz screens to reach a bound
  notebook. Wire those.
- **Persist mobile uploaded photos as data URIs.** Mobile image blocks store the
  picked `file://` uri (lighter), while sketches store base64. expo-image-picker
  uris live in a cache the OS can evict, so an uploaded photo can vanish on
  restart while sketches survive. Match the web behaviour: read the picked file
  and downscale to a data URI before storing (see web `lib/image.ts`).

## Worked-problem Socratic pipeline (in progress)
- The teammate's `samples/` kit (curated per-subject problems with one correct
  and several one-mistake solutions) plus `backend/sensei`'s vision
  `/tutor/diagnose` endpoint are the real "AI observes the mistake" engine.
  Near-term: surface the curated problems in Practice behind an advanced/special
  toggle. Next: deploy `backend/sensei` and wire the photo-of-work → diagnose →
  Socratic-opening flow end to end from the notebook/scratchpad.

## Dashboard-wide user sessions
The global recorder in the sidebar stays for now: it is the only thing that
captures free-form work outside a problem (tutor chat, a free notebook page).
The fuller idea is a *user session* spanning the whole dashboard — sign in,
work across practice, lessons and the notebook, and have one timeline that
stitches the attempts together with everything between them. That needs a
learner identity and a consent story first, so it waits behind those.
