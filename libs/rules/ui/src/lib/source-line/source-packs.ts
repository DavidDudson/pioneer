import { InjectionToken, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { ContentPackId } from '@pioneer/rules/sdk';

/** A pack as a container names it: its title, and its publisher, who stands in for an author whose name is unknown. */
export interface SourcePack {
  readonly title: string;
  readonly publisher: string;
}

/**
 * The packs a page's entries may come from, by stored id. A container that knows them (the open character's pack
 * list) provides this once, so every source line below it names a homebrew pack and its author without each picker
 * and table passing names down. An `authorNames` or `packNames` input on a source line still wins.
 */
export const SOURCE_PACKS = new InjectionToken<Signal<ReadonlyMap<ContentPackId, SourcePack>>>('SOURCE_PACKS', {
  factory: (): Signal<ReadonlyMap<ContentPackId, SourcePack>> =>
    signal<ReadonlyMap<ContentPackId, SourcePack>>(new Map()),
});
