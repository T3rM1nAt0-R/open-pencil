const isSeparator = (entry: object): boolean => 'separator' in entry

/** Drops separators at either end of a menu and doubled ones, which hidden items leave behind. */
export function tidyMenuSeparators<T extends object>(entries: readonly T[]): T[] {
  const tidy: T[] = []
  for (const entry of entries) {
    const previous = tidy.at(-1)
    if (isSeparator(entry) && (previous === undefined || isSeparator(previous))) continue
    tidy.push(entry)
  }
  while (tidy.length > 0 && isSeparator(tidy[tidy.length - 1])) tidy.pop()
  return tidy
}
