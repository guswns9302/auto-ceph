# E2E Execution Contract

이 문서는 `$auto-ceph-approval`과 `$auto-ceph-e2e`가 공통으로 따르는 E2E 실행 계약이다.

## Agent Spawn And Wait

- E2E 실행은 `.codex/agents/aceph-approval-e2e.toml` custom agent로 수행한다.
- agent spawn 직후 반환된 agent id를 대상 ticket id와 함께 기록한다.
- `wait_agent` timeout 또는 빈 status는 실패가 아니라 polling 결과다.
- 완료, 실패, blocked 같은 terminal subagent status가 나올 때까지 같은 agent id를 계속 기다린다.
- pending/running E2E agent가 있으면 parent skill은 `final_answer`로 종료하면 안 된다.
- terminal result 전에는 Jira `### E2E 테스트 시나리오` 결과 annotation, `### E2E 테스트 결과`, E2E 댓글, `DONE` 전이, 후속 티켓 생성을 수행하면 안 된다.

## Browser Execution

- 모든 E2E 브라우저 실행은 `$playwright` skill의 canonical wrapper인 `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh`만 사용한다.
- `npx playwright`, `@playwright/test`, 임의 Playwright Node script 직접 실행은 금지한다.
- 기본 실행은 headless로 간주한다. 사용자가 별도로 디버깅을 명시 요청하지 않으면 `--headed`, `show`, `pause-at` 같은 visible/debug browser 동작을 사용하면 안 된다.
- 사람이 볼 수 있는 브라우저 창이 뜨면 Auto-Ceph E2E 실행 방식 위반으로 보고해야 한다.

## Agent Input

- E2E flow는 항상 E2E config의 `url` 접속, `id/pw` 로그인으로 시작한다.
- agent 입력에는 E2E 시나리오, `.auto-ceph-work/references/e2e-test-config.md`, Playwright wrapper 경로, helper가 반환한 compact selected/related cases를 포함한다.
- Jira description의 `### E2E 테스트 시나리오`는 최초 작성된 실행 기준선이다.
- agent는 제공된 E2E 시나리오를 실행만 하며, 시나리오 본문 변경이나 Jira 시나리오 직접 수정을 요청하지 않는다.
- 원본 `.auto-ceph-work/references/test-case/v306.json` 전체를 agent context에 넣지 않는다.
- `$auto-ceph-approval`에서 관련 메뉴/기능을 판단할 수 없으면 compact cases 대신 `관련 케이스 없음`을 전달한다.

## Result Contract

- terminal result는 machine-readable 형태여야 한다.
- 공통 필드: `status=passed|failed`, `ticket_id`, `summary`, `failure_reason`, `failed_step`, `expected`, `actual`, `evidence`.
- 공통 필드에 `step_results[]`를 포함해야 한다.
- `step_results[]` 항목은 `step_no`, `expected`, `status=passed|failed`, `failure_reason`, `evidence`를 포함한다.
- `step_no`는 Jira `### E2E 테스트 시나리오`의 numbered step과 매칭되어야 한다.
- `$auto-ceph-e2e`는 추가로 `menu1`, `results[]`를 포함한다.
- `results[]` 항목은 `feature_name`, `menu_path`, `status=passed|failed`, `failed_step`, `expected`, `actual`, `evidence`, `failure_reason`, `step_results[]`를 포함한다.
- result가 malformed이거나 `ticket_id`가 기대값과 다르면 E2E 실패가 아니라 orchestration/system failure로 보고 전체 실행을 중단한다.
- `step_results[]`가 없거나 시나리오의 numbered step과 매칭되지 않으면 orchestration/system failure로 보고 전체 실행을 중단한다.
- passed result의 failure 필드는 `none`으로 채운다.

## Parent Responsibilities

- parent skill만 Jira description, Jira comment, `DONE` 전이, 후속 티켓 생성을 수행한다.
- agent는 Jira를 직접 수정하지 않는다.
- E2E terminal result 이후 parent skill은 최신 Jira description을 읽고 `step_results[]` 기준으로 `### E2E 테스트 시나리오`의 각 numbered step 아래에 결과 annotation만 추가 또는 갱신한다.
- 결과 annotation 형식은 `  - 기대결과: ...`, `  - 결과: 성공|실패`, `  - 실패 사유: ...`로 고정한다.
- 성공 step에는 `실패 사유`를 쓰지 않고, 실패 step에는 반드시 `실패 사유`를 쓴다.
- `### E2E 테스트 시나리오`의 기존 step 문장, 순서, 번호, 기능 설명은 결과 기록, 종료 시간 기록, `DONE` 전이, 후속 티켓 생성 과정에서 재작성하지 않는다.
- E2E terminal result 이후 parent skill은 Jira description의 `### E2E 테스트 결과`를 통계 요약 전용 섹션으로 생성 또는 교체한다.
- `### E2E 테스트 결과`의 최소 필드는 `전체 결과`, `성공`, `실패`, `실패 케이스`다.
- E2E 성공/실패 결과 기록 후 `DONE` 전이를 수행한다. 단, Trombone 실패로 E2E를 시작하지 않은 approval ticket은 `DONE`으로 전이하지 않는다.
- E2E 실패도 결과 기록과 실패 댓글 후 `DONE`으로 전이하며, 후속 `[ACW]` 티켓 생성을 트리거한다.

## Mode Rules

- `$auto-ceph-approval`: 대상 ticket별로 `spawn -> terminal result wait -> result validation -> Jira 결과 처리 -> 다음 ticket spawn` 순서로 순차 실행한다. 개별 E2E 실패가 있어도 남은 ticket E2E는 계속 실행한다.
- `$auto-ceph-e2e`: 생성된 `[ACW E2E]` 실행 ticket 하나에 대해 menu-scoped E2E agent를 한 번 spawn하고 terminal result까지 기다린다.
