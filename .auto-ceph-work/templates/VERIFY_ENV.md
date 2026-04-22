# Verification Environment

## 메타 정보

- 단계: 공용 검증 설정
- 상태: Waiting
- Jira 상태: N/A

## API 검증 설정

- base_url:
- X-Provider-Id:
- X-User-Id:

## 사용 규칙

- `base_url`은 protocol과 host를 포함한다. 예: `https://ceph-admin.example.com`
- 실제 검증 요청 스펙은 티켓의 `03_PLAN.md`에 기록된 `검증용 API 호출 스펙`을 사용한다.
- 수행 단계에서 실제 요청값이 달라졌다면 `04_EXECUTION.md`의 `검증용 API 호출 실행값`으로 보정한다.
- 검증 단계는 `{base_url}`와 요청 스펙을 합쳐 실제 요청을 보내고 응답 결과를 `05_UAT.md`에 기록한다.
