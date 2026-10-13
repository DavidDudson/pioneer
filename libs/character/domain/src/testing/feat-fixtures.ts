import type { FeatContent } from '../feat-content';

/** No feats: a feat slot's pick is never checked against its level or prerequisites. For tests about other slots. */
export const NO_FEATS: FeatContent = { feat: () => undefined, archetype: () => undefined };
