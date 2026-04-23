---
name: aceph:review-request-ticket
description: Summarize a reviewed ticket in 07_SUMMARY.md.
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
Prepare the final review-request output for a code-reviewed ticket.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/workflows/review-request-ticket.md
@.auto-ceph-work/references/jira-sync.md
@.auto-ceph-work/references/stage-result-format.md
</execution_context>

<context>
Ticket ID: required in `$ARGUMENTS`

- Required artifact: `.auto-ceph-work/tickets/<TICKET-ID>/07_SUMMARY.md`
- Jira target note: `리뷰 요청`
- Jira target state: `REVIEW`
- Stage must first update the Jira issue description `### 작업 노트` section with `#### 리뷰 요청` plus `- 시작`, then update artifacts, then replace that same stage block with the Jira stage summary bullet items.
- This stage must also sync Jira description top-level `### 루프 히스토리` to the full contents of `.auto-ceph-work/tickets/<TICKET-ID>/08_LOOP.md`.
</context>

<process>
Execute the review-request workflow from @.auto-ceph-work/workflows/review-request-ticket.md.
The stage is complete only when the Jira start note, the required `REVIEW` guarantee, artifact updates, and Jira summary note have all succeeded.
Return a final `<stage_result>` block that includes all required fields from @.auto-ceph-work/references/stage-result-format.md.
</process>
