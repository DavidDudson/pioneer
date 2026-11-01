import { describe, expect, test } from 'bun:test';

import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContractRouter } from './contract-router';
import { RequestAuthenticator } from './request-authenticator';
import { RequestMemo } from './request-memo';
import { actingAs, FakeAuthenticator } from './testing/fake-authenticator';

const amiri = UserId.parse('4f1e6c1a-5d9b-4a3e-8c55-0a2f7d1b9e11');

const Whoami = new Endpoint({
  method: HttpMethod.Get,
  path: '/whoami',
  params: NoParams,
  query: NoQuery,
  body: NoBody,
  response: z.strictObject({ actor: z.string().optional() }),
});

/** An authenticator that fails in a way that is not a missing sign-in. */
class BrokenAuthenticator extends RequestAuthenticator {
  readonly #reason = 'session store is down';

  public override async actingUser(): Promise<UserId> {
    throw new Error(this.#reason);
  }
}

function app(auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('test').handleMaybeSignedIn(Whoami, auth, async ({ actor }) =>
    actor === undefined ? {} : { actor },
  ).app;
}

describe('ContractRouter.handleMaybeSignedIn', () => {
  test('hands the handler the signed-in user', async () => {
    const response = await app(new FakeAuthenticator()).handle(
      new Request('http://localhost/whoami', { headers: actingAs(amiri) }),
    );

    expect(await response.json()).toStrictEqual({ actor: amiri });
  });

  test('answers an anonymous request instead of refusing it', async () => {
    const response = await app(new FakeAuthenticator()).handle(new Request('http://localhost/whoami'));

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({});
  });

  test('still fails when authenticating fails for any other reason', async () => {
    const response = await app(new BrokenAuthenticator()).handle(new Request('http://localhost/whoami'));

    expect(response.status).toBe(500);
  });
});

const Reads = new Endpoint({
  method: HttpMethod.Get,
  path: '/reads',
  params: NoParams,
  query: NoQuery,
  body: NoBody,
  response: z.strictObject({ runs: z.number() }),
});

const Writes = new Endpoint({
  method: HttpMethod.Post,
  path: '/writes',
  params: NoParams,
  query: NoQuery,
  body: NoBody,
  response: z.strictObject({ runs: z.number() }),
});

/** A handler that asks the same memoised question twice and answers how often it was really asked. */
interface Asked {
  readonly runs: number;
}

function askingTwice(): () => Promise<Asked> {
  const memo = new RequestMemo<string, number>();
  let runs = 0;
  const read = async (): Promise<number> => {
    runs += 1;
    return runs;
  };
  return async () => {
    await memo.of('question', read);
    await memo.of('question', read);
    return { runs };
  };
}

describe('ContractRouter request scope', () => {
  test('answers a memoised read once within a GET', async () => {
    const ask = askingTwice();
    const router = new ContractRouter('test').handleSignedIn(Reads, new FakeAuthenticator(), ask).app;

    const response = await router.handle(new Request('http://localhost/reads', { headers: actingAs(amiri) }));

    expect(await response.json()).toStrictEqual({ runs: 1 });
  });

  test('reads every time within a POST, which may write between reads', async () => {
    const ask = askingTwice();
    const router = new ContractRouter('test').handleSignedIn(Writes, new FakeAuthenticator(), ask).app;

    const response = await router.handle(
      new Request('http://localhost/writes', { method: 'POST', headers: actingAs(amiri) }),
    );

    expect(await response.json()).toStrictEqual({ runs: 2 });
  });
});
