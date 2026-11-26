# Upstream

Vendored from <https://github.com/dmmulroy/anti-slop> at commit `13909c9e07590f5a85d93c62712259fe14a883f7`
(`skills/install-anti-slop/assets/anti-slop`), copied with its `scripts/install.mjs`.

- Installed: generic plugin (`index.ts`). The Effect plugin (`effect/`) is copied but not registered: Pioneer does
  not depend on `effect`.
- Rules enabled: the six upstream rules `@cloudflare/oxlint-config` does not replace (no-module-mocking,
  no-runtime-typeof, no-shape-in-symbol-names, no-unknown-parameters, require-readable-spacing,
  require-safety-comment-for-type-assertion), in `oxlint.config.ts`. The other twelve were deleted: `quality/*`
  from the preset covers them.
- Deviations: formatted with `bun fmt` to pass `format:check`; a type fix for
  Pioneer's stricter tsconfig (`no-runtime-typeof.ts` index access).
