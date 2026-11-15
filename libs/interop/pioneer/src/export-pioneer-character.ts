import { CharacterDocumentSchema } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { ReferenceNamer } from './content-reference';
import { embeddedNamer, embeddedUsing } from './embedded-homebrew';
import type { EmbeddedPack } from './embedded-homebrew';
import { CURRENT_FORMAT_VERSION, PIONEER_CHARACTER_FORMAT, PioneerCharacterFile } from './pioneer-character-file';
import { FieldsSchema, isFields, isList, rewriteReferences } from './rewrite-references';
import type { Fields } from './rewrite-references';

export interface PioneerExported {
  readonly ok: true;
  readonly file: PioneerCharacterFile;
}

/** The ids the namer could not name: the character uses content that is not loaded, so a file would lose it. */
export interface PioneerExportFailure {
  readonly ok: false;
  readonly unnamed: readonly ContentId[];
}

export type PioneerExportResult = PioneerExported | PioneerExportFailure;

/** Fields that identify the character on this server; a file is imported as a new character, so it carries neither. */
const SERVER_FIELDS: ReadonlySet<string> = new Set(['id', 'ownerId']);

/** A campaign event that applied a condition exists only in its campaign, so a file leaves it out. */
function withoutCampaignEvents(inputs: Fields): Fields {
  const { play } = inputs;

  const conditions = isFields(play) ? play['conditions'] : undefined;

  if (!isFields(play) || !isList(conditions)) {
    return inputs;
  }

  return {
    ...inputs,
    play: {
      ...play,
      conditions: conditions.map((condition) => {
        if (!isFields(condition)) {
          return condition;
        }

        return Object.fromEntries(Object.entries(condition).filter(([key]) => key !== 'appliedBy'));
      }),
    },
  };
}

function portableInputs(document: CharacterDocument): Fields {
  // A file is JSON, which has no `undefined`: the round trip drops the fields an encoded document leaves absent.
  const json = JSON.stringify(z.encode(CharacterDocumentSchema, document));
  const encoded = FieldsSchema.parse(JSON.parse(json));
  const portable = Object.entries(encoded).filter(([key]) => !SERVER_FIELDS.has(key));

  return withoutCampaignEvents(Object.fromEntries(portable));
}

/**
 * The file for a character: its stored inputs with each content id replaced by the pack and slug that hash to it. An
 * id neither `loaded` nor `embedded` (homebrew the character uses, each entry carried in the file) can name fails the
 * export instead of writing a reference nothing could read back.
 */
export function exportPioneerCharacter(
  document: CharacterDocument,
  loaded: ReferenceNamer,
  embedded: readonly EmbeddedPack[] = [],
): PioneerExportResult {
  const unnamed = new Set<ContentId>();
  const used = new Set<ContentId>();
  const fromEmbedded = embeddedNamer(embedded);

  const character = rewriteReferences(portableInputs(document), (value) => {
    const id = ContentId.safeParse(value);

    if (!id.success) {
      return value;
    }

    const official = loaded(id.data);
    const reference = official ?? fromEmbedded(id.data);

    if (official === undefined && reference !== undefined) {
      used.add(id.data);
    }

    if (reference === undefined) {
      unnamed.add(id.data);

      return value;
    }

    return reference;
  });

  if (unnamed.size > 0) {
    return { ok: false, unnamed: [...unnamed] };
  }

  const homebrew = embeddedUsing(embedded, used);

  const envelope = {
    format: PIONEER_CHARACTER_FORMAT,
    formatVersion: CURRENT_FORMAT_VERSION,
    character,
  };

  const file = PioneerCharacterFile.parse(homebrew.length === 0 ? envelope : { ...envelope, homebrew });

  return { ok: true, file };
}
