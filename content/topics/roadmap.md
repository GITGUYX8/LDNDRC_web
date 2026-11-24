The roadmap is written in plain language on purpose. It is the document that keeps the project honest about the difference between "it works on my machine" and "a room of students can use it".

## The status map

| Colour | Meaning |
|---|---|
| Green | Built and tested on real machines |
| Amber | Half-ready — works partly, needs the next step |
| Red | Missing — real remaining work |

## The seven tracks

| Track | State | What remains |
|---|---|---|
| **R1** Old paths | done | nothing |
| **R2** Memory | partial | move sessions and approvals off `emptyDir` onto durable storage |
| **R3** Click safety | shipped | login exempted from the CSRF check (fixed and verified live) |
| **R4** Student site | done | pretty 3D viewer instead of a raw data frame |
| **R5** Welcoming laptops | partial | full two-laptop install rehearsal |
| **R6** Real robot world | done | share-faster follow-ups |
| **R7 + P5/P6** | left | encryption, limits, dashboards, Windows path, tidy docs |

## The next four things, in order

1. Durable state — losing sessions on a redeploy is the most embarrassing failure left.
2. The pretty viewer — the sim streams data, but the browser view is not the final one.
3. Two-laptop join — the join path is proven in pieces, not end to end.
4. R7 hardening — encryption at rest, resource limits, operator dashboards.

## Why this page exists

Because "done" is a claim, and claims decay. Every row here is tied to a checkpoint or a live verification elsewhere in this map. If a row has no proof, it is not done — that is the rule from [[dev-timeline]], applied forward.

## Check it yourself

```bash
git log --oneline -15
ls local_dev_docs/checkpoint-4*.md
```

Read the last few checkpoints and compare them to the table. Where they disagree, the checkpoints win.
