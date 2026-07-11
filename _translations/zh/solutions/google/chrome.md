---
title: "Chrome 内容优化服务基于 Go 运行"
company: Chrome
logoSrc: chrome.svg
logoSrcDark: chrome.svg
heroImgSrc: go_chrome_case_study.png
series: Case Studies
template: true
quote: |
  Google Chrome 是比以往任何时候都更简单、更安全、更快速的网络浏览器，
  内置了 Google 的智能技术。

  在这个案例研究中，Chrome 优化指南团队分享了他们如何尝试 Go 语言、
  如何快速上手，以及他们未来使用 Go 的计划。
---

当您想到 Chrome 产品时，您可能只会想到用户安装的浏览器。但在幕后，Chrome 拥有一支庞大的后端服务集群。其中之一便是 Chrome 优化指南服务。该服务是 Chrome 用户体验策略的重要基础，它在用户的关键路径上运行，并采用 Go 语言实现。

Chrome 优化指南服务旨在将 Google 的强大能力带给 Chrome，它为已安装的浏览器提供关于页面加载时可以执行哪些优化，以及何时可以最有效地应用这些优化的提示。该服务由实时服务器和批量日志分析共同构成。

所有 Chrome 的精简版用户都通过以下机制从该服务接收数据：通过数据包推送接收针对其所在地区知名网站的提示；通过登录 Google 服务器来获取用户经常访问的主机提示；以及当设备上尚无提示时，按需获取页面加载的提示。如果 Chrome 优化指南服务突然消失，用户可能会明显感觉到页面加载速度的剧烈变化以及浏览网页时数据消耗量的增加。

{{backgroundquote `
  author: Sophie Chang
  title: Software Engineer
  quote: |
    鉴于 Go 语言对我们来说是一次成功的尝试，我们计划在适当的地方
    继续使用它
`}}

当 Chrome 工程团队开始构建这项服务时，只有少数成员熟悉 Go。团队中的大多数人对 C++ 更为熟悉，但他们发现搭建一个 C++ 服务器所需的复杂样板代码太多了。团队分享道：“由于 Go 语言的简洁性、快速上手和生态系统，[他们] 学习 Go 的动力十足。” 并且“[他们] 的冒险精神得到了回报。” 数百万用户依赖这项服务来提升他们的 Chrome 体验，因此选择 Go 绝非小事。根据迄今为止的经验，团队还分享道：“鉴于 Go 语言对我们来说是一次成功的尝试，我们计划在适当的地方继续使用它。”

除了 Chrome 优化指南团队，Google 内部的多个工程团队也已在开发过程中采用了 Go 语言。您可以阅读 [Core Data Solutions](/solutions/google/coredata/) 和 [Firebase Hosting](/solutions/google/firebase/) 团队如何使用 Go 来大规模构建快速、可靠且高效的软件。

*编者注：Go 团队感谢 Sophie Chang 对本文的贡献。*