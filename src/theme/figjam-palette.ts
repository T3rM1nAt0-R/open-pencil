const figJamPaletteTheme = {
  slots: {
    swatches: 'flex flex-wrap gap-1',
    swatch:
      'size-[18px] cursor-pointer rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
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
