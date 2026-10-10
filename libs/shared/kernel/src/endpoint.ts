import * as z from 'zod';

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
/** Schema for endpoints that take no query string. Strict: unknown parameters are rejected. */
export const NoQuery = z.strictObject({});
/** Schema for endpoints that take no request body. */
export const NoBody = z.undefined();

interface EndpointDefinition<
  TParams extends z.ZodObject,
  TBody extends z.ZodType,
  TResponse extends z.ZodType,
  TQuery extends z.ZodObject,
> {
  readonly method: HttpMethod;
  /** Express-style path, e.g. `/characters/:id`. Every `:name` must exist in `params`. */
  readonly path: string;
  readonly params: TParams;
  /** Query-string schema; use `listQuery` for list endpoints, `NoQuery` otherwise. */
  readonly query: TQuery;
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
  TQuery extends z.ZodObject = z.ZodObject,
> {
  public readonly method: HttpMethod;
  public readonly path: string;
  public readonly params: TParams;
  public readonly query: TQuery;
  public readonly body: TBody;
  public readonly response: TResponse;

  public constructor(definition: EndpointDefinition<TParams, TBody, TResponse, TQuery>) {
    this.method = definition.method;
    this.path = definition.path;
    this.params = definition.params;
    this.query = definition.query;
    this.body = definition.body;
    this.response = definition.response;
  }

  /** Resolve the path with encoded params and query, e.g. `/characters?sort=name`. */
  public url(params: z.output<TParams>, query?: z.output<TQuery>): string {
    const wire: Readonly<Record<string, unknown>> = z.encode(this.params, params);
    const path = this.path.replaceAll(/:(?<name>\w+)/gu, (_match, name: string) => {
      const value = wire[name];
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new TypeError(`Missing path param "${name}" for ${this.path}`);
      }
      return encodeURIComponent(String(value));
    });
    if (query === undefined) {
      return path;
    }
    const encoded: Readonly<Record<string, unknown>> = z.encode(this.query, query);
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(encoded)) {
      if (typeof value === 'string' || typeof value === 'number') {
        search.append(key, String(value));
      }
    }
    const queryString = search.toString();
    return queryString === '' ? path : `${path}?${queryString}`;
  }
}

export type EndpointParams<TEndpoint> = TEndpoint extends Endpoint<infer TParams> ? z.output<TParams> : never;
export type EndpointBody<TEndpoint> = TEndpoint extends Endpoint<z.ZodObject, infer TBody> ? z.output<TBody> : never;
export type EndpointQuery<TEndpoint> =
  TEndpoint extends Endpoint<z.ZodObject, z.ZodType, z.ZodType, infer TQuery> ? z.output<TQuery> : never;
export type EndpointResponse<TEndpoint> =
  TEndpoint extends Endpoint<z.ZodObject, z.ZodType, infer TResponse> ? z.output<TResponse> : never;
