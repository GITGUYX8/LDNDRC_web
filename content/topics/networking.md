Two networking components do all the work, and both are easy to misread.

## Flannel — the pod network

Flannel is the CNI. It gives every pod an IP address and makes pods routable to each other inside the cluster. It is also the component that makes [[dds-isolation]] true: Flannel's overlay carries IP traffic, but DDS discovery never generates any because the processes are isolated in their pod namespace.

Flannel is a deliberate choice for what it *doesn't* do. No network policy engine, no service mesh, no eBPF complexity. The isolation model does not depend on filtering packets; it depends on packets never being generated across the boundary.

## Traefik — the front door

Traefik is bundled with K3s and listens on the cluster's ports 80 and 443. Its job is simple: read the `Host` header and route to a Service.

The four hostnames are the whole public surface:

```text
control.ros-platform.local   → control panel :8082
editor.ros-platform.local    → gateway → session pod :7682
desktop.ros-platform.local   → gateway → session pod :8080
gazebo.ros-platform.local    → gateway → session pod :9002
```

Only `control.` points at a fixed workload. The other three point at the control panel too — the panel is the gateway, and it decides which pod to proxy to based on the logged-in cookie. That indirection is [[gateway-proxy]].

## Name resolution

There is no DNS server in the design. Guests resolve the four names one of two ways:

- `/etc/hosts` entries pointing at the master's LAN IP
- mDNS advertisement from the master (see [[join-binary]]'s discovery path)

On a real LAN you also need the master reachable from every Guest. That means a static IP and a router that does not isolate clients — many venue Wi-Fis do, and that is a real failure mode.

## Check it yourself

```bash
kubectl -n kube-system get svc traefik
kubectl get ingress -A
```

An ingress with no address is not routing yet. Read its events before touching the panel.
