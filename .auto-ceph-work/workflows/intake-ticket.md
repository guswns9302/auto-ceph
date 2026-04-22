# Intake Ticket Workflow

- Read assigned Jira `TO DO` issue.
- Accept only Jira issues whose title contains `[ACW]` and whose `repo` matches the current project root directory name.
- Prepare the ticket work branch as `feature/<TICKET-ID>` from `dev` before the ticket can proceed.
- Extract and validate the minimum required inputs from Jira description: `repo`, `remote`.
- Create or update `01_TICKET.md` and `02_CONTEXT.md`.
- Sync Jira to `IN PROGRESS` and `문제 확인`.
- Return a final `<stage_result>` block with all required fields from `stage-result-format.md`.
