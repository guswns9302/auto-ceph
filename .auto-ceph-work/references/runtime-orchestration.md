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
- 메인 세션은 각 티켓 처리 시작 전에 Jira description의 `### 작업 노트` 상단에 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js` helper로 `티켓 시작 시간`을 보장한다.
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
- `passed`면 detector 재판정 결과를 확인한 뒤 다음 stage로 진행한다.
- `blocked`, `failed`, `needs_retry`, `retry_pending`, `verification_unblock`, no-progress 판단은 `runtime-contract.md`와 `workflow.md`의 retry contract를 따른다.
- retryable failure에서는 현재 실행을 끝내지 않고 같은 실행 안에서 다음 loop attempt를 열고 `fallback_stage`를 다시 spawn한다.
- 동일한 오류 집합이 연속 반복되어 unblock 진전이 없으면 무한 루프를 허용하지 말고 no-progress blocking 판단을 고려해야 한다.
- stage agent가 아직 완료되지 않았으면 현재 실행을 끝내지 않고 같은 실행 안에서 계속 wait/re-wait 한다.
- 같은 loop 안의 stage 진행은 iteration 번호를 증가시키지 않는다.
- 새 loop attempt를 열 때만 iteration 번호를 1 올린다.
- iteration 10회를 넘기면 자동 재진입을 중단하고 최종 blocked로 종료한다.
- 자동 루프의 기본 종료 지점은 `리뷰 요청` 완료다.
- `리뷰 요청` 완료의 상세 조건은 `runtime-contract.md`와 `jira-sync.md`의 review-request contract를 따른다.
- 이후 리뷰 피드백이 생기면 다음 `$auto-ceph <TICKET-ID>` 실행에서 Jira description 본문과 그 안의 `작업 노트` 섹션을 우선 읽어 새 iteration을 시작한다.
- snapshot 안에 남은 티켓이 있으면 terminal 후 다음 snapshot 티켓으로 진행한다.
- snapshot을 모두 처리했거나 시스템성 실패가 발생하면 무인자 batch 실행을 끝낸다.
- ticket terminal 시 메인 세션은 Jira description의 `### 작업 노트` 상단에 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js` helper로 `티켓 종료 시간`을 기록한다.

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

Stage별 목표 Jira 상태와 `리뷰 요청` 완료 상세는 `runtime-contract.md`와 `jira-sync.md`를 따른다. 이 문서는 해당 계약을 재정의하지 않고, 메인 세션의 spawn/wait/retry/terminal 처리 책임만 설명한다.
