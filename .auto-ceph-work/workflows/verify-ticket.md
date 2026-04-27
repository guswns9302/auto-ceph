# Verify Ticket Workflow

- Prefer tests for API changes.
- For API changes, use the available test suite and implementation artifacts to decide whether the change is verified.
- Prefer the `$playwright` skill canonical wrapper for `remote-ceph-admin`.
- Browser verification must use `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh`; do not use `npx playwright`, `@playwright/test`, or ad-hoc Playwright Node scripts.
- Default browser verification to headless mode. Do not use `--headed`, `show`, or `pause-at` unless the user explicitly requested visual debugging.
- Ensure Jira status is `IN PROGRESS`.
- Record validation outcome in `05_UAT.md`.
- Classify failure explicitly as product failure, environment failure, or `verification_unblock`.
- Use `verification_unblock` only when the current ticket cannot be verified because unrelated compile/test blockers stop test execution before ticket-scope behavior can be exercised.
- If validation fails, return fallback to execution.
- Sync Jira note to `검증`.
- Return a final `<stage_result>` block with all required fields from `stage-result-format.md`.
