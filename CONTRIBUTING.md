# Contributing to LDNDRC

Thanks for wanting to help. This project is a workshop platform built by people who
had to run it in front of a room, so the bar is simple: **if you claim it works, show
the command that proves it.**

You do not need to be a Kubernetes expert to contribute. Documentation, tests, and
honest failure reports are as valuable as features.

## The three laws

These are not style preferences. Every merge should respect them.

1. **The LAN comes first.** Nothing may require the public internet to run a class.
   No cloud identity, no hosted database, no external registry at demo time.
2. **Isolation is a structural property.** One student per pod, one namespace per
   session, DDS never crossing the pod boundary. Do not "fix" isolation with a
   firewall rule or a shared workspace.
3. **Least privilege, proven by command.** The panel runs with namespace-scoped RBAC.
   A new permission needs a `kubectl auth can-i` line showing exactly what it grants.

## Ways to help

| Area | What it looks like | Start here |
|---|---|---|
| **Docs** | Fix a wrong command, explain a failure mode, turn a checkpoint into a lesson | `README.md`, `local_dev_docs/`, `docs-site/content/topics/` |
| **Control panel (Go)** | Sessions, auth/CSRF, onboarding, gateway, portal | `control-panel/` — `go test ./...` is green |
| **Student UI (React)** | Launch screen, workspace shell, instructor console | `control-panel/web/` |
| **Manifests** | RBAC, Deployment/Service/Ingress, GPU scheduling | `manifests/` |
| **Join path** | `join-cluster.sh`, `ldndrc-join`, mDNS, release pipeline | `join-cluster.sh`, `docs/host-joiner-tui-spec.md` |
| **Simulation** | Session image, Gazebo worlds, websocket scene bridge | `images/`, `sim-web-app/` |
| **Docs site** | The concept map and library under `docs-site/` | `docs-site/README.md` |
| **Testing** | Root-free checks that run in seconds | `test-join.sh`, `test-joining.sh`, `test-captive-trap.sh` |

Never contributed before? Take any row in `docs/roadmap.md` and shrink it until it
is one afternoon of work. That is how this repo was built: 43 checkpoints, each one
the smallest provable step.

## Repository map

```text
control-panel/          Go service + embedded React SPA
  internal/             auth, sessions, nodes, gateway, portal, discovery, join
  web/                  student + instructor UI (Vite, TypeScript)
manifests/              the entire declared Kubernetes surface
images/                 session image layers + demo stand-in
sim-web-app/            standalone gzweb viewer harness (:9002 scene path)
tools/captive-portal/   onboarding Wi-Fi harness (prints privileged steps, never runs them)
docs/                   design docs: roadmap, joiner TUI, portal, UI/UX, journey
local_dev_docs/         build checkpoints and the operator cheatsheet
docs-site/              the concept map site (content/ + src/ + build.mjs)
```

## Setup

Prerequisites: Go ≥ 1.26, Node ≥ 22 (docs site ≥ 20), Docker, `kubectl`, `k3d`.

```bash
# optional, matches the repo's tool pins
mise install

# container access without sudo
sudo usermod -aG docker "$USER"
newgrp docker
docker ps
```

The fastest full-stack loop is the one-laptop demo in `README.md` (Path A) or
`docs/local-cluster-headlamp.md`. You do not need a GPU or a second laptop for it.

## The development loop

### Control panel

```bash
cd control-panel
go build ./...
go test ./...          # ~12s; internal/join covers the driver
```

Run it locally, outside any cluster, for API work. The three databases default to
`/var/lib/ldndrc/`, which needs root on most machines — point them somewhere writable:

```bash
mkdir -p /tmp/ldndrc-dev
JWT_SECRET=dev-only \
  CONTROL_PANEL_PORT=8087 \
  ADVERTISE_MDNS=false \
  SESSIONS_DB=/tmp/ldndrc-dev/sessions.json \
  NODES_DB=/tmp/ldndrc-dev/nodes.json \
  DOWNLOADS_DB=/tmp/ldndrc-dev/downloads.json \
  go run ./cmd/server

curl -s http://127.0.0.1:8087/healthz    # {"status":"ok"}
```

Without in-cluster config the panel still serves login, sessions (recorded, not
provisioned), node registration, the portal, and the gateway routes — enough to test
auth, CSRF, validation, and handler behaviour. Anything that needs a real pod
requires Path A.

The student UI must be built before `go build` embeds a real SPA. `control-panel/web/dist/`
is gitignored:

```bash
cd control-panel/web
npm ci
npm run build
```

### Images

```bash
docker build -t ldndrc/control-panel:dev ./control-panel
docker build -t ldndrc/demo-standin:dev ./images/demo-standin
k3d image import ldndrc/control-panel:dev ldndrc/demo-standin:dev -c ldndrc
```

The workspace image is ~10 GB and takes a long time. Do not rebuild it to test a
frontend change. Use `demo-standin` unless the change is actually inside the session.

### Docs site

```bash
cd docs-site
npm install
npm run build      # validates the graph, then writes dist/
npm run serve      # http://127.0.0.1:8090
```

## Verification matrix

Pick the row that matches your change. Paste the command and its output in the PR.

| Change | Prove it with |
|---|---|
| Go logic | `cd control-panel && go test ./...` |
| Panel boots | `JWT_SECRET=x go run ./cmd/server` then `/healthz` |
| Manifest / RBAC | `kubectl apply --dry-run=server -f manifests/` + `kubectl -n ldndrc auth can-i …` |
| Session lifecycle | Create a session, wait for `ready`, `curl` the editor host with and without the cookie (`200` / `401`) |
| Join detection | `./test-join.sh` and `./test-joining.sh` |
| Captive redirect | `./test-captive-trap.sh` |
| Student UI | `cd control-panel/web && npm run build` (runs `tsc`) |
| Docs site | `cd docs-site && npm run build` (fails on a broken graph) |
| Anything user-visible | A screenshot or a two-line before/after, not a description |

If a check needs hardware you do not have, say so explicitly. "Not tested on a
second laptop" is an acceptable sentence. "Should work" is not a verification.

## Making a change

1. **Open an issue or leave a note first** for anything bigger than a docs fix, so
   the design conversation does not happen inside a diff.
2. **Branch by intent:** `feat/<scope>`, `fix/<scope>`, `docs/<scope>`.
3. **Keep the change one idea.** A refactor mixed with a behavior change cannot be
   reviewed or reverted cleanly.
4. **Update the docs in the same commit.** A feature with no operator instructions
   is not finished; this repo has been burned by that.
5. **Record the proof.** For a milestone, add the next
   `local_dev_docs/checkpoint-NN-<slug>.md` using the existing checkpoints as the
   template: big picture, what got built, what was verified, what was not.
6. **Commit style** (conventional-ish, lowercase scope):

   ```text
   feat(portal): register the onboarding page before approval
   fix(csrf): exempt login from the CSRF guard
   docs: checkpoint 43 records the captive harness promotion
   ```

7. **PR description:** what changed, why, the verification output, and the known
   gaps. Link the roadmap row or checkpoint it closes.

## Conventions

### Go

- Standard library first: `net/http`, `client-go`, `encoding/json`. Justify any new
  dependency in the PR.
- Keep the package boundaries: `internal/auth`, `sessions`, `nodes`, `gateway`,
  `portal`, `discovery`, `join`. A handler that talks to Kubernetes directly is a
  smell — put it in `internal/sessions`.
- Errors at the gateway have one meaning each: `401` no cookie, `404` no session,
  `503` provisioning, `502` unhealthy pod. Do not collapse them.
- Tests are table-driven and hermetic. Do not require a live cluster for `go test`.

### Kubernetes

- One concern per manifest, and the filename says which concern.
- RBAC stays namespace-scoped. Cluster-wide verbs need a written reason.
- Session pods request `nvidia.com/gpu` only when the deployment says so; the demo
  path (`SESSION_GPU_LIMIT=0`) must keep working.
- Never commit a Secret. `secret.example.yaml` documents the shape; the real value
  is created at deploy time.

### UI

Five rules are in `docs/uiux-design.md`; the important ones for review: one primary
action per screen, status is ambient (top bar), and the desktop is an escape hatch,
not a default. Match the existing dark/warm visual language instead of introducing
a second design system.

### Docs and lessons

There are three shelves. Put the document on the right one.

| Shelf | Purpose | Tone |
|---|---|---|
| `docs/` | Design and operations references | Precise, current, command-first |
| `local_dev_docs/` | Historical checkpoints and the cheatsheet | Past tense, receipts, honest gaps |
| `docs-site/content/topics/` | Taught lessons distilled from the two above | One concept, prerequisites, a `Verify` command |

Lesson voice: start with the problem, name the mechanism, state the failure mode,
end with something the reader can run. A lesson that only links to another document
is a stub and should not be marked `shipped`.

To add a topic:

1. Add the node to `docs-site/content/graph.json` with `domain`, `title`, `summary`,
   `status`, `minutes`, `requires`, `sources`, `glyph`, and `verify`.
2. Write `docs-site/content/topics/<id>.md`. Use `[[other-topic-id]]` for links.
3. `npm run build` — it refuses unknown prerequisites, missing files, and cycles.
4. Check the rendered route with **Route to here**.

Status is a claim: `shipped` = proven on real machines, `partial` = works in pieces
with the gap named, `designed` = written down but not built. When in doubt, downgrade.

## What will not be merged

- A cloud dependency in the live path, or anything that breaks with the uplink down.
- A second shared workspace, or an isolation change that relies on cooperation.
- Secrets, private IPs, tokens, or machine-specific paths committed to the repo.
- `AUTO_APPROVE=true` as a default, or any path that removes the human approval step.
- "Done" without a command, a checkpoint, or a live proof.
- Assets or CSS copied from `vimjoyer.com/nixmap`; the docs site re-implements the
  design from tokens.
- A large speculative feature that is not on the roadmap and has no smallest slice.

## Review checklist

For the author, before asking for review:

- [ ] The change is one idea and its diff is readable.
- [ ] `go test ./...` (and `npm run build` where relevant) passes.
- [ ] The verification command is in the PR and its output is pasted.
- [ ] Docs and the roadmap row are updated in the same commit.
- [ ] Known gaps are stated, not hidden.
- [ ] No secret, private address, or vendor-specific hack without a comment.

For the reviewer:

- [ ] Does it keep the LAN-first and isolation laws?
- [ ] Is the new permission or dependency justified?
- [ ] Does the failure mode have a diagnosable status or log line?
- [ ] Does the claim match the proof?

## Where to start right now

From `docs/roadmap.md`, in order of impact:

1. **R2-final** — durable panel state across a redeploy (PVC + safe rollout).
2. **R4** — the pretty 3D viewer instead of the raw data frame.
3. **R5** — a full two-laptop install rehearsal, end to end.
4. **R7** — encryption at rest, resource limits, operator dashboards.
5. **Docs** — every `designed` topic on the map is an invitation to build or to
   sharpen the specification.

## Getting unstuck

- `local_dev_docs/cheatsheet.md` — "if X, run Y" for operators.
- `docs/project-journey-report.md` — the plain-English architecture and glossary.
- `docs/roadmap.md` — what is done, what is left, and why in that order.
- The docs site (`docs-site/`) — the same material as a guided map, with a verify
  command on every topic.

Open an issue with the failing command, the output, and what you expected. A good
bug report is a contribution in itself.
