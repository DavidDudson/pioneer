import { describe, expect, test } from 'bun:test';

import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { newId, UserId } from '@pioneer/shared/kernel';

import { mayViewCampaign } from './campaign-policy';

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
    expect(mayViewCampaign(UserId.parse(newId()), campaign)).toBe(false);
  });
});
