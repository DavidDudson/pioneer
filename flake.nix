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
          ];

          shellHook = ''
            export PGDATA="$PWD/.data/postgres"
            export PGHOST=127.0.0.1
            export PGPORT=54329
            export DATABASE_URL="''${DATABASE_URL:-postgres://$USER@127.0.0.1:54329/pioneer}"
            # Separate database: DB tests create and drop their own databases on it.
            # Defaults only, so CI can point both at its Postgres service.
            export TEST_DATABASE_URL="''${TEST_DATABASE_URL:-postgres://$USER@127.0.0.1:54329/pioneer_test}"
          '';
        };
      });
    };
}
