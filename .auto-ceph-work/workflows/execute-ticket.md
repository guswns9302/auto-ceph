# Execute Ticket Workflow

- Read `03_PLAN.md`.
- Work on the declared branch.
- Ensure Jira status is `IN PROGRESS` before implementation work.
- Implement the planned changes.
- If this run re-enters through `retry_reason=verification_unblock`, limit edits to the smallest compile/test unblock changes that directly unblock the current ticket verification.
- Do not use verification-unblock retry to widen product requirements, refactor unrelated areas, or start repository-wide cleanup.
- Record commands, files, and issues in `04_EXECUTION.md`.
- In `04_EXECUTION.md`, separate original ticket work from verification-unblock fixes when both exist.
- Ensure Jira status is `RESOLVE` when execution work and artifacts are complete.
- Sync Jira note to `수행`.
- Return a final `<stage_result>` block with all required fields from `stage-result-format.md`.
