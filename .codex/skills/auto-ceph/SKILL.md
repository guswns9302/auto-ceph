---
name: auto-ceph
description: Auto-Ceph 티켓 워크플로를 단일 진입점으로 실행하는 사용자용 스킬. 인자가 없으면 내 할당 Jira TO DO 티켓을 가져와 문제 확인부터 시작하고, 티켓 번호를 주면 현재 단계부터 남은 워크플로를 이어서 진행한다.
---

# Auto Ceph

이 스킬은 사용자가 `$auto-ceph` 하나만 호출하면 Auto-Ceph 티켓 워크플로를 Ralph loop 방식으로 자동 이어서 진행하는 단일 진입점이다.

## Invocation

- `$auto-ceph`
  - 현재 사용자에게 할당된 Jira `TO DO` 티켓을 찾는다.
  - 시작 시점에 필터 대상 티켓 목록을 한 번 스냅샷으로 가져온다.
  - 스냅샷에 포함된 티켓을 생성일 오름차순으로 하나씩 `문제 확인`부터 처리한다.
  - 각 티켓이 terminal state에 도달하면 메인 세션은 `dev`로 복귀한 뒤 다음 스냅샷 티켓으로 진행한다.
- `$auto-ceph <TICKET-ID>`
  - 해당 티켓의 현재 작업 단계를 판정한다.
  - 남은 워크플로를 순차적으로 진행한다.
  - 티켓이 terminal state에 도달하면 메인 세션은 `dev`로 복귀한 뒤 종료한다.

## Required Sources

항상 아래 파일을 먼저 읽는다.

1. `.auto-ceph-work/references/runtime-contract.md`
2. `.auto-ceph-work/references/workflow.md`
3. `.auto-ceph-work/references/runtime-orchestration.md`
4. `.auto-ceph-work/references/jira-sync.md`
5. `.auto-ceph-work/references/stage-result-format.md`
6. `.auto-ceph-work/references/jira-ticket-template.md`
7. `.codex/commands/aceph/next.md`

## Runtime Rules

1. 인자가 없으면 Atlassian MCP로 현재 사용자에게 할당된 Jira `TO DO` 티켓 중 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 `created ASC` 스냅샷으로 처리한다.
2. 티켓 ID가 확정되면 `.auto-ceph-work/tickets/<TICKET-ID>/`를 보장하고, 인자가 있으면 `.auto-ceph-work/scripts/detect_ticket_stage.sh <TICKET-ID>`로 현재 단계를 판정한다.
3. 각 티켓 처리 시작 전에 메인 세션은 Jira description을 읽고 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> start`로 `티켓 시작 시간`을 기록한다. 티켓 terminal 후에는 메인 세션이 최신 Jira description을 읽고 같은 helper의 `end`로 `티켓 종료 시간`을 기록한다.
4. 메인 세션은 현재 단계의 canonical command/workflow/agent spec을 읽어 stage prompt를 구성하고 `.codex/agents/*.toml` stage custom agent를 직접 spawn한다. 각 stage agent는 역할별 기본 `model`과 `model_reasoning_effort`를 사용하며, `sandbox_mode`는 명시하지 않아 상위 실행 환경 정책을 상속한다.
5. 메인 세션은 stage 작업을 inline으로 수행하지 않는다. stage agent는 narrow worker task이며 필요한 정보는 stage prompt에 포함한다. spawn 이후 `wait_agent` timeout은 단순 polling 결과다. pending stage agent가 하나라도 남아 있으면 메인 세션은 `final_answer`로 종료하면 안 된다.
6. Stage result, retry, `retry_reason: verification_unblock`, iteration, fallback, no-progress, stage-agent binding 검증은 Required Sources의 runtime/orchestration/result-format 계약을 따른다. `verification_unblock` retry는 현재 티켓 검증을 직접 막는 최소 컴파일/테스트 unblock 수정만 허용한다.
7. Jira 작업 노트와 상태 전이는 `jira-sync.md`를 따른다. `문제 확인`/`문제 검토`/`계획`/`수행`/`검증`/`코드 리뷰`는 작업 진행 중 상태인 `IN PROGRESS`, `리뷰 요청`은 최종 종료 상태인 `RESOLVE`를 맞춰야 한다.
8. 일반 stage 완료 조건은 `Jira 시작 기록 -> 산출물 생성/갱신 -> Jira 요약 기록` 순서를 모두 만족하는 것이다. `리뷰 요청` stage 완료 조건은 `Jira 시작 기록 -> 07_SUMMARY.md 기본 요약 작성 -> ticket commit -> push -> MR helper 성공 -> 07_SUMMARY.md MR 메타 반영 -> Jira description 최종 동기화` 순서를 모두 만족하는 것이다.
9. 메인 세션은 티켓 단위 `git commit`과 `git push`를 수행하지 않는다. ticket 단위 `git commit`과 `git push`는 `리뷰 요청` stage가 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`를 통해 수행한다.
10. `리뷰 요청` 단계의 non-MR git 작업은 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh` canonical helper만 사용한다. MR, `07_SUMMARY.md`, `## Merge Request`, `08_LOOP.md` 전문을 Jira description top-level `### 루프 히스토리` 섹션에 동기화하는 상세 규칙은 Required Sources의 review-request workflow/runtime 계약을 따른다.
11. 각 티켓 terminal 후에는 메인 세션이 `.auto-ceph-work/scripts/return_to_dev_branch.sh`로 `dev` 복귀만 수행하고, 무인자 실행의 스냅샷에 다음 티켓이 있으면 계속 진행한다.
12. 이후 새 피드백은 다음 `$auto-ceph <TICKET-ID>` 실행에서 Jira 설명/작업 노트와 `루프 히스토리`를 우선 읽어 새 iteration으로 처리한다.

## Dispatch Map

- `문제 확인` -> `.codex/commands/aceph/intake-ticket.md`
- `문제 검토` -> `.codex/commands/aceph/review-ticket.md`
- `계획` -> `.codex/commands/aceph/plan-ticket.md`
- `수행` -> `.codex/commands/aceph/execute-ticket.md`
- `검증` -> `.codex/commands/aceph/verify-ticket.md`
- `코드 리뷰` -> `.codex/commands/aceph/code-review-ticket.md`
- `리뷰 요청` -> `.codex/commands/aceph/review-request-ticket.md`

## User-Facing Contract

- 사용자는 내부 `aceph:*` command를 직접 고르지 않는다.
- 사용자는 `$auto-ceph` 또는 `$auto-ceph <TICKET-ID>`만 호출한다.
- 자동 선택 대상 티켓은 Jira 제목에 `[ACW]`가 있고 `repo`가 현재 프로젝트 루트 디렉터리명과 일치하는 티켓으로 제한된다.
- 무인자 `$auto-ceph`는 시작 시점의 `[ACW]` + repo 일치 `TO DO` 스냅샷 전체를 생성일 오름차순으로 같은 실행 안에서 순차 처리한다.
- 메인 세션은 Ralph loop orchestration만 담당하고, 각 stage는 반드시 별도 custom agent가 수행한다.
- pending stage agent가 하나라도 남아 있으면 메인 세션은 `final_answer`로 종료하면 안 된다.
- 각 티켓 loop가 끝나면 메인 세션은 `.auto-ceph-work/scripts/return_to_dev_branch.sh`로 `dev` 복귀만 수행하고, ticket 단위 `git commit`과 `git push`는 `리뷰 요청` stage가 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`를 통해 수행한다.
- 각 티켓 loop 시작/종료 시간은 메인 세션이 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js`로 Jira description의 `### 작업 노트` 상단에 기록한다.
- 각 티켓 loop가 끝나면 메인 세션은 `dev`로 복귀한 뒤 다음 티켓 또는 종료를 결정한다.
- 실행 중 각 단계 시작 전 현재 단계와 이유를 한 줄로 설명한다.
- 각 단계가 끝나면 갱신된 산출물과 다음 상태를 짧게 보고한다.
- Jira 상태, Jira issue description 본문의 `작업 노트` 섹션, `.auto-ceph-work/tickets/<TICKET-ID>/` 산출물은 항상 서로 맞아야 한다.
- Jira issue description 본문의 `작업 노트` 섹션은 `티켓 시작 시간`과 `티켓 종료 시간`을 stage block보다 먼저 포함해야 한다.
- loop 상태는 `.auto-ceph-work/tickets/<TICKET-ID>/08_LOOP.md`에 누적되어야 한다.
- 일반 stage 완료 조건은 `Jira 시작 기록 -> 산출물 생성/갱신 -> Jira 요약 기록`이고, `리뷰 요청` stage 완료 조건은 `Jira 시작 기록 -> 07_SUMMARY.md 기본 요약 작성 -> ticket commit -> push -> MR helper 성공 -> 07_SUMMARY.md MR 메타 반영 -> Jira description 최종 동기화`다.
- 상태 전이가 필요한 stage는 지정된 Jira 상태 변경까지 마쳐야 완료다.
