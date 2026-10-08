# Comments in Pencil

Requested by Niraj, 2026-10-08. Lives on the `slumberjakz` branch of this fork and runs at
https://dev-pencil.slumberjakz.com. Live pencil (https://pencil.slumberjakz.com) stays on stock OpenPencil
v0.15.1 until Niraj says "promote".

## What it is

Leave notes on a design, like sticky notes with a conversation attached. The flow follows Figma and Notion
(round 2, from Niraj's canvas feedback, 2026-10-08):

- **Comment tool.** Press **C**, or the speech-bubble-plus button at the end of the bottom toolbar, then click
  anywhere and type. Enter posts. Esc, or picking any other tool (V, R, T…), leaves comment mode.
- **Pins follow the layer.** A pin dropped on a frame stays on that frame when the frame moves. If the frame is
  deleted, the pin stays where it was.
- **Thread card.** Click a pin to open its thread: reply, resolve (tick), or **More actions** (copy text, delete).
- **Comments list.** The comments button at the top right (with the open count) only opens and closes the list; it
  never starts a new comment. In the list:
  - **Open / Resolved** tabs, each with its count.
  - **Search** across comment text, replies, names and layer names.
  - **Filter and sort**: this page or all pages, only my comments, newest or oldest first.
  - Hover a comment for a quick **Resolve** tick and **More actions**; click it to jump to its page and spot.
- **Right-click** a pin or a comment in the list for the same actions: go to comment, resolve or reopen, copy text,
  delete. Right-clicking comments no longer opens the canvas layer menu underneath.
- **Resolve** hides the pin from the canvas; it shows again while the list is on the Resolved tab. A new reply
  reopens a thread. **Delete** asks first.
- **Names.** The first comment asks for a name, kept in this browser (the same name the live-collab panel uses).
- **Languages.** Every word is in OpenPencil's language files (English plus its 8 translations), so the feature can
  be offered to OpenPencil's makers.

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
- Mentions inside comments (@name).
- Unread markers per person.

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
  act -->|C or toolbar Comment button, then click| draft[/Note box at that spot/]
  draft --> name{Name known?}
  name -->|no| ask[/Name box/]
  ask --> post[Post]
  name -->|yes| post
  act -->|Click a pin| thread[/Thread card: reply, resolve, more actions/]
  act -->|Comments button| list[/List: Open or Resolved, search, filter, sort/]
  act -->|Right-click a pin or list item| menu[/Menu: go to, resolve, copy, delete/]
  list -->|click one| jump[Go to its page and spot]
  list -->|hover tick| resolve[Resolve]
  menu -->|Delete| confirm{Sure?}
  confirm -->|yes| saved
  menu --> resolve
  resolve --> saved
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
  class start,pins,draft,ask,thread,list,act,name,menu,confirm player
  class shelf,load,local,post,jump,resolve phone
  class saved data
  class start,shelf,load,local,pins,act,draft,name,ask,post,thread,list,jump,saved,menu,confirm,resolve building
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

### Comment mode and the list

```mermaid
stateDiagram-v2
  [*] --> Editing
  Editing --> Commenting: C or toolbar Comment button
  Commenting --> Editing: Esc, C again, or another tool
  Commenting --> Commenting: click canvas, post note
  state "List open" as ListOpen
  Editing --> ListOpen: comments button
  ListOpen --> Editing: comments button again or close
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
