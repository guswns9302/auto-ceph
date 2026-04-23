# Review Request Ticket Workflow

- Read `05_UAT.md`, `06_REVIEW.md`, and `04_EXECUTION.md`.
- Ensure Jira status is `REVIEW`.
- Write the non-MR handoff summary in `07_SUMMARY.md`.
- Ensure the current checkout branch is `feature/<TICKET-ID>` before any git post-processing.
- Commit the current ticket branch changes with the fixed ticket terminal message rule when the worktree changed.
- Push the current branch upstream first; if no upstream exists, push to ticket `remote` and `feature/<TICKET-ID>`.
- Use the canonical helper `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh` for all non-MR git post-processing.
- The helper must validate the current checkout branch as `feature/<TICKET-ID>`, commit tracked changes when needed, and push upstream first or fall back to ticket `remote` and `feature/<TICKET-ID>`.
- Use the canonical helper `.auto-ceph-work/scripts/create_or_reuse_merge_request.js` for all merge-request work.
- The helper must use `glab` CLI internally to find an existing open merge request for `feature/<TICKET-ID>` -> `dev`; reuse it when present.
- If no open merge request exists, the helper must create one with `glab` using the Jira-derived title and the non-MR summary sections from `07_SUMMARY.md` as the MR body.
- After helper success, add a `## Merge Request` section to `07_SUMMARY.md` and keep it as the single source of truth for MR metadata.
- Final-sync Jira description by updating the `#### 리뷰 요청` stage summary and replacing the top-level `### 루프 히스토리` section with the full contents of `08_LOOP.md`.
- Return a final `<stage_result>` block with all required fields from `stage-result-format.md`.
