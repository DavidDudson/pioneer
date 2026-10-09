import { describe, expect, test } from 'bun:test';

import { Temporal } from '@pioneer/shared/kernel';
import { assert, integer, property } from 'fast-check';

import { SessionId, UserId } from './identity-fields';
import { LAST_SEEN_RESOLUTION, Session, SESSION_LIFETIME, SESSION_RENEWAL_WINDOW, TokenHash } from './session';

const START = Temporal.Instant.from('2026-10-09T08:00:00Z');
const LIFETIME_SECONDS = SESSION_LIFETIME.total('seconds');
const HALF_LIFE_SECONDS = LIFETIME_SECONDS - SESSION_RENEWAL_WINDOW.total('seconds');

function started(): Session {
  return Session.start({
    id: SessionId.parse('0199d2a0-0000-7000-8000-000000000001'),
    userId: UserId.parse('0199d2a0-0000-7000-8000-000000000002'),
    tokenHash: TokenHash.parse('a'.repeat(64)),
    now: START,
  });
}

function at(seconds: number): Temporal.Instant {
  return START.add({ seconds });
}

describe('Session sliding expiry', () => {
  test('lasts 30 days, renewable for the last 15', () => {
    const session = started();
    expect(session.expiresAt).toEqual(START.add({ hours: 720 }));
    expect(session.isRenewableAt(START.add({ hours: 359 }))).toBe(false);
    expect(session.isRenewableAt(START.add({ hours: 360 }))).toBe(true);
    expect(session.isExpiredAt(START.add({ hours: 720 }))).toBe(true);
  });

  test('use in the first half keeps the expiry; use in the second half renews from now', () => {
    assert(
      property(integer({ min: 0, max: LIFETIME_SECONDS - 1 }), (offset) => {
        const now = at(offset);
        const used = started().usedAt(now);
        const expected = offset >= HALF_LIFE_SECONDS ? now.add(SESSION_LIFETIME) : started().expiresAt;
        expect(used.expiresAt).toEqual(expected);
        expect(used.isExpiredAt(now)).toBe(false);
      }),
    );
  });

  test('a session used at least every half-life never expires', () => {
    assert(
      property(integer({ min: 1, max: HALF_LIFE_SECONDS }), integer({ min: 1, max: 40 }), (gap, uses) => {
        let session = started();
        let now = START;
        for (let use = 0; use < uses; use += 1) {
          now = now.add({ seconds: gap });
          expect(session.isExpiredAt(now)).toBe(false);
          session = session.usedAt(now);
        }
      }),
    );
  });

  test('an unused session expires exactly at the end of its lifetime', () => {
    assert(
      property(integer({ min: 0, max: 2 * LIFETIME_SECONDS }), (offset) => {
        expect(started().isExpiredAt(at(offset))).toBe(offset >= LIFETIME_SECONDS);
      }),
    );
  });

  test('last seen moves at most once per resolution outside the renewal window', () => {
    const resolution = LAST_SEEN_RESOLUTION.total('seconds');
    assert(
      property(integer({ min: 0, max: HALF_LIFE_SECONDS - 1 }), (offset) => {
        const session = started();
        const used = session.usedAt(at(offset));
        if (offset < resolution) {
          expect(used).toBe(session);
        } else {
          expect(used.lastSeenAt).toEqual(at(offset));
        }
      }),
    );
  });
});
