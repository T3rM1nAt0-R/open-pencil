const figJamPaletteTheme = {
  slots: {
    swatches: 'grid grid-cols-11 gap-[3px] justify-items-center',
    none: 'flex items-center justify-center bg-transparent text-muted',
    swatch:
      'size-4 cursor-pointer rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
  },
  variants: {
    active: {
      true: { swatch: 'ring-2 ring-accent ring-offset-1 ring-offset-panel' },
      false: { swatch: 'hover:border-muted' }
    }
  },
  defaultVariants: {
    active: false
  }
}

export type FigJamPaletteTheme = typeof figJamPaletteTheme
export default figJamPaletteTheme
