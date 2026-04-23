# Runtime Orchestration Reference

## Canonical Model

Auto-Ceph는 `main session -> stage agent` 구조를 따르며, Codex 런타임에서는 아래처럼 매핑한다.

- top-level orchestrator: `$auto-ceph` main session
- stage contract: `.codex/commands/aceph/*.md`
- canonical agent spec: `.codex/agents/*.toml`
- prompt source: `.codex/commands/aceph/*.md` + `.auto-ceph-work/workflows/*.md` + `.codex/agents/*.toml`
- optional advisory layer: `.auto-ceph-work/hooks/*.js`

메인 세션이 stage 작업을 직접 수행하는 것은 허용하지 않는다.
각 stage는 메인 세션이 해당 canonical stage contract와 `.codex/agents/*.toml`을 읽어 직접 spawn한 별도 에이전트 세션에서 실행되어야 한다.

## Project Activation

- 실제 프로젝트 루트는 `.auto-ceph-work/` 디렉터리와 `.auto-ceph-work/project.json`으로 식별한다.
- hook은 hidden canonical directory 기반으로 project root를 탐지한다.
- 메인 세션 orchestration과 hook은 모두 이 내부 설정 파일을 project activation 기준으로 사용한다.

## Spawn Rules

- 인자 없이 시작하면 현재 사용자에게 할당된 Jira `TO DO` 티켓 중 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 일치하는 티켓만 선택 대상으로 본다.
- 후보가 여러 개면 그중 `created ASC` 기준으로 정렬한 batch snapshot을 만든다.
- 인자 없는 mode는 실행 시작 시 이 batch snapshot을 한 번 만들고, 그 배열의 티켓을 같은 실행 안에서 순차 처리한다.
- 메인 세션이 현재 stage를 판정하고 해당 stage contract를 기준으로 prompt를 구성한다.
- 기본은 stage당 custom agent 1개
- 메인 세션은 stage 실행을 inline으로 대체하지 않는다.
- 호스트 런타임이 메인 세션에서 custom stage agent를 spawn하지 못하면 즉시 실패로 간주하고 다음 단계로 진행하지 않는다.
- `wait_agent` timeout 또는 빈 status는 agent 중단이 아니라 polling 결과로만 본다.
- pending/running stage agent가 남아 있으면 메인 세션은 종료할 수 없고, 같은 agent id를 계속 기다려야 한다.
- 결과는 항상 `<stage_result>` 블록으로 반환

## Ralph Loop Rules

- 메인 세션 orchestration은 stage를 한 번만 실행하고 끝내지 않는다.
- `08_LOOP.md`에서 현재 loop attempt 번호와 직전 실패 상태를 읽는다.
- `retry_pending`은 fallback 재진입 전후에만 관찰되는 중간 상태이며 terminal state가 아니다.
- `passed`면 detector 재판정 결과를 확인한 뒤 다음 stage로 진행한다.
- `blocked`, `failed`, `needs_retry`여도 `terminal_reason`이 입력/설정 오류면 자동 재진입하지 않는다.
- 비재시도 종료 사유는 `missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`다.
- 그 외 retryable failure만 `fallback_stage`로 자동 재진입한다.
- `needs_retry`는 terminal 상태가 아니라 현재 loop attempt의 retryable failure 표현이다.
- `needs_retry`이면서 `retry_reason: verification_unblock`이면 현재 티켓 검증을 직접 막는 최소 컴파일/테스트 unblock 수정만 허용한다.
- `verification_unblock` retry에서는 메인 세션이 사용자에게 중단 여부를 묻지 않고 같은 실행 안에서 즉시 `수행` fallback prompt를 다시 구성해야 한다.
- `verification_unblock` retry prompt에는 실제로 검증을 막은 파일/심볼, 최소 수정 범위 제한, 새 제품 요구 금지 조건이 포함되어야 한다.
- `코드 리뷰` 단계에서 blocking finding이 있으면 retryable failure로 취급하고 `수행`으로 재진입한다.
- retryable failure에서는 현재 실행을 끝내지 않고 `retry_pending`을 기록한 뒤 같은 실행 안에서 즉시 다음 loop attempt를 열고 `fallback_stage`를 다시 spawn한다.
- 동일한 오류 집합이 연속 반복되어 unblock 진전이 없으면 무한 루프를 허용하지 말고 no-progress blocking 판단을 고려해야 한다.
- stage agent가 아직 완료되지 않았으면 현재 실행을 끝내지 않고 같은 실행 안에서 계속 wait/re-wait 한다.
- 같은 loop 안의 stage 진행은 iteration 번호를 증가시키지 않는다.
- 새 loop attempt를 열 때만 iteration 번호를 1 올린다.
- iteration 10회를 넘기면 자동 재진입을 중단하고 최종 blocked로 종료한다.
- 자동 루프의 기본 종료 지점은 `리뷰 요청` 완료다.
- 여기서 `리뷰 요청` 완료는 `07_SUMMARY.md` 기본 요약 작성, ticket commit, push, canonical helper 기반 MR 생성 또는 재사용, helper 결과의 `07_SUMMARY.md` 반영, Jira description 최종 동기화를 모두 포함한다.
- 이후 리뷰 피드백이 생기면 다음 `$auto-ceph <TICKET-ID>` 실행에서 Jira description 본문과 그 안의 `작업 노트` 섹션을 우선 읽어 새 iteration을 시작한다.
- snapshot 안에 남은 티켓이 있으면 terminal 후 다음 snapshot 티켓으로 진행한다.
- snapshot을 모두 처리했거나 시스템성 실패가 발생하면 무인자 batch 실행을 끝낸다.

## Ticket Terminal Git Policy

- 메인 세션은 티켓 loop terminal 시 commit/push를 수행하지 않는다.
- `리뷰 요청` stage 가 ticket-level commit/push 와 MR 생성을 마친 뒤 terminal 로 종료된다.
- `needs_retry` 자체로는 review-request stage git 후처리를 열지 않는다.
- 메인 세션의 terminal git 책임은 `.auto-ceph-work/scripts/return_to_dev_branch.sh`를 통한 `dev` checkout 복귀뿐이다.
- terminal 뒤 `dev` checkout 이 실패하면 전체 실행을 즉시 중단한다.

## Hook Policy

- `aceph-prompt-guard.js`와 `aceph-workflow-guard.js`는 advisory-only다.
- 어떤 hook도 stage 실행을 대신하지 않는다.

## Result Format

```text
<stage_result>
stage: 계획
ticket_id: CDS-1234
status: passed
retry_reason: none
agent_binding: aceph-ticket-plan
artifacts_updated: .auto-ceph-work/tickets/CDS-1234/03_PLAN.md
jira_stage_note_started: yes
jira_stage_summary_written: yes
jira_status_transition_applied: IN PROGRESS
jira_updates_applied: description_work_note_start=계획, description_work_note_summary=03_PLAN.md 발췌 반영
next_stage: 수행
fallback_stage: 문제 검토
iteration: 1
loop_decision: advance
detected_stage_after_run: 수행
terminal_reason: none
summary: git 준비 절차와 구현 task를 계획서에 고정했다.
</stage_result>
```

stage별 목표 Jira 상태는 아래와 같이 고정한다.

- `문제 확인` -> `IN PROGRESS`
- `문제 검토` -> `IN PROGRESS`
- `계획` -> `IN PROGRESS`
- `수행` -> 시작 시 `IN PROGRESS`, 완료 시 `RESOLVE`
- `검증` -> `RESOLVE`
- `코드 리뷰` -> `RESOLVE`
- `리뷰 요청` -> `REVIEW`

`리뷰 요청` 단계에서는 위 status 보장 외에도 먼저 `07_SUMMARY.md`의 non-MR 요약 섹션을 작성하고, `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh` helper로 ticket-level commit/push 를 수행한 뒤 `.auto-ceph-work/scripts/create_or_reuse_merge_request.js` helper로 `feature/<TICKET-ID>` -> `dev` MR을 생성 또는 재사용해야 한다. helper 성공 후에는 `## Merge Request` 섹션을 `07_SUMMARY.md`에 반영하고, 마지막 Jira description 최종 동기화에서 `#### 리뷰 요청` 블록 요약과 top-level `### 루프 히스토리` 섹션을 함께 갱신해야 한다.
