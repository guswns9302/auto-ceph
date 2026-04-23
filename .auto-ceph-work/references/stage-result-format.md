# Stage Result Format

모든 stage agent는 응답 마지막에 아래 형식을 반드시 남긴다.

```text
<stage_result>
stage: 문제 확인
ticket_id: CDS-1234
status: passed
retry_reason: none
agent_binding: aceph-ticket-intake
artifacts_updated: .auto-ceph-work/tickets/CDS-1234/01_TICKET.md, .auto-ceph-work/tickets/CDS-1234/02_CONTEXT.md
jira_stage_note_started: yes
jira_stage_summary_written: yes
jira_status_transition_applied: IN PROGRESS
jira_updates_applied: status=IN PROGRESS, description_work_note_start=문제 확인, description_work_note_summary=01_TICKET.md 핵심 발췌 반영
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

`retry_reason`은 retryable failure의 성격을 메인 세션 orchestration에 전달하는 필드다.
기본값은 `none`이고, `needs_retry`에서는 반드시 구체값을 사용한다.
허용 예시는 `verification_unblock`, `quality_retry`, `environment_retry`, `none`이다.
`agent_binding`은 메인 세션이 직접 spawn한 실제 stage custom agent name과 일치해야 한다.
메인 세션이 inline으로 수행한 경우는 유효한 결과로 취급하지 않는다.
`jira_stage_note_started`는 description 본문의 `작업 노트` 섹션에 해당 stage header가 반영됐다는 뜻이어야 한다.
`jira_stage_summary_written`는 description 본문의 같은 stage 블록에 요약 bullet이 반영됐다는 뜻이어야 한다.
`jira_stage_note_started`와 `jira_stage_summary_written`가 모두 `yes`가 아니면 stage 완료 결과로 취급하지 않는다.
`jira_status_transition_applied` 허용 값은 `IN PROGRESS`, `RESOLVE`, `REVIEW`, `unchanged`, `none`이다.
상태 보장이 필요한 stage인데 `jira_status_transition_applied`가 비어 있거나 기대한 값과 다르면 stage 완료 결과로 취급하지 않는다.
`jira_updates_applied`에는 작업 노트 발췌 반영 내용을 명시해야 하며, `리뷰 요청` 단계에서는 `description_merge_request=07_SUMMARY.md excerpt synced, description_loop_history=08_LOOP.md synced`를 추가해야 한다.
검증 단계에서 API 티켓이면 `summary`에 핵심 테스트 결과와 최종 판단이 요약되어야 한다.
코드 리뷰 단계면 `summary`에 핵심 finding 유무와 `approved` 또는 `changes_requested` 판정이 요약되어야 한다.
리뷰 요청 단계면 `summary`에 MR 생성 또는 재사용 결과와 핵심 URL이 요약되어야 한다.
`iteration`은 현재 stage 실행 번호가 아니라 현재 loop attempt 번호다.
같은 loop 안의 stage 진행은 같은 `iteration` 값을 공유해야 한다.
`iteration`, `loop_decision`, `detected_stage_after_run`, `terminal_reason`, `retry_reason`은 Ralph loop 제어에 필수다.
`needs_retry`이면서 `retry_reason: verification_unblock`이면 현재 티켓 검증을 직접 막는 최소 컴파일/테스트 unblock 수정만 허용한다.
`needs_retry`이면서 `retry_reason: verification_unblock`인 경우, `summary`에는 실제로 검증을 막은 파일/심볼 또는 오류 묶음을 요약해야 한다.
인테이크 단계에서 제목에 `[ACW]`가 없으면 `terminal_reason: missing_title_prefix`를 사용한다.
인테이크 단계에서 intake target이 `[ACW]` + repo 일치로 확정되면, `repo`나 `remote`가 누락되어도 먼저 ticket branch를 준비한 뒤 `terminal_reason: missing_required_inputs`를 사용한다.
인테이크 단계에서 `repo`는 있지만 현재 프로젝트 루트 디렉터리명과 다르면 `terminal_reason: repo_mismatch`를 사용한다.
인테이크 단계에서 branch preparation helper가 현재 티켓 브랜치를 준비하지 못하면 `terminal_reason: ticket_branch_not_prepared`를 사용한다.
`missing_title_prefix`, `missing_required_inputs`, `repo_mismatch`, `ticket_branch_not_prepared`, `post_ticket_branch_mismatch`는 비재시도 종료 사유다.
intake 단계에서 `dev` checkout, 최신화, `feature/<TICKET-ID>` 생성 또는 checkout이 실패하면 `ticket_branch_not_prepared`를 terminal reason으로 사용한다.
비재시도 종료 사유에서는 `loop_decision: stop`을 사용하고 메인 세션 orchestration은 자동 재진입하지 않는다.
