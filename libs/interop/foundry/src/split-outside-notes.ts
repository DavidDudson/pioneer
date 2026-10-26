/** A parenthesised note, whose own commas and `or`s do not separate the skills around it. */
const NOTE = /\([^)]*\)/gu;
const MASKED = /\(#(?<index>\d+)\)/gu;

/** `text` split at `separator` wherever it is not inside parentheses. */
export function splitOutsideNotes(text: string, separator: RegExp): string[] {
  const notes: string[] = [];
  const masked = text.replaceAll(NOTE, (note) => {
    notes.push(note);
    return `(#${notes.length - 1})`;
  });
  return masked
    .split(separator)
    .map((part) => part.replaceAll(MASKED, (_masked, index: string) => notes[Number(index)] ?? ''));
}
