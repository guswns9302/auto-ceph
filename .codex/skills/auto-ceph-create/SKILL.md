---
name: auto-ceph-create
description: Auto-Ceph intake 가능한 Jira 티켓을 대화형으로 생성하는 사용자용 스킬. 사용자의 자유 설명을 바탕으로 문제점을 먼저 정의하고 확인받은 뒤, 개선 방향 후보를 제시하고 선택을 받아 preview 후 Jira를 생성해야 할 때 사용한다.
---

# Auto Ceph Create

이 스킬은 `$auto-ceph-create` 하나로 Auto-Ceph intake 가능한 Jira 티켓을 생성하는 사용자용 단일 진입점이다.

## Invocation

- `$auto-ceph-create`
  - 사용자의 자유 설명을 먼저 받는다.
  - 입력을 바탕으로 `문제점` 초안을 먼저 정의한다.
  - 사용자 확인을 받아 `문제점`을 확정한다.
  - 확정된 `문제점` 기준으로 `개선 방향` 후보를 제시하고 사용자의 선택 또는 수정을 받는다.
  - 최종 제목/description preview를 보여준 뒤 사용자 확인이 있으면 Jira를 생성한다.

## Required Sources

항상 아래 파일을 먼저 읽는다.

1. `.auto-ceph-work/references/jira-ticket-template.md`
2. `.auto-ceph-work/references/jira-create-template.md`
3. `.auto-ceph-work/references/runtime-contract.md`
4. `.codex/skills/auto-ceph/SKILL.md`

## Conversation Rules

1. 사용자의 자유 설명만으로 바로 Jira를 생성하지 않는다.
2. 먼저 사용자 입력을 요약해 `문제점` 초안을 제시한다.
3. 사용자가 문제 정의가 틀렸다고 하면 수정 질문을 하고 `문제점`을 다시 정의한다.
4. 사용자가 문제 정의가 맞다고 확인할 때까지 `문제점` 확정 단계를 반복한다.
5. `문제점`이 확정되기 전에는 `개선 방향`을 제시하지 않는다.
6. 확정된 `문제점` 기준으로만 `개선 방향` 후보 2~4개를 제시한다.
7. 사용자가 후보를 선택하지 않고 수정 요청을 하면 그 요청을 반영해 후보를 다시 정리하고 확인받는다.
8. `project_key`와 `issue_type`은 매번 명시적으로 질문한다.
9. `repo`는 현재 프로젝트 루트 디렉터리명으로 기본 제안한다.
10. `remote`는 로컬 git remote가 하나면 기본 제안하고, 여러 개면 사용자에게 선택시킨다.
11. 최종 제목과 description preview를 보여주고 사용자의 생성 확인이 있기 전까지 Jira를 생성하지 않는다.

## Jira Format Rules

1. 제목은 항상 `[ACW]` 프리픽스를 붙인다.
2. description은 최소 아래 섹션을 포함해야 한다.
   - `### 프로젝트`
   - `### 문제점`
   - `### 개선 방향`
   - `### 작업 노트`
3. `### 프로젝트`에는 아래 bullet을 포함한다.
   - `repo`
   - `remote`
4. `### 작업 노트` 초기값은 아래로 고정한다.

```markdown
#### 문제 확인
- 시작 전
```

5. 일반 Jira 등록은 지원하지 않는다. 항상 Auto-Ceph intake 가능한 형식만 생성한다.

## MCP Rules

1. 실제 생성은 `jira_create_issue`를 사용한다.
2. 필요하면 생성 직후 `jira_get_issue`로 결과를 확인할 수 있다.
3. preview 승인 전에는 `jira_create_issue`를 호출하지 않는다.
4. 생성 시 description에는 사용자가 확정한 `문제점`과 선택한 `개선 방향`만 넣는다.

## User-Facing Contract

- 사용자는 `$auto-ceph-create`만 호출한다.
- 생성 전에 최소 두 번의 명시적 합의를 거친다.
  - `문제점` 확정
  - `개선 방향` 확정
- 생성된 티켓은 이후 `$auto-ceph <TICKET-ID>`로 바로 이어서 처리할 수 있어야 한다.
- 생성이 끝나면 Jira issue key, 제목, 핵심 입력(`repo`, `remote`)을 짧게 보고한다.
