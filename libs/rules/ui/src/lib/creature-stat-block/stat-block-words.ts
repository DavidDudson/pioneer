/** What the builder needs to word a stat block: the message bundle and the locale's formats. */
export interface StatBlockWords {
  readonly translate: (key: string, params?: Record<string, unknown>) => string;
  readonly number: (value: number, options?: Intl.NumberFormatOptions) => string;
  readonly list: (items: readonly string[], type?: Intl.ListFormatType) => string;
  readonly distance: (feet: number) => string;
}
