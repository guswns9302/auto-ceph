---
name: auto-ceph-approval
description: Auto-Ceph 리뷰 요청이 끝난 RESOLVE 티켓들을 배치 승인해 GitLab MR을 approve 및 dev 머지하고 Trombone dev 파이프라인 완료 후 E2E 테스트와 DONE 전이까지 처리하는 사용자용 스킬. RESOLVE 티켓 목록을 보여주고 제외할 티켓을 입력받아 남은 티켓만 순차 처리해야 할 때 사용한다.
---

# Auto Ceph Approval

이 스킬은 `$auto-ceph-approval` 하나로 Auto-Ceph `RESOLVE` 티켓들의 후속 승인, 배포, E2E 검증, DONE 전이를 처리하는 사용자용 단일 진입점이다.

## Invocation

- `$auto-ceph-approval`
  - 현재 사용자에게 할당된 Jira `RESOLVE` 티켓을 찾는다.
  - 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 후보로 본다.
  - `created ASC` 스냅샷으로 목록을 보여준 뒤 제외할 티켓 ID를 한 번만 입력받는다.
  - 제외되지 않은 티켓들에 대해 MR approve 및 dev merge를 순차 처리한다.
  - 모든 대상 티켓의 MR 처리가 끝난 뒤 Trombone dev 파이프라인을 한 번만 실행하고 완료를 확인한다.
  - Trombone 완료 후 대상 티켓별 E2E 테스트를 모두 수행하고 결과를 표로 요약한다.
  - E2E 성공/실패와 관계없이 원본 티켓을 `DONE`으로 전이하고, 실패 티켓은 후속 `[ACW]` Jira 티켓을 자동 생성한다.

## Required Sources

항상 아래 파일을 먼저 읽는다.

1. `.codex/skills/auto-ceph/SKILL.md`
2. `.auto-ceph-work/references/runtime-contract.md`
3. `.auto-ceph-work/references/jira-sync.md`
4. `.auto-ceph-work/references/trombone-config.md`
5. `.auto-ceph-work/references/e2e-test-config.md`
6. `.auto-ceph-work/references/e2e-scenario-template.md`
7. `.auto-ceph-work/scripts/approve_and_merge_review_mr.js`
8. `.auto-ceph-work/scripts/run_trombone_pipeline.sh`
9. `.codex/agents/aceph-approval-e2e.toml`
10. `.auto-ceph-work/references/jira-ticket-template.md`
11. `.auto-ceph-work/references/jira-create-template.md`
12. `.auto-ceph-work/scripts/resolve_atlassian_identity.sh`

## Runtime Rules

1. 무인자 실행만 지원한다. 티켓 ID 인자는 받지 않는다.
2. 시작 즉시 `.auto-ceph-work/references/trombone-config.md`가 존재하는지 확인하고, 현재 프로젝트 루트명과 같은 `repo` entry가 있는지 확인한다.
3. 시작 즉시 `.auto-ceph-work/references/e2e-test-config.md`가 존재하는지 확인하고 `url`, `id`, `pw`, `타겟 케이스` 필드가 채워져 있는지 확인한다.
4. `타겟 케이스` 값은 repo root 기준 상대 경로로 해석하며 기본값은 `.auto-ceph-work/references/test-case/v306.json`이다. 파일이 없거나 JSON 파싱이 실패하면 즉시 종료한다.
5. Trombone config 또는 E2E config가 없거나 필수 값이 누락되면 이유를 명시하고 즉시 종료한다.
6. Atlassian MCP로 현재 사용자에게 할당된 Jira `RESOLVE` 티켓을 찾는다.
7. Jira 조회는 정확한 RESOLVE 상태 조건을 사용해야 하며 `statusCategory = "In Progress"` 같은 넓은 조건으로 대체하지 않는다. 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 approval 대상으로 본다.
8. 후보가 여러 개면 `created ASC` 기준 스냅샷 배열을 만들고, 이번 실행에서는 그 배열에 포함된 티켓만 다룬다.
9. 스냅샷 목록을 먼저 보여준 뒤 제외할 티켓 ID를 한 번만 입력받는다. 입력은 쉼표, 공백, 개행 구분을 모두 허용하고 빈 입력이면 전체 진행이다.
10. 제외 입력을 반영한 뒤 남은 티켓이 없으면 그 사실을 보고하고 종료한다.
11. 제외되지 않은 대상 티켓이 확정되면 Atlassian MCP로 각 대상 티켓의 Jira 상태를 `RESOLVE`에서 `REVIEW`로 변경한다.
12. 상태 전이 실패 또는 상태 확인 실패가 발생하면 해당 티켓만 1회 재시도한다.
13. 재시도 성공 티켓은 approval batch 정상 대상에 포함한다.
14. 재시도까지 실패한 티켓은 `transition_failed_excluded`로 기록하고 이번 approval batch에서 제외한다. 이 실패는 전체 실행 중단 사유가 아니다.
15. 전이 실패 제외 후 남은 티켓이 없으면 MR 처리, Trombone 실행, E2E 실행 없이 종료한다.
16. 각 대상 티켓 처리 전 `.auto-ceph-work/tickets/<TICKET-ID>/07_SUMMARY.md`가 존재하고 `## Merge Request` 섹션의 `URL`, `source`, `target` 메타가 채워져 있는지 확인한다. approval 사전 검증의 MR 메타 canonical source는 `07_SUMMARY.md`다.
17. 필요한 MR 메타가 없으면 그 티켓을 실패로 보고 즉시 전체 실행을 중단한다.
18. MR approve 전에 각 대상 티켓의 Jira description에 top-level `### E2E 테스트 시나리오` 섹션을 생성 또는 교체한다. 위치는 `### 개선 방향` 다음, `### 작업 노트` 이전이다.
19. E2E 시나리오는 `.auto-ceph-work/references/e2e-scenario-template.md`의 구조를 따르며 `#### 테스트 시나리오`, `#### 기대 결과`, `#### 확인 범위`만 포함한다.
20. `#### 테스트 시나리오`의 첫 단계는 항상 E2E config의 `url`로 접속하고 `id`와 `pw`를 입력해 로그인하는 흐름이어야 한다.
21. 이후 단계는 티켓의 `문제점`, `개선 방향`, `07_SUMMARY.md`, `타겟 케이스` JSON의 관련 케이스를 선택 및 조합해 작성한다.
22. E2E 시나리오 Jira 반영 실패는 MR approve 전 전체 중단 사유다.
23. MR 작업은 `.auto-ceph-work/scripts/approve_and_merge_review_mr.js` canonical helper만 사용한다.
24. helper 입력은 `<TICKET-ID> <SOURCE> <TARGET>`으로 고정한다. source는 `feature/<TICKET-ID>`, target은 `dev`다.
25. MR helper는 Jira 상태가 `REVIEW`로 전이된 티켓에 대해서만 호출한다.
26. helper는 `glab` CLI만 사용해 대상 MR을 조회하고 approve를 수행한 뒤, merge 가능 상태가 될 때까지 기다렸다가 merge해야 한다.
27. helper는 `dev` 대상 merge 완료까지 확인해야 성공이다.
28. helper 성공 직후 Atlassian MCP comment API로 해당 티켓에 `MR approve / merge success` 댓글을 추가한다. 이 댓글은 작업 노트가 아니라 approval 진행상황 알림이다.
29. MR 성공 댓글 추가에 실패하면 해당 티켓 처리 실패로 보고 즉시 전체 실행을 중단한다.
30. approval 대상 티켓들은 REVIEW 전이, E2E 시나리오 반영, MR approve 및 dev merge, 성공 댓글 추가를 모두 끝낼 때까지 순차 처리한다.
31. 중간 티켓에서 helper preflight 실패, approve 실패, mergeable 대기 timeout, merge 실패, malformed helper output, merged-to-dev 확인 실패, comment write 실패가 발생하면 즉시 전체 실행을 중단하고 Trombone 단계로 넘어가면 안 된다.
32. Trombone 실행은 모든 대상 티켓의 MR batch가 성공적으로 끝난 뒤 한 번만 수행한다.
33. Trombone UI 작업은 `.auto-ceph-work/scripts/run_trombone_pipeline.sh` canonical helper만 사용한다.
34. Trombone helper는 Jira 상태가 `REVIEW`로 전이되고 MR batch까지 성공한 티켓이 하나 이상 있을 때만 호출한다.
35. helper 입력은 `<REPO> <CONFIG-FILE>`로 고정한다.
36. Trombone helper는 `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh` wrapper를 기본 경로로 사용해야 하며, 필요하면 `PWCLI_BIN` override를 허용한다. 실행 전에 wrapper와 `run-code` 사용 가능 여부를 preflight로 확인해야 한다. `run-code --filename`에 넘기는 generated JS 파일은 Playwright CLI allowed root 안의 repo-local `.auto-ceph-work/tmp/`에 생성해야 한다.
37. Trombone helper는 `login_url` 접속, `id/pw` 로그인, 좌측 메뉴 `빌드배포 > 파이프라인 관리` 진입, `${pipeline_prefix}${repo}` 검색, 배포환경 `dev` row의 `실행` 버튼 클릭, 같은 row의 버튼 텍스트 `중지` 전환 확인, 같은 row의 버튼 텍스트 `실행` 복귀 polling, row 클릭으로 상세 페이지 진입, 상세 `파이프라인 실행이력` 첫 행 확인을 순서대로 수행해야 한다.
38. 실행 버튼이 없거나 비활성화면 실패로 처리하고 즉시 종료한다. Playwright CLI 에러, file access denied/outside allowed roots, session collision, malformed helper output은 helper/runtime 실패이며 `status=completed`를 출력하면 안 된다.
39. Trombone helper 성공 조건은 상세 `파이프라인 실행이력` 섹션 테이블의 헤더 제외 첫 행에서 `상태=성공`이고 `로그수집여부=수집`인 상태까지 확인하는 것이다.
40. 첫 행의 `상태=성공`이고 `로그수집여부=미수집`이면 helper는 상세 페이지를 새로고침하며 10초마다 최대 30분 동안 재확인해야 한다.
41. 첫 행의 `상태=실패`이거나 helper stderr에 `trombone deployment failed`가 있으면 Trombone 배포 실패로 본다. Playwright CLI file access denied/outside allowed roots 같은 helper/runtime 실패는 실제 배포 실패로 라벨링하지 않고 별도 실패 원인으로 보고해야 한다.
42. Trombone 배포 실패 시 이번 batch의 MR approve/dev merge 성공 티켓 전체에 Atlassian MCP comment API로 `Trombone 배포 실패 (<pipeline_prefix><repo>)` 댓글을 추가한다.
43. Trombone 배포 실패 댓글 중 하나라도 실패하면 전체 실행 실패로 보고 최종 보고에 실패 티켓을 포함한다.
44. Trombone 실패, 배포 완료 polling timeout, 상태/컬럼 판별 실패, 상세 진입 실패는 모두 non-zero exit이며 E2E agent 실행과 `DONE` 전이를 절대 수행하지 않는다.
45. Trombone helper가 `status=completed`와 `pipeline=<pipeline_prefix><repo>`를 반환한 뒤에만 E2E agent를 실행한다.
46. E2E 테스트는 `.codex/agents/aceph-approval-e2e.toml` custom agent를 티켓 단위로 순차 spawn해 수행한다.
47. 티켓별 E2E agent spawn 직후 반환된 agent id를 해당 티켓 ID와 함께 기록하고, 이후 wait는 반드시 같은 agent id를 대상으로 수행한다.
48. E2E agent spawn 이후 `wait_agent` timeout 또는 빈 status는 실패가 아니라 단순 polling 결과로만 취급한다.
49. E2E agent가 완료, 실패, blocked 같은 terminal subagent status를 반환할 때까지 같은 agent id를 계속 추적하고 다시 기다려야 한다.
50. pending/running E2E agent가 하나라도 있으면 approval 메인 세션은 `final_answer`로 종료하면 안 된다.
51. E2E agent가 terminal result를 반환하기 전에는 Jira `### E2E 테스트 결과`, E2E 댓글, 원본 티켓 `DONE` 전이, 후속 티켓 생성으로 넘어가면 안 된다.
52. E2E agent 입력에는 티켓 ID, Jira description의 `### E2E 테스트 시나리오`, `.auto-ceph-work/references/e2e-test-config.md`, `타겟 케이스` JSON, Playwright CLI wrapper 경로를 포함한다.
53. E2E agent는 `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh`를 사용하고, terminal result로 `status=passed|failed`, `ticket_id`, `summary`, `failure_reason`, `failed_step`, `expected`, `actual`, `evidence` 형태를 보고해야 한다.
54. E2E agent terminal result가 malformed이거나 `ticket_id`가 기대 티켓과 다르면 E2E 실패가 아니라 orchestration/system failure로 분류하고 전체 실행을 중단한다.
55. 티켓 단위 E2E 순서는 `spawn -> terminal result wait -> result validation -> Jira 결과 처리 -> 다음 티켓 spawn`으로 고정한다.
56. 개별 티켓 E2E terminal result가 `failed`여도 남은 대상 티켓의 E2E 실행은 계속 진행한다. 단, pending/running 상태를 실패로 간주해 다음 티켓으로 넘어가면 안 된다.
57. 각 티켓 E2E 실행 후 Jira description에 top-level `### E2E 테스트 결과` 섹션을 생성 또는 교체한다. 위치는 `### E2E 테스트 시나리오` 다음, `### 작업 노트` 이전이다.
58. E2E 성공 티켓에는 Atlassian MCP comment API로 `E2E 테스트 성공` 댓글을 남긴다.
59. E2E 실패 티켓에는 Atlassian MCP comment API로 `E2E 테스트 실패` 댓글을 남긴다.
60. E2E 성공/실패 댓글과 결과 기록이 끝난 뒤 Atlassian MCP로 원본 티켓 상태를 `DONE`으로 변경한다.
61. E2E 결과 기록, E2E 댓글, 원본 티켓 `DONE` 전이 중 하나라도 실패하면 해당 티켓 처리 실패로 보고 전체 실행을 실패로 종료한다.
62. E2E 실패 티켓마다 실패 원인을 분석해 사용자 입력 없이 새 Jira `Task`를 1개 생성한다.
63. 후속 티켓 제목은 `[ACW] <원본 티켓> E2E 실패 후속 조치` 형식으로 고정한다.
64. 후속 티켓 description은 `.auto-ceph-work/references/jira-ticket-template.md`의 intake 가능한 구조를 따르고 `### 프로젝트`, `### 문제점`, `### 개선 방향`, `### 작업 노트`를 포함해야 한다.
65. 후속 티켓 `### 프로젝트`에는 `repo`와 `remote`를 반드시 포함하며 `remote`는 항상 `origin`으로 고정한다.
66. 후속 티켓 `### 문제점`에는 원본 티켓 링크, E2E 시나리오, 실패 step, 실제 오류/증거, 기대 결과 대비 차이를 요약한다.
67. 후속 티켓 `### 개선 방향`에는 실패 원인에 대한 수정 방향을 스스로 판단해 작성한다.
68. 후속 티켓 `### 작업 노트` 초기값은 `#### 문제 확인`과 `- 시작 전`으로 고정한다.
69. 후속 티켓의 `repo`는 아래 기준으로 선택한다: `remote-ceph-admin`은 UI 렌더링/화면 이동/버튼·폼/프론트 validation/DOM selector 문제, `ceph-service-api`는 REST/API 응답/비즈니스 로직/DB/CQRS command·query/server validation 문제, `ceph-api-gateway`는 401/403/RBAC/인증·인가 필터/라우팅·토큰 전달 문제, `ceph-service-scheduler`는 Ceph 리소스 수집 지연·누락/quartz job/CQRS read model 갱신 지연/배치성 데이터 동기화 문제다.
70. 실패 원인이 복합적이면 가장 직접적인 실패 지점의 repo를 선택하고 판단 근거를 후속 티켓 `### 문제점`에 남긴다.
71. 후속 티켓 생성은 Atlassian MCP `jira_create_issue`를 사용하고 `project_key="CDS"`, `issue_type="Task"`, assignee/reporter는 `.auto-ceph-work/scripts/resolve_atlassian_identity.sh`의 `jira_username`으로 고정한다.
72. 후속 티켓 생성 직후 상태가 `TO DO`가 아니면 Atlassian MCP로 `TO DO` 전이를 수행한다.
73. 후속 티켓은 생성만 하고 같은 `$auto-ceph-approval` 실행 안에서 즉시 처리하지 않는다.
74. 모든 E2E 실행, 원본 티켓 `DONE` 전이, 실패 후속 티켓 생성이 끝난 뒤 최종 응답에 Markdown 표를 출력한다. 표 컬럼은 `티켓`, `E2E 결과`, `DONE 전이`, `실패 원인`, `후속 티켓`으로 고정한다.
75. 모든 E2E 대상 티켓의 결과 처리와 후속 티켓 생성까지 끝난 뒤, 이번 실행에서 MR approve/dev merge가 성공한 모든 티켓에 Atlassian MCP comment API로 `Trombone 파이프라인 실행 완료 (<pipeline_prefix><repo>)` 댓글을 추가한다.
76. Trombone 완료 댓글 중 하나라도 실패하면 전체 실행은 실패로 보고 최종 보고에 실패 티켓을 포함한다.
77. `$auto-ceph` stage 작업 노트는 계속 Jira description을 사용하고 comment API를 쓰지 않는다. `$auto-ceph-approval`의 comment API 사용은 approval status notification comment와 E2E result notification comment에만 허용되는 예외이며, approval의 후속 티켓 생성은 E2E 실패 대응 전용 예외다.
78. `$auto-ceph-approval` 실행 중에는 helper, config, skill, test-case 파일을 즉석 수정하지 않는다. helper 호환성 문제는 현재 실행을 중단하고 Auto-Ceph repo에서 테스트 후 배포해야 한다.

## User-Facing Contract

- 사용자는 `$auto-ceph-approval`만 호출한다.
- 실행 시작 시 RESOLVE 티켓 스냅샷 목록을 먼저 보여주고, 제외할 티켓 ID를 한 번만 입력받는다.
- approval 대상은 `[ACW]` + `repo` 일치 + 내 할당 + Jira `RESOLVE` 티켓으로 제한된다.
- 제외되지 않은 티켓은 MR 처리 전에 `REVIEW`로 전이한다. 전이 실패 티켓은 1회 재시도 후에도 실패하면 이번 batch에서 제외하고 나머지 티켓은 계속 진행한다.
- 제외되지 않은 티켓은 MR approve 전에 Jira description에 `### E2E 테스트 시나리오`를 기록한다.
- 제외되지 않은 티켓은 MR approve 및 dev merge를 먼저 모두 끝내고, 각 티켓에 `MR approve / merge success` 댓글을 남긴다.
- Trombone 파이프라인 실행은 MR batch 성공 후 단 한 번만 수행하고 dev 파이프라인 완료까지 확인한다.
- Trombone 배포 실패가 확인되면 처리된 모든 티켓에 `Trombone 배포 실패 (<pipeline_prefix><repo>)` 댓글을 남기고 E2E 및 `DONE` 전이를 수행하지 않는다.
- Trombone 완료 후 처리 티켓별 E2E agent를 순차 실행하고, 개별 E2E 실패가 있어도 남은 티켓의 E2E를 계속 실행한다.
- E2E agent spawn 직후 agent id를 티켓별로 기록하고, `wait_agent` timeout 또는 빈 status는 polling 결과로만 보며 같은 agent id를 terminal result까지 계속 기다린다.
- pending/running E2E agent가 하나라도 있으면 approval 메인 세션은 `final_answer`로 종료하지 않는다.
- E2E agent terminal result 전에는 Jira E2E 결과 기록, 댓글, `DONE` 전이, 후속 티켓 생성을 수행하지 않는다.
- E2E 성공 티켓은 Jira description에 `### E2E 테스트 결과`를 기록하고 `E2E 테스트 성공` 댓글을 남긴 뒤 `DONE`으로 전이한다.
- E2E 실패 티켓도 Jira description에 `### E2E 테스트 결과`를 기록하고 `E2E 테스트 실패` 댓글을 남긴 뒤 `DONE`으로 전이한다.
- E2E 실패 티켓마다 `[ACW] <원본 티켓> E2E 실패 후속 조치` 제목의 후속 Jira `Task`를 사용자 입력 없이 생성한다.
- 모든 E2E 실행, DONE 전이, 후속 티켓 생성이 끝나면 `티켓`, `E2E 결과`, `DONE 전이`, `실패 원인`, `후속 티켓` 컬럼의 Markdown 표로 결과를 보여준다.
- 모든 E2E 및 DONE 전이가 끝난 후 처리된 모든 티켓에 `Trombone 파이프라인 실행 완료 (<pipeline_prefix><repo>)` 댓글을 남긴다.
- 중간 실패가 발생하면 남은 티켓과 Trombone 실행은 진행하지 않는다.
- 실행 중 helper, config, skill, test-case 파일을 수정하지 않으며, helper/preflight 실패는 즉시 중단 사유다. Playwright CLI file access denied/outside allowed roots는 Trombone 배포 실패가 아니라 helper/runtime 실패로 보고한다.
- 종료 시에는 사용자 제외 티켓, REVIEW 전이 실패로 제외된 티켓, MR 처리 티켓, E2E 처리 티켓, DONE 전이 티켓, 후속 생성 티켓, 중단된 티켓, Trombone 실행 여부를 짧게 보고한다.
