-- ============================================================================
-- PaperMatch — Seed Data
-- Realistic sample data: 10 categories, 20 authors, 30 papers,
-- research interests, 6 users (5 researchers + 1 admin), interactions.
-- Passwords are bcrypt-hashed by scripts/seed.ts at load time (see README);
-- this file seeds structural/reference data. Run `npm run db:seed` instead of
-- loading this file directly if you want working demo logins.
-- ============================================================================

BEGIN;

-- Categories
INSERT INTO categories (name, description) VALUES
('Artificial Intelligence', 'General AI systems, reasoning, and planning research.'),
('Machine Learning', 'Statistical learning algorithms and theory.'),
('Deep Learning', 'Neural network architectures and training methods.'),
('Computer Vision', 'Image and video understanding systems.'),
('Natural Language Processing', 'Text understanding, generation, and language models.'),
('Cybersecurity', 'Security, privacy, and adversarial robustness.'),
('Database Systems', 'Data storage, indexing, and query processing.'),
('Distributed Systems', 'Scalable, fault-tolerant distributed computing.'),
('Cloud Computing', 'Cloud infrastructure, orchestration, and services.'),
('Data Science', 'Applied data analysis, mining, and visualization.')
ON CONFLICT (name) DO NOTHING;

-- Research interests (mirror categories, reused independently)
INSERT INTO research_interests (name, description) VALUES
('Artificial Intelligence', 'General AI systems, reasoning, and planning research.'),
('Machine Learning', 'Statistical learning algorithms and theory.'),
('Deep Learning', 'Neural network architectures and training methods.'),
('Computer Vision', 'Image and video understanding systems.'),
('Natural Language Processing', 'Text understanding, generation, and language models.'),
('Cybersecurity', 'Security, privacy, and adversarial robustness.'),
('Database Systems', 'Data storage, indexing, and query processing.'),
('Distributed Systems', 'Scalable, fault-tolerant distributed computing.'),
('Cloud Computing', 'Cloud infrastructure, orchestration, and services.'),
('Data Science', 'Applied data analysis, mining, and visualization.')
ON CONFLICT (name) DO NOTHING;

-- Authors
INSERT INTO authors (id, name, affiliation) OVERRIDING SYSTEM VALUE VALUES
(1, 'Aisha Rahman', 'University of Toronto'),
(2, 'Daniel Kowalski', 'ETH Zurich'),
(3, 'Priya Natarajan', 'IIT Bombay'),
(4, 'Wei Chen', 'Tsinghua University'),
(5, 'Sofia Moreno', 'Universidad Politecnica de Madrid'),
(6, 'James O''Connor', 'Trinity College Dublin'),
(7, 'Yuki Tanaka', 'University of Tokyo'),
(8, 'Fatima Zahra', 'KAUST'),
(9, 'Lucas Silva', 'Universidade de Sao Paulo'),
(10, 'Elena Petrova', 'Moscow Institute of Physics and Technology'),
(11, 'Michael Osei', 'University of Cape Town'),
(12, 'Hannah Schmidt', 'TU Munich'),
(13, 'Ravi Verma', 'IISc Bangalore'),
(14, 'Chloe Martin', 'Sorbonne University'),
(15, 'Noah Bergstrom', 'KTH Royal Institute of Technology'),
(16, 'Grace Kim', 'KAIST'),
(17, 'Omar Haddad', 'American University of Beirut'),
(18, 'Isabella Rossi', 'Politecnico di Milano'),
(19, 'Ethan Walker', 'University of British Columbia'),
(20, 'Meera Pillai', 'IIT Madras')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('authors','id'), (SELECT MAX(id) FROM authors));

-- Papers
INSERT INTO papers (id, title, abstract, publication_year, venue, doi, url, category_id) OVERRIDING SYSTEM VALUE VALUES
(1, 'Hierarchical Planning for Long-Horizon Autonomous Agents', 'We study decision-making agents that must complete tasks spanning thousands of primitive actions. We propose a hierarchical planner that decomposes goals into reusable sub-policies learned via offline demonstrations, and show that it reduces planning time by an order of magnitude on household-robotics and logistics benchmarks compared to flat search-based planners.', 2023, 'ICML', '10.5555/pm2001.101', 'https://papermatch.example.org/papers/1', 1),
(2, 'A Framework for Explainable Multi-Agent Coordination', 'Multi-agent systems increasingly coordinate in high-stakes settings such as traffic control and supply chains. We introduce a coordination framework that produces natural-language justifications for each agent''s action alongside a formal audit trail, and evaluate it on simulated fleet-management scenarios where explanation quality is judged by human raters.', 2019, 'ACL', '10.5555/pm2002.102', 'https://papermatch.example.org/papers/2', 1),
(3, 'Sample-Efficient Meta-Learning via Task Embedding Reuse', 'Few-shot learning methods often require large meta-training sets to generalize. We propose a task-embedding cache that reuses gradient information across structurally similar tasks, cutting meta-training sample requirements roughly in half on standard few-shot classification and regression benchmarks while matching baseline accuracy.', 2022, 'IEEE S&P', '10.5555/pm2003.103', 'https://papermatch.example.org/papers/3', 2),
(4, 'Robust Gradient Boosting Under Label Noise', 'Gradient boosted trees are widely used on tabular data but degrade sharply when training labels are noisy. We propose a reweighting scheme based on out-of-fold residual consistency and show consistent accuracy gains over standard XGBoost and LightGBM baselines across eleven noisy tabular datasets.', 2019, 'CVPR', '10.5555/pm2004.104', 'https://papermatch.example.org/papers/4', 2),
(5, 'Efficient Attention via Learned Sparsity Patterns', 'Transformer self-attention scales quadratically with sequence length. We introduce a lightweight gating module that learns per-head sparsity masks during training, achieving near full-attention accuracy on long-document classification while reducing FLOPs by up to 60% at inference time.', 2023, 'ICLR', '10.5555/pm2005.105', 'https://papermatch.example.org/papers/5', 3),
(6, 'Curriculum Pretraining for Low-Resource Vision Transformers', 'Vision transformers typically need large labelled corpora to outperform convolutional networks. We present a curriculum pretraining strategy that orders unlabeled images by estimated visual complexity, improving downstream fine-tuning accuracy on small-scale datasets by several percentage points relative to random-order pretraining.', 2024, 'OSDI', '10.5555/pm2006.106', 'https://papermatch.example.org/papers/6', 3),
(7, 'Weakly Supervised Segmentation for Medical Image Analysis', 'Pixel-level medical image annotations are expensive to obtain. We propose a weakly supervised segmentation model trained only on image-level diagnostic labels, using class-activation refinement and anatomical priors, and evaluate it on chest X-ray and dermoscopy datasets against fully supervised baselines.', 2019, 'CVPR', '10.5555/pm2007.107', 'https://papermatch.example.org/papers/7', 4),
(8, 'Cross-Domain Object Detection for Autonomous Driving in Adverse Weather', 'Object detectors trained on clear-weather driving data degrade in fog, rain, and snow. We introduce a domain-adaptation pipeline that synthesizes adverse-weather training examples and aligns feature statistics across domains, improving detection mAP substantially on real adverse-weather driving benchmarks.', 2018, 'SIGMOD', '10.5555/pm2008.108', 'https://papermatch.example.org/papers/8', 4),
(9, 'Retrieval-Augmented Summarization for Long Scientific Documents', 'Abstractive summarizers struggle with documents exceeding standard transformer context windows. We combine a dense retriever over document sections with a constrained generation module, producing summaries of long scientific papers that are judged more faithful and complete than sliding-window baselines in human evaluation.', 2023, 'USENIX Security', '10.5555/pm2009.109', 'https://papermatch.example.org/papers/9', 5),
(10, 'Privacy-Preserving Machine Learning for Clinical Text De-identification', 'Clinical notes contain sensitive patient information that must be removed before research use. We present a de-identification model trained with differential-privacy guarantees that maintains high recall on protected health information categories while limiting memorization of individual patient records.', 2022, 'VLDB', '10.5555/pm2010.110', 'https://papermatch.example.org/papers/10', 5),
(11, 'Detecting Adversarial Examples via Activation Consistency Checks', 'Adversarial perturbations can fool image classifiers while remaining imperceptible to humans. We propose a detection method that flags inputs whose intermediate activations are inconsistent across lightly augmented copies, achieving high detection rates against several gradient-based and black-box attacks.', 2018, 'ICLR', '10.5555/pm2011.111', 'https://papermatch.example.org/papers/11', 6),
(12, 'A Longitudinal Study of Phishing Campaign Infrastructure Reuse', 'We analyze eighteen months of phishing takedown data to measure how often attackers reuse hosting infrastructure across campaigns. Our findings show substantial infrastructure clustering, which we use to build an early-warning system that flags newly registered domains likely to host phishing content.', 2024, 'ICML', '10.5555/pm2012.112', 'https://papermatch.example.org/papers/12', 6),
(13, 'Adaptive Indexing for Mixed Read-Write Workloads', 'Static index structures are often mistuned for workloads that shift between read-heavy and write-heavy phases. We propose an adaptive index that monitors query patterns and incrementally restructures itself, improving throughput on mixed OLTP workloads relative to fixed B-tree and LSM-tree baselines.', 2020, 'SIGMOD', '10.5555/pm2013.113', 'https://papermatch.example.org/papers/13', 7),
(14, 'Approximate Query Processing with Learned Cardinality Estimators', 'Cardinality estimation errors are a major source of poor query plans. We train a lightweight neural estimator on query-execution feedback and integrate it into a PostgreSQL-compatible planner, reducing estimation error and end-to-end query latency on standard OLAP benchmarks.', 2022, 'SOSP', '10.5555/pm2014.114', 'https://papermatch.example.org/papers/14', 7),
(15, 'Fault-Tolerant Consensus for Geo-Distributed Edge Clusters', 'Edge computing deployments span unreliable wide-area links. We adapt a leaderless consensus protocol to tolerate high-latency, lossy links between edge clusters, demonstrating lower tail latency than Raft-based baselines under simulated network partitions.', 2020, 'WWW', '10.5555/pm2015.115', 'https://papermatch.example.org/papers/15', 8),
(16, 'Elastic Resource Scheduling for Stream Processing Pipelines', 'Streaming workloads exhibit bursty, unpredictable load. We present a scheduler that predicts short-term load spikes from recent throughput history and proactively rebalances operators across a cluster, reducing backpressure events compared to reactive autoscaling baselines.', 2024, 'NeurIPS', '10.5555/pm2016.116', 'https://papermatch.example.org/papers/16', 8),
(17, 'Cost-Aware Serverless Function Placement Across Multi-Cloud Regions', 'Serverless platforms rarely optimize jointly for cost and latency across cloud providers. We formulate function placement as a constrained optimization problem and propose a heuristic scheduler that reduces monthly compute cost while keeping p99 latency within service-level targets across three public cloud providers.', 2019, 'WWW', '10.5555/pm2017.117', 'https://papermatch.example.org/papers/17', 9),
(18, 'Energy-Efficient Virtual Machine Consolidation in Data Centers', 'Data center energy consumption is dominated by underutilized virtual machines. We propose a consolidation algorithm that migrates VMs based on predicted future load rather than instantaneous utilization, reducing active server count and associated energy use in trace-driven simulations.', 2023, 'USENIX Security', '10.5555/pm2018.118', 'https://papermatch.example.org/papers/18', 9),
(19, 'Interpretable Time-Series Anomaly Detection for Industrial IoT', 'Anomaly detectors for industrial sensor data are often opaque black boxes. We propose a detection model built on interpretable change-point features that gives maintenance engineers human-readable explanations for flagged anomalies, evaluated on multi-sensor manufacturing datasets.', 2023, 'AAAI', '10.5555/pm2019.119', 'https://papermatch.example.org/papers/19', 10),
(20, 'Fairness-Aware Feature Selection for Credit Risk Models', 'Feature selection choices can inadvertently encode demographic bias into credit-scoring models. We propose a feature-selection procedure that jointly optimizes predictive accuracy and a fairness-gap penalty, producing credit models with reduced disparate impact at a modest accuracy cost.', 2020, 'CVPR', '10.5555/pm2020.120', 'https://papermatch.example.org/papers/20', 10),
(21, 'Benchmarking Transfer Learning Across Low-Resource Languages', 'Transfer learning has closed much of the performance gap for high-resource languages but low-resource languages remain underserved. We benchmark eight transfer strategies across eighteen low-resource languages and find that intermediate-language pivoting consistently outperforms direct fine-tuning on translation and classification tasks.', 2024, 'NeurIPS', '10.5555/pm2021.121', 'https://papermatch.example.org/papers/21', 5),
(22, 'Graph Neural Networks for Drug-Target Interaction Prediction', 'Predicting whether a candidate molecule binds a target protein is central to drug discovery. We propose a graph neural network that jointly encodes molecular graphs and protein contact maps, improving interaction-prediction accuracy over fingerprint-based baselines on public bioactivity datasets.', 2024, 'ICLR', '10.5555/pm2022.122', 'https://papermatch.example.org/papers/22', 2),
(23, 'Federated Learning Under Non-IID Client Data Distributions', 'Federated learning performance degrades when client data distributions differ substantially. We propose a client-clustering strategy that groups similar clients before aggregation, improving convergence speed and final accuracy on heterogeneous federated benchmarks relative to standard FedAvg.', 2022, 'USENIX Security', '10.5555/pm2023.123', 'https://papermatch.example.org/papers/23', 2),
(24, 'Self-Supervised Representation Learning for Satellite Imagery', 'Labelled satellite imagery is scarce relative to the volume of raw sensor data collected. We propose a self-supervised pretraining objective tailored to multi-spectral satellite bands, improving downstream land-cover classification accuracy with a fraction of the labelled data required by supervised baselines.', 2023, 'WWW', '10.5555/pm2024.124', 'https://papermatch.example.org/papers/24', 4),
(25, 'A Query Optimizer Extension for Vector Similarity Joins', 'Modern applications increasingly combine relational filters with nearest-neighbour vector search. We extend a cost-based query optimizer to reason jointly about selectivity of relational predicates and approximate vector search, producing query plans that outperform naive filter-then-search pipelines.', 2021, 'ACL', '10.5555/pm2025.125', 'https://papermatch.example.org/papers/25', 7),
(26, 'Byzantine-Resilient Federated Aggregation for Healthcare Networks', 'Federated learning across hospitals is vulnerable to malicious or faulty participants. We propose a robust aggregation rule that down-weights updates inconsistent with a trusted validation set, maintaining model accuracy under a substantial fraction of Byzantine clients in simulated hospital networks.', 2022, 'WWW', '10.5555/pm2026.126', 'https://papermatch.example.org/papers/26', 6),
(27, 'Serverless Cold-Start Mitigation via Predictive Pre-Warming', 'Cold starts remain a major source of latency in serverless platforms. We propose a pre-warming policy that predicts near-future invocation bursts from historical traffic patterns, reducing cold-start rate substantially with modest additional idle-instance cost in trace-driven evaluation.', 2022, 'CVPR', '10.5555/pm2027.127', 'https://papermatch.example.org/papers/27', 9),
(28, 'Counterfactual Explanations for Tabular Deep Learning Models', 'Deep tabular models are increasingly used in lending and hiring decisions where explainability matters. We propose a counterfactual-generation method constrained to produce actionable, realistic feature changes, and evaluate explanation plausibility against gradient-based and rule-based baselines with human raters.', 2024, 'WWW', '10.5555/pm2028.128', 'https://papermatch.example.org/papers/28', 10),
(29, 'Scalable Approximate Nearest Neighbour Search on Billion-Scale Embeddings', 'Recommendation and retrieval systems increasingly operate over billion-scale embedding collections. We combine product quantization with a learned routing layer to reduce memory footprint and query latency relative to standard IVF-PQ indexes on public billion-scale ANN benchmarks.', 2021, 'NeurIPS', '10.5555/pm2029.129', 'https://papermatch.example.org/papers/29', 1),
(30, 'Vision-Language Pretraining for Zero-Shot Document Classification', 'Document images combine visual layout and textual content that single-modality models fail to exploit jointly. We pretrain a vision-language model on paired document image and OCR-text corpora, achieving strong zero-shot classification accuracy on unseen document categories.', 2019, 'NeurIPS', '10.5555/pm2030.130', 'https://papermatch.example.org/papers/30', 3)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('papers','id'), (SELECT MAX(id) FROM papers));

-- Paper-Author relationships
INSERT INTO paper_authors (paper_id, author_id, author_order) VALUES
(1, 9, 1),
(1, 8, 2),
(2, 18, 1),
(2, 3, 2),
(3, 1, 1),
(3, 3, 2),
(4, 18, 1),
(4, 7, 2),
(5, 8, 1),
(5, 15, 2),
(5, 9, 3),
(5, 1, 4),
(6, 14, 1),
(6, 11, 2),
(6, 9, 3),
(7, 4, 1),
(7, 3, 2),
(7, 13, 3),
(8, 20, 1),
(8, 9, 2),
(8, 2, 3),
(9, 13, 1),
(9, 3, 2),
(10, 19, 1),
(10, 7, 2),
(10, 3, 3),
(11, 10, 1),
(11, 3, 2),
(11, 8, 3),
(12, 9, 1),
(12, 15, 2),
(12, 12, 3),
(12, 6, 4),
(13, 9, 1),
(13, 3, 2),
(13, 6, 3),
(14, 6, 1),
(14, 15, 2),
(14, 13, 3),
(15, 11, 1),
(15, 2, 2),
(15, 8, 3),
(16, 13, 1),
(16, 9, 2),
(16, 3, 3),
(17, 7, 1),
(17, 16, 2),
(17, 13, 3),
(18, 9, 1),
(18, 5, 2),
(18, 8, 3),
(19, 19, 1),
(19, 14, 2),
(19, 13, 3),
(20, 17, 1),
(20, 16, 2),
(20, 3, 3),
(21, 5, 1),
(21, 6, 2),
(22, 20, 1),
(22, 3, 2),
(22, 13, 3),
(22, 18, 4),
(23, 18, 1),
(23, 1, 2),
(23, 4, 3),
(24, 11, 1),
(24, 4, 2),
(24, 10, 3),
(25, 1, 1),
(25, 9, 2),
(25, 17, 3),
(25, 6, 4),
(26, 10, 1),
(26, 17, 2),
(27, 12, 1),
(27, 6, 2),
(27, 18, 3),
(28, 20, 1),
(28, 11, 2),
(29, 12, 1),
(29, 10, 2),
(30, 19, 1),
(30, 3, 2),
(30, 20, 3)
ON CONFLICT (paper_id, author_id) DO NOTHING;

-- Users (password_hash placeholder — see scripts/seed.ts for real bcrypt hashes)
INSERT INTO users (name, email, password_hash, role) VALUES
('Grace Anderson', 'grace.anderson@rvcegrad.edu', '$2b$10$KIXQ8n9m3s9fkq9m1s0j9uQwkq0S1o1uvY6uH2e2v2z2v2z2v2z2u', 'RESEARCHER'),
('Marcus Bell', 'marcus.bell@rvcegrad.edu', '$2b$10$KIXQ8n9m3s9fkq9m1s0j9uQwkq0S1o1uvY6uH2e2v2z2v2z2v2z2u', 'RESEARCHER'),
('Nadia Farouk', 'nadia.farouk@rvcegrad.edu', '$2b$10$KIXQ8n9m3s9fkq9m1s0j9uQwkq0S1o1uvY6uH2e2v2z2v2z2v2z2u', 'RESEARCHER'),
('Tomás Ibarra', 'tomas.ibarra@rvcegrad.edu', '$2b$10$KIXQ8n9m3s9fkq9m1s0j9uQwkq0S1o1uvY6uH2e2v2z2v2z2v2z2u', 'RESEARCHER'),
('Priyanka Desai', 'priyanka.desai@rvcegrad.edu', '$2b$10$KIXQ8n9m3s9fkq9m1s0j9uQwkq0S1o1uvY6uH2e2v2z2v2z2v2z2u', 'RESEARCHER'),
('Admin User', 'admin@papermatch.edu', '$2b$10$KIXQ8n9m3s9fkq9m1s0j9uQwkq0S1o1uvY6uH2e2v2z2v2z2v2z2u', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Sample user interests, interactions, saves/likes are seeded programmatically
-- by scripts/seed.ts after users/papers exist, since UUIDs are generated at
-- insert time. See that script for the full interaction seeding logic.

COMMIT;
