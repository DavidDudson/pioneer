import { describe, expect, test } from 'bun:test';

import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { newId, UserId } from '@pioneer/shared/kernel';

import { mayLeaveCampaign, mayManageInvites, mayManageMembers, mayViewCampaign } from './campaign-policy';

describe('mayViewCampaign', () => {
  const ezren = UserId.parse(newId());
  const campaign = new CampaignBuilder().withPlayer(ezren).build();

  test('the GM may', () => {
    expect(mayViewCampaign(fixtureGmId, campaign)).toBe(true);
  });

  test('a player may', () => {
    expect(mayViewCampaign(ezren, campaign)).toBe(true);
  });

  test('anyone else may not', () => {
    const stranger = UserId.parse(newId());
    expect(mayViewCampaign(stranger, campaign)).toBe(false);
  });
});

describe('mayManageInvites', () => {
  const ezren = UserId.parse(newId());
  const campaign = new CampaignBuilder().withPlayer(ezren).build();

  test('the GM may', () => {
    expect(mayManageInvites(fixtureGmId, campaign)).toBe(true);
  });

  test('a player may not', () => {
    expect(mayManageInvites(ezren, campaign)).toBe(false);
  });

  test('anyone else may not', () => {
    const stranger = UserId.parse(newId());
    expect(mayManageInvites(stranger, campaign)).toBe(false);
  });
});

describe('mayManageMembers', () => {
  const ezren = UserId.parse(newId());
  const campaign = new CampaignBuilder().withPlayer(ezren).build();

  test('the GM may', () => {
    expect(mayManageMembers(fixtureGmId, campaign)).toBe(true);
  });

  test('a player may not', () => {
    expect(mayManageMembers(ezren, campaign)).toBe(false);
  });

  test('anyone else may not', () => {
    const stranger = UserId.parse(newId());
    expect(mayManageMembers(stranger, campaign)).toBe(false);
  });
});

describe('mayLeaveCampaign', () => {
  const ezren = UserId.parse(newId());
  const campaign = new CampaignBuilder().withPlayer(ezren).build();

  test('the GM may not, until they hand the role over', () => {
    expect(mayLeaveCampaign(fixtureGmId, campaign)).toBe(false);
  });

  test('a player may', () => {
    expect(mayLeaveCampaign(ezren, campaign)).toBe(true);
  });

  test('anyone else may not', () => {
    const stranger = UserId.parse(newId());
    expect(mayLeaveCampaign(stranger, campaign)).toBe(false);
  });
});
