import type { SenseInPlay } from '@pioneer/rules/engine';
import { ContentId, contentId, EntrySlug, Feet, Origin, PackId, SenseAcuity } from '@pioneer/rules/sdk';

const PLAYER_CORE = PackId.parse('player-core');
const SCENT_RANGE = Feet.parse(30);

export const DARKVISION = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('sense:darkvision')));
const SCENT = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('sense:scent')));
const DWARF = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('ancestry:dwarf')));
const PLANT_FORM = ContentId.parse(contentId(PLAYER_CORE, EntrySlug.parse('spell:plant-form')));

/** Display names for the fixtures' senses and the entries they come from, as a container resolves them. */
export const SENSE_NAMES: ReadonlyMap<ContentId, string> = new Map([
  [DARKVISION, 'Darkvision'],
  [SCENT, 'Scent'],
  [DWARF, 'Dwarf'],
  [PLANT_FORM, 'Plant Form'],
]);

function origin(entry: ContentId): Origin {
  return Origin.parse({ hops: [], entry, sources: [{ kind: 'book', book: 'player-core', page: 1 }] });
}

/** A dwarf's own senses: precise darkvision from the ancestry. */
export const DWARF_SENSES: readonly SenseInPlay[] = [
  { sense: DARKVISION, acuity: SenseAcuity.Precise, origins: [origin(DWARF)] },
];

/** The senses a form lists, which replace the character's: imprecise scent out to 30 feet. */
export const FORM_SENSES: readonly SenseInPlay[] = [
  { sense: SCENT, acuity: SenseAcuity.Imprecise, range: SCENT_RANGE, origins: [origin(PLANT_FORM)], fromForm: true },
];
