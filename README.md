# Auto-Ceph Work

Jira 기반 티켓 루프를 실행하는 개발 업무 자동화

## Quick Start

설치:

```bash
npx @eddy_yun/auto-ceph-work install --project .
```

실행:

```bash
$auto-ceph-create
$auto-ceph
$auto-ceph CDS-1234
```

업데이트:

```bash
npx @eddy_yun/auto-ceph-work update --project .
```

제거:

```bash
npx @eddy_yun/auto-ceph-work uninstall --project .
```

## What It Installs

설치기는 대상 프로젝트에 아래 자산을 넣는다.

- `.auto-ceph-work/`
- `.codex/agents/`
- `.codex/commands/aceph/`
- `.codex/skills/auto-ceph/`
- `.codex/skills/auto-ceph-create/`
- `.codex/hooks/*`

전역 `~/.codex/config.toml`은 수정하지 않는다. 프로젝트 로컬 `.codex/config.toml`과 `.codex/hooks.json`만 관리한다.

## Prerequisites

아래 조건을 전제로 동작한다.

- Codex 프로젝트 스코프에서 사용한다.
- Jira 기반 티켓 워크플로를 사용한다.
- intake 최소 입력은 Jira description의 `repo`, `remote`다.

티켓 자동 선택 대상은 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 일치하는 이슈다.

## How It Works

Auto-Ceph는 고정된 단계 순서로 티켓을 처리한다.

1. 문제 확인
2. 문제 검토
3. 계획
4. 수행
5. 검증
6. 코드 리뷰
7. 리뷰 요청

사용자는 내부 `aceph:*` command를 직접 고르지 않고 `$auto-ceph` 또는 `$auto-ceph <TICKET-ID>`만 호출한다.

티켓을 새로 만들 때는 `$auto-ceph-create`를 사용한다. 이 스킬은 사용자와 대화하며 `문제점`을 먼저 확정하고, 이어서 `개선 방향`을 선택받은 뒤 Auto-Ceph intake 가능한 Jira 티켓을 생성한다. 생성 정책은 고정이며, 항상 `CDS` 프로젝트의 `Task`를 만들고 reporter/assignee는 Atlassian MCP 설정의 `JIRA_USERNAME`과 같은 사용자로 넣는다. 생성된 이슈는 backlog에 두지 않고 `CDS` scrum board의 active sprint에 즉시 추가한다.

무인자 `$auto-ceph`:

- 현재 사용자에게 할당된 Jira `TO DO` 티켓 중 `[ACW]` + repo 일치 후보를 찾는다.
- 시작 시점에 필터된 티켓 스냅샷을 `created ASC`로 고정한다.
- 스냅샷에 포함된 티켓을 같은 실행 안에서 순차 처리한다.

`$auto-ceph <TICKET-ID>`:

- `.auto-ceph-work/tickets/<TICKET-ID>/` 상태를 읽는다.
- `detect_ticket_stage.sh`로 현재 단계를 판정한다.
- 남은 워크플로를 이어서 진행한다.

모든 stage는 별도 custom agent 세션에서 수행된다. 메인 세션은 stage prompt를 구성하고 해당 stage agent를 직접 spawn하는 orchestration만 담당한다. 각 stage agent는 `.codex/agents/*.toml`에 역할별 기본 `model`과 `model_reasoning_effort`가 고정되어 있으며, `sandbox_mode`는 명시하지 않아 상위 실행 환경 권한 정책을 그대로 따른다.

## Retry And Terminal Rules

Auto-Ceph는 Ralph loop 방식으로 동작한다.

- stage 결과가 `blocked`, `failed`, `needs_retry`여도 retryable failure면 같은 실행 안에서 즉시 `fallback_stage`로 재진입한다.
- `retry_pending`은 terminal 상태가 아니라 다음 fallback stage를 다시 dispatch하기 전후의 중간 상태다.
- `needs_retry`는 terminal 상태가 아니고, `retry_reason=verification_unblock`이면 현재 티켓 검증을 직접 막는 최소 unblock 수정만 허용하는 inner loop로 처리한다.
- 같은 loop 안의 stage 전진은 iteration을 올리지 않는다.
- 새 loop attempt를 열 때만 iteration을 증가시킨다.
- 자동 반복 상한은 전체 loop attempt 10회다.
- `리뷰 요청` 완료가 기본 종료 지점이다.
- `코드 리뷰`는 `검증`과 다르다. `검증`은 테스트/동작 판단이고, `코드 리뷰`는 diff 기반 품질/리스크 심사다.

비재시도 종료 사유는 아래와 같다.

- `missing_title_prefix`
- `missing_required_inputs`
- `repo_mismatch`
- `ticket_branch_not_prepared`
- `post_ticket_branch_mismatch`

티켓이 terminal state에 도달하면 메인 세션은 ticket 단위 커밋/푸시를 수행하지 않고 `.auto-ceph-work/scripts/return_to_dev_branch.sh`를 통해 반드시 `dev`로 복귀한다. 후기 git 작업은 `리뷰 요청` 단계가 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`와 MR helper를 통해 `feature/<TICKET-ID>` 브랜치에서 수행한다. `needs_retry` 자체는 terminal 상태가 아니므로 커밋/푸시 대상이 아니다.

고정 커밋 메시지 규칙:

- `passed`: `feat(auto-ceph): finish <TICKET-ID>`
- `blocked`: `chore(auto-ceph): block <TICKET-ID>`
- `failed`: `chore(auto-ceph): fail <TICKET-ID>`

## Ticket Docs

티켓 산출물은 `.auto-ceph-work/tickets/<TICKET-ID>/` 아래에 생성된다.

1. `01_TICKET.md`: Jira 원문에서 추출한 실행 입력과 티켓 메타 정보
2. `02_CONTEXT.md`: 구현 대상과 검증 포인트 정리
3. `03_PLAN.md`: 브랜치 준비, 구현 task, 테스트 기준, verification-unblock 정책
4. `04_EXECUTION.md`: 실제 수행 내용, 검증 보정 사항, verification-unblock 수정 기록
5. `05_UAT.md`: 테스트 결과와 최종 판단
6. `06_REVIEW.md`: 코드 리뷰 결과와 승인 여부
7. `07_SUMMARY.md`: 리뷰 요청용 최종 요약과 Merge Request 메타
8. `08_LOOP.md`: loop attempt 이력과 현재 retry 상태

API 티켓은 `03_PLAN.md`에서 테스트 기준과 완료 기준을 정리하고, 필요하면 `04_EXECUTION.md`에서 실제 검증 보정사항을 남긴다. 여기서 `endpoint`는 Jira 인테이크 필드가 아니라 계획 단계의 API 맥락 정보일 수 있지만, 검증 단계는 자동 테스트 결과와 산출물을 기준으로 판단한다.

## Jira Sync Rules

각 티켓과 stage는 아래 순서를 모두 만족해야 완료로 본다.

1. 메인 세션이 티켓 처리 시작 시 Jira issue description 본문의 `### 작업 노트` 상단에 ticket-level 시작/종료 시간 메타 보장
2. Jira issue description 본문의 `### 작업 노트`에 현재 stage 시작 기록 작성
3. stage 산출물 생성 또는 갱신
4. 같은 `작업 노트` 섹션에 stage 요약 기록 갱신
5. ticket terminal 시 메인 세션이 같은 `작업 노트` 시간 메타의 종료 시간 기록

작업 노트 포맷:

- ticket-level 시간 메타: `- 티켓 시작 시간: YYYY-MM-DD HH:mm:ss Z` + `- 티켓 종료 시간:`
- 시작 기록: `#### 단계명` + `- 시작`
- 요약 기록: 같은 stage 블록 아래 stage 산출물의 고정 섹션 발췌 + 최소 메타

`리뷰 요청` 단계에서는 `.auto-ceph-work/scripts/create_or_reuse_merge_request.js` canonical helper로 Merge Request를 조회/생성하고 `07_SUMMARY.md`의 `## Merge Request` 섹션에 결과를 기록한다. 이 단계가 ticket branch commit/push와 MR open을 함께 소유한다.
Jira description에는 `07_SUMMARY.md`에서 변경 사항, 검증 결과, 코드 리뷰 결과, Merge Request 핵심 메타만 발췌해 반영한다.
`리뷰 요청` 단계에서는 Jira description에 별도 `### 루프 히스토리` 섹션을 두고 `08_LOOP.md` 전문을 그대로 동기화한다.

각 stage는 아래 Jira 상태를 직접 보장해야 한다.

- `문제 확인`: `IN PROGRESS`
- `문제 검토`: `IN PROGRESS`
- `계획`: `IN PROGRESS`
- `수행` 시작: `IN PROGRESS`
- `수행` 완료: `RESOLVE`
- `검증`: `RESOLVE`
- `코드 리뷰`: `RESOLVE`
- `리뷰 요청`: `REVIEW`

Auto-Ceph는 `DONE`으로 자동 전이하지 않는다.

## Repository Layout

이 저장소의 주요 구성은 아래와 같다.

- `.auto-ceph-work/`: workflows, references, templates, scripts 같은 internal assets
- `.codex/agents/`: custom runtime agents
- `.codex/commands/aceph/`: stage contract와 prompt source 문서
- `.codex/skills/auto-ceph/`: `$auto-ceph` 단일 진입 스킬
- `.codex/skills/auto-ceph-create/`: ACW Jira 등록 스킬
- `bin/`, `scripts/`: 설치기와 배포용 스크립트

내부 자산 설명은 [.auto-ceph-work/README.md](/Users/okestro/work/vibe-coding/auto-ceph/.auto-ceph-work/README.md)를 기준으로 본다.

## Release

기본 배포 채널은 npm 패키지다.

- 패키지명: `@eddy_yun/auto-ceph-work`
- 테스트: `node --test tests/*.test.js`
- 배포: `npm publish`

## References

세부 규칙은 아래 문서를 기준으로 한다.

- [.auto-ceph-work/references/runtime-contract.md](/Users/okestro/work/vibe-coding/auto-ceph/.auto-ceph-work/references/runtime-contract.md)
- [.auto-ceph-work/references/workflow.md](/Users/okestro/work/vibe-coding/auto-ceph/.auto-ceph-work/references/workflow.md)
- [.auto-ceph-work/references/runtime-orchestration.md](/Users/okestro/work/vibe-coding/auto-ceph/.auto-ceph-work/references/runtime-orchestration.md)
- [.auto-ceph-work/references/stage-result-format.md](/Users/okestro/work/vibe-coding/auto-ceph/.auto-ceph-work/references/stage-result-format.md)
- [.auto-ceph-work/references/jira-ticket-template.md](/Users/okestro/work/vibe-coding/auto-ceph/.auto-ceph-work/references/jira-ticket-template.md)
