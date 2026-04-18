# Staff & RBAC Domain

## Purpose

This domain manages:

- staff assignment to gyms
- role-based access control (RBAC)
- permission enforcement across the system

It defines **who can do what** inside a gym.

---

## Core concepts

### 1. Staff

A staff member is:

- a user assigned to a gym
- stored in `gym_staff`

A user can:
- be staff in multiple gyms
- have different roles per gym

---

### 2. Roles (predefined)

Roles are **strictly predefined**.

Examples:

- MANAGER
- FRONT_DESK
- TRAINER

These are stored in:

- `roles` table
- `is_system_role = true`

---

### 3. SUPER_ADMIN

Defined in:

```text
users.system_role = SUPER_ADMIN

UPER_ADMIN:

bypasses all RBAC checks
has full system access
is not gym-scoped
Role behavior
Multi-role support
A staff member can have multiple roles:

Example:

text


User A:
- MANAGER
- TRAINER
Permissions = union of all roles.

Why this matters
In small gyms:

one person may handle everything
This allows:

flexible permission assignment
no need for custom roles
Permissions
Permissions are granular actions.

Examples:

members.view
members.create
members.renew
checkins.manage
staff.manage
announcements.manage
Role → Permission mapping
Each role has a fixed set of permissions.

Example:

MANAGER
full access
staff management
reports
announcements
FRONT_DESK
member registration
renewals
check-ins
TRAINER
view members
check-ins
Permission resolution
At login:

Load all roles for staff
Load all permissions for those roles
Combine into a unique set
text


permissions = union(all role permissions)
JWT payload
JWT must include:

json


{
  "userId": "...",
  "gymId": "...",
  "roles": ["MANAGER", "TRAINER"],
  "permissions": ["members.view", "checkins.manage"]
}
Authorization rule
Always check permissions.

Never check roles directly.

✅ Correct:

ts


@RequirePermission('members.create')
❌ Incorrect:

ts


if (user.roles.includes('MANAGER'))
Gym scoping
Permissions are valid only within a gym.

Rules:

user must belong to gym_staff
permissions apply only to that gym
must validate gym_id on every request
Staff assignment flow
Owner/manager adds user as staff
System creates gym_staff
Assign roles via gym_staff_roles
Permissions derived automatically
Access rules
Staff must:
be active in gym_staff
have assigned roles
have required permissions
SUPER_ADMIN behavior
SUPER_ADMIN:

bypasses permission checks
can access any gym
used for internal system admin only
Invariants
roles are predefined
roles cannot be arbitrarily created by gyms
permissions are derived from roles
a user must belong to gym_staff to act in that gym
permissions must always be checked via guard
Edge cases
User with no roles
should not access protected endpoints
Multi-role conflict
no conflict, permissions are unioned
Staff removed from gym
access must immediately be revoked
Role updated
JWT must be refreshed
Common mistakes (must avoid)
❌ Checking roles directly
❌ Skipping permission guard
❌ Not validating gym_id
❌ Trusting request body for authorization
❌ Allowing cross-gym access

Integration with other domains
Members
permission required for:
create
edit
renew
suspend
Check-ins
permission required for:
manual check-in
viewing logs
Announcements
permission required for:
create
publish
Design goal
RBAC must be:

predictable
consistent
easy to enforce
secure by default
A developer should always know:

where permissions come from
how they are enforced
what scope they apply to