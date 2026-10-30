import type { PartyCharacter } from '@pioneer/campaign/domain';
import { tableSchema } from '@pioneer/frontier/data';
import type { PickerSort, TableColumn } from '@pioneer/frontier/data';

/** Reads a message key in the active language. */
type Say = (key: string) => string;

/** The picker's columns: who, and how far along. */
export function recipientColumns(say: Say): readonly TableColumn<PartyCharacter>[] {
  return tableSchema<PartyCharacter>()
    .addText({ id: 'name', header: say('campaign.transfers.recipientName'), value: (row) => row.name })
    .addText({ id: 'level', header: say('campaign.transfers.recipientLevel'), value: (row) => row.level })
    .build();
}

/** How two characters order by the column asked for: level, else equal (the name breaks the tie). */
function byColumn(left: PartyCharacter, right: PartyCharacter, sort: PickerSort): number {
  return sort.column === 'level' ? left.level - right.level : 0;
}

export const recipientValue = (row: PartyCharacter): string => row.characterId;
export const recipientLabel = (row: PartyCharacter): string => row.name;

/** Who may receive an offer: the party, the giver left out, the search typed and the order asked for. */
interface RecipientSearch {
  readonly party: readonly PartyCharacter[];
  readonly giver: string;
  readonly search: string;
  readonly sort: PickerSort | undefined;
}

/** The other live characters of the party whose name holds the search, in the order asked for. */
export function otherRecipients({ party, giver, search, sort }: RecipientSearch): readonly PartyCharacter[] {
  const needle = search.trim().toLocaleLowerCase();
  const others = party.filter(
    (each) => each.characterId !== giver && !each.archived && each.name.toLocaleLowerCase().includes(needle),
  );
  if (sort === undefined) {
    return others;
  }
  return others.toSorted((left, right) => {
    const compared = byColumn(left, right, sort) || left.name.localeCompare(right.name);
    return sort.descending ? -compared : compared;
  });
}
