# Daily copies of the Pencil shelf

Requested by Niraj, 2026-10-08 (idea from the Game screens thread). Same idea as Moodboard's nightly copy.

## What it is

Once a day, Brian copies every design on the Pencil shelf (the `.fig`, its name file, its preview and its
comments) into a dated folder, and keeps the last 14 days. If a bad save or a broken test build damages a design,
the copy from a day before brings it back.

- Runs as a small box (`copies`) beside dev-pencil, from `deploy/dev-pencil/design-copies.sh`. It checks every
  hour and makes the day's copy the first time it runs that day (days in India time).
- It only reads the shelf (mounted read-only), so it can't change a design.
- Copies live in `/opt/data/selfhost/openpencil-copies/<date>/` on Brian.
- Restoring is by hand on Brian, one design or all: copy the files for that design id back into the shelf's
  `canvases` folder (the command is at the top of the script). Ask Claude and it does it.

## Flow charts

### You getting a design back

```mermaid
flowchart TD
  start([A design looks broken]) --> ask[/You tell Claude which design and which day/]
  ask --> list[Claude lists the copies on Brian]
  list --> have{Copy for that day?}
  have -->|yes| put[Claude copies that day's files back onto the shelf]
  have -->|no| older[/Claude offers the nearest older copy/]
  older --> put
  put --> open([You reopen it in Pencil])
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
  class start,ask,older,open player
  class list,have,put server
  class start,ask,list,have,put,older,open building
```

### The daily copy

```mermaid
flowchart LR
  timer{{copies box: every hour}} --> today{Today's copy made?}
  today -->|no| copy[Copy the shelf into a dated folder]
  today -->|yes| prune
  copy --> prune[Drop copies older than 14 days]
  shelf[(Shelf: canvases folder)] -.->|read only| copy
  copy --> copies[(openpencil-copies/date)]
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
  class timer,today robot
  class copy,prune server
  class shelf,copies data
  class shelf built
  class timer,today,copy,prune,copies building
```

## Analytics

None (internal tool).

## Undo

`docker compose stop copies` in `/opt/data/selfhost/openpencil-dev`; delete `/opt/data/selfhost/openpencil-copies`
when no longer wanted.
