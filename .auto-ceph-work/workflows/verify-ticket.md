# Verify Ticket Workflow

- Prefer tests for API changes.
- For API changes, use the available test suite and implementation artifacts to decide whether the change is verified.
- Prefer Playwright for `remote-ceph-admin`.
- Record validation outcome in `05_UAT.md`.
- If validation fails, return fallback to execution.
- Sync Jira note to `검증`.
- Return `<stage_result>`.
