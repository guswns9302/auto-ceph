# E2E Case Selection Contract

이 문서는 E2E target case JSON을 runtime prompt에 전체 로딩하지 않기 위한 case selection 계약이다.

## Helper Interface

- Menu list: `.auto-ceph-work/scripts/select_e2e_cases.js menu-list <target-case-json>`
- Case select: `.auto-ceph-work/scripts/select_e2e_cases.js select <target-case-json> <menu1>`

## Output Contract

- `menu-list`는 `features[].steps[].menu_path[0]` 기준의 중복 제거 `menu1` 목록만 반환한다.
- `select`는 선택된 `menu1`에 해당하는 compact selected/related cases만 반환한다.
- compact output은 필요한 최소 필드만 포함한다: `menu1`, `features[].feature_name`, `features[].category`, `features[].steps[].menu_path`, `procedure`, `expected_result`.

## Failure Policy

- target case JSON 읽기 실패, malformed JSON, `features[]` 없음, menu 없음, 선택 결과 없음은 non-zero exit다.
- helper failure 또는 malformed output은 parent skill failure다.
- `$auto-ceph-approval`에서 관련 메뉴를 판단할 수 없으면 전체 JSON fallback 없이 `관련 케이스 없음`을 사용한다.
- parent skill과 E2E agent는 원본 `.auto-ceph-work/references/test-case/v306.json` 전체를 context에 넣으면 안 된다.
