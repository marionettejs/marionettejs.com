# RoundingWell worklist evidence

These are preserved measurements from September 23, 2026 (Asia/Seoul), not a new
benchmark of the final migration or RC2. The public article uses the 500-row
editable-action mount/filter/destroy and editable-flow reverse rows from
[summary.csv](summary.csv), rounding medians and percentage changes to one decimal.

- [provenance.json](provenance.json): source revisions, runtime versions, snapshot status, and SHA-256 file hashes.
- [summary.csv](summary.csv): all 92 comparisons, medians, p90s, exploratory 95% ranges, and operation/layout breakdowns.
- [results.json](results.json): 270 measured sequences at 100, 500, and 1,000 rows.
- [results-5000.json](results-5000.json): 90 measured sequences at 5,000 rows.
- [Browser capture](../worklist-benchmark.png): the beta.6 editable-action list with synthetic data, captured outside the timing run.

The three data files are byte-identical copies of the original final benchmark
artifacts, checked against its preserved SHA-256 manifest. The incomplete-style
pilot measurements are excluded. Files are preserved evidence, not a standalone
executable reproduction kit.

## Reading the measurements

The browser workload imports the actual application setup, ListView, action/flow
row Views, templates, nested controls, styles, and fonts. Each detached branch
uses its own lockfile. Synthetic models and fixed bootstrap replies exclude real
patient data, network time, parsing, permission calculation, controllers, and the
full application shell. Both branches use Backbone 1.6.1. Framework, adapter,
Toolkit, jQuery, and application differences are not independently isolated.

Each configuration has two discarded warmup pairs and 15 measured pairs in
alternating branch order on persistent per-branch pages. The 5,000-row block runs
after the smaller sizes. No outliers are removed. Trials mount the list, update
10% of titles, reverse its order, filter out half the rows, clear the filter,
select editable row controls, highlight one patient, and destroy the list.
Assertions cover counts, content, order, controls, highlighting, empty teardown,
and model handlers with destroyed View contexts. They do not prove full product
acceptance or leak-free operation.

The `total` metric adds operation wall time (`js`) to pending style/layout
forced by reading `document.body.offsetHeight`. The `js` field includes DOM calls,
any internally forced layout, and garbage collection; it is not sampled CPU time.
The `frame` field retains elapsed time across two animation frames, not a paint
timestamp. Work occurs on an unthrottled shared Apple M2 Pro workstation with
16 GiB RAM and headless Chrome 153.0.8010.53 at 1440 × 1000. Builds are minified;
coverage, debug mode, and service workers are off. Fonts and global styles are
loaded before timing. Caches are warm.

Summary ranges use a deterministic 3,000-resample paired bootstrap of the ratio
of medians. They are exploratory, are not corrected for multiple comparisons,
and cannot capture hardware or production variability. Lower total times are
better; positive change percentages are slower. Independent operation and layout
medians need not sum exactly to the median total. The 500-flow reverse-order
slowdown has an exploratory range of +2.0% to +9.0%.

The 1,000- and 5,000-row cases are stress tests, not claims about API limits or
ordinary user workloads. Cold startup, full navigation, mobile responsiveness,
backend latency, dropdowns, sidebar data loading, and memory retention were not
measured. The case-study authoring checks validate the preserved evidence and
website presentation; they do not rerun the benchmark or application test suites.
