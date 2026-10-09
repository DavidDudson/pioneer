import { describe, expect, test } from 'bun:test';

import { AvatarUrl, DisplayName, EmailAddress, OAuthProvider, ProviderSubject } from '@pioneer/identity/domain';

import { DiscordProvider, discordProfile } from './discord-provider';

const user = {
  id: '80351110224678912',
  username: 'nelly',
  global_name: 'Nelly',
  avatar: '8342729096ea3675442027381ff50dfe',
};

describe('discordProfile', () => {
  test('maps the user, its avatar and verified email', () => {
    expect(discordProfile({ ...user, email: 'Nelly@Discord.com', verified: true })).toStrictEqual({
      provider: OAuthProvider.Discord,
      subject: ProviderSubject.parse('80351110224678912'),
      displayName: DisplayName.parse('Nelly'),
      avatarUrl: AvatarUrl.parse(
        'https://cdn.discordapp.com/avatars/80351110224678912/8342729096ea3675442027381ff50dfe.png',
      ),
      email: EmailAddress.parse('nelly@discord.com'),
      emailVerified: true,
    });
  });

  test('falls back to the username, and to no avatar or email', () => {
    const profile = discordProfile({ id: '1', username: 'nelly', global_name: undefined, avatar: undefined });
    expect(profile.displayName).toBe(DisplayName.parse('nelly'));
    expect(profile.avatarUrl).toBeUndefined();
    expect(profile.email).toBeUndefined();
    expect(profile.emailVerified).toBe(false);
  });

  test('an unverified email is never verified', () => {
    expect(discordProfile({ ...user, email: 'nelly@discord.com', verified: false }).emailVerified).toBe(false);
  });
});

describe('DiscordProvider', () => {
  test('redirects to Discord with state, an S256 PKCE challenge and minimal scopes', () => {
    const provider = new DiscordProvider({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: new URL('https://pioneer.example/api/auth/discord/callback'),
    });
    const { url, state } = provider.authorize();
    expect(url.origin).toBe('https://discord.com');
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('identify email');
  });
});
