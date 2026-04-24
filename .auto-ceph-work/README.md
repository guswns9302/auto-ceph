# Auto-Ceph Work

이 디렉터리는 Auto-Ceph 업무용 내부 워크플로 자산을 담는다.

## 목적

- Jira 티켓 기반 업무를 단계형 오케스트레이션으로 운영한다.
- 각 단계는 전용 contract, agent, workflow 문서로 분리한다.
- Codex의 1차 runtime surface는 `.codex/skills/auto-ceph`, `.codex/agents`, `.codex/commands`, `.codex/hooks`다.
- `.auto-ceph-work/`는 workflows, scripts, templates, references 같은 internal assets를 제공한다.

## 구조

```text
.auto-ceph-work/
  README.md
  hooks/
  workflows/
  references/
  templates/
  scripts/
```

## 단계

1. 문제 확인
2. 문제 검토
3. 계획
4. 수행
5. 검증
6. 코드 리뷰
7. 리뷰 요청

## 런타임 원칙

- 메인 세션은 현재 단계만 판단하고 다음 stage agent를 직접 spawn한다.
- stage agent는 문서, 코드, Jira를 직접 갱신한다.
- 사용자 진입점은 `$auto-ceph` 스킬이며, `.codex/commands/aceph/*.md`는 stage contract/prompt source로 사용한다.
- canonical agent spec은 `.codex/agents/*.toml`에 둔다.
- `PreToolUse` hook은 canonical flow를 대체하지 않고 advisory safety layer로만 동작한다.
- `.auto-ceph-work/scripts/prepare_ticket_branch.sh`는 intake 대상 티켓의 canonical branch preparation helper다.
- `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`는 review-request 단계의 canonical non-MR git helper다.
- `.auto-ceph-work/scripts/return_to_dev_branch.sh`는 main orchestrator terminal cleanup helper다.

## Project Activation

- 실제 업무 프로젝트 루트에는 `.auto-ceph-work/` 디렉터리와 그 안의 `project.json`이 있어야 한다.
- hook은 `.auto-ceph-work/` 존재 여부와 `project.json`을 기준으로만 활성화된다.
- 이를 찾지 못하면 hook은 즉시 no-op 처리된다.
- 릴리즈 설치기는 이 내부 설정 파일과 hook 등록을 자동으로 설치한다.

예시:

```json
{
  "version": 1,
  "workflow": "auto-ceph-ticket-loop",
  "docs_root": ".auto-ceph-work/tickets",
  "ticket_root_pattern": ".auto-ceph-work/tickets/<TICKET-ID>"
}
```

## Hooks

- `.auto-ceph-work/hooks/aceph-prompt-guard.js`
  - ticket docs, canonical command/workflow/agent 문서에 들어가는 위험한 텍스트를 advisory로 경고
- `.auto-ceph-work/hooks/aceph-workflow-guard.js`
  - 현재 파일 상태 기준으로 stage 이탈 가능성이 높은 수정 시도를 advisory로 경고

상세 규칙은 `.auto-ceph-work/references/hooks.md`를 따른다.

## Jira Work Note Policy

- stage별 Jira 작업 노트는 comment가 아니라 issue description 본문의 `### 작업 노트` 섹션을 수정해서 남긴다.
- 작업 노트 summary는 산출물 경로만 적는 짧은 bullet이 아니라 stage 산출물의 고정 섹션 발췌를 포함한다.
- `리뷰 요청` 단계에서는 `.auto-ceph-work/scripts/create_or_reuse_merge_request.js` helper로 MR을 조회 또는 생성하고, `07_SUMMARY.md`의 `## Merge Request` 섹션을 single source of truth로 유지한다.
- 메인 세션은 commit/push를 수행하지 않고, `리뷰 요청` 단계가 `.auto-ceph-work/scripts/commit_and_push_ticket_branch.sh`와 MR helper를 통해 ticket branch commit/push와 MR open을 함께 소유한다.
- `리뷰 요청` 단계에서는 issue description top-level `### 루프 히스토리` 섹션을 `08_LOOP.md` 전문으로 동기화한다.
- stage 시작 기록과 stage 요약 기록은 같은 stage 블록 안에서 누적/교체한다.
- 다른 description 섹션(`프로젝트`, `문제점`, `개선 방향`)은 보존해야 한다.

## Jira Status Policy

- `문제 확인`, `문제 검토`, `계획`은 `IN PROGRESS`
- `수행`은 시작 시 `IN PROGRESS`, 완료 시 `RESOLVE`
- `검증`, `코드 리뷰`는 `RESOLVE`
- `리뷰 요청`은 `REVIEW`
- hook는 상태를 바꾸지 않고 advisory-only로 감시만 한다.

## Installation

- 이 저장소는 npm 패키지로 배포하고, 대상 프로젝트에서는 `npx @eddy_yun/auto-ceph-work install`로 설치한다.
- 설치 시 프로젝트 로컬 `.codex/config.toml`에는 `codex_hooks = true`만 병합하고, 실제 hook 정의는 `.codex/hooks.json`에 등록한다.
- hook command 경로는 설치된 프로젝트의 `.codex/hooks/*.js`를 가리킨다.
- 전역 `~/.codex/config.toml`은 수정하지 않는다.

예시:

```bash
npx @eddy_yun/auto-ceph-work install --project /path/to/your-project --version v0.1.0
```

설치와 업데이트는 npm 엔트리포인트만 사용한다.
