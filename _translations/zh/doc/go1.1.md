---
title: Go 1.1 发布说明
---

## Go 1.1 简介 {#introduction}

2012年3月发布的[Go语言1.0版本](/doc/go1.html)（简称Go 1或Go 1.0）开启了Go语言及其库的稳定期。这种稳定性滋养了全球范围内不断壮大的Go用户社区及其系统。此后发布的若干"点"版本——1.0.1、1.0.2和1.0.3——仅修复了已知错误，未对实现进行任何非关键性更改。

此次发布的新版本Go 1.1，在遵守[兼容性承诺](/doc/go1compat.html)的同时，引入了若干重要的（自然是向后兼容的）语言变更、一长串（同样兼容的）库变更，并对编译器、库和运行时进行了重大优化。重点聚焦于性能提升。基准测试充其量是一门不够精确的科学，但我们观察到许多测试程序的速度均有显著提升，有时甚至达到惊人程度。我们相信，许多用户程序只需更新Go安装并重新编译，也能获得性能改进。

本文档概述了Go 1与Go 1.1之间的变更。升级到Go 1.1后，绝大多数代码无需修改即可运行，尽管本次发布暴露了几个罕见的错误情况，若出现则需处理。详见下文，特别是关于[64位整数](#int)和[Unicode字面量](#unicode_literals)的讨论。

## 语言变更 {#language}

[Go语言兼容性文档](/doc/go1compat.html)承诺：为Go 1语言规范编写的程序将继续正常运行，这些承诺得以维持。然而，为了完善规范，我们对某些错误情况的细节进行了明确说明，并引入了一些新的语言特性。

### 整数除以零 {#divzero}

在Go 1中，整数除以常量零会导致运行时恐慌：

	func f(x int) int {
		return x/0
	}

在Go 1.1中，整数除以常量零不是合法程序，因此会导致编译时错误。

### Unicode字面量中的代理项 {#unicode_literals}

字符串和rune字面量的定义已得到完善，从有效的Unicode码点集中排除了代理项的一半（surrogate halves）。更多信息请参见[Unicode](#unicode)章节。

### 方法值 {#method_values}

Go 1.1现在实现了[方法值](/ref/spec#Method_values)，即已绑定到特定接收器值的函数。例如，给定一个[`Writer`](/pkg/bufio/#Writer)类型的值`w`，表达式`w.Write`（一个方法值）是一个将始终向`w`写入的函数；它等价于一个捕获了`w`的函数字面量：

	func (p []byte) (n int, err error) {
		return w.Write(p)
	}

方法值不同于方法表达式，后者从给定类型的方法生成函数；方法表达式`(*bufio.Writer).Write`等价于一个带有额外第一参数（类型为`(*bufio.Writer)`的接收器）的函数：

	func (w *bufio.Writer, p []byte) (n int, err error) {
		return w.Write(p)
	}

_更新提示_：现有代码不受影响；此更改是严格向后兼容的。

### 返回要求 {#return}

在Go 1.1之前，返回值的函数在末尾需要显式的`return`语句或调用`panic`；这是让程序员明确函数含义的一种简单方式。但在许多情况下，末尾的`return`显然是不必要的，例如只有无限`for`循环的函数。

在Go 1.1中，关于末尾`return`语句的规则更为宽松。它引入了[_终止语句_](/ref/spec#Terminating_statements)的概念，即保证是函数最后执行的语句。例如，没有条件的`for`循环以及每个分支都以`return`结尾的`if-else`语句。如果函数的最后一条语句可以在语法上被证明是终止语句，则不需要末尾的`return`语句。

请注意，此规则纯粹是语法性的：它不关注代码中的值，因此不需要复杂的分析。

_更新提示_：此更改是向后兼容的，但现有代码中多余的`return`语句和对`panic`的调用可以手动简化。可以通过`go vet`识别此类代码。

## 实现与工具变更 {#impl}

### gccgo的状态 {#gccgo}

GCC的发布周期与Go的发布周期并不一致，因此`gccgo`的发布版本之间难免存在一些差异。GCC 4.8.0版本于2013年3月发布，包含了一个接近Go 1.1版本的`gccgo`。其库版本略落后于正式发布，最大的区别在于方法值尚未实现。我们预计GCC 4.8.2版本（大约在2013年7月左右发布）将包含一个提供完整Go 1.1实现的`gccgo`。

### 命令行标志解析 {#gc_flag}

在gc工具链中，编译器和链接器现在使用与Go的`flag`包相同的命令行标志解析规则，这与传统的Unix标志解析有所不同。这可能会影响直接调用该工具的脚本。例如，`go tool 6c -Fw -Dfoo`现在必须写作`go tool 6c -F -w -D foo`。

### 64位平台上int的大小 {#int}

语言规范允许实现选择`int`和`uint`类型是32位还是64位。之前的Go实现在所有系统上都将`int`和`uint`设为32位。现在，gc和gccgo实现在AMD64/x86-64等64位平台上都将`int`和`uint`设为64位。除其他优点外，这使得在64位平台上可以分配超过20亿元素的切片（slice）。_更新_：
大多数程序不会受此更改影响。
由于 Go 不允许在不同[数值类型](/ref/spec#Numeric_types)之间进行隐式转换，
因此不会有任何程序因该更改而无法编译。
然而，那些隐含假设 `int` 仅为 32 位的程序，其行为可能会改变。
例如，以下代码在 64 位系统上会打印一个正数，在 32 位系统上则会打印一个负数：

	x := ^uint32(0) // x 为 0xffffffff
	i := int(x)     // 在 32 位系统上 i 为 -1，在 64 位系统上为 0xffffffff
	fmt.Println(i)

希望实现 32 位符号扩展（在所有系统上都得到 `-1`）的可移植代码应改为：

	i := int(int32(x))

### 64 位架构上的堆大小 {#heap}

在 64 位架构上，最大堆大小已大幅增加，
从几 GB 增至数十 GB。
（具体细节取决于系统，并且可能会改变。）

在 32 位架构上，堆大小未发生变化。

_更新_：
此更改对现有程序应无影响，只是允许它们使用更大的堆运行。

### Unicode {#unicode}

为了能够在 UTF-16 中表示大于 65535 的码点，
Unicode 定义了 _代理对_（surrogate halves），
这是一组仅在组装大数值时才使用的码点范围，并且仅限于 UTF-16 编码。
该代理范围内的码点用于任何其他目的都是非法的。
在 Go 1.1 中，编译器、库和运行时均遵循此约束：
代理半码点作为 rune 值、以 UTF-8 编码时，或单独以 UTF-16 编码时都是非法的。
当遇到这种情况时（例如从 rune 转换为 UTF-8），它将被视为编码错误，
并返回替代符 [`utf8.RuneError`](/pkg/unicode/utf8/#RuneError)，
即 U+FFFD。

程序

	import "fmt"

	func main() {
	    fmt.Printf("%+q\n", string(0xD800))
	}

在 Go 1.0 中会打印 `"\ud800"`，而在 Go 1.1 中会打印 `"\ufffd"`。

代理半 Unicode 值现在在 rune 和字符串常量中是非法的，
因此编译器现在会拒绝诸如 `'\ud800'` 和 `"\ud800"` 之类的常量。
如果明确写成 UTF-8 编码的字节，此类字符串仍然可以创建，例如 `"\xed\xa0\x80"`。
但是，当此类字符串被解码为 rune 序列时（例如在 range 循环中），它将只产生 `utf8.RuneError` 值。

以 UTF-8 编码的 Unicode 字节顺序标记 U+FEFF，现在被允许作为 Go 源文件的第一个字符。
尽管在无字节序的 UTF-8 编码中其出现显然是不必要的，但某些编辑器会将其作为一种标识 UTF-8 编码文件的"魔数"添加。

_更新_：
大多数程序不会受代理半码点更改的影响。
依赖旧行为的程序应进行修改以避免此问题。
字节顺序标记的更改是严格向后兼容的。

### 竞态检测器 {#race}

工具的一个主要新增功能是 _竞态检测器_，这是一种发现由并发访问同一变量（其中至少一个访问是写入）引起的程序错误的方法。
这个新工具已内置于 `go` 工具中。
目前，它仅适用于具有 64 位 x86 处理器的 Linux、Mac OS X 和 Windows 系统。
要启用它，请在构建或测试程序时设置 `-race` 标志（例如 `go test -race`）。
竞态检测器在[单独的文章](/doc/articles/race_detector.html)中有文档说明。

### gc 汇编器 {#gc_asm}

由于 [`int`](#int) 改为 64 位以及新的[函数内部表示方式](/s/go11func)，
在 gc 工具链中，函数参数在栈上的排列方式发生了变化。
用汇编编写的函数至少需要修订以调整帧指针偏移量。

_更新_：
`go vet` 命令现在会检查汇编实现的函数是否与其对应的 Go 函数原型匹配。

### go 命令的更改 {#gocmd}

[`go`](/cmd/go/) 命令进行了一些更改，旨在改善新 Go 用户的体验。

首先，在编译、测试或运行 Go 代码时，当无法找到包时，`go` 命令现在会给出更详细的错误消息，包括已搜索的路径列表。

	$ go build foo/quxx
	can't load package: package foo/quxx: cannot find package "foo/quxx" in any of:
	        /home/you/go/src/pkg/foo/quxx (from $GOROOT)
	        /home/you/src/foo/quxx (from $GOPATH)

其次，`go get` 命令不再允许将 `$GOROOT` 作为下载包源代码时的默认目标目录。
现在，要使用 `go get` 命令，需要一个[有效的 `$GOPATH`](/doc/code.html#GOPATH)。

	$ GOPATH= go get code.google.com/p/foo/quxx
	package code.google.com/p/foo/quxx: cannot download, $GOPATH not set. For more details see: go help gopath

最后，由于上述更改，当 `$GOPATH` 和 `$GOROOT` 设置为相同值时，`go get` 命令也会失败。

	$ GOPATH=$GOROOT go get code.google.com/p/foo/quxx
	warning: GOPATH set to GOROOT (/home/you/go) has no effect
	package code.google.com/p/foo/quxx: cannot download, $GOPATH must not be set to $GOROOT. For more details see: go help gopath

### go test 命令的更改 {#gotest}

当启用性能分析时，[`go test`](/cmd/go/#hdr-Test_packages) 命令不再删除生成的二进制文件，以便于分析分析数据。
其实现会自动设置 `-c` 标志，因此在运行

	$ go test -cpuprofile cpuprof.out mypackage

后，`mypackage.test` 文件将保留在运行 `go test` 的目录中。

[`go test`](/cmd/go/#hdr-Test_packages) 命令现在可以生成性能分析信息，
报告 goroutine 在何处被阻塞，即它们倾向于在何处等待事件（如通道通信）而停滞。
该信息以 _阻塞分析_ 的形式呈现，
通过 `go test` 的 `-blockprofile` 选项启用。
运行 `go help test` 以获取更多信息。

### go fix 命令的更改 {#gofix}**go fix 命令的更改** {#gofix}

[`fix`](/cmd/fix/) 命令（通常以 `go fix` 运行）不再应用用于将 Go 1 之前的代码更新为使用 Go 1 APIs 的修复。
若要将 Go 1 之前的代码更新到 Go 1.1，请首先使用 Go 1.0 工具链将代码转换为 Go 1.0。

### 构建约束 {#tags}

“`go1.1`” 标签已添加到默认[构建约束](/pkg/go/build/#hdr-Build_Constraints)列表中。
这允许各个包利用 Go 1.1 中的新特性，同时保持与 Go 早期版本的兼容性。

要仅用 Go 1.1 及更高版本编译某个文件，请添加此构建约束：

	// +build go1.1

要仅用 Go 1.0.x 编译某个文件，请使用相反的约束：

	// +build !go1.1

### 新增平台支持 {#platforms}

Go 1.1 工具链增加了对 `freebsd/arm`、`netbsd/386`、`netbsd/amd64`、`netbsd/arm`、`openbsd/386` 和 `openbsd/amd64` 平台的实验性支持。

对于 `freebsd/arm` 或 `netbsd/arm`，需要 ARMv6 或更新版本的处理器。

Go 1.1 为 `linux/arm` 平台上的 `cgo` 增加了实验性支持。

### 交叉编译 {#crosscompile}

在进行交叉编译时，`go` 工具默认会禁用 `cgo` 支持。

要显式启用 `cgo`，请设置 `CGO_ENABLED=1`。

## 性能 {#performance}

使用 Go 1.1 gc 工具套件编译的代码，对于大多数 Go 程序，其性能应有显著提升。
相对于 Go 1.0，典型的改进幅度似乎在 30%-40% 左右，有时甚至更多，但偶尔也可能较少甚至没有明显提升。
工具和库中有太多以性能为导向的小调整，无法在此一一列举，但以下主要变更值得注意：

  - gc 编译器在许多情况下生成了更优的代码，最显著的是在 32 位 Intel 架构上的浮点运算方面。
  - gc 编译器进行了更多的内联优化，包括对运行时中某些操作（如 [`append`](/pkg/builtin/#append) 和接口转换）的优化。
  - Go map 有了新的实现，显著减少了内存占用和 CPU 时间。
  - 垃圾回收器的并行性得到增强，这可以降低在多个 CPU 上运行的程序的延迟。
  - 垃圾回收器也更加精确，这会消耗少量 CPU 时间，但可以显著减小堆的大小，尤其是在 32 位架构上。
  - 由于运行时和网络库耦合更紧密，网络操作所需的上下文切换减少了。

## 标准库的更改 {#library}

### bufio.Scanner {#bufio_scanner}

[`bufio`](/pkg/bufio/) 包中用于扫描文本输入的各种例程，如 [`ReadBytes`](/pkg/bufio/#Reader.ReadBytes)、[`ReadString`](/pkg/bufio/#Reader.ReadString)，特别是 [`ReadLine`](/pkg/bufio/#Reader.ReadLine)，对于简单用途来说，使用起来过于复杂。
在 Go 1.1 中，新增了一个类型 [`Scanner`](/pkg/bufio/#Scanner)，使得执行诸如将输入读取为行序列或空格分隔的单词等简单任务变得更加容易。
它通过在遇到有问题的输入（例如异常长的行）时终止扫描，并采用一个简单的默认行为（面向行的输入，并去除每行的终止符）来简化问题。
以下是逐行重现输入的代码示例：

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
	    fmt.Println(scanner.Text()) // Println 会添加回最后的 '\n'
	}
	if err := scanner.Err(); err != nil {
	    fmt.Fprintln(os.Stderr, "reading standard input:", err)
	}

可以通过一个函数来调整扫描行为以控制输入的细分（参见 [`SplitFunc`](/pkg/bufio/#SplitFunc) 的文档），但对于棘手的问题或需要跳过错误继续扫描的情况，可能仍然需要使用旧的接口。

### net {#net}

[`net`](/pkg/net/) 包中特定于协议的解析器以前对传入的网络名称较为宽松。
尽管文档明确指出 [`ResolveTCPAddr`](/pkg/net/#ResolveTCPAddr) 的有效网络仅为 `"tcp"`、`"tcp4"` 和 `"tcp6"`，但 Go 1.0 的实现会静默接受任何字符串。
Go 1.1 的实现则会在网络不是这些字符串之一时返回错误。
其他特定于协议的解析器 [`ResolveIPAddr`](/pkg/net/#ResolveIPAddr)、[`ResolveUDPAddr`](/pkg/net/#ResolveUDPAddr) 和 [`ResolveUnixAddr`](/pkg/net/#ResolveUnixAddr) 也是如此。

[`ListenUnixgram`](/pkg/net/#ListenUnixgram) 的先前实现返回一个 [`UDPConn`](/pkg/net/#UDPConn) 作为连接端点的表示。
Go 1.1 的实现则改为返回一个 [`UnixConn`](/pkg/net/#UnixConn)，以便可以使用其 [`ReadFrom`](/pkg/net/#UnixConn.ReadFrom) 和 [`WriteTo`](/pkg/net/#UnixConn.WriteTo) 方法进行读写。

数据结构 [`IPAddr`](/pkg/net/#IPAddr)、[`TCPAddr`](/pkg/net/#TCPAddr) 和 [`UDPAddr`](/pkg/net/#UDPAddr) 增加了一个名为 `Zone` 的新字符串字段。
使用非标签组合字面量（例如 `net.TCPAddr{ip, port}`）而非带标签的字面量（`net.TCPAddr{IP: ip, Port: port}`）的代码将会因新字段而中断。
Go 1 兼容性规则允许此更改：客户端代码必须使用带标签的字面量以避免此类中断。

_更新方法_：
要修正由新结构体字段引起的中断，`go fix` 将重写代码为这些类型添加标签。
更普遍地，`go vet` 将标识出应修改为使用字段标签的组合字面量。

### reflect {#reflect}

[`reflect`](/pkg/reflect/) 包有几个重要的新增功能。

现在可以使用 `reflect` 包来运行 `select` 语句；详情请参阅 [`Select`](/pkg/reflect/#Select) 和 [`SelectCase`](/pkg/reflect/#SelectCase) 的描述。

新方法 [`Value.Convert`](/pkg/reflect/#Value.Convert)（或 [`Type.ConvertibleTo`](/pkg/reflect/#Type)）提供了对 [`Value`](/pkg/reflect/#Value) 执行 Go 转换或类型断言操作（或测试其可能性）的功能。新增的
[`MakeFunc`](/pkg/reflect/#MakeFunc)
函数创建一个包装函数，以便更容易地使用现有的
[`Values`](/pkg/reflect/#Value)
调用函数，并在参数间执行标准的 Go 类型转换，例如将实际的 `int` 传递给形式参数 `interface{}`。

最后，新增的
[`ChanOf`](/pkg/reflect/#ChanOf)、
[`MapOf`](/pkg/reflect/#MapOf)
和
[`SliceOf`](/pkg/reflect/#SliceOf)
函数根据现有类型构造新的
[`Types`](/pkg/reflect/#Type)
，例如仅给定 `T` 即可构造类型 `[]T`。

### time {#time}

在 FreeBSD、Linux、NetBSD、OS X 和 OpenBSD 上，[`time`](/pkg/time/) 包的旧版本返回的时间精度为微秒。Go 1.1 在这些系统上的实现现在返回的时间精度为纳秒。对于写入外部格式（精度为微秒）然后读回并期望恢复原始值的程序，将受到精度损失的影响。[`Time`](/pkg/time/#Time) 类型新增了两个方法
[`Round`](/pkg/time/#Time.Round)
和
[`Truncate`](/pkg/time/#Time.Truncate)，
可在将时间传递给外部存储前移除其精度。

新增的
[`YearDay`](/pkg/time/#Time.YearDay)
方法返回时间值所指定的年份中，从 1 开始计数的整数日期序号。

[`Timer`](/pkg/time/#Timer)
类型新增了
[`Reset`](/pkg/time/#Timer.Reset)
方法，用于修改计时器使其在指定时长后到期。

最后，新增的
[`ParseInLocation`](/pkg/time/#ParseInLocation)
函数类似于现有的
[`Parse`](/pkg/time/#Parse)，
但它在指定位置（时区）上下文中解析时间，并忽略被解析字符串中的时区信息。该函数解决了时间 API 中一个常见的困惑点。

_更新说明_：
需要使用较低精度外部格式读写时间的代码，应修改为使用这些新方法。

### Exp 和 old 子树已移至 go.exp 和 go.text 子仓库 {#exp_old}

为了让二进制发行版在需要时更容易访问它们，`exp` 和 `old` 源代码子树（不包含在二进制发行版中）已移至新的 `go.exp` 子仓库，地址为 `code.google.com/p/go.exp`。例如，要访问 `ssa` 包，请运行

	$ go get code.google.com/p/go.exp/ssa

然后在 Go 源代码中，

	import "code.google.com/p/go.exp/ssa"

旧的 `exp/norm` 包也已移动，但迁移到了新的 `go.text` 仓库，Unicode API 及其他文本相关包将在那里进行开发。

### 新增包 {#new_packages}

新增了三个包。

  - [`go/format`](/pkg/go/format/) 包为程序提供了一种便捷的方式来使用
    [`go fmt`](/cmd/go/#hdr-Run_gofmt_on_package_sources) 命令的格式化功能。它包含两个函数：[`Node`](/pkg/go/format/#Node) 用于格式化 Go 解析器
    [`Node`](/pkg/go/ast/#Node)，
    [`Source`](/pkg/go/format/#Source)
    用于将任意 Go 源代码重新格式化为
    [`go fmt`](/cmd/go/#hdr-Run_gofmt_on_package_sources) 命令提供的标准格式。
  - [`net/http/cookiejar`](/pkg/net/http/cookiejar/) 包提供了管理 HTTP Cookie 的基础功能。
  - [`runtime/race`](/pkg/runtime/race/) 包提供了数据竞争检测的底层设施。它是竞态检测器的内部组件，不导出其他任何用户可见的功能。

### 库的次要更改 {#minor_library_changes}

以下列表总结了库中的一些次要更改，主要是新增内容。有关每项更改的更多详细信息，请参阅相关包的文档。- [`bytes`](/pkg/bytes/) 包新增了两个函数 [`TrimPrefix`](/pkg/bytes/#TrimPrefix) 和 [`TrimSuffix`](/pkg/bytes/#TrimSuffix)，其特性自明。此外，[`Buffer`](/pkg/bytes/#Buffer) 类型新增了 [`Grow`](/pkg/bytes/#Buffer.Grow) 方法，可提供对缓冲区内存分配的控制。最后，[`Reader`](/pkg/bytes/#Reader) 类型新增了 [`WriteTo`](/pkg/strings/#Reader.WriteTo) 方法，使其现在实现了 [`io.WriterTo`](/pkg/io/#WriterTo) 接口。

- [`compress/gzip`](/pkg/compress/gzip/) 包的 [`Writer`](/pkg/compress/gzip/#Writer) 类型新增了 [`Flush`](/pkg/compress/gzip/#Writer.Flush) 方法，用于刷新其底层的 `flate.Writer`。

- [`crypto/hmac`](/pkg/crypto/hmac/) 包新增了一个用于比较两个 MAC 的函数 [`Equal`](/pkg/crypto/hmac/#Equal)。

- [`crypto/x509`](/pkg/crypto/x509/) 包现在支持 PEM 块（例如参见 [`DecryptPEMBlock`](/pkg/crypto/x509/#DecryptPEMBlock)），并新增了用于解析椭圆曲线私钥的函数 [`ParseECPrivateKey`](/pkg/crypto/x509/#ParseECPrivateKey)。

- [`database/sql`](/pkg/database/sql/) 包的 [`DB`](/pkg/database/sql/#DB) 类型新增了用于测试连接健康状况的 [`Ping`](/pkg/database/sql/#DB.Ping) 方法。

- [`database/sql/driver`](/pkg/database/sql/driver/) 包新增了 [`Queryer`](/pkg/database/sql/driver/#Queryer) 接口，[`Conn`](/pkg/database/sql/driver/#Conn) 可实现此接口以提升性能。

- [`encoding/json`](/pkg/encoding/json/) 包的 [`Decoder`](/pkg/encoding/json/#Decoder) 新增了 [`Buffered`](/pkg/encoding/json/#Decoder.Buffered) 方法以提供对其缓冲区中剩余数据的访问，同时新增了 [`UseNumber`](/pkg/encoding/json/#Decoder.UseNumber) 方法，可将值反序列化为新类型 [`Number`](/pkg/encoding/json/#Number)（字符串类型）而非 float64。

- [`encoding/xml`](/pkg/encoding/xml/) 包新增了用于写入转义 XML 输出的函数 [`EscapeText`](/pkg/encoding/xml/#EscapeText)，并在 [`Encoder`](/pkg/encoding/xml/#Encoder) 上新增了 [`Indent`](/pkg/encoding/xml/#Encoder.Indent) 方法以指定缩进输出。

- 在 [`go/ast`](/pkg/go/ast/) 包中，新增了类型 [`CommentMap`](/pkg/go/ast/#CommentMap) 及相关方法，使得在 Go 程序中提取和处理注释更加便捷。

- 在 [`go/doc`](/pkg/go/doc/) 包中，解析器现在能更好地跟踪代码中的样式化注解（如 `TODO(joe)`），[`godoc`](/cmd/godoc/) 命令可根据 `-notes` 标志的值过滤或展示这些信息。

- [`html/template`](/pkg/html/template/) 包中未文档化且仅部分实现的 "noescape" 功能已被移除；依赖此功能的程序将无法运行。

- [`image/jpeg`](/pkg/image/jpeg/) 包现在能读取渐进式 JPEG 文件，并支持更多种子采样配置。

- [`io`](/pkg/io/) 包现在导出了 [`io.ByteWriter`](/pkg/io/#ByteWriter) 接口，以捕获逐字节写入的通用功能。同时导出了一个新错误 [`ErrNoProgress`](/pkg/io/#ErrNoProgress)，用于指示 `Read` 实现陷入循环且未提供数据。

- [`log/syslog`](/pkg/log/syslog/) 包现在为操作系统特定的日志功能提供了更好的支持。

- [`math/big`](/pkg/math/big/) 包的 [`Int`](/pkg/math/big/#Int) 类型现在拥有 [`MarshalJSON`](/pkg/math/big/#Int.MarshalJSON) 和 [`UnmarshalJSON`](/pkg/math/big/#Int.UnmarshalJSON) 方法，可在 JSON 表示形式之间进行转换。此外，[`Int`](/pkg/math/big/#Int) 现在可通过 [`Uint64`](/pkg/math/big/#Int.Uint64) 和 [`SetUint64`](/pkg/math/big/#Int.SetUint64) 直接与 `uint64` 进行转换，而 [`Rat`](/pkg/math/big/#Rat) 可通过 [`Float64`](/pkg/math/big/#Rat.Float64) 和 [`SetFloat64`](/pkg/math/big/#Rat.SetFloat64) 与 `float64` 进行同样的转换。

- [`mime/multipart`](/pkg/mime/multipart/) 包的 [`Writer`](/pkg/mime/multipart/#Writer) 新增了 [`SetBoundary`](/pkg/mime/multipart/#Writer.SetBoundary) 方法，用于定义打包输出时使用的边界分隔符。同时，[`Reader`](/pkg/mime/multipart/#Reader) 现在会透明地解码任何 `quoted-printable` 部分，并在解码时移除 `Content-Transfer-Encoding` 头。

- [`net`](/pkg/net/) 包的 [`ListenUnixgram`](/pkg/net/#ListenUnixgram) 函数更改了返回类型：它现在返回 [`UnixConn`](/pkg/net/#UnixConn) 而非 [`UDPConn`](/pkg/net/#UDPConn)，这在 Go 1.0 中显然是个错误。由于此 API 变更修复了一个错误，Go 1 兼容性规则允许此修改。

- [`net`](/pkg/net/) 包包含一个新类型 [`Dialer`](/pkg/net/#Dialer)，用于为 [`Dial`](/pkg/net/#Dialer.Dial) 提供选项。

- [`net`](/pkg/net/) 包新增了对带有区域限定符的链路本地 IPv6 地址（如 `fe80::1%lo0`）的支持。地址结构 [`IPAddr`](/pkg/net/#IPAddr)、[`UDPAddr`](/pkg/net/#UDPAddr) 和 [`TCPAddr`](/pkg/net/#TCPAddr) 现在新增了一个字段用于记录区域信息。同时，接受这些地址字符串形式的函数（如 [`Dial`](/pkg/net/#Dial)、[`ResolveIPAddr`](/pkg/net/#ResolveIPAddr)、[`ResolveUDPAddr`](/pkg/net/#ResolveUDPAddr) 和 [`ResolveTCPAddr`](/pkg/net/#ResolveTCPAddr)）现在也接受区域限定形式。

- [`net`](/pkg/net/) 包在其解析函数集中新增了 [`LookupNS`](/pkg/net/#LookupNS)。`LookupNS` 返回主机名的 [NS 记录](/pkg/net/#NS)。

- [`net`](/pkg/net/) 包为 [`IPConn`](/pkg/net/#IPConn)（[`ReadMsgIP`](/pkg/net/#IPConn.ReadMsgIP) 和 [`WriteMsgIP`](/pkg/net/#IPConn.WriteMsgIP)）和 [`UDPConn`](/pkg/net/#UDPConn)（[`ReadMsgUDP`](/pkg/net/#UDPConn.ReadMsgUDP) 和 [`WriteMsgUDP`](/pkg/net/#UDPConn.WriteMsgUDP)）新增了协议特定的数据包读写方法。这些是 [`PacketConn`](/pkg/net/#PacketConn) 的 `ReadFrom` 和 `WriteTo` 方法的特化版本，提供了对与数据包相关的带外数据的访问。

- [`net`](/pkg/net/) 包为 [`UnixConn`](/pkg/net/#UnixConn) 新增了方法以允许关闭连接的一半（[`CloseRead`](/pkg/net/#UnixConn.CloseRead) 和 [`CloseWrite`](/pkg/net/#UnixConn.CloseWrite)），与 [`TCPConn`](/pkg/net/#TCPConn) 的现有方法保持一致。

- [`net/http`](/pkg/net/http/) 包包含几项新增内容。[`ParseTime`](/pkg/net/http/#ParseTime) 解析时间字符串，会尝试多种常见的 HTTP 时间格式。[`Request`](/pkg/net/http/#Request) 的 [`PostFormValue`](/pkg/net/http/#Request.PostFormValue) 方法类似于 [`FormValue`](/pkg/net/http/#Request.FormValue)，但会忽略 URL 参数。[`CloseNotifier`](/pkg/net/http/#CloseNotifier) 接口为服务器处理程序提供了一种机制，用于发现客户端何时断开连接。`ServeMux` 类型现在拥有 [`Handler`](/pkg/net/http/#ServeMux.Handler) 方法，可在不执行的情况下访问路径的 `Handler`。`Transport` 现在可以通过 [`CancelRequest`](/pkg/net/http/#Transport.CancelRequest) 取消正在进行中的请求。最后，当 [`Response.Body`](/pkg/net/http/#Response) 在完全消费前被关闭时，Transport 现在会更积极地关闭 TCP 连接。

- [`net/mail`](/pkg/net/mail/) 包新增了两个函数 [`ParseAddress`](/pkg/net/mail/#ParseAddress) 和 [`ParseAddressList`](/pkg/net/mail/#ParseAddressList)，用于将 RFC 5322 格式的邮件地址解析为 [`Address`](/pkg/net/mail/#Address) 结构。

- [`net/smtp`](/pkg/net/smtp/) 包的 [`Client`](/pkg/net/smtp/#Client) 类型新增了 [`Hello`](/pkg/net/smtp/#Client.Hello) 方法，用于向服务器发送 `HELO` 或 `EHLO` 消息。

- [`net/textproto`](/pkg/net/textproto/) 包新增了两个函数 [`TrimBytes`](/pkg/net/textproto/#TrimBytes) 和 [`TrimString`](/pkg/net/textproto/#TrimString)，它们仅执行 ASCII 码的前导和尾随空格裁剪。

- 新方法 [`os.FileMode.IsRegular`](/pkg/os/#FileMode.IsRegular) 可方便地询问文件是否为普通文件。

- [`os/signal`](/pkg/os/signal/) 包新增了函数 [`Stop`](/pkg/os/signal/#Stop)，用于停止该包向通道传递任何进一步的信号。

- [`regexp`](/pkg/regexp/) 包现在通过 [`Regexp.Longest`](/pkg/regexp/#Regexp.Longest) 方法支持 Unix 原有的最左最长匹配，而 [`Regexp.Split`](/pkg/regexp/#Regexp.Split) 可根据正则表达式定义的分隔符将字符串分割成片段。

- [`runtime/debug`](/pkg/runtime/debug/) 包新增了三个与内存使用相关的函数。[`FreeOSMemory`](/pkg/runtime/debug/#FreeOSMemory) 函数触发垃圾回收运行，然后尝试将未使用的内存归还给操作系统；[`ReadGCStats`](/pkg/runtime/debug/#ReadGCStats) 函数检索关于回收器的统计信息；而 [`SetGCPercent`](/pkg/runtime/debug/#SetGCPercent) 提供了一种编程方式来控制回收器运行的频率，包括完全禁用它。

- [`sort`](/pkg/sort/) 包新增了函数 [`Reverse`](/pkg/sort/#Reverse)。将对 [`sort.Sort`](/pkg/sort/#Sort) 的调用的参数用 `Reverse` 包裹，会导致排序顺序反转。

- [`strings`](/pkg/strings/) 包新增了两个具有自明特性的函数 [`TrimPrefix`](/pkg/strings/#TrimPrefix) 和 [`TrimSuffix`](/pkg/strings/#TrimSuffix)，以及新方法 [`Reader.WriteTo`](/pkg/strings/#Reader.WriteTo)，使得 [`Reader`](/pkg/strings/#Reader) 类型现在实现了 [`io.WriterTo`](/pkg/io/#WriterTo) 接口。

- [`syscall`](/pkg/syscall/) 包在各种 BSD（包括 Darwin）上的 [`Fchflags`](/pkg/syscall/#Fchflags) 函数签名已更改。它现在将 `int` 作为第一个参数，而不是字符串。由于此 API 变更修复了一个错误，Go 1 兼容性规则允许此修改。

- [`syscall`](/pkg/syscall/) 包也收到了许多更新，使其更全面地包含每个支持操作系统的常量和系统调用。

- [`testing`](/pkg/testing/) 包现在通过新的 [`AllocsPerRun`](/pkg/testing/#AllocsPerRun) 函数，自动化了测试和基准测试中分配统计信息的生成。同时，[`testing.B`](/pkg/testing/#B) 上的 [`ReportAllocs`](/pkg/testing/#B.ReportAllocs) 方法将启用调用基准测试的内存分配统计信息打印。它还引入了 [`BenchmarkResult`](/pkg/testing/#BenchmarkResult) 的 [`AllocsPerOp`](/pkg/testing/#BenchmarkResult.AllocsPerOp) 方法。此外，新增了 [`Verbose`](/pkg/testing/#Verbose) 函数以测试 `-v` 命令行标志的状态，以及 [`testing.B`](/pkg/testing/#B) 和 [`testing.T`](/pkg/testing/#T) 上的新方法 [`Skip`](/pkg/testing/#B.Skip)，以简化跳过不适当测试的操作。

- 在 [`text/template`](/pkg/text/template/) 和 [`html/template`](/pkg/html/template/) 包中，模板现在可以使用括号来分组管道的元素，简化了复杂管道的构建。此外，作为新解析器的一部分，[`Node`](/pkg/text/template/parse/#Node) 接口新增了两个方法以提供更好的错误报告。虽然这违反了 Go 1 兼容性规则，但应不会影响现有代码，因为此接口明确设计为仅由 [`text/template`](/pkg/text/template/) 和 [`html/template`](/pkg/html/template/) 包使用，并有保障措施确保这一点。

- [`unicode`](/pkg/unicode/) 包的实现已更新至 Unicode 6.2.0 版本。

- 在 [`unicode/utf8`](/pkg/unicode/utf8/) 包中，新函数 [`ValidRune`](/pkg/unicode/utf8/#ValidRune) 报告一个符文是否为有效的 Unicode 码点。要有效，符文必须在范围内且不是代理半区。