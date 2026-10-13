import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { renderCell } from '../../testing/render-cell';
import { SummaryCell } from './summary-cell.component';

describe(SummaryCell, () => {
  it('clamps the summary and keeps all of it in the page', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const host = await renderCell(SummaryCell, {
      text: [{ type: 'paragraph', content: [{ type: 'text', text: 'You strike twice.' }] }],
    });
    expect(host.querySelector('.line-clamp-2')?.textContent).toContain('You strike twice.');
  });
});
