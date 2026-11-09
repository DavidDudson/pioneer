{
  description = "pioneer: Pathfinder 2e character manager";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ] (
          system: f nixpkgs.legacyPackages.${system}
        );
      # nixpkgs lags Bun releases; drop this once it ships >= 1.4.3 (`bun check`; invoked as `bun --check` because the root `check` script wins).
      bunVersion = "1.4.4";
      bunSources = {
        aarch64-darwin = {
          file = "bun-darwin-aarch64";
          hash = "sha256-wkDX8My5DCY6hJ/NsJt+5iYw2SE0jtaq/ahrnVd7xRA=";
        };
        aarch64-linux = {
          file = "bun-linux-aarch64";
          hash = "sha256-uqa7NvUdblhWHgK76oJQOKnfRU9nPW13bou/hvjHhQ4=";
        };
        x86_64-linux = {
          file = "bun-linux-x64-baseline";
          hash = "sha256-4ERutVmVdy65iUvrrppr42jZhai5Jx7hJEhvmUbu3XY=";
        };
      };
      bunFor =
        pkgs:
        let
          source = bunSources.${pkgs.stdenv.hostPlatform.system};
        in
        pkgs.bun.overrideAttrs (_: {
          version = bunVersion;
          src = pkgs.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/${source.file}.zip";
            inherit (source) hash;
          };
        });
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            # Runtime + package manager. Node is only here because Nx and the
            # Angular CLI are officially Node-only; app code runs on Bun.
            (bunFor pkgs)
            nodejs_24
            just
            postgresql_18

            # Rust-first lint/security toolchain (see AGENTS.md#tooling).
            typos
            taplo
            rumdl
            zizmor
            committed
            prek
            ripsecrets
            actionlint
            shellcheck # used by actionlint for run: scripts

            # Go: no Rust equivalent with the same coverage.
            gitleaks
            osv-scanner

            # Haskell: the Dockerfile linter; nothing else checks Dockerfile best practice.
            hadolint

            # Production (infra/, docs/production.md): OpenTofu, the AWS CLI for deploy steps, and skopeo to copy
            # the arm64 image from GHCR to ECR.
            opentofu
            awscli2
            skopeo
          ];

          shellHook = ''
            export PGDATA="$PWD/.data/postgres"
            export PGHOST=127.0.0.1
            # Offset dev ports by a stable hash of the overbridge workspace name (gh-pioneer-12, ...), 0-99,
            # so parallel workspaces rarely collide. 0 outside a workspace (main checkout, CI).
            ws_name="''${OVERBRIDGE_NAME:-}"
            case "$PWD" in "$HOME"/workspaces/*/*) ws_name="''${ws_name:-''${PWD#"$HOME"/workspaces/}}"; ws_name="''${ws_name%%/*}" ;; esac
            ws_offset=0
            if [ -n "$ws_name" ]; then
              ws_offset=$(( $(printf '%s' "$ws_name" | cksum | cut -d' ' -f1) % 100 ))
            fi
            unset ws_name
            export PGPORT=$(( 54329 + ws_offset ))
            # Not PORT: the Angular dev server reads PORT too. api:serve maps it.
            export API_PORT="''${API_PORT:-$(( 3000 + ws_offset ))}"
            export WEB_PORT="''${WEB_PORT:-$(( 4200 + ws_offset ))}"
            unset ws_offset
            export DATABASE_URL="''${DATABASE_URL:-postgres://$USER@127.0.0.1:$PGPORT/pioneer}"
            # Separate database: DB tests create and drop their own databases on it.
            # Defaults only, so CI can point both at its Postgres service.
            export TEST_DATABASE_URL="''${TEST_DATABASE_URL:-postgres://$USER@127.0.0.1:$PGPORT/pioneer_test}"
            # The origin browsers use in dev: the Angular server, which proxies /api. OAuth callbacks live under it.
            export PUBLIC_ORIGIN="''${PUBLIC_ORIGIN:-http://localhost:$WEB_PORT}"
          ''
          # Storybook's Vitest runner drives Chromium through Playwright. Nix's browsers instead of
          # `playwright install`; the npm `playwright` version in package.json must match playwright-driver.
          + pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
            export PLAYWRIGHT_BROWSERS_PATH="${
              pkgs.playwright-driver.browsers.override {
                withFirefox = false;
                withWebkit = false;
                withFfmpeg = false;
              }
            }"
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            # libs/frontier/.storybook/vitest.config.ts fails fast when npm's playwright differs from this.
            export PLAYWRIGHT_DRIVER_VERSION="${pkgs.playwright-driver.version}"
          '';
        };
      });
    };
}
