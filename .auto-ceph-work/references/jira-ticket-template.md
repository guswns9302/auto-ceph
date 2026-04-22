# Jira Ticket Intake Reference

Auto-Ceph는 Jira description 전체 템플릿 일치를 요구하지 않는다.
인테이크 대상 판별은 제목의 고정 프리픽스와 최소 실행 필드만 사용한다.

## Intake Gate

- Jira 제목에 `[ACW]`가 포함되어야 intake 대상 후보로 본다.
- Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같아야 실제 intake 대상로 본다.
- `[ACW]`가 없으면 Auto-Ceph는 해당 티켓을 intake 대상으로 취급하지 않는다.
- `[ACW]`가 있어도 `repo`가 현재 프로젝트와 다르면 다른 프로젝트 티켓으로 보고 제외하거나 중단한다.

## Minimum Required Inputs

Jira description 어디에 있든 아래 2개가 추출 가능해야 한다.

- `repo: [repository name]`
- `remote: [git remote name]`

권장 예시는 아래와 같다.

```markdown
# [ACW] 제목

### 프로젝트
- repo: [repository name]
- remote: [git remote name]

### 문제점

### 개선 방향

### 작업 노트

#### 문제 확인
- TICKET.md/CONTEXT.md 작성 완료. repo=example, remote=origin

#### 계획
- PLAN.md 갱신 완료. 구현 task와 검증 계획 정리. blocker 없음
```

## 필드 해석 규칙

- `repo`
  - 대상 저장소 이름
  - 예: `remote-ceph-admin`, `remote-ceph-api`
  - 현재 프로젝트 루트 디렉터리명과 일치해야 한다
- `remote`
  - terminal git 후처리에서 사용할 git remote 이름
  - 현재 브랜치 upstream이 없을 때 fallback push 대상이 된다
- 실제 작업 브랜치
  - Jira에서 받지 않는다
  - 항상 `feature/<TICKET-ID>` 형식으로 intake 단계에서 준비한다
- `문제점`, `개선 방향`, `작업 노트`
  - 있으면 intake 산출물에 반영한다
  - 하지만 intake 게이트 필수 조건은 아니다

## Intake 실패 조건

아래 경우는 intake 불가 또는 blocked로 본다.

- 제목에 `[ACW]`가 없다
  - intake 대상 아님
- 제목에 `[ACW]`가 있지만 `repo`, `remote` 중 하나라도 없다
  - intake `blocked`
  - 종료 사유는 `missing_required_inputs`로 기록하고 누락 필드명을 요약에 포함한다
- 제목에 `[ACW]`가 있고 `repo`도 있지만 현재 프로젝트 루트 디렉터리명과 다르다
  - 무인자 `$auto-ceph`: intake 후보에서 제외
  - `$auto-ceph <TICKET-ID>`: intake `blocked`
  - 종료 사유는 `repo_mismatch`

## 문서 매핑

- Jira 원문 구조 보존: `doc/<티켓번호>/01_TICKET.md`
- 문제 해석과 범위 고정: `doc/<티켓번호>/02_CONTEXT.md`
- 구현 계획: `doc/<티켓번호>/03_PLAN.md`
- 실행 로그: `doc/<티켓번호>/04_EXECUTION.md`
- 검증 결과: `doc/<티켓번호>/05_UAT.md`
- 코드 리뷰 결과: `doc/<티켓번호>/06_REVIEW.md`
- 리뷰 요청 요약: `doc/<티켓번호>/07_SUMMARY.md`
