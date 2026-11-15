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

/** Like `rejection`, for a promise that must reject with an `Error`, so the test can read its `cause`. */
export async function errorRejection(promise: Promise<unknown>): Promise<Error> {
  const error = await rejection(promise);

  if (!(error instanceof Error)) {
    throw new TypeError(`Expected the promise to reject with an Error, but it rejected with ${String(error)}`);
  }

  return error;
}
