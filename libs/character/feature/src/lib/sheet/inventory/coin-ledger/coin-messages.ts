import { Coin } from '@pioneer/rules/sdk';

/** Each coin's short name, as an amount is written. */
export const COIN_MESSAGES: Readonly<Record<Coin, string>> = {
  [Coin.Platinum]: 'character.sheet.inventory.ledger.coin.pp',
  [Coin.Gold]: 'character.sheet.inventory.ledger.coin.gp',
  [Coin.Silver]: 'character.sheet.inventory.ledger.coin.sp',
  [Coin.Copper]: 'character.sheet.inventory.ledger.coin.cp',
};
