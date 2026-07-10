---
title: Go 1.1 发布说明
---

## Go 1.1 简介 {#introduction}

[Go 1 版本](/doc/go1.html)（简称 Go 1 或 Go 1.0）于 2012 年 3 月发布，开启了 Go 语言和库稳定性的新阶段。这种稳定性促进了全球范围内 Go 用户和系统社区的发展壮大。此后发布的几个"小版本"——1.0.1、1.0.2 和 1.0.3——修复了已知错误，但未对实现进行任何非关键性更改。

本次发布的新版本 Go 1.1 遵循了[兼容性承诺](/doc/go1compat.html)，同时引入了一些显著的（当然，是向后兼容的）语言变更，包含大量（同样是兼容的）库更改，并对编译器、库和运行时的实现进行了重大改进。重点在于提升性能。基准测试本身是不精确的，但我们观察到许多测试程序的速度有显著甚至巨大的提升。我们相信，许多用户程序只需更新 Go 安装并重新编译，也能获得性能改进。

本文档概述了 Go 1 和 Go 1.1 之间的变更。迁移到 Go 1.1 几乎不需要修改任何代码，尽管此版本暴露了一些罕见的错误情况，如果发生则需要处理。详情如下；特别是请参阅关于[64 位整数](#int)和 [Unicode 字面量](#unicode_literals)的讨论。

## 语言变更 {#language}

[Go 兼容性文档](/doc/go1compat.html)承诺，按照 Go 1 语言规范编写的程序将继续运行，这些承诺得到了维护。然而，为了巩固规范，我们澄清了关于某些错误情况的细节。此外，还引入了一些新的语言特性。

### 整数除以零 {#divzero}

在 Go 1 中，整数除以常量零会引发运行时恐慌：

	func f(x int) int {
		return x/0
	}

在 Go 1.1 中，整数除以常量零不是合法的程序，因此这将导致编译时错误。

### Unicode 字面量中的代理项 {#unicode_literals}

字符串和符文字面量的定义已得到完善，将代理对半部分从有效的 Unicode 码点集中排除。更多信息请参阅 [Unicode](#unicode) 部分。

### 方法值 {#method_values}

Go 1.1 现在实现了[方法值](/ref/spec#Method_values)，它们是已绑定到特定接收者值的函数。例如，给定一个 [`Writer`](/pkg/bufio/#Writer) 类型的值 `w`，表达式 `w.Write` 就是一个方法值，它是一个总是向 `w` 写入的函数；它等价于一个捕获了 `w` 的函数字面量：

	func (p []byte) (n int, err error) {
		return w.Write(p)
	}

方法值与方法表达式不同，后者从给定类型的方法生成函数；方法表达式 `(*bufio.Writer).Write` 等价于一个带有额外第一个参数（类型为 `(*bufio.Writer)` 的接收者）的函数：

	func (w *bufio.Writer, p []byte) (n int, err error) {
		return w.Write(p)
	}

*更新指南*：现有代码不受影响；此变更严格向后兼容。

### 返回语句要求 {#return}

在 Go 1.1 之前，返回值的函数需要在函数末尾显式包含 "return" 语句或调用 `panic`；这是让程序员明确函数含义的一种简单方式。但在许多情况下，最后的 "return" 显然是不必要的，例如只包含无限 "for" 循环的函数。

在 Go 1.1 中，关于最后 "return" 语句的规则更加宽松。它引入了[终止语句](/ref/spec#Terminating_statements)的概念，即保证函数最后执行的语句。示例包括没有条件的 "for" 循环，以及每个分支都以 "return" 结尾的 "if-else" 语句。如果函数的最后一条语句在语法上可以证明是终止语句，则不需要最后的 "return" 语句。

请注意，该规则纯粹是语法性的：它不关注代码中的值，因此不需要复杂的分析。

*更新指南*：此变更向后兼容，但包含多余 "return" 语句和 `panic` 调用的现有代码可以手动简化。可以使用 `go vet` 来识别此类代码。

## 实现和工具的变更 {#impl}

### gccgo 的状态 {#gccgo}

GCC 的发布计划与 Go 的发布计划不一致，因此 `gccgo` 的发布版本不可避免地会有一些偏差。GCC 4.8.0 于 2013 年 3 月发布，包含了接近 Go 1.1 版本的 `gccgo`。其库版本略微落后于发布版本，但最大的区别是方法值尚未实现。我们预计在 2013 年 7 月左右，GCC 4.8.2 发布时，其中的 `gccgo` 将提供完整的 Go 1.1 实现。

### 命令行标志解析 {#gc_flag}

在 gc 工具链中，编译器和链接器现在使用与 Go `flag` 包相同的命令行标志解析规则，这与传统的 Unix 标志解析不同。这可能会影响直接调用该工具的脚本。例如，`go tool 6c -Fw -Dfoo` 现在必须写成 `go tool 6c -F -w -D foo`。

### 64 位平台上 int 的大小 {#int}

语言允许实现选择 `int` 和 `uint` 类型是 32 位还是 64 位。之前的 Go 实现在所有系统上都将 `int` 和 `uint` 设为 32 位。现在，在 AMD64/x86-64 等 64 位平台上，gc 和 gccgo 实现都将 `int` 和 `uint` 设为 64 位。这除了其他好处外，还使得在 64 位平台上可以分配超过 20 亿个元素的切片。_更新说明_：
大多数程序将不受此变更影响。
由于 Go 不允许不同[数值类型](/ref/spec#Numeric_types)之间的隐式转换，
因此没有程序会因该变更而停止编译。
然而，那些隐含假设 `int` 仅为 32 位的程序可能会改变行为。
例如，以下代码在 64 位系统上打印正数，在 32 位系统上打印负数：

	x := ^uint32(0) // x 为 0xffffffff
	i := int(x)     // 在 32 位系统上 i 为 -1，在 64 位系统上为 0xffffffff
	fmt.Println(i)

若要编写可移植代码以实现 32 位符号扩展（在所有系统上均得到 `-1`），则应改为：

	i := int(int32(x))

### 64 位架构的堆大小 {#heap}

在 64 位架构上，最大堆大小已大幅增加，
从几 GB 增加到数十 GB。
（具体细节取决于系统，且可能变化。）

在 32 位架构上，堆大小未作更改。

_更新说明_：
此变更除了允许现有程序使用更大的堆运行外，不应产生其他影响。

### Unicode {#unicode}

为了能够在 UTF-16 中表示大于 65535 的码位，
Unicode 定义了 _代理对_（_surrogate halves_），
这是一个仅用于组装大值且仅用于 UTF-16 的码位范围。
该代理范围内的码位用于任何其他目的均属非法。
在 Go 1.1 中，编译器、库和运行时均遵守此约束：
代理对作为 rune 值、编码为 UTF-8 或单独编码为 UTF-16 时均属非法。
当遇到代理对时（例如，在将 rune 转换为 UTF-8 时），它将被视为编码错误，
并返回替换字符
[`utf8.RuneError`](/pkg/unicode/utf8/#RuneError)，
即 U+FFFD。

此程序，

	import "fmt"

	func main() {
	    fmt.Printf("%+q\n", string(0xD800))
	}

在 Go 1.0 中打印 `"\ud800"`，但在 Go 1.1 中打印 `"\ufffd"`。

代理半部 Unicode 值现在在 rune 和字符串常量中属于非法，因此像
`'\ud800'` 和 `"\ud800"` 这样的常量现在会被编译器拒绝。
当显式写为 UTF-8 编码字节时，
仍然可以创建这样的字符串，例如 `"\xed\xa0\x80"`。
然而，当此类字符串被解码为 rune 序列时（例如在 range 循环中），
它只会返回 `utf8.RuneError` 值。

编码为 UTF-8 的 Unicode 字节顺序标记 U+FEFF 现在允许作为 Go 源文件的首字符。
尽管其在无字节序的 UTF-8 编码中出现显然没有必要，
但一些编辑器会添加此标记作为一种标识 UTF-8 编码文件的“魔数”。

_更新说明_：
大多数程序不受代理对变更影响。
依赖旧行为的程序应进行修改以避免此问题。
字节顺序标记的变更是严格向后兼容的。

### 竞态检测器 {#race}

工具的一个主要新增功能是 _竞态检测器_（_race detector_），
它用于发现由并发访问同一变量（其中至少有一个访问是写入操作）所导致的程序错误。
这一新功能内置于 `go` 工具中。
目前，它仅在 Linux、Mac OS X 和配备 64 位 x86 处理器的 Windows 系统上可用。
要启用它，请在构建或测试程序时设置 `-race` 标志
（例如，`go test -race`）。
竞态检测器的文档位于[另一篇文章](/doc/articles/race_detector.html)。

### gc 汇编器 {#gc_asm}

由于 [`int`](#int) 类型变为 64 位以及
新的内部[函数表示方式](/s/go11func)，
gc 工具链中函数参数在栈上的排列方式已发生改变。
用汇编语言编写的函数至少需要修订，
以调整栈帧指针偏移量。

_更新说明_：
`go vet` 命令现在会检查汇编实现的函数
是否与其所实现的 Go 函数原型匹配。

### go 命令的变更 {#gocmd}

[`go`](/cmd/go/) 命令已进行多项更改，
旨在改善新 Go 用户的体验。

首先，在编译、测试或运行 Go 代码时，当无法定位包时，
`go` 命令现在会提供更详细的错误消息，包括已搜索的路径列表。

	$ go build foo/quxx
	can't load package: package foo/quxx: cannot find package "foo/quxx" in any of:
	        /home/you/go/src/pkg/foo/quxx (from $GOROOT)
	        /home/you/src/foo/quxx (from $GOPATH)

其次，`go get` 命令不再允许将 `$GOROOT`
作为下载包源代码时的默认目标路径。
要使用 `go get` 命令，现在需要[有效的 `$GOPATH`](/doc/code.html#GOPATH)。

	$ GOPATH= go get code.google.com/p/foo/quxx
	package code.google.com/p/foo/quxx: cannot download, $GOPATH not set. For more details see: go help gopath

最后，作为上一变更的结果，当 `$GOPATH` 和 `$GOROOT` 设置为相同值时，
`go get` 命令也将失败。

	$ GOPATH=$GOROOT go get code.google.com/p/foo/quxx
	warning: GOPATH set to GOROOT (/home/you/go) has no effect
	package code.google.com/p/foo/quxx: cannot download, $GOPATH must not be set to $GOROOT. For more details see: go help gopath

### go test 命令的变更 {#gotest}

[`go test`](/cmd/go/#hdr-Test_packages)
命令在启用性能分析运行时不再删除二进制文件，
以便更轻松地分析性能数据。
该实现会自动设置 `-c` 标志，因此运行后，

	$ go test -cpuprofile cpuprof.out mypackage

文件 `mypackage.test` 将留在运行 `go test` 的目录中。

[`go test`](/cmd/go/#hdr-Test_packages)
命令现在可以生成性能分析信息，
报告 goroutine 在何处阻塞，即
它们倾向于在何处等待事件（如通道通信）而停滞。
该信息以 _阻塞性能分析_（_blocking profile_）的形式呈现，
通过 `go test` 的
`-blockprofile`
选项启用。
运行 `go help test` 获取更多信息。

### go fix 命令的变更 {#gofix}`fix` 命令（通常以 `go fix` 形式运行）不再适用于将 Go 1 之前的代码更新为使用 Go 1 的 API。如需将 Go 1 之前的代码更新至 Go 1.1，请先使用 Go 1.0 工具链将代码转换为 Go 1.0 版本。

### 构建约束 {#tags}

"`go1.1`" 标签已添加至默认的[构建约束](/pkg/go/build/#hdr-Build_Constraints)列表中。这使得代码包能够利用 Go 1.1 中的新特性，同时保持与早期 Go 版本的兼容性。

若要仅在 Go 1.1 及更高版本中编译某个文件，请添加以下构建约束：

	// +build go1.1

若要仅在 Go 1.0.x 版本中编译某个文件，请使用相反的约束：

	// +build !go1.1

### 新增平台支持 {#platforms}

Go 1.1 工具链新增了对 `freebsd/arm`、`netbsd/386`、`netbsd/amd64`、`netbsd/arm`、`openbsd/386` 和 `openbsd/amd64` 平台的实验性支持。

对于 `freebsd/arm` 或 `netbsd/arm` 平台，需要 ARMv6 或更高版本的处理器。

Go 1.1 在 `linux/arm` 平台上新增了对 `cgo` 的实验性支持。

### 交叉编译 {#crosscompile}

在进行交叉编译时，`go` 工具将默认禁用 `cgo` 支持。

要显式启用 `cgo`，请设置 `CGO_ENABLED=1`。

## 性能提升 {#performance}

使用 Go 1.1 gc 工具套件编译的代码，其性能对于大多数 Go 程序而言应有显著提升。相对于 Go 1.0，典型的改进幅度约为 30%-40%，有时甚至更高，但偶尔提升较小或不明显。工具和库中有许多针对性能的微小调整，此处无法一一列举，但以下重大变更值得留意：

  - gc 编译器在许多情况下生成更优质的代码，特别是在 32 位 Intel 架构上的浮点运算方面表现尤为明显。
  - gc 编译器执行了更多的内联操作，包括对运行时中的某些操作（如 [`append`](/pkg/builtin/#append) 和接口转换）的内联。
  - Go map 有了一种新的实现方式，显著降低了内存占用和 CPU 时间。
  - 垃圾回收器（GC）的并行度得到提升，这可以减少在多个 CPU 上运行的程序的延迟。
  - 垃圾回收器也更加精确，这会消耗少量 CPU 时间，但能显著减少堆的大小，尤其是在 32 位架构上。
  - 由于运行时与网络库的耦合更加紧密，网络操作所需的上下文切换次数有所减少。

## 标准库变更 {#library}

### bufio.Scanner {#bufio_scanner}

`[`bufio`](/pkg/bufio/)` 包中用于扫描文本输入的各种例程，如 [`ReadBytes`](/pkg/bufio/#Reader.ReadBytes)、[`ReadString`](/pkg/bufio/#Reader.ReadString)，特别是 [`ReadLine`](/pkg/bufio/#Reader.ReadLine)，对于简单用途而言使用起来过于复杂。在 Go 1.1 中，新增了一个 [`Scanner`](/pkg/bufio/#Scanner) 类型，使得执行简单的任务（如逐行读取输入或读取以空格分隔的单词）变得更加容易。它简化了问题：在遇到异常输入（如超长行）时会终止扫描，并提供了一个简单的默认行为：面向行的输入，每行会去除其终止符。以下是逐行复制输入的示例代码：

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
	    fmt.Println(scanner.Text()) // Println 会重新添加末尾的 '\n'
	}
	if err := scanner.Err(); err != nil {
	    fmt.Fprintln(os.Stderr, "读取标准输入时出错:", err)
	}

扫描行为可以通过一个函数来调整输入的分割方式（参见 [`SplitFunc`](/pkg/bufio/#SplitFunc) 的文档），但对于复杂的问题或需要在出错后继续处理的情况，可能仍需使用旧的接口。

### net {#net}

`[`net`](/pkg/net/)` 包中特定于协议的解析器先前对传入的网络名称比较宽松。尽管文档明确指出 [`ResolveTCPAddr`](/pkg/net/#ResolveTCPAddr) 的有效网络仅限于 `"tcp"`、`"tcp4"` 和 `"tcp6"`，但 Go 1.0 的实现会静默接受任何字符串。Go 1.1 的实现在网络名称不是这些字符串之一时会返回错误。其他特定于协议的解析器 [`ResolveIPAddr`](/pkg/net/#ResolveIPAddr)、[`ResolveUDPAddr`](/pkg/net/#ResolveUDPAddr) 和 [`ResolveUnixAddr`](/pkg/net/#ResolveUnixAddr) 也同样如此。

先前 [`ListenUnixgram`](/pkg/net/#ListenUnixgram) 的实现返回一个 [`UDPConn`](/pkg/net/#UDPConn) 来表示连接端点。Go 1.1 的实现则改为返回一个 [`UnixConn`](/pkg/net/#UnixConn)，以便通过其 [`ReadFrom`](/pkg/net/#UnixConn.ReadFrom) 和 [`WriteTo`](/pkg/net/#UnixConn.WriteTo) 方法进行读写操作。

数据结构 [`IPAddr`](/pkg/net/#IPAddr)、[`TCPAddr`](/pkg/net/#TCPAddr) 和 [`UDPAddr`](/pkg/net/#UDPAddr) 新增了一个名为 `Zone` 的字符串字段。使用未加标签的复合字面量（例如 `net.TCPAddr{ip, port}`）而非带标签的字面量（`net.TCPAddr{IP: ip, Port: port}`）的代码会因此新字段而中断。Go 1 的兼容性规则允许此变更：客户端代码必须使用带标签的字面量以避免此类中断。

_更新说明_：
为纠正由新结构体字段引起的中断，`go fix` 将会重写代码，为这些类型添加标签。更广泛地说，`go vet` 将会识别出应修改为使用字段标签的复合字面量。

### reflect {#reflect}

`[`reflect`](/pkg/reflect/)` 包增加了几项重要功能。

现在可以使用 `reflect` 包执行 "select" 语句；详情请参阅 [`Select`](/pkg/reflect/#Select) 和 [`SelectCase`](/pkg/reflect/#SelectCase) 的说明。

新增方法 [`Value.Convert`](/pkg/reflect/#Value.Convert)（或 [`Type.ConvertibleTo`](/pkg/reflect/#Type)）提供了在 [`Value`](/pkg/reflect/#Value) 上执行 Go 转换或类型断言操作（或测试其可能性）的功能。新增函数
[`MakeFunc`](/pkg/reflect/#MakeFunc)
创建了一个包装函数，使得使用现有的
[`Values`](/pkg/reflect/#Value)
更易调用函数，并执行标准的 Go 转换，例如将实际的 `int` 传递给形式上的 `interface{}`。

最后，新增函数
[`ChanOf`](/pkg/reflect/#ChanOf)、
[`MapOf`](/pkg/reflect/#MapOf)
和
[`SliceOf`](/pkg/reflect/#SliceOf)
根据现有类型构造新的
[`Types`](/pkg/reflect/#Type)，
例如在仅给定 `T` 的情况下构造类型 `[]T`。

### time {#time}

在 FreeBSD、Linux、NetBSD、OS X 和 OpenBSD 上，之前的
[`time`](/pkg/time/) 包
以微秒精度返回时间。Go 1.1 在这些系统上的实现现在以纳秒精度返回时间。将时间以微秒精度写入外部格式并读回、期望恢复原始值的程序，会受到精度损失的影响。新增了两个 [`Time`](/pkg/time/#Time) 的方法，
[`Round`](/pkg/time/#Time.Round)
和
[`Truncate`](/pkg/time/#Time.Truncate)，
可用于在将时间传递给外部存储之前去除其精度。

新增方法
[`YearDay`](/pkg/time/#Time.YearDay)
返回时间值所指定年份中，以 1 开始计数的整数日期序号。

[`Timer`](/pkg/time/#Timer) 类型有一个新方法
[`Reset`](/pkg/time/#Timer.Reset)，
它修改计时器使其在指定的持续时间后到期。

最后，新增函数
[`ParseInLocation`](/pkg/time/#ParseInLocation)
类似于现有的
[`Parse`](/pkg/time/#Parse)，
但在某个位置（时区）的上下文中解析时间，忽略被解析字符串中的时区信息。此函数解决了时间 API 中一个常见的混淆来源。

_更新_：
需要使用较低精度的外部格式读写时间的代码应修改为使用新方法。

### Exp 和 old 子树已移至 go.exp 和 go.text 子仓库 {#exp_old}

为了让二进制发行版在需要时更易于访问，`exp` 和 `old` 源代码子树（不包含在二进制发行版中）已移至新的 `go.exp` 子仓库，地址为 `code.google.com/p/go.exp`。例如，要访问 `ssa` 包，请运行

	$ go get code.google.com/p/go.exp/ssa

然后在 Go 源代码中，

	import "code.google.com/p/go.exp/ssa"

旧的包 `exp/norm` 也已迁移，但移至一个新的仓库 `go.text`，Unicode API 和其他与文本相关的包将在那里开发。

### 新包 {#new_packages}

新增了三个包。

  - [`go/format`](/pkg/go/format/) 包提供了一种便捷的方式，让程序可以访问
    [`go fmt`](/cmd/go/#hdr-Run_gofmt_on_package_sources) 命令的格式化功能。它有两个函数：
    [`Node`](/pkg/go/format/#Node) 用于格式化 Go 解析器
    [`Node`](/pkg/go/ast/#Node)，
    和
    [`Source`](/pkg/go/format/#Source)
    用于将任意 Go 源代码重新格式化为
    [`go fmt`](/cmd/go/#hdr-Run_gofmt_on_package_sources) 命令提供的标准格式。
  - [`net/http/cookiejar`](/pkg/net/http/cookiejar/) 包提供了管理 HTTP cookie 的基础功能。
  - [`runtime/race`](/pkg/runtime/race/) 包提供了用于数据竞争检测的底层工具。它是竞态检测器的内部组件，并不导出任何其他用户可见的功能。

### 库的次要变更 {#minor_library_changes}

以下列表总结了库的若干次要变更，主要是新增内容。有关每次变更的更多详细信息，请参阅相关包的文档。- [`bytes`](/pkg/bytes/) 包新增了两个函数：[`TrimPrefix`](/pkg/bytes/#TrimPrefix) 和 [`TrimSuffix`](/pkg/bytes/#TrimSuffix)，其功能不言自明。此外，[`Buffer`](/pkg/bytes/#Buffer) 类型新增了 [`Grow`](/pkg/bytes/#Buffer.Grow) 方法，用于对缓冲区内的内存分配进行一定控制。最后，[`Reader`](/pkg/bytes/#Reader) 类型现在实现了 [`WriteTo`](/pkg/strings/#Reader.WriteTo) 方法，从而实现了 [`io.WriterTo`](/pkg/io/#WriterTo) 接口。

- [`compress/gzip`](/pkg/compress/gzip/) 包的 [`Writer`](/pkg/compress/gzip/#Writer) 类型新增了一个 [`Flush`](/pkg/compress/gzip/#Writer.Flush) 方法，用于刷新其底层的 `flate.Writer`。

- [`crypto/hmac`](/pkg/crypto/hmac/) 包新增了一个函数 [`Equal`](/pkg/crypto/hmac/#Equal)，用于比较两个 MAC 值。

- [`crypto/x509`](/pkg/crypto/x509/) 包现在支持 PEM 块（例如可参见 [`DecryptPEMBlock`](/pkg/crypto/x509/#DecryptPEMBlock)），并新增了一个函数 [`ParseECPrivateKey`](/pkg/crypto/x509/#ParseECPrivateKey) 用于解析椭圆曲线私钥。

- [`database/sql`](/pkg/database/sql/) 包的 [`DB`](/pkg/database/sql/#DB) 类型新增了一个 [`Ping`](/pkg/database/sql/#DB.Ping) 方法，用于测试连接的健康状况。

- [`database/sql/driver`](/pkg/database/sql/driver/) 包新增了一个 [`Queryer`](/pkg/database/sql/driver/#Queryer) 接口，[`Conn`](/pkg/database/sql/driver/#Conn) 可以实现此接口以提升性能。

- [`encoding/json`](/pkg/encoding/json/) 包的 [`Decoder`](/pkg/encoding/json/#Decoder) 新增了 [`Buffered`](/pkg/encoding/json/#Decoder.Buffered) 方法，可访问缓冲区中的剩余数据；同时新增了 [`UseNumber`](/pkg/encoding/json/#Decoder.UseNumber) 方法，可将值反序列化为新的 [`Number`](/pkg/encoding/json/#Number) 类型（字符串）而非 float64。

- [`encoding/xml`](/pkg/encoding/xml/) 包新增了一个函数 [`EscapeText`](/pkg/encoding/xml/#EscapeText)，用于写入转义后的 XML 输出；同时 [`Encoder`](/pkg/encoding/xml/#Encoder) 新增了 [`Indent`](/pkg/encoding/xml/#Encoder.Indent) 方法，用于指定缩进输出。

- 在 [`go/ast`](/pkg/go/ast/) 包中，新增了 [`CommentMap`](/pkg/go/ast/#CommentMap) 类型及相关方法，便于提取和处理 Go 程序中的注释。

- 在 [`go/doc`](/pkg/go/doc/) 包中，解析器现在能更好地跟踪代码中类似 `TODO(joe)` 的带样式注解，[`godoc`](/cmd/godoc/) 命令可依据 `-notes` 标志的值对这些信息进行过滤或展示。

- [`html/template`](/pkg/html/template/) 包中未文档化且仅部分实现的 "noescape" 功能已被移除；依赖该功能的程序将会无法运行。

- [`image/jpeg`](/pkg/image/jpeg/) 包现在可读取渐进式 JPEG 文件，并能处理更多种子采样配置。

- [`io`](/pkg/io/) 包现在导出了 [`io.ByteWriter`](/pkg/io/#ByteWriter) 接口，以封装逐字节写入的通用功能。同时导出了一个新的错误 [`ErrNoProgress`](/pkg/io/#ErrNoProgress)，用于指示 `Read` 实现循环执行但未提供数据。

- [`log/syslog`](/pkg/log/syslog/) 包现在为特定于操作系统的日志功能提供了更好的支持。

- [`math/big`](/pkg/math/big/) 包的 [`Int`](/pkg/math/big/#Int) 类型新增了 [`MarshalJSON`](/pkg/math/big/#Int.MarshalJSON) 和 [`UnmarshalJSON`](/pkg/math/big/#Int.UnmarshalJSON) 方法，用于与 JSON 表示形式进行转换。此外，[`Int`](/pkg/math/big/#Int) 现在可通过 [`Uint64`](/pkg/math/big/#Int.Uint64) 和 [`SetUint64`](/pkg/math/big/#Int.SetUint64) 直接与 `uint64` 进行转换；而 [`Rat`](/pkg/math/big/#Rat) 则可通过 [`Float64`](/pkg/math/big/#Rat.Float64) 和 [`SetFloat64`](/pkg/math/big/#Rat.SetFloat64) 与 `float64` 进行转换。

- [`mime/multipart`](/pkg/mime/multipart/) 包的 [`Writer`](/pkg/mime/multipart/#Writer) 新增了 [`SetBoundary`](/pkg/mime/multipart/#Writer.SetBoundary) 方法，用于定义打包输出的边界分隔符。[`Reader`](/pkg/mime/multipart/#Reader) 现在也能透明地解码任何 `quoted-printable` 部分，并在解码时移除 `Content-Transfer-Encoding` 头部。

- [`net`](/pkg/net/) 包的 [`ListenUnixgram`](/pkg/net/#ListenUnixgram) 函数的返回类型已更改：现在返回 [`UnixConn`](/pkg/net/#UnixConn) 而非 [`UDPConn`](/pkg/net/#UDPConn)，这显然是 Go 1.0 中的一个错误。由于此 API 变更修复了一个缺陷，因此被 Go 1 兼容性规则所允许。

- [`net`](/pkg/net/) 包新增了一个类型 [`Dialer`](/pkg/net/#Dialer)，用于为 [`Dial`](/pkg/net/#Dialer.Dial) 提供选项。

- [`net`](/pkg/net/) 包新增了对带区域限定符的链路本地 IPv6 地址（如 `fe80::1%lo0`）的支持。地址结构体 [`IPAddr`](/pkg/net/#IPAddr)、[`UDPAddr`](/pkg/net/#UDPAddr) 和 [`TCPAddr`](/pkg/net/#TCPAddr) 在新字段中记录区域信息，而期望接收这些地址字符串形式的函数（如 [`Dial`](/pkg/net/#Dial)、[`ResolveIPAddr`](/pkg/net/#ResolveIPAddr)、[`ResolveUDPAddr`](/pkg/net/#ResolveUDPAddr) 和 [`ResolveTCPAddr`](/pkg/net/#ResolveTCPAddr)）现在也接受带区域限定符的形式。

- [`net`](/pkg/net/) 包在其解析函数集中增加了 [`LookupNS`](/pkg/net/#LookupNS)。`LookupNS` 返回主机名的 [NS 记录](/pkg/net/#NS)。

- [`net`](/pkg/net/) 包为 [`IPConn`](/pkg/net/#IPConn)（[`ReadMsgIP`](/pkg/net/#IPConn.ReadMsgIP) 和 [`WriteMsgIP`](/pkg/net/#IPConn.WriteMsgIP)）和 [`UDPConn`](/pkg/net/#UDPConn)（[`ReadMsgUDP`](/pkg/net/#UDPConn.ReadMsgUDP) 和 [`WriteMsgUDP`](/pkg/net/#UDPConn.WriteMsgUDP)）添加了特定于协议的包读写方法。这些是 [`PacketConn`](/pkg/net/#PacketConn) 的 `ReadFrom` 和 `WriteTo` 方法的特化版本，提供了对与数据包关联的带外数据的访问。

- [`net`](/pkg/net/) 包为 [`UnixConn`](/pkg/net/#UnixConn) 添加了方法，允许关闭连接的一半（[`CloseRead`](/pkg/net/#UnixConn.CloseRead) 和 [`CloseWrite`](/pkg/net/#UnixConn.CloseWrite)），与 [`TCPConn`](/pkg/net/#TCPConn) 的现有方法一致。

- [`net/http`](/pkg/net/http/) 包包含多项新增内容。[`ParseTime`](/pkg/net/http/#ParseTime) 解析时间字符串，尝试多种常见的 HTTP 时间格式。[`Request`](/pkg/net/http/#Request) 的 [`PostFormValue`](/pkg/net/http/#Request.PostFormValue) 方法类似于 [`FormValue`](/pkg/net/http/#Request.FormValue)，但会忽略 URL 参数。[`CloseNotifier`](/pkg/net/http/#CloseNotifier) 接口为服务器处理程序提供了一种机制，用于发现客户端何时断开连接。`ServeMux` 类型现在有了 [`Handler`](/pkg/net/http/#ServeMux.Handler) 方法，可以在不执行路径的 `Handler` 的情况下访问它。`Transport` 现在可以通过 [`CancelRequest`](/pkg/net/http/#Transport.CancelRequest) 取消正在进行的请求。最后，当 [`Response.Body`](/pkg/net/http/#Response) 在完全消耗前被关闭时，`Transport` 现在能更积极地关闭 TCP 连接。

- [`net/mail`](/pkg/net/mail/) 包新增了两个函数：[`ParseAddress`](/pkg/net/mail/#ParseAddress) 和 [`ParseAddressList`](/pkg/net/mail/#ParseAddressList)，用于将 RFC 5322 格式的邮件地址解析为 [`Address`](/pkg/net/mail/#Address) 结构体。

- [`net/smtp`](/pkg/net/smtp/) 包的 [`Client`](/pkg/net/smtp/#Client) 类型新增了一个 [`Hello`](/pkg/net/smtp/#Client.Hello) 方法，用于向服务器发送 `HELO` 或 `EHLO` 消息。

- [`net/textproto`](/pkg/net/textproto/) 包新增了两个函数：[`TrimBytes`](/pkg/net/textproto/#TrimBytes) 和 [`TrimString`](/pkg/net/textproto/#TrimString)，用于对前导和尾随空格进行仅 ASCII 的修剪。

- 新方法 [`os.FileMode.IsRegular`](/pkg/os/#FileMode.IsRegular) 使得判断一个文件是否为普通文件变得简单。

- [`os/signal`](/pkg/os/signal/) 包新增了一个函数 [`Stop`](/pkg/os/signal/#Stop)，用于停止该包向通道传递任何进一步的信号。

- [`regexp`](/pkg/regexp/) 包现在通过 [`Regexp.Longest`](/pkg/regexp/#Regexp.Longest) 方法支持 Unix 传统的最左最长匹配；同时 [`Regexp.Split`](/pkg/regexp/#Regexp.Split) 可根据正则表达式定义的分隔符将字符串分割成片段。

- [`runtime/debug`](/pkg/runtime/debug/) 包新增了三个与内存使用相关的函数。[`FreeOSMemory`](/pkg/runtime/debug/#FreeOSMemory) 函数触发一次垃圾回收器运行，然后尝试将未使用的内存返还给操作系统；[`ReadGCStats`](/pkg/runtime/debug/#ReadGCStats) 函数检索有关回收器的统计信息；[`SetGCPercent`](/pkg/runtime/debug/#SetGCPercent) 提供了一种编程方式来控制回收器运行的频率，包括完全禁用它。

- [`sort`](/pkg/sort/) 包新增了一个函数 [`Reverse`](/pkg/sort/#Reverse)。在调用 [`sort.Sort`](/pkg/sort/#Sort) 时，用 `Reverse` 包装其参数会导致排序顺序反转。

- [`strings`](/pkg/strings/) 包新增了两个函数：[`TrimPrefix`](/pkg/strings/#TrimPrefix) 和 [`TrimSuffix`](/pkg/strings/#TrimSuffix)，其功能不言自明；同时新增了方法 [`Reader.WriteTo`](/pkg/strings/#Reader.WriteTo)，使得 [`Reader`](/pkg/strings/#Reader) 类型现在实现了 [`io.WriterTo`](/pkg/io/#WriterTo) 接口。

- [`syscall`](/pkg/syscall/) 包在各种 BSD（包括 Darwin）上的 [`Fchflags`](/pkg/syscall/#Fchflags) 函数签名已更改。它现在将 `int` 作为第一个参数，而不是字符串。由于此 API 变更修复了一个缺陷，因此被 Go 1 兼容性规则所允许。

- [`syscall`](/pkg/syscall/) 包也接收了大量更新，以使其更全面地包含每个受支持操作系统的常量和系统调用。

- [`testing`](/pkg/testing/) 包现在使用新的 [`AllocsPerRun`](/pkg/testing/#AllocsPerRun) 函数，在测试和基准测试中自动生成分配统计信息。[`testing.B`](/pkg/testing/#B) 上的 [`ReportAllocs`](/pkg/testing/#B.ReportAllocs) 方法将为调用它的基准测试启用内存分配统计信息的打印。它还引入了 [`BenchmarkResult`](/pkg/testing/#BenchmarkResult) 的 [`AllocsPerOp`](/pkg/testing/#BenchmarkResult.AllocsPerOp) 方法。此外，还有一个新的 [`Verbose`](/pkg/testing/#Verbose) 函数用于测试 `-v` 命令行标志的状态，以及 [`testing.B`](/pkg/testing/#B) 和 [`testing.T`](/pkg/testing/#T) 上的新方法 [`Skip`](/pkg/testing/#B.Skip)，用于简化跳过不适当的测试。

- 在 [`text/template`](/pkg/text/template/) 和 [`html/template`](/pkg/html/template/) 包中，模板现在可以使用括号对管道元素进行分组，从而简化复杂管道的构建。此外，作为新解析器的一部分，[`Node`](/pkg/text/template/parse/#Node) 接口新增了两个方法以提供更好的错误报告。尽管这违反了 Go 1 兼容性规则，但不应影响任何现有代码，因为该接口明确仅用于 [`text/template`](/pkg/text/template/) 和 [`html/template`](/pkg/html/template/) 包，并且有保障措施确保这一点。

- [`unicode`](/pkg/unicode/) 包的实现已更新至 Unicode 6.2.0 版本。

- 在 [`unicode/utf8`](/pkg/unicode/utf8/) 包中，新函数 [`ValidRune`](/pkg/unicode/utf8/#ValidRune) 报告该 rune 是否是有效的 Unicode 码点。一个 rune 要有效，必须处于范围内且不能是代理项的一半。