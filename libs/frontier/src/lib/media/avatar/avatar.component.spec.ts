import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { Size } from '../../tokens';
import { Avatar } from './avatar.component';

const PORTRAIT = 'https://example.test/seelah.webp';

async function render(inputs: Readonly<Record<string, unknown>>): Promise<ComponentFixture<Avatar>> {
  TestBed.configureTestingModule({
    imports: [TranslocoTestingModule.forRoot({ langs: { en: {} }, translocoConfig: { defaultLang: 'en' } })],
  });
  const fixture = TestBed.createComponent(Avatar);
  for (const [name, value] of Object.entries({ name: 'Seelah of the Dawn', ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture;
}

function host(fixture: ComponentFixture<Avatar>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe(Avatar, () => {
  it('shows the picture, named for the person', async () => {
    const fixture = await render({ src: PORTRAIT });
    const img = host(fixture).querySelector('img');
    expect(img?.getAttribute('src')).toBe(PORTRAIT);
    expect(img?.alt).toBe('Seelah of the Dawn');
    expect(host(fixture).querySelector('[role="img"]')).toBeNull();
  });

  it('shows initials, named for the person, without a picture', async () => {
    const fixture = await render({});
    const initials = host(fixture).querySelector('[role="img"]');
    expect(host(fixture).querySelector('img')).toBeNull();
    expect(initials?.getAttribute('aria-label')).toBe('Seelah of the Dawn');
    expect(initials?.textContent.trim()).toBe('SD');
    expect(initials?.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe('SD');
  });

  it('falls back to initials when the picture fails, and tries a new one', async () => {
    const fixture = await render({ src: PORTRAIT });
    host(fixture).querySelector('img')?.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(host(fixture).querySelector('img')).toBeNull();
    expect(host(fixture).textContent.trim()).toBe('SD');

    fixture.componentRef.setInput('src', 'https://example.test/seelah-2.webp');
    await fixture.whenStable();
    expect(host(fixture).querySelector('img')).not.toBeNull();
  });

  it('hides from screen readers when decorative', async () => {
    const withPicture = await render({ src: PORTRAIT, decorative: true });
    expect(host(withPicture).querySelector('img')?.getAttribute('alt')).toBe('');

    TestBed.resetTestingModule();
    const withInitials = await render({ decorative: true });
    const initials = host(withInitials).querySelector('span span');
    expect(initials?.hasAttribute('role')).toBe(false);
    expect(initials?.hasAttribute('aria-label')).toBe(false);
  });

  it.each([
    [Size.Sm, 'size-avatar-sm', 'text-caption'],
    [Size.Md, 'size-avatar-md', 'text-label'],
    [Size.Lg, 'size-avatar-lg', 'text-subheading'],
  ])('draws a %s square with matching type', async (size, square, type) => {
    const fixture = await render({ size });
    const frame = host(fixture).querySelector('span');
    expect(frame?.classList).toContain(square);
    expect(frame?.firstElementChild?.classList).toContain(type);
  });
});
