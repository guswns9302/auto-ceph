# Auto-Ceph Work

Jira 티켓 생성, 개발 처리, 승인/배포, E2E 검증을 Codex 스킬로 실행하는 Auto-Ceph 업무 자동화 도구다.

## 설치와 실행

설치:

```bash
npx @eddy_yun/auto-ceph-work install --project .
```

업데이트:

```bash
npx @eddy_yun/auto-ceph-work update --project .
```

삭제:

```bash
npx @eddy_yun/auto-ceph-work uninstall --project .
```

사용자는 아래 4개 스킬만 호출한다.

```bash
$auto-ceph-create
$auto-ceph
$auto-ceph CDS-1234
$auto-ceph-approval
$auto-ceph-e2e
```

## 사전 조건

- Codex 프로젝트 스코프에서 실행한다.
- Atlassian MCP가 Jira 작업을 수행할 수 있어야 한다.
- GitLab MR 작업에는 `glab` CLI를 사용한다.
- 브라우저 E2E는 `$playwright` skill의 canonical wrapper를 사용한다.
- 자동 처리 대상 Jira 티켓은 제목에 `[ACW]`가 있고, Jira `repo`가 현재 프로젝트 루트 디렉터리명과 일치해야 한다.

## Skill Overview

| Skill | 언제 사용하나 | 입력 | Jira 상태 흐름 |
| --- | --- | --- | --- |
| `$auto-ceph-create` | Auto-Ceph가 처리할 개발 티켓을 새로 만들 때 | 사용자 자유 설명 | 생성 후 `TO DO` |
| `$auto-ceph` | `[ACW]` 개발 티켓을 구현하고 MR 생성까지 진행할 때 | 무인자 또는 `<TICKET-ID>` | `TO DO -> IN PROGRESS -> RESOLVE` |
| `$auto-ceph-approval` | `RESOLVE` 티켓을 승인, dev merge, Trombone 배포, E2E, DONE까지 진행할 때 | 무인자 | `RESOLVE -> REVIEW -> DONE` |
| `$auto-ceph-e2e` | 메뉴 단위 독립 E2E 테스트를 실행하고 실패 후속 티켓을 만들 때 | 무인자 | `TO DO -> IN PROGRESS -> DONE` |

## Skill Workflows

| Skill | 주요 흐름 |
| --- | --- |
| `$auto-ceph-create` | 문제점 확정 -> 개선 방향 확정 -> Jira preview -> Jira `Task` 생성 -> active sprint 배정 |
| `$auto-ceph` | 문제 확인 -> 문제 검토 -> 계획 -> 수행 -> 검증 -> 코드 리뷰 -> 리뷰 요청(MR) |
| `$auto-ceph-approval` | `RESOLVE` 티켓 조회 -> 제외 입력 -> `REVIEW` 전이 -> MR approve/dev merge -> Trombone 완료 -> E2E 실행 -> `DONE` 전이 -> 실패 후속 티켓 생성 |
| `$auto-ceph-e2e` | E2E 메뉴 선택 -> 시나리오 작성 -> E2E 실행 티켓 생성 -> E2E agent 실행 -> 결과 기록 -> `DONE` 전이 -> 실패 기능별 후속 티켓 생성 |

## 스킬별 사용법

### `$auto-ceph-create`

새 `[ACW]` 개발 티켓을 만든다.

- 사용자의 설명을 바탕으로 먼저 `문제점`을 확정한다.
- 확정된 문제점 기준으로 `개선 방향` 후보를 제시하고 선택을 받는다.
- Jira 생성 전 제목과 description preview를 보여준다.
- 생성되는 티켓은 `CDS` 프로젝트의 `Task`이며 active sprint에 즉시 배정된다.

### `$auto-ceph`

개발 티켓을 처리하고 MR 생성/재사용까지 진행한다.

- `$auto-ceph`: 내 할당 Jira `TO DO` 티켓 중 `[ACW]` + repo 일치 후보를 생성일 오름차순으로 순차 처리한다.
- `$auto-ceph <TICKET-ID>`: 지정 티켓의 현재 단계를 판정하고 남은 workflow를 이어간다.
- `문제 확인`부터 `코드 리뷰`까지는 Jira 상태를 `IN PROGRESS`로 유지한다.
- `리뷰 요청(MR)` 완료 시 Jira 상태는 `RESOLVE`가 된다.

### `$auto-ceph-approval`

`$auto-ceph`가 `RESOLVE`까지 끝낸 티켓을 승인/배포/E2E/DONE까지 처리한다.

- 시작 시 내 할당 `RESOLVE` 티켓 목록을 보여주고 제외할 티켓 ID를 한 번 입력받는다.
- 제외되지 않은 티켓을 `REVIEW`로 전이한 뒤 MR approve와 dev merge를 진행한다.
- 모든 MR 처리가 끝나면 Trombone dev 파이프라인을 한 번 실행하고 완료를 확인한다.
- Trombone 완료 후 티켓별 E2E를 실행하고 결과를 Jira에 기록한다.
- E2E 성공/실패와 관계없이 원본 티켓은 결과 기록 후 `DONE`으로 전이한다.
- E2E 실패 티켓은 후속 `[ACW]` 티켓을 자동 생성한다.

### `$auto-ceph-e2e`

개발 티켓과 별개로 메뉴 단위 E2E 테스트를 실행한다.

- 시작 시 `v306.json` 기준 `menu1` 목록을 보여주고 테스트할 메뉴를 선택받는다.
- 선택 메뉴의 테스트 케이스로 E2E 시나리오를 작성한다.
- `[ACW E2E] <menu1> E2E 테스트` Jira 티켓을 생성하고 active sprint에 배정한다.
- E2E agent가 테스트를 실행하면 결과를 Jira에 기록하고 티켓을 `DONE`으로 전이한다.
- 실패 기능/케이스마다 후속 `[ACW]` 티켓을 자동 생성한다.

## Jira 상태 흐름

| 흐름 | 상태 |
| --- | --- |
| 신규 개발 티켓 생성 | `TO DO` |
| `$auto-ceph` 개발 처리 | `TO DO -> IN PROGRESS -> RESOLVE` |
| `$auto-ceph-approval` 승인/배포/E2E 처리 | `RESOLVE -> REVIEW -> DONE` |
| `$auto-ceph-e2e` 독립 E2E 실행 티켓 | `TO DO -> IN PROGRESS -> DONE` |

## 생성 티켓 규칙

Auto-Ceph가 생성하는 모든 Jira `Task`는 backlog에 남기지 않고 `CDS` scrum board의 active sprint에 즉시 배정한다.

| 항목 | 규칙 |
| --- | --- |
| Jira project | `CDS` |
| issue type | `Task` |
| sprint | `CDS` scrum board의 active sprint |
| backlog fallback | 허용하지 않음 |

적용 대상:

- `$auto-ceph-create`가 생성하는 개발 티켓
- `$auto-ceph-approval`이 E2E 실패 후 생성하는 후속 티켓
- `$auto-ceph-e2e`가 생성하는 E2E 실행 티켓
- `$auto-ceph-e2e`가 실패 기능/케이스별로 생성하는 후속 티켓

## E2E 후속 티켓

E2E 실패가 확인되면 Auto-Ceph가 실패 원인을 판단해 후속 Jira `Task`를 생성한다.

| 생성 위치 | 제목 형식 | 생성 단위 |
| --- | --- | --- |
| `$auto-ceph-approval` | `[ACW] <원본 티켓> E2E 실패 후속 조치` | 실패 원본 티켓별 1개 |
| `$auto-ceph-e2e` | `[ACW] <E2E 티켓 ID> E2E 실패 후속 조치 - <기능명>` | 실패 기능/케이스별 1개 |

후속 티켓은 실패 원인에 따라 `repo`를 자동 판정한다.

| repo | 주요 기준 |
| --- | --- |
| `remote-ceph-admin` | UI 렌더링, 화면 이동, 버튼/폼, 프론트 validation, DOM selector |
| `ceph-service-api` | REST/API 응답, 비즈니스 로직, DB/CQRS, server validation |
| `ceph-api-gateway` | 401/403, RBAC, 인증/인가 필터, 라우팅, 토큰 전달 |
| `ceph-service-scheduler` | Ceph 리소스 수집, quartz job, CQRS read model 갱신 지연 |

## 세부 계약

README는 사용자용 빠른 사용 문서다. 세부 runtime 계약, Jira description 포맷, helper 입출력, retry 정책, stage result 형식은 각 스킬의 `SKILL.md`와 `.auto-ceph-work/references/*` 문서를 기준으로 한다.
