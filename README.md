<div align="center">

<a href="https://kobrymoataz.github.io/kobrymoataz/"><img src="./assets/banners/hero.gif" width="100%" alt="Moataz Kobry - Computing, AI automation, cybersecurity and digital platforms" /></a>

**Computing · AI Automation · Cybersecurity · Digital Platforms**

[Portfolio](https://kobrymoataz.github.io/kobrymoataz/) · [TrustOps Studio](https://kobrymoataz.github.io/kobrymoataz/?trustops=1) · [Request CV](mailto:president@mycdic.org?subject=CV%20Request%20-%20Moataz%20Kobry&body=Hello%20Moataz%2C%0A%0AI%20would%20like%20to%20request%20your%20CV.%0A%0AName%3A%0AOrganization%3A%0APurpose%3A%0A) · [LinkedIn](https://www.linkedin.com/in/kobrymoataz/) · [Instagram](https://www.instagram.com/kobrymoataz/) · [Email](mailto:president@mycdic.org)

</div>

### Profile

I'm **Abdelmouiz (Moataz) Kobry**. I build practical software, automation and digital systems, drawing on hands-on development experience since **2016** and work across **100+ websites and digital projects**.

I study **Computing at UCLM's Escuela Superior de Informática (ESI)**, with an interest in AI and automation. Beyond my academic work, I lead digital initiatives collaboratively with teams at **MYCDIC** and **Trendad**, including the public MYCDIC website and work on an internal institutional management environment. I am **Founder & President of MYCDIC**.

### Selected engineering work

These public repositories are open to inspect. They show code, design decisions and limitations rather than relying on claims alone.

| Repository | Focus | Explore |
| :--- | :--- | :--- |
| **RepoVerity** | Public GitHub metadata research, repository audit and developer workflows | [Source](https://github.com/kobrymoataz/repoverity) · [Demo](https://kobrymoataz.github.io/repoverity/) |
| **SubmissionLedger** | Reliable intake, idempotency, a SQLite outbox and signed webhook delivery | [Source and documentation](https://github.com/kobrymoataz/submissionledger) |
| **FlowFault** | Form inspection and controlled, authorized network-failure experiments | [Source and documentation](https://github.com/kobrymoataz/flowfault) |

### Institutional digital systems

Working with MYCDIC and Trendad colleagues, I help lead delivery of official websites and operational platforms. The aim is to make information, processes, verification, documents and communication work together in dependable systems.

[MYCDIC public website](https://www.mycdic.org/) · [Institutional profile](https://www.mycdic.org/president/)

Internal records and private administrative interfaces are not published. The [portfolio website](https://kobrymoataz.github.io/kobrymoataz/) includes distinct, responsibly labeled technical illustrations and an **Advanced Engineering Studio**, developed across V27 and V28: self-hosted terminal and code editor, runnable sandboxed JavaScript tests, SHA-1-addressed local Git objects, saved files, and stateful workflows. Python and SQLite WebAssembly panels load on demand. macOS and Ubuntu are interface styles, not actual operating systems.



### V32.1 · Systems Operations Console

**New local systems analysis hub:** The Systems Console imports JSON exports from TrustOps DNS Audit, RepoVerity Repository Audit and the redacted Automation Evidence Pack. It normalizes **only target identifiers, timestamps, coverage status, counts and non-sensitive finding states**. Raw report contents, node parameters, credentials, evidence payloads, URLs and descriptions are never copied to its history. Importing an export is not independent verification.

Visitors can compare two DNS snapshots from the same domain, two repository snapshots from the same `owner/repo`, or two redacted Automation Evidence Packs. Automation packs have no stable workflow identity and comparisons explicitly warn when fingerprints differ. Numeric changes and state transitions are reported neutrally; a lower warning count is not proof that a system is secure. Deterministic next-step suggestions are based on observed categories, not simulated monitoring.

**Direct handoff:** When a public DNS scan, repository audit, or redacted Automation Evidence Pack has been generated, a new *Add to Systems Console* action passes that report to the normalizer in browser memory. Users may also import up to 10 JSON files at a time (2 MB per file). History is capped at 24 sanitized summaries, and **persists only when the user explicitly presses Save**. Clear history removes the persisted copy. Exported comparisons contain only normalized results. This functionality is fully static and requires no API secrets.

### V32.0 · Executive Engineering Experience

This release consolidates the portfolio's main tools into a single, task-oriented **Engineering Tools** gateway. It preserves TrustOps public DNS/repository research, the n8n Automation Reliability Studio and the Advanced Engineering Studio without inventing shared backends or silently changing their execution scope. The older embedded terminal and file workspace remain available in an explicitly expandable *classic practice sandbox*.

The desktop and mobile experience uses refined black/bronze typography, lower visual density, a simplified five-link navigation, clearly labeled studio entry points, a six-item featured toolkit with access to all 18 technologies, and a copy-email option. The public GitHub evidence panel is now localized separately from the workflow security evidence inspector; their headings no longer overwrite one another. The full portfolio still supports EN / FR / ES / AR including Arabic RTL.

**Integrity:** All prior tests and public source links are retained. GitHub Pages stays on `main /docs`. Browser-local operations do not execute commands on the visitor's computer. The contact form still opens the visitor's email app and does not silently send messages. V32 does not introduce a server or claim private repository access.

### V32.3 · Executive Interface Refinement

The landing page has a refined offline-capable visual layer while retaining the same source-backed engineering tools. Changes include improved navigation, typography, hero hierarchy, portrait framing, project cards, tool process descriptions, and responsive English, French, Spanish, and Arabic layouts. No artificial numbers, live telemetry, or new backend services were introduced.

**Keyboard navigation:** use `Cmd+K` on macOS or `Ctrl+K` on Windows/Linux, or activate the navigation icon in the header. Search pages and open existing TrustOps, Automation Studio, Engineering Studio, and Systems Console controls. The dialog supports arrow keys, Enter, Escape, and managed keyboard focus. It uses no external search service and stores no searches.

**Limits:** this is a design and navigation upgrade, not proof that all tool APIs, WebGL, or cross-browser behavior are operational in production. The existing scope and privacy limitations of each tool still apply.

### V31.1 · Professional Refinement

V31.1 keeps the browser-local Automation Reliability Studio and previous tools, while improving usability and initial loading performance. **Advanced Engineering Studio editor and terminal libraries are fetched on demand**, not during initial landing-page load. The n8n workflow inspector adds searchable nodes, undo/redo, safe edit-discard prompts, keyboard navigation and responsive controls. The local static inspector does not execute n8n workflows.

### V31.0 · Automation Reliability Studio

**New public, browser-local tool:** [Open Automation Studio](https://kobrymoataz.github.io/kobrymoataz/?automation=1). Import a real n8n workflow JSON (up to 2 MB and 320 nodes), inspect the actual connection graph, review explainable static findings, modify supported retry/error-continuation options in a bounded local editor and rerun the analysis. Export the edited workflow JSON, a redacted JSON audit report or a printable HTML report. The original file remains untouched unless you explicitly export an edited copy.

**Incident evidence:** An optional separate n8n execution JSON containing `resultData.runData` can be inspected for node timings and explicit error categories. Raw workflow run inputs/outputs and stack traces are intentionally excluded from the summary. No workflow is executed, replayed, scheduled, sent to n8n, or connected to a production system.

**Related tools:** TrustOps DNS audit (V30.1), RepoVerity public repository evidence (V30.2), the Functional Engineering Studio (V27), interactive workflow/observability (V28), and geographic perspective (V29) are all retained. The Automation Studio can open the repository audit directly. It runs on static GitHub Pages without secrets or backend credentials.

**Boundaries:** Static inspections are heuristics, not complete security scans. Custom nodes, downstream access controls, credentials, actual retry safety, private state and operational reliability cannot be verified from workflow JSON alone. Imported/exported workflow files may contain confidential values; users must review them before sharing. The included sample is labeled clearly and is never presented as live evidence.

### V30.2 · TrustOps Studio — Free Public DNS Audit

[**Open TrustOps Studio**](https://kobrymoataz.github.io/kobrymoataz/?trustops=1) · [Explore the DNS engine source](https://github.com/kobrymoataz/kobrymoataz/blob/main/docs/trustops-core.mjs)

A free, **read-only, real-data** DNS diagnostic integrated into my portfolio. Visitors enter a domain and an optional DKIM selector; TrustOps retrieves live DNS answers with **Cloudflare 1.1.1.1 or Google Public DNS-over-HTTPS**, then provides explainable findings and evidence files.

- SPF: single/duplicate policies, unsafe `+all`, direct lookup terms and a **bounded advisory** on nested include/redirect lookups (not a full RFC 7208 SPF evaluation).
- DMARC: policy validation, monitoring/enforcement state, `pct` sampling and reporting tag presence. Exact-name query only; organizational-domain inheritance is not assessed.
- MX and NS/A: public mail routing and baseline DNS signals; handles intentional Null MX.
- DKIM: optional selector-based key lookup and CNAME follow-up; **does not verify an actual signed message**.
- Optional MTA-STS / TLS-RPT DNS signals; does not inspect HTTPS policy files or negotiate SMTP TLS.
- **Evidence-first results:** source resolver, record names, timestamps, TTL, raw DNS values, uncertainty and actionable recommendations.
- **Local exports:** JSON and standalone printable HTML reports; no account, credential handling or server-side collection of scan history.

The browser sends public DNS queries to the selected resolver; if it fails, it may try the other resolver. Resolver operators may retain query logs. This tool does **not** send email, perform live SMTP or prove Inbox delivery, DKIM signatures, DMARC alignment, or complete domain security. DNS failures are marked **unverified**, never silently passed. The GitHub Pages site is static; no backend is required for its read-only DNS-over-HTTPS queries, subject to browser/network/CORS support.

Implementation: [`docs/trustops-core.mjs`](docs/trustops-core.mjs), [`docs/trustops.js`](docs/trustops.js), [`docs/trustops.css`](docs/trustops.css). Regression suite: `node scripts/test_trustops_v30.mjs`.

### Engineering toolkit

<div align="center">
  <img src="./assets/logos/javascript.svg" width="35" height="35" alt="JavaScript" /> &nbsp;
  <img src="./assets/logos/python.svg" width="35" height="35" alt="Python" /> &nbsp;
  <img src="./assets/logos/java.svg" width="35" height="35" alt="Java" /> &nbsp;
  <img src="./assets/logos/php.svg" width="35" height="35" alt="PHP" /> &nbsp;
  <img src="./assets/logos/react.svg" width="35" height="35" alt="React" /> &nbsp;
  <img src="./assets/logos/nodejs.svg" width="35" height="35" alt="Node.js" /> &nbsp;
  <img src="./assets/logos/postgresql.svg" width="35" height="35" alt="PostgreSQL" /> &nbsp;
  <img src="./assets/logos/mongodb.svg" width="35" height="35" alt="MongoDB" /> &nbsp;
  <img src="./assets/logos/n8n.svg" width="35" height="35" alt="n8n" /> &nbsp;
  <img src="./assets/logos/github.svg" width="35" height="35" alt="GitHub" />
</div>

**Languages & frameworks:** JavaScript, TypeScript, Python, Java, PHP, React, React Native and Node.js.

**Data & automation:** PostgreSQL, MongoDB, Firebase, n8n, Google Apps Script, Google Workspace and Microsoft 365.

**Infrastructure & communication:** Git/GitHub, GitHub Actions, APIs, email deliverability, DNS, SPF, DKIM, DMARC and security-aware configuration.

**Additional work:** Wikipedia, Wikimedia, Wikidata, institutional digital visibility and media-oriented technical work.

### Working languages

**Arabic · English · French · Spanish**. The [portfolio](https://kobrymoataz.github.io/kobrymoataz/) offers EN / FR / ES / AR, including an Arabic RTL layout.

### Connect

[GitHub](https://github.com/kobrymoataz) · [LinkedIn](https://www.linkedin.com/in/kobrymoataz/) · [Instagram](https://www.instagram.com/kobrymoataz/) · [Request CV by email](mailto:president@mycdic.org?subject=CV%20Request%20-%20Moataz%20Kobry&body=Hello%20Moataz%2C%0A%0AI%20would%20like%20to%20request%20your%20CV.%0A%0AName%3A%0AOrganization%3A%0APurpose%3A%0A)

<p align="center"><sub>Engineering work is best understood through working code, clear documentation, and the people behind the systems.</sub></p>

> The Engineering Studio performs local file operations and executable JavaScript tests. V28 produces Git-format SHA-1 blob/tree/commit objects locally but does not provide a full Git CLI, working tree on your computer, or remote pushes. No private systems are connected.

### V28 · Workflow & Observability Studio

The portfolio now contains a visually editable workflow with browser-local execution and measurable results. Open the **Workflow designer** tab in the full-screen studio to move stage positions, bypass optional steps, adjust retry policy and inspect individual jobs. This is a controlled engineering lab, not a connected institutional system.


[Open the portfolio and select **Open Advanced Engineering Studio**](https://kobrymoataz.github.io/kobrymoataz/#lab).

**Core browser-local features** (self-hosted dependencies; no CDN required):

- **xterm.js-based terminal**: file commands, staged changes, Git-format SHA-1 blob/tree/commit object creation, and real local workflow jobs. These are limited supported commands, **not** Bash, zsh, Docker, SSH, or a host operating system.
- **CodeMirror 5 editor**: JavaScript/JSON/Python/SQL syntax highlighting, line numbers, saving and recovery from local IndexedDB.
- **Executable JavaScript test runner**: changes to `src/handler.js` affect results of `tests/handler.test.js`; runs in a sandboxed opaque-origin iframe with a timeout and blocked network connections.
- **Interactive Workflow Designer V28**: six connected stages with draggable positions, selectable stage properties, toggles for optional stages, configurable retry budget/backoff, and live execution-order links. Changes to stage order and enabled stages affect **future jobs**; jobs already queued keep their original saved snapshots.
- **Job queue and traces**: normal, retry, invalid-input, human-review and exhausted-retry cases; pause/resume/cancel/approve/replay actions, persisted local outbox/dead-letter JSON, measured durations, live event log, per-job JSON trace export and metrics derived from the actual run state. **A successful local acknowledgement is not an external webhook or email delivery.**
- **Import / export**: JSON backup, restore and reset; browser storage may be unavailable in private mode or subject to browser eviction.

**On-demand runtimes** (require network to load, and are not included in the ZIP):

- **SQLite** through sql.js WebAssembly: executes real SQL and saves the database in the browser after each query.
- **Python** through Pyodide WebAssembly: executes editable Python inside a Worker, with a timeout. Download may fail if the CDN is blocked.

Try in the studio terminal:

```text
git status
git add .
git commit -m "Initial project"
npm test
flow graph
flow config retryLimit 1
workflow run retry
workflow run review
workflow jobs
workflow trace JOB-0001
edit src/handler.js
```

For repository code, see `docs/studio-engine.js`, `docs/studio-flow-engine.js`, `docs/studio-flow-ui.js`, `docs/studio.js` and `docs/studio-flow.css`. For test limitations see `QA_REPORT.md` in the release ZIP.

### V29 · Global Perspective & Public Evidence

The [Global Perspective](https://kobrymoataz.github.io/kobrymoataz/#perspective) section now provides **two genuine interactive views**. The self-hosted **WebGL1 globe** supports drag/touch/keyboard rotation, zoom, sunlight-to-dusk shading and conceptual connections. Where WebGL is blocked or unavailable, a geographic **regional atlas remains interactive**, with selectable location pins and public reference links for Madrid, Rabat, Brussels and Ciudad Real. The location markers indicate professional and educational context, never live operations or travel.

Below Selected Work, **public GitHub repository metadata** can be loaded directly from GitHub's public API, showing actual stars and the last GitHub update date when the API is available. It uses no access token and avoids substituting invented statistics if the API is unavailable.

The existing V28 engineering studio, README artwork, four-language content and private **Request CV** action remain.


## V30.2 — Repository Intelligence

TrustOps now supports two read-only audit modes:
- **DNS and email:** existing SPF/DMARC/DKIM/MX evidence.
- **Public GitHub repository:** repository metadata, CI workflows, security policy and governance files, GitHub releases, optional OpenSSF Scorecard, and an OSV advisory lookup for exact pinned versions in root `package-lock.json` or `requirements.txt`.

**Coverage warning:** V30.2 does not access private settings or secrets and is not a vulnerability scan of the whole codebase. OSV analysis is intentionally capped at 20 exact dependencies from supported manifests. Rate limits, browser CORS policies, and unavailable providers are reported as unknown rather than guessed.

Launch repository audit with `?trustops=repo`.


### V31.2 · Security & Evidence Pack

Inside the [Automation Reliability Studio](https://kobrymoataz.github.io/kobrymoataz/?automation=1), users can inspect explicit HTTP transport/TLS/retry configuration risks, compare finding changes with the original imported workflow, and export a sanitized SHA-256-fingerprinted evidence pack. They can optionally attach summary-only JSON evidence exported from TrustOps DNS or RepoVerity public repository tools. Everything is processed locally in the browser, and imported evidence is never silently described as live verification.

Source: [`docs/security-evidence-core.mjs`](./docs/security-evidence-core.mjs). Regression: `node scripts/test_security_evidence_v31_2.mjs`. **This is configuration review, not credential inspection, live execution, vulnerability assessment, or security certification.**


### V32.2 | Systems Incident Casebook & Recovery

The [Systems Console](https://kobrymoataz.github.io/kobrymoataz/?systems=1) now offers a diagnostic timeline of matching imported inspections and a browser-local follow-up casebook. Reviewers can open a case from a sanitized snapshot, manually select status and priority, then explicitly save, export or restore the versioned casebook. Old V32.1 sanitized saved history is migrated in-memory until the user chooses Save. Raw report payloads and user-written notes are not retained. This is **not** a live incident monitoring service and closing a follow-up does not establish that a security issue is resolved.

Offline checks: `node scripts/test_incidents_v32_2.mjs`; optional Chromium inline QA: `python3 scripts/qa_incidents_v32_2_browser.py`.
