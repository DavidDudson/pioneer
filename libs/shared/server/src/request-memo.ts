import { AsyncLocalStorage } from 'node:async_hooks';

/** Identifies one scope; only its identity matters. */
type Scope = object;

const scopes = new AsyncLocalStorage<Scope>();

/**
 * Runs `read` in a new request scope: every `RequestMemo` read inside it, however deep, is answered once and shared.
 * Open one only around a read that writes nothing, since a memoised answer is not refreshed within the scope.
 */
export async function inRequestScope<Result>(read: () => Promise<Result>): Promise<Result> {
  return scopes.run({}, read);
}

/**
 * A read an adapter answers once per request scope. Outside a scope it reads every time, so writes and the routes that
 * open no scope behave as before. A failed read is shared too, so a retry within the scope fails the same way.
 */
export class RequestMemo<Key, Value> {
  readonly #byScope = new WeakMap<Scope, Map<Key, Promise<Value>>>();

  public async of(key: Key, read: () => Promise<Value>): Promise<Value> {
    const scope = scopes.getStore();
    if (scope === undefined) {
      return read();
    }
    const known = this.#byScope.get(scope) ?? new Map<Key, Promise<Value>>();
    this.#byScope.set(scope, known);
    const answer = known.get(key) ?? read();
    known.set(key, answer);
    return answer;
  }
}
