---
title: "面向云与网络服务的Go语言"
linkTitle: "Cloud & Network Services"
description: "借助主要云服务商提供的强大工具和API生态系统，使用Go构建服务比以往任何时候都更加容易。"
date: 2019-10-04T15:26:31-04:00
series: Use Cases
template: true
icon:
  file: cloud-green.svg
  alt: cloud icon
iconDark:
  file: cloud-white.svg
  alt: cloud icon
---

## 概述 {#overview .sectionHeading}

<div class="UseCase-halfColumn">
    <h3>Go语言帮助企业构建和扩展云计算系统</h3>
    <p>随着应用程序和处理过程向云端迁移，并发性成为一个非常重要的问题。云计算系统本质上是资源共享和扩展的。协调对共享资源的访问是影响云端每个应用程序处理的问题，这要求编程语言“明确地致力于开发高度可靠的应用程序”。</p>
</div>

{{quote `
  author: Ruchi Malik
  title: developer at Choozle
  link: https://builtin.com/software-engineering-perspectives/golang-advantages
  quote: |
    Go让公司规模扩张变得非常容易。这一点非常重要，因为随着工程团队的成长，每个服务都可以由不同的团队管理。
`}}

## 主要优势 {#key-benefits .sectionHeading}

### 解决开发周期与服务器性能之间的权衡问题

Go语言的创建正是为了解决大规模应用、微服务和云开发中的这些并发需求。事实上，云原生计算基金会超过75%的项目是用Go编写的。

Go有助于减少这种权衡的必要性，其快速的构建时间支持迭代开发，降低了内存和CPU使用率。使用Go构建的服务器启动迅速，在按需付费和无服务器部署模式下运行成本更低。

### 应对现代云挑战，提供标准的地道API

Go语言解决了开发者在现代云环境中面临的许多挑战，提供标准的地道API，并内置并发支持以充分利用多核处理器。Go的低延迟和“无需调优”特性使其在性能和生产力之间取得了很好的平衡——赋予了工程团队选择的权力和快速行动的能力。

## 用例 {#use-case .sectionHeading}

### 将Go用于云计算

Go的优势在构建服务时尤为突出。其速度和内置的并发支持可以构建出快速高效的服务，而静态类型、强大的工具链以及对简洁性和可读性的重视有助于构建可靠且可维护的代码。

Go拥有一个强大的服务开发生态系统。[标准库](/pkg/)包含了处理常见需求的包，如HTTP服务器和客户端、JSON/XML解析、SQL数据库以及一系列安全/加密功能，同时Go运行时还包含[竞态检测](/doc/articles/race_detector.html)、[基准测试](/pkg/testing/#hdr-Benchmarks)/性能分析、代码生成和静态代码分析等工具。

主要的云服务商（[GCP](https://cloud.google.com/go/home)、[AWS](https://aws.amazon.com/sdk-for-go/)、[Azure](https://docs.microsoft.com/en-us/azure/go/)）为其服务提供了Go API，而流行的开源库则为API工具化（[Swagger](https://github.com/go-swagger/go-swagger)）、传输（[Protocol Buffers](https://github.com/golang/protobuf)、[gRPC](https://grpc.io/docs/quickstart/go/)）、监控（[OpenCensus](https://godoc.org/go.opencensus.io)）、对象关系映射（[gORM](https://gorm.io/)）以及认证（[JWT](https://github.com/dgrijalva/jwt-go)）提供了支持。开源社区还提供了多个服务框架，包括[Go Kit](https://gokit.io/)、[Go Micro](https://micro.mu/docs/go-micro.html)和[Gizmo](https://github.com/nytimes/gizmo)，这些都是快速上手的好方法。

### 用于云计算的Go工具

{{toolsblurbs `
  - title: Docker
    url: https://www.docker.com/
    iconSrc: /images/logos/docker.svg
    paragraphs:
      - Docker是一个平台即服务，它在容器中交付软件。容器将软件、库和配置文件打包在一起，由Docker引擎托管，并由单个操作系统内核运行（比虚拟机使用更少的系统资源）。
      - 云开发者使用Docker来管理他们的Go代码并支持多个平台，因为Docker支持开发工作流和部署过程。
  - title: Kubernetes
    url: https://kubernetes.io/
    iconSrc: /images/logos/kubernetes.svg
    paragraphs:
      - Kubernetes是一个用Go编写的开源容器编排系统，用于自动化Web应用的部署。Web应用通常使用容器（如上所述）打包其依赖项和配置。Kubernetes有助于大规模部署和管理这些容器。云程序员使用Kubernetes来快速构建、交付和扩展容器化应用——通过控制容器如何运行的API来管理日益增长的复杂性。
`}}{{projects `
  - company: Google
    url: https://cloud.google.com/go
    logoSrc: google-cloud.svg
    logoSrcDark: google-cloud.svg
    desc: 谷歌云在其产品和工具生态系统中广泛使用Go语言，包括Kubernetes、gVisor、Knative、Istio和Anthos。谷歌云的所有API和运行时都完全支持Go语言。
    ctas:
      - text: Go 在谷歌云平台
        url: https://cloud.google.com/go
  - company: Capital One
    url: https://www.capitalone.com/
    logoSrc: capitalone_light.svg
    logoSrcDark: capitalone_dark.svg
    desc: Capital One使用Go语言驱动其关键服务——信贷报价API。其工程团队也正在使用Go构建无服务器架构，他们提到Go的速度和简洁性，并表示“（他们）不想在没有Go的情况下走向无服务器。”
    ctas:
      - text: 信贷报价API
        url: https://medium.com/capital-one-tech/a-serverless-and-go-journey-credit-offers-api-74ef1f9fde7f
  - company: Dropbox
    url: https://www.dropbox.com/
    logoSrc: dropbox.svg
    logoSrcDark: dropbox.svg
    desc: Dropbox最初是用Python构建的，但在2013年决定将其性能关键的后端迁移到Go。如今，该公司的大部分基础设施都由Go编写。
    ctas:
      - text: Dropbox 库
        url: https://dropbox.tech/infrastructure/open-sourcing-our-go-libraries
  - company: Mercado Libre
    url: https://www.mercadolibre.com.ar/
    logoSrc: mercadolibre_light.svg
    logoSrcDark: mercadolibre_dark.svg
    desc: MercadoLibre使用Go语言来扩展其电子商务平台。Go生成了高效的代码，能够随着MercadoLibre在线商务的增长而轻松扩展。Go在提高其生产力的同时，也简化并扩展了MercadoLibre的服务。
    ctas:
      - text: MercadoLibre 与 Go
        url: /solutions/mercadolibre
  - company: The New York Times
    url: https://www.nytimes.com/
    logoSrc: the-new-york-times-icon.svg
    logoSrcDark: the-new-york-times-icon.svg
    desc: 《纽约时报》采用Go语言“以构建更好的后端服务”。随着公司内部Go语言使用的扩展，他们觉得有必要创建一个工具包来“帮助开发者快速配置和构建微服务API以及发布/订阅守护程序”，并已将其开源。
    ctas:
      - text: NYTimes - Gizmo
        url: https://open.nytimes.com/introducing-gizmo-aa7ea463b208
      - text: Gizmo GitHub
        url: https://github.com/nytimes/gizmo
  - company: Twitch
    url: https://www.twitch.tv/
    logoSrc: twitch.svg
    logoSrcDark: twitch.svg
    desc: Twitch使用Go语言驱动其多个最繁忙的系统，这些系统为数百万用户提供实时视频和聊天服务。
    ctas:
      - text: Go 迈向低延迟 GC
        url: https://blog.twitch.tv/en/2016/07/05/gos-march-to-low-latency-gc-a6fa96f06eb7/
  - company: Uber
    url: https://www.uber.com/
    logoSrc: uber_light.svg
    logoSrcDark: uber_dark.svg
    desc: Uber使用Go语言驱动其几个关键服务，这些服务影响着全球数百万司机和乘客的体验。从其实时分析引擎AresDB，到其地理查询微服务Geofence，再到其资源调度器Peloton。
    ctas:
      - text: AresDB
        url: https://eng.uber.com/aresdb/
      - text: Geofence
        url: https://eng.uber.com/go-geofence/
      - text: Peloton
        url:  https://eng.uber.com/open-sourcing-peloton/
`}}

## 开始学习 {#get-started .sectionHeading}

### 云计算领域的Go书籍

{{books `
  - title: Building Microservices with Go
    url: https://www.amazon.com/Building-Microservices-Go-efficient-microservices/dp/1786468662/
    thumbnail: /images/books/building-microservices-with-go.jpg
  - title: Hands-On Software Architecture with Golang
    url: https://www.amazon.com/dp/1788622596/ref=cm_sw_r_tw_dp_U_x_-aZWDbS8PD7R4
    thumbnail: /images/books/hands-on-software-architecture-with-golang.jpg
  - title: Building RESTful Web services with Go
    url: https://www.amazon.com/Building-RESTful-Web-services-gracefully-ebook/dp/B072QB8KL1
    thumbnail: /images/books/building-restful-web-services-with-go.jpg
  - title: Mastering Go Web Services
    url: https://www.amazon.com/Mastering-Web-Services-Nathan-Kozyra/dp/178398130X
    thumbnail: /images/books/mastering-go-web-services.jpg
`}}{{libraries `
  - title: Web框架
    viewMoreUrl: https://pkg.go.dev/search?q=web+framework
    items:
      - text: Echo
        url: https://echo.labstack.com/
        desc: 一个高性能、可扩展且极简的Go Web框架
      - text: Flamingo
        url: https://www.flamingo.me/
        desc: 一个基于Go的快速开源框架，具有清晰且可扩展的架构
      - text: Gin
        url: https://gin-gonic.com/
        desc: 一个用Go编写的Web框架，具有类似Martini的API。
      - text: Gorilla
        url: https://www.gorillatoolkit.org/
        desc: 一个用于Go编程语言的Web工具包。
  - title: 路由器
    viewMoreUrl: https://pkg.go.dev/search?q=http%20router
    items:
      - text: net/http
        url: https://pkg.go.dev/net/http
        desc: 标准库HTTP包
      - text: julienschmidt/httprouter
        url: https://pkg.go.dev/github.com/julienschmidt/httprouter?tab=overview
        desc: 一个轻量级高性能的HTTP请求路由器
      - text: gorilla/mux
        url: https://pkg.go.dev/github.com/gorilla/mux?tab=overview
        desc: 一个强大的HTTP路由器和URL匹配器，用于构建Go Web服务器 🦍
      - text: Chi
        url: https://pkg.go.dev/github.com/go-chi/chi?tab=overview
        desc: 一个轻量级、符合惯例且可组合的路由器，用于构建Go HTTP服务。
  - title: 模板引擎
    viewMoreUrl: https://pkg.go.dev/search?q=templates
    items:
      - text: html/template
        url: https://pkg.go.dev/html/template
        desc: 标准库HTML模板引擎
      - text: flosch/pongo2
        url: https://pkg.go.dev/github.com/flosch/pongo2?tab=overview
        desc: 一种类似Django语法的模板语言
  - title: 数据库与驱动
    viewMoreUrl: https://pkg.go.dev/search?q=database%20OR%20sql
    items:
      - text: database/sql
        url: https://pkg.go.dev/database/sql
        desc: 标准库接口，支持MySQL、Postgres、Oracle、MS SQL、BigQuery以及大多数SQL数据库的驱动
      - text: mongo-driver/mongo
        url: https://pkg.go.dev/go.mongodb.org/mongo-driver/mongo?tab=overview
        desc: MongoDB官方支持的Go语言驱动
      - text: elastic/go-elasticsearch
        url: https://pkg.go.dev/github.com/elastic/go-elasticsearch/v8?tab=overview
        desc: 一个用于Go的Elasticsearch客户端
      - text: GORM
        url: https://gorm.io/
        desc: 一个Go语言的ORM库
      - text: Bleve
        url: https://blevesearch.com/
        desc: Go语言的全文搜索与索引
      - text: CockroachDB
        url: https://www.cockroachlabs.com/
        desc: 数据库的一种演进——为云而设计，旨在大规模提供弹性、一致的分布式SQL
  - title: Web库
    viewMoreUrl: https://pkg.go.dev/search?q=web
    items:
      - text: markbates/goth
        url: https://pkg.go.dev/github.com/markbates/goth?tab=overview
        desc: Web应用程序的身份验证
      - text: jinzhu/gorm
        url: https://pkg.go.dev/github.com/jinzhu/gorm?tab=overview
        desc: 一个Go语言的ORM库
      - text: dgrijalva/jwt-go
        url: https://pkg.go.dev/github.com/dgrijalva/jwt-go?tab=overview
        desc: JSON Web Tokens的Go实现
  - title: 其他项目
    items:
      - text: gopherjs
        url: https://pkg.go.dev/github.com/gopherjs/gopherjs?tab=overview
        desc: 一个从Go到JavaScript的编译器，允许开发者用Go编写可在所有浏览器中运行的前端代码。
`}}