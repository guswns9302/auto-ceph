---
name: auto-ceph-e2e
description: Auto-Ceph 메뉴 단위 E2E 테스트를 실행하는 사용자용 스킬. v306 테스트 케이스의 menu1 목록을 제시해 선택받고, E2E Jira 티켓 생성, 테스트 실행, 결과 기록, DONE 전이, 실패 기능별 후속 ACW 티켓 생성을 처리한다.
---

# Auto Ceph E2E

이 스킬은 `$auto-ceph-e2e` 하나로 메뉴 단위 E2E 테스트 시나리오 작성, Jira 실행 티켓 생성, Playwright E2E 실행, 결과 기록, 실패 후속 티켓 생성을 처리하는 단일 진입점이다.

## Invocation

- `$auto-ceph-e2e`
  - 무인자 실행만 지원한다.
  - `.auto-ceph-work/references/test-case/v306.json`의 `features[].steps[].menu_path[0]`에서 `menu1` 목록을 수집한다.
  - 사용자에게 `e2e 테스트 메뉴를 골라주세요`라고 묻고 `menu1` 목록을 제시한다.
  - 사용자가 선택한 메뉴의 모든 기능/step을 조합해 E2E 시나리오를 작성한다.
  - E2E 실행 Jira 티켓을 만들고 `TO DO -> IN PROGRESS -> DONE` 흐름으로 테스트 결과를 기록한다.
  - 실패 기능/케이스마다 후속 `[ACW]` Jira 티켓을 자동 생성한다.

## Required Sources

항상 아래 파일을 먼저 읽는다.

1. `.auto-ceph-work/references/e2e-test-config.md`
2. `.auto-ceph-work/references/e2e-scenario-template.md`
3. `.auto-ceph-work/references/test-case/v306.json`
4. `.auto-ceph-work/references/e2e-jira-ticket-template.md`
5. `.auto-ceph-work/references/jira-ticket-template.md`
6. `.auto-ceph-work/references/jira-create-template.md`
7. `.auto-ceph-work/scripts/resolve_atlassian_identity.sh`
8. `.auto-ceph-work/scripts/update_jira_ticket_time_note.js`
9. `.codex/agents/aceph-approval-e2e.toml`

## Runtime Rules

1. 무인자 실행만 지원한다. 티켓 ID나 메뉴 인자는 받지 않는다.
2. 시작 즉시 `.auto-ceph-work/references/e2e-test-config.md`가 존재하는지 확인하고 `url`, `id`, `pw`, `타겟 케이스` 필드가 채워져 있는지 확인한다.
3. `타겟 케이스` 값은 repo root 기준 상대 경로로 해석하며 기본값은 `.auto-ceph-work/references/test-case/v306.json`이다. 파일이 없거나 JSON 파싱이 실패하면 즉시 종료한다.
4. `.auto-ceph-work/references/e2e-scenario-template.md`와 `.auto-ceph-work/references/e2e-jira-ticket-template.md`가 없으면 즉시 종료한다.
5. target case JSON의 `features[].steps[].menu_path[0]` 값을 중복 제거해 `menu1` 목록으로 만든다.
6. 사용자에게 `e2e 테스트 메뉴를 골라주세요`라고 묻고 `menu1` 목록을 제시한다.
7. 사용자가 선택한 메뉴가 `menu1` 목록에 없으면 올바른 메뉴를 다시 입력받는다.
8. 선택된 `menu1`에 속한 모든 feature와 step을 E2E 대상 범위로 확정한다.
9. E2E 시나리오는 `.auto-ceph-work/references/e2e-scenario-template.md`의 구조를 따르며 `#### 테스트 시나리오`, `#### 기대 결과`, `#### 확인 범위`만 포함한다.
10. `#### 테스트 시나리오`의 첫 단계는 항상 E2E config의 `url`로 접속하고 `id`와 `pw`를 입력해 로그인하는 흐름이어야 한다.
11. 이후 단계는 선택된 `menu1`의 모든 기능/step, `procedure`, `expected_result`를 조합해 메뉴 전체 기능을 검증하는 흐름으로 작성한다.
12. E2E 실행 티켓은 Atlassian MCP `jira_create_issue`로 생성하고 `project_key="CDS"`, `issue_type="Task"`를 사용한다.
13. E2E 실행 티켓 제목은 `[ACW E2E] <menu1> E2E 테스트` 형식으로 고정한다.
14. E2E 실행 티켓 description은 `.auto-ceph-work/references/e2e-jira-ticket-template.md` 구조를 따르고, 선택 메뉴, target case path, `### E2E 테스트 시나리오`, 빈 `### E2E 테스트 결과`, `### 작업 노트`를 포함해야 한다.
15. E2E 실행 티켓 생성 직후 `jira_get_agile_boards(project_key="CDS", board_type="scrum")`와 `jira_get_sprints_from_board(state="active")`로 `CDS` active sprint를 찾고, active sprint가 정확히 1개일 때만 `jira_add_issues_to_sprint`로 즉시 배정한다.
16. active sprint가 없거나 여러 개이거나 `jira_add_issues_to_sprint`가 실패하면 E2E 실행 티켓 생성 실패로 보고한다. backlog fallback은 허용하지 않는다.
17. E2E 실행 티켓 생성 직후 상태가 `TO DO`가 아니면 Atlassian MCP로 `TO DO` 전이를 수행한다.
18. E2E 실행 티켓을 `IN PROGRESS`로 전이한 뒤 최신 description을 읽고 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> start`로 `티켓 시작 시간`을 기록한다.
19. E2E 테스트는 `.codex/agents/aceph-approval-e2e.toml` custom agent를 spawn해 수행한다.
20. E2E agent 입력에는 E2E 실행 티켓 ID, 선택된 `menu1`, 생성한 E2E 시나리오, `.auto-ceph-work/references/e2e-test-config.md`, target case JSON, 선택 메뉴의 test cases, Playwright CLI wrapper 경로를 포함한다.
21. E2E agent spawn 직후 반환된 agent id를 E2E 실행 티켓 ID와 함께 기록하고, 이후 wait는 반드시 같은 agent id를 대상으로 수행한다.
22. E2E agent spawn 이후 `wait_agent` timeout 또는 빈 status는 실패가 아니라 단순 polling 결과로만 취급한다.
23. E2E agent가 완료, 실패, blocked 같은 terminal subagent status를 반환할 때까지 같은 agent id를 계속 추적하고 다시 기다려야 한다.
24. pending/running E2E agent가 있으면 메인 세션은 `final_answer`로 종료하면 안 된다.
25. E2E agent가 terminal result를 반환하기 전에는 Jira `### E2E 테스트 결과`, `티켓 종료 시간`, `DONE` 전이, 후속 티켓 생성으로 넘어가면 안 된다.
26. E2E agent는 `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh`를 사용하고, terminal result로 `status=passed|failed`, `ticket_id`, `menu1`, `summary`, `failure_reason`, `failed_step`, `expected`, `actual`, `evidence`, `results[]` 형태를 보고해야 한다.
27. `results[]` 항목은 `feature_name`, `menu_path`, `status=passed|failed`, `failed_step`, `expected`, `actual`, `evidence`, `failure_reason`을 포함해야 한다.
28. E2E agent terminal result가 malformed이거나 `ticket_id`가 기대 E2E 실행 티켓과 다르면 E2E 실패가 아니라 orchestration/system failure로 분류하고 전체 실행을 중단한다.
29. E2E 종료 후 Jira description의 top-level `### E2E 테스트 결과` 섹션을 생성 또는 교체하고 기능별 상세 결과를 기록한다.
30. 최신 description을 읽고 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> end`로 `티켓 종료 시간`을 기록한다.
31. 결과 기록과 종료 시간 기록이 끝나면 Atlassian MCP로 E2E 실행 티켓 상태를 `DONE`으로 변경한다.
32. E2E 결과 기록, 종료 시간 기록, `DONE` 전이 중 하나라도 실패하면 전체 실행을 실패로 종료한다.
33. E2E 실패 기능/케이스마다 실패 원인을 분석해 사용자 입력 없이 새 Jira `Task`를 1개 생성한다.
34. 후속 티켓 제목은 `[ACW] <E2E 티켓 ID> E2E 실패 후속 조치 - <기능명>` 형식으로 고정한다.
35. 후속 티켓 description은 `.auto-ceph-work/references/jira-ticket-template.md`의 intake 가능한 구조를 따르고 `### 프로젝트`, `### 문제점`, `### 개선 방향`, `### 작업 노트`를 포함해야 한다.
36. 후속 티켓 `### 프로젝트`에는 `repo`와 `remote`를 반드시 포함하며 `remote`는 항상 `origin`으로 고정한다.
37. 후속 티켓 `### 문제점`에는 E2E 실행 티켓 링크, 선택 메뉴, E2E 시나리오, 실패 step, 실제 오류/증거, 기대 결과 대비 차이를 요약한다.
38. 후속 티켓 `### 개선 방향`에는 실패 원인에 대한 수정 방향을 스스로 판단해 작성한다.
39. 후속 티켓 `### 작업 노트` 초기값은 `#### 문제 확인`과 `- 시작 전`으로 고정한다.
40. 후속 티켓의 `repo`는 아래 기준으로 선택한다: `remote-ceph-admin`은 UI 렌더링/화면 이동/버튼·폼/프론트 validation/DOM selector 문제, `ceph-service-api`는 REST/API 응답/비즈니스 로직/DB/CQRS command·query/server validation 문제, `ceph-api-gateway`는 401/403/RBAC/인증·인가 필터/라우팅·토큰 전달 문제, `ceph-service-scheduler`는 Ceph 리소스 수집 지연·누락/quartz job/CQRS read model 갱신 지연/배치성 데이터 동기화 문제다.
41. 실패 원인이 복합적이면 가장 직접적인 실패 지점의 repo를 선택하고 판단 근거를 후속 티켓 `### 문제점`에 남긴다.
42. 후속 티켓 생성은 Atlassian MCP `jira_create_issue`를 사용하고 `project_key="CDS"`, `issue_type="Task"`, assignee/reporter는 `.auto-ceph-work/scripts/resolve_atlassian_identity.sh`의 `jira_username`으로 고정한다.
43. 후속 티켓 생성 직후 `jira_get_agile_boards(project_key="CDS", board_type="scrum")`와 `jira_get_sprints_from_board(state="active")`로 `CDS` active sprint를 찾고, active sprint가 정확히 1개일 때만 `jira_add_issues_to_sprint`로 즉시 배정한다.
44. active sprint가 없거나 여러 개이거나 `jira_add_issues_to_sprint`가 실패하면 해당 후속 티켓 생성 실패로 보고한다. backlog fallback은 허용하지 않는다.
45. 후속 티켓 생성 직후 상태가 `TO DO`가 아니면 Atlassian MCP로 `TO DO` 전이를 수행한다.
46. 후속 티켓은 생성만 하고 같은 `$auto-ceph-e2e` 실행 안에서 즉시 처리하지 않는다.
47. 모든 결과 기록, DONE 전이, 실패 후속 티켓 생성이 끝난 뒤 최종 응답에 Markdown 표를 출력한다. 표 컬럼은 `기능`, `E2E 결과`, `실패 원인`, `후속 티켓`으로 고정한다.
48. `$auto-ceph-e2e` 실행 중에는 helper, config, skill, test-case 파일을 즉석 수정하지 않는다. helper 호환성 문제는 현재 실행을 중단하고 Auto-Ceph repo에서 테스트 후 배포해야 한다.

## User-Facing Contract

- 사용자는 `$auto-ceph-e2e`만 호출한다.
- 실행 시작 시 `menu1` 목록을 보여주고 E2E 테스트 메뉴를 한 번 선택받는다.
- 선택 메뉴의 모든 기능/step을 대상으로 E2E 시나리오를 작성한다.
- 생성되는 E2E 실행 티켓 제목은 `[ACW E2E] <menu1> E2E 테스트`다.
- E2E 실행 티켓은 생성 직후 `CDS` active sprint에 즉시 배정하며, active sprint가 정확히 1개가 아니거나 배정 실패 시 backlog fallback 없이 실패로 보고한다.
- E2E 실행 티켓은 `TO DO`로 생성된 뒤 `IN PROGRESS`로 전이되고 `티켓 시작 시간`을 기록한다.
- E2E agent id를 기록하고 terminal result까지 같은 agent id를 계속 기다린다.
- pending/running E2E agent가 있으면 메인 세션은 `final_answer`로 종료하지 않는다.
- E2E 결과를 Jira description에 상세 기록하고 `티켓 종료 시간`을 기록한 뒤 E2E 실행 티켓을 `DONE`으로 전이한다.
- 실패 기능/케이스마다 `[ACW] <E2E 티켓 ID> E2E 실패 후속 조치 - <기능명>` 제목의 후속 Jira `Task`를 사용자 입력 없이 생성한다.
- 후속 Jira `Task`도 생성 직후 `CDS` active sprint에 즉시 배정하며, active sprint가 정확히 1개가 아니거나 배정 실패 시 backlog fallback 없이 실패로 보고한다.
- 후속 티켓은 `remote: origin`을 사용하고 실패 원인에 따라 repo를 자동 판정한다.
- 종료 시에는 E2E 실행 티켓, 선택 메뉴, 기능별 결과, DONE 전이 여부, 후속 생성 티켓을 표로 보고한다.
