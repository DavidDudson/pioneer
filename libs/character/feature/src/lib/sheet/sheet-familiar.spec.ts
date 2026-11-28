import {
  CompanionArchiveReason,
  CompanionId,
  CompanionName,
  CompanionStatus,
  FamiliarForm,
  FRESH_COMPANION,
} from '@pioneer/character/domain';
import type { Companion } from '@pioneer/character/domain';
import { deriveFamiliarStatistics } from '@pioneer/rules/engine';
import type { FamiliarInputs } from '@pioneer/rules/engine';
import { CompanionKind, HitPoints, Level, Modifier, SlotKey } from '@pioneer/rules/sdk';
import { FamiliarCardMovement, FamiliarCardSense, FamiliarCardStatus } from '@pioneer/rules/ui';
import { fixedClock, newId } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { familiarCardView, liveFamiliar } from './sheet-familiar';

const NOW = fixedClock('2026-11-28T10:00:00Z').now();
const PIP = CompanionId.parse(newId());

const pip: Companion = {
  id: PIP,
  kind: CompanionKind.Familiar,
  name: CompanionName.parse('Pip'),
  form: FamiliarForm.parse({}),
  grantedBy: SlotKey.parse('witch-lesson:0'),
  createdAt: NOW,
  archived: undefined,
};

const master: FamiliarInputs = {
  level: Level.parse(5),
  armorClass: Modifier.parse(24),
  saves: { fortitude: Modifier.parse(12), reflex: Modifier.parse(10), will: Modifier.parse(14) },
  spellcasting: Modifier.parse(4),
  abilities: new Set(),
  skilled: new Set(),
  aquatic: false,
};

const translate = (key: string): string => key;

describe(liveFamiliar, () => {
  it('finds the familiar that is not archived', () => {
    expect(liveFamiliar([pip])).toBe(pip);
  });

  it('ignores an archived familiar', () => {
    const archived: Companion = { ...pip, archived: { at: NOW, reason: CompanionArchiveReason.Replaced } };

    expect(liveFamiliar([archived])).toBeUndefined();
  });

  it('is none when the character has no companions', () => {
    expect(liveFamiliar([])).toBeUndefined();
  });
});

describe(familiarCardView, () => {
  const statistics = deriveFamiliarStatistics(master);

  it('shows the master-derived numbers under the familiar’s name', () => {
    const view = familiarCardView({ companion: pip, statistics, play: {}, translate });

    expect(view.name).toBe('Pip');
    expect(view.armorClass).toBe(24);
    expect(view.saves).toStrictEqual({ fortitude: 12, reflex: 10, will: 14 });
    expect(view.perception).toBe(9);
    expect(view.hitPoints).toStrictEqual({ current: 25, max: 25, temp: 0 });
  });

  it('lists its Speeds and senses', () => {
    const view = familiarCardView({ companion: pip, statistics, play: {}, translate });

    expect(view.speeds).toStrictEqual([{ movement: FamiliarCardMovement.Land, feet: 25 }]);
    expect(view.senses).toStrictEqual([FamiliarCardSense.LowLightVision]);
  });

  it('is active when play state holds nothing of it', () => {
    expect(familiarCardView({ companion: pip, statistics, play: {}, translate }).status).toBe(
      FamiliarCardStatus.Active,
    );
  });

  it('reads its status from play state', () => {
    const view = familiarCardView({
      companion: pip,
      statistics,
      play: { [PIP]: { ...FRESH_COMPANION, status: CompanionStatus.Dead } },
      translate,
    });

    expect(view.status).toBe(FamiliarCardStatus.Dead);
  });

  it('shows the Hit Points it has left after damage, and its temporary ones', () => {
    const hurt = { ...FRESH_COMPANION, damage: HitPoints.parse(7), temp: HitPoints.parse(3) };
    const view = familiarCardView({ companion: pip, statistics, play: { [PIP]: hurt }, translate });

    expect(view.hitPoints).toStrictEqual({
      current: statistics.hitPoints.total - 7,
      max: statistics.hitPoints.total,
      temp: 3,
    });
  });

  it('never shows fewer than 0 Hit Points', () => {
    const wrecked = { ...FRESH_COMPANION, damage: HitPoints.parse(999) };
    const view = familiarCardView({ companion: pip, statistics, play: { [PIP]: wrecked }, translate });

    expect(view.hitPoints.current).toBe(0);
  });
});
