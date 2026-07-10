---
title: Go 1.6 发布说明
-->

<!--
编辑规则：将所有 `PKG:([a-z][A-Za-z0-9_/]+)` 格式的内容替换为 `<a href="/pkg/\1/"><code>\1</code></a>`
编辑规则：将所有 `([a-z][A-Za-z0-9_/]+)\.([A-Z][A-Za-z0-9_]+\.)?([A-Z][A-Za-z0-9_]+)([ .',]|$)` 格式的内容替换为 `<a href="/pkg/\1/#\2\3"><code>\3</code></a>\4`
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.6 简介 {#introduction}

Go 语言的最新版本 1.6，在 1.5 发布六个月后到来。
其大部分变更集中在语言实现、运行时和库方面。
语言规范本身没有变化。
一如既往，本版本遵循 Go 1 的[兼容性承诺](/doc/go1compat.html)。
我们预计几乎所有的 Go 程序都能像以前一样继续编译和运行。

本次发布新增了对 [64 位 MIPS 架构的 Linux 和 32 位 x86 架构的 Android](#ports) 的移植支持；
定义并强制执行了[与 C 共享 Go 指针的规则](#cgo)；
提供了透明、自动的 [HTTP/2 支持](#http2)；
以及一种用于[模板复用](#template)的新机制。

## 语言变更 {#language}

本次发布没有语言层面的变更。

## 移植支持 {#ports}

Go 1.6 增加了对 64 位 MIPS 架构的 Linux（`linux/mips64` 和 `linux/mips64le`）的实验性移植支持。
这些移植版本支持 `cgo`，但仅限于内部链接模式。

Go 1.6 还增加了对 32 位 x86 架构的 Android（`android/386`）的实验性移植支持。

在 FreeBSD 上，Go 1.6 默认使用 `clang` 而非 `gcc` 作为外部 C 编译器。

在小端序的 64 位 PowerPC 架构的 Linux（`linux/ppc64le`）上，
Go 1.6 现在支持使用外部链接的 `cgo`，
并且功能大致完整。

在 NaCl 上，Go 1.5 要求 SDK 版本为 pepper-41。
Go 1.6 增加了对更高版本 SDK 的支持。

在使用 `-dynlink` 或 `-shared` 编译模式的 32 位 x86 系统上，
寄存器 CX 现在会被某些内存引用覆盖，因此应避免在手写汇编中使用。
详情请参阅[汇编文档](/doc/asm#x86)。

## 工具 {#tools}

### Cgo {#cgo}

[`cgo`](/cmd/cgo/) 有一个主要变更和一个次要变更。

主要变更是定义了与 C 代码共享 Go 指针的规则，
以确保此类 C 代码能与 Go 的垃圾回收器共存。
简而言之，Go 和 C 可以共享由 Go 分配的内存，
前提是该内存的指针在 `cgo` 调用中传递给 C，
且该内存本身不包含指向 Go 分配内存的指针，
并且 C 在调用返回后不保留该指针。
这些规则在程序执行期间由运行时检查：
如果运行时检测到违规，它会打印诊断信息并使程序崩溃。
可以通过设置环境变量 `GODEBUG=cgocheck=0` 来禁用这些检查，
但请注意，被检查识别出的绝大多数代码在某种程度上都与垃圾回收存在微妙的不兼容性。
禁用检查通常只会导致更难以理解的故障模式。
强烈建议优先修复相关代码，而不是关闭检查。
更多详情请参阅 [`cgo` 文档](/cmd/cgo/#hdr-Passing_pointers)。

次要变更是增加了显式的 `C.complexfloat` 和 `C.complexdouble` 类型，
它们与 Go 的 `complex64` 和 `complex128` 是分开的。
与其他数值类型类似，C 的复数类型和 Go 的复数类型不再可互换。

### 编译器工具链 {#compiler}

编译器工具链基本没有变化。
内部最显著的变化是解析器现在是手写的，
而不是从 [yacc](/cmd/yacc/) 生成的。

编译器、链接器和 `go` 命令有一个新标志 `-msan`，
类似于 `-race`，仅在 linux/amd64 上可用，
它启用了与 [Clang MemorySanitizer](https://clang.llvm.org/docs/MemorySanitizer.html) 的互操作。
这种互操作主要用于测试包含可疑 C 或 C++ 代码的程序。

链接器有一个新选项 `-libgcc`，用于在链接 [`cgo`](/cmd/cgo/) 代码时设置
预期的 C 编译器支持库位置。
该选项仅在使用 `-linkmode=internal` 时被参考，
并且可以将其设置为 `none` 以禁用支持库的使用。

[Go 1.5 开始的构建模式实现](/doc/go1.5#link)已扩展到更多系统。
本版本增加了对 `android/386`、`android/amd64`、`android/arm64`、`linux/386` 和 `linux/arm64` 上 `c-shared` 模式的支持；
对 `linux/386`、`linux/arm`、`linux/amd64` 和 `linux/ppc64le` 上 `shared` 模式的支持；
以及对新的 `pie` 模式（生成位置无关可执行文件）在 `android/386`、`android/amd64`、`android/arm`、`android/arm64`、`linux/386`、`linux/amd64`、`linux/arm`、`linux/arm64` 和 `linux/ppc64le` 上的支持。
详情请参阅[设计文档](/s/execmodes)。

提醒一下，链接器的 `-X` 标志在 Go 1.5 中有所改变。
在 Go 1.4 及更早版本中，它需要两个参数，例如：

	-X importpath.name value

Go 1.5 添加了一种使用单个参数的替代语法，
该参数本身是一个 `name=value` 对：

	-X importpath.name=value

在 Go 1.5 中，旧语法仍然被接受，但会打印一条警告，建议使用新语法。
Go 1.6 继续接受旧语法并打印警告。
Go 1.7 将移除对旧语法的支持。

### Gccgo {#gccgo}

GCC 和 Go 项目的发布时间表并不一致。
GCC 5 版本包含的是 Go 1.4 版本的 gccgo。
下一个版本 GCC 6 将包含 Go 1.6.1 版本的 gccgo。

### Go 命令 {#go_command}

[`go`](/cmd/go) 命令的基本操作没有变化，
但有一些值得注意的更改。

Go 1.5 引入了对 vendor 机制的实验性支持，
通过将 `GO15VENDOREXPERIMENT` 环境变量设置为 `1` 来启用。
Go 1.6 保留了该 vendor 支持（不再被视为实验性功能），
并且默认启用它。
可以通过显式地将 `GO15VENDOREXPERIMENT` 环境变量设置为 `0` 来禁用它。
Go 1.7 将移除对该环境变量的支持。默认启用供应商目录（vendoring）机制最可能引发的问题是，源码树中已存在名为 `vendor` 的目录，但该目录原本并不打算按照新的供应商目录语义被解析。在这种情况下，最简单的修复方法是将该目录重命名为非 `vendor` 的任何名称，并更新所有受影响的导入路径。

有关供应商目录的详细信息，请参阅 [`go` 命令文档](/cmd/go/#hdr-Vendor_Directories)和[设计文档](/s/go15vendor)。

新增了一个构建标志 `-msan`，用于编译支持 LLVM 内存消毒器（memory sanitizer）的 Go 程序。这主要适用于链接正在使用内存消毒器进行检查的 C 或 C++ 代码时。

### Go doc 命令 {#doc_command}

Go 1.5 引入了 [`go doc`](/cmd/go/#hdr-Show_documentation_for_package_or_symbol) 命令，允许仅使用包名来引用包，例如 `go` `doc` `http`。当存在歧义时，Go 1.5 的行为是使用字典序最靠前的导入路径对应的包。在 Go 1.6 中，歧义解析的规则变为优先选择元素更少的导入路径，若元素数量相同则使用字典序比较。此变更的一个重要影响是，现在会优先选择原始包副本而非供应商目录中的副本。成功搜索的执行速度也通常会更快。

### Go vet 命令 {#vet_command}

[`go vet`](/cmd/vet) 命令现在能够诊断将函数或方法值作为参数传递给 `Printf` 的情况，例如在本应传递 `f()` 的地方传递了 `f`。

## 性能 {#performance}

一如既往，由于变更过于普遍和多样，很难对性能做出精确的陈述。某些程序可能会运行得更快，某些则可能更慢。平均而言，Go 1 基准测试套件中的程序在 Go 1.6 下比在 Go 1.5 下运行速度快了几个百分点。垃圾回收器的暂停时间也比 Go 1.5 更低，特别是对于使用大量内存的程序。

通过显著的优化，以下标准库包的实现获得了超过 10% 的性能提升：
[`compress/bzip2`](/pkg/compress/bzip2/)、
[`compress/gzip`](/pkg/compress/gzip/)、
[`crypto/aes`](/pkg/crypto/aes/)、
[`crypto/elliptic`](/pkg/crypto/elliptic/)、
[`crypto/ecdsa`](/pkg/crypto/ecdsa/) 以及
[`sort`](/pkg/sort/)。

## 标准库 {#library}

### HTTP/2 {#http2}

Go 1.6 在 [`net/http`](/pkg/net/http/) 包中透明地增加了对新 [HTTP/2 协议](https://http2.github.io/)的支持。Go 的客户端和服务器在使用 HTTPS 时会自动适当地使用 HTTP/2。与 HTTP/1.1 一样，HTTP/2 协议处理细节没有导出的特定 API。

必须禁用 HTTP/2 的程序可以通过将 [`Transport.TLSNextProto`](/pkg/net/http/#Transport)（用于客户端）或 [`Server.TLSNextProto`](/pkg/net/http/#Server)（用于服务器）设置为一个非空的 map 来实现。

必须调整 HTTP/2 协议特定细节的程序可以导入并使用 [`golang.org/x/net/http2`](https://golang.org/x/net/http2)，特别是其 [ConfigureServer](https://godoc.org/golang.org/x/net/http2/#ConfigureServer) 和 [ConfigureTransport](https://godoc.org/golang.org/x/net/http2/#ConfigureTransport) 函数。

### 运行时 {#runtime}

运行时新增了对 map 并发误用的轻量级、尽力而为的检测。一如既往，如果一个 goroutine（协程）正在写入一个 map，那么其他任何 goroutine 都不应同时读写该 map。如果运行时检测到这种情况，它会打印诊断信息并使程序崩溃。要了解更多关于此问题的信息，最好在[竞态检测器](/blog/race-detector)下运行程序，它将更可靠地识别竞态条件并提供更详细的信息。

对于导致程序终止的 panic（恐慌），运行时现在默认仅打印正在运行的 goroutine 的栈信息，而不是所有存在的 goroutine 的栈信息。通常只有当前 goroutine 与 panic 相关，因此省略其他信息可以显著减少崩溃消息中的无关输出。若要查看崩溃消息中所有 goroutine 的栈信息，请设置环境变量 `GOTRACEBACK` 为 `all`，或在崩溃前调用 [`debug.SetTraceback`](/pkg/runtime/debug/#SetTraceback)，然后重新运行程序。详情请参阅[运行时文档](/pkg/runtime/#hdr-Environment_Variables)。

_更新说明_：
对于旨在转储整个程序状态的未捕获 panic，例如在检测到超时或显式处理接收到的信号时，现在应在 panic 前调用 `debug.SetTraceback("all")`。搜索 [`signal.Notify`](/pkg/os/signal/#Notify) 的使用可能有助于识别此类代码。

在 Windows 上，Go 1.5 及更早版本的 Go 程序在启动时会调用 `timeBeginPeriod(1)` 来强制将全局 Windows 定时器分辨率设置为 1ms。Go 为了获得良好的调度器性能不再需要此设置，并且更改全局定时器分辨率在某些系统上会导致问题，因此该调用已被移除。

当使用 `-buildmode=c-archive` 或 `-buildmode=c-shared` 构建归档文件或共享库时，信号处理方式发生了变化。在 Go 1.5 中，归档文件或共享库会为大多数信号安装信号处理程序。在 Go 1.6 中，它仅为处理 Go 代码运行时 panic 所需的同步信号安装信号处理程序：SIGBUS、SIGFPE、SIGSEGV。详情请参阅 [os/signal](/pkg/os/signal) 包文档。

### Reflect {#reflect}

[`reflect`](/pkg/reflect/) 包[解决了 gc 和 gccgo 工具链之间一个长期存在的不兼容问题](/issue/12367)，该问题涉及包含导出字段的未导出嵌入结构体类型。使用反射遍历数据结构的代码，特别是那些旨在实现类似 [`encoding/json`](/pkg/encoding/json/) 和 [`encoding/xml`](/pkg/encoding/xml/) 包中序列化功能的代码，可能需要更新。该问题出现在使用反射遍历一个**嵌入的未导出结构体类型字段**到该结构体的**导出字段**时。此前，`reflect` 包通过返回空的 `Field.PkgPath` 错误地将该嵌入字段报告为导出字段。现在它已正确报告该字段为未导出，但在评估对结构体内包含的导出字段的访问时会忽略这一事实。

_更新说明_：
通常，之前遍历结构体并使用

	f.PkgPath != ""

来排除不可访问字段的代码，现在应使用

	f.PkgPath != "" && !f.Anonymous

例如，请参见 [`encoding/json`](https://go-review.googlesource.com/#/c/14011/2/src/encoding/json/encode.go) 和 [`encoding/xml`](https://go-review.googlesource.com/#/c/14012/2/src/encoding/xml/typeinfo.go) 实现中的更改。

### 排序 {#sort}

在 [`sort`](/pkg/sort/) 包中，[`Sort`](/pkg/sort/#Sort) 的实现已被重写，使其对 [`Interface`](/pkg/sort/#Interface) 的 `Less` 和 `Swap` 方法的调用减少了约 10%，并相应地节省了整体时间。新算法对于值相等（即 `Less(i, j)` 和 `Less(j, i)` 都为 false 的那些对）的情况，选择了与之前不同的排序顺序。

_更新说明_：
`Sort` 的定义并不保证相等值的最终顺序，但新行为仍可能破坏那些期望特定顺序的程序。此类程序应细化其 `Less` 实现以报告所需的顺序，或切换到 [`Stable`](/pkg/sort/#Stable)，后者保留相等值的原始输入顺序。

### 模板 {#template}

在 [text/template](/pkg/text/template/) 包中，新增了两个重要特性，使得编写模板更加容易。

首先，现在可以[修剪模板操作周围的空格](/pkg/text/template/#hdr-Text_and_spaces)，这能使模板定义更具可读性。操作开头的减号表示修剪操作前的空格，操作末尾的减号表示修剪操作后的空格。例如，模板

	{{23 -}}
	   <
	{{- 45}}

将格式化为 `23<45`。

其次，新的 [`{{block}}` 操作](/pkg/text/template/#hdr-Actions) 结合允许重定义命名模板的功能，提供了一种简单的方法来定义模板的片段，这些片段可以在不同的实例化中被替换。`text/template` 包中有一个[示例](/pkg/text/template/#example_Template_block)演示了此新特性。

### 库的小改动 {#minor_library_changes}- `archive/tar` 包的实现修复了文件格式罕见边界情况中的多个错误。一个显著的变化是，`Reader` 类型的 `Read` 方法现在将特殊文件类型的内容视为空，并立即返回 `io.EOF`。
- 在 `archive/zip` 包中，`Reader` 类型新增了 `RegisterDecompressor` 方法，`Writer` 类型新增了 `RegisterCompressor` 方法，允许对单个 zip 文件的压缩选项进行控制。这些方法优先于之前存在的全局 `RegisterDecompressor` 和 `RegisterCompressor` 函数。
- `bufio` 包的 `Scanner` 类型新增了 `Buffer` 方法，用于指定扫描期间使用的初始缓冲区和最大缓冲区大小。这使得在需要时可以扫描大于 `MaxScanTokenSize` 的令牌。同样针对 `Scanner`，该包现在定义了 `ErrFinalToken` 错误值，供分割函数用于中止处理或返回一个最终的空令牌。
- `compress/flate` 包已弃用其 `ReadError` 和 `WriteError` 错误实现。在 Go 1.5 中，这些错误仅在遇到错误时很少返回；现在它们不再被返回，尽管出于兼容性考虑它们仍被保留定义。
- `compress/flate`、`compress/gzip` 和 `compress/zlib` 包现在对截断的输入流报告 `io.ErrUnexpectedEOF`，而不是 `io.EOF`。
- `crypto/cipher` 包现在会在 GCM 解密失败时覆盖目标缓冲区。这是为了允许 AESNI 代码避免使用临时缓冲区。
- `crypto/tls` 包有多项细微变更。现在当 `Config` 的 `Certificates` 为 nil 但设置了 `GetCertificate` 回调时，允许 `Listen` 成功；增加了对 RSA 与 AES-GCM 密码套件的支持；并新增了 `RecordHeaderError`，允许客户端（特别是 `net/http` 包）在尝试向非 TLS 服务器建立 TLS 连接时报告更好的错误信息。
- `crypto/x509` 包现在允许证书包含负序列号（技术上是错误，但在实践中很常见），并定义了新的 `InsecureAlgorithmError`，以便在拒绝使用不安全算法（如 MD5）签名的证书时提供更好的错误信息。
- `debug/dwarf` 和 `debug/elf` 包共同添加了对压缩 DWARF 节的支持。用户代码无需更新：读取时这些节会自动解压。
- `debug/elf` 包添加了对通用压缩 ELF 节的支持。用户代码无需更新：读取时这些节会自动解压。但是，压缩的 `Section` 不支持随机访问：它们的 `ReaderAt` 字段为 nil。
- `encoding/asn1` 包现在导出了[标签和类常量](/pkg/encoding/asn1/#pkg-constants)，有助于对 ASN.1 结构进行高级解析。
- 同样在 `encoding/asn1` 包中，`Unmarshal` 现在会拒绝各种非标准的整数和长度编码。
- `encoding/base64` 包的 `Decoder` 已被修复以处理其输入的最后字节。之前它会处理尽可能多的四字节令牌，但会忽略最多三个字节的剩余部分。因此 `Decoder` 现在可以正确处理无填充编码（如 `RawURLEncoding`）的输入，但它也会拒绝在填充编码中被截断或以无效字节（如尾随空格）结尾的输入。
- `encoding/json` 包现在会在序列化 `Number` 之前检查其语法，要求其符合 JSON 数值规范。与之前的版本一样，零值 `Number`（空字符串）被序列化为字面值 0（零）。
- `encoding/xml` 包的 `Marshal` 函数现在支持 `cdata` 属性，类似于 `chardata`，但会将其参数编码在一个或多个 `<![CDATA[ ... ]]>` 标签中。
- 同样在 `encoding/xml` 包中，`Decoder` 的 `Token` 方法现在会在遇到 EOF 但未看到所有开始标签闭合时报告错误，这与输入中的标签必须正确匹配的一般要求一致。若要避免该要求，请使用 `RawToken`。
- `fmt` 包现在允许将任何整数类型作为 `Printf` 的 `*` 宽度和精度说明符的参数。在之前的版本中，`*` 的参数要求为 `int` 类型。
- 同样在 `fmt` 包中，`Scanf` 现在可以使用 `%X` 扫描十六进制字符串，作为 `%x` 的别名。两种格式都接受大小写十六进制字符的任意混合。
- `image` 和 `image/color` 包新增了 `NYCbCrA` 类型（`image.NYCbCrA` 和 `color.NYCbCrA`），以支持具有非预乘 alpha 通道的 Y'CbCr 图像。
- `io` 包的 `MultiWriter` 实现现在实现了 `WriteString` 方法，供 `WriteString` 使用。
- 在 `math/big` 包中，`Int` 新增了 `Append` 和 `Text` 方法，以提供对打印输出的更多控制。
- 同样在 `math/big` 包中，`Float` 现在实现了 `encoding.TextMarshaler` 和 `encoding.TextUnmarshaler` 接口，允许 `encoding/json` 和 `encoding/xml` 包以其自然形式对其进行序列化。
- 同样在 `math/big` 包中，`Float` 的 `Append` 方法现在支持特殊精度参数 -1。与 `strconv.ParseFloat` 类似，精度 -1 表示使用最少的必要位数，使得 `Parse` 将结果读取到相同精度的 `Float` 中时能够得到原始值。
- `math/rand` 包新增了 `Read` 函数，同样 `Rand` 也新增了 `Read` 方法。这使得生成伪随机测试数据更加容易。请注意，与该包的其他部分一样，这些不应在密码学场景中使用；对于此类用途，请使用 `crypto/rand` 包。
- `net` 包的 `ParseMAC` 函数现在接受 20 字节的 IP-over-InfiniBand (IPoIB) 链路层地址。
- 同样在 `net` 包中，DNS 查询有一些变更。首先，`DNSError` 错误实现现在实现了 `Error` 接口，特别是其新的 `IsTemporary` 方法对 DNS 服务器错误返回 true。其次，像 `LookupAddr` 这样的 DNS 查询函数现在在 Plan 9 和 Windows 上返回带尾随点的根域名，以匹配 Go 在 Unix 系统上的行为。
- `net/http` 包除了已经讨论过的 HTTP/2 支持外，还有许多细微的新增功能。首先，`FileServer` 现在按文件名对其生成的目录列表进行排序。其次，如果请求的 URL 路径包含 “..”（点点）作为路径元素，`ServeFile` 函数现在会拒绝提供服务。程序通常应使用 `FileServer` 和 `Dir` 而不是直接调用 `ServeFile`。需要为包含点点的 URL 请求提供文件内容的程序仍然可以调用 `ServeContent`。第三，`Client` 现在允许用户代码设置 `Expect:` `100-continue` 头（参见 `Transport.ExpectContinueTimeout`）。第四，新增了[五个错误代码](/pkg/net/http/#pkg-constants)：来自 RFC 6585 的 `StatusPreconditionRequired` (428)、`StatusTooManyRequests` (429)、`StatusRequestHeaderFieldsTooLarge` (431) 和 `StatusNetworkAuthenticationRequired` (511)，以及最近批准的 `StatusUnavailableForLegalReasons` (451)。第五，`CloseNotifier` 的实现和文档已大幅更改。`Hijacker` 接口现在在先前使用过 `CloseNotifier` 的连接上也能正常工作。文档现在描述了 `CloseNotifier` 预期何时有效。
- 同样在 `net/http` 包中，有一些与处理 `Method` 字段设置为空字符串的 `Request` 数据结构相关的变更。空的 `Method` 字段一直被记录为 `"GET"` 的别名，并且保持不变。然而，Go 1.6 修复了一些未将空 `Method` 与显式 `"GET"` 同等对待的例程。最值得注意的是，在之前的版本中，`Client` 仅在 `Method` 显式设置为 `"GET"` 时才跟踪重定向；在 Go 1.6 中，`Client` 也对空 `Method` 跟踪重定向。最后，`NewRequest` 接受一个未被记录为允许为空的 `method` 参数。在过去的版本中，传递空的 `method` 参数会导致 `Method` 字段为空的 `Request`。在 Go 1.6 中，生成的 `Request` 总是具有初始化的 `Method` 字段：如果其参数是空字符串，`NewRequest` 会将返回的 `Request` 中的 `Method` 字段设置为 `"GET"`。
- `net/http/httptest` 包的 `ResponseRecorder` 现在使用与 `http.Server` 相同的内容嗅探算法初始化默认的 Content-Type 头。
- `net/url` 包的 `Parse` 现在在解析主机名方面更加严格且更符合规范。例如，主机名中的空格不再被接受。
- 同样在 `net/url` 包中，`Error` 类型现在实现了 `net.Error`。
- `os` 包的 `IsExist`、`IsNotExist` 和 `IsPermission` 现在在查询 `SyscallError` 时返回正确的结果。
- 在类 Unix 系统上，当向 `os.Stdout` 或 `os.Stderr`（更准确地说，是为文件描述符 1 或 2 打开的 `os.File`）写入失败由于管道错误时，程序将引发 `SIGPIPE` 信号。默认情况下，这将导致程序退出；可以通过为 `syscall.SIGPIPE` 调用 `os/signal` 包的 `Notify` 函数来更改此行为。向文件描述符 1 或 2 以外的破裂管道写入将简单地向调用者返回 `syscall.EPIPE`（可能包装在 `os.PathError` 和/或 `os.SyscallError` 中）。在连续写入破裂管道 10 次后引发不可捕获的 `SIGPIPE` 信号的旧行为不再发生。
- 在 `os/exec` 包中，当命令以非成功状态退出时，`Cmd` 的 `Output` 方法继续返回 `ExitError`。如果标准错误原本将被丢弃，则返回的 `ExitError` 现在会包含失败命令标准错误输出的前缀和后缀（目前 32 kB），用于调试或包含在错误消息中。`ExitError` 的 `String` 方法不显示捕获的标准错误；程序必须单独从数据结构中检索它。
- 在 Windows 上，`path/filepath` 包的 `Join` 函数现在正确处理基路径是相对驱动器路径的情况。例如，`Join("c:", "a")` 现在返回 `"c:a"`，而不是像过去的版本那样返回 `"c:\a"`。这可能会影响期望错误结果的代码。
- 在 `regexp` 包中，`Regexp` 类型一直对于并发 goroutine 的使用是安全的。它使用 `sync.Mutex` 来保护在正则表达式搜索期间使用的临时空间缓存。一些使用来自多个 goroutine 的相同 `Regexp` 的高并发服务器，由于该互斥锁上的竞争，性能有所下降。为了帮助这类服务器，`Regexp` 现在有了 `Copy` 方法，该方法可以创建 `Regexp` 的副本，该副本共享原始结构的大部分，但拥有自己的临时空间缓存。两个 goroutine 可以使用 `Regexp` 的不同副本而不会产生互斥锁竞争。副本确实有额外的空间开销，因此 `Copy` 应仅在观察到竞争时使用。
- `strconv` 包新增了 `IsGraphic`，类似于 `IsPrint`。它还新增了 `QuoteToGraphic`、`QuoteRuneToGraphic`、`AppendQuoteToGraphic` 和 `AppendQuoteRuneToGraphic`，类似于 `QuoteToASCII`、`QuoteRuneToASCII` 等。`ASCII` 系列会转义除 ASCII 空格（U+0020）外的所有空格字符。相反，`Graphic` 系列不会转义任何 Unicode 空格字符（类别 Zs）。
- 在 `testing` 包中，当测试调用 `t.Parallel` 时，该测试会暂停，直到所有非并行测试完成，然后该测试与所有其他并行测试一起继续执行。Go 1.6 更改了为此类测试报告的时间：以前时间仅计算并行执行部分，但现在也计算从测试开始到调用 `t.Parallel` 的时间。
- `text/template` 包除了上述[主要变更](#template)外，还包含两项细微变更。首先，它新增了一个新的 `ExecError` 类型，该类型在 `Execute` 期间对于任何不源自底层写入器 `Write` 的错误被返回。调用者可以通过检查 `ExecError` 来区分模板使用错误和 I/O 错误。其次，`Funcs` 方法现在检查作为 `FuncMap` 键使用的名称是否是可以在模板函数调用中出现的标识符。如果不是，`Funcs` 会引发 panic。
- `time` 包的 `Parse` 函数一直拒绝任何大于 31 的月份天数，例如 January 32。在 Go 1.6 中，`Parse` 现在还拒绝非闰年的 2 月 29 日、2 月 30 日、2 月 31 日、4 月 31 日、6 月 31 日、9 月 31 日和 11 月 31 日。