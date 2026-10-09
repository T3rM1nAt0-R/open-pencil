import { tv } from 'tailwind-variants'

/** Canvas comments: pins, the thread card beside a pin, and the list in the right sidebar. */
export const comments = tv({
  slots: {
    // A speech bubble whose square corner points at the commented spot, as in Figma.
    pin: 'pointer-events-auto absolute flex -translate-y-full cursor-pointer items-center justify-center rounded-full rounded-bl-none bg-panel p-[3px] shadow-md ring-1 ring-black/15 outline-none hover:ring-accent focus-visible:ring-2 focus-visible:ring-accent data-[active]:ring-2 data-[active]:ring-accent data-[draft]:pointer-events-none data-[draft]:size-8 data-[draft]:bg-accent data-[draft]:ring-white/70 data-[resolved]:opacity-60 data-[resolved]:grayscale',
    card: 'flex max-h-[min(28rem,70vh)] w-80 flex-col overflow-hidden p-0',
    threadCard: 'flex min-h-0 flex-col',
    thread: 'scrollbar-thin flex min-h-0 flex-col gap-3 overflow-y-auto px-3 py-2.5',
    message: 'group/message grid grid-cols-[24px_minmax(0,1fr)] gap-x-2 gap-y-0.5',
    messageMeta: 'flex h-6 min-w-0 items-center gap-1.5 text-xs',
    messageAuthor: 'min-w-0 truncate font-semibold text-surface',
    messageTime: 'shrink-0 text-[11px] text-muted',
    messageActions:
      'ml-auto flex shrink-0 opacity-0 group-focus-within/message:opacity-100 group-hover/message:opacity-100',
    messageText: 'col-start-2 min-w-0 text-xs break-words text-surface',
    composerSlot: 'border-t border-border p-2',
    draft: 'p-2',
    composer:
      'flex flex-col rounded-lg border border-border bg-input focus-within:border-panel-focus focus-within:ring-1 focus-within:ring-accent/25',
    composerInput:
      'scrollbar-thin max-h-40 min-h-8 w-full resize-none bg-transparent px-3 pt-2 text-xs leading-relaxed text-surface outline-none placeholder:text-muted',
    composerBar: 'flex items-center justify-end gap-1 px-1.5 pb-1.5',
    panel: 'flex min-h-0 flex-1 flex-col',
    panelSearch: 'shrink-0 border-b border-border px-3 py-2',
    list: 'scrollbar-thin min-h-0 flex-1 overflow-y-auto',
    item: 'group/item relative flex w-full cursor-pointer flex-col gap-1 border-b border-border/60 px-3 py-2.5 text-left text-xs outline-none hover:bg-hover focus-visible:bg-hover data-[active]:bg-panel-selected-muted',
    itemTop: 'flex h-6 items-center gap-1.5 pr-14',
    itemPlace: 'min-w-0 truncate text-[11px] text-muted',
    itemMeta: 'flex min-w-0 items-baseline gap-1.5',
    itemText: 'line-clamp-3 min-w-0 break-words text-surface/80',
    itemReplies: 'text-[11px] text-accent',
    itemActions:
      'invisible absolute top-2 right-2 flex gap-0.5 group-focus-within/item:visible group-hover/item:visible group-data-[menu-open]/item:visible',
    menuIndicator: 'absolute left-2'
  }
})
