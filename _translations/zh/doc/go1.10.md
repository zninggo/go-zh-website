---
title: Go 1.10 版本发布说明
---

<!--
注意：本文档及本目录下的其他文档中，惯例是将固定宽度的短语设置为固定宽度字体，非固定宽度的空格分隔，如
`hello` `world`。
请勿发送移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.10 简介 {#introduction}

Go 最新版本 1.10 在 [Go 1.9](go1.9) 发布六个月后问世。其大部分变更集中在工具链、运行时和库的实现层面。与以往一样，本版本遵循 Go 1 [兼容性承诺](/doc/go1compat.html)。我们预期几乎所有 Go 程序都能继续像以前一样编译和运行。

本版本改进了[构建包的缓存机制](#build)，新增了[成功测试结果的缓存](#test)，[在测试期间自动运行 vet](#test-vet)，并允许[使用 cgo 在 Go 和 C 之间直接传递字符串值](#cgo)。一组新的[硬编码的安全编译器选项](#cgo)可能导致以前成功构建的代码出现意外的 [`invalid flag`](/s/invalidflag) 错误。

## 语言变更 {#language}

语言规范无重大变更。

<!-- CL 60230 -->
澄清了一个涉及无类型常量移位的边界情况，因此编译器已更新，允许在索引表达式中使用 `x[1.0`&nbsp;`<<`&nbsp;`s]`，其中 `s` 是无符号整数；[go/types](/pkg/go/types/) 包此前已经支持此用法。

<!-- CL 73233 -->
方法表达式的语法已更新，放宽了限制，允许任何类型表达式作为接收器；这与编译器此前已实现的行为一致。例如，`struct{io.Reader}.Read` 是一个有效（尽管不常见）的方法表达式，编译器此前已接受，现在也正式被语言语法所允许。

## 平台支持 {#ports}

本版本没有新增支持的操作系统或处理器架构。大部分工作集中在加强对现有平台的支持，特别是[汇编器中的新指令](#asm)以及对编译器生成代码的改进。

如 [Go 1.9 发布说明中所宣布](go1.9#freebsd)，Go 1.10 现在要求 FreeBSD 10.3 或更高版本；已移除对 FreeBSD 9.3 的支持。

Go 现已重新支持 NetBSD，但要求使用未发布的 NetBSD 8。目前只有 `GOARCH` 的 `amd64` 和 `386` 已修复，`arm` 移植版仍存在问题。

在 32 位 MIPS 系统上，新的环境变量设置 `GOMIPS=hardfloat`（默认）和 `GOMIPS=softfloat` 用于选择浮点计算是使用硬件指令还是软件模拟。

Go 1.10 将是支持 OpenBSD 6.0 的最后一个版本。Go 1.11 将要求 OpenBSD 6.2。

Go 1.10 将是支持 OS X 10.8 Mountain Lion 或 OS X 10.9 Mavericks 的最后一个版本。Go 1.11 将要求 OS X 10.10 Yosemite 或更高版本。

Go 1.10 将是支持 Windows XP 或 Windows Vista 的最后一个版本。Go 1.11 将要求 Windows 7 或更高版本。

## 工具 {#tools}

### 默认 GOROOT 和 GOTMPDIR {#goroot}

如果未设置环境变量 `$GOROOT`，go 工具以前会使用工具链编译期间设置的默认 `GOROOT`。现在，在回退到该默认值之前，go 工具会尝试从其自身的可执行文件路径推断 `GOROOT`。这使得二进制发行版可以解压到文件系统的任何位置，然后无需显式设置 `GOROOT` 即可使用。

默认情况下，go 工具在系统临时目录（例如 Unix 上的 `$TMPDIR`）中创建其临时文件和目录。如果设置了新的环境变量 `$GOTMPDIR`，则 go 工具将改为在该目录中创建其临时文件和目录。

### 构建与安装 {#build}

`go`&nbsp;`build` 命令现在纯粹基于源文件内容、指定的构建标志以及编译包中存储的元数据来检测过时的包。不再参考或依赖修改时间。以前建议在修改时间因某种原因（例如构建标志更改）而不可靠时添加 `-a` 强制重新构建的做法不再必要：构建现在总能检测到何时必须重新构建包。（如果观察到相反情况，请提交错误报告。）

`go`&nbsp;`build` 的 `-asmflags`、`-gcflags`、`-gccgoflags` 和 `-ldflags` 选项现在默认仅应用于命令行上直接列出的包。例如，`go` `build` `-gcflags=-m` `mypkg` 在构建 `mypkg` 时向编译器传递 `-m` 标志，但不适用于其依赖项。新的、更通用的形式 `-asmflags=pattern=flags`（其他选项类似）仅将 `flags` 应用于与模式匹配的包。例如：`go` `install` `-ldflags=cmd/gofmt=-X=main.version=1.2.3` `cmd/...` 会安装所有匹配 `cmd/...` 的命令，但仅将 `-X` 选项应用于 `cmd/gofmt` 的链接器标志。更多详情请参阅 [`go` `help` `build`](/cmd/go/#hdr-Compile_packages_and_dependencies)。

`go`&nbsp;`build` 命令现在维护一个最近构建包的缓存，该缓存独立于 `$GOROOT/pkg` 或 `$GOPATH/pkg` 中已安装的包。此缓存的效果应该是加速那些未显式安装包的构建，或在不同源代码副本之间切换时（例如，在版本控制系统中不同分支之间来回切换）的构建。以前为了加速而添加 `-i` 标志的建议（如 `go` `build` `-i` 或 `go` `test` `-i`）不再必要：构建在没有 `-i` 的情况下运行得同样快。更多详情请参阅 [`go` `help` `cache`](/cmd/go/#hdr-Build_and_test_caching)。现在，`go` `install` 命令只安装直接在命令行列出的包和命令。例如，`go` `install` `cmd/gofmt` 会安装 gofmt 程序，但不会安装它所依赖的任何包。新的构建缓存机制使得后续命令的运行速度仍与安装了依赖时一样快。要强制安装依赖项，请使用新的 `go` `install` `-i` 标志。通常不需要安装依赖包，而安装包的概念本身可能会在未来的版本中消失。

`go` `build` 实现的许多细节都已改变以支持这些改进。这些变化隐含的一个新要求是，仅二进制包现在必须在其存根源代码中声明准确的导入块，以便在链接使用该仅二进制包的程序时，这些导入能够被正确提供。更多详情请参阅 [`go` `help` `filetype`](/cmd/go/#hdr-File_types)。

### 测试 {#test}

`go` `test` 命令现在会缓存测试结果：如果测试可执行文件和命令行与之前的运行匹配，并且该运行所涉及的文件和环境变量也没有变化，那么 `go` `test` 将打印之前的测试输出，并用字符串“(cached).”替换耗时。测试缓存仅适用于成功的测试结果；仅适用于带有明确包列表的 `go` `test` 命令；并且仅适用于使用 `-cpu`、`-list`、`-parallel`、`-run`、`-short` 和 `-v` 测试标志子集的命令行。绕过测试缓存的习惯用法是使用 `-count=1`。

`go` `test` 命令现在会自动对正在测试的包运行 `go` `vet`，以便在运行测试之前识别重要问题。任何此类问题都会被当作构建错误处理并阻止测试执行。此自动检查仅启用了可用的 `go` `vet` 检查中高置信度的子集。要禁用运行 `go` `vet`，请使用 `go` `test` `-vet=off`。

`go` `test` `-coverpkg` 标志现在将其参数解释为一个逗号分隔的模式列表，用于匹配每个测试的依赖项，而不是解释为需要重新加载的包列表。例如，`go` `test` `-coverpkg=all` 现在是为测试包及其所有依赖项启用覆盖率运行测试的一种有意义的方式。此外，`go` `test` `-coverprofile` 选项现在也支持运行多个测试。

在因超时而失败的情况下，测试现在更有可能在退出前写入其性能分析文件。

`go` `test` 命令现在总是将给定测试二进制文件的标准输出和标准错误合并，并将两者都写入到 `go` `test` 的标准输出中。在过去的版本中，`go` `test` 只是在大多数情况下应用这种合并。

`go` `test` `-v` 输出现在包括 `PAUSE` 和 `CONT` 状态更新行，以标记[并行测试](/pkg/testing/#T.Parallel)何时暂停和继续。

新的 `go` `test` `-failfast` 标志会在任何测试失败后禁止运行额外的测试。请注意，与失败测试并行运行的测试是允许完成的。

最后，新的 `go` `test` `-json` 标志通过新的命令 `go` `tool` `test2json` 过滤测试输出，以生成机器可读的 JSON 格式测试执行描述。这允许在 IDE 和其他工具中创建测试执行的富演示文稿。

关于所有这些更改的更多详情，请参阅 [`go` `help` `test`](/cmd/go/#hdr-Test_packages) 和 [test2json 文档](/cmd/test2json/)。

### Cgo {#cgo}

Cgo 使用 `#cgo CFLAGS` 等指定的选项现在会根据允许选项列表进行检查。这填补了一个安全漏洞，即下载的包使用编译器选项（如 <span style="white-space: nowrap">`-fplugin`</span>）在构建机器上运行任意代码。这可能导致构建错误，例如 `invalid flag in #cgo CFLAGS`。有关更多背景信息以及如何处理此错误，请参阅 [https://golang.org/s/invalidflag](/s/invalidflag)。

Cgo 现在使用 Go 类型别名来实现 C 的 typedef，例如“`typedef` `X` `Y`”，因此 Go 代码可以互换使用 `C.X` 和 `C.Y` 类型。它现在还支持使用无参数的函数式宏。此外，文档已更新以澄清 cgo 导出函数的类型签名不支持 Go 结构体和 Go 数组。

Cgo 现在支持从 C 直接访问 Go 字符串值。C 前置代码中的函数可以使用类型 `_GoString_` 来接受 Go 字符串作为参数。C 代码可以调用 `_GoStringLen` 和 `_GoStringPtr` 来直接访问字符串的内容。类型为 `_GoString_` 的值可以在调用接受 Go 类型 `string` 参数的导出 Go 函数时传递。

在工具链引导期间，环境变量 `CC` 和 `CC_FOR_TARGET` 分别指定生成的工具链将用于宿主和目标构建的默认 C 编译器。但是，如果该工具链将用于多个目标，则可能需要为每个目标指定不同的 C 编译器（例如，为 `darwin/arm64` 和 `linux/ppc64le` 指定不同的编译器）。新的环境变量集 <code>CC\_FOR\__goos_\__goarch_</code> 允许为每个目标指定不同的默认 C 编译器。请注意，这些变量仅在工具链引导期间适用，用于设置生成的工具链所使用的默认值。后续的 `go` `build` 命令使用 `CC` 环境变量，或者使用内置默认值。

Cgo 现在将一些通常映射到 Go 中指针类型的 C 类型转换为 `uintptr`。这些类型包括 Darwin CoreFoundation 框架中的 `CFTypeRef` 层次结构和 Java JNI 接口中的 `jobject` 层次结构。这些类型在 Go 端必须转换为 `uintptr`，因为否则会混淆 Go 的垃圾回收器；它们有时并非真正的指针，而是编码在指针大小整数中的数据结构。指向 Go 内存的指针绝不能存储在这些 `uintptr` 值中。

由于此变更，受影响类型的值需要使用常量 `0` 而非常量 `nil` 进行零值初始化。Go 1.10 提供了 `gofix` 模块来帮助进行此重写：

	go tool fix -r cftype <包名>
	go tool fix -r jni <包名>

更多详细信息，请参阅 [cgo 文档](/cmd/cgo/)。

### 文档 {#doc}

`go`&nbsp;`doc` 工具现在会将返回 `T` 或 `*T` 切片的函数添加到类型 `T` 的显示中，这与返回单个 `T` 或 `*T` 结果的函数的现有行为类似。例如：

	$ go doc mail.Address
	package mail // import "net/mail"

	type Address struct {
		Name    string
		Address string
	}
	    Address 表示单个邮件地址。

	func ParseAddress(address string) (*Address, error)
	func ParseAddressList(list string) ([]*Address, error)
	func (a *Address) String() string
	$

以前，`ParseAddressList` 仅在包概览（`go` `doc` `mail`）中显示。

### 修复 {#fix}

`go`&nbsp;`fix` 工具现在将 `"golang.org/x/net/context"` 的导入替换为 `"context"`。
（在 Go 1.9 或更高版本中使用时，前者的转发别名使其完全等同于后者。）

### 获取 {#get}

`go`&nbsp;`get` 命令现在支持 Fossil 源代码仓库。

### 性能分析 {#pprof}

`runtime/pprof` 包生成的阻塞和互斥锁配置文件现在包含符号信息，因此可以在 `go` `tool` `pprof` 中查看，而无需生成该配置文件的二进制文件。
（所有其他配置文件类型在 Go 1.9 中已更改为包含符号信息。）

[`go`&nbsp;`tool`&nbsp;`pprof`](/cmd/pprof/) 可视化分析工具已更新至来自 [github.com/google/pprof](https://github.com/google/pprof) 的 git 版本 9e20b5b (2017-11-08)，其中包含更新的 Web 界面。

### 检查 {#vet}

[`go`&nbsp;`vet`](/cmd/vet/) 命令现在在检查包时始终能够访问完整、最新的类型信息，即使是对于使用 cgo 或 vendor 导入的包。因此，报告应该会更准确。
请注意，只有 `go`&nbsp;`vet` 可以访问此信息；更底层的 `go`&nbsp;`tool`&nbsp;`vet` 则不能，除了开发 `vet` 本身外，应避免使用它。
（自 Go 1.9 起，`go`&nbsp;`vet` 提供了与 `go`&nbsp;`tool`&nbsp;`vet` 相同的所有标志访问权限。）

### 诊断 {#diag}

此版本包含一个新的 [可用 Go 程序诊断工具概述](/doc/diagnostics.html)。

### 格式化 {#gofmt}

Go 源代码默认格式化的两个细节已更改。
首先，某些复杂的三索引切片表达式之前格式化为 `x[i+1`&nbsp;`:`&nbsp;`j:k]`，现在则以更一致的空格格式化：`x[i+1`&nbsp;`:`&nbsp;`j`&nbsp;`:`&nbsp;`k]`。
其次，写在单行上的单方法接口字面量（有时用于类型断言）不再拆分为多行。

请注意，gofmt 的这类细微更新会不时出现。总的来说，我们不建议构建检查源代码是否匹配特定版本 gofmt 输出的系统。例如，如果已提交到仓库的任何代码未被“正确格式化”就导致失败的持续集成测试，本质上是脆弱的，不建议使用。

如果多个程序必须就使用哪个版本的 gofmt 来格式化源文件达成一致，我们建议它们通过调用同一个 gofmt 二进制文件来实现。例如，在 Go 开源仓库中，我们的 Git 预提交钩子是用 Go 编写的，本可以直接导入 `go/format`，但它却调用了当前路径中找到的 `gofmt` 二进制文件，这样预提交钩子就无需在每次 `gofmt` 更改时重新编译。

### 编译器工具链 {#compiler}

编译器包含许多针对生成代码性能的改进，这些改进在支持的架构上分布相当均匀。

记录在二进制文件中的 DWARF 调试信息已在几个方面得到改进：现在记录常量值；行号信息更准确，使得通过源代码逐步调试程序效果更好；并且每个包现在都作为其自己的 DWARF 编译单元呈现。

各种[构建模式](https://docs.google.com/document/d/1nr-TQHw_er6GOQRsF6T43GGhFDelrAP0NqSS_00RgZQ/edit)已被移植到更多系统。
具体来说，`c-shared` 现在可在 `linux/ppc64le`、`windows/386` 和 `windows/amd64` 上工作；
`pie` 现在可在 `darwin/amd64` 上工作，并且在所有系统上强制使用外部链接；
`plugin` 现在可在 `linux/ppc64le` 和 `darwin/amd64` 上工作。

`linux/ppc64le` 移植版现在要求任何使用 cgo 的程序都使用外部链接，即使是标准库的使用也是如此。

### 汇编器 {#asm}

对于 ARM 32 位移植版，汇编器现在支持指令
<code><small>BFC</small></code>、
<code><small>BFI</small></code>、
<code><small>BFX</small></code>、
<code><small>BFXU</small></code>、
<code><small>FMULAD</small></code>、
<code><small>FMULAF</small></code>、
<code><small>FMULSD</small></code>、
<code><small>FMULSF</small></code>、
<code><small>FNMULAD</small></code>、
<code><small>FNMULAF</small></code>、
<code><small>FNMULSD</small></code>、
<code><small>FNMULSF</small></code>、
<code><small>MULAD</small></code>、
<code><small>MULAF</small></code>、
<code><small>MULSD</small></code>、
<code><small>MULSF</small></code>、
<code><small>NMULAD</small></code>、
<code><small>NMULAF</small></code>、
<code><small>NMULD</small></code>、
<code><small>NMULF</small></code>、
<code><small>NMULSD</small></code>、
<code><small>NMULSF</small></code>、
<code><small>XTAB</small></code>、
<code><small>XTABU</small></code>、
<code><small>XTAH</small></code>
和
<code><small>XTAHU</small></code>。针对ARM 64位平台，汇编器现在支持
<code><small>VADD</small></code>、
<code><small>VADDP</small></code>、
<code><small>VADDV</small></code>、
<code><small>VAND</small></code>、
<code><small>VCMEQ</small></code>、
<code><small>VDUP</small></code>、
<code><small>VEOR</small></code>、
<code><small>VLD1</small></code>、
<code><small>VMOV</small></code>、
<code><small>VMOVI</small></code>、
<code><small>VMOVS</small></code>、
<code><small>VORR</small></code>、
<code><small>VREV32</small></code>以及
<code><small>VST1</small></code>
指令。

针对PowerPC 64位平台，汇编器现在支持POWER9指令
<code><small>ADDEX</small></code>、
<code><small>CMPEQB</small></code>、
<code><small>COPY</small></code>、
<code><small>DARN</small></code>、
<code><small>LDMX</small></code>、
<code><small>MADDHD</small></code>、
<code><small>MADDHDU</small></code>、
<code><small>MADDLD</small></code>、
<code><small>MFVSRLD</small></code>、
<code><small>MTVSRDD</small></code>、
<code><small>MTVSRWS</small></code>、
<code><small>PASTECC</small></code>、
<code><small>VCMPNEZB</small></code>、
<code><small>VCMPNEZBCC</small></code>以及
<code><small>VMSUMUDM</small></code>。

针对S390X平台，汇编器现在支持
<code><small>TMHH</small></code>、
<code><small>TMHL</small></code>、
<code><small>TMLH</small></code>以及
<code><small>TMLL</small></code>
指令。

针对X86 64位平台，汇编器现在支持359条新指令，
包括完整的AVX、AVX2、BMI、BMI2、F16C、FMA3、SSE2、SSE3、SSSE3、SSE4.1和SSE4.2扩展集。
此外，汇编器不再将<code><small>MOVL</small></code>&nbsp;<code><small>$0,</small></code>&nbsp;<code><small>AX</small></code>实现为<code><small>XORL</small></code>指令，
以避免意外清除条件标志位。

### Gccgo {#gccgo}

由于Go语言半年期的发布计划与GCC年度发布计划保持一致，
GCC 7版本包含了Go 1.8.3版本的gccgo。
我们预计下一个版本GCC 8将包含Go 1.10版本的gccgo。

## 运行时 {#runtime}

对[`LockOSThread`](/pkg/runtime/#LockOSThread)和
[`UnlockOSThread`](/pkg/runtime/#UnlockOSThread)嵌套调用的行为发生了变化。
这些函数控制goroutine是否被锁定到特定的操作系统线程，
使得该goroutine只在该线程上运行，且该线程只运行该goroutine。
此前，连续多次调用`LockOSThread`等同于调用一次，
而单次`UnlockOSThread`始终会解除线程锁定。
现在，这些调用采用嵌套机制：如果多次调用`LockOSThread`，
则必须调用相同次数的`UnlockOSThread`才能解除线程锁定。
谨慎避免嵌套调用的现有代码将保持正确。
错误假设这些调用具有嵌套行为的现有代码将因此变得正确。
公开Go源代码中对这些函数的大多数使用属于第二类情况。

由于`LockOSThread`和`UnlockOSThread`的一个常见用途是允许Go代码可靠地修改线程本地状态（例如Linux或Plan 9的命名空间），
运行时现在将被锁定的线程视为不适合重用或用于创建新线程。

堆栈跟踪不再包含隐式包装函数（此前标记为`<autogenerated>`），
除非故障或恐慌（panic）发生在包装函数内部。
因此，传递给[`Caller`](/pkg/runtime/#Caller)等函数的跳过计数现在应始终与代码的实际结构匹配，
而不再依赖于优化决策和实现细节。

垃圾回收器（garbage collector）经过改进以降低其对内存分配延迟的影响。
现在它在运行时占用总体CPU的更小比例，但可能运行更频繁。
垃圾回收器消耗的总CPU资源没有显著变化。

[`GOROOT`](/pkg/runtime/#GOROOT)函数
现在（当未设置`$GOROOT`环境变量时）默认使用调用程序编译时有效的`GOROOT`或`GOROOT_FINAL`。
此前它使用的是编译调用程序的工具链时有效的`GOROOT`或`GOROOT_FINAL`。

[`GOMAXPROCS`](/pkg/runtime/#GOMAXPROCS)设置不再有上限限制。
（在Go 1.9中该限制为1024。）

## 性能 {#performance}

一如既往，变更范围广泛且多样，难以精确描述性能变化。
由于垃圾回收器加速、生成代码质量提升以及核心库优化，
大多数程序的运行速度应会略有提升。

## 垃圾回收器 {#gc}

许多应用在垃圾回收器活跃时应会体验到显著降低的内存分配延迟和整体性能开销。

## 标准库 {#library}

标准库的所有变更均属细微调整。
[bytes](#bytes)和[net/url](#net/url)的变更最可能需要更新现有程序。

### 库的细微变更 {#minor_library_changes}

一如既往，根据Go 1的[兼容性承诺](/doc/go1compat)，
库中进行了各种细微变更和更新。

#### [archive/tar](/pkg/archive/tar/)

总体而言，对特殊头格式的处理得到显著改进和扩展。

[`FileInfoHeader`](/pkg/archive/tar/#FileInfoHeader)始终会将其[`os.FileInfo`](/pkg/os/#FileInfo)参数中的Unix UID和GID数字（具体来自`FileInfo`的`Sys`方法返回的系统相关信息）记录到返回的[`Header`](/pkg/archive/tar/#Header)中。
现在它还会记录这些ID对应的用户名和组名，以及设备文件的主次设备号。新的 [`Header.Format`](/pkg/archive/tar/#Header) 字段（类型为 [`Format`](/pkg/archive/tar/#Format)）用于控制 [`Writer`](/pkg/archive/tar/#Writer) 使用哪种 tar 头格式。默认情况下，与之前一样，系统会选择最受支持且能编码该头所需字段的头类型（优先选择 USTAR，若不行则选择 PAX，再不行则选择 GNU）。[`Reader`](/pkg/archive/tar/#Reader) 会在读取的每个头部设置 `Header.Format`。

`Reader` 和 `Writer` 现在支持任意 PAX 记录，这通过新的 [`Header.PAXRecords`](/pkg/archive/tar/#Header) 字段实现，该字段是现有 `Xattrs` 字段的泛化形式。

`Reader` 不再强制要求 GNU 头中的文件名或链接名必须为有效的 UTF-8 编码。

当写入 PAX 或 GNU 格式的头部时，`Writer` 现在会包含 `Header.AccessTime` 和 `Header.ChangeTime` 字段（如果已设置）。写入 PAX 格式的头部时，时间信息包含亚秒级精度。

#### [archive/zip](/pkg/archive/zip/)

Go 1.10 对 ZIP 归档文件中的时间和字符集编码提供了更完整的支持。

原始的 ZIP 格式使用标准的 MS-DOS 编码方式，将年、月、日、时、分、秒编码到两个 16 位值中。这种编码无法表示时区或奇数秒，因此引入了多种扩展以支持更丰富的编码。在 Go 1.10 中，[`Reader`](/pkg/archive/zip/#Reader) 和 [`Writer`](/pkg/archive/zip/#Writer) 现在支持被广泛理解的 Info-Zip 扩展，该扩展将时间以 32 位 Unix“自纪元以来的秒数”形式单独编码。[`FileHeader`](/pkg/archive/zip/#FileHeader) 的新 `Modified` 字段（类型为 [`time.Time`](/pkg/time/#Time)）使 `ModifiedTime` 和 `ModifiedDate` 字段过时，后者仍保留 MS-DOS 编码。`Reader` 和 `Writer` 现在遵循一个常见惯例：当 ZIP 归档文件存储与时间无关的 Unix 时间时，也会在 MS-DOS 字段中存储本地时间，以便推断时区偏移。为了保持兼容性，[`ModTime`](/pkg/archive/zip/#FileHeader.ModTime) 和 [`SetModTime`](/pkg/archive/zip/#FileHeader.SetModTime) 方法的行为与早期版本相同；新代码应直接使用 `Modified` 字段。

ZIP 归档文件中每个文件的头部都有一个标志位，用于指示名称和注释字段是编码为 UTF-8，还是使用特定于系统的默认编码。在 Go 1.8 及更早版本中，`Writer` 从不设置 UTF-8 位。在 Go 1.9 中，`Writer` 改为几乎总是设置 UTF-8 位。这导致无法创建包含 Shift-JIS 文件名的 ZIP 归档文件。在 Go 1.10 中，`Writer` 现在仅在名称和注释字段均为有效 UTF-8 且至少一个为非 ASCII 时，才设置 UTF-8 位。由于非 ASCII 编码很少看起来像有效的 UTF-8，新的启发式规则在绝大多数情况下应是正确的。将 `FileHeader` 的新 `NonUTF8` 字段设置为 `true` 可完全禁用该文件的启发式规则。

`Writer` 现在也支持设置中央目录结束记录的注释字段，只需调用 `Writer` 的新 [`SetComment`](/pkg/archive/zip/#Writer.SetComment) 方法即可。

#### [bufio](/pkg/bufio/)

新的 [`Reader.Size`](/pkg/bufio/#Reader.Size) 和 [`Writer.Size`](/pkg/bufio/#Writer.Size) 方法报告 `Reader` 或 `Writer` 的底层缓冲区大小。

#### [bytes](/pkg/bytes/)

[`Fields`](/pkg/bytes/#Fields)、[`FieldsFunc`](/pkg/bytes/#FieldsFunc)、[`Split`](/pkg/bytes/#Split) 和 [`SplitAfter`](/pkg/bytes/#SplitAfter) 函数始终返回其输入的子切片。Go 1.10 更改了每个返回的子切片，使其容量等于其长度，这样向其中一个追加数据就不会覆盖原始输入中的相邻数据。

#### [crypto/cipher](/pkg/crypto/cipher/)

[`NewOFB`](/pkg/crypto/cipher/#NewOFB) 现在如果给定的初始化向量长度不正确，会引发 panic（恐慌），这与该包中其他构造函数的行为一致。（之前它返回一个 nil `Stream` 实现。）

#### [crypto/tls](/pkg/crypto/tls/)

TLS 服务器现在在使用 TLS 1.2 时会公告对 SHA-512 签名的支持。服务器已经支持这些签名，但一些客户端除非明确公告，否则不会选择它们。

#### [crypto/x509](/pkg/crypto/x509/)

[`Certificate.Verify`](/pkg/crypto/x509/#Certificate.Verify) 现在对证书中包含的所有名称（而不仅仅是客户端询问的那一个名称）强制执行名称约束。扩展密钥用法限制现在也类似地一次性检查。因此，在证书验证通过后，现在可以整体信任该证书。不再需要为每个额外的名称或密钥用法重新验证证书。

解析的证书现在也报告 URI 名称以及 IP、电子邮件和 URI 约束，使用新的 [`Certificate`](/pkg/crypto/x509/#Certificate) 字段 `URIs`、`PermittedIPRanges`、`ExcludedIPRanges`、`PermittedEmailAddresses`、`ExcludedEmailAddresses`、`PermittedURIDomains` 和 `ExcludedURIDomains`。这些字段具有无效值的证书现在会被拒绝。

新的 [`MarshalPKCS1PublicKey`](/pkg/crypto/x509/#MarshalPKCS1PublicKey) 和 [`ParsePKCS1PublicKey`](/pkg/crypto/x509/#ParsePKCS1PublicKey) 函数用于在 RSA 公钥和 PKCS#1 编码形式之间进行转换。

新的 [`MarshalPKCS8PrivateKey`](/pkg/crypto/x509/#MarshalPKCS8PrivateKey) 函数将私钥转换为 PKCS#8 编码形式。（[`ParsePKCS8PrivateKey`](/pkg/crypto/x509/#ParsePKCS8PrivateKey) 自 Go 1 起就已存在。）

#### [crypto/x509/pkix](/pkg/crypto/x509/pkix/)

[`Name`](/pkg/crypto/x509/pkix/#Name) 现在实现了 [`String`](/pkg/crypto/x509/pkix/#Name.String) 方法，该方法按照标准的 RFC 2253 格式化 X.500 专有名称。

#### [database/sql/driver](/pkg/database/sql/driver/)目前持有 [`driver.Rows.Next`](/pkg/database/sql/driver/#Rows.Next) 提供的目标缓冲区的驱动程序，应确保不再写入该调用之外分配给目标数组的缓冲区。
驱动程序必须小心，在关闭 [`driver.Rows`](/pkg/database/sql/driver/#Rows) 时，底层缓冲区不应被修改。

希望为其客户端构造 [`sql.DB`](/pkg/database/sql/#DB) 的驱动程序，现在可以实现 [`Connector`](/pkg/database/sql/driver/#Connector) 接口并调用新的 [`sql.OpenDB`](/pkg/database/sql/#OpenDB) 函数，而无需将所有配置编码为传递给 [`sql.Open`](/pkg/database/sql/#Open) 的字符串。

希望每个 `sql.DB` 而非每个 [`sql.Conn`](/pkg/database/sql/#Conn) 只解析一次配置字符串的驱动程序，或者希望访问每个 `sql.Conn` 底层上下文的驱动程序，可以让其 [`Driver`](/pkg/database/sql/driver/#Driver) 实现也实现 [`DriverContext`](/pkg/database/sql/driver/#DriverContext) 的新 `OpenConnector` 方法。

实现了 [`ExecerContext`](/pkg/database/sql/driver/#ExecerContext) 的驱动程序不再需要实现 [`Execer`](/pkg/database/sql/driver/#Execer)；同样，实现了 [`QueryerContext`](/pkg/database/sql/driver/#QueryerContext) 的驱动程序不再需要实现 [`Queryer`](/pkg/database/sql/driver/#Queryer)。此前，即使实现了基于上下文的接口，除非同时也实现了非基于上下文的接口，否则它们会被忽略。

为了允许驱动程序更好地隔离连续使用缓存驱动程序连接的不同客户端，如果 [`Conn`](/pkg/database/sql/driver/#Conn) 实现了新的 [`SessionResetter`](/pkg/database/sql/driver/#SessionResetter) 接口，`database/sql` 现在会在将 `Conn` 重新用于新客户端之前调用 `ResetSession`。

#### [debug/elf](/pkg/debug/elf/)

此版本新增了 348 个重定位常量，分布在重定位类型 [`R_386`](/pkg/debug/elf/#R_386)、[`R_AARCH64`](/pkg/debug/elf/#R_AARCH64)、[`R_ARM`](/pkg/debug/elf/#R_ARM)、[`R_PPC64`](/pkg/debug/elf/#R_PPC64) 和 [`R_X86_64`](/pkg/debug/elf/#R_X86_64) 之间。

#### [debug/macho](/pkg/debug/macho/)

Go 1.10 增加了从 Mach-O 段读取重定位的支持，使用 [`Section`](/pkg/debug/macho#Section) 结构体的新 `Relocs` 字段以及新的 [`Reloc`](/pkg/debug/macho/#Reloc)、[`RelocTypeARM`](/pkg/debug/macho/#RelocTypeARM)、[`RelocTypeARM64`](/pkg/debug/macho/#RelocTypeARM64)、[`RelocTypeGeneric`](/pkg/debug/macho/#RelocTypeGeneric) 和 [`RelocTypeX86_64`](/pkg/debug/macho/#RelocTypeX86_64) 类型及相关常量。

Go 1.10 还增加了对 `LC_RPATH` 加载命令的支持，由类型 [`RpathCmd`](/pkg/debug/macho/#RpathCmd) 和 [`Rpath`](/pkg/debug/macho/#Rpath) 表示，并为头部中找到的各种标志位添加了新的[具名常量](/pkg/debug/macho/#pkg-constants)。

#### [encoding/asn1](/pkg/encoding/asn1/)

[`Marshal`](/pkg/encoding/asn1/#Marshal) 现在正确地将包含星号的字符串编码为 UTF8String 类型，而不是 PrintableString，除非该字符串位于带有强制使用 PrintableString 标签的结构体字段中。`Marshal` 现在还遵循包含 `application` 指令的结构体标签。

新的 [`MarshalWithParams`](/pkg/encoding/asn1/#MarshalWithParams) 函数将其参数进行编组，就好像附加参数是其关联的结构体字段标签一样。

[`Unmarshal`](/pkg/encoding/asn1/#Unmarshal) 现在遵循使用 `explicit` 和 `tag` 指令的结构体字段标签。

`Marshal` 和 `Unmarshal` 现在都支持新的结构体字段标签 `numeric`，表示 ASN.1 NumericString。

#### [encoding/csv](/pkg/encoding/csv/)

[`Reader`](/pkg/encoding/csv/#Reader) 现在禁止使用无意义的 `Comma` 和 `Comment` 设置，例如 NUL、回车、换行、无效的 rune 以及 Unicode 替换字符，或将 `Comma` 和 `Comment` 设置为彼此相同。

在跨多行输入的 CSV 记录存在语法错误的情况下，`Reader` 现在会在 [`ParseError`](/pkg/encoding/csv/#ParseError) 的新 `StartLine` 字段中报告该记录开始的行号。

#### [encoding/hex](/pkg/encoding/hex/)

新函数 [`NewEncoder`](/pkg/encoding/hex/#NewEncoder) 和 [`NewDecoder`](/pkg/encoding/hex/#NewDecoder) 提供了流式十六进制转换，类似于 [encoding/base32](/pkg/encoding/base32/) 和 [encoding/base64](/pkg/encoding/base64/) 中已有的等效函数。

当函数 [`Decode`](/pkg/encoding/hex/#Decode) 和 [`DecodeString`](/pkg/encoding/hex/#DecodeString) 遇到格式错误的输入时，它们现在会返回已转换的字节数以及错误。此前，它们在发生任何错误时总是返回计数 0。

#### [encoding/json](/pkg/encoding/json/)

[`Decoder`](/pkg/encoding/json/#Decoder) 新增了一个方法 [`DisallowUnknownFields`](/pkg/encoding/json/#Decoder.DisallowUnknownFields)，这会导致它将包含未知 JSON 字段的输入报告为解码错误。（默认行为一直是丢弃未知字段。）

作为[修复一个 reflect 错误](#reflect)的结果，[`Unmarshal`](/pkg/encoding/json/#Unmarshal) 不再能解码到嵌入指向未导出结构体类型的指针内的字段中，因为它无法初始化未导出的嵌入指针以指向新的存储。`Unmarshal` 现在会在此种情况下返回错误。

#### [encoding/pem](/pkg/encoding/pem/)

当遇到一个无法编码为 PEM 数据的块时，[`Encode`](/pkg/encoding/pem/#Encode) 和 [`EncodeToMemory`](/pkg/encoding/pem/#EncodeToMemory) 不再生成部分输出。

#### [encoding/xml](/pkg/encoding/xml/)新函数
[`NewTokenDecoder`](/pkg/encoding/xml/#NewTokenDecoder)
类似于
[`NewDecoder`](/pkg/encoding/xml/#NewDecoder)，
但它创建的是一个从 [`TokenReader`](/pkg/encoding/xml/#TokenReader) 读取数据的解码器，而非读取 XML 格式的字节流。这旨在支持客户端库构建 XML 流转换器。

#### [flag](/pkg/flag/)

默认的
[`Usage`](/pkg/flag/#Usage) 函数现在将其第一行输出打印到
`CommandLine.Output()`
而不是假定为 `os.Stderr`，
以便对于使用 `CommandLine.SetOutput` 的客户端，其使用消息能被正确重定向。

[`PrintDefaults`](/pkg/flag/#PrintDefaults) 现在会在标志使用字符串中的换行符后添加适当的缩进，以便多行使用字符串能美观地显示。

[`FlagSet`](/pkg/flag/#FlagSet) 新增了方法
[`ErrorHandling`](/pkg/flag/#FlagSet.ErrorHandling)、
[`Name`](/pkg/flag/#FlagSet.Name) 和
[`Output`](/pkg/flag/#FlagSet.Output)，
用于检索传递给
[`NewFlagSet`](/pkg/flag/#NewFlagSet)
和
[`FlagSet.SetOutput`](/pkg/flag/#FlagSet.SetOutput) 的设置。

#### [go/doc](/pkg/go/doc/)

为了支持上面描述的 [doc 变更](#doc)，
返回 `T`、`*T`、`**T` 等切片的函数现在会在 `T` 的 [`Type`](/pkg/go/doc/#Type) 的 `Funcs` 列表中报告，
而不是在 [`Package`](/pkg/go/doc/#Package) 的 `Funcs` 列表中。

#### [go/importer](/pkg/go/importer/)

[`For`](/pkg/go/importer/#For) 函数现在接受一个非 nil 的查找参数。

#### [go/printer](/pkg/go/printer/)

上面 [gofmt 部分](#gofmt) 讨论的关于 Go 源代码默认格式的更改已在 [go/printer](/pkg/go/printer/) 包中实现，同时也影响了更高级别的 [go/format](/pkg/go/format/) 包的输出。

#### [hash](/pkg/hash/)

现在鼓励 [`Hash`](/pkg/hash/#Hash) 接口的实现也实现 [`encoding.BinaryMarshaler`](/pkg/encoding/#BinaryMarshaler) 和 [`encoding.BinaryUnmarshaler`](/pkg/encoding/#BinaryUnmarshaler)，以允许保存和重建其内部状态，并且标准库中的所有实现（[hash/crc32](/pkg/hash/crc32/)、[crypto/sha256](/pkg/crypto/sha256/) 等）现在都实现了这些接口。

#### [html/template](/pkg/html/template/)

新的 [`Srcset`](/pkg/html/template#Srcset) 内容类型允许正确处理 `img` 标签中 [`srcset`](https://w3c.github.io/html/semantics-embedded-content.html#element-attrdef-img-srcset) 属性内的值。

#### [math/big](/pkg/math/big/)

[`Int`](/pkg/math/big/#Int) 现在支持在其 [`SetString`](/pkg/math/big/#Int.SetString) 和 [`Text`](/pkg/math/big/#Text) 方法中，与 2 到 62 进制之间进行转换。（以前只允许 2 到 36 进制。）常量 `MaxBase` 的值已更新。

[`Int`](/pkg/math/big/#Int) 新增了一个
[`CmpAbs`](/pkg/math/big/#CmpAbs) 方法，
该方法类似于 [`Cmp`](/pkg/math/big/#Cmp)，但只比较参数的绝对值（不比较符号）。

[`Float`](/pkg/math/big/#Float) 新增了一个
[`Sqrt`](/pkg/math/big/#Float.Sqrt) 方法，
用于计算平方根。

#### [math/cmplx](/pkg/math/cmplx/)

[`Asin`](/pkg/math/cmplx/#Asin)、
[`Asinh`](/pkg/math/cmplx/#Asinh)、
[`Atan`](/pkg/math/cmplx/#Atan)
和
[`Sqrt`](/pkg/math/cmplx/#Sqrt)
中的分支切割和其他边界情况已更正，以匹配 C99 标准中使用的定义。

#### [math/rand](/pkg/math/rand/)

新的 [`Shuffle`](/pkg/math/rand/#Shuffle) 函数及相应的
[`Rand.Shuffle`](/pkg/math/rand/#Rand.Shuffle) 方法
用于打乱输入序列。

#### [math](/pkg/math/)

新函数
[`Round`](/pkg/math/#Round)
和
[`RoundToEven`](/pkg/math/#RoundToEven)
将其参数四舍五入到最接近的浮点整数；
`Round` 将半整数舍入到其较大的相邻整数（远离零），
而 `RoundToEven` 则将半整数舍入到其偶数的相邻整数。

新函数
[`Erfinv`](/pkg/math/#Erfinv)
和
[`Erfcinv`](/pkg/math/#Erfcinv)
用于计算逆误差函数和逆互补误差函数。

#### [mime/multipart](/pkg/mime/multipart/)

[`Reader`](/pkg/mime/multipart/#Reader)
现在接受文件名属性为空的部分。

#### [mime](/pkg/mime/)

[`ParseMediaType`](/pkg/mime/#ParseMediaType) 现在会丢弃无效的属性值；以前它会将这些值作为空字符串返回。

#### [net](/pkg/net/)

本包中的 [`Conn`](/pkg/net/#Conn) 和
[`Listener`](/pkg/net/#Conn) 实现
现在保证当 `Close` 返回时，底层的文件描述符已被关闭。（在早期版本中，如果 `Close` 停止了其他 goroutine 中的待处理 I/O，文件描述符的关闭可能发生在 `Close` 返回后不久的一个 goroutine 中。）

[`TCPListener`](/pkg/net/#TCPListener) 和
[`UnixListener`](/pkg/net/#UnixListener)
现在实现了
[`syscall.Conn`](/pkg/syscall/#Conn)，
以允许使用 [`syscall.RawConn.Control`](/pkg/syscall/#RawConn) 在底层文件描述符上设置选项。

由 [`Pipe`](/pkg/net/#Pipe) 返回的 `Conn` 实现现在支持设置读写截止时间。

[`IPConn.ReadMsgIP`](/pkg/net/#IPConn.ReadMsgIP)、
[`IPConn.WriteMsgIP`](/pkg/net/#IPConn.WriteMsgIP)、
[`UDPConn.ReadMsgUDP`](/pkg/net/#UDPConn.ReadMsgUDP)
和
[`UDPConn.WriteMsgUDP`](/pkg/net/#UDPConn.WriteMsgUDP)
方法现在已在 Windows 上实现。

#### [net/http](/pkg/net/http/)

在客户端方面，HTTP 代理（最常见的是通过 [`ProxyFromEnvironment`](/pkg/net/http/#ProxyFromEnvironment) 配置）现在可以指定为 `https://` URL，这意味着客户端在通过代理发出标准的 HTTP 请求之前，会通过 HTTPS 连接到代理。（以前，HTTP 代理 URL 必须以 `http://` 或 `socks5://` 开头。）在服务器端，[`FileServer`](/pkg/net/http/#FileServer) 及其单文件等效函数 [`ServeFile`](/pkg/net/http/#ServeFile)  
现在会对 `HEAD` 请求应用 `If-Range` 检查。  
`FileServer` 现在还会将目录读取失败报告给 [`Server`](/pkg/net/http/#Server) 的 `ErrorLog`。  
此外，当提供零长度内容时，内容服务处理程序现在也会省略 `Content-Type` 头。

[`ResponseWriter`](/pkg/net/http/#ResponseWriter) 的 `WriteHeader` 方法现在  
如果传入无效（非三位数字）的状态码，将会引发 panic。

<!-- CL 46631 -->
当 `Handler` 没有写入任何输出时，`Server` 将不再添加隐式的 Content-Type。

[`Redirect`](/pkg/net/http/#Redirect) 现在会在写入 HTTP 响应之前设置 `Content-Type` 头。

#### [net/mail](/pkg/net/mail/)

[`ParseAddress`](/pkg/net/mail/#ParseAddress) 和  
[`ParseAddressList`](/pkg/net/mail/#ParseAddressList)  
现在支持多种过时的地址格式。

#### [net/smtp](/pkg/net/smtp/)

[`Client`](/pkg/net/smtp/#Client) 添加了新的  
[`Noop`](/pkg/net/smtp/#Client.Noop) 方法，  
用于测试服务器是否仍在响应。  
它现在还会防御 [`Hello`](/pkg/net/smtp/#Client.Hello)  
和 [`Verify`](/pkg/net/smtp/#Client.Verify) 方法输入中可能的 SMTP 注入攻击。

#### [net/textproto](/pkg/net/textproto/)

[`ReadMIMEHeader`](/pkg/net/textproto/#ReadMIMEHeader)  
现在会拒绝任何以延续（缩进）头行开始的头。  
以前，首行缩进的头被视为首行未缩进处理。

#### [net/url](/pkg/net/url/)

[`ResolveReference`](/pkg/net/url/#ResolveReference)  
现在会保留目标 URL 中的多个前导斜杠。  
以前，它会将多个前导斜杠重写为单个斜杠，  
这导致 [`http.Client`](/pkg/net/http/#Client)  
在某些重定向中行为不正确。

例如，以下代码的输出已更改：

	base, _ := url.Parse("http://host//path//to/page1")
	target, _ := url.Parse("page2")
	fmt.Println(base.ResolveReference(target))

注意 `path` 周围的双斜杠。  
在 Go 1.9 及更早版本中，解析后的 URL 是 `http://host/path//to/page2`：  
`path` 前的双斜杠被错误地重写为单斜杠，而 `path` 后的双斜杠  
被正确保留。  
Go 1.10 保留了两个双斜杠，解析为 `http://host//path//to/page2`，  
这是 [RFC 3986](https://tools.ietf.org/html/rfc3986#section-5.2) 的要求。

此更改可能会破坏现有的一些有缺陷的程序，这些程序无意中  
在路径中构造了一个带有前导双斜杠的基础 URL，并不经意地  
依赖 `ResolveReference` 来纠正该错误。  
例如，如果代码将 `http://host/` 这样的主机前缀  
添加到 `/my/api` 这样的路径中，就会导致出现双斜杠的 URL：`http://host//my/api`。

[`UserInfo`](/pkg/net/url/#UserInfo) 的方法  
现在将 nil 接收器视为指向零值 `UserInfo` 的指针。  
以前，它们会引发 panic。

#### [os](/pkg/os/)

[`File`](/pkg/os/#File) 添加了新方法  
[`SetDeadline`](/pkg/os/#File.SetDeadline)、  
[`SetReadDeadline`](/pkg/os/#File.SetReadDeadline)  
和  
[`SetWriteDeadline`](/pkg/os/#File.SetWriteDeadline)，  
允许在底层文件描述符支持非阻塞 I/O 操作时设置 I/O 截止时间。  
这些方法的定义与 [`net.Conn`](/pkg/net/#Conn) 中的相匹配。  
如果 I/O 方法因错过截止时间而失败，它将返回  
超时错误；新的 [`IsTimeout`](/pkg/os/#IsTimeout) 函数  
可报告错误是否表示超时。

同样与 `net.Conn` 匹配，  
`File` 的  
[`Close`](/pkg/os/#File.Close) 方法  
现在保证当 `Close` 返回时，  
底层文件描述符已被关闭。  
（在早期版本中，如果 `Close` 停止了其他 goroutine 中挂起的 I/O，  
文件描述符的关闭可能发生在其中一个 goroutine 中，  
在 `Close` 返回后不久。）

在 BSD、macOS 和 Solaris 系统上，  
[`Chtimes`](/pkg/os/#Chtimes)  
现在支持以纳秒精度设置文件时间  
（假设底层文件系统可以表示它们）。

#### [reflect](/pkg/reflect/)

[`Copy`](/pkg/reflect/#Copy) 函数现在允许将  
字符串复制到字节数组或字节切片中，以匹配  
[内置 copy 函数](/pkg/builtin/#copy)。

在结构体中，嵌入的指向未导出结构体类型的指针  
以前在对应的 [StructField](/pkg/reflect/#StructField) 中  
被错误地报告为具有空的 `PkgPath`，  
结果导致对于这些字段，  
[`Value.CanSet`](/pkg/reflect/#Value.CanSet)  
错误地返回 true，并且  
[`Value.Set`](/pkg/reflect/#Value.Set)  
错误地成功执行。  
底层的元数据已得到纠正；  
对于这些字段，  
`CanSet` 现在正确地返回 false，  
`Set` 现在正确地引发 panic。  
这可能会影响基于反射的解组器，  
这些解组器以前可以解组到此类字段，  
但现在不再可以。  
例如，请参阅 [`encoding/json` 说明](#encoding/json)。

#### [runtime/pprof](/pkg/runtime/pprof/)

如[上文所述](#pprof)，阻塞和互斥锁分析  
现在包含符号信息，因此无需  
生成它们的二进制文件即可查看。

#### [strconv](/pkg/strconv/)

[`ParseUint`](/pkg/strconv/#ParseUint) 现在返回  
相应大小的最大模整数  
并带有任何 `ErrRange` 错误，正如其文档中已经说明的那样。  
以前，它在出现 `ErrRange` 错误时返回 0。

#### [strings](/pkg/strings/)

一个新类型  
[`Builder`](/pkg/strings/#Builder) 是  
[`bytes.Buffer`](/pkg/bytes/#Buffer) 的替代品，  
用于将文本累积到 `string` 结果的用例。  
`Builder` 的 API 是 `bytes.Buffer` API 的受限子集，  
它允许在 [`String`](/pkg/strings/#Builder.String) 方法期间  
安全地避免对数据进行重复复制。

#### [syscall](/pkg/syscall/)在 Windows 系统中，新的 [`SysProcAttr`](/pkg/syscall/#SysProcAttr) 字段 `Token`（类型为 [`Token`](/pkg/syscall/#Token)）允许在 [`StartProcess`](/pkg/syscall/#StartProcess)（因此也包括 [`os.StartProcess`](/pkg/os/#StartProcess) 和 [`exec.Cmd.Start`](/pkg/os/exec/#Cmd.Start)）期间创建以其他用户身份运行的进程。新函数 [`CreateProcessAsUser`](/pkg/syscall/#CreateProcessAsUser) 提供了对底层系统调用的访问。

在 BSD、macOS 和 Solaris 系统中，现已实现 [`UtimesNano`](/pkg/syscall/#UtimesNano)。

#### [time](/pkg/time/)

[`LoadLocation`](/pkg/time/#LoadLocation) 现在会先使用由 `$ZONEINFO` 环境变量指定的目录或未压缩的 zip 文件，然后再查找默认的系统已知安装位置列表或 `$GOROOT/lib/time/zoneinfo.zip`。

新函数 [`LoadLocationFromTZData`](/pkg/time/#LoadLocationFromTZData) 允许将 IANA 时区文件数据转换为 [`Location`](/pkg/time/#Location)。

#### [unicode](/pkg/unicode/)

[`unicode`](/pkg/unicode/) 包及系统相关的支持已从 Unicode 9.0 升级至 [Unicode 10.0](https://www.unicode.org/versions/Unicode10.0.0/)，新增了 8,518 个字符，包括四种新文字系统、一种新属性、一个比特币货币符号和 56 个新表情符号。