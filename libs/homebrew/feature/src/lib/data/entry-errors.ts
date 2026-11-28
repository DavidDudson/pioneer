import type { TranslocoService } from '@jsverse/transloco';
import { HttpStatus } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';

/**
 * The server's own reason when it gave one the author can act on (a taken slug, a name with no letters, a kind that
 * cannot be started), else the general failure.
 */
export function describeEntryError(i18n: TranslocoService, error: Error, fallbackKey: string): string {
  if (error instanceof ApiError) {
    const [issue] = error.issues;

    if (issue !== undefined) {
      return i18n.translate(issue.message.key, issue.message.params);
    }

    if (error.isConflict || error.status === HttpStatus.UnprocessableContent) {
      return i18n.translate(error.descriptor.key, error.descriptor.params);
    }
  }

  return i18n.translate(fallbackKey);
}
