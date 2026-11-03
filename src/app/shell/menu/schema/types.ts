import type { EditorCommandId } from '@open-pencil/vue/editor/commands'

export type AppMenuTarget = 'all' | 'browser' | 'native'

export type AppMenuIcon =
  | 'download'
  | 'eye'
  | 'file'
  | 'folder-open'
  | 'layers'
  | 'pencil'
  | 'redo'
  | 'save'
  | 'settings'
  | 'type'
  | 'variables'
  | 'undo'
  | 'zoom-in'
  | 'zoom-out'

export type AppMenuPaletteLabel =
  | 'exportSelectionAsPNG'
  | 'exportSelectionAsSVG'
  | 'exportSelectionAsPPTX'
  | 'exportSelectionAsDrawIO'
  | 'exportSelectionAsFig'

export interface AppMenuPaletteMetadata {
  icon?: AppMenuIcon
  label?: AppMenuPaletteLabel
  description?: string
  keywords?: string[]
}

export type AppMenuHandler = 'editor' | 'shell'

/**
 * A feature an item or a whole menu waits for: it shows only while the feature is available
 * (`./features`). `document`: the tab in front holds a document, not Home or a New file tab;
 * `local-file`: that document is backed by a file on disk; `cloud-document`: it is kept by a
 * Cloud server.
 */
export type AppMenuFeature = 'document' | 'local-file' | 'cloud-document'

/**
 * What an item without an editor command needs before it can run: `selection`, something
 * selected. It stays in the menu, greyed out, until then; command items follow their command.
 */
export type AppMenuNeed = 'selection'

export interface AppMenuActionItem {
  type?: 'item'
  id: string
  label: string
  shortcut?: string
  accelerator?: string
  command?: EditorCommandId
  checkbox?: boolean
  target?: AppMenuTarget
  handler?: AppMenuHandler
  feature?: AppMenuFeature
  needs?: AppMenuNeed
  palette?: AppMenuPaletteMetadata
  sub?: AppMenuEntry[]
}

export interface AppMenuSeparatorItem {
  type: 'separator'
  target?: AppMenuTarget
}

export type AppMenuEntry = AppMenuActionItem | AppMenuSeparatorItem

export interface AppMenuGroupSchema {
  label: string
  target?: AppMenuTarget
  feature?: AppMenuFeature
  paletteIcon?: AppMenuIcon
  items: AppMenuEntry[]
}
