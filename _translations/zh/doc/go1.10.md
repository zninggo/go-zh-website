---
title: Go 1.10 发布说明
---

<!--
注意：在本文档及本目录下的其他文档中，约定使用等宽短语与非等宽空格，如 `hello` `world`。
请勿发送移除此类短语内部标签的代码变更。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.10 简介 {#introduction}

最新的 Go 版本 1.10 在 [Go 1.9](go1.9) 发布六个月后问世。其大部分变更集中在工具链、运行时和库的实现层面。如常，此次发布依然遵守 Go 1 [兼容性承诺](/doc/go1compat.html)。我们预计几乎所有 Go 程序都能像以前一样继续编译和运行。

本次发布改进了 [构建包的缓存机制](#build)，新增了 [成功测试结果的缓存](#test)，[在测试期间自动运行 vet 工具](#test-vet)，并允许 [使用 cgo 在 Go 和 C 之间直接传递字符串值](#cgo)。一组新的 [硬编码安全编译器选项](#cgo) 可能会导致在旧版本上能成功构建的代码出现意外的 [`invalid flag`](/s/invalidflag) 错误。

## 语言变更 {#language}

语言规范没有重大变更。

<!-- CL 60230 -->
澄清了一个涉及无类型常量移位的边界情况，因此编译器已更新，允许在索引表达式中使用 `x[1.0`&nbsp;`<<`&nbsp;`s]`，其中 `s` 是一个无符号整数；[go/types](/pkg/go/types/) 包此前已经支持此语法。

<!-- CL 73233 -->
方法表达式的语法已更新，放宽了语法限制，允许将任何类型表达式作为接收器；这与编译器实际实现的行为一致。例如，`struct{io.Reader}.Read` 是一个有效的（尽管不常见）方法表达式，编译器早已接受，现在语言语法也正式允许了。

## 平台支持 {#ports}

本次发布未新增支持的操作系统或处理器架构。大部分工作集中在加强对现有平台的支持，特别是 [汇编器中的新指令](#asm) 和对编译器生成代码的改进。

如 [Go 1.9 发布说明中所宣布](go1.9#freebsd)，Go 1.10 现在要求 FreeBSD 10.3 或更高版本；已移除对 FreeBSD 9.3 的支持。

Go 现在再次能在 NetBSD 上运行，但要求使用尚未正式发布的 NetBSD 8。目前仅修复了 `GOARCH` 为 `amd64` 和 `386` 的情况。`arm` 平台仍然存在问题。

在 32 位 MIPS 系统上，新的环境变量设置 `GOMIPS=hardfloat`（默认）和 `GOMIPS=softfloat` 可选择是使用硬件指令还是软件模拟进行浮点计算。

Go 1.10 是支持在 OpenBSD 6.0 上运行的最后一个版本。Go 1.11 将要求 OpenBSD 6.2。

Go 1.10 是支持在 OS X 10.8 Mountain Lion 或 OS X 10.9 Mavericks 上运行的最后一个版本。Go 1.11 将要求 OS X 10.10 Yosemite 或更高版本。

Go 1.10 是支持在 Windows XP 或 Windows Vista 上运行的最后一个版本。Go 1.11 将要求 Windows 7 或更高版本。

## 工具 {#tools}

### 默认 GOROOT 与 GOTMPDIR {#goroot}

如果环境变量 `$GOROOT` 未设置，`go` 工具之前使用的是工具链编译时设置的默认 `GOROOT`。现在，在回退到该默认值之前，`go` 工具会尝试从其自身的可执行文件路径推断 `GOROOT`。这允许二进制发行包被解压到文件系统的任何位置，然后无需显式设置 `GOROOT` 即可使用。

默认情况下，`go` 工具会在系统临时目录（例如 Unix 上的 `$TMPDIR`）中创建其临时文件和目录。如果设置了新的环境变量 `$GOTMPDIR`，`go` 工具将在该目录中创建其临时文件和目录。

### 构建与安装 {#build}

`go`&nbsp;`build` 命令现在纯粹基于源文件内容、指定的构建标志以及编译包中存储的元数据来检测过时的包。不再考虑或依赖文件的修改时间。旧的建议，即在修改时间因某种原因（例如构建标志变更）而不可靠时添加 `-a` 来强制重新构建，已不再必要：构建现在总能检测到何时必须重新构建包。（如果您观察到相反的情况，请提交错误报告。）

`go`&nbsp;`build` 的 `-asmflags`、`-gcflags`、`-gccgoflags` 和 `-ldflags` 选项现在默认仅应用于命令行中直接列出的包。例如，`go` `build` `-gcflags=-m` `mypkg` 在构建 `mypkg` 时向编译器传递 `-m` 标志，但不会传递给它的依赖项。新的、更通用的形式 `-asmflags=pattern=flags`（其他选项类似）仅将 `flags` 应用于与模式匹配的包。例如：`go` `install` `-ldflags=cmd/gofmt=-X=main.version=1.2.3` `cmd/...` 会安装所有匹配 `cmd/...` 的命令，但仅将 `-X` 选项应用于 `cmd/gofmt` 的链接器标志。更多详情，请参阅 [`go` `help` `build`](/cmd/go/#hdr-Compile_packages_and_dependencies)。

`go`&nbsp;`build` 命令现在维护一个最近构建的包的缓存，该缓存独立于 `$GOROOT/pkg` 或 `$GOPATH/pkg` 中已安装的包。缓存的效果应能加速那些不显式安装包的构建，或在不同源代码副本之间切换时（例如，在版本控制系统中来回切换不同分支）的构建。旧的建议，即添加 `-i` 标志以提升速度（如 `go` `build` `-i` 或 `go` `test` `-i`），已不再必要：构建在不使用 `-i` 的情况下同样快。更多详情，请参阅 [`go` `help` `cache`](/cmd/go/#hdr-Build_and_test_caching)。`go` `install` 命令现在仅安装命令行中直接列出的包和程序。例如，`go` `install` `cmd/gofmt` 仅安装 gofmt 程序，而不安装其依赖的任何包。新的构建缓存机制使得后续命令即使依赖项未安装，也能保持相同的运行速度。若要强制安装依赖项，请使用新的 `go` `install` `-i` 标志。一般情况下，安装依赖包并非必要，且在未来的版本中，已安装包的概念可能会消失。

`go` `build` 的实现细节已发生许多变化以支持这些改进。这些变化隐含的一个新要求是：二进制包现在必须在其桩源代码中声明准确的导入块，以便在链接使用该二进制包的程序时能提供这些导入项。更多详情请参阅 [`go` `help` `filetype`](/cmd/go/#hdr-File_types)。

### 测试 {#test}

`go` `test` 命令现在会缓存测试结果：如果测试可执行文件和命令行与之前的运行匹配，且该次运行所涉及的文件和环境变量均未发生变化，`go` `test` 将打印之前的测试输出，并用字符串“（cached）”替换经过的时间。测试缓存仅适用于成功的测试结果；仅适用于带有显式包列表的 `go` `test` 命令；且仅适用于使用 `-cpu`、`-list`、`-parallel`、`-run`、`-short` 和 `-v` 测试标志子集的命令行。跳过测试缓存的惯用方法是使用 `-count=1`。

`go` `test` 命令现在会在运行测试前自动对被测包执行 `go` `vet`，以在测试运行前识别重大问题。任何此类问题都会被视作构建错误并阻止测试执行。此项自动检查仅启用 `go` `vet` 可用检查中置信度高的子集。要禁用 `go` `vet` 的运行，请使用 `go` `test` `-vet=off`。

`go` `test` `-coverpkg` 标志现在将其参数解释为一个逗号分隔的模式列表，用以匹配每个测试的依赖项，而不是一个需要重新加载的包列表。例如，`go` `test` `-coverpkg=all` 现在是一种有意义的方式，可用于运行测试并为测试包及其所有依赖项启用覆盖率收集。此外，`go` `test` `-coverprofile` 选项现在支持在运行多个测试时使用。

在因超时导致失败的情况下，测试现在更有可能在退出前写入其分析文件。

`go` `test` 命令现在始终会合并来自给定测试二进制执行的标准输出和标准错误，并将两者都写入 `go` `test` 的标准输出。在过去的版本中，`go` `test` 仅在大多数时候执行此合并。

`go` `test` `-v` 输出现在包含 `PAUSE` 和 `CONT` 状态更新行，以标记[并行测试](/pkg/testing/#T.Parallel)何时暂停和继续。

新的 `go` `test` `-failfast` 标志会在任何测试失败后禁用运行后续测试。请注意，与失败测试并行运行的测试允许完成。

最后，新的 `go` `test` `-json` 标志通过新命令 `go` `tool` `test2json` 过滤测试输出，以生成测试执行的机器可读的 JSON 格式描述。这使得在 IDE 和其他工具中能够创建丰富的测试执行呈现。

有关所有这些更改的更多详情，请参阅 [`go` `help` `test`](/cmd/go/#hdr-Test_packages) 和 [test2json 文档](/cmd/test2json/)。

### Cgo {#cgo}

Cgo 使用 `#cgo CFLAGS` 等指定的选项现在会与一个允许的选项列表进行核对。这堵住了一个安全漏洞，即下载的包可能使用类似
<span style="white-space: nowrap">`-fplugin`</span>
的编译器选项在构建机器上运行任意代码。这可能导致类似 `invalid flag in #cgo CFLAGS` 的构建错误。有关更多背景信息以及如何处理此错误，请参阅 [https://golang.org/s/invalidflag](/s/invalidflag)。

Cgo 现在使用 Go 类型别名来实现类似 “`typedef` `X` `Y`” 的 C 类型定义，因此 Go 代码可以互换使用类型 `C.X` 和 `C.Y`。它现在还支持使用无参数函数式宏。此外，文档已更新以澄清 cgo 导出函数的类型签名中不支持 Go 结构体和 Go 数组。

Cgo 现在支持从 C 直接访问 Go 字符串值。C 前言中的函数可以使用类型 `_GoString_` 来接受 Go 字符串作为参数。C 代码可以调用 `_GoStringLen` 和 `_GoStringPtr` 来直接访问字符串内容。类型为 `_GoString_` 的值可以在调用接受 Go 类型 `string` 参数的导出 Go 函数时传递。

在工具链引导过程中，环境变量 `CC` 和 `CC_FOR_TARGET` 分别指定生成的工具链将用于主机和目标构建的默认 C 编译器。然而，如果工具链将用于多个目标，则可能需要为每个目标指定不同的 C 编译器（例如，`darwin/arm64` 与 `linux/ppc64le` 使用不同的编译器）。新的环境变量集 <code>CC\_FOR\__goos_\__goarch_</code> 允许为每个目标指定不同的默认 C 编译器。请注意，这些变量仅在工具链引导期间适用，用于设置生成工具链所使用的默认值。后续的 `go` `build` 命令使用 `CC` 环境变量或内置默认值。

Cgo 现在将一些通常会映射到 Go 中指针类型的 C 类型，转而映射为 `uintptr`。这些类型包括 Darwin CoreFoundation 框架中的 `CFTypeRef` 层级结构和 Java JNI 接口中的 `jobject` 层级结构。这些类型在 Go 端必须使用 `uintptr`，否则会干扰 Go 垃圾回收器；它们有时并非真正的指针，而是以指针大小整数编码的数据结构。指向 Go 内存的指针不得存储在此类 `uintptr` 值中。

由于此变更，受影响类型的值需要使用常量 `0` 而非常量 `nil` 进行零值初始化。Go 1.10 提供了 `gofix` 模块以辅助完成此重写：

	go tool fix -r cftype <pkg>
	go tool fix -r jni <pkg>

更多详情请参阅 [cgo 文档](/cmd/cgo/)。

### 文档工具 {#doc}

`go`&nbsp;`doc` 工具现会将返回 `T` 或 `*T` 切片的函数添加到类型 `T` 的展示中，其行为与现有返回单个 `T` 或 `*T` 结果的函数类似。例如：

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

此前，`ParseAddressList` 仅显示在包概述（`go` `doc` `mail`）中。

### 修复工具 {#fix}

`go`&nbsp;`fix` 工具现会将 `"golang.org/x/net/context"` 的导入替换为 `"context"`。
（前者中的转发别名使其在 Go 1.9 及更高版本中与后者完全等效。）

### 获取工具 {#get}

`go`&nbsp;`get` 命令现支持 Fossil 源代码仓库。

### Pprof 工具 {#pprof}

`runtime/pprof` 包生成的阻塞和互斥锁性能分析文件现包含符号信息，因此可在 `go` `tool` `pprof` 中直接查看，无需生成分析文件的二进制文件。
（Go 1.9 已将所有其他性能分析类型改为包含符号信息。）

[`go`&nbsp;`tool`&nbsp;`pprof`](/cmd/pprof/) 性能分析可视化工具已更新至来自 [github.com/google/pprof](https://github.com/google/pprof) 的 git 版本 9e20b5b（2017-11-08），其中包含更新的网页界面。

### 检查工具 {#vet}

[`go`&nbsp;`vet`](/cmd/vet/) 命令现可始终访问完整且最新的类型信息来检查包，即使对于使用 cgo 或供应商导入的包也是如此。
因此报告结果应更加准确。
请注意，仅 `go`&nbsp;`vet` 能访问此信息；更底层的 `go`&nbsp;`tool`&nbsp;`vet` 则不能，除开发 `vet` 本身外应避免使用。
（自 Go 1.9 起，`go`&nbsp;`vet` 提供了与 `go`&nbsp;`tool`&nbsp;`vet` 相同的所有标志访问权限。）

### 诊断工具 {#diag}

本版本包含一份新的 [Go 程序可用诊断工具概述](/doc/diagnostics.html)。

### 格式化工具 {#gofmt}

Go 源代码默认格式化的两个细节已发生变化。
首先，某些复杂的三索引切片表达式此前格式化为 `x[i+1`&nbsp;`:`&nbsp;`j:k]`，现采用更一致的空格格式：`x[i+1`&nbsp;`:`&nbsp;`j`&nbsp;`:`&nbsp;`k]`。
其次，单方法接口字面量（有时用于类型断言）若写在单行内，现不再拆分为多行。

请注意，gofmt 此类微小更新会不时出现。
总体而言，我们建议避免构建会检查源代码是否匹配特定版本 gofmt 输出的系统。
例如，若代码库中已提交的代码未"正确格式化"，则持续集成测试将失败，此类方案本质脆弱且不推荐使用。

若多个程序需约定使用特定版本的 gofmt 格式化源文件，建议通过调用相同的 gofmt 二进制文件来实现。
例如，在 Go 开源代码库中，我们的 Git 预提交钩子使用 Go 编写，本可直接导入 `go/format`，但实际上它调用当前路径下的 `gofmt` 二进制文件，从而避免每次 `gofmt` 更新时都需重新编译预提交钩子。

### 编译器工具链 {#compiler}

编译器包含多项生成代码性能改进，这些改进在支持的架构中分布相当均匀。

二进制文件中记录的 DWARF 调试信息已在多方面得到改进：现会记录常量值；行号信息更准确，使源码级程序单步执行效果更佳；且每个包现被表示为独立的 DWARF 编译单元。

各种[构建模式](https://docs.google.com/document/d/1nr-TQHw_er6GOQRsF6T43GGhFDelrAP0NqSS_00RgZQ/edit)已移植至更多系统。
具体而言，`c-shared` 现支持 `linux/ppc64le`、`windows/386` 和 `windows/amd64`；`pie` 现支持 `darwin/amd64` 且在所有系统上强制使用外部链接；`plugin` 现支持 `linux/ppc64le` 和 `darwin/amd64`。

`linux/ppc64le` 移植版现要求任何使用 cgo 的程序（包括标准库的使用）必须使用外部链接。

### 汇编器 {#asm}

对于 ARM 32 位移植版，汇编器现支持以下指令：
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
及
<code><small>XTAHU</small></code>。对于ARM 64位架构的移植，汇编器现已支持以下指令：
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
<code><small>VREV32</small></code>
以及
<code><small>VST1</small></code>
指令。

对于PowerPC 64位架构的移植，汇编器现已支持POWER9指令：
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
<code><small>VCMPNEZBCC</small></code>
以及
<code><small>VMSUMUDM</small></code>
指令。

对于S390X架构的移植，汇编器现已支持：
<code><small>TMHH</small></code>、
<code><small>TMHL</small></code>、
<code><small>TMLH</small></code>
以及
<code><small>TMLL</small></code>
指令。

对于X86 64位架构的移植，汇编器现已支持359条新指令，
包括完整的AVX、AVX2、BMI、BMI2、F16C、FMA3、SSE2、SSE3、SSSE3、SSE4.1和SSE4.2扩展指令集。
汇编器不再将 <code><small>MOVL</small></code>&nbsp;<code><small>$0,</small></code>&nbsp;<code><small>AX</small></code>
实现为 <code><small>XORL</small></code> 指令，
以避免意外清除状态标志。

### Gccgo {#gccgo}

由于Go语言半年一次的发布周期与GCC年度发布周期的对齐，
GCC 7版本包含了Go 1.8.3版本的gccgo。
我们预计下一个版本GCC 8将包含Go 1.10版本的gccgo。

## 运行时 {#runtime}

对嵌套调用
[`LockOSThread`](/pkg/runtime/#LockOSThread) 和
[`UnlockOSThread`](/pkg/runtime/#UnlockOSThread)
的行为已发生改变。
这些函数控制一个goroutine（协程）是否被锁定到特定的操作系统线程，
以确保该goroutine只在该线程上运行，且该线程只运行该goroutine。
以前，连续多次调用 `LockOSThread`
等同于调用一次，而单次 `UnlockOSThread`
总是会解锁线程。
现在，这些调用是嵌套的：如果多次调用 `LockOSThread`，
则必须调用相同次数的 `UnlockOSThread`
才能解锁线程。
已小心避免嵌套调用这些函数的现有代码将保持正确。
错误地假设这些调用是嵌套的现有代码将变得正确。
公开的Go源代码中对这些函数的大多数使用属于第二种情况。

由于 `LockOSThread` 和 `UnlockOSThread`
的一个常见用途是允许Go代码可靠地修改线程局部状态（例如，Linux或Plan 9命名空间），
运行时现在将锁定的线程视为不适合重用或用于创建新线程。

栈追踪现在不再包含隐式包装函数（以前标记为 `<autogenerated>`），
除非在包装函数本身内部发生故障或panic（恐慌）。
因此，传递给 [`Caller`](/pkg/runtime/#Caller)
等函数的跳过计数值现在应始终与代码的编写结构匹配，而不是依赖于
优化决策和实现细节。

垃圾回收器（GC）已进行修改，以减少其对分配延迟的影响。
它现在在运行时使用更小比例的总体CPU资源，但可能会更频繁地运行。
垃圾回收器消耗的总CPU资源没有显著变化。

当未设置 `$GOROOT` 环境变量时，
[`GOROOT`](/pkg/runtime/#GOROOT) 函数
现在默认（当未设置 `$GOROOT` 环境变量时）
采用调用程序编译时有效的 `GOROOT` 或 `GOROOT_FINAL`。
以前它使用编译调用程序的工具链被编译时有效的 `GOROOT` 或 `GOROOT_FINAL`。

对 [`GOMAXPROCS`](/pkg/runtime/#GOMAXPROCS) 设置不再有限制。
（在Go 1.9中，限制为1024。）

## 性能 {#performance}

一如既往，相关变更非常普遍且多样，因此很难做出精确的
性能声明。由于垃圾回收器的加速、
生成代码质量的提高以及核心库中的优化，大多数程序
运行速度应略有提升。

## 垃圾回收器 {#gc}

许多应用程序在垃圾回收器活动时应体验到显著降低的分配延迟和总体性能开销。

## 标准库 {#library}

对标准库的所有更改都是细微的。
[bytes](#bytes) 和 [net/url](#net/url) 中的更改
最有可能需要更新现有程序。

### 库的微小变更 {#minor_library_changes}

一如既往，库中存在各种微小的更改和更新，
这些更改均遵循Go 1的[兼容性承诺](/doc/go1compat)。

#### [archive/tar](/pkg/archive/tar/)

总体而言，对特殊头部格式的处理得到了显著改进和扩展。

[`FileInfoHeader`](/pkg/archive/tar/#FileInfoHeader) 一直
从其 [`os.FileInfo`](/pkg/os/#FileInfo) 参数中
（具体来说，从 `FileInfo` 的 `Sys` 方法返回的依赖于系统的信息中）
记录Unix UID和GID数字到返回的 [`Header`](/pkg/archive/tar/#Header) 中。
现在，它还记录了与这些ID对应的用户和组名，
以及设备文件的主次设备号。新的 [`Header.Format`](/pkg/archive/tar/#Header) 字段
类型为 [`Format`](/pkg/archive/tar/#Format)，
它控制 [`Writer`](/pkg/archive/tar/#Writer) 使用的 tar 头部格式。
默认行为与之前一样，是选择能编码头部所需字段的最广泛支持的头部类型
（如果可能使用 USTAR，否则如果可能使用 PAX，再否则使用 GNU）。
[`Reader`](/pkg/archive/tar/#Reader) 在读取每个头部时会设置 `Header.Format`。

`Reader` 和 `Writer` 现在通过新的 [`Header.PAXRecords`](/pkg/archive/tar/#Header) 字段
支持任意的 PAX 记录，这是对现有 `Xattrs` 字段的通用化。

`Reader` 不再强制要求 GNU 头部中的文件名或链接名
必须是有效的 UTF-8。

在写入 PAX 或 GNU 格式的头部时，`Writer` 现在包含
`Header.AccessTime` 和 `Header.ChangeTime` 字段（如果已设置）。
在写入 PAX 格式的头部时，时间信息包括亚秒精度。

#### [archive/zip](/pkg/archive/zip/)

Go 1.10 为 ZIP 归档文件中的时间和字符集编码添加了更完善的支持。

最初的 ZIP 格式使用标准的 MS-DOS 编码，将年、月、日、时、分、秒编码到两个 16 位值的字段中。
这种编码无法表示时区或奇数秒，因此引入了多种扩展以支持更丰富的编码。
在 Go 1.10 中，[`Reader`](/pkg/archive/zip/#Reader) 和 [`Writer`](/pkg/archive/zip/#Writer)
现在支持广泛使用的 Info-Zip 扩展，该扩展将时间以 32 位 Unix "自纪元以来的秒数" 格式单独编码。
[`FileHeader`](/pkg/archive/zip/#FileHeader) 新增的类型为 [`time.Time`](/pkg/time/#Time) 的 `Modified` 字段
使得 `ModifiedTime` 和 `ModifiedDate` 字段过时，但这两个字段仍保留 MS-DOS 编码的值。
`Reader` 和 `Writer` 现在采用一个常见约定，
即存储与时间无关的 Unix 时间的 ZIP 归档文件，
同时会在 MS-DOS 字段中存储本地时间，
以便推断出时区偏移量。
为了保持兼容性，[`ModTime`](/pkg/archive/zip/#FileHeader.ModTime) 和
[`SetModTime`](/pkg/archive/zip/#FileHeader.SetModTime) 方法
的行为与早期版本相同；新代码应直接使用 `Modified` 字段。

ZIP 归档中每个文件的头部都有一个标志位，指示
名称和注释字段是编码为 UTF-8，还是使用系统特定的默认编码。
在 Go 1.8 及更早版本中，`Writer` 从不设置 UTF-8 位。
在 Go 1.9 中，`Writer` 改为几乎总是设置 UTF-8 位。
这导致包含 Shift-JIS 文件名的 ZIP 归档创建失败。
在 Go 1.10 中，`Writer` 现在仅当名称和注释字段均为有效 UTF-8
且其中至少一个为非 ASCII 时，才设置 UTF-8 位。
因为非 ASCII 编码看起来像有效 UTF-8 的情况非常少见，这个新的
启发式方法在几乎所有情况下都应该是正确的。
将 `FileHeader` 的新字段 `NonUTF8` 设置为 true
会完全禁用该文件的启发式判断。

`Writer` 现在还支持设置中央目录结尾记录的注释字段，
可以通过调用 `Writer` 新增的 [`SetComment`](/pkg/archive/zip/#Writer.SetComment) 方法实现。

#### [bufio](/pkg/bufio/)

新增的 [`Reader.Size`](/pkg/bufio/#Reader.Size)
和 [`Writer.Size`](/pkg/bufio/#Writer.Size)
方法用于报告 `Reader` 或 `Writer` 底层缓冲区的大小。

#### [bytes](/pkg/bytes/)

[`Fields`](/pkg/bytes/#Fields)、
[`FieldsFunc`](/pkg/bytes/#FieldsFunc)、
[`Split`](/pkg/bytes/#Split)
和
[`SplitAfter`](/pkg/bytes/#SplitAfter)
函数返回的始终是输入切片的子切片。
Go 1.10 改变了返回的每个子切片的容量等于其长度，
因此向其中追加数据不会覆盖原始输入中的相邻数据。

#### [crypto/cipher](/pkg/crypto/cipher/)

[`NewOFB`](/pkg/crypto/cipher/#NewOFB) 现在如果给定长度错误的
初始化向量会引发恐慌，就像该包中其他构造函数一直做的那样。
（之前它返回一个 nil 的 `Stream` 实现。）

#### [crypto/tls](/pkg/crypto/tls/)

TLS 服务器现在在使用 TLS 1.2 时会公告支持 SHA-512 签名。
服务器本已支持这些签名，但某些客户端除非明确公告否则不会选择它们。

#### [crypto/x509](/pkg/crypto/x509/)

[`Certificate.Verify`](/pkg/crypto/x509/#Certificate.Verify)
现在对证书中包含的**所有**名称强制执行名称约束，而不仅仅是客户端询问的那一个名称。
扩展密钥用途限制现在也是一次性全部检查。
因此，在验证证书后，现在可以完全信任该证书。
不再需要为每个额外的名称或密钥用途重新验证证书。

已解析的证书现在还使用新的 [`Certificate`](/pkg/crypto/x509/#Certificate) 字段
`URIs`、`PermittedIPRanges`、`ExcludedIPRanges`、
`PermittedEmailAddresses`、`ExcludedEmailAddresses`、
`PermittedURIDomains` 和 `ExcludedURIDomains` 报告 URI 名称和 IP、电子邮件、URI 约束。
这些字段包含无效值的证书现在会被拒绝。

新增的 [`MarshalPKCS1PublicKey`](/pkg/crypto/x509/#MarshalPKCS1PublicKey)
和 [`ParsePKCS1PublicKey`](/pkg/crypto/x509/#ParsePKCS1PublicKey)
函数用于在 RSA 公钥与其 PKCS#1 编码形式之间进行转换。

新增的 [`MarshalPKCS8PrivateKey`](/pkg/crypto/x509/#MarshalPKCS8PrivateKey)
函数用于将私钥转换为 PKCS#8 编码形式。
（[`ParsePKCS8PrivateKey`](/pkg/crypto/x509/#ParsePKCS8PrivateKey)
自 Go 1 起就已存在。）

#### [crypto/x509/pkix](/pkg/crypto/x509/pkix/)

[`Name`](/pkg/crypto/x509/pkix/#Name) 现在实现了
[`String`](/pkg/crypto/x509/pkix/#Name.String) 方法，
该方法以标准的 RFC 2253 格式格式化 X.500 可分辨名称。

#### [database/sql/driver](/pkg/database/sql/driver/)目前持有 [`driver.Rows.Next`](/pkg/database/sql/driver/#Rows.Next) 提供的目标缓冲区的驱动程序，应确保在该调用之外不再写入分配给目标数组的缓冲区。
驱动程序必须小心，在关闭 [`driver.Rows`](/pkg/database/sql/driver/#Rows) 时，底层缓冲区不会被修改。

希望为客户端构建 [`sql.DB`](/pkg/database/sql/#DB) 的驱动程序现在可以实现 [`Connector`](/pkg/database/sql/driver/#Connector) 接口，并调用新的 [`sql.OpenDB`](/pkg/database/sql/#OpenDB) 函数，而无需将所有配置编码为传递给 [`sql.Open`](/pkg/database/sql/#Open) 的字符串。

希望每个 `sql.DB` 只解析一次配置字符串（而不是每个 [`sql.Conn`](/pkg/database/sql/#Conn) 解析一次），或者希望访问每个 `sql.Conn` 底层上下文的驱动程序，可以让其 [`Driver`](/pkg/database/sql/driver/#Driver) 实现同时实现 [`DriverContext`](/pkg/database/sql/driver/#DriverContext) 的新 `OpenConnector` 方法。

实现 [`ExecerContext`](/pkg/database/sql/driver/#ExecerContext) 的驱动程序不再需要实现 [`Execer`](/pkg/database/sql/driver/#Execer)；类似地，实现 [`QueryerContext`](/pkg/database/sql/driver/#QueryerContext) 的驱动程序不再需要实现 [`Queryer`](/pkg/database/sql/driver/#Queryer)。此前，即使实现了基于上下文的接口，如果未同时实现非基于上下文的接口，它们也会被忽略。

为了让驱动程序能更好地隔离相继使用缓存驱动连接的不同客户端，如果一个 [`Conn`](/pkg/database/sql/driver/#Conn) 实现了新的 [`SessionResetter`](/pkg/database/sql/driver/#SessionResetter) 接口，`database/sql` 现在会在将 `Conn` 重新用于新客户端之前调用 `ResetSession`。

#### [debug/elf](/pkg/debug/elf/)

此版本新增了 348 个新的重定位常量，分布在重定位类型
[`R_386`](/pkg/debug/elf/#R_386)、
[`R_AARCH64`](/pkg/debug/elf/#R_AARCH64)、
[`R_ARM`](/pkg/debug/elf/#R_ARM)、
[`R_PPC64`](/pkg/debug/elf/#R_PPC64)
和
[`R_X86_64`](/pkg/debug/elf/#R_X86_64) 中。

#### [debug/macho](/pkg/debug/macho/)

Go 1.10 增加了从 Mach-O 节中读取重定位信息的支持，使用 [`Section`](/pkg/debug/macho#Section) 结构体的新 `Relocs` 字段，以及新的 [`Reloc`](/pkg/debug/macho/#Reloc)、
[`RelocTypeARM`](/pkg/debug/macho/#RelocTypeARM)、
[`RelocTypeARM64`](/pkg/debug/macho/#RelocTypeARM64)、
[`RelocTypeGeneric`](/pkg/debug/macho/#RelocTypeGeneric)
和
[`RelocTypeX86_64`](/pkg/debug/macho/#RelocTypeX86_64) 类型及相关常量。

Go 1.10 还增加了对 `LC_RPATH` 加载命令的支持，由类型
[`RpathCmd`](/pkg/debug/macho/#RpathCmd) 和
[`Rpath`](/pkg/debug/macho/#Rpath)
表示，以及用于头中各种标志位的新[命名常量](/pkg/debug/macho/#pkg-constants)。

#### [encoding/asn1](/pkg/encoding/asn1/)

[`Marshal`](/pkg/encoding/asn1/#Marshal) 现在可以正确地将包含星号的字符串编码为 UTF8String 类型，而不是 PrintableString，除非该字符串位于强制使用 PrintableString 的 struct 字段标签中。
`Marshal` 现在也遵守包含 `application` 指令的 struct 标签。

新的 [`MarshalWithParams`](/pkg/encoding/asn1/#MarshalWithParams) 函数将其参数编组，就好像附加参数是其关联的 struct 字段标签一样。

[`Unmarshal`](/pkg/encoding/asn1/#Unmarshal) 现在遵守使用 `explicit` 和 `tag` 指令的 struct 字段标签。

`Marshal` 和 `Unmarshal` 现在都支持一个新的 struct 字段标签 `numeric`，表示 ASN.1 NumericString。

#### [encoding/csv](/pkg/encoding/csv/)

[`Reader`](/pkg/encoding/csv/#Reader) 现在禁止使用无意义的 `Comma` 和 `Comment` 设置，例如 NUL、回车、换行、无效的 rune 和 Unicode 替换字符，或者将 `Comma` 和 `Comment` 设置为相同值。

在 CSV 记录存在语法错误且跨越多行输入的情况下，`Reader` 现在会在 [`ParseError`](/pkg/encoding/csv/#ParseError) 的新 `StartLine` 字段中报告该记录开始的行号。

#### [encoding/hex](/pkg/encoding/hex/)

新函数
[`NewEncoder`](/pkg/encoding/hex/#NewEncoder)
和
[`NewDecoder`](/pkg/encoding/hex/#NewDecoder)
提供与十六进制相互转换的流式处理，类似于
[encoding/base32](/pkg/encoding/base32/)
和
[encoding/base64](/pkg/encoding/base64/)
中已有的等效函数。

当函数
[`Decode`](/pkg/encoding/hex/#Decode)
和
[`DecodeString`](/pkg/encoding/hex/#DecodeString)
遇到格式错误的输入时，它们现在会返回已转换的字节数以及错误。
此前，它们在遇到任何错误时总是返回计数为 0。

#### [encoding/json](/pkg/encoding/json/)

[`Decoder`](/pkg/encoding/json/#Decoder) 新增了一个方法
[`DisallowUnknownFields`](/pkg/encoding/json/#Decoder.DisallowUnknownFields)，
该方法会导致它将包含未知 JSON 字段的输入报告为解码错误。
（默认行为一直是丢弃未知字段。）

作为[修复一个 reflect 错误](#reflect)的结果，
[`Unmarshal`](/pkg/encoding/json/#Unmarshal)
不再能够解码到指向未导出 struct 类型的嵌入指针内部的字段，因为它无法初始化未导出的嵌入指针以指向新的存储。
`Unmarshal` 现在在这种情况下会返回错误。

#### [encoding/pem](/pkg/encoding/pem/)

[`Encode`](/pkg/encoding/pem/#Encode)
和
[`EncodeToMemory`](/pkg/encoding/pem/#EncodeToMemory)
在接收到无法编码为 PEM 数据的块时，不再生成部分输出。

#### [encoding/xml](/pkg/encoding/xml/)新函数
[`NewTokenDecoder`](/pkg/encoding/xml/#NewTokenDecoder)
类似于
[`NewDecoder`](/pkg/encoding/xml/#NewDecoder)，
但它创建的解码器读取的是 [`TokenReader`](/pkg/encoding/xml/#TokenReader)，
而非 XML 格式的字节流。
这旨在使客户端库能够构建 XML 流转换器。

#### [flag](/pkg/flag/)

默认的
[`Usage`](/pkg/flag/#Usage) 函数现在将其输出的第一行打印到
`CommandLine.Output()`，
而不是假定 `os.Stderr`，
从而确保使用 `CommandLine.SetOutput` 的客户端能正确重定向使用信息。

[`PrintDefaults`](/pkg/flag/#PrintDefaults) 现在会在标志用法字符串的换行符后添加适当的缩进，
使得多行使用信息显示更美观。

[`FlagSet`](/pkg/flag/#FlagSet) 新增了方法
[`ErrorHandling`](/pkg/flag/#FlagSet.ErrorHandling)、
[`Name`](/pkg/flag/#FlagSet.Name)
和
[`Output`](/pkg/flag/#FlagSet.Output)，
用于获取传递给
[`NewFlagSet`](/pkg/flag/#NewFlagSet)
和
[`FlagSet.SetOutput`](/pkg/flag/#FlagSet.SetOutput) 的设置。

#### [go/doc](/pkg/go/doc/)

为了支持上述 [文档变更](#doc)，
返回类型为 `T`、`*T`、`**T` 等切片的函数，
现在会被报告在 `T` 的 [`Type`](/pkg/go/doc/#Type) 的 `Funcs` 列表中，
而不是在 [`Package`](/pkg/go/doc/#Package) 的 `Funcs` 列表中。

#### [go/importer](/pkg/go/importer/)

[`For`](/pkg/go/importer/#For) 函数现在接受非空的查找参数。

#### [go/printer](/pkg/go/printer/)

上文 [gofmt 章节](#gofmt) 讨论的 Go 源代码默认格式化更改
已在 [go/printer](/pkg/go/printer/) 包中实现，
并且也影响了更高级别的 [go/format](/pkg/go/format/) 包的输出。

#### [hash](/pkg/hash/)

现在鼓励 [`Hash`](/pkg/hash/#Hash) 接口的实现
实现 [`encoding.BinaryMarshaler`](/pkg/encoding/#BinaryMarshaler)
和 [`encoding.BinaryUnmarshaler`](/pkg/encoding/#BinaryUnmarshaler)，
以允许保存和重建其内部状态，
并且标准库中的所有实现
（[hash/crc32](/pkg/hash/crc32/)、[crypto/sha256](/pkg/crypto/sha256/) 等）
现在均已实现这些接口。

#### [html/template](/pkg/html/template/)

新的 [`Srcset`](/pkg/html/template#Srcset) 内容类型
允许正确处理 `img` 标签的
[`srcset`](https://w3c.github.io/html/semantics-embedded-content.html#element-attrdef-img-srcset)
属性中的值。

#### [math/big](/pkg/math/big/)

[`Int`](/pkg/math/big/#Int) 现在支持在其
[`SetString`](/pkg/math/big/#Int.SetString) 和 [`Text`](/pkg/math/big/#Text) 方法中
进行 2 到 62 进制的双向转换。
（此前仅允许 2 到 36 进制。）
常量 `MaxBase` 的值已更新。

[`Int`](/pkg/math/big/#Int) 新增了
[`CmpAbs`](/pkg/math/big/#CmpAbs) 方法，
类似于 [`Cmp`](/pkg/math/big/#Cmp)，
但仅比较其参数的绝对值（不比较符号）。

[`Float`](/pkg/math/big/#Float) 新增了
[`Sqrt`](/pkg/math/big/#Float.Sqrt) 方法
用于计算平方根。

#### [math/cmplx](/pkg/math/cmplx/)

[`Asin`](/pkg/math/cmplx/#Asin)、
[`Asinh`](/pkg/math/cmplx/#Asinh)、
[`Atan`](/pkg/math/cmplx/#Atan)
和
[`Sqrt`](/pkg/math/cmplx/#Sqrt)
中的分支切割及其他边界情况已修正，以匹配 C99 标准中使用的定义。

#### [math/rand](/pkg/math/rand/)

新的 [`Shuffle`](/pkg/math/rand/#Shuffle) 函数及对应的
[`Rand.Shuffle`](/pkg/math/rand/#Rand.Shuffle) 方法
用于打乱输入序列。

#### [math](/pkg/math/)

新函数
[`Round`](/pkg/math/#Round)
和
[`RoundToEven`](/pkg/math/#RoundToEven)
将其参数四舍五入到最接近的浮点整数；
`Round` 将半整数舍入到其较大的整数邻居（远离零），
而 `RoundToEven` 将半整数舍入到其偶数整数邻居。

新函数
[`Erfinv`](/pkg/math/#Erfinv)
和
[`Erfcinv`](/pkg/math/#Erfcinv)
计算逆误差函数和逆互补误差函数。

#### [mime/multipart](/pkg/mime/multipart/)

[`Reader`](/pkg/mime/multipart/#Reader)
现在接受文件名属性为空的部分。

#### [mime](/pkg/mime/)

[`ParseMediaType`](/pkg/mime/#ParseMediaType) 现在会丢弃无效的属性值；
此前它会将这些值返回为空字符串。

#### [net](/pkg/net/)

本包中的 [`Conn`](/pkg/net/#Conn) 和
[`Listener`](/pkg/net/#Conn) 实现
现在保证当 `Close` 返回时，
底层文件描述符已被关闭。
（在早期版本中，如果 `Close` 阻止了其他 goroutine 中的待处理 I/O，
文件描述符的关闭可能发生在 `Close` 返回后不久的其中一个 goroutine 中。）

[`TCPListener`](/pkg/net/#TCPListener) 和
[`UnixListener`](/pkg/net/#UnixListener)
现在实现了
[`syscall.Conn`](/pkg/syscall/#Conn)，
允许使用 [`syscall.RawConn.Control`](/pkg/syscall/#RawConn) 设置底层文件描述符的选项。

由 [`Pipe`](/pkg/net/#Pipe) 返回的 `Conn` 实现
现在支持设置读写截止时间。

方法
[`IPConn.ReadMsgIP`](/pkg/net/#IPConn.ReadMsgIP)、
[`IPConn.WriteMsgIP`](/pkg/net/#IPConn.WriteMsgIP)、
[`UDPConn.ReadMsgUDP`](/pkg/net/#UDPConn.ReadMsgUDP)
和
[`UDPConn.WriteMsgUDP`](/pkg/net/#UDPConn.WriteMsgUDP)
现在已在 Windows 上实现。

#### [net/http](/pkg/net/http/)

在客户端，HTTP 代理（通常由
[`ProxyFromEnvironment`](/pkg/net/http/#ProxyFromEnvironment) 配置）
现在可以指定为 `https://` URL，
这意味着客户端在发出标准的代理 HTTP 请求之前，会通过 HTTPS 连接到代理。
（此前，HTTP 代理 URL 要求以 `http://` 或 `socks5://` 开头。）在服务器端，[`FileServer`](/pkg/net/http/#FileServer) 及其单文件版本 [`ServeFile`](/pkg/net/http/#ServeFile) 现在会对 `HEAD` 请求应用 `If-Range` 检查。`FileServer` 现在还会将目录读取失败报告给 [`Server`](/pkg/net/http/#Server) 的 `ErrorLog`。内容服务处理器在提供零长度内容时，现在也会省略 `Content-Type` 头部。

[`ResponseWriter`](/pkg/net/http/#ResponseWriter) 的 `WriteHeader` 方法现在如果传入无效（非三位数字）的状态码，将会引发 `panic`。

<!-- CL 46631 -->
当 `Handler` 没有写入任何输出时，`Server` 将不再添加隐式的 `Content-Type` 头部。

[`Redirect`](/pkg/net/http/#Redirect) 现在会在写入 HTTP 响应之前设置 `Content-Type` 头部。

#### [net/mail](/pkg/net/mail/)

[`ParseAddress`](/pkg/net/mail/#ParseAddress) 和 [`ParseAddressList`](/pkg/net/mail/#ParseAddressList) 现在支持多种过时的地址格式。

#### [net/smtp](/pkg/net/smtp/)

[`Client`](/pkg/net/smtp/#Client) 新增了一个 [`Noop`](/pkg/net/smtp/#Client.Noop) 方法，用于测试服务器是否仍在响应。同时，它现在也会防御 [`Hello`](/pkg/net/smtp/#Client.Hello) 和 [`Verify`](/pkg/net/smtp/#Client.Verify) 方法输入中可能的 SMTP 注入。

#### [net/textproto](/pkg/net/textproto/)

[`ReadMIMEHeader`](/pkg/net/textproto/#ReadMIMEHeader) 现在会拒绝任何以续行（缩进）头部行开始的头部。此前，首行缩进的头部会被视为首行未缩进。

#### [net/url](/pkg/net/url/)

[`ResolveReference`](/pkg/net/url/#ResolveReference) 现在会保留目标 URL 中的多个前导斜杠。此前，它会将多个前导斜杠重写为单个斜杠，这导致 [`http.Client`](/pkg/net/http/#Client) 在某些重定向场景下行为错误。

例如，以下代码的输出已发生变化：

    base, _ := url.Parse("http://host//path//to/page1")
    target, _ := url.Parse("page2")
    fmt.Println(base.ResolveReference(target))

注意 `path` 两侧的双斜杠。在 Go 1.9 及更早版本中，解析后的 URL 是 `http://host/path//to/page2`：`path` 前的双斜杠被错误地重写为单斜杠，而 `path` 后的双斜杠则被正确保留。Go 1.10 则按照 [RFC 3986](https://tools.ietf.org/html/rfc3986#section-5.2) 的要求，保留了这两处双斜杠，解析结果为 `http://host//path//to/page2`。

此变更可能会破坏一些现有的、无意中在路径中包含前导双斜杠的基础 URL 的程序，这些程序之前可能无意中依赖了 `ResolveReference` 来修正此错误。例如，如果代码将主机前缀（如 `http://host/`）添加到路径（如 `/my/api`）上，就会产生包含双斜杠的 URL：`http://host//my/api`。

[`UserInfo`](/pkg/net/url/#UserInfo) 的方法现在将 `nil` 接收器视为等同于指向零值 `UserInfo` 的指针。此前，它们会引发 `panic`。

#### [os](/pkg/os/)

[`File`](/pkg/os/#File) 新增了方法 [`SetDeadline`](/pkg/os/#File.SetDeadline)、[`SetReadDeadline`](/pkg/os/#File.SetReadDeadline) 和 [`SetWriteDeadline`](/pkg/os/#File.SetWriteDeadline)，允许在底层文件描述符支持非阻塞 I/O 操作时设置 I/O 超时时间。这些方法的定义与 [`net.Conn`](/pkg/net/#Conn) 中的方法一致。如果某个 I/O 方法因缺少超时时间而失败，它将返回一个超时错误；新的 [`IsTimeout`](/pkg/os/#IsTimeout) 函数用于报告某个错误是否代表超时。

同样与 `net.Conn` 一致，`File` 的 [`Close`](/pkg/os/#File.Close) 方法现在保证当 `Close` 返回时，底层的文件描述符已被关闭。（在早期版本中，如果 `Close` 停止了其他 goroutine 中等待的 I/O，文件描述符的关闭可能会发生在 `Close` 返回后不久的其他某个 goroutine 中。）

在 BSD、macOS 和 Solaris 系统上，[`Chtimes`](/pkg/os/#Chtimes) 现在支持以纳秒精度设置文件时间（假设底层文件系统能够表示它们）。

#### [reflect](/pkg/reflect/)

[`Copy`](/pkg/reflect/#Copy) 函数现在允许将字符串复制到字节数组或字节切片中，以与[内置 copy 函数](/pkg/builtin/#copy)的行为保持一致。

在结构体中，指向未导出结构体类型的嵌入指针此前在对应的 [StructField](/pkg/reflect/#StructField) 中错误地报告了空的 `PkgPath`，导致对于这些字段，[`Value.CanSet`](/pkg/reflect/#Value.CanSet) 错误地返回 `true`，并且 [`Value.Set`](/pkg/reflect/#Value.Set) 错误地成功执行。底层元数据已得到修正；对于这些字段，`CanSet` 现在正确地返回 `false`，而 `Set` 现在正确地引发 `panic`。这可能会影响基于反射的解码器，这些解码器之前可以解码到此类字段，但现在则不能了。例如，参见 [`encoding/json` 说明](#encoding/json)。

#### [runtime/pprof](/pkg/runtime/pprof/)

如[上文所述](#pprof)，阻塞和互斥锁配置文件现在包含了符号信息，因此无需生成它们的二进制文件即可查看。

#### [strconv](/pkg/strconv/)

[`ParseUint`](/pkg/strconv/#ParseUint) 现在会像文档已经说明的那样，在返回任何 `ErrRange` 错误时，同时返回对应大小的最大绝对值整数。此前它只返回 0 和 `ErrRange` 错误。

#### [strings](/pkg/strings/)

新增了一种类型 [`Builder`](/pkg/strings/#Builder)，用于替代 [`bytes.Buffer`](/pkg/bytes/#Buffer) 在需要将文本累积成 `string` 结果的场景。`Builder` 的 API 是 `bytes.Buffer` API 的一个受限子集，这允许它在 [`String`](/pkg/strings/#Builder.String) 方法期间安全地避免制作数据的重复副本。

#### [syscall](/pkg/syscall/)在 Windows 系统上，
新增的 [`SysProcAttr`](/pkg/syscall/#SysProcAttr) 字段 `Token`（类型为 [`Token`](/pkg/syscall/#Token)）允许在 [`StartProcess`](/pkg/syscall/#StartProcess) 期间创建一个以其他用户身份运行的进程（因此，在 [`os.StartProcess`](/pkg/os/#StartProcess) 和 [`exec.Cmd.Start`](/pkg/os/exec/#Cmd.Start) 期间也同样适用）。
新增的函数 [`CreateProcessAsUser`](/pkg/syscall/#CreateProcessAsUser) 提供了对底层系统调用的访问。

在 BSD、macOS 和 Solaris 系统上，[`UtimesNano`](/pkg/syscall/#UtimesNano) 现已实现。

#### [time](/pkg/time/)

[`LoadLocation`](/pkg/time/#LoadLocation) 现在会优先使用由 `$ZONEINFO` 环境变量指定的目录或未压缩的 zip 文件，之后才会去查找系统默认的已知安装位置列表或 `$GOROOT/lib/time/zoneinfo.zip`。

新增的函数 [`LoadLocationFromTZData`](/pkg/time/#LoadLocationFromTZData) 允许将 IANA 时区文件数据转换为 [`Location`](/pkg/time/#Location)。

#### [unicode](/pkg/unicode/)

[`unicode`](/pkg/unicode/) 包以及系统中相关的支持已从 Unicode 9.0 升级至 [Unicode 10.0](https://www.unicode.org/versions/Unicode10.0.0/)。
此版本新增了 8,518 个字符，包括四种新的文字系统、一个新属性、一个比特币货币符号以及 56 个新的 emoji。