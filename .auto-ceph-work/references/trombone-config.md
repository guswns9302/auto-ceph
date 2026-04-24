# Trombone Config

`$auto-ceph-approval`은 이 파일을 사람이 직접 관리하는 canonical config source로 사용한다.

현재 프로젝트 루트와 같은 `repo` 값이 있어야 하며, 형식은 아래 key-value lines를 유지한다.

```md
repo: auto-ceph
pipeline_prefix: dev-sds-3.0.6-
login_url: http://prd.console.trombone.okestro.cloud/login
id: hj.yun
pw: wldhel11@#
```

규칙:

- `repo`는 현재 프로젝트 루트 디렉터리명과 같아야 한다.
- `pipeline_prefix`는 Trombone 검색 prefix다.
- `login_url`, `id`, `pw`는 helper가 그대로 사용한다.
- 값이 누락되거나 `repo`가 현재 프로젝트와 다르면 approval 스킬은 즉시 종료해야 한다.
