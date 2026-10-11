import { TestBed } from '@angular/core/testing';
import { frontierMessages } from '@pioneer/frontier';
import { AncestryId, contentId, PackId, Slug } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideServerStateTesting } from '../testing/provide-server-state-testing';
import { AncestryOptions } from './ancestry-options';

const elf = AncestryId.parse(contentId(PackId.parse('player-core'), Slug.parse('elf')));

describe(AncestryOptions, () => {
  let ancestries: AncestryOptions;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideServerStateTesting(), provideI18n({ en: async () => frontierMessages })],
    });
    ancestries = TestBed.inject(AncestryOptions);
  });

  it('names an unpicked ancestry slot with nothing', () => {
    expect(ancestries.name(undefined)).toBe('');
  });

  it('names an ancestry by its id until content loads, then by its name', async () => {
    expect(ancestries.name(elf)).toBe(elf);
    await vi.waitFor(() => {
      expect(ancestries.name(elf)).toBe('Elf');
    });
  });
});
