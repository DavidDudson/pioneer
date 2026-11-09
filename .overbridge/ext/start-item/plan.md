# What a pioneer plan covers

Acceptance criteria from the issue; the layers this slice touches (migration, domain or engine, contract, API,
Angular feature, `en` message keys, tests); the ADRs and rules that apply; anything ambiguous. Ask when a
requirement is genuinely ambiguous, otherwise state the assumption in the plan and the PR.

Build one full-stack vertical slice matching surrounding code: Nx layering, zod codecs at boundaries, frontier
components only, message keys instead of literal text, migrations generated with drizzle-kit. Tests alongside:
property tests for engine and dice logic, `*.db.test.ts` for persistence (`just db-up` only when a db test needs
it), component specs. Commit in small conventional commits. Stay in scope; note follow-ups for the PR.

If the slice changes existing UI, take the before screenshots now, while the branch still matches main (see the
`ship-pr` `screenshots` extension).
