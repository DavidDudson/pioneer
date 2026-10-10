import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { Campaign } from '@pioneer/campaign/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncForm,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  Heading,
  Link,
  Page,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextField,
} from '@pioneer/frontier';
import { VirtualItem, VirtualList } from '@pioneer/frontier/data';

import { CampaignStore } from '../../data/campaign-store';
import { CreateCampaignForm } from '../../data/create-campaign-form';

interface CreateModel {
  readonly name: string;
}

/** Skeleton cards shown while the list loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

const campaignKey = (campaign: Campaign): string => campaign.id;

/** The user's campaigns, and a form to start one as its GM. */
@Component({
  selector: 'pio-campaign-list-page',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncForm,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    FormField,
    Heading,
    Link,
    Page,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextField,
    TranslocoPipe,
    VirtualItem,
    VirtualList,
  ],
  templateUrl: './campaign-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignListPage {
  protected readonly store = inject(CampaignStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);

  protected readonly placeholders = PLACEHOLDERS;

  protected readonly model = signal<CreateModel>({ name: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, CreateCampaignForm);
  });

  protected readonly create = async (value: CreateModel): Promise<void> => {
    const campaign = await this.store.create(CreateCampaignForm.parse(value));
    await this.#router.navigate([campaign.id], { relativeTo: this.#route });
  };

  protected readonly describeCreateError = (): string => this.#i18n.translate('campaign.list.createFailed');

  protected readonly campaignKey = campaignKey;
}
