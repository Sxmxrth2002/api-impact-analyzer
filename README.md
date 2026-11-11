# API Impact Analyzer

A TypeScript CLI that detects potentially breaking changes
between OpenAPI specifications.

## Current Detection Rules

- Removed API endpoints
- Removed response fields
- Changed response field types
- Newly required request fields
- Removed response status codes

## Features

- OpenAPI 3.x parsing and validation
- Schema reference resolution
- Human-readable and JSON reports
- Automated unit and CLI integration tests
- Exit codes for CI integration

## Usage

Install dependencies:

    npm install

Run analysis:

    npm run dev -- --before examples/old-api.yaml --after examples/new-api.yaml

JSON output:

    npm run dev -- --before examples/old-api.yaml --after examples/new-api.yaml --format json

## Exit Codes

- 0: No breaking changes
- 1: Analysis error
- 2: Breaking changes detected

## Current Limitations

- Top-level response properties only
- No recursive nested-field comparison
- No comprehensive schema composition analysis
- No consumer dependency analysis yet
- No automatic GitHub PR integration yet
- No AI explanations yet

## Roadmap

Phase 2: TypeScript consumer dependency analysis.

Phase 3: GitHub App and pull request integration.

Phase 4: AI-generated impact explanations.

Phase 5: React dashboard.

## Consumer Impact Analysis

The analyzer uses TypeScript AST analysis to identify consumer code
potentially affected by breaking OpenAPI contract changes.

### Supported Features

- Detects API calls made using fetch and Axios.
- Tracks response field accesses and destructuring.
- Identifies missing newly required request body fields.
- Detects calls to removed API endpoints.
- Matches dynamic endpoint paths such as `/users/{id}`.
- Validates API hostnames against the OpenAPI server URL.
- Scans multiple TypeScript and TSX files.
- Generates a consolidated impact report with file and line numbers.

### Current Limitations

- Only TypeScript and TSX consumers are supported.
- API URLs must be statically identifiable and absolute for host matching.
- Host matching currently uses the first OpenAPI server URL.
- Dynamic response property access may not be detected.
- Request payloads that cannot be analyzed completely are skipped.
- Some response access patterns, such as direct `response.data.name`,
  are not yet supported.
- Cross-file data flow and complex runtime behavior are not analyzed.
- OpenAPI 3.0 specifications are supported; OpenAPI 3.1 is not yet supported.
- Circular references are not fully resolved.

The analyzer uses conservative static analysis and does not guarantee
detection of every affected consumer.
