# PR body and title

- A PR closes stories, not epics: `Closes #<story>`, and mention the epic. `Closes` moves the issue to In progress
  and then Done on merge.
- The title is conventional and at most 72 characters (see the `commit` extension).
- On a stack, open each layer's PR with `gh pr create --base <layer below> --title "<conventional title>"` and the
  body below before `gh stack submit --auto`, which only links them. Its generated titles fail CI's PR-title check,
  and that check does not rerun when a title is edited.
- Sections, in order:

  ```markdown
  ## Summary

  <what changed and why, 2-5 bullets>

  Closes #<story>

  ## Full-stack slice

  - [x] Migration / schema
  - [x] Domain or engine logic
  - [x] API contract and handler
  - [x] Angular feature
  - [x] `en` message keys
  - [x] Tests

  <untick or delete layers this story does not touch>

  ## Screenshots

  | Screen            | Before                         | After        |
  | ----------------- | ------------------------------ | ------------ |
  | <screen or story> | <before link, or `New screen`> | <after link> |

  <or `No UI change.` and delete the table>

  ## Testing

  <commands run and their results; what was not run and why>

  ## Review

  <the review panel's summary: personas run, findings fixed, anything left PLAUSIBLE for a human>
  ```
