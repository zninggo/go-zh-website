---
title: Go安全政策
layout: article
breadcrumb: true
---

## 概述

本文档说明了Go安全团队处理所报告问题的流程以及预期的回应。

## 报告安全漏洞

Go发行版中的所有安全漏洞都应通过电子邮件报告至[security@golang.org](mailto:security@golang.org)。此邮箱会将邮件送达Go安全团队。

请将邮件主题格式化为"漏洞：{包名}：{单行摘要}"，并避免在邮件中发送附件，除非绝对必要，以防止您的邮件被标记为垃圾邮件。

请保持报告简洁，包括对您发现问题的描述、您认为其可能被利用的方式，以及一个能重现该问题的小型复现测试用例或程序。

我们有一份[常见报告问题类别的决定清单](/doc/security/decisions)。

您的邮件将在7天内得到确认，您将被持续告知进展直至问题解决。您的问题将在90天内被修复或公开。

如果您的邮件在7天内未收到回复，请再次通过[security@golang.org](mailto:security@golang.org)跟进联系Go安全团队。请确保您的邮件中包含 **漏洞** 一词。

如果再过3天您仍未收到报告的确认，那么您的邮件可能已被标记为垃圾邮件。在这种情况下，请[在此处提交一个问题](https://g.co/vulnz)。选择 _"我希望报告一个技术安全或滥用风险相关的Google产品（SQLi、XSS等）问题"_，并将 _"Go"_ 列为受影响的产品。

## 分级

根据您问题的性质，Go安全团队会将其归类为"公开"、"私密"或"紧急"级别的问题。所有安全问题都将被分配CVE编号。

Go安全团队不会为安全问题分配传统的细粒度严重性标签（例如，严重、高、中、低），因为严重性高度取决于用户如何使用受影响的API或功能。此外，在为Go安全问题分配CVE时，我们不分配CVSS评分，因为我们从根本上认为该评分系统不适用于Go，原因同上。第三方，如MITRE或NIST（通过NVD），可能会为我们的漏洞分配CVSS评分，但我们不认可这些评分能够准确反映其影响。

例如，`encoding/json` 解析器中的资源耗尽问题的影响取决于被解析的内容。如果用户正在解析来自其本地文件系统的受信任JSON文件，影响可能较低。如果用户正在解析来自HTTP请求体的不受信任的任意JSON，影响可能会大得多。

话虽如此，以下问题分级确实表明了安全团队认为一个问题的严重程度和/或影响范围。例如，对许多用户有中等至显著影响的问题，在本政策中是"私密"级别问题；而影响微不足道或轻微，或者仅影响一小部分用户的问题，则是"公开"级别问题。

### 公开

"公开"级别问题影响的是小众配置，影响非常有限，或者已经广为人知。

"公开"级别问题被标记为 [`Proposal-Security`](https://github.com/golang/go/labels/Proposal-Security)，通过 [Go提案审查流程](https://go.googlesource.com/proposal/+/master/README.md#proposal-review) 进行讨论，**在公开状态下修复**，并被向后移植到下一个预定的[次要版本发布](/wiki/MinorReleases)（大约每月一次）。发布说明包含这些问题的详细信息，但不会有预先公告。

过去"公开"级别问题的例子包括：
-   [#44916](/issue/44916): archive/zip：调用Reader.Open时可能引发恐慌
-   [#44913](/issue/44913): encoding/xml：当与自定义TokenReader一起使用xml.NewTokenDecoder时出现无限循环
-   [#43786](/issue/43786): crypto/elliptic：P-224曲线上的错误操作
-   [#40928](/issue/40928): net/http/cgi, net/http/fcgi：当未指定Content-Type时的跨站脚本（XSS）
-   [#40618](/issue/40618): encoding/binary：ReadUvarint和ReadVarint可能从无效输入中读取无限数量的字节
-   [#36834](/issue/36834): crypto/x509：在Windows 10上绕过证书验证

### 私密

"私密"级别问题是对已承诺的安全属性的违反。

"私密"级别问题将在**下一个预定的[次要版本发布](/wiki/MinorReleases)中修复**，并在此之前保持私密状态。

在发布前3至7天，会向golang-announce发送一个预先公告，宣布即将发布的版本中存在一个或多个安全修复，以及这些问题是否影响标准库、工具链或两者，同时为每个修复预留CVE ID。

对于存在于[主要版本候选发布](/s/release)中的问题，我们遵循相同的过程，包括在下一个预定候选发布中进行修复。

过去"私密"级别问题的一些例子包括：
-   [#53416](/issue/53416): path/filepath：Glob中的栈耗尽
-   [#53616](/issue/53616): go/parser：所有Parse*函数中的栈耗尽
-   [#54658](/issue/54658): net/http：发送GOAWAY后处理服务器错误
-   [#56284](/issue/56284): syscall, os/exec：环境变量中未经清理的NUL

### 紧急

"紧急"级别问题威胁到Go生态系统的完整性，或者正在被实际利用，导致严重损害。目前没有近期的例子，但此类问题可能包括net/http中的远程代码执行，或crypto/tls中的实际密钥恢复。

"紧急"级别问题会在私密状态下修复，并**触发立即的专项安全发布**，可能不会有预先公告。

## 将现有问题标记为安全相关如果您认为某个[现有问题](/issue)与安全相关，请通过电子邮件发送至[security@golang.org](mailto:security@golang.org)。邮件中应包含问题ID以及需依据此安全策略处理的简要说明。

## 披露流程

Go项目采用以下披露流程：

1.  收到安全报告后，将指定一位主要负责人。此人负责协调修复和发布过程。
2.  确认问题并确定受影响的软件清单。
3.  对代码进行审计，以查找任何潜在的类似问题。
4.  如果与提交者协商后确定需要CVE编号，主要负责人将获取该编号。
5.  为最近的两个主要版本以及最新的开发主线（head/master）版本准备修复程序，并将修复合并到主线。
6.  修复程序应用的当天，将向[golang-announce](https://groups.google.com/group/golang-announce)、[golang-dev](https://groups.google.com/group/golang-dev)和[golang-nuts](https://groups.google.com/group/golang-nuts)发送公告。

此过程可能需要一些时间，特别是当需要与其他项目的维护者协调时。我们将尽一切努力尽可能及时地处理漏洞，但遵循上述流程以确保披露处理的一致性至关重要。

对于涉及分配CVE编号的安全问题，该问题将在[CVEDetails网站的"Golang"产品页面](https://www.cvedetails.com/vulnerability-list/vendor_id-14185/Golang.html)以及[美国国家漏洞数据库网站](https://web.nvd.nist.gov/view/vuln/search)上公开列出。

## 接收安全更新

接收安全公告的最佳方式是订阅[golang-announce](https://groups.google.com/forum/#!forum/golang-announce)邮件列表。任何与安全问题相关的消息都将以`[security]`作为前缀。

## 对此政策的建议

如果您对完善此政策有任何建议，请[提交一个新问题](/issue/new)以供讨论。