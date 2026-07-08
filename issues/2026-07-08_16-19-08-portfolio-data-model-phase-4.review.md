## REVIEW-01
- Source doc: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md
- Review agent: main-session-fallback
- Review independence: weak
- Scope checked: Phase 4 portfolio data model extension: D1 migration, shared contracts, Worker validation and CRUD/public list mapping, admin portfolio editor, homepage featured/metadata display, animal-island-ui usage beyond login, validation and out-of-scope boundaries.
- Evidence checked: commits 486c2a2, 0de4da0, ee5d0f6, 4971000, 658b059, 4397085, 2e338d9, 6c2e1f7, 19af37d; task CSV notes; claim ledger; npm run test:admin; npm run lint; npm run build; worker npm run typecheck; SQLite migration command; browser notes for localhost:3000.
- Claim coverage: complete
- Claim/evidence alignment: limited
- Limited validation honestly reported: yes
- Result: limited_review
- Gaps: none actionable found by main-session fallback review. Strong independent review was not performed because the safer codex exec path was rejected by approval review as an external data transfer risk without explicit user authorization.
- Follow-up issues added: REVIEW-02
- Assumptions: Out-of-scope claim CLAIM-034 is treated as accounted for by static boundary searches and absence of matching app/worker/shared code paths. Rendered public-card metadata remains evidence-limited until local /sites data/API is available.
- Decision debt: ui-ux-pro-max and screenpipe were not installed/exposed in this session; CSV notes record the limitation per affected frontend rows.
- Human-required blockers: Explicit user approval is needed before sending private workspace code/docs to an external independent codex exec reviewer, or an equivalent local independent reviewer capability must become available.

## REVIEW-02
- Source doc: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md
- Review agent: direct-spawn-agent
- Review independence: strong
- Scope checked: Phase 4 portfolio data model extension across approved spec, CSV state, claim ledger, previous review/handoff, commit range b1574f7..bd352b7, Worker validation/storage/public list paths, homepage card behavior, and recorded verification evidence.
- Evidence checked: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.csv; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.claims.json; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.handoff.md; app/_components/live-project-card.tsx; worker/src/site-validation.ts; worker/src/routes/sites.ts; worker/src/db.ts; tests/admin-production-path.test.mjs.
- Claim coverage: gaps
- Claim/evidence alignment: mismatches found
- Limited validation honestly reported: yes
- Result: gaps_found
- Gaps:
  - CLAIM-028 mismatch: spec expects fallbackUrl to be preferred by the access button in loading/offline/error contexts, but LiveProjectCard opens site.url.
  - CLAIM-017/CLAIM-030 mismatch: Worker validation checks tags/techStack are arrays but does not reject non-string array items before normalization.
  - Real E2E claims for admin UI, homepage metadata/source button, animal-island-ui visibility, and mobile layout are marked stronger than the available rendered evidence.
  - Claim ledger summary and CSV/review notes disagree on claim coverage status.
- Follow-up issues added: FOLLOWUP-01, FOLLOWUP-02, FOLLOWUP-03, FOLLOWUP-04, REVIEW-03
- Assumptions: Existing recorded npm/build/typecheck evidence is treated as recorded evidence, not freshly reproduced by the read-only reviewer.
- Decision debt: Browser-visible public card/admin interaction evidence still depends on configured local data/API and admin credentials.
- Human-required blockers: none for the implementation gaps; rendered E2E evidence remains environment-limited until local public sites and admin access are available.

## FOLLOWUP-04 State Reconciliation
- Current review result: gaps_found
- Current claim coverage: 27/34 covered, 6 limited, status gaps
- Closed follow-ups: FOLLOWUP-01 fixed fallbackUrl access target; FOLLOWUP-02 rejects non-string tags/techStack items; FOLLOWUP-03 downgraded unavailable real E2E claims to limited.
- Remaining review gate: REVIEW-03 must rerun the strongest available independent review before Phase 4 can be marked vision_met or fully closed.
- Artifacts aligned: claim ledger summary, CSV REVIEW-02/FOLLOWUP rows, this review log, and handoff now use the same current result/status language.

## REVIEW-03
- Source doc: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md
- Review agent: direct-spawn-agent
- Review independence: strong
- Scope checked: REVIEW-02 follow-up fixes, claim ledger, CSV state, review log, handoff, committed diff range b1574f7..778d870, latest recorded verification evidence, secret/out-of-scope boundaries.
- Evidence checked: app/_components/live-project-card.tsx; worker/src/site-validation.ts; tests/admin-production-path.test.mjs; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.claims.json; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.csv; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.handoff.md; latest npm run test:admin/lint/build and worker typecheck outputs recorded by main session.
- Claim coverage: gaps
- Claim/evidence alignment: limited
- Limited validation honestly reported: yes
- Result: limited_review
- Gaps: none actionable in committed code found by REVIEW-03. Six rendered real E2E claims remain limited because localhost /sites failed and no authenticated admin session/credentials were available.
- Follow-up issues added: BLOCKER-01
- Assumptions: Latest verification command outputs from the main session are accepted as recorded evidence; reviewer did not rerun commands.
- Decision debt: Phase 4 cannot be marked vision_met until public sites data/API and admin session make rendered E2E evidence collectible, or the project explicitly accepts limited closure.
- Human-required blockers: Provide a working public /sites data path with at least one visible portfolio site and an admin session/credentials for browser interaction checks.

## BLOCKER-01 Retry
- Local D1 migration 0002_portfolio_fields.sql was applied with `wrangler d1 migrations apply --local`.
- Configured local Worker `/sites` recovered from 500 (`no such column: summary`) to 200 with 3 visible sites.
- Desktop browser evidence after hydration: 3 public cards, 3 iframes, 3 visit buttons, no horizontal overflow.
- Mobile 390x844 evidence: 3 real cards, 3 iframes, 3 visit buttons, no page-level horizontal overflow; scaled iframe nodes remain clipped by preview containers.
- Claim update: CLAIM-029 is now covered. Current claim coverage is 28/34 covered, 5 limited.
- Remaining blocker: local public data still lacks tags/techStack/repoUrl/isFeatured/fallbackUrl, and `/auth/me` is not authenticated, so homepage metadata/source/admin real E2E claims remain limited.

## BLOCKER-01 Closure
- Local validation data was created through the real Worker auth/CRUD path with UTF-8 summary, tags, techStack, featured, repoUrl, and fallbackUrl values.
- Homepage desktop evidence: 4 public cards rendered; the Phase 4 validation card showed summary, tags, techStack, 查看源码, 访问网站, and iframe with no horizontal overflow.
- Homepage mobile evidence: the same validation metadata/source controls rendered at mobile width with no page-level horizontal overflow.
- Admin evidence: browser login succeeded, the Phase 4 edit form opened in the single editor panel, 作品信息 fields/chips/source/fallback/featured controls were populated, UI added 浏览器验收 and E2E UI, and 更新站点 saved successfully.
- Claim update: CLAIM-019, CLAIM-022, CLAIM-023, CLAIM-024, and CLAIM-027 are now covered. CLAIM-034 remains out_of_scope by design. Current accounting is 33/34 covered plus 1/34 out_of_scope, 34/34 accounted, 0 limited.
- Remaining gate: REVIEW-04 final independent review must confirm vision_met before the Phase 4 CSV is fully closed.

## REVIEW-04
- Source doc: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md
- Review agent: direct-spawn-agent
- Review independence: strong
- Scope checked: committed Phase 4 artifacts through 2101f85, BLOCKER-01 real E2E evidence, claim ledger accounting, Worker validation, homepage/admin behavior, secret and out-of-scope boundaries.
- Evidence checked: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.csv; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.claims.json; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.handoff.md; worker/src/site-validation.ts; app/_components/live-project-card.tsx; tests/admin-production-path.test.mjs; committed verification and browser evidence.
- Claim coverage: gaps
- Claim/evidence alignment: mismatches found
- Limited validation honestly reported: yes
- Result: gaps_found
- Gaps:
  - CLAIM-017/CLAIM-030 mismatch: Worker validation rejects non-array and non-string array items, but missing Phase 4 payload fields can still bypass validation and fail later during normalization with a generic 500.
- Follow-up issues added: FOLLOWUP-05, REVIEW-05
- Assumptions: Reviewer treated recorded test/build/browser evidence as evidence and did not rerun commands.
- Decision debt: none; the gap is directly actionable in Worker validation and tests.
- Human-required blockers: none.

## FOLLOWUP-05
- Fixed: Worker validation now rejects missing Phase 4 payload fields before normalizeSitePayloadForStorage runs.
- Fields covered: summary, tags, techStack, isFeatured, repoUrl, fallbackUrl.
- Evidence: TDD red run `npm run test:admin` failed 25/26 because missing summary returned null; green run passed 26/26 after validation change.
- Regression: `worker npm run typecheck` passed; existing valid empty summary, empty arrays, false isFeatured, and null repo/fallback URLs remain accepted.
- Remaining gate: REVIEW-05 final independent review.

## REVIEW-05
- Source doc: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md
- Review agent: direct-spawn-agent
- Review independence: strong
- Scope checked: committed HEAD 94db5ac only, FOLLOWUP-05 payload validation fix, prior fallback/source behavior, real E2E evidence, claim ledger accounting, CLAIM-034 out-of-scope boundary, frontend secret boundary, and Phase 5 scope boundary.
- Evidence checked: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.csv; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.claims.json; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.handoff.md; worker/src/site-validation.ts; app/_components/live-project-card.tsx; tests/admin-production-path.test.mjs; git diff 2101f85..94db5ac.
- Claim coverage: gaps
- Claim/evidence alignment: mismatches found
- Limited validation honestly reported: not_applicable
- Result: gaps_found
- Gaps:
  - P1 CLAIM-028: access button does not prefer fallbackUrl while iframe is still in loading context; `visitUrl` only switches on offline state.
  - P2 CLAIM-017/CLAIM-030: non-string repoUrl/fallbackUrl can bypass Worker validation and reach normalization.
  - P3 handoff: remaining-work and blocker sections still describe already-closed public-card/admin E2E blockers.
- Follow-up issues added: FOLLOWUP-06, FOLLOWUP-07, FOLLOWUP-08, REVIEW-06
- Assumptions: Reviewer inspected committed HEAD and ignored unrelated dirty worktree changes; tests were not rerun by reviewer because the worktree is dirty.
- Decision debt: recorded FOLLOWUP-05 command evidence remains from main-session verification against the dirty worktree, though committed tests cover the reviewed behavior.
- Human-required blockers: none.

## FOLLOWUP-06
- Fixed: LiveProjectCard now keeps the iframe on `site.url` while making the access button prefer `fallbackUrl` when the iframe is still loading or the site is offline.
- Evidence: TDD red run `npm run test:admin` failed 25/26 on the missing `const frameUrl = site.url` assertion; green run passed 26/26 after the component change.
- Regression: source button still uses `repoUrl`, iframe still renders from `frameUrl`, loaded online cards return the access button to `site.url`, and `npm run build` passed after normalizing the fallback visit target to a string.
- Remaining gate: FOLLOWUP-07 and FOLLOWUP-08, then REVIEW-06.

## FOLLOWUP-07
- Fixed: Worker optional URL validation now rejects non-string, non-null `repoUrl` and `fallbackUrl` values before `normalizeOptionalUrl` can call `.trim()`.
- Evidence: TDD red run `npm run test:admin` failed 25/26 because `repoUrl: 42` returned `null`; green run passed 26/26 after the validation helper change.
- Regression: `worker npm run typecheck` passed; null, empty string, and valid https URLs remain accepted.
- Remaining gate: FOLLOWUP-08, then REVIEW-06.

## FOLLOWUP-08
- Fixed: The handoff no longer lists the already-closed public-card/admin E2E blockers as remaining work.
- Current handoff state: REVIEW-05 gaps are described as FOLLOWUP-06, FOLLOWUP-07, and FOLLOWUP-08; the remaining gate is REVIEW-06.
- Evidence: stale lines about needing public `/sites` data and admin session were replaced with direct-spawn-agent review availability and REVIEW-06 next steps.
- Remaining gate: REVIEW-06 final independent review.

## REVIEW-06
- Source doc: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md
- Review agent: direct-spawn-agent
- Review independence: strong
- Scope checked: committed HEAD 7b948ed, REVIEW-05 follow-up commits, fallbackUrl access behavior, Worker URL type validation, handoff consistency, claim ledger accounting, CLAIM-034 out-of-scope boundary, frontend secret boundary, and Phase 5 scope boundary.
- Evidence checked: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.csv; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.claims.json; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.handoff.md; app/_components/live-project-card.tsx; worker/src/site-validation.ts; tests/admin-production-path.test.mjs; git diff a0eefa6..7b948ed.
- Claim coverage: complete
- Claim/evidence alignment: mismatches found
- Limited validation honestly reported: not_applicable
- Result: gaps_found
- Gaps:
  - P3 handoff: top summary and validation section still list already-closed public-card/admin E2E blockers as current limitations.
- Follow-up issues added: FOLLOWUP-09, REVIEW-07
- Assumptions: Reviewer inspected committed HEAD and ignored unrelated dirty worktree changes; tests were not rerun by reviewer.
- Decision debt: recorded npm/build/typecheck evidence was inspected as committed review evidence, not freshly reproduced by reviewer.
- Human-required blockers: none.

## FOLLOWUP-09
- Fixed: The handoff summary, spec-accounting table, homepage section, and validation section no longer present public-card/admin E2E as current blockers.
- Current handoff state: those limitations are labeled historical and superseded by BLOCKER-01 closure; the remaining gate is REVIEW-07.
- Evidence: stale current-state phrases about missing public data, missing admin session, and unverified browser metadata were removed or rewritten as closed historical limitations.
- Remaining gate: REVIEW-07 final independent review.

## REVIEW-07
- Source doc: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md
- Review agent: direct-spawn-agent
- Review independence: strong
- Scope checked: committed HEAD bafbfd6, FOLLOWUP-09 handoff cleanup, prior fallbackUrl and Worker URL validation fixes, claim ledger accounting, CLAIM-034 out-of-scope boundary, frontend secret boundary, and Phase 5 scope boundary.
- Evidence checked: docs/superpowers/specs/2026-07-08-portfolio-data-model-phase-4-design.md; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.csv; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.claims.json; issues/2026-07-08_16-19-08-portfolio-data-model-phase-4.handoff.md; app/_components/live-project-card.tsx; worker/src/site-validation.ts; tests/admin-production-path.test.mjs; git diff 0635056..bafbfd6.
- Claim coverage: complete
- Claim/evidence alignment: matched
- Limited validation honestly reported: yes
- Result: gaps_found
- Gaps:
  - P3 handoff: lower remaining-work section still says REVIEW-06 is the current final review gate instead of REVIEW-07.
- Follow-up issues added: FOLLOWUP-10, REVIEW-08
- Assumptions: Reviewer inspected committed HEAD and ignored unrelated dirty worktree changes; tests were not rerun by reviewer.
- Decision debt: recorded npm/build/typecheck/browser evidence was treated as committed evidence, not freshly reproduced by reviewer.
- Human-required blockers: none.

## FOLLOWUP-10
- Fixed: The handoff lower status and remaining-work section now records REVIEW-06/REVIEW-07 as historical follow-up reviews and points the current final gate to REVIEW-08.
- Evidence: current-state `REVIEW-06` pointer checks are clean except for historical references, and the remaining-work bullets now name REVIEW-08.
- Remaining gate: REVIEW-08 final independent review.
