# Verify Ticket Workflow

- Prefer tests for API changes.
- For API changes, use the request spec from `03_PLAN.md` and any execution-time overrides from `04_EXECUTION.md`, then call the real endpoint and receive an HTTP response after test execution.
- Prefer Playwright for `remote-ceph-admin`.
- Record validation outcome in `05_UAT.md`.
- If validation fails, return fallback to execution.
- Sync Jira note to `검증`.
- Return `<stage_result>`.
