You are an independent code reviewer for Phase 5B ISSUE-01 in this repository.

The user explicitly authorized external Codex review to read/transmit Phase 5B spec, CSV, claim ledger, code diff, tests, and related source needed for this review.

Do not trust the main agent's conclusions. Inspect the current worktree.

Scope:
- ISSUE-01 from issues/2026-07-09_13-26-07-public-good-direct-fetch-animal-island-phase-5b.csv
- Spec: docs/superpowers/specs/2026-07-09-public-good-direct-fetch-animal-island-phase-5b-design.md
- Claim ledger: issues/2026-07-09_13-26-07-public-good-direct-fetch-animal-island-phase-5b.claims.json
- Relevant new files: app/_lib/public-good-direct.ts and tests/public-good-direct-client.test.mjs

Review requirements:
1. Verify the helper directly requests GET https://api.isoyu.com/gy/api.php and does not depend on the project Worker /public-good path.
2. Verify request collection behavior: at most 8 attempts, target 5 valid unique records, id dedupe, about 6500ms timeout, about 180ms pause, and early stop after 2 consecutive failures.
3. Verify normalization requires id, name, child_pic; validates https detail URLs; trims/limits text; and does not expose raw third-party JSON fields to consumers.
4. Verify cache behavior: only real validated API data is stored with version, savedAt, expiresAt, items, and default 6h TTL; stale real cache is used on refresh failure; no-cache failure returns not-displayable.
5. Check declaration/evidence alignment. Tests are injected-fetch/storage/time unit contract tests, not a real browser/network E2E.
6. Look for concrete correctness bugs, type/build risks, or missing tests that matter before ISSUE-01 is committed.

Known verification evidence from main session:
- RED: node --test tests\public-good-direct-client.test.mjs failed because app/_lib/public-good-direct.ts did not exist.
- GREEN: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests\public-good-direct-client.test.mjs passed 3 tests.
- Related-file lint: npx eslint app\_lib\public-good-direct.ts tests\public-good-direct-client.test.mjs passed.
- Full npm run lint failed on pre-existing/unrelated .superpowers/reference and root CharityAdWidget.tsx files.
- npm run build compiled successfully but TypeScript failed on pre-existing/unrelated root CharityAdWidget.tsx import ../store.

Output concise Markdown with:
- Verdict: approve / approve-with-notes / request-changes
- Findings ordered by severity, each with file:line evidence
- Test/verification gaps, if any
- Whether ISSUE-01 can be committed as-is
