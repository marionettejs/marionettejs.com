# Library reading-copy sync

The library sends `library-docs-changed` after relevant pushes to `master`. The
website receiver reads current `master` Git objects (including history), not an
event payload or a library build. It changes only
`content/docs-publication-edits.json`. One branch, `automation/library-docs-sync`,
coalesces pending changes into one ready PR. No polling, second importer, automatic
merge, npm publication, or deployment is involved.

## Setup and permissions

1. Merge the website implementation first. Both workflows must be on their default
   branches. Keep GitHub Actions enabled and allow the pinned official checkout,
   setup-node, upload-artifact and download-artifact actions.
2. Create a fine-grained token restricted to **marionettejs/marionettejs.com** with
   **Contents: write** and **Pull requests: write**. Save it only as website Actions
   secret `DOCS_SYNC_PR_TOKEN`. Contents is needed to create the branch/commits and
   Pull requests to create/update the PR. No Workflows, Actions write, Packages,
   Pages, deployment, administration, or branch-protection bypass permission is
   needed. Restrict the credential owner to an automation account where possible.
3. Create a separate fine-grained token restricted to that same website repository
   with **Contents: write only**, and save it in the library as
   `WEBSITE_DOCS_DISPATCH_TOKEN`. GitHub requires Contents write for repository
   dispatch. Never put token values in workflow files, logs, PR bodies, or reports.
   Approve organization token access if required, set expirations, and rotate both
   secrets before expiry. The receiver's read-only default `GITHUB_TOKEN` cannot
   create PRs; the explicit token also allows normal PR CI to run.
4. Merge the library sender. Run **Request website documentation sync** manually
   once to verify delivery. The website **Sync library reading copies** manual
   trigger retries the same workflow without a dispatch. Inspect its run and PR;
   neither a local test nor creating secrets proves hosted delivery works.
5. Keep `main` protected with required review and the existing website `verify`
   check. Require at least one approving review if review must be enforced by GitHub
   (the inspected ruleset currently requires PRs and `verify` but zero approvals).
   Permit the automation account to create/update its non-protected branch
   and PR, without bypassing `main`. Enable automatic deletion of merged PR branches
   or delete the completed sync branch manually. Do not enable auto-merge. Keep
   Cloudflare Git auto-build/deploy integrations disabled; the shared publish
   workflow deploys the reviewed site and MCP together after merge.

Permission reference: [GitHub repository dispatch](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event)
and [GitHub App permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app).

## Reconciliation and provenance

Each archived page is compared with its last recorded library source revision,
or the archive revision for a page never synced. A three-way merge combines the
previous source, website reading copy, and incoming source. Successful updates
replace that page's sequential edits with one complete archive-to-reading edit,
including the exact incoming commit, source SHA-256 and reading SHA-256. Existing
wording and manual edits are retained when non-conflicting. Overlapping edits,
missing sources, ambiguous replacement text, divergent source history, or changed
navigation stop the run. They are not silently overwritten or imported as a release.

Navigation additions, removals, titles and routes require an explicit website
presentation change before automation can proceed. This workflow synchronizes the
existing public reading copies, not route topology or diagnostic assets. Review
navigation changes together with the website's page selection; do not advance the
npm archive merely to clear this guard. Record the adopted exact library commit in `navigationRevision` in the publication
file after implementing and validating the corresponding website route changes.
Until that review lands, sync is blocked.

A pending branch is read as data and merged with current website publication edits;
its code is never checked out or executed. Other file changes on that branch stop
the run. Website and library checkouts remain read-only to the preparation job's
GitHub credential. The write credential exists only in a separate publish job
which consumes the same run's validated artifact. Ref checks plus non-force updates
reject competing writers. A moved website base detected at preflight or immediately before the branch write
causes a retry. GitHub does not atomically compare `main` and update another ref;
the existing required up-to-date PR checks cover the remaining race window. Concurrency is
serialized; canceled pending dispatches are harmless because every run reads the
current library head. There is no arbitrary revision/URL input and no library code
execution with credentials.

No relevant byte changes cause no commit. A repeated successful run reuses the PR
without adding a commit. A push that succeeded before PR creation failed is
recoverable by rerunning; the existing branch becomes the one PR. When intentionally
closing an unmerged sync PR, delete its branch too, or a retry may reopen that work.

## Validation and failures

Run with Node 24 and a full local library clone:

```sh
npm ci
npm run docs:sync -- /absolute/path/to/library
npm run check
node scripts/check-agent-site.mjs --local --report output/agent-retrieval.json
node scripts/docs-sync/validate.mjs
```

Run this on a clean website implementation commit. The validator rejects changes
outside the publication file. `npm run check` tests rendered pages, local links and
fragments, source/content hashes, archive bytes, retrieval, and HTTP/stdio MCP parity.
The final gate compares every archived output and manifest, publication hash, each
website reading copy against its corpus entry, and the Worker snapshot's corpus
hash. Only then can a publish artifact exist. Missing credentials, conflicts,
failed tests or validation, and races fail the run without updating the PR branch.
Unchanged input still runs validation, so a broken build is never called successful.

Use `node --test test/docs-sync.test.mjs` for isolated Git history and mock GitHub
cases. These tests do not send dispatches, push branches, or deploy.

For a conflict, reproduce locally, review the three texts, and fix the publication
edit on the sync branch (or in a separate website PR). Record the exact source
revision incorporated and matching hashes; never fabricate provenance to skip a
conflict. Rerun after the fix. Inspect failed Actions logs for the diagnostic code;
no token body or API error response is printed. Validation failures need an actual
content or test-contract fix, not a bypass or an automatic merge.

## Explicit npm releases and reviewed deployment

Read the exact released source revision from the package's root
`docs-manifest.json`; canonical Markdown lives under `docs/`. The website runtime
and imported documentation must match that published artifact.

Check out the released source revision cleanly in the library and run
`npm run docs:export`. Import the complete consumer snapshot with
`npm run docs:import -- /path/to/released-source/.docs-export`. It includes the
selected diagnostic/schema, skill and records assets as well as Markdown. Import
through the manifest rather than copying a documentation directory; maintainer
and planning pages are outside this consumer corpus.

Before accepting the import, require `sourceDirty: false`, matching package
version, repository and revision, and identical metadata/bytes for every released
consumer page and asset. Review the complete manifest diff. Upgrade the pinned
core/data/radio/utils runtime packages together, rebuild both vendor bundles and
their provenance, and update workshop/export/recipe version assertions. See the
root README's published-archive gate and runtime-upgrade steps. A published status
requires matching installed registry-package evidence; changing the label alone
is insufficient. Review publication wording, archive hashes and diagnostic schema
provenance together. Rebase pending reading-copy edits deliberately against the
new archive and revalidate with `npm run check` and the workshop browser checks.

Ordinary reading-copy sync does not replace package archives or selected resource
assets. After a reviewed website PR merges, the shared workflow publishes Pages
and MCP; follow [the deployment runbook](../../mcp/DEPLOYMENT.md). Do not deploy
this candidate or update the hosted catalog outside that release process.

## Separately tracked guides

`content/library-docs` remains the exact npm archive. New reviewed guides live in
`content/supplemental-docs`, with route, title, section, exact framework source
revision and SHA-256 in its manifest. Copy sources from Git objects at that revision;
validate the resulting HTML, Markdown, navigation, search, discovery bundles and
MCP before adopting the framework navigation revision in publication metadata.
These guides join the same reading-copy sync; future source updates use each
guide’s recorded revision and publication overlays, without rewriting its base.
The served `/docs/supplemental-manifest.json` and per-document MCP metadata retain
this identity separately from the package archive and runtime revision.
