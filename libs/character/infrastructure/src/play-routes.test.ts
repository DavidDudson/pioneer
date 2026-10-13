import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository, PlayService } from '@pioneer/character/application';
import { CharacterName, CharacterPlay, FRESH_PLAY, PlayCommandField, untypedDamage } from '@pioneer/character/domain';
import { hitPointsContent, humanAncestryId } from '@pioneer/character/domain/testing';
import { DegreeOfSuccess, HitPoints } from '@pioneer/rules/sdk';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, nextVersion, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { playRoutes } from './play-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

/** The routes over a character Amiri owns. */
interface SetUp {
  /** The play routes alone. */
  readonly api: AnyElysia;
  /** Kyra's play path. */
  readonly path: string;
}

async function setUp(): Promise<SetUp> {
  const clock = fixedClock('2026-10-13T10:00:00Z');
  const content = fixedContent(hitPointsContent());
  const repository = new InMemoryCharacterRepository();
  const kyra = await new CharacterService(repository, content, clock).create(amiri, {
    name: CharacterName.parse('Kyra'),
    ancestry: humanAncestryId,
  });
  const service = new PlayService(repository, content, clock);
  const api = new Elysia().use(problemHandler).use(playRoutes(service, new FakeAuthenticator()));
  return { api, path: `/characters/${kyra.id}/play` };
}

interface Sent {
  /** The acting user; undefined sends none. */
  readonly as: UserId | undefined;
  readonly body?: unknown;
}

function request(method: string, path: string, { as, body }: Sent): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === undefined ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const DAMAGE = { field: PlayCommandField.Damage, damage: untypedDamage(HitPoints.parse(3)) };

describe('play routes', () => {
  test('full Hit Points, then damage taken at the next revision', async () => {
    const { api, path } = await setUp();
    const read = await api.handle(request('GET', path, { as: amiri }));
    const before = CharacterPlay.parse(await read.json());
    expect(before.play).toStrictEqual(FRESH_PLAY);

    const body = { expectedRevision: before.revision, command: DAMAGE };
    const patched = await api.handle(request('PATCH', path, { as: amiri, body }));
    expect(patched.status).toBe(200);
    const after = CharacterPlay.parse(await patched.json());
    expect(after.revision).toBe(nextVersion(before.revision));
    expect(after.play.hp.damage).toBe(HitPoints.parse(3));
  });

  test('a stale revision is a 409', async () => {
    const { api, path } = await setUp();
    const body = { expectedRevision: 1, command: DAMAGE };
    await api.handle(request('PATCH', path, { as: amiri, body }));
    const stale = await api.handle(request('PATCH', path, { as: amiri, body }));
    expect(stale.status).toBe(409);
  });

  test('an unknown command is refused', async () => {
    const { api, path } = await setUp();
    const body = { expectedRevision: 1, command: { field: 'resurrect' } };
    const response = await api.handle(request('PATCH', path, { as: amiri, body }));
    expect(response.status).toBe(422);
  });

  test('a recovery check with a degree of success is accepted, an unknown degree is refused', async () => {
    const { api, path } = await setUp();
    const command = { field: PlayCommandField.RecoveryCheck, degree: DegreeOfSuccess.Success };
    const accepted = await api.handle(request('PATCH', path, { as: amiri, body: { expectedRevision: 1, command } }));
    expect(accepted.status).toBe(200);
    const bad = { ...command, degree: 'triumph' };
    const refused = await api.handle(
      request('PATCH', path, { as: amiri, body: { expectedRevision: 2, command: bad } }),
    );
    expect(refused.status).toBe(422);
  });

  test("signed out is 401; someone else's character is 404", async () => {
    const { api, path } = await setUp();
    const signedOut = await api.handle(request('GET', path, { as: undefined }));
    expect(signedOut.status).toBe(401);
    const someoneElse = await api.handle(request('GET', path, { as: ezren }));
    expect(someoneElse.status).toBe(404);
    const body = { expectedRevision: 1, command: DAMAGE };
    const edit = await api.handle(request('PATCH', path, { as: ezren, body }));
    expect(edit.status).toBe(404);
  });
});
