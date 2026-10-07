import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { ProblemSchema } from '@pioneer/shared/kernel';
import type { Endpoint } from '@pioneer/shared/kernel';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

import { ApiError } from './api-error';

/** Base URL every contract path is resolved against. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', { factory: (): string => '/api' });

interface CallInput<TParams extends z.ZodObject, TBody extends z.ZodType, TQuery extends z.ZodObject> {
  readonly params: z.output<TParams>;
  /** Omit for endpoints without a query; list endpoints fall back to their defaults. */
  readonly query?: z.output<TQuery>;
  readonly body: z.output<TBody>;
}

/**
 * Calls a shared `Endpoint` contract. Encodes params/body through the
 * contract's codecs and decodes the response into domain classes, so feature
 * code never handles raw JSON.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);

  public async call<
    TParams extends z.ZodObject,
    TBody extends z.ZodType,
    TResponse extends z.ZodType,
    TQuery extends z.ZodObject,
  >(
    endpoint: Endpoint<TParams, TBody, TResponse, TQuery>,
    input: CallInput<TParams, TBody, TQuery>,
  ): Promise<z.output<TResponse>> {
    try {
      const body: unknown = z.encode(endpoint.body, input.body);
      const response = await firstValueFrom(
        this.#http.request<unknown>(endpoint.method, `${this.#baseUrl}${endpoint.url(input.params, input.query)}`, {
          body,
        }),
      );
      return endpoint.response.parse(response);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const problem = ProblemSchema.safeParse(error.error);
        throw new ApiError(error.status, problem.success ? problem.data : undefined);
      }
      throw error;
    }
  }
}
