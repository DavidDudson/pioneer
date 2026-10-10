import { describe, expect, test } from 'bun:test';

import { DEV_USERS, DevUser } from '@pioneer/identity/dev-users';

import { DEV_MARKERS, DEV_MESSAGE_SCOPE, DEV_SIGN_IN_SELECTOR, findMarkers } from './dev-markers.ts';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('findMarkers', () => {
  test('finds dev markers anywhere in the bytes, binaries included', () => {
    const bytes = encode(`\u0000\u0001var a="${DevUser.Gm.id}";\u0000<${DEV_SIGN_IN_SELECTOR}>`);
    expect(findMarkers(bytes)).toStrictEqual([DevUser.Gm.id, DEV_SIGN_IN_SELECTOR]);
  });

  test('clean output has none', () => {
    expect(findMarkers(encode('const signIn = "/auth/github/login";'))).toStrictEqual([]);
  });

  test('covers every dev user and the dev route', () => {
    for (const { id, displayName } of DEV_USERS) {
      expect(DEV_MARKERS).toContain(id);
      expect(DEV_MARKERS).toContain(displayName);
    }
    expect(DEV_MARKERS).toContain('/auth/dev/');
  });
});

describe('DEV_MESSAGE_SCOPE', () => {
  test('is the dev sign-in bundle’s namespace', async () => {
    const bundle: unknown = await Bun.file('libs/identity/dev-sign-in/src/i18n/en.json').json();
    expect(Object.keys(bundle as object)).toStrictEqual([DEV_MESSAGE_SCOPE]);
  });
});
