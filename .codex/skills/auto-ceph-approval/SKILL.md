---
name: auto-ceph-approval
description: Auto-Ceph 리뷰 요청이 끝난 REVIEW 티켓들을 배치 승인해 GitLab MR을 approve 및 dev 머지한 뒤 Trombone dev 파이프라인 실행까지 이어서 처리하는 사용자용 스킬. REVIEW 티켓 목록을 보여주고 제외할 티켓을 입력받아 남은 티켓만 순차 처리해야 할 때 사용한다.
---

# Auto Ceph Approval

이 스킬은 `$auto-ceph-approval` 하나로 Auto-Ceph `REVIEW` 티켓들의 후속 승인 배치를 처리하는 사용자용 단일 진입점이다.

## Invocation

- `$auto-ceph-approval`
  - 현재 사용자에게 할당된 Jira `REVIEW` 티켓을 찾는다.
  - 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 후보로 본다.
  - `created ASC` 스냅샷으로 목록을 보여준 뒤 제외할 티켓 ID를 한 번만 입력받는다.
  - 제외되지 않은 티켓들에 대해 MR approve 및 dev merge를 순차 처리한다.
  - 모든 대상 티켓의 MR 처리가 끝난 뒤 Trombone dev 파이프라인을 한 번만 실행한다.

## Required Sources

항상 아래 파일을 먼저 읽는다.

1. `.codex/skills/auto-ceph/SKILL.md`
2. `.auto-ceph-work/references/runtime-contract.md`
3. `.auto-ceph-work/references/jira-sync.md`
4. `.auto-ceph-work/references/trombone-config.md`
5. `.auto-ceph-work/scripts/approve_and_merge_review_mr.js`
6. `.auto-ceph-work/scripts/run_trombone_pipeline.sh`

## Runtime Rules

1. 무인자 실행만 지원한다. 티켓 ID 인자는 받지 않는다.
2. 시작 즉시 `.auto-ceph-work/references/trombone-config.md`가 존재하는지 확인하고, 현재 프로젝트 루트명과 같은 `repo` entry가 있는지 확인한다.
3. Trombone config가 없거나 `repo`가 현재 프로젝트 루트와 다르면 이유를 명시하고 즉시 종료한다.
4. Atlassian MCP로 현재 사용자에게 할당된 Jira `REVIEW` 티켓을 찾는다.
5. 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 approval 대상으로 본다.
6. 후보가 여러 개면 `created ASC` 기준 스냅샷 배열을 만들고, 이번 실행에서는 그 배열에 포함된 티켓만 다룬다.
7. 스냅샷 목록을 먼저 보여준 뒤 제외할 티켓 ID를 한 번만 입력받는다. 입력은 쉼표, 공백, 개행 구분을 모두 허용하고 빈 입력이면 전체 진행이다.
8. 제외 입력을 반영한 뒤 남은 티켓이 없으면 그 사실을 보고하고 종료한다.
9. 각 대상 티켓 처리 전 `.auto-ceph-work/tickets/<TICKET-ID>/07_SUMMARY.md`가 존재하고 `## Merge Request` 섹션의 `URL`, `source`, `target` 메타가 채워져 있는지 확인한다.
10. 필요한 MR 메타가 없으면 그 티켓을 실패로 보고 즉시 전체 실행을 중단한다.
11. MR 작업은 `.auto-ceph-work/scripts/approve_and_merge_review_mr.js` canonical helper만 사용한다.
12. helper 입력은 `<TICKET-ID> <SOURCE> <TARGET>`으로 고정한다. source는 `feature/<TICKET-ID>`, target은 `dev`다.
13. helper는 `glab` CLI만 사용해 대상 MR을 조회하고 approve를 수행한 뒤, merge 가능 상태가 될 때까지 기다렸다가 merge해야 한다.
14. helper는 `dev` 대상 merge 완료까지 확인해야 성공이다.
15. approval 대상 티켓들은 MR approve 및 dev merge를 모두 끝낼 때까지 순차 처리한다.
16. 중간 티켓에서 approve 실패, mergeable 대기 timeout, merge 실패, merged-to-dev 확인 실패가 발생하면 즉시 전체 실행을 중단하고 Trombone 단계로 넘어가면 안 된다.
17. Trombone 실행은 모든 대상 티켓의 MR batch가 성공적으로 끝난 뒤 한 번만 수행한다.
18. Trombone UI 작업은 `.auto-ceph-work/scripts/run_trombone_pipeline.sh` canonical helper만 사용한다.
19. helper 입력은 `<REPO> <CONFIG-FILE>`로 고정한다.
20. Trombone helper는 `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh` wrapper를 기본 경로로 사용해야 하며, 필요하면 `PWCLI_BIN` override를 허용한다.
21. Trombone helper는 `login_url` 접속, `id/pw` 로그인, 좌측 메뉴 `빌드배포 > 파이프라인 관리` 진입, `${pipeline_prefix}${repo}` 검색, 배포환경 `dev` row의 `실행` 버튼 클릭을 순서대로 수행해야 한다.
22. 실행 버튼이 없거나 비활성화면 실패로 처리하고 즉시 종료한다.
23. v1 종료 조건은 실행 버튼 클릭 성공이다. 배포 완료 polling은 하지 않는다.

## User-Facing Contract

- 사용자는 `$auto-ceph-approval`만 호출한다.
- 실행 시작 시 REVIEW 티켓 스냅샷 목록을 먼저 보여주고, 제외할 티켓 ID를 한 번만 입력받는다.
- approval 대상은 `[ACW]` + `repo` 일치 + 내 할당 + Jira `REVIEW` 티켓으로 제한된다.
- 제외되지 않은 티켓은 MR approve 및 dev merge를 먼저 모두 끝낸다.
- Trombone 파이프라인 실행은 MR batch 성공 후 단 한 번만 수행한다.
- 중간 실패가 발생하면 남은 티켓과 Trombone 실행은 진행하지 않는다.
- 종료 시에는 처리된 티켓, 중단된 티켓, Trombone 실행 여부를 짧게 보고한다.
