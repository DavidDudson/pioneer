/** Helpers for the sheet specs that move between tabs. */
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, vi } from 'vitest';

import { present } from './sheet-page-harness';

export function textOf(element: Element | null | undefined): string {
  return element?.textContent.replaceAll(/\s+/gu, ' ').trim() ?? '';
}

/** The open tab's regions: each heading, and whether it labels its region. */
export function regionsOf(root: HTMLElement): (string | boolean)[][] {
  return [...root.querySelectorAll('router-outlet ~ * section')].map((region) => {
    const heading = present(region.querySelector('h2'));
    return [heading.textContent.trim(), region.getAttribute('aria-labelledby') === heading.id];
  });
}

export async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

/** Renders once, without waiting for the app to settle: after a failed request a region's retry can keep it busy. */
export function render(): void {
  TestBed.inject(ApplicationRef).tick();
}

/** Follows the sheet tab named `name` and waits for its first section. */
export async function openTab(root: HTMLElement, name: string, firstSection: string): Promise<void> {
  const nav = present(root.querySelector('nav[aria-label="Sheet mode"]'));
  present([...nav.querySelectorAll('a')].find((link) => link.textContent.trim() === name)).click();
  await vi.waitFor(async () => {
    await settle();
    expect(regionsOf(root)[0]?.[0]).toBe(firstSection);
  });
}

/**
 * Opens the sheet's triple-dot menu and returns its panel, which the overlay puts outside the sheet's root. Waits for
 * the trigger, which renders with the header.
 */
export async function openSheetActions(root: HTMLElement): Promise<HTMLElement> {
  const trigger = await vi.waitFor(() =>
    present(root.querySelector<HTMLButtonElement>('pio-sheet-header-actions button[aria-label="Sheet actions"]')),
  );
  trigger.click();
  return vi.waitFor(() => {
    render();
    return present(document.querySelector<HTMLElement>('[role="group"][aria-label="Sheet actions"]'));
  });
}
