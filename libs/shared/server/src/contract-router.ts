import type { Endpoint } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import { z } from 'zod';

interface HandlerInput<TParams extends z.ZodObject, TBody extends z.ZodType, TQuery extends z.ZodObject> {
  readonly params: z.output<TParams>;
  readonly query: z.output<TQuery>;
  readonly body: z.output<TBody>;
  /** The raw request, for transport concerns such as the session cookie. */
  readonly request: Request;
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
    this.app.route(endpoint.method, endpoint.path, async ({ params, query, body, request }) => {
      // Elysia passes undefined params for routes without path params, despite its types.
      const pathParams: unknown = params;
      const output = await handler({
        params: endpoint.params.parse(pathParams ?? {}),
        query: endpoint.query.parse(query),
        body: endpoint.body.parse(body),
        request,
      });
      return z.encode(endpoint.response, output);
    });
    return this;
  }
}
