import type { IconNode } from 'lucide';

/**
 * What `fr-icon` draws: a Lucide icon's shapes (`import { Check } from 'lucide'`) as plain data, drawn on a 24 unit
 * grid. Each Lucide icon is one small module, so only the icons a page imports reach its bundle.
 */
export type IconGlyph = IconNode;
