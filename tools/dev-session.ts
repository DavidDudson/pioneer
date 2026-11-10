/**
 * What the measuring tools share to act as the dev player against a running dev API: sign in, and make a throwaway
 * level 1 character to open. Needs the dev entrypoint (`just dev`) and the dev database.
 */
import type { SQL } from 'bun';

const DEV_PLAYER_ID = '00000000-0000-4000-8000-00000000de02';

/** The dev player's session cookie as `name=value`. */
export async function signIn(api: string): Promise<string> {
  const response = await fetch(`${api}/api/auth/dev/${DEV_PLAYER_ID}`, {
    redirect: 'manual',
    headers: { 'sec-fetch-site': 'same-origin' },
  });
  const cookie = response.headers.getSetCookie()[0]?.split(';')[0];
  if (cookie === undefined) {
    throw new Error(`Dev sign-in failed with ${response.status}; is the API running with the dev entrypoint?`);
  }
  return cookie;
}

/** The dev API and the cookie of a player signed in to it. */
export interface Session {
  readonly api: string;
  readonly cookie: string;
}

/** Makes a level 1 character for the dev player and returns its id. */
export async function createCharacter(session: Session, db: SQL, name: string): Promise<string> {
  const { api, cookie } = session;
  const origin = Bun.env['PUBLIC_ORIGIN'] ?? 'http://localhost:4200';
  const [ancestry] = await db<
    { readonly id: string }[]
  >`select id from content_entries where kind = 'ancestry' limit 1`;
  const response = await fetch(`${api}/api/characters`, {
    method: 'POST',
    headers: { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', cookie },
    body: JSON.stringify({ name, ancestry: ancestry?.id }),
  });
  const created = (await response.json()) as { readonly id: string };
  return created.id;
}
