---
name: aceph:verify-ticket
description: Verify implemented work with tests, Playwright, and manual checks, then write 05_UAT.md.
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
Verify the implemented ticket work and capture a clear validation result in `05_UAT.md`.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/workflows/verify-ticket.md
@.auto-ceph-work/references/workflow.md
@.auto-ceph-work/references/stage-result-format.md
</execution_context>

<context>
Ticket ID: required in `$ARGUMENTS`

- Required artifact: `doc/<TICKET-ID>/05_UAT.md`
- Jira target note: `검증`
- Jira target state: `REVIEW`
- Jira state transition timing: 검증 시작 시
- Optional helper: one `explorer` for test prioritization or Playwright target discovery
- Stage must first update the Jira issue description `### 작업 노트` section with `#### 검증` plus `- 시작`, then update artifacts, then replace that same stage block with the Jira stage summary bullet items.
</context>

<process>
Execute the verification workflow from @.auto-ceph-work/workflows/verify-ticket.md.
If the ticket is API-oriented, run tests first and summarize the verification result from automated checks and updated artifacts.
This stage validates behavior and release readiness only; code quality review belongs to the separate `코드 리뷰` stage.
The stage is complete only when the Jira start note, the required `REVIEW` transition, artifact updates, and Jira summary note have all succeeded.
Return a final `<stage_result>` block.
</process>
