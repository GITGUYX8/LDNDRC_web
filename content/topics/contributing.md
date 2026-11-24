Contribution is a first-class route through LDNDRC, not an afterthought. The project is a workshop platform, so a useful contribution makes the next workshop safer, clearer, or easier to reproduce.

## Start with the smallest slice

Read `CONTRIBUTING.md`, then choose one focused change. Good contributions include a corrected command, a hermetic test, a failure-mode explanation, a manifest improvement, or one independently reviewable feature.

The project has three laws:

1. LAN first: the live workshop must not depend on the public internet.
2. Isolation is structural: one student gets one private workspace; DDS never crosses the pod boundary.
3. Least privilege is proved: new permissions need a concrete `kubectl auth can-i` check.

## Choose the right shelf

| Change | Home |
|---|---|
| Design or operator reference | `docs/` |
| Historical proof and milestone | `local_dev_docs/` |
| Guided concept lesson | `docs-site/content/topics/` |
| Runtime behaviour | `control-panel/`, `images/`, or `manifests/` |
| Public process | `.github/ISSUE_TEMPLATE/` or `.github/PULL_REQUEST_TEMPLATE.md` |

## Open an issue well

The repository includes templates for bug reports, feature requests, and documentation updates. A useful issue names the environment, gives the exact reproduction, includes evidence, and says what could not be tested. Never paste tokens, private IPs, or credentials.

A feature request should describe the smallest useful slice, its trade-offs, failure mode, and proof command. A documentation issue should include replacement wording or the corrected command rather than only saying that something feels unclear.

## Make a pull request

Use the PR template. Explain what changed and why, paste the verification output, update documentation in the same change, and state known gaps. Keep one idea per PR and use a focused branch such as `feat/portal`, `fix/gateway-status`, or `docs/contribution-route`.

Useful commit shapes are:

```text
feat(portal): show approval status before download
fix(gateway): preserve provisioning status
 docs: add a reproducible join rehearsal
```

## Verify before claiming done

```bash
cd control-panel && go test ./...
./test-join.sh
./test-joining.sh
./test-captive-trap.sh
cd docs-site && npm run build
```

For Kubernetes changes, add `kubectl apply --dry-run=server -f manifests/` and the relevant `kubectl auth can-i` output. For a user-visible change, include a screenshot or a short before/after. If a second laptop, GPU, or real LAN was unavailable, say that plainly.

## Add to the map

To improve this lesson or add a contribution topic:

1. Edit `content/topics/<id>.md` with the problem, mechanism, failure mode, and a runnable Verify command.
2. Add the node and its prerequisites to `content/graph.json`.
3. Use `[[topic-id]]` links for related concepts.
4. Run `npm run build` and check the route in the map.

The contribution templates are available in the Library alongside `CONTRIBUTING.md`, so the process can be learned and followed from the same site.

## What will not be merged

No committed secrets, unexplained cluster-wide permissions, shared workspaces, cloud-only live paths, silent driver installation, default auto-approval, copied nixmap assets, or “done” claims without a test, command, checkpoint, or live proof.

## Verify it yourself

```bash
test -f CONTRIBUTING.md && \
test -f .github/PULL_REQUEST_TEMPLATE.md && \
test -f .github/ISSUE_TEMPLATE/bug_report.md && \
echo "contribution workflow is present"
```
