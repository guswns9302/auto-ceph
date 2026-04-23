---
name: aceph:code-review-ticket
description: Review implemented work for code quality, risk, and maintainability, then write 06_REVIEW.md.
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
Review the implemented ticket work for code quality and capture review findings and approval status in `06_REVIEW.md`.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/workflows/code-review-ticket.md
@.auto-ceph-work/references/workflow.md
@.auto-ceph-work/references/stage-result-format.md
</execution_context>

<context>
Ticket ID: required in `$ARGUMENTS`

- Required artifact: `.auto-ceph-work/tickets/<TICKET-ID>/06_REVIEW.md`
- Jira target note: `코드 리뷰`
- Jira target state: `RESOLVE`
- Review inputs: `03_PLAN.md`, `04_EXECUTION.md`, `05_UAT.md`, current ticket branch diff, changed files
- Stage must first update the Jira issue description `### 작업 노트` section with `#### 코드 리뷰` plus `- 시작`, then update artifacts, then replace that same stage block with the Jira stage summary bullet items.
</context>

<process>
Execute the code-review workflow from @.auto-ceph-work/workflows/code-review-ticket.md.
Focus on code quality, regressions, edge cases, structure, maintainability, and test sufficiency.
Do not treat this stage as a second verification run and do not require test reruns unless a review claim cannot be supported otherwise.
If blocking findings exist, record `changes_requested` and return a retryable stage result with fallback `수행`.
The stage is complete only when the Jira start note, the required `RESOLVE` guarantee, artifact updates, and Jira summary note have all succeeded.
Return a final `<stage_result>` block that includes all required fields from @.auto-ceph-work/references/stage-result-format.md.
</process>
