import { CampaignName } from '@pioneer/campaign/domain';
import { z } from 'zod';

/** What the new-campaign form submits; the same schema the server validates with. */
export const CreateCampaignForm = z.object({ name: CampaignName });
