# Workflow Reference

## Source of Truth

- `.auto-ceph-work/references/runtime-contract.md`
- `.auto-ceph-work/references/jira-sync.md`
- `.auto-ceph-work/references/stage-result-format.md`
- `.auto-ceph-work/tickets/<티켓번호>/01_TICKET.md` 부터 `.auto-ceph-work/tickets/<티켓번호>/08_LOOP.md` 까지의 stage 산출물

## Phase Mapping

| 단계 | Canonical command | Canonical workflow | Canonical agent |
|---|---|---|
| 문제 확인 | `.codex/commands/aceph/intake-ticket.md` | `workflows/intake-ticket.md` | `.codex/agents/aceph-ticket-intake.toml` |
| 문제 검토 | `.codex/commands/aceph/review-ticket.md` | `workflows/review-ticket.md` | `.codex/agents/aceph-ticket-review.toml` |
| 계획 | `.codex/commands/aceph/plan-ticket.md` | `workflows/plan-ticket.md` | `.codex/agents/aceph-ticket-plan.toml` |
| 수행 | `.codex/commands/aceph/execute-ticket.md` | `workflows/execute-ticket.md` | `.codex/agents/aceph-ticket-execute.toml` |
| 검증 | `.codex/commands/aceph/verify-ticket.md` | `workflows/verify-ticket.md` | `.codex/agents/aceph-ticket-verify.toml` |
| 코드 리뷰 | `.codex/commands/aceph/code-review-ticket.md` | `workflows/code-review-ticket.md` | `.codex/agents/aceph-ticket-code-review.toml` |
| 리뷰 요청 | `.codex/commands/aceph/review-request-ticket.md` | `workflows/review-request-ticket.md` | `.codex/agents/aceph-ticket-review-request.toml` |

## Entry Points

- top-level orchestrator: `$auto-ceph` main session
- stage dispatch target: the `Canonical agent` and `Canonical command` for the detected stage
- 티켓 자동 선택 대상: 제목에 `[ACW]`가 있고 `repo`가 현재 프로젝트 루트 디렉터리명과 일치하는 Jira `TO DO` 티켓
- 자동 선택 우선순위: repo 일치 후보 중 `created ASC` 기준으로 가장 오래된 1건
- 무인자 `$auto-ceph`는 시작 시점의 필터된 티켓 스냅샷을 `created ASC`로 정렬하고, 그 배열을 같은 실행 안에서 순차 처리한다

## State Progression

- 문서가 없으면 `문제 확인`
- `02_CONTEXT.md`가 확정되지 않았으면 `문제 검토`
- `03_PLAN.md`가 미완성이면 `계획`
- `04_EXECUTION.md`가 미완성이면 `수행`
- `05_UAT.md`가 미완료면 `검증`
- `06_REVIEW.md`가 미완료면 `코드 리뷰`
- `07_SUMMARY.md`가 미완료거나 MR 메타가 비어 있으면 `리뷰 요청`
- `08_LOOP.md`는 반복 제어 이력을 담고 detector의 현재 stage 판정과는 분리한다
- `08_LOOP.md`의 `retry_pending`은 다음 fallback stage를 같은 실행 안에서 다시 dispatch하기 위한 중간 상태다

## Ralph Loop Policy

- stage 결과가 `blocked`, `failed`, `needs_retry`여도 `terminal_reason`이 입력/설정 오류면 재진입하지 않는다
- 비재시도 종료 사유는 `missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`다
- 그 외 stage 결과는 메인 세션이 같은 실행 안에서 즉시 `fallback_stage`로 재진입한다
- `needs_retry`이면서 `retry_reason=verification_unblock`이면 메인 세션은 현재 티켓 검증을 직접 막는 최소 unblock 수정만 허용하는 inner loop를 연다
- `코드 리뷰` 단계에서 `changes_requested`가 나오면 retryable failure로 보고 `수행`으로 되돌린다
- 같은 loop 안의 stage 전진은 iteration을 올리지 않는다
- retry 시에는 다음 iteration을 연 뒤 그 iteration의 `fallback_stage`를 같은 실행 안에서 바로 소비한다
- 자동 반복 상한은 전체 loop attempt 10회다
- `리뷰 요청` 완료가 자동 루프의 기본 종료 지점이다
- `리뷰 요청` 완료의 의미에는 `07_SUMMARY.md` 기본 요약 작성, ticket branch `git commit`/`git push`, canonical helper 기반 MR 생성 또는 재사용, helper 결과의 `07_SUMMARY.md` 반영, Jira description 최종 동기화가 포함된다
- 이후 새 요구나 피드백은 다음 실행에서 Jira 설명/작업 노트를 우선 읽고 새 iteration을 연다
- `문제 확인` stage 의 branch preparation 은 `.auto-ceph-work/scripts/prepare_ticket_branch.sh` canonical helper만 사용한다
- `리뷰 요청` stage 의 non-MR git 작업은 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh` canonical helper만 사용한다
- review-request git helper 는 현재 checkout 브랜치 upstream을 우선 사용하고, upstream이 없으면 티켓의 `remote`와 현재 티켓 브랜치 `feature/<TICKET-ID>`를 fallback으로 사용한다
- review-request git helper 는 prepared ticket branch `feature/<TICKET-ID>`에서만 성공해야 한다
- 각 티켓 처리 시작 시 메인 세션은 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js`로 Jira description `### 작업 노트` 상단의 `티켓 시작 시간`을 보장한다
- 각 티켓 terminal 시 메인 세션은 같은 helper로 `티켓 종료 시간`을 기록한다
- 각 티켓 terminal 뒤에는 메인 세션이 반드시 `dev`로 복귀한 뒤 다음 티켓 또는 종료를 결정한다
- 메인 세션의 terminal branch 복귀는 `.auto-ceph-work/scripts/return_to_dev_branch.sh` canonical helper만 사용한다
- review-request stage git 후처리가 실패하면 즉시 종료한다

## Branch Policy

- 실제 작업 브랜치는 항상 `feature/<TICKET-ID>`다
- 브랜치 준비는 `문제 확인` 단계에서 수행한다
- branch preparation의 canonical helper는 `.auto-ceph-work/scripts/prepare_ticket_branch.sh`다
- `계획` 단계는 브랜치를 결정하지 않고 이미 준비된 브랜치를 문서화한다

## Repo Rules

- `remote-ceph-admin`
  - 계획 단계에서 UI 계획 제외
  - 검증 단계에서 `$playwright` skill canonical wrapper 우선
  - 브라우저 검증은 `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh`만 사용하고 headless-by-default로 수행
  - 사용자 명시 디버깅 요청 없이는 `--headed`, `show`, `pause-at`을 사용하지 않는다
- API 변경
  - 검증 단계에서 테스트 우선
  - 계획 단계에서 테스트 기준과 완료 기준을 정리
  - 수행 단계에서 필요하면 `04_EXECUTION.md`에 실제 검증 보정사항을 기록
  - 검증이 unrelated test compile failure로 막히면 수행 단계는 최소 verification-unblock 수정만 예외적으로 허용한다
  - 검증 단계에서 테스트 결과와 산출물을 기준으로 최종 판단
- 코드 품질 확인
  - 코드 리뷰 단계에서 현재 브랜치의 변경 코드와 diff를 직접 검토한다
  - 핵심 판단 기준은 품질, 구조, 회귀 위험, 경계 조건, 테스트 충분성이다
  - 테스트 재실행 자체는 코드 리뷰 단계의 목적이 아니다
