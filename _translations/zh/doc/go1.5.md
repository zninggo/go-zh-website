---
title: Go 1.5 发布说明
---

## Go 1.5 简介 {#introduction}

最新发布的 Go 版本 1.5 是一次重大发布，包含了对实现的重大架构变更。尽管如此，我们预计几乎所有 Go 程序都将像以前一样继续编译和运行，因为该版本仍然遵守 Go 1 [兼容性承诺](/doc/go1compat.html)。

实现方面最重要的发展是：

  - 编译器和运行时现在完全用 Go 编写（辅以少量汇编）。C 语言不再参与实现，因此构建发行版时曾经必需的 C 编译器已被移除。
  - 垃圾回收器现在是[并发](/s/go14gc)的，并通过尽可能与其他 goroutine 并行运行，显著降低了暂停时间。
  - 默认情况下，Go 程序运行时 `GOMAXPROCS` 设置为可用的核心数；在之前的版本中，默认值为 1。
  - 现在为所有仓库（而不仅仅是 Go 核心）提供对[内部包](/s/go14internal)的支持。
  - `go` 命令现在提供对"vendoring"（管理）外部依赖项的[实验性支持](/s/go15vendor)。
  - 新的 `go tool trace` 命令支持对程序执行进行细粒度跟踪。
  - 新的 `go doc` 命令（与 `godoc` 不同）是专门为命令行使用定制的。

这些以及其他一些对实现和工具的更改将在下文讨论。

该版本还包含一个涉及 map 字面量的小型语言变更。

最后，此次[发布](/s/releasesched)的时间间隔偏离了通常的六个月周期，这既是为了提供更多时间来准备这次重大发布，也是为了调整后续的发布计划，以便更方便地安排发布时间。

## 语言变更 {#language}

### Map 字面量 {#map_literals}

由于疏忽，允许从 slice 字面量中省略元素类型的规则并未应用于 map 键。这一问题已在 Go 1.5 中得到[修正](/cl/2591)。一个例子将清楚地说明这一点。从 Go 1.5 开始，这个 map 字面量：

	m := map[Point]string{
	    Point{29.935523, 52.891566}:   "Persepolis",
	    Point{-25.352594, 131.034361}: "Uluru",
	    Point{37.422455, -122.084306}: "Googleplex",
	}

可以这样写，无需显式列出 `Point` 类型：

	m := map[Point]string{
	    {29.935523, 52.891566}:   "Persepolis",
	    {-25.352594, 131.034361}: "Uluru",
	    {37.422455, -122.084306}: "Googleplex",
	}

## 实现 {#implementation}

### 不再使用 C 语言 {#c}

编译器和运行时现在用 Go 和汇编实现，不再涉及 C 语言。代码库中唯一的 C 源代码与测试或 `cgo` 相关。在 1.4 及更早版本中，代码库中有一个 C 编译器。它用于构建运行时；自定义编译器在一定程度上是必要的，以确保 C 代码能与 goroutine 的栈管理协同工作。由于运行时现在用 Go 编写，不再需要这个 C 编译器，它已被移除。消除 C 语言的详细过程已在[别处](/s/go13compiler)讨论。

从 C 语言的转换是在为此任务创建的自定义工具的帮助下完成的。最重要的是，编译器实际上是通过自动将 C 代码翻译成 Go 来完成迁移的。它本质上是同一个程序，只是换了种语言。它不是编译器的新实现，因此我们预计这个过程不会引入新的编译器错误。该过程的概述可以在[本次演讲](/talks/2015/gogo.slide)的幻灯片中找到。

### 编译器和工具 {#compiler_and_tools}

独立于但同时也得益于向 Go 的迁移，工具的名称已更改。旧的名称如 `6g`、`8g` 等已不复存在；取而代之的是一个单一的二进制文件，可通过 `go` `tool` `compile` 访问，它将 Go 源代码编译为适合由 `$GOARCH` 和 `$GOOS` 指定的架构和操作系统的二进制文件。类似地，现在有一个链接器（`go` `tool` `link`）和一个汇编器（`go` `tool` `asm`）。链接器是从旧的 C 实现自动翻译而来的，但汇编器是一个新的原生 Go 实现，将在下面更详细地讨论。

与放弃 `6g`、`8g` 等名称类似，编译器和汇编器的输出现在使用普通的 `.o` 后缀，而不是 `.8`、`.6` 等。

### 垃圾回收器 {#gc}

作为[设计文档](/s/go14gc)中概述的开发的一部分，垃圾回收器已在 1.5 版本中进行了重新设计。通过先进算法、更好的回收器[调度](/s/go15gcpacing)以及更多的回收工作与用户程序并行运行等组合方式，预期延迟比之前版本中的回收器低得多。回收器的“Stop the World”（STW）阶段几乎总是低于 10 毫秒，并且通常要短得多。

对于受益于低延迟的系统，例如用户响应式网站，新回收器预期延迟的降低可能非常重要。

新回收器的细节在 GopherCon 2015 的一个[演讲](/talks/2015/go-gc.pdf)中进行了介绍。

### 运行时 {#runtime}

在 Go 1.5 中，goroutine 的调度顺序已被更改。调度器的属性从未被语言定义，但依赖调度顺序的程序可能会因这个更改而中断。我们已经看到少数（错误的）程序受到此更改的影响。如果你的程序隐式依赖于调度顺序，你将需要更新它们。

另一个可能破坏兼容性的更改是，运行时现在将同时运行的线程的默认数量（由 `GOMAXPROCS` 定义）设置为 CPU 上可用的核心数。在之前的版本中，默认值为 1。不期望在多核上运行的程序可能会无意中中断。它们可以通过移除限制或显式设置 `GOMAXPROCS` 来更新。有关此更改的更详细讨论，请参阅[设计文档](/s/go15gomaxprocs)。

### 构建 {#build}现在，由于Go编译器和运行时本身已用Go语言实现，必须先有一个可用的Go编译器才能从源代码构建发布版。
因此，要构建Go核心，系统中必须已经存在一个可用的Go发行版。
（不从事核心开发的Go程序员不受此更改影响。）
任何Go 1.4或更新的发行版（包括`gccgo`）都可以满足要求。
详情请参阅[设计文档](/s/go15bootstrap)。

## 支持平台 {#ports}

主要由于行业逐步放弃32位x86架构，1.5版本提供的二进制下载包数量有所减少。
面向OS X操作系统的发行版现在仅提供`amd64`架构，不再支持`386`。
类似地，Snow Leopard（Apple OS X 10.6）的移植版仍可正常工作，但由于Apple已不再维护该操作系统版本，因此不再提供下载或进行维护。
此外，`dragonfly/386`移植版已完全停止支持，因为DragonflyBSD本身已不再支持32位386架构。

然而，有几个新的移植版可供从源代码构建。
这些包括`darwin/arm`和`darwin/arm64`。
新的`linux/arm64`移植版已基本就绪，但`cgo`仅支持使用外部链接。

另外，作为实验性功能，`ppc64`
和`ppc64le`（64位PowerPC，大端序和小端序）也可用。
这两个移植版都支持`cgo`，但仅限于内部链接。

在FreeBSD上，Go 1.5要求FreeBSD 8-STABLE+或更高版本，因为它新增了对`SYSCALL`指令的使用。

在NaCl上，Go 1.5要求SDK版本为pepper-41。由于NaCl运行时中sRPC子系统的移除，更高版本的pepper不兼容。

在Darwin上，可以通过`ios`构建标签禁用系统X.509证书接口的使用。

Solaris移植版现在完全支持cgo以及
[`net`](/pkg/net/) 和
[`crypto/x509`](/pkg/crypto/x509/) 包，
并且还包含大量其他修复和改进。

## 工具 {#tools}

### 转译 {#translate}

作为从源码树中移除C语言的一部分，编译器和
链接器已从C语言转译为Go语言。
这是一次真正的（机器辅助）转译，因此新程序本质上是旧程序的转译版，而非带有新缺陷的全新程序。
我们确信转译过程引入的新缺陷（如果有的话）极少，并且实际上发现并修复了许多先前未知的缺陷。

然而，汇编器是一个全新的程序；它将在下文中描述。

### 重命名 {#rename}

过去作为编译器（`6g`、`8g`等）、
汇编器（`6a`、`8a`等）
和链接器（`6l`、`8l`等）
的程序套件，现已各自整合为单一工具，通过环境变量`GOOS`和`GOARCH`进行配置。
旧名称已不复存在；新工具可通过`go` `tool`机制作为`go tool compile`、
`go tool asm`和`go tool link`使用。
此外，用于中间目标文件的文件后缀`.6`、`.8`等也已取消；现在它们只是普通的`.o`文件。

例如，要在amd64架构上为Darwin系统直接使用工具（而非通过`go build`）来构建和链接一个程序，可以运行：

	$ export GOOS=darwin GOARCH=amd64
	$ go tool compile program.go
	$ go tool link program.o

### 迁移 {#moving}

由于 [`go/types`](/pkg/go/types/) 包
现已移入主仓库（见下文），
[`vet`](/cmd/vet) 和
[`cover`](/cmd/cover)
工具也随之迁移。
它们不再在外部的`golang.org/x/tools`仓库中维护，尽管（已弃用的）源代码仍保留在那里以兼容旧版本。

### 编译器 {#compiler}

如上所述，Go 1.5中的编译器是一个单一的Go程序，它是从旧的C源代码转译而来，取代了`6g`、`8g`等。
其目标由环境变量`GOOS`和`GOARCH`配置。

1.5编译器在功能上大致等同于旧编译器，但一些内部细节发生了变化。
一个显著的变化是，常量求值现在使用
[`math/big`](/pkg/math/big/) 包，
而不是之前自定义（且测试不够充分）的高精度算术实现。
我们预计这不会影响计算结果。

仅针对amd64架构，编译器新增了一个选项`-dynlink`，它通过支持对定义在外部共享库中的Go符号的引用来辅助动态链接。

### 汇编器 {#assembler}

与编译器和链接器一样，Go 1.5中的汇编器是一个单一的程序，
它取代了之前的汇编器套件（`6a`、`8a`等），并且环境变量`GOARCH`和`GOOS`用于配置目标架构和操作系统。
与其他工具不同，汇编器是一个完全用Go编写的全新程序。

新的汇编器与之前的版本高度兼容，但有一些变化可能会影响某些汇编源文件。
关于这些变化的更具体信息，请参阅更新后的[汇编指南](/doc/asm)。总结如下：

首先，用于常量的表达式求值略有不同。
它现在使用无符号64位算术，并且运算符（`+`、`-`、`<<`等）的优先级
遵循Go语言规则，而非C语言规则。
我们预计这些变化影响的程序极少，但可能需要手动验证。

也许更重要的是，在某些机器上，`SP`或`PC`只是
一个编号寄存器的别名，
例如ARM架构上栈指针对应`R13`，
硬件程序计数器对应`R15`；
现在，对这类寄存器的引用如果不包含符号名则是非法的。
例如，`SP`和`4(SP)`是非法的，但`sym+4(SP)`是合法的。
在这类机器上，要引用硬件寄存器，请使用其真实的`R`名称。

一个较小的变更是，旧的一些汇编器允许使用

	常量=值

这样的记法来定义命名常量。
由于这总是可以通过传统的类C `#define`记法来实现（该记法仍然受支持，汇编器包含一个简化版的C预处理器实现），因此该功能已被移除。

### 链接器 {#link}Go 1.5 中的链接器现在是一个单一的 Go 程序，它取代了之前的 `6l`、`8l` 等工具。其操作系统和指令集由环境变量 `GOOS` 和 `GOARCH` 指定。

还有其他几处变更。最重要的是新增了一个 `-buildmode` 选项，它扩展了链接方式；现在它支持诸如构建共享库以及允许其他语言调用 Go 库等场景。其中部分内容在[设计文档](/s/execmodes)中已有概述。要查看可用的构建模式及其用法列表，请运行：

	$ go help buildmode

另一个较小的变更是，链接器不再在 Windows 可执行文件头中记录构建时间戳。另外，尽管这可能被修复，但 Windows cgo 可执行文件会缺失一些 DWARF 信息。

最后，`-X` 标志接受两个参数，例如：

	-X importpath.name value

现在它也接受一种更常见的 Go 风格的单参数形式，该参数本身是一个 `name=value` 对：

	-X importpath.name=value

尽管旧语法仍然有效，但建议更新脚本等中的该标志用法以使用新形式。

### Go 命令 {#go_command}

[`go`](/cmd/go) 命令的基本操作保持不变，但有若干值得注意的变更。

上一个版本引入了这样的概念：包内名为 `internal` 的目录，其下的内容无法通过 `go` 命令导入。在 1.4 版本中，通过在核心仓库引入一些内部元素对此进行了测试。如[设计文档](/s/go14internal)所述，该变更现在对所有仓库生效。规则在设计文档中有详细说明，但简而言之，任何位于名为 `internal` 的目录内或其下的包，只能被同一子树根下的包导入。现有包含名为 `internal` 的目录元素的包可能会因此变更而意外中断，这就是它在上一个版本中被公布的原因。

包处理方面的另一个变更是实验性地增加了对“供应商化”（vendoring）的支持。详情请参阅 [`go` 命令](/cmd/go/#hdr-Vendor_Directories)的文档和[设计文档](/s/go15vendor)。

还有一些较小的变更。完整详情请阅读[文档](/cmd/go)。

  - SWIG 支持已更新，使得 `.swig` 和 `.swigcxx` 现在需要 SWIG 3.0.6 或更高版本。
  - `install` 子命令现在会删除源目录中由 `build` 子命令创建的二进制文件（如果存在），以避免目录树中存在两个二进制文件的问题。
  - `std`（标准库）通配符包名现在排除了命令。一个新的 `cmd` 通配符涵盖了这些命令。
  - 新增了 `-asmflags` 构建选项，用于设置传递给汇编器的标志。但是，`-ccflags` 构建选项已被移除；它仅适用于旧的、现已删除的 C 编译器。
  - 新增了 `-buildmode` 构建选项，用于设置构建模式，如上所述。
  - 新增了 `-pkgdir` 构建选项，用于设置已安装包归档文件的位置，以帮助隔离自定义构建。
  - 新增了 `-toolexec` 构建选项，允许替换用于调用编译器等的命令。这作为 `go tool` 的自定义替代方案。
  - `test` 子命令现在新增了 `-count` 标志，用于指定每个测试和基准测试运行的次数。[`testing`](/pkg/testing/) 包通过 `-test.count` 标志完成此项工作。
  - `generate` 子命令增加了一些新特性。`-run` 选项指定一个正则表达式来选择要执行的指令；这在 1.4 中曾被提议但未实现。执行模式现在可以访问两个新的环境变量：`$GOLINE` 返回指令所在的源代码行号，`$DOLLAR` 展开为一个美元符号。
  - `get` 子命令现在新增了 `-insecure` 标志，如果从不安全（即未加密连接）的仓库获取代码，则必须启用此标志。

### Go vet 命令 {#vet_command}

[`go tool vet`](/cmd/vet) 命令现在对结构体标签进行更彻底的验证。

### Trace 命令 {#trace_command}

新增了一个用于 Go 程序动态执行跟踪的工具。其使用方式类似于测试覆盖率工具的工作方式。跟踪信息的生成集成在 `go test` 中，然后单独执行跟踪工具本身来分析结果：

	$ go test -trace=trace.out path/to/package
	$ go tool trace [flags] pkg.test trace.out

这些标志使得输出可以在浏览器窗口中显示。详情请运行 `go tool trace -help`。GopherCon 2015 的[演讲](/talks/2015/dynamic-tools.slide)中也有关于此跟踪设施的描述。

### Go doc 命令 {#doc_command}

在几个版本之前，`go doc` 命令曾被认为不必要而被删除。用户总是可以运行“`godoc .`”来替代。1.5 版本引入了一个新的 [`go doc`](/cmd/doc) 命令，它提供了比 `godoc` 更方便的命令行界面。它专门为命令行使用而设计，能够根据调用情况，为包或其元素提供更紧凑、更聚焦的文档展示。它还支持大小写不敏感的匹配，并支持显示未导出符号的文档。详情请运行“`go help doc`”。

### Cgo {#cgo}

在解析 `#cgo` 行时，调用 `${SRCDIR}` 现在会被展开为源代码目录的路径。这允许传递给编译器和链接器的选项包含相对于源代码目录的文件路径。如果没有此展开，当当前工作目录更改时，这些路径将无效。

Solaris 现在完全支持 cgo。

在 Windows 上，cgo 现在默认使用外部链接。

当一个 C 结构体以零大小的字段结尾，但该结构体本身并非零大小时，Go 代码将无法再引用该零大小字段。任何此类引用都必须重写。## 性能 {#performance}

一如既往，由于变更内容过于广泛和多样，精确说明性能变化是很困难的。
本次发布中的变更范围比以往更广，其中包括一个新的垃圾回收器以及运行时代码向Go语言的迁移。
一些程序可能运行得更快，另一些则可能更慢。
平均而言，Go 1基准测试套件中的程序在Go 1.5中的运行速度比在Go 1.4中快了百分之几，
同时如前所述，垃圾回收器的暂停时间显著缩短，几乎总是低于10毫秒。

Go 1.5的构建速度将大约慢一倍。
编译器和链接器从C到Go的自动转换产生了一些不符合Go语言习惯的代码，其性能不如编写良好的Go代码。
分析工具和代码重构有助于改进代码，但仍有很多工作要做。
进一步的性能分析和优化将在Go 1.6及未来的版本中继续进行。
更多详情，请参阅这些[幻灯片](/talks/2015/gogo.slide)和相关[视频](https://www.youtube.com/watch?v=cF1zJYkBW4A)。

## 标准库 {#library}

### Flag {#flag}

flag包的[`PrintDefaults`](/pkg/flag/#PrintDefaults)函数以及[`FlagSet`](/pkg/flag/#FlagSet)的方法已被修改，以生成更友好的使用说明信息。
其格式已改为对人类更友好，并且在使用说明信息中，用反引号 \`括起的词将被视为标志的操作数名称用于显示。
例如，通过以下调用创建的标志，

	cpuFlag = flag.Int("cpu", 1, "run `N` processes in parallel")

将显示如下帮助信息，

	-cpu N
	    	run N processes in parallel (default 1)

此外，现在仅当默认值不是该类型的零值时才会列出默认值。

### math/big中的浮点数 {#math_big}

[`math/big`](/pkg/math/big/)包新增了一个基本数据类型[`Float`](/pkg/math/big/#Float)，它实现了任意精度的浮点数。
一个 `Float` 值由一个布尔符号、一个可变长度尾数和一个32位固定大小的有符号指数组成。
`Float` 的精度（尾数位数）可以显式指定，否则由创建该值的第一个操作决定。
一旦创建，`Float` 尾数的大小可以通过 [`SetPrec`](/pkg/math/big/#Float.SetPrec) 方法进行修改。
`Float` 支持无穷大的概念，例如由溢出产生的无穷大，但会导致IEEE 754 NaN等价结果的值会触发一个恐慌。
`Float` 操作支持所有IEEE-754舍入模式。
当精度设置为24（53）位时，保持在归一化 `float32`（`float64`）值范围内的操作，其产生的结果与这些值上对应的IEEE-754算术结果相同。

### Go类型 {#go_types}

[`go/types`](/pkg/go/types/)包此前一直维护在 `golang.org/x` 仓库中；从Go 1.5起，它已被迁移到主仓库。
旧位置的代码现已弃用。
该包中还有一个适度的API变更，将在下文讨论。

与此迁移相关，[`go/constant`](/pkg/go/constant/)包也迁移到了主仓库；它之前是 `golang.org/x/tools/exact`。
[`go/importer`](/pkg/go/importer/)包以及上述的一些工具也同样迁移到了主仓库。

### Net {#net}

net包中的DNS解析器几乎总是使用 `cgo` 来访问系统接口。
Go 1.5中的一项变更意味着，在大多数Unix系统上，DNS解析将不再需要 `cgo`，这简化了在这些平台上的执行。
现在，如果系统的网络配置允许，原生Go解析器就足够了。
这一变更的重要影响是，每个DNS解析将占用一个协程而非一个线程，
因此，一个有多个未完成DNS请求的程序将消耗更少的操作系统资源。

关于如何运行解析器的决策是在运行时而非构建时做出的。
过去用于强制使用Go解析器的 `netgo` 构建标签不再是必需的，但它仍然有效。
一个新的 `netcgo` 构建标签可在构建时强制使用 `cgo` 解析器。
要在运行时强制使用 `cgo` 解析，请在环境中设置 `GODEBUG=netdns=cgo`。
更多调试选项的文档见[此处](/cl/11584)。

此变更仅适用于Unix系统。
Windows、Mac OS X和Plan 9系统的行为与之前相同。

### Reflect {#reflect}

[`reflect`](/pkg/reflect/)包新增了两个函数：[`ArrayOf`](/pkg/reflect/#ArrayOf)和[`FuncOf`](/pkg/reflect/#FuncOf)。
这些函数与现有的[`SliceOf`](/pkg/reflect/#SliceOf)函数类似，用于在运行时创建描述数组和函数的新类型。

### 强化 {#hardening}

通过使用 [`go-fuzz`](https://github.com/dvyukov/go-fuzz) 工具进行随机化测试，在标准库中发现了数十个错误。
以下包中的错误已被修复：
[`archive/tar`](/pkg/archive/tar/)、
[`archive/zip`](/pkg/archive/zip/)、
[`compress/flate`](/pkg/compress/flate/)、
[`encoding/gob`](/pkg/encoding/gob/)、
[`fmt`](/pkg/fmt/)、
[`html/template`](/pkg/html/template/)、
[`image/gif`](/pkg/image/gif/)、
[`image/jpeg`](/pkg/image/jpeg/)、
[`image/png`](/pkg/image/png/) 以及
[`text/template`](/pkg/text/template/)。
这些修复强化了实现，以抵御不正确和恶意的输入。

### 库的次要更改 {#minor_library_changes}- [`archive/zip`](/pkg/archive/zip/) 包的
    [`Writer`](/pkg/archive/zip/#Writer) 类型现在拥有一个
    [`SetOffset`](/pkg/archive/zip/#Writer.SetOffset) 方法，用于指定在输出流中写入归档的位置。
  - [`bufio`](/pkg/bufio/) 包中的
    [`Reader`](/pkg/bufio/#Reader) 现在拥有一个
    [`Discard`](/pkg/bufio/#Reader.Discard) 方法，用于从输入中丢弃数据。
  - 在 [`bytes`](/pkg/bytes/) 包中，
    [`Buffer`](/pkg/bytes/#Buffer) 类型现在拥有一个 [`Cap`](/pkg/bytes/#Buffer.Cap) 方法，用于报告缓冲区内已分配的字节数。
    类似地，在 [`bytes`](/pkg/bytes/) 和 [`strings`](/pkg/strings/) 包中，
    [`Reader`](/pkg/bytes/#Reader) 类型现在拥有一个 [`Size`](/pkg/bytes/#Reader.Size) 方法，用于报告底层切片或字符串的原始长度。
  - [`bytes`](/pkg/bytes/) 和 [`strings`](/pkg/strings/) 包现在都新增了一个 [`LastIndexByte`](/pkg/bytes/#LastIndexByte) 函数，用于定位参数中具有该值的最右侧字节。
  - [`crypto`](/pkg/crypto/) 包新增了一个接口 [`Decrypter`](/pkg/crypto/#Decrypter)，它抽象了非对称解密中使用的私钥行为。
  - 在 [`crypto/cipher`](/pkg/crypto/cipher/) 包中，
    [`Stream`](/pkg/crypto/cipher/#Stream) 接口的文档已得到澄清，明确了当源和目标长度不同时的行为。
    如果目标比源短，该方法将触发恐慌。
    这并非实现的更改，仅是文档的澄清。
  - 同样在 [`crypto/cipher`](/pkg/crypto/cipher/) 包中，
    现在已支持 AES 的 Galois/Counter 模式 (GCM) 中长度非 96 字节的随机数，某些协议有此需求。
  - 在 [`crypto/elliptic`](/pkg/crypto/elliptic/) 包中，
    [`CurveParams`](/pkg/crypto/elliptic/#CurveParams) 结构体现在有一个 `Name` 字段，并且包中实现的曲线已被命名。
    这些名称为依赖曲线的加密系统提供了更安全的选择方式，优于通过位大小进行选择。
  - 同样在 [`crypto/elliptic`](/pkg/crypto/elliptic/) 包中，
    [`Unmarshal`](/pkg/crypto/elliptic/#Unmarshal) 函数现在会验证该点是否确实在曲线上。
    （如果不在，该函数将返回 nil）。
    此更改可防御某些攻击。
  - [`crypto/sha512`](/pkg/crypto/sha512/) 包现在支持 SHA-512 哈希算法的两个截断版本：SHA-512/224 和 SHA-512/256。
  - [`crypto/tls`](/pkg/crypto/tls/) 包的最低协议版本现在默认为 TLS 1.0。
    如果需要，仍可通过 [`Config`](/pkg/crypto/tls/#Config) 使用旧的默认值 SSLv3。
  - [`crypto/tls`](/pkg/crypto/tls/) 包现在支持 RFC 6962 中规定的签名证书时间戳 (SCTs)。
    如果 SCTs 列在 [`Certificate`](/pkg/crypto/tls/#Certificate) 结构体中，服务器将提供它们；
    客户端会请求它们，并在 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 结构体中暴露它们（如果存在）。
  - [`crypto/tls`](/pkg/crypto/tls/) 客户端连接的装订式 OCSP 响应，此前只能通过 [`OCSPResponse`](/pkg/crypto/tls/#Conn.OCSPResponse) 方法获取，现在已暴露在 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 结构体中。
  - [`crypto/tls`](/pkg/crypto/tls/) 服务器的实现现在将始终调用 [`Config`](/pkg/crypto/tls/#Config) 结构体中的 `GetCertificate` 函数，以便在未提供证书时为连接选择证书。
  - 最后，[`crypto/tls`](/pkg/crypto/tls/) 包中的会话票据密钥现在可以在服务器运行时进行更改。
    这通过 [`Config`](/pkg/crypto/tls/#Config) 类型的新方法 [`SetSessionTicketKeys`](/pkg/crypto/tls/#Config.SetSessionTicketKeys) 来实现。
  - 在 [`crypto/x509`](/pkg/crypto/x509/) 包中，现在只接受最左侧标签中的通配符，如[规范](https://tools.ietf.org/html/rfc6125#section-6.4.3)所定义。
  - 同样在 [`crypto/x509`](/pkg/crypto/x509/) 包中，对未知关键扩展的处理方式已更改。
    以前它们会导致解析错误，但现在它们会被解析，并仅在 [`Verify`](/pkg/crypto/x509/#Certificate.Verify) 中才引发错误。
    [`Certificate`](/pkg/crypto/x509/#Certificate) 的新字段 `UnhandledCriticalExtensions` 记录了这些扩展。
  - [`database/sql`](/pkg/database/sql/) 包的 [`DB`](/pkg/database/sql/#DB) 类型现在拥有一个 [`Stats`](/pkg/database/sql/#DB.Stats) 方法，用于检索数据库统计信息。
  - [`debug/dwarf`](/pkg/debug/dwarf/) 包有大量新增内容，以更好地支持 DWARF 版本 4。
    例如，请参见新类型 [`Class`](/pkg/debug/dwarf/#Class) 的定义。
  - [`debug/dwarf`](/pkg/debug/dwarf/) 包现在也支持解码 DWARF 行表。
  - [`debug/elf`](/pkg/debug/elf/) 包现在支持 64 位 PowerPC 架构。
  - [`encoding/base64`](/pkg/encoding/base64/) 包现在通过两个新的编码变量 [`RawStdEncoding`](/pkg/encoding/base64/#RawStdEncoding) 和 [`RawURLEncoding`](/pkg/encoding/base64/#RawURLEncoding) 支持无填充编码。
  - [`encoding/json`](/pkg/encoding/json/) 包现在在 JSON 值不适合用于解组的目标变量或组件时，会返回 [`UnmarshalTypeError`](/pkg/encoding/json/#UnmarshalTypeError)。
  - `encoding/json` 的 [`Decoder`](/pkg/encoding/json/#Decoder) 类型有一个新方法，为解码 JSON 文档提供了流式接口：
    [`Token`](/pkg/encoding/json/#Decoder.Token)。
    它还能与 `Decode` 的现有功能互操作，`Decode` 会继续完成由 `Decoder.Token` 开始的解码操作。
  - [`flag`](/pkg/flag/) 包新增了一个函数 [`UnquoteUsage`](/pkg/flag/#UnquoteUsage)，用于协助按照上述新约定创建用法消息。
  - 在 [`fmt`](/pkg/fmt/) 包中，[`Value`](/pkg/reflect/#Value) 类型的值现在打印其内容，而不是使用 `reflect.Value` 的 `Stringer` 方法（该方法会输出类似 `<int Value>` 的内容）。
  - [`go/ast`](/pkg/go/ast/) 包中的 [`EmptyStmt`](/pkg/ast/#EmptyStmt) 类型现在拥有一个布尔类型的 `Implicit` 字段，用于记录分号是隐式添加的还是源码中已有的。
  - 为了向前兼容，[`go/build`](/pkg/go/build/) 包为若干 Go 未来可能支持的架构预留了 `GOARCH` 值。
    这并非承诺一定会支持。
    此外，[`Package`](/pkg/go/build/#Package) 结构体现在有一个 `PkgTargetRoot` 字段，用于存储架构相关的安装根目录（如果已知）。
  - （新迁移的）[`go/types`](/pkg/go/types/) 包允许通过使用新的 [`Qualifier`](/pkg/go/types/#Qualifier) 函数类型作为多个函数的参数，来控制附加在包级别名称上的前缀。
    这是该包的 API 变更，但由于它是首次进入核心库，并未违反 Go 1 兼容性规则，因为使用该包的代码必须明确在其新位置请求它。
    要更新，请在您的包上运行 [`go fix`](/cmd/go/#hdr-Run_go_tool_fix_on_packages)。
  - 在 [`image`](/pkg/image/) 包中，
    [`Rectangle`](/pkg/image/#Rectangle) 类型现在实现了 [`Image`](/pkg/image/#Image) 接口，因此 `Rectangle` 在绘制时可用作遮罩。
  - 同样在 [`image`](/pkg/image/) 包中，为了协助处理某些 JPEG 图像，现在支持 4:1:1 和 4:1:0 YCbCr 子采样，以及基本的 CMYK 支持（由新的 `image.CMYK` 结构体表示）。
  - [`image/color`](/pkg/image/color/) 包增加了基本的 CMYK 支持，包括新的 [`CMYK`](/pkg/image/color/#CMYK) 结构体、[`CMYKModel`](/pkg/image/color/#CMYKModel) 颜色模型和 [`CMYKToRGB`](/pkg/image/color/#CMYKToRGB) 函数，这是某些 JPEG 图像所需的。
  - 同样在 [`image/color`](/pkg/image/color/) 包中，[`YCbCr`](/pkg/image/color/#YCbCr) 值到 `RGBA` 的转换变得更加精确。
    以前，低 8 位只是高 8 位的重复；现在它们包含更准确的信息。
    由于旧代码的重复特性，使用 `uint8(r)` 操作提取 8 位红色值以前是可行的，但这是不正确的。
    在 Go 1.5 中，该操作可能会产生不同的值。
    正确的代码是，也一直是，选择高 8 位：`uint8(r>>8)`。
    顺便一提，`image/draw` 包为此类转换提供了更好的支持；更多信息请参阅[这篇博文](/blog/go-imagedraw-package)。
  - 最后，从 Go 1.5 开始，[`Index`](/pkg/image/color/#Palette.Index) 中的最接近匹配检查现在会考虑 Alpha 通道。
  - [`image/gif`](/pkg/image/gif/) 包包含几项泛化。
    多帧 GIF 文件现在可以拥有与所有包含的单帧边界不同的整体边界。
    此外，[`GIF`](/pkg/image/gif/#GIF) 结构体现在有一个 `Disposal` 字段，用于指定每一帧的处置方法。
  - [`io`](/pkg/io/) 包新增了一个 [`CopyBuffer`](/pkg/io/#CopyBuffer) 函数，它类似于 [`Copy`](/pkg/io/#Copy)，但使用调用者提供的缓冲区，允许控制分配和缓冲区大小。
  - [`log`](/pkg/log/) 包新增了一个 [`LUTC`](/pkg/log/#LUTC) 标志，导致时间戳以 UTC 时区打印。
    它还为用户创建的 Logger 添加了一个 [`SetOutput`](/pkg/log/#Logger.SetOutput) 方法。
  - 在 Go 1.4 中，[`Max`](/pkg/math/#Max) 未能检测所有可能的 NaN 位模式。
    此问题在 Go 1.5 中已修复，因此在包含 NaN 的数据上使用 `math.Max` 的程序可能行为不同，但现在是符合 IEEE754 对 NaN 的定义的正确行为。
  - [`math/big`](/pkg/math/big/) 包为整数添加了一个新的 [`Jacobi`](/pkg/math/big/#Jacobi) 函数，并为 [`Int`](/pkg/math/big/#Int) 类型添加了一个新的 [`ModSqrt`](/pkg/math/big/#Int.ModSqrt) 方法。
  - mime 包新增了一个 [`WordDecoder`](/pkg/mime/#WordDecoder) 类型，用于解码包含 RFC 204 编码词的 MIME 头部。
    它还提供了 [`BEncoding`](/pkg/mime/#BEncoding) 和 [`QEncoding`](/pkg/mime/#QEncoding) 作为 RFC 2045 和 RFC 2047 编码方案的实现。
  - [`mime`](/pkg/mime/) 包还添加了一个 [`ExtensionsByType`](/pkg/mime/#ExtensionsByType) 函数，该函数返回已知与给定 MIME 类型关联的 MIME 扩展名。
  - 新增了一个 [`mime/quotedprintable`](/pkg/mime/quotedprintable/) 包，实现了 RFC 2045 定义的引用可打印编码。
  - [`net`](/pkg/net/) 包现在将通过依次尝试每个 IP 地址来 [`Dial`](/pkg/net/#Dial) 主机名，直到成功。
    <code>[Dialer](/pkg/net/#Dialer).DualStack</code> 模式现在实现了 Happy Eyeballs（[RFC 6555](https://tools.ietf.org/html/rfc6555)），为第一个地址系列提供 300 毫秒的先机；该值可通过新的 `Dialer.FallbackDelay` 覆盖。
  - [`net`](/pkg/net/) 包中错误返回类型的一些不一致之处已被清理。
    大多数现在返回一个包含更多信息的 [`OpError`](/pkg/net/#OpError) 值。
    此外，[`OpError`](/pkg/net/#OpError) 类型现在包含一个 `Source` 字段，用于保存本地网络地址。
  - [`net/http`](/pkg/net/http/) 包现在支持从服务器 [`Handler`](/pkg/net/http/#Handler) 设置拖尾头部。
    详情请参阅 [`ResponseWriter`](/pkg/net/http/#ResponseWriter) 的文档。
  - 新增了一种通过设置新的 [`Request.Cancel`](/pkg/net/http/#Request) 字段来取消 [`net/http`](/pkg/net/http/) `Request` 的方法。
    它由 `http.Transport` 支持。
    `Cancel` 字段的类型与 [`context.Context.Done`](https://godoc.org/golang.org/x/net/context) 返回值兼容。
  - 同样在 [`net/http`](/pkg/net/http/) 包中，有代码用于忽略 [`ServeContent`](/pkg/net/#ServeContent) 函数中的零值 [`Time`](/pkg/time/#Time)。
    自 Go 1.5 起，它现在也会忽略等于 Unix 纪元的时间值。
  - [`net/http/fcgi`](/pkg/net/http/fcgi/) 包导出了两个新的错误，[`ErrConnClosed`](/pkg/net/http/fcgi/#ErrConnClosed) 和 [`ErrRequestAborted`](/pkg/net/http/fcgi/#ErrRequestAborted)，用于报告相应的错误状况。
  - [`net/http/cgi`](/pkg/net/http/cgi/) 包有一个处理环境变量 `REMOTE_ADDR` 和 `REMOTE_HOST` 值的 bug。
    此问题已修复。
    此外，