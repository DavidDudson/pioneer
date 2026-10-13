import { describe, expect, test } from 'bun:test';

import { InMemoryDependencyUsageDirectory, InMemoryPackEnablementDirectory } from '@pioneer/homebrew/application';
import { ContentPackId } from '@pioneer/rules/sdk';
import type { Problem } from '@pioneer/shared/kernel';

import {
  app,
  coreDependency,
  dependenciesPath,
  ezren,
  makePack,
  playerCore,
  request,
  shareWithAll,
  visibilityPath,
} from './testing/homebrew-route-fixtures';

describe('homebrew dependency routes', () => {
  interface DependenciesJson {
    readonly dependencies: readonly { readonly title: string; readonly official: boolean }[];
    readonly candidates: readonly { readonly title: string }[];
  }

  test('the owner adds and removes an official pack, and the lists follow', async () => {
    const api = app();
    const pack = await makePack(api);
    const before = await api.handle(request('GET', dependenciesPath(pack)));
    expect(((await before.json()) as DependenciesJson).candidates.map(({ title }) => title)).toStrictEqual([
      'Player Core',
    ]);
    const added = await api.handle(request('POST', dependenciesPath(pack), { body: coreDependency }));
    expect(added.status).toBe(200);
    const afterAdd = (await added.json()) as DependenciesJson;
    expect(afterAdd.dependencies).toMatchObject([{ title: 'Player Core', official: true }]);
    expect(afterAdd.candidates).toStrictEqual([]);
    const removed = await api.handle(request('DELETE', `${dependenciesPath(pack)}/${playerCore}`));
    expect(removed.status).toBe(200);
    expect(((await removed.json()) as DependenciesJson).dependencies).toStrictEqual([]);
  });

  test('a pack extending itself is 409', async () => {
    const api = app();
    const pack = await makePack(api);
    const response = await api.handle(request('POST', dependenciesPath(pack), { body: { dependsOn: pack.id } }));
    expect(response.status).toBe(409);
    expect(((await response.json()) as Problem).message).toStrictEqual({ key: 'homebrew.pack.dependsOnItself' });
  });

  test('removing a dependency that entries use is 409, naming them', async () => {
    const usage = new InMemoryDependencyUsageDirectory();
    const api = app(new InMemoryPackEnablementDirectory(), usage);
    const pack = await makePack(api);
    await api.handle(request('POST', dependenciesPath(pack), { body: coreDependency }));
    usage.use(ContentPackId.parse(pack.id), playerCore, 'Whirling Strike');
    const response = await api.handle(request('DELETE', `${dependenciesPath(pack)}/${playerCore}`));
    expect(response.status).toBe(409);
    expect(((await response.json()) as Problem).message).toStrictEqual({
      key: 'homebrew.pack.dependencyInUse',
      params: { entries: 'Whirling Strike' },
    });
  });

  test('someone who can read the pack but does not own it reads the list, and is 403 on changes', async () => {
    const api = app();
    const pack = await makePack(api);
    await api.handle(request('PATCH', visibilityPath(pack), { body: shareWithAll }));
    const read = await api.handle(request('GET', dependenciesPath(pack), { as: ezren }));
    expect(read.status).toBe(200);
    const add = await api.handle(request('POST', dependenciesPath(pack), { as: ezren, body: coreDependency }));
    const remove = await api.handle(request('DELETE', `${dependenciesPath(pack)}/${playerCore}`, { as: ezren }));
    expect([add.status, remove.status]).toStrictEqual([403, 403]);
  });

  test('a pack the actor cannot read is 404 for every route', async () => {
    const api = app();
    const pack = await makePack(api);
    const read = request('GET', dependenciesPath(pack), { as: ezren });
    const add = request('POST', dependenciesPath(pack), { as: ezren, body: coreDependency });
    const remove = request('DELETE', `${dependenciesPath(pack)}/${playerCore}`, { as: ezren });
    const responses = await Promise.all([read, add, remove].map(async (each) => api.handle(each)));
    expect(responses.map(({ status }) => status)).toStrictEqual([404, 404, 404]);
  });

  test('depending on another user’s private pack is 404', async () => {
    const api = app();
    const mine = await makePack(api);
    const theirs = await makePack(api, ezren, { title: 'Ezren spells', slug: 'ezren-spells' });
    const response = await api.handle(request('POST', dependenciesPath(mine), { body: { dependsOn: theirs.id } }));
    expect(response.status).toBe(404);
  });

  test('a body without a pack is 422', async () => {
    const api = app();
    const pack = await makePack(api);
    const response = await api.handle(request('POST', dependenciesPath(pack), { body: {} }));
    expect(response.status).toBe(422);
  });
});
