Every component here was chosen for one job. When a layer starts doing two jobs, that is usually where the bug is.

## The whole table

| Layer | Technology | The one job |
|---|---|---|
| Orchestration | K3s | Schedule pods on laptops, restart them, hold volumes |
| Runtime | containerd | Run containers (bundled with K3s) |
| CNI | Flannel | Pod networking, deliberately no DDS |
| Ingress | Traefik | Route four hostnames to the panel |
| GPU | NVIDIA GPU Operator | Driver + time-slicing on consumer cards |
| Robotics | ROS 2 Jazzy | Per-session middleware |
| Simulation | Gazebo Harmonic | Headless physics |
| Scene stream | `gazebo-web` + gzweb/Three.js | Publish and render the world |
| Desktop | Selkies | WebRTC Linux desktop |
| Editor | code-server | VS Code + terminals in a tab |
| Control plane | Go (`client-go`, JWT, `net/http`) | Auth, sessions, onboarding, gateway |
| Student UI | React 18 + Vite + TypeScript | Login, launch, workspace shell |
| Persistence | JSON on a volume | Sessions and node approvals |

## The omissions are choices

- **No service mesh.** Nothing needs mTLS between pods; isolation is a namespace property.
- **No external database.** The panel's state is small, and a database would add a failure mode to a workshop.
- **No registry.** Images are imported directly on the demo and pulled from a local registry on a real LAN.
- **No cloud identity.** Login must work with the uplink down — see [[lan-first]].

## Where the seams are

The Go panel is the only component that talks to Kubernetes. If you want to replace the UI, you replace React and keep the API. If you want a different simulator, you keep `:9002` and swap the bridge. The seams are deliberate, which is why the roadmap can add features without rewrites.

## Check it yourself

```bash
kubectl version --short
kubectl -n kube-system get pods
kubectl -n ldndrc get deploy -o wide
```
