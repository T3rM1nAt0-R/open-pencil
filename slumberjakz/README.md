# Slumberjakz fork of OpenPencil

This is Studio Slumberjakz's fork of [OpenPencil](https://github.com/open-pencil/open-pencil) (MIT). We use it to
run Pencil on our own server and to send fixes back to OpenPencil's makers.

## Branches

| Branch | What it is |
| --- | --- |
| `master` | An exact copy of OpenPencil's `master`. Never commit here. |
| `slumberjakz` | What our server runs: a released OpenPencil version (now v0.15.1) plus our few changes. |
| `fix/*`, `feat/*` | One change each, cut from `master`, sent to OpenPencil as a pull request. |

We follow OpenPencil's own rules (`CONTRIBUTING.md`, `AGENTS.md`): Conventional Commit messages, `bun run format`
(oxfmt) before committing, `bun run lint` and `bun run typecheck` clean, every label in the language files, shared
UI pieces (Reka UI menus, `AppInput`, `AppButton`), and no AI co-author lines in commits (AI help is disclosed in the
PR's "AI assistance" section instead).

Each change on `slumberjakz` is also offered upstream and dropped from ours once OpenPencil merges it, so we
never drift far apart.

## Our changes on `slumberjakz`

| Change | Spec | Sent upstream? |
| --- | --- | --- |
| Comments: Comment tool (C), pins, replies, resolve; list with tabs, search, filter and sort; saved beside the design on the shelf | [specs/Comments.md](specs/Comments.md) | Not yet (translated; next step is OpenPencil's PR template and checks) |
| One-click Built / Being built / Planned stamps on screens | [specs/Stamps.md](specs/Stamps.md) | No, ours only (Slumberjakz workflow) |
| `deploy/dev-pencil/`: the test site at dev-pencil.slumberjakz.com | this file | No, ours only |
| Storage address and bucket filled in ahead of time on dev-pencil (keys are always typed in the browser, never built in) | this file | Maybe later |
| Daily copies of every shelf design, kept 14 days (runs beside dev-pencil) | [specs/Design-Copies.md](specs/Design-Copies.md) | No, ours only |

## Sites

- **dev-pencil.slumberjakz.com**: built from `slumberjakz` with `deploy/dev-pencil/publish.sh`, served on Brian from
  `/opt/data/selfhost/openpencil-dev` (port 8101). It uses the live site's design storage.
- **pencil.slumberjakz.com**: stock OpenPencil v0.15.1, set up from InfiniBoard's `deploy/openpencil/`. It moves to
  a build of this branch only when Niraj says "promote".
