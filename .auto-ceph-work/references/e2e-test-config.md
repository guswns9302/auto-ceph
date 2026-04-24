# E2E Test Config

`$auto-ceph-approval`은 이 파일을 사람이 직접 관리하는 E2E 시나리오 작성 및 실행용 canonical config source로 사용한다.

형식은 아래 key-value lines를 유지한다.

```md
url: https://example.test/login
id: test-user
pw: test-password
타겟 케이스: .auto-ceph-work/references/test-case/v306.json
```

규칙:

- `url`은 E2E 테스트의 최초 접속 로그인 URL이다.
- `id`, `pw`는 E2E 로그인에 사용하는 테스트 계정이다.
- `타겟 케이스`는 repo root 기준 상대 경로로 해석한다.
- `타겟 케이스` 기본값은 `.auto-ceph-work/references/test-case/v306.json`이다.
- 값이 누락되거나 `타겟 케이스` JSON 파일이 없거나 파싱할 수 없으면 approval 스킬은 즉시 종료해야 한다.
