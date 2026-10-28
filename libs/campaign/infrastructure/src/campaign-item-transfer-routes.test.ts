import { describe, expect, test } from 'bun:test';

import { newId, UserId } from '@pioneer/shared/kernel';

import {
  amiri,
  caliburn,
  campaign,
  ezren,
  json,
  kyra,
  longsword,
  mordred,
  offered,
  request,
  table,
  Answer,
} from './testing/transfer-route-fixtures';

describe('item transfer routes', () => {
  test('a player offers a line of their character to another, and it comes back pending', async () => {
    const handler = table();
    const id = await campaign(handler);

    const response = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/items`, {
        as: ezren,
        body: { from: kyra, to: mordred, item: longsword },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ from: kyra, to: mordred, item: longsword, status: 'pending' });
  });

  test('a signed-out caller gets 401, a stranger to the campaign 404, and a key item 409', async () => {
    const handler = table();
    const id = await campaign(handler);
    const body = { from: kyra, to: mordred, item: longsword };

    const anonymous = await handler.handle(request('POST', `/campaigns/${id}/transfers/items`, { body }));
    const outsider = UserId.parse(newId());
    const stranger = await handler.handle(request('POST', `/campaigns/${id}/transfers/items`, { as: outsider, body }));
    const key = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/items`, {
        as: ezren,
        body: { from: kyra, to: mordred, item: caliburn },
      }),
    );

    expect([anonymous.status, stranger.status, key.status]).toStrictEqual([401, 404, 409]);
  });

  test('a body that is not an offer is refused', async () => {
    const handler = table();
    const id = await campaign(handler);

    const response = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/items`, { as: ezren, body: { from: kyra } }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});

describe('coin transfer routes', () => {
  test('a player offers coins of their character to another, and it comes back pending', async () => {
    const handler = table();
    const id = await campaign(handler);

    const response = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/coins`, {
        as: ezren,
        body: { from: kyra, to: mordred, coins: { gp: 4 } },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      from: kyra,
      to: mordred,
      coins: { pp: 0, gp: 4, sp: 0, cp: 0 },
      status: 'pending',
    });
  });

  test('a signed-out caller gets 401, a stranger to the campaign 404, and a short purse 409', async () => {
    const handler = table();
    const id = await campaign(handler);
    const body = { from: kyra, to: mordred, coins: { gp: 4 } };

    const anonymous = await handler.handle(request('POST', `/campaigns/${id}/transfers/coins`, { body }));
    const outsider = UserId.parse(newId());
    const stranger = await handler.handle(request('POST', `/campaigns/${id}/transfers/coins`, { as: outsider, body }));
    const short = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/coins`, {
        as: ezren,
        body: { from: kyra, to: mordred, coins: { gp: 11 } },
      }),
    );

    expect([anonymous.status, stranger.status, short.status]).toStrictEqual([401, 404, 409]);
  });

  test('no coins, a negative amount or an unknown coin is refused', async () => {
    const handler = table();
    const id = await campaign(handler);

    const statuses = await Promise.all(
      [{}, { gp: -1 }, { gp: 1, xp: 1 }].map(async (coins) =>
        handler
          .handle(
            request('POST', `/campaigns/${id}/transfers/coins`, {
              as: ezren,
              body: { from: kyra, to: mordred, coins },
            }),
          )
          .then((response) => response.status),
      ),
    );

    expect(Math.min(...statuses)).toBeGreaterThanOrEqual(400);
    expect(Math.max(...statuses)).toBeLessThan(500);
  });
});

describe('answering an offer', () => {
  test("the recipient's owner accepts an offer, and a second answer is a 409", async () => {
    const handler = table();
    const id = await campaign(handler);
    const transfer = await offered(handler, id);

    const accepted = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${transfer}/accept`, { as: ezren }),
    );
    const again = await handler.handle(request('POST', `/campaigns/${id}/transfers/${transfer}/accept`, { as: ezren }));
    const answer = await json(accepted, Answer);

    expect(accepted.status).toBe(200);
    expect(answer).toStrictEqual({ id: transfer, status: 'accepted' });
    expect(again.status).toBe(409);
  });

  test('the recipient declines an offer', async () => {
    const handler = table();
    const id = await campaign(handler);
    const transfer = await offered(handler, id);

    const declined = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${transfer}/decline`, { as: ezren }),
    );
    const answer = await json(declined, Answer);

    expect(declined.status).toBe(200);
    expect(answer).toStrictEqual({ id: transfer, status: 'declined' });
  });

  test('a signed-out request is a 401, and a member who does not own the recipient or an unknown offer a 404', async () => {
    const handler = table();
    const id = await campaign(handler);
    const transfer = await offered(handler, id);

    const anonymous = await handler.handle(request('POST', `/campaigns/${id}/transfers/${transfer}/accept`, {}));
    const gm = await handler.handle(request('POST', `/campaigns/${id}/transfers/${transfer}/accept`, { as: amiri }));
    const unknown = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${newId()}/decline`, { as: ezren }),
    );

    expect([anonymous.status, gm.status, unknown.status]).toStrictEqual([401, 404, 404]);
  });
});
