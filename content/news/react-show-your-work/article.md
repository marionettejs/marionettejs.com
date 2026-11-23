Marionette 5 is a JavaScript UI framework for composing views, and it no longer requires Backbone. The [keyed-table results](https://krausest.github.io/js-framework-benchmark/2026/chrome158.html) tested Marionette 5.1.0 both without Backbone and with it. The native entry scored 1.30 on weighted CPU performance versus 1.55 for both React entries. The Backbone entry scored 1.32.

## Speed

| Test | Marionette | Marionette with Backbone | React Hooks | React Class |
| --- | ---: | ---: | ---: | ---: |
| Weighted CPU score | **1.30** | 1.32 | 1.55 | 1.55 |
| Create 1,000 rows | 26.3 ms | 28.2 ms | **24.6 ms** | 25.0 ms |
| Append 1,000 rows | 28.9 ms | 31.4 ms | **28.0 ms** | 28.4 ms |
| Create 10,000 rows | **254.0 ms** | 277.5 ms | 341.6 ms | 344.2 ms |
| Swap two rows | 12.1 ms | **11.5 ms** | 87.4 ms | 86.4 ms |

React wins the initial 1,000-row create and the append test; React Hooks leads native Marionette by 1.7 ms and 0.9 ms, respectively. The gap goes the other way on the 10,000-row create and the row swap: Marionette creates 10,000 rows about 88 ms faster and swaps two rows in less than one-seventh of the time React Hooks takes. The Backbone entry swaps those rows a little faster than our native one (it swaps the model slots directly and is flagged by the benchmark for hand-tuned DOM updates; see [#772](https://github.com/krausest/js-framework-benchmark/issues/772)).

<!-- benchmark:timing -->

The weighted CPU score is a weighted geometric mean of relative timings, not a percentage speedup for your app. Svelte scores 1.18 and Vue 1.28, ahead of both Marionette entries. Preact Classes ties native Marionette at 1.30.

## Memory

| Test | Marionette | Marionette with Backbone | React Hooks | React Class |
| --- | ---: | ---: | ---: | ---: |
| After page load | **0.77 MB** | 0.90 MB | 1.18 MB | 1.19 MB |
| After adding 1,000 rows | 3.65 MB | **3.21 MB** | 4.39 MB | 4.50 MB |
| After five create/clear cycles | **1.22 MB** | 1.28 MB | 1.95 MB | 1.94 MB |

After five create-and-clear cycles, native Marionette uses 37% less memory than React Hooks. Both Marionette entries also have lower geometric means than Vue (1.80 and 1.84 versus 1.91), though Vue uses slightly less after those cycles and loads with less memory than the Backbone entry.

<!-- benchmark:memory -->

## Code shipped

| Test | Marionette | Marionette with Backbone | React Hooks | React Class |
| --- | ---: | ---: | ---: | ---: |
| Brotli-compressed implementation size | **18.4 kB** | 26.9 kB | 51.4 kB | 50.2 kB |
| First paint | **91.8 ms** | 118.0 ms | 228.9 ms | 224.1 ms |

Native Marionette ships about 64% less compressed code than React Hooks. Vue’s 23.3 kB sits between the two Marionette entries. These sizes exclude CSS and HTTP headers. First paint is a separate measurement: native Marionette is slightly ahead of Vue’s 94.8 ms, and both Marionette entries paint sooner than either React entry.

<!-- benchmark:transfer -->

## Now bring in the agent

The browser result stands on its own. The next argument for choosing React is that coding agents know it better. They’ve certainly seen plenty of it. But what do they actually ship when you give them the same job?

[Nolan Lawson gave coding agents a Pokémon app to build](https://nolanlawson.com/2026/10/28/the-ai-cost-of-javascript-frameworks/) and measured what they spent and what they shipped. Marionette wasn’t in his original comparison. [We ran his task with Codex](/news/ai-cost-of-marionette/), four independent builds per stack. Each retained app passed the same 54 acceptance checks.

Marionette used a median **1.12 million tokens** to React Router’s **1.51 million**, about 26% fewer. The median generation times were **5.07 and 5.55 minutes**, with overlapping ranges. The home page transferred **25.6 KiB of JavaScript on Marionette and 115.7 KiB on React Router**.

[See the builds and the full results.](https://github.com/marionettejs/agent-framework-benchmark/tree/results/codex-2026-11/results/2026-11-codex)

## The long haul

React won the adoption race, and a lot of developers who’d built with Marionette moved on. [Alex Russell’s “lost decade”](https://www.youtube.com/watch?v=0XwWVjQOmyg) is a useful reminder to ask what users got out of all that change.

If you moved on from Marionette when React took over, here’s what changed: Backbone is optional now. What held up is the way Marionette lets you change one part of the app without disturbing the rest. A list can update in its own view while the editor beside it keeps the draft someone is typing. You can read the list code to see why the list changed.

Marionette 5 kept that structure, and in this benchmark it asked less of the browser than React. That’s what we want React to compete on: what the browser has to do today, how easily an agent can make the next change, and whether your team can still follow the code five years from now.

## Try something you’d normally skip

The browser results give Marionette a reason to be on your shortlist. Agents make it easier to find out whether it belongs there. You can try an unfamiliar stack on a real feature before asking your team to learn it or betting a project on it.

Next time you prototype a feature, give your agent the [Marionette guide](/docs/agent-start/) and see what it builds. Read the code. Try it on the phone your users are likely to have. If Marionette loses, tell us where.
