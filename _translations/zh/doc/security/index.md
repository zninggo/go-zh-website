---
title: 安全
layout: article
---

本页面为Go开发者提供提升项目安全性的资源。

（另请参阅：[Go开发者安全最佳实践](/security/best-practices)。）

## 查找与修复已知漏洞

Go的漏洞检测旨在为开发者提供低噪音、可靠的工具，帮助了解可能影响其项目的已知漏洞。若要概览，请从[此摘要与FAQ页面](/security/vuln)开始了解Go的漏洞管理体系。若想实际操作，可探索以下工具。

### 使用govulncheck扫描代码漏洞

开发者可使用govulncheck工具判断哪些已知漏洞会影响其代码，并根据实际调用的脆弱函数和方法确定优先处理步骤。

- [查看govulncheck文档](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)
- [教程：govulncheck入门](/doc/tutorial/govulncheck)

### 在编辑器中检测漏洞

VS Code Go扩展会检查第三方依赖并显示相关漏洞。

- [用户文档](/security/vuln/editor)
- [下载VS Code Go](https://marketplace.visualstudio.com/items?itemName=golang.go)
- [教程：VS Code Go入门](/doc/tutorial/govulncheck-ide)

### 查找可构建的Go模块

[Pkg.go.dev](https://pkg.go.dev/) 是一个用于发现、评估和学习Go包与模块的网站。在pkg.go.dev上发现和评估包时，如果该版本存在漏洞，[页面顶部会显示横幅提示](https://pkg.go.dev/golang.org/x/text@v0.3.7/language)。此外，你可以在版本历史页面查看[影响包每个版本的漏洞](https://pkg.go.dev/golang.org/x/text@v0.3.7/language?tab=versions)。

### 浏览漏洞数据库

Go漏洞数据库直接从Go包维护者以及[MITRE](https://www.cve.org/)和[GitHub](https://github.com/)等外部来源收集数据。报告由Go安全团队精心整理。

- [在Go漏洞数据库中浏览报告](https://pkg.go.dev/vuln/)
- [查看Go漏洞数据库文档](/security/vuln/database)
- [向数据库贡献公开漏洞](/s/vulndb-report-new)

## 报告Go项目中的安全缺陷

### [安全策略](/security/policy)

请查阅安全策略，了解如何[报告Go项目中的漏洞](/security/policy#reporting-a-security-bug)。该页面还详细说明了Go安全团队跟踪问题并向公众披露的过程。有关过去安全修复的详情，请查看[发布历史](/doc/devel/release)。根据[发布策略](/doc/devel/release#policy)，我们会对Go最近的两个主要版本发布安全修复。

- [关于常见报告漏洞的分类决定](/doc/security/decisions)

## 通过模糊测试测试异常输入

Go原生模糊测试提供了一种自动化测试方式，通过持续操控程序输入来查找缺陷。从Go 1.18开始，Go在其标准工具链中支持模糊测试。原生Go模糊测试[受OSS-Fuzz支持](https://google.github.io/oss-fuzz/getting-started/new-project-guide/go-lang/#native-go-fuzzing-support)。

- [回顾模糊测试基础](/security/fuzz)
- [教程：模糊测试入门](/doc/tutorial/fuzz)

## 使用Go加密库保障服务安全

Go的加密库旨在帮助开发者构建安全的应用程序。请参阅[crypto包文档](https://pkg.go.dev/golang.org/x/crypto)和[golang.org/x/crypto/](https://pkg.go.dev/golang.org/x/crypto)。

## FIPS 140-3合规加密

Go的加密库可用于FIPS 140-3合规模式，以适用于受监管环境。更多信息请参阅[FIPS 140-3合规文档](/doc/security/fips140)。