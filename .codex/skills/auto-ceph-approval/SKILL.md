---
name: auto-ceph-approval
description: Auto-Ceph 리뷰 요청이 끝난 RESOLVE 티켓들을 배치 승인해 GitLab MR을 approve 및 dev 머지하고 Trombone dev 파이프라인 완료 후 E2E 테스트와 DONE 전이까지 처리하는 사용자용 스킬. RESOLVE 티켓 목록을 보여주고 제외할 티켓을 입력받아 남은 티켓만 순차 처리해야 할 때 사용한다.
---

# Auto Ceph Approval

이 스킬은 `$auto-ceph-approval` 하나로 Auto-Ceph `RESOLVE` 티켓들의 후속 승인, 배포, E2E 검증, DONE 전이를 처리하는 사용자용 단일 진입점이다.

## Invocation

- `$auto-ceph-approval`
  - 현재 사용자에게 할당된 `[ACW]` + repo 일치 Jira `RESOLVE` 티켓을 `created ASC` 스냅샷으로 보여준다.
  - 제외할 티켓 ID를 한 번만 입력받고, 제외되지 않은 티켓만 처리한다.
  - 대상 티켓을 `REVIEW`로 전이한 뒤 MR approve/dev merge, Trombone 완료, E2E, `DONE` 전이, 실패 후속 티켓 생성을 수행한다.

## Required Sources

항상 아래 파일을 먼저 읽는다.

1. `.codex/skills/auto-ceph/SKILL.md`
2. `.auto-ceph-work/references/runtime-contract.md`
3. `.auto-ceph-work/references/jira-sync.md`
4. `.auto-ceph-work/references/trombone-config.md`
5. `.auto-ceph-work/references/trombone-deployment-contract.md`
6. `.auto-ceph-work/references/mr-approval-contract.md`
7. `.auto-ceph-work/references/e2e-test-config.md`
8. `.auto-ceph-work/references/e2e-scenario-template.md`
9. `.auto-ceph-work/references/e2e-case-selection-contract.md`
10. `.auto-ceph-work/references/e2e-execution-contract.md`
11. `.auto-ceph-work/references/jira-create-template.md`
12. `.codex/agents/aceph-approval-e2e.toml`

## Runtime Rules

1. 무인자 실행만 지원한다. 티켓 ID 인자는 받지 않는다.
2. 시작 즉시 Trombone config와 E2E config를 검증한다. `타겟 케이스` 파일은 repo root 기준 상대 경로로 해석하고, `.auto-ceph-work/scripts/select_e2e_cases.js`로 파싱 가능해야 하며 case selection 세부 계약은 `.auto-ceph-work/references/e2e-case-selection-contract.md`를 따른다.
3. Atlassian MCP로 내 할당 Jira `RESOLVE` 티켓을 조회한다. `statusCategory = "In Progress"` 같은 넓은 조건으로 대체하지 않는다.
4. 제목에 `[ACW]`가 있고 Jira `repo`가 현재 프로젝트 루트 디렉터리명과 같은 티켓만 approval 대상으로 본다.
5. 스냅샷 목록을 보여준 뒤 제외할 티켓 ID를 한 번만 입력받는다. 빈 입력이면 전체 진행이다.
6. 제외 후 남은 티켓이 없으면 보고하고 종료한다.
7. 대상 티켓을 `RESOLVE -> REVIEW`로 전이한다. 전이 실패 또는 상태 확인 실패는 티켓별 1회 재시도하고, 재시도까지 실패한 티켓은 `transition_failed_excluded`로 제외한다.
8. REVIEW 전이 성공 티켓이 없으면 MR, Trombone, E2E 없이 종료한다.
9. 각 대상 티켓의 `.auto-ceph-work/tickets/<TICKET-ID>/07_SUMMARY.md`에서 `## Merge Request` 섹션의 `URL`, `source`, `target`을 검증한다.
10. MR approve 전에 Jira description의 `### E2E 테스트 시나리오` 섹션을 생성 또는 교체한다. 위치는 `### 개선 방향` 다음, `### 작업 노트` 이전이다.
11. E2E 시나리오는 `e2e-scenario-template.md`를 따르고, 첫 단계는 E2E config의 `url` 접속과 `id/pw` 로그인이다.
12. 이후 단계는 티켓 내용과 `07_SUMMARY.md` 기준으로 관련 메뉴/기능을 판단해 `.auto-ceph-work/scripts/select_e2e_cases.js select <target-case-json> <menu1>`의 compact related cases만 사용한다. 판단 불가 시 전체 `v306.json`을 읽지 말고 `관련 케이스 없음`으로 최소 작성한다.
13. MR 작업은 `.auto-ceph-work/scripts/approve_and_merge_review_mr.js <TICKET-ID> feature/<TICKET-ID> dev`만 사용하고 세부 성공/실패 계약은 `.auto-ceph-work/references/mr-approval-contract.md`를 따른다.
14. MR helper 성공 직후 해당 티켓에 `MR approve / merge success` 댓글을 남긴다. 실패하면 즉시 전체 실행을 중단한다.
15. 모든 대상 티켓의 MR batch가 성공한 뒤 `.auto-ceph-work/scripts/run_trombone_pipeline.sh <REPO> <CONFIG-FILE>`를 한 번만 호출한다.
16. Trombone helper 성공/실패 stdout, 배포 실패 댓글, runtime failure 분류는 `.auto-ceph-work/references/trombone-deployment-contract.md`를 따른다.
17. Trombone 완료 후 E2E 실행, 결과 검증, Jira 결과 기록, `DONE` 전이는 `.auto-ceph-work/references/e2e-execution-contract.md`를 따른다.
18. E2E 실패 티켓마다 `[ACW] <원본 티켓> E2E 실패 후속 조치` 제목의 후속 Jira `Task`를 사용자 입력 없이 생성한다. 후속 티켓 생성 규칙, repo 판정, active sprint 배정, `TO DO` 전이는 `.auto-ceph-work/references/jira-create-template.md`를 따른다.
19. 모든 E2E 실행, 원본 티켓 `DONE` 전이, 실패 후속 티켓 생성이 끝난 뒤 `티켓`, `E2E 결과`, `DONE 전이`, `실패 원인`, `후속 티켓` 컬럼의 Markdown 표를 출력한다.
20. 모든 E2E 및 DONE 전이가 끝난 후 처리된 모든 티켓에 `Trombone 파이프라인 실행 완료 (<pipeline>)` 댓글을 남긴다.
21. `$auto-ceph-approval` 실행 중에는 helper, config, skill, test-case 파일을 즉석 수정하지 않는다.

## User-Facing Contract

- 사용자는 `$auto-ceph-approval`만 호출한다.
- RESOLVE 스냅샷과 제외 입력은 한 번만 수행한다.
- REVIEW 전이 실패 티켓은 1회 재시도 후 제외하고 나머지는 계속 진행한다.
- MR batch 성공 후 Trombone은 한 번만 실행한다.
- Trombone 실패 시 E2E와 `DONE` 전이는 수행하지 않는다.
- E2E는 티켓별 순차 실행이며, 개별 E2E 실패가 있어도 남은 티켓은 계속 실행한다.
- E2E 성공/실패 원본 티켓은 결과 기록 후 `DONE`으로 전이한다.
- E2E 실패 티켓은 후속 `[ACW]` Jira `Task`를 생성한다.
- 종료 시 사용자 제외 티켓, REVIEW 전이 실패 제외 티켓, MR 처리 티켓, E2E 처리 티켓, DONE 전이 티켓, 후속 생성 티켓, 중단 티켓, Trombone 실행 여부를 짧게 보고한다.
