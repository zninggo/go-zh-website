---
title: '在Google使用Go语言'
date: 2020-08-27
company: Google
logoSrc: google.svg
logoSrcDark: google.svg
heroImgSrc: go_core_data_case_study.png
carouselImgSrc: go_google_case_study_carousel.png
series: Case Studies
type: solutions
template: true
description: |-
  Google是一家技术公司，其使命是整合全球信息，使人人皆可访问并从中受益。

  Go语言于2007年在Google诞生，旨在提升多核联网机器和大型代码库时代的编程生产力。自2009年公开发布至今十余年来，Go在Google内部的应用规模已大幅增长。
quote: Go语言于2007年在Google诞生，此后，Google的各工程团队已采用Go来大规模构建产品与服务。

---

{{pullquote `
  author: Rob Pike
  quote: |
    Go诞生于2007年9月，当时Robert Griesemer、Ken Thompson和我开始探讨一种新语言，以应对我们及Google同事在日常工作中面临的工程挑战。

    2009年11月我们首次公开发布Go时，尚不确定该语言能否被广泛采纳，或是否会影响未来的编程语言。如今从2020年回望，Go在这两方面都取得了成功：它在Google内外均被广泛使用，其对网络并发和软件工程的处理方式也对其他语言及相关工具产生了显著影响。

    Go的适用范围远超我们最初的预期。它在工业界的发展令人瞩目，并已成为Google众多项目的核心支撑。
`}}

以下案例仅是Go在Google应用场景中的部分缩影。

### Google核心数据解决方案团队如何使用Go

Google的使命是"整合全球信息，使人人皆可访问并从中受益"。负责信息组织工作的团队之一是Google的核心数据解决方案团队。该团队主要承担维护全球网页索引服务等职责。这些网页索引服务通过保持搜索结果的时效性与全面性，为Google搜索等产品提供支持，且全部使用Go语言编写。

[了解更多](/solutions/google/coredata/)

---

### Chrome内容优化服务基于Go实现

提及Chrome产品时，你可能首先想到用户安装的浏览器。但实际上，Chrome拥有庞大的后端服务集群，其中就包括Chrome优化指南服务。该服务构成了Chrome用户体验策略的重要基础，运行于用户访问的关键路径上，并通过Go语言实现。

[了解更多](/solutions/google/chrome/)

---

### Firebase托管团队如何借助Go实现规模化扩展

Firebase托管团队为Google Cloud客户提供静态网站托管服务。他们构建了依托全球内容分发网络的静态网站托管系统，并为用户提供了易于使用的工具。团队还开发了从站点文件上传、域名注册到使用量追踪等多项功能。

[了解更多](/solutions/google/firebase/)

---

### 驱动Google生产系统：网站可靠性工程团队如何使用Go

Google运营着少量但规模极大的服务。这些服务依托覆盖全球的基础设施运行，涵盖存储系统、负载均衡、网络、日志记录、监控等方方面面。然而，这并非静止的系统——它也不可能是静止的。架构持续演进，新产品与创意不断涌现，新版本需逐步上线，配置需定期更新，数据库架构需同步调整。最终，我们每秒需要对系统进行数十次变更部署。

[了解更多](/solutions/google/sitereliability/)