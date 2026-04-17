# Monorepo Structure

This document defines how the repository is organized and what belongs in each major area.

The goal is to keep the repository understandable as the product grows across web, mobile, API, shared packages, database assets, and documentation.

---

## Repository layout

The repository is organized around:

- applications
- shared packages
- database assets
- infrastructure setup
- documentation
- workspace tooling

A typical top-level layout looks like this:

```text
repo/
  apps/
    api/
    web/
    mobile/

  packages/
    contracts/
    sdk/
    config/
    ui/
    utils/

  db/
    migrations/
    seeds/
    scripts/

  prisma/
    schema.prisma

  infra/
    compose/

  docs/
    00-product/
    01-architecture/
    02-domains/
    03-engineering/
    04-api/
    05-ai/
    06-decisions/

  tools/
    scripts/

  README.md
  CLAUDE.md
  CONTRIBUTING.md
  package.json
  pnpm-workspace.yaml
  turbo.json
