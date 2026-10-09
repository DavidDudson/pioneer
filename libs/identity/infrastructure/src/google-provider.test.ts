import { describe, expect, test } from 'bun:test';

import { AvatarUrl, DisplayName, EmailAddress, OAuthProvider, ProviderSubject } from '@pioneer/identity/domain';

import { GoogleProvider, googleProfile } from './google-provider';

const claims = {
  iss: 'https://accounts.google.com' as const,
  aud: 'client-id',
  sub: '110169484474386276334',
  name: 'Seelah',
  picture: 'https://lh3.googleusercontent.com/a/photo',
  email: 'seelah@gmail.com',
  email_verified: true,
};

describe('googleProfile', () => {
  test('maps the ID token claims', () => {
    expect(googleProfile(claims)).toStrictEqual({
      provider: OAuthProvider.Google,
      subject: ProviderSubject.parse('110169484474386276334'),
      displayName: DisplayName.parse('Seelah'),
      avatarUrl: AvatarUrl.parse('https://lh3.googleusercontent.com/a/photo'),
      email: EmailAddress.parse('seelah@gmail.com'),
      emailVerified: true,
    });
  });

  test('without a name, the address stands in', () => {
    const { name: _name, ...nameless } = claims;
    expect(googleProfile(nameless).displayName).toBe(DisplayName.parse('seelah'));
  });

  test('an unverified email is never verified', () => {
    expect(googleProfile({ ...claims, email_verified: false }).emailVerified).toBe(false);
  });
});

describe('GoogleProvider', () => {
  test('redirects to Google with state, an S256 PKCE challenge and OpenID scopes', () => {
    const provider = new GoogleProvider({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: new URL('https://pioneer.example/api/auth/google/callback'),
    });
    const { url, state } = provider.authorize();
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid profile email');
  });
});
