import { diceMessages } from '@pioneer/rules/dice';
import { Locale } from '@pioneer/shared/kernel';
import { provideMessageScope } from '@pioneer/shared/web';

/**
 * The message scopes a roll card reads: its own `play` text and the `dice` text of the rolls it explains. A route that
 * shows roll cards provides them beside its own scopes, with the `rules` scope the degrees' reasons come from. The play
 * routes declare the same two scopes themselves: the message check reads a library's scope from the first one it finds.
 */
export const rollCardMessages = [
  provideMessageScope('play', { [Locale.English]: async () => import('../../i18n/en.json') }),
  provideMessageScope('dice', { [Locale.English]: async () => diceMessages.dice }),
];
