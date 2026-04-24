---
name: auto-ceph-approval
description: Auto-Ceph 리뷰 요청이 끝난 RESOLVE 티켓들을 배치 승인해 GitLab MR을 approve 및 dev 머지한 뒤 Trombone dev 파이프라인 실행까지 이어서 처리하는 사용자용 스킬. RESOLVE 티켓 목록을 보여주고 제외할 티켓을 입력받아 남은 티켓만 순차 처리해야 할 때 사용한다.
---

# Auto Ceph Approval

이 스킬은 `$auto-ceph-approval` 하나로 Auto-Ceph `RESOLVE` 티켓들의 후속 승인 배치를 처리하는 사용자용 단일 진입점이다.

## Invocation

- `$auto-ceph-approval`
  - 현재 사용자에게 할당된 Jira `RESOLVE` 티켓을 찾는다.
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
4. Atlassian MCP로 현재 사용자에게 할당된 Jira `RESOLVE` 티켓을 찾는다.
5. Jira 조회는 정확한 RESOLVE 상태 조건을 사용해야 하며 `statusCategory = "In Progress"` 같은 넓은 조건으로 대체하지 않는다. 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 approval 대상으로 본다.
6. 후보가 여러 개면 `created ASC` 기준 스냅샷 배열을 만들고, 이번 실행에서는 그 배열에 포함된 티켓만 다룬다.
7. 스냅샷 목록을 먼저 보여준 뒤 제외할 티켓 ID를 한 번만 입력받는다. 입력은 쉼표, 공백, 개행 구분을 모두 허용하고 빈 입력이면 전체 진행이다.
8. 제외 입력을 반영한 뒤 남은 티켓이 없으면 그 사실을 보고하고 종료한다.
9. 제외되지 않은 대상 티켓이 확정되면 Atlassian MCP로 각 대상 티켓의 Jira 상태를 `RESOLVE`에서 `REVIEW`로 변경한다.
10. 상태 전이 실패 또는 상태 확인 실패가 발생하면 해당 티켓만 1회 재시도한다.
11. 재시도 성공 티켓은 approval batch 정상 대상에 포함한다.
12. 재시도까지 실패한 티켓은 `transition_failed_excluded`로 기록하고 이번 approval batch에서 제외한다. 이 실패는 전체 실행 중단 사유가 아니다.
13. 전이 실패 제외 후 남은 티켓이 없으면 MR 처리와 Trombone 실행 없이 종료한다.
14. 각 대상 티켓 처리 전 `.auto-ceph-work/tickets/<TICKET-ID>/07_SUMMARY.md`가 존재하고 `## Merge Request` 섹션의 `URL`, `source`, `target` 메타가 채워져 있는지 확인한다. approval 사전 검증의 MR 메타 canonical source는 `07_SUMMARY.md`다.
15. 필요한 MR 메타가 없으면 그 티켓을 실패로 보고 즉시 전체 실행을 중단한다.
16. MR 작업은 `.auto-ceph-work/scripts/approve_and_merge_review_mr.js` canonical helper만 사용한다.
17. helper 입력은 `<TICKET-ID> <SOURCE> <TARGET>`으로 고정한다. source는 `feature/<TICKET-ID>`, target은 `dev`다.
18. MR helper는 Jira 상태가 `REVIEW`로 전이된 티켓에 대해서만 호출한다.
19. helper는 `glab` CLI만 사용해 대상 MR을 조회하고 approve를 수행한 뒤, merge 가능 상태가 될 때까지 기다렸다가 merge해야 한다.
20. helper는 `dev` 대상 merge 완료까지 확인해야 성공이다.
21. helper 성공 직후 Atlassian MCP comment API로 해당 티켓에 `MR approve / merge success` 댓글을 추가한다. 이 댓글은 작업 노트가 아니라 approval 진행상황 알림이다.
22. MR 성공 댓글 추가에 실패하면 해당 티켓 처리 실패로 보고 즉시 전체 실행을 중단한다.
23. approval 대상 티켓들은 REVIEW 전이, MR approve 및 dev merge, 성공 댓글 추가를 모두 끝낼 때까지 순차 처리한다.
24. 중간 티켓에서 helper preflight 실패, approve 실패, mergeable 대기 timeout, merge 실패, malformed helper output, merged-to-dev 확인 실패, comment write 실패가 발생하면 즉시 전체 실행을 중단하고 Trombone 단계로 넘어가면 안 된다.
25. Trombone 실행은 모든 대상 티켓의 MR batch가 성공적으로 끝난 뒤 한 번만 수행한다.
26. Trombone UI 작업은 `.auto-ceph-work/scripts/run_trombone_pipeline.sh` canonical helper만 사용한다.
27. Trombone helper는 Jira 상태가 `REVIEW`로 전이되고 MR batch까지 성공한 티켓이 하나 이상 있을 때만 호출한다.
28. helper 입력은 `<REPO> <CONFIG-FILE>`로 고정한다.
29. Trombone helper는 `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh` wrapper를 기본 경로로 사용해야 하며, 필요하면 `PWCLI_BIN` override를 허용한다. 실행 전에 wrapper와 `run-code` 사용 가능 여부를 preflight로 확인해야 한다.
30. Trombone helper는 `login_url` 접속, `id/pw` 로그인, 좌측 메뉴 `빌드배포 > 파이프라인 관리` 진입, `${pipeline_prefix}${repo}` 검색, 배포환경 `dev` row의 `실행` 버튼 클릭을 순서대로 수행해야 한다.
31. 실행 버튼이 없거나 비활성화면 실패로 처리하고 즉시 종료한다. Playwright CLI 에러, session collision, malformed helper output은 실패이며 `status=triggered`를 출력하면 안 된다.
32. v1 종료 조건은 실행 버튼 클릭 성공이다. 배포 완료 polling은 하지 않는다.
33. Trombone helper가 `status=triggered`와 `pipeline=<pipeline_prefix><repo>`를 반환하면, 이번 실행에서 MR approve/dev merge가 성공한 모든 티켓에 Atlassian MCP comment API로 `Trombone 파이프라인 실행 완료 (<pipeline_prefix><repo>)` 댓글을 추가한다.
34. Trombone 완료 댓글 중 하나라도 실패하면 전체 실행은 실패로 보고 최종 보고에 실패 티켓을 포함한다.
35. `$auto-ceph` stage 작업 노트는 계속 Jira description을 사용하고 comment API를 쓰지 않는다. `$auto-ceph-approval`의 comment API 사용은 approval status notification comment에만 허용되는 예외다.
36. `$auto-ceph-approval` 실행 중에는 helper 파일을 즉석 수정하지 않는다. helper 호환성 문제는 현재 실행을 중단하고 Auto-Ceph repo에서 테스트 후 배포해야 한다.

## User-Facing Contract

- 사용자는 `$auto-ceph-approval`만 호출한다.
- 실행 시작 시 RESOLVE 티켓 스냅샷 목록을 먼저 보여주고, 제외할 티켓 ID를 한 번만 입력받는다.
- approval 대상은 `[ACW]` + `repo` 일치 + 내 할당 + Jira `RESOLVE` 티켓으로 제한된다.
- 제외되지 않은 티켓은 MR 처리 전에 `REVIEW`로 전이한다. 전이 실패 티켓은 1회 재시도 후에도 실패하면 이번 batch에서 제외하고 나머지 티켓은 계속 진행한다.
- 제외되지 않은 티켓은 MR approve 및 dev merge를 먼저 모두 끝내고, 각 티켓에 `MR approve / merge success` 댓글을 남긴다.
- Trombone 파이프라인 실행은 MR batch 성공 후 단 한 번만 수행한다.
- Trombone 파이프라인 실행 성공 후에는 처리된 모든 티켓에 `Trombone 파이프라인 실행 완료 (<pipeline_prefix><repo>)` 댓글을 남긴다.
- 중간 실패가 발생하면 남은 티켓과 Trombone 실행은 진행하지 않는다.
- 실행 중 helper를 수정하지 않으며, helper/preflight 실패는 즉시 중단 사유다.
- 종료 시에는 사용자 제외 티켓, REVIEW 전이 실패로 제외된 티켓, MR 처리 티켓, 중단된 티켓, Trombone 실행 여부를 짧게 보고한다.
