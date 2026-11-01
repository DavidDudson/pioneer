import { HttpMethod, UnauthorizedError } from '@pioneer/shared/kernel';
import type { Endpoint, UserId } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import type { Context } from 'elysia';
import * as z from 'zod';

import type { RequestAuthenticator, RequestExchange } from './request-authenticator';
import { inRequestScope } from './request-memo';

interface HandlerInput<
  TParams extends z.ZodObject,
  TBody extends z.ZodType,
  TQuery extends z.ZodObject,
> extends RequestExchange {
  readonly params: z.output<TParams>;
  readonly query: z.output<TQuery>;
  readonly body: z.output<TBody>;
}

/** Input to a handler that needs a signed-in user: the decoded request plus who sent it. */
interface SignedInHandlerInput<
  TParams extends z.ZodObject,
  TBody extends z.ZodType,
  TQuery extends z.ZodObject,
> extends HandlerInput<TParams, TBody, TQuery> {
  readonly actor: UserId;
}

/** Input to a handler open to anyone: the decoded request plus who sent it, when anyone is signed in. */
interface MaybeSignedInHandlerInput<
  TParams extends z.ZodObject,
  TBody extends z.ZodType,
  TQuery extends z.ZodObject,
> extends HandlerInput<TParams, TBody, TQuery> {
  readonly actor: UserId | undefined;
}

/**
 * Binds shared `Endpoint` contracts to Elysia. Params and body are decoded
 * through the contract's codecs (so handlers receive domain classes), and the
 * handler's result is encoded back to wire JSON. Handlers never see raw input.
 */
export class ContractRouter {
  public readonly app: Elysia;

  public constructor(name: string) {
    this.app = new Elysia({ name });
  }

  public handle<
    TParams extends z.ZodObject,
    TBody extends z.ZodType,
    TResponse extends z.ZodType,
    TQuery extends z.ZodObject,
  >(
    endpoint: Endpoint<TParams, TBody, TResponse, TQuery>,
    handler: (input: HandlerInput<TParams, TBody, TQuery>) => Promise<z.output<TResponse>>,
  ): this {
    this.app.route(endpoint.method, endpoint.path, async (context) => {
      const output = await readScoped(endpoint, async () => handler(decode(endpoint, context)));
      return z.encode(endpoint.response, output);
    });
    return this;
  }

  /**
   * Like `handle`, for endpoints that need a signed-in user. The request is authenticated before
   * anything is decoded, so an anonymous request is always a 401, never a 422 about its input.
   */
  public handleSignedIn<
    TParams extends z.ZodObject,
    TBody extends z.ZodType,
    TResponse extends z.ZodType,
    TQuery extends z.ZodObject,
  >(
    endpoint: Endpoint<TParams, TBody, TResponse, TQuery>,
    auth: RequestAuthenticator,
    handler: (input: SignedInHandlerInput<TParams, TBody, TQuery>) => Promise<z.output<TResponse>>,
  ): this {
    this.app.route(endpoint.method, endpoint.path, async (context) => {
      const actor = await auth.actingUser({ request: context.request, responseHeaders: context.set.headers });
      const output = await readScoped(endpoint, async () => handler({ ...decode(endpoint, context), actor }));
      return z.encode(endpoint.response, output);
    });
    return this;
  }

  /**
   * Like `handle`, for endpoints open to anyone that answer a signed-in user more fully: `actor` is the user behind the
   * request, or undefined when there is none. Only a missing sign-in is tolerated; any other failure still fails.
   */
  public handleMaybeSignedIn<
    TParams extends z.ZodObject,
    TBody extends z.ZodType,
    TResponse extends z.ZodType,
    TQuery extends z.ZodObject,
  >(
    endpoint: Endpoint<TParams, TBody, TResponse, TQuery>,
    auth: RequestAuthenticator,
    handler: (input: MaybeSignedInHandlerInput<TParams, TBody, TQuery>) => Promise<z.output<TResponse>>,
  ): this {
    this.app.route(endpoint.method, endpoint.path, async (context) => {
      const actor = await actingUserOrNone(auth, {
        request: context.request,
        responseHeaders: context.set.headers,
      });
      const output = await readScoped(endpoint, async () => handler({ ...decode(endpoint, context), actor }));
      return z.encode(endpoint.response, output);
    });
    return this;
  }
}

/**
 * Runs a handler, in a request scope when the endpoint is a GET, so an adapter's `RequestMemo` reads answer once per
 * request. Only reads get one: a write handler that read, wrote and read again would be served the first answer.
 */
async function readScoped<Result>(endpoint: Endpoint, run: () => Promise<Result>): Promise<Result> {
  return endpoint.method === HttpMethod.Get ? inRequestScope(run) : run();
}

/** The signed-in user behind `exchange`, or undefined when the request carries no valid sign-in. */
async function actingUserOrNone(auth: RequestAuthenticator, exchange: RequestExchange): Promise<UserId | undefined> {
  try {
    return await auth.actingUser(exchange);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return undefined;
    }
    throw error;
  }
}

/** The request decoded through the endpoint's codecs. */
function decode<TParams extends z.ZodObject, TBody extends z.ZodType, TQuery extends z.ZodObject>(
  endpoint: Endpoint<TParams, TBody, z.ZodType, TQuery>,
  { params, query, body, request, set }: Context,
): HandlerInput<TParams, TBody, TQuery> {
  // Elysia passes undefined params for routes without path params, despite its types.
  const pathParams: unknown = params;
  return {
    params: endpoint.params.parse(pathParams ?? {}),
    query: endpoint.query.parse(query),
    body: endpoint.body.parse(body),
    request,
    responseHeaders: set.headers,
  };
}
