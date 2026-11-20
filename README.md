# API Impact Analyzer

A TypeScript-based tool that detects breaking OpenAPI contract changes, identifies affected consumer code, and automatically reports potential issues on GitHub pull requests with AI-powered explanations.

## Features

### 1. OpenAPI Contract Analysis

- Compares old and new OpenAPI specifications.
- Detects removed endpoints and response fields.
- Identifies incompatible response field types.
- Detects newly required request fields and removed response status codes.
- Generates human-readable and JSON reports.

### 2. Consumer Impact Analysis

Uses TypeScript Abstract Syntax Tree (AST) analysis through `ts-morph` to identify potentially affected consumers.

- Detects API calls using `fetch` and Axios.
- Tracks response field access and destructuring.
- Identifies missing required request body fields.
- Matches dynamic endpoint paths such as `/users/{id}`.
- Validates API hostnames against OpenAPI server definitions.
- Reports impacted files and line numbers.

### 3. GitHub Pull Request Integration

- Integrates with GitHub using a GitHub App.
- Receives pull request webhook events with HMAC signature verification.
- Processes analysis jobs asynchronously using BullMQ and Redis.
- Compares API specifications across pull request base and head commits.
- Uses Octokit for authenticated GitHub API access.
- Publishes breaking change counts and impacted consumer locations through GitHub Checks.

### 4. AI-Powered Impact Explanations

Integrates with **Ollama running Llama 3.2 locally** to generate explanations of detected breaking API changes.

- Explains confirmed breaking changes and their potential impact.
- Suggests possible fixes and backward-compatible alternatives.
- Uses deterministic analysis results as the source of truth.
- Minimizes consumer information sent to the language model.
- Executes AI inference asynchronously in the background worker.
- Includes a 30-second timeout per request and one retry on failure.
- Gracefully handles AI failures without preventing deterministic analysis results from being published.
- Publishes AI-generated explanations directly in GitHub Checks.

AI explanations are advisory and may require developer review.

## Architecture

```text
GitHub Pull Request
        |
        v
GitHub App Webhook
        |
        v
Fastify Webhook Server
(HMAC Verification)
        |
        v
BullMQ + Redis Queue
        |
        v
Background Worker
        |
        +--> OpenAPI Diff Engine
        |           |
        |           v
        |    TypeScript Consumer Analyzer
        |           |
        |           v
        |      Impact Report
        |           |
        |           v
        |    Ollama (Llama 3.2)
        |           |
        |           v
        |    AI Explanations
        |
        v
GitHub Checks API
        |
        v
PR Analysis Results
```

## Tech Stack

- **Language:** TypeScript
- **Backend:** Fastify
- **Static Analysis:** ts-morph
- **Background Jobs:** BullMQ, Redis
- **GitHub Integration:** GitHub Apps, Octokit
- **AI Inference:** Ollama, Llama 3.2
- **API Specifications:** OpenAPI 3.0

## CLI Usage

Install dependencies:

```bash
npm install
```

Run contract analysis:

```bash
npm run dev -- --before examples/old-api.yaml --after examples/new-api.yaml
```

Generate JSON output:

```bash
npm run dev -- --before examples/old-api.yaml --after examples/new-api.yaml --format json
```

### Exit Codes

| Code | Meaning                   |
| ---- | ------------------------- |
| 0    | No breaking changes       |
| 1    | Analysis error            |
| 2    | Breaking changes detected |

## Running the GitHub PR Analyzer Locally

The GitHub integration requires a configured GitHub App, Redis, and a locally running Fastify server and background worker.

### 1. Start Redis

```bash
docker start api-impact-redis
```

### 2. Start Ollama

Ensure Ollama is running and the Llama 3.2 model is installed.

```bash
ollama pull llama3.2
```

Verify the model:

```bash
ollama list
```

Ollama serves inference requests through its local API at `http://localhost:11434`.

### 3. Set up PostgreSQL

Create a PostgreSQL database for the analyzer and set `DATABASE_URL` in `.env`.
For example, with a local database named `api_impact`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/api_impact
```

Apply the checked-in migration:

```bash
npm run db:migrate
```

### 4. Start the Fastify server

```bash
npx tsx src/server/index.ts
```

### 5. Start the background worker

In a separate terminal:

```bash
npx tsx src/worker/analysis-worker.ts
```

### 6. Expose the webhook endpoint

```bash
ngrok http 3000
```

Configure the GitHub App webhook URL to point to:

```text
https://<your-ngrok-domain>/webhooks/github
```

Ensure the required GitHub App credentials and webhook secret are configured in the local environment.

### 7. Trigger analysis

Open, synchronize, or reopen a pull request in a repository where the GitHub App is installed.

The analyzer will:

1. Fetch the OpenAPI specification from the PR base and head commits.
2. Detect potentially breaking API changes.
3. Analyze affected TypeScript consumers.
4. Generate AI explanations when breaking changes are detected.
5. Save the findings and any AI explanation to PostgreSQL, keyed by repository, PR, base commit, and head commit.
6. Publish the results through GitHub Checks.

## Running the React Dashboard

With `DATABASE_URL` configured and the migration applied, run:

```bash
npm run build
npm run dashboard
```

Open [the local dashboard](http://127.0.0.1:3001) to browse completed PR
analyses, expand findings and consumer references, and read saved AI
explanations. The dashboard listens on loopback on port 3001. The GitHub webhook
continues to use port 3000. The history starts with analyses saved by the
updated worker.

## Current Limitations

### OpenAPI Analysis

- Nested response properties are not recursively compared.
- Comprehensive schema composition analysis is not supported.
- OpenAPI 3.1 is not yet supported.
- Circular references are not fully resolved.

### Consumer Analysis

- Only TypeScript and TSX consumers are supported.
- API URLs must be statically identifiable and absolute for host matching.
- Host matching uses the first OpenAPI server URL.
- Dynamic property access may not be detected.
- Incompletely analyzable request payloads are skipped.
- Some direct response access patterns are unsupported.
- Cross-file data flow and complex runtime behavior are not analyzed.

### AI Explanations

- Requires a locally accessible Ollama instance running Llama 3.2.
- AI explanations are generated only when breaking changes are detected.
- AI-generated suggestions may be incomplete or technically incorrect.
- Only a limited number of impacted consumer locations are included in the AI prompt.
- Prompt-size limits and stricter AI output validation are not yet implemented.
- AI inference can increase overall analysis latency.

The analyzer uses conservative static analysis and does not guarantee detection of every affected consumer.

## Roadmap

- [x] Phase 1: OpenAPI Contract Diff Engine
- [x] Phase 2: TypeScript Consumer Dependency Analysis
- [x] Phase 3: GitHub App Integration and Asynchronous PR Analysis
- [x] Phase 4: AI-Generated Impact Explanations using Ollama (Llama 3.2)
- [x] Phase 5: PostgreSQL Persistence and React Dashboard
- [ ] Phase 6: Production Deployment, Testing, and Documentation Improvements

## Project Status

**Phases 1–5 are implemented.**

The analyzer currently supports automated GitHub pull request analysis, breaking API change detection, TypeScript consumer impact identification, and AI-powered explanations published through GitHub Checks.

PostgreSQL stores PR analysis history for the local React dashboard.

## Demo

![Contract analysis AI response in checks tab](image-1.png)
