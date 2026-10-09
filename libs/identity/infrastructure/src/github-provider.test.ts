import { describe, expect, test } from 'bun:test';

import { AvatarUrl, DisplayName, EmailAddress, OAuthProvider, ProviderSubject } from '@pioneer/identity/domain';

import { GitHubProvider, gitHubProfile } from './github-provider';

const user = {
  id: 583_231,
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231',
};

describe('gitHubProfile', () => {
  test('maps the user and its primary address', () => {
    const profile = gitHubProfile(user, [
      { email: 'other@example.com', primary: false, verified: true },
      { email: 'Octocat@GitHub.com', primary: true, verified: true },
    ]);
    expect(profile).toStrictEqual({
      provider: OAuthProvider.GitHub,
      subject: ProviderSubject.parse('583231'),
      displayName: DisplayName.parse('The Octocat'),
      avatarUrl: AvatarUrl.parse('https://avatars.githubusercontent.com/u/583231'),
      email: EmailAddress.parse('octocat@github.com'),
      emailVerified: true,
    });
  });

  test('falls back to the login when no name is set', () => {
    expect(gitHubProfile({ ...user, name: undefined }, []).displayName).toBe(DisplayName.parse('octocat'));
    expect(gitHubProfile({ ...user, name: '  ' }, []).displayName).toBe(DisplayName.parse('octocat'));
  });

  test('an unverified primary address is never verified, and no primary means no email', () => {
    const unverified = gitHubProfile(user, [{ email: 'octocat@github.com', primary: true, verified: false }]);
    expect(unverified.emailVerified).toBe(false);
    const none = gitHubProfile(user, [{ email: 'octocat@github.com', primary: false, verified: true }]);
    expect(none.email).toBeUndefined();
    expect(none.emailVerified).toBe(false);
  });

  test('long names are cut to fit', () => {
    expect(gitHubProfile({ ...user, name: 'x'.repeat(200) }, []).displayName).toHaveLength(80);
  });
});

describe('GitHubProvider', () => {
  test('redirects to GitHub with state, an S256 PKCE challenge and minimal scopes', () => {
    const provider = new GitHubProvider({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: new URL('https://pioneer.example/api/auth/github/callback'),
    });
    const { url, state, codeVerifier } = provider.authorize();
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).not.toBe(codeVerifier);
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.searchParams.get('redirect_uri')).toBe('https://pioneer.example/api/auth/github/callback');
    expect(url.searchParams.has('client_secret')).toBe(false);
  });
});
