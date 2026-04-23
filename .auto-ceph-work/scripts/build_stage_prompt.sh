#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <stage> <TICKET-ID>"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CANONICAL_ROOT="$(cd "$ROOT_DIR/.auto-ceph-work" && pwd)"
STAGE="$1"
TICKET_ID="$2"

# shellcheck disable=SC1090
eval "$(bash "$SCRIPT_DIR/resolve_ticket_context.sh" "$TICKET_ID")"
# shellcheck disable=SC1090
eval "$(bash "$SCRIPT_DIR/resolve_loop_state.sh" "$TICKET_ID")"

stage_command=""
stage_artifact=""
stage_note=""
next_stage=""
fallback_stage=""
agent_role="worker"
extra_rules=""
stage_target_state=""
stage_transition_timing=""
stage_result_transition="unchanged"

case "$STAGE" in
  "문제 확인")
    stage_command='aceph:intake-ticket'
    stage_artifact="$ticket_file, $context_file"
    stage_note="문제 확인"
    next_stage="문제 검토"
    fallback_stage="문제 확인"
    stage_target_state="IN PROGRESS"
    stage_transition_timing="문제 확인 stage에서 보장"
    stage_result_transition="IN PROGRESS"
    ;;
  "문제 검토")
    stage_command='aceph:review-ticket'
    stage_artifact="$context_file"
    stage_note="문제 검토"
    next_stage="계획"
    fallback_stage="문제 확인"
    stage_target_state="IN PROGRESS"
    stage_transition_timing="문제 검토 stage에서 보장"
    ;;
  "계획")
    stage_command='aceph:plan-ticket'
    stage_artifact="$plan_file"
    stage_note="계획"
    next_stage="수행"
    fallback_stage="문제 검토"
    stage_target_state="IN PROGRESS"
    stage_transition_timing="계획 stage에서 보장"
    if [ "${repo:-}" = "remote-ceph-admin" ]; then
      extra_rules="repo 특례: remote-ceph-admin 이므로 UI 관련 계획을 포함하지 마라."
    fi
    ;;
  "수행")
    stage_command='aceph:execute-ticket'
    stage_artifact="$execution_file"
    stage_note="수행"
    next_stage="검증"
    fallback_stage="계획"
    stage_target_state="IN PROGRESS -> RESOLVE"
    stage_transition_timing="시작 시 IN PROGRESS, 완료 시 RESOLVE"
    stage_result_transition="RESOLVE"
    ;;
  "검증")
    stage_command='aceph:verify-ticket'
    stage_artifact="$uat_file"
    stage_note="검증"
    next_stage="코드 리뷰"
    fallback_stage="수행"
    stage_target_state="RESOLVE"
    stage_transition_timing="검증 stage에서 보장"
    stage_result_transition="RESOLVE"
    if [ "${repo:-}" = "remote-ceph-admin" ]; then
      extra_rules="repo 특례: remote-ceph-admin 이므로 Playwright 검증을 우선 사용하라."
    fi
    ;;
  "코드 리뷰")
    stage_command='aceph:code-review-ticket'
    stage_artifact="$review_file"
    stage_note="코드 리뷰"
    next_stage="리뷰 요청"
    fallback_stage="수행"
    stage_target_state="RESOLVE"
    stage_transition_timing="코드 리뷰 stage에서 보장"
    stage_result_transition="RESOLVE"
    extra_rules="코드 리뷰는 테스트 재실행 단계가 아니라 변경 코드와 diff의 품질, 리스크, 테스트 충분성을 검토하는 단계다."
    ;;
  "리뷰 요청")
    stage_command='aceph:review-request-ticket'
    stage_artifact="$summary_file"
    stage_note="리뷰 요청"
    next_stage="완료"
    fallback_stage="코드 리뷰"
    stage_target_state="REVIEW"
    stage_transition_timing="리뷰 요청 stage에서 보장"
    stage_result_transition="REVIEW"
    ;;
  *)
    echo "unknown stage: $STAGE" >&2
    exit 1
    ;;
esac

runtime_command_file="$ROOT_DIR/.codex/commands/aceph/$(printf '%s' "$stage_command" | sed 's/^aceph://').md"
stage_workflow_file=""
runtime_agent_file=""

case "$STAGE" in
  "문제 확인")
    stage_workflow_file="$CANONICAL_ROOT/workflows/intake-ticket.md"
    runtime_agent_file="$ROOT_DIR/.codex/agents/aceph-ticket-intake.toml"
    ;;
  "문제 검토")
    stage_workflow_file="$CANONICAL_ROOT/workflows/review-ticket.md"
    runtime_agent_file="$ROOT_DIR/.codex/agents/aceph-ticket-review.toml"
    ;;
  "계획")
    stage_workflow_file="$CANONICAL_ROOT/workflows/plan-ticket.md"
    runtime_agent_file="$ROOT_DIR/.codex/agents/aceph-ticket-plan.toml"
    ;;
  "수행")
    stage_workflow_file="$CANONICAL_ROOT/workflows/execute-ticket.md"
    runtime_agent_file="$ROOT_DIR/.codex/agents/aceph-ticket-execute.toml"
    ;;
  "검증")
    stage_workflow_file="$CANONICAL_ROOT/workflows/verify-ticket.md"
    runtime_agent_file="$ROOT_DIR/.codex/agents/aceph-ticket-verify.toml"
    ;;
  "코드 리뷰")
    stage_workflow_file="$CANONICAL_ROOT/workflows/code-review-ticket.md"
    runtime_agent_file="$ROOT_DIR/.codex/agents/aceph-ticket-code-review.toml"
    ;;
  "리뷰 요청")
    stage_workflow_file="$CANONICAL_ROOT/workflows/review-request-ticket.md"
    runtime_agent_file="$ROOT_DIR/.codex/agents/aceph-ticket-review-request.toml"
    ;;
esac

cat <<EOF
Use $stage_command for ticket $ticket_id.

Role hint: $agent_role
Working directory: $ROOT_DIR

Read these files first:
- $ROOT_DIR/.codex/skills/auto-ceph/SKILL.md
- $ROOT_DIR/.codex/commands/aceph/next.md
- $runtime_command_file
- $CANONICAL_ROOT/references/runtime-contract.md
- $CANONICAL_ROOT/references/workflow.md
- $CANONICAL_ROOT/references/stage-result-format.md
- $CANONICAL_ROOT/references/jira-sync.md
- $CANONICAL_ROOT/references/runtime-orchestration.md
- $CANONICAL_ROOT/references/jira-ticket-template.md
- $stage_workflow_file
- $runtime_agent_file

Ticket context:
- ticket_id: $ticket_id
- repo: ${repo:-unknown}
- project_repo: ${project_repo:-unknown}
- remote: ${remote:-unknown}
- ticket_branch: ${ticket_branch:-unknown}
- base_branch: ${base_branch:-unknown}
- ticket_dir: $ticket_dir
- ticket_file: $ticket_file
- context_file: $context_file
- plan_file: $plan_file
- execution_file: $execution_file
- uat_file: $uat_file
- review_file: $review_file
- summary_file: $summary_file
- loop_file: $loop_file
- current_iteration: ${current_iteration:-0}
- next_iteration: ${next_iteration:-1}
- run_iteration: ${run_iteration:-1}
- loop_limit: ${loop_limit:-10}
- current_loop_status: ${current_loop_status:-idle}
- current_stage: ${current_stage:-none}
- last_status: ${last_status:-none}
- last_loop_decision: ${last_loop_decision:-none}
- last_fallback_stage: ${last_fallback_stage:-none}
- last_terminal_reason: ${last_terminal_reason:-none}
- can_retry: ${can_retry:-yes}

Current stage: $STAGE
Required artifact(s): $stage_artifact
Jira note target: $stage_note
Jira target state: $stage_target_state
Jira state transition timing: $stage_transition_timing
Expected next stage: $next_stage
Fallback stage on failure: $fallback_stage
Ralph loop current iteration: ${run_iteration:-1}
Ralph loop next iteration candidate: ${next_iteration:-1}

Mandatory behavior:
- Follow the stage command and workflow exactly.
- This stage is a narrow worker task. Do not rely on parent-thread chat context; use only the explicit stage prompt, referenced files, and current workspace state.
- Treat \`retry_pending\` as a non-terminal intermediate state. If the main session marks a retryable failure, it must re-spawn the fallback stage in the same \$auto-ceph run instead of waiting for another user invocation.
- For intake, treat \`[ACW]\` in the Jira title and \`repo == ${project_repo:-unknown}\` as the intake gate.
- For intake, require \`repo\` and \`remote\` from Jira description as minimum execution inputs.
- For intake, if Jira \`repo\` does not equal the current project repo \`${project_repo:-unknown}\`, treat the ticket as a repo mismatch and do not proceed as a valid intake target.
- Prepare the actual work branch as ${ticket_branch:-unknown} from ${base_branch:-unknown} during intake.
- Update the artifact(s) for the current stage directly.
- Keep $loop_file aligned with the current iteration if this stage run contributes to a Ralph loop pass.
- Apply the stage target Jira status and 작업 노트 updates directly when the stage contract requires it.
- If Jira update fails, do not report success.
- If you change code or docs, keep them aligned with the current stage only.
- For verification work, prioritize automated tests and artifact review; do not require a real HTTP call.
- For code review work, inspect changed code and diff quality directly; do not treat it as a second verification run.
- Return a final <stage_result> block in this exact format:

<stage_result>
stage: $STAGE
ticket_id: $ticket_id
status: passed
retry_reason: none
agent_binding: $(basename "$runtime_agent_file" .toml)
artifacts_updated: $stage_artifact
jira_stage_note_started: yes
jira_stage_summary_written: yes
jira_status_transition_applied: $stage_result_transition
jira_updates_applied: description_work_note_start=$stage_note, description_work_note_summary=$stage_artifact updated
next_stage: $next_stage
fallback_stage: $fallback_stage
iteration: ${run_iteration:-1}
loop_decision: advance
detected_stage_after_run: $next_stage
terminal_reason: none
summary: one-line summary
</stage_result>

${extra_rules}
EOF
