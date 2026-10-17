import type { DocumentFixture } from './import-fixtures';

/** A level 6 Monster Core humanoid as `pf2e-8.6.0` has it, trimmed to its statistics and first paragraph. */
export const AAPOPH_GRANITESCALE: DocumentFixture = {
  id: 'MXSKccQqbQqQ77Ii',
  name: 'Aapoph Granitescale',
  type: 'npc',
  pack: {
    name: 'pathfinder-monster-core',
    directory: 'pathfinder-monster-core',
  },
  system: {
    abilities: {
      cha: {
        mod: 1,
        value: 12,
      },
      con: {
        mod: 4,
        value: 18,
      },
      dex: {
        mod: 4,
        value: 18,
      },
      int: {
        mod: -1,
        value: 6,
      },
      str: {
        mod: 5,
        value: 20,
      },
      wis: {
        mod: 1,
        value: 12,
      },
    },
    attributes: {
      ac: {
        details: '(22 with shed scales)',
        value: 24,
      },
      allSaves: {
        value: '+2 status to Will vs. mental',
      },
      hp: {
        details: '',
        max: 120,
        temp: 0,
        value: 120,
      },
      resistances: [
        {
          doubleVs: [],
          exceptions: [],
          type: 'poison',
          value: 5,
        },
      ],
      speed: {
        otherSpeeds: [],
        value: 25,
      },
    },
    details: {
      blurb: '',
      languages: {
        details: 'Telepathy 100 feet',
        value: ['aklo', 'common', 'sakvroth'],
      },
      level: {
        value: 6,
      },
      publicNotes:
        '<p>The mutated aapophs dubbed granitescales have bulky frames covered in hard gray plates. These scales offer protection but shed when struck with too much force. Granitescales like to carve their shed scales into small chips and attach them as rattles to their spears.</p>',
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
      mod: 13,
      senses: [
        {
          type: 'darkvision',
        },
        {
          acuity: 'imprecise',
          range: 30,
          type: 'scent',
        },
      ],
    },
    resources: {},
    saves: {
      fortitude: {
        saveDetail: '',
        value: 16,
      },
      reflex: {
        saveDetail: '',
        value: 14,
      },
      will: {
        saveDetail: '',
        value: 11,
      },
    },
    skills: {
      acrobatics: {
        base: 14,
      },
      athletics: {
        base: 15,
      },
      intimidation: {
        base: 15,
      },
    },
    traits: {
      rarity: 'common',
      size: {
        value: 'med',
      },
      value: ['humanoid', 'mutant', 'serpentfolk'],
    },
    level: {
      value: 6,
    },
    description: {
      value:
        '<p>The mutated aapophs dubbed granitescales have bulky frames covered in hard gray plates. These scales offer protection but shed when struck with too much force. Granitescales like to carve their shed scales into small chips and attach them as rattles to their spears.</p>',
    },
    rules: [],
  },
};
