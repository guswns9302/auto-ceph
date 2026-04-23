# Orchestrate Ticket Workflow

1. Detect current stage from document state.
2. Resolve loop state and current loop attempt from `08_LOOP.md`.
3. Resolve the canonical stage contract, workflow, and agent spec for the detected stage.
4. Build a runtime prompt from the canonical stage contract, workflow, agent, ticket files, and loop context.
5. Spawn the matching stage agent directly from the main session.
6. Wait for `<stage_result>`. If `wait_agent` times out or returns an empty status set, treat that as a non-terminal polling result and continue waiting on the same agent id.
7. Re-detect stage from filesystem state.
8. If the result is `passed`, advance to the next stage.
9. If the result is `blocked`, `failed`, or `needs_retry`, do not stop the current run when `terminal_reason` is retryable. Record the retry as `retry_pending`, open the next loop attempt, and re-enter through `fallback_stage` immediately by spawning that stage again in this same execution only when the iteration limit allows it.
10. If the retry is `needs_retry` with `retry_reason=verification_unblock`, rebuild the `수행` stage prompt with the concrete blocking compile/test errors and an explicit restriction to minimal unblock fixes only.
11. If the retry is `needs_retry` with `retry_reason=verification_unblock`, do not ask the user whether to stop, widen scope, or continue. The current run must consume that inner loop automatically.
12. If the same verification-unblock error set repeats without reduction, treat it as no progress and stop as a blocking loop failure instead of spinning indefinitely.
13. When the ticket reaches a terminal state, run ticket-level git post-processing: detect worktree changes, commit with the fixed message rule when needed, and push to the current branch upstream.
14. After ticket-level git post-processing, checkout `dev` before considering the next ticket.
15. In no-argument mode, continue with the next ticket from the startup snapshot until the snapshot is exhausted.
16. If git post-processing or `dev` checkout fails, stop the overall run.
17. Stop when the startup snapshot is exhausted or a system failure occurs.
18. Never emit a terminal answer while any spawned stage agent is still pending or running.
