A laptop that has never joined the cluster cannot download anything from the cluster. That is the chicken-and-egg problem the onboarding portal solves.

## The setup

The master hosts a **separate onboarding Wi-Fi**, distinct from the cluster router. A laptop joins it and expects internet. Instead it gets a real page served by the control panel — the OS may even show its "sign in to network" prompt, because the redirect trap makes the network behave like a captive portal.

```bash
# on the joining laptop — no internet required
curl http://<master-ip>:8082/portal
curl -O http://<master-ip>:8082/portal/joining-cluster.sh    # Linux/macOS
# Windows:
curl -O http://<master-ip>:8082/portal/joining-cluster.ps1
```

## The enrollment flow

1. The script registers the laptop — idempotent, safe to re-run.
2. The instructor sees the request in the console and approves or denies it.
3. The script polls until approved, then tries to switch Wi-Fi to the cluster network.
4. If the switch fails, it prints manual instructions rather than pretending.
5. Approved Hosts are offered the K3s agent install.

## The download counter

The portal shows a live count of **served** downloads. The semantics are deliberately narrow:

- a request that is served counts
- a request that is redirected or blocked does not
- no device identifiers are stored
- the public endpoint exposes only aggregate numbers

`/api/downloads/stats` gives requests plus a unique-device estimate and requires a JWT.

## What this is and is not

The `tools/captive-portal/run.sh` harness starts the panel plus the redirect trap and prints the three root steps: hotspot, dnsmasq, nftables. It is a **workshop rig**, not gateway enforcement. A laptop can still reach the cluster router if it knows the SSID.

Gateway enforcement is a designed follow-up, not shipped. The map reflects that in the topic's status.

## Check it yourself

```bash
./tools/captive-portal/run.sh status
./test-captive-trap.sh
curl -s http://<master-ip>:8082/api/downloads/count
```
