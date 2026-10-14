/** The example the tool opens on: a basic action, a trained-only skill action and one that needs a raised shield. */
export const EXAMPLE_ACTIONS = JSON.stringify(
  {
    actions: [
      { id: '00000000-0000-4000-8000-000000000001', name: 'Stride', action: { cost: 'one' } },
      {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Pick a Lock',
        origin: 'skill',
        action: { cost: 'two', skills: ['skill:thievery'], minimumProficiency: 'trained' },
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Shield Block',
        action: { cost: 'reaction', trigger: [], requirements: ['self:effect:raised-shield'] },
      },
      {
        id: '00000000-0000-4000-8000-000000000004',
        name: 'Long-Term Rest',
        action: { modes: ['downtime'] },
      },
    ],
    ranks: [{ skill: 'skill:athletics', rank: 'trained' }],
    spent: [],
  },
  null,
  2,
);
