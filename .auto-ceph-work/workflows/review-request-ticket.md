# Review Request Ticket Workflow

- Read `05_UAT.md`, `06_REVIEW.md`, and `04_EXECUTION.md`.
- Ensure Jira status is `REVIEW`.
- Summarize the work in `07_SUMMARY.md`.
- Add a `## Merge Request` section to `07_SUMMARY.md` and keep it as the single source of truth for MR metadata.
- Use the canonical helper `.auto-ceph-work/scripts/create_or_reuse_merge_request.js` for all merge-request work.
- The helper must use `glab` CLI internally to find an existing open merge request for `feature/<TICKET-ID>` -> `dev`; reuse it when present.
- If no open merge request exists, the helper must create one with `glab` using the Jira-derived title and the `07_SUMMARY.md` summary as the MR body.
- Sync Jira note to `리뷰 요청`.
- Sync Jira description `### 루프 히스토리` to the full contents of `08_LOOP.md`.
- Return a final `<stage_result>` block with all required fields from `stage-result-format.md`.
