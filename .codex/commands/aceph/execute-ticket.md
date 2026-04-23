---
name: aceph:execute-ticket
description: Execute 03_PLAN.md on the prepared ticket branch and record implementation progress in 04_EXECUTION.md.
argument-hint: "<TICKET-ID>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---
<objective>
Implement the approved ticket plan on the prepared ticket branch and keep the execution log complete.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/workflows/execute-ticket.md
@.auto-ceph-work/references/stage-result-format.md
@.auto-ceph-work/references/jira-sync.md
</execution_context>

<context>
Ticket ID: required in `$ARGUMENTS`

- Required artifact: `.auto-ceph-work/tickets/<TICKET-ID>/04_EXECUTION.md`
- Jira target note: `수행`
- Jira start state: `IN PROGRESS`
- Jira end state: `RESOLVE`
- Jira state transition timing: 시작 시 `IN PROGRESS`, 수행 작업 완료 시 `RESOLVE`
- Execution must stay within `03_PLAN.md` by default
- If this run is a retry for `retry_reason: verification_unblock`, execution may apply only the minimum compile/test unblock changes that directly unblock the current ticket verification
- Stage must first update the Jira issue description `### 작업 노트` section with `#### 수행` plus `- 시작`, then update code and artifacts, then replace that same stage block with the Jira stage summary bullet items.
</context>

<process>
Execute the implementation workflow from @.auto-ceph-work/workflows/execute-ticket.md.
When the retry reason is `verification_unblock`, do not widen product scope. Limit edits to the concrete compile/test blockers that directly prevent the current ticket from being verified.
The stage is complete only when the Jira start note, the required `IN PROGRESS` guarantee, artifact updates, the required `RESOLVE` transition, and Jira summary note have all succeeded.
Return a final `<stage_result>` block that includes all required fields from @.auto-ceph-work/references/stage-result-format.md.
</process>
