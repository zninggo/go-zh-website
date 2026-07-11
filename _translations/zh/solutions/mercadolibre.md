---
title: "MercadoLibre 借力 Go 语言实现业务增长"
company: MercadoLibre
logoSrc: mercadolibre_light.svg
logoSrcDark: mercadolibre_dark.svg
heroImgSrc: go_mercadolibre_case_study_logo.png
carouselImgSrc: go_mercadolibre_case_study.png
date: 2019-11-10T16:26:31-04:00
series: 案例研究
quote: Go 语言提供简洁高效的代码，随着 MercadoLibre 在线商务的增长而轻松扩展，并通过让工程师在编写更少代码的同时服务日益增长的用户群，提升了开发者的生产力。
template: true
---

{{pullquote `
  author: Eric Kohan
  title: 软件工程经理
  company: MercadoLibre
  quote: |
    我认为 **Go 语言之旅（the tour of Go）是我所见过的最佳语言入门介绍**。它非常简单，为你提供了该语言大约 80% 内容的清晰概述。当我们想让开发者学习 Go 并快速投入生产环境时，我们都会建议他们从 Go 语言之旅开始。
`}}

## Go 助力集成生态系统吸引开发者并扩展电子商务

MercadoLibre, Inc. 拥有拉丁美洲最大的在线商务生态系统，业务遍及 18 个国家。该公司成立于 1999 年，总部位于阿根廷，已转向使用 Go 语言来帮助其生态系统进行扩展和现代化。Go 语言提供简洁高效的代码，随着 MercadoLibre 在线商务的增长而轻松扩展，并通过让工程师在编写更少代码的同时服务日益增长的用户群，提升了开发者的生产力。

### MercadoLibre 借助 Go 实现规模化扩展

早在 2015 年，MercadoLibre 内部就逐渐意识到他们基于 Groovy 和 Grails 的现有 API 框架正达到极限，公司需要一个不同的平台来继续扩展。MercadoLibre 的平台过去（并且持续）呈指数级增长，这给其开发者带来了大量额外工作：Groovy 和 Grails 都需要开发者做大量决策，而且 Groovy 是一种动态编程语言。这对于快速增长来说并不是一个好组合，因为 MercadoLibre 需要非常有经验的开发者在这个资源密集型环境中进行开发和调优以实现预期性能。测试执行时间缓慢，构建和部署时间也缓慢。因此，对代码效率和可扩展性的需求变得与对代码开发速度的需求同等重要。

### Go 提升系统效率

以 Go 语言对网络效率的贡献为例，核心 API 团队负责构建和维护公司微服务解决方案中心的最大型 API。该团队创建用户 API，这些 API 随后被 MercadoLibre 市场、MercadoPago 金融科技平台、MercadoLibre 的物流运输解决方案以及其他托管解决方案所使用。鉴于这些解决方案要求的高服务水平——平均用户 API 每分钟需处理八百万到一千万次请求——该团队采用 Go 语言来以每个请求低于 10 毫秒的延迟为它们提供服务。

该 API 团队还部署 Docker 容器——一种同样用 Go 编写的软件即服务（SaaS）产品——来虚拟化其开发环境，并通过 Docker Engine 轻松部署其微服务。该系统支持更大、更关键的业务 API，能够用 **Go 处理每分钟超过 2000 万次请求。**

有一个 API 重要地运用了 Go 语言的并发原语来高效地多路复用来自多个服务的 ID。该团队仅用几行 Go 代码就实现了这一目标，该 API 的成功说服了核心 API 团队将越来越多的微服务迁移到 Go 语言。最终结果是 MercadoLibre 获得了成本效率和系统响应时间的改善。

### Go 助力可扩展性

历史上，该公司的技术栈大部分基于 Grails 和 Groovy，并由关系数据库支撑。然而，这个具有多层结构的大型框架很快被发现存在可扩展性问题。

将这种旧架构转换为使用 Go 作为一个用于构建 API 的全新、非常精简的框架，精简了中间层并带来了巨大的性能收益。例如，一个大型 Go 服务现在能够在 **单台机器上以仅 20 MB 内存运行 70,000 个请求。**

{{backgroundquote `
  author: Eric Kohan
  title: 软件工程经理
  company: MercadoLibre
  quote: |
    Go 语言对我们来说简直太棒了。它非常强大且非常易于学习，并且在后端基础设施方面，对我们的可扩展性帮助巨大。
`}}

使用 **Go 语言使 MercadoLibre 将用于该服务的服务器数量削减至原来数量的八分之一**（从 32 台服务器降至 4 台），此外每台服务器还可以以更低的功耗运行（最初是四核 CPU，现在降至双核 CPU）。借助 Go，公司**淘汰了 88% 的服务器，并将剩余服务器的 CPU 使用减半**——产生了巨大的成本节约。

MercadoLibre 在开发者与云提供商之间使用了一个名为 Fury 的平台——一种平台即服务工具，用于以云无关的方式构建、部署、监控和管理服务。因此，任何想要使用 Go 创建新服务的团队都可以访问各种服务类型的成熟模板，并可以快速在 GitHub 上创建一个包含起始代码、服务 Docker 镜像和部署管道的仓库。最终形成一个系统，让工程师能够专注于构建创新服务，同时避免设置新项目的繁琐阶段——并在此过程中有效地标准化了构建和部署管道。

如今，**MercadoLibre 大约一半的流量由 Go 应用程序处理。**

### MercadoLibre 为开发者而使用 Go

目前，MercadoLibre 基础设施的通用编程语言是 Go 和 Java。每个应用程序、每个程序、每个微服务都托管在各自的 GitHub 仓库中，此外公司还使用一个额外的 GitHub 仓库来存放工具包，以解决新问题并允许客户端与其服务进行交互。这些全面且精心维护的 Go 和 Java 工具包，使得程序员能够快速开发新应用并获得强大的支持。此外，在一个拥有超过 2,800 名开发者的社区中，MercadoLibre 提供了多个内部小组，用于交流聊天并提供有关部署 Go 的指导，无论是跨不同的开发中心还是不同的国家。公司还成立了内部工作组，为 MercadoLibre 的新 Go 开发者提供培训课程，并举办 Go 聚会，帮助外部开发者建立一个更广泛的拉丁美洲 Go 开发者社区。

### Go 作为招聘利器

MercadoLibre 对 Go 的倡导也已成为公司强有力的招聘工具。MercadoLibre 是阿根廷首批使用 Go 的公司之一，并且可能是拉丁美洲在生产环境中如此广泛使用该语言的最大公司。总部位于布宜诺斯艾利斯，附近有众多初创企业和新兴科技公司，MercadoLibre 采用 Go 的举措塑造了潘帕斯草原地区的开发者市场。

{{backgroundquote `
  author: Eric Kohan
  title: 软件工程经理
  company: MercadoLibre
  quote: |
    我们真正认同该语言的更深层次的哲学。我们喜爱 Go 的简洁性，并且我们发现其非常明确的错误处理机制对开发者来说是一种收获，因为它在生产环境中带来了更安全、更稳定的代码。
`}}

如今的布宜诺斯艾利斯对于程序员来说是一个竞争非常激烈的市场，为计算机程序员提供了许多就业选择，而该地区对技术的巨大需求也推动了高薪、优厚福利以及在选择雇主时的挑剔能力。因此，MercadoLibre——如同该地区所有雇佣工程师和程序员的雇主一样——努力提供一个令人兴奋的工作场所和清晰的职业发展路径。事实证明，Go 是 MercadoLibre 的一个关键差异化优势：公司为外部开发者组织 Go 研讨会，让他们可以前来学习 Go，当他们喜欢所做的事情并享受交流时，他们会很快认识到 MercadoLibre 是一个极具吸引力的工作场所。

### Go 赋能开发者

MercadoLibre 因其在规模化系统中的简洁性而采用 Go，但这种简洁性也是公司的开发者们喜爱 Go 的原因。

公司还利用像 [Go by Example](https://gobyexample.com/) 和 [Effective Go](/doc/effective_go.html) 这样的网页来教育新程序员，并分享用 Go 编写的代表性内部 API，以加速理解和熟练掌握。MercadoLibre 的开发者获得拥抱这门语言所需的资源，然后利用他们自己的技能和热情开始编程。

{{backgroundquote `
  author: Federico Martin Roasio
  title: 技术项目负责人
  company: MercadoLibre
  quote: |
    Go 非常适合编写业务逻辑，而我们正是编写这些 API 的团队。
`}}

MercadoLibre 利用 Go 富有表现力且简洁的语法，使开发者更容易编写出能在现代云平台上高效运行的程序。虽然开发速度为公司带来了成本效益，但开发者个人也受益于 Go 提供的快速学习曲线。不仅 MercadoLibre 经验丰富的工程师能够用 Go 非常快速地构建高关键性的应用程序，即使是初级工程师也能够编写出服务，而在其他语言中，MercadoLibre 只会将这类任务交给更资深的开发者。例如，一组关键的用户 API——每分钟处理近一千万次请求——是由初级软件工程师开发的，其中许多人只是通过最近的大学课程才了解编程。同样，MercadoLibre 也看到已经精通其他编程语言（如 Java、.NET 或 Ruby）的开发者能够足够快地学习 Go，以至于在几周内就开始编写生产服务。

使用 Go，MercadoLibre 的 **构建速度提高了三倍 (3x)**，他们的 **测试套件运行速度惊人地提高了 24 倍**。这意味着公司的开发者可以进行更改，然后比以前更快地构建和测试该更改。

将 MercadoLibre 的测试套件运行时间从 90 秒 **降至仅 3 秒（使用 Go）**，对开发者来说是一个巨大的福音——使他们能够在快得多的测试完成期间保持专注（和上下文）。

利用这一成功，MercadoLibre 不仅致力于对其程序员进行持续教育，而且致力于持续的 Go 语言教育。公司每年派遣关键工程领导者参加 GopherCon 和其他 Go 活动，MercadoLibre 的基础设施和安全团队鼓励所有开发团队保持 Go 版本更新，并且公司有一个团队正在开发 _Go-meli-toolkit_：一个完整的 Go 库，用于对接由 Fury 提供的所有服务。

### 为你的企业开启 Go 之旅

正如 MercadoLibre 从一个概念验证项目开始实现 Go 一样，许多其他大型企业也正在采用 Go。

全球有超过一百万开发者在使用 Go——涵盖银行和商业、游戏和媒体、技术以及其他行业，企业类型多样，包括 [American Express](/solutions/americanexpress)、[PayPal](/solutions/paypal)、Capital One、Dropbox、IBM、Monzo、纽约时报、Salesforce、Square、Target、Twitch、Uber，当然还有 Google。

要了解更多关于 Go 如何像在 MercadoLibre 那样，帮助你的企业构建可靠、可扩展的软件，请立即访问 [go.dev](/)。