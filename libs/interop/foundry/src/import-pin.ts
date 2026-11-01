import * as z from 'zod';

import { BacklogItem } from './import-backlog';

/**
 * A pack's Foundry pin (ADR-0031): the foundryvtt/pf2e release tag it is imported from and the SHA-256 of that
 * tag's source archive. Committed in `content/import/<pack>.json` beside the pack's backlog; moving the pin is a
 * PR that changes both together.
 */

/**
 * A pf2e system release tag, `[pf2e-]<major>.<minor>.<patch>`, as foundryvtt/pf2e tags its releases (before 6.0 they
 * carry no prefix).
 */
export const FoundryReleaseTag = z
  .string()
  .regex(/^(?:pf2e-)?\d+\.\d+\.\d+$/u)
  .brand<'FoundryReleaseTag'>();
export type FoundryReleaseTag = z.infer<typeof FoundryReleaseTag>;

/** A SHA-256 digest as 64 lowercase hex digits. */
export const Sha256 = z
  .string()
  .regex(/^[\da-f]{64}$/u)
  .brand<'Sha256'>();
export type Sha256 = z.infer<typeof Sha256>;

export const ImportPin = z.strictObject({
  tag: FoundryReleaseTag,
  sha256: Sha256,
});
export type ImportPin = z.infer<typeof ImportPin>;

const BACKLOG_MAX = 100_000;

/** `content/import/<pack>.json`: the pin and the pack's backlog, which pack output writes (`importBacklog`). */
export const ImportFile = z.strictObject({
  pin: ImportPin,
  backlog: z.array(BacklogItem).max(BACKLOG_MAX).readonly(),
});
export type ImportFile = z.infer<typeof ImportFile>;

/** Where GitHub serves the source archive of a release tag. */
export function archiveUrl(tag: FoundryReleaseTag): string {
  return `https://github.com/foundryvtt/pf2e/archive/refs/tags/${tag}.tar.gz`;
}

const HEX_RADIX = 16;
const BYTE_HEX_DIGITS = 2;

export async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<Sha256> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(HEX_RADIX).padStart(BYTE_HEX_DIGITS, '0'));
  return Sha256.parse(hex.join(''));
}
