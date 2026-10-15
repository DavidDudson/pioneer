import { ContentKind } from '@pioneer/rules/sdk';
import type { MagicItemFields } from '@pioneer/rules/sdk/testing';

/** A worn invested charm that upgrades the fly, swim, climb and burrow Speeds to 30, 20, 15 and 10 feet. */
export const MOVEMENT_CHARM: MagicItemFields & { readonly kind: ContentKind } = {
  kind: ContentKind.Equipment,
  data: { bulk: 'light', usage: { type: 'worn', slot: 'necklace' } },
  traits: ['invested', 'magical'],
  rules: [
    { key: 'Change', selector: 'speed:fly', mode: 'upgrade', value: 30 },
    { key: 'Change', selector: 'speed:swim', mode: 'upgrade', value: 20 },
    { key: 'Change', selector: 'speed:climb', mode: 'upgrade', value: 15 },
    { key: 'Change', selector: 'speed:burrow', mode: 'upgrade', value: 10 },
  ],
};
