---
title: "面向Web开发的Go语言"
linkTitle: "Web Development"
description: "凭借卓越的内存性能与多种IDE支持，Go驱动着快速且可扩展的Web应用程序。"
date: 2019-10-04T15:26:31-04:00
series: Use Cases
template: true
books:
icon:
  file: webdev-green.svg
  alt: web dev icon
iconDark:
  file: webdev-white.svg
  alt: web dev icon
---

## 概述 {#overview .sectionHeading}

### Go为Web应用程序提供速度、安全性和开发者友好的工具

Go语言旨在帮助开发者快速构建可扩展且安全的Web应用程序。Go自带一个易于使用、安全且高性能的Web服务器，并内置了其自身的Web模板库。Go对从[HTTP/2](https://pkg.go.dev/net/http)到[MySQL](https://pkg.go.dev/mod/github.com/go-sql-driver/mysql)、[MongoDB](https://pkg.go.dev/mod/go.mongodb.org/mongo-driver)和[Elasticsearch](https://pkg.go.dev/mod/github.com/elastic/go-elasticsearch/v8)等数据库，乃至包括[TLS 1.3](https://pkg.go.dev/crypto/tls)在内的最新加密标准，都提供了出色的支持。得益于Go极强的可移植性，Go Web应用程序可原生运行在[Google App Engine](https://cloud.google.com/appengine/)和[Google Cloud Run](https://cloud.google.com/run/)（便于扩展）上，也可运行于任何环境、云或操作系统中。

## 主要优势 {#key-benefits .sectionHeading}

### 以前所未有的速度实现跨平台部署

对于企业而言，Go因其能实现快速的跨平台部署而备受青睐。凭借其goroutine（协程）、原生编译能力以及基于URI的包命名空间，Go代码可以编译成一个单独的、体积小的二进制文件——且零依赖——使其运行速度非常快。

### 利用Go开箱即用的性能轻松扩展

Hexact Inc.的联合创始人兼首席技术官Tigran Bayburtsyan总结了其公司转向Go的五个关键原因：

-   **编译为单一二进制文件** —— “通过静态链接，Go实际上会将所有依赖库和模块根据操作系统类型和架构合并为一个单独的二进制文件。”

-   **静态类型系统** —— “对于大规模应用程序，类型系统至关重要。”

-   **性能** —— “由于其并发模型和CPU可扩展性，Go表现更佳。每当我们需要处理一些内部请求时，我们都会使用独立的Goroutine（协程），它们比Python线程在资源消耗上要便宜10倍。”

-   **无需Web框架** —— “在大多数情况下，你确实不需要任何第三方库。”

-   **卓越的IDE支持与调试能力** —— “在将所有项目重写为Go后，我们的代码量比以前减少了64%。”## 开始学习 {#get-started .sectionHeading}

### Web开发相关的Go语言书籍

{{books `
  - title: Go语言Web开发
    url: https://www.amazon.com/Web-Development-Go-Building-Scalable-ebook/dp/B01JCOC6Z6
    thumbnail: /images/books/web-development-with-go.jpg
  - title: Go语言Web编程
    url: https://www.amazon.com/Web-Programming-Sau-Sheong-Chang/dp/1617292567
    thumbnail: /images/books/go-web-programming.jpg
  - title: "Web开发实战指南：使用Go构建全栈Web应用"
    url: https://www.amazon.com/Web-Development-Cookbook-full-stack-applications-ebook/dp/B077TVQ28W
    thumbnail: /images/books/go-web-development-cookbook.jpg
  - title: 使用Go构建RESTful Web服务
    url: https://www.amazon.com/Building-RESTful-Web-services-gracefully-ebook/dp/B072QB8KL1
    thumbnail: /images/books/building-restful-web-services-with-go.jpg
  - title: 精通Go语言Web服务
    url: https://www.amazon.com/Mastering-Web-Services-Nathan-Kozyra-ebook/dp/B00W5GUKL6
    thumbnail: /images/books/mastering-go-web-services.jpg
`}}{{libraries `
  - title: Web框架
    viewMoreUrl: https://pkg.go.dev/search?q=web+framework
    items:
      - text: Echo
        url: https://echo.labstack.com/
        desc: 高性能、可扩展且极简的Go Web框架
      - text: Flamingo
        url: https://www.flamingo.me/
        desc: 基于Go语言的快速开源框架，具备清晰可扩展的架构
      - text: Gin
        url: https://gin-gonic.com/
        desc: 用Go编写的Web框架，具有类似Martini的API
      - text: Gorilla
        url: https://www.gorillatoolkit.org/
        desc: 面向Go编程语言的Web工具包
  - title: 路由器
    viewMoreUrl: https://pkg.go.dev/search?q=http%20router
    items:
      - text: net/http
        url: https://pkg.go.dev/net/http
        desc: 标准库HTTP包
      - text: julienschmidt/httprouter
        url: https://pkg.go.dev/github.com/julienschmidt/httprouter?tab=overview
        desc: 轻量级高性能HTTP请求路由器
      - text: gorilla/mux
        url: https://pkg.go.dev/github.com/gorilla/mux?tab=overview
        desc: 强大的HTTP路由器和URL匹配器，用于构建Go Web服务器 🦍
      - text: Chi
        url: https://pkg.go.dev/github.com/go-chi/chi?tab=overview
        desc: 轻量级、符合Go语言习惯且可组合的路由器，用于构建Go HTTP服务
  - title: 模板引擎
    viewMoreUrl: https://pkg.go.dev/search?q=templates
    items:
      - text: html/template
        url: https://pkg.go.dev/html/template
        desc: 标准库HTML模板引擎
      - text: flosch/pongo2
        url: https://pkg.go.dev/github.com/flosch/pongo2?tab=overview
        desc: 类似Django语法的模板语言
  - title: 数据库与驱动
    viewMoreUrl: https://pkg.go.dev/search?q=database%20OR%20sql
    items:
      - text: database/sql
        url: https://pkg.go.dev/database/sql
        desc: 标准库接口，支持MySQL、PostgreSQL、Oracle、MS SQL、BigQuery及大多数SQL数据库的驱动
      - text: mongo-driver/mongo
        url: https://pkg.go.dev/go.mongodb.org/mongo-driver/mongo?tab=overview
        desc: MongoDB官方支持的Go驱动程序
      - text: elastic/go-elasticsearch
        url: https://pkg.go.dev/github.com/elastic/go-elasticsearch/v8?tab=overview
        desc: 面向Go语言的Elasticsearch客户端
      - text: GORM
        url: https://gorm.io/
        desc: 面向Go语言的ORM库
      - text: Bleve
        url: https://blevesearch.com/
        desc: 面向Go语言的全文搜索与索引
      - text: CockroachDB
        url: https://www.cockroachlabs.com/
        desc: 数据库技术的革新——专为云环境设计，提供弹性、一致、分布式的规模化SQL服务
  - title: Web库
    viewMoreUrl: https://pkg.go.dev/search?q=web
    items:
      - text: markbates/goth
        url: https://pkg.go.dev/github.com/markbates/goth?tab=overview
        desc: Web应用身份验证库
      - text: jinzhu/gorm
        url: https://pkg.go.dev/github.com/jinzhu/gorm?tab=overview
        desc: 面向Go语言的ORM库
      - text: dgrijalva/jwt-go
        url: https://pkg.go.dev/github.com/dgrijalva/jwt-go?tab=overview
        desc: JSON Web Tokens的Go语言实现
  - title: 其他项目
    items:
      - text: gopherjs
        url: https://pkg.go.dev/github.com/gopherjs/gopherjs?tab=overview
        desc: 将Go语言编译为JavaScript的编译器，允许开发者使用Go编写可在所有浏览器中运行的前端代码
`}}

### 课程
* [学习使用Go创建Web应用](https://www.usegolang.com)，付费在线课程

### 项目
*   {{pkg "github.com/gopherjs/gopherjs" "gopherjs"}}，将Go语言编译为JavaScript的编译器，允许开发者使用Go编写可在所有浏览器中运行的前端代码
*   [Hugo](https://gohugo.io/)，全球最快的网站构建框架
*   [Mattermost](https://mattermost.com/)，灵活、开源的即时通讯平台，支持安全团队协作
*   [Caddy](https://caddyserver.com/)，强大的、企业级就绪的开源Web服务器，支持自动HTTPS，使用Go编写