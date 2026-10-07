import { z } from 'zod';

import type { ValueOf } from './value-of';

export const HttpMethod = {
  Get: 'GET',
  Post: 'POST',
  Patch: 'PATCH',
  Delete: 'DELETE',
} as const;
export type HttpMethod = ValueOf<typeof HttpMethod>;

/** Schema for endpoints that take no path params. */
export const NoParams = z.object({});
/** Schema for endpoints that take no request body. */
export const NoBody = z.undefined();

interface EndpointDefinition<TParams extends z.ZodObject, TBody extends z.ZodType, TResponse extends z.ZodType> {
  readonly method: HttpMethod;
  /** Express-style path, e.g. `/characters/:id`. Every `:name` must exist in `params`. */
  readonly path: string;
  readonly params: TParams;
  readonly body: TBody;
  readonly response: TResponse;
}

/**
 * One HTTP endpoint described once and shared by server and client. Schemas
 * are usually codecs: the wire side is JSON, the decoded side is a domain
 * class. The server decodes params/body and encodes the response; the client
 * does the reverse.
 */
export class Endpoint<
  TParams extends z.ZodObject = z.ZodObject,
  TBody extends z.ZodType = z.ZodType,
  TResponse extends z.ZodType = z.ZodType,
> {
  public readonly method: HttpMethod;
  public readonly path: string;
  public readonly params: TParams;
  public readonly body: TBody;
  public readonly response: TResponse;

  public constructor(definition: EndpointDefinition<TParams, TBody, TResponse>) {
    this.method = definition.method;
    this.path = definition.path;
    this.params = definition.params;
    this.body = definition.body;
    this.response = definition.response;
  }

  /** Resolve the path with encoded params, e.g. `/characters/0f3c…`. */
  public url(params: z.output<TParams>): string {
    const wire: Readonly<Record<string, unknown>> = z.encode(this.params, params);
    return this.path.replaceAll(/:(?<name>\w+)/gu, (_match, name: string) => {
      const value = wire[name];
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new TypeError(`Missing path param "${name}" for ${this.path}`);
      }
      return encodeURIComponent(String(value));
    });
  }
}

export type EndpointParams<TEndpoint> = TEndpoint extends Endpoint<infer TParams> ? z.output<TParams> : never;
export type EndpointBody<TEndpoint> = TEndpoint extends Endpoint<z.ZodObject, infer TBody> ? z.output<TBody> : never;
export type EndpointResponse<TEndpoint> =
  TEndpoint extends Endpoint<z.ZodObject, z.ZodType, infer TResponse> ? z.output<TResponse> : never;
