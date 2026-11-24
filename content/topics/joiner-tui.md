The TUI spec describes what a first-time attendee sees, screen by screen. It is the human side of [[join-binary]].

## Screen 1 — pre-flight, read-only

A matrix of checks: cores, RAM, GPU, disk, network, OS. Nothing is installed, nothing is uploaded. The user can read the verdict before agreeing to anything.

## Screen 2 — the verdict

Host or Guest, with the failing row highlighted and a plain-language reason. "16 GB required, this laptop has 15" is a better message than a red cross.

## Screens 3+ — consent and handoff

Driver download consent (D4), diagnostics upload consent (D3), registration, waiting for approval, agent install. Each step is skippable with a clear consequence.

## The rules that constrain the design

- Never install without consent.
- Never upload diagnostics without consent.
- Never claim a step succeeded without checking.
- Always offer a manual path when automation fails.

## Status

The screens are **designed, not shipped**. The engine and `--plain` mode exist; the richer TUI is the proposal. The map marks the topic accordingly.

## Check it yourself

```bash
./ldndrc-join --detect-only
```
