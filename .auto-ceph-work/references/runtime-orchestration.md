# Runtime Orchestration Reference

## Canonical Model

Auto-Ceph는 `workflow -> stage agent` 구조를 따르며, Codex 런타임에서는 아래처럼 매핑한다.

- top-level command: `.codex/commands/aceph/next.md`
- stage command: `.codex/commands/aceph/*.md`
- canonical agent spec: `.codex/agents/*.toml`
- prompt source: `.codex/commands/aceph/*.md` + `.auto-ceph-work/workflows/*.md` + `.codex/agents/*.toml`
- optional advisory layer: `.auto-ceph-work/hooks/*.js`

메인 오케스트레이터가 stage 작업을 직접 수행하는 것은 허용하지 않는다.
각 stage는 반드시 해당 `.codex/commands/aceph/*.md`에 선언된 `agent:`와 `.codex/agents/*.toml`의 조합으로 별도 에이전트 세션에 바인딩되어 실행되어야 한다.

## Project Activation

- 실제 프로젝트 루트는 `.auto-ceph-work/` 디렉터리와 `.auto-ceph-work/project.json`으로 식별한다.
- hook은 hidden canonical directory 기반으로 project root를 탐지한다.
- 오케스트레이터와 hook은 모두 이 내부 설정 파일을 project activation 기준으로 사용한다.

## Spawn Rules

- 인자 없이 시작하면 현재 사용자에게 할당된 Jira `TO DO` 티켓 중 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 일치하는 티켓만 선택 대상으로 본다.
- 후보가 여러 개면 그중 `created ASC` 기준으로 정렬한 batch snapshot을 만든다.
- 인자 없는 mode는 실행 시작 시 이 batch snapshot을 한 번 만들고, 그 배열의 티켓을 같은 실행 안에서 순차 처리한다.
- `aceph:next`가 현재 stage를 판정하고 해당 stage command를 기준으로 prompt를 구성한다.
- 기본은 stage당 custom agent 1개
- 오케스트레이터는 stage 실행을 inline으로 대체하지 않는다.
- 호스트 런타임이 custom agent binding을 수행하지 못하면 즉시 실패로 간주하고 다음 단계로 진행하지 않는다.
- 결과는 항상 `<stage_result>` 블록으로 반환

## Ralph Loop Rules

- 오케스트레이터는 stage를 한 번만 실행하고 끝내지 않는다.
- `07_LOOP.md`에서 현재 loop attempt 번호와 직전 실패 상태를 읽는다.
- `retry_pending`은 fallback 재진입 전후에만 관찰되는 중간 상태이며 terminal state가 아니다.
- `passed`면 detector 재판정 결과를 확인한 뒤 다음 stage로 진행한다.
- `blocked`, `failed`, `needs_retry`여도 `terminal_reason`이 입력/설정 오류면 자동 재진입하지 않는다.
- 비재시도 종료 사유는 `missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `missing_verify_env_file`, `missing_verify_env_values`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`다.
- 그 외 retryable failure만 `fallback_stage`로 자동 재진입한다.
- retryable failure에서는 현재 실행을 끝내지 않고 `retry_pending`을 기록한 뒤 같은 실행 안에서 즉시 다음 loop attempt를 열고 `fallback_stage`를 다시 dispatch한다.
- 같은 loop 안의 stage 진행은 iteration 번호를 증가시키지 않는다.
- 새 loop attempt를 열 때만 iteration 번호를 1 올린다.
- iteration 10회를 넘기면 자동 재진입을 중단하고 최종 blocked로 종료한다.
- 자동 루프의 기본 종료 지점은 `리뷰 요청` 완료다.
- 이후 리뷰 피드백이 생기면 다음 `$auto-ceph <TICKET-ID>` 실행에서 Jira description 본문과 그 안의 `작업 노트` 섹션을 우선 읽어 새 iteration을 시작한다.
- snapshot 안에 남은 티켓이 있으면 terminal 후 다음 snapshot 티켓으로 진행한다.
- snapshot을 모두 처리했거나 시스템성 실패가 발생하면 무인자 batch 실행을 끝낸다.

## Ticket Terminal Git Policy

- 티켓 loop가 terminal state에 도달하면 오케스트레이터는 `git status --short`로 변경 여부를 확인한다.
- 변경이 없으면 commit/push를 생략하고 종료한다.
- 변경이 있으면 티켓 단위 1커밋으로 묶어 현재 브랜치에 커밋한다.
- 커밋 메시지는 티켓 종료 상태를 반영한 고정 형식을 사용한다.
  - `passed`: `feat(auto-ceph): finish <TICKET-ID>`
  - `blocked`: `chore(auto-ceph): block <TICKET-ID>`
  - `failed`: `chore(auto-ceph): fail <TICKET-ID>`
  - `needs_retry`: `chore(auto-ceph): stop <TICKET-ID>`
- 커밋 후에는 현재 checkout 브랜치 upstream remote로 `git push`를 수행한다.
- upstream이 없으면 티켓의 `remote`와 현재 티켓 브랜치 `feature/<TICKET-ID>`를 사용해 push를 시도한다.
- 현재 checkout 브랜치가 `feature/<TICKET-ID>`가 아니면 commit/push를 시도하지 않고 `post_ticket_branch_mismatch`로 즉시 중단한다.
- terminal git 후처리 뒤에는 반드시 `dev`로 checkout 복귀해야 하며, 실패하면 전체 실행을 중단한다.
- 티켓의 `remote`가 로컬에 없거나 commit/push가 실패하면 전체 실행을 즉시 중단한다.

## Hook Policy

- `aceph-prompt-guard.js`와 `aceph-workflow-guard.js`는 advisory-only다.
- 어떤 hook도 stage 실행을 대신하지 않는다.

## Result Format

```text
<stage_result>
stage: 계획
ticket_id: CDS-1234
status: passed
agent_binding: aceph-ticket-plan
artifacts_updated: doc/CDS-1234/03_PLAN.md
jira_updates_applied: description_work_note=계획
next_stage: 수행
fallback_stage: 문제 검토
iteration: 1
loop_decision: advance
detected_stage_after_run: 수행
terminal_reason: none
summary: git 준비 절차와 구현 task를 계획서에 고정했다.
</stage_result>
```
