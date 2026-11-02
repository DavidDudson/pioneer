import type { Meta, StoryObj } from '@analogjs/storybook-angular';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Modal } from './modal.component';

type ModalStory = StoryObj<Modal>;

const meta: Meta<Modal> = {
  title: 'Layout/Modal',
  component: Modal,
  args: { title: 'Hit Points', open: true },
  render: (args) => ({
    props: args,
    template: `
      <fr-modal [title]="title" [(open)]="open">
        <p>Damage, heal or set the number of Hit Points.</p>
      </fr-modal>
    `,
  }),
};
export default meta;

/** A small modal over the page: focus is trapped, the page behind is inert, Escape closes it. */
export const Open: ModalStory = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('dialog', { name: 'Hit Points' });
    await expect(dialog).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close Hit Points' }));
    await waitFor(async () => {
      await expect(body.queryByRole('dialog')).toBeNull();
    });
  },
};
