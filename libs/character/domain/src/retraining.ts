import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import { retrainDaysFor, RetrainProgress } from './retraining-fields';
import type { RetrainDays, RetrainingProject } from './retraining-fields';
import type { RetrainingPatch } from './retraining-patch';
import { withSelection } from './slot-selection';

const NO_DAYS = RetrainProgress.parse(0);

/** The document without its retraining project. */
function withoutProject(document: CharacterDocument): CharacterDocument {
  const { retraining: _done, ...build } = document.build;

  return { ...document, build };
}

/** The project in `document`; asking for one it has not got is a caller's bug. */
function projectOf(document: CharacterDocument): RetrainingProject {
  const { retraining } = document.build;

  if (retraining === undefined) {
    throw new TypeError('The character is not retraining anything');
  }

  return retraining;
}

/**
 * The document with `days` more days worked on its project. The last day swaps the pick in the slot for the one
 * retrained to, with no repertoire swap counted, and ends the project.
 */
function worked(document: CharacterDocument, days: RetrainDays): CharacterDocument {
  const project = projectOf(document);
  const done = Math.min(project.daysNeeded, project.daysDone + days);

  if (done < project.daysNeeded) {
    return {
      ...document,
      build: { ...document.build, retraining: { ...project, daysDone: RetrainProgress.parse(done) } },
    };
  }

  return withSelection(withoutProject(document), { slot: project.slot, value: project.to, countsAsSwap: false });
}

/** The document with the retraining edit `patch` made. */
export function withRetrainingEdit(document: CharacterDocument, patch: RetrainingPatch): CharacterDocument {
  switch (patch.field) {
    case CharacterPatchField.StartRetraining: {
      const daysNeeded = retrainDaysFor(patch.slot);

      if (daysNeeded === undefined || document.build.retraining !== undefined) {
        throw new TypeError(`Retraining ${patch.slot} is not allowed`);
      }

      const retraining = { slot: patch.slot, to: patch.to, daysNeeded, daysDone: NO_DAYS };

      return { ...document, build: { ...document.build, retraining } };
    }

    case CharacterPatchField.WorkRetraining: {
      return worked(document, patch.days);
    }

    case CharacterPatchField.CancelRetraining: {
      return withoutProject(document);
    }

    default: {
      const unreachable: never = patch;
      throw new TypeError(`Unhandled retraining edit: ${JSON.stringify(unreachable)}`);
    }
  }
}
