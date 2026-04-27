# Trombone Deployment Contract

`$auto-ceph-approval`의 Trombone 배포 단계는 helper 구현 원문이 아니라 이 계약을 따른다.

## Helper Interface

- Config source: `.auto-ceph-work/references/trombone-config.md`
- Helper: `.auto-ceph-work/scripts/run_trombone_pipeline.sh <REPO> <CONFIG-FILE>`
- Browser execution: `$playwright` skill canonical wrapper `$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh`
- Success stdout must include:
  - `status=completed`
  - `pipeline=<pipeline_prefix><repo>`

## Browser Policy

- Trombone helper must use the `$playwright` skill canonical wrapper only.
- Do not use `npx playwright`, `@playwright/test`, or ad-hoc Playwright Node scripts.
- Headless is the default. Do not pass `--headed`, `show`, `pause-at`, or visible/debug browser mode.

## Failure Policy

- Helper non-zero exit, malformed stdout, timeout, or runtime failure is an approval failure.
- Helper/runtime failure must not be labeled as a real Trombone deployment failure unless stderr identifies a deployment failure condition.
- `trombone deployment failed` style failures mean the deployed pipeline failed. In that case, add `Trombone 배포 실패 (<pipeline>)` to every MR-success ticket and do not run E2E or `DONE` transitions.
- Success comments are written only after all E2E and `DONE` transitions finish: `Trombone 파이프라인 실행 완료 (<pipeline>)`.
