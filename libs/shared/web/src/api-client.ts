import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { ProblemSchema } from '@pioneer/shared/kernel';
import type { Endpoint } from '@pioneer/shared/kernel';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

import { ApiError } from './api-error';
import { UNAUTHORIZED_HANDLER } from './unauthorized-handler';

/** Base URL every contract path is resolved against. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', { factory: (): string => '/api' });

interface CallInput<TParams extends z.ZodObject, TBody extends z.ZodType, TQuery extends z.ZodObject> {
  readonly params: z.output<TParams>;
  /** Omit for endpoints without a query; list endpoints fall back to their defaults. */
  readonly query?: z.output<TQuery>;
  readonly body: z.output<TBody>;
  /** True for calls that ask whether anyone is signed in, where a 401 is an answer, not a prompt. */
  readonly signedOutIsAnswer?: boolean;
}

/**
 * Calls a shared `Endpoint` contract. Encodes params/body through the
 * contract's codecs and decodes the response into domain classes, so feature
 * code never handles raw JSON. A 401 also goes to the `UNAUTHORIZED_HANDLER`,
 * so an expired session prompts sign-in wherever it is noticed.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = inject(API_BASE_URL);
  readonly #unauthorized = inject(UNAUTHORIZED_HANDLER, { optional: true });

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
        const failure = new ApiError(error.status, problem.success ? problem.data : undefined);
        if (failure.isUnauthorized && input.signedOutIsAnswer !== true) {
          await this.#promptSignIn();
        }
        throw failure;
      }
      throw error;
    }
  }

  /** Runs the unauthorized handler; the caller still gets the 401, whatever the prompt does. */
  async #promptSignIn(): Promise<void> {
    try {
      await this.#unauthorized?.();
    } catch {
      // A failed prompt (say, a cancelled navigation) must not replace the 401 the caller is owed.
    }
  }
}
