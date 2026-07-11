---
title: 集成测试的覆盖度分析支持
layout: article
template: true
---

目录：

 [概述](#overview)\
 [构建用于覆盖度分析的二进制文件](#building)\
 [运行覆盖度检测的二进制文件](#running)\
 [处理覆盖度数据文件](#working)\
 [常见问题](#FAQ)\
 [资源](#resources)\
 [术语表](#glossary)

从 Go 1.20 版本开始，Go 语言支持从应用程序和集成测试中收集覆盖度分析数据，这些测试是针对 Go 程序的更大型、更复杂的测试。

# 概述 {#overview}

Go 通过 "`go test -coverprofile=... <pkg_target>`" 命令，在包单元测试层面提供了易用的覆盖度分析收集支持。
从 Go 1.20 开始，用户现在可以为更大型的[集成测试](#glos-integration-test)收集覆盖度分析数据：这些测试更加重量级、复杂，会多次运行给定的应用程序二进制文件。

对于单元测试，收集覆盖度分析数据并生成报告需要两个步骤：先运行 `go test -coverprofile=...`，然后调用 `go tool cover {-func,-html}` 来生成报告。

对于集成测试，则需要三个步骤：[构建](#building)步骤、[运行](#running)步骤（可能涉及多次调用构建步骤生成的二进制文件），最后是[报告](#reporting)生成步骤，如下所述。

# 构建用于覆盖度分析的二进制文件 {#building}

要构建一个用于收集覆盖度分析数据的应用程序，请在调用 `go build` 构建您的应用程序二进制文件目标时，传递 `-cover` 标志。请参阅[下文](#packageselection)中的示例 `go build -cover` 调用。
生成的二进制文件随后可以通过设置环境变量来运行，以捕获覆盖度分析数据（请参阅下一节关于[运行](#running)的内容）。

## 如何选择包进行插桩 {#packageselection}

在一次给定的 "`go build -cover`" 调用过程中，Go 命令将选择主模块中的包进行覆盖度分析；其他参与构建的包（go.mod 中列出的依赖项，或属于 Go 标准库的包）默认不会被包含在内。

例如，这是一个包含主包、一个本地主模块包 `greetings` 以及从模块外部导入的一组包（包括 `rsc.io/quote` 和 `fmt` 等）的示例程序（[链接到完整程序](/play/p/VSQJN8xkkf-?v=gotip)）。```
$ cat go.mod
module mydomain.com

go 1.20

require rsc.io/quote v1.5.2

require (
	golang.org/x/text v0.0.0-20170915032832-14c0d48ead0c // 间接依赖
	rsc.io/sampler v1.3.0 // 间接依赖
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
```如果使用 "`-cover`" 命令行标志构建并运行该程序，将精确包含两个包在分析报告中：`main` 和 `mydomain.com/greetings`；其他依赖包将被排除。

若希望更精细地控制参与覆盖率分析的包，可通过 "`-coverpkg`" 标志进行构建。示例如下：```
$ go build -cover -o myprogramMorePkgs.exe -coverpkg=io,mydomain.com,rsc.io/quote .
$
```在上述构建中，来自 `mydomain.com` 的 main 包以及 `rsc.io/quote` 和 `io` 包被选用于分析；由于 `mydomain.com/greetings` 未被明确列出，即使它位于主模块中，也会被排除在分析范围之外。

# 运行经覆盖率插桩的二进制文件 {#running}

使用 "`-cover`" 构建的二进制文件会在执行结束时，将分析数据文件写入通过环境变量 `GOCOVERDIR` 指定的目录。示例如下：```
$ go build -cover -o myprogram.exe myprogram.go
$ mkdir somedata
$ GOCOVERDIR=somedata ./myprogram.exe
I say "Hello, world." and "see ya"
$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$
```请注意写入目录 `somedata` 的两个文件：这些（二进制）文件包含覆盖率结果。更多关于如何从这些数据文件生成人类可读结果的信息，请参阅后续章节[报告](#reporting)。

如果未设置 `GOCOVERDIR` 环境变量，插桩后的二进制文件仍能正常执行，但会发出警告。
示例：```
$ ./myprogram.exe
warning: GOCOVERDIR not set, no coverage data emitted
I say "Hello, world." and "see ya"
$
```## 涉及多次运行的测试

在许多情况下，集成测试可能涉及多次程序运行；当程序使用 "`-cover`" 标志构建时，每次运行都会生成一个新的数据文件。例如：```
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
```覆盖数据输出文件分为两种类型：元数据文件（包含每次运行中保持不变的数据项，如源文件名和函数名），以及计数器数据文件（记录程序中实际执行的部分）。

在上面的示例中，第一次运行生成了两个文件（计数器和元数据），而第二次运行仅生成了计数器数据文件：由于元数据在不同运行间保持不变，因此只需写入一次。

# 操作覆盖数据文件 {#working}

Go 1.20 引入了新工具 `covdata`，可用于读取和操作来自 `GOCOVERDIR` 目录的覆盖数据文件。

Go 的 `covdata` 工具支持多种运行模式。该工具调用的一般形式为```
$ go tool covdata <mode> -i=<dir1,dir2,...> ...flags...
```其中"`-i`"标志用于提供读取的目录列表，这些目录各自来自通过 `GOCOVERDIR` 运行的覆盖率检测二进制文件。

## 创建覆盖率配置文件报告 {#reporting}

本节讨论如何使用 "`go tool covdata`" 从覆盖率数据文件中生成人类可读的报告。

### 报告语句覆盖率百分比

要为每个检测的包生成“语句覆盖率百分比”指标，请使用命令 "`go tool covdata percent -i=<directory>`"。  
使用上述[运行](#running)章节中的示例：```
$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$ go tool covdata percent -i=somedata
	main	coverage: 100.0% of statements
	mydomain.com/greetings	coverage: 100.0% of statements
$
```这里显示的"语句覆盖率"百分比直接对应于 `go test -cover` 报告的结果。

## 转换为传统文本格式

您可以使用 covdata 的 `textfmt` 选择器，将二进制覆盖率数据文件转换为由 "`go test -coverprofile=<outfile>`" 生成的传统文本格式。生成的文本文件随后可与 "`go tool cover -func`" 或 "`go tool cover -html`" 配合使用，以创建额外的报告。示例：```
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
```## 合并数据

"`go tool covdata`"命令的`merge`子命令可用于将来自多个数据目录的覆盖率配置文件合并。

例如，假设某个程序在macOS和Windows系统上均运行。该程序的作者可能希望将分别在两个操作系统上运行生成的覆盖率配置文件合并为一个统一的配置文件集，以便生成跨平台的覆盖率汇总报告。示例如下：```
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
```上述合并操作将合并指定输入目录中的数据，并将新的合并数据文件集写入"merged"目录。

## 包选择

大多数"`go tool covdata`"命令支持"`-pkg`"标志，可在操作过程中进行包选择；"`-pkg`"参数的语法与Go命令的"`-coverpkg`"标志相同。
示例：```

$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$ go tool covdata percent -i=somedata -pkg=mydomain.com/greetings
	mydomain.com/greetings	coverage: 100.0% of statements
$ go tool covdata percent -i=somedata -pkg=nonexistentpackage
$
```“`-pkg`” 标志可用于选择特定报告中感兴趣的包子集。

#

## 常见问题 {#FAQ}

1. [如何为我的 `go.mod` 文件中提到的所有导入包请求覆盖率插桩？](#gomodselect)
2. [我可以在 GOPATH/GO111MODULE=off 模式下使用 `go build -cover` 吗？](#gopathmode)
3. [如果我的程序发生 panic，覆盖率数据会被写入吗？](#panicprof)
4. [使用 `-coverpkg=main` 会选择我的 main 包进行分析吗？](#mainpkg)

#### 如何为我的 `go.mod` 文件中提到的所有导入包请求覆盖率插桩？ {#gomodselect}

默认情况下，`go build -cover` 会对所有主模块的包进行覆盖率插桩，但不会插桩主模块外的导入（例如标准库包或 `go.mod` 中列出的依赖）。
要为所有非标准库的依赖请求插桩的一种方法是，将 `go list` 的输出传递给 `-coverpkg`。
以下是一个示例，再次使用上面提到的[示例程序](/play/p/VSQJN8xkkf-?v=gotip)：```
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
```#### 在 `GO111MODULE=off` 模式下可以使用 `go build -cover` 吗？ {#gopathmode}

可以，`go build -cover` 在 `GO111MODULE=off` 模式下确实有效。在 `GO111MODULE=off` 模式下构建程序时，只有在命令行中明确指定为目标包的包才会被插桩用于覆盖分析。要将其他包纳入覆盖分析范围，请使用 `-coverpkg` 标志。

#### 如果我的程序发生恐慌，覆盖数据会被写入吗？ {#panicprof}

使用 `go build -cover` 构建的程序，只有在程序调用了 `os.Exit()` 或从 `main.main` 正常返回时，才会在执行结束时写出完整的覆盖数据文件。如果程序因未恢复的恐慌而终止，或者程序遇到致命异常（例如段错误、除零错误等），那么在运行期间已执行语句的覆盖数据将会丢失。

#### `-coverpkg=main` 会选择我的主包进行覆盖分析吗？ {#mainpkg}

`-coverpkg` 标志接受的是一个**导入路径**列表，而不是包名列表。如果你想选择你的 `main` 包进行覆盖插桩，请通过其导入路径来标识它，而不是使用包名。示例（使用[此示例程序](/play/p/VSQJN8xkkf-?v=gotip)）：```
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

- **Go 1.2 引入单元测试覆盖率的博客文章**：
  - 单元测试覆盖率分析作为 Go 1.2 版本的一部分被引入；详见[此博客文章](/blog/cover)。
- **文档**：
  - [`cmd/go`](https://pkg.go.dev/cmd/go) 包文档描述了与覆盖率相关的构建和测试标志。
- **技术细节**：
  - [设计草案](/design/51430-revamp-code-coverage)
  - [提案](/issue/51430)

## 术语表 {#glossary}

<a id="glos-unit-test"></a>
**单元测试：** 在特定 Go 包关联的 `*_test.go` 文件中的测试，使用 Go 语言的 `testing` 包。

<a id="glos-integration-test"></a>
**集成测试：** 针对给定应用程序或二进制文件的更全面、更重量级的测试。集成测试通常涉及构建一个或一组程序，然后在基于（或可能不基于）Go `testing` 包的测试工具控制下，使用多种输入和场景执行一系列程序运行。