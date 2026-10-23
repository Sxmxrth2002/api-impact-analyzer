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
