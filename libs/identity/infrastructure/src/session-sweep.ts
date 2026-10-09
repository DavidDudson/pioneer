import type { IdentityService } from '@pioneer/identity/application';
import type { Milliseconds } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';

/** One sweep. Never rejects: a failure is logged and the next tick tries again. */
async function sweepOnce(service: IdentityService): Promise<void> {
  try {
    await service.sweepExpired();
  } catch (error: unknown) {
    console.error('session sweep failed', error);
  }
}

/** Runs the sweep on an interval between server start and stop. */
class Sweeper {
  #timer: Timer | undefined = undefined;

  public start(service: IdentityService, every: Milliseconds): void {
    // oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return -- sweepOnce catches and logs every error, so it never rejects
    this.#timer = setInterval(sweepOnce, every, service);
  }

  public stop(): void {
    clearInterval(this.#timer);
  }
}

/**
 * Deletes expired sessions every `every` while the server runs. Expired sessions already fail to
 * authenticate; this only reclaims their rows. Safe to run on several instances at once.
 */
export function sessionSweep(service: IdentityService, every: Milliseconds): Elysia {
  const sweeper = new Sweeper();
  return new Elysia({ name: 'session-sweep' })
    .onStart(() => {
      sweeper.start(service, every);
    })
    .onStop(() => {
      sweeper.stop();
    });
}
