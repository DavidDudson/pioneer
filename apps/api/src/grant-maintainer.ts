import { UserId, UserRole } from '@pioneer/identity/domain';
import { users } from '@pioneer/identity/infrastructure';
import { eq } from 'drizzle-orm';

import type { Database } from './database';

/**
 * Makes an account a maintainer, who may triage bug reports. The role is granted here, from the command line, and
 * never by a request, so nothing a signed-in user sends can raise it. Returns whether the account exists.
 */
export async function grantMaintainer(db: Database, id: string): Promise<boolean> {
  const granted = await db
    .update(users)
    .set({ role: UserRole.Maintainer })
    .where(eq(users.id, UserId.parse(id)))
    .returning({ id: users.id });
  return granted.length > 0;
}
