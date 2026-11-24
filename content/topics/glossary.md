Every hard word in this map, in one line each. Come back here whenever a lesson assumes something.

| Word | Plain meaning |
|---|---|
| **Node** | A laptop that is part of the cluster |
| **Pod** | The smallest unit Kubernetes runs; here, one student's workspace |
| **Deployment** | A controller that keeps one pod running and restarts it |
| **Service** | A stable in-cluster address for a pod |
| **PVC** | A disk claim; here, the student's home directory |
| **Ingress** | The front door that reads hostnames and forwards |
| **Namespace** | A named box for objects; the tenancy boundary |
| **RBAC** | Rules about which identity may do which verb |
| **CNI** | The plugin that gives pods network addresses (Flannel) |
| **DDS** | ROS 2's discovery and transport layer |
| **Domain ID** | A number that separates DDS graphs |
| **Control plane** | The panel: auth, sessions, onboarding, gateway |
| **Host** | A laptop that contributes compute |
| **Guest** | A laptop that only opens a browser |
| **Operator** | The person who owns the master |
| **Session** | One student's private workspace |
| **Gateway** | The panel's reverse proxy into session pods |
| **mDNS** | Local network name announcement, no DNS server |
| **Captive portal** | A page that appears instead of the internet |

## The one sentence to remember

A student gets a pod; a pod gets a namespace; a namespace makes DDS invisible to everyone else — see [[dds-isolation]].
