---
title: "命令行接口 (CLI)"
linkTitle: "Command-line Interfaces (CLIs)"
description: "With popular open source packages and a robust standard library, use Go to create fast and elegant CLIs."
date: 2019-10-04T15:26:31-04:00
series: Use Cases
template: true
icon:
  file: clis-green.svg
  alt: CLI icon
iconDark:
  file: clis-white.svg
  alt: CLI icon
---

## 概述 {#overview .sectionHeading}

### CLI 开发者青睐 Go 的可移植性、性能和易用性

与图形用户界面不同，命令行接口是纯文本的。由于易于实现自动化和远程访问，云和基础架构应用程序主要基于 CLI。

## 核心优势 {#key-benefits .sectionHeading}

### 利用快速的编译时间，构建能快速启动并在任何系统上运行的程序

CLI 开发者发现 Go 非常适合设计他们的应用程序。Go 能非常快速地编译成单个二进制文件，跨平台工作时风格一致，并拥有强大的开发者社区。开发者可以从一台 Windows 或 Mac 笔记本电脑上，在几秒钟内为 Go 支持的数十种架构和操作系统中的每一种构建 Go 程序，无需复杂的构建农场。没有其他编译型语言能如此便携或快速地构建。Go 应用程序被构建为单个独立的二进制文件，使得安装 Go 应用程序变得轻而易举。

具体来说，**用 Go 编写的程序可以在任何系统上运行，无需任何现有的库、运行时或依赖项**。而且**用 Go 编写的程序具有即时启动时间**——类似于 C 或 C++，但其他编程语言无法实现。

## 使用案例 {#use-case .sectionHeading}

### 使用 Go 构建优雅的 CLI

{{backgroundquote `
  作者: Steve Domino
  职位: Strala 高级工程师兼架构师
  链接: https://medium.com/@skdomino/writing-better-clis-one-snake-at-a-time-d22e50e60056
  引述: |
    我负责构建我们的 CLI 工具，并发现了两个非常出色的项目：Cobra 和 Viper，它们使得构建 CLI 变得容易。它们各自都非常强大、非常灵活，并且非常擅长自己的工作。但结合起来，它们将帮助你在下一个 CLI 项目中占据主导地位！
`}}

{{backgroundquote `
  作者: Francesc Campoy
  职位: DGraph Labs 产品副总裁兼 Just For Func 视频制作人
  链接: https://www.youtube.com/watch?v=WvWPGVKLvR4
  引述: |
    Cobra 是编写小型工具甚至大型工具的一个很棒的产品。它更像是一个框架而不是一个库，因为当你调用生成骨架的二进制文件后，你需要在其中添加代码。”
`}}

在 Go 中开发 CLI 时，有两个工具被广泛使用：Cobra & Viper。

{{pkg "github.com/spf13/cobra" "Cobra"}} 既是一个用于创建强大的现代 CLI 应用程序的库，也是一个用于生成 Go 应用程序和 CLI 应用程序的程序。Cobra 为大多数流行的 Go 应用程序提供支持，包括 CoreOS、Delve、Docker、Dropbox、Git Lfs、Hugo、Kubernetes 以及[更多](https://pkg.go.dev/github.com/spf13/cobra?tab=importedby)。凭借集成的命令帮助、自动补全和文档功能，OpenFaaS 创始人 [Alex Ellis](https://blog.alexellis.io/5-keys-to-a-killer-go-cli/) 表示：“[它] 使得为每个命令编写文档变得非常简单”。

{{pkg "github.com/spf13/viper" "Viper"}} 是一个完整的 Go 应用程序配置解决方案，旨在应用程序内部工作以处理配置需求和格式。Cobra 和 Viper 被设计为协同工作。

Viper [支持配置中的嵌套结构](https://scene-si.org/2017/04/20/managing-configuration-with-viper/)，允许 CLI 开发者管理大型应用程序多个部分的配置。Viper 还提供了构建十二因素应用程序所需的所有工具。

[Geudens 建议](https://ordina-jworks.github.io/development/2018/10/20/make-your-own-cli-with-golang-and-cobra.html)：“如果你不想污染你的命令行，或者你正在处理不想出现在历史记录中的敏感数据，那么使用环境变量是个好主意。要实现这一点，你可以使用 Viper。”{{projects `
  - company: Comcast
    url: https://xfinity.com/
    logoSrc: comcast.svg
    logoSrcDark: comcast.svg
    desc: Comcast 使用 Go 构建了一个命令行界面客户端，用于在其高流量网站上发布和订阅内容。该公司还支持一个用 Go 编写的开源客户端库——专为与 Apache Pulsar 配合工作而设计。
    ctas:
      - text: Apache Pulsar 客户端库
        url: https://github.com/Comcast/pulsar-client-go
      - text: Pulsar 命令行客户端
        url: https://github.com/Comcast/pulsar-client-go/blob/master/cli/main.go
  - company: GitHub
    url: https://github.com/
    logoSrc: github.svg
    logoSrcDark: github.svg
    desc: GitHub 使用 Go 构建了一个命令行工具，旨在更便捷地与 GitHub 交互。该工具封装了 git，以扩展其功能并添加额外的命令。
    ctas:
      - text: GitHub 命令行工具
        url: https://github.com/cli/cli
  - company: Hugo
    url: https://gohugo.io/
    logoSrc: hugo.svg
    logoSrcDark: hugo.svg
    desc: Hugo 是最受欢迎的 Go 命令行界面应用之一，为包括本网站在内的数千个站点提供支持。其受欢迎的一个原因在于得益于 Go 语言，安装过程非常简便。Hugo 作者 Bjørn Erik Pedersen 写道：“单一二进制文件消除了安装和升级过程中的大部分麻烦。”
    ctas:
      - text: Hugo 网站
        url: https://gohugo.io/
  - company: Kubernetes
    url: https://kubernetes.com/
    logoSrc: kubernetes.svg
    logoSrcDark: kubernetes.svg
    desc: Kubernetes 是最受欢迎的 Go 命令行界面应用之一。Kubernetes 创建者 Joe Beda 表示，编写 Kubernetes 时，“Go 是唯一合乎逻辑的选择”。他称 Go 介于 C++ 等底层语言和 Python 等高层语言之间的“理想地带”。
    ctas:
      - text: Kubernetes 与 Go
        url: https://blog.gopheracademy.com/birthday-bash-2014/kubernetes-go-crazy-delicious/
  - company: MongoDB
    url: https://mongodb.com/
    logoSrc: mongodb.svg
    logoSrcDark: mongodb.svg
    desc: MongoDB 选择使用 Go 实现其备份命令行工具，理由是 Go 的“类 C 语法、强大的标准库、通过协程解决并发问题的能力，以及轻松实现跨平台分发”的特性。
    ctas:
      - text: MongoDB 备份服务
        url: https://www.mongodb.com/blog/post/go-agent-go
  - company: Netflix
    url: https://netflix.com/
    logoSrc: netflix.svg
    logoSrcDark: netflix.svg
    desc: Netflix 使用 Go 构建了命令行应用 ChaosMonkey，该应用负责在生产环境中随机终止实例，以确保工程师实现的服务能够对实例故障具备弹性。
    ctas:
      - text: Netflix 技术博客文章
        url: https://medium.com/netflix-techblog/application-data-caching-using-ssds-5bf25df851ef
  - company: Stripe
    url: https://stripe.com/
    logoSrc: stripe.svg
    logoSrcDark: stripe.svg
    desc: Stripe 使用 Go 构建了 Stripe 命令行工具，旨在直接从终端帮助构建、测试和管理 Stripe 集成。
    ctas:
      - text: Stripe 命令行工具
        url: https://github.com/stripe/stripe-cli
  - company: Uber
    url: https://uber.com/
    logoSrc: uber.svg
    logoSrcDark: uber.svg
    desc: Uber 使用 Go 构建了多个命令行工具，其中包括用于 Jaeger 的命令行 API。Jaeger 是一个分布式跟踪系统，用于监控微服务分布式系统。
    ctas:
      - text: Jaeger 命令行 API
        url: https://www.jaegertracing.io/docs/1.14/cli/
`}}

## 快速开始 {#get-started .sectionHeading}

### 用于创建命令行界面应用的 Go 语言书籍

{{books `
  - title: 《Go 语言实战：编写可维护的命令行应用》
    url: https://www.amazon.com/Powerful-Command-Line-Applications-Go-Maintainable/dp/168050696X
    thumbnail: /images/books/powerful-command-line-applications-in-go.jpg
  - title: 《Go 语言实战》
    url: https://www.amazon.com/Go-Action-William-Kennedy/dp/1617291781
    thumbnail: /images/books/go-in-action.jpg
  - title: 《Go 程序设计语言》
    url: https://www.gopl.io/
    thumbnail: /images/learn/go-programming-language-book.png
  - title: 《Go 语言编程蓝图》
    url: https://github.com/matryer/goblueprints
    thumbnail: /images/learn/go-programming-blueprints.png
`}}{{libraries `
  - title: CLI 库
    viewMoreUrl: https://pkg.go.dev/search?q=command%20line%20OR%20CLI
    items:
      - text: spf13/cobra
        url: https://pkg.go.dev/github.com/spf13/cobra?tab=overview
        desc: 一个用于创建强大现代 CLI 应用程序的库，以及一个用于生成 Go 应用程序和 CLI 应用程序的工具
      - text: spf13/viper
        url: https://pkg.go.dev/github.com/spf13/viper?tab=overview
        desc: 一个完整的 Go 应用程序配置解决方案，旨在应用程序内部工作以处理配置需求和格式
      - text: urfave/cli
        url: https://pkg.go.dev/github.com/urfave/cli?tab=overview
        desc: 一个用于创建和组织命令行 Go 应用程序的最小化框架
      - text: delve
        url: https://pkg.go.dev/github.com/go-delve/delve?tab=overview
        desc: 一个为习惯在编译语言中使用源代码级调试器的程序员构建的简单而强大的工具
      - text: chzyer/readline
        url: https://pkg.go.dev/github.com/chzyer/readline?tab=overview
        desc: 一个纯 Golang 实现，提供了 GNU Readline 的大部分功能（采用 MIT 许可证）
      - text: dixonwille/wmenu
        url: https://pkg.go.dev/github.com/dixonwille/wmenu?tab=overview
        desc: 一个用于 CLI 应用程序的易于使用的菜单结构，可提示用户做出选择
      - text: spf13/pflag
        url: https://pkg.go.dev/github.com/spf13/pflag?tab=overview
        desc: 一个可替代 Go 标准 `flag` 包的即插即用方案，实现了 POSIX/GNU 风格的标志
      - text: golang/glog
        url: https://pkg.go.dev/github.com/golang/glog?tab=overview
        desc: 用于 Go 的分级别执行日志
      - text: go-prompt
        url: https://pkg.go.dev/github.com/c-bata/go-prompt?tab=overview
        desc: 一个用于构建强大交互式提示的库，使使用 Go 构建跨平台命令行工具变得更加容易。
`}}