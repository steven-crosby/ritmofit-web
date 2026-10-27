/** Confirm copy for deleting a class. The title is the class name, in single quotes. */
export function deleteClassConfirmMessage(title: string): string {
  return `Delete '${title}'? This can't be undone.`;
}
