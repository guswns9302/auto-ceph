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
- Treat `wait_agent` timeout or an empty `statuses={}` result as a non-terminal polling outcome only.
- If a spawned stage agent is still pending or running, do not emit `final_answer`, do not mark the run complete, and keep tracking the same agent until a terminal subagent status arrives.
- Treat `retry_pending` as a non-terminal intermediate state and immediately consume it by spawning `fallback_stage` again in this same execution when the failure is retryable and the loop limit allows it.
- If the retry result is `needs_retry` with `retry_reason: verification_unblock`, rebuild the fallback prompt with the concrete blocking compile/test errors and a strict minimum-unblock-only scope.
- After each terminal ticket, always return to `dev` through `.auto-ceph-work/scripts/return_to_dev_branch.sh` before selecting or starting the next ticket.
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
After spawning a stage agent, keep waiting or re-waiting on that same agent id until it reaches a terminal subagent status. A `wait_agent` timeout is not a stage result and not a stop condition.
Reject any stage result that is missing Jira start-note or Jira summary-note evidence.
Reject any stage result that is missing the required Jira status transition evidence for that stage.
Reject any stage result that omits `agent_binding`, `iteration`, `loop_decision`, `detected_stage_after_run`, `terminal_reason`, or `retry_reason`.
Reject any stage result whose `agent_binding` does not match the selected stage agent.
Do not auto-retry non-retryable terminal reasons: `missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`.
When the stage result is retryable, do not stop and wait for another user invocation. Record the retry state and spawn `fallback_stage` again in this same run until the ticket reaches a terminal state or the loop limit is exhausted.
Do not ask the user whether to stop or widen scope for a retryable verification-unblock failure. Consume that inner loop automatically in the current run.
When a ticket loop reaches a terminal state, do not perform ticket-level commit or push in the main session. That work belongs to the `리뷰 요청` stage through `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`. The main session may only use `.auto-ceph-work/scripts/return_to_dev_branch.sh` for terminal git cleanup.
- In no-argument mode, stop only after the startup snapshot is exhausted or a system failure occurs. A retryable failure for the current ticket is not a stop condition by itself.
</process>
