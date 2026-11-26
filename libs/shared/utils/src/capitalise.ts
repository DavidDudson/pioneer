/** `text` with its first letter in upper case and the rest as it is: `fire bolt` is `Fire bolt`. */
export function capitalise(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}
