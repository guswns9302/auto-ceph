# Jira Create Template Reference

`$auto-ceph-create`는 일반 Jira 티켓 작성기가 아니라 Auto-Ceph intake 가능한 ACW 티켓 생성기다.

## Required Outcome

생성 결과는 항상 아래를 만족해야 한다.

- 제목에 `[ACW]` 프리픽스 포함
- description 안에 `repo`, `remote` 포함
- `### 문제점`, `### 개선 방향`, `### 작업 노트` 섹션 포함
- `### 작업 노트`에는 초기값으로 `#### 문제 확인`과 `- 시작 전` 포함

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
  - 매번 사용자에게 질문
- `issue_type`
  - 매번 사용자에게 질문

## MCP Tooling

- 생성: `jira_create_issue`
- 생성 결과 확인이 필요하면: `jira_get_issue`

생성 전 preview 확인 없이 `jira_create_issue`를 호출하면 안 된다.
