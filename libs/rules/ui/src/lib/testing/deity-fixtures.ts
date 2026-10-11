import { RichText } from '@pioneer/rules/sdk';

import type { DeityLine } from '../deity/deity-line';

/** Sarenrae as Divine Mysteries gives her, with her edicts and anathema as her description has them. */
export const SARENRAE: DeityLine = {
  name: 'Sarenrae',
  fonts: ['heal'],
  sanctification: { modal: 'can', what: ['holy'] },
  domains: ['fire', 'healing', 'sun', 'truth'],
  alternateDomains: ['repose'],
  favoredWeapons: ['Scimitar'],
  attributes: ['con', 'wis'],
  skills: ['Medicine'],
  description: RichText.parse([
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Edicts', marks: ['strong'] },
        { type: 'text', text: ' destroy the Spawn of Rovagug, protect allies' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Anathema', marks: ['strong'] },
        { type: 'text', text: ' create undead, lie' },
      ],
    },
  ]),
};

/** A philosophy: no font, sanctification or domains. */
export const PROPHECIES_OF_KALISTRADE: DeityLine = {
  name: 'Prophecies of Kalistrade',
  fonts: [],
  domains: [],
  alternateDomains: [],
  favoredWeapons: [],
  attributes: ['int', 'cha'],
  skills: ['Society'],
  description: RichText.parse([]),
};
