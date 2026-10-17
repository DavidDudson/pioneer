import type { DocumentFixture } from './import-fixtures';

/** A level 21 Monster Core dragon as `pf2e-8.6.0` has it, trimmed to its statistics and first paragraph. */
export const TOR_LINNORM: DocumentFixture = {
  id: '0H54u83vZ1w3xHcD',
  name: 'Tor Linnorm',
  type: 'npc',
  pack: {
    name: 'pathfinder-monster-core',
    directory: 'pathfinder-monster-core',
  },
  system: {
    abilities: {
      cha: {
        mod: 9,
      },
      con: {
        mod: 9,
      },
      dex: {
        mod: 8,
      },
      int: {
        mod: -1,
      },
      str: {
        mod: 11,
      },
      wis: {
        mod: 8,
      },
    },
    attributes: {
      ac: {
        details: '',
        value: 47,
      },
      allSaves: {
        value: '+1 status to all saves vs. magic',
      },
      hp: {
        details: 'regeneration 20 (deactivated by cold iron)',
        max: 440,
        temp: 0,
        value: 440,
      },
      immunities: [
        {
          type: 'curse',
        },
        {
          type: 'fire',
        },
        {
          type: 'paralyzed',
        },
        {
          type: 'sleep',
        },
      ],
      speed: {
        details: 'unfettered movement',
        otherSpeeds: [
          {
            type: 'climb',
            value: 35,
          },
          {
            type: 'fly',
            value: 100,
          },
          {
            type: 'swim',
            value: 60,
          },
        ],
        value: 35,
      },
      weaknesses: [
        {
          type: 'cold-iron',
          value: 15,
        },
      ],
    },
    details: {
      blurb: '',
      languages: {
        details: '',
        value: ['aklo', 'draconic', 'fey'],
      },
      level: {
        value: 21,
      },
      publicNotes:
        "<p>Tor linnorms dwell in the tallest volcanic mountains, either within naturally formed caverns or molten craters. A tor linnorm's temper can be as hot and destructive as the magma the creature resembles.</p>",
      publication: {
        license: 'ORC',
        remaster: true,
        title: 'Pathfinder Monster Core',
      },
    },
    initiative: {
      statistic: 'perception',
    },
    perception: {
      details: '',
      mod: 37,
      senses: [
        {
          type: 'darkvision',
        },
        {
          acuity: 'imprecise',
          range: 60,
          type: 'scent',
        },
        {
          acuity: 'precise',
          range: 60,
          type: 'truesight',
        },
      ],
    },
    resources: {
      focus: {
        max: 1,
        value: 1,
      },
    },
    saves: {
      fortitude: {
        saveDetail: '',
        value: 38,
      },
      reflex: {
        saveDetail: '',
        value: 35,
      },
      will: {
        saveDetail: '',
        value: 33,
      },
    },
    skills: {
      acrobatics: {
        base: 35,
      },
      athletics: {
        base: 40,
      },
      stealth: {
        base: 37,
      },
    },
    traits: {
      rarity: 'uncommon',
      size: {
        value: 'grg',
      },
      value: ['dragon', 'fire'],
    },
    level: {
      value: 21,
    },
    description: {
      value:
        "<p>Tor linnorms dwell in the tallest volcanic mountains, either within naturally formed caverns or molten craters. A tor linnorm's temper can be as hot and destructive as the magma the creature resembles.</p>",
    },
    rules: [],
  },
};
