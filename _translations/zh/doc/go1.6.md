---
title: Go 1.6 版本说明
---

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.6 简介 {#introduction}

最新版本的 Go，1.6，在 1.5 发布六个月后到来。本次更新主要涉及语言实现、运行时及标准库的改进。语言规范本身未作变动。一如既往，本次发布遵循 Go 1 的[兼容性承诺](/doc/go1compat.html)。我们预计几乎所有 Go 程序都能像之前一样继续编译和运行。

本次发布新增了以下平台支持：[64 位 MIPS 架构的 Linux 和 32 位 x86 架构的 Android](#ports)；定义并强制执行了 [Go 指针与 C 代码共享的规则](#cgo)；透明、自动地[支持了 HTTP/2](#http2)；并提供了新的[模板复用机制](#template)。

## 语言变更 {#language}

本次发布无语言变更。

## 平台支持 {#ports}

Go 1.6 新增了对 64 位 MIPS 架构 Linux (`linux/mips64` 和 `linux/mips64le`) 的实验性支持。这些平台支持 `cgo`，但仅限于使用内部链接。

Go 1.6 还新增了对 32 位 x86 架构 Android (`android/386`) 的实验性支持。

在 FreeBSD 上，Go 1.6 默认使用 `clang` 而非 `gcc` 作为外部 C 编译器。

在小端 64 位 PowerPC 架构的 Linux (`linux/ppc64le`) 上，Go 1.6 现在支持使用外部链接的 `cgo`，功能基本完整。

在 NaCl 上，Go 1.5 要求 SDK 版本为 pepper-41。Go 1.6 新增了对更高 SDK 版本的支持。

在使用 `-dynlink` 或 `-shared` 编译模式的 32 位 x86 系统上，寄存器 CX 现在可能被特定内存引用覆盖，因此在手写汇编代码中应避免使用。详情请参见[汇编文档](/doc/asm#x86)。

## 工具 {#tools}

### Cgo {#cgo}

[`cgo`](/cmd/cgo/) 有一个主要变更和一个次要变更。

主要变更是定义了 Go 指针与 C 代码共享的规则，以确保此类 C 代码能与 Go 的垃圾回收器共存。简而言之，当指向 Go 分配的内存的指针作为 `cgo` 调用的一部分传递给 C 时，Go 和 C 可以共享该内存，前提是内存本身不包含指向 Go 分配的内存的指针，并且 C 不会在调用返回后保留该指针。这些规则在程序执行期间由运行时检查：如果运行时检测到违规，它会打印诊断信息并使程序崩溃。可以通过设置环境变量 `GODEBUG=cgocheck=0` 来禁用这些检查，但请注意，被检查识别出的绝大多数代码都或多或少地与垃圾回收不兼容。禁用检查通常只会导致更神秘的故障模式。强烈建议修复相关代码，而不是关闭检查。更多详情请参见 [`cgo` 文档](/cmd/cgo/#hdr-Passing_pointers)。

次要变更是新增了显式的 `C.complexfloat` 和 `C.complexdouble` 类型，它们与 Go 的 `complex64` 和 `complex128` 是分开的。与其他数值类型一致，C 的复数类型和 Go 的复数类型现在不再可互换。

### 编译器工具链 {#compiler}

编译器工具链基本未变。内部最显著的变化是，解析器现在改为手写，而非由 [yacc](/cmd/yacc/) 生成。

编译器、链接器和 `go` 命令新增了一个标志 `-msan`，类似于 `-race`（仅在 linux/amd64 上可用），用于与 [Clang MemorySanitizer](https://clang.llvm.org/docs/MemorySanitizer.html) 进行互操作。这种互操作主要用于测试包含可疑 C 或 C++ 代码的程序。

链接器新增了一个选项 `-libgcc`，用于在链接 [`cgo`](/cmd/cgo/) 代码时设置 C 编译器支持库的预期位置。该选项仅在使用 `-linkmode=internal` 时才生效，并可设置为 `none` 以禁用支持库。

[Go 1.5 中开始实现的构建模式](/doc/go1.5#link)已扩展到更多系统。本次发布新增了对以下构建模式的支持：`android/386`、`android/amd64`、`android/arm64`、`linux/386` 和 `linux/arm64` 上的 `c-shared` 模式；`linux/386`、`linux/arm`、`linux/amd64` 和 `linux/ppc64le` 上的 `shared` 模式；以及以下平台上的新 `pie` 模式（生成位置无关可执行文件）：`android/386`、`android/amd64`、`android/arm`、`android/arm64`、`linux/386`、`linux/amd64`、`linux/arm`、`linux/arm64` 和 `linux/ppc64le`。详情请参见[设计文档](/s/execmodes)。

提醒一下，链接器的 `-X` 标志在 Go 1.5 中发生了变化。在 Go 1.4 及更早版本中，它接受两个参数，例如：
	-X importpath.name value
Go 1.5 添加了使用单个参数（本身是一个 `name=value` 对）的替代语法：
	-X importpath.name=value
在 Go 1.5 中，旧语法在打印建议使用新语法的警告后仍然被接受。Go 1.6 继续接受旧语法并打印警告。Go 1.7 将移除对旧语法的支持。

### Gccgo {#gccgo}

GCC 和 Go 项目的发布计划并不一致。GCC 5 包含了 Go 1.4 版本的 gccgo。下一个版本 GCC 6 将包含 Go 1.6.1 版本的 gccgo。

### Go 命令 {#go_command}

[`go`](/cmd/go) 命令的基本操作不变，但有若干值得注意的变化。

Go 1.5 引入了对 vendor（供应商目录）的实验性支持，通过将 `GO15VENDOREXPERIMENT` 环境变量设置为 `1` 来启用。Go 1.6 保留了 vendor 支持（不再视为实验性），并默认启用。可以通过将 `GO15VENDOREXPERIMENT` 环境变量显式设置为 `0` 来禁用它。Go 1.7 将移除对该环境变量的支持。
启用供应商目录默认支持最可能引发问题的情况是，源代码树中已存在名为 `vendor` 的目录，且该目录并非预期按照新的供应商语义进行解释。对此，最简单的解决方法是将该目录重命名为除 `vendor` 以外的任何名称，并更新所有受影响的导入路径。

有关供应商目录的详细信息，请参阅 [`go` 命令](/cmd/go/#hdr-Vendor_Directories) 的文档及[设计文档](/s/go15vendor)。

新增了一个构建标志 `-msan`，用于编译支持 LLVM 内存消毒器的 Go。这主要用于链接正在使用内存消毒器进行检查的 C 或 C++ 代码。

### Go doc 命令 {#doc_command}

Go 1.5 引入了 [`go doc`](/cmd/go/#hdr-Show_documentation_for_package_or_symbol) 命令，该命令允许仅使用包名来引用包，例如 `go doc http`。在出现歧义时，Go 1.5 的处理方式是选择字典序最靠前的导入路径对应的包。在 Go 1.6 中，歧义将优先选择元素更少的导入路径来解决，若元素数量相同，则使用字典序比较。此变化的一个重要影响是，原始的包副本现在优先于供应商目录中的副本。成功执行的搜索也往往运行得更快。

### Go vet 命令 {#vet_command}

[`go vet`](/cmd/vet) 命令现在能够诊断出将函数或方法的值作为参数传递给 `Printf` 的情况，例如本意是 `f()` 却传递了 `f`。

## 性能 {#performance}

一如既往，由于变化非常普遍和多样，很难对性能做出精确的陈述。某些程序可能运行得更快，某些则更慢。平均而言，Go 1 基准测试套件中的程序在 Go 1.6 中比在 Go 1.5 中运行速度快了几个百分点。垃圾回收器的暂停时间甚至比 Go 1.5 更低，尤其对于使用大量内存的程序。

通过显著的优化，[`compress/bzip2`](/pkg/compress/bzip2/)、[`compress/gzip`](/pkg/compress/gzip/)、[`crypto/aes`](/pkg/crypto/aes/)、[`crypto/elliptic`](/pkg/crypto/elliptic/)、[`crypto/ecdsa`](/pkg/crypto/ecdsa/) 和 [`sort`](/pkg/sort/) 这些包的实现带来了超过 10% 的性能提升。

## 标准库 {#library}

### HTTP/2 {#http2}

Go 1.6 在 [`net/http`](/pkg/net/http/) 包中增加了对新 [HTTP/2 协议](https://http2.github.io/) 的透明支持。Go 客户端和服务器在使用 HTTPS 时将自动适当地使用 HTTP/2。目前没有专门针对 HTTP/2 协议处理细节的导出 API，就像没有专门针对 HTTP/1.1 的导出 API 一样。

必须禁用 HTTP/2 的程序可以通过将 [`Transport.TLSNextProto`](/pkg/net/http/#Transport)（针对客户端）或 [`Server.TLSNextProto`](/pkg/net/http/#Server)（针对服务器）设置为一个非 nil 的空 map 来实现。

必须调整 HTTP/2 协议特定细节的程序可以导入并使用 [`golang.org/x/net/http2`](https://golang.org/x/net/http2)，特别是其 [ConfigureServer](https://godoc.org/golang.org/x/net/http2/#ConfigureServer) 和 [ConfigureTransport](https://godoc.org/golang.org/x/net/http2/#ConfigureTransport) 函数。

### 运行时 {#runtime}

运行时新增了对 map 并发误用的轻量级、尽力而为的检测。一如既往，如果一个 goroutine（协程）正在写入一个 map（映射），则任何其他 goroutine 都不应并发地读取或写入该 map。如果运行时检测到此情况，它会打印诊断信息并使程序崩溃。要了解有关此问题的更多细节，最好在 [竞态检测器](/blog/race-detector) 下运行程序，它能更可靠地识别竞态条件并提供更多详细信息。

对于导致程序结束的 panic（恐慌），运行时现在默认仅打印当前运行的 goroutine 的栈信息，而不是所有现存 goroutine 的栈信息。通常只有当前 goroutine 与 panic 相关，因此省略其他无关信息可以显著减少崩溃消息中的冗余输出。若要在崩溃消息中查看所有 goroutine 的栈信息，可将环境变量 `GOTRACEBACK` 设置为 `all`，或在崩溃前调用 [`debug.SetTraceback`](/pkg/runtime/debug/#SetTraceback)，然后重新运行程序。详情请参阅[运行时文档](/pkg/runtime/#hdr-Environment_Variables)。

_更新_：旨在转储整个程序状态的未捕获 panic（例如检测到超时或明确处理收到的信号时），现在应在 panic 之前调用 `debug.SetTraceback("all")`。搜索 [`signal.Notify`](/pkg/os/signal/#Notify) 的用法可能有助于识别此类代码。

在 Windows 上，Go 1.5 及更早版本的 Go 程序在启动时会通过调用 `timeBeginPeriod(1)` 将全局 Windows 计时器分辨率强制设置为 1ms。Go 不再需要此操作即可获得良好的调度器性能，并且更改全局计时器分辨率会在某些系统上引发问题，因此已移除此调用。

当使用 `-buildmode=c-archive` 或 `-buildmode=c-shared` 构建归档文件或共享库时，信号的处理方式已改变。在 Go 1.5 中，归档文件或共享库会为大多数信号安装信号处理程序。在 Go 1.6 中，它仅为处理 Go 代码中运行时 panic 所需的同步信号安装信号处理程序：SIGBUS、SIGFPE、SIGSEGV。更多详情请参阅 [os/signal](/pkg/os/signal) 包。

### Reflect {#reflect}

[`reflect`](/pkg/reflect/) 包 [解决了一个长期存在的不兼容问题](/issue/12367)，即 gc 和 gccgo 工具链在处理包含导出字段的未导出嵌入 struct（结构体）类型时的差异。使用反射遍历数据结构的代码，特别是旨在实现类似 [`encoding/json`](/pkg/encoding/json/) 和 [`encoding/xml`](/pkg/encoding/xml/) 包风格的序列化功能时，可能需要进行更新。
当使用反射遍历一个嵌入的未导出结构体类型字段，并访问该结构体中的导出字段时，就会出现问题。在这种情况下，`reflect` 包曾错误地将嵌入字段报告为已导出，方法是返回一个空的 `Field.PkgPath`。现在它正确地将该字段报告为未导出，但在评估对结构体内包含的导出字段的访问时，会忽略该字段未导出这一事实。

**更新指南：**
通常，之前遍历结构体并使用

	f.PkgPath != ""

来排除不可访问字段的代码，现在应该改用

	f.PkgPath != "" && !f.Anonymous

例如，请参阅对
[`encoding/json`](https://go-review.googlesource.com/#/c/14011/2/src/encoding/json/encode.go) 和
[`encoding/xml`](https://go-review.googlesource.com/#/c/14012/2/src/encoding/xml/typeinfo.go) 实现的更改。

### 排序 {#sort}

在
[`sort`](/pkg/sort/)
包中，
[`Sort`](/pkg/sort/#Sort)
的实现已被重写，使其对
[`Interface`](/pkg/sort/#Interface)
的 `Less` 和 `Swap` 方法的调用减少约 10%，总体耗时也相应减少。新算法确实会为比较相等的值（即 `Less(i,` `j)` 和 `Less(j,` `i)` 都返回 false 的值对）选择与之前不同的顺序。

**更新指南：**
`Sort` 的定义并未保证相等值的最终顺序，但新行为仍可能破坏那些期望特定顺序的程序。这类程序要么应改进其 `Less` 实现以报告所需的顺序，要么应改用
[`Stable`](/pkg/sort/#Stable)，
它会保留相等值的原始输入顺序。

### 模板 {#template}

在
[text/template](/pkg/text/template/) 包中，
有两个重要的新特性，使编写模板变得更加容易。

首先，现在可以[修剪模板动作周围的空格](/pkg/text/template/#hdr-Text_and_spaces)，
这可以使模板定义更具可读性。动作开头的减号表示修剪动作前的空格，动作结尾的减号表示修剪动作后的空格。例如，模板

	{{23 -}}
	   <
	{{- 45}}

会格式化为 `23<45`。

其次，新的 [`{{block}}` 动作](/pkg/text/template/#hdr-Actions)，
结合允许重定义命名模板，
提供了一种简单的方法来定义模板的各个部分，
这些部分可以在不同的实例化中被替换。
`text/template` 包中有一个[示例](/pkg/text/template/#example_Template_block)演示了这个新特性。

### 库的次要变更 {#minor_library_changes}
- [`archive/tar`](/pkg/archive/tar/) 包的实现修正了许多文件格式在罕见边缘情况下的错误。一个明显的变化是，[`Reader`](/pkg/archive/tar/#Reader) 类型的 [`Read`](/pkg/archive/tar/#Reader.Read) 方法现在会将特殊文件类型的内容视为空，并立即返回 `io.EOF`。
- 在 [`archive/zip`](/pkg/archive/zip/) 包中，[`Reader`](/pkg/archive/zip/#Reader) 类型现在有一个 [`RegisterDecompressor`](/pkg/archive/zip/#Reader.RegisterDecompressor) 方法，[`Writer`](/pkg/archive/zip/#Writer) 类型现在有一个 [`RegisterCompressor`](/pkg/archive/zip/#Writer.RegisterCompressor) 方法，从而可以对各个 zip 文件的压缩选项进行控制。这些方法优先于先前存在的全局 [`RegisterDecompressor`](/pkg/archive/zip/#RegisterDecompressor) 和 [`RegisterCompressor`](/pkg/archive/zip/#RegisterCompressor) 函数。
- [`bufio`](/pkg/bufio/) 包的 [`Scanner`](/pkg/bufio/#Scanner) 类型现在有一个 [`Buffer`](/pkg/bufio/#Scanner.Buffer) 方法，用于指定扫描期间使用的初始缓冲区和最大缓冲区大小。这使得在需要时扫描大于 `MaxScanTokenSize` 的标记成为可能。同样对于 `Scanner`，该包现在定义了 [`ErrFinalToken`](/pkg/bufio/#ErrFinalToken) 错误值，供[分割函数](/pkg/bufio/#SplitFunc)用于中止处理或返回一个最终的空标记。
- [`compress/flate`](/pkg/compress/flate/) 包已弃用其 [`ReadError`](/pkg/compress/flate/#ReadError) 和 [`WriteError`](/pkg/compress/flate/#WriteError) 错误实现。在 Go 1.5 中，它们仅在遇到错误时很少返回；现在它们永远不会被返回，尽管它们仍为了兼容性而保留定义。
- [`compress/flate`](/pkg/compress/flate/)、[`compress/gzip`](/pkg/compress/gzip/) 和 [`compress/zlib`](/pkg/compress/zlib/) 包现在报告 [`io.ErrUnexpectedEOF`](/pkg/io/#ErrUnexpectedEOF) 用于截断的输入流，而不是 [`io.EOF`](/pkg/io/#EOF)。
- [`crypto/cipher`](/pkg/crypto/cipher/) 包现在在 GCM 解密失败的情况下会覆盖目标缓冲区。这是为了允许 AESNI 代码避免使用临时缓冲区。
- [`crypto/tls`](/pkg/crypto/tls/) 包有一些次要变更。它现在允许 [`Listen`](/pkg/crypto/tls/#Listen) 在 [`Config`](/pkg/crypto/tls/#Config) 的 `Certificates` 为 nil 时成功，只要设置了 `GetCertificate` 回调；增加了对带有 AES-GCM 密码套件的 RSA 的支持；并增加了一个 [`RecordHeaderError`](/pkg/crypto/tls/#RecordHeaderError)，以便客户端（特别是 [`net/http`](/pkg/net/http/) 包）在尝试连接到非 TLS 服务器时报告更好的错误。
- [`crypto/x509`](/pkg/crypto/x509/) 包现在允许证书包含负序号（技术上是一个错误，但不幸在实践中很常见），并定义了一个新的 [`InsecureAlgorithmError`](/pkg/crypto/x509/#InsecureAlgorithmError)，以便在拒绝使用不安全算法（如 MD5）签名的证书时提供更好的错误消息。
- [`debug/dwarf`](/pkg/debug/dwarf) 和 [`debug/elf`](/pkg/debug/elf/) 包共同增加了对压缩 DWARF 节的支持。用户代码无需更新：读取时这些节会自动解压。
- [`debug/elf`](/pkg/debug/elf/) 包增加了对通用压缩 ELF 节的支持。用户代码无需更新：读取时这些节会自动解压。但是，压缩的 [`Sections`](/pkg/debug/elf/#Section) 不支持随机访问：它们的 `ReaderAt` 字段为 nil。
- [`encoding/asn1`](/pkg/encoding/asn1/) 包现在导出了[标签和类常量](/pkg/encoding/asn1/#pkg-constants)，可用于 ASN.1 结构的高级解析。
- 同样在 [`encoding/asn1`](/pkg/encoding/asn1/) 包中，[`Unmarshal`](/pkg/encoding/asn1/#Unmarshal) 现在拒绝各种非标准的整数和长度编码。
- [`encoding/base64`](/pkg/encoding/base64) 包的 [`Decoder`](/pkg/encoding/base64/#Decoder) 已被修正，以处理其输入的最后字节。先前它尽可能多地处理四字节标记，但忽略了剩余部分（最多三个字节）。因此，`Decoder` 现在能正确处理无填充编码（如 [RawURLEncoding](/pkg/encoding/base64/#RawURLEncoding)）的输入，但它也会拒绝在带填充编码中被截断或以无效字节（如尾随空格）结尾的输入。
- [`encoding/json`](/pkg/encoding/json/) 包现在在编组 [`Number`](/pkg/encoding/json/#Number) 之前会检查其语法，要求它符合 JSON 数值规范。与之前版本一样，零值 `Number`（空字符串）被编组为字面量 0（零）。
- [`encoding/xml`](/pkg/encoding/xml/) 包的 [`Marshal`](/pkg/encoding/xml/#Marshal) 函数现在支持 `cdata` 属性，类似于 `chardata`，但将其参数编码为一个或多个 `<![CDATA[ ... ]]>` 标签。
- 同样在 [`encoding/xml`](/pkg/encoding/xml/) 包中，[`Decoder`](/pkg/encoding/xml/#Decoder) 的 [`Token`](/pkg/encoding/xml/#Decoder.Token) 方法现在会在遇到 EOF 前未关闭所有开标签时报告错误，这与其输入中标签必须正确匹配的通用要求一致。若要避免该要求，请使用 [`RawToken`](/pkg/encoding/xml/#Decoder.RawToken)。
- [`fmt`](/pkg/fmt/) 包现在允许任何整数类型作为 [`Printf`](/pkg/fmt/#Printf) 的 `*` 宽度和精度规范的参数。在之前的版本中，`*` 的参数必须是 `int` 类型。
- 同样在 [`fmt`](/pkg/fmt/) 包中，[`Scanf`](/pkg/fmt/#Scanf) 现在可以使用 %X 扫描十六进制字符串，作为 %x 的别名。两种格式都接受任意大小写混合的十六进制。
- [`image`](/pkg/image/) 和 [`image/color`](/pkg/image/color/) 包增加了 [`NYCbCrA`](/pkg/image/#NYCbCrA) 和 [`NYCbCrA`](/pkg/image/color/#NYCbCrA) 类型，以支持带非预乘 alpha 的 Y'CbCr 图像。
- [`io`](/pkg/io/) 包的 [`MultiWriter`](/pkg/io/#MultiWriter) 实现现在实现了 `WriteString` 方法，供 [`WriteString`](/pkg/io/#WriteString) 使用。
- 在 [`math/big`](/pkg/math/big/) 包中，[`Int`](/pkg/math/big/#Int) 增加了 [`Append`](/pkg/math/big/#Int.Append) 和 [`Text`](/pkg/math/big/#Int.Text) 方法，以提供对打印的更多控制。
- 同样在 [`math/big`](/pkg/math/big/) 包中，[`Float`](/pkg/math/big/#Float) 现在实现了 [`encoding.TextMarshaler`](/pkg/encoding/#TextMarshaler) 和 [`encoding.TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler)，允许它通过 [`encoding/json`](/pkg/encoding/json/) 和 [`encoding/xml`](/pkg/encoding/xml/) 包以自然形式序列化。
- 同样在 [`math/big`](/pkg/math/big/) 包中，[`Float`](/pkg/math/big/#Float) 的 [`Append`](/pkg/math/big/#Float.Append) 方法现在支持特殊的精度参数 -1。如同 [`strconv.ParseFloat`](/pkg/strconv/#ParseFloat)，精度 -1 表示使用尽可能少的数字位数，使得 [`Parse`](/pkg/math/big/#Float.Parse) 将结果读回相同精度的 `Float` 时能得到原始值。
- [`math/rand`](/pkg/math/rand/) 包增加了一个 [`Read`](/pkg/math/rand/#Read) 函数，同样 [`Rand`](/pkg/math/rand/#Rand) 增加了一个 [`Read`](/pkg/math/rand/#Rand.Read) 方法。这些使得生成伪随机测试数据更加容易。请注意，与该包的其他部分一样，这些不应在加密设置中使用；对于此类用途，请改用 [`crypto/rand`](/pkg/crypto/rand/) 包。
- [`net`](/pkg/net/) 包的 [`ParseMAC`](/pkg/net/#ParseMAC) 函数现在接受 20 字节的 IP-over-InfiniBand (IPoIB) 链路层地址。
- 同样在 [`net`](/pkg/net/) 包中，DNS 查询有一些变更。首先，[`DNSError`](/pkg/net/#DNSError) 错误实现现在实现了 [`Error`](/pkg/net/#Error)，特别是其新的 [`IsTemporary`](/pkg/net/#DNSError.IsTemporary) 方法对 DNS 服务器错误返回 true。其次，DNS 查询函数（如 [`LookupAddr`](/pkg/net/#LookupAddr)）现在在 Plan 9 和 Windows 上返回根域名（带尾随点），以匹配 Go 在 Unix 系统上的行为。
- [`net/http`](/pkg/net/http/) 包除了已讨论的 HTTP/2 支持外，还有一些次要添加。首先，[`FileServer`](/pkg/net/http/#FileServer) 现在按文件名排序其生成的目录列表。其次，[`ServeFile`](/pkg/net/http/#ServeFile) 函数现在如果请求的 URL 路径包含“..”（点点）作为路径元素，则拒绝提供结果。程序通常应使用 `FileServer` 和 [`Dir`](/pkg/net/http/#Dir)，而不是直接调用 `ServeFile`。需要响应包含点点的 URL 请求来提供文件内容的程序仍然可以调用 [`ServeContent`](/pkg/net/http/#ServeContent)。第三，[`Client`](/pkg/net/http/#Client) 现在允许用户代码设置 `Expect:` `100-continue` 头（参见 [`Transport.ExpectContinueTimeout`](/pkg/net/http/#Transport)）。第四，有[五个新的错误代码](/pkg/net/http/#pkg-constants)：来自 RFC 6585 的 `StatusPreconditionRequired` (428)、`StatusTooManyRequests` (429)、`StatusRequestHeaderFieldsTooLarge` (431) 和 `StatusNetworkAuthenticationRequired` (511)，以及最近批准的 `StatusUnavailableForLegalReasons` (451)。第五，[`CloseNotifier`](/pkg/net/http/#CloseNotifier) 的实现和文档已大幅更改。[`Hijacker`](/pkg/net/http/#Hijacker) 接口现在在之前曾与 `CloseNotifier` 一起使用的连接上可以正确工作。文档现在描述了 `CloseNotifier` 预期何时工作。
- 同样在 [`net/http`](/pkg/net/http/) 包中，关于处理 `Method` 字段设置为空字符串的 [`Request`](/pkg/net/http/#Request) 数据结构有一些变更。空的 `Method` 字段一直被记录为 `"GET"` 的别名，并且现在仍然如此。然而，Go 1.6 修正了一些没有将空 `Method` 等同于显式 `"GET"` 的例程。最值得注意的是，在之前的版本中，[`Client`](/pkg/net/http/#Client) 仅在 `Method` 显式设置为 `"GET"` 时才跟随重定向；在 Go 1.6 中，`Client` 也会为空 `Method` 跟随重定向。最后，[`NewRequest`](/pkg/net/http/#NewRequest) 接受一个 `method` 参数，该参数未被记录为允许为空。在过去的版本中，传递空的 `method` 参数会导致 `Request` 的 `Method` 字段为空。在 Go 1.6 中，生成的 `Request` 的 `Method` 字段总是被初始化：如果其参数是空字符串，`NewRequest` 会将返回的 `Request` 的 `Method` 字段设置为 `"GET"`。
- [`net/http/httptest`](/pkg/net/http/httptest/) 包的 [`ResponseRecorder`](/pkg/net/http/httptest/#ResponseRecorder) 现在使用与 [`http.Server`](/pkg/net/http/#Server) 相同的内容嗅探算法初始化默认的 Content-Type 头。
- [`net/url`](/pkg/net/url/) 包的 [`Parse`](/pkg/net/url/#Parse) 现在对主机名的解析更严格，更符合规范。例如，不再接受主机名中的空格。
- 同样在 [`net/url`](/pkg/net/url/) 包中，[`Error`](/pkg/net/url/#Error) 类型现在实现了 [`net.Error`](/pkg/net/#Error)。
- [`os`](/pkg/os/) 包的 [`IsExist`](/pkg/os/#IsExist)、[`IsNotExist`](/pkg/os/#IsNotExist) 和 [`IsPermission`](/pkg/os/#IsPermission) 现在在查询 [`SyscallError`](/pkg/os/#SyscallError) 时返回正确结果。
- 在类 Unix 系统上，当对 [`os.Stdout` 或 `os.Stderr`](/pkg/os/#pkg-variables)（更准确地说，是为文件描述符 1 或 2 打开的 `os.File`）的写入因管道破裂错误而失败时，程序将引发 `SIGPIPE` 信号。默认情况下，这将导致程序退出；可以通过为 `syscall.SIGPIPE` 调用 [`os/signal`](/pkg/os/signal) 的 [`Notify`](/pkg/os/signal/#Notify) 函数来更改此行为。对除 1 或 2 以外的文件描述符的破裂管道的写入将简单地向调用者返回 `syscall.EPIPE`（可能包装在 [`os.PathError`](/pkg/os#PathError) 和/或 [`os.SyscallError`](/pkg/os#SyscallError) 中）。旧的行为——在连续 10 次对破裂管道的写入后引发不可捕获的 `SIGPIPE` 信号——不再发生。
- 在 [`os/exec`](/pkg/os/exec/) 包中，[`Cmd`](/pkg/os/exec/#Cmd) 的 [`Output`](/pkg/os/exec/#Cmd.Output) 方法在命令以不成功状态退出时，继续返回 [`ExitError`](/pkg/os/exec/#ExitError)。如果标准错误原本会被丢弃，返回的 `ExitError` 现在会保存失败命令标准错误输出的前缀和后缀（当前为 32 kB），用于调试或包含在错误消息中。`ExitError` 的 [`String`](/pkg/os/exec/#ExitError.String) 方法不会显示捕获的标准错误；程序必须单独从数据结构中检索它。
- 在 Windows 上，[`path/filepath`](/pkg/path/filepath/) 包的 [`Join`](/pkg/path/filepath/#Join) 函数现在正确处理基础路径是相对驱动器路径的情况。例如，``Join(`c:`,`` `` `a`) `` 现在返回 `` `c:a` `` 而不是过去的 `` `c:\a` ``。这可能会影响期望错误结果的代码。
- 在 [`regexp`](/pkg/regexp/) 包中，[`Regexp`](/pkg/regexp/#Regexp) 类型一直对并发协程使用是安全的。它使用 [`sync.Mutex`](/pkg/sync/#Mutex) 来保护正则表达式搜索期间使用的临时空间缓存。一些高并发服务器从多个协程使用相同的 `Regexp` 时，由于该互斥锁的争用，性能有所下降。为了帮助此类服务器，`Regexp` 现在有一个 [`Copy`](/pkg/regexp/#Regexp.Copy) 方法，该方法生成一个 `Regexp` 的副本，该副本共享原始结构的大部分，但有自己的临时空间缓存。两个协程可以使用不同的 `Regexp` 副本，而无需互斥锁争用。副本确实有额外的空间开销，因此 `Copy` 仅应在观察到争用时使用。
- [`strconv`](/pkg/strconv/) 包增加了 [`IsGraphic`](/pkg/strconv/#IsGraphic)，类似于 [`IsPrint`](/pkg/strconv/#IsPrint)。它还增加了 [`QuoteToGraphic`](/pkg/strconv/#QuoteToGraphic)、[`QuoteRuneToGraphic`](/pkg/strconv/#QuoteRuneToGraphic)、[`AppendQuoteToGraphic`](/pkg/strconv/#AppendQuoteToGraphic) 和 [`AppendQuoteRuneToGraphic`](/pkg/strconv/#AppendQuoteRuneToGraphic)，类似于 [`QuoteToASCII`](/pkg/strconv/#QuoteToASCII)、[`QuoteRuneToASCII`](/pkg/strconv/#QuoteRuneToASCII) 等。`ASCII` 系列转义除 ASCII 空格（U+0020）外的所有空格字符。相比之下，`Graphic` 系列不转义任何 Unicode 空格字符（类别 Zs）。
- 在 [`testing`](/pkg/testing/) 包中，当测试调用 [t.Parallel](/pkg/testing/#T.Parallel) 时，该测试将暂停，直到所有