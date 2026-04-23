# [TICKET-ID] Loop History

## 메타 정보

- 단계: 루프 관리
- 상태: Waiting
- Jira 상태: N/A

## 현재 루프 상태

- 현재 iteration: 0
- 최대 iteration: 10
- 현재 loop 상태: idle
- 현재 stage:
- 마지막 결과 상태:
- 마지막 loop 결정:
- 마지막 fallback 단계:
- 마지막 종료 사유:

`retry_pending`은 terminal 상태가 아니라 같은 실행 안에서 다음 fallback stage를 다시 dispatch하기 전후의 중간 상태다.
`needs_retry`는 terminal 상태가 아니며, `retry_reason=verification_unblock`이면 현재 티켓 검증을 직접 막는 최소 unblock inner loop를 자동으로 소비해야 한다.

## Iteration History
