There are three roles, and the interesting part is that they are assigned by **hardware**, not by a permission table. A laptop does not choose to be a Host. It either clears the bar or it does not.

## Host

A gaming or workstation laptop: at least 8 CPU cores, at least 16 GB of RAM, and an NVIDIA GPU. It runs `./join-cluster.sh`, installs the K3s agent, and gets labelled `node-role.kubernetes.io/role=host`. From then on it is a scheduling target for student pods. It should stay plugged in.

## Guest

Any laptop with Chrome or Firefox and WebGL. It installs nothing, joins no cluster, and holds no credentials beyond a browser cookie. It consumes a session that is scheduled on somebody else's Host.

## Operator

The master laptop, with a static LAN IP and sleep disabled. It runs the K3s server, the control panel, the ingress, and the approval console. There is exactly one, and it is the only machine a student never thinks about.

## Why this split works

The three roles map cleanly onto three threat and failure models:

- A **Guest** can be compromised without touching anyone else's data — every session is its own pod with its own home volume.
- A **Host** only ever contributes capacity. It runs other people's pods but has no panel credentials.
- The **Operator** holds the JWT secret and the K3s token. Losing a Host is an inconvenience; losing the Operator is a rebuild.

This is also why onboarding is operator-gated: a laptop that clears the hardware bar still cannot become a Host until a human approves it. See [[nodes-api]].

## Where the boundary actually sits

```text
Guest browser ──cookie──▶ control panel ──JWT──▶ session pod on a Host
                                │
                                └─ K3s token ─▶ Host agent (approved once)
```

A Guest never talks to a Host directly. All traffic is HTTP, WebSocket, or WebRTC through the panel's gateway — which is the next idea, [[dds-isolation]].

## Check it yourself

```bash
kubectl get nodes -L node-role.kubernetes.io/role
```

The `ROLE` column is the whole role model in one line.
