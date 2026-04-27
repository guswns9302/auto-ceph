# Jira Time Note Contract

이 문서는 Jira description `### 작업 노트` 상단의 ticket-level 시간 메타데이터 갱신 계약이다.

## Helper Interface

- Start time: `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> start`
- End time: `.auto-ceph-work/scripts/update_jira_ticket_time_note.js <description-file> end`

## Required Behavior

- helper 입력은 최신 Jira description을 저장한 로컬 description file이다.
- `start`는 `티켓 시작 시간`을 기록하고 기존 시작 시간이 있으면 보존한다.
- `end`는 `티켓 종료 시간`을 기록 또는 갱신한다.
- 시간 메타데이터는 `### 작업 노트` 안에서 stage block보다 먼저 위치해야 한다.
- helper 출력 description을 Atlassian MCP로 Jira description에 반영해야 한다.

## Failure Policy

- description file 없음, 읽기 실패, malformed description, 작업 노트 갱신 실패, helper non-zero exit은 stage 또는 skill failure다.
- stale description에 시간 메타데이터를 쓰면 안 되며, 기록 전 최신 Jira description을 다시 읽어야 한다.
