import { describe, expect, test } from 'bun:test';

import { fixedClock } from '@pioneer/shared/kernel';

import { DisplayName, EmailAddress, UserId } from './identity-fields';
import { ProfileBuilder } from './testing';
import { User } from './user';

const id = UserId.parse('8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d');
const created = fixedClock('2026-10-09T08:00:00Z').now();
const later = fixedClock('2026-10-10T08:00:00Z').now();

describe('User', () => {
  test('is created from the provider profile', () => {
    const user = User.fromProfile(
      id,
      new ProfileBuilder().named('Amiri').withEmail('Amiri@Example.com').build(),
      created,
    );
    expect(user.displayName).toBe(DisplayName.parse('Amiri'));
    expect(user.email).toBe(EmailAddress.parse('amiri@example.com'));
    expect(user.emailVerified).toBe(true);
    expect(user.createdAt).toBe(created);
  });

  test('follows the provider on later sign-ins, keeping when it was created', () => {
    const user = User.fromProfile(id, new ProfileBuilder().named('Amiri').build(), created);
    const renamed = user.withProfile(new ProfileBuilder().named('Amiri of the Hold').build(), later);
    expect(renamed.displayName).toBe(DisplayName.parse('Amiri of the Hold'));
    expect(renamed.createdAt).toBe(created);
    expect(renamed.updatedAt).toBe(later);
  });

  test('an unverified email is kept but never marked verified', () => {
    const user = User.fromProfile(id, new ProfileBuilder().withEmail('amiri@example.com', false).build(), created);
    expect(user.emailVerified).toBe(false);
  });

  test('round-trips through the wire codec, omitting absent fields', () => {
    const user = User.fromProfile(
      id,
      new ProfileBuilder().withAvatar('https://avatars.example/1.png').build(),
      created,
    );
    const wire = User.codec.encode(user);
    expect(JSON.stringify(wire)).not.toContain('email"');
    expect(wire).toEqual({
      id,
      displayName: 'Amiri',
      avatarUrl: 'https://avatars.example/1.png',
      emailVerified: false,
      createdAt: '2026-10-09T08:00:00.000Z',
      updatedAt: '2026-10-09T08:00:00.000Z',
    });
    expect(User.codec.decode(wire)).toStrictEqual(user);
  });
});
