import { describe, expect, test } from 'bun:test';

import { AonUrl } from '@pioneer/rules/sdk';

import { parseSources } from './parse';

const PAGE = `<h1 class="title"><a href="Sources.aspx?ID=1">Core Rulebook</a></h1>
<h2 class="title">Skills (General) [2]</h2><u><a href="Skills.aspx?ID=1&General=true">Decipher Writing</a></u>
<h2 class="title">Spells [2]</h2><u><a href="Spells.aspx?ID=491">Aberrant Whispers</a></u>, <u><a href="Spells.aspx?ID=7">Ally&#39;s &amp; Foe</a></u>`;

describe('parseSources', () => {
  test('reads each entry type with its names and URLs', () => {
    expect(parseSources(PAGE).entries).toEqual([
      { type: 'Spells', name: 'Aberrant Whispers', url: AonUrl.parse('https://2e.aonprd.com/Spells.aspx?ID=491') },
      { type: 'Spells', name: "Ally's & Foe", url: AonUrl.parse('https://2e.aonprd.com/Spells.aspx?ID=7') },
    ]);
  });

  test('reports links that are not one entry instead of keeping them', () => {
    expect(parseSources(PAGE).skipped).toEqual(['https://2e.aonprd.com/Skills.aspx?ID=1&General=true']);
  });

  test('finds nothing in a page without entry sections', () => {
    expect(parseSources('<p>Not found</p>')).toEqual({ entries: [], skipped: [] });
  });
});
