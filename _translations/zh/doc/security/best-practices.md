---
title: Go 开发者安全最佳实践
layout: article
---

[返回 Go 安全主页](/security)

本页为 Go 开发者提供了一些最佳实践，旨在帮助他们优先考虑项目的安全性。从通过模糊测试实现自动化测试，到轻松检查竞态条件，这些技巧能帮助你打造更安全可靠的代码库。

## 扫描源代码和二进制文件中的漏洞

定期扫描代码和二进制文件中的漏洞有助于尽早发现潜在的安全风险。
你可以使用 [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)，该工具由 [Go 漏洞数据库](https://pkg.go.dev) 支持，用于扫描代码中的漏洞并分析哪些漏洞实际影响了你的代码。
可以通过 [govulncheck 教程](/doc/tutorial/govulncheck) 开始使用。

govulncheck 也可以集成到 CI/CD 流程中。
Go 团队在 GitHub Marketplace 上提供了一个用于 govulncheck 的 [GitHub Action](https://github.com/marketplace/actions/golang-govulncheck-action)。
govulncheck 还支持 `-json` 标志，帮助开发者将漏洞扫描与其他 CI/CD 系统集成。

你还可以通过 [Visual Studio Code 的 Go 扩展](/security/vuln/editor) 直接在代码编辑器中进行漏洞扫描。
可以通过 [此教程](/doc/tutorial/govulncheck-ide) 开始使用。

## 保持 Go 版本和依赖项为最新

保持你的 [Go 版本为最新](/doc/install) 可以让你获得最新的语言特性、性能改进以及针对已知安全漏洞的补丁。
更新后的 Go 版本还能确保与新版本依赖项的兼容性，有助于避免潜在的集成问题。
查看 [Go 发行历史](/doc/devel/release) 以了解版本之间所做的更改。
Go 团队在整个发布周期内会发布次要版本，以解决安全漏洞。
请务必更新到最新的 Go 次要版本，以确保你拥有最新的安全修复。

维护最新的第三方依赖项对于软件安全性、性能以及符合 Go 生态系统最新标准也至关重要。
然而，未经充分审查就更新到最新版本 [也可能带来风险](https://research.swtch.com/npm-colors)，可能引入新的错误、不兼容的更改，甚至是恶意代码。
因此，虽然为获取最新的安全补丁和改进而更新依赖项至关重要，但每次更新都应经过仔细审查和测试。

## 使用模糊测试发现边缘情况漏洞

[模糊测试](/security/fuzz) 是一种自动化测试类型，它使用覆盖率指导来操纵随机输入并遍历代码，以发现并报告潜在的漏洞，例如 SQL 注入、缓冲区溢出、拒绝服务攻击和跨站脚本攻击。
模糊测试通常能触及程序员遗漏的边缘情况，或者那些被认为概率太低而无需测试的情况。
可以通过 [此教程](/doc/tutorial/fuzz) 开始使用。

## 使用 Go 的竞态检测器检查竞态条件

当两个或多个 [goroutine（协程）](/tour/concurrency/1) 并发访问同一资源，并且至少其中一个访问是写入操作时，就会发生竞态条件。这可能导致软件中出现难以诊断的、不可预测的问题。
使用内置的 [竞态检测器](/doc/articles/race_detector) 来识别 Go 代码中的潜在竞态条件，它可以帮助你确保并发程序的安全性和可靠性。
然而，竞态检测器只能发现运行时发生的竞态条件，因此它不会发现未执行的代码路径中的竞态条件。

要使用竞态检测器，在运行测试或构建应用程序时添加 `-race` 标志，例如 `go test -race`。
这将在启用竞态检测器的情况下编译你的代码，并报告在运行时检测到的任何竞态条件。
当竞态检测器在程序中发现数据竞争时，它会 [打印一份报告](/doc/articles/race_detector#report-format)，其中包含冲突访问的栈跟踪以及相关 goroutine 被创建时的栈信息。

## 使用 Vet 检查可疑的代码结构

Go 的 [vet 命令](https://pkg.go.dev/cmd/vet) 旨在分析你的源代码，并标记那些可能不一定是语法错误，但在运行时可能导致问题的潜在问题。
这些问题包括可疑的代码结构，如不可达代码、未使用的变量以及围绕 goroutine 的常见错误。
通过在开发过程中尽早捕获这些问题，go vet 有助于保持代码质量，减少调试时间，并提高整体软件可靠性。
要对指定项目运行 go vet，请执行：

（注意：文档末尾的命令示例 `go vet ./...` 在提供的文本中被截断，因此未在此翻译中包含。在完整文档中应存在此命令。）

```
go vet ./...
```

## 订阅 golang-announce 以获取安全版本通知

包含安全修复的 Go 版本会提前在低流量邮件列表 [golang-announce@googlegroups.com](https://groups.google.com/group/golang-announce) 上发布预告。如果你希望了解 Go 本身安全修复的发布动态，请订阅该邮件列表。