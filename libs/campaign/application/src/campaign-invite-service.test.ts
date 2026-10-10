import { beforeEach, describe, expect, test } from 'bun:test';

import { CampaignInviteId, CampaignRole, INVITE_LIFETIME, InviteToken } from '@pioneer/campaign/domain';
import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { ForbiddenError, GoneError, newId, NotFoundError, Temporal, UserId } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignInviteService } from './campaign-invite-service';
import { InMemoryCampaignInviteRepository } from './in-memory-campaign-invite-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InviteMessage } from './invite-message';

const ezren = UserId.parse(newId());
const seelah = UserId.parse(newId());
const stranger = UserId.parse(newId());
const vaults = new CampaignBuilder().named('Abomination Vaults').withPlayer(ezren).build();

/** A clock the test moves by hand. */
class ManualClock implements Clock {
  #now = Temporal.Instant.from('2026-10-10T10:00:00Z');

  public now(): Temporal.Instant {
    return this.#now;
  }

  public advance(duration: Temporal.Duration): void {
    this.#now = this.#now.add(duration);
  }
}

describe('CampaignInviteService', () => {
  let clock: ManualClock;
  let campaigns: InMemoryCampaignRepository;
  let service: CampaignInviteService;

  beforeEach(async () => {
    clock = new ManualClock();
    campaigns = new InMemoryCampaignRepository();
    await campaigns.insert(vaults);
    service = new CampaignInviteService(campaigns, new InMemoryCampaignInviteRepository(), clock);
  });

  test('the GM creates an invite that lasts the invite lifetime and lists it', async () => {
    const { invite, token } = await service.create(fixtureGmId, vaults.id);
    expect(InviteToken.safeParse(token).success).toBe(true);
    expect(invite.expiresAt).toStrictEqual(clock.now().add(INVITE_LIFETIME));
    expect(await service.list(fixtureGmId, vaults.id)).toStrictEqual([invite]);
  });

  test('each invite gets its own token', async () => {
    const first = await service.create(fixtureGmId, vaults.id);
    const second = await service.create(fixtureGmId, vaults.id);
    expect(first.token).not.toBe(second.token);
  });

  test('the list holds open invites only, newest first', async () => {
    const old = await service.create(fixtureGmId, vaults.id);
    clock.advance(Temporal.Duration.from({ hours: 1 }));
    const revoked = await service.create(fixtureGmId, vaults.id);
    clock.advance(Temporal.Duration.from({ hours: 1 }));
    const newest = await service.create(fixtureGmId, vaults.id);
    await service.revoke(fixtureGmId, vaults.id, revoked.invite.id);
    expect(await service.list(fixtureGmId, vaults.id)).toStrictEqual([newest.invite, old.invite]);

    clock.advance(INVITE_LIFETIME.subtract({ hours: 1 }));
    expect(await service.list(fixtureGmId, vaults.id)).toStrictEqual([newest.invite]);
  });

  test('a player may not manage invites; a stranger finds no campaign', async () => {
    expect(await rejection(service.create(ezren, vaults.id))).toBeInstanceOf(ForbiddenError);
    expect(await rejection(service.list(ezren, vaults.id))).toBeInstanceOf(ForbiddenError);
    expect(await rejection(service.create(stranger, vaults.id))).toBeInstanceOf(NotFoundError);
    expect(await rejection(service.list(stranger, vaults.id))).toBeInstanceOf(NotFoundError);
  });

  test('revoking twice keeps the first revocation time', async () => {
    const { invite } = await service.create(fixtureGmId, vaults.id);
    const first = await service.revoke(fixtureGmId, vaults.id, invite.id);
    expect(first.revokedAt).toStrictEqual(clock.now());
    clock.advance(Temporal.Duration.from({ minutes: 5 }));
    expect(await service.revoke(fixtureGmId, vaults.id, invite.id)).toStrictEqual(first);
  });

  test('revoking an invite of another campaign, or none, is not found', async () => {
    const kingmaker = new CampaignBuilder().named('Kingmaker').build();
    await campaigns.insert(kingmaker);
    const { invite } = await service.create(fixtureGmId, kingmaker.id);
    expect(await rejection(service.revoke(fixtureGmId, vaults.id, invite.id))).toBeInstanceOf(NotFoundError);
    const missing = CampaignInviteId.parse(newId());
    expect(await rejection(service.revoke(fixtureGmId, vaults.id, missing))).toBeInstanceOf(NotFoundError);
  });
});

describe('CampaignInviteService joining', () => {
  let clock: ManualClock;
  let service: CampaignInviteService;

  beforeEach(async () => {
    clock = new ManualClock();
    const campaigns = new InMemoryCampaignRepository();
    await campaigns.insert(vaults);
    service = new CampaignInviteService(campaigns, new InMemoryCampaignInviteRepository(), clock);
  });

  test('an open invite makes the actor a player', async () => {
    const { token } = await service.create(fixtureGmId, vaults.id);
    const joined = await service.join(seelah, token);
    expect(joined.roleOf(seelah)).toBe(CampaignRole.Player);
    expect(joined.members.at(-1)?.joinedAt).toStrictEqual(clock.now());
  });

  test('joining again leaves the campaign as it was', async () => {
    const { token } = await service.create(fixtureGmId, vaults.id);
    const first = await service.join(seelah, token);
    expect(await service.join(seelah, token)).toStrictEqual(first);
    expect(await service.join(fixtureGmId, token)).toStrictEqual(first);
  });

  test('a member opening a revoked or expired link still gets their campaign', async () => {
    const { invite, token } = await service.create(fixtureGmId, vaults.id);
    await service.revoke(fixtureGmId, vaults.id, invite.id);
    clock.advance(INVITE_LIFETIME);
    const rejoined = await service.join(ezren, token);
    expect(rejoined.id).toBe(vaults.id);
  });

  test('an unknown token is not found, with its own message', async () => {
    const unknown = InviteToken.parse('A'.repeat(43));
    const error = await rejection(service.join(seelah, unknown));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: InviteMessage.Unknown });
  });

  test('a revoked invite is gone', async () => {
    const { invite, token } = await service.create(fixtureGmId, vaults.id);
    await service.revoke(fixtureGmId, vaults.id, invite.id);
    const error = await rejection(service.join(seelah, token));
    expect(error).toBeInstanceOf(GoneError);
    expect((error as GoneError).descriptor).toStrictEqual({ key: InviteMessage.Revoked });
  });

  test('an invite works until the instant it expires', async () => {
    const { token } = await service.create(fixtureGmId, vaults.id);
    clock.advance(INVITE_LIFETIME);
    const error = await rejection(service.join(seelah, token));
    expect(error).toBeInstanceOf(GoneError);
    expect((error as GoneError).descriptor).toStrictEqual({ key: InviteMessage.Expired });
  });
});
