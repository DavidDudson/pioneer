import type { ListPart } from '@pioneer/frontier';
import type { MessageParams } from '@pioneer/shared/kernel';

/** What the builder needs to word a stat block: the message bundle and the locale's formats. */
export interface StatBlockWords {
  readonly translate: (key: string, params?: MessageParams) => string;
  readonly number: (value: number, options?: Intl.NumberFormatOptions) => string;
  readonly list: (items: ReadonlyArray<string>, type?: Intl.ListFormatType) => string;
  readonly listParts: (items: ReadonlyArray<string>, type?: Intl.ListFormatType) => ReadonlyArray<ListPart>;
  readonly distance: (feet: number) => string;
}
