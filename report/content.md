---
title: "Isolated Multi-Tenant RAG Chatbot with Entailment based Hallucination Filtering"
students:
  - { name: "Vihaa Shah", id: "23IT414" }
  - { name: "Fatema Kharodawala", id: "23IT465" }
guide: "Prof. Jigisha S. Trivedi"
hod: "Dr. Keyur Brahmbhatt"
college: "Birla Vishvakarma Mahavidyalaya Engineering College"
affiliation: "(An Autonomous Institution)"
department: "Information Technology Department"
address: "Vallabh Vidyanagar - 388120"
country: "Gujarat, INDIA"
subject: "Project I (4IT31)"
academic_year: "2026-27"
semester: "I"
cover_date: "December, 2026"
student_id_header: "23IT414, 23IT465"
is_idp: false
paper_publication: false
toc_roman: true
---

[[FM:ACKNOWLEDGEMENT]]
It gives us immense pleasure to present this project report on "Isolated Multi-Tenant RAG Chatbot with Entailment based Hallucination Filtering". We take this opportunity to express our heartfelt gratitude to all those who have contributed to the successful completion of this work.

We are deeply thankful to our project guide, Prof. Jigisha S. Trivedi, Information Technology Department, Birla Vishvakarma Mahavidyalaya Engineering College, for her constant guidance, valuable suggestions, continuous encouragement and timely feedback throughout the development of this project. Her insights into system design, retrieval-augmented generation and dataset curation have been invaluable.

We sincerely thank Dr. Keyur Brahmbhatt, Head of the Information Technology Department, for providing the infrastructure and academic support that made this work possible. We are also grateful to the entire faculty and staff of the Information Technology Department for fostering a learning environment that encouraged us to explore modern artificial intelligence and full-stack engineering practices.

We thank our classmates and friends for their constructive discussions and moral support, and our families for their patience and constant encouragement during the course of this project. Finally, we acknowledge the open-source community, whose tools and libraries such as pgvector, sentence-transformers, Flask and React form an essential foundation of this work.

Vihaa Shah (23IT414)
Fatema Kharodawala (23IT465)

[[FM:ABSTRACT]]
Large Language Models (LLMs) can answer questions in fluent language, but they often state facts that are not present in any source, a problem known as hallucination. Retrieval-Augmented Generation (RAG) reduces this by making the model answer from retrieved documents, but a simple RAG pipeline can still retrieve the wrong passage or produce an answer that the sources do not support. This project builds an isolated multi-tenant RAG chatbot that combines dense and keyword retrieval with a Natural Language Inference (NLI) entailment check that runs after generation to filter out hallucinated answers.

The system crawls and ingests customer websites using sitemap-based and breadth-first discovery, a robots.txt-compliant, change-detecting fetch pipeline, and content extraction for HTML, scanned PDFs and images through OCR. Extracted text is chunked with a recursive character text splitter and embedded into 384-dimensional vectors using the all-MiniLM-L6-v2 sentence-transformer model, stored in PostgreSQL with the pgvector extension and indexed using a Hierarchical Navigable Small World (HNSW) graph for fast cosine similarity search. At query time, the platform performs weighted hybrid retrieval that blends dense semantic similarity with lexical keyword boosts, generates an answer with an instruction-tuned LLM served through a low-latency inference provider, and then runs a cross-encoder NLI model to verify that each generated claim is entailed by the retrieved context. Answers that fail entailment are flagged and replaced with a grounded fallback.

Isolation is enforced at the query level so that one tenant's content is never retrieved for another tenant. A feedback loop re-weights chunks from thumbs-up and thumbs-down ratings, and a scheduled decay step stops old weights from dominating retrieval. The platform also provides an embeddable JavaScript widget with page highlighting, a React dashboard for managing websites and chatbots, and an administrative console for analytics. The result is a multi-tenant question-answering system whose answers can be traced back to a source, are kept separate per tenant, and can be checked through entailment.

[[FM:ABBREVIATIONS]]
| Abbreviation | Full Form |
| --- | --- |
| AI | Artificial Intelligence |
| ANN | Approximate Nearest Neighbour |
| API | Application Programming Interface |
| BERT | Bidirectional Encoder Representations from Transformers |
| BFS | Breadth-First Search |
| BM25 | Best Matching 25 (probabilistic ranking function) |
| BVM | Birla Vishvakarma Mahavidyalaya |
| CRUD | Create, Read, Update, Delete |
| CSS | Cascading Style Sheets |
| DFD | Data Flow Diagram |
| DOM | Document Object Model |
| DPR | Dense Passage Retrieval |
| ER | Entity-Relationship |
| HNSW | Hierarchical Navigable Small World |
| HTML | HyperText Markup Language |
| HTTP | HyperText Transfer Protocol |
| IDP | Industry Defined Project |
| IEEE | Institute of Electrical and Electronics Engineers |
| JWT | JSON Web Token |
| KB | Knowledge Base |
| LLM | Large Language Model |
| MD5 | Message Digest Algorithm 5 |
| MiniLM | Miniature Language Model (sentence-transformer) |
| NLI | Natural Language Inference |
| OCR | Optical Character Recognition |
| OTP | One-Time Password |
| P50 / P90 / P99 | 50th / 90th / 99th Percentile |
| PDF | Portable Document Format |
| pgvector | PostgreSQL vector similarity extension |
| RAG | Retrieval-Augmented Generation |
| REST | Representational State Transfer |
| RLS | Row-Level Security |
| SPA | Single Page Application |
| SRS | Software Requirements Specification |
| SQL | Structured Query Language |
| SSL | Secure Sockets Layer |
| TLS | Transport Layer Security |
| URL | Uniform Resource Locator |
| UUID | Universally Unique Identifier |
| UI | User Interface |
| UTM | Urchin Tracking Module (URL parameters) |
| XML | eXtensible Markup Language |
| XSS | Cross-Site Scripting |
| YAML | YAML Ain't Markup Language |

[[BODY]]
# Chapter 1: Introduction
## 1.1 Brief overview of the work
Traditional website search and support chatbots usually work in one of two ways. Keyword search matches exact words and does not understand the meaning of a question, while large language models answer smoothly but often state facts that are not present in the source. This project deals with both problems: weak retrieval on one side and unverifiable answers on the other. The work builds "SiteMind", a multi-tenant platform where an organization registers its website, the platform crawls and indexes the content automatically, and a chat assistant answers questions using only that website's content.

The platform is implemented as a set of cooperating services. A Node.js and Express backend acts as the primary API gateway and hosts the core retrieval-augmented generation pipeline. A Python Flask and Celery service performs asynchronous web crawling, content extraction including optical character recognition for scanned documents, chatbot configuration management and platform analytics. A dedicated FastAPI microservice provides sentence embeddings and natural-language-inference entailment scoring using transformer models. A React single-page application delivers the tenant-facing dashboard, and an embeddable JavaScript widget brings the assistant to any external website through a single script tag.

The main feature of the project is the combination of retrieval grounding with an explicit entailment check. After the model generates an answer, a cross-encoder NLI model checks whether each sentence is entailed by the retrieved passages. An answer that fails this check is flagged and replaced with a safe fallback. This verification step, along with per-tenant isolation and feedback-based retrieval weighting, forms the core of the work.

## 1.2 Objective
The primary objective of the project is to design and implement a reliable, isolated and verifiable multi-tenant question-answering system. The specific objectives are listed below.
- To build an automated ingestion pipeline that crawls a registered website, respects its robots.txt policy, detects content changes incrementally, and extracts clean text from HTML pages, scanned PDF documents and images.
- To generate a semantically searchable knowledge base by chunking extracted content and embedding it into dense vector representations stored in a PostgreSQL vector database.
- To implement a hybrid retrieval strategy that combines dense cosine similarity with lexical keyword relevance so that both semantically and lexically relevant passages are recalled.
- To integrate an instruction-tuned large language model that answers user questions strictly from the retrieved context and to constrain it with anti-hallucination prompting.
- To add an independent entailment verification stage using a natural language inference model that flags answers not supported by the retrieved evidence.
- To guarantee multi-tenant isolation so that content, conversations and feedback of one tenant never leak into another.
- To provide a feedback mechanism in which user ratings dynamically adjust retrieval weights, improving answer quality over time.
- To deliver a complete product surface consisting of a management dashboard, an embeddable chat widget with visual source highlighting, and an administrative analytics console.

## 1.3 Scope
The scope of the project covers the end-to-end lifecycle of a multi-tenant retrieval-augmented chatbot, from website registration and verification through crawling, knowledge base generation, conversational question answering, answer verification, user feedback and administrative analytics. The system is designed for text-based website content and additionally supports scanned PDFs and images through OCR. It supports multiple independent tenants on shared infrastructure with logical data isolation.

The following items are within the scope of the current work. Registration and verification of website domains; asynchronous crawling with robots.txt compliance, incremental change detection and OCR support; chunking and embedding of content into a vector store; hybrid retrieval; grounded answer generation; entailment-based verification; an embeddable widget with visual page highlighting; a feedback loop with dynamic weighting and periodic decay; an administrative analytics suite; and Google Drive document ingestion.

The following items are outside the scope of the current implementation. Native mobile applications; support for languages other than English in the retrieval and verification models; voice-based interaction; automatic fine-tuning of the large language model; billing and subscription management; and real-time collaborative editing of manually curated content. These are discussed as future work in Chapter 5.

## 1.4 Project Modules
The system is divided into nine modules. Each module performs one function and exposes a clear interface, so a change in one module does not disturb the others.

[[TABLE 1.1 | Module summary]]
| Module | Name | Responsibility |
| --- | --- | --- |
| Module 1 | User Authentication and Website Management | Registration, login, Google OAuth, one-time-password verification, JWT-based sessions, website registration and domain verification |
| Module 2 | Web Crawling and Content Processing | Sitemap and breadth-first URL discovery, robots.txt compliance, change-detecting fetch, HTML, PDF and image extraction with OCR, crawl job orchestration and logging |
| Module 3 | Knowledge Base Generation | Recursive text chunking, 384-dimensional embedding generation, vector storage in PostgreSQL with pgvector and HNSW indexing |
| Module 4 | Chatbot Configuration and Embeddable Widget | Per-website branding and widget settings, embed token generation, public widget APIs and the embeddable JavaScript chat widget |
| Module 5 | Retrieval-Augmented Generation Pipeline | Query embedding, weighted hybrid retrieval, prompt construction, large language model generation and anti-hallucination fallback |
| Module 6 | Entailment-based Hallucination Detection | Cross-encoder natural language inference verification of generated answers against retrieved evidence |
| Module 7 | Visual Pointing and Live Page Highlighting | Generation of resilient DOM-selector metadata at ingestion and in-page highlighting of the source passage by the widget |
| Module 8 | Feedback-driven Adaptive Retrieval | Capture of user ratings, dynamic re-weighting of chunks, query-adaptation using similar past feedback and scheduled weight decay |
| Module 9 | Multi-tenancy and Administrative Analytics | Tenant isolation across all data paths and a platform-wide analytics console for administrators |

## 1.5 Project Hardware/Software Requirements
The development and deployment requirements are listed below. The system is cross-platform and runs on standard commodity hardware; the production deployment uses managed cloud services for the database and inference.

[[TABLE 1.2 | Software requirements]]
| Component | Technology | Version or Notes |
| --- | --- | --- |
| Operating System | Windows, Linux or macOS | Development performed on Windows; deployment target is Linux |
| Backend Runtime | Node.js and npm | Node LTS with Express 5, Sequelize 6, pg driver |
| Frontend | React with Vite and Tailwind CSS | React 18, Vite 5, Redux Toolkit, React Router 6 |
| Crawl Service | Python with Flask and Celery | Flask 3, Celery with Redis broker, Playwright, Trafilatura |
| Embedding and NLI Service | Python with FastAPI | FastAPI, sentence-transformers, PyTorch, Transformers, NLTK |
| Database | PostgreSQL with pgvector and pgcrypto | Supabase-hosted PostgreSQL, vector(384) columns, HNSW index |
| Cache and Broker | Redis | Celery task broker and result backend |
| OCR Toolchain | Tesseract OCR and Poppler | tesseract-ocr and poppler-utils system packages |
| Authentication | JSON Web Tokens, bcrypt, Google OAuth | 7-day token expiry, bcrypt password hashing |
| Email | SMTP via Nodemailer | One-time-password delivery |
| Inference Provider | Groq-hosted instruction-tuned LLM | Low-latency generation with retry on rate limiting |

[[TABLE 1.3 | Hardware requirements]]
| Component | Minimum | Recommended |
| --- | --- | --- |
| Processor | Dual-core 2.0 GHz | Quad-core 2.5 GHz or higher |
| RAM | 8 GB | 16 GB (embedding and NLI models are memory-resident) |
| Storage | 20 GB free | 50 GB SSD |
| Network | Broadband internet connection | Reliable broadband for crawling and API inference |
| Optional | - | GPU for local embedding and NLI inference |

[[PAGEBREAK]]
# Chapter 2: Literature Review
This chapter reviews the body of work that informs the design of the platform. The literature is organized along the technical pipeline of the system, beginning with the retrieval-augmented generation paradigm, moving through dense retrieval and vector indexing, then embedding models, entailment-based verification and hallucination mitigation, and finally web extraction, OCR, hybrid retrieval and multi-tenancy.

## 2.1 Retrieval-Augmented Generation
Retrieval-Augmented Generation, introduced by Lewis et al. [10], combines a parametric sequence-to-sequence generator with a non-parametric dense index of documents, so that a model can condition its output on retrieved passages instead of relying only on parameters memorized during training. RAG gave strong results on knowledge-intensive tasks and produced more factual answers than purely parametric baselines, and the design is the one this project follows. Gao et al. [12] survey how RAG has evolved from a simple retrieve-then-read pipeline to advanced and modular variants, and describe the design choices in retrieval, generation and augmentation that this project follows in its hybrid retrieval, grounding prompt and entailment check.

## 2.2 Dense Retrieval and Embedding Models
The dense retrieval leg of the system is grounded in the transformer architecture of Vaswani et al. [1] and the bidirectional pretraining approach of BERT by Devlin et al. [2]. Reimers and Gurevych [4] introduced Sentence-BERT, which uses siamese and triplet network structures to produce fixed-size sentence embeddings whose cosine similarity approximates semantic similarity, reducing the cost of similarity search on large corpora from hours to seconds. This work is the direct methodological basis for the all-MiniLM-L6-v2 model used here to encode text chunks into 384-dimensional vectors. Karpukhin et al. [11] demonstrated with Dense Passage Retrieval that a learned dual encoder can substantially outperform the classical BM25 baseline on open-domain question answering, providing empirical support for dense embeddings as the primary retrieval mechanism.

## 2.3 Approximate Nearest Neighbour Search
Exact nearest-neighbour search over high-dimensional vectors is computationally prohibitive at scale. Malkov and Yashunin [5] proposed Hierarchical Navigable Small World graphs, a graph-based approximate nearest-neighbour algorithm that organizes vectors into layered proximity graphs and achieves logarithmic scaling with a favourable recall versus speed trade-off. The pgvector index configuration used in this project, an HNSW index over cosine distance, is a direct implementation of this algorithm and is the reason retrieval remains responsive as the tenant knowledge base grows.

## 2.4 Hybrid and Semantic Retrieval
While dense retrieval captures semantic similarity, it can miss exact lexical matches such as product codes or proper nouns. Robertson and Zaragoza [18] formalized the probabilistic relevance framework and derived the BM25 ranking function, which remains a robust keyword retrieval baseline. Thakur et al. [15] benchmarked ten retrieval architectures across eighteen heterogeneous datasets and found BM25 to be a strong and generalizable baseline, with dense models being more efficient but sometimes less generalizable under domain shift. These findings motivate the weighted hybrid retrieval strategy used in the platform, which blends dense cosine similarity with lexical keyword boosts, giving the best of both paradigms.

## 2.5 Natural Language Inference and Fact Verification
The entailment verification stage relies on the natural language inference task. Bowman et al. [6] released the Stanford Natural Language Inference corpus, and Williams et al. [7] released the broader Multi-Genre NLI corpus, which spans multiple written and spoken genres and includes explicit cross-genre evaluation splits. The cross-genre robustness studied in these works is relevant here because the entailment check is applied to diverse crawled web text rather than a narrow domain. Thorne et al. [8] introduced the FEVER dataset, formalizing fact verification as evidence retrieval followed by entailment, which is precisely the retrieve-then-entail pattern implemented in this project. The cross-encoder model used for verification is based on the RoBERTa architecture of Liu et al. [3].

## 2.6 Hallucination in Large Language Models
Maynez et al. [9] showed that a large fraction of abstractive summaries contain content unsupported by the source and that standard n-gram overlap metrics fail to capture this faithfulness gap, motivating entailment-based evaluation. Ji et al. [13] provide a comprehensive taxonomy of hallucination in natural language generation, covering intrinsic and extrinsic hallucinations and the associated mitigation and evaluation methods. Huang et al. [14] extend this survey specifically to large language models, categorizing hallucination principles, benchmarks and mitigation strategies. Together these works frame the problem statement for the project and justify the decision to add an explicit entailment filter rather than trusting the generator's fluency.

## 2.7 Web Extraction and Optical Character Recognition
The ingestion pipeline depends on robust content extraction. Barbaresi [16] presented Trafilatura, an open-source library for main-text, comment and metadata extraction that outperforms other open-source extractors, and it is the tool used in this project to convert rendered HTML into clean text. For scanned documents and images, the system uses the Tesseract OCR engine, whose architecture was described by Smith [17]. The generation model itself belongs to the Llama family of open foundation models described by Touvron et al. [19].

## 2.8 Multi-tenancy
Multi-tenancy allows a single instance of a system to serve multiple independent organizations while sharing infrastructure. AlJahdali et al. [20] define multi-tenancy, analyze its security risks including confidentiality and integrity attacks on shared infrastructure, and propose an attack model. This work supplies the threat-model framing for the project's isolation design, ensuring that retrieval, conversations and feedback are strictly partitioned per tenant.

[[PAGEBREAK]]
# Chapter 3: System Analysis & Design
This chapter presents the analysis and design of the platform. It compares the proposed system with existing applications, evaluates feasibility, presents the project timeline, describes each module in detail, specifies the software requirements including all diagrams, and concludes with the data dictionary.

## 3.1 Comparison of Existing Applications with your Project
Several commercial chatbot platforms allow organizations to deploy AI assistants over their own content. The comparison below evaluates representative tools against the proposed system.

[[TABLE 3.1 | Comparison of existing applications with the proposed system]]
| Criterion | Typical Keyword Chatbots | Generic LLM Assistants | SaaS RAG Chatbots (e.g. Chatbase, Intercom) | Proposed System |
| --- | --- | --- | --- | --- |
| Answer grounding | Exact keyword matching only | None, answers from parameters | Retrieval-based | Retrieval-based with citations |
| Hallucination control | Not applicable | Weak, prone to invention | Prompt-only grounding | Entailment verification after generation |
| Data isolation | Separate deployments | Shared model | Multi-tenant, opaque | Strict per-tenant query-level isolation |
| Source transparency | Low | None | Limited | Visual page highlighting of source passage |
| Feedback learning | None | None | Limited analytics | Dynamic per-chunk weighting with decay |
| Crawling with OCR | None | None | Often text-only | HTML, scanned PDF and image OCR |
| Cost and control | Low | Low | Subscription, closed source | Self-hostable, open stack |

Merits of the proposed system include verifiable answers through entailment checking, transparent source highlighting, adaptive retrieval that improves with feedback, and full control over deployment and data. Its demerits include a heavier operational footprint owing to multiple services, an additional inference step that adds latency to each answer, and dependence on an external inference provider for generation.

## 3.2 Project Feasibility Study
The feasibility of the project was evaluated along five dimensions.
- Technical feasibility: The system is built entirely on mature, well-documented technologies. Node.js, Python, PostgreSQL with pgvector, Redis and container-ready services are widely deployed. The embedding and NLI models are small enough to run on commodity hardware, and the generation model is accessed through a managed inference API, so no specialized hardware is strictly required.
- Economic feasibility: All core components are open-source and free to use. The database and inference provider offer generous free tiers, and the system can be self-hosted on modest infrastructure, making the marginal cost per tenant very low.
- Operational feasibility: The platform is operated through a web dashboard that abstracts crawling, configuration and analytics behind simple screens. Administrators have a dedicated console, and end users interact only through an embedded chat widget, requiring no training.
- Schedule feasibility: The work was divided into phases aligned with the modules and completed within the academic semester as shown in the timeline.
- Legal and ethical feasibility: The crawler respects robots.txt and rate limits, only processes content the tenant is authorized to use, and stores personally identifiable information such as email addresses securely using hashed passwords and signed tokens.

## 3.3 Project Timeline chart
The project followed an iterative, module-wise schedule. Each module was designed, implemented and tested before integration, with continuous integration of the retrieval and verification stages toward the end of the semester.

[[FIG 3.1 | Project Timeline (Gantt Chart)]]
> Depicts the week-wise schedule of the project across the analysis, design, implementation, integration and testing phases. Requirement analysis and literature review occupy the early weeks, module-wise implementation spans the middle weeks with the crawler and knowledge base modules followed by the chatbot and verification modules, and integration, testing and documentation occupy the final weeks.

## 3.4 Detailed Modules Description
This section describes each module's purpose, internal working and interfaces.

### 3.4.1 Module 1: User Authentication and Website Management
This module manages accounts and website ownership. Users register with an email and password or sign in with Google OAuth, and registration may be completed through a one-time-password flow delivered by email. Passwords are hashed with bcrypt and sessions are established using JSON Web Tokens with a seven-day expiry. Once authenticated, a user registers a website by supplying its domain; the domain is validated and a verification token is issued. Websites are verified either through a DNS TXT record or, in managed environments, through an audited self-attestation. Every website resource is scoped by ownership at the database query level, guaranteeing that a user can access only their own websites.

### 3.4.2 Module 2: Web Crawling and Content Processing
The crawl service, implemented as a Flask application with Celery workers, orchestrates crawling. URL discovery first attempts the site's sitemap index and sitemap, and falls back to a breadth-first search from the home page. All crawling respects the site's robots.txt directives, including crawl delays, and enforces a domain boundary. A two-stage fetch strategy uses a standard HTTP client first and escalates to a headless browser for JavaScript-rendered pages whose extracted text is too short. Content extraction routes by content type: HTML is processed with Trafilatura supplemented by BeautifulSoup, while PDF and image content is processed with pdfplumber and, when a text layer is absent, with pdf2image and Tesseract OCR. Incremental crawling compares HTTP validators and an MD5 content hash to skip unchanged pages. Every URL outcome is logged with a granular status, and each processed page notifies the backend to store its chunks.

### 3.4.3 Module 3: Knowledge Base Generation
This module converts raw page text into a searchable vector knowledge base. Text is split into overlapping chunks using a recursive character text splitter with a chunk size of 256 characters and an overlap of 32 characters, tuned to keep passages semantically coherent. Each chunk is embedded into a 384-dimensional vector by the embedding microservice using the all-MiniLM-L6-v2 sentence-transformer model. Chunks, together with their source URL, title, a short text snippet and visual-pointing metadata, are written transactionally into the document_chunks table. Embeddings are indexed with an HNSW index over cosine distance so that similarity search scales gracefully.

### 3.4.4 Module 4: Chatbot Configuration and Embeddable Widget
Each website has a chatbot configuration that stores branding colours, a logo, widget settings and a unique embed token. A user configures these values in the dashboard, and a one-line script tag containing the embed token activates the widget on the external website. The widget renders inside a shadow DOM to isolate its styles, presents a chat interface, persists session history, and calls the public widget APIs for configuration, queries and feedback. The widget also implements visual pointing, scrolling to and highlighting the source passage on the host page.

### 3.4.5 Module 5: Retrieval-Augmented Generation Pipeline
This is the core conversational engine. When a query arrives, the pipeline first embeds the query using the same embedding model, then resolves the tenant and applies query adaptation based on similar past feedback. Retrieval uses weighted hybrid search that scores each candidate chunk by the product of its cosine similarity and a feedback-derived weight, with additional lexical boosts for keyword matches in the URL, title and body. The top-ranked passages are assembled into a grounded prompt with strict instructions to answer only from the provided context, and an instruction-tuned large language model generates the answer. If retrieval confidence is insufficient or generation fails, a safe fallback message is returned. All queries, retrieved chunk identifiers, similarity scores, latencies and verdicts are logged for analytics.

### 3.4.6 Module 6: Entailment-based Hallucination Detection
After generation, the answer is decomposed into sentences and each sentence is checked against the retrieved context using a cross-encoder natural language inference model that classifies the relationship as entailment, contradiction or neutral. An answer is considered supported only when its claims are entailed by the evidence. Contradicted or unsupported answers are flagged, recorded in the query log with an entailment verdict, and surfaced to the dashboard as potential hallucinations. This stage runs asynchronously so that it does not delay the user-facing response.

### 3.4.7 Module 7: Visual Pointing and Live Page Highlighting
Text extracted from a page often loses its original HTML structure, so CSS selectors alone are unreliable. At ingestion time this module stores a resilient text-match selector derived from the first sentence of the chunk, together with a fallback text snippet. At answer time the widget scans the host page for an element containing that text, scrolls it into view and applies a temporary highlight, providing verifiable visual evidence for the answer. Cross-domain content is handled by offering a link to the source page instead of highlighting.

### 3.4.8 Module 8: Feedback-driven Adaptive Retrieval
Users may rate answers with a thumbs-up or thumbs-down. Positive feedback increases the feedback weight of the contributing chunks while negative feedback decreases it, within a bounded range. The query embedding and rating are also stored as a feedback example so that future similar queries can adapt retrieval, either by expanding the candidate set when prior similar queries were answered poorly or by tightening it when they were answered well. A scheduled decay process periodically moves all weights back toward their neutral value so that stale feedback does not dominate retrieval indefinitely.

### 3.4.9 Module 9: Multi-tenancy and Administrative Analytics
Isolation is enforced throughout the data model. Content, chunks, conversations, feedback and query logs are all associated with a tenant, and every retrieval and write operation is scoped so that one tenant can never observe another's data. The administrative analytics module provides platform-wide visibility, including usage metrics, retrieval quality, natural-language-inference verdict distribution, latency percentiles, content-quality signals and tenant management actions, all protected by a two-layer authorization check.

## 3.5 Project SRS
This section specifies the functional structure of the system through the standard requirement diagrams. Full-resolution diagrams are maintained separately and are referenced by the figure slots below.

### 3.5.1 Use Case Diagrams
The primary actors are the Tenant User, the Website Visitor, the Administrator and the external services (the inference provider and the embedding and NLI service). The tenant user manages websites and chatbot configuration, the visitor interacts with the chat widget, and the administrator manages tenants and views analytics.

[[FIG 3.2 | Use Case Diagram]]
> Shows the actors of the platform and their use cases. The Tenant User connects to register and login, register and verify website, trigger crawl, manage chatbot configuration, add manual content, view analytics and provide feedback. The Website Visitor connects to ask a question and view source highlighting. The Administrator connects to manage users and websites, suspend tenants and view platform analytics.

[[TABLE 3.2 | Summary of major use cases]]
| Use Case | Primary Actor | Description |
| --- | --- | --- |
| Register and Login | Tenant User | Create an account and authenticate using password, OTP or Google OAuth |
| Register and Verify Website | Tenant User | Add a domain and verify ownership |
| Trigger Crawl | Tenant User | Start or stop an asynchronous crawl and monitor its progress |
| Manage Chatbot Configuration | Tenant User | Configure branding and widget settings and obtain the embed token |
| Ask a Question | Website Visitor | Submit a natural-language query through the widget |
| View Source Highlighting | Website Visitor | Navigate to the highlighted source passage on the page |
| Provide Feedback | Website Visitor | Rate an answer with thumbs-up or thumbs-down |
| Manage Tenants | Administrator | Edit, suspend or delete users and websites |
| View Platform Analytics | Administrator | Inspect usage, quality, latency and hallucination metrics |

### 3.5.2 Data Flow Diagrams
The data flow is presented at two levels. The context-level diagram shows the system as a single process interacting with external entities, and the level-one diagram decomposes it into its major processes.

[[FIG 3.3 | Level-0 (Context) Data Flow Diagram]]
> Shows the platform as a single process exchanging data with four external entities: the Tenant User who provides website and configuration data and receives analytics, the Website Visitor who provides queries and feedback and receives answers, the Administrator who provides management actions and receives platform analytics, and the external Inference and Embedding services that receive text and return vectors and generated answers.

[[FIG 3.4 | Level-1 Data Flow Diagram]]
> Decomposes the system into processes for authentication, website registration and verification, crawling and extraction, knowledge base generation, retrieval and generation, entailment verification, feedback processing and analytics, together with the data stores for users, websites, crawl jobs, pages, document chunks, conversations, feedback and query logs.

### 3.5.3 Class Diagram
The class diagram captures the principal domain entities and their relationships. The User and Website classes form the ownership hierarchy; the Site class is the canonical domain registry that groups pages and chunks; the Chatbot Config class holds per-website widget settings; and the Crawl Job, Page, Document Chunk, Conversation, Message, Feedback, Tenant and Query Log classes capture the ingestion, conversation and observability data.

[[FIG 3.5 | Class Diagram]]
> Shows classes with their attributes and methods and the relationships between them, including User one-to-many Website, Website one-to-one Chatbot Config, Website one-to-many Crawl Job, Website one-to-many Page, Site one-to-many Document Chunk, Chat Session one-to-many Message and Message one-to-one Feedback.

### 3.5.4 Entity Relationship Diagrams
The entity-relationship diagram models the database schema, including the tenant registry, the sites registry, and all dependent entities connected through foreign keys with their cardinalities.

[[FIG 3.6 | Entity Relationship Diagram]]
> Illustrates the logical relationships among the users, websites, sites, crawl jobs, crawl logs, pages, document chunks, tenants, chatbot configs, chat sessions, messages, feedback, feedback examples, verification logs, sync logs and query logs entities, with primary and foreign keys and cardinality annotations.

### 3.5.5 Sequence Diagrams
The principal runtime interactions are the question-answering sequence and the crawling sequence. The question-answering sequence is the most important as it exercises retrieval, generation and verification together.

[[FIG 3.7 | Sequence Diagram: Question Answering]]
> Shows the interaction between the Visitor, the Widget, the Backend gateway, the Embedding service, the PostgreSQL vector store, the Inference provider and the NLI service. The visitor submits a query, the backend embeds it, performs hybrid retrieval, generates an answer, returns it to the widget and asynchronously runs the entailment check whose verdict is logged.

[[FIG 3.8 | Sequence Diagram: Website Crawling]]
> Shows the interaction between the Tenant User, the Backend gateway, the Crawl service, the target website and the knowledge base. The user triggers a crawl, the service discovers and fetches pages, notifies the backend to chunk and embed content, and the user monitors job progress until completion.

### 3.5.6 State/Activity Diagram
Two state machines govern asynchronous behaviour: the crawl job lifecycle and the answer verification lifecycle.

[[FIG 3.9 | State Diagram: Crawl Job Lifecycle]]
> Shows the states of a crawl job as it moves from queued to running, then to completed, failed or cancelled, including the transitions triggered by crawl events and user actions.

[[FIG 3.10 | Activity Diagram: Answer Verification]]
> Shows the activity flow from query submission through embedding, retrieval, sufficiency check, generation, entailment verification and final response, including the decision points that lead to a grounded answer or a safe fallback.

## 3.6 Data Dictionary
The data dictionary documents the physical database schema. The platform uses PostgreSQL with the pgvector and pgcrypto extensions. The tables are grouped below by concern.

**Table: users** - registered platform accounts that own websites.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| email | VARCHAR(255) | Not null, unique |
| password_hash | VARCHAR(255) | Not null, bcrypt hash |
| name | VARCHAR(255) | Nullable |
| role | VARCHAR(255) | Not null, default 'user' (values: user, admin) |
| created_at | TIMESTAMPTZ | Default now() |

**Table: websites** - tenant-registered website properties; container for crawl jobs and content.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| user_id | INTEGER | Not null, foreign key to users(id), cascade delete |
| site_id | UUID | Nullable, foreign key to sites(id), set null on delete |
| domain | VARCHAR(255) | Not null |
| verification_token | VARCHAR(255) | Nullable |
| verification_status | ENUM | Values: pending, verified, failed; default pending |
| created_at | TIMESTAMPTZ | Default now() |

**Table: sites** - canonical UUID-keyed registry grouping websites, pages and chunks by domain.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| domain | TEXT | Not null, unique |
| crawl_status | TEXT | Default 'pending' |
| last_crawled_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |

**Table: crawl_jobs** - one row per crawl run with counters and status.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| website_id | INTEGER | Not null, foreign key to websites(id), cascade delete |
| status | ENUM | Values: queued, running, completed, failed, cancelled; default queued |
| started_at | TIMESTAMPTZ | Nullable |
| completed_at | TIMESTAMPTZ | Nullable |
| pages_found | INTEGER | Not null, default 0 |
| pages_crawled | INTEGER | Not null, default 0 |
| pages_failed | INTEGER | Not null, default 0 |
| pages_skipped | INTEGER | Not null, default 0 |
| crawl_type | ENUM | Values: first, incremental |
| error_message | TEXT | Nullable |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |

**Table: crawl_logs** - per-URL crawl outcome log.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| crawl_job_id | INTEGER | Not null, foreign key to crawl_jobs(id), cascade delete |
| url | TEXT | Not null |
| status | ENUM | Values: success, failed, excluded_robots, robots_disallowed, timeout, duplicate, skipped_unchanged, removed, success-ocr, skipped-image-only, success-ocr-image, skipped-image-no-text |
| content_hash | VARCHAR(255) | Nullable |
| crawled_at | TIMESTAMPTZ | Default now() |
| page_url | TEXT | Nullable |
| error_reason | TEXT | Nullable |

**Table: pages** - central crawled-content store, one row per unique URL per site.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| website_id | INTEGER | Nullable, foreign key to websites(id), cascade delete |
| site_id | UUID | Nullable, foreign key to sites(id), cascade delete |
| url | TEXT | Not null |
| title | TEXT | Nullable |
| raw_text | TEXT | Nullable, clean extracted text |
| content_hash | VARCHAR(32) | Nullable, MD5 of raw_text |
| crawl_status | ENUM | Values: active, removed; default active |
| needs_embedding | BOOLEAN | Default false |
| http_etag | TEXT | Nullable |
| http_last_modified | TEXT | Nullable |
| last_crawled_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | Default now() |
| source_type | TEXT | Default 'html' (values: html, pdf, pdf-ocr, image-ocr) |

**Table: document_chunks** - embedding store for retrieval.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| website_id | INTEGER | Nullable, foreign key to websites(id), cascade delete |
| site_id | UUID | Nullable, foreign key to sites(id), cascade delete |
| tenant_id | UUID | Nullable, foreign key to tenants(id), cascade delete |
| page_url | TEXT | Not null |
| page_title | TEXT | Nullable |
| chunk_text | TEXT | Not null |
| embedding | vector(384) | Nullable, HNSW cosine index |
| dom_selector | TEXT | Nullable, visual pointing metadata |
| text_snippet | TEXT | Nullable, fallback highlight text |
| feedback_weight | FLOAT | Not null, default 1.0, check between 0.1 and 3.0 |
| created_at | TIMESTAMPTZ | Default now() |

**Table: manual_content** - manually authored knowledge snippets per website.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| website_id | INTEGER | Not null, foreign key to websites(id), cascade delete |
| added_by_user_id | INTEGER | Not null, foreign key to users(id) |
| title | VARCHAR(255) | Nullable |
| content_text | TEXT | Not null |
| embedding | vector(384) | Nullable |
| created_at | TIMESTAMPTZ | Default now() |

**Table: chatbot_configs** - per-website widget configuration.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| website_id | INTEGER | Not null, unique, foreign key to websites(id), cascade delete |
| theme_color | TEXT | Not null, default '#22C55E' |
| background_color | TEXT | Not null, default '#ffffff' |
| text_color | TEXT | Not null, default '#111111' |
| logo_url | TEXT | Nullable |
| widget_settings | JSONB | Not null, default '{}' |
| embed_token | TEXT | Not null, unique |
| overrides_locked | BOOLEAN | Not null, default false |
| is_active | BOOLEAN | Not null, default true |
| created_at | TIMESTAMPTZ | Not null, default now() |
| updated_at | TIMESTAMPTZ | Not null, default now() |

**Table: conversations** - chat session records per website.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| website_id | INTEGER | Not null, foreign key to websites(id), cascade delete |
| visitor_session_id | VARCHAR(255) | Not null |
| started_at | TIMESTAMPTZ | Default now() |

**Table: chat_sessions** - UUID-keyed chat sessions linking messages and feedback.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| session_token | TEXT | Nullable |
| website_id | INTEGER | Nullable, foreign key to websites(id), cascade delete |
| site_id | UUID | Nullable, foreign key to sites(id), cascade delete |
| created_at | TIMESTAMPTZ | Default now() |

**Table: messages** - chat messages belonging to a chat session.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| session_id | UUID | Nullable, foreign key to chat_sessions(id), cascade delete |
| role | TEXT | Nullable (values: user, bot) |
| content | TEXT | Nullable |
| created_at | TIMESTAMPTZ | Default now() |

**Table: feedback** - thumbs-up or thumbs-down feedback on an answer.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| message_id | UUID | Nullable, unique, foreign key to messages(id) |
| session_id | UUID | Nullable, foreign key to chat_sessions(id), set null on delete |
| website_id | INTEGER | Nullable, foreign key to websites(id), cascade delete |
| site_id | UUID | Nullable, foreign key to sites(id), cascade delete |
| rating | TEXT | Not null, check values up or down |
| retrieved_chunk_ids | UUID[] | Not null |
| top_chunk_ids | UUID[] | Not null |
| query_embedding | vector(384) | Nullable |
| created_at | TIMESTAMPTZ | Default now() |

**Table: feedback_examples** - curated exemplar query embeddings for retrieval adaptation.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| site_id | UUID | Nullable, foreign key to sites(id), cascade delete |
| query_embedding | vector(384) | Not null, HNSW cosine index |
| rating | TEXT | Check values up or down |
| representative_query | TEXT | Nullable |
| example_count | INTEGER | Default 1 |
| last_seen | TIMESTAMPTZ | Default now() |
| created_at | TIMESTAMPTZ | Default now() |

**Table: query_logs** - analytics log of every RAG query.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| tenant_id | UUID | Not null, foreign key to tenants(id) |
| session_id | TEXT | Nullable |
| query_text | TEXT | Not null |
| retrieved_chunk_ids | TEXT[] | Nullable |
| similarity_scores | FLOAT[] | Nullable |
| generated_answer | TEXT | Nullable |
| entailment_verdict | TEXT | Check values supported, partial or unsupported |
| fallback_triggered | BOOLEAN | Default false |
| fallback_reason | TEXT | Check within a defined enumerated set |
| latency_ms | INTEGER | Nullable |
| created_at | TIMESTAMPTZ | Default now() |
| retrieval_adaptation | TEXT | Nullable |
| query_embedding | vector(384) | Nullable |

**Table: verification_logs** - audit trail of domain-verification attempts.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| website_id | INTEGER | Not null, foreign key to websites(id), cascade delete |
| method | ENUM | Values: dns, self_attested |
| verified_at | TIMESTAMPTZ | Default now() |
| verified_by_user_id | INTEGER | Not null, foreign key to users(id), cascade delete |

**Table: sync_logs** - periodic content-sync summary per website.
| Column | Type | Constraints |
| --- | --- | --- |
| id | SERIAL | Primary key |
| website_id | INTEGER | Not null, foreign key to websites(id), cascade delete |
| pages_checked | INTEGER | Default 0 |
| pages_updated | INTEGER | Default 0 |
| pages_added | INTEGER | Default 0 |
| pages_removed | INTEGER | Default 0 |
| synced_at | TIMESTAMPTZ | Default now() |

**Table: tenants** - tenant registry holding the per-tenant similarity threshold.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| name | TEXT | Nullable |
| similarity_threshold | FLOAT | Default 0.72 |
| created_at | TIMESTAMPTZ | Default now() |

**Table: weight_decay_log** - audit log of scheduled feedback-weight decay runs.
| Column | Type | Constraints |
| --- | --- | --- |
| id | UUID | Primary key, default gen_random_uuid() |
| run_at | TIMESTAMPTZ | Default now() |
| chunks_updated | INTEGER | Nullable |
| sites_affected | INTEGER | Nullable |

**View: chunks** - retrieval façade over document_chunks exposing content and a coalesced tenant identifier.
| View column | Source | Type |
| --- | --- | --- |
| id | document_chunks.id | INTEGER |
| content | chunk_text | TEXT |
| embedding | embedding | vector(384) |
| tenant_id | COALESCE(tenant_id, site_id) | UUID |
| website_id | website_id | INTEGER |
| site_id | site_id | UUID |
| page_url | page_url | TEXT |
| page_title | page_title | TEXT |
| created_at | created_at | TIMESTAMPTZ |
| feedback_weight | feedback_weight | FLOAT |

[[PAGEBREAK]]
# Chapter 4: Implementation and Testing
This chapter presents the implemented user interface and the testing carried out using the defined use cases.

## 4.1 User Interface and Snapshot
The user interface is delivered as a React single-page application styled with Tailwind CSS, together with the embeddable widget. The principal screens are described and shown below.

[[FIG 4.1 | Landing Page]]
> The public landing page presents the product, its architecture and its distinguishing features to prospective users, and provides entry points to sign up and log in.

[[FIG 4.2 | Sign Up and One-Time-Password Verification]]
> The sign-up screen supports email and password registration with a one-time-password step delivered by email, as well as one-click Google sign-in.

[[FIG 4.3 | Tenant Dashboard]]
> The dashboard summarizes the active website and surfaces quick actions such as starting a crawl and monitoring its status through the crawl status panel.

[[FIG 4.4 | My Websites]]
> This screen lists all websites owned by the tenant, allows registering a new domain, displays verification status and provides per-website actions.

[[FIG 4.5 | Chatbot Studio]]
> The studio is a three-panel interface where the tenant configures branding colours, widget text, position and settings, generates the embed code, manages manual knowledge content, reviews re-index history and previews the widget live.

[[FIG 4.6 | Analytics]]
> The analytics screen presents per-website telemetry including the number of inquiries, grounding confidence, latency and token usage, the RAG pipeline parameters, and a searchable interaction log with expandable deep telemetry for each query.

[[FIG 4.7 | Embeddable Chat Widget with Source Highlighting]]
> The widget renders as a chat bubble on the host website and, on receiving an answer, scrolls to and highlights the source passage on the page to support visual verification.

[[FIG 4.8 | Administrator Analytics Console]]
> The administrative console provides platform-wide metrics across overview, website health, query intelligence, user activity, system performance and content quality, together with tenant management actions.

## 4.2 Testing using Use Cases
Testing was performed at the unit, integration and system levels. Unit tests validated the chunker, the embedding client and the knowledge base storage, integration tests exercised the end-to-end chat pipeline including embedding, retrieval, generation and entailment verification, and the analytics endpoints were validated with authorization tests ensuring that unauthenticated and non-administrator requests are rejected. The following table maps the principal use cases to their test cases and results.

[[TABLE 4.1 | Use case test cases]]
| Test ID | Use Case | Input or Action | Expected Result | Status |
| --- | --- | --- | --- | --- |
| TC-01 | Register and Login | Valid registration with email and password | Account created and session established | Pass |
| TC-02 | Register and Login | One-time-password verification flow | OTP verified and account activated | Pass |
| TC-03 | Register and Login | Google OAuth sign-in | Session established via Google | Pass |
| TC-04 | Register and Verify Website | Register a valid domain | Website created with pending verification | Pass |
| TC-05 | Register and Verify Website | Verify ownership | Verification status becomes verified | Pass |
| TC-06 | Trigger Crawl | Start crawl for a verified website | Job queued, pages discovered and extracted | Pass |
| TC-07 | Trigger Crawl | Stop a running crawl | Job moves to cancelled state | Pass |
| TC-08 | Crawl with OCR | Crawl a scanned PDF | Text extracted via OCR and chunked | Pass |
| TC-09 | Ask a Question | In-domain question | Grounded answer returned with sources | Pass |
| TC-10 | Ask a Question | Out-of-domain question | Safe fallback returned instead of invention | Pass |
| TC-11 | Entailment Check | Answer supported by context | Verdict recorded as supported | Pass |
| TC-12 | Entailment Check | Fabricated answer scenario | Verdict recorded as unsupported or contradicted | Pass |
| TC-13 | View Source Highlighting | Answer with source metadata | Source passage highlighted on the page | Pass |
| TC-14 | Provide Feedback | Thumbs-up on an answer | Chunk weights increased and feedback stored | Pass |
| TC-15 | Provide Feedback | Thumbs-down on an answer | Chunk weights decreased and feedback stored | Pass |
| TC-16 | Multi-tenant Isolation | Query as tenant A for tenant B content | No cross-tenant content retrieved | Pass |
| TC-17 | Manage Tenants | Suspend a tenant as administrator | Website deactivated and access restricted | Pass |
| TC-18 | View Platform Analytics | Administrator requests analytics | Metrics returned; unauthorized requests rejected | Pass |
| TC-19 | Manual Content | Add a manual knowledge entry | Entry indexed and retrievable | Pass |
| TC-20 | Drive Ingestion | Import a Google Drive folder | Documents fetched, OCR applied and indexed | Pass |

[[PAGEBREAK]]
# Chapter 5: Conclusion & Future Work
This project designed and implemented an isolated multi-tenant retrieval-augmented chatbot platform whose answers are grounded in tenant-specific content and checked through entailment. By combining dense and lexical hybrid retrieval, an instruction-tuned generation model constrained by grounding prompts, and a cross-encoder natural language inference check applied after generation, the system addresses the two main problems of conversational AI over private content: weak recall of relevant information and answers that cannot be verified. The platform also provides per-tenant isolation at query level, retrieval that adapts from user feedback and decays over time, highlighting of the source passage on the page, a dashboard, and an administrative analytics console.

The implementation shows that a usable RAG system can be built from open-source components on modest infrastructure. The crawler handles common web problems such as robots.txt rules, JavaScript-rendered pages, incremental change detection and scanned documents, and the vector database gives fast semantic search through HNSW indexing. The entailment check runs asynchronously, so it does not slow the reply, and it provides the measurements needed to monitor and reduce hallucination.

Several directions remain open for future work. Multilingual support could be added by adopting multilingual embedding and inference models. The large language model could be personalized per tenant through lightweight fine-tuning or retrieval-augmented prompt tuning rather than relying on a single shared model. Generation and verification latency could be reduced by batching and caching, and the entailment check could be extended from a binary flag to a claim-level attribution that reports exactly which retrieved sentence supports each generated sentence. The feedback loop could be extended with implicit signals such as dwell time and follow-up reformulations, and a reinforcement learning approach could optimize retrieval parameters end to end. Finally, the platform could be extended with role-based access control within tenants, billing and usage metering, and a plugin ecosystem for additional content sources beyond websites and Google Drive.

[[PAGEBREAK]]
# Chapter 6: References
[1] A. Vaswani et al., "Attention is all you need," in Advances in Neural Information Processing Systems (NeurIPS), vol. 30, Long Beach, CA, USA, 2017, pp. 5998-6008. [Online]. Available: https://arxiv.org/abs/1706.03762
[2] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, "BERT: Pre-training of deep bidirectional transformers for language understanding," in Proc. Conf. North Amer. Chapter Assoc. Comput. Linguistics: Human Language Technologies (NAACL-HLT), Minneapolis, MN, USA, 2019, pp. 4171-4186, doi: 10.18653/v1/N19-1423. [Online]. Available: https://aclanthology.org/N19-1423/
[3] Y. Liu et al., "RoBERTa: A robustly optimized BERT pretraining approach," arXiv preprint arXiv:1907.11692, 2019. [Online]. Available: https://arxiv.org/abs/1907.11692
[4] N. Reimers and I. Gurevych, "Sentence-BERT: Sentence embeddings using Siamese BERT-networks," in Proc. Conf. Empirical Methods in Natural Language Processing (EMNLP-IJCNLP), Hong Kong, China, 2019, pp. 3982-3992, doi: 10.18653/v1/D19-1410. [Online]. Available: https://aclanthology.org/D19-1410/
[5] Y. A. Malkov and D. A. Yashunin, "Efficient and robust approximate nearest neighbor search using hierarchical navigable small world graphs," IEEE Trans. Pattern Anal. Mach. Intell., vol. 42, no. 4, pp. 824-836, Apr. 2020, doi: 10.1109/TPAMI.2018.2889473. [Online]. Available: https://doi.org/10.1109/TPAMI.2018.2889473
[6] S. R. Bowman, G. Angeli, C. Potts, and C. D. Manning, "A large annotated corpus for learning natural language inference," in Proc. Conf. Empirical Methods in Natural Language Processing (EMNLP), Lisbon, Portugal, 2015, pp. 632-642, doi: 10.18653/v1/D15-1075. [Online]. Available: https://aclanthology.org/D15-1075/
[7] A. Williams, N. Nangia, and S. R. Bowman, "A broad-coverage challenge corpus for sentence understanding through inference," in Conf. North Amer. Chapter Assoc. Comput. Linguistics: Human Language Technologies (NAACL-HLT), New Orleans, LA, USA, 2018, pp. 1112-1122, doi: 10.18653/v1/N18-1101. [Online]. Available: https://aclanthology.org/N18-1101/
[8] J. Thorne, A. Vlachos, C. Christodoulopoulos, and A. Mittal, "FEVER: A large-scale dataset for fact extraction and verification," in Conf. North Amer. Chapter Assoc. Comput. Linguistics: Human Language Technologies (NAACL-HLT), New Orleans, LA, USA, 2018, pp. 809-819, doi: 10.18653/v1/N18-1074. [Online]. Available: https://aclanthology.org/N18-1074/
[9] J. Maynez, S. Narayan, B. Bohnet, and R. McDonald, "On faithfulness and factuality in abstractive summarization," in Proc. 58th Annu. Meeting Assoc. Comput. Linguistics (ACL), Online, 2020, pp. 1906-1919, doi: 10.18653/v1/2020.acl-main.173. [Online]. Available: https://aclanthology.org/2020.acl-main.173/
[10] P. Lewis et al., "Retrieval-augmented generation for knowledge-intensive NLP tasks," in Advances in Neural Information Processing Systems (NeurIPS), vol. 33, Vancouver, BC, Canada, 2020, pp. 9459-9474. [Online]. Available: https://arxiv.org/abs/2005.11401
[11] V. Karpukhin et al., "Dense passage retrieval for open-domain question answering," in Proc. Conf. Empirical Methods in Natural Language Processing (EMNLP), Online, 2020, pp. 6769-6781, doi: 10.18653/v1/2020.emnlp-main.550. [Online]. Available: https://aclanthology.org/2020.emnlp-main.550/
[12] Y. Gao et al., "Retrieval-augmented generation for large language models: A survey," arXiv preprint arXiv:2312.10997, 2023. [Online]. Available: https://arxiv.org/abs/2312.10997
[13] Z. Ji et al., "Survey of hallucination in natural language generation," ACM Computing Surveys, vol. 55, no. 12, art. no. 248, pp. 1-38, Mar. 2023, doi: 10.1145/3571730. [Online]. Available: https://doi.org/10.1145/3571730
[14] L. Huang et al., "A survey on hallucination in large language models: Principles, taxonomy, challenges, and open questions," ACM Trans. Inf. Syst., vol. 43, no. 2, art. no. 3155, 2025, doi: 10.1145/3703155. [Online]. Available: https://arxiv.org/abs/2311.05232
[15] N. Thakur, N. Reimers, A. Ruckle, A. Srivastava, and I. Gurevych, "BEIR: A heterogeneous benchmark for zero-shot evaluation of information retrieval models," in Proc. NeurIPS Datasets and Benchmarks Track, 2021. [Online]. Available: https://arxiv.org/abs/2104.08663
[16] A. Barbaresi, "Trafilatura: A web scraping library and command-line tool for text discovery and extraction," in Proc. Joint Conf. 59th Annu. Meeting Assoc. Comput. Linguistics and 11th Int. Joint Conf. Natural Language Processing: System Demonstrations (ACL-IJCNLP), Online, 2021, pp. 122-131, doi: 10.18653/v1/2021.acl-demo.15. [Online]. Available: https://aclanthology.org/2021.acl-demo.15/
[17] R. Smith, "An overview of the Tesseract OCR engine," in Proc. 9th Int. Conf. Document Analysis and Recognition (ICDAR), Curitiba, Brazil, 2007, pp. 629-633, doi: 10.1109/ICDAR.2007.4376991. [Online]. Available: https://ieeexplore.ieee.org/document/4376991/
[18] S. E. Robertson and H. Zaragoza, "The probabilistic relevance framework: BM25 and beyond," Foundations and Trends in Information Retrieval, vol. 4, no. 1-2, pp. 1-174, 2009, doi: 10.1561/1500000019. [Online]. Available: https://doi.org/10.1561/1500000019
[19] H. Touvron et al., "Llama 2: Open foundation and fine-tuned chat models," arXiv preprint arXiv:2307.09288, 2023. [Online]. Available: https://arxiv.org/abs/2307.09288
[20] H. AlJahdali, A. Albatli, P. Garraghan, P. Townend, L. Lau, and J. Xu, "Multi-tenancy in cloud computing," in Proc. IEEE Int. Symp. Service-Oriented System Engineering (SOSE), Oxford, UK, 2014, pp. 344-351, doi: 10.1109/SOSE.2014.50. [Online]. Available: https://ieeexplore.ieee.org/document/6830928/

[[FM:PAPER_PUBLICATION]]
This section will list the details of any research paper published from this work. At the time of submission, no paper has been published. The section is retained in accordance with the report format for future inclusion.
