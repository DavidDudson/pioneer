/** Longest a file name's character part runs before it is cut. */
const NAME_LENGTH_MAX = 60;
const FALLBACK_NAME = 'character';
const FILE_SUFFIX = '.pioneer.json';

/** The name a character's file is saved under: its name in lower-case words joined by hyphens, then `.pioneer.json`. */
export function exportFileName(characterName: string): string {
  const words = characterName
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '')
    .join('-')
    .slice(0, NAME_LENGTH_MAX);
  return `${words === '' ? FALLBACK_NAME : words}${FILE_SUFFIX}`;
}

/** Offers `value` as a JSON file download called `fileName`. */
export function saveJsonFile(document: Document, fileName: string, value: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, undefined, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
