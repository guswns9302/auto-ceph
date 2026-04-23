---
name: aceph:review-ticket
description: Review Jira source against ticket docs and lock the implementation scope for the ticket.
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
Review the ticket source and generated docs to produce a reliable implementation scope.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/workflows/review-ticket.md
@.auto-ceph-work/references/jira-sync.md
@.auto-ceph-work/references/stage-result-format.md
</execution_context>

<context>
Ticket ID: required in `$ARGUMENTS`

- Required artifact: `doc/<TICKET-ID>/02_CONTEXT.md`
- Jira target note: `문제 검토`
- Jira target state: `IN PROGRESS`
- Fallback stage on mismatch: `문제 확인`
- Stage must first update the Jira issue description `### 작업 노트` section with `#### 문제 검토` plus `- 시작`, then update artifacts, then replace that same stage block with the Jira stage summary bullet items.
</context>

<process>
Execute the review workflow from @.auto-ceph-work/workflows/review-ticket.md.
Lock implementation scope and verification points, but allow a narrow exception for verification-unblock fixes that directly unblock ticket validation.
The stage is complete only when the Jira start note, the required `IN PROGRESS` guarantee, artifact updates, and Jira summary note have all succeeded.
Return a final `<stage_result>` block that includes all required fields from @.auto-ceph-work/references/stage-result-format.md.
</process>
