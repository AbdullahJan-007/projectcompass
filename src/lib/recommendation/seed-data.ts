import type { DifficultyLevel } from "@prisma/client";

export interface CanonicalSkillSeed {
  slug: string;
  displayName: string;
  category:
    | "Frontend"
    | "Backend"
    | "Database"
    | "AI/ML"
    | "Systems/DevOps"
    | "Cybersecurity"
    | "Mobile/IoT";
}

export const CANONICAL_SKILLS: readonly CanonicalSkillSeed[] = [
  // Frontend (10)
  { slug: "typescript", displayName: "TypeScript", category: "Frontend" },
  { slug: "react", displayName: "React", category: "Frontend" },
  { slug: "nextjs", displayName: "Next.js", category: "Frontend" },
  { slug: "tailwindcss", displayName: "Tailwind CSS", category: "Frontend" },
  { slug: "webgl", displayName: "WebGL / Canvas", category: "Frontend" },
  { slug: "wcag-a11y", displayName: "WCAG Accessibility Auditing", category: "Frontend" },
  { slug: "playwright", displayName: "Playwright E2E Testing", category: "Frontend" },
  { slug: "state-machines", displayName: "Deterministic State Machines", category: "Frontend" },
  { slug: "webassembly", displayName: "WebAssembly (Wasm)", category: "Frontend" },
  { slug: "pwa-offline", displayName: "Offline-First IndexedDB / Service Workers", category: "Frontend" },

  // Backend (10)
  { slug: "nodejs", displayName: "Node.js", category: "Backend" },
  { slug: "python", displayName: "Python", category: "Backend" },
  { slug: "go", displayName: "Go (Golang)", category: "Backend" },
  { slug: "rust", displayName: "Rust", category: "Backend" },
  { slug: "fastapi", displayName: "FastAPI", category: "Backend" },
  { slug: "graphql", displayName: "GraphQL", category: "Backend" },
  { slug: "grpc", displayName: "gRPC & Protocol Buffers", category: "Backend" },
  { slug: "websockets", displayName: "WebSockets & WebRTC", category: "Backend" },
  { slug: "event-driven", displayName: "Event-Driven Workflows (Inngest/Queues)", category: "Backend" },
  { slug: "distributed-locking", displayName: "Distributed Transactions & Concurrency", category: "Backend" },

  // Database (8)
  { slug: "postgresql", displayName: "PostgreSQL", category: "Database" },
  { slug: "pgvector", displayName: "pgvector Semantic Search", category: "Database" },
  { slug: "prisma", displayName: "Prisma ORM", category: "Database" },
  { slug: "redis", displayName: "Redis", category: "Database" },
  { slug: "timescaledb", displayName: "Time-Series SQL (TimescaleDB)", category: "Database" },
  { slug: "clickhouse", displayName: "ClickHouse OLAP", category: "Database" },
  { slug: "sqlite-crdt", displayName: "Local-First SQLite & CRDTs", category: "Database" },
  { slug: "query-optimization", displayName: "SQL Query Planning & Indexing", category: "Database" },

  // AI/ML (10)
  { slug: "rag-pipelines", displayName: "RAG & Vector Retrieval Pipelines", category: "AI/ML" },
  { slug: "llm-evaluation", displayName: "LLM Guardrails & Evals", category: "AI/ML" },
  { slug: "pytorch", displayName: "PyTorch", category: "AI/ML" },
  { slug: "computer-vision", displayName: "Computer Vision (OpenCV / YOLO)", category: "AI/ML" },
  { slug: "nlp-transformers", displayName: "Transformer NLP & Embeddings", category: "AI/ML" },
  { slug: "speech-asr", displayName: "Speech Recognition & Audio DSP", category: "AI/ML" },
  { slug: "time-series-forecasting", displayName: "Time-Series Anomaly & Forecasting", category: "AI/ML" },
  { slug: "onnx-runtime", displayName: "ONNX Edge Model Quantization", category: "AI/ML" },
  { slug: "knowledge-graphs", displayName: "Hybrid Graph + Vector Retrieval", category: "AI/ML" },
  { slug: "differential-privacy", displayName: "Differential Privacy in ML", category: "AI/ML" },

  // Systems/DevOps (9)
  { slug: "docker", displayName: "Docker & Containerization", category: "Systems/DevOps" },
  { slug: "kubernetes", displayName: "Kubernetes & Helm", category: "Systems/DevOps" },
  { slug: "github-actions", displayName: "CI/CD Pipelines (GitHub Actions)", category: "Systems/DevOps" },
  { slug: "opentelemetry", displayName: "OpenTelemetry Distributed Tracing", category: "Systems/DevOps" },
  { slug: "linux-ebpf", displayName: "Linux eBPF Telemetry", category: "Systems/DevOps" },
  { slug: "ast-parsing", displayName: "Compilers & AST Static Analysis", category: "Systems/DevOps" },
  { slug: "prometheus", displayName: "Prometheus & Metrics Alerting", category: "Systems/DevOps" },
  { slug: "chaos-testing", displayName: "Fault Injection & Resilience Testing", category: "Systems/DevOps" },
  { slug: "terraform", displayName: "Infrastructure-as-Code (Terraform)", category: "Systems/DevOps" },

  // Cybersecurity (8)
  { slug: "owasp-security", displayName: "OWASP Application Security", category: "Cybersecurity" },
  { slug: "sast-analysis", displayName: "Static Code Vulnerability Analysis (SAST)", category: "Cybersecurity" },
  { slug: "cryptography", displayName: "Applied Cryptography & Zero-Trust Auth", category: "Cybersecurity" },
  { slug: "siem-log-analysis", displayName: "Threat Hunting & SIEM Log Analysis", category: "Cybersecurity" },
  { slug: "sbom-supply-chain", displayName: "SBOM & Dependency Vulnerability Auditing", category: "Cybersecurity" },
  { slug: "network-intrusion", displayName: "Network Packet Inspection & IDS", category: "Cybersecurity" },
  { slug: "oauth-oidc", displayName: "OAuth 2.1 / OIDC & RBAC Policy Engines", category: "Cybersecurity" },
  { slug: "fuzz-testing", displayName: "Automated API Fuzzing", category: "Cybersecurity" },

  // Mobile/IoT (7)
  { slug: "mqtt-iot", displayName: "MQTT & Industrial IoT Telemetry", category: "Mobile/IoT" },
  { slug: "embedded-c", displayName: "Embedded Firmware (ESP32 / ARM)", category: "Mobile/IoT" },
  { slug: "edge-gateway", displayName: "Edge IoT Gateway Buffering", category: "Mobile/IoT" },
  { slug: "react-native", displayName: "React Native Mobile Apps", category: "Mobile/IoT" },
  { slug: "ble-sensors", displayName: "Bluetooth Low Energy (BLE) Telemetry", category: "Mobile/IoT" },
  { slug: "geospatial-gis", displayName: "PostGIS & Geospatial Routing", category: "Mobile/IoT" },
  { slug: "smart-grid", displayName: "Energy Telemetry & Load Scheduling", category: "Mobile/IoT" },
];

export interface SeedArchetypeDefinition {
  id: string;
  slug: string;
  title: string;
  domain: string;
  problemSummary: string;
  coreDeliverable: string;
  requiredSkillSlugs: string[];
  recommendedStack: string[];
  difficulty: DifficultyLevel;
  baseEffortHours: number;
  publicDatasetAvailable: boolean;
  standardHardwareSufficient: boolean;
  noPaidApiLockin: boolean;
  careerTracks: string[];
}

export const SEED_IDEA_TEMPLATES: readonly SeedArchetypeDefinition[] = [
  {
    id: "cm0seed01cilogtriage00001",
    slug: "deterministic-ci-log-anomaly-triage",
    title: "Deterministic CI Log Anomaly Triage Engine for Small Engineering Teams",
    domain: "DevTools",
    problemSummary:
      "CI build failures generate thousands of lines of noisy console logs, forcing developers to manually grep stack traces and wasting hours on flaky test regressions.",
    coreDeliverable:
      "GitHub Actions webhook service that parses build logs, clusters recurring failure signatures using vector embeddings, and posts root-cause PR diffs with benchmarked precision.",
    requiredSkillSlugs: ["typescript", "nodejs", "postgresql", "pgvector", "github-actions"],
    recommendedStack: ["Next.js", "TypeScript", "PostgreSQL + pgvector", "Inngest", "GitHub Webhooks"],
    difficulty: "MODERATE",
    baseEffortHours: 340,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Full-Stack Engineer", "DevOps / Platform Engineer", "Backend Engineer"],
  },
  {
    id: "cm0seed02tsvulnscanner002",
    slug: "ast-typescript-security-vulnerability-scanner",
    title: "Static AST Vulnerability & Auth-Boundary Auditor for Next.js Repositories",
    domain: "Cybersecurity",
    problemSummary:
      "Modern full-stack TypeScript apps frequently ship Server Actions or API routes missing role checks, tenant scoping, or input validation.",
    coreDeliverable:
      "Compiler-grade AST analyzer that inspects Next.js App Router trees, detects unguarded database mutations and IDOR risks, and outputs SARIF reports for CI gates.",
    requiredSkillSlugs: ["typescript", "ast-parsing", "owasp-security", "sast-analysis", "nodejs"],
    recommendedStack: ["TypeScript Compiler API", "Node.js CLI", "Next.js Dashboard", "PostgreSQL"],
    difficulty: "CHALLENGING",
    baseEffortHours: 420,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Application Security Engineer", "Platform Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed03rubricgrader0003",
    slug: "citation-verified-exam-rubric-evaluator",
    title: "Automated Exam Rubric Evaluator with Grounded Textbook Citation Verification",
    domain: "EdTech",
    problemSummary:
      "University TAs face severe grading bottlenecks on short-answer exams, while naive LLM graders hallucinate feedback not grounded in course material.",
    coreDeliverable:
      "Course-pack indexed assessment workbench that evaluates student responses against multi-criteria rubrics, cites exact lecture paragraphs via pgvector, and flags low-confidence scores for TA review.",
    requiredSkillSlugs: ["typescript", "nextjs", "postgresql", "pgvector", "rag-pipelines", "llm-evaluation"],
    recommendedStack: ["Next.js App Router", "PostgreSQL + pgvector", "Vercel AI SDK", "Prisma"],
    difficulty: "MODERATE",
    baseEffortHours: 350,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Applied AI Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed04clinicaltriage04",
    slug: "offline-capable-clinical-triage-protocol-engine",
    title: "Offline-First Emergency Triage Decision Support & Protocol Audit System",
    domain: "HealthTech",
    problemSummary:
      "Rural clinics with intermittent connectivity rely on paper triage charts, causing delayed risk escalation and unverified vital-sign handoffs.",
    coreDeliverable:
      "Deterministic clinical triage rules engine with offline IndexedDB sync, vital-sign threshold alerting, and immutable shift handoff audit logs.",
    requiredSkillSlugs: ["typescript", "react", "pwa-offline", "state-machines", "postgresql"],
    recommendedStack: ["Next.js", "IndexedDB Sync", "PostgreSQL", "Prisma", "Tailwind CSS"],
    difficulty: "MODERATE",
    baseEffortHours: 330,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Full-Stack Engineer", "Frontend Systems Engineer"],
  },
  {
    id: "cm0seed05coldchainiot0005",
    slug: "pharmaceutical-cold-chain-telemetry-monitor",
    title: "Pharmaceutical Cold-Storage IoT Telemetry & Excursion Prediction Pipeline",
    domain: "IoT & Embedded",
    problemSummary:
      "Vaccine and insulin cold-chain refrigerators suffer undetected thermal excursions when cloud connectivity drops or compressor duty cycles degrade.",
    coreDeliverable:
      "MQTT ingestion pipeline with edge store-and-forward buffering, time-series thermal drift detection, and automated SMS/email escalation workflows.",
    requiredSkillSlugs: ["mqtt-iot", "python", "timescaledb", "postgresql", "time-series-forecasting"],
    recommendedStack: ["Python / FastAPI", "MQTT Broker", "PostgreSQL / Timescale", "Next.js UI"],
    difficulty: "CHALLENGING",
    baseEffortHours: 400,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["IoT / Embedded Systems Engineer", "Backend & Data Engineer"],
  },
  {
    id: "cm0seed06a11yauditpipe006",
    slug: "continuous-wcag-accessibility-regression-auditor",
    title: "Continuous WCAG 2.1 AA Accessibility Regression Auditor for University Portals",
    domain: "Web & SaaS",
    problemSummary:
      "Public academic portals routinely break keyboard navigation, ARIA semantics, and contrast ratios across deployments without automated verification.",
    coreDeliverable:
      "Playwright-driven headless DOM inspector that crawls authenticated university flows, computes contrast/focus-trap metrics, and tracks remediation SLAs per route.",
    requiredSkillSlugs: ["typescript", "playwright", "wcag-a11y", "nextjs", "postgresql"],
    recommendedStack: ["Playwright", "Next.js", "TypeScript", "PostgreSQL", "Inngest"],
    difficulty: "MODERATE",
    baseEffortHours: 310,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Frontend Engineer", "QA Automation Architect", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed07oteltraceanom007",
    slug: "opentelemetry-microservice-latency-root-cause",
    title: "OpenTelemetry Distributed Trace Bottleneck & N+1 Query Root-Cause Analyzer",
    domain: "Cloud & Distributed Systems",
    problemSummary:
      "Engineering teams struggle to pinpoint whether tail-latency spikes originate from N+1 ORM queries, lock contention, or downstream third-party APIs.",
    coreDeliverable:
      "OTLP span collector and DAG critical-path analyzer that automatically detects N+1 SQL patterns, serial waterfall calls, and p99 regressions across releases.",
    requiredSkillSlugs: ["opentelemetry", "nodejs", "postgresql", "query-optimization", "docker"],
    recommendedStack: ["OpenTelemetry SDK", "Node.js / Go", "PostgreSQL", "Next.js Flamegraph UI"],
    difficulty: "ADVANCED",
    baseEffortHours: 470,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Distributed Systems Engineer", "Site Reliability Engineer", "Backend Engineer"],
  },
  {
    id: "cm0seed08sbomguard0000008",
    slug: "transitive-dependency-sbom-exploitability-analyzer",
    title: "Reachability-Aware SBOM & Transitive Dependency Exploitability Verifier",
    domain: "Cybersecurity",
    problemSummary:
      "Standard npm/pip audit tools flood developers with hundreds of CVE alerts even when the vulnerable function is never reachable in application code.",
    coreDeliverable:
      "Call-graph reachability analyzer that cross-references Cyclonedx SBOM advisories against actual imported symbols to prioritize truly exploitable CVEs.",
    requiredSkillSlugs: ["typescript", "sbom-supply-chain", "ast-parsing", "owasp-security", "postgresql"],
    recommendedStack: ["TypeScript", "CycloneDX Parser", "AST Call-Graph Engine", "Next.js"],
    difficulty: "CHALLENGING",
    baseEffortHours: 410,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Security Engineer", "DevSecOps Engineer"],
  },
  {
    id: "cm0seed09sqlindexadvisor9",
    slug: "automated-postgresql-workload-index-advisor",
    title: "PostgreSQL Query Plan Inspector & Automated Index Recommendation Workbench",
    domain: "Data Engineering",
    problemSummary:
      "Production web apps degrade as tables grow because developers miss composite B-Tree or HNSW indexes or leave redundant unused indexes.",
    coreDeliverable:
      "Workload analyzer that parses EXPLAIN (ANALYZE, BUFFERS) JSON trees, identifies sequential scan hotspots, and simulates index impact in an ephemeral Docker sandbox.",
    requiredSkillSlugs: ["postgresql", "query-optimization", "typescript", "docker", "nodejs"],
    recommendedStack: ["PostgreSQL 16", "TypeScript", "Next.js", "Docker Sandbox Runner"],
    difficulty: "CHALLENGING",
    baseEffortHours: 390,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Database / Data Engineer", "Backend Engineer"],
  },
  {
    id: "cm0seed10finledgerrecon10",
    slug: "idempotent-double-entry-payment-reconciliation",
    title: "Idempotent Double-Entry Micro-Ledger & Webhook Reconciliation Engine",
    domain: "FinTech",
    problemSummary:
      "E-commerce and fee-collection portals suffer ledger drift when payment gateway webhooks arrive out-of-order, duplicate, or partially fail.",
    coreDeliverable:
      "ACID double-entry accounting ledger with deterministic idempotency keys, out-of-order webhook replay recovery, and daily settlement discrepancy detection.",
    requiredSkillSlugs: ["typescript", "postgresql", "distributed-locking", "nodejs", "event-driven"],
    recommendedStack: ["Next.js", "PostgreSQL ACID Transactions", "Prisma", "Inngest"],
    difficulty: "CHALLENGING",
    baseEffortHours: 380,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["FinTech Backend Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed11raghallucinate11",
    slug: "adversarial-rag-hallucination-benchmark-suite",
    title: "Adversarial Prompt-Injection & Hallucination Benchmark Harness for Enterprise RAG",
    domain: "Applied AI",
    problemSummary:
      "Teams deploy RAG chatbots without systematically testing whether retrieved documents containing indirect prompt injections can hijack system behavior.",
    coreDeliverable:
      "Automated red-teaming and faithfulness evaluation harness measuring citation precision, prompt-injection resistance, and latency across embedding models.",
    requiredSkillSlugs: ["python", "typescript", "rag-pipelines", "llm-evaluation", "pgvector"],
    recommendedStack: ["Next.js", "Vercel AI SDK", "PostgreSQL + pgvector", "Vitest Eval Runner"],
    difficulty: "CHALLENGING",
    baseEffortHours: 395,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["AI Safety & Evaluation Engineer", "Applied AI Engineer"],
  },
  {
    id: "cm0seed12edgecvdefect0012",
    slug: "quantized-onnx-pcb-solder-defect-inspector",
    title: "Quantized ONNX Edge Vision Inspector for PCB Solder Joint Defect Classification",
    domain: "Computer Vision",
    problemSummary:
      "Small electronics labs rely on slow manual magnification checks to spot solder bridges, missing components, and cold joints on assembled PCBs.",
    coreDeliverable:
      "Quantized ONNX computer-vision pipeline running on standard CPU/WebAssembly that localizes PCB defects from macro camera frames with false-negative auditing.",
    requiredSkillSlugs: ["python", "computer-vision", "onnx-runtime", "pytorch", "typescript"],
    recommendedStack: ["PyTorch / ONNX Runtime", "OpenCV", "FastAPI", "Next.js Review Console"],
    difficulty: "ADVANCED",
    baseEffortHours: 460,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Computer Vision Engineer", "ML Systems Engineer"],
  },
  {
    id: "cm0seed13campusmicrogrd13",
    slug: "solar-microgrid-load-forecasting-dispatch",
    title: "Campus Solar Microgrid Load Forecasting & Battery Peak-Shaving Scheduler",
    domain: "Smart Grid & IoT",
    problemSummary:
      "University buildings with rooftop solar incur high peak-tariff utility penalties due to uncoordinated HVAC and battery discharge schedules.",
    coreDeliverable:
      "Short-horizon irradiance and load forecasting engine paired with a linear-programming battery dispatch simulator and real-time savings dashboard.",
    requiredSkillSlugs: ["python", "time-series-forecasting", "timescaledb", "postgresql", "nextjs"],
    recommendedStack: ["Python", "PostgreSQL", "Next.js", "Tailwind CSS"],
    difficulty: "CHALLENGING",
    baseEffortHours: 410,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Data Scientist", "Energy IoT Engineer"],
  },
  {
    id: "cm0seed14crdtcollabspec14",
    slug: "local-first-crdt-engineering-rfc-editor",
    title: "Local-First CRDT Technical Specification & Architecture Diagram Collaborator",
    domain: "Web & SaaS",
    problemSummary:
      "Cloud-only document editors lose work on unstable networks and lack semantic diffing for embedded Mermaid architecture diagrams and API schemas.",
    coreDeliverable:
      "Offline-capable collaborative RFC workspace using conflict-free replicated data types (CRDTs), live diagram AST validation, and structural review threads.",
    requiredSkillSlugs: ["typescript", "react", "sqlite-crdt", "websockets", "pwa-offline"],
    recommendedStack: ["Next.js", "Yjs / CRDT", "WebSockets", "IndexedDB", "PostgreSQL"],
    difficulty: "ADVANCED",
    baseEffortHours: 450,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Staff Frontend / Systems Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed15apifuzzinggate15",
    slug: "property-based-openapi-contract-fuzzer",
    title: "Property-Based OpenAPI & Zod Schema Fuzzing Engine for Regression Detection",
    domain: "DevTools",
    problemSummary:
      "Hand-written unit tests rarely cover boundary UTF-8 payloads, integer overflows, or malformed nested JSON combinations in backend APIs.",
    coreDeliverable:
      "Automated contract fuzzer that ingests OpenAPI/Zod schemas, generates shrinking counterexamples on 500 crashes, and exports reproducible Vitest regression suites.",
    requiredSkillSlugs: ["typescript", "fuzz-testing", "nodejs", "owasp-security", "github-actions"],
    recommendedStack: ["TypeScript", "Node.js", "Zod", "Next.js Report Dashboard"],
    difficulty: "CHALLENGING",
    baseEffortHours: 380,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["SDET / QA Architect", "Security & Backend Engineer"],
  },
  {
    id: "cm0seed16siemthreatcorr16",
    slug: "lightweight-siem-auth-anomaly-correlator",
    title: "Lightweight SIEM Log Correlator for Credential Stuffing & Lateral Movement Detection",
    domain: "Cybersecurity",
    problemSummary:
      "Enterprise SIEMs are prohibitively complex for campus networks, leaving SSH, VPN, and web-portal brute-force patterns uncorrelated.",
    coreDeliverable:
      "Streaming syslog/JSON ingestion engine with sliding-window velocity rules, ASN/GeoIP impossibility checks, and MITRE ATT&CK incident timelines.",
    requiredSkillSlugs: ["python", "siem-log-analysis", "postgresql", "owasp-security", "nextjs"],
    recommendedStack: ["Python / FastAPI", "PostgreSQL", "Next.js Security Console"],
    difficulty: "MODERATE",
    baseEffortHours: 360,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["SOC / Cybersecurity Analyst", "Security Engineer"],
  },
  {
    id: "cm0seed17meddruginterac17",
    slug: "polypharmacy-drug-interaction-knowledge-graph",
    title: "Explainable Polypharmacy Drug-Interaction & Contraindication Knowledge Graph",
    domain: "HealthTech",
    problemSummary:
      "Elderly patients prescribed 5+ concurrent medications face severe adverse drug interactions that flat lookup tables fail to explain contextually.",
    coreDeliverable:
      "Biomedical knowledge-graph query engine over open FDA/DrugBank datasets that computes multi-drug metabolic pathway conflicts with verified clinical citations.",
    requiredSkillSlugs: ["python", "knowledge-graphs", "postgresql", "pgvector", "nextjs"],
    recommendedStack: ["Next.js", "PostgreSQL + pgvector", "Graph Traversal Engine", "Prisma"],
    difficulty: "CHALLENGING",
    baseEffortHours: 410,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["HealthTech AI Engineer", "Data & Knowledge Engineer"],
  },
  {
    id: "cm0seed18gitprreviewer018",
    slug: "schema-migration-safety-pr-verifier",
    title: "Zero-Downtime Database Migration Lock & Backward-Compatibility PR Verifier",
    domain: "DevTools",
    problemSummary:
      "Unchecked Prisma or SQL migrations containing table-rewriting locks or non-null column additions cause production downtime during rolling deploys.",
    coreDeliverable:
      "Automated SQL migration analyzer that flags ACCESS EXCLUSIVE lock hazards, destructive drops, and expand/contract violations before merge.",
    requiredSkillSlugs: ["postgresql", "query-optimization", "ast-parsing", "typescript", "github-actions"],
    recommendedStack: ["TypeScript", "PostgreSQL Catalog Inspector", "Next.js UI", "GitHub App"],
    difficulty: "MODERATE",
    baseEffortHours: 340,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Backend / Platform Engineer", "Database Reliability Engineer"],
  },
  {
    id: "cm0seed19transitgtfsopt19",
    slug: "gtfs-campus-shuttle-headway-optimizer",
    title: "GTFS Geospatial Transit Headway & Delay Propagation Simulator",
    domain: "Geospatial & Mobility",
    problemSummary:
      "University and municipal bus shuttles suffer bunching during peak class transitions, leaving downstream stops stranded.",
    coreDeliverable:
      "PostGIS-backed GTFS route simulator that models stop dwell times, detects bus-bunching thresholds, and recommends dynamic holding intervals.",
    requiredSkillSlugs: ["geospatial-gis", "postgresql", "typescript", "nextjs", "time-series-forecasting"],
    recommendedStack: ["PostgreSQL / PostGIS", "Next.js", "TypeScript", "MapLibre GL"],
    difficulty: "MODERATE",
    baseEffortHours: 350,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Full-Stack Geospatial Engineer", "Data Engineer"],
  },
  {
    id: "cm0seed20wasmdataanon0020",
    slug: "client-side-wasm-dataset-differential-privacy",
    title: "Client-Side WebAssembly Dataset De-Identification & K-Anonymity Workbench",
    domain: "Privacy & Security",
    problemSummary:
      "Researchers sharing hospital or survey CSVs accidentally leak re-identifiable quasi-identifiers (ZIP, age, gender) before uploading to cloud storage.",
    coreDeliverable:
      "Zero-server-upload browser workbench compiled to WebAssembly that enforces k-anonymity, l-diversity, and differential privacy noise locally prior to export.",
    requiredSkillSlugs: ["rust", "webassembly", "differential-privacy", "typescript", "nextjs"],
    recommendedStack: ["Rust -> WebAssembly", "Next.js", "TypeScript", "Tailwind CSS"],
    difficulty: "ADVANCED",
    baseEffortHours: 460,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Privacy & Security Engineer", "Systems Engineer"],
  },
  {
    id: "cm0seed21codeplagiarism21",
    slug: "ast-structural-code-similarity-detector",
    title: "Multi-Language AST Structural & Control-Flow Code Similarity Detector",
    domain: "EdTech",
    problemSummary:
      "Token-based plagiarism checkers are easily bypassed by variable renaming, loop unrolling, or dead-code insertion in programming assignments.",
    coreDeliverable:
      "Control-flow graph (CFG) and AST structural canonicalizer for TypeScript/Python that highlights isomorphic logic subtrees with side-by-side visual diffs.",
    requiredSkillSlugs: ["ast-parsing", "typescript", "python", "postgresql", "nextjs"],
    recommendedStack: ["TypeScript", "Tree-sitter / AST Parser", "PostgreSQL", "Next.js"],
    difficulty: "CHALLENGING",
    baseEffortHours: 400,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Compiler / Tooling Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed22chaosinjection22",
    slug: "http-dependency-fault-injection-proxy",
    title: "Deterministic HTTP/DB Fault-Injection Proxy for Resilience Verification",
    domain: "Cloud & Distributed Systems",
    problemSummary:
      "Applications rarely test how their circuit breakers and fallbacks behave when third-party payment or LLM APIs throttle, stall, or return corrupt JSON.",
    coreDeliverable:
      "Programmable reverse proxy and chaos test runner that injects latency jitter, HTTP 429 bursts, and truncated payloads while asserting SLO recovery.",
    requiredSkillSlugs: ["go", "chaos-testing", "docker", "opentelemetry", "typescript"],
    recommendedStack: ["Go / Node.js Proxy", "Next.js Control Plane", "PostgreSQL", "Docker"],
    difficulty: "CHALLENGING",
    baseEffortHours: 410,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Site Reliability Engineer", "Backend Infrastructure Engineer"],
  },
  {
    id: "cm0seed23rbacpolicyeval23",
    slug: "declarative-multi-tenant-rbac-abac-simulator",
    title: "Declarative Multi-Tenant RBAC/ABAC Policy Simulator & Drift Verifier",
    domain: "Cybersecurity",
    problemSummary:
      "As SaaS platforms add custom enterprise roles, permission checks scatter across codebases, creating accidental cross-tenant privilege escalations.",
    coreDeliverable:
      "Centralized authorization policy engine with matrix simulation testing, counterfactual permission proofs, and audit trail generation.",
    requiredSkillSlugs: ["oauth-oidc", "typescript", "postgresql", "owasp-security", "nextjs"],
    recommendedStack: ["TypeScript", "Next.js", "PostgreSQL", "Vitest Policy Matrix Runner"],
    difficulty: "MODERATE",
    baseEffortHours: 335,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Security & Identity Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed24finfraudstream24",
    slug: "explainable-velocity-graph-fraud-scorer",
    title: "Explainable Transaction Velocity & Device-Graph Anomaly Scorer",
    domain: "FinTech",
    problemSummary:
      "Black-box fraud models reject legitimate users without giving compliance analysts clear reasons for why a transfer was flagged.",
    coreDeliverable:
      "Sub-50ms hybrid rule + graph-feature scoring engine that flags mule-account rings and velocity spikes with human-readable compliance reason codes.",
    requiredSkillSlugs: ["python", "postgresql", "redis", "time-series-forecasting", "nextjs"],
    recommendedStack: ["Python / FastAPI", "PostgreSQL", "Redis", "Next.js Analyst Workbench"],
    difficulty: "CHALLENGING",
    baseEffortHours: 415,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["FinTech Risk & Data Engineer", "Backend Engineer"],
  },
  {
    id: "cm0seed25speechstutter025",
    slug: "acoustic-dysfluency-speech-therapy-coach",
    title: "Acoustic Speech Dysfluency & Pacing Feedback Workbench with On-Device DSP",
    domain: "HealthTech",
    problemSummary:
      "Speech therapy patients lack objective daily practice feedback on syllable pacing, prolongations, and silent blocks between clinical sessions.",
    coreDeliverable:
      "Privacy-preserving acoustic signal processor that extracts cadence, pause distribution, and vowel prolongation metrics with clinician progress charts.",
    requiredSkillSlugs: ["python", "speech-asr", "typescript", "nextjs", "postgresql"],
    recommendedStack: ["Python Audio DSP", "WebAudio API", "Next.js", "PostgreSQL"],
    difficulty: "CHALLENGING",
    baseEffortHours: 405,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Applied ML / Audio Engineer", "HealthTech Full-Stack Engineer"],
  },
  {
    id: "cm0seed26k8scostrightsz26",
    slug: "container-resource-rightsizing-recommender",
    title: "Container CPU/Memory Request Right-Sizing & OOM-Risk Analyzer",
    domain: "Cloud & Distributed Systems",
    problemSummary:
      "Engineering teams over-provision Kubernetes CPU and memory requests by 3x–5x out of fear of OOMKills, inflating cloud bills.",
    coreDeliverable:
      "Prometheus telemetry analyzer that models container burst percentiles, predicts OOM probability, and generates safe Terraform/Helm resource patches.",
    requiredSkillSlugs: ["kubernetes", "prometheus", "docker", "typescript", "postgresql"],
    recommendedStack: ["Prometheus Query Engine", "TypeScript", "Next.js", "PostgreSQL"],
    difficulty: "MODERATE",
    baseEffortHours: 350,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Cloud / FinOps Engineer", "DevOps Engineer"],
  },
  {
    id: "cm0seed27cropdiseasecv027",
    slug: "offline-mobile-crop-pathology-spectral-triage",
    title: "Low-Bandwidth Agricultural Leaf Pathology & Soil Moisture Advisory System",
    domain: "Computer Vision",
    problemSummary:
      "Smallholder farmers misdiagnose fungal blights versus nutrient deficiencies and lack reliable 4G coverage in field locations.",
    coreDeliverable:
      "Quantized mobile-ready leaf lesion classifier paired with regional weather/soil heuristics and localized treatment schedules.",
    requiredSkillSlugs: ["python", "computer-vision", "onnx-runtime", "pwa-offline", "nextjs"],
    recommendedStack: ["ONNX Web / Python", "Next.js Offline PWA", "PostgreSQL"],
    difficulty: "MODERATE",
    baseEffortHours: 345,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Applied AI / CV Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed28legalcontract028",
    slug: "clause-deviation-nda-procurement-comparator",
    title: "Semantic Clause-Deviation & Risk Highlighter for Software Procurement Contracts",
    domain: "Applied AI",
    problemSummary:
      "Startup and university procurement teams sign vendor agreements containing hidden liability shifts, auto-renewals, or non-standard IP clauses.",
    coreDeliverable:
      "Clause-segmented vector comparator that aligns uploaded contracts against a gold-standard playbook and flags high-risk indemnity or data-retention deviations.",
    requiredSkillSlugs: ["typescript", "rag-pipelines", "pgvector", "postgresql", "nextjs"],
    recommendedStack: ["Next.js", "PostgreSQL + pgvector", "Vercel AI SDK", "Prisma"],
    difficulty: "MODERATE",
    baseEffortHours: 330,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Applied AI Engineer", "Product Full-Stack Engineer"],
  },
  {
    id: "cm0seed29netidsflow000029",
    slug: "netflow-anomaly-botnet-c2-beacon-detector",
    title: "NetFlow Periodic C2 Beacon & DNS Exfiltration Anomaly Detector",
    domain: "Cybersecurity",
    problemSummary:
      "Encrypted malware command-and-control (C2) traffic bypasses payload inspection by using jittered periodic beacons or high-entropy DNS queries.",
    coreDeliverable:
      "Flow-metadata statistical analyzer using Fourier periodicity scoring and Shannon entropy to detect covert C2 beacons without decrypting TLS.",
    requiredSkillSlugs: ["python", "network-intrusion", "siem-log-analysis", "postgresql", "nextjs"],
    recommendedStack: ["Python", "PostgreSQL", "Next.js Threat Console"],
    difficulty: "ADVANCED",
    baseEffortHours: 445,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Network Security Engineer", "Threat Research Engineer"],
  },
  {
    id: "cm0seed30featureflagexp30",
    slug: "deterministic-feature-flag-canary-rollout-engine",
    title: "Deterministic Feature-Flag Evaluation & Automated Error-Budget Rollback Engine",
    domain: "Web & SaaS",
    problemSummary:
      "Teams ship risky features without automated rollback hooks tied to real-time error rates, causing prolonged outages before manual intervention.",
    coreDeliverable:
      "Consistent-hashing feature flag service with sub-millisecond SDK evaluation, cohort targeting rules, and automated kill-switch triggers on error spikes.",
    requiredSkillSlugs: ["typescript", "nodejs", "postgresql", "redis", "nextjs"],
    recommendedStack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma"],
    difficulty: "MODERATE",
    baseEffortHours: 330,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Full-Stack Product Engineer", "Platform Engineer"],
  },
  {
    id: "cm0seed31docarchdrift0031",
    slug: "codebase-to-architecture-diagram-drift-detector",
    title: "Automated Codebase Dependency Graph to Architecture Spec Drift Verifier",
    domain: "DevTools",
    problemSummary:
      "Architecture diagrams in markdown docs become obsolete within weeks as developers add cross-module imports that violate layer boundaries.",
    coreDeliverable:
      "Static module-graph extractor that compares actual TypeScript import boundaries against declared architecture rules and fails CI on forbidden layer couplings.",
    requiredSkillSlugs: ["typescript", "ast-parsing", "github-actions", "nodejs", "nextjs"],
    recommendedStack: ["TypeScript AST", "Node.js", "Next.js Visualizer", "Mermaid Exporter"],
    difficulty: "MODERATE",
    baseEffortHours: 325,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Software Architect", "Full-Stack Tooling Engineer"],
  },
  {
    id: "cm0seed32labequipsched032",
    slug: "constraint-solver-university-lab-scheduler",
    title: "Constraint-Satisfaction University Hardware Lab & GPU Cluster Quota Scheduler",
    domain: "EdTech",
    problemSummary:
      "University GPU workstations and robotics benches suffer idle waste or unfair monopolization due to ad-hoc booking spreadsheets.",
    coreDeliverable:
      "Fair-share quota scheduler with credit decay, conflict-free reservation transactions, and automated pre-emption notifications.",
    requiredSkillSlugs: ["typescript", "postgresql", "distributed-locking", "nextjs", "state-machines"],
    recommendedStack: ["Next.js", "PostgreSQL ACID Transactions", "Prisma", "Inngest"],
    difficulty: "MODERATE",
    baseEffortHours: 315,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Full-Stack Engineer", "Backend Systems Engineer"],
  },
  {
    id: "cm0seed33waterleakacous33",
    slug: "municipal-pipeline-pressure-transient-detector",
    title: "Water Distribution Pipeline Acoustic & Pressure-Transient Leak Localization Engine",
    domain: "IoT & Embedded",
    problemSummary:
      "Municipal and campus water networks lose 20%+ of treated water to underground pipe leaks that go unnoticed until surface flooding occurs.",
    coreDeliverable:
      "Sensor telemetry ingestion and wavelet pressure-drop correlator that triangulates leak segments across pipe graph topologies.",
    requiredSkillSlugs: ["python", "mqtt-iot", "time-series-forecasting", "postgresql", "nextjs"],
    recommendedStack: ["Python", "PostgreSQL", "Next.js GIS Topology Map"],
    difficulty: "CHALLENGING",
    baseEffortHours: 390,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["IoT Data Engineer", "Applied ML Engineer"],
  },
  {
    id: "cm0seed34sqlsynthdata0034",
    slug: "referential-integrity-synthetic-db-seeder",
    title: "Referential-Integrity-Preserving Synthetic Database Generator for Staging QA",
    domain: "Data Engineering",
    problemSummary:
      "Developers either test against tiny 5-row local fixtures or copy production databases containing sensitive customer PII into staging.",
    coreDeliverable:
      "Schema-introspecting synthetic data generator that preserves foreign-key cardinalities, statistical distributions, and check constraints with zero PII.",
    requiredSkillSlugs: ["typescript", "postgresql", "prisma", "nodejs", "differential-privacy"],
    recommendedStack: ["TypeScript", "Prisma DMMF Introspection", "PostgreSQL", "Next.js UI"],
    difficulty: "MODERATE",
    baseEffortHours: 340,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Data Platform Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed35llmcostgateway35",
    slug: "semantic-cache-multi-provider-ai-gateway",
    title: "Multi-Provider AI Gateway with pgvector Semantic Caching & Token Budget Quotas",
    domain: "Applied AI",
    problemSummary:
      "SaaS teams calling LLM APIs suffer runaway token bills on repetitive queries and hard outages when a single model provider hits rate limits.",
    coreDeliverable:
      "OpenAI-compatible proxy gateway featuring cosine-threshold semantic caching in pgvector, automatic provider fallback, and per-tenant budget circuit breakers.",
    requiredSkillSlugs: ["typescript", "pgvector", "postgresql", "nodejs", "llm-evaluation"],
    recommendedStack: ["Next.js / Node.js", "PostgreSQL + pgvector", "Vercel AI SDK", "Prisma"],
    difficulty: "CHALLENGING",
    baseEffortHours: 385,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["AI Infrastructure Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed36ergoposturecv036",
    slug: "on-device-kinematic-ergonomic-risk-assessor",
    title: "On-Device Pose-Estimation Ergonomic RULA/REBA Musculoskeletal Risk Assessor",
    domain: "Computer Vision",
    problemSummary:
      "Assembly-line and desk workers develop repetitive strain injuries because manual ergonomic assessments require expensive external consultants.",
    coreDeliverable:
      "Browser-based skeletal keypoint joint-angle analyzer that computes standardized RULA/REBA ergonomic risk scores completely on-device without video uploads.",
    requiredSkillSlugs: ["typescript", "computer-vision", "onnx-runtime", "react", "webgl"],
    recommendedStack: ["ONNX / MediaPipe Pose", "Next.js", "TypeScript", "Canvas Overlay"],
    difficulty: "MODERATE",
    baseEffortHours: 350,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Computer Vision Engineer", "Frontend ML Engineer"],
  },
  {
    id: "cm0seed37webhookdlq000037",
    slug: "transactional-outbox-webhook-delivery-engine",
    title: "Transactional Outbox & Exponential-Backoff Webhook Delivery Dispatcher",
    domain: "Cloud & Distributed Systems",
    problemSummary:
      "Platforms sending customer webhooks lose events when database commits succeed but HTTP dispatch fails, or overwhelm slow receivers without circuit breaking.",
    coreDeliverable:
      "PostgreSQL LISTEN/NOTIFY transactional outbox worker with HMAC signing, dead-letter queue inspection, and one-click customer replay portal.",
    requiredSkillSlugs: ["typescript", "postgresql", "event-driven", "cryptography", "nextjs"],
    recommendedStack: ["Next.js", "PostgreSQL", "Inngest", "HMAC-SHA256 Verifier"],
    difficulty: "MODERATE",
    baseEffortHours: 335,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Backend Systems Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed38ebpfnetpolicy038",
    slug: "container-egress-anomaly-policy-auditor",
    title: "Container Egress Traffic Baseline Profiler & Least-Privilege Network Policy Generator",
    domain: "Cybersecurity",
    problemSummary:
      "Compromised containers easily exfiltrate data or download crypto-miners because default cluster setups allow unrestricted outbound egress.",
    coreDeliverable:
      "Container DNS/socket egress profiler that learns legitimate service destinations during staging tests and synthesizes locked-down egress allowlists.",
    requiredSkillSlugs: ["docker", "linux-ebpf", "kubernetes", "go", "owasp-security"],
    recommendedStack: ["Go / Linux Telemetry", "Docker", "Next.js Policy Visualizer"],
    difficulty: "ADVANCED",
    baseEffortHours: 465,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Cloud Security Engineer", "Systems / Infrastructure Engineer"],
  },
  {
    id: "cm0seed39academiccitgrf39",
    slug: "retraction-aware-literature-citation-verifier",
    title: "Retraction-Aware Academic Literature Graph & Methodological Claim Verifier",
    domain: "Applied AI",
    problemSummary:
      "Researchers and thesis students inadvertently cite retracted papers or misquote empirical baseline metrics from secondary summaries.",
    coreDeliverable:
      "BibTeX/PDF citation verifier that cross-checks references against Crossref/RetractionWatch metadata and aligns claim sentences against source abstracts via pgvector.",
    requiredSkillSlugs: ["typescript", "pgvector", "postgresql", "rag-pipelines", "nextjs"],
    recommendedStack: ["Next.js", "PostgreSQL + pgvector", "Vercel AI SDK", "Prisma"],
    difficulty: "MODERATE",
    baseEffortHours: 340,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Applied AI & Research Engineer", "Full-Stack Engineer"],
  },
  {
    id: "cm0seed40coldstartrecom40",
    slug: "explainable-curriculum-skill-gap-mapper",
    title: "Explainable University Syllabus-to-Industry Competency Gap & Lab Generator",
    domain: "EdTech",
    problemSummary:
      "University curriculum committees update course syllabi every 4 years, leaving graduates missing hands-on testing, observability, and security competencies.",
    coreDeliverable:
      "Semantic competency alignment engine that maps course learning outcomes (CLOs) against industry engineering rubrics and synthesizes practical lab modules.",
    requiredSkillSlugs: ["typescript", "pgvector", "postgresql", "nextjs", "nlp-transformers"],
    recommendedStack: ["Next.js", "PostgreSQL + pgvector", "Prisma", "Tailwind CSS"],
    difficulty: "MODERATE",
    baseEffortHours: 320,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["EdTech Product Engineer", "Applied AI Engineer"],
  },
  {
    id: "cm0seed41dbbranchingci041",
    slug: "copy-on-write-ephemeral-postgres-ci-orchestrator",
    title: "Ephemeral Copy-on-Write PostgreSQL Schema Sandbox Orchestrator for Pull Requests",
    domain: "Data Engineering",
    problemSummary:
      "Shared staging databases get corrupted when multiple pull requests run conflicting migrations and integration tests simultaneously.",
    coreDeliverable:
      "Automated PR database lifecycle manager that provisions isolated schema snapshots, seeds anonymized test fixtures, and benchmarks query latency deltas.",
    requiredSkillSlugs: ["postgresql", "docker", "github-actions", "typescript", "query-optimization"],
    recommendedStack: ["TypeScript", "PostgreSQL", "Docker API", "Next.js Control UI"],
    difficulty: "CHALLENGING",
    baseEffortHours: 400,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["Platform / Data Engineer", "DevOps Engineer"],
  },
  {
    id: "cm0seed42bleassettrack042",
    slug: "hospital-equipment-ble-indoor-kalman-locator",
    title: "Hospital Critical Equipment BLE RSSI Indoor Localization & Maintenance Tracker",
    domain: "IoT & Embedded",
    problemSummary:
      "Nurses spend 30+ minutes per shift searching for portable infusion pumps and defibrillators across multi-floor hospital wings.",
    coreDeliverable:
      "BLE RSSI trilateration engine with Kalman filtering to estimate room-level equipment presence, utilization rates, and preventive calibration alerts.",
    requiredSkillSlugs: ["ble-sensors", "mqtt-iot", "python", "postgresql", "nextjs"],
    recommendedStack: ["Python Kalman Filter", "MQTT", "PostgreSQL", "Next.js Floorplan UI"],
    difficulty: "CHALLENGING",
    baseEffortHours: 395,
    publicDatasetAvailable: true,
    standardHardwareSufficient: true,
    noPaidApiLockin: true,
    careerTracks: ["IoT & Embedded Systems Engineer", "Full-Stack Engineer"],
  },
];

export interface MarketTrendSeed {
  id: string;
  domainSlug: string;
  domainName: string;
  demandLevel: "HIGH" | "GROWING" | "STEADY" | "NICHE";
  trendDirection: "UP" | "FLAT";
  topTechPairings: string[];
  portfolioSignal: string;
  sourceSummary: string;
  versionLabel: string;
}

export const MARKET_TREND_SNAPSHOTS: readonly MarketTrendSeed[] = [
  {
    id: "cm0trend01devtools0000001",
    domainSlug: "devtools",
    domainName: "DevTools",
    demandLevel: "HIGH",
    trendDirection: "UP",
    topTechPairings: ["TypeScript + AST Analysis", "PostgreSQL + pgvector", "GitHub Actions + SARIF"],
    portfolioSignal:
      "Engineering managers strongly favor candidates who build deterministic developer tooling, CI analyzers, and migration safety verifiers over basic CRUD web apps.",
    sourceSummary: "2026 Developer Ecosystem & Platform Engineering Hiring Index",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend02cybersecurity02",
    domainSlug: "cybersecurity",
    domainName: "Cybersecurity",
    demandLevel: "HIGH",
    trendDirection: "UP",
    topTechPairings: ["AST SAST + CycloneDX SBOM", "OAuth 2.1 / RBAC Engines", "SIEM Log Correlation"],
    portfolioSignal:
      "Supply-chain security (SBOM reachability) and automated auth-boundary verification rank among the highest-shortage graduate engineering specializations.",
    sourceSummary: "OWASP & Cloud Native Security Workforce Snapshot 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend03appliedai000003",
    domainSlug: "applied-ai",
    domainName: "Applied AI",
    demandLevel: "HIGH",
    trendDirection: "UP",
    topTechPairings: ["PostgreSQL pgvector + Hybrid RAG", "Vercel AI SDK + Zod Guardrails", "Eval Harnesses"],
    portfolioSignal:
      "Hiring teams reject ungrounded chat wrappers; projects demonstrating deterministic guardrails, citation verification, and fallback resilience stand out immediately.",
    sourceSummary: "Production AI Engineering & Reliability Benchmark 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend04edtech000000004",
    domainSlug: "edtech",
    domainName: "EdTech",
    demandLevel: "GROWING",
    trendDirection: "UP",
    topTechPairings: ["Next.js + pgvector Citations", "Tree-sitter AST Analysis", "Constraint Solvers"],
    portfolioSignal:
      "Academic platforms with auditable grading rubrics, citation grounding, and structural code analysis show strong institutional adoption.",
    sourceSummary: "Higher-Ed Digital Infrastructure Report 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend05healthtech00005",
    domainSlug: "healthtech",
    domainName: "HealthTech",
    demandLevel: "GROWING",
    trendDirection: "UP",
    topTechPairings: ["Offline-First IndexedDB + Next.js", "Knowledge Graphs + pgvector", "On-Device Audio DSP"],
    portfolioSignal:
      "Clinical decision-support tools that guarantee offline reliability, zero PII leakage, and deterministic protocol auditing carry high portfolio credibility.",
    sourceSummary: "Digital Health & Clinical Informatics Hiring Survey 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend06fintech00000006",
    domainSlug: "fintech",
    domainName: "FinTech",
    demandLevel: "HIGH",
    trendDirection: "UP",
    topTechPairings: ["PostgreSQL ACID Double-Entry", "Idempotent Webhooks + Inngest", "Velocity Graph Scoring"],
    portfolioSignal:
      "Demonstrating concurrency safety, idempotent webhook reconciliation, and explainable risk scoring directly matches core FinTech interview rubrics.",
    sourceSummary: "Global FinTech Payments & Ledger Engineering Report 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend07clouddist000007",
    domainSlug: "cloud-distributed-systems",
    domainName: "Cloud & Distributed Systems",
    demandLevel: "HIGH",
    trendDirection: "UP",
    topTechPairings: ["OpenTelemetry + PostgreSQL", "Go / Node.js Chaos Proxies", "Prometheus Right-Sizing"],
    portfolioSignal:
      "Observability, trace bottleneck analysis, and transactional outbox reliability remain top differentiators for backend and SRE roles.",
    sourceSummary: "CNCF Cloud Native Observability & Systems Survey 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend08dataeng00000008",
    domainSlug: "data-engineering",
    domainName: "Data Engineering",
    demandLevel: "HIGH",
    trendDirection: "UP",
    topTechPairings: ["PostgreSQL 16 + EXPLAIN Analysis", "Prisma + Synthetic Anonymization", "Docker CI Branches"],
    portfolioSignal:
      "Automated SQL index advisors and privacy-preserving synthetic data tooling demonstrate rare database internals mastery.",
    sourceSummary: "Data Platform & DBRE Competency Report 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend09computervis0009",
    domainSlug: "computer-vision",
    domainName: "Computer Vision",
    demandLevel: "GROWING",
    trendDirection: "UP",
    topTechPairings: ["ONNX Runtime Quantization", "PyTorch + OpenCV", "Browser WebAssembly Vision"],
    portfolioSignal:
      "Edge-quantized vision models running at low latency on standard CPU/browser hardware outperform heavy cloud-GPU-only demos.",
    sourceSummary: "Edge AI & Industrial Computer Vision Index 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend10iotembedded0010",
    domainSlug: "iot-embedded",
    domainName: "IoT & Embedded",
    demandLevel: "STEADY",
    trendDirection: "UP",
    topTechPairings: ["MQTT + Timescale/PostgreSQL", "Kalman Filtering + BLE", "Edge Store-and-Forward"],
    portfolioSignal:
      "Industrial cold-chain and utility telemetry projects that handle intermittent connectivity and sensor drift prove end-to-end systems thinking.",
    sourceSummary: "Industrial IoT & Smart Infrastructure Report 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend11websaas00000011",
    domainSlug: "web-saas",
    domainName: "Web & SaaS",
    demandLevel: "HIGH",
    trendDirection: "FLAT",
    topTechPairings: ["Next.js App Router + Strict TS", "Playwright WCAG Automation", "Local-First CRDTs"],
    portfolioSignal:
      "Standard CRUD SaaS is saturated; winning web projects focus on local-first CRDT sync, deterministic feature flags, or automated accessibility compliance.",
    sourceSummary: "Full-Stack Product Engineering Benchmark 2026-Q4",
    versionLabel: "2026-Q4",
  },
  {
    id: "cm0trend12privacysec00012",
    domainSlug: "privacy-security",
    domainName: "Privacy & Security",
    demandLevel: "NICHE",
    trendDirection: "UP",
    topTechPairings: ["Rust + WebAssembly", "K-Anonymity & Differential Privacy", "Zero-Trust Cryptography"],
    portfolioSignal:
      "Client-side de-identification and differential privacy tooling position graduates for specialized compliance and security engineering roles.",
    sourceSummary: "Privacy Engineering & Data Governance Outlook 2026-Q4",
    versionLabel: "2026-Q4",
  },
];

export interface DemoSupervisorSeed {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  title: string;
  researchDomains: string[];
  bio: string;
  preferredStacks: string[];
  skillSlugs: string[];
  maxSlots: number;
  activeSlots: number;
  isAccepting: boolean;
}

export const DEMO_SUPERVISORS: readonly DemoSupervisorSeed[] = [
  {
    id: "cm0sup01kamransiddiqui001",
    userId: "cm0usersup01kamran0000001",
    fullName: "Dr. Kamran Siddiqui",
    email: "kamran.siddiqui@university.edu",
    title: "Associate Professor",
    researchDomains: ["DevTools", "Cloud & Distributed Systems", "Data Engineering"],
    bio: "Leads the Distributed Systems & Automated Software Testing Lab. Focuses on CI log anomaly triage, OpenTelemetry root-cause analysis, and PostgreSQL query optimization.",
    preferredStacks: ["TypeScript", "Next.js", "PostgreSQL", "Go", "Docker", "OpenTelemetry"],
    skillSlugs: ["typescript", "nodejs", "postgresql", "opentelemetry", "github-actions", "query-optimization"],
    maxSlots: 5,
    activeSlots: 2,
    isAccepting: true,
  },
  {
    id: "cm0sup02ayesharehman00002",
    userId: "cm0usersup02ayesha0000002",
    fullName: "Dr. Ayesha Rehman",
    email: "ayesha.rehman@university.edu",
    title: "Associate Professor",
    researchDomains: ["Applied AI", "EdTech", "HealthTech"],
    bio: "Specializes in grounded RAG retrieval pipelines, pgvector citation verification,LLM evaluation guardrails, and clinical/educational decision-support workflows.",
    preferredStacks: ["Next.js", "TypeScript", "PostgreSQL + pgvector", "Python", "Vercel AI SDK"],
    skillSlugs: ["typescript", "nextjs", "postgresql", "pgvector", "rag-pipelines", "llm-evaluation"],
    maxSlots: 5,
    activeSlots: 3,
    isAccepting: true,
  },
  {
    id: "cm0sup03farhanqureshi0003",
    userId: "cm0usersup03farhan0000003",
    fullName: "Dr. Farhan Qureshi",
    email: "farhan.qureshi@university.edu",
    title: "Assistant Professor",
    researchDomains: ["Cybersecurity", "Privacy & Security", "DevTools"],
    bio: "Researches static AST code vulnerability analysis, SBOM dependency reachability, zero-trust RBAC policy engines, and network anomaly detection.",
    preferredStacks: ["TypeScript", "Rust", "Python", "PostgreSQL", "Next.js"],
    skillSlugs: ["typescript", "ast-parsing", "owasp-security", "sast-analysis", "sbom-supply-chain", "oauth-oidc"],
    maxSlots: 5,
    activeSlots: 1,
    isAccepting: true,
  },
  {
    id: "cm0sup04sanamirza00000004",
    userId: "cm0usersup04sana000000004",
    fullName: "Dr. Sana Mirza",
    email: "sana.mirza@university.edu",
    title: "Assistant Professor",
    researchDomains: ["FinTech", "Web & SaaS", "HealthTech"],
    bio: "Focuses on ACID double-entry financial ledgers, local-first offline web applications, WCAG accessibility automation, and high-reliability SaaS architectures.",
    preferredStacks: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Playwright"],
    skillSlugs: ["typescript", "react", "nextjs", "postgresql", "distributed-locking", "wcag-a11y", "playwright"],
    maxSlots: 4,
    activeSlots: 2,
    isAccepting: true,
  },
  {
    id: "cm0sup05tariqmehmood00005",
    userId: "cm0usersup05tariq00000005",
    fullName: "Prof. Dr. Tariq Mehmood",
    email: "tariq.mehmood@university.edu",
    title: "Professor",
    researchDomains: ["Computer Vision", "IoT & Embedded", "Smart Grid & IoT"],
    bio: "Directs the Edge Vision & Industrial IoT Lab. Supervises quantized ONNX inspection systems, MQTT cold-chain monitors, and campus microgrid forecasting.",
    preferredStacks: ["Python", "ONNX Runtime", "PyTorch", "MQTT", "PostgreSQL"],
    skillSlugs: ["python", "computer-vision", "onnx-runtime", "mqtt-iot", "time-series-forecasting"],
    maxSlots: 5,
    activeSlots: 5,
    isAccepting: true,
  },
];

export interface DemoArchiveSeed {
  id: string;
  title: string;
  abstract: string;
  academicYear: number;
  domain: string;
  techStack: string[];
}

export const DEMO_PROJECT_ARCHIVES: readonly DemoArchiveSeed[] = [
  {
    id: "cm0arch01logvisualizer001",
    title: "Automated Server Log Visualizer and CI Failure Dashboard",
    abstract:
      "A web dashboard that ingests GitHub Actions CI console logs and server error traces, parses failure lines, and displays build failure trends for small engineering teams.",
    academicYear: 2024,
    domain: "DevTools",
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "GitHub Actions"],
  },
  {
    id: "cm0arch02examchatbot00002",
    title: "University Course Material Q&A Assistant Using Vector Search",
    abstract:
      "An educational assistant that chunks lecture PDFs into vector embeddings and answers student course questions using retrieval-augmented generation.",
    academicYear: 2025,
    domain: "EdTech",
    techStack: ["Next.js", "PostgreSQL", "pgvector", "OpenAI API"],
  },
  {
    id: "cm0arch03iotgreenhouse003",
    title: "ESP32 Smart Greenhouse Temperature and Humidity Cloud Monitor",
    abstract:
      "An IoT telemetry portal using MQTT and ESP32 sensors to stream temperature thresholds to a web dashboard with email notifications.",
    academicYear: 2024,
    domain: "IoT & Embedded",
    techStack: ["Python", "MQTT", "PostgreSQL", "React"],
  },
  {
    id: "cm0arch04vulnheaderscan04",
    title: "Web Application HTTP Security Header and OWASP Checklist Scanner",
    abstract:
      "An automated URL scanner that checks CSP, HSTS, and cookie security headers against OWASP guidelines and generates PDF audit summaries.",
    academicYear: 2023,
    domain: "Cybersecurity",
    techStack: ["Node.js", "TypeScript", "Next.js", "PostgreSQL"],
  },
  {
    id: "cm0arch05clinicqueue00005",
    title: "Outpatient Clinic Appointment and Vital-Sign Intake Portal",
    abstract:
      "A clinical web application for recording patient intake vitals, managing doctor queue assignments, and exporting visit summaries.",
    academicYear: 2023,
    domain: "HealthTech",
    techStack: ["React", "Node.js", "PostgreSQL", "Tailwind CSS"],
  },
  {
    id: "cm0arch06expensewallet006",
    title: "Campus Digital Fee Ledger and Payment Webhook Tracker",
    abstract:
      "A student fee tracking system that records payment webhook callbacks and reconciles monthly department transaction histories.",
    academicYear: 2024,
    domain: "FinTech",
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma"],
  },
  {
    id: "cm0arch07codeplagcheck007",
    title: "Python Assignment Token Similarity Checker for Introductory Programming",
    abstract:
      "A code comparison tool that tokenizes student Python submissions and calculates pairwise Jaccard similarity scores for lab instructors.",
    academicYear: 2024,
    domain: "EdTech",
    techStack: ["Python", "FastAPI", "React", "PostgreSQL"],
  },
  {
    id: "cm0arch08shuttlemap000008",
    title: "Live Campus Shuttle Bus GPS Location Tracker",
    abstract:
      "A geospatial map dashboard displaying campus shuttle coordinates and estimated arrival times across university bus stops.",
    academicYear: 2023,
    domain: "Geospatial & Mobility",
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "Leaflet"],
  },
  {
    id: "cm0arch09leafblightcnn009",
    title: "Tomato Leaf Disease Classification Using Convolutional Neural Networks",
    abstract:
      "An image classification web service trained on PlantVillage images to classify leaf blight and powdery mildew from uploaded photos.",
    academicYear: 2024,
    domain: "Computer Vision",
    techStack: ["Python", "PyTorch", "FastAPI", "React"],
  },
  {
    id: "cm0arch10dockerresource10",
    title: "Docker Container CPU and Memory Metrics Dashboard",
    abstract:
      "A monitoring interface that polls container CPU and memory consumption from Prometheus and alerts administrators on high utilization.",
    academicYear: 2025,
    domain: "Cloud & Distributed Systems",
    techStack: ["TypeScript", "Prometheus", "Next.js", "Docker"],
  },
];
