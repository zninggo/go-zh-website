---
title: PayPal借助Go语言实现现代化与扩展
date: 2020-06-01
company: PayPal
logoSrc: paypal.svg
logoSrcDark: paypal.svg
heroImgSrc: go_paypal_case_study_logo.png
carouselImgSrc: go_paypal_case_study.png
series: 案例研究
quote: Go语言在编写简洁高效、能随软件部署规模而轻松扩展的代码方面的价值，使其成为支持PayPal目标的理想选择。
template: true
---

{{pullquote `
  author: Bala Natarajan
  title: <span class="NoWrapSpan">工程高级总监,</span>&nbsp;<span class="NoWrapSpan">开发者体验</span>
  company: PayPal
  quote: |
    由于我们的NoSQL和数据库代理在多线程模式下大量使用了系统细节，管理不同条件使得代码变得复杂。而Go提供了处理这种复杂性的channel和routine，我们得以构建代码以满足需求。
`}}

## 基于Go构建的新代码基础架构

PayPal的创立旨在让金融服务大众化，赋能个人和企业融入全球经济并蓬勃发展。其核心是PayPal的支付平台，该平台结合了专有和第三方技术，以高效、安全地促成全球数百万商户和消费者之间的交易。随着支付平台规模日益庞大和复杂，PayPal寻求实现系统现代化，并缩短新应用的上市时间。

Go语言在编写简洁高效、能随软件部署规模而轻松扩展的代码方面的价值，使其成为支持PayPal目标的理想选择。

支付处理平台的核心是一个由PayPal用C++开发的专有NoSQL数据库。然而，代码的复杂性严重削弱了开发人员对平台进行迭代的能力。Go简洁的代码布局、goroutine（轻量级执行线程）以及channel（作为连接并发goroutine的管道），使得Go成为NoSQL开发团队简化并现代化该平台的自然选择。

作为一个概念验证，一个开发团队花了六个月时间学习Go，并从零开始用Go重新实现了NoSQL系统。在此过程中，他们也为Go在PayPal更广泛的应用提供了见解。截至目前，已有百分之三十的集群迁移至使用新的NoSQL数据库。

## 利用Go简化以实现扩展

随着PayPal的平台变得更加错综复杂，Go提供了一种轻松简化大规模创建和运行软件复杂性的方法。该语言为PayPal提供了优秀的库和快速的工具，以及并发、垃圾回收和类型安全等特性。

借助Go，PayPal的开发人员得以将更多时间用于审视代码和进行战略思考，免受C++和Java开发中的“噪音”干扰。

在这次新重写的NoSQL系统取得成功后，PayPal内部更多平台和内容团队开始采用Go。Natarajan当前的团队负责PayPal的构建、测试和发布流水线——所有这些都使用Go构建。公司拥有一个大型的构建和测试集群，完全使用Go基础设施管理，为全公司的开发者提供构建即服务（以及测试即服务）。

  <img
    loading="lazy"
    width="607"
    height="289"
    class=""
    alt="Go gopher工厂"
    src="/images/gophers/factory.png">

## 使用Go实现PayPal系统现代化

凭借PayPal所需的分布式计算能力，Go是刷新其系统的正确语言。PayPal需要一种并发且并行、编译后具有高性能且高度可移植、并能为开发者带来模块化、可组合的开源架构优势的编程语言——Go不仅满足了所有这些要求，甚至做得更多，帮助PayPal实现了系统现代化。

安全性和可支持性是PayPal的关键事项，公司的运营流水线正日益由Go主导，因为该语言的简洁性和模块化有助于他们实现这些目标。PayPal对Go的部署为开发者创造了一个创意平台，使他们能够为PayPal的全球市场大规模地生产简单、高效且可靠的软件。

随着PayPal继续使用Go实现其软件定义网络（SDN）基础设施的现代化，他们不仅看到了性能的提升，代码也更易于维护。例如，Go现在驱动着路由器、负载均衡器以及越来越多的生产系统。

{{backgroundquote `
  author: Bala Natarajan
  title: 工程高级总监
  quote: |
    在我们运行Go代码的严格管理的环境中，我们观察到CPU使用率降低了大约百分之十，同时代码更简洁、更易维护。
`}}

## Go提升了开发者生产力

作为一家全球运营的企业，PayPal需要其开发团队能够有效管理两种规模：生产规模，尤其是与众多其他服务器（如云服务）交互的并发系统；以及开发规模，尤其是由众多程序员协调开发的大型代码库（如开源开发）。

PayPal利用Go来解决这些规模问题。公司的开发者受益于Go将解释型、动态类型语言的编程易用性与静态类型、编译型语言的效率和安全性相结合的能力。随着PayPal系统现代化，对网络化和多核计算的支持至关重要。Go不仅提供了这种支持，而且速度很快——在单台计算机上编译一个大型可执行文件最多只需几秒钟。

目前PayPal有超过100名Go开发者，未来选择采用Go的开发者将更容易获得该语言的认可，这得益于公司已有的许多成功生产实践。最重要的是，PayPal开发者的生产力因Go语言而显著提升。Go的并发机制使得编写能充分利用PayPal多核与网络化机器的程序变得简单。使用Go的开发者还受益于其快速编译为机器代码的能力，他们的应用程序同时获得了垃圾回收的便利性与运行时反射的强大功能。

## 加速PayPal的产品上市时间

PayPal目前的一流语言是Java和Node.js，而Go主要被用作基础设施语言。虽然Go可能永远不会在某些应用中取代Node.js，但Natarajan正努力推动Go成为PayPal的一流语言。

通过他的努力，PayPal也在评估迁移至Google Kubernetes Engine（GKE）以加快新产品的上市时间。GKE是一个为部署容器化应用程序而设计的、可投入生产的托管环境，它融合了Google在开发者生产力、自动化运营和开源灵活性方面的最新创新。

对PayPal而言，部署到GKE将使其能够更轻松地部署、更新和管理应用程序及服务，从而实现快速开发与迭代。此外，PayPal将更容易运行机器学习、通用GPU、高性能计算以及其他受益于GKE支持的专用硬件加速器的工作负载。

对PayPal来说，最关键的是，Go开发与GKE的结合使公司能够毫不费力地按需扩展，因为Kubernetes的自动扩缩容能力将帮助PayPal应对用户对服务需求的增长——在关键时刻保持服务可用，然后在需求平静期缩减规模以节省成本。

## 让您的企业从Go开始

PayPal的故事并非个例；许多其他大型企业也正在发现Go如何帮助它们更快地交付可靠的软件。全球有超过一百万开发者在使用Go——横跨银行与商业、游戏与媒体、技术及其他行业，服务于众多知名企业，如[美国运通](/solutions/americanexpress)、[Mercado Libre](/solutions/mercadolibre)、Capital One、Dropbox、IBM、Monzo、纽约时报、Salesforce、Square、Target、Twitch、Uber，当然还有谷歌。

要了解Go如何像在PayPal那样，帮助您的企业构建可靠、可扩展的软件，请今天就访问[go.dev](/)。