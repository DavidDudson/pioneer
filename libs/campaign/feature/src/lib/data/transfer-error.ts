import { ApiError } from '@pioneer/shared/web';

/** The status of a transfer that is not in the campaign, or not the viewer's to answer. */
const NOT_FOUND = 404;

/** A message key and its params, ready to translate. */
export interface TransferFailure {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/**
 * What to tell the viewer when an offer call fails: a 409 says why in the server's words (already answered, no room, the
 * giver's sheet changed), a 404 that the offer is gone, and anything else asks for a retry with `fallback`.
 */
export function transferFailure(error: unknown, fallback: string): TransferFailure {
  if (ApiError.isConflict(error)) {
    const { key, params } = ApiError.describe(error);
    return { key, params: params ?? {} };
  }
  if (error instanceof ApiError && error.status === NOT_FOUND) {
    return { key: 'campaign.transfers.notFound', params: {} };
  }
  return { key: fallback, params: {} };
}
