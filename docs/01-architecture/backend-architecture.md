# Backend Architecture

This document defines how the NestJS backend is structured.

The goal is to keep:
- business logic isolated
- modules independent
- code testable
- dependencies predictable
- the system maintainable as it grows

---

## Core principle

The backend is organized by **feature modules**, not by technical layers.

Each module represents a business domain:
- members
- check-ins
- gyms
- staff
- billing
- etc.

Inside each module, code is split into layers.

---

## Layered structure

Each module follows this structure:

```text
modules/<feature>/
  application/
    use-cases/
    ports/
    services/
  domain/
    entities/
    errors/
    value-objects/
  infrastructure/
    persistence/
    mappers/
    queries/
  presentation/
    controllers/
    dto/
    presenters/
  <feature>.module.ts

  Layer responsibilities
Presentation layer
Handles HTTP concerns only.

Responsibilities:

controllers
request parsing
DTO validation
response formatting
Rules:

no business logic
no direct DB access
no cross-module orchestration
Application layer
Contains use cases and orchestration logic.

Responsibilities:

use-case classes (one action per class)
coordination between domain and infrastructure
transaction boundaries (if needed)
Rules:

depends on domain and ports
does not depend on frameworks directly
should be testable without NestJS bootstrapping
Domain layer
Contains business rules and invariants.

Responsibilities:

entities
value objects
domain errors
domain rules
Rules:

no framework dependencies
no DB logic
no HTTP logic
must enforce business invariants
Infrastructure layer
Implements external concerns.

Responsibilities:

database access (Prisma)
repository implementations
external APIs
queues
Rules:

implements application ports
should not contain business rules
may depend on frameworks and libraries
Use cases vs services
Avoid large “service” classes with many responsibilities.

Prefer:

one use case = one class
one action = one method
Example:

text


CreateMemberUseCase
RenewMembershipUseCase
CheckInMemberUseCase
Benefits:

easier testing
easier reasoning
avoids god classes
easier refactoring
Controllers
Controllers must be thin.

They should:

receive request
validate DTO
call use case
return response
They should NOT:

contain business rules
perform DB logic
coordinate multiple unrelated modules
Repository pattern (ports and adapters)
Application defines interfaces:

text


application/ports/member.repository.ts
Infrastructure implements them:

text


infrastructure/persistence/member.repository.impl.ts
This allows:

easier testing
swapping DB strategies
isolation from Prisma
Dependency direction
Always follow this direction:

text


presentation → application → domain
                         → infrastructure (via ports)
Never:

domain → infrastructure
infrastructure → presentation
circular module dependencies
If circular dependency appears, redesign the boundary.

Transactions
Use transactions when:

multiple tables must be updated together
business invariants depend on multiple writes
Example:

member registration
membership renewal
gym creation
Use:

Prisma transactions in infrastructure or application layer
Error handling
Use three levels:

1. Domain errors
Custom errors for business logic

Example:

MemberNotFoundError
MembershipExpiredError
2. Application errors
Mapped from domain or orchestration logic

3. HTTP layer
Handled by global exception filter

Validation
DTO validation
happens at controller level
uses class-validator
Domain validation
happens inside entities or use cases
enforces real business rules
Module boundaries
Each module owns:

its controllers
its use cases
its domain
its persistence
Do not:

directly access another module’s database layer
import random services across modules
Instead:

expose a use case or port if needed
Shared code
Allowed in common/:

filters
interceptors
guards
pipes
logger
Not allowed:

business logic
domain rules
module-specific helpers
Testing strategy (overview)
unit tests → use cases and domain
integration tests → repositories
e2e tests → API endpoints
Avoid testing framework internals.

Design goal
A developer should be able to:

find business logic quickly
test use cases in isolation
understand dependencies easily
extend modules without breaking others
This structure is designed for long-term maintainability, not just short-term speed.
