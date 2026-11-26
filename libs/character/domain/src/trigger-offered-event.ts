import { ContentId } from '@pioneer/rules/sdk';
import { MessageDescriptorSchema } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** A triggered ability fired but costs something or needs a choice, so the player is offered it rather than having it applied. */
export const TriggerOfferedEvent = z.object({
  kind: z.literal('triggerOffered'),
  ability: ContentId,
  message: MessageDescriptorSchema,
});

export type TriggerOfferedEvent = z.infer<typeof TriggerOfferedEvent>;
