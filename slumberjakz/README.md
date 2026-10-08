# Slumberjakz fork of OpenPencil

This is Studio Slumberjakz's fork of [OpenPencil](https://github.com/open-pencil/open-pencil) (MIT). We use it to
run Pencil on our own server and to send fixes back to OpenPencil's makers.

## Branches

| Branch | What it is |
| --- | --- |
| `master` | An exact copy of OpenPencil's `master`. Never commit here. |
| `slumberjakz` | What our server runs: a released OpenPencil version (now v0.15.1) plus our few changes. |
| `fix/*`, `feat/*` | One change each, cut from `master`, sent to OpenPencil as a pull request. |

Each change on `slumberjakz` is also offered upstream and dropped from ours once OpenPencil merges it, so we
never drift far apart.

## Our changes on `slumberjakz`

| Change | Spec | Sent upstream? |
| --- | --- | --- |
| Comments: pins, replies, resolve, a list; saved beside the design on the shelf | [specs/Comments.md](specs/Comments.md) | Not yet (needs translations first) |
| `deploy/dev-pencil/`: the test site at dev-pencil.slumberjakz.com | this file | No, ours only |
| Daily copies of every shelf design, kept 14 days (runs beside dev-pencil) | [specs/Design-Copies.md](specs/Design-Copies.md) | No, ours only |

## Sites

- **dev-pencil.slumberjakz.com**: built from `slumberjakz` with `deploy/dev-pencil/publish.sh`, served on Brian from
  `/opt/data/selfhost/openpencil-dev` (port 8101). It uses the live site's design storage.
- **pencil.slumberjakz.com**: stock OpenPencil v0.15.1, set up from InfiniBoard's `deploy/openpencil/`. It moves to
  a build of this branch only when Niraj says "promote".
