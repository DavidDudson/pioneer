import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { defineChart, lineY } from '@tanstack/charts';
import type { ChartDefinition } from '@tanstack/charts/angular';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { describe, expect, it } from 'vitest';

import { Chart, ChartAspect } from './chart.component';

const DAMAGE: ChartDefinition = defineChart({
  marks: [
    lineY(
      [
        { round: 1, damage: 8 },
        { round: 2, damage: 14 },
      ],
      { x: 'round', y: 'damage' },
    ),
  ],
  scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
});

interface Rendered {
  readonly fixture: ComponentFixture<Chart>;
  readonly host: HTMLElement;
}

async function render(inputs: Readonly<Record<string, unknown>> = {}): Promise<Rendered> {
  const fixture = TestBed.createComponent(Chart);
  fixture.componentRef.setInput('definition', DAMAGE);
  fixture.componentRef.setInput('label', 'Damage per round');
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

function svg(host: HTMLElement): SVGSVGElement {
  const element = host.querySelector('svg');
  if (element === null) {
    throw new Error('Expected a rendered chart');
  }
  return element;
}

/** The ratio the chart's box keeps, from its inline style. */
function aspectRatio(host: HTMLElement): number | undefined {
  const style = host.querySelector('tanstack-chart [style*="aspect-ratio"]')?.getAttribute('style') ?? '';
  const ratio = /aspect-ratio:\s*(?<ratio>[\d.]+)/u.exec(style)?.groups?.['ratio'];
  return ratio === undefined ? undefined : Number(ratio);
}

describe(Chart, () => {
  it('draws an image named by its label', async () => {
    const { host } = await render();
    expect(svg(host).getAttribute('role')).toBe('img');
    expect(svg(host).getAttribute('aria-label')).toBe('Damage per round');
  });

  it('describes itself only when given a description', async () => {
    const plain = await render();
    expect(svg(plain.host).querySelector('desc')).toBeNull();

    const described = await render({ description: 'Damage rises each round.' });
    expect(svg(described.host).querySelector('desc')?.textContent).toBe('Damage rises each round.');
  });

  it('follows a new label', async () => {
    const { fixture, host } = await render();
    fixture.componentRef.setInput('label', 'Healing per round');
    await fixture.whenStable();
    expect(svg(host).getAttribute('aria-label')).toBe('Healing per round');
  });

  it.each([
    [ChartAspect.Wide, 16 / 9],
    [ChartAspect.Standard, 4 / 3],
    [ChartAspect.Square, 1],
  ])('keeps a %s chart at its ratio', async (aspect, ratio) => {
    const { host } = await render({ aspect });
    expect(aspectRatio(host)).toBeCloseTo(ratio);
  });

  it('is wide by default', async () => {
    const { host } = await render();
    expect(aspectRatio(host)).toBeCloseTo(16 / 9);
  });

  it('takes the text colour and the chart palette', async () => {
    const { host } = await render();
    expect(host.classList).toContain('text-fg-muted');
    expect(host.classList).toContain('chart-palette');
  });
});
