# LDNDRC — 100 Interview Questions & Answers

**Format:** basic → advanced, written the way an interviewer would actually ask them. Each answer is spoken-style, explains the term instead of assuming it, and several questions include a follow-up cross-question so you can practise defending the design.

**Ground rule:** where the project has a known limit, the answer says so. Do not claim the platform is more finished than it is. Interviewers trust candidates who can name their own weak points.

**Sections**

1. Project fundamentals — Q1–Q12
2. Kubernetes and cluster operations — Q13–Q30
3. Networking, gateway, DNS, isolation — Q31–Q45
4. ROS 2, Gazebo, and the workspace image — Q46–Q58
5. Authentication, security, and onboarding — Q59–Q78
6. Reliability, debugging, and operations — Q79–Q90
7. Case studies and scenario questions — Q91–Q100

---

## Part 1 — Project fundamentals

### Q1. Give me a one-minute walkthrough of LDNDRC.

**Answer:** LDNDRC is a local-first robotics classroom platform. A group of consumer laptops forms a small Kubernetes cluster using K3s. Strong laptops, called Hosts, contribute CPU, RAM, and optionally a GPU. Weak laptops, called Guests, only need a browser. One machine, the Master or Operator, runs the K3s control plane and the Go control panel. When a student logs in and clicks Launch, the control panel creates a Kubernetes Deployment, a Service, and a 5 GiB home volume for that student. Inside that pod they get three browser tools: code-server for VS Code and a terminal, Selkies for a full Linux desktop over WebRTC, and a Gazebo WebSocket bridge for the 3D simulation view. Everything stays on the local network; there is no cloud dependency. The main design goal is that each student gets a private ROS 2 environment, so two students can use the same topic name and never see each other's robots.

**Follow-up:** "What is the single most important design decision?" — One session per student with its own pod network namespace and its own ROS domain ID. That decision drives the isolation model, the provisioning model, and most of the operational complexity.

### Q2. What problem does this solve, and who is it for?

**Answer:** It is for teaching robotics in a room where you do not have a server room or reliable internet. Normally, running ROS 2 and Gazebo for a class means either powerful lab machines per student or cloud instances with GPU billing and network dependency. LDNDRC uses the laptops people already brought. Strong laptops share compute; weak laptops become thin clients. The instructor gets a browser console to approve machines, see sessions, and manage the class. Students install nothing and only need a modern browser with WebGL.

**Cross-question:** "Why not just install ROS 2 on every laptop?" — Because the weak laptops cannot run Gazebo at usable speed, and managing 30 different Linux installs is the actual cost. Centralising the runtime in containers makes the student experience identical regardless of their laptop.

### Q3. Why local-first instead of cloud?

**Answer:** Three reasons. First, the classroom network may have no internet or very poor internet, and a robotics lab should not stop working because the WAN is down. Second, GPU simulation is expensive in the cloud and latency-sensitive for interactive desktop streaming. Third, student work and camera or robot data stay on the local network. The trade-off is that we inherit LAN problems: DHCP address changes, wildcard DNS, multicast restrictions, and no built-in TLS. Those are real costs, and the project documents them rather than pretending the LAN is a perfect environment.

**Follow-up:** "Would you ever put this in the cloud?" — Yes, the architecture is portable: K3s, containers, and a Go service all run in a cloud VPC. But then you lose the core value proposition, so I would only do it for remote students or as a hybrid where the control plane is local and a few sessions burst to cloud nodes.

### Q4. Define Host, Guest, Master, and Session as used here.

**Answer:** A Host is a laptop that passes the hardware gate — at least 8 CPU cores, 16 GB RAM, an NVIDIA GPU, and enough free disk — and joins K3s as a worker. A Guest is any other laptop; it never joins the cluster and only uses the browser. The Master is the laptop that runs the K3s server and the control panel; it has a stable LAN address and stays awake. A Session is one student's private workspace: one Deployment, one Service, one home PVC, and one pod with a unique ROS domain ID.

**Follow-up:** "Can the Master also be a Host?" — In the current single-laptop demo, yes: the same machine runs the control plane and hosts a session. In a real classroom I would keep the Master off the session workload path so a heavy simulation cannot starve the control plane.

### Q5. Walk me through what happens when a student logs in and clicks Launch.

**Answer:** The browser posts credentials to `/api/auth/login`. The panel returns a signed JWT, a CSRF token, and an HttpOnly session cookie scoped to `.ros-platform.local`. The student clicks Launch, which sends `POST /api/sessions` with the bearer token and the CSRF header. The panel creates a session record, allocates a ROS domain ID, and uses client-go to create a Deployment, a Service, and a 5 GiB PVC in the `ldndrc` namespace. The API returns 202 with status `provisioning`. The frontend polls `GET /api/sessions/{id}` every two seconds. The store asks Kubernetes whether the Deployment has an available replica. Once it does, the status flips to `ready`. The gateway then starts routing the editor, desktop, and gazebo hostnames to that session's Service. When the student stops the session, `DELETE /api/sessions/{id}` removes the Deployment, Service, and PVC.

**Cross-question:** "Where can that flow break?" — At scheduling if no node has the `role=host` label or enough GPU; at image pull if the image is not on the node; at readiness if the pod crashes; and at the gateway if the session is not ready or the cookie is missing.

### Q6. What exactly is a session in Kubernetes terms?

**Answer:** A session is not a custom Kubernetes object. It is a record in the panel's store plus three standard objects: a single-replica Deployment running the workspace image, a ClusterIP Service exposing ports 7682, 8080, and 9002, and a PersistentVolumeClaim for the student's home directory. The Deployment has a node selector for `node-role.kubernetes.io/role=host`, a unique `ROS_DOMAIN_ID`, `ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST`, CPU and memory requests and limits, and optionally a request for one `nvidia.com/gpu`.

**Follow-up:** "Why a Deployment and not a bare Pod?" — A Deployment gives us reconciliation: if the container dies, Kubernetes restarts it; if the node dies, Kubernetes tries to reschedule it; and we can read `availableReplicas` as a readiness signal.

### Q7. Why one session per student instead of one shared workspace?

**Answer:** A shared workspace creates cross-talk. ROS 2 discovery is broadcast-based, so two students using `/cmd_vel` can see each other's publishers, and one student's runaway node can affect another. A shared filesystem also means one student can read or delete another's work. Per-student sessions give separate network namespaces, separate home volumes, separate process trees, and separate resource limits. The cost is more Kubernetes objects and more image pulls, but the isolation and ownership guarantees are worth it for a classroom.

**Cross-question:** "Isn't that wasteful?" — It can be. Each session requests 500 millicores and 2 GiB, with limits of 2 cores and 4 GiB. That is deliberately modest so several sessions fit on a laptop. If density mattered more than isolation, I would offer a shared mode for lightweight exercises, but I would not make it the default.

### Q8. What does the control panel actually do?

**Answer:** It is the only backend service. It handles login and token issuing, session create/list/get/delete, Kubernetes provisioning through client-go, the browser gateway that proxies editor, desktop, and gazebo traffic, node onboarding including registration, approval, denial, and token minting, the LAN onboarding portal and download counter, mDNS advertisement, and the embedded React website. It is one Go binary, so there is no separate frontend server and no Node runtime in production.

**Follow-up:** "Why is that a good boundary?" — Because everything that needs cluster credentials lives in one process with one ServiceAccount and one RBAC surface. Splitting it into microservices would add network hops and more places to misconfigure permissions, with no benefit at this scale.

### Q9. Why did you choose Go for the control panel?

**Answer:** Go gives a single static binary, fast startup, low memory use, and first-class Kubernetes libraries through client-go. The panel runs in a distroless container with no shell, which reduces the attack surface. Go's standard library has a solid HTTP server and reverse proxy, and WebSocket upgrades work through `httputil.ReverseProxy`. The alternative was Node, but that adds a runtime, a larger image, and a second dependency ecosystem for no functional gain.

**Cross-question:** "What is the downside?" — Go is more verbose for CRUD and templating, and the team needs to be comfortable with Kubernetes client-go. But the operational simplicity is worth it.

### Q10. Why K3s instead of full Kubernetes?

**Answer:** K3s is a certified Kubernetes distribution packaged as a single binary with containerd, Flannel, Traefik, and local-path storage. It runs comfortably on a laptop, installs with one command, and exposes the normal Kubernetes API, so client-go and standard manifests work unchanged. Full Kubernetes would add etcd, a separate container runtime, and more operational overhead for a classroom-sized cluster. K3s also bundles the pieces we need, which reduces the number of moving parts.

**Follow-up:** "What do you give up?" — Some HA and tuning options. A single K3s server is a single point of failure, and the default SQLite datastore is not a clustered control plane. For a classroom that is acceptable; for a production deployment I would run a three-server K3s cluster with embedded etcd and a stable virtual IP.

### Q11. What is Traefik doing in this architecture?

**Answer:** Traefik is the ingress controller bundled with K3s. It listens on ports 80 and 443 on the master and routes by hostname. The four hostnames — `control`, `editor`, `desktop`, and `gazebo` under `ros-platform.local` — all point at the control panel Service. The panel then decides whether the request is an API call, the website, or a gateway request that should be proxied to a student's session Service. Traefik does not know about sessions; it only gets traffic to the panel.

**Cross-question:** "Why not route directly from Traefik to session pods?" — Because routing needs to know which user is logged in and which session belongs to them. That is application logic. Keeping it in the panel also means there is one place to enforce cookie authentication and one place to return honest errors.

### Q12. What are the four browser hostnames and what does each serve?

**Answer:** `control.ros-platform.local` serves the React site and the API. `editor.ros-platform.local` proxies to code-server on port 7682 inside the student's pod. `desktop.ros-platform.local` proxies to Selkies on port 8080. `gazebo.ros-platform.local` proxies to the Gazebo WebSocket bridge on port 9002. One login works across all four because the cookie domain is `.ros-platform.local`.

**Follow-up:** "What happens if the student opens the editor hostname before creating a session?" — The gateway returns 404 because there is no active session. If the session exists but is still provisioning, it returns 503. If there is no valid cookie, it returns 401. Those codes are deliberate so the frontend can tell the user what to do.

---

## Part 2 — Kubernetes and cluster operations

### Q13. Explain the roles of the Deployment, Service, and PVC in one session.

**Answer:** The Deployment is the desired state: one pod running the workspace image with the right environment, node selector, resources, and probes. The Service gives that pod a stable in-cluster DNS name and ClusterIP so the gateway does not need to track pod IPs. The PVC is the student's home directory, mounted into the pod, so work survives a container restart. Deleting the session deletes all three, and deleting the PVC is what actually removes the student's files.

**Cross-question:** "Why does the Service matter if there is only one pod?" — Pod IPs change on restart. A Service keeps the address stable and gives Kubernetes a place to load-balance if we ever run more than one replica. It also makes the gateway configuration simple: resolve the Service name, not a pod.

### Q14. The original design used a StatefulSet. Why did you move to per-session Deployments?

**Answer:** The StatefulSet assumed a fixed number of shared workspace pods with ordinal-based domain IDs. That made sessions feel like slots rather than private environments. Per-session Deployments let us create and delete exactly one workspace per student, name it after the session, attach a dedicated PVC, and avoid a shared Service routing traffic to the wrong person. The trade-off is that we manage more objects, but the lifecycle is much clearer and the isolation is stronger.

**Follow-up:** "How do you allocate the ROS domain ID now?" — The store allocates from 100 through 232 and avoids reusing an ID that belongs to an active session. The pod receives it as an environment variable.

### Q15. How does a session move from `provisioning` to `ready`?

**Answer:** When the session is created, the record starts as `provisioning`. The Kubernetes provisioner creates the objects. On every `GET /api/sessions/{id}`, if the record is still provisioning, the store asks the provisioner for the Deployment's status. The provisioner reads `availableReplicas`. If it is at least one, the store promotes the session to `ready`. The gateway also checks readiness before proxying, so even a stale record cannot send traffic to a pod that is not serving.

**Cross-question:** "Why not just trust the Deployment's `Available` condition?" — We effectively do, but we read the replica count because it is simple and explicit. The important part is that readiness is checked against Kubernetes, not against a timer or a client-side guess.

### Q16. What does the `role=host` node selector do, and what happens if it is missing?

**Answer:** It ensures session pods only land on laptops that opted in to share compute. Guests never join the cluster, so they are excluded automatically. The watcher labels Ready nodes with `node-role.kubernetes.io/role=host` after they join. If no node has that label, the scheduler leaves the pod Pending with an event saying the node affinity or selector did not match. The fix is to label the node, not to remove the selector, because removing it could place a heavy simulation on the master or on an unintended machine.

**Follow-up:** "Why not use taints instead?" — Taints are better when you want to repel workloads by default. Here we want an explicit opt-in label, which is simple and readable. A taint plus toleration would also work and would be stronger if the cluster had mixed workloads.

### Q17. How is RBAC scoped for the control panel?

**Answer:** The panel runs under its own ServiceAccount. In the `ldndrc` namespace it has a Role that can manage Deployments, Services, PVCs, and read Pods. For onboarding it has a Role in `kube-system` to create, get, and delete bootstrap-token Secrets, and a ClusterRole to get, list, watch, and patch Nodes. That is the minimum needed: session resources are namespace-scoped, token minting is limited to Secrets in `kube-system`, and node access is limited to the verbs the watcher needs. It cannot read arbitrary Secrets, exec into pods, or manage other namespaces.

**Cross-question:** "How do you verify that?" — With `kubectl auth can-i` against the ServiceAccount, and by reading the Role and ClusterRole manifests. The demo documentation also checks that expected actions are allowed and out-of-scope actions are denied.

### Q18. Why does the control panel run with `hostNetwork: true`, and what problems does that create?

**Answer:** It runs on the host network so mDNS multicast can escape to the LAN. A normal pod network namespace cannot reach LAN multicast, so joining laptops would never hear the `_ldndrc-master._tcp` announcement. The cost is that the panel binds port 8082 directly on the node. Only one copy can run per node, so a rolling update cannot start a second pod while the old one holds the port. That is why the Deployment uses `maxSurge: 0` and `maxUnavailable: 1`, and why the operational rule is delete-old-first.

**Follow-up:** "Could you avoid hostNetwork?" — Yes, by running a small mDNS advertiser as a host service or a separate pod with host networking, and keeping the panel on the pod network. That would remove the rollout constraint but add another component. For this project, one host-networked panel was the simpler trade.

### Q19. Explain the delete-old-first rollout and why plain `rollout restart` was dangerous.

**Answer:** With `hostNetwork`, the old pod owns port 8082 on the node. A default rolling update tries to create a new pod before terminating the old one. The new pod cannot schedule because the port is taken, and the rollout waits forever for a ready replacement. The fix is to scale the old ReplicaSet down first, then create the new pod. The manifest now encodes that as `maxSurge: 0` and `maxUnavailable: 1`, but the habit remains: delete the old panel pod and wait for the new one. The cost is a short API outage, roughly the time it takes the new pod to become ready.

**Cross-question:** "Why not use a Service with two replicas?" — Two replicas on one node still cannot both bind the same host port. On multiple nodes you could run one per node, but the panel is a singleton control plane, so that is unnecessary complexity.

### Q20. Why were the health probes changed to use `127.0.0.1`?

**Answer:** The panel is a hostNetwork pod. By default, HTTP probes target the pod IP, which is baked in when the pod is created. On a laptop using DHCP, the LAN address can change. When it did, the baked-in pod IP stopped responding, the liveness probe failed, and kubelet restarted the container inside the same sandbox with the same stale IP. That produced a restart storm — the observed count reached 141. Pinning the probes to loopback makes them independent of the host's LAN address. After the fix, the same server ran for days with zero restarts.

**Follow-up:** "What is the deeper fix?" — A DHCP reservation for the master, or a stable address configured statically. Loopback probes make the panel survive address drift, but other things such as `K3S_JOIN_URL`, `/etc/hosts`, and the ingress address still depend on a stable IP.

### Q21. How does the panel keep its state across redeploys?

**Answer:** The session store, node store, and download counter are JSON files under `/var/lib/ldndrc`. They are mounted from a 1 GiB PersistentVolumeClaim backed by local-path storage. Earlier they were on an `emptyDir`, which survives a container restart but is wiped when the pod is replaced. That caused orphaned workloads: the Kubernetes objects kept running, but the panel forgot them. Moving the files to a PVC fixed the redeploy case. The remaining caveat is that local-path storage is node-local, so the PVC is not a clustered database and does not survive losing the node.

**Cross-question:** "Why JSON files instead of a database?" — At classroom scale the write volume is tiny, and a JSON file with a mutex and atomic rename is easy to inspect and back up. If the project needed multiple panel replicas or high write throughput, I would move to PostgreSQL or SQLite on shared storage.

### Q22. What happens on panel boot when it reads the session notebook?

**Answer:** It reconciles the stored records against live Kubernetes Deployments. If a record says a session exists and the Deployment is still there, the panel adopts it and keeps serving it. If the record exists but the Deployment is gone, the panel marks the session `stopped` rather than silently deleting the record or pretending it is still running. That behaviour is deliberate: the user should see that the workspace is gone, not get a confusing 404 with no history.

**Follow-up:** "What if the panel was down while a session was deleted manually?" — On boot it sees the missing Deployment and tombstones the record. The record remains for audit and for the user to see that it stopped, but no Kubernetes objects are recreated.

### Q23. A Host laptop dies in the middle of class. What happens to its sessions?

**Answer:** The kubelet stops heartbeating, and after the node lease expires — roughly 40 seconds by default — Kubernetes marks the node NotReady. Pods on that node are then eligible for eviction and rescheduling. The scheduler will try to place them on another node with `role=host` and enough CPU, memory, and GPU. However, the home PVC uses local-path storage, which is node-local and ReadWriteOnce. A replacement pod on a different node usually cannot mount that volume, so the session may stay Pending or start without the previous home data. In practice, the honest answer is: the control plane tries to recover, but the current storage design limits real failover. For true resilience I would use network storage or treat the session as disposable and rebuild it on another host.

**Cross-question:** "What would you tell the instructor?" — The node is down, affected students should relaunch, and their last files may not be recoverable unless they pushed to Git or copied them out. That is a known limitation, not a surprise.

### Q24. How does Kubernetes decide where a session pod runs?

**Answer:** The scheduler filters nodes by the pod's requirements: the `role=host` node selector, available CPU and memory, the GPU resource if requested, taints and tolerations, and volume node affinity. It then scores the remaining nodes and picks one. In this project the dominant constraints are the host label and the GPU request. If no node satisfies them, the pod stays Pending and the scheduler writes an event explaining why. That event is the first thing to read when a session is stuck.

**Follow-up:** "How would you influence placement?" — With node labels, taints, affinity rules, and resource requests. For example, you could label GPU generations differently and use node affinity to keep a heavy simulation on a specific class of machine.

### Q25. Explain GPU time-slicing and why it is used here.

**Answer:** Consumer GeForce GPUs do not support hardware partitioning like MIG. Time-slicing lets the NVIDIA device plugin advertise multiple logical GPU slots on one physical GPU. The project configures four replicas, so four session pods can each request `nvidia.com/gpu: 1` and share the card by taking turns. It is not true isolation: memory is shared, and a heavy workload can affect the others. But for classroom simulations it gives much better density than one pod per GPU. The GPU Operator handles the driver and device plugin, and a ConfigMap plus a ClusterPolicy patch enable the sharing configuration.

**Cross-question:** "What happens if a session uses too much GPU memory?" — It can cause another session to fail or the GPU to reset. Time-slicing does not enforce memory limits per slice. For stronger isolation you need MIG on supported data-center GPUs, or one GPU per session.

### Q26. What happens if `SESSION_GPU_LIMIT` is `1` but the node has no GPU?

**Answer:** The pod requests `nvidia.com/gpu: 1`, the scheduler finds no node advertising that resource, and the pod stays Pending with an `Insufficient nvidia.com/gpu` event. That is the correct behaviour: the platform should not silently run a GPU workload without a GPU. For demos on machines without a GPU, the deployment sets `SESSION_GPU_LIMIT=0`, which omits the GPU request and lets the session schedule on CPU only. Production Hosts set it to `1`.

**Follow-up:** "Why not fake the GPU resource?" — Because that lies to the scheduler and produces pods that start but fail at runtime. It is better to fail at scheduling with a clear event than to fail later inside the simulation.

### Q27. What resources does a session request and limit, and why those numbers?

**Answer:** A session requests 500 millicores of CPU and 2 GiB of memory, with limits of 2 CPU and 4 GiB. Those numbers are a compromise: Gazebo and ROS 2 can use more, but a classroom laptop needs to run several sessions plus the OS and the cluster components. The request guarantees a baseline; the limit prevents one runaway simulation from starving the node. The GPU is requested separately when enabled. These are starting values, not a capacity plan — real tuning depends on the world, the robot model, and whether rendering happens on the GPU or in the browser.

**Cross-question:** "Would you change them for a heavy world?" — Yes. I would measure CPU, memory, and GPU usage for the actual worlds, then set requests close to the observed steady state and limits with enough headroom to avoid throttling. I would also add per-namespace quotas so one class cannot consume the whole cluster.

### Q28. How would you plan capacity for 30 students on 5 Host laptops?

**Answer:** Start with the per-session request: 500 millicores and 2 GiB, plus one GPU slice if GPU is enabled. Five hosts with 16 GB each have about 80 GB total, but you must reserve memory for the OS, K3s, containerd, and the GPU driver — realistically 2–4 GB per host. That leaves roughly 60 GB, or about 30 sessions at 2 GiB each, which looks fine on paper but leaves no headroom for spikes. CPU is tighter: 30 sessions at 500 millicores is 15 cores of requests, and the limits allow up to 60 cores, so contention is likely. GPU time-slicing gives four slices per card, so five GPUs support 20 GPU sessions, not 30. My plan would be to cap concurrent GPU sessions, keep a couple of hosts free for failover, measure actual usage, and add admission control or quotas rather than relying on the scheduler alone.

**Follow-up:** "What would you monitor to validate the plan?" — Per-node CPU and memory pressure, pod throttling, OOM kills, GPU utilization and memory, session provisioning latency, and the number of Pending pods.

### Q29. Why local-path storage, and what are its limits?

**Answer:** K3s bundles a local-path provisioner that creates a volume on the node's local disk. It is simple, fast, and needs no external storage system, which is exactly right for a classroom of laptops. The limits are significant: the volume is tied to one node, it is ReadWriteOnce, it has no replication, and deleting the PVC deletes the data. That means a session cannot freely move to another host, and losing a node can lose the student's home directory. For this project those limits are documented and accepted. If the requirement changed to "sessions must survive a host failure", I would move to network storage such as NFS, Longhorn, or a cloud volume, and accept the extra latency and setup.

**Cross-question:** "How would you back up student work?" — Mount a shared backup target, run a periodic copy or restic job, or teach students to push to Git. The simplest reliable option is a scheduled backup of the PVCs to a separate machine.

### Q30. What is missing to make the master highly available?

**Answer:** Right now the master is a single K3s server with a local datastore. If it dies, the cluster API and the panel go with it. A production design would run three K3s server nodes with embedded etcd, put a stable virtual IP in front of the API, and run at least two panel replicas — but the panel currently uses host networking and a single PVC, so it would need a redesign first. You would also need shared storage for the panel database, a load balancer for ingress, and a backup and restore procedure for etcd and the PVCs. That is a significant step up in complexity and is not justified for a single-classroom deployment.

**Follow-up:** "What is the cheapest improvement?" — A DHCP reservation and a documented backup of the panel's JSON files and the JWT secret. That removes the most common failure — address drift — and makes recovery possible without a full HA redesign.

---

## Part 3 — Networking, gateway, DNS, isolation

### Q31. Trace a request from the student's browser to code-server.

**Answer:** The browser resolves `editor.ros-platform.local` through DNS or `/etc/hosts` to the master's LAN address. Traefik receives the request on port 80, matches the host rule, and forwards it to the control panel Service on 8082. The panel's gateway reads the `ldndrc_session` cookie, verifies the JWT, finds that user's ready session, and resolves the session Service. It then reverse-proxies the request to the Service on port 7682, which forwards it to the pod running code-server. The response travels back the same path. WebSocket upgrades are handled by the same reverse proxy.

**Cross-question:** "Where is authentication enforced?" — At the gateway, before proxying. Traefik does not authenticate; it only routes by hostname.

### Q32. Why hostnames instead of paths like `/code`, `/sim`, and `/stream`?

**Answer:** Path-based routing caused collisions and made WebSocket and iframe handling awkward. If code-server and the Gazebo viewer both live under one origin, their assets, cookies, and upgrade paths can conflict, and rewriting paths is fragile. Separate hostnames give each tool its own origin and its own cookie scope, and the gateway can choose the upstream by hostname without rewriting URLs. It also matches how the tools expect to be served. The old path-based ingress was removed after the host-based routes were verified live.

**Follow-up:** "What is the downside?" — You need DNS or hosts-file entries for four names, and a wildcard certificate if you add TLS. That is a small operational cost compared with the routing problems it avoids.

### Q33. How does one login work across all four subdomains?

**Answer:** On successful login, the panel sets an HttpOnly cookie with `Domain=.ros-platform.local`, `Path=/`, and `SameSite=Lax`. The leading dot tells the browser to send the cookie to every subdomain under that domain. So the cookie set on `control.ros-platform.local` is also sent to `editor`, `desktop`, and `gazebo`. The cookie contains a signed JWT, so the gateway can verify it without a server-side session lookup. The `Secure` flag is configurable and should be on once TLS is enabled.

**Cross-question:** "Why did login through `127.0.0.1` fail in testing?" — A cookie jar will not accept a cookie for `ros-platform.local` when the request was made to `127.0.0.1`. That is a test-harness artifact, not a product bug. The correct test goes through the real hostname or uses `curl --resolve`.

### Q34. Explain the gateway's 401, 404, 503, and 502 responses.

**Answer:** 401 means there is no valid session cookie, so the user must log in. 404 means the user is authenticated but has no active session, so they need to create one. 503 means the session exists but is not ready yet — the pod is still provisioning or has no available replica — so the user should wait. 502 means the gateway reached the session Service but the upstream failed, which usually means the pod is unhealthy, the port is not listening, or the DNS resolution is wrong. These codes are chosen so the frontend can show a specific message instead of a generic error.

**Follow-up:** "Why not return 500 for all of them?" — Because the user and the operator need different actions. 401 means log in, 404 means launch, 503 means wait, 502 means investigate the pod. Collapsing them hides the diagnosis.

### Q35. What was the trailing-dot FQDN bug?

**Answer:** On the real master, the gateway resolved the session Service name correctly with DNS, but the actual HTTP dial went to a public wildcard address instead of the ClusterIP. The cause was the host's DHCP search suffix being inherited by the pod's resolver configuration. The service name has fewer dots than the resolver's `ndots` threshold, so the resolver tried the search list first, and the LAN's wildcard DNS answered with a parking IP before CoreDNS could answer. The fix was to append a trailing dot to the upstream host, making it an absolute fully qualified domain name. That skips the search list. It is a one-line fix with a comment, and it only appeared on the real LAN, not on k3d.

**Cross-question:** "How would you prevent this class of bug?" — Prefer fully qualified names with trailing dots for in-cluster upstreams, test on the real network early, and add a DNS-resolution check to the gateway tests or a smoke test.

### Q36. How does the gateway handle WebSocket connections?

**Answer:** Go's `httputil.ReverseProxy` handles the HTTP Upgrade handshake and then tunnels the connection. The important requirements are that the gateway authenticates before proxying, preserves the `Connection: Upgrade` and `Upgrade: websocket` headers, does not buffer the stream, and has timeouts that do not kill long-lived sessions. The cookie is sent on the initial handshake, so the gateway can identify the user before the connection becomes a raw socket. This is what makes code-server terminals and the Gazebo viewer work through the same path as normal HTTP.

**Follow-up:** "What breaks WebSockets most often?" — A proxy that strips the upgrade headers, a timeout that is too short, TLS mixed content when the page is HTTPS but the socket is `ws://`, or path rewriting that changes the endpoint.

### Q37. Explain the ROS 2 isolation model.

**Answer:** Each session runs in its own pod, and all containers in that pod share one network namespace. ROS 2 discovery uses multicast and is configured with `ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST`, so it only talks on the pod's loopback. Each session also gets a unique `ROS_DOMAIN_ID` as a second layer. Flannel carries HTTP, WebSocket, and WebRTC between the browser and the pod, but DDS packets never leave the pod's localhost. So two students can both publish `/cmd_vel` and neither will discover the other.

**Cross-question:** "Is the domain ID necessary if localhost already isolates them?" — It is defense in depth. If a configuration mistake ever widens the discovery range, different domain IDs still keep the sessions apart. It costs nothing and makes the guarantee stronger.

### Q38. Why is localhost isolation stronger than relying on domain IDs alone?

**Answer:** A domain ID is a logical filter inside DDS. If two processes are on the same network and use the same domain ID, they will discover each other. Localhost isolation is enforced by the kernel's network namespace: traffic cannot leave the pod's loopback interface, so there is no path to another pod even if the domain IDs match. The domain ID protects against misconfiguration within a shared network; the namespace protects against the network itself. You want both.

**Follow-up:** "Could a pod escape its namespace?" — Only with privileges or a kernel vulnerability. The session containers run as non-root, drop capabilities, and use a read-only root filesystem where possible. That reduces the risk but does not make it zero; a compromised container on a shared host is still a serious event.

### Q39. What traffic actually crosses Flannel?

**Answer:** Only the browser-facing protocols: HTTP for code-server and the panel, WebSocket for the Gazebo bridge and terminal sessions, and WebRTC for Selkies. DDS discovery and robot messages stay inside the pod's network namespace on localhost. That is deliberate: Flannel is not asked to carry multicast reliably, and ROS 2 is not exposed to the overlay. The cluster network is therefore a web transport, not a robot bus.

**Cross-question:** "What if a student needs to talk to a robot on the LAN?" — That is outside the current isolation model. You would need an explicit bridge or gateway, with a policy for which topics and which devices are allowed. Do not just widen the discovery range, because that breaks the classroom isolation guarantee.

### Q40. Could two sessions still interfere? Walk me through the scenarios.

**Answer:** In the normal configuration, no. They are in different network namespaces, with different domain IDs and localhost-only discovery. But there are edge cases. If someone sets `ROS_AUTOMATIC_DISCOVERY_RANGE` to a wider value, discovery could cross pods. If a session runs with `hostNetwork`, it shares the node's network and could see other host-network processes. If two sessions mount the same PVC, they share files. If a student is given cluster credentials or a privileged container, they could bypass the isolation. The design prevents accidental cross-talk; it does not defend against a malicious tenant with elevated permissions. That is why the roadmap includes NetworkPolicy and stronger tenant boundaries.

**Follow-up:** "How would you test isolation?" — Run two sessions, publish the same topic in both, and verify that neither `ros2 topic list` sees the other. Then repeat with a deliberately widened discovery range to confirm the domain ID still separates them.

### Q41. How does mDNS discovery work here, and why does it need host networking?

**Answer:** The panel advertises a service named `_ldndrc-master._tcp` with the master's hostname and port 8082, plus a TXT record such as `cluster=ldndrc`. Joining laptops browse for that service with Avahi or a similar resolver. Multicast DNS uses link-local multicast, which does not cross the pod network namespace by default, so the advertiser must run with host networking to reach the LAN. That is why `ADVERTISE_MDNS` is false on k3d and true on a real master.

**Cross-question:** "Why not just hardcode the master IP?" — Because laptop Wi-Fi addresses move. Discovery lets the joining tool find the master without a typed address, and a typed address remains as a fallback. The project still documents that DHCP reservations are the real fix for stability.

### Q42. Why doesn't mDNS work in the k3d demo?

**Answer:** k3d runs K3s inside Docker containers. The pod network is nested inside Docker's network, and multicast does not propagate from that namespace to the physical LAN. Even if the panel advertised, no laptop on the Wi-Fi would hear it. So the demo sets `ADVERTISE_MDNS=false` and uses port-forwarding and `curl` with host headers instead. This is an environment limitation, not a bug in the discovery code.

**Follow-up:** "How do you test discovery without a second laptop?" — You can verify that the panel logs the advertisement and that the record exists locally with `avahi-browse`, but the real proof is a second machine on the same LAN. The project is honest that guest-side hearing is still pending.

### Q43. What is the wildcard DNS trap on client machines, and how do you defend against it?

**Answer:** Some LANs answer every unknown hostname with a wildcard address, often a parking page. If a client asks for `control.ros-platform.local` and the local resolver has a search suffix or the name is not in `/etc/hosts`, the wildcard can answer first. The browser then reaches the parking page or gets a redirect instead of Traefik. The defenses are explicit `/etc/hosts` entries for the four names, `curl --resolve` in tests, and using fully qualified names with trailing dots inside the cluster. The symptom is usually a 301 or a page that is clearly not ours, even though the panel is healthy.

**Cross-question:** "Why not rely on DNS?" — In a classroom you often cannot control the router's DNS. Hosts-file entries are ugly but deterministic. A local DNS server or a proper split-horizon setup would be cleaner if you control the network.

### Q44. How would you add TLS to this platform?

**Answer:** Terminate TLS at Traefik. Because the environment may have no internet, a public ACME certificate is not reliable; I would run a local certificate authority, issue a certificate for `*.ros-platform.local`, and install the CA on student machines. Traefik serves 443 with that certificate, redirects 80 to 443, and the panel sets `Secure` and `SameSite` on the cookie. The gateway then proxies to the pod over plain HTTP inside the cluster, or uses TLS if the upstream supports it. WebSocket URLs become `wss://`. The main operational cost is distributing and trusting the CA, and renewing certificates.

**Follow-up:** "What about the K3s API?" — It already uses TLS with the cluster CA. The issue is the browser-facing names. Do not expose the API to students; only expose the ingress.

### Q45. How would you add NetworkPolicy to isolate sessions?

**Answer:** Apply a default-deny ingress and egress policy in the `ldndrc` namespace, then allow only the traffic each pod needs. Session pods should accept ingress only from the panel or gateway pods on ports 7682, 8080, and 9002, and should be allowed DNS egress plus whatever external model or package sources the instructor approves. They should not be able to reach other session pods. The panel needs ingress from Traefik and egress to the Kubernetes API and session Services. One caveat: Flannel by itself does not enforce NetworkPolicy; you need a policy-capable CNI or K3s's network policy controller enabled and verified. I would test with a pod that tries to connect to another session and confirm the connection is denied.

**Cross-question:** "Would that break the Gazebo WebSocket?" — Only if you forget to allow the gateway-to-pod port. The policy should be written from the actual traffic map, then tested, not copied from a generic template.

---

## Part 4 — ROS 2, Gazebo, and the workspace image

### Q46. Why ROS 2 Jazzy and Gazebo Harmonic?

**Answer:** Both are current long-term-support releases with a known support window. Jazzy is the ROS 2 LTS, and Harmonic is the matching Gazebo LTS. Using LTS versions gives stable APIs, security updates, and a large set of compatible packages such as TurtleBot3. The workspace image pins the exact versions so a student's simulation does not change because a package moved. The trade-off is that newer features may not be available, but for teaching, stability matters more.

**Follow-up:** "What would force an upgrade?" — End of support, a needed feature, or a security issue. The upgrade would be a new image tag and a tested rollout, not an in-place change.

### Q47. Explain `ROS_DOMAIN_ID`.

**Answer:** It is a numeric identifier that partitions ROS 2 discovery. Nodes only discover other nodes on the same domain. The default is 0, and the valid range is 0–232 for most setups. In this project the store allocates IDs from 100 upward and avoids reusing an ID held by an active session. The pod receives the value as an environment variable. It is a logical separation, not a security boundary, which is why it is combined with network namespace isolation.

**Cross-question:** "What happens if two sessions get the same domain ID?" — If they are in separate pods with localhost-only discovery, they still cannot see each other. If discovery were widened, they would. That is exactly why the domain ID is treated as defense in depth rather than the primary control.

### Q48. What does `ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST` do?

**Answer:** It tells ROS 2 to limit automatic discovery to the local host, so it does not send multicast or announcements onto the wider network. Inside the pod, all containers share the same network namespace, so the editor terminal, the Gazebo process, and any student nodes can still find each other. Traffic does not leak to other pods or to the LAN. It is the setting that makes the isolation guarantee practical rather than aspirational.

**Follow-up:** "Can a student override it?" — Yes, if they set the environment variable themselves in their terminal. That is a deliberate escape hatch for advanced work, but it also means isolation depends on the student not changing it. A stricter design would inject the setting at the container level and prevent override, or enforce network policy so even a widened discovery range cannot reach another pod.

### Q49. What runs inside the session pod, and what is supervised?

**Answer:** The workspace image runs code-server on 7682, Selkies on 8080, and the Gazebo WebSocket bridge on 9002. Those three are supervised by supervisord, which restarts them if they crash. Gazebo Sim itself is not supervised: the student launches it in the foreground from a terminal so they can choose the world, see the logs, and stop it with Ctrl-C. The entrypoint assigns the ROS domain ID and locks discovery to localhost before starting the supervised services.

**Cross-question:** "Why not supervise Gazebo too?" — Because the student needs control over which world runs and needs to see its output. A supervised background Gazebo would hide errors and make it easy to start a second server by accident. The rule is one Gazebo server per workspace.

### Q50. Why is Gazebo Sim intentionally not supervised?

**Answer:** Gazebo is the student's foreground process. They choose the world, they read the logs, and they decide when to stop it. If it were supervised, a crash would restart it silently, possibly with the wrong world, and a second launch could create a duplicate simulation that confuses the viewer. Keeping it in the foreground makes the lifecycle explicit and debuggable. The WebSocket bridge is supervised because it is infrastructure, not the student's experiment.

**Follow-up:** "What happens if the student starts two Gazebo servers?" — The viewer may show a duplicate world or robot, and the logs become confusing. The documented fix is to stop the first with Ctrl-C or relaunch with the `--force` option, which cleans up the old process.

### Q51. How does the 3D simulation view actually reach the browser?

**Answer:** Gazebo Sim runs inside the pod with the `websocket_server` plugin, which listens on port 9002 and publishes scene updates at a configured rate. The `gazebo-web` process supervises that bridge. The browser loads the gzweb viewer, which is built on Three.js, creates a `SceneManager`, and connects to the WebSocket endpoint through the gateway. The world must include the `SceneBroadcaster` system plugin, otherwise there is no scene data to stream even though the socket is open. The gateway proxies the WebSocket upgrade, so the browser never talks to the pod directly.

**Cross-question:** "Why does `gazebo.ros-platform.local/` return 404 sometimes?" — Because the bridge may not serve an HTML page at `/`; a 404 there can mean the pipe is alive but there is no page. The real test is whether the WebSocket endpoint responds and whether scene data arrives.

### Q52. Why can a 404 from the Gazebo host still mean the system is healthy?

**Answer:** The gateway routes to port 9002, which is the WebSocket bridge, not a normal web server with an index page. A plain HTTP GET to `/` may return 404 because there is no route for it, while the WebSocket endpoint on the same port is working. The project documents this as "data yes, pretty page no." It is not a health failure. The health check should probe the WebSocket or check that the bridge process is running, not expect a 200 on `/`.

**Follow-up:** "How would you make the health signal clearer?" — Add a small HTTP health endpoint to the bridge, or have the viewer report connection status to the frontend. A raw 404 is technically honest but easy to misread.

### Q53. Why pre-pack the Gazebo models instead of downloading them at runtime?

**Answer:** The classroom may have no internet, and the LAN's wildcard DNS can break downloads. If a student launches a world and Gazebo tries to fetch a model, the start is slow or fails. Pre-packing the common models — Ground Plane and Sun, about 64 KB — into the image means the robot moves immediately and offline. It is a small addition with a large reliability benefit. For a wider set of models, the next step would be a local model cache or a Fuel mirror, not a runtime download.

**Cross-question:** "What about models the instructor adds later?" — They can be baked into a custom image or mounted from a shared volume. The important thing is that the base experience does not depend on the internet.

### Q54. Walk me through the image size and transfer math.

**Answer:** The base image is about 8.25 GB unpacked. The workspace image with code-server, Selkies, and the bridge is about 10.8 GB unpacked. As a gzipped Docker tarball it is about 2.4 GB, roughly a 4.5x compression ratio. Importing into containerd took 164 seconds cold and 28 seconds warm because layers were already present. On a 1 Gbps wired link the transfer is about 25 seconds; on real Wi-Fi it is one to four minutes, plus one to three minutes to unpack. So a new host needs roughly five to ten minutes once, then the image is cached. The join gate requires at least 25 GB free because you need the image, the agent, the first 5 GiB session volume, and headroom.

**Follow-up:** "What would you do at ten hosts?" — A local registry mirror on the master. The bytes are the same, but the labor and the repeated transfer are reduced. The project notes it is worth it at around five or more hosts.

### Q55. Why use frozen image tags instead of `latest`?

**Answer:** A frozen tag such as `jazzy-harmonic-10f1f10c` identifies exactly the image that was tested. If a node has it cached, it runs the same bits as every other node. `latest` can change under you, which makes rollbacks and debugging much harder. The tag is effectively a content version, and the deployment pins it. This is standard practice for reproducible infrastructure, and it matters more here because the image is large and manually distributed.

**Cross-question:** "How do you roll back?" — Point the deployment at the previous tag and re-import that image if needed. Because tags are immutable, the old image is still identifiable.

### Q56. Why build a tiny stand-in image first?

**Answer:** The full workspace image is 10.8 GB and slow to build, transfer, and debug. The stand-in is a tiny HTTP server that lets us prove the entire path — ingress, cookie auth, gateway, Service routing, readiness, and session lifecycle — without waiting for the heavy image. Once the plumbing was proven, we flipped to the real image. This is a deliberate risk-reduction order: prove the control plane first, then add the payload. The stand-in is still useful for k3d demos on machines without a GPU.

**Follow-up:** "Did that hide any real-image problems?" — It hid image-specific issues such as Selkies compatibility and model downloads, which is why those were tested separately. The stand-in proves routing, not the simulation.

### Q57. What is Selkies, and why did the project move to version 2.0?

**Answer:** Selkies streams a full Linux desktop to the browser over WebRTC, so students can use GUI tools such as RViz or a terminal. The older 1.6.2 installer depended on files that disappeared upstream, which broke the build. Version 2.0 is a pure-Python implementation that does not need the video toolkit, and sound can be disabled natively. It listens on port 8080. The trade-off is that WebRTC needs a clear path through the gateway and correct handling of secure contexts when TLS is added.

**Cross-question:** "Why not just use code-server's terminal?" — Because some tools are GUI-only. The desktop is an escape hatch for those cases, not the primary interface.

### Q58. Why code-server instead of a standalone Monaco editor?

**Answer:** Monaco is only an editor component. code-server gives the full VS Code experience, including a file tree, extensions, and persistent integrated terminals, all in the browser. That matters because students need to run `ros2 launch`, inspect logs, and edit files in the same place. It also means the editor is a real development environment rather than a text box. The cost is a heavier container and more memory, but it replaces a separate editor plus terminal setup.

**Follow-up:** "What are the security implications?" — code-server runs inside the student's isolated pod with that student's permissions. It should not have cluster credentials or access to other sessions. The pod's service account and network policy are the boundary.

---

## Part 5 — Authentication, security, and onboarding

### Q59. Walk me through the login flow.

**Answer:** The browser sends a JSON POST to `/api/auth/login`. The panel validates the input, currently accepting any non-empty username and password because there is no user database yet. It signs a JWT with a 24-hour expiry using `JWT_SECRET`, generates a CSRF token bound to that JWT, sets an HttpOnly session cookie, and returns the token and CSRF token in the JSON body. The frontend keeps the bearer token in memory and mirrors it to session storage for reloads, and sends the CSRF header on state-changing requests.

**Cross-question:** "So anyone can log in?" — Yes, in the current build. That is a known limitation, not a design goal. The next step is a real user store with password hashing and roles. I would not present this as production-ready authentication.

### Q60. Why both a JWT and a cookie?

**Answer:** They serve different clients. API clients and scripts use the `Authorization: Bearer` header, which is explicit and easy to test with curl. Browsers need something that iframes and WebSocket handshakes send automatically, and that is the HttpOnly cookie. The cookie also lets one login work across the four subdomains. Both contain the same signed identity, so the panel can verify either path with the same logic.

**Follow-up:** "Isn't that two ways to attack?" — It is two ways to present the same credential, so the signing and expiry rules must be consistent. The cookie is HttpOnly, which protects it from JavaScript theft; the bearer token is kept in memory and session storage, which is more exposed but necessary for the API client.

### Q61. Why HttpOnly and SameSite on the session cookie?

**Answer:** HttpOnly prevents JavaScript from reading the cookie, so a cross-site scripting bug cannot simply exfiltrate the session token. SameSite=Lax reduces the chance that another site can trigger authenticated requests, because the cookie is not sent on most cross-site subrequests. `Secure` should be set once TLS is enabled so the cookie never travels in plaintext. These are baseline browser protections; they do not replace CSRF tokens or TLS, but they raise the cost of common attacks.

**Cross-question:** "Does SameSite=Lax break the gateway?" — It should not, because the tools are same-site subdomains. If a tool needs a cross-site embed, you would have to revisit the cookie policy, but that is not the current design.

### Q62. What is CSRF, and how does this project prevent it?

**Answer:** CSRF is when a malicious site causes the user's browser to send an authenticated request to our site using the user's cookie. The browser attaches the cookie automatically, so the server cannot tell the request came from the attacker's page. The project prevents it by issuing a CSRF token at login that is an HMAC fingerprint bound to the session cookie's JWT. Every state-changing request made with the cookie must include `X-CSRF-Token`, and the server verifies that the header matches the cookie. Reads do not require it. If the token is missing or wrong, the request gets 403.

**Follow-up:** "Why bind the token to the cookie instead of storing it server-side?" — Binding avoids extra server state. The HMAC proves the token was issued for that session, and the cookie proves the session. It is stateless and works across panel restarts as long as the signing key is stable.

### Q63. Why was login exempted from the CSRF guard?

**Answer:** Login is the endpoint that issues the CSRF token, so it cannot require one. The original guard checked every cookie-carrying POST, including login. A returning user with a stale cookie would send that cookie to login, the guard would reject the request for missing a CSRF header, and the user could never log in again. It was a chicken-and-egg lockout. The fix is an early return in the guard for `POST /api/auth/login`, plus a regression test that sends a stale cookie with no CSRF header and expects 200.

**Cross-question:** "Doesn't that make login vulnerable to CSRF?" — Login CSRF is a different, lower-risk issue: an attacker could log the victim into the attacker's account. The real fix is to validate credentials and rotate the session on login. For this build, allowing login without a CSRF token is the correct trade because the endpoint has no authenticated state to protect yet.

### Q64. When is CSRF protection needed, and when is it not?

**Answer:** It is needed when the browser automatically attaches credentials to a request — that is, cookies. It is not needed for a bearer token sent in an `Authorization` header, because another site cannot read the token and cannot make the browser attach it automatically. That is why the curl and script paths use bearer tokens and do not need the CSRF header, while the browser path uses the cookie and does. The rule is about how the credential travels, not about which HTTP method is used.

**Follow-up:** "What about GET requests that change state?" — They should not exist. State changes should be POST, PUT, PATCH, or DELETE, and the guard should cover them. A GET that mutates data is a design bug regardless of CSRF.

### Q65. What are the current authentication weaknesses?

**Answer:** The biggest is that any non-empty username and password is accepted; there is no user database, no password hashing, and no roles. There is no TLS, so credentials and cookies can be read on the LAN. The JWT secret is shared and there is no revocation list, so a stolen token is valid until it expires. There is no login rate limiting, no account lockout, and no audit log. The frontend mirrors the token to session storage, which is more exposed than memory only. These are documented limitations. Fixing them means adding a user store, TLS, token rotation or revocation, login throttling, and role-based authorization.

**Cross-question:** "What would you fix first?" — TLS and a real credential store. Without those, the other controls are protecting a door that is already open.

### Q66. Walk me through node onboarding from the laptop's perspective.

**Answer:** A new laptop runs the enrollment script or the join binary. It detects hardware, finds the panel through `PANEL_URL`, mDNS, or a typed address, and registers with a hardware fingerprint. The panel returns a node ID and a pending status. The script polls every five seconds. The instructor sees the request in the admin console and approves or denies it. On approval, the first poll mints a short-lived K3s bootstrap token and returns the join URL. The laptop installs the K3s agent with the token, and the panel's watcher labels the Ready node `role=host` and marks it joined.

**Follow-up:** "What if the laptop is denied?" — The poll returns the denied status and the operator's reason, the script exits non-zero, and nothing is installed. The record remains for audit.

### Q67. Why a one-time 15-minute bootstrap token instead of the static K3s token?

**Answer:** The static server token is effectively permanent and gives full node-join capability. Copying it around is risky. A bootstrap token is short-lived, scoped to joining, and can be revoked. Fifteen minutes is long enough for a laptop to install the agent and short enough that a leaked token is not useful for long. The panel mints it through the Kubernetes API as a Secret, which means the cluster's normal token lifecycle applies.

**Cross-question:** "What if the install takes longer than 15 minutes?" — The token expires and the join fails. The operator can re-approve or reissue, and the laptop retries. That is better than a token that never expires.

### Q68. How is the token stored, and why is it returned only once?

**Answer:** The panel stores the token's ID and the Secret reference, not the token secret itself in its own database. When an approved laptop polls for the first time, the panel mints the token and returns it in the response. Subsequent polls return status only. This "given once" rule limits the window in which the token can be intercepted and prevents a later poll from re-exposing it. The laptop should use it immediately and not write it to disk; the join tool is designed not to persist it.

**Follow-up:** "What if the laptop loses the token?" — It can re-register or the operator can re-approve, which produces a new token. The old one expires or is cleaned up.

### Q69. Why are node IDs 128-bit?

**Answer:** The node ID doubles as the bearer capability for polling status and uploading diagnostics. A short or guessable ID would let someone enumerate other laptops' requests or inject data. A 128-bit random ID is effectively unguessable, so knowledge of the ID is the credential. It is not based on IP or MAC address, which are spoofable and unstable. The ID is stored and used in URLs, and the project tests that fresh IDs are 32 hex characters and distinct per laptop.

**Cross-question:** "Is that a secure design?" — It is a capability URL. It is secure if it is treated like a secret: use HTTPS, do not log it, do not share it. On a plain HTTP LAN it can be observed, which is another reason TLS is on the roadmap.

### Q70. How is registration idempotent?

**Answer:** The panel deduplicates by hardware fingerprint. If the same laptop runs the script again, the server returns the existing node ID and status instead of creating a duplicate record. That matters because a failed download, a retry, or a user running the script twice should not fill the admin console with ghost laptops. The test suite checks that two consecutive runs produce the same node ID and that the node count stays at one.

**Follow-up:** "What if two laptops have identical hardware?" — The fingerprint should include enough stable, machine-specific data to distinguish them. If it does not, they could collapse into one record. That is a design risk worth testing with real hardware.

### Q71. How do rate limiting, `JOIN_KEY`, and `AUTO_APPROVE` work?

**Answer:** The public registration endpoint is rate-limited per client IP — the code uses a small sliding window of ten requests per minute. `JOIN_KEY` is an optional pre-shared key that a laptop must send to register, which stops random devices on the network from creating requests. `AUTO_APPROVE` skips the human approval step and is intended only for development. In production it should be false, because auto-approving an unknown laptop gives it a path into the cluster.

**Cross-question:** "Is rate limiting enough?" — No. It slows abuse but does not authenticate. `JOIN_KEY` adds a shared secret, but it can be copied. The real control is human approval plus a short-lived token, and TLS to protect the exchange.

### Q72. How does the watcher mark a node as joined?

**Answer:** Every five seconds the watcher lists the cluster nodes. For each node that is Ready, it applies the `node-role.kubernetes.io/role=host` label if it is missing, and it updates the matching node record to `joined`. It skips nodes that are not Ready or not present in the store. This is how the panel learns that the agent install actually succeeded, rather than trusting the laptop's claim.

**Follow-up:** "What if the watcher is down?" — The node may still join the cluster, but the panel will not mark it joined or label it, so session pods may not schedule there. The watcher is part of the control plane and should be monitored.

### Q73. What are the hardware gates, and why those thresholds?

**Answer:** The gate requires at least 8 CPU cores, 16 GB of RAM, an NVIDIA GPU, a driver version of at least 535 with 550 or newer recommended, at least 25 GB of free disk, sudo access for the agent install, and network reachability to the master on port 6443. The CPU and RAM thresholds are the minimum for running a simulation plus the workspace services without thrashing. The driver floor is where container GPU sharing and the image's CUDA requirements are reliably supported; below it, time-slicing can misbehave silently. The disk gate covers the 10.8 GB image, the K3s agent, the first 5 GiB session volume, and headroom. The gate is strict: a red row ends the Host path, with no "continue anyway."

**Cross-question:** "Why not let an operator override?" — Because an underpowered Host creates a bad experience for every student scheduled on it, and the failure is hard to diagnose later. Strictness protects the classroom. The test overrides exist for development, not production.

### Q74. Why is macOS guest-only, and what about Windows?

**Answer:** A macOS laptop cannot run the Linux K3s agent or the NVIDIA container stack in the supported way, so it can only be a browser Guest. Windows is more nuanced: native Windows cannot run the Linux agent, so the path is WSL2. The join tool detects the physical hardware, and if WSL2 is present it runs the Linux steps inside it. If WSL2 is absent, it gives guided install steps rather than silently changing the machine. Windows laptops that do not qualify, or that cannot use mirrored networking for the VXLAN traffic, fall back to Guest mode. The Windows path is not fully proven on hardware yet, which the docs state.

**Follow-up:** "Why does networking matter on Windows?" — The K3s agent needs to reach the master and the Flannel VXLAN port. WSL2's default networking can block inbound traffic, so mirrored networking on newer Windows versions is needed. Without it, the node may join but pods cannot communicate.

### Q75. Walk me through the captive onboarding portal.

**Answer:** The master hosts a separate onboarding Wi-Fi, physically separate from the cluster router. A new laptop joins that Wi-Fi and gets a DHCP lease. A wildcard DNS answer points every name at the master, and an nftables rule redirects port 80 traffic arriving on the hotspot interface to a small trap service. The trap answers with a 302 to the portal on port 8082. The portal page offers the Linux/macOS and Windows enrollment scripts and shows a live download counter. The student downloads and runs the script, which registers the laptop and polls for approval. The instructor approves it in the console, and the laptop switches to the cluster network. The portal itself does not enforce network access; approval is data, and enforcement is a designed gateway follow-up.

**Cross-question:** "Why a separate Wi-Fi?" — To keep unapproved devices off the cluster network. The master hosts the onboarding AP; a separate router carries cluster traffic. The master is not a router between the two.

### Q76. What do the download counter numbers actually mean?

**Answer:** There are three metrics. `requests` counts every hit on a script endpoint, including HEAD probes, range requests, retries, and aborted transfers. `downloads` counts only a full 200 response where the entire body reached the client. `devices` is a count of distinct hashes of salt, IP, and user agent per artifact. The public endpoint shows aggregate totals only; the detailed stats require a JWT. The important honesty point is that a served download does not prove the user saved or ran the file. It is engagement telemetry, not conversion data. IP and user agent are spoofable, and the unique count is directional. MAC addresses are deliberately not used.

**Follow-up:** "Why hash instead of store the IP?" — Privacy. The server only needs to estimate distinct devices, not identify them. A per-database salt keeps the hashes stable across restarts without making them reversible.

### Q77. Why is gateway enforcement not implemented yet?

**Answer:** The project deliberately separates approval state from enforcement. The panel records who is approved, but the thing that actually allows or blocks a device on the network is the router or gateway. Vendors differ, so the core ships a contract instead of hard-coding one. The proposed endpoint is `GET /api/gateway/devices`, protected by a JWT or a shared secret, returning device IDs and statuses. A router integration would poll it and apply allow or deny rules. That keeps the core vendor-neutral and means enforcement can change without touching the approval logic.

**Cross-question:** "So is the portal secure?" — It is a soft portal. It guides users and collects approvals, but a determined device could ignore the portal and try to reach the cluster network. Real enforcement needs the gateway integration plus network segmentation.

### Q78. What is the threat model? What is covered and what is not?

**Answer:** Covered: unauthenticated API access is rejected; browser state changes require a CSRF token; session pods are isolated by network namespace and ROS domain; the panel has least-privilege RBAC; join tokens are short-lived and given once; node IDs are unguessable; session containers run as non-root with dropped capabilities; the panel image is distroless. Not covered: LAN eavesdropping because there is no TLS; anyone can log in because there is no user database; a compromised Host can access other pods on that host; there is no NetworkPolicy yet; there is no protection against a malicious student escaping the container; there is no login rate limiting or audit trail; and the image supply chain is manual. The honest summary is that this is designed for a trusted classroom LAN, not for hostile multi-tenant use.

**Follow-up:** "What would you do before exposing it to a larger network?" — TLS, real authentication and roles, NetworkPolicy, per-student quotas, audit logging, and a hardened image pipeline. I would also commission a penetration test rather than relying on the design review alone.

---

## Part 6 — Reliability, debugging, and operations

### Q79. A session is stuck in `provisioning`. How do you debug it?

**Answer:** Start with `kubectl -n ldndrc get pods` and find the session pod. If it is Pending, describe it and read the events. The common causes are a missing `role=host` label, insufficient CPU or memory, or an unavailable GPU. If it is ImagePullBackOff, the image is not on the node or the tag is wrong. If it is Running but not ready, check the readiness probe and the container logs. Also check that the PVC is Bound; a storage problem can keep the pod Pending. Finally, check the panel logs for provisioning errors. The order is: pod status, events, logs, storage, then panel logs.

**Cross-question:** "What if the pod is Running and the Deployment says available, but the panel still says provisioning?" — Then the panel's readiness read is stale or failing. Check the panel's Kubernetes permissions, the session record, and whether the `GET` path is actually refreshing status. That was a real bug fixed for the launch stepper.

### Q80. The editor returns 502, but a direct curl to the session ClusterIP returns 200. What now?

**Answer:** That narrows the problem to the gateway's dial, not the pod. First check whether the gateway is resolving the Service to the right address. On the real LAN, the classic cause is the wildcard DNS trap: the resolver returns a parking IP instead of the ClusterIP because the service name is not fully qualified. The fix is the trailing dot in the upstream host. Also check the gateway logs, the cookie and session lookup, and whether the gateway is connecting to the right port. If the ClusterIP works from a debug pod but not from the panel, compare their DNS configurations and network namespaces.

**Follow-up:** "Why did this not show up on k3d?" — Because k3d uses Docker's DNS and does not inherit the host's wildcard search suffix. It was a real-LAN-only bug.

### Q81. A user logs in successfully but gets 401 on the editor hostname. What do you check?

**Answer:** First, confirm they logged in through `control.ros-platform.local`, not through `127.0.0.1` or an IP. The cookie is scoped to `.ros-platform.local`, so a login on a different host will not produce a cookie the browser will send to the editor. Second, check the cookie jar or browser dev tools: is `ldndrc_session` present, and is it expired? Third, check the JWT secret — if the panel was redeployed with a new secret, old tokens are invalid. Fourth, check the gateway logs for the verification error. Fifth, confirm the session exists and is ready; a missing session gives 404, not 401, so 401 points to authentication specifically.

**Cross-question:** "What if only one browser fails?" — Then it is likely a stale cookie or a privacy setting blocking the cookie. Clear the site data and log in again.

### Q82. The panel is in a crash loop with over a hundred restarts. What is your hypothesis?

**Answer:** On a hostNetwork pod, the probes may be targeting the pod IP that was baked in at creation. If the laptop's DHCP address changed, that IP is dead, the liveness probe fails, and kubelet restarts the container inside the same sandbox with the same stale IP. The result is a permanent crash loop. The fix is to pin the probes to `127.0.0.1`. I would confirm by reading the pod events and the probe configuration, then check whether the host IP changed. After the fix, verify zero restarts over a sustained period.

**Follow-up:** "Why didn't the readiness probe catch it?" — It did, in the sense that it failed too. The problem is that restarting the container does not change the pod's network sandbox, so the stale IP persists. The probe target, not the probe logic, was wrong.

### Q83. A rollout hangs with the new pod Pending. What is happening?

**Answer:** The panel uses host networking and binds port 8082 on the node. A rolling update with the default surge behaviour tries to create the new pod before terminating the old one. The new pod cannot schedule because the port is already in use, and the old pod is not terminated because the deployment is waiting for the new one to become ready. That is a deadlock. The fix is to delete the old pod first, or use `maxSurge: 0` and `maxUnavailable: 1`. I would check the ReplicaSet and pod events to confirm the "no free ports" message.

**Cross-question:** "Is there downtime?" — Yes, a short one while the new pod starts. On a single-node control plane you cannot avoid it with host networking. If zero downtime mattered, I would move the panel off host networking and run a separate mDNS advertiser.

### Q84. A session pod is in ImagePullBackOff. What do you do?

**Answer:** Check the exact image reference in the Deployment and compare it with what is available on the node. On k3d, the image must be imported with `k3d image import`; on a real K3s host, it must be imported with `k3s ctr images import` or pulled from a registry the node can reach. Check `imagePullPolicy`; if it is `Always` and there is no registry, it will fail even if the image is local. Check disk space, because a 10.8 GB image needs room. If a private registry is used, check the image pull secret. The event message usually names the exact failure.

**Follow-up:** "How do you confirm the image is actually present?" — `sudo k3s ctr images list` or `crictl images`. A pod that fails with "exec: sh not found" is actually proof the image is present but distroless, not proof of a pull failure.

### Q85. The desktop host returns 502. Is that a bug?

**Answer:** It depends on the image. On the tiny demo stand-in, there is no Selkies process, so 502 is expected: the Service exists but nothing is listening on port 8080. On the real workspace image, Selkies 2.0 should be running, and a 502 means the process is down or the port is not reachable. Check `supervisorctl status` inside the pod, the Selkies logs, and whether the gateway is proxying the right port. Do not treat a 502 on the stand-in as a regression.

**Cross-question:** "How would you make this less confusing?" — Have the stand-in serve a clear placeholder on 8080, or have the gateway return a more specific message when the session image is the demo. The current documentation explains it, but a runtime hint would be better.

### Q86. The Gazebo viewer stays blank. Walk me through the diagnosis.

**Answer:** First check that Gazebo is actually running in the student's terminal. Then check `supervisorctl status` for `gazebo-web`, and read `/tmp/gazebo-web.err.log`. Confirm that port 9002 is listening. Confirm that the world includes the `SceneBroadcaster` plugin; without it, the bridge has no scene data. Check the browser console for WebSocket errors and whether the page is HTTPS while the socket is `ws://`, which browsers block as mixed content. Confirm the gateway proxies the WebSocket upgrade and that the viewer is pointed at the gateway URL, not `localhost`. Finally, check that the `gzweb` package version matches the expected `SceneManager` API.

**Follow-up:** "What is the most common cause?" — Either no `SceneBroadcaster` in the world, or the bridge process is not running. Both are visible in the logs within seconds.

### Q87. After a panel redeploy, sessions are running but the panel does not know about them. Why, and how is it fixed?

**Answer:** This was the `emptyDir` problem. The session records lived on a temporary volume that survives a container restart but is wiped when the pod is replaced. The Kubernetes Deployments, Services, and PVCs kept running, but the panel lost the records, so the sessions became orphans. The fix was to move the JSON stores to a PersistentVolumeClaim and add boot reconciliation: existing Deployments are adopted, missing ones are marked stopped. If it still happens, check that `SESSIONS_DB` points at the PVC mount, that the PVC is Bound, and that the boot log shows the reconcile line.

**Cross-question:** "What about the node approvals?" — They were on the same volume and were also lost in the old design. After the PVC change they survive redeploys. Losing the old `emptyDir` data once meant laptops had to re-join, which is a one-time migration cost.

### Q88. How do you test this without a second laptop or a GPU?

**Answer:** The hardware gate has `TEST_CPU`, `TEST_RAM`, and `TEST_GPU` overrides, so you can simulate Host and Guest decisions in seconds. `test-join.sh` covers the four branches, and `test-joining.sh` covers the portal enrollment script's thresholds. The Go packages use fake Kubernetes clients and `httptest` servers, so session provisioning, node state transitions, token minting, gateway authentication, and CSRF behaviour can be tested without a cluster. `test-captive-trap.sh` checks the redirect contract without root. The k3d path lets you run the full control plane on one machine with the stand-in image. What you cannot prove without hardware is real scheduling, real GPU behaviour, and the actual agent install.

**Cross-question:** "What is the risk of relying on fakes?" — They can encode your assumptions. The project mitigates that by doing live checks on the real master and documenting which claims are proven where. The two-laptop join is explicitly marked unproven.

### Q89. What tests exist, and what do they actually prove?

**Answer:** The Go unit tests cover authentication, discovery, the gateway, the HTTP API, join logic, nodes, sessions, the portal, and the CSRF guard. They prove ownership rules, one-session-per-user, lifecycle transitions, idempotent registration, approve/deny/expire, token-given-once, watcher behaviour, guard responses, hardware gates, report size limits, mDNS round-trip, CSRF binding, session store persistence and corruption handling, and SPA fallback order. The shell tests cover the join gate and the captive trap. Live checks on the real master prove ingress, cookie auth, gateway routing, session provisioning, admin approve/deny, and the real workspace image. What they do not prove is multi-host failover, Windows join, or production-scale load.

**Follow-up:** "Which test would you add next?" — An end-to-end two-laptop join on real hardware, and a chaos test that kills a Host during a session to see what actually happens to the PVC and the student experience.

### Q90. What would you monitor in production?

**Answer:** At the platform level: panel health and restart count, API error rates and latency, login failures, session provisioning time, the number of sessions stuck in provisioning, and the number of Pending pods. At the node level: CPU and memory pressure, disk usage, GPU utilization and memory, node Ready status, and kubelet restarts. At the session level: pod restarts, OOM kills, readiness failures, and the status of code-server, Selkies, and the Gazebo bridge. At the network level: ingress 5xx rates, DNS failures, and WebSocket disconnect rates. I would also collect structured logs with request IDs and alert on the symptoms that matter to a class: nobody can log in, sessions will not start, or the gateway is returning 5xx for ready sessions. Prometheus and Grafana are on the roadmap; today the panel logs and `kubectl` are the primary tools.

**Cross-question:** "What is the one alert you would set first?" — Panel unavailable, because everything depends on it. The second would be no Ready Host nodes, because then no new session can start.

---

## Part 7 — Case studies and scenario questions

### Q91. Case study: 40 students, 6 Host laptops, and one Host dies ten minutes into class. What do you do?

**Answer:** First, confirm the node is actually down and not just temporarily unreachable. Check `kubectl get nodes`, the node conditions, and the kubelet logs if reachable. Then identify which sessions were on that node and tell the instructor which students are affected. Kubernetes will mark the node NotReady after the lease expires and try to reschedule the pods, but the local-path PVCs are tied to that node, so the sessions probably will not recover with their data. The practical response is to delete the affected session records and have those students relaunch on the remaining hosts, accepting that unsaved work may be lost. Then check capacity: six hosts minus one may not fit forty sessions, so you may need to reduce the number of concurrent sessions, disable GPU for some, or move a group to a different activity. After class, the fixes are network storage or a documented backup routine, plus a capacity buffer and a clear relaunch procedure.

**Cross-question:** "How would you prevent the panic next time?" — A dashboard that shows which sessions are on which node, a printed runbook for the instructor, and a policy that students push work to Git or a shared drive at checkpoints. Also, do not schedule to 100 percent of capacity; keep at least one host of headroom.

### Q92. Case study: two students report that their robots are interfering. How do you investigate?

**Answer:** First, verify what "interfering" means. Are they seeing each other's topics, is one robot moving when the other publishes, or is the viewer showing the wrong world? Check both sessions' `ROS_DOMAIN_ID` values and confirm they are different. Check `ROS_AUTOMATIC_DISCOVERY_RANGE` inside each pod; if a student overrode it to a wider range, that is the likely cause. Check whether either pod is running with `hostNetwork`, which would break the namespace isolation. Check whether they share a PVC or a mounted volume. Run `ros2 topic list` and `ros2 node list` in each session and compare. If the configuration is correct and they still see each other, capture the network setup and escalate, because that would indicate a deeper cluster networking problem.

**Cross-question:** "What is the immediate mitigation?" — Restart the affected sessions with the correct environment, and if necessary move one student to a different Host. Then fix the root cause so it does not recur.

### Q93. Case study: the instructor wants to add ten laptops in ten minutes. How do you approach it?

**Answer:** First, separate the two costs: enrollment and image distribution. Enrollment is fast — register, approve, token, agent install — but the image is 2.4 GB compressed and 10.8 GB unpacked, so ten laptops pulling at once will saturate Wi-Fi and take much longer than ten minutes. I would stage it: pre-load the image on a local registry mirror or a USB shelf, or import it during a preparation window before class. Then use the portal and the join script for enrollment, approve in batches, and watch the watcher mark nodes joined. I would also check that the master can handle ten simultaneous registrations and that the switch and DHCP pool are adequate. If the ten laptops are Guests, it is much easier: they only need browsers and hostnames.

**Follow-up:** "What would you measure?" — Time per laptop from script start to joined, network throughput, image import time, and failure rate. That tells you whether the bottleneck is the network, the disk, or the approval workflow.

### Q94. Case study: the school network has a captive portal and wildcard DNS. Your deployment breaks. What do you check?

**Answer:** The symptom is usually that `*.ros-platform.local` resolves to the school's portal or a parking page, so the browser never reaches Traefik. Check `getent hosts control.ros-platform.local` and compare it with the master's real IP. If it is wrong, add `/etc/hosts` entries on the student machines or use `curl --resolve` for tests. Inside the cluster, the same wildcard can affect the gateway's DNS resolution, which is why the upstream uses a trailing-dot FQDN. Also check whether the school's captive portal is intercepting port 80; if so, HTTPS on 443 may pass through, or you may need to coordinate with the network team. The clean fix is a local DNS server or a split-horizon record that points the four names at the master, but that requires control of the network.

**Cross-question:** "Why not just use the school's DNS?" — Because you may not control it, and a wildcard can override your names. Hosts-file entries are a reliable fallback for a small classroom, even if they are not elegant.

### Q95. Case study: the master's DHCP address changes overnight, and nothing works in the morning. What happened, and how do you recover?

**Answer:** The ingress address, the `K3S_JOIN_URL`, the `/etc/hosts` entries on student machines, and possibly the panel's probes all referenced the old address. When the lease changed, the cluster might still be healthy, but browsers and joining laptops are pointed at the wrong IP. The panel's probes could also fail if they were targeting the old pod IP, which is what caused the restart storm in the real incident. Recovery: find the new address, update `/etc/hosts` on the clients, update `K3S_JOIN_URL` in the deployment, re-apply the ingress if needed, and confirm the panel is healthy. Then set a DHCP reservation or a static address so it does not happen again. The loopback probe fix prevents the crash loop, but it does not fix the client-side addresses.

**Cross-question:** "What is the permanent fix?" — A DHCP reservation tied to the master's MAC address, or a static IP outside the DHCP pool. Also make the join URL configurable rather than hardcoded, and document the address in one place.

### Q96. Case study: a security reviewer says "any password works." How do you respond and what do you build?

**Answer:** I would agree — it is a known limitation, not a defended design. The current login accepts any non-empty credentials because there is no user store. The fix has several parts. Add a user database with hashed passwords using a memory-hard algorithm such as Argon2id or bcrypt. Add roles — student, instructor, operator — and enforce authorization on every endpoint, not just authentication. Add login rate limiting and lockout, and log authentication events. Rotate the JWT secret and support token revocation or short expiry with refresh. Put TLS in front so credentials are not sent in plaintext. Add tests for wrong password, unknown user, disabled account, and role escalation. Until those are in place, I would not expose the platform beyond a trusted classroom LAN.

**Cross-question:** "What about the existing tokens?" — Rotating the secret invalidates all of them, which is acceptable during a security fix. I would communicate the logout to users and document the rotation procedure.

### Q97. Case study: you need to upgrade the panel with zero downtime and no lost sessions. How do you do it?

**Answer:** The current panel is a singleton with host networking, so true zero downtime is not possible without changing the architecture. With the current design, the safe procedure is: back up the JSON stores and the JWT secret, build and smoke-test the new image, import it, then delete the old pod and let the new one start. The PVC keeps the session records, and boot reconciliation adopts the live Deployments, so sessions are not lost even though the API is briefly unavailable. To get closer to zero downtime, I would move the panel off host networking, run two replicas behind the Service, and move mDNS to a separate host-networked advertiser. Then a rolling update can keep one replica serving while the other restarts. The JSON stores would also need to move to a shared database, because two replicas cannot safely write the same local file.

**Follow-up:** "What is the risk of the current procedure?" — A short outage and a failed start if the new image is bad. That is why the smoke test in a throwaway container matters, and why the old image tag should remain available for rollback.

### Q98. Case study: a Host has an 8 GB GPU, and four time-sliced sessions stutter. What do you do?

**Answer:** Time-slicing shares the GPU by switching between processes; it does not partition memory. Four Gazebo sessions may exceed 8 GB of GPU memory, causing swapping, allocation failures, or resets. First, measure per-session GPU memory and utilization. Then reduce the number of GPU sessions per host — for example, two instead of four — or lower the rendering load by using the browser viewer instead of GPU-rendered Gazebo where possible. If the workload really needs isolation, use MIG on a supported data-center GPU, or assign one GPU per session. I would also set expectations in the scheduler: advertise fewer GPU slots than the theoretical maximum, so Kubernetes does not overcommit. The key point is that time-slicing improves density but is not a memory isolation mechanism.

**Cross-question:** "How would you detect the problem before students complain?" — Export GPU memory and utilization metrics, and alert when memory is above a safe threshold or when sessions start failing with CUDA out-of-memory errors.

### Q99. Case study: the school wants students to access the platform from home. What changes?

**Answer:** The current design assumes a trusted LAN. Exposing it to the internet requires TLS with real certificates, strong authentication and authorization, a reverse proxy or VPN, and network policy. I would not port-forward the panel directly. The safer options are a VPN into the school network, or a bastion with identity-aware proxy and per-user authorization. You also need to consider latency for WebRTC and WebSocket, and whether the home network can reach the master at all. If the master is behind NAT, you need a relay or a public ingress. Operationally, you need logging, rate limiting, and a plan for abuse. My recommendation would be to start with a VPN for a small pilot, prove the security model, and only then consider a public ingress.

**Cross-question:** "Would you move everything to the cloud?" — Not necessarily. A hybrid model could keep the control plane and most sessions local, with a cloud burst for remote students. But that adds complexity and cost, so I would only do it if remote access is a real requirement.

### Q100. Case study: you inherit this repository tomorrow. What do you fix first, and why?

**Answer:** I would first read the roadmap and the checkpoints to understand what is proven and what is claimed. Then I would verify the live system: panel health, nodes Ready, a session from login to ready, editor and desktop access, and the gateway error matrix. After that, I would fix the highest-risk gaps in this order. First, real authentication and TLS, because the current login accepts any password and traffic is plaintext. Second, finish the two-laptop join and prove the agent install on real hardware, because that is the core promise and it is still marked unproven. Third, add NetworkPolicy and per-student quotas, so one session cannot affect another. Fourth, improve durability: move the panel stores to a proper database or at least back them up, and decide whether local-path storage is acceptable for student work. Fifth, build the pretty 3D viewer and the observability stack. I would keep the existing discipline of small, proven changes with a checkpoint note, and I would not claim a feature is done until it has been seen working on real hardware.

**Cross-question:** "Why not start with the viewer? It is the most visible." — Because it is the least risky gap. A blank viewer is annoying; an open login and plaintext traffic are security problems, and an unproven join path undermines the platform's main value. Visible polish comes after the foundations are safe.

---

## Quick self-check before the interview

- Can you explain the difference between a Host, a Guest, a Master, and a Session without looking?
- Can you trace a browser request through Traefik, the panel, the gateway, and the session Service?
- Can you explain why ROS traffic never crosses Flannel?
- Can you name the three Kubernetes objects per session and what each does?
- Can you explain the CSRF design and why login is exempt?
- Can you describe the join flow from registration to `role=host` labeling?
- Can you name at least five known limitations without being prompted?
- Can you debug a stuck session, a 502, a 401, and a crash loop using `kubectl`?
- Can you explain the hostNetwork rollout constraint and the delete-old-first rule?
- Can you describe what you would fix first and why?

If you can answer those ten without notes, you can handle the rest of the interview.
