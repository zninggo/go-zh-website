---
title: 集成测试的覆盖率分析支持
layout: article
template: true
---

目录：

 [概述](#overview)\
 [构建用于覆盖率分析的二进制文件](#building)\
 [运行经过覆盖率插桩的二进制文件](#running)\
 [处理覆盖率数据文件](#working)\
 [常见问题](#FAQ)\
 [资源](#resources)\
 [术语表](#glossary)

从 Go 1.20 开始，Go 支持从应用程序和集成测试中收集覆盖率数据，这些是针对 Go 程序更大、更复杂的测试。

# 概述 {#overview}

Go 通过 "`go test -coverprofile=... <pkg_target>`" 命令，在包单元测试层面提供了易用的覆盖率数据收集支持。
从 Go 1.20 开始，用户现在可以为更大规模的[集成测试](#glos-integration-test)收集覆盖率数据：这些是执行给定应用程序二进制文件多次运行的更重量级、更复杂的测试。

对于单元测试，收集覆盖率数据并生成报告需要两个步骤：运行 `go test -coverprofile=...`，然后调用 `go tool cover {-func,-html}` 生成报告。

对于集成测试，则需要三个步骤：[构建](#building)步骤、[运行](#running)步骤（可能涉及多次调用构建步骤生成的二进制文件），以及最后的[报告](#reporting)步骤，如下所述。

# 构建用于覆盖率分析的二进制文件 {#building}

要构建用于收集覆盖率数据的应用程序，请在调用 `go build` 构建应用程序二进制目标时传递 `-cover` 标志。请参见[下方](#packageselection)部分查看示例 `go build -cover` 调用。
生成的二进制文件随后可以通过设置环境变量来运行以捕获覆盖率数据（参见下一节关于[运行](#running)的部分）。

## 如何选择要插桩的包 {#packageselection}

在给定的 "`go build -cover`" 调用期间，Go 命令将选择主模块中的包进行覆盖率分析；不会默认包含参与构建的其他包（go.mod 中列出的依赖项，或属于 Go 标准库的包）。

例如，这里有一个包含主包、一个本地主模块包 `greetings` 以及一组从模块外部导入的包（包括 `rsc.io/quote` 和 `fmt` 等）的玩具程序（[完整程序链接](/play/p/VSQJN8xkkf-?v=gotip)）。```
$ cat go.mod
module mydomain.com

go 1.20

require rsc.io/quote v1.5.2

require (
	golang.org/x/text v0.0.0-20170915032832-14c0d48ead0c // 间接
	rsc.io/sampler v1.3.0 // 间接
)

$ cat myprogram.go
package main

import (
	"fmt"
	"mydomain.com/greetings"
	"rsc.io/quote"
)

func main() {
	fmt.Printf("I say %q and %q\n", quote.Hello(), greetings.Goodbye())
}
$ cat greetings/greetings.go
package greetings

func Goodbye() string {
	return "see ya"
}
$ go build -cover -o myprogram.exe .
$
```如果你使用"`-cover`"命令行标志构建并运行此程序，那么只有两个包会被包含在分析中：`main` 和 `mydomain.com/greetings`；其他依赖包将被排除在外。

想要更精细地控制哪些包被包含在覆盖率分析中的用户，可以使用"`-coverpkg`"标志进行构建。例如：```
$ go build -cover -o myprogramMorePkgs.exe -coverpkg=io,mydomain.com,rsc.io/quote .
$
```在上述构建过程中，`mydomain.com` 的 main 包以及 `rsc.io/quote` 和 `io` 包被选中进行性能分析；由于 `mydomain.com/greetings` 未被明确列出，即使它位于主模块中，也会被排除在分析范围之外。

# 运行带覆盖率检测的二进制文件 {#running}

使用 "`-cover`" 构建的二进制文件会在执行结束时将分析数据文件写入环境变量 `GOCOVERDIR` 指定的目录。示例：```
$ go build -cover -o myprogram.exe myprogram.go
$ mkdir somedata
$ GOCOVERDIR=somedata ./myprogram.exe
I say "Hello, world." and "see ya"
$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$
```请注意写入 `somedata` 目录中的两个文件：这些（二进制）文件包含覆盖率结果。有关如何从这些数据文件生成人类可读结果的更多信息，请参阅下一节关于[报告](#reporting)的内容。

如果未设置 `GOCOVERDIR` 环境变量，带覆盖率检测的二进制文件仍可正确执行，但会发出警告。
示例：```
$ ./myprogram.exe
warning: GOCOVERDIR not set, no coverage data emitted
I say "Hello, world." and "see ya"
$
```## 涉及多次运行的测试

集成测试在许多情况下可能涉及多次程序运行；当程序使用 "`-cover`" 构建时，每次运行都会生成一个新的数据文件。```
$ mkdir somedata2
$ GOCOVERDIR=somedata2 ./myprogram.exe          // 第一次运行
I say "Hello, world." and "see ya"
$ GOCOVERDIR=somedata2 ./myprogram.exe -flag    // 第二次运行
I say "Hello, world." and "see ya"
$ ls somedata2
covcounters.890814fca98ac3a4d41b9bd2a7ec9f7f.2456041.1670259309405583534
covcounters.890814fca98ac3a4d41b9bd2a7ec9f7f.2456047.1670259309410891043
covmeta.890814fca98ac3a4d41b9bd2a7ec9f7f
$
```覆盖率数据输出文件分为两类：元数据文件（包含每次运行不变的项目，如源文件名和函数名）和计数器数据文件（记录程序执行过的部分）。

在上面的例子中，第一次运行生成了两个文件（计数器文件和元数据文件），而第二次运行只生成了一个计数器数据文件：由于元数据在每次运行中不会改变，因此只需写入一次。

# 处理覆盖率数据文件 {#working}

Go 1.20 引入了一个新工具 '`covdata`'，可用于读取和操作来自 `GOCOVERDIR` 目录的覆盖率数据文件。

Go 的 `covdata` 工具可以以多种模式运行。调用 `covdata` 工具的一般形式如下：```
$ go tool covdata <mode> -i=<dir1,dir2,...> ...flags...
```其中 "`-i`" 标志提供了一个要读取的目录列表，每个目录都源自一次带覆盖率检测的二进制程序的执行（通过 `GOCOVERDIR`）。

## 创建覆盖率概要报告 {#reporting}

本节讨论如何使用 "`go tool covdata`" 从覆盖率数据文件生成易于阅读的报告。

### 报告语句覆盖百分比

要为每个受检测的包报告"语句覆盖百分比"指标，请使用命令 "`go tool covdata percent -i=<directory>`"。
使用上面[运行](#running)部分中的示例：```
$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$ go tool covdata percent -i=somedata
	main	coverage: 100.0% of statements
	mydomain.com/greetings	coverage: 100.0% of statements
$
```此处显示的"语句覆盖率"百分比与 `go test -cover` 报告的结果直接对应。

## 转换为旧版文本格式

您可以使用 covdata `textfmt` 选择器将二进制覆盖率数据文件转换为 "`go test -coverprofile=<outfile>`" 生成的传统文本格式。生成的文本文件随后可用于 "`go tool cover -func`" 或 "`go tool cover -html`" 来创建额外的报告。示例：```
$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$ go tool covdata textfmt -i=somedata -o profile.txt
$ cat profile.txt
mode: set
mydomain.com/myprogram.go:10.13,12.2 1 1
mydomain.com/greetings/greetings.go:3.23,5.2 1 1
$ go tool cover -func=profile.txt
mydomain.com/greetings/greetings.go:3:	Goodbye		100.0%
mydomain.com/myprogram.go:10:		main		100.0%
total:					(statements)	100.0%
$
```## 合并

"`go tool covdata`" 命令的 `merge` 子命令可用于将来自多个数据目录的配置文件合并在一起。

例如，考虑一个同时在 macOS 和 Windows 上运行的程序。该程序的作者可能希望将在每个操作系统上单独运行所获得的覆盖率配置文件合并为一个配置文件集合，从而生成跨平台的覆盖率摘要。
例如：```
$ ls windows_datadir
covcounters.f3833f80c91d8229544b25a855285890.1025623.1667481441036838252
covcounters.f3833f80c91d8229544b25a855285890.1025628.1667481441042785007
covmeta.f3833f80c91d8229544b25a855285890
$ ls macos_datadir
covcounters.b245ad845b5068d116a4e25033b429fb.1025358.1667481440551734165
covcounters.b245ad845b5068d116a4e25033b429fb.1025364.1667481440557770197
covmeta.b245ad845b5068d116a4e25033b429fb
$ ls macos_datadir
$ mkdir merged
$ go tool covdata merge -i=windows_datadir,macos_datadir -o merged
$
```上述合并操作将把指定输入目录中的数据合并，并将新的合并数据文件集写入"merged"目录。

## 包选择

大多数"`go tool covdata`"命令支持"`-pkg`"标志，用于在操作过程中执行包选择；"`-pkg`"的参数格式与Go命令的"`-coverpkg`"标志所使用的格式相同。
示例：```

$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$ go tool covdata percent -i=somedata -pkg=mydomain.com/greetings
	mydomain.com/greetings	coverage: 100.0% of statements
$ go tool covdata percent -i=somedata -pkg=nonexistentpackage
$
```"```-pkg```" 标志可用于针对给定报告选择您感兴趣的具体包子集。

#

## 常见问题 {#FAQ}

1. [如何为 `go.mod` 文件中提到的所有导入包请求覆盖率检测？](#gomodselect)
2. [在 GOPATH/GO111MODULE=off 模式下可以使用 `go build -cover` 吗？](#gopathmode)
3. [如果我的程序发生 panic，覆盖率数据会被写入吗？](#panicprof)
4. [使用 `-coverpkg=main` 会选择我的主包进行性能分析吗？](#mainpkg)

#### 如何为 `go.mod` 文件中提到的所有导入包请求覆盖率检测 {#gomodselect}

默认情况下，`go build -cover` 会为所有主模块包进行覆盖率检测，但不会为主模块外部的导入包（例如标准库包或 `go.mod` 中列出的导入）进行检测。

一种为所有非标准库依赖项请求检测的方法是将 `go list` 的输出传递给 `-coverpkg`。

以下是一个示例，同样使用了上文提到的[示例程序](/play/p/VSQJN8xkkf-?v=gotip)：```
$ go list -f '{{"{{if not .Standard}}{{.ImportPath}}{{end}}"}}' -deps . | paste -sd "," > pkgs.txt
$ go build -o myprogram.exe -coverpkg=`cat pkgs.txt` .
$ mkdir somedata
$ GOCOVERDIR=somedata ./myprogram.exe
$ go tool covdata percent -i=somedata
	golang.org/x/text/internal/tag	coverage: 78.4% of statements
	golang.org/x/text/language	coverage: 35.5% of statements
	mydomain.com	coverage: 100.0% of statements
	mydomain.com/greetings	coverage: 100.0% of statements
	rsc.io/quote	coverage: 25.0% of statements
	rsc.io/sampler	coverage: 86.7% of statements
$
```#### 我能在 GO111MODULE=off 模式下使用 `go build -cover` 吗？ {#gopathmode}

可以，`go build -cover` 在 `GO111MODULE=off` 模式下可以正常工作。  
在 GO111MODULE=off 模式下构建程序时，只有命令行中明确指定为目标的包会被插桩以进行性能分析。若需将其他包也纳入分析范围，请使用 `-coverpkg` 标志。

#### 如果我的程序发生恐慌，覆盖数据会被写入吗？ {#panicprof}

通过 `go build -cover` 构建的程序仅在以下情况才会在执行结束时输出完整的分析数据：程序调用了 `os.Exit()` 或从 `main.main` 正常返回。  
若程序因未恢复的恐慌而终止，或遇到致命异常（如分段错误、除以零等），则运行期间已执行语句的分析数据将会丢失。

#### `-coverpkg=main` 会选择我的 main 包进行性能分析吗？ {#mainpkg}

`-coverpkg` 标志接受的是导入路径列表，而非包名列表。若希望将 `main` 包纳入覆盖检测，请通过导入路径而非包名来指定它。示例（使用[此示例程序](/play/p/VSQJN8xkkf-?v=gotip)）：```
$ go list -m
mydomain.com
$ go build -coverpkg=main -o oops.exe .
warning: no packages being built depend on matches for pattern main
$ go build -coverpkg=mydomain.com -o myprogram.exe .
$ mkdir somedata
$ GOCOVERDIR=somedata ./myprogram.exe
I say "Hello, world." and "see ya"
$ go tool covdata percent -i=somedata
	mydomain.com	coverage: 100.0% of statements
$
```## 资源 {#resources}

- **Go 1.2 中引入单元测试覆盖率的博客文章**：
  - 单元测试的覆盖率分析是作为 Go 1.2 版本的一部分引入的；详情请参阅[这篇博客文章](/blog/cover)。
- **文档**：
  - [`cmd/go`](https://pkg.go.dev/cmd/go) 包文档描述了与覆盖率相关的构建和测试标志。
- **技术细节**：
  - [设计草案](/design/51430-revamp-code-coverage)
  - [提案](/issue/51430)

## 术语表 {#glossary}

<a id="glos-unit-test"></a>
**单元测试：** 与特定 Go 包关联的、位于 `*_test.go` 文件中的测试，使用 Go 的 `testing` 包实现。

<a id="glos-integration-test"></a>
**集成测试：** 针对给定应用程序或二进制文件的一种更全面、更重量级的测试。集成测试通常涉及构建一个或一组程序，然后在可能基于也可能不基于 Go `testing` 包的测试框架控制下，使用多种输入和场景对程序进行一系列运行。