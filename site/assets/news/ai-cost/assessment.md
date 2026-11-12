# Marionette 5.1.0: assessment of four functioning applications

This assessment covers four completed Marionette 5.1.0 applications and four retained applications for each of five peer frameworks: Vanilla, React Router, SvelteKit, Nuxt and Angular. The application, rather than an individual Lighthouse sample, is the unit of comparison.

Each application passed the same 54 independent acceptance tests and has five Lighthouse samples for each of six mobile routes. The defined dataset contains **24 applications, 1,296 successful acceptance-case executions and 720 numeric Lighthouse samples**. These reuse one 54-case fixture; they are not 1,296 distinct requirements.

[Comparison definitions](#comparison-definitions) · [Route comparisons](#route-comparisons) · [Per-build results](#per-build-results) · [Versions and source size](#versions-and-source-size) · [Comparability](#comparability)

## Findings

Marionette’s median native-turn generation time was **304.1 seconds** [247.3–334.3]. In these samples, the recorded median was shorter than React Router, SvelteKit, Nuxt and Angular, and longer than Vanilla. This is a comparison of generated applications and agent work, not a causal estimate of framework development speed.

Its median home performance score was **96** [92–97], with LCP **1.88 seconds**, TBT **4.5 ms**, CLS **0.111** and JavaScript transfer **25.6 KiB**. JavaScript transfer was smaller than the framework peers and larger than Vanilla. The Pokémon route was a clear weakness: performance **75** [74–81] and median LCP **6.12 seconds** [4.41–6.36]. No overall framework ranking follows from the home page alone.

## Comparison definitions

- **Route statistics:** each application contributes its median of five samples. Tables show the median and [minimum–maximum] of four application medians. The 20 samples per framework/route are not treated as 20 independent builds.
- **Generation time:** `elapsed_seconds` from each completed native-session receipt, measured by the adapter’s monotonic timer immediately before `turn/start` through the root `turn/completed` notification. It includes agent tool work, documentation reads and self-tests within the turn. CLI startup, account/config/tooling preflight, post-turn checks, output drain/shutdown, independent acceptance and Lighthouse are excluded. The same field and boundary are used for all six frameworks. `finished_at` is recorded after shutdown, so subtracting the ISO receipt timestamps is not this timing metric.
- **Tokens:** final cumulative root-thread counters. Cached input is a subset of total input; uncached input is total minus cached. Reasoning output is retained as a detail and is not added again. Cache-write values are shown only as reported. Different columns’ medians are calculated independently and are not additive.
- **Accounting:** these are native usage measurements. Actual ChatGPT subscription/credit debits and provider request counts are unavailable. Tokens and tool invocations are not dollar charges or model-request counts; no API-equivalent dollar estimate is asserted. Child/root usage aggregation is not generalized beyond the retained counters.
- **Runtime:** performance and accessibility use a 0–100 scale. LCP/TBT are milliseconds; CLS is unitless. Lighthouse uses simulated mobile throttling; these are not unthrottled network timings. JavaScript transfer is measured network bytes, displayed as KiB (1 KiB = 1,024 bytes), not an uncompressed bundle-file estimate.

## Generation and acceptance

Entries are median [minimum–maximum] over four applications.

| Framework | Generation seconds | Acceptance | Input tokens | Cached input | Output tokens |
|---|---:|---:|---:|---:|---:|
| Marionette 5.1.0 with Vite | 304.1 [247.3–334.3] | 216/216 | 1,108,474 [982,101–1,373,295] | 1,051,008 [930,304–1,320,704] | 9,294.5 [8,459–9,932] |
| Vanilla | 279.6 [261.7–295.5] | 216/216 | 953,592.5 [895,291–1,048,456] | 912,768 [854,912–999,040] | 8,119.5 [7,430–8,686] |
| React Router | 332.9 [267.2–393.2] | 216/216 | 1,499,215 [916,148–1,849,272] | 1,445,248 [867,328–1,737,984] | 9,453 [7,908–9,794] |
| SvelteKit | 364.7 [320.1–431.2] | 216/216 | 1,809,258 [1,678,585–2,054,555] | 1,751,360 [1,559,552–1,987,072] | 10,131.5 [9,686–10,223] |
| Nuxt | 415.1 [270.9–435.7] | 216/216 | 2,134,232 [1,103,551–2,528,764] | 2,083,200 [1,058,560–2,474,880] | 10,461 [9,165–12,744] |
| Angular | 418.1 [352.7–480.7] | 216/216 | 1,667,469 [1,401,683–2,541,453] | 1,593,408 [1,337,984–2,467,200] | 13,715 [12,114–15,239] |

## Route comparisons

The six route columns appear in the same order throughout. All 144 application/route accessibility medians are **100**. This automated score does not establish complete accessibility or replace keyboard and assistive-technology review.

### Performance score

| Framework | Home | Filtered home | Pokémon | Move | Ability | Type |
|---|---:|---:|---:|---:|---:|---:|
| Marionette 5.1.0 with Vite | 96 [92–97] | 96 [92–97] | 75 [74–81] | 96 [95–97] | 96.5 [96–97] | 96.5 [96–97] |
| Vanilla | 92.5 [91–97] | 94.5 [91–97] | 94 [82–96] | 96.5 [95–97] | 97 [97–97] | 97 [97–97] |
| React Router | 98 [97–99] | 98.5 [98–99] | 87 [67–90] | 99.5 [98–100] | 99 [99–99] | 99 [99–99] |
| SvelteKit | 100 [100–100] | 100 [100–100] | 98 [72–98] | 99 [99–100] | 100 [100–100] | 100 [100–100] |
| Nuxt | 99 [97–99] | 99 [99–99] | 82.5 [69–97] | 95.5 [92–98] | 99.5 [99–100] | 98.5 [97–99] |
| Angular | 79 [73–93] | 95 [85–96] | 73.5 [49–80] | 73.5 [70–95] | 95.5 [95–96] | 83.5 [75–96] |

### LCP (ms)

| Framework | Home | Filtered home | Pokémon | Move | Ability | Type |
|---|---:|---:|---:|---:|---:|---:|
| Marionette 5.1.0 with Vite | 1,883.3 [1,865–1,893.8] | 1,891.4 [1,872.1–1,908.2] | 6,118.6 [4,410.6–6,360.8] | 1,903.2 [1,093.9–1,949.4] | 1,547.1 [1,098.2–1,994.8] | 1,874.8 [1,185.9–1,978.7] |
| Vanilla | 789.8 [773.1–848.3] | 801.1 [771.2–839.9] | 2,529.6 [2,294.9–4,275.3] | 800.6 [779–1,077.1] | 1,256.9 [804.8–2,014.6] | 801.2 [782.5–801.4] |
| React Router | 2,197.5 [2,117.2–2,236.1] | 2,112.1 [1,941.8–2,197.7] | 2,858.3 [2,842.2–2,999] | 1,360.5 [1,193.9–1,620.5] | 2,015.3 [1,989.6–2,058.5] | 1,904.3 [1,843.5–1,917.3] |
| SvelteKit | 1,685.9 [1,223–1,693.4] | 1,677.7 [1,150.6–1,687.3] | 2,286.3 [2,274.1–3,545.4] | 1,882.5 [1,148.7–1,968.1] | 1,682.6 [1,113.5–1,704.2] | 1,682.2 [1,092.1–1,749.6] |
| Nuxt | 2,003.5 [1,849.1–2,086.3] | 1,842.4 [1,608.1–1,983.9] | 3,679.9 [2,424.9–4,932.4] | 2,233.2 [2,144.7–2,251.5] | 1,754.8 [1,385.6–1,841.5] | 1,846.4 [1,822.8–1,996.7] |
| Angular | 1,646.3 [1,438.9–1,989.5] | 1,678.5 [1,426.6–1,979.2] | 4,949.9 [2,595.3–7,242.2] | 1,767.9 [1,427.6–2,261.8] | 1,483.4 [1,397.8–1,917.7] | 1,527.8 [1,406.7–1,981] |

### TBT (ms)

| Framework | Home | Filtered home | Pokémon | Move | Ability | Type |
|---|---:|---:|---:|---:|---:|---:|
| Marionette 5.1.0 with Vite | 4.5 [1–13] | 0 [0–0] | 37 [18–72] | 98 [55–137] | 0 [0–0] | 29 [15.5–29.5] |
| Vanilla | 0 [0–224] | 0 [0–4.5] | 0 [0–115] | 100.5 [53–160.5] | 0 [0–0] | 0 [0–9] |
| React Router | 5.5 [0.5–51] | 0 [0–12.5] | 287.1 [152.5–805.5] | 45.5 [43–54] | 0 [0–6] | 0 [0–0] |
| SvelteKit | 0 [0–0] | 0 [0–0] | 2.5 [0–575] | 36.5 [5.5–65] | 0 [0–0] | 6.5 [0–34] |
| Nuxt | 45.8 [8–78] | 40.5 [16–63.5] | 145.5 [81–191] | 129.5 [42.5–274] | 44 [9–89.5] | 63 [32–161.5] |
| Angular | 870.4 [206–1,031.5] | 126.4 [90–255] | 456.5 [76–1,783.3] | 1,527.9 [112.5–2,343.2] | 82.5 [45–138.5] | 573.4 [71–921.8] |

### CLS

| Framework | Home | Filtered home | Pokémon | Move | Ability | Type |
|---|---:|---:|---:|---:|---:|---:|
| Marionette 5.1.0 with Vite | 0.111 [0.103–0.172] | 0.111 [0.103–0.172] | 0.111 [0.103–0.111] | 0.111 [0.103–0.111] | 0.111 [0.103–0.111] | 0.111 [0.103–0.111] |
| Vanilla | 0.1465 [0.103–0.193] | 0.1465 [0.103–0.193] | 0.102 [0.101–0.111] | 0.107 [0.103–0.111] | 0.107 [0.103–0.111] | 0.107 [0.103–0.111] |
| React Router | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] |
| SvelteKit | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] |
| Nuxt | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 0 [0–0] |
| Angular | 0.109 [0.008–0.134] | 0.1145 [0.107–0.204] | 0.1075 [0.004–0.118] | 0.0595 [0–0.115] | 0.113 [0.107–0.118] | 0.113 [0.107–0.118] |

### JavaScript transfer (KiB)

| Framework | Home | Filtered home | Pokémon | Move | Ability | Type |
|---|---:|---:|---:|---:|---:|---:|
| Marionette 5.1.0 with Vite | 25.56 [23.75–25.73] | 25.56 [23.77–25.73] | 25.56 [23.75–25.73] | 25.56 [23.75–25.73] | 25.56 [23.75–25.73] | 25.56 [23.75–25.73] |
| Vanilla | 4.48 [4.3–4.66] | 4.48 [4.3–4.66] | 4.48 [4.3–4.66] | 4.48 [4.3–4.66] | 4.48 [4.3–4.66] | 4.48 [4.3–4.66] |
| React Router | 115.66 [114.31–115.73] | 115.68 [114.36–115.73] | 115.66 [115.3–115.73] | 115.63 [114.41–115.78] | 115.63 [114.36–115.78] | 115.66 [114.36–115.78] |
| SvelteKit | 36.67 [36.48–36.85] | 36.66 [36.52–36.85] | 36.65 [36.48–36.85] | 36.67 [36.48–36.85] | 36.68 [36.52–36.85] | 36.68 [36.48–36.85] |
| Nuxt | 82.57 [76.01–82.69] | 82.52 [75.96–82.69] | 82.52 [75.96–82.69] | 82.52 [75.96–82.69] | 82.52 [75.96–82.69] | 82.52 [75.96–82.69] |
| Angular | 76.72 [49–95.75] | 76.72 [49–95.75] | 76.72 [49–97.64] | 76.72 [49–79.61] | 76.72 [49–79.61] | 76.72 [49–79.61] |

## Per-build results

The labels b1–b4 identify applications within each framework in this assessment. Values below are the underlying application results, not a choice of the strongest metric from different builds. Each route row is a five-sample median.

### Marionette 5.1.0 with Vite

| Build | Generation s | Tests | Input | Cached | Uncached | Cache-write | Output | Reasoning detail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| b1 | 334.333 | 54/54 | 1,373,295 | 1,320,704 | 52,591 | 0 | 9,380 | 726 |
| b2 | 247.268 | 54/54 | 989,328 | 933,120 | 56,208 | 0 | 8,459 | 460 |
| b3 | 290.147 | 54/54 | 982,101 | 930,304 | 51,797 | 0 | 9,209 | 432 |
| b4 | 318.063 | 54/54 | 1,227,620 | 1,168,896 | 58,724 | 0 | 9,932 | 702 |

| Build | Route | Performance | Accessibility | LCP ms | TBT ms | CLS | JS transfer bytes |
|---|---|---:|---:|---:|---:|---:|---:|
| b1 | Home | 96 | 100 | 1,893.796 | 1 | 0.111 | 26,224 |
| b1 | Filtered home | 96 | 100 | 1,890.414 | 0 | 0.111 | 26,224 |
| b1 | Pokémon | 75 | 100 | 6,093.552 | 43 | 0.111 | 26,224 |
| b1 | Move | 97 | 100 | 1,093.851 | 55 | 0.111 | 26,224 |
| b1 | Ability | 96 | 100 | 1,850.962 | 0 | 0.111 | 26,224 |
| b1 | Type | 96 | 100 | 1,978.749 | 29 | 0.111 | 26,224 |
| b2 | Home | 96 | 100 | 1,884.787 | 8 | 0.111 | 24,323 |
| b2 | Filtered home | 96 | 100 | 1,872.09 | 0 | 0.111 | 24,339 |
| b2 | Pokémon | 81 | 100 | 4,410.556 | 18 | 0.111 | 24,323 |
| b2 | Move | 96 | 100 | 1,913.202 | 92 | 0.111 | 24,323 |
| b2 | Ability | 97 | 100 | 1,243.26 | 0 | 0.111 | 24,323 |
| b2 | Type | 97 | 100 | 1,185.927 | 15.5 | 0.111 | 24,323 |
| b3 | Home | 92 | 100 | 1,864.987 | 1 | 0.172 | 26,129 |
| b3 | Filtered home | 92 | 100 | 1,892.455 | 0 | 0.172 | 26,129 |
| b3 | Pokémon | 75 | 100 | 6,143.585 | 31 | 0.111 | 26,129 |
| b3 | Move | 96 | 100 | 1,893.15 | 104 | 0.111 | 26,129 |
| b3 | Ability | 97 | 100 | 1,098.245 | 0 | 0.111 | 26,129 |
| b3 | Type | 96 | 100 | 1,845.002 | 29.5 | 0.111 | 26,129 |
| b4 | Home | 97 | 100 | 1,881.773 | 13 | 0.103 | 26,351 |
| b4 | Filtered home | 97 | 100 | 1,908.214 | 0 | 0.103 | 26,351 |
| b4 | Pokémon | 74 | 100 | 6,360.826 | 72 | 0.103 | 26,351 |
| b4 | Move | 95 | 100 | 1,949.369 | 137 | 0.103 | 26,351 |
| b4 | Ability | 96 | 100 | 1,994.844 | 0 | 0.103 | 26,351 |
| b4 | Type | 97 | 100 | 1,904.596 | 29 | 0.103 | 26,351 |

### Vanilla

| Build | Generation s | Tests | Input | Cached | Uncached | Cache-write | Output | Reasoning detail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| b1 | 295.504 | 54/54 | 978,905 | 939,008 | 39,897 | 0 | 8,166 | 490 |
| b2 | 287.249 | 54/54 | 928,280 | 886,528 | 41,752 | 0 | 7,430 | 411 |
| b3 | 261.693 | 54/54 | 895,291 | 854,912 | 40,379 | 0 | 8,073 | 499 |
| b4 | 271.928 | 54/54 | 1,048,456 | 999,040 | 49,416 | 0 | 8,686 | 567 |

| Build | Route | Performance | Accessibility | LCP ms | TBT ms | CLS | JS transfer bytes |
|---|---|---:|---:|---:|---:|---:|---:|
| b1 | Home | 97 | 100 | 805.136 | 0 | 0.111 | 4,406 |
| b1 | Filtered home | 97 | 100 | 839.866 | 0 | 0.111 | 4,406 |
| b1 | Pokémon | 96 | 100 | 2,294.872 | 0 | 0.101 | 4,406 |
| b1 | Move | 97 | 100 | 802.077 | 58 | 0.111 | 4,406 |
| b1 | Ability | 97 | 100 | 804.847 | 0 | 0.111 | 4,406 |
| b1 | Type | 97 | 100 | 801.375 | 0 | 0.111 | 4,406 |
| b2 | Home | 93 | 100 | 848.322 | 224 | 0.103 | 4,564 |
| b2 | Filtered home | 97 | 100 | 802.285 | 4.5 | 0.103 | 4,564 |
| b2 | Pokémon | 94 | 100 | 2,327.411 | 115 | 0.101 | 4,564 |
| b2 | Move | 96 | 100 | 778.968 | 143 | 0.103 | 4,564 |
| b2 | Ability | 97 | 100 | 1,706.973 | 0 | 0.103 | 4,564 |
| b2 | Type | 97 | 100 | 782.5 | 0 | 0.103 | 4,564 |
| b3 | Home | 91 | 100 | 773.069 | 0 | 0.193 | 4,776 |
| b3 | Filtered home | 91 | 100 | 771.222 | 0 | 0.193 | 4,776 |
| b3 | Pokémon | 82 | 100 | 4,275.257 | 0 | 0.111 | 4,776 |
| b3 | Move | 97 | 100 | 799.22 | 53 | 0.111 | 4,776 |
| b3 | Ability | 97 | 100 | 806.907 | 0 | 0.111 | 4,776 |
| b3 | Type | 97 | 100 | 801.133 | 0 | 0.111 | 4,776 |
| b4 | Home | 92 | 100 | 774.466 | 0 | 0.182 | 4,610 |
| b4 | Filtered home | 92 | 100 | 799.884 | 0 | 0.182 | 4,610 |
| b4 | Pokémon | 94 | 100 | 2,731.82 | 0 | 0.103 | 4,610 |
| b4 | Move | 95 | 100 | 1,077.105 | 160.5 | 0.103 | 4,610 |
| b4 | Ability | 97 | 100 | 2,014.56 | 0 | 0.103 | 4,610 |
| b4 | Type | 97 | 100 | 801.229 | 9 | 0.103 | 4,610 |

### React Router

| Build | Generation s | Tests | Input | Cached | Uncached | Cache-write | Output | Reasoning detail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| b1 | 393.201 | 54/54 | 1,849,272 | 1,737,984 | 111,288 | 0 | 9,794 | 987 |
| b2 | 267.153 | 54/54 | 916,148 | 867,328 | 48,820 | 0 | 7,908 | 192 |
| b3 | 289.311 | 54/54 | 1,277,756 | 1,226,240 | 51,516 | 0 | 9,430 | 434 |
| b4 | 376.491 | 54/54 | 1,720,674 | 1,664,256 | 56,418 | 0 | 9,476 | 1,067 |

| Build | Route | Performance | Accessibility | LCP ms | TBT ms | CLS | JS transfer bytes |
|---|---|---:|---:|---:|---:|---:|---:|
| b1 | Home | 98 | 100 | 2,230.33 | 5 | 0 | 118,398 |
| b1 | Filtered home | 98 | 100 | 2,197.714 | 0 | 0 | 118,449 |
| b1 | Pokémon | 67 | 100 | 2,842.221 | 805.456 | 0 | 118,398 |
| b1 | Move | 100 | 100 | 1,215.904 | 43 | 0 | 118,398 |
| b1 | Ability | 99 | 100 | 2,039.012 | 0 | 0 | 118,398 |
| b1 | Type | 99 | 100 | 1,843.495 | 0 | 0 | 118,398 |
| b2 | Home | 97 | 100 | 2,164.766 | 51 | 0 | 117,055 |
| b2 | Filtered home | 98 | 100 | 2,150.966 | 12.5 | 0 | 117,106 |
| b2 | Pokémon | 87 | 100 | 2,863.083 | 363.959 | 0 | 118,065 |
| b2 | Move | 100 | 100 | 1,193.913 | 54 | 0 | 117,157 |
| b2 | Ability | 99 | 100 | 1,989.606 | 0 | 0 | 117,106 |
| b2 | Type | 99 | 100 | 1,912.38 | 0 | 0 | 117,106 |
| b3 | Home | 99 | 100 | 2,117.151 | 0.5 | 0 | 118,505 |
| b3 | Filtered home | 99 | 100 | 2,073.154 | 0 | 0 | 118,505 |
| b3 | Pokémon | 87 | 100 | 2,998.957 | 210.204 | 0 | 118,505 |
| b3 | Move | 98 | 100 | 1,620.549 | 46.5 | 0 | 118,555 |
| b3 | Ability | 99 | 100 | 2,058.478 | 6 | 0 | 118,555 |
| b3 | Type | 99 | 100 | 1,896.127 | 0 | 0 | 118,555 |
| b4 | Home | 98 | 100 | 2,236.093 | 6 | 0 | 118,466 |
| b4 | Filtered home | 99 | 100 | 1,941.78 | 0 | 0 | 118,466 |
| b4 | Pokémon | 90 | 100 | 2,853.563 | 152.5 | 0 | 118,471 |
| b4 | Move | 99 | 100 | 1,505.132 | 44.5 | 0 | 118,415 |
| b4 | Ability | 99 | 100 | 1,991.553 | 0 | 0 | 118,415 |
| b4 | Type | 99 | 100 | 1,917.338 | 0 | 0 | 118,471 |

### SvelteKit

| Build | Generation s | Tests | Input | Cached | Uncached | Cache-write | Output | Reasoning detail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| b1 | 371.866 | 54/54 | 1,930,950 | 1,876,352 | 54,598 | 0 | 10,148 | 596 |
| b2 | 431.23 | 54/54 | 2,054,555 | 1,987,072 | 67,483 | 0 | 10,223 | 774 |
| b3 | 357.613 | 54/54 | 1,687,566 | 1,626,368 | 61,198 | 0 | 10,115 | 781 |
| b4 | 320.057 | 54/54 | 1,678,585 | 1,559,552 | 119,033 | 0 | 9,686 | 362 |

| Build | Route | Performance | Accessibility | LCP ms | TBT ms | CLS | JS transfer bytes |
|---|---|---:|---:|---:|---:|---:|---:|
| b1 | Home | 100 | 100 | 1,223.039 | 0 | 0 | 37,739 |
| b1 | Filtered home | 100 | 100 | 1,150.642 | 0 | 0 | 37,739 |
| b1 | Pokémon | 72 | 100 | 3,545.396 | 575 | 0 | 37,739 |
| b1 | Move | 100 | 100 | 1,148.702 | 5.5 | 0 | 37,739 |
| b1 | Ability | 100 | 100 | 1,113.523 | 0 | 0 | 37,739 |
| b1 | Type | 100 | 100 | 1,092.102 | 2 | 0 | 37,739 |
| b2 | Home | 100 | 100 | 1,693.38 | 0 | 0 | 37,594 |
| b2 | Filtered home | 100 | 100 | 1,678.907 | 0 | 0 | 37,618 |
| b2 | Pokémon | 98 | 100 | 2,279.378 | 0 | 0 | 37,594 |
| b2 | Move | 99 | 100 | 1,968.082 | 65 | 0 | 37,594 |
| b2 | Ability | 100 | 100 | 1,704.176 | 0 | 0 | 37,627 |
| b2 | Type | 100 | 100 | 1,749.579 | 34 | 0 | 37,627 |
| b3 | Home | 100 | 100 | 1,683.142 | 0 | 0 | 37,360 |
| b3 | Filtered home | 100 | 100 | 1,687.297 | 0 | 0 | 37,393 |
| b3 | Pokémon | 98 | 100 | 2,274.135 | 0 | 0 | 37,360 |
| b3 | Move | 99 | 100 | 1,856.773 | 15 | 0 | 37,360 |
| b3 | Ability | 100 | 100 | 1,689.464 | 0 | 0 | 37,393 |
| b3 | Type | 100 | 100 | 1,682.936 | 0 | 0 | 37,360 |
| b4 | Home | 100 | 100 | 1,688.722 | 0 | 0 | 37,502 |
| b4 | Filtered home | 100 | 100 | 1,676.453 | 0 | 0 | 37,469 |
| b4 | Pokémon | 98 | 100 | 2,293.211 | 5 | 0 | 37,469 |
| b4 | Move | 99 | 100 | 1,908.296 | 58 | 0 | 37,502 |
| b4 | Ability | 100 | 100 | 1,675.816 | 0 | 0 | 37,502 |
| b4 | Type | 100 | 100 | 1,681.413 | 11 | 0 | 37,502 |

### Nuxt

| Build | Generation s | Tests | Input | Cached | Uncached | Cache-write | Output | Reasoning detail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| b1 | 404.18 | 54/54 | 2,242,973 | 2,195,712 | 47,261 | 0 | 10,741 | 1,087 |
| b2 | 270.883 | 54/54 | 1,103,551 | 1,058,560 | 44,991 | 0 | 9,165 | 842 |
| b3 | 425.997 | 54/54 | 2,025,491 | 1,970,688 | 54,803 | 0 | 10,181 | 920 |
| b4 | 435.735 | 54/54 | 2,528,764 | 2,474,880 | 53,884 | 0 | 12,744 | 830 |

| Build | Route | Performance | Accessibility | LCP ms | TBT ms | CLS | JS transfer bytes |
|---|---|---:|---:|---:|---:|---:|---:|
| b1 | Home | 97 | 100 | 2,086.339 | 8 | 0 | 77,830 |
| b1 | Filtered home | 99 | 100 | 1,608.096 | 16 | 0 | 77,780 |
| b1 | Pokémon | 69 | 100 | 4,906.173 | 174 | 0 | 77,780 |
| b1 | Move | 95 | 100 | 2,226.639 | 42.5 | 0 | 77,780 |
| b1 | Ability | 100 | 100 | 1,385.616 | 9 | 0 | 77,780 |
| b1 | Type | 98 | 100 | 1,822.796 | 32 | 0 | 77,780 |
| b2 | Home | 99 | 100 | 1,849.128 | 78 | 0 | 84,560 |
| b2 | Filtered home | 99 | 100 | 1,833.561 | 25.5 | 0 | 84,509 |
| b2 | Pokémon | 97 | 100 | 2,424.942 | 81 | 0 | 84,509 |
| b2 | Move | 98 | 100 | 2,251.522 | 92 | 0 | 84,509 |
| b2 | Ability | 100 | 100 | 1,760.973 | 37 | 0 | 84,509 |
| b2 | Type | 99 | 100 | 1,996.659 | 62.5 | 0 | 84,509 |
| b3 | Home | 99 | 100 | 1,985.076 | 60.5 | 0 | 84,677 |
| b3 | Filtered home | 99 | 100 | 1,983.906 | 55.5 | 0 | 84,677 |
| b3 | Pokémon | 69 | 100 | 4,932.357 | 191 | 0 | 84,677 |
| b3 | Move | 96 | 100 | 2,144.68 | 167 | 0 | 84,677 |
| b3 | Ability | 99 | 100 | 1,841.497 | 51 | 0 | 84,677 |
| b3 | Type | 99 | 100 | 1,841.941 | 63.5 | 0 | 84,677 |
| b4 | Home | 99 | 100 | 2,022.003 | 31 | 0 | 84,546 |
| b4 | Filtered home | 99 | 100 | 1,851.189 | 63.5 | 0 | 84,495 |
| b4 | Pokémon | 96 | 100 | 2,453.599 | 117 | 0 | 84,495 |
| b4 | Move | 92 | 100 | 2,239.745 | 274 | 0 | 84,495 |
| b4 | Ability | 99 | 100 | 1,748.617 | 89.5 | 0 | 84,495 |
| b4 | Type | 97 | 100 | 1,850.947 | 161.5 | 0 | 84,495 |

### Angular

| Build | Generation s | Tests | Input | Cached | Uncached | Cache-write | Output | Reasoning detail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| b1 | 443.797 | 54/54 | 1,905,652 | 1,817,472 | 88,180 | 0 | 15,239 | 2,464 |
| b2 | 392.379 | 54/54 | 1,429,286 | 1,369,344 | 59,942 | 0 | 12,820 | 941 |
| b3 | 480.652 | 54/54 | 2,541,453 | 2,467,200 | 74,253 | 0 | 14,610 | 1,641 |
| b4 | 352.685 | 54/54 | 1,401,683 | 1,337,984 | 63,699 | 0 | 12,114 | 755 |

| Build | Route | Performance | Accessibility | LCP ms | TBT ms | CLS | JS transfer bytes |
|---|---|---:|---:|---:|---:|---:|---:|
| b1 | Home | 73 | 100 | 1,545.782 | 983.073 | 0.134 | 98,051 |
| b1 | Filtered home | 85 | 100 | 1,793.442 | 255 | 0.204 | 98,051 |
| b1 | Pokémon | 49 | 100 | 7,242.16 | 1,783.323 | 0.004 | 99,980 |
| b1 | Move | 95 | 100 | 1,427.58 | 112.5 | 0.115 | 81,518 |
| b1 | Ability | 96 | 100 | 1,397.823 | 47.5 | 0.115 | 81,518 |
| b1 | Type | 96 | 100 | 1,406.677 | 71 | 0.115 | 81,518 |
| b2 | Home | 80 | 100 | 1,746.748 | 757.783 | 0.107 | 77,749 |
| b2 | Filtered home | 95 | 100 | 1,563.549 | 149.254 | 0.107 | 77,749 |
| b2 | Pokémon | 80 | 100 | 2,595.272 | 548 | 0.104 | 77,749 |
| b2 | Move | 70 | 100 | 2,261.788 | 2,343.189 | 0 | 77,749 |
| b2 | Ability | 95 | 100 | 1,563.514 | 138.5 | 0.107 | 77,749 |
| b2 | Type | 76 | 100 | 1,565.788 | 921.758 | 0.107 | 77,749 |
| b3 | Home | 93 | 100 | 1,989.485 | 206 | 0.111 | 50,172 |
| b3 | Filtered home | 96 | 100 | 1,979.15 | 90 | 0.111 | 50,172 |
| b3 | Pokémon | 79 | 100 | 4,728.484 | 76 | 0.111 | 50,172 |
| b3 | Move | 76 | 100 | 1,982.376 | 841.001 | 0.111 | 50,172 |
| b3 | Ability | 96 | 100 | 1,917.653 | 45 | 0.111 | 50,172 |
| b3 | Type | 91 | 100 | 1,981.004 | 243 | 0.111 | 50,172 |
| b4 | Home | 78 | 100 | 1,438.886 | 1,031.5 | 0.008 | 79,377 |
| b4 | Filtered home | 95 | 100 | 1,426.612 | 103.5 | 0.118 | 79,377 |
| b4 | Pokémon | 68 | 100 | 5,171.324 | 365 | 0.118 | 79,377 |
| b4 | Move | 71 | 100 | 1,553.429 | 2,214.882 | 0.008 | 79,377 |
| b4 | Ability | 95 | 100 | 1,403.324 | 117.5 | 0.118 | 79,377 |
| b4 | Type | 75 | 100 | 1,489.898 | 903.742 | 0.118 | 79,377 |

## Versions and source size

The Marionette applications all installed **Marionette 5.1.0, @mnjs/html 1.0.0 and Vite 8.3.8**. The core source revision is `86ee0599ee9c3e1ae472d7426fc3769bd66bdcbe`; packaged documentation records clean source. The public [npm release metadata](https://registry.npmjs.org/marionette/5.1.0) supplied archive integrity. Core archive SHA-256 is `54cd2784349fac372968b30e7b87584d324e0ba0b306f3d1d14e7e7b3c5745ee`; the bundled skill SHA-256 is `591e2c338e732da101109c730dcf0e1b5602dfa95cb431aad1da52bba4f32d4e`. Installed core files and the measured core identity were verified. Optional companions were available without requiring their use.

The following dependency versions are read from each retained application record.

| Framework | Build | Principal installed versions |
|---|---|---|
| Marionette 5.1.0 with Vite | b1 | marionette 5.1.0; @mnjs/html 1.0.0; @mnjs/data 5.1.0; vite 8.3.8 |
| Marionette 5.1.0 with Vite | b2 | marionette 5.1.0; @mnjs/html 1.0.0; vite 8.3.8 |
| Marionette 5.1.0 with Vite | b3 | marionette 5.1.0; @mnjs/html 1.0.0; @mnjs/data 5.1.0; vite 8.3.8 |
| Marionette 5.1.0 with Vite | b4 | marionette 5.1.0; @mnjs/html 1.0.0; @mnjs/data 5.1.0; vite 8.3.8 |
| Angular | b1 | @angular/core 22.2.4; @angular/cli 22.2.5; @angular/build 22.2.5; typescript 6.0.3 |
| Angular | b2 | @angular/core 22.2.4; @angular/cli 22.2.5; @angular/build 22.2.5; typescript 6.0.3 |
| Angular | b3 | @angular/core 22.2.4; @angular/cli 22.2.5; @angular/build 22.2.5; typescript 6.0.3 |
| Angular | b4 | @angular/core 22.2.4; @angular/cli 22.2.5; @angular/build 22.2.5; typescript 6.0.3 |
| Nuxt | b1 | nuxt 4.6.4 |
| Nuxt | b2 | nuxt 4.6.4 |
| Nuxt | b3 | nuxt 4.6.4 |
| Nuxt | b4 | nuxt 4.6.4 |
| React Router | b1 | react 19.3.1; react-router 8.5.1; vite 8.3.5 |
| React Router | b2 | react 19.3.1; react-router 8.5.1; vite 8.3.5 |
| React Router | b3 | react 19.3.1; react-router 8.5.1; vite 8.3.5 |
| React Router | b4 | react 19.3.1; react-router 8.5.1; vite 8.3.5 |
| SvelteKit | b1 | svelte 5.57.3; @sveltejs/kit 3.1.1; vite 8.3.5 |
| SvelteKit | b2 | svelte 5.57.3; @sveltejs/kit 3.1.1; vite 8.3.5 |
| SvelteKit | b3 | svelte 5.57.3; @sveltejs/kit 3.1.1; vite 8.3.5 |
| SvelteKit | b4 | svelte 5.57.3; @sveltejs/kit 3.1.1; vite 8.3.5 |
| Vanilla | b1 | vite 8.3.5 |
| Vanilla | b2 | vite 8.3.6 |
| Vanilla | b3 | vite 8.3.5 |
| Vanilla | b4 | vite 8.3.5 |

Physical source lines are not complexity or maintainability. The recorded Nolan count, independent nonblank snapshot count and formatter-normalized count use different definitions and are kept separate. Generated roots and byte-identical supplied design tokens are excluded from the new independent counts. Strict pre-build snapshot timing is not established. All 24 applications now have nonblank formatter-normalized counts under the same selection policy, including comments and excluding supplied fixtures. Some recorded Nolan counts contain generated material. **Use the measured JavaScript transfer tables for a consistent size comparison.**

| Framework | Build | Recorded Nolan lines | Independent snapshot nonblank | Formatter-normalized nonblank |
|---|---|---:|---:|---:|
| Marionette 5.1.0 with Vite | b1 | 78 | 72 | 998 |
| Marionette 5.1.0 with Vite | b2 | 1,103 | 952 | 950 |
| Marionette 5.1.0 with Vite | b3 | 118 | 112 | 1027 |
| Marionette 5.1.0 with Vite | b4 | 87 | 81 | 1053 |
| Angular | b1 | 679 | 679 | 1890 |
| Angular | b2 | 1,257 | 1,257 | 1343 |
| Angular | b3 | 1,309 | 1,309 | 1392 |
| Angular | b4 | 510 | 510 | 1711 |
| Nuxt | b1 | 13,600 | Unavailable | 997 |
| Nuxt | b2 | 13,929 | 106 | 1031 |
| Nuxt | b3 | 14,162 | 77 | 981 |
| Nuxt | b4 | 56 | 56 | 989 |
| React Router | b1 | 770 | 45 | 1029 |
| React Router | b2 | 962 | 59 | 1071 |
| React Router | b3 | 1,031 | 84 | 1167 |
| React Router | b4 | 825 | 78 | 1009 |
| SvelteKit | b1 | 24,067 | Unavailable | 940 |
| SvelteKit | b2 | 1,005 | 1,005 | 946 |
| SvelteKit | b3 | 24,012 | 114 | 959 |
| SvelteKit | b4 | 24,025 | 119 | 981 |
| Vanilla | b1 | 60 | 55 | 825 |
| Vanilla | b2 | 24 | 24 | 771 |
| Vanilla | b3 | 37 | 32 | 815 |
| Vanilla | b4 | 68 | 63 | 865 |

## Comparability

- The task used the pinned Pokédex fixture, its independent 54-test suite, local API data, Caddy HTTPS/HTTP2 and mobile Lighthouse measurement. Generation and measurement used verified 4 CPU / 8 GiB container limits. The generation timeout was 240 minutes. The recorded Codex CLI was 0.166.0, Node 24.22.1, with model `gpt-6.1-sol`; effort and service-tier overrides were unset. Low reasoning-token counts do not establish a selected reasoning effort.
- Each Marionette application used a fresh HOME and ephemeral native thread with the neutral framework task prompt. The intended bundled repository skill and seven hosted MCP tools were advertised; built-in system skills remained visible. Tool advertisement/capabilities are indirect handshake evidence, not a captured wire exchange. No agent MCP-tool invocation was observed in these four streams; catalog reads made by the controller are a separate activity.
- Collection dates differ across frameworks. The Marionette agent npm cutoff was `2026-11-12T18:53:25Z` to admit the published release. Exact dependency versions differ across applications; strict date/version equality is not asserted. This is not a contemporaneously randomized experiment.
- The hosted MCP service changed between b1 and b2, as detailed below. Both revision and corpus are flagged for comparison. The service was stable within each of the four builds; no deployment freeze was enforced. Zero agent invocation does not establish identical exposure or absence of an effect.
- The retained Nuxt b3 measurement uses an explicit `api.localhost` to container-loopback mapping. The new Marionette measurements use that mapping; not every peer measurement has identical hostname configuration. Peer numeric results are preserved unchanged.
- Native app-server metadata reports `explicitRequestOnly` multi-agent mode. Web-search configuration was not explicitly overridden; unset configuration is not proof of observed search use. A fresh HOME/session inventory does not establish inaccessible sibling credential stores within the dedicated unprivileged container. No host-project mount or privileged container is introduced by this protocol.
- Four applications per framework are a small sample. Five measurements reduce per-app sampling noise, but they do not create more independent applications. Shared-host activity, model stochasticity, application architecture and data-loading choices limit causal and population-wide conclusions. The results do not isolate intrinsic framework overhead.

### Hosted MCP observations

All four applications installed core 5.1.0 and had its bundled local skill/docs available. The table describes the separately hosted catalog.

| Build | Hosted catalog version | Service revision | Corpus SHA-256 | Stable within build |
|---|---|---|---|---|
| b1 | 5.0.0 | `992446b95f2885a6128d8c8111ac8db0f2e3bfa1` | `7438a8e7be53f13067dedbf19c04f8a0d5efdbb2acc4b4a80eea90a29f9ec45d` | Yes |
| b2 | 5.1.0 | `572cc10d2d3405a63d61cb49b5b445cffc68d133` | `acb4be738b453d80262023463c68f7081d1a7d5889c71ad0593ca16710bd7ab6` | Yes |
| b3 | 5.1.0 | `572cc10d2d3405a63d61cb49b5b445cffc68d133` | `acb4be738b453d80262023463c68f7081d1a7d5889c71ad0593ca16710bd7ab6` | Yes |
| b4 | 5.1.0 | `572cc10d2d3405a63d61cb49b5b445cffc68d133` | `acb4be738b453d80262023463c68f7081d1a7d5889c71ad0593ca16710bd7ab6` | Yes |

## Evidence fingerprints

Numbers were checked against each completed application’s native usage, generation and acceptance receipts, and its stored route samples. Every per-route median was recomputed from five numeric samples. The fingerprints identify the authorized measurement data without embedding execution paths or transcripts.

| Framework | Build | Measurement-results SHA-256 |
|---|---|---|
| Marionette 5.1.0 with Vite | b1 | `4cd30d39a8e5b3f1ad09c96afd5527bb6fc0a0500bdb79f5e4f645561b58660e` |
| Marionette 5.1.0 with Vite | b2 | `af4405af707c0e694a3750c01f07a5d1ef8ecd72221b8c190b9d839b86a27514` |
| Marionette 5.1.0 with Vite | b3 | `2780e798efbbe021b47a981979b08a93a69f4f7dc8eefd6e1ff599bed907e5ed` |
| Marionette 5.1.0 with Vite | b4 | `f147d678e8b62f8eb5129b22b21913d3b66508a5ce40eb10f30ed9e02eefc5f5` |
| Angular | b1 | `82eeb55beef73a4568bcc7bbf0136127b85b547a71ad817237ec36cbda52ee3d` |
| Angular | b2 | `5ee48be93a5c41797300d953ec77cecc396eb3754bdf6943f8320a19f808dcdd` |
| Angular | b3 | `1c97de45d135403546cebead088a8452aa5c6bbef87b065b3ab946e6cc807099` |
| Angular | b4 | `39c38a3f695b5c399cc656ea3145687d9639e36d5f1db96e890371ab6f86ff93` |
| Nuxt | b1 | `75633129ac3e1085e1795ac50f60e5e71b3b8ba9470b92b4dcd7120c91ccd4f0` |
| Nuxt | b2 | `2a9cc4ca6b8dca2e13317d3182d0fd58f41173e38b68119b3d68803296ac3b43` |
| Nuxt | b3 | `d4010c63baa5d51a0e89cbb9732aa4d0418177976c618da37928ef53b1891cef` |
| Nuxt | b4 | `577c6579e212420ca3ac5823b41981562434cfcab5013de175f4ac6f4ea8a90d` |
| React Router | b1 | `ce07f8f7063ab07a291f05d6f3bfa61f9222b4027a22a8473669614d57149cc2` |
| React Router | b2 | `63d50e00596249339faa88eb22d59bd3cbfaa8e62d1235ed34bfa9151adf14f5` |
| React Router | b3 | `daed421c842ef7469faf8fc3497e26f4f40b302c00c854c4118e91b0178164a0` |
| React Router | b4 | `f49952e0d0ae43195e43da73d3d1a6fb7e53b4d0a016259a549d889d63e60446` |
| SvelteKit | b1 | `7f363511942bd53c1d92de1d22a215de0c916936ebae870262fc76f1ca3c2904` |
| SvelteKit | b2 | `e8343a38d71c639e0fcc3fabecfad5c5d7938af04627b48c3db24796a841b98e` |
| SvelteKit | b3 | `576cea59c7cea64b52f33bb4efd86991d0f818b687f9b91a1b567afdf861ec47` |
| SvelteKit | b4 | `c800ee3bb5559b22fad2251d9bb2efec3cd8b3ff12e6a47ea3c0c760182058d8` |
| Vanilla | b1 | `b555472f9d51fa9b4e0bf991d61071f2dfa59642ad75cff70298fa24ffa54432` |
| Vanilla | b2 | `621a516911c3ba2c5a2136dfec296cdb143ebf5fd0e53ef6dd2d02323e4dc16d` |
| Vanilla | b3 | `abdb43e1b22da6ae01cb0109515196f7fa7fad32dd32f585299f47338edb1b64` |
| Vanilla | b4 | `0a889f45923bddcecb512f5ed3a3600bc313053619a62897c6e45f2ae569c9a3` |

The evidence supports the defined 24-application comparison. Actual subscription/credit debit is unavailable. No monetary total or API-request count is inferred.

## Normalized source-count policy update

All 24 applications use Prettier 3.9.10 with Svelte plugin 4.1.1; nonblank formatted lines include comments and exclude generated output and supplied fixtures. SvelteKit b2 excludes 69 lines of supplied design-token CSS (including a whitespace-only variant), giving 946 rather than 1,015. Counts measure formatted source size, not complexity.
