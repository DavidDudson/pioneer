/** Ids and server responses shared by the key item panel's specs. */

export const id = '6b1f0c2e-8d4a-4e7b-9c3f-1a2b3c4d5e6f';
const gmId = '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d';
export const kyra = '4c1a7e3b-2d5f-4a8c-9e6b-7d1f0a3c5b92';
export const mordred = '5d2b8f4c-3e6a-4b9d-8f7c-8e2a1b4d6c03';
export const caliburn = '9a2b4c6d-1e3f-4a5b-8c7d-0e1f2a3b4c5d';
const longsword = '2b3c4d5e-6f70-4a81-92b3-c4d5e6f70819';
const flaming = '3c4d5e6f-7081-4b92-a3c4-d5e6f7081920';

export const gmMember = {
  id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10',
  userId: gmId,
  role: 'gm',
  joinedAt: '2026-10-10T10:00:00.000Z',
};
export const campaign = {
  id,
  version: 1,
  name: 'Abomination Vaults',
  gmId,
  members: [gmMember],
  createdAt: '2026-10-10T10:00:00.000Z',
};

function partyCharacter(characterId: string, name: string): object {
  return {
    characterId,
    name,
    level: 5,
    ownerId: gmId,
    ownerName: 'Ezren',
    attachedAt: '2026-10-11T10:00:00.000Z',
    vitals: { dying: 0, conditions: [] },
    detachable: false,
    archived: false,
  };
}

export const party = { characters: [partyCharacter(kyra, 'Kyra'), partyCharacter(mordred, 'Mordred')], attachable: [] };

/** Caliburn with six property runes, one more than the table allows, held by `holder` or the stash. */
export function keyItems(holder: 'kyra' | 'stash', manageable = true, owned = false): object {
  return {
    manageable,
    keyItems: [
      {
        id: caliburn,
        name: 'Caliburn',
        base: { item: longsword, name: 'Longsword' },
        runes: {
          potency: 3,
          property: ['Flaming', 'Frost', 'Shock', 'Corrosive', 'Ghost Touch', 'Grievous'].map((name) => ({
            rune: flaming,
            name,
          })),
        },
        notes: 'Drawn from the stone.',
        holderOwned: holder === 'kyra' && owned,
        ...(holder === 'kyra' ? { holder: kyra, holderName: 'Kyra' } : {}),
      },
    ],
  };
}
