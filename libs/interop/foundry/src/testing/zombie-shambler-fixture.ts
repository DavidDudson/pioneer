import type { DocumentFixture } from './import-fixtures';

/** A level -1 Monster Core zombie as `pf2e-8.6.0` has it, trimmed to its statistics and first paragraph. */
export const ZOMBIE_SHAMBLER: DocumentFixture = {
  id: 'Xo4IGzw28hivgMmM',
  name: 'Zombie Shambler',
  type: 'npc',
  pack: {
    name: 'pathfinder-monster-core',
    directory: 'pathfinder-monster-core',
  },
  system: {
    abilities: {
      cha: {
        mod: -2,
      },
      con: {
        mod: 2,
      },
      dex: {
        mod: -2,
      },
      int: {
        mod: -5,
      },
      str: {
        mod: 3,
      },
      wis: {
        mod: 0,
      },
    },
    attributes: {
      ac: {
        details: '',
        value: 12,
      },
      allSaves: {
        value: '',
      },
      hp: {
        details: 'void healing',
        max: 20,
        temp: 0,
        value: 20,
      },
      immunities: [
        {
          exceptions: [],
          type: 'death-effects',
        },
        {
          exceptions: [],
          type: 'disease',
        },
        {
          exceptions: [],
          type: 'paralyzed',
        },
        {
          exceptions: [],
          type: 'poison',
        },
        {
          exceptions: [],
          type: 'unconscious',
        },
        {
          exceptions: [],
          type: 'bleed',
        },
      ],
      speed: {
        otherSpeeds: [],
        value: 25,
      },
      weaknesses: [
        {
          type: 'vitality',
          value: 5,
        },
        {
          type: 'slashing',
          value: 5,
        },
      ],
    },
    details: {
      blurb: '',
      languages: {
        details: '',
        value: [],
      },
      level: {
        value: -1,
      },
      publicNotes: '<p>A zombie shambler is a slow-moving horror dangerous in larger groups.</p>',
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
      mod: 0,
      senses: [
        {
          type: 'darkvision',
        },
      ],
    },
    resources: {},
    saves: {
      fortitude: {
        saveDetail: '',
        value: 6,
      },
      reflex: {
        saveDetail: '',
        value: 0,
      },
      will: {
        saveDetail: '',
        value: 2,
      },
    },
    skills: {
      athletics: {
        base: 7,
      },
    },
    traits: {
      rarity: 'common',
      size: {
        value: 'med',
      },
      value: ['mindless', 'undead', 'unholy', 'zombie'],
    },
    level: {
      value: -1,
    },
    description: {
      value: '<p>A zombie shambler is a slow-moving horror dangerous in larger groups.</p>',
    },
    rules: [],
  },
};
