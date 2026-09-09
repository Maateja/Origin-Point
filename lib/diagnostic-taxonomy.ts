export const DIAGNOSTIC_TAXONOMY_VERSION = "diagnostic-taxonomy-v1.0.0" as const;

export const DIAGNOSTIC_LEVELS = [
  { id: "very-beginner", title: "Very Beginner", description: "Terminology, identification, basic syntax, and direct examples." },
  { id: "beginner", title: "Beginner", description: "Straightforward application, common patterns, and standard operations." },
  { id: "intermediate", title: "Intermediate", description: "Engineering scenarios, debugging, optimization, and trade-offs." },
  { id: "advanced", title: "Advanced", description: "Complex constraints, architecture, scalability, and failure analysis." },
] as const;

export type DiagnosticLevelId = (typeof DIAGNOSTIC_LEVELS)[number]["id"];

export interface DiagnosticConcept {
  readonly key: string;
  readonly label: string;
  readonly levels: readonly DiagnosticLevelId[];
  readonly assessable: boolean;
  readonly description: string;
}

export interface DiagnosticSkill {
  readonly key: string;
  readonly label: string;
  readonly levels: readonly DiagnosticLevelId[];
  readonly assessable: boolean;
  readonly description: string;
  readonly concepts: readonly DiagnosticConcept[];
}

export interface DiagnosticTopic {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly skills: readonly DiagnosticSkill[];
}

export type DiagnosticTopicId =
  | "dsa"
  | "web-dev"
  | "db-sql"
  | "system-design"
  | "ai-ml"
  | "cloud-devops"
  | "cybersecurity"
  | "os-systems";

const levels = (...values: DiagnosticLevelId[]) => values;

const makeConcept = (
  key: string,
  label: string,
  allowedLevels: readonly DiagnosticLevelId[],
  description: string,
  assessable = true,
): DiagnosticConcept => ({ key, label, levels: allowedLevels, assessable, description });

const makeSkill = (
  key: string,
  label: string,
  allowedLevels: readonly DiagnosticLevelId[],
  description: string,
  concepts: readonly DiagnosticConcept[],
): DiagnosticSkill => ({
  key,
  label,
  levels: allowedLevels,
  assessable: concepts.some((item) => item.assessable),
  description,
  concepts,
});

export const diagnosticTaxonomy: readonly DiagnosticTopic[] = [
  {
    id: "dsa",
    title: "Programming & DSA",
    category: "Core Algorithms",
    description: "Arrays, hashing, trees, sorting, dynamic programming, and complexity analysis.",
    skills: [
      makeSkill("dsa.programming-fundamentals", "Programming Fundamentals", levels("very-beginner", "beginner"), "Basic programming structures and reasoning.", [
        makeConcept("dsa.programming-fundamentals.variables-and-types", "Variables and Data Types", levels("very-beginner"), "Stores values and distinguishes common data types."),
        makeConcept("dsa.programming-fundamentals.control-flow", "Control Flow", levels("very-beginner", "beginner"), "Uses conditions and loops to direct execution."),
        makeConcept("dsa.programming-fundamentals.functions", "Functions and Modularity", levels("very-beginner", "beginner"), "Breaks logic into reusable, testable operations."),
      ]),
      makeSkill("dsa.linear-data-structures", "Linear Data Structures", levels("very-beginner", "beginner", "intermediate"), "Organizes sequential and key-value data for common operations.", [
        makeConcept("dsa.linear-data-structures.arrays-and-strings", "Arrays and Strings", levels("very-beginner", "beginner"), "Stores, indexes, and traverses ordered values."),
        makeConcept("dsa.linear-data-structures.linked-lists", "Linked Lists", levels("beginner", "intermediate"), "Connects nodes and reasons about pointer-based traversal."),
        makeConcept("dsa.linear-data-structures.stacks-and-queues", "Stacks and Queues", levels("beginner", "intermediate"), "Applies LIFO and FIFO processing models."),
        makeConcept("dsa.linear-data-structures.hashing", "Hash Maps and Sets", levels("beginner", "intermediate"), "Uses key lookup, uniqueness, and frequency counting."),
      ]),
      makeSkill("dsa.searching-and-sorting", "Searching and Sorting", levels("beginner", "intermediate", "advanced"), "Finds and orders data using progressively more efficient strategies.", [
        makeConcept("dsa.searching-and-sorting.linear-search", "Linear Search", levels("beginner"), "Scans values sequentially to find a target."),
        makeConcept("dsa.searching-and-sorting.binary-search", "Binary Search", levels("beginner", "intermediate"), "Reduces a sorted search space by halves."),
        makeConcept("dsa.searching-and-sorting.sorting", "Sorting Strategies", levels("beginner", "intermediate"), "Compares common ordering algorithms and trade-offs."),
        makeConcept("dsa.searching-and-sorting.search-space-reduction", "Search-Space Reduction", levels("intermediate", "advanced"), "Frames difficult searches as constrained decision spaces."),
      ]),
      makeSkill("dsa.trees-and-graphs", "Trees and Graphs", levels("beginner", "intermediate", "advanced"), "Models hierarchical and network relationships.", [
        makeConcept("dsa.trees-and-graphs.tree-traversal", "Tree Traversal", levels("beginner", "intermediate"), "Visits tree nodes using depth- or breadth-first strategies."),
        makeConcept("dsa.trees-and-graphs.binary-search-trees", "Binary Search Trees", levels("intermediate"), "Maintains ordered tree search properties."),
        makeConcept("dsa.trees-and-graphs.graph-traversal", "Graph Traversal", levels("intermediate"), "Explores graph nodes with BFS or DFS."),
        makeConcept("dsa.trees-and-graphs.shortest-paths", "Shortest Paths and Ordering", levels("advanced"), "Solves path and dependency problems under constraints."),
      ]),
      makeSkill("dsa.algorithmic-techniques", "Algorithmic Techniques", levels("beginner", "intermediate", "advanced"), "Applies reusable approaches to solve algorithmic problems.", [
        makeConcept("dsa.algorithmic-techniques.recursion", "Recursion", levels("beginner", "intermediate"), "Defines a solution in terms of smaller instances."),
        makeConcept("dsa.algorithmic-techniques.greedy", "Greedy Algorithms", levels("intermediate", "advanced"), "Chooses locally optimal steps when they support a global solution."),
        makeConcept("dsa.algorithmic-techniques.backtracking", "Backtracking", levels("advanced"), "Explores and prunes candidate solution spaces."),
        makeConcept("dsa.algorithmic-techniques.dynamic-programming", "Dynamic Programming", levels("advanced"), "Uses states and recurrence to reuse overlapping subproblems."),
      ]),
      makeSkill("dsa.complexity-analysis", "Complexity Analysis", levels("beginner", "intermediate", "advanced"), "Evaluates time, space, and engineering trade-offs.", [
        makeConcept("dsa.complexity-analysis.time-complexity", "Time Complexity", levels("beginner", "intermediate"), "Estimates growth in execution work."),
        makeConcept("dsa.complexity-analysis.space-complexity", "Space Complexity", levels("beginner", "intermediate"), "Estimates additional memory requirements."),
        makeConcept("dsa.complexity-analysis.complexity-tradeoffs", "Complexity Trade-offs", levels("intermediate", "advanced"), "Chooses between competing time, space, and simplicity costs."),
      ]),
    ],
  },
  {
    id: "web-dev",
    title: "Web Development",
    category: "Frontend & Backend",
    description: "DOM manipulation, React lifecycle, SSR, CSS layout models, APIs, and state.",
    skills: [
      makeSkill("web-dev.web-foundations", "Web Foundations", levels("very-beginner", "beginner", "intermediate"), "Builds semantic, styled, and responsive web documents.", [
        makeConcept("web-dev.web-foundations.html-structure", "HTML Structure", levels("very-beginner"), "Creates documents from elements and attributes."),
        makeConcept("web-dev.web-foundations.semantic-html", "Semantic HTML", levels("very-beginner", "beginner"), "Uses meaningful elements for structure and intent."),
        makeConcept("web-dev.web-foundations.css-layout", "CSS Layout", levels("beginner", "intermediate"), "Uses the box model, Flexbox, and Grid to lay out interfaces."),
        makeConcept("web-dev.web-foundations.responsive-design", "Responsive Design", levels("intermediate"), "Adapts presentation to viewport and device constraints."),
      ]),
      makeSkill("web-dev.javascript", "JavaScript Fundamentals", levels("very-beginner", "beginner", "intermediate"), "Implements browser behavior with core JavaScript.", [
        makeConcept("web-dev.javascript.types-and-variables", "Types and Variables", levels("very-beginner", "beginner"), "Represents values and manages scope."),
        makeConcept("web-dev.javascript.functions-and-objects", "Functions and Objects", levels("beginner"), "Composes behavior and structured values."),
        makeConcept("web-dev.javascript.dom-and-events", "DOM and Events", levels("beginner", "intermediate"), "Responds to user interaction and updates documents."),
        makeConcept("web-dev.javascript.async-data", "Asynchronous Data", levels("intermediate"), "Coordinates promises, requests, and failure states."),
      ]),
      makeSkill("web-dev.components-and-state", "Components and State", levels("beginner", "intermediate", "advanced"), "Builds maintainable component-based interfaces.", [
        makeConcept("web-dev.components-and-state.components-and-props", "Components and Props", levels("beginner"), "Composes reusable UI from explicit inputs."),
        makeConcept("web-dev.components-and-state.state-management", "State Management", levels("beginner", "intermediate"), "Models changing UI state and transitions."),
        makeConcept("web-dev.components-and-state.effects-and-data-fetching", "Effects and Data Fetching", levels("intermediate"), "Coordinates external systems and loading/error states."),
        makeConcept("web-dev.components-and-state.rendering-boundaries", "Rendering Boundaries", levels("advanced"), "Chooses component boundaries for performance and reliability."),
      ]),
      makeSkill("web-dev.http-and-api-contracts", "HTTP and API Contracts", levels("beginner", "intermediate", "advanced"), "Integrates clients with reliable web services.", [
        makeConcept("web-dev.http-and-api-contracts.http-basics", "HTTP Basics", levels("beginner"), "Uses methods, status codes, headers, and bodies."),
        makeConcept("web-dev.http-and-api-contracts.rest-contracts", "REST Contracts", levels("intermediate"), "Designs predictable resource and error contracts."),
        makeConcept("web-dev.http-and-api-contracts.validation-and-errors", "Validation and Errors", levels("intermediate"), "Handles invalid input and failure responses safely."),
        makeConcept("web-dev.http-and-api-contracts.api-performance", "API Performance", levels("advanced"), "Reasons about caching, latency, and throughput."),
      ]),
      makeSkill("web-dev.accessibility-and-production", "Accessibility and Production Web", levels("beginner", "intermediate", "advanced"), "Makes web products usable, secure, and deployable.", [
        makeConcept("web-dev.accessibility-and-production.accessible-interactions", "Accessible Interactions", levels("beginner", "intermediate"), "Supports keyboard, semantics, focus, and assistive technologies."),
        makeConcept("web-dev.accessibility-and-production.authentication", "Web Authentication", levels("intermediate"), "Integrates sessions, OAuth, and protected routes."),
        makeConcept("web-dev.accessibility-and-production.rendering-and-routing", "Rendering and Routing", levels("intermediate", "advanced"), "Chooses routing and SSR/CSR strategies."),
        makeConcept("web-dev.accessibility-and-production.web-performance", "Web Performance", levels("advanced"), "Improves loading, rendering, and runtime behavior."),
      ]),
    ],
  },
  {
    id: "db-sql",
    title: "Database & SQL",
    category: "Data Systems",
    description: "Relational queries, indexes, ACID transactions, normalization, and ORM usage.",
    skills: [
      makeSkill("db-sql.relational-foundations", "Relational Foundations", levels("very-beginner", "beginner", "intermediate"), "Models structured data and its integrity constraints.", [
        makeConcept("db-sql.relational-foundations.tables-and-records", "Tables and Records", levels("very-beginner"), "Represents entities as rows and columns."),
        makeConcept("db-sql.relational-foundations.keys-and-constraints", "Keys and Constraints", levels("beginner"), "Maintains identity, references, and valid values."),
        makeConcept("db-sql.relational-foundations.relationships", "Relationships", levels("beginner"), "Models one-to-one, one-to-many, and many-to-many data."),
        makeConcept("db-sql.relational-foundations.normalization", "Normalization", levels("beginner", "intermediate"), "Reduces duplication while preserving useful relationships."),
      ]),
      makeSkill("db-sql.querying", "SQL Querying", levels("very-beginner", "beginner", "intermediate", "advanced"), "Retrieves and transforms relational data.", [
        makeConcept("db-sql.querying.select-and-filter", "SELECT and Filtering", levels("very-beginner", "beginner"), "Retrieves rows using projections and predicates."),
        makeConcept("db-sql.querying.joins", "Joins", levels("beginner", "intermediate"), "Combines related records across tables."),
        makeConcept("db-sql.querying.aggregation", "Aggregation", levels("beginner", "intermediate"), "Groups rows and calculates summaries."),
        makeConcept("db-sql.querying.subqueries-and-windows", "Subqueries and Window Functions", levels("intermediate", "advanced"), "Expresses layered and analytical queries."),
      ]),
      makeSkill("db-sql.performance", "Indexing and Query Performance", levels("beginner", "intermediate", "advanced"), "Improves database access through measurement and design.", [
        makeConcept("db-sql.performance.index-basics", "Index Basics", levels("beginner"), "Explains how indexes support lookups."),
        makeConcept("db-sql.performance.query-plans", "Query Plans", levels("intermediate"), "Reads execution plans to locate bottlenecks."),
        makeConcept("db-sql.performance.index-selection", "Index Selection", levels("intermediate"), "Matches indexes to workload and predicates."),
        makeConcept("db-sql.performance.query-optimization", "Query Optimization", levels("advanced"), "Balances latency, write cost, and resource use."),
      ]),
      makeSkill("db-sql.transactions", "Transactions and Concurrency", levels("intermediate", "advanced"), "Maintains correctness across concurrent database operations.", [
        makeConcept("db-sql.transactions.acid", "ACID Properties", levels("intermediate"), "Explains atomicity, consistency, isolation, and durability."),
        makeConcept("db-sql.transactions.isolation", "Isolation Levels", levels("intermediate", "advanced"), "Controls visibility and concurrency anomalies."),
        makeConcept("db-sql.transactions.locking", "Locking", levels("advanced"), "Coordinates conflicting reads and writes."),
        makeConcept("db-sql.transactions.recovery", "Recovery and Durability", levels("advanced"), "Reasons about logs, failure, and restoration."),
      ]),
      makeSkill("db-sql.safe-access", "Safe Data Access", levels("beginner", "intermediate", "advanced"), "Accesses data safely through application and infrastructure boundaries.", [
        makeConcept("db-sql.safe-access.parameterized-queries", "Parameterized Queries", levels("beginner", "intermediate"), "Separates query structure from untrusted values."),
        makeConcept("db-sql.safe-access.orm-boundaries", "ORM Query Boundaries", levels("intermediate"), "Uses abstractions without losing query correctness."),
        makeConcept("db-sql.safe-access.access-control", "Database Access Control", levels("intermediate", "advanced"), "Limits data access by identity and policy."),
        makeConcept("db-sql.safe-access.replication", "Replication and Recovery", levels("advanced"), "Designs read scaling and data recovery trade-offs."),
      ]),
    ],
  },
  {
    id: "system-design",
    title: "System Design",
    category: "Architecture",
    description: "Scalability, load balancing, caching, asynchronous pipelines, and CAP trade-offs.",
    skills: [
      makeSkill("system-design.architecture-foundations", "Architecture Foundations", levels("very-beginner", "beginner", "intermediate"), "Describes the major parts and responsibilities of a system.", [
        makeConcept("system-design.architecture-foundations.client-service-store", "Client, Service, and Store", levels("very-beginner", "beginner"), "Identifies the primary system boundaries."),
        makeConcept("system-design.architecture-foundations.api-boundaries", "API Boundaries", levels("beginner", "intermediate"), "Defines contracts between components."),
        makeConcept("system-design.architecture-foundations.service-decomposition", "Service Decomposition", levels("intermediate"), "Chooses boundaries that support ownership and change."),
      ]),
      makeSkill("system-design.scalability", "Scalability and Traffic", levels("beginner", "intermediate", "advanced"), "Handles increasing traffic and workload efficiently.", [
        makeConcept("system-design.scalability.vertical-horizontal", "Vertical and Horizontal Scaling", levels("beginner", "intermediate"), "Compares scaling a node with adding nodes."),
        makeConcept("system-design.scalability.load-balancing", "Load Balancing", levels("intermediate"), "Distributes requests across healthy capacity."),
        makeConcept("system-design.scalability.caching", "Caching", levels("intermediate"), "Trades freshness and memory for lower latency."),
        makeConcept("system-design.scalability.partitioning", "Partitioning and Hotspots", levels("advanced"), "Distributes data while avoiding skew and hot keys."),
      ]),
      makeSkill("system-design.async-processing", "Asynchronous Processing", levels("beginner", "intermediate", "advanced"), "Separates work in time to improve resilience and throughput.", [
        makeConcept("system-design.async-processing.queues", "Queues", levels("beginner", "intermediate"), "Buffers work between producers and consumers."),
        makeConcept("system-design.async-processing.backpressure", "Backpressure", levels("intermediate", "advanced"), "Prevents consumers from being overwhelmed."),
        makeConcept("system-design.async-processing.idempotency", "Idempotency", levels("intermediate", "advanced"), "Makes retries safe under repeated delivery."),
      ]),
      makeSkill("system-design.consistency-and-data", "Consistency and Data Distribution", levels("intermediate", "advanced"), "Reasons about data behavior across multiple nodes.", [
        makeConcept("system-design.consistency-and-data.replication", "Replication", levels("intermediate"), "Maintains multiple copies and their update behavior."),
        makeConcept("system-design.consistency-and-data.consistency-models", "Consistency Models", levels("advanced"), "Compares strong, eventual, and session guarantees."),
        makeConcept("system-design.consistency-and-data.distributed-tradeoffs", "Distributed Trade-offs", levels("advanced"), "Chooses availability, consistency, and partition behavior."),
      ]),
      makeSkill("system-design.reliability", "Reliability and Observability", levels("beginner", "intermediate", "advanced"), "Detects failures and keeps systems useful under stress.", [
        makeConcept("system-design.reliability.timeouts-and-retries", "Timeouts and Retries", levels("beginner", "intermediate"), "Bounds waiting and handles transient failure."),
        makeConcept("system-design.reliability.observability", "Observability", levels("intermediate"), "Uses logs, metrics, and traces to understand behavior."),
        makeConcept("system-design.reliability.circuit-breakers", "Circuit Breakers", levels("advanced"), "Limits cascading failure from unhealthy dependencies."),
        makeConcept("system-design.reliability.failure-analysis", "Failure Analysis", levels("advanced"), "Designs for recovery and evaluates failure domains."),
      ]),
    ],
  },
  {
    id: "ai-ml",
    title: "Artificial Intelligence & ML",
    category: "Intelligence",
    description: "Supervised learning, loss functions, tokenization, transformers, and model tuning.",
    skills: [
      makeSkill("ai-ml.ml-foundations", "ML Foundations", levels("very-beginner", "beginner", "intermediate"), "Frames data, models, and learning tasks.", [
        makeConcept("ai-ml.ml-foundations.data-features-labels", "Data, Features, and Labels", levels("very-beginner", "beginner"), "Identifies inputs and targets used for learning."),
        makeConcept("ai-ml.ml-foundations.supervised-learning", "Supervised Learning", levels("beginner", "intermediate"), "Learns from labeled examples."),
        makeConcept("ai-ml.ml-foundations.unsupervised-learning", "Unsupervised Learning", levels("intermediate"), "Finds structure without labeled targets."),
        makeConcept("ai-ml.ml-foundations.train-validation-test", "Train, Validation, and Test Splits", levels("beginner", "intermediate"), "Separates learning, tuning, and evaluation data."),
      ]),
      makeSkill("ai-ml.evaluation", "Model Evaluation", levels("beginner", "intermediate", "advanced"), "Measures model behavior and generalization.", [
        makeConcept("ai-ml.evaluation.classification-metrics", "Classification Metrics", levels("beginner", "intermediate"), "Interprets accuracy, precision, recall, and related measures."),
        makeConcept("ai-ml.evaluation.regression-metrics", "Regression Metrics", levels("intermediate"), "Measures continuous prediction error."),
        makeConcept("ai-ml.evaluation.overfitting", "Overfitting and Generalization", levels("intermediate"), "Recognizes memorization and weak transfer."),
        makeConcept("ai-ml.evaluation.model-evaluation", "Evaluation Design", levels("advanced"), "Designs reliable evaluation under deployment conditions."),
      ]),
      makeSkill("ai-ml.training", "Training and Optimization", levels("beginner", "intermediate", "advanced"), "Improves models through objectives, regularization, and optimization.", [
        makeConcept("ai-ml.training.loss-functions", "Loss Functions", levels("beginner", "intermediate"), "Measures model error during training."),
        makeConcept("ai-ml.training.regularization", "Regularization", levels("intermediate"), "Controls model complexity and overfitting."),
        makeConcept("ai-ml.training.optimization", "Optimization", levels("intermediate", "advanced"), "Adjusts model parameters to reduce loss."),
        makeConcept("ai-ml.training.training-pipelines", "Training Pipelines", levels("advanced"), "Automates repeatable, observable model training."),
      ]),
      makeSkill("ai-ml.deep-learning", "Deep Learning", levels("beginner", "intermediate", "advanced"), "Builds and reasons about neural models.", [
        makeConcept("ai-ml.deep-learning.neural-network-basics", "Neural Network Basics", levels("beginner", "intermediate"), "Explains layers, activations, and learned parameters."),
        makeConcept("ai-ml.deep-learning.backpropagation", "Backpropagation", levels("intermediate", "advanced"), "Propagates error gradients through a network."),
        makeConcept("ai-ml.deep-learning.transformers", "Transformer Architecture", levels("advanced"), "Uses attention-based sequence modeling."),
      ]),
      makeSkill("ai-ml.generative-ai", "Generative AI Systems", levels("beginner", "intermediate", "advanced"), "Uses language models and retrieval systems responsibly.", [
        makeConcept("ai-ml.generative-ai.tokenization", "Tokenization", levels("beginner", "intermediate"), "Represents text as model input units."),
        makeConcept("ai-ml.generative-ai.embeddings", "Embeddings", levels("intermediate"), "Represents semantic relationships as vectors."),
        makeConcept("ai-ml.generative-ai.rag", "Retrieval-Augmented Generation", levels("advanced"), "Grounds generation with retrieved context."),
        makeConcept("ai-ml.generative-ai.deployment-governance", "Deployment and Governance", levels("advanced"), "Controls evaluation, safety, cost, and operation."),
      ]),
    ],
  },
  {
    id: "cloud-devops",
    title: "Cloud & DevOps",
    category: "Infrastructure",
    description: "Containers, orchestration, CI/CD pipelines, IAM permissions, and monitoring.",
    skills: [
      makeSkill("cloud-devops.infrastructure", "Cloud Infrastructure", levels("very-beginner", "beginner", "intermediate", "advanced"), "Provides compute, storage, networking, and environments.", [
        makeConcept("cloud-devops.infrastructure.compute-storage-networking", "Compute, Storage, and Networking", levels("very-beginner", "beginner"), "Identifies core infrastructure resources."),
        makeConcept("cloud-devops.infrastructure.environments", "Environments and Configuration", levels("beginner", "intermediate"), "Separates configuration across delivery environments."),
        makeConcept("cloud-devops.infrastructure.infrastructure-as-code", "Infrastructure as Code", levels("intermediate"), "Defines repeatable infrastructure declaratively."),
        makeConcept("cloud-devops.infrastructure.cost-management", "Cost and Capacity Management", levels("advanced"), "Balances reliability, capacity, and spend."),
      ]),
      makeSkill("cloud-devops.versioned-delivery", "Versioned Delivery", levels("very-beginner", "beginner", "intermediate", "advanced"), "Moves tested software through repeatable delivery pipelines.", [
        makeConcept("cloud-devops.versioned-delivery.version-control", "Version Control", levels("very-beginner", "beginner"), "Tracks changes and supports collaboration."),
        makeConcept("cloud-devops.versioned-delivery.builds-and-artifacts", "Builds and Artifacts", levels("beginner", "intermediate"), "Produces traceable deployable outputs."),
        makeConcept("cloud-devops.versioned-delivery.ci-cd", "CI/CD Pipelines", levels("beginner", "intermediate"), "Automates verification and delivery."),
        makeConcept("cloud-devops.versioned-delivery.release-strategies", "Release Strategies", levels("intermediate", "advanced"), "Controls rollout, rollback, and risk."),
      ]),
      makeSkill("cloud-devops.containers", "Containers and Orchestration", levels("beginner", "intermediate", "advanced"), "Packages and operates applications consistently.", [
        makeConcept("cloud-devops.containers.container-basics", "Container Basics", levels("beginner"), "Packages an application with its runtime dependencies."),
        makeConcept("cloud-devops.containers.images-and-registries", "Images and Registries", levels("beginner", "intermediate"), "Builds, tags, and distributes container images."),
        makeConcept("cloud-devops.containers.orchestration", "Orchestration", levels("intermediate", "advanced"), "Schedules, scales, and heals workloads."),
        makeConcept("cloud-devops.containers.networking", "Container Networking", levels("advanced"), "Connects workloads while preserving isolation."),
      ]),
      makeSkill("cloud-devops.operations", "Operations and Reliability", levels("beginner", "intermediate", "advanced"), "Observes systems and responds to operational events.", [
        makeConcept("cloud-devops.operations.logging-and-metrics", "Logging and Metrics", levels("beginner", "intermediate"), "Captures signals needed to understand behavior."),
        makeConcept("cloud-devops.operations.tracing", "Tracing", levels("intermediate"), "Follows requests across distributed components."),
        makeConcept("cloud-devops.operations.incident-response", "Incident Response", levels("intermediate", "advanced"), "Restores service and learns from failures."),
        makeConcept("cloud-devops.operations.scaling-and-recovery", "Scaling and Recovery", levels("advanced"), "Maintains service under load and failure."),
      ]),
      makeSkill("cloud-devops.security", "Cloud Security", levels("beginner", "intermediate", "advanced"), "Protects infrastructure, identities, and configuration.", [
        makeConcept("cloud-devops.security.iam", "Identity and Access Management", levels("beginner", "intermediate"), "Limits actions by identity and role."),
        makeConcept("cloud-devops.security.secrets", "Secrets Management", levels("intermediate"), "Protects credentials and sensitive configuration."),
        makeConcept("cloud-devops.security.supply-chain", "Software Supply Chain", levels("intermediate", "advanced"), "Controls dependencies, provenance, and build integrity."),
      ]),
    ],
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    category: "InfoSec",
    description: "Authentication protocols, encryption, network defense, and secure application design.",
    skills: [
      makeSkill("cybersecurity.security-foundations", "Security Foundations", levels("very-beginner", "beginner", "intermediate"), "Frames threats, controls, and security objectives.", [
        makeConcept("cybersecurity.security-foundations.cia-triad", "CIA Triad", levels("very-beginner", "beginner"), "Explains confidentiality, integrity, and availability."),
        makeConcept("cybersecurity.security-foundations.threats-and-vulnerabilities", "Threats and Vulnerabilities", levels("beginner"), "Distinguishes threats, weaknesses, and impacts."),
        makeConcept("cybersecurity.security-foundations.least-privilege", "Least Privilege", levels("beginner", "intermediate"), "Limits access to what is necessary."),
        makeConcept("cybersecurity.security-foundations.threat-modeling", "Threat Modeling", levels("intermediate"), "Identifies assets, attackers, and mitigations."),
      ]),
      makeSkill("cybersecurity.identity", "Identity and Access Security", levels("beginner", "intermediate", "advanced"), "Verifies identities and controls permissions.", [
        makeConcept("cybersecurity.identity.authentication", "Authentication", levels("beginner"), "Verifies who a principal is."),
        makeConcept("cybersecurity.identity.authorization", "Authorization", levels("beginner", "intermediate"), "Controls what an authenticated principal can do."),
        makeConcept("cybersecurity.identity.sessions-and-tokens", "Sessions and Tokens", levels("intermediate"), "Manages authenticated state and credential lifetime."),
        makeConcept("cybersecurity.identity.oauth-and-oidc", "OAuth and OpenID Connect", levels("advanced"), "Delegates authorization and identity safely."),
      ]),
      makeSkill("cybersecurity.application-security", "Application Security", levels("beginner", "intermediate", "advanced"), "Prevents common application vulnerabilities.", [
        makeConcept("cybersecurity.application-security.input-validation", "Input Validation", levels("beginner", "intermediate"), "Constrains and validates untrusted input."),
        makeConcept("cybersecurity.application-security.injection", "Injection Prevention", levels("intermediate"), "Separates code from attacker-controlled data."),
        makeConcept("cybersecurity.application-security.xss-and-csrf", "XSS and CSRF Protection", levels("intermediate"), "Protects browser interactions and user sessions."),
        makeConcept("cybersecurity.application-security.secure-architecture", "Secure Architecture", levels("advanced"), "Builds layered controls into system boundaries."),
      ]),
      makeSkill("cybersecurity.cryptography-and-network", "Cryptography and Network Security", levels("beginner", "intermediate", "advanced"), "Protects data and communication channels.", [
        makeConcept("cybersecurity.cryptography-and-network.encryption", "Encryption Basics", levels("beginner"), "Protects confidentiality with cryptographic keys."),
        makeConcept("cybersecurity.cryptography-and-network.hashing", "Hashing", levels("beginner", "intermediate"), "Uses one-way representations for integrity and credentials."),
        makeConcept("cybersecurity.cryptography-and-network.tls", "TLS", levels("intermediate"), "Protects network transport and server identity."),
        makeConcept("cybersecurity.cryptography-and-network.network-segmentation", "Network Segmentation", levels("advanced"), "Limits lateral movement through boundaries."),
      ]),
      makeSkill("cybersecurity.detection-and-response", "Detection and Response", levels("intermediate", "advanced"), "Detects, investigates, and contains security events.", [
        makeConcept("cybersecurity.detection-and-response.logging", "Security Logging", levels("intermediate"), "Records useful evidence for detection and investigation."),
        makeConcept("cybersecurity.detection-and-response.incident-response", "Incident Response", levels("intermediate", "advanced"), "Contains impact and restores trustworthy operation."),
        makeConcept("cybersecurity.detection-and-response.zero-trust", "Zero Trust", levels("advanced"), "Continuously verifies access rather than trusting location."),
      ]),
    ],
  },
  {
    id: "os-systems",
    title: "Operating Systems",
    category: "Low Level",
    description: "Process scheduling, virtual memory, paging, locks, race conditions, and system calls.",
    skills: [
      makeSkill("os-systems.processes-and-calls", "Processes and System Calls", levels("very-beginner", "beginner", "intermediate"), "Explains program execution and operating-system boundaries.", [
        makeConcept("os-systems.processes-and-calls.processes-and-programs", "Processes and Programs", levels("very-beginner", "beginner"), "Distinguishes executable code from running process state."),
        makeConcept("os-systems.processes-and-calls.system-calls", "System Calls", levels("beginner", "intermediate"), "Requests services from the kernel."),
        makeConcept("os-systems.processes-and-calls.user-kernel-mode", "User and Kernel Mode", levels("intermediate"), "Separates privileged and unprivileged execution."),
      ]),
      makeSkill("os-systems.memory", "Memory Management", levels("beginner", "intermediate", "advanced"), "Manages address spaces, allocation, and memory performance.", [
        makeConcept("os-systems.memory.memory-layout", "Memory Layout", levels("beginner"), "Identifies common process memory regions."),
        makeConcept("os-systems.memory.stack-and-heap", "Stack and Heap", levels("beginner", "intermediate"), "Compares automatic and dynamic allocation."),
        makeConcept("os-systems.memory.virtual-memory", "Virtual Memory", levels("intermediate"), "Maps process addresses to physical memory."),
        makeConcept("os-systems.memory.paging", "Paging", levels("intermediate", "advanced"), "Uses fixed-size pages and frames to manage memory."),
      ]),
      makeSkill("os-systems.concurrency", "Concurrency and Scheduling", levels("beginner", "intermediate", "advanced"), "Shares CPU execution among independent and cooperating work.", [
        makeConcept("os-systems.concurrency.scheduling", "CPU Scheduling", levels("beginner", "intermediate"), "Chooses which ready work executes next."),
        makeConcept("os-systems.concurrency.context-switching", "Context Switching", levels("intermediate"), "Preserves and restores execution state."),
        makeConcept("os-systems.concurrency.threads", "Threads", levels("beginner", "intermediate"), "Runs multiple execution paths within a process."),
        makeConcept("os-systems.concurrency.memory-models", "Memory Models", levels("advanced"), "Reasons about visibility and ordering across processors."),
      ]),
      makeSkill("os-systems.synchronization", "Synchronization and Failure", levels("intermediate", "advanced"), "Coordinates concurrent work and handles unsafe interleavings.", [
        makeConcept("os-systems.synchronization.mutexes", "Locks and Mutexes", levels("intermediate"), "Protects shared state from conflicting access."),
        makeConcept("os-systems.synchronization.race-conditions", "Race Conditions", levels("intermediate", "advanced"), "Identifies behavior that depends on timing."),
        makeConcept("os-systems.synchronization.deadlocks", "Deadlocks", levels("advanced"), "Detects circular waiting and recovery strategies."),
      ]),
      makeSkill("os-systems.storage-and-io", "Storage and I/O", levels("very-beginner", "beginner", "intermediate", "advanced"), "Interacts with files, devices, and persistent storage.", [
        makeConcept("os-systems.storage-and-io.files-and-directories", "Files and Directories", levels("very-beginner", "beginner"), "Organizes persistent data in a filesystem."),
        makeConcept("os-systems.storage-and-io.permissions", "File Permissions", levels("beginner", "intermediate"), "Controls access to filesystem resources."),
        makeConcept("os-systems.storage-and-io.file-descriptors", "File Descriptors", levels("intermediate"), "Represents open I/O resources."),
        makeConcept("os-systems.storage-and-io.disk-and-filesystems", "Disk and Filesystem Behavior", levels("advanced"), "Reasons about persistence, throughput, and failure."),
      ]),
    ],
  },
] as const;

export function getDiagnosticTopic(topicId: DiagnosticTopicId): DiagnosticTopic {
  const topic = diagnosticTaxonomy.find((item) => item.id === topicId);
  if (!topic) throw new Error(`Unknown diagnostic topic: ${topicId}`);
  return topic;
}

export function getDiagnosticSkill(skillKey: string): DiagnosticSkill | undefined {
  return diagnosticTaxonomy.flatMap((topic) => topic.skills).find((skill) => skill.key === skillKey);
}

export function getDiagnosticConcept(conceptKey: string): DiagnosticConcept | undefined {
  return diagnosticTaxonomy
    .flatMap((topic) => topic.skills)
    .flatMap((skill) => skill.concepts)
    .find((concept) => concept.key === conceptKey);
}

export function validateDiagnosticTaxonomy(
  topics: readonly DiagnosticTopic[] = diagnosticTaxonomy,
): void {
  const topicIds = new Set<string>();
  const skillKeys = new Set<string>();
  const conceptKeys = new Set<string>();
  const validLevels = new Set<string>(DIAGNOSTIC_LEVELS.map((level) => level.id));

  for (const topic of topics) {
    if (!topic.id || !topic.title || topicIds.has(topic.id)) {
      throw new Error(`Invalid or duplicate diagnostic topic: ${topic.id}`);
    }
    topicIds.add(topic.id);

    for (const skill of topic.skills) {
      if (!skill.key.startsWith(`${topic.id}.`) || skillKeys.has(skill.key)) {
        throw new Error(`Invalid or duplicate diagnostic skill: ${skill.key}`);
      }
      skillKeys.add(skill.key);
      for (const level of skill.levels) {
        if (!validLevels.has(level)) throw new Error(`Invalid skill level: ${level}`);
      }
      for (const concept of skill.concepts) {
        if (!concept.key.startsWith(`${skill.key}.`) || conceptKeys.has(concept.key)) {
          throw new Error(`Invalid or duplicate diagnostic concept: ${concept.key}`);
        }
        if (!concept.label || !concept.description || concept.levels.length === 0) {
          throw new Error(`Incomplete diagnostic concept: ${concept.key}`);
        }
        conceptKeys.add(concept.key);
        for (const level of concept.levels) {
          if (!validLevels.has(level) || !skill.levels.includes(level)) {
            throw new Error(`Invalid concept level ${level} for ${concept.key}`);
          }
        }
      }
    }
  }
}

validateDiagnosticTaxonomy();
