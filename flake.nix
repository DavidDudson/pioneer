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
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            # Runtime + package manager. Node is only here because Nx and the
            # Angular CLI are officially Node-only; app code runs on Bun.
            bun
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
          ];

          shellHook = ''
            export PGDATA="$PWD/.data/postgres"
            export PGHOST=127.0.0.1
            # Offset dev ports by the ws workspace number (ws3 -> +3) so parallel
            # workspaces don't collide. 0 outside a workspace (main checkout, CI).
            ws_offset="''${WS_NAME:-$(basename "$(dirname "$PWD")")}"
            ws_offset="''${ws_offset#ws}"
            case "$ws_offset" in ""|*[!0-9]*) ws_offset=0 ;; esac
            export PGPORT=$(( 54329 + ws_offset ))
            # Not PORT: the Angular dev server reads PORT too. api:serve maps it.
            export API_PORT=$(( 3000 + ws_offset ))
            export WEB_PORT=$(( 4200 + ws_offset ))
            unset ws_offset
            export DATABASE_URL="''${DATABASE_URL:-postgres://$USER@127.0.0.1:$PGPORT/pioneer}"
            # Separate database: DB tests create and drop their own databases on it.
            # Defaults only, so CI can point both at its Postgres service.
            export TEST_DATABASE_URL="''${TEST_DATABASE_URL:-postgres://$USER@127.0.0.1:$PGPORT/pioneer_test}"
            # The origin browsers use in dev: the Angular server, which proxies /api. OAuth callbacks live under it.
            export PUBLIC_ORIGIN="''${PUBLIC_ORIGIN:-http://localhost:$WEB_PORT}"
          '';
        };
      });
    };
}
