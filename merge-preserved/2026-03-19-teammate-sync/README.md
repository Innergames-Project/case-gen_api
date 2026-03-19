This folder preserves code that arrived during the merge with `origin/master`
on 2026-03-19.

Why it was moved here:
- The current backend was intentionally simplified to `cases + ai`.
- The incoming files reintroduced part of the old `users/MySQL` flow.
- Keeping them under `src/` would break the current build because the old
  dependencies and modules were already removed.

Nothing in this folder is wired into the running app right now.
It is stored here so the team can reintroduce or port this logic later without
losing any work.
