---
title: Go 1.5 发布说明
---

## Go 1.5 简介 {#introduction}

最新的 Go 版本 1.5 是一次重要的发布，包含了对实现的重大架构变更。尽管如此，我们预计几乎所有 Go 程序都能像以前一样继续编译和运行，因为此版本仍然遵守 Go 1 的[兼容性承诺](/doc/go1compat.html)。

实现方面最大的进展包括：

  - 编译器和运行时现在完全用 Go 编写（附带少量汇编代码）。实现中不再涉及 C 语言，因此曾经用于构建发行版所需的 C 编译器已被移除。
  - 垃圾回收器现在是[并发的](/s/go14gc)，通过尽可能与其他协程并行运行，显著降低了暂停时间。
  - 默认情况下，Go 程序运行时 `GOMAXPROCS` 设置为可用的 CPU 核心数；在之前的版本中，默认值为 1。
  - 对[内部包](/s/go14internal)的支持现在对所有代码仓库提供，而不仅仅是 Go 核心。
  - `go` 命令现在为外部依赖的“供应商”管理提供了[实验性支持](/s/go15vendor)。
  - 新的 `go tool trace` 命令支持对程序执行进行细粒度的跟踪。
  - 新的 `go doc` 命令（区别于 `godoc`）针对命令行使用进行了定制。

这些以及其他一些对实现和工具的变更将在下文讨论。

此版本还包含一个涉及 map 字面量的小型语言变更。

最后，此次[发布](/s/releasesched)的时间偏离了通常的六个月间隔，既是为了给这次重大发布提供更多准备时间，也是为了调整后续的发布时间表，使发布日期更方便安排。

## 语言变更 {#language}

### Map 字面量 {#map_literals}

由于疏忽，允许在 slice 字面量中省略元素类型的规则并未应用于 map 的键。这个问题在 Go 1.5 中已得到[修正](/cl/2591)。一个例子可以说明清楚。从 Go 1.5 开始，这个 map 字面量：

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

### 不再使用 C {#c}

编译器和运行时现在用 Go 和汇编实现，不再使用 C。源代码树中仅剩的 C 源代码与测试或 `cgo` 相关。在 1.4 及更早版本中，源代码树里有一个 C 编译器。它用于构建运行时；部分原因是需要自定义编译器来保证 C 代码能与协程的栈管理协同工作。由于运行时现在用 Go 编写，不再需要这个 C 编译器，它已被移除。消除 C 的过程细节在[其他地方](/s/go13compiler)有讨论。

从 C 的转换是在为此目的创建的定制工具的帮助下完成的。最重要的是，编译器实际上是通过自动将 C 代码翻译成 Go 来迁移的。它本质上是同一个程序，只是换了一种语言。这不是编译器的新实现，因此我们预计这个过程不会引入新的编译器错误。这个过程的概述可在[此演示文稿](/talks/2015/gogo.slide)的幻灯片中找到。

### 编译器和工具 {#compiler_and_tools}

独立于但受益于向 Go 的迁移，工具的名称也发生了变化。旧的名称如 `6g`、`8g` 等已不复存在；取而代之的是只有一个二进制文件，通过 `go` `tool` `compile` 访问，它将 Go 源代码编译成适合由 `$GOARCH` 和 `$GOOS` 指定的架构和操作系统的二进制文件。类似地，现在只有一个链接器（`go` `tool` `link`）和一个汇编器（`go` `tool` `asm`）。链接器是从旧的 C 实现自动翻译过来的，但汇编器是一个新的原生 Go 实现，下面会更详细地讨论。

类似于移除 `6g`、`8g` 等名称，编译器和汇编器的输出现在使用简单的 `.o` 后缀，而不是 `.8`、`.6` 等。

### 垃圾回收器 {#gc}

垃圾回收器在 1.5 中进行了重新设计，作为[设计文档](/s/go14gc)中概述的开发的一部分。通过结合先进算法、更好的[调度](/s/go15gcpacing)以及更多地与用户程序并行运行回收，预期的延迟比之前的版本低得多。回收器的“停顿”阶段几乎总是低于 10 毫秒，通常还要少得多。

对于需要低延迟的系统，例如响应用户的网站，新回收器预期延迟的降低可能非常重要。

新回收器的细节在 GopherCon 2015 的一次[演讲](/talks/2015/go-gc.pdf)中进行了介绍。

### 运行时 {#runtime}

在 Go 1.5 中，协程被调度的顺序发生了变化。调度器的属性从未被语言定义，但依赖调度顺序的程序可能会因这次变更而中断。我们已经看到少数（错误的）程序受到此变更的影响。如果你的程序隐式依赖于调度顺序，则需要更新它们。

另一个潜在的破坏性变更是，运行时现在将由 `GOMAXPROCS` 定义的默认同时运行线程数设置为 CPU 上可用的内核数。在之前的版本中，默认值为 1。不期望在多核上运行的程序可能会无意中中断。可以通过移除限制或显式设置 `GOMAXPROCS` 来更新它们。关于此变更的更详细讨论，请参阅[设计文档](/s/go15gomaxprocs)。

### 构建 {#build}
随着 Go 编译器和运行时本身已用 Go 语言实现，因此从源码构建 Go 发行版时必须先有一个可用的 Go 编译器。（不参与核心开发的 Go 程序员不受此变更影响。）任何 Go 1.4 或更高版本的发行版（包括 `gccgo`）均可满足要求。详情请参阅[设计文档](/s/go15bootstrap)。

### 系统移植 {#ports}

由于行业逐步淘汰 32 位 x86 架构，Go 1.5 版本提供的二进制下载包有所缩减。OS X 操作系统发行版仅提供 `amd64` 架构支持，不再包含 `386` 架构。同样，Snow Leopard（Apple OS X 10.6）的移植版本仍可运行，但鉴于苹果已不再维护该操作系统版本，该版本将不再作为可下载版本发布或维护。此外，由于 DragonflyBSD 本身已停止支持 32 位 386 架构，`dragonfly/386` 移植版本也已完全停止支持。

不过，有几个新增的移植版本可供源码构建，包括 `darwin/arm` 和 `darwin/arm64`。新增的 `linux/arm64` 移植版本基本就绪，但 `cgo` 仅支持外部链接方式。

`ppc64` 和 `ppc64le`（64 位 PowerPC，大端序与小端序）作为实验性移植版本提供。这两个版本均支持 `cgo`，但仅限于内部链接方式。

在 FreeBSD 系统上，Go 1.5 因新增使用 `SYSCALL` 指令，要求 FreeBSD 8-STABLE 或更高版本。

在 NaCl 系统上，Go 1.5 要求 SDK 版本为 pepper-41。由于 NaCl 运行时已移除 sRPC 子系统，更高版本的 pepper SDK 不兼容。

在 Darwin 系统上，可通过 `ios` 构建标签禁用系统 X.509 证书接口。

Solaris 移植版本现已完全支持 cgo，并新增对 [`net`](/pkg/net/) 和 [`crypto/x509`](/pkg/crypto/x509/) 等包的支持，同时修复了多项问题并改进了其他功能。

### 工具链 {#tools}

#### 编译器移植 {#translate}

作为从代码库中消除 C 语言的一部分，编译器和链接器已从 C 语言移植为 Go 语言实现。这是一次真正的（机器辅助）翻译过程，因此新程序本质上是旧程序的翻译版本，而非包含新缺陷的全新程序。我们确信翻译过程引入的新缺陷极少，实际上还发现了若干先前未知的缺陷（现已修复）。

不过汇编器是全新的程序，具体说明见下文。

#### 工具重命名 {#rename}

原先的编译器套件（`6g`、`8g` 等）、汇编器套件（`6a`、`8a` 等）和链接器套件（`6l`、`8l` 等）现已各自整合为单一工具，并通过环境变量 `GOOS` 和 `GOARCH` 进行配置。旧名称已废弃，新工具可通过 `go` `tool` 机制以 `go tool compile`、`go tool asm` 和 `go tool link` 调用。同时，中间目标文件的 `.6`、`.8` 等扩展名也已取消，现在统一使用 `.o` 扩展名。

例如，要在 Darwin 系统的 amd64 架构上直接使用工具链构建和链接程序（而非通过 `go build`），可执行：

	$ export GOOS=darwin GOARCH=amd64
	$ go tool compile program.go
	$ go tool link program.o

#### 工具迁移 {#moving}

由于 [`go/types`](/pkg/go/types/) 包现已移入主代码库（见下文），[`vet`](/cmd/vet) 和 [`cover`](/cmd/cover) 工具也已随之迁移。这些工具不再在外部 `golang.org/x/tools` 代码库中维护，但为兼容旧版本，该处仍保留（已弃用的）源代码。

#### 编译器 {#compiler}

如上所述，Go 1.5 的编译器是从旧版 C 源码翻译而来的单体 Go 程序，取代了 `6g`、`8g` 等工具。其目标平台由环境变量 `GOOS` 和 `GOARCH` 配置。

1.5 版本编译器与旧版基本等效，但部分内部实现已变更。一个重要变化是常量求值现使用 [`math/big`](/pkg/math/big/) 包，而非原先自定义的高精度算术实现（该实现测试覆盖较少）。我们预计此变更不会影响计算结果。

针对 amd64 架构，编译器新增了 `-dynlink` 选项，通过支持对外部共享库中定义的 Go 符号的引用来辅助动态链接。

#### 汇编器 {#assembler}

与编译器和链接器类似，Go 1.5 的汇编器是取代原汇编器套件（`6a`、`8a` 等）的单体程序，通过环境变量 `GOARCH` 和 `GOOS` 配置目标架构和操作系统。但与其他工具不同，汇编器是完全用 Go 语言编写的新程序。

新汇编器与旧版高度兼容，但存在若干可能影响汇编源文件的变更。具体信息请参阅更新后的[汇编器指南](/doc/asm)。主要变更摘要如下：

首先，用于常量的表达式求值机制略有不同。现在采用无符号 64 位算术，且运算符优先级（`+`、`-`、`<<` 等）遵循 Go 语言规则而非 C 语言规则。我们预计这些变更影响范围极小，但可能需要进行人工验证。

更重要的是，在 `SP` 或 `PC` 仅为寄存器别名的架构上（例如 ARM 架构中 `R13` 为栈指针、`R15` 为硬件程序计数器），不包含符号的寄存器引用现在属于非法语法。例如，`SP` 和 `4(SP)` 是非法语法，但 `sym+4(SP)` 合法。在这些架构上，如需引用硬件寄存器请使用其真实 `R` 名称。

一个细微变更是：部分旧版汇编器允许使用以下语法定义命名常量：

	constant=value

由于此功能完全可通过传统 C 风格的 `#define` 语法实现（汇编器仍包含简化版 C 预处理器实现并支持该语法），该特性已被移除。

#### 链接器 {#link}
Go 1.5中的链接器现在是一个统一的Go程序，取代了之前的`6l`、`8l`等工具。其操作系统和指令集由环境变量`GOOS`和`GOARCH`指定。

还有其他几项变更。最显著的是新增了`-buildmode`选项，扩展了链接风格；现在支持构建共享库以及允许其他语言调用Go库等场景。其中部分内容已在[设计文档](/s/execmodes)中概述。要查看可用的构建模式及其用途，请运行：

	$ go help buildmode

另一项较小变更是：链接器不再在Windows可执行文件的头部记录构建时间戳。此外（尽管该问题可能已修复），Windows平台的cgo可执行文件缺少部分DWARF调试信息。

最后，接受两个参数的`-X`标志（如：

	-X importpath.name value

）现在也支持更常见的Go风格单参数格式（即`name=value`对）：

	-X importpath.name=value

虽然旧语法仍然有效，但建议在脚本等场景中将该标志的用法更新为新格式。

### Go命令 {#go_command}

[`go`](/cmd/go)命令的基本操作保持不变，但有多项值得注意的变更。

前一版本引入了“包内目录不可通过`go`命令导入”的概念。在1.4版本中，该特性通过在核心仓库引入部分内部元素进行了测试。根据[设计文档](/s/go14internal)的建议，该变更现已扩展至所有仓库。规则详见设计文档，简而言之：位于名为`internal`的目录下（或该目录内）的包，仅能被同一子树根下的包导入。现有包含`internal`目录元素的包可能因此变更意外受损，这也是上一版本预先公告的原因。

关于包处理的另一项变更是新增了对"vendoring"（供应商目录）的实验性支持。详情请参阅[`go`命令文档](/cmd/go/#hdr-Vendor_Directories)和[设计文档](/s/go15vendor)。

还有若干较小变更。完整详情请参阅[文档](/cmd/go)。

  - SWIG支持已更新，`.swig`和`.swigcxx`文件现要求SWIG 3.0.6或更高版本。
  - `install`子命令现在会删除源目录中`build`子命令生成的可执行文件（若存在），以避免树结构中出现两个同名可执行文件的问题。
  - `std`（标准库）通配符包名现在不包含命令。新增的`cmd`通配符专门涵盖命令。
  - 新增`-asmflags`构建选项，用于设置传递给汇编器的标志。但`-ccflags`构建选项已被移除，该选项专属于已删除的旧版C编译器。
  - 新增`-buildmode`构建选项，用于设置构建模式（如上所述）。
  - 新增`-pkgdir`构建选项，用于设置已安装包归档的位置，以支持自定义构建隔离。
  - 新增`-toolexec`构建选项，允许替换调用编译器等工具的命令，相当于自定义版的`go tool`。
  - `test`子命令新增`-count`标志，用于指定每个测试和基准测试的运行次数。[`testing`](/pkg/testing/)包通过`-test.count`标志实现此功能。
  - `generate`子命令新增两项特性：`-run`选项通过正则表达式选择要执行的指令（该功能在1.4版本中提出但未实现）；执行模式现可访问两个新环境变量：`$GOLINE`返回指令所在源码行号，`$DOLLAR`扩展为美元符号。
  - `get`子命令新增`-insecure`标志，用于从不加密连接的不安全仓库获取内容时必须启用。

### Go vet命令 {#vet_command}

[`go tool vet`](/cmd/vet)命令现在对结构体标签进行更严格的验证。

### Trace命令 {#trace_command}

新增Go程序动态执行追踪工具，用法类似测试覆盖率工具。追踪生成集成在`go test`中，随后通过单独执行追踪工具分析结果：

	$ go test -trace=trace.out path/to/package
	$ go tool trace [flags] pkg.test trace.out

标志选项支持在浏览器窗口中显示结果。详情请运行`go tool trace -help`。2015年GopherCon大会的[演讲](/talks/2015/dynamic-tools.slide)中也介绍了追踪功能。

### Go doc命令 {#doc_command}

数个版本前，`go doc`命令因被认为多余而被移除（用户可始终使用`godoc .`替代）。1.5版本引入了全新的[`go doc`](/cmd/doc)命令，提供比`godoc`更便捷的命令行界面。该命令专为命令行使用设计，根据调用方式提供更简洁聚焦的包或元素文档展示。同时支持大小写不敏感匹配及非导出符号的文档显示。详情请运行"`go help doc`"。

### Cgo {#cgo}

解析`#cgo`行时，`${SRCDIR}`调用现在会扩展为源码目录路径。这允许向编译器和链接器传递依赖于源码目录的文件路径选项，避免因工作目录变更导致路径失效。

Solaris平台现获得完整cgo支持。

Windows平台默认使用外部链接模式。

当C结构体以零大小字段结尾（但结构体本身非零大小）时，Go代码将无法引用该零大小字段。所有此类引用都需要重写。
## 性能 {#performance}

一如既往，本次更新涉及范围广泛且类型多样，因此很难对性能做出精确的陈述。本次版本的变更比通常情况更为广泛，其中包括一个全新的垃圾回收器以及将运行时转换为 Go 语言实现。一些程序可能会运行得更快，而另一些则可能更慢。平均而言，Go 1.5 中 Go 1 基准测试套件里的程序比在 Go 1.4 中运行速度快了几个百分点，同时如上所述，垃圾回收器的暂停时间显著缩短，几乎总能保持在 10 毫秒以内。

Go 1.5 的构建速度将会大约慢两倍。将编译器和链接器从 C 语言自动翻译为 Go 语言，导致生成的 Go 代码不够地道，与编写良好的 Go 代码相比性能较差。分析工具和重构有助于改进代码，但仍有许多工作待完成。进一步的性能剖析和优化工作将在 Go 1.6 及未来的版本中继续进行。更多详情，请参阅这些[幻灯片](/talks/2015/gogo.slide)及相关的[视频](https://www.youtube.com/watch?v=cF1zJYkBW4A)。

## 标准库 {#library}

### Flag {#flag}

`flag` 包的
[`PrintDefaults`](/pkg/flag/#PrintDefaults)
函数以及 [`FlagSet`](/pkg/flag/#FlagSet) 的方法已进行修改，以生成更友好的使用帮助信息。格式已调整得更易于阅读，在使用帮助信息中，用反引号包裹的单词将被视为该标志的操作数名称以进行显示。例如，通过以下方式创建的标志：

	cpuFlag = flag.Int("cpu", 1, "run `N` processes in parallel")

将显示如下帮助信息：

	-cpu N
	    	run N processes in parallel (default 1)

此外，现在仅当默认值不是该类型的零值时才会列出默认值。

### math/big 中的浮点数 {#math_big}

[`math/big`](/pkg/math/big/) 包新增了一个基础数据类型
[`Float`](/pkg/math/big/#Float)，它实现了任意精度的浮点数。一个 `Float` 值由一个布尔符号位、一个可变长度的尾数和一个 32 位固定大小的有符号指数组成。`Float` 的精度（以位为单位的尾数大小）可以显式指定，否则将由创建该值的首次运算决定。创建后，可以通过 [`SetPrec`](/pkg/math/big/#Float.SetPrec) 方法修改 `Float` 的尾数大小。`Float` 支持无穷大的概念（例如由溢出产生），但会导致等同于 IEEE 754 NaN 的值会触发 panic。`Float` 运算支持所有 IEEE-754 舍入模式。当精度设置为 24（53）位时，保持在正规化 `float32`（`float64`）值范围内的运算结果，将与相应的 IEEE-754 算术运算结果相同。

### Go 类型 {#go_types}

[`go/types`](/pkg/go/types/) 包此前一直维护在 `golang.org/x` 代码仓库中；自 Go 1.5 起，它已被迁移至主代码仓库。旧位置的代码现已弃用。该包还存在一个适度的 API 变更，下文将进行讨论。

与此迁移相关，[`go/constant`](/pkg/go/constant/) 包也已移至主代码仓库；它之前位于 `golang.org/x/tools/exact`。[`go/importer`](/pkg/go/importer/) 包以及上文描述的一些工具也已移至主代码仓库。

### Net {#net}

net 包中的 DNS 解析器几乎总是使用 `cgo` 来访问系统接口。Go 1.5 中的一个变更意味着，在大多数 Unix 系统上，DNS 解析将不再需要 `cgo`，这简化了在这些平台上的执行。现在，如果系统的网络配置允许，原生 Go 解析器就足够了。此变更的重要影响在于，每次 DNS 解析将占用一个 goroutine 而不是一个线程，因此一个拥有多个未完成 DNS 请求的程序将消耗更少的操作系统资源。

如何运行解析器的决定是在运行时而非构建时应用的。过去用于强制使用 Go 解析器的 `netgo` 构建标签已不再必需，尽管它仍然有效。一个新的 `netcgo` 构建标签可以在构建时强制使用 `cgo` 解析器。若要在运行时强制使用 `cgo` 解析，请在环境变量中设置 `GODEBUG=netdns=cgo`。更多调试选项在[此处](/cl/11584)有文档说明。

此变更仅适用于 Unix 系统。Windows、Mac OS X 和 Plan 9 系统的行为与之前相同。

### Reflect {#reflect}

[`reflect`](/pkg/reflect/) 包新增了两个函数：[`ArrayOf`](/pkg/reflect/#ArrayOf) 和 [`FuncOf`](/pkg/reflect/#FuncOf)。这些函数类似于现有的 [`SliceOf`](/pkg/reflect/#SliceOf) 函数，可以在运行时创建新类型以描述数组和函数。

### 安全加固 {#hardening}

通过使用 [`go-fuzz`](https://github.com/dvyukov/go-fuzz) 工具进行随机测试，在标准库中发现了数十个漏洞。已在以下包中修复了漏洞：
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
这些修复加固了实现，以抵御不正确和恶意的输入。

### 库的次要变更 {#minor_library_changes}
- [`archive/zip`](/pkg/archive/zip/) 包中的
    [`Writer`](/pkg/archive/zip/#Writer) 类型现新增了
    [`SetOffset`](/pkg/archive/zip/#Writer.SetOffset)
    方法，用于指定在输出流中写入归档数据的位置。
  - [`bufio`](/pkg/bufio/) 包中的
    [`Reader`](/pkg/bufio/#Reader) 现新增了
    [`Discard`](/pkg/bufio/#Reader.Discard)
    方法，用于丢弃输入中的数据。
  - 在 [`bytes`](/pkg/bytes/) 包中，
    [`Buffer`](/pkg/bytes/#Buffer) 类型
    现新增了 [`Cap`](/pkg/bytes/#Buffer.Cap) 方法，
    用于报告缓冲区内已分配的字节数。
    同样，在 [`bytes`](/pkg/bytes/) 和
    [`strings`](/pkg/strings/) 两个包中，
    [`Reader`](/pkg/bytes/#Reader) 类型现新增了 [`Size`](/pkg/bytes/#Reader.Size)
    方法，用于报告底层切片（slice）或字符串的原始长度。
  - [`bytes`](/pkg/bytes/) 和
    [`strings`](/pkg/strings/) 包
    现均新增了 [`LastIndexByte`](/pkg/bytes/#LastIndexByte)
    函数，用于定位参数中具有特定值的最右侧字节。
  - [`crypto`](/pkg/crypto/) 包新增了一个接口 [`Decrypter`](/pkg/crypto/#Decrypter)，
    用于抽象非对称解密中使用的私钥行为。
  - 在 [`crypto/cipher`](/pkg/crypto/cipher/) 包中，
    [`Stream`](/pkg/crypto/cipher/#Stream)
    接口的文档已就源和目标长度不同时的行为进行了澄清。
    如果目标长度短于源长度，该方法将触发恐慌（panic）。
    这不是实现的变更，仅涉及文档修正。
  - 同样在 [`crypto/cipher`](/pkg/crypto/cipher/) 包中，
    现已支持 AES 的 Galois/Counter 模式 (GCM) 使用 96 字节以外的随机数长度，
    这是某些协议所要求的。
  - 在 [`crypto/elliptic`](/pkg/crypto/elliptic/) 包中，
    [`CurveParams`](/pkg/crypto/elliptic/#CurveParams) 结构体现新增了 `Name` 字段，
    并且该包中实现的曲线均已获得命名。
    对于依赖曲线的加密系统，这些名称提供了一种更安全的曲线选择方式，
    相比选择其位大小更为可靠。
  - 同样在 [`crypto/elliptic`](/pkg/crypto/elliptic/) 包中，
    [`Unmarshal`](/pkg/crypto/elliptic/#Unmarshal) 函数
    现已验证点是否确实在曲线上。
    （如果不在，该函数将返回 nil。）
    此变更旨在防御某些攻击。
  - [`crypto/sha512`](/pkg/crypto/sha512/)
    包现支持 SHA-512 哈希算法的两种截断版本：SHA-512/224 和 SHA-512/256。
  - [`crypto/tls`](/pkg/crypto/tls/) 包
    的最低协议版本现默认为 TLS 1.0。
    如有需要，旧默认值 SSLv3 仍可通过 [`Config`](/pkg/crypto/tls/#Config) 使用。
  - [`crypto/tls`](/pkg/crypto/tls/) 包
    现支持 RFC 6962 中规定的签名证书时间戳 (SCTs)。
    如果 SCTs 列于 [`Certificate`](/pkg/crypto/tls/#Certificate) 结构体中，
    服务器将提供它们；
    客户端会请求 SCTs，并在存在时将其暴露在其 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 结构体中。
  - 通过 [`crypto/tls`](/pkg/crypto/tls/) 客户端连接接收的 OCSP 装订响应，
    此前只能通过 [`OCSPResponse`](/pkg/crypto/tls/#Conn.OCSPResponse) 方法获取，
    现已暴露在 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 结构体中。
  - [`crypto/tls`](/pkg/crypto/tls/) 服务器的实现在
    未提供证书时，现将始终调用
    [`Config`](/pkg/crypto/tls/#Config) 结构体中的
    `GetCertificate` 函数来为连接选择证书。
  - 最后，[`crypto/tls`](/pkg/crypto/tls/) 包中的会话票据密钥
    现在可以在服务器运行时进行更改。
    这通过 [`Config`](/pkg/crypto/tls/#Config) 类型新增的
    [`SetSessionTicketKeys`](/pkg/crypto/tls/#Config.SetSessionTicketKeys)
    方法实现。
  - 在 [`crypto/x509`](/pkg/crypto/x509/) 包中，
    通配符现仅在最左侧标签中被接受，这符合
    [规范](https://tools.ietf.org/html/rfc6125#section-6.4.3) 的定义。
  - 同样在 [`crypto/x509`](/pkg/crypto/x509/) 包中，
    对未知关键扩展的处理方式已更改。
    以前它们会导致解析错误，但现在它们会被解析，并仅在
    [`Verify`](/pkg/crypto/x509/#Certificate.Verify) 方法中引发错误。
    [`Certificate`](/pkg/crypto/x509/#Certificate) 结构体的新字段 `UnhandledCriticalExtensions`
    用于记录这些扩展。
  - [`database/sql`](/pkg/database/sql/) 包的
    [`DB`](/pkg/database/sql/#DB) 类型
    现新增了 [`Stats`](/pkg/database/sql/#DB.Stats) 方法，
    用于获取数据库统计信息。
  - [`debug/dwarf`](/pkg/debug/dwarf/)
    包进行了大量扩充，以更好地支持 DWARF 版本 4。
    例如，可参见新类型 [`Class`](/pkg/debug/dwarf/#Class) 的定义。
  - [`debug/dwarf`](/pkg/debug/dwarf/) 包
    现也支持解码 DWARF 行表。
  - [`debug/elf`](/pkg/debug/elf/)
    包现支持 64 位 PowerPC 架构。
  - [`encoding/base64`](/pkg/encoding/base64/) 包
    现通过两个新的编码变量
    [`RawStdEncoding`](/pkg/encoding/base64/#RawStdEncoding) 和
    [`RawURLEncoding`](/pkg/encoding/base64/#RawURLEncoding)，
    支持无填充编码。
  - [`encoding/json`](/pkg/encoding/json/) 包
    现在，如果 JSON 值与反序列化目标变量或组件不匹配，
    将返回 [`UnmarshalTypeError`](/pkg/encoding/json/#UnmarshalTypeError)。
  - `encoding/json` 包的
    [`Decoder`](/pkg/encoding/json/#Decoder)
    类型新增了一个方法，为解码 JSON 文档提供流式接口：
    [`Token`](/pkg/encoding/json/#Decoder.Token)。
    它也与现有的 `Decode` 功能互操作，
    `Decode` 可以继续 `Decoder.Token` 已经开始的解码操作。
  - [`flag`](/pkg/flag/) 包
    新增了一个函数 [`UnquoteUsage`](/pkg/flag/#UnquoteUsage)，
    用于辅助按照上述新约定创建使用说明信息。
  - 在 [`fmt`](/pkg/fmt/) 包中，
    [`Value`](/pkg/reflect/#Value) 类型的值现在会打印其包含的内容，
    而不是使用 `reflect.Value` 的 `Stringer` 方法，
    该方法会产生类似 `<int Value>` 的输出。
  - [`go/ast`](/pkg/go/ast/) 包中的
    [`EmptyStmt`](/pkg/ast/#EmptyStmt) 类型现新增了
    布尔类型的 `Implicit` 字段，用于记录分号是隐式添加的还是存在于源代码中。
  - 为了向前兼容，[`go/build`](/pkg/go/build/) 包
    为未来 Go 可能支持的多种架构预留了 `GOARCH` 值。
    这并非承诺将予以支持。
    另外，[`Package`](/pkg/go/build/#Package) 结构体
    现新增了 `PkgTargetRoot` 字段，用于存储（如果已知的）与架构相关的安装根目录。
  - （新迁移的）[`go/types`](/pkg/go/types/)
    包允许通过使用新的 [`Qualifier`](/pkg/go/types/#Qualifier)
    函数类型作为参数传递给多个函数，来控制附加到包级名称的前缀。
    这对包的 API 是一项变更，但由于该包是新增到核心库的，
    且使用该包的代码必须在其新位置显式请求，因此并未违反 Go 1 兼容性规则。
    要更新，请在您的包上运行
    [`go fix`](/cmd/go/#hdr-Run_go_tool_fix_on_packages)。
  - 在 [`image`](/pkg/image/) 包中，
    [`Rectangle`](/pkg/image/#Rectangle) 类型
    现实现了 [`Image`](/pkg/image/#Image) 接口，
    因此 `Rectangle` 在绘图时可用作遮罩。
  - 同样在 [`image`](/pkg/image/) 包中，
    为辅助处理某些 JPEG 图像，
    现已支持 4:1:1 和 4:1:0 YCbCr 色度子采样以及基本的
    CMYK 支持（由新的 `image.CMYK` 结构体表示）。
  - [`image/color`](/pkg/image/color/) 包
    通过新增的 [`CMYK`](/pkg/image/color/#CMYK) 结构体、
    [`CMYKModel`](/pkg/image/color/#CMYKModel) 颜色模型和
    [`CMYKToRGB`](/pkg/image/color/#CMYKToRGB) 函数，
    增加了基本的 CMYK 支持，以满足某些 JPEG 图像的需求。
  - 同样在 [`image/color`](/pkg/image/color/) 包中，
    [`YCbCr`](/pkg/image/color/#YCbCr)
    值转换为 `RGBA` 的精度有所提高。
    以前，低 8 位只是高 8 位的重复；
    现在它们包含了更准确的信息。
    由于旧代码的重复特性，使用 `uint8(r)` 来提取 8 位红色值以前是可行的，但并不正确。
    在 Go 1.5 中，该操作可能产生不同的值。
    正确的代码过去是，现在也仍是选择高 8 位：
    `uint8(r>>8)`。
    顺便一提，`image/draw` 包
    为此类转换提供了更好的支持；更多信息请参见
    [这篇博客文章](/blog/go-imagedraw-package)。
  - 最后，自 Go 1.5 起，[`Index`](/pkg/image/color/#Palette.Index) 中的
    最近匹配检查现在会考虑 Alpha 通道。
  - [`image/gif`](/pkg/image/gif/) 包
    包含几项通用化改进。
    多帧 GIF 文件现在可以拥有一个与所有包含的单帧边框不同的总体边框。
    另外，[`GIF`](/pkg/image/gif/#GIF) 结构体
    现新增了 `Disposal` 字段，
    用于指定每一帧的处置方法。
  - [`io`](/pkg/io/) 包
    新增了 [`CopyBuffer`](/pkg/io/#CopyBuffer) 函数，
    该函数类似 [`Copy`](/pkg/io/#Copy)，但
    使用调用者提供的缓冲区，允许控制分配和缓冲区大小。
  - [`log`](/pkg/log/) 包
    新增了 [`LUTC`](/pkg/log/#LUTC) 标志，
    该标志使时间戳以 UTC 时区打印。
    同时，为用户创建的日志记录器添加了 [`SetOutput`](/pkg/log/#Logger.SetOutput) 方法。
  - 在 Go 1.4 中，[`Max`](/pkg/math/#Max) 未能检测所有可能的 NaN 位模式。
    此问题在 Go 1.5 中已修复，因此在包含 NaN 的数据上使用 `math.Max` 的程序行为可能有所不同，
    但现在符合 IEEE754 对 NaN 的正确定义。
  - [`math/big`](/pkg/math/big/) 包
    新增了用于整数的 [`Jacobi`](/pkg/math/big/#Jacobi)
    函数，以及 [`Int`](/pkg/math/big/#Int) 类型的新方法
    [`ModSqrt`](/pkg/math/big/#Int.ModSqrt)。
  - mime 包
    新增了 [`WordDecoder`](/pkg/mime/#WordDecoder) 类型，
    用于解码包含 RFC 204 编码词的 MIME 头。
    同时提供了 [`BEncoding`](/pkg/mime/#BEncoding) 和
    [`QEncoding`](/pkg/mime/#QEncoding)
    作为 RFC 2045 和 RFC 2047 编码方案的实现。
  - [`mime`](/pkg/mime/) 包也新增了
    [`ExtensionsByType`](/pkg/mime/#ExtensionsByType)
    函数，该函数返回已知与给定 MIME 类型关联的扩展名。
  - 新增了 [`mime/quotedprintable`](/pkg/mime/quotedprintable/)
    包，实现了 RFC 2045 定义的引用可打印编码。
  - [`net`](/pkg/net/) 包现在将通过
    [`Dial`](/pkg/net/#Dial) 主机名时，按顺序尝试每个
    IP 地址，直到其中一个成功。
    <code>[Dialer](/pkg/net/#Dialer).DualStack</code>
    模式现通过给予第一个地址族 300 毫秒的领先时间来实现 Happy Eyeballs
    ([RFC 6555](https://tools.ietf.org/html/rfc6555))；
    此值可由新的 `Dialer.FallbackDelay` 覆盖。
  - [`net`](/pkg/net/) 包中错误返回类型的一些不一致性
    已得到整理。
    现大多数返回 [`OpError`](/pkg/net/#OpError) 值，
    提供的信息比以前更多。
    另外，[`OpError`](/pkg/net/#OpError)
    类型现包含 `Source` 字段，用于保存本地网络地址。
  - [`net/http`](/pkg/net/http/) 包现在
    支持从服务器 [`Handler`](/pkg/net/http/#Handler) 设置尾部标头。
    详情请参阅 [`ResponseWriter`](/pkg/net/http/#ResponseWriter) 的文档。
  - 新增了一种方法，通过设置新的
    [`Request.Cancel`](/pkg/net/http/#Request) 字段来取消 [`net/http`](/pkg/net/http/) `Request`。
    该功能受 `http.Transport` 支持。
    `Cancel` 字段的类型与
    [`context.Context.Done`](https://godoc.org/golang.org/x/net/context)
    的返回值兼容。
  - 同样在 [`net/http`](/pkg/net/http/) 包中，
    编写了代码以忽略 [`ServeContent`](/pkg/net/#ServeContent) 函数中的零值 [`Time`](/pkg/time/#Time)。
    自 Go 1.5 起，它现在也忽略等于 Unix 纪元的时间值。
  - [`net/http/fcgi`](/pkg/net/http/fcgi/) 包
    导出了两个新的错误，
    [`ErrConnClosed`](/pkg/net/http/fcgi/#ErrConnClosed) 和
    [`ErrRequestAborted`](/pkg/net/http/fcgi/#ErrRequestAborted)，
    用于报告相应的错误状况。
  - [`net/http/cgi`](/pkg/net/http/cgi/) 包
    存在一个错误，错误地处理了环境变量
    `REMOTE_ADDR` 和 `REMOTE_HOST` 的值。
    此问题已修复。
    另外，从 Go 1.5 开始，该包设置了 `REMOTE_PORT` 变量。
  - [`net/mail`](/pkg/net/mail/) 包
    新增了 [`AddressParser`](/pkg/net/mail/#AddressParser)