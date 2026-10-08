// API_PORT comes from the dev shell (base 3000 + ws workspace number, see flake.nix).
const DEFAULT_API_PORT = 3000;

const proxyConfig = {
  '/api': {
    target: `http://localhost:${process.env.API_PORT ?? DEFAULT_API_PORT}`,
    secure: false,
  },
};

export default proxyConfig;
