# Comments in Pencil

Requested by Niraj, 2026-10-08. Lives on the `slumberjakz` branch of this fork and runs at
https://dev-pencil.slumberjakz.com. Live pencil (https://pencil.slumberjakz.com) stays on stock OpenPencil
v0.15.1 until Niraj says "promote".

## What it is

Leave notes on a design, like sticky notes with a conversation attached:

- **Pins.** Press **Comment** (top right of the canvas), click anywhere, type, press Enter. A numbered pin
  marks the spot.
- **Pins follow the layer.** A pin dropped on a frame stays on that frame when the frame moves. If the frame is
  deleted, the pin stays where it was.
- **Replies.** Click a pin to open its thread and reply.
- **Resolve.** The tick closes a thread; it hides from the canvas. "Show resolved" brings them back, and the
  arrow reopens one. A new reply also reopens it.
- **List.** The speech-bubble button shows every comment in the design, on every page, with the number still
  open. Click one to jump to its page and spot.
- **Names.** The first comment asks for a name, kept in this browser (the same name the live-collab panel uses).

## Where comments are saved

Comments never go inside the `.fig` file, so the design file stays exactly what stock OpenPencil (and live pencil)
reads. They sit next to it on the shelf as a plain text file:

```
designs/pencil-store/open_pencil_storage/canvases/<id>.fig            the design (unchanged)
designs/pencil-store/open_pencil_storage/canvases/<id>.comments.json  its comments
```

- Designs opened from the shelf: comments go to the shelf, so they show on any browser and computer, and Claude can
  read and answer them by reading and writing that JSON file.
- Designs opened from your computer (not the shelf): comments stay in this browser only. The comments list says so.
- dev-pencil and live pencil use the same shelf, so the same designs open in both. Live pencil simply doesn't show
  the comments (it doesn't know about them) and its file list ignores the comments files.
- Every 10 seconds the open design checks for new comments, so a reply added somewhere else appears on its own.
- Two places saving at once don't lose anything: each save first reads the newest file and joins the two, matching
  threads and replies by id. For a thread changed in both places, the newer change wins and all replies stay.
- Deleting is a soft delete (marked deleted in the file), so a slower save elsewhere can't bring it back.

## Not in this version

- Mentions and email alerts.
- Comments on designs that live only on your computer appearing anywhere else.
- Removing the comments file when a design is deleted from the shelf (it stays as a small orphan file).
- Translations: words are English only for now. Before sending this to OpenPencil's makers, they go into
  OpenPencil's language files.

## Flow charts

### You leaving and answering comments

```mermaid
flowchart TD
  start([You open a design on dev-pencil]) --> shelf{Opened from the shelf?}
  shelf -->|yes| load[Pencil reads the comments file]
  shelf -->|no| local[Pencil reads this browser's comments]
  load --> pins[/Pins on the canvas and the count button/]
  local --> pins
  pins --> act{What do you do?}
  act -->|Comment, then click| draft[/Note box at that spot/]
  draft --> name{Name known?}
  name -->|no| ask[/Name box/]
  ask --> post[Post]
  name -->|yes| post
  act -->|Click a pin| thread[/Thread card: reply, resolve, delete/]
  act -->|Open the list| list[/Comments list, every page/]
  list -->|click one| jump[Go to its page and spot]
  jump --> thread
  post --> saved[(Comments file on the shelf)]
  thread --> saved
  saved -.->|every 10 s| pins
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
  class start,pins,draft,ask,thread,list,act,name player
  class shelf,load,local,post,jump phone
  class saved data
  class start,shelf,load,local,pins,act,draft,name,ask,post,thread,list,jump,saved building
```

### Where the parts run

```mermaid
flowchart LR
  you([You in the browser]) --> dev[/dev-pencil.slumberjakz.com/]
  you --> live[/pencil.slumberjakz.com/]
  dev --> access{{Cloudflare login}}
  live --> access
  dev -->|/pencil-store, storage key| bypass{{Storage bypass, no login}}
  live -->|/pencil-store, storage key| bypass
  bypass --> devcaddy[dev site box on Brian, port 8101]
  bypass --> livecaddy[live site box on Brian, port 8100]
  devcaddy --> store[(Shelf: rclone S3 on Brian)]
  livecaddy --> store
  store --> fig[(design .fig)]
  store --> notes[(design .comments.json)]
  claude[[Claude]] -.->|reads and answers| notes
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
  class you,dev,live player
  class access,bypass,claude other
  class devcaddy,livecaddy server
  class store,fig,notes data
  class live,access,livecaddy,store,fig built
  class dev,bypass,devcaddy,notes building
  class claude planned
```

### A comment thread's states

```mermaid
stateDiagram-v2
  [*] --> Open: posted
  Open --> Open: reply
  Open --> Resolved: tick
  Resolved --> Open: reopen or new reply
  Open --> Deleted: delete
  Resolved --> Deleted: delete
  Deleted --> [*]
```

### Two saves at the same time

```mermaid
sequenceDiagram
  participant A as dev-pencil tab
  participant S as Shelf
  participant B as Another tab or Claude
  A->>S: read comments file
  B->>S: read comments file
  B->>S: write file with its new reply
  A->>S: read newest file again
  A->>A: join both copies by id
  A->>S: write joined file (both replies kept)
```

## Analytics

None. An internal tool for Niraj, like InfiniBoard.

## Shared and game parts

Shared tooling; no game code.

## Undo

dev-pencil is a separate site. Taking it down: `docker compose down` in `/opt/data/selfhost/openpencil-dev` on
Brian, then remove its Cloudflare route, DNS record and the two Access apps (steps in that folder's `UNDO.md`).
Comments files on the shelf are plain text and harmless to live pencil; they can stay or be deleted.
