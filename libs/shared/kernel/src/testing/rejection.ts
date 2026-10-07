/**
 * Await a promise that must reject and return what it rejected with, so the
 * test can assert on it with ordinary matchers:
 *
 * ```ts
 * expect(await rejection(service.get(id))).toBeInstanceOf(NotFoundError);
 * ```
 */
export async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    return error;
  }
  throw new Error('Expected the promise to reject, but it resolved');
}
