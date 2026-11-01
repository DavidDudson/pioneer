import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterAvatar, Stack, Text } from '@pioneer/frontier';

/**
 * The GM in the party panel: a circle reading "GM" in the players' avatar style, named for the GM. It has no
 * portrait, health or conditions. Nothing is drawn until the GM's name has loaded.
 */
@Component({
  selector: 'pio-campaign-gm-avatar',
  imports: [CharacterAvatar, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-gm-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignGmAvatar {
  public readonly name = input<string | undefined>(undefined);
}
