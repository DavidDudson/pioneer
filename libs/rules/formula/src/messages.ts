/** Keys for formula text; their `en` text ships in this lib's `i18n/en.json` under `formula.*`. */
export const FormulaMessage = {
  Empty: 'formula.parse.empty',
  TooLong: 'formula.parse.tooLong',
  TooDeep: 'formula.parse.tooDeep',
  TooManyNodes: 'formula.parse.tooManyNodes',
  UnexpectedCharacter: 'formula.parse.unexpectedCharacter',
  UnexpectedToken: 'formula.parse.unexpectedToken',
  UnexpectedEnd: 'formula.parse.unexpectedEnd',
  NumberTooLarge: 'formula.parse.numberTooLarge',
  InvalidReference: 'formula.parse.invalidReference',
  UnknownFunction: 'formula.parse.unknownFunction',
  NotCalled: 'formula.parse.notCalled',
  ArgumentCount: 'formula.parse.argumentCount',
  ArgumentCountAtLeast: 'formula.parse.argumentCountAtLeast',
} as const;
