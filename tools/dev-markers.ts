import { DEV_USERS, DevSignInPath } from '@pioneer/identity/dev-users';

/** The dev components' selectors and the dev sign-in's message scope; neither may reach a production build. */
export const DEV_SIGN_IN_SELECTOR = 'pio-dev-sign-in';
export const DEV_MESSAGE_SCOPE = 'identityDev';
export const SAMPLE_IMPORT_SELECTOR = 'pio-sample-character-import';

/**
 * Strings only dev code contains: the seeded users' ids and names, the dev sign-in route, and the web
 * component's selector and message scope. Any of them in a production build means dev code shipped.
 */
export const DEV_MARKERS: readonly string[] = [
  ...DEV_USERS.flatMap(({ id, displayName }) => [id, displayName]),
  DevSignInPath.route.slice(0, DevSignInPath.route.indexOf(':')),
  DEV_SIGN_IN_SELECTOR,
  DEV_MESSAGE_SCOPE,
  SAMPLE_IMPORT_SELECTOR,
];

/** The markers that occur in `contents`, in marker order. */
export function findMarkers(contents: Uint8Array, markers: readonly string[] = DEV_MARKERS): string[] {
  const buffer = Buffer.from(contents.buffer, contents.byteOffset, contents.byteLength);
  return markers.filter((marker) => buffer.includes(marker));
}
