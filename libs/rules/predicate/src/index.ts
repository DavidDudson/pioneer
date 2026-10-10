export { evaluatePredicate, evaluateStatement } from './evaluate';
export { OptionValue, PredicateFacts } from './facts';
export { kindOf, namespaceOf, namespaceTable, type NamespaceTable, withKnown } from './namespaces';
export { type PredicateTrace, type StatementTrace, tracePredicate } from './trace';
export { Truth } from './truth';
export { formatSummary, ListStyle, type SummaryFormat } from './format';
export { PredicateMessage } from './messages';
export { Negated, type PredicateSummary, SummaryKind, summarisePredicate } from './summary';
export { default as predicateMessages } from './i18n/en.json';
