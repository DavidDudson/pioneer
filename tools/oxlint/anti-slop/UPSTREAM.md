# Upstream

Vendored from <https://github.com/dmmulroy/anti-slop> at commit `13909c9e07590f5a85d93c62712259fe14a883f7`
(`skills/install-anti-slop/assets/anti-slop`), copied with its `scripts/install.mjs`.

- Installed: generic plugin (`index.ts`). The Effect plugin (`effect/`) is copied but not registered: Pioneer does
  not depend on `effect`.
- Rules enabled: the nine upstream rules that `@cloudflare/oxlint-config` does not replace, in `oxlint.config.ts`.
  The other nine (array filter/map, reduce copy, chained assertions, conditional empty spread, known-value widening,
  reflect apply/get, unknown type aliases, widen-then-assert) were deleted: `quality/*` from the preset covers them.
- Deviations: formatted with `bun fmt` to pass `format:check`; two type fixes for
  Pioneer's stricter tsconfig (`no-runtime-typeof.ts` index access,
  `dictionary-types.ts` `?? null`).
