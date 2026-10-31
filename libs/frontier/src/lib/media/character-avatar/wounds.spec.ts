import { assert, integer, property } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DEATH_SAVE_LIMIT, WoundCue, wounds } from './wounds';

const MAX_HP = 200;

describe(wounds, () => {
  it('shows nothing above half HP', () => {
    expect(wounds({ current: 20, max: 20, failedSaves: undefined })).toStrictEqual({
      vignette: 0,
      darkness: 0,
      cue: WoundCue.None,
    });
    expect(wounds({ current: 11, max: 20, failedSaves: undefined }).cue).toBe(WoundCue.None);
  });

  it('is bloodied at half, with the vignette just starting', () => {
    expect(wounds({ current: 10, max: 20, failedSaves: undefined })).toStrictEqual({
      vignette: 0,
      darkness: 0,
      cue: WoundCue.Bloodied,
    });
  });

  it('is at full vignette and dying at 0 HP', () => {
    expect(wounds({ current: 0, max: 20, failedSaves: undefined })).toStrictEqual({
      vignette: 1,
      darkness: 0,
      cue: WoundCue.Dying,
    });
  });

  it('darkens by a third per failed save, to full at the limit', () => {
    const darkness = [0, 1, 2, DEATH_SAVE_LIMIT, 9].map(
      (failedSaves) => wounds({ current: 0, max: 20, failedSaves }).darkness,
    );
    expect(darkness).toStrictEqual([0, 1 / 3, 2 / 3, 1, 1]);
  });

  it('is dying while death saves run, even above 0 HP', () => {
    expect(wounds({ current: 4, max: 20, failedSaves: 0 }).cue).toBe(WoundCue.Dying);
  });

  it('shows no vignette without max HP', () => {
    expect(wounds({ current: 0, max: 0, failedSaves: undefined })).toStrictEqual({
      vignette: 0,
      darkness: 0,
      cue: WoundCue.None,
    });
  });

  it('never weakens the vignette as HP falls', () => {
    assert(
      property(integer({ min: -10, max: MAX_HP + 10 }), integer({ min: 0, max: 60 }), (hp, extra) => {
        const lower = wounds({ current: hp, max: MAX_HP, failedSaves: undefined });
        const higher = wounds({ current: hp + extra, max: MAX_HP, failedSaves: undefined });
        expect(lower.vignette).toBeGreaterThanOrEqual(higher.vignette);
      }),
    );
  });

  it('is dying with no max HP once death saves run', () => {
    expect(wounds({ current: 0, max: 0, failedSaves: 1 })).toStrictEqual({
      vignette: 0,
      darkness: 1 / 3,
      cue: WoundCue.Dying,
    });
  });

  it('never softens the cue as HP falls', () => {
    const severity = { [WoundCue.None]: 0, [WoundCue.Bloodied]: 1, [WoundCue.Dying]: 2 };
    assert(
      property(integer({ min: -10, max: MAX_HP + 10 }), integer({ min: 0, max: 60 }), (hp, extra) => {
        const lower = wounds({ current: hp, max: MAX_HP, failedSaves: undefined });
        const higher = wounds({ current: hp + extra, max: MAX_HP, failedSaves: undefined });
        expect(severity[lower.cue]).toBeGreaterThanOrEqual(severity[higher.cue]);
      }),
    );
  });

  it('never lightens the darkness as failed saves rise', () => {
    assert(
      property(integer({ min: 0, max: 8 }), integer({ min: 0, max: 8 }), (saves, extra) => {
        const fewer = wounds({ current: 0, max: MAX_HP, failedSaves: saves });
        const more = wounds({ current: 0, max: MAX_HP, failedSaves: saves + extra });
        expect(more.darkness).toBeGreaterThanOrEqual(fewer.darkness);
      }),
    );
  });

  it('keeps both strengths within 0 to 1', () => {
    assert(
      property(
        integer({ min: -50, max: 300 }),
        integer({ min: -5, max: 300 }),
        integer({ min: 0, max: 10 }),
        (current, max, failedSaves) => {
          const result = wounds({ current, max, failedSaves });
          expect(result.vignette).toBeGreaterThanOrEqual(0);
          expect(result.vignette).toBeLessThanOrEqual(1);
          expect(result.darkness).toBeGreaterThanOrEqual(0);
          expect(result.darkness).toBeLessThanOrEqual(1);
        },
      ),
    );
  });
});
