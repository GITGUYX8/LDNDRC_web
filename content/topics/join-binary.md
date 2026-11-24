Passing a binary around on a USB stick does not scale past one workshop. `ldndrc-join` is the guided installer that replaced it: one download, a hardware verdict, an explanation, and only then a request to join.

## What it does, in order

1. **Detects hardware** — cores, RAM, GPU, disk. No cluster contact yet.
2. **Shows the verdict** — Host or Guest, with the reason, not just a colour.
3. **Sniffs for the master** — mDNS `_ldndrc-master._tcp`, no IP typing.
4. **Asks before downloading anything** — driver consent is an explicit step (rule D4).
5. **Registers and polls** — the laptop asks to join; it waits for a human.
6. **Hands off to the agent** — only after approval does the K3s install happen.

## The decisions behind it

| Rule | Meaning |
|---|---|
| D1 | Never install a driver silently |
| D2 | Pre-flight is read-only; nothing changes before consent |
| D3 | Diagnostics upload is separate from network health |
| D4 | Driver download requires explicit consent |

These are product rules, not technical ones. They exist because the person running this is a workshop attendee, not an operator with sudo habits.

## Distribution

The binary ships from GitHub Releases, built by [[release-pipeline]]. Five flavours: Linux, Windows, and macOS on both common architectures, each with a SHA-256 checksum.

```bash
./ldndrc-join            # full TUI
./ldndrc-join --plain    # non-interactive, for scripts and tests
./ldndrc-join --detect-only
```

## Current status

The TUI spec is a **proposal**. The working path today is still `join-cluster.sh` plus the captive portal in [[captive-portal]]. The binary's engine, dashboard, and plain mode exist and are tested; the richer screens described in the spec are the designed-but-not-shipped part. The map marks this topic `partial` for exactly that reason.

## Check it yourself

```bash
./ldndrc-join --plain
# prints the Host/Guest verdict for this machine, exit 0
```
