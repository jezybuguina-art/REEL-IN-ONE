# Security Specification & Test-Driven Design (TDD)
## Educator Rubric Grader Applet

### 1. Data Invariants
- **Owner Lock**: No user can read, write, update, or delete any rubric or grading session where `resource.data.userId` or `request.resource.data.userId` does not match `request.auth.uid`.
- **Relational Integrity**:
  - `createdAt` of a Rubric or Grading Session must be set to `request.time` upon creation and stay immutable thereafter.
  - `updatedAt` of a Grading Session must be set to `request.time` upon updates.
  - `userId` must equal the currently authenticated educator's UID (`request.auth.uid`).
- **Data Hardening**:
  - Rubric titles can be up to 150 characters.
  - IDs must conform to alphanumeric/hyphen characters and be limited to 128 characters.

---

### 2. The "Dirty Dozen" Rogue Payloads
These payloads attempt to exploit access gaps, inject unverified data, or spoof ownership:

1. **Unsigned-In Rubric Creation** (Identity Gap)
2. **Owner Spoofing Rubric Creation** (Injecting alternative `userId` on creation)
3. **Ghost Field Rubric Creation** (Adding an unauthorized `isAdmin` or privilege key)
4. **Foreign Rubric Exfiltration** (Querying list of rubrics owned by another UID)
5. **Foreign Rubric Delete** (Attempting to delete another user's rubric)
6. **Immutable Field Mutate** (Attempting to change `createdAt` of an existing rubric)
7. **Temporal Spoofing** (Manually passing stale/fake client timestamps instead of `request.time`)
8. **Recursive Read Bomb** (Injecting unvalidated, extreme string/array lengths to exceed pricing constraints)
9. **Grading Session Orphan** (Creating session associated with a non-existent or foreign `rubricId`)
10. **Foreign Session View** (Directly requesting single document read for another user's grading session)
11. **Client-Controlled State Escalation** (Mutating standard session flags or status directly without constraints)
12. **System-Injected Field Theft** (Modifying pre-seeded rubric structures belonging to standard schemas)

---

### 3. Implementation of the Test Specs
We will implement Firestore Rules using the Phase 3 schema, enforce them in `firestore.rules`, and test them through live app usage.
