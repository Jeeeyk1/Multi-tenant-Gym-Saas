# Core Flows

This document defines the main business workflows of the system.

Each flow represents how the system behaves in real-world usage.

---

## 1. Organization Onboarding

### Flow

1. Gym owner subscribes to the platform
2. System creates an organization
3. Subscription is assigned to organization
4. Owner account is linked to organization
5. Owner can start creating gyms

---

## 2. Gym Creation

### Flow

1. Owner or authorized user creates a gym
2. System validates:
   - subscription allows creating more gyms
3. System creates:
   - gym record
   - gym profile
   - default schedules
   - default community chat
4. Gym is ready for operation

---

## 3. Staff Assignment

### Flow

1. Owner adds a user as staff to a gym
2. System creates `gym_staff` record
3. Roles are assigned via `gym_staff_roles`
4. Permissions are derived from roles
5. Staff can now access gym features based on permissions

---

## 4. Member Registration

### Flow

1. Staff registers a new member
2. System:
   - creates user account
   - creates gym_members record
   - generates:
     - membership_number (globally unique)
     - qr_code_token
   - assigns membership plan
   - calculates expiry_date
3. System sends invitation email
4. Member sets password and activates account

---

## 5. Membership Renewal

### Flow

1. Staff selects member
2. Staff initiates renewal
3. System:
   - validates member exists
   - calculates new expiry_date
   - updates gym_members.expiry_date
   - inserts membership_renewals record
4. Member status remains ACTIVE

---

## 6. Member Login

### Flow

1. Member logs in with credentials
2. System validates:
   - user exists
   - password is correct
   - account is active
3. System loads:
   - gym membership
   - status (ACTIVE / EXPIRED / SUSPENDED)

### Behavior

If membership is EXPIRED:
- login is allowed
- feature access is restricted

---

## 7. Check-in (QR Self Scan - Primary)

### Flow

1. Member scans gym QR code
2. System resolves gym from QR token
3. System finds member record

### Validation

System checks:

- member exists
- member belongs to gym
- membership status = ACTIVE
- expiry_date >= today
- member is not already checked in
- gym is open (unless 24/7)

### Result

If valid:
- create check_in record
- return success

If invalid:
- return error:
  - membership expired
  - already checked in
  - gym closed

---

## 8. Check-in (Staff Assisted)

### Flow

1. Staff searches member
2. Staff selects member
3. System performs same validations as QR flow
4. System creates check_in record

---

## 9. Presence Visibility

### Flow

1. System queries active check-ins (checked_out_at IS NULL)
2. System filters:
   - exclude members with privacy enabled
3. System returns visible members

### Rules

- staff can see all members
- members can hide themselves from others
- hidden members are still visible to staff

---

## 10. Announcements

### Flow

1. Staff creates announcement
2. Staff sets:
   - content
   - status (draft/scheduled/published)
3. System:
   - publishes immediately OR
   - schedules via background job
4. Members receive announcement

---

## 11. Community Chat (MVP)

### Flow

1. Gym has default community chat
2. Member sends message
3. System:
   - validates membership is ACTIVE
   - inserts message
4. Other members receive message

---

## 12. AI Assistant (MVP)

### Flow

1. Member sends AI request
2. System:
   - validates membership is ACTIVE
   - checks subscription AI quota
3. If allowed:
   - process AI request
   - log token usage
4. If not allowed:
   - return quota exceeded error

---

## 13. Membership Expired Behavior

### Rules

When membership is EXPIRED:

Allowed:
- login
- view membership status

Blocked:
- check-in
- chat
- AI usage
- member-only features

---

## Design principles

All flows must:

- enforce gym-level tenancy
- validate membership status
- prevent invalid state transitions
- remain consistent across API endpoints

---

## Goal

These flows define the expected system behavior.

All backend implementation must follow these flows.
