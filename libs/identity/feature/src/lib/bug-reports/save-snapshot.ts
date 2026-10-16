/** The suffix the character import expects on a Pioneer character file. */
const FILE_SUFFIX = '.pioneer.json';
const ID_PREFIX_LENGTH = 8;

/** The name a report's snapshot is saved under: the report's id, cut short, then `.pioneer.json`. */
export function snapshotFileName(reportId: string): string {
  return `bug-report-${reportId.slice(0, ID_PREFIX_LENGTH)}${FILE_SUFFIX}`;
}

/** Offers a report's snapshot as a Pioneer character file download, which the character import accepts. */
export function saveSnapshot(document: Document, reportId: string, snapshot: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, undefined, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = snapshotFileName(reportId);
  link.click();
  URL.revokeObjectURL(url);
}
