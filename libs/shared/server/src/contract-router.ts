import type { Endpoint, UserId } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import type { Context } from 'elysia';
import { z } from 'zod';

import type { RequestAuthenticator, RequestExchange } from './request-authenticator';

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
      const output = await handler(decode(endpoint, context));
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
      const output = await handler({ ...decode(endpoint, context), actor });
      return z.encode(endpoint.response, output);
    });
    return this;
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
