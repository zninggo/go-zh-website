---
title: Go 开发者安全最佳实践
layout: article
---

[返回 Go 安全](/security)

本页为 Go 开发者提供了优先保障项目安全性的最佳实践。从使用模糊测试自动化测试到轻松检查竞态条件，这些提示能帮助您构建更安全、更可靠的代码库。

## 扫描源代码和二进制文件的漏洞

定期扫描您的代码和二进制文件有助于早期识别潜在的安全风险。您可以使用 [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)（由 [Go 漏洞数据库](https://pkg.go.dev) 支持）来扫描代码中的漏洞，并分析哪些漏洞真正影响到您。请从 [govulncheck 教程](/doc/tutorial/govulncheck) 开始了解。

govulncheck 也可以集成到 CI/CD 流程中。Go 团队在 GitHub Marketplace 上提供了 [govulncheck 的 GitHub Action](https://github.com/marketplace/actions/golang-govulncheck-action)。govulncheck 还支持 `-json` 标志，以帮助开发者将漏洞扫描与其他 CI/CD 系统集成。

您也可以通过使用 [Visual Studio Code 的 Go 扩展](/security/vuln/editor) 直接在代码编辑器中扫描漏洞。请从 [这个教程](/doc/tutorial/govulncheck-ide) 开始了解。

## 保持 Go 版本和依赖项更新

保持您的 [Go 版本为最新](/doc/install) 可以让您访问最新的语言特性、性能改进以及针对已知安全漏洞的补丁。更新的 Go 版本还能确保与更新版本的依赖项兼容，有助于避免潜在的集成问题。请查阅 [Go 版本历史](/doc/devel/release) 以了解版本之间对 Go 做了哪些更改。Go 团队在整个发布周期内会发布小版本更新以修复安全错误。请务必更新到最新的 Go 次要版本，以确保您拥有最新的安全修复。

维护更新的第三方依赖项对于软件安全、性能以及遵守 Go 生态系统中的最新标准也至关重要。然而，不加仔细审查地更新到最新版本 [也可能存在风险](https://research.swtch.com/npm-colors)，可能会引入新的错误、不兼容的更改，甚至恶意代码。因此，虽然为了最新的安全补丁和改进而更新依赖项至关重要，但每次更新都应经过仔细审查和测试。

## 使用模糊测试发现边缘情况利用

[模糊测试](/security/fuzz) 是一种自动化测试类型，它使用覆盖率引导来操纵随机输入并遍历代码，以发现并报告潜在的漏洞，如 SQL 注入、缓冲区溢出、拒绝服务和跨站脚本攻击。模糊测试通常能触及程序员遗漏或认为概率太低而不去测试的边缘情况。请从 [这个教程](/doc/tutorial/fuzz) 开始了解。

## 使用 Go 的竞态检测器检查竞态条件

当两个或多个 [协程](/tour/concurrency/1) 并发访问同一资源，并且至少其中一个访问是写操作时，就会发生竞态条件。这可能导致软件中出现不可预测、难以诊断的问题。使用内置的 [竞态检测器](/doc/articles/race_detector) 识别 Go 代码中的潜在竞态条件，可以帮助您确保并发程序的安全性和可靠性。然而，竞态检测器只能发现运行时发生的竞态，对于未执行的代码路径中的竞态则无法发现。

要使用竞态检测器，请在运行测试或构建应用程序时添加 `-race` 标志，例如 `go test -race`。这将在启用竞态检测器的情况下编译您的代码，并在运行时报告任何检测到的竞态条件。当竞态检测器在程序中发现数据竞争时，它将 [打印一份报告](/doc/articles/race_detector#report-format)，其中包含冲突访问的堆栈跟踪，以及相关协程被创建时的堆栈。

## 使用 Vet 检查可疑构造

Go 的 [vet 命令](https://pkg.go.dev/cmd/vet) 旨在分析您的源代码并标记潜在问题，这些问题不一定是语法错误，但可能导致运行时出现问题。这些问题包括可疑构造，例如不可达代码、未使用的变量以及围绕协程的常见错误。通过在开发过程中尽早发现这些问题，go vet 有助于维护代码质量，减少调试时间，并提高整体软件可靠性。要为指定项目运行 go vet，请执行：```
go vet ./...
```## 请订阅 golang-announce 以接收安全版本发布通知

包含安全修复的 Go 版本会预先通知到低流量邮件列表 [golang-announce@googlegroups.com](https://groups.google.com/group/golang-announce)。如果您希望了解 Go 本身安全修复的进展，请订阅此列表。