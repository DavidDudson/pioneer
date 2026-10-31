import { describe, expect, test } from 'bun:test';

import { newId } from '@pioneer/shared/kernel';

import { amiri, Answer, campaign, ezren, json, offered, request, table } from './testing/transfer-route-fixtures';

describe('withdrawing an offer', () => {
  test("the giver's owner withdraws an offer, and withdrawing again answers the same", async () => {
    const handler = table();
    const id = await campaign(handler);
    const transfer = await offered(handler, id);

    const withdrawn = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${transfer}/withdraw`, { as: ezren }),
    );
    const again = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${transfer}/withdraw`, { as: ezren }),
    );

    expect([withdrawn.status, again.status]).toStrictEqual([200, 200]);
    expect(await json(withdrawn, Answer)).toStrictEqual({ id: transfer, status: 'withdrawn' });
    expect(await json(again, Answer)).toStrictEqual({ id: transfer, status: 'withdrawn' });
  });

  test('withdrawing after accept is a 409, and a withdrawn offer cannot be accepted', async () => {
    const handler = table();
    const id = await campaign(handler);
    const accepted = await offered(handler, id);
    await handler.handle(request('POST', `/campaigns/${id}/transfers/${accepted}/accept`, { as: ezren }));
    const withdrawn = await offered(handler, id);
    await handler.handle(request('POST', `/campaigns/${id}/transfers/${withdrawn}/withdraw`, { as: ezren }));

    const late = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${accepted}/withdraw`, { as: ezren }),
    );
    const refused = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${withdrawn}/accept`, { as: ezren }),
    );

    expect([late.status, refused.status]).toStrictEqual([409, 409]);
  });

  test('a signed-out request is a 401, and a user outside the campaign or an unknown offer a 404', async () => {
    const handler = table();
    const id = await campaign(handler);
    const transfer = await offered(handler, id);

    const anonymous = await handler.handle(request('POST', `/campaigns/${id}/transfers/${transfer}/withdraw`, {}));
    const gm = await handler.handle(request('POST', `/campaigns/${id}/transfers/${transfer}/withdraw`, { as: amiri }));
    const unknown = await handler.handle(
      request('POST', `/campaigns/${id}/transfers/${newId()}/withdraw`, { as: ezren }),
    );

    expect([anonymous.status, gm.status, unknown.status]).toStrictEqual([401, 404, 404]);
  });
});
