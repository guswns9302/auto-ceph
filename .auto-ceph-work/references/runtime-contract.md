# Runtime Contract

Auto-Ceph 설치 자산은 프로젝트 루트의 `AGENTS.md`를 소유하지 않는다.
상위 orchestration 계약은 `.codex/skills/auto-ceph/SKILL.md`가 맡고, 런타임 상세 계약은 이 문서가 맡는다.

## Runtime Surface

- `.codex/agents/*.toml`을 primary runtime agent registry로 본다.
- `.codex/commands/aceph/*.md`를 stage contract and prompt source로 본다.
- `.codex/hooks/*`는 lifecycle and safety helper로 본다.
- `.auto-ceph-work/`는 workflows, scripts, templates, references를 담는 internal implementation asset이다.

## Ticket Loop

- Auto-Ceph intake 대상 Jira 티켓은 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 일치해야 한다.
- intake 완료의 최소 실행 입력은 Jira description의 `repo`, `remote`다.
- 실제 작업 브랜치는 항상 `feature/<TICKET-ID>`이며 intake 단계에서 `dev` 기준으로 준비한다.
- canonical branch preparation helper는 `.auto-ceph-work/scripts/prepare_ticket_branch.sh`다.
- 메인 orchestrator의 terminal branch 복귀 helper는 `.auto-ceph-work/scripts/return_to_dev_branch.sh`다.
- 메인 orchestrator의 ticket-level 작업 시간 helper는 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js`다.
- 항상 ticket stage는 하나씩만 진행한다.
- 고정 순서는 `문제 확인 -> 문제 검토 -> 계획 -> 수행 -> 검증 -> 코드 리뷰 -> 리뷰 요청`이다.
- Jira issue description 본문의 `작업 노트` 섹션은 `.auto-ceph-work/tickets/<TICKET-ID>/` 산출물과 항상 일치해야 한다.
- Jira issue description 본문의 `작업 노트` 섹션 상단에는 ticket-level `티켓 시작 시간`과 `티켓 종료 시간`이 있어야 한다.
- `리뷰 요청` 단계에서는 Jira description의 `루프 히스토리` 섹션도 `08_LOOP.md`와 일치해야 한다.
- `리뷰 요청` 단계에서는 `07_SUMMARY.md`가 handoff/Jira sync용 single source of truth여야 하며 `## Merge Request` 섹션을 포함해야 한다.
- Jira 상태 전이는 stage 계약과 일치해야 한다.
  - `문제 확인 -> IN PROGRESS`
  - `문제 검토 -> IN PROGRESS`
  - `계획 -> IN PROGRESS`
  - `수행 -> IN PROGRESS`
  - `검증 -> IN PROGRESS`
  - `코드 리뷰 -> IN PROGRESS`
  - `리뷰 요청 -> RESOLVE`
- stage는 Jira issue description 본문의 `작업 노트` 섹션에 현재 stage가 먼저 기록된 뒤에 시작된다.
- `티켓 시작 시간`은 메인 세션이 각 티켓 처리 시작 전에 기록하며, 이미 값이 있으면 보존한다.
- `티켓 종료 시간`은 메인 세션이 ticket terminal 시 최신 완료 시각으로 기록한다.
- stage는 산출물 갱신과 같은 description 본문의 `작업 노트` 요약 기록까지 끝나야 완료된다.
- `작업 노트` 요약은 경로만 적는 짧은 bullet이 아니라 stage 산출물의 고정 섹션 발췌를 포함해야 한다.
- `리뷰 요청` 단계는 Jira `RESOLVE` 보장, `07_SUMMARY.md` 기본 요약 작성, ticket branch commit, push, canonical helper 기반 MR 생성 또는 재사용, helper 결과의 `07_SUMMARY.md` 반영, Jira description 최종 동기화까지 끝나야 완료다.
- 여기서 Jira description 최종 동기화는 `#### 리뷰 요청` stage summary 갱신과 `08_LOOP.md` 전문의 top-level `### 루프 히스토리` 섹션 반영을 함께 뜻한다.
- `리뷰 요청` 단계의 MR 처리는 `.auto-ceph-work/scripts/create_or_reuse_merge_request.js` canonical helper만 사용한다.
- helper는 `glab` CLI만 사용하고 `status`, `title`, `url`, `source`, `target`를 반환해야 한다.
- `리뷰 요청` 단계의 MR은 `feature/<TICKET-ID>` -> `dev`를 기준으로 조회하고, 기존 열린 MR이 있으면 재사용하고 없으면 생성한다.
- stage가 이미 목표 상태를 만족하는 경우에도 stage result에는 `jira_status_transition_applied: unchanged`를 남겨야 한다.
- `03_PLAN.md` 없이 구현에 들어가면 안 된다.
- API 티켓이면 `03_PLAN.md`에 테스트 기준과 검증 기준이 있어야 한다.
- `05_UAT.md`, `06_REVIEW.md`, `07_SUMMARY.md` 없이 리뷰 요청으로 넘어가면 안 된다.
- Ralph loop 상태는 `08_LOOP.md`에 누적한다.
- `retry_pending`은 retryable failure 뒤 fallback stage를 다시 dispatch하기 직전 또는 직후의 중간 상태다. terminal state가 아니며, 같은 `$auto-ceph` 실행 안에서 즉시 소비되어야 한다.
- 검증 단계에서 unrelated `compileTestJava` 같은 외부 test compile blocker가 감지되면, `needs_retry` + `retry_reason=verification_unblock`으로 분류할 수 있다.
- `verification_unblock` retry는 제품 요구 확장이 아니라 현재 티켓 검증을 직접 막는 최소 컴파일/테스트 unblock 수정만 허용한다.
- API 검증은 자동 테스트 결과와 계획/수행 단계 산출물을 기준으로 판단한다.
- 코드 리뷰는 자동 테스트를 다시 수행하는 단계가 아니라 구현 코드의 품질, 구조, 리스크, 테스트 충분성을 심사하는 단계다.
- Jira 입력 누락, repo mismatch, branch preparation 불일치 같은 입력/설정 오류는 Ralph loop 자동 재진입 대상이 아니다.
- retryable failure는 `retry_pending`만 남기고 현재 실행을 종료하면 안 된다. direct-ticket 실행과 무인자 batch 실행 모두 같은 실행 안에서 즉시 `fallback_stage`로 재진입해야 한다.
- 무인자 batch 실행에서도 verification-unblock inner loop는 현재 티켓 안에서 먼저 소비해야 하며, 해당 티켓이 terminal 되기 전에는 다음 snapshot 티켓으로 넘어가면 안 된다.
- 메인 세션은 티켓 단위 `git commit`과 `git push`를 수행하지 않는다.
- `리뷰 요청` stage가 ticket-level commit/push 와 MR 생성을 함께 소유한다.
- `리뷰 요청` stage의 non-MR git helper는 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`다.
- `needs_retry`는 terminal 상태가 아니므로 그 자체로는 stage 내부 commit/push 대상이 아니다.
- `리뷰 요청` stage 의 git 후처리는 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`만 사용해야 하며, helper 내부에서 현재 checkout 브랜치가 `feature/<TICKET-ID>`인지 검증해야 한다.
- review-request git helper는 현재 checkout 브랜치 upstream을 우선 사용하고, upstream이 없으면 티켓의 `remote`와 현재 티켓 브랜치 `feature/<TICKET-ID>`를 fallback으로 사용한다.
- 티켓의 `remote`가 로컬 git remote에 없거나 review-request stage git 후처리가 실패하면 즉시 종료해야 한다.
- 각 티켓 terminal 후에는 메인 세션이 반드시 `dev`로 복귀해야 한다.
- 각 티켓 terminal 후에는 다음 티켓으로 넘어가거나 종료하기 전에 메인 세션이 `티켓 종료 시간`을 Jira description에 반영해야 한다.
- 무인자 `$auto-ceph`는 시작 시점에 Jira 후보 스냅샷을 한 번 만들고, 그 배열을 같은 실행 안에서 순차 처리한다.
- stage-agent spawn failure, Jira read/write failure, invalid stage result, git post-processing failure 같은 시스템성 실패는 현재 batch 실행을 즉시 중단해야 한다.

## Source Of Truth

- User-facing entrypoint: `.codex/skills/auto-ceph/SKILL.md`
- Runtime references: `.auto-ceph-work/references/*.md`
- Stage contracts: `.codex/commands/aceph/*.md`
- Runtime agents: `.codex/agents/*.toml`

## Execution Rules

- `$auto-ceph` 메인 세션이 top-level orchestration entrypoint다.
- stage execution은 메인 세션의 direct stage-agent spawn을 우선한다.
- 호스트 런타임이 메인 세션에서 stage agent를 spawn하지 못하면 즉시 실패로 본다.
- 메인 세션이 stage 작업을 inline으로 대체하면 안 된다.
- `PreToolUse` hook은 advisory-only이며 stage 실행을 대신하지 않는다.
