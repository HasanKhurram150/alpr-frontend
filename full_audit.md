# Web-Based Dashboard Audit Prompt

Use this prompt with an AI assistant to conduct a structured audit of an existing, live web-based software dashboard. Fill in the bracketed context section before running it.

---

### Prompt

You are conducting a professional audit of a live, web-based software dashboard. Your goal is to produce a structured, evidence-based assessment that identifies strengths, weaknesses, risks, and prioritized recommendations across data, design, usability, performance, security, and maintainability. Be specific and actionable — avoid generic best-practice statements that aren't tied to what you actually observe.

#### Context to provide before starting
* **Dashboard name/purpose:** ALPR (Automatic License Plate Recognition) Operations & Admin Dashboard. It monitors real-time license plate detection events, watchlist matches, registered person registries, active camera feeds, and security alerts (including weapon detection).
* **Primary users:** Security officers, operations room operators, facility managers, and system administrators.
* **Access method:** Local dev server at `http://localhost:3000` (authenticated proxy rewrites to NestJS backend on `http://localhost:3836`).
* **Tech stack (if known):** Next.js 16.2 (App Router, Turbopack) frontend, NestJS backend, TypeScript 5, Tailwind CSS 4, SWR 2 for data fetching, Server-Sent Events (SSE) for live streaming, and Lucide React icons.
* **Known pain points (if any):** High client-side resource usage due to video frame canvas extraction and constant POST frame-by-frame processing; fallback SWR polling when SSE streams disconnect or are unstable; lack of visual historical analytics (charts/trends) beyond list logs.
* **Business goals the dashboard supports:** Enable security personnel to receive real-time watchlist match notifications and weapon/gun alerts within 2 seconds of detection, search historical license plate events across multiple cameras under 5 seconds, and track/manage registered persons of interest.

#### Audit instructions
Walk through the dashboard systematically and evaluate it against each of the following seven areas. For each area, provide:
1.  A **summary rating** (*Strong / Adequate / Needs Improvement / Critical Issue*)
2.  Specific **observations** with examples
3.  Concrete **recommendations**

##### 1. Data & Content Relevance
* Do the displayed metrics map directly to the stated business goals and user needs, or is there mismatch/clutter?
* Is data accuracy verifiable — are there any numbers that look implausible, stale, or inconsistent across widgets?
* Is there a clear visual hierarchy (most important metrics most prominent)?
* Does the dashboard support drill-down from summary to detail where users would need it?
* How current is the data, and is the refresh cadence appropriate for the decisions it supports?

##### 2. Visualization & Layout
* Are chart types appropriate for the underlying data (e.g., trends in line charts, comparisons in bar charts, proportions used sparingly)?
* Is the layout following a logical scan pattern, with related information grouped?
* Is there consistent use of color, typography, and spacing? Does color carry meaningful semantic weight (e.g., red = bad) without overuse?
* Is the dashboard cluttered, sparse, or well-balanced in information density?

##### 3. Usability & Interactivity
* How intuitive is navigation for a first-time user? Note any points of confusion.
* Are filtering, search, and sorting functional and discoverable?
* Do interactive elements (tooltips, hover states, expandable panels) add genuine value?
* Is the dashboard responsive across screen sizes (desktop, tablet, mobile)? Note specific breakpoints that break layout.
* Accessibility check: color contrast ratios, keyboard navigation, screen-reader compatibility (note any WCAG violations you can identify).

##### 4. Performance
* Measure or estimate initial load time and time-to-interactive.
* Identify any visible lag when filtering, switching views, or loading large datasets.
* Note any signs of inefficient data fetching (e.g., redundant API calls, lack of caching, no pagination/virtualization on large tables).
* Test behavior on a throttled/slow connection if possible.

##### 5. Security & Access Control
* Is authentication required, and does it follow reasonable standards (no obvious vulnerabilities visible from the outside)?
* Is there evidence of role-based access control (different users seeing appropriately different data)?
* Is data transmitted over HTTPS? Are there any exposed API endpoints returning more data than the UI displays?
* Note any visible audit logging or session management issues.

##### 6. Scalability & Maintainability *(assess from observable behavior and any available technical documentation)*
* Does the dashboard show signs of strain with larger datasets or more concurrent widgets?
* Is the architecture modular enough to suggest new widgets/data sources could be added without a major rebuild (infer from consistency of component patterns)?
* Is there documentation, changelog, or versioning visible that suggests maintainability?

##### 7. Feedback & Iteration Mechanisms
* Is there any built-in way for users to give feedback, report issues, or request features?
* Is there evidence of usage analytics or A/B testing on the dashboard itself?

#### Output format
Structure your final audit as:
1.  **Executive Summary** (5-8 sentences: overall health, top 3 strengths, top 3 risks)
2.  **Findings by Category** (the seven sections above, each with rating + observations + recommendations)
3.  **Prioritized Action List** (ranked by impact vs. effort — Critical/High/Medium/Low)
4.  **Open Questions** (anything you couldn't assess without more access, e.g., backend code, server logs, or user research data)

**Be direct about severity** — don't soften critical issues (e.g., exposed sensitive data, broken access control) to be diplomatic. Flag anything that looks like a security risk immediately and separately, even before completing the full audit.