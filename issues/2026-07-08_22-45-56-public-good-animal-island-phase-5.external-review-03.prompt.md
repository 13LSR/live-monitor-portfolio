You are an independent final Phase 5 vision reviewer for this repository.

The user explicitly authorized external codex exec review to read/transmit Phase 5 spec, CSV, claim ledger, review/handoff, code diff, test evidence, browser evidence notes, and relevant source code.

Your job: independently determine whether Phase 5 public-good + Animal Island delivery now meets the approved Phase 5 design after FOLLOWUP-01. Do not trust the main agent's conclusions. Only use repository files, git history/diff, tests evidence recorded in artifacts, and source inspection.

Required source materials:
- Approved spec: docs/superpowers/specs/2026-07-08-public-good-animal-island-phase-5-design.md
- CSV state source: issues/2026-07-08_22-45-56-public-good-animal-island-phase-5.csv
- Claim ledger: issues/2026-07-08_22-45-56-public-good-animal-island-phase-5.claims.json
- Existing review log: issues/2026-07-08_22-45-56-public-good-animal-island-phase-5.review.md
- Human handoff: issues/2026-07-08_22-45-56-public-good-animal-island-phase-5.handoff.md
- External REVIEW-02 output: issues/2026-07-08_22-45-56-public-good-animal-island-phase-5.external-review-02.codex.md
- Relevant commits/diff: a88c1dc..HEAD, especially 5f5fabe, 0ceb189, 4145eee, and aa51078
- Relevant source/tests: worker/src/public-good.ts, worker/src/index.ts, worker/src/auth.ts, shared/contracts.ts, app/_lib/api-client.ts, app/_components/public-good-notice.tsx, app/_components/home-page.tsx, app/_components/portfolio-grid-client.tsx, app/_components/live-project-card.tsx, app/_components/admin-dashboard.tsx, app/_components/admin-site-table.tsx, app/layout.tsx, README.md, tests/admin-production-path.test.mjs, package.json, worker/package.json.

Review requirements:
1. Check Phase 5 claims against evidence claim-by-claim or by complete coverage groups. Verify public-good Worker proxy uses the real API without iframe/widget, stable sanitized 5-item cached batch, frontend fallback/failure isolation, homepage placement after hero before portfolio, five-avatar interaction, homepage Animal Island evidence, authenticated admin island-office evidence without CRUD/auth regression, attribution, test/build evidence, and honest validation notes.
2. Specifically verify whether REVIEW-02's only material gap, authenticated /admin desktop/mobile browser validation, is resolved by FOLLOWUP-01 evidence and code changes.
3. Check declaration/evidence alignment: file names, test names, CSV notes, review/handoff, and commit messages must not overstate mock/static/limited evidence.
4. Only count a gap if it is concrete and falsifiable. Do not invent aesthetic preferences beyond the approved spec.
5. Output final answer as strict JSON only, with this shape:

{
  "review_agent_mode": "codex-exec-independent",
  "review_independence": "strong",
  "review_actual_model": "unknown or model if visible",
  "claim_coverage": "covered/total or unknown",
  "claim_coverage_status": "complete|gaps|unknown",
  "claim_evidence_alignment": "matched|mismatches_found|limited",
  "limited_validation_honestly_reported": "yes|no|not_applicable",
  "result": "vision_met|gaps_found|limited_review",
  "gaps": [
    {
      "source_ref": "path:line or file",
      "evidence_ref": "path:line or observed missing evidence",
      "why_it_matters": "concise reason",
      "suggested_followup_issue": "concise actionable issue"
    }
  ],
  "assumptions": ["..."],
  "decision_debt": ["..."],
  "human_required_blockers": ["..."],
  "evidence_checked": ["..."],
  "summary": "one concise paragraph"
}
