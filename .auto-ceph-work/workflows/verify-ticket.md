# Verify Ticket Workflow

- Prefer tests for API changes.
- For API changes, use the available test suite and implementation artifacts to decide whether the change is verified.
- Prefer Playwright for `remote-ceph-admin`.
- Record validation outcome in `05_UAT.md`.
- If validation fails, return fallback to execution.
- Sync Jira note to `검증`.
- Return a final `<stage_result>` block with all required fields from `stage-result-format.md`.
