import type { OfferedCoins } from '@pioneer/campaign/domain';

/** The coins as plain counts, per denomination. */
export type CoinCounts = Readonly<Record<keyof OfferedCoins, number>>;

/** Each denomination's message key, largest first; the message holds the count and the coin's short name. */
const COIN_MESSAGES: Readonly<Record<keyof OfferedCoins, string>> = {
  pp: 'campaign.transfers.coin.pp',
  gp: 'campaign.transfers.coin.gp',
  sp: 'campaign.transfers.coin.sp',
  cp: 'campaign.transfers.coin.cp',
};

/** The denominations, largest first. */
const DENOMINATIONS: readonly (keyof OfferedCoins)[] = ['pp', 'gp', 'sp', 'cp'];

/** Translates a message key with its params. */
type SayWith = (key: string, params: Readonly<Record<string, number>>) => string;

/** The coins an offer carries as a short list in the active language, e.g. "4 gp, 2 sp"; a denomination of none is left out. */
export function coinsText(coins: CoinCounts, say: SayWith, language: string): string {
  const parts = DENOMINATIONS.filter((coin) => coins[coin] > 0).map((coin) =>
    say(COIN_MESSAGES[coin], { count: coins[coin] }),
  );
  return new Intl.ListFormat(language, { style: 'short', type: 'unit' }).format(parts);
}
