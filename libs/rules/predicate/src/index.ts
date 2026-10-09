export { evaluatePredicate, evaluateStatement } from './evaluate';
export { OptionValue, PredicateFacts } from './facts';
export {
  DEFAULT_NAMESPACES,
  NamespaceKind,
  kindOf,
  namespaceOf,
  RollOptionNamespace,
  namespaceTable,
  type NamespaceTable,
  withKnown,
} from './namespaces';
export { type PredicateTrace, type StatementTrace, tracePredicate } from './trace';
export { Truth } from './truth';
