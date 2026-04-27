# MR Approval Contract

이 문서는 `$auto-ceph-approval`의 GitLab MR approve/dev merge 단계 계약이다.

## Helper Interface

- Helper: `.auto-ceph-work/scripts/approve_and_merge_review_mr.js <TICKET-ID> <SOURCE> <TARGET>`
- Approval default source: `feature/<TICKET-ID>`
- Approval default target: `dev`
- GitLab 작업은 `glab` CLI만 사용한다.

## Required Behavior

- `source -> target` 열린 MR을 조회한다.
- 열린 MR이 없으면 실패한다.
- MR approve를 수행한다.
- merge 가능 상태가 될 때까지 대기하며 dev merge를 수행한다.
- merge 후 MR `state=merged`와 `target=dev`를 확인한다.

## Success Output

성공 stdout은 최소 아래 필드를 포함한다.

- `status=merged`
- `title=...`
- `url=...`
- `source=feature/<TICKET-ID>`
- `target=dev`

## Failure Policy

- `glab` 인증 실패, MR 조회 실패, approve 실패, merge timeout, merge 실패, merged/dev 확인 실패는 모두 non-zero exit다.
- 실패 시 성공형 stdout을 출력하면 안 된다.
- helper failure 또는 malformed output은 `$auto-ceph-approval` 전체 실행 중단 사유다.
