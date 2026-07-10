---
title: 集成测试的覆盖率分析支持
layout: article
template: true
---

目录：

 [概述](#overview)\
 [为覆盖率分析构建二进制文件](#building)\
 [运行带覆盖率检测的二进制文件](#running)\
 [处理覆盖率数据文件](#working)\
 [常见问题](#FAQ)\
 [资源](#resources)\
 [术语表](#glossary)

从Go 1.20版本开始，Go支持从应用程序和集成测试（Go程序更大型、更复杂的测试）中收集覆盖率配置文件。

# 概述 {#overview}

Go通过 "`go test -coverprofile=... <pkg_target>`" 命令，在包单元测试层面提供了易于使用的覆盖率配置文件收集支持。
从Go 1.20开始，用户现在可以为更大的[集成测试](#glos-integration-test)收集覆盖率配置文件：这些是更重量级、更复杂的测试，会对给定的应用程序二进制文件进行多次运行。

对于单元测试，收集覆盖率配置文件并生成报告需要两步：一次 `go test -coverprofile=...` 运行，然后调用 `go tool cover {-func,-html}` 来生成报告。

对于集成测试，需要三个步骤：一个[构建](#building)步骤，一个[运行](#running)步骤（可能涉及多次调用构建步骤产生的二进制文件），最后是一个[报告生成](#reporting)步骤，如下所述。

# 为覆盖率分析构建二进制文件 {#building}

要构建一个用于收集覆盖率配置文件的应用程序，请在对您的应用程序二进制目标调用 `go build` 时传递 `-cover` 标志。请参阅[下文](#packageselection)中的示例 `go build -cover` 调用。
生成的二进制文件随后可以通过设置环境变量来运行以捕获覆盖率配置文件（参见下一节关于[运行](#running)的内容）。

## 如何选择要检测的包 {#packageselection}

在给定的 "`go build -cover`" 调用期间，Go 命令将选择主模块中的包进行覆盖率分析；其他输入到构建中的包（go.mod 中列出的依赖项，或属于 Go 标准库一部分的包）默认情况下不会被包含。

例如，这里有一个示例程序，它包含一个 main 包、一个本地主模块包 `greetings` 以及一组从模块外部导入的包（其中包括 `rsc.io/quote` 和 `fmt`）（[完整程序链接](/play/p/VSQJN8xkkf-?v=gotip)）。```
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
```如果使用 "`-cover`" 命令行标志构建并运行此程序，则覆盖率分析结果中将恰好包含两个包：`main` 和 `mydomain.com/greetings`；其他依赖包将被排除。

希望更精细地控制覆盖率分析所包含包的用户，可以通过 "`-coverpkg`" 标志进行构建。示例：```
$ go build -cover -o myprogramMorePkgs.exe -coverpkg=io,mydomain.com,rsc.io/quote .
$
```在上述构建中，`mydomain.com` 的主包以及 `rsc.io/quote` 和 `io` 包被选中进行覆盖率分析；由于 `mydomain.com/greetings` 未被明确列出，它将被排除在分析范围之外，即使它位于主模块中。

# 运行覆盖率插桩的二进制文件 {#running}

使用 "`-cover`" 标志构建的二进制文件在执行结束时，会将分析数据文件写入由环境变量 `GOCOVERDIR` 指定的目录。示例：```
$ go build -cover -o myprogram.exe myprogram.go
$ mkdir somedata
$ GOCOVERDIR=somedata ./myprogram.exe
I say "Hello, world." and "see ya"
$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$
```请注意写入 `somedata` 目录下的两个文件：这些（二进制）文件包含覆盖率结果。更多关于如何从这些数据文件生成人类可读结果的说明，请参阅后续的[报告生成](#reporting)章节。

若未设置 `GOCOVERDIR` 环境变量，带有覆盖率插桩的二进制文件仍可正常执行，但会发出警告。
示例：```
$ ./myprogram.exe
warning: GOCOVERDIR not set, no coverage data emitted
I say "Hello, world." and "see ya"
$
```## 涉及多次运行的测试

集成测试在许多情况下会涉及程序的多次运行；当使用 `-cover` 编译程序时，每次运行都会产生一个新的数据文件。示例：```
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
```覆盖率数据输出文件有两种形式：元数据文件（包含每次运行保持不变的内容，如源文件名和函数名），以及计数器数据文件（记录程序中已执行的部分）。

在上述示例中，第一次运行生成了两个文件（计数器和元数据），而第二次运行仅生成了计数器数据文件：由于元数据在每次运行中保持不变，因此只需写入一次。

# 处理覆盖率数据文件 {#working}

Go 1.20 引入了一个新工具 '`covdata`'，可用于读取和操作来自 `GOCOVERDIR` 目录的覆盖率数据文件。

Go 的 `covdata` 工具可运行于多种模式。`covdata` 工具调用的通用形式如下：```
$ go tool covdata <mode> -i=<dir1,dir2,...> ...flags...
```其中"`-i`"标志用于指定需要读取的目录列表，这些目录分别来源于一次经过覆盖率插桩的二进制文件的执行过程（通过`GOCOVERDIR`环境变量指定）。

## 生成覆盖率报告 {#reporting}

本节介绍如何使用"`go tool covdata`"命令从覆盖率数据文件生成人类可读的报告。

### 报告已执行语句百分比

要为每个经过插桩的包生成"已执行语句百分比"指标，可使用命令"`go tool covdata percent -i=<directory>`"。
以上文中[运行示例](#running)为例：```
$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$ go tool covdata percent -i=somedata
	main	coverage: 100.0% of statements
	mydomain.com/greetings	coverage: 100.0% of statements
$
```此处的"语句覆盖"百分比直接对应 `go test -cover` 所报告的结果。

## 转换为传统文本格式

您可以使用 covdata 的 `textfmt` 选择器，将二进制覆盖率数据文件转换为由 "`go test -coverprofile=<outfile>`" 生成的传统文本格式。转换后的文本文件随后可与 "`go tool cover -func`" 或 "`go tool cover -html`" 配合使用，以生成其他报告。示例：```
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
```## 合并操作

"`go tool covdata`" 工具的 `merge` 子命令可用于将来自多个数据目录的覆盖率配置文件合并在一起。

例如，假设一个程序同时在 macOS 和 Windows 系统上运行。
该程序的开发者可能希望将在每个操作系统上分别运行所产生的覆盖率配置文件合并为一个单一的配置文件集合，以便生成一份跨平台的覆盖率摘要。
示例如下：```
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
```上述合并操作将合并指定输入目录中的数据，并将新的合并数据文件写入"merged"目录。

## 包选择

大多数"`go tool covdata`"命令支持使用"`-pkg`"标志进行包选择作为操作的一部分；"`-pkg`"参数的格式与Go命令的"`-coverpkg`"标志采用相同的形式。示例：```

$ ls somedata
covcounters.c6de772f99010ef5925877a7b05db4cc.2424989.1670252383678349347
covmeta.c6de772f99010ef5925877a7b05db4cc
$ go tool covdata percent -i=somedata -pkg=mydomain.com/greetings
	mydomain.com/greetings	coverage: 100.0% of statements
$ go tool covdata percent -i=somedata -pkg=nonexistentpackage
$
```可以使用 "`-pkg`" 标志为特定报告选择感兴趣的特定子集包。

#

## 常见问题解答 {#FAQ}

1. [如何为 `go.mod` 文件中提到的所有导入包请求覆盖率插桩？](#gomodselect)
2. [是否可以在 GOPATH/GO111MODULE=off 模式下使用 `go build -cover`？](#gopathmode)
3. [如果程序发生 panic，覆盖率数据是否会被写入？](#panicprof)
4. [`-coverpkg=main` 是否会选择我的 main 包进行分析？](#mainpkg)

#### 如何为 `go.mod` 文件中提到的所有导入包请求覆盖率插桩？ {#gomodselect}

默认情况下，`go build -cover` 会对主模块的所有包进行覆盖率插桩，但不会对主模块外部的导入（例如标准库包或 `go.mod` 中列出的导入）进行插桩。
一种为所有非标准库依赖项请求插桩的方法是将 `go list` 的输出传递给 `-coverpkg`。
这里再次以上述[示例程序](/play/p/VSQJN8xkkf-?v=gotip)为例：

```bash
$ go list -m -json all | jq -r .Dir | \
    xargs -I{} go list {}/... | \
    xargs -I{} go build -cover -coverpkg={}
``````
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

可以，`go build -cover` 在 `GO111MODULE=off` 模式下确实可用。
在 `GO111MODULE=off` 模式下构建程序时，只有命令行中明确指定为目标的包会被插桩以进行性能分析。使用 `-coverpkg` 标志可以将额外的包包含到分析配置文件中。

#### 如果我的程序发生 panic，覆盖率数据会被写入吗？ {#panicprof}

使用 `go build -cover` 构建的程序，只有在程序调用 `os.Exit()` 或从 `main.main` 正常返回时，才会在执行结束时写出完整的分析配置文件数据。
如果程序因未恢复的恐慌而终止，或者程序遇到致命异常（例如段错误、除以零等），则运行期间执行的语句的分析数据将会丢失。

#### `-coverpkg=main` 会选择我的主包进行分析吗？ {#mainpkg}

`-coverpkg` 标志接受的是导入路径列表，而不是包名列表。如果你想选择你的 `main` 包进行覆盖率插桩，请通过导入路径来指定它，而不是通过名称。示例（使用[此示例程序](/play/p/VSQJN8xkkf-?v=gotip)）：```
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
  - 单元测试的覆盖率分析功能作为 Go 1.2 版本的一部分被引入；详情请参阅[此博客文章](/blog/cover)。
- **文档**：
  - [`cmd/go`](https://pkg.go.dev/cmd/go) 包文档描述了与覆盖率相关的构建和测试标志。
- **技术细节**：
  - [设计草案](/design/51430-revamp-code-coverage)
  - [提案](/issue/51430)

## 术语表 {#glossary}

<a id="glos-unit-test"></a>
**单元测试：** 在与特定 Go 包关联的 `*_test.go` 文件中的测试，利用了 Go 的 `testing` 包。

<a id="glos-integration-test"></a>
**集成测试：** 针对给定应用程序或二进制文件进行的更全面、更重量级的测试。集成测试通常涉及构建一个或多个程序，然后使用多种输入和场景，在可能基于也可能不基于 Go `testing` 包的测试框架控制下，执行一系列程序运行。