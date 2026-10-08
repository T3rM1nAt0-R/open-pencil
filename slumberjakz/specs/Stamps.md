# One-click build stamps

Requested by Niraj, 2026-10-08 (idea from the Game screens thread).

## What it is

Every wireframe screen carries a small tag saying how far it is built: **Built** (green), **Being built** (amber)
or **Planned** (grey), the same colours as the project's diagrams. Until now Claude's script drew these by hand.
Now:

1. Select one or more screens (or anything inside them).
2. Press **Stamp** at the top right of the canvas and pick a status, or **Remove stamp**.

- A screen with a title above it (a layer named `Label: <screen name>`, as the wireframe script makes) gets the tag
  inside that title, exactly where the script puts it. Stamping again changes the tag in place.
- A screen with no title gets a tag layer named `Status: <screen name>` just above it.
- Titles, notes and tags themselves are never stamped.
- The whole stamp is one step: Undo takes it back.
- The menu is in all of OpenPencil's languages; the tag written into the design stays in English, because scripts
  read it back.

## Not in this version (planned)

- **Staying in sync with what's merged.** The idea is that each screen names the issue or pull request it belongs
  to, and Claude (or a nightly robot) re-stamps the screens when that work merges. That needs a link from screen to
  issue first, so it waits for the next round. Today Claude can re-stamp from the shelf file after merges.

## Flow charts

### You stamping screens

```mermaid
flowchart TD
  start([You select screens]) --> press[/Stamp button/]
  press --> pick{Which status?}
  pick -->|Built, Being built or Planned| each[For each selected screen]
  pick -->|Remove stamp| clear[Delete its tag]
  each --> title{Has a Label title?}
  title -->|yes| inside[Tag inside the title]
  title -->|no| above[Tag layer above the screen]
  inside --> done([Tags show; one Undo takes it back])
  above --> done
  clear --> done
  done -.->|later| sync{{Re-stamp when work merges}}
  classDef player fill:#dbeafe,stroke:#1d4ed8,color:#0b1b3f
  classDef phone fill:#fde2e4,stroke:#be185d,color:#3b0a1e
  classDef server fill:#ede9fe,stroke:#6d28d9,color:#2a1052
  classDef data fill:#fef3c7,stroke:#a16207,color:#3b2a05
  classDef robot fill:#ccfbf1,stroke:#0f766e,color:#06302b
  classDef event fill:#fff7cc,stroke:#ca8a04,color:#3b2a05
  classDef other fill:#f1f5f9,stroke:#475569,color:#1e293b
  classDef built stroke:#15803d,stroke-width:3px
  classDef building stroke:#d97706,stroke-width:3px,stroke-dasharray:6 3
  classDef planned stroke:#94a3b8,stroke-width:2px,stroke-dasharray:2 3
  class start,press,pick,done player
  class each,title,inside,above,clear phone
  class sync robot
  class start,press,pick,each,title,inside,above,clear,done building
  class sync planned
```

### Where the tag goes

```mermaid
flowchart LR
  screen[Screen frame] --> label[(Label: name)]
  label --> tag[(Status tag)]
  screen -.->|no Label title| own[(Status: name tag above)]
  classDef player fill:#dbeafe,stroke:#1d4ed8,color:#0b1b3f
  classDef phone fill:#fde2e4,stroke:#be185d,color:#3b0a1e
  classDef server fill:#ede9fe,stroke:#6d28d9,color:#2a1052
  classDef data fill:#fef3c7,stroke:#a16207,color:#3b2a05
  classDef robot fill:#ccfbf1,stroke:#0f766e,color:#06302b
  classDef event fill:#fff7cc,stroke:#ca8a04,color:#3b2a05
  classDef other fill:#f1f5f9,stroke:#475569,color:#1e293b
  classDef built stroke:#15803d,stroke-width:3px
  classDef building stroke:#d97706,stroke-width:3px,stroke-dasharray:6 3
  classDef planned stroke:#94a3b8,stroke-width:2px,stroke-dasharray:2 3
  class screen phone
  class label,tag,own data
  class screen,label built
  class tag,own building
```

## Analytics

None (internal tool).
