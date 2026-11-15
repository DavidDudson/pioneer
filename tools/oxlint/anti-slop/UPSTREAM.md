# Upstream

Vendored from <https://github.com/dmmulroy/anti-slop> at commit `13909c9e07590f5a85d93c62712259fe14a883f7`
(`skills/install-anti-slop/assets/anti-slop`), copied with its `scripts/install.mjs`.

- Installed: generic plugin (`index.ts`). The Effect plugin (`effect/`) is copied but not registered: Pioneer does
  not depend on `effect`.
- Rules enabled: all 18 generic rules plus native `oxc/no-accumulating-spread`, in `.oxlintrc.json`.
- Deviations: formatted with `bun fmt` to pass `format:check`; two type fixes for
  Pioneer's stricter tsconfig (`no-runtime-typeof.ts` index access,
  `dictionary-types.ts` `?? null`).
