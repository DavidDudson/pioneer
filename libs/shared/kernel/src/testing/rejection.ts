/**
 * Await a promise that must reject and return what it rejected with, so the
 * test can assert on it with ordinary matchers:
 *
 * ```ts
 * expect(await rejection(service.get(id))).toBeInstanceOf(NotFoundError);
 * ```
 */
export async function rejection<TResult>(promise: Promise<TResult>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }

  throw new Error('Expected the promise to reject, but it resolved');
}
