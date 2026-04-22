---
name: aceph:plan-ticket
description: Write 03_PLAN.md with git preparation, implementation tasks, and verification criteria for a reviewed ticket.
argument-hint: "<TICKET-ID>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
---
<objective>
Turn the reviewed ticket context into an executable `03_PLAN.md`, including verification criteria when applicable.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/workflows/plan-ticket.md
@.auto-ceph-work/references/workflow.md
@.auto-ceph-work/references/stage-result-format.md
</execution_context>

<context>
Ticket ID: required in `$ARGUMENTS`

- Required artifact: `doc/<TICKET-ID>/03_PLAN.md`
- Jira target note: `계획`
- Optional helper: one `explorer` for repo-specific pattern lookup only
- Stage must first update the Jira issue description `### 작업 노트` section with `#### 계획` plus `- 시작`, then update artifacts, then replace that same stage block with the Jira stage summary bullet items.
</context>

<process>
Execute the planning workflow from @.auto-ceph-work/workflows/plan-ticket.md.
For API tickets, the plan is incomplete unless `03_PLAN.md` defines test-oriented verification criteria and success criteria.
The stage is complete only when the Jira start note, artifact updates, and Jira summary note have all succeeded.
Return a final `<stage_result>` block that includes all required fields from @.auto-ceph-work/references/stage-result-format.md.
</process>
