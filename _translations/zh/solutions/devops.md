---
title: "开发运维与站点可靠性工程"
linkTitle: "Development Operations & Site Reliability Engineering"
description: "凭借快速的编译速度、精简的语法、自动格式化器和文档生成器，Go 语言天生为开发运维和站点可靠性工程提供支持。"
date: 2019-10-03T17:16:43-04:00
series: Use Cases
template: true
books:
icon:
  file: devops-green.svg
  alt: ops icon
iconDark:
  file: devops-white.svg
  alt: ops icon
---

## 概述 {#overview .sectionHeading}

### Go 语言助力企业实现自动化与规模化

开发运维团队帮助工程组织自动化任务，并改进其持续集成、持续交付和部署的流程。开发运维能够打破开发壁垒，通过实施工具和自动化来提升软件开发、部署和支持的效率。

站点可靠性工程诞生于谷歌，旨在使公司的“大型网站更可靠、高效和可扩展”，[独立开发运维顾问西尔维娅·弗雷萨德写道](https://opensource.com/article/18/10/what-site-reliability-engineer)。“他们开发的实践非常契合谷歌的需求，以至于亚马逊和 Netflix 等其他大型科技公司也采纳了这些做法。”站点可靠性工程需要兼具开发和运维技能，并且“[赋予软件开发者权力](https://stackify.com/site-reliability-engineering/)，让他们能够负责其应用在生产环境中的日常持续运营。”

Go 语言服务其孪生领域——开发运维与站点可靠性工程，从其快速的编译速度、精简的语法到其安全性和可靠性支持。Go 语言的并发和网络特性也使其成为管理云部署工具的理想选择——轻松支持自动化，同时能随着开发基础设施的增长，为速度和代码可维护性提供良好的扩展性。

开发运维/站点可靠性工程团队编写的软件范围广泛，从小型脚本，到命令行界面，再到复杂的自动化和服务，而 Go 语言的功能集对每种情况都有益处。

## 主要优势 {#key-benefits .sectionHeading}

### 利用 Go 强大的标准库和静态类型，轻松构建小型脚本
Go 语言拥有快速的编译和启动时间。Go 丰富的标准库——包含用于常见需求（如 HTTP、文件 I/O、时间、正则表达式、exec 和 JSON/CSV 格式）的包——让开发运维/站点可靠性工程师能够直接专注于业务逻辑。此外，Go 的静态类型系统和显式错误处理使得即使是小型脚本也更加健壮。

### 凭借 Go 快速的编译时间，快速部署命令行界面
每位站点可靠性工程师都写过“一次性使用”的脚本，这些脚本最终变成了每天被数十位其他工程师使用的命令行工具。而小型的部署自动化脚本也会演变成发布管理服务。使用 Go 语言，开发运维/站点可靠性工程师在软件范围不可避免地扩大时，将处于非常有利的位置来取得成功。从 Go 开始，能让您在这种情况发生时游刃有余。

### 利用 Go 的低内存占用和文档生成器，扩展和维护大型应用
Go 语言的垃圾回收器意味着开发运维/站点可靠性工程团队无需担心内存管理问题。而 Go 的自动文档生成器（godoc）使代码具有自文档性——降低了维护开销，并从一开始就建立了最佳实践。{{projects `
  - company: Docker
    url: https://docker.com/
    logoSrc: docker.svg
    logoSrcDark: docker.svg
    desc: Docker 是一个用 Go 编写的服务即用 (SaaS) 产品，开发运维/站点可靠性工程师团队利用它“在海量规模上推动安全的自动化与部署”，以支持其 CI/CD 工作。
    ctas:
      - text: Docker CI/CD
        url: https://www.docker.com/solutions/cicd
  - company: Drone
    url: https://github.com/drone
    logoSrc: drone.svg
    logoSrcDark: drone.svg
    desc: Drone 是一个构建在容器技术之上的持续交付系统，用 Go 编写，使用简单的 YAML 配置文件（docker-compose 的超集）来定义和在 Docker 容器内执行流水线。
    ctas:
      - text: Drone
        url: https://github.com/drone
  - company: etcd
    url: https://github.com/etcd-io/etcd
    logoSrc: etcd.svg
    logoSrcDark: etcd.svg
    desc: etcd 是一个强一致性的分布式键值存储，它为分布式系统或机器集群需要访问的数据提供了一种可靠的存储方式，且它是用 Go 编写的。
    ctas:
      - text: etcd
        url: https://github.com/etcd-io/etcd
  - company: IBM
    url: https://ibm.com/
    logoSrc: ibm.svg
    logoSrcDark: ibm.svg
    desc: IBM 的开发运维团队通过 Docker 和 Kubernetes 使用 Go，以及其它用 Go 编写的开发运维和 CI/CD 工具。该公司还支持通过 Go 专用 API 连接到其消息中间件。
    ctas:
      - text: IBM 应用与 Golang
        url: https://developer.ibm.com/messaging/2019/02/05/simplified-ibm-mq-applications-golang/
  - company: Netflix
    url: https://netflix.com/
    logoSrc: netflix.svg
    logoSrcDark: netflix.svg
    desc: Netflix 使用 Go 处理大规模数据缓存，通过一个名为 Rend 的服务来管理用于个性化数据的全球复制存储。
    ctas:
      - text: 应用数据缓存
        url: https://medium.com/netflix-techblog/application-data-caching-using-ssds-5bf25df851ef
      - text: Rend
        url: https://github.com/netflix/rend
  - company: Microsoft
    url: https://microsoft.com/
    logoSrc: microsoft_light.svg
    logoSrcDark: microsoft_dark.svg
    desc: 微软在 Azure Red Hat OpenShift 服务中使用 Go。这个微软解决方案为开发运维团队提供 OpenShift 集群，以维护法规遵从性并专注于应用开发。
    ctas:
      - text: OpenShift
        url: https://azure.microsoft.com/en-us/services/openshift/
  - company: Terraform
    url: https://terraform.io/
    logoSrc: terraform-icon.svg
    logoSrcDark: terraform-icon.svg
    desc: Terraform 是一个用于安全、高效地构建、变更和版本化基础设施的工具。它支持多种云提供商，如 AWS、IBM Cloud、GCP 和 Microsoft Azure——并且它是用 Go 编写的。
    ctas:
      - text: Terraform
        url: https://www.terraform.io/intro/index.html
  - company: Prometheus
    url: https://github.com/prometheus/prometheus
    logoSrc: prometheus.svg
    logoSrcDark: prometheus.svg
    desc: Prometheus 是一个开源系统监控和警报工具包，最初在 SoundCloud 构建。大多数 Prometheus 组件是用 Go 编写的，这使得它们易于构建并部署为静态二进制文件。
    ctas:
      - text: Prometheus
        url: https://github.com/prometheus/prometheus
  - company: YouTube
    url: https://youtube.com/
    logoSrc: youtube.svg
    logoSrcDark: youtube.svg
    desc: YouTube 将 Go 与 Vitess（现属 PlanetScale）结合使用，这是其通过通用分片实现 MySQL 水平扩展的数据库集群系统。自 2011 年起，它已成为 YouTube 数据库基础设施的核心组件，并已发展到涵盖数万个 MySQL 节点。
    ctas:
      - text: Vitess
        url: https://github.com/vitessio/vitess
`}}

## 快速开始 {#get-started .sectionHeading}

### 关于开发运维和站点可靠性工程的 Go 书籍

{{books `
  - title: 《Go网络运维编程》
    url: https://www.amazon.com/Go-Programming-Network-Operations-Automation-ebook/dp/B07JKKN34L/ref=sr_1_16
    thumbnail: /images/books/go-programming-for-network-operations.jpg
  - title: 《Go编程蓝图》
    url: https://github.com/matryer/goblueprints
    thumbnail: /images/learn/go-programming-blueprints.png
  - title: 《Go实战》
    url: https://www.amazon.com/Go-Action-William-Kennedy/dp/1617291781
    thumbnail: /images/books/go-in-action.jpg
  - title: 《Go程序设计语言》
    url: https://www.gopl.io/
    thumbnail: /images/learn/go-programming-language-book.png
`}}{{libraries `
  - title: 监控与追踪
    viewMoreUrl: https://pkg.go.dev/search?q=tracing
    items:
      - text: open-telemetry/opentelemetry-go
        url: https://pkg.go.dev/go.opentelemetry.io/otel
        desc: 厂商中立的API与插桩工具，用于监控和分布式追踪
      - text: jaegertracing/jaeger-client-go
        url: https://pkg.go.dev/github.com/jaegertracing/jaeger-client-go?tab=overview
        desc: 由Uber开发的开源分布式追踪系统
      - text: grafana/grafana
        url: https://pkg.go.dev/github.com/grafana/grafana?tab=overview
        desc: 开源的监控与可观测性平台
      - text: istio/istio
        url: https://pkg.go.dev/github.com/istio/istio?tab=overview
        desc: 开源的服务网格与可集成平台
  - title: 命令行库
    viewMoreUrl: https://pkg.go.dev/search?q=command%20line%20OR%20CLI
    items:
      - text: spf13/cobra
        url: https://pkg.go.dev/github.com/spf13/cobra?tab=overview
        desc: 用于创建强大现代CLI应用程序的库，并提供生成Go应用程序和CLI应用程序的工具
      - text: spf13/viper
        url: https://pkg.go.dev/github.com/spf13/viper?tab=overview
        desc: Go应用程序的完整配置解决方案，设计用于在应用内部处理配置需求与格式
      - text: urfave/cli
        url: https://pkg.go.dev/github.com/urfave/cli?tab=overview
        desc: 用于创建和组织Go命令行应用程序的极简框架
  - title: 其他项目
    items:
      - text: golang-migrate/migrate
        url: https://pkg.go.dev/github.com/golang-migrate/migrate?tab=overview
        desc: 用Go编写的数据库迁移工具
`}}