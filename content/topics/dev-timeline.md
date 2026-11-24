The project was built in seven eras, each one fixing the most painful thing about the previous one. The checkpoints in `local_dev_docs/` are the receipts.

## Era 1 — One box per student (CP01–CP06)

Started as scripts and an idea. Ended with a Kubernetes Deployment, Service, and PVC per session, provisioned by a Go panel. The naive version had one shared workspace; the whole point of the era was killing it.

## Era 2 — Doors instead of hallways (CP07–CP09)

The first design used path prefixes (`/code`, `/sim`, `/stream`) into a shared room. That broke isolation and made routing ambiguous. The fix was named doors: four hostnames, cookie auth, and a gateway that reads the `Host` header. Old paths answer `404` today, on purpose.

## Era 3 — Proof (CP08–CP13)

Static manifest checks, then live K3s verification, then GPU-optional scheduling, then deletion of the legacy ingress. Each checkpoint ends with a command whose output is the proof. This is where the habit of "no claim without a verify" started.

## Era 4 — Welcoming laptops (CP14–CP20)

The nodes API, the join binary, mDNS advertisement, the release pipeline, and the first paired rehearsal. Then the real cutover: the platform moved onto the actual master laptop and the demo stood down.

## Era 5 — Safety and memory (CP21–CP26, CP39–CP40)

CSRF stamps, session persistence across small restarts, the student SPA, the instructor console, and a merge that broke login for returning visitors — then the live fix. This era is where most of the hard-won lessons live.

## Era 6 — A real robot world (CP27–CP38)

Base image, workspace image, immutable tags, disk budget, Selkies 2.0.0, Fuel seeding, live sim proof, compression. The platform stopped using a stand-in and started running actual Gazebo.

## Era 7 — The front door (CP41–CP43)

LAN onboarding portal, durable panel databases, and the captive portal proven on real hardware. A stranger can now join the Wi-Fi and end up with a working page.

## What the order teaches

Every era began with a failure that the previous era's success exposed. Sessions were fast, so they needed isolation. Isolation worked, so laptops wanted in. Laptops joined, so the state had to survive redeploys. The [[roadmap]] is the next era, written down.

## Check it yourself

```bash
ls local_dev_docs/checkpoint-*.md | wc -l
# 43
```
