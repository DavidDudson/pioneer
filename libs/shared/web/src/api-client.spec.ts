import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Endpoint, HttpMethod, NoBody, NoQuery } from '@pioneer/shared/kernel';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { z } from 'zod';

import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { UNAUTHORIZED_HANDLER } from './unauthorized-handler';
import type { UnauthorizedHandler } from './unauthorized-handler';

const getThing = new Endpoint({
  method: HttpMethod.Get,
  path: '/things/:id',
  params: z.object({ id: z.string() }),
  query: NoQuery,
  body: NoBody,
  response: z.object({ count: z.number() }),
});

describe(ApiClient, () => {
  let client: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    client = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  it('resolves the url and decodes the response', async () => {
    const pending = client.call(getThing, { params: { id: 'a b' }, body: undefined });
    http.expectOne({ method: 'GET', url: '/api/things/a%20b' }).flush({ count: 2 });
    await expect(pending).resolves.toStrictEqual({ count: 2 });
  });

  it('maps a 409 problem to a conflict ApiError', async () => {
    const pending = client.call(getThing, { params: { id: 'x' }, body: undefined });
    http
      .expectOne('/api/things/x')
      .flush({ type: 'version-conflict', title: 'Changed', status: 409 }, { status: 409, statusText: 'Conflict' });
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isConflict(error));
  });
});

describe('ApiClient on a 401', () => {
  const unauthorized = {
    type: 'unauthorized',
    title: 'Unauthorized',
    status: 401,
    message: { key: 'problem.unauthorized' },
  };
  let client: ApiClient;
  let http: HttpTestingController;
  let handler: Mock<UnauthorizedHandler>;

  beforeEach(() => {
    handler = vi.fn<UnauthorizedHandler>(async () => {});
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UNAUTHORIZED_HANDLER, useValue: handler },
      ],
    });
    client = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  it('tells the unauthorized handler, then fails', async () => {
    const pending = client.call(getThing, { params: { id: 'x' }, body: undefined });
    http.expectOne('/api/things/x').flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isUnauthorized(error));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('leaves the handler out when signed out is an answer', async () => {
    const pending = client.call(getThing, { params: { id: 'x' }, body: undefined, signedOutIsAnswer: true });
    http.expectOne('/api/things/x').flush(unauthorized, { status: 401, statusText: 'Unauthorized' });
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isUnauthorized(error));
    expect(handler).not.toHaveBeenCalled();
  });

  it('leaves the handler out for other failures', async () => {
    const pending = client.call(getThing, { params: { id: 'x' }, body: undefined });
    http
      .expectOne('/api/things/x')
      .flush({ type: 'version-conflict', title: 'Changed', status: 409 }, { status: 409, statusText: 'Conflict' });
    await expect(pending).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('ApiClient when the unauthorized handler fails', () => {
  it('still rejects with the 401', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: UNAUTHORIZED_HANDLER,
          useValue: async (): Promise<void> => {
            throw new Error('navigation cancelled');
          },
        },
      ],
    });
    const pending = TestBed.inject(ApiClient).call(getThing, { params: { id: 'x' }, body: undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/things/x')
      .flush(
        { type: 'unauthorized', title: 'Unauthorized', status: 401, message: { key: 'problem.unauthorized' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    await expect(pending).rejects.toSatisfy((error: unknown) => ApiError.isUnauthorized(error));
  });
});
