<div align="center">

<a href="https://kobrymoataz.github.io/kobrymoataz/"><img src="./assets/banners/hero.gif" width="100%" alt="Moataz Kobry - Computing, AI automation, cybersecurity and digital platforms" /></a>

**Computing · AI Automation · Cybersecurity · Digital Platforms**

[Portfolio](https://kobrymoataz.github.io/kobrymoataz/) · [Request CV](mailto:president@mycdic.org?subject=CV%20Request%20-%20Moataz%20Kobry&body=Hello%20Moataz%2C%0A%0AI%20would%20like%20to%20request%20your%20CV.%0A%0AName%3A%0AOrganization%3A%0APurpose%3A%0A) · [LinkedIn](https://www.linkedin.com/in/kobrymoataz/) · [Instagram](https://www.instagram.com/kobrymoataz/) · [Email](mailto:president@mycdic.org)

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

Internal records and private administrative interfaces are not published. The [portfolio website](https://kobrymoataz.github.io/kobrymoataz/) includes distinct, responsibly labeled technical illustrations and an **V27 Functional Engineering Studio**: self-hosted terminal and code editor, runnable sandboxed JavaScript tests, SHA-1-addressed local Git objects, saved files, and stateful workflows. Python and SQLite WebAssembly panels load on demand. macOS and Ubuntu are interface styles, not actual operating systems.

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

> The Engineering Studio performs local file operations and executable JavaScript tests. V27 produces Git-format SHA-1 blob/tree/commit objects locally but does not provide a full Git CLI, working tree on your computer, or remote pushes. No private systems are connected.

### V27 · Functional Engineering Studio

[Open the portfolio and select **Open Functional Engineering Studio**](https://kobrymoataz.github.io/kobrymoataz/#lab).

**Core browser-local features** (self-hosted dependencies; no CDN required):

- **xterm.js-based terminal**: file commands, staged changes, Git-format SHA-1 blob/tree/commit object creation, and real local workflow jobs. These are limited supported commands, **not** Bash, zsh, Docker, SSH, or a host operating system.
- **CodeMirror 5 editor**: JavaScript/JSON/Python/SQL syntax highlighting, line numbers, saving and recovery from local IndexedDB.
- **Executable JavaScript test runner**: changes to `src/handler.js` affect results of `tests/handler.test.js`; runs in a sandboxed opaque-origin iframe with a timeout and blocked network connections.
- **Workflow engine**: normal/retry/missing/review scenarios read saved `config.json` and `data/request.json`, create job records, and calculate retries. **No external webhooks or emails are sent.**
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
workflow run retry
workflow jobs
workflow logs
edit src/handler.js
```

For repository code, see `docs/studio-engine.js`, `docs/studio.js` and `docs/studio.css`. For test limitations see `QA_REPORT.md` in the release ZIP.
