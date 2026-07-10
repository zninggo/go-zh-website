---
title: Go CNA 政策
layout: article
---

[返回 Go 漏洞管理](/security/vuln)

## 概述

Go CNA 是一个 [CVE 编号授权机构](https://www.cve.org/ProgramOrganization/CNAs)，负责为 Go 生态系统中的公共漏洞分配 [CVE ID](https://www.cve.org/ResourcesSupport/Glossary?activeTerm=glossaryCVEID) 并发布 [CVE 记录](https://www.cve.org/ResourcesSupport/Glossary?activeTerm=glossaryRecord)。它是 Google CNA 的一个子 CNA。

## 范围

Go CNA 涵盖 Go 项目（Go [标准库](/pkg)和[子仓库](https://pkg.go.dev/golang.org/x)）中的漏洞，以及其他 CNA 尚未覆盖的可导入 Go 模块中的公共漏洞。

此范围旨在明确排除那些使用 Go 编写但不可导入的应用程序或包（例如，`main` 包中的任何内容）中的漏洞。有关排除报告的更多信息，请参阅 [go.dev/security/vuln/database#excluded-reports](/security/vuln/database#excluded-reports)。

若要报告 Go 项目中潜在的新漏洞，请参阅 [go.dev/security/policy](/security/policy)。

## 为公共漏洞请求 CVE ID

**重要提示**：下面链接的表单会在问题跟踪器上创建一个公开的问题，因此**绝不能**用于报告 Go 中未披露的漏洞（有关报告未披露问题的说明，请参阅我们的[安全策略](/security/policy)）。

要为 Go 生态系统中已存在的**公共**漏洞请求 CVE ID，请[通过此表单提交请求](/s/vulndb-report-new)。

如果一个漏洞已经被公开披露，或者它存在于您维护的包中，并且您已准备好公开披露它，则该漏洞被视为公共漏洞。