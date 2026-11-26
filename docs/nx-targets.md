# Nx targets

Where each Nx target comes from. A `project.json` declares only what is specific to its project: tags, ports, test
sharding `configurations`, and the Angular and Bun builds that differ per project.

| Target                                                                                           | Source                                                                                       |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `lint`                                                                                           | `@nx/oxlint` plugin                                                                          |
| `storybook`, `build-storybook`, `static-storybook`                                               | `@nx/storybook/plugin`; `project.json` sets the port and, for `apps/storybook`, `dependsOn`  |
| `typecheck`                                                                                      | `tools/nx/targets/typecheck.ts`: `ngc` for Angular projects, `bun check` for the rest        |
| `lint-templates`                                                                                 | `tools/nx/targets/lint-templates.ts`: Angular projects that have `.html` files               |
| `test` (Angular)                                                                                 | `tools/nx/targets/angular-test.ts`: a `tsconfig.spec.json`; `src/test-setup.ts` when present |
| `test` (Bun)                                                                                     | `tools/nx/targets/bun-test.ts`: a project with `*.test.ts` files                             |
| `test-storybook`                                                                                 | `tools/nx/targets/test-storybook.ts`: a `.storybook/vitest.config.ts`                        |
| `build`, `verify-dev-free` defaults                                                              | `nx.json` `targetDefaults`; `project.json` gives the command                                 |
| `build`, `serve` of `web`; `build`, `serve`, `db-*` of `api`; `build` of `edge`; `verify-styles` | `project.json`: one project each, with project-specific options                              |

## Why not the official inference plugins

- `@nx/js/typescript`, `@nx/eslint` and `@nx/vite`: `typecheck` needs `ngc` for template checking, ESLint here only
  lints templates (oxlint owns `lint`, so `@nx/eslint`'s `lint` would clash), and nothing builds with a Vite config.
- `@nx/vitest`: Angular specs run through `@angular/build:unit-test`, which owns the compile. It cannot express
  `parallelism: false` or the Playwright env inputs of `test-storybook` either.
- `@nx/angular` has no inference plugin; the `web` build and dev server stay in `project.json`.

## Adding a target

Add `tools/nx/targets/<name>.ts` returning a `TargetConfiguration`, or `undefined` for a project it does not apply to,
and list it in `INFERRERS` in `tools/nx/pioneer-plugin.ts`.

## Proving a change left the target graph alone

```sh
bun run nx:snapshot /tmp/before   # on the base branch
bun run nx:snapshot /tmp/after    # on the change
diff -r /tmp/before /tmp/after
```

It writes one JSON file per project: tags, and each target's executor, options, configurations, inputs, outputs,
`dependsOn`, `cache`, `continuous` and `parallelism`. Nothing in the diff means the same targets run with the same cache
keys; CI cache entries stay valid except where a task's inputs changed.
