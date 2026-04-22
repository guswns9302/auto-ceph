# Jira Sync Reference

## Status Flow

- 시작: `TO DO`
- 문제 확인 단계 시작 또는 완료 시: `IN PROGRESS`
- 수행 단계 완료 시: `RESOLVE`
- 검증 단계 시작 시: `REVIEW`

## Status Transition Rules

- Jira 상태 전이는 `작업 노트` 갱신과 별개다.
- `문제 확인` 단계는 티켓이 `TO DO`에서 출발한다고 가정하고 `IN PROGRESS`로 전이한다.
- `수행` 단계는 구현과 산출물 갱신이 끝난 시점에 `RESOLVE`로 전이한다.
- `검증` 단계는 검증 작업을 시작하기 전에 `REVIEW`로 전이한다.
- `문제 검토`, `계획`, `리뷰 요청` 단계는 기본적으로 Jira 상태를 변경하지 않는다.
- 요구된 상태 전이가 실패하면 해당 stage는 완료가 아니다.

## Work Note Values

- `문제 확인`
- `문제 검토`
- `계획`
- `수행`
- `검증`
- `리뷰 요청`

## Stage Completion Contract

각 stage agent는 아래 순서를 반드시 지킨다.

1. 작업 시작 전에 Atlassian MCP의 `jira_get_issue`로 현재 description을 읽고, Jira issue description 본문의 `### 작업 노트` 섹션에 현재 stage를 먼저 기록한 뒤 `jira_update_issue`로 description 전체를 갱신한다.
2. 현재 stage의 산출물을 만들고 필요한 파일과 상태를 갱신한다.
3. 산출물 작성이 끝난 뒤 Atlassian MCP로 같은 description 본문의 `### 작업 노트` 섹션에서 해당 stage 블록을 최신 요약 bullet로 갱신한다.

위 3단계가 모두 끝나야 stage 완료로 본다.

상태 전이가 필요한 stage는 위 순서 안에서 각 stage 규칙에 맞는 시점에 Jira 상태 전이까지 마쳐야 한다.

## Work Note Write Rules

- Jira 작업 노트 쓰기는 comment가 아니라 issue description 본문의 `### 작업 노트` 섹션 수정이어야 한다.
- `jira_add_comment` 같은 comment 기반 기록은 사용하지 않는다.
- 시작 기록은 반드시 description의 `### 작업 노트` 섹션 안에서 Markdown `#### <stage>` 헤더 형식으로 남긴다.
- 시작 기록은 빈 헤더를 두지 말고 최소 `- 시작` bullet을 포함한다.
- 종료 요약은 같은 stage 헤더 아래 Markdown bullet 목록 형식으로 남긴다.
- stage를 다시 실행하면 같은 stage 블록 전체를 최신 내용으로 교체한다.
- 종료 요약은 실제 수정 파일, 검증 결과, blocker 여부 중 핵심만 짧게 남긴다.
- 종료 요약이 없으면 stage는 완료가 아니다.
- 시작 기록 쓰기 실패 또는 종료 요약 쓰기 실패는 모두 stage 실패로 간주한다.
- Jira 쓰기 실패가 있으면 문서 변경이 남아 있어도 다음 stage로 진행하지 않는다.
- 여기서 Jira 쓰기에는 description의 `작업 노트` 섹션 갱신과 Jira 상태 전이가 모두 포함된다.

## Failure Rule

- Jira 쓰기 실패는 성공으로 간주하지 않는다.
- 문서 수정은 남길 수 있지만, 다음 단계로 진행하지 않는다.
