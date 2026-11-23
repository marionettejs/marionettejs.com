选前端框架时，React 往往是默认选项。但如果从浏览器实际要做的工作出发，结果没那么理所当然。Marionette 5 是一个用视图组织界面的 JavaScript 库，现在不再强制依赖 Backbone。我们把它和 Vue、React 放在同一份测试结果里看。

## 同一套测试，三种取舍

下面是 [js-framework-benchmark 的 Chrome 158 结果](https://krausest.github.io/js-framework-benchmark/2026/chrome158.html)中使用稳定键（keyed）的实现。Marionette 用的是 5.1.0，这里列出不使用 Backbone 的实现。

| 指标 | Marionette | Vue | React Hooks |
| --- | ---: | ---: | ---: |
| CPU 加权几何平均值（越低越好） | 1.30 | 1.28 | 1.55 |
| Brotli 压缩后的实现体积 | 18.4 kB | 23.3 kB | 51.4 kB |

Vue 的 CPU 总分略好于 Marionette。React Hooks 创建和追加 1,000 行也稍快，分别领先 1.7 和 0.9 毫秒。换成创建 10,000 行，Marionette 则用 254.0 毫秒，React Hooks 用 341.6 毫秒；交换两行分别用 12.1 和 87.4 毫秒。综合分不是实际应用的提速百分比，表里的体积也不含 CSS 或 HTTP 头。

内存是另一回事。加载页面、添加 1,000 行、反复创建和清空这三项里，Marionette 用的内存都比 React Hooks 少。五轮创建和清空后，分别是 1.22 MB 和 1.95 MB。与 Vue 相比，Marionette 的综合内存指标更低（1.80 对 1.91），但 Vue 在五轮创建和清空后用的内存略少。

## 换成 AI 编程智能体，默认答案会变吗？

我们还用 Codex 重做了 [Nolan Lawson 的宝可梦应用任务](https://nolanlawson.com/2026/10/28/the-ai-cost-of-javascript-frameworks/)，Marionette 和 React Router 分别独立构建四次。两组各 4 个纳入统计的应用都通过了同一套 54 项验收测试。Marionette 的 token 用量中位数约低 26%，两组生成耗时的范围则有重叠。这是另一个实验，比较的是智能体交付同一应用的结果，不是上面那份表格的另一项跑分。[查看构建、代码和完整结果](https://github.com/marionettejs/agent-framework-benchmark/tree/results/codex-2026-11/results/2026-11-codex)。

我们更在意的是，这让试用一个不熟悉的框架变得容易了。下次做功能原型时，可以把同一份需求交给智能体，用你原本会选的方案，再用 Marionette 做一遍。看看慢一点的手机上用起来怎么样，也看看列表更新时，旁边编辑器里还没保存的草稿会不会丢。框架该不该成为默认选项，这比只看跑分更有说服力。想试的话，可以从 [Marionette 的智能体开发指南（英文）](https://marionettejs.com/docs/agent-start/)开始。

[阅读英文原文与完整测试图表](https://marionettejs.com/news/react-show-your-work/)。
