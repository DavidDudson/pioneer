import { describe, expect, test } from 'bun:test';

import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { newId, UserId } from '@pioneer/shared/kernel';

import {
  mayAttachCharacter,
  mayDetachCharacter,
  mayLeaveCampaign,
  mayManageInvites,
  mayManageMembers,
  mayViewCampaign,
} from './campaign-policy';

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

describe('mayAttachCharacter', () => {
  const ezren = UserId.parse(newId());
  const stranger = UserId.parse(newId());
  const campaign = new CampaignBuilder().withPlayer(ezren).build();

  test('the GM may bring their own character', () => {
    expect(mayAttachCharacter(fixtureGmId, campaign, fixtureGmId)).toBe(true);
  });

  test('a player may bring their own character', () => {
    expect(mayAttachCharacter(ezren, campaign, ezren)).toBe(true);
  });

  test('no member may bring someone else’s, the GM included', () => {
    expect(mayAttachCharacter(ezren, campaign, fixtureGmId)).toBe(false);
    expect(mayAttachCharacter(fixtureGmId, campaign, ezren)).toBe(false);
  });

  test('anyone else may not, even their own', () => {
    expect(mayAttachCharacter(stranger, campaign, stranger)).toBe(false);
  });
});

describe('mayDetachCharacter', () => {
  const ezren = UserId.parse(newId());
  const seelah = UserId.parse(newId());
  const stranger = UserId.parse(newId());
  const campaign = new CampaignBuilder().withPlayer(ezren).withPlayer(seelah).build();

  test('the GM may, whoever owns it', () => {
    expect(mayDetachCharacter(fixtureGmId, campaign, ezren)).toBe(true);
    expect(mayDetachCharacter(fixtureGmId, campaign, fixtureGmId)).toBe(true);
  });

  test('a player may detach their own', () => {
    expect(mayDetachCharacter(ezren, campaign, ezren)).toBe(true);
  });

  test('a player may not detach another player’s or the GM’s', () => {
    expect(mayDetachCharacter(ezren, campaign, seelah)).toBe(false);
    expect(mayDetachCharacter(ezren, campaign, fixtureGmId)).toBe(false);
  });

  test('anyone else may not, even their own', () => {
    expect(mayDetachCharacter(stranger, campaign, stranger)).toBe(false);
  });
});
