---
name: aceph:intake-ticket
description: Intake an assigned Jira ticket into 01_TICKET.md and 02_CONTEXT.md, then sync Jira to IN PROGRESS.
argument-hint: "<TICKET-ID>"
agent: aceph-ticket-intake
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---
<objective>
Create or refresh the intake-stage artifacts for a Jira ticket.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/workflows/intake-ticket.md
@.auto-ceph-work/references/jira-sync.md
@.auto-ceph-work/references/stage-result-format.md
</execution_context>

<context>
Ticket ID: required in `$ARGUMENTS`

- Required artifacts: `doc/<TICKET-ID>/01_TICKET.md`, `doc/<TICKET-ID>/02_CONTEXT.md`
- Jira target state: `IN PROGRESS`
- Jira target note: `문제 확인`
- Jira state transition timing: 문제 확인 단계에서 `IN PROGRESS`
- Stage must first update the Jira issue description `### 작업 노트` section with the current-stage block `#### 문제 확인` plus `- 시작`, then create artifacts, then replace that same stage block with the Jira stage summary bullet items.
</context>

<process>
Execute the intake workflow from @.auto-ceph-work/workflows/intake-ticket.md.
Treat `[ACW]` in the Jira title and `repo == basename(project root)` as the intake gate.
Treat `repo` and `remote` as the only required Jira description inputs for stage completion.
If Jira `repo` does not match the current project repo, do not treat the ticket as a valid intake success.
If the ticket is a valid intake target, prepare the actual work branch as `feature/<TICKET-ID>` during intake before declaring `missing_required_inputs`.
Use Atlassian MCP `jira_get_issue` and `jira_update_issue` to update the issue description itself. Do not use comment APIs for work-note writes.
The stage is complete only when the Jira start note, the required `IN PROGRESS` transition, artifact updates, and Jira summary note have all succeeded.
Return a final `<stage_result>` block.
</process>
