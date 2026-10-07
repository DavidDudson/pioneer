import type { Endpoint } from '@pioneer/shared/kernel';
import { Elysia } from 'elysia';
import { z } from 'zod';

interface HandlerInput<TParams extends z.ZodObject, TBody extends z.ZodType> {
  readonly params: z.output<TParams>;
  readonly body: z.output<TBody>;
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

  public handle<TParams extends z.ZodObject, TBody extends z.ZodType, TResponse extends z.ZodType>(
    endpoint: Endpoint<TParams, TBody, TResponse>,
    handler: (input: HandlerInput<TParams, TBody>) => Promise<z.output<TResponse>>,
  ): this {
    this.app.route(endpoint.method, endpoint.path, async ({ params, body }) => {
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- Elysia passes undefined params for routes without path params, despite its types.
      const output = await handler({ params: endpoint.params.parse(params ?? {}), body: endpoint.body.parse(body) });
      return z.encode(endpoint.response, output);
    });
    return this;
  }
}
