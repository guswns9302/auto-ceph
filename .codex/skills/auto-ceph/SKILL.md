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
  - 각 티켓이 terminal state에 도달하면 변경이 있을 경우 `git commit`과 `git push`를 수행하고 `dev`로 복귀한 뒤 다음 스냅샷 티켓으로 진행한다.
- `$auto-ceph <TICKET-ID>`
  - 해당 티켓의 현재 작업 단계를 판정한다.
  - 남은 워크플로를 순차적으로 진행한다.
  - 티켓이 terminal state에 도달하면 변경이 있을 경우 `git commit`과 `git push`를 수행하고 `dev`로 복귀한 뒤 종료한다.

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

1. 인자가 없으면 Atlassian MCP로 현재 사용자에게 할당된 Jira `TO DO` 티켓을 찾는다.
   제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 intake 대상으로 본다.
   후보가 여러 개면 그중 `created ASC` 기준으로 정렬한 스냅샷 배열을 만들고, 이번 실행에서는 그 배열에 포함된 티켓만 순차 처리한다.
2. 티켓 ID가 확정되면 `doc/<TICKET-ID>/`가 없을 경우 `.auto-ceph-work/scripts/create_ticket_docs.sh <TICKET-ID>`를 먼저 실행한다.
3. 인자가 없던 경우 첫 시작 단계는 `문제 확인`으로 본다.
4. 인자가 있던 경우 `.auto-ceph-work/scripts/detect_ticket_stage.sh <TICKET-ID>`로 현재 단계를 판정한다.
5. 현재 단계에 맞는 canonical stage command, workflow, agent spec를 읽어 stage prompt를 구성한 뒤, 메인 세션이 해당 `.codex/agents/*.toml` stage custom agent를 직접 spawn한다. 각 stage agent는 agent spec에 선언된 역할별 기본 `model`과 `model_reasoning_effort`를 사용하며, `sandbox_mode`는 명시하지 않아 상위 실행 환경 정책을 상속한다.
6. 메인 세션이 stage 작업을 직접 수행하는 것은 금지한다. stage 작업은 항상 spawn된 stage custom agent가 수행한다.
   stage agent는 narrow worker task로 취급하며, spawn 시 thread 전체 문맥을 포크하지 않는다. 필요한 정보는 stage prompt에 모두 포함해야 한다.
   spawn 이후 `wait_agent` timeout은 단순 polling 결과다. pending/running stage agent가 남아 있으면 메인 세션은 종료할 수 없고, 같은 agent id를 계속 추적해야 한다.
7. 각 stage는 작업 전에 Atlassian MCP의 `jira_get_issue`로 현재 description을 읽고, Jira issue description 본문의 `### 작업 노트` 섹션에 현재 stage를 먼저 기록한 뒤 `jira_update_issue`로 갱신해야 한다. 산출물 작성 후에는 같은 본문 `작업 노트` 섹션에서 stage 요약을 다시 갱신해야 한다.
   시작 기록은 `#### 단계명` 헤더와 `- 시작` bullet로, 요약 기록은 같은 stage 블록 아래 bullet 목록으로 남긴다.
8. Jira 상태 전이는 작업 노트와 별개로 다룬다. 각 stage는 자신의 목표 Jira 상태를 직접 보장해야 한다. `문제 확인`/`문제 검토`/`계획`은 `IN PROGRESS`, `수행`은 시작 시 `IN PROGRESS`와 완료 시 `RESOLVE`, `검증`/`코드 리뷰`는 `RESOLVE`, `리뷰 요청`은 `REVIEW`를 맞춰야 한다. 이미 목표 상태라면 no-op로 처리하되 결과에는 `jira_status_transition_applied: unchanged`를 남긴다.
9. 각 단계가 끝나면 `detect_ticket_stage.sh`를 다시 실행해 detector 결과를 확인하고, `resolve_loop_state.sh`로 현재 loop attempt 상태도 다시 읽는다.
10. stage 결과에 `agent_binding`이 없거나 메인 세션이 spawn한 기대 custom agent name과 다르면 stage-agent spawn failure로 간주하고 즉시 중단한다.
11. stage 결과에 Jira 시작 기록 또는 Jira 요약 기록 증거가 없으면 stage 실패로 간주하고 즉시 중단한다.
12. 상태 전이가 필요한 stage인데 기대한 Jira 상태 전이 증거가 없으면 stage 실패로 간주하고 즉시 중단한다.
13. stage 결과가 `blocked`, `failed`, `needs_retry`여도 `terminal_reason`이 입력/설정 오류이면 자동 재진입하지 않는다. 비재시도 종료 사유는 `missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`다. 여기서 `missing_required_inputs`는 intake 시점의 `repo` 또는 `remote` 누락을 뜻한다. 그 외 retryable failure만 `fallback_stage`로 자동 재진입한다. 이 재진입은 다음 사용자 호출로 미루지 않고 같은 `$auto-ceph` 실행 안에서 즉시 수행해야 한다. 같은 loop 안의 stage 전진은 iteration을 올리지 않고, 새 loop attempt를 열 때만 iteration을 증가시킨다. 단, 전체 loop attempt 10회를 넘기면 중단한다.
14. 검증 단계가 Java/toolchain 정상 + main source compile 성공 상태에서 unrelated `compileTestJava` 또는 전역 test compile blocker로 실패하면, stage agent는 `needs_retry`와 함께 `retry_reason: verification_unblock`을 반환해야 한다. 메인 세션은 이를 사용자 판단으로 넘기지 말고 즉시 `수행` fallback inner loop로 소비해야 한다.
15. `verification_unblock` retry로 재진입한 `수행` 단계는 현재 티켓 검증을 직접 막는 최소 컴파일/테스트 unblock 수정만 허용한다. 제품 요구 확장, unrelated 리팩터링, 저장소 전역 정리로 번지는 수정은 금지한다.
16. `verification_unblock` retry prompt에는 실제로 검증을 막은 파일/심볼, 최소 수정 범위 제한, 새 제품 요구 금지 조건을 반드시 포함해야 한다.
17. 같은 verification-unblock 오류 집합이 줄지 않은 채 반복되면 no-progress로 보고 무한 반복 대신 blocking 종료로 전환해야 한다.
18. 티켓이 terminal state에 도달하면 메인 세션은 작업 트리 변경 여부를 확인한다. 변경이 있으면 prepared ticket branch `feature/<TICKET-ID>`에서만 티켓 종료 커밋을 만든다.
19. 기본 커밋 메시지는 티켓 종료 상태를 반영한 고정 형식을 사용한다. `passed`는 `feat(auto-ceph): finish <TICKET-ID>`, `blocked`는 `chore(auto-ceph): block <TICKET-ID>`, `failed`는 `chore(auto-ceph): fail <TICKET-ID>`를 사용한다. `needs_retry`는 terminal 상태가 아니므로 종료 커밋 메시지로 사용하지 않는다.
20. push는 현재 checkout 브랜치 upstream을 우선 사용한다. upstream이 없으면 티켓의 `remote`와 현재 티켓 브랜치 `feature/<TICKET-ID>`를 fallback push 대상으로 사용한다.
21. 티켓의 `remote`가 로컬 git remote에 없거나 commit/push가 실패하면 후처리 실패로 보고 즉시 종료한다.
22. 티켓 terminal 후에는 commit/push 유무와 관계없이 반드시 `dev`로 checkout 복귀해야 하며, 실패 시 전체 실행을 즉시 중단한다.
23. 무인자 `$auto-ceph`는 시작 시점 스냅샷에 포함된 다음 티켓이 남아 있으면 그 티켓으로 계속 진행하고, 스냅샷을 모두 처리하면 종료한다. 단, verification-unblock inner loop가 남아 있는 현재 티켓을 건너뛰고 다음 티켓으로 넘어가면 안 된다.
24. `리뷰 요청` 완료가 자동 루프의 기본 종료 지점이다.
25. `코드 리뷰`는 `검증`과 다르다. `검증`은 테스트/동작 확인이고, `코드 리뷰`는 현재 diff의 품질, 리스크, 테스트 충분성을 심사한다.
26. `코드 리뷰`에서 blocking finding이 있으면 retryable failure로 간주하고 같은 실행 안에서 즉시 `수행`으로 재진입해야 한다.
27. 이후 새 피드백은 다음 `$auto-ceph <TICKET-ID>` 실행에서 Jira 설명/작업 노트를 우선 읽어 새 iteration으로 처리한다.

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
- 메인 세션은 orchestration만 담당하고, 각 stage는 반드시 별도 custom agent가 수행한다.
- 메인 세션은 Ralph loop orchestration만 담당하고, 각 stage는 반드시 별도 custom agent가 수행한다.
- pending stage agent가 하나라도 남아 있으면 메인 세션은 `final_answer`로 종료하면 안 된다.
- 각 티켓 loop가 끝나면 메인 세션이 티켓 단위로 `git commit`과 `git push`를 수행한다.
- 각 티켓 loop가 끝나면 메인 세션은 `dev`로 복귀한 뒤 다음 티켓 또는 종료를 결정한다.
- verification-unblock inner loop는 direct-ticket 실행과 무인자 batch 실행 모두에서 자동으로 소비되며, 사용자 중단 여부를 묻지 않는다.
- 실행 중 각 단계 시작 전 현재 단계와 이유를 한 줄로 설명한다.
- 각 단계가 끝나면 갱신된 산출물과 다음 상태를 짧게 보고한다.
- Jira 상태, Jira issue description 본문의 `작업 노트` 섹션, `doc/<TICKET-ID>/` 산출물은 항상 서로 맞아야 한다.
- loop 상태는 `doc/<TICKET-ID>/08_LOOP.md`에 누적되어야 한다.
- `retry_pending`은 terminal 상태가 아니라 같은 실행 안에서 다음 `fallback_stage`를 다시 spawn하기 전후의 중간 상태다.
- `iteration`은 stage 실행 횟수가 아니라 전체 loop attempt 번호다.
- 각 stage 완료 조건은 `Jira 시작 기록 -> 산출물 생성/갱신 -> Jira 요약 기록` 순서를 모두 만족하는 것이다.
- 상태 전이가 필요한 stage는 지정된 Jira 상태 변경까지 마쳐야 완료다.
