import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { LineBreak } from './line-break.component';

describe(LineBreak, () => {
  it('renders a line break', async () => {
    const fixture = TestBed.createComponent(LineBreak);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('br')).toHaveLength(1);
  });
});
