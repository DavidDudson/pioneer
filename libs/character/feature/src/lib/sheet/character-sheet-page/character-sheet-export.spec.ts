import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, openSheet, present } from '../../testing/sheet-page-harness';
import { openSheetActions, render, textOf } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

const EXPORT_URL = `/api/characters/${id}/export`;
const FILE = { format: 'pioneer-character', formatVersion: 1, character: { name: 'Merisiel' } };

/** The export button in the sheet's open actions menu. */
function exportButton(panel: HTMLElement): HTMLButtonElement {
  const button = present(panel.querySelector('pio-sheet-export button'));
  if (!(button instanceof HTMLButtonElement)) {
    throw new TypeError('Expected a button');
  }
  return button;
}

describe('CharacterSheetPage export', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], TEST_PACKS);
  }, PREBUILD_TIMEOUT);

  it('downloads the character the server wrote, named after it', async () => {
    const saved: (Blob | MediaSource)[] = [];
    const created = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      saved.push(blob);
      return 'blob:export';
    });
    const revoked = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();
    const { root } = await openSheet();
    const button = exportButton(await openSheetActions(root));
    expect(textOf(button)).toBe('Export as JSON');

    button.click();
    const request = await vi.waitFor(() => TestBed.inject(HttpTestingController).expectOne(EXPORT_URL));
    request.flush(FILE);

    await vi.waitFor(() => {
      expect(clicked).toHaveBeenCalledTimes(1);
    });
    const [blob] = saved;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob).toMatchObject({ type: 'application/json', size: JSON.stringify(FILE, undefined, 2).length });
    expect(revoked).toHaveBeenCalledWith('blob:export');
    created.mockRestore();
    revoked.mockRestore();
    clicked.mockRestore();
  });

  it("says why when the server won't write the file, and downloads nothing", async () => {
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();
    const { root } = await openSheet();
    const panel = await openSheetActions(root);
    const button = exportButton(panel);

    button.click();
    const request = await vi.waitFor(() => TestBed.inject(HttpTestingController).expectOne(EXPORT_URL));
    request.flush(
      {
        type: 'validation',
        title: 'Unprocessable',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [{ path: ['content'], message: { key: 'character.sheet.export.failed' } }],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await vi.waitFor(() => {
      render();
      const exporter = present(panel.querySelector('pio-sheet-export'));
      expect(textOf(exporter)).toContain('The character could not be exported. Try again.');
    });
    expect(clicked).not.toHaveBeenCalled();
    clicked.mockRestore();
  });
});
