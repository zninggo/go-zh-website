---
title: Go 漏洞管理
layout: article
---

[返回 Go 安全](/security)

## 概述

Go 帮助开发者检测、评估并修复那些可能被攻击者利用的错误或弱点。在幕后，Go 团队运行着一个流水线来管理关于漏洞的报告，这些报告存储在 Go 漏洞数据库中。各种库和工具可以读取并分析这些报告，以了解特定用户项目可能受到的影响。此功能已集成到 [Go 包发现站点](https://pkg.go.dev) 和一个新命令行工具 govulncheck 中。

本项目仍在开发中，我们正在积极推进。欢迎提供您的[反馈](#feedback)以帮助我们改进！

**注意**：若要报告 Go 项目中的安全漏洞，请参阅 [Go 安全策略](/security/policy)。

## 架构

<div class="image">
  <center>
    <img style="width: 100%" width="2110" height="952" src="architecture.png" alt="Go 漏洞管理架构"></img>
  </center>
</div>

Go 中的漏洞管理包含以下高层组成部分：

1.  **数据流水线**从多个来源收集漏洞信息，包括[国家漏洞数据库 (NVD)](https://nvd.nist.gov/)、[GitHub 安全公告数据库](https://github.com/advisories)以及[直接来自 Go 包维护者](/s/vulndb-report-new)的报告。
2.  **漏洞数据库**使用来自数据流水线的信息进行填充。数据库中的所有报告均经过 Go 安全团队审核和管理。报告采用[开源漏洞 (OSV) 格式](https://ossf.github.io/osv-schema/)，并通过 [API](/security/vuln/database#api) 访问。
3.  与 [pkg.go.dev](https://pkg.go.dev) 和 govulncheck 的**集成**，使开发者能够发现其项目中的漏洞。[govulncheck 命令](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)会分析您的代码库，并仅呈现实际影响您的漏洞，其依据是您代码中的哪些函数正在传递调用存在漏洞的函数。Govulncheck 提供了一种低噪声、可靠的方式来发现项目中的已知漏洞。

## 资源

### Go 漏洞数据库

[Go 漏洞数据库](https://vuln.go.dev)不仅包含来自许多现有来源的信息，还包含 Go 包维护者向 Go 安全团队提交的直接报告。数据库中的每个条目都经过审核，以确保漏洞描述、包和符号信息以及版本详细信息的准确性。

有关 Go 漏洞数据库的更多信息，请参阅 [go.dev/security/vuln/database](/security/vuln/database)；要在浏览器中查看数据库中的漏洞，请访问 [pkg.go.dev/vuln](https://pkg.go.dev/vuln)。

我们鼓励包维护者[提交](#feedback)其自身项目中公开漏洞的信息，并[向我们发送建议](/s/vuln-feedback)以减少相关摩擦。

### Go 的漏洞检测

Go 的漏洞检测旨在为 Go 用户了解可能影响其项目的已知漏洞提供一种低噪声、可靠的方式。漏洞检查已集成到 Go 的工具和服务中，包括一个新的命令行工具 [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)、[Go 包发现站点](https://pkg.go.dev)以及像 VS Code 配合 Go 扩展这样的[主流编辑器](/security/vuln/editor)。

要开始使用 govulncheck，请在您的项目目录下运行以下命令：```
$ go install golang.org/x/vuln/cmd/govulncheck@latest
$ govulncheck ./...
```要为您的编辑器启用漏洞检测功能，请参阅[编辑器集成](/security/vuln/editor)页面的说明。

### Go CNA（CVE 编号机构）

Go 安全团队是 [CVE 编号机构](https://www.cve.org/ProgramOrganization/CNAs)。更多信息请访问 [go.dev/security/vuln/cna](/security/vuln/cna)。

## 反馈

我们非常欢迎您通过以下方式贡献并帮助我们改进：

- 为您维护的 Go 包[提交新的](/s/vulndb-report-new)和[更新现有的](/s/vulndb-report-feedback)公共漏洞信息
- [参与此调查](/s/govulncheck-feedback)分享您使用 govulncheck 的体验
- [向我们反馈](/s/vuln-feedback)问题和功能请求

## 常见问题

**如何报告 Go 项目中的漏洞？**

请通过电子邮件 [security@golang.org](mailto:security@golang.org) 报告 Go 项目中的所有安全漏洞。阅读 [Go 安全策略](/security/policy)了解我们的处理流程。

**如何向 Go 漏洞数据库添加公共漏洞？**

要请求向 Go 漏洞数据库添加公共漏洞，请[填写此表单](/s/vulndb-report-new)。

如果漏洞已经公开披露，或者存在于您维护的包中（且您已准备好披露），则该漏洞被视为公共漏洞。该表单仅适用于可导入的、非 Go 团队维护的 Go 包中的公共漏洞（即 Go 标准库、Go 工具链和 golang.org 模块之外的内容）。

该表单也可用于申请新的 CVE ID。[在此阅读](/security/vuln/cna)关于 Go CVE 编号机构的更多信息。

**如何建议修改现有漏洞报告？**

要建议修改 Go 漏洞数据库中的现有报告，请[在此填写表单](/s/vulndb-report-feedback)。

**如何报告问题或提供关于 govulncheck 的反馈？**

请在 [Go 问题跟踪器](/s/vuln-feedback)上提交您的问题或反馈。

**我在其他数据库中发现了这个漏洞，为什么 Go 漏洞数据库中没有？**

报告可能因多种原因被排除在 Go 漏洞数据库之外，例如：相关漏洞不存在于 Go 包中、漏洞存在于可安装的命令而非可导入的包中，或漏洞已被数据库中已有的另一个漏洞所涵盖。您可以[在此了解更多](/security/vuln/database#excluded-reports)关于 Go 安全团队排除报告的原因。如果您认为某个报告被错误地排除在 vuln.go.dev 之外，[请告知我们](/s/vulndb-report-feedback)。

**为什么 Go 漏洞数据库不使用严重性标签？**

大多数漏洞报告格式使用诸如“低”、“中”和“严重”等严重性标签来指示不同漏洞的影响，并帮助开发者确定安全问题的优先级。然而，由于多种原因，Go 避免使用此类标签。

漏洞的影响很少是普遍适用的，这意味着严重性指标可能具有误导性。例如，解析器中的崩溃如果用于解析用户提供的输入并可能被用于拒绝服务攻击，则可能是严重级别问题；但如果该解析器仅用于解析本地配置文件，那么即使将其严重性称为“低”也可能言过其实。

标记严重性也必然带有主观性。即使对于[ CVE 计划](https://www.cve.org/About/Overview)也是如此，该计划提出了一种分解漏洞相关方面的公式，例如攻击向量、复杂性和可利用性。然而，所有这些都需要主观评估。

我们认为，对漏洞的良好描述比严重性指标更有用。良好的描述可以阐明问题是什么、如何触发，以及用户在评估对其自身软件的影响时应考虑什么。

如果您想就此主题与我们分享您的想法，请随时[提交问题](/s/vuln-feedback)。