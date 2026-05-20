# Security Specification

## Data Invariants
1. A user can only access data related to their adminId or own UID.
2. Super Admins and Developers have full access.
3. Employees can only see their own sessions, screenshots, and assigned tasks.
4. Clients can only see tasks/reports assigned to their email.

## Dirty Dozen Payloads (Rejection Targets)
1. User trying to create a profile as `super_admin` when they are not one.
2. Employee trying to read another employee's sessions.
3. Client trying to read admin's internal tasks.
4. User trying to update `adminId` in their own profile.
5. User trying to update `role` in their own profile.
6. Admin trying to update `uid` of a record.
7. Creating a task without an `adminId`.
8. Updating a task to `completed` status without being the admin or self-assignee.
9. Reading `notifications` for another user.
10. Reading `screenshots` of an employee belonging to a different admin.
11. Injecting a massive string as a `docId`.
12. Updating `createdAt` field on a task.

## Conflict Report
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|-------------------|--------------------|
| users      | Guarded (isOwner) | Guarded (affectedKeys) | Guarded (isValidId) |
| tasks      | Guarded (isAdmin) | Guarded (status flow) | Guarded (isValidId) |
| sessions   | Guarded (isOwner) | Guarded (activeTime) | Guarded (isValidId) |
| messages   | Guarded (isParticipant) | Guarded (fields) | Guarded (isValidId) |
