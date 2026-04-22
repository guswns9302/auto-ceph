---
name: aceph:next
description: Detect the current Auto-Ceph ticket stage and drive the Ralph loop until the ticket reaches its terminal point.
argument-hint: "[TICKET-ID]"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Task
---
<objective>
Detect the current ticket state from Jira-derived docs and drive the next logical Auto-Ceph Ralph loop step.
</objective>

<execution_context>
@.auto-ceph-work/references/runtime-contract.md
@.auto-ceph-work/references/workflow.md
@.auto-ceph-work/references/runtime-orchestration.md
@.auto-ceph-work/references/stage-result-format.md
@.auto-ceph-work/references/jira-sync.md
</execution_context>

<context>
Ticket ID: optional in `$ARGUMENTS`

- Project root must contain `.auto-ceph-work/` with a valid `project.json`.
- If omitted, build a startup batch snapshot from current assigned Jira `TO DO` tickets whose title contains `[ACW]` and whose Jira `repo` matches the current project root directory name, ordered by `created ASC`.
- If omitted, process that startup snapshot sequentially in this same execution.
- Resolve the current stage with `.auto-ceph-work/scripts/detect_ticket_stage.sh`.
- Resolve the current loop state with `.auto-ceph-work/scripts/resolve_loop_state.sh`.
- For each iteration step, build the stage prompt from the canonical stage command, workflow, and agent spec, then spawn the matching stage agent directly from the main session.
- Spawn stage agents without forking parent-thread chat context. The stage prompt must carry the full required handoff.
- Treat `retry_pending` as a non-terminal intermediate state and immediately consume it by spawning `fallback_stage` again in this same execution when the failure is retryable and the loop limit allows it.
- After a ticket reaches a terminal state, if the worktree changed, create a terminal ticket commit only on the prepared ticket branch and push it using the current branch upstream first, then ticket `remote` + current ticket branch `feature/<TICKET-ID>` as fallback.
- After each terminal ticket, always return to `dev` before selecting or starting the next ticket.
- Keep stage work out of the main session. All stage mutations must happen inside the spawned stage agent.
- A stage is not complete unless it wrote both the Jira current-stage note and the Jira stage summary note.
- A stage that requires Jira status transition is not complete unless the expected Jira state change also succeeded.
- The automatic loop retry limit is 10 loop attempts.
- Code review is a separate stage after verification. Treat code-review failures as retryable quality findings that must re-enter through `수행`.
</context>

<process>
Execute the ticket orchestration workflow from @.auto-ceph-work/workflows/orchestrate-ticket.md end-to-end.
Use the stage-to-command mapping defined in @.auto-ceph-work/references/workflow.md to select the canonical stage contract and canonical stage agent.
If the host runtime cannot spawn the selected stage agent directly from the main session, stop immediately and report a stage-agent spawn failure instead of continuing inline.
Reject any stage result that is missing Jira start-note or Jira summary-note evidence.
Reject any stage result that is missing the required Jira status transition evidence for that stage.
Reject any stage result that omits `agent_binding`, `iteration`, `loop_decision`, `detected_stage_after_run`, or `terminal_reason`.
Reject any stage result whose `agent_binding` does not match the selected stage agent.
Do not auto-retry non-retryable terminal reasons: `missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`.
When the stage result is retryable, do not stop and wait for another user invocation. Record the retry state and spawn `fallback_stage` again in this same run until the ticket reaches a terminal state or the loop limit is exhausted.
When a ticket loop reaches a terminal state, perform ticket-level git post-processing before exiting:
- If `git status --short` is empty, skip commit/push.
- If the current checkout branch is not `feature/<TICKET-ID>`, stop immediately with `post_ticket_branch_mismatch`.
- Otherwise commit all current ticket changes with the fixed message rule.
- Push to the current branch upstream if one exists.
- If no upstream exists, push to the ticket-declared `remote` and the current ticket branch `feature/<TICKET-ID>`.
- If the ticket `remote` does not exist locally, stop immediately and report a post-ticket git failure.
- If commit or push fails, stop immediately and report a post-ticket git failure.
- In no-argument mode, stop only after the startup snapshot is exhausted or a system failure occurs. A retryable failure for the current ticket is not a stop condition by itself.
</process>
