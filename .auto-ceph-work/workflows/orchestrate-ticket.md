# Orchestrate Ticket Workflow

1. Before processing the ticket, read the Jira issue description and use `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> start` to ensure `티켓 시작 시간` and an empty `티켓 종료 시간` exist at the top of `### 작업 노트`.
2. Detect current stage from document state.
3. Resolve loop state and current loop attempt from `08_LOOP.md`.
4. Resolve the canonical stage contract, workflow, and agent spec for the detected stage.
5. Build a runtime prompt from the canonical stage contract, workflow, agent, ticket files, and loop context.
6. Spawn the matching stage agent directly from the main session.
7. Wait for `<stage_result>`. If `wait_agent` times out or returns an empty status set, treat that as a non-terminal polling result and continue waiting on the same agent id.
8. Re-detect stage from filesystem state.
9. If the result is `passed`, advance to the next stage.
10. If the result is `blocked`, `failed`, or `needs_retry`, do not stop the current run when `terminal_reason` is retryable. Record the retry as `retry_pending`, open the next loop attempt, and re-enter through `fallback_stage` immediately by spawning that stage again in this same execution only when the iteration limit allows it.
11. If the retry is `needs_retry` with `retry_reason=verification_unblock`, rebuild the `수행` stage prompt with the concrete blocking compile/test errors and an explicit restriction to minimal unblock fixes only.
12. If the retry is `needs_retry` with `retry_reason=verification_unblock`, do not ask the user whether to stop, widen scope, or continue. The current run must consume that inner loop automatically.
13. If the same verification-unblock error set repeats without reduction, treat it as no progress and stop as a blocking loop failure instead of spinning indefinitely.
14. When the ticket reaches a terminal state, do not run ticket-level commit or push in the main session.
15. When the ticket reaches a terminal state, read the latest Jira issue description and use `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> end` to set `티켓 종료 시간`.
16. After the terminal stage succeeds, return to `dev` only through the canonical helper `.auto-ceph-work/scripts/return_to_dev_branch.sh` before considering the next ticket.
17. In no-argument mode, continue with the next ticket from the startup snapshot until the snapshot is exhausted.
18. If `dev` checkout fails, stop the overall run.
19. Stop when the startup snapshot is exhausted or a system failure occurs.
20. Never emit a terminal answer while any spawned stage agent is still pending or running.
