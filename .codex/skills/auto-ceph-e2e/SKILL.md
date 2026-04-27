---
name: auto-ceph-e2e
description: Auto-Ceph 메뉴 단위 E2E 테스트를 실행하는 사용자용 스킬. v306 테스트 케이스의 menu1 목록을 제시해 선택받고, E2E Jira 티켓 생성, 테스트 실행, 결과 기록, DONE 전이, 실패 기능별 후속 ACW 티켓 생성을 처리한다.
---

# Auto Ceph E2E

이 스킬은 `$auto-ceph-e2e` 하나로 메뉴 단위 E2E 테스트 시나리오 작성, Jira 실행 티켓 생성, Playwright E2E 실행, 결과 기록, 실패 후속 티켓 생성을 처리하는 단일 진입점이다.

## Invocation

- `$auto-ceph-e2e`
  - 무인자 실행만 지원한다.
  - `.auto-ceph-work/scripts/select_e2e_cases.js menu-list <target-case-json>`로 `menu1` 목록을 제시한다.
  - 사용자가 선택한 메뉴에 대해 `.auto-ceph-work/scripts/select_e2e_cases.js select <target-case-json> <menu1>`의 compact selected cases만 사용한다.
  - E2E 실행 Jira 티켓을 만들고 `TO DO -> IN PROGRESS -> DONE` 흐름으로 테스트 결과를 기록한다.
  - 실패 기능/케이스마다 후속 `[ACW]` Jira 티켓을 자동 생성한다.

## Required Sources

항상 아래 파일을 먼저 읽는다.

1. `.auto-ceph-work/references/e2e-test-config.md`
2. `.auto-ceph-work/references/e2e-scenario-template.md`
3. `.auto-ceph-work/references/e2e-execution-contract.md`
4. `.auto-ceph-work/references/e2e-jira-ticket-template.md`
5. `.auto-ceph-work/references/jira-create-template.md`
6. `.auto-ceph-work/references/e2e-case-selection-contract.md`
7. `.auto-ceph-work/references/jira-time-note-contract.md`
8. `.codex/agents/aceph-approval-e2e.toml`

## Runtime Rules

1. 무인자 실행만 지원한다. 티켓 ID나 메뉴 인자는 받지 않는다.
2. 시작 즉시 E2E config의 `url`, `id`, `pw`, `타겟 케이스` 필드를 검증한다.
3. `타겟 케이스`는 repo root 기준 상대 경로이며, `.auto-ceph-work/scripts/select_e2e_cases.js`로 파싱 가능해야 한다. case selection 세부 계약은 `.auto-ceph-work/references/e2e-case-selection-contract.md`를 따른다.
4. `e2e-scenario-template.md`와 `e2e-jira-ticket-template.md`가 없으면 즉시 종료한다.
5. 원본 target case JSON을 직접 읽지 않고 helper `menu-list` 결과로 `menu1` 목록을 만든다.
6. 사용자에게 `e2e 테스트 메뉴를 골라주세요`라고 묻고 `menu1` 목록을 제시한다. 선택값이 목록에 없으면 올바른 메뉴를 다시 입력받는다.
7. helper `select` 결과인 compact selected cases에 포함된 모든 feature/step을 E2E 대상 범위로 확정한다.
8. E2E 시나리오는 `e2e-scenario-template.md`의 `#### 테스트 시나리오`, `#### 기대 결과`, `#### 확인 범위` 구조만 사용한다.
9. 첫 단계는 항상 E2E config의 `url` 접속과 `id/pw` 로그인이며, 이후 단계는 compact selected cases의 `procedure`, `expected_result`를 조합한다.
10. E2E 실행 티켓은 Atlassian MCP `jira_create_issue`로 `project_key="CDS"`, `issue_type="Task"`, 제목 `[ACW E2E] <menu1> E2E 테스트`로 생성한다.
11. E2E 실행 티켓 description은 `e2e-jira-ticket-template.md` 구조를 따르고, 선택 메뉴, target case path, `### E2E 테스트 시나리오`, 빈 `### E2E 테스트 결과`, `### 작업 노트`를 포함한다.
12. E2E 실행 티켓 생성 직후 active sprint 배정과 `TO DO` 전이는 `.auto-ceph-work/references/jira-create-template.md`를 따른다.
13. E2E 실행 티켓을 `IN PROGRESS`로 전이한 뒤 최신 description을 읽고 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> start`로 `티켓 시작 시간`을 기록한다. 시간 기록 세부 계약은 `.auto-ceph-work/references/jira-time-note-contract.md`를 따른다.
14. E2E agent spawn, wait, input, terminal result validation은 `.auto-ceph-work/references/e2e-execution-contract.md`를 따른다. 원본 `v306.json` 전체를 agent context에 넣지 않는다.
15. E2E 종료 후 Jira description의 top-level `### E2E 테스트 결과` 섹션을 생성 또는 교체하고 기능별 상세 결과를 기록한다.
16. 최신 description을 읽고 `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> end`로 `티켓 종료 시간`을 기록한다.
17. 결과 기록과 종료 시간 기록이 끝나면 E2E 실행 티켓을 `DONE`으로 전이한다.
18. E2E 실패 기능/케이스마다 `[ACW] <E2E 티켓 ID> E2E 실패 후속 조치 - <기능명>` 제목의 후속 Jira `Task`를 사용자 입력 없이 생성한다.
19. 후속 티켓 생성 규칙, repo 판정, `remote: origin`, active sprint 배정, `TO DO` 전이는 `.auto-ceph-work/references/jira-create-template.md`를 따른다.
20. 모든 결과 기록, DONE 전이, 실패 후속 티켓 생성이 끝난 뒤 `기능`, `E2E 결과`, `실패 원인`, `후속 티켓` 컬럼의 Markdown 표를 출력한다.
21. `$auto-ceph-e2e` 실행 중에는 helper, config, skill, test-case 파일을 즉석 수정하지 않는다.

## User-Facing Contract

- 사용자는 `$auto-ceph-e2e`만 호출한다.
- 실행 시작 시 helper `menu-list` 결과로 `menu1` 목록을 보여주고 E2E 테스트 메뉴를 한 번 선택받는다.
- helper `select` 결과인 compact selected cases만 사용해 선택 메뉴의 E2E 시나리오를 작성한다.
- E2E 실행 티켓은 `[ACW E2E] <menu1> E2E 테스트` 제목으로 생성되고 active sprint에 즉시 배정된다.
- E2E 실행 티켓은 `TO DO -> IN PROGRESS -> DONE` 흐름으로 처리되며 시작/종료 시간을 기록한다.
- E2E agent wait와 result 처리는 공통 E2E execution contract를 따른다.
- 실패 기능/케이스마다 후속 `[ACW]` Jira `Task`를 생성한다.
- 종료 시 E2E 실행 티켓, 선택 메뉴, 기능별 결과, DONE 전이 여부, 후속 생성 티켓을 표로 보고한다.
