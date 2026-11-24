The requirement that shaped everything else: the platform must work with **no cloud, no dedicated server, and no internet dependency** during a workshop.

That sounds like a deployment detail. It is really a design constraint that eliminates whole categories of solution.

## What it rules out

- **Managed Kubernetes.** No EKS, no GKE, no control plane you do not own.
- **External identity.** No OAuth provider. Login has to work when the uplink is down.
- **Hosted object storage.** Student home directories live on a PVC in the cluster.
- **CDNs.** Fonts, viewer assets, and scripts ship with the image.

## What it forces

**A static address.** The master needs a predictable LAN IP, because four hostnames have to resolve to it. There is no DNS server, so Guests get `/etc/hosts` entries or mDNS.

**A hardware tier.** Since compute is donated, the platform must decide which laptops qualify — that is [[hardware-gate]], and it exists because of this constraint.

**An enrollment path that works before the network works.** A laptop that has never seen the cluster cannot download an agent from it. The answer is a captive portal served on a separate onboarding access point: [[captive-portal]].

**Local images.** A 10 GB workspace image cannot be pulled from a registry over a workshop uplink. It is built, tagged immutably, exported as a tarball, and imported node by node.

## The trade-off

You get predictability, zero recurring cost, and data that never leaves the room. You pay in operational sharp edges: IP addresses are manual, image distribution is manual, and the master is a single point of failure with no failover.

For a classroom that is the right trade. For a product you would sell, it is not — which is why the roadmap keeps [[roadmap]] honest about what is still missing.

## Check it yourself

```bash
ip -4 addr show | grep inet
```

If the master's address is DHCP-assigned, this constraint is already being violated. Pin it.
