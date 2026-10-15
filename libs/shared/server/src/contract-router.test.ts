import { describe, expect, test } from 'bun:test';

import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery, UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContractRouter } from './contract-router';
import { RequestAuthenticator } from './request-authenticator';
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
