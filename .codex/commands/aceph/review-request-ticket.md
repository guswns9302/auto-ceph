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
- Non-MR git post-processing must use the canonical helper `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`.
- GitLab merge request work must use the canonical helper `.auto-ceph-work/scripts/create_or_reuse_merge_request.js`.
- The helper must use `glab` CLI only.
- Merge request source branch is `feature/<TICKET-ID>` and target branch is `dev`.
- Merge request title is `<TICKET-ID> <Jira title with [ACW] removed>`.
- This stage owns ticket-level commit and push before merge-request work, but must perform them only through `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`.
- The helper inputs are `<TICKET-ID>`, ticket `remote`, and the success-path commit message `feat(auto-ceph): finish <TICKET-ID>`.
- If the helper reports branch mismatch, treat the stage as failed with `post_ticket_branch_mismatch`.
- `07_SUMMARY.md` must include a `## Merge Request` section with `상태`, `제목`, `URL`, `source`, `target`.
- Stage must first update the Jira issue description `### 작업 노트` section with `#### 리뷰 요청` plus `- 시작`.
- After helper success and merge-request metadata sync into `07_SUMMARY.md`, do one final Jira description update that replaces that same stage block with the Jira stage summary bullet items and syncs the top-level `### 루프 히스토리` section to the full contents of `.auto-ceph-work/tickets/<TICKET-ID>/08_LOOP.md`.
</context>

<process>
Execute the review-request workflow from @.auto-ceph-work/workflows/review-request-ticket.md.
The stage is complete only when the Jira start note, the required `REVIEW` guarantee, `07_SUMMARY.md` non-MR summary update, canonical helper-based ticket branch commit/push step, canonical helper-based merge-request create-or-reuse step, merge-request metadata sync into `07_SUMMARY.md`, and the final Jira description sync for both the stage summary note and top-level loop-history section have all succeeded.
Return a final `<stage_result>` block that includes all required fields from @.auto-ceph-work/references/stage-result-format.md.
</process>
