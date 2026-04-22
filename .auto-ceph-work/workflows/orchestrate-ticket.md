# Orchestrate Ticket Workflow

1. Detect current stage from document state.
2. Resolve loop state and current loop attempt from `08_LOOP.md`.
3. Resolve the canonical stage contract, workflow, and agent spec for the detected stage.
4. Build a runtime prompt from the canonical stage contract, workflow, agent, ticket files, and loop context.
5. Spawn the matching stage agent directly from the main session.
6. Wait for `<stage_result>`.
7. Re-detect stage from filesystem state.
8. If the result is `passed`, advance to the next stage.
9. If the result is `blocked`, `failed`, or `needs_retry`, do not stop the current run when `terminal_reason` is retryable. Record the retry as `retry_pending`, open the next loop attempt, and re-enter through `fallback_stage` immediately by spawning that stage again in this same execution only when the iteration limit allows it.
10. When the ticket reaches a terminal state, run ticket-level git post-processing: detect worktree changes, commit with the fixed message rule when needed, and push to the current branch upstream.
11. After ticket-level git post-processing, checkout `dev` before considering the next ticket.
12. In no-argument mode, continue with the next ticket from the startup snapshot until the snapshot is exhausted.
13. If git post-processing or `dev` checkout fails, stop the overall run.
14. Stop when the startup snapshot is exhausted or a system failure occurs.
