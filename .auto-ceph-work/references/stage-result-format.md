# Stage Result Format

모든 stage agent는 응답 마지막에 아래 형식을 반드시 남긴다.

```text
<stage_result>
stage: 문제 확인
ticket_id: CDS-1234
status: passed
agent_binding: aceph-ticket-intake
artifacts_updated: doc/CDS-1234/01_TICKET.md, doc/CDS-1234/02_CONTEXT.md
jira_stage_note_started: yes
jira_stage_summary_written: yes
jira_status_transition_applied: IN PROGRESS
jira_updates_applied: status=IN PROGRESS, description_work_note_start=문제 확인, description_work_note_summary=01_TICKET.md/02_CONTEXT.md 작성 완료
next_stage: 문제 검토
fallback_stage: 문제 확인
iteration: 1
loop_decision: advance
detected_stage_after_run: 문제 검토
terminal_reason: none
summary: one-line summary
</stage_result>
```

허용 status:

- `passed`
- `blocked`
- `failed`
- `needs_retry`

`agent_binding`은 실제로 실행된 custom agent name과 일치해야 한다.
오케스트레이터가 inline으로 수행한 경우는 유효한 결과로 취급하지 않는다.
`jira_stage_note_started`는 description 본문의 `작업 노트` 섹션에 해당 stage header가 반영됐다는 뜻이어야 한다.
`jira_stage_summary_written`는 description 본문의 같은 stage 블록에 요약 bullet이 반영됐다는 뜻이어야 한다.
`jira_stage_note_started`와 `jira_stage_summary_written`가 모두 `yes`가 아니면 stage 완료 결과로 취급하지 않는다.
상태 전이가 필요한 stage인데 `jira_status_transition_applied`가 비어 있거나 기대한 값과 다르면 stage 완료 결과로 취급하지 않는다.
검증 단계에서 API 티켓이면 `summary`에 실제 호출 URL과 HTTP status가 요약되어야 한다.
`iteration`은 현재 stage 실행 번호가 아니라 현재 loop attempt 번호다.
같은 loop 안의 stage 진행은 같은 `iteration` 값을 공유해야 한다.
`iteration`, `loop_decision`, `detected_stage_after_run`, `terminal_reason`은 Ralph loop 제어에 필수다.
인테이크 단계에서 제목에 `[ACW]`가 없으면 `terminal_reason: missing_title_prefix`를 사용한다.
인테이크 단계에서 intake target이 `[ACW]` + repo 일치로 확정되면, `remote`나 `endpoint`가 누락되어도 먼저 ticket branch를 준비한 뒤 `terminal_reason: missing_required_inputs`를 사용한다.
인테이크 단계에서 `repo`는 있지만 현재 프로젝트 루트 디렉터리명과 다르면 `terminal_reason: repo_mismatch`를 사용한다.
인테이크 단계에서 branch preparation helper가 현재 티켓 브랜치를 준비하지 못하면 `terminal_reason: ticket_branch_not_prepared`를 사용한다.
검증 단계에서 `doc/VERIFY_ENV.md`가 없으면 `terminal_reason: missing_verify_env_file`를 사용한다.
검증 단계에서 `base_url`, `X-Provider-Id`, `X-User-Id` 중 하나라도 없으면 `terminal_reason: missing_verify_env_values`를 사용한다.
`missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `missing_verify_env_file`, `missing_verify_env_values`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`는 비재시도 종료 사유다.
intake 단계에서 `dev` checkout, 최신화, `feature/<TICKET-ID>` 생성 또는 checkout이 실패하면 `ticket_branch_not_prepared`를 terminal reason으로 사용한다.
비재시도 종료 사유에서는 `loop_decision: stop`을 사용하고 오케스트레이터는 자동 재진입하지 않는다.
