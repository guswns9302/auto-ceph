# Hook Reference

## 목적

Auto-Ceph hook은 전체 런타임을 대체하는 것이 아니라, 티켓 루프 품질을 보조하는 advisory layer다.

## Activation

- 프로젝트 루트에는 `.auto-ceph-work/` 디렉터리와 `.auto-ceph-work/project.json`이 있어야 한다.
- hook은 현재 `cwd`에서 상위 디렉터리로 올라가며 `.auto-ceph-work/`를 찾는다.
- 이를 찾지 못하거나 `project.json`이 유효하지 않으면 no-op 처리한다.

기본 project 설정 예시:

```json
{
  "version": 1,
  "workflow": "auto-ceph-ticket-loop",
  "docs_root": ".auto-ceph-work/tickets",
  "ticket_root_pattern": ".auto-ceph-work/tickets/<TICKET-ID>"
}
```

## Installed Hooks

### `aceph-prompt-guard.js`

- 이벤트: `PreToolUse`
- 목적: ticket docs, canonical command/workflow/agent 문서에 들어가는 텍스트에서 prompt-risk 패턴을 advisory로 경고
- 차단하지 않음

### `aceph-workflow-guard.js`

- 이벤트: `PreToolUse`
- 목적: 현재 파일 상태 기준으로 stage 이탈 가능성이 높은 수정 시도를 advisory로 경고
- `detect_ticket_stage.sh`를 이용해 추천 단계를 함께 알려줌
- 차단하지 않음

## Codex Registration

기본 경로에서는 `npx @eddy_yun/auto-ceph-work install --project <path>`가 프로젝트 로컬 `.codex/config.toml`을 자동으로 패치한다.

설치기는 아래를 보장한다.

- `[features] codex_hooks = true`
- `auto-ceph-work managed config` 관리 블록 생성
- hook command가 대상 프로젝트의 `.codex/hooks/*.js` 절대경로를 가리키도록 설정

재설치 또는 업데이트 시 관리 블록은 중복 생성되지 않고 교체된다. 제거 시에는 설치기가 추가한 관리 블록만 삭제한다.
전역 `~/.codex/config.toml`은 수정하지 않는다.

## Notes

- `PreToolUse` hook은 Auto-Ceph에서 advisory guard로만 사용한다.
