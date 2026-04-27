# E2E Scenario Template

Jira description에는 top-level `### E2E 테스트 시나리오` 섹션으로 기록한다.
섹션 위치는 `### 개선 방향` 다음, `### 작업 노트` 이전이다.

기본 구조는 아래 3개 subsection만 사용한다.

```md
#### 테스트 시나리오
1. `<url>`로 접속한다.
2. `<id>`와 `<pw>`를 입력해 로그인한다.
3. compact selected/related cases의 feature/step을 기준으로 상세 검증 절차를 작성한다.

##### `<feature_name>` - `<menu_path>`
- 이동 경로:
- 사전 조건:
- 실행 절차:
- 검증 포인트:
- 예외/validation 흐름:
- 성공 기준:

#### 기대 결과
- 사용자가 티켓 변경사항을 정상적으로 확인할 수 있다.

#### 확인 범위
- 포함:
- 제외:
```

규칙:

- `#### 테스트 시나리오`의 첫 단계는 항상 E2E config의 `url` 접속과 `id/pw` 로그인이다.
- 이후 단계는 Jira 티켓의 `문제점`, `개선 방향`, `07_SUMMARY.md`, compact selected/related cases를 조합해 작성한다.
- 메뉴 단위 한 줄 요약은 금지한다. 예: `목록, 검색, 엑셀, 생성, 수정, 삭제, 상세 화면을 확인한다`처럼 여러 기능을 한 문장에 합치면 안 된다.
- compact case의 `feature_name`, `menu_path`, `procedure`, `expected_result`를 feature/step 단위로 풀어 작성한다.
- 각 기능은 최소 `이동 경로`, `사전 조건`, `실행 절차`, `검증 포인트`, `예외/validation 흐름`, `성공 기준`을 포함해야 한다.
- 테스트 케이스의 `선택 흐름`과 `예외 흐름`은 가능하면 별도 검증 단계로 분리한다.
- 원문 절차와 예상결과를 그대로 복사하지 말고 E2E 실행자가 바로 따라할 수 있는 형태로 재구성한다.
- 필수 입력값, 버튼 클릭, 토스트 메시지, validation 문구, 목록 변화, 상세 화면 표시, 다운로드 발생 같은 검증 포인트는 누락하지 않는다.
