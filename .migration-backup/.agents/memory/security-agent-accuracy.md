---
name: Security agent accuracy fix
description: Why the Security AI agent was told not to report secrets, and how that prevents false conflicts with the static scanner.
---

**Rule:** The Security & Access Control agent's role prompt begins with an explicit SCOPE RESTRICTION: "Do NOT report hardcoded secrets, API keys, database passwords, connection string credentials…A separate deterministic Secret Scanner V2 module handles those exclusively."

**Why:** The AI agent was hallucinating "database password leaked" findings while the static Secret Scanner V2 (which has real regex patterns) reported clean. This creates a direct, visible contradiction in the UI that confuses users about scan accuracy.

**How to apply:** Any future changes to the Security agent role must preserve this restriction at the top of the prompt. Secrets are exclusively the domain of Secret Scanner V2. The Security agent should focus only on auth logic, access control (IDOR), injection, and configuration issues.
