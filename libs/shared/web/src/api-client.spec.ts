import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Endpoint, HttpMethod, NoBody } from '@pioneer/shared/kernel';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ApiClient } from './api-client';
import { ApiError } from './api-error';

const getThing = new Endpoint({
  method: HttpMethod.Get,
  path: '/things/:id',
  params: z.object({ id: z.string() }),
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
