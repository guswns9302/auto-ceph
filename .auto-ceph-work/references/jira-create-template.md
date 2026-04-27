# Jira Create Template Reference

이 문서는 Auto-Ceph 계열 스킬이 Jira `Task`를 생성할 때 따라야 하는 공통 생성 계약이다.
`$auto-ceph-create`는 일반 Jira 티켓 작성기가 아니라 Auto-Ceph intake 가능한 ACW 티켓 생성기이며, `$auto-ceph-approval`과 `$auto-ceph-e2e`의 자동 후속 티켓 생성도 이 sprint 배정 규칙을 따른다.

## Required Outcome

Auto-Ceph 계열에서 생성하는 모든 Jira `Task`는 항상 아래를 만족해야 한다.

- 제목에 `[ACW]` 또는 `[ACW E2E]` 프리픽스 포함
- `project_key`는 항상 `CDS`
- `issue_type`은 항상 `Task`
- description 안에 `repo`, `remote` 포함
- ACW intake 후속 티켓은 `### 문제점`, `### 개선 방향`, `### 작업 노트` 섹션 포함
- `### 작업 노트`에는 초기값으로 `#### 문제 확인`과 `- 시작 전` 포함
- reporter와 assignee가 동일한 `JIRA_USERNAME`으로 설정됨
- `CDS` scrum board의 active sprint에 즉시 배정됨

## Conversation Gates

실제 Jira 생성 전에는 아래 합의가 끝나야 한다.

1. `문제점` 초안 작성
2. 사용자 확인
3. 틀리면 다시 `문제점` 재정의
4. 확정된 `문제점` 기준으로 `개선 방향` 후보 제시
5. 사용자 선택 또는 수정
6. 최종 제목/description preview 확인
7. 확인 후에만 Jira 생성

## Description Shape

권장 description 형식은 아래와 같다.

```markdown
# [ACW] 제목

### 프로젝트
- repo: repository-name
- remote: origin

### 문제점
- 확정된 문제 정의

### 개선 방향
- 사용자가 선택한 개선 방향

### 작업 노트

#### 문제 확인
- 시작 전
```

## Field Rules

- `repo`
  - 현재 프로젝트 루트 디렉터리명을 기본값으로 제안
- `remote`
  - 로컬 git remote가 하나면 기본 제안
  - 여러 개면 사용자에게 선택 받음
- `project_key`
  - 항상 `CDS`
- `issue_type`
  - 항상 `Task`
- `jira_username`
  - `.auto-ceph-work/scripts/resolve_atlassian_identity.sh`가 읽은 값
  - 소스는 `~/.codex/config.toml` 또는 `$CODEX_HOME/config.toml`의 `[mcp_servers.mcp-atlassian.env] JIRA_USERNAME`
  - reporter와 assignee에 같은 값으로 사용
  - 값이 없거나 비어 있으면 생성 실패

## MCP Tooling

- 생성: `jira_create_issue`
- 사용자 식별 해석: `.auto-ceph-work/scripts/resolve_atlassian_identity.sh`
- 스프린트 후보 탐색: `jira_get_agile_boards(project_key="CDS", board_type="scrum")`
- active sprint 확인: `jira_get_sprints_from_board(state="active")`
- sprint 배정: `jira_add_issues_to_sprint`
- 생성 결과 확인이 필요하면: `jira_get_issue`

생성 전 preview 확인 없이 `jira_create_issue`를 호출하면 안 된다.

## Sprint Rules

- 모든 Auto-Ceph 생성 티켓은 `jira_create_issue` 직후 `CDS` scrum board의 active sprint에 즉시 배정해야 한다.
- `CDS` scrum board의 active sprint가 정확히 1개일 때만 생성 성공으로 본다.
- active sprint가 없거나 여러 개면 생성을 실패로 처리한다.
- `jira_add_issues_to_sprint` 실패는 티켓 생성 실패로 처리한다.
- backlog fallback은 허용하지 않는다.
