import { Endpoint, HttpMethod, NoBody, NoParams, NoQuery } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { Campaign } from './campaign';
import { CampaignId, CampaignName } from './campaign-fields';

const ById = z.object({ id: CampaignId });

export const CreateCampaignBody = z.object({ name: CampaignName });
export type CreateCampaignBody = z.infer<typeof CreateCampaignBody>;

/** The campaign HTTP API, shared by `campaign-infrastructure` and `campaign-feature`. */
export const CampaignContract = {
  /** The actor's campaigns, in the order they joined them. */
  list: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns',
    params: NoParams,
    query: NoQuery,
    body: NoBody,
    response: z.array(Campaign.codec),
  }),
  get: new Endpoint({
    method: HttpMethod.Get,
    path: '/campaigns/:id',
    params: ById,
    query: NoQuery,
    body: NoBody,
    response: Campaign.codec,
  }),
  create: new Endpoint({
    method: HttpMethod.Post,
    path: '/campaigns',
    params: NoParams,
    query: NoQuery,
    body: CreateCampaignBody,
    response: Campaign.codec,
  }),
} as const;
