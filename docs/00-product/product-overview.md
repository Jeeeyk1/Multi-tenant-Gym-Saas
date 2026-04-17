# Product Overview

## Overview

This platform is a multi-tenant SaaS designed for gym owners to manage their operations, staff, and members, while also enabling engagement features for gym members.

It combines:

- gym management
- membership lifecycle tracking
- real-time attendance (check-ins)
- staff and role management
- announcements and communication
- optional community interaction
- AI-assisted features (phased rollout)

The system is designed to support both:
- operational efficiency for gym staff
- engagement and retention for gym members

---

## Target users

### Organization owners
- subscribe to the platform
- manage one or multiple gyms
- oversee operations and growth

### Gym staff
- register and manage members
- manage memberships and renewals
- handle check-ins and daily operations
- publish announcements

### Members
- access their gym via mobile app
- check in and out
- view gym activity
- participate in community features
- interact with AI assistant (MVP)

---

## Core system model

### Organizations
- the tenant root of the system
- owns billing and subscription

### Gyms
- physical gym branches under an organization
- most operations are scoped at this level

### Members
- always tied to a user account
- created by staff or through onboarding
- must activate account via invitation email

---

## Member account model

All members must have an account.

Flow:
1. Staff registers a member
2. System creates a user record
3. Member receives an **invitation email**
4. Member sets password and activates account
5. Member can access mobile app

This ensures:
- identity consistency
- chat participation
- AI usage
- future feature compatibility

---

## Core workflows

### 1. Organization onboarding
- owner subscribes to platform
- organization is created
- subscription is assigned

### 2. Gym setup
- gym is created under organization
- default configurations are initialized:
  - gym profile
  - schedules
  - community chat
- staff can be assigned

### 3. Staff management
- users are assigned as gym staff
- roles and permissions are assigned
- permissions control access to features

### 4. Member registration
- staff registers members manually
- system generates:
  - membership record
  - QR code
  - membership number
- invitation email is sent

### 5. Membership management
- assign membership plans
- track expiry
- handle renewals
- enforce active/inactive status

### 6. Check-in system

Primary method:
- QR self-scan (member scans gym QR)

Other methods:
- staff-assisted (manual or QR scan)
- mobile app check-in

Validation rules:
- membership must be ACTIVE
- membership must not be expired
- member must not already be checked in
- gym must be open (unless 24/7)

### 7. Presence visibility

Members can see who is currently checked in.

Rules:
- staff and owners can see all members
- members can hide their visibility
- hidden members are not shown to other members

### 8. Announcements

Staff can:
- create announcements
- target all members or specific groups (future)
- schedule or publish immediately

Members can:
- view announcements
- track read status

### 9. Community chat (MVP optional)

Each gym has:
- one default community chat

Features:
- basic messaging only
- no direct messages (MVP)
- no groups (MVP)

Future:
- richer chat features

### 10. AI assistant (MVP)

Members can:
- interact with a limited AI assistant (fitness guidance)

Constraints:
- usage limited by subscription tokens

---

## MVP scope

Included:

- organizations and gyms (with org-slug and gym-code login)
- staff and roles (RBAC)
- membership plans
- members (invitation flow, QR, membership number)
- membership renewals
- check-ins (all methods, QR self-scan primary)
- announcements (publish, schedule, expire)
- community chat (one community channel per gym)
- automated background jobs:
  - membership expiry (ACTIVE → EXPIRED)
  - auto-suspend after inactivity (EXPIRED → SUSPENDED)
  - auto-checkout of stale check-ins
  - announcement publishing and expiry

---

## Not included in MVP

- AI assistant (member-facing or owner-facing)
- plan_promos (schema defined, logic not implemented)
- smartwatch or wearable integration
- advanced reporting dashboards
- direct messaging and group chat
- complex recommendation systems
- advanced AI analytics

---

## Future features

### AI for gym owners
- query gym data using natural language
- insights based on gym-specific data

### Wearable integration
- connect smartwatches
- track calories, activity, and workouts
- historical tracking

### Advanced community features
- direct messaging
- group chats
- richer engagement tools

### Advanced analytics
- retention insights
- usage trends
- performance dashboards

---

## Product philosophy

The platform focuses on:

- simplicity in daily gym operations
- strong data integrity
- safe multi-tenant architecture
- incremental feature expansion
- real-world usability for staff and members

The goal is to build a system that:
- reduces manual work for gym staff
- increases engagement for members
- scales across multiple gyms and organizations
