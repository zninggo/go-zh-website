---
title: Go 开发者安全最佳实践
layout: article
---

[返回 Go 安全页面](/security)

本页面为 Go 开发者提供了一系列最佳实践，以帮助您将项目的安全性置于首位。从使用模糊测试实现自动化测试到轻松检查竞态条件，这些技巧能让您的代码库更安全、更可靠。

## 扫描源代码和二进制文件中的漏洞

定期扫描您的代码和二进制文件以查找漏洞，有助于尽早发现潜在的安全风险。
您可以使用 [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)，该工具由 [Go 漏洞数据库](https://pkg.go.dev) 提供支持，用于扫描代码中的漏洞并分析哪些漏洞真正影响到您。
请通过 [govulncheck 教程](/doc/tutorial/govulncheck) 开始使用。

Govulncheck 也可以集成到 CI/CD 工作流中。
Go 团队在 GitHub Marketplace 上提供了一个 [用于 govulncheck 的 GitHub Action](https://github.com/marketplace/actions/golang-govulncheck-action)。
Govulncheck 还支持 `-json` 标志，帮助开发者将漏洞扫描与其他 CI/CD 系统集成。

您还可以通过使用 [Visual Studio Code 的 Go 扩展](/security/vuln/editor) 在代码编辑器中直接扫描漏洞。
请通过 [此教程](/doc/tutorial/govulncheck-ide) 开始使用。

## 保持 Go 版本和依赖项为最新状态

保持您的 [Go 版本为最新](/doc/install) 可以让您使用最新的语言特性、性能改进以及针对已知安全漏洞的补丁。
更新的 Go 版本还能确保与更新版本的依赖项兼容，有助于避免潜在的集成问题。
请查看 [Go 发布历史](/doc/devel/release)，了解各个版本之间的变更内容。
Go 团队在整个发布周期内会发布修订版，以解决安全错误。
请务必更新到最新的 Go 次要版本，以确保您拥有最新的安全修复。

维护最新的第三方依赖项对于软件安全、性能以及遵守 Go 生态系统的最新标准也至关重要。
然而，未经彻底审查就更新到最新版本 [也可能存在风险](https://research.swtch.com/npm-colors)，可能引入新的错误、不兼容的更改，甚至是恶意代码。
因此，虽然为了获得最新的安全补丁和改进而更新依赖项是必不可少的，但每次更新都应经过仔细审查和测试。

## 使用模糊测试发现边缘情况下的漏洞利用

[模糊测试](/security/fuzz) 是一种自动化测试，它使用覆盖率引导来操纵随机输入并遍历代码，以查找并报告潜在的漏洞，例如 SQL 注入、缓冲区溢出、拒绝服务攻击和跨站脚本攻击。
模糊测试通常能发现程序员遗漏或认为过于不可能而未测试的边缘情况。
请通过 [此教程](/doc/tutorial/fuzz) 开始使用。

## 使用 Go 的竞态检测器检查竞态条件

当两个或多个 [goroutine](/tour/concurrency/1) 并发访问同一个资源，并且至少有一个访问是写操作时，就会发生竞态条件。
这可能导致您的软件出现难以诊断且不可预测的问题。
使用内置的 [竞态检测器](/doc/articles/race_detector) 识别 Go 代码中潜在的竞态条件，该检测器可以帮助您确保并发程序的安全性和可靠性。
请注意，竞态检测器仅能发现运行时发生的竞态，因此它不会发现未执行的代码路径中的竞态。

要使用竞态检测器，请在运行测试或构建应用程序时添加 `-race` 标志，例如 `go test -race`。
这将编译您的代码并启用竞态检测器，报告其在运行时检测到的任何竞态条件。
当竞态检测器发现程序中的数据竞争时，它会 [打印一份报告](/doc/articles/race_detector#report-format)，其中包含冲突访问的堆栈跟踪，以及相关 goroutine 创建位置的堆栈信息。

## 使用 Vet 检查可疑构造

Go 的 [vet 命令](https://pkg.go.dev/cmd/vet) 旨在分析您的源代码并标记潜在问题，这些问题不一定是语法错误，但可能导致运行时问题。
这些可疑构造包括：不可达代码、未使用的变量以及围绕 goroutine 的常见错误。
通过在开发过程中尽早捕获这些问题，go vet 有助于保持代码质量，减少调试时间，并提高软件的整体可靠性。
要为指定项目运行 go vet，请执行：
```
go vet ./...
```
## 订阅 golang-announce 获取安全发布通知

包含安全修复的 Go 版本会预先通知至低流量的邮件列表 [golang-announce@googlegroups.com](https://groups.google.com/group/golang-announce)。如果您希望了解 Go 自身安全修复的进展，请订阅此列表。