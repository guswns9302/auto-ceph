# Runtime Contract

Auto-Ceph 설치 자산은 프로젝트 루트의 `AGENTS.md`를 소유하지 않는다.
상위 orchestration 계약은 `.codex/skills/auto-ceph/SKILL.md`가 맡고, 런타임 상세 계약은 이 문서가 맡는다.

## Runtime Surface

- `.codex/agents/*.toml`을 primary runtime agent registry로 본다.
- `.codex/commands/aceph/*.md`를 primary command entrypoint로 본다.
- `.codex/hooks/*`는 lifecycle and safety helper로 본다.
- `.auto-ceph-work/`는 workflows, scripts, templates, references를 담는 internal implementation asset이다.

## Ticket Loop

- Auto-Ceph intake 대상 Jira 티켓은 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 일치해야 한다.
- intake 완료의 최소 실행 입력은 Jira description의 `repo`, `remote`다.
- 실제 작업 브랜치는 항상 `feature/<TICKET-ID>`이며 intake 단계에서 `dev` 기준으로 준비한다.
- canonical branch preparation helper는 `.auto-ceph-work/scripts/prepare_ticket_branch.sh`다.
- 항상 ticket stage는 하나씩만 진행한다.
- 고정 순서는 `문제 확인 -> 문제 검토 -> 계획 -> 수행 -> 검증 -> 코드 리뷰 -> 리뷰 요청`이다.
- Jira issue description 본문의 `작업 노트` 섹션은 `doc/<TICKET-ID>/` 산출물과 항상 일치해야 한다.
- Jira 상태 전이는 stage 계약과 일치해야 한다.
  - `문제 확인 -> IN PROGRESS`
  - `수행 완료 -> RESOLVE`
  - `검증 시작 -> REVIEW`
- stage는 Jira issue description 본문의 `작업 노트` 섹션에 현재 stage가 먼저 기록된 뒤에 시작된다.
- stage는 산출물 갱신과 같은 description 본문의 `작업 노트` 요약 기록까지 끝나야 완료된다.
- `03_PLAN.md` 없이 구현에 들어가면 안 된다.
- API 티켓이면 `03_PLAN.md`에 테스트 기준과 검증 기준이 있어야 한다.
- `05_UAT.md`, `06_REVIEW.md`, `07_SUMMARY.md` 없이 리뷰 요청으로 넘어가면 안 된다.
- Ralph loop 상태는 `08_LOOP.md`에 누적한다.
- `retry_pending`은 retryable failure 뒤 fallback stage를 다시 dispatch하기 직전 또는 직후의 중간 상태다. terminal state가 아니며, 같은 `$auto-ceph` 실행 안에서 즉시 소비되어야 한다.
- API 검증은 자동 테스트 결과와 계획/수행 단계 산출물을 기준으로 판단한다.
- 코드 리뷰는 자동 테스트를 다시 수행하는 단계가 아니라 구현 코드의 품질, 구조, 리스크, 테스트 충분성을 심사하는 단계다.
- Jira 입력 누락, repo mismatch, branch preparation 불일치 같은 입력/설정 오류는 Ralph loop 자동 재진입 대상이 아니다.
- retryable failure는 `retry_pending`만 남기고 현재 실행을 종료하면 안 된다. direct-ticket 실행과 무인자 batch 실행 모두 같은 실행 안에서 즉시 `fallback_stage`로 재진입해야 한다.
- 티켓 loop가 terminal state에 도달하면 오케스트레이터는 티켓 단위 `git commit`과 `git push`를 수행해야 한다.
- terminal git 후처리는 현재 checkout 브랜치가 `feature/<TICKET-ID>`일 때만 허용한다.
- git push는 현재 checkout 브랜치 upstream을 우선 사용하고, upstream이 없으면 티켓의 `remote`와 현재 티켓 브랜치 `feature/<TICKET-ID>`를 fallback으로 사용한다.
- 티켓의 `remote`가 로컬 git remote에 없거나 git 후처리가 실패하면 즉시 종료해야 한다.
- 각 티켓 terminal 후에는 commit/push 유무와 관계없이 반드시 `dev`로 복귀해야 한다.
- 무인자 `$auto-ceph`는 시작 시점에 Jira 후보 스냅샷을 한 번 만들고, 그 배열을 같은 실행 안에서 순차 처리한다.
- custom agent binding failure, Jira read/write failure, invalid stage result, git post-processing failure 같은 시스템성 실패는 현재 batch 실행을 즉시 중단해야 한다.

## Source Of Truth

- User-facing entrypoint: `.codex/skills/auto-ceph/SKILL.md`
- Runtime references: `.auto-ceph-work/references/*.md`
- Runtime commands: `.codex/commands/aceph/*.md`
- Runtime agents: `.codex/agents/*.toml`

## Execution Rules

- `aceph:next`가 top-level orchestrator entrypoint다.
- stage execution은 custom runtime agent binding을 우선한다.
- 호스트 런타임이 custom agent binding을 수행하지 못하면 즉시 실패로 본다.
- 오케스트레이터가 stage 작업을 inline으로 대체하면 안 된다.
- `PreToolUse` hook은 advisory-only이며 stage 실행을 대신하지 않는다.
