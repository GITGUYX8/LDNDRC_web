Tagging a version triggers GitHub Actions to build the join binary for every laptop flavour, test it, checksum it, and publish a release. No USB sticks, no `scp`, no "which build do you have?".

## What it produces

- Linux, Windows, and macOS builds
- both common architectures per platform
- a SHA-256 checksum beside each binary
- a release page with copy-paste install lines

## Two deliberate choices

**No GoReleaser.** Plain workshop tools, fewer moving parts, zero cost. The workflow file is readable by anyone who might need to fix it.

**Tests gate the release.** A broken build never ships, which is the only reason publishing is safe to do from a tag.

## The lesson it recorded

Renaming a downloaded binary breaks its checksum verification. The spec now says: keep the release filename. That bug was caught by the project's own verification steps, not by a user — which is the point of having them.

## Check it yourself

```bash
gh release list
gh release view <tag> --json assets
```
