# Multi-Tenancy Architecture

This system is multi-tenant. Correct tenant isolation is critical.

A cross-tenant data leak is a **critical severity bug**.

---

## Core model

### Tenant root

The tenant root is:

- `organization`

This is where:
- billing lives
- subscription lives
- ownership lives

---

### Operational scope

Below organization:

- `gyms`

Most operations happen at the gym level:
- members
- staff
- check-ins
- announcements
- schedules

---

## Hierarchy

```text
organization
  └── gyms
        ├── staff
        ├── members
        ├── check-ins
        ├── announcements
        └── features

Key rule
Every query involving gym-scoped data MUST:

filter by gym_id
validate it against authenticated context
Auth context
Authenticated requests must include:

userId
gymId (active context)
permissions
The backend must trust:

JWT context
The backend must NOT trust:

gymId from request body
Example: correct pattern
ts


const member = await prisma.gymMember.findFirst({
  where: {
    id: memberId,
    gymId: user.gymId
  }
});
Example: incorrect pattern
ts


const member = await prisma.gymMember.findUnique({
  where: { id: memberId }
});
This allows cross-tenant access.

Cross-tenant protection rules
Always:

validate resource belongs to the same gym
validate staff belongs to the gym
validate membership belongs to the gym
Never:

fetch by ID only without tenant filter
trust client-provided gymId blindly
skip tenant validation in background jobs
Organization-level operations
Some operations are scoped to organization:

billing
subscription
plan features
These must use:

text


organization_id
Switching gym context
If a user belongs to multiple gyms:

system must define an active gym context
JWT should reflect current gymId
switching gym should refresh token or context
Background jobs
Even async jobs must enforce tenancy:

always include gymId or organizationId
never process global data blindly
Testing requirement
Every domain involving gym data must include tests for:

correct tenant access
rejected cross-tenant access
Design goal
A developer should never ask:

“Do I need to filter by gym_id here?”

The answer is always:

Yes, unless it is explicitly global or organization-scoped.