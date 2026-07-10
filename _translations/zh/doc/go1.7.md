---
title: Go 1.7 发布说明
---

<!--
for acme:
Edit .,s;^PKG:([a-z][A-Za-z0-9_/]+);<a href="/pkg/\1/"><code>\1</code></a>;g
Edit .,s;^([a-z][A-Za-z0-9_/]+)\.([A-Z][A-Za-z0-9_]+\.)?([A-Z][A-Za-z0-9_]+)([ .',)]|$);<a href="/pkg/\1/#\2\3"><code>\3</code></a>\4;g
Edit .,s;^FULL:([a-z][A-Za-z0-9_/]+)\.([A-Z][A-Za-z0-9_]+\.)?([A-Z][A-Za-z0-9_]+)([ .',)]|$);<a href="/pkg/\1/#\2\3"><code>\1.\2\3</code></a>\4;g
Edit .,s;^DPKG:([a-z][A-Za-z0-9_/]+);<dl id="\1"><a href="/pkg/\1/">\1</a></dl>;g
rsc 最后更新至 6729576
-->

<!--
注意：在本文档及本目录下的其他文档中，惯例是将固定宽度的短语设置为非固定宽度的空格，例如
`hello` `world`。
请勿发送 CL 来移除此类短语中的内部标签。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.7 简介 {#introduction}

最新的 Go 版本，1.7，距离 1.6 版本发布已有六个月。其大部分变更集中在工具链、运行时和库的实现上。语言规范有一处微小的改动。与往常一样，此版本遵守 Go 1 的[兼容性承诺](/doc/go1compat.html)。我们期望几乎所有 Go 程序都能像以前一样继续编译和运行。

此版本[添加了对 IBM LinuxOne 的移植](#ports)；[更新了 x86-64 编译器后端](#compiler) 以生成更高效的代码；包含了从 [x/net 子仓库](https://golang.org/x/net/context) 提升上来、现已被标准库使用的 [context 包](#context)；以及[在测试包中增加了支持](#testing)，用于创建测试和基准测试的层次结构。此版本还[最终确定了从 Go 1.5 开始的 vendor 支持](#cmd_go)，使其成为一个标准特性。

## 语言变更 {#language}

此版本中有一处微小的语言改动。关于[终止语句](/ref/spec#Terminating_statements)的部分进行了澄清：为了确定一个语句列表是否以终止语句结尾，应考虑“最后的非空语句”作为结尾，这与 gc 和 gccgo 编译器工具链的现有行为保持一致。在早期版本中，该定义仅提及“最后的语句”，这使得尾随空语句的效果至少可以说是不明确的。[`go/types`](/pkg/go/types/) 包已更新，以在此方面与 gc 和 gccgo 编译器工具链保持一致。此更改不影响现有程序的正确性。

## 平台支持 {#ports}

Go 1.7 增加了对 macOS 10.12 Sierra 的支持。使用 1.7 之前版本的 Go 构建的二进制文件在 Sierra 上无法正常工作。

Go 1.7 增加了一个对 [Linux on z Systems](https://en.wikipedia.org/wiki/Linux_on_z_Systems) (`linux/s390x`) 的实验性移植，以及开始支持 Plan 9 on ARM (`plan9/arm`) 的移植。

在 Go 1.6 中添加的对 64 位 MIPS Linux (`linux/mips64` 和 `linux/mips64le`) 的实验性移植现在完全支持 cgo 和外部链接。

对小端序 64 位 PowerPC Linux (`linux/ppc64le`) 的实验性移植现在要求 POWER8 或更高版本的架构。大端序 64 位 PowerPC (`linux/ppc64`) 仅要求 POWER5 架构。

OpenBSD 移植现在要求 OpenBSD 5.6 或更高版本，以便访问 [_getentropy_(2)](https://man.openbsd.org/getentropy.2) 系统调用。

### 已知问题 {#known_issues}

FreeBSD 上存在一些已知但原因不明的不稳定性。在极少数情况下，这可能导致程序崩溃。请参阅 [issue 16136](/issue/16136)、[issue 15658](/issue/15658) 和 [issue 16396](/issue/16396)。任何帮助解决这些 FreeBSD 特定问题的贡献将不胜感激。

## 工具 {#tools}

### 汇编器 {#cmd_asm}

对于 64 位 ARM 系统，向量寄存器名称已更正为 `V0` 到 `V31`；之前的版本错误地将其称为 `V32` 到 `V63`。

对于 64 位 x86 系统，添加了以下指令：
`PCMPESTRI`、
`RORXL`、
`RORXQ`、
`VINSERTI128`、
`VPADDD`、
`VPADDQ`、
`VPALIGNR`、
`VPBLENDD`、
`VPERM2F128`、
`VPERM2I128`、
`VPOR`、
`VPSHUFB`、
`VPSHUFD`、
`VPSLLD`、
`VPSLLDQ`、
`VPSLLQ`、
`VPSRLD`、
`VPSRLDQ` 和
`VPSRLQ`。

### 编译器工具链 {#compiler}

此版本为 64 位 x86 系统包含了一个新的代码生成后端，该后端源于 [2015 年的一个提案](/s/go17ssa)，自那时起一直在开发中。这个基于 [SSA](https://en.wikipedia.org/wiki/Static_single_assignment_form) 的新后端生成更紧凑、更高效的代码，并为边界检查消除等优化提供了一个更好的平台。新后端将我们基准测试程序所需的 CPU 时间减少了 5-35%。

在此版本中，可以通过向编译器传递 `-ssa=0` 来禁用新后端。如果你发现你的程序仅在禁用新后端时才能成功编译或运行，请[提交错误报告](/issue/new)。

编译器写入包归档中的导出元数据格式已更改：旧的文本格式已被更紧凑的二进制格式取代。这使得包归档文件有所缩小，并修复了一些长期存在的角落案例错误。

在此版本中，可以通过向编译器传递 `-newexport=0` 来禁用新的导出格式。如果你发现你的程序仅在禁用新导出格式时才能成功编译或运行，请[提交错误报告](/issue/new)。

链接器的 `-X` 选项不再支持不常见的双参数形式 `-X` `name` `value`，正如在 Go 1.6 发布说明和链接器打印的警告中[所宣布的](/doc/go1.6#compiler)。请使用 `-X` `name=value` 代替。

编译器和链接器已优化，在此版本中运行速度明显快于 Go 1.6，尽管它们仍然比我们期望的要慢，并且将在未来的版本中继续优化。

由于编译器工具链和标准库的变更，此版本构建的二进制文件通常比 Go 1.6 构建的二进制文件更小，有时小 20-30%。在x86-64系统上，Go程序现在按照Linux的perf和Intel的VTune等性能分析工具的预期维护栈帧指针，使得使用这些工具分析和优化Go程序更加便捷。维护栈帧指针会带来少量运行时开销，虽然存在波动，但平均约为2%。我们希望在未来的版本中降低这一开销。若要构建不使用栈帧指针的工具链，运行`make.bash`、`make.bat`或`make.rc`时请设置`GOEXPERIMENT=noframepointer`。

### Cgo {#cmd_cgo}

使用[cgo](/cmd/cgo/)的包现在可以包含Fortran源文件（除了C、C++、Objective C和SWIG），但Go绑定仍需使用C语言API。

Go绑定现在可以使用新的辅助函数`C.CBytes`。与接受Go `string`并返回`*C.byte`（C的`char*`）的`C.CString`不同，`C.CBytes`接受Go `[]byte`并返回`unsafe.Pointer`（C的`void*`）。

过去版本中，使用`cgo`构建的包和二进制文件由于嵌入了临时目录名称，每次构建都会产生不同的输出。在使用足够新版本的GCC或Clang（支持`-fdebug-prefix-map`选项）时，本次版本的构建应最终实现确定性输出。

### Gccgo {#gccgo}

由于Go的半年发布周期与GCC的年度发布周期对齐，GCC 6版本包含的是Go 1.6.1版本的gccgo。下一个版本GCC 7很可能包含Go 1.8版本的gccgo。

### Go命令 {#cmd_go}

[`go`](/cmd/go/)命令的基本操作保持不变，但有若干值得注意的变更。

本版本移除了对`GO15VENDOREXPERIMENT`环境变量的支持，正如Go 1.6发布说明中[宣布的](/doc/go1.6#go_command)那样。[Vendor支持](/s/go15vendor)现已成为`go`命令和工具链的标准功能。

供"`go` `list`"使用的`Package`数据结构现在包含一个`StaleReason`字段，用于解释特定包为何被视为过时（需要重新构建）。该字段可通过`-f`或`-json`选项获取，有助于理解目标被重新构建的原因。

"`go` `get`"命令现在支持引用`git.openstack.org`的导入路径。

本版本新增了实验性的最小化支持，用于使用[二进制专用包](/pkg/go/build#hdr-Binary_Only_Packages)构建程序，即仅以二进制形式分发且不包含相应源代码的包。此功能在某些商业场景中是必需的，但并不打算完全集成到工具链的其他部分。例如，假设可以访问完整源代码的工具将无法处理此类包，且目前没有计划在"`go` `get`"命令中支持此类包。

### Go doc {#cmd_doc}

"`go` `doc`"命令现在将构造函数与其构造的类型分组显示，遵循[`godoc`](/cmd/godoc/)的惯例。

### Go vet {#cmd_vet}

"`go` `vet`"命令的`-copylock`和`-printf`检查分析更为准确，并新增了`-tests`检查，用于检查可能的测试函数的名称和签名。为避免与新的`-tests`检查混淆，旧的、未公开的`-test`选项已被移除；该选项等同于`-all` `-shadow`。

`vet`命令还新增了一项检查`-lostcancel`，用于检测未调用Go 1.7新增的`context`包中`WithCancel`、`WithTimeout`和`WithDeadline`函数返回的取消函数的情况（参见[下文](#context)）。未调用该函数会导致新的`Context`无法被回收，直到其父级被取消。（后台上下文永远不会被取消。）

### Go工具 dist {#cmd_dist}

新子命令"`go` `tool` `dist` `list`"打印所有支持的操作系统/架构对。

### Go工具 trace {#cmd_trace}

"`go` `tool` `trace`"命令在[Go 1.5中引入](/doc/go1.5#trace_command)后，在多个方面进行了改进。

首先，收集跟踪数据比以往版本显著高效。在本版本中，收集跟踪数据的典型执行时间开销约为25%；而在以往版本中，该开销至少为400%。其次，跟踪文件现在包含文件名和行号信息，使其更加自包含，并使运行跟踪工具时原始可执行文件变为可选。第三，跟踪工具现在能够分割大型跟踪文件，以避免基于浏览器的查看器的限制。

尽管本版本的跟踪文件格式发生了变化，但Go 1.7工具仍能读取早期版本的跟踪文件。

## 性能 {#performance}

一如既往，由于变更范围广泛且多样，难以对性能做出精确陈述。由于垃圾回收器的加速和核心库的优化，大多数程序的运行速度应略有提升。在x86-64系统上，得益于新编译器后端带来的代码生成改进，许多程序的运行速度将显著提升。如前所述，在我们的基准测试中，仅代码生成变更通常就能将程序CPU时间减少5-35%。

<!-- git log -''-grep '-[0-9][0-9]\.[0-9][0-9]%' go1.6.. -->
以下包的实现经过了显著优化，性能提升超过10%：
[`crypto/sha1`](/pkg/crypto/sha1/)、
[`crypto/sha256`](/pkg/crypto/sha256/)、
[`encoding/binary`](/pkg/encoding/binary/)、
[`fmt`](/pkg/fmt/)、
[`hash/adler32`](/pkg/hash/adler32/)、
[`hash/crc32`](/pkg/hash/crc32/)、
[`hash/crc64`](/pkg/hash/crc64/)、
[`image/color`](/pkg/image/color/)、
[`math/big`](/pkg/math/big/)、
[`strconv`](/pkg/strconv/)、
[`strings`](/pkg/strings/)、
[`unicode`](/pkg/unicode/)以及
[`unicode/utf16`](/pkg/unicode/utf16/)。

对于具有大量空闲goroutine、栈大小显著波动或大型包级变量的程序，垃圾回收暂停时间应比Go 1.6版本显著缩短。

## 标准库 {#library}

### Context {#context}Go 1.7 将 `golang.org/x/net/context` 包移入标准库，作为 [`context`](/pkg/context/) 包。这使得其他标准库包可以使用上下文（context）来取消操作、设置超时以及传递请求范围的数据，这些包包括 [net](#net)、[net/http](#net_http) 和 [os/exec](#os_exec)，如后文所述。

关于上下文（context）的更多信息，请参阅 [包文档](/pkg/context/) 以及 Go 博客文章 “[Go 并发模式：上下文](/blog/context)”。

### HTTP 追踪 {#httptrace}

Go 1.7 引入了 [`net/http/httptrace`](/pkg/net/http/httptrace/) 包，该包提供了追踪 HTTP 请求内部事件的机制。

### 测试 {#testing}

`testing` 包现在支持定义带有子测试（subtests）的测试和带有子基准测试（sub-benchmarks）的基准测试。这一特性使得编写表驱动基准测试（table-driven benchmarks）和创建层次化测试变得容易。它还提供了一种共享通用设置和清理代码的方式。详情请参阅 [包文档](/pkg/testing/#hdr-Subtests_and_Sub_benchmarks)。

### 运行时 {#runtime}

所有由运行时启动的 panic 现在都使用实现了内置 [`error`](/ref/spec#Errors) 接口和 [`runtime.Error`](/pkg/runtime/#Error) 接口的 panic 值，如 [语言规范所要求](/ref/spec#Run_time_panics)。

在 panic 期间，如果信号的名称已知，它将被打印在栈跟踪信息中。否则，将使用信号的编号，与 Go 1.7 之前的行为一致。

新函数 [`KeepAlive`](/pkg/runtime/#KeepAlive) 提供了一种显式机制，用于声明在程序的特定位置必须认为一个已分配的对象是可达的，这通常是为了延迟关联的终结器（finalizer）的执行。

新函数 [`CallersFrames`](/pkg/runtime/#CallersFrames) 将通过 [`Callers`](/pkg/runtime/#Callers) 获取的 PC 切片转换为与调用栈对应的帧序列。这个新 API 应优先使用，而不是直接使用 [`FuncForPC`](/pkg/runtime/#FuncForPC)，因为帧序列可以更准确地描述包含内联函数调用的调用栈。

新函数 [`SetCgoTraceback`](/pkg/runtime/#SetCgoTraceback) 促进了在同一进程中通过 cgo 调用的 Go 代码与 C 代码之间更紧密的集成。

在 32 位系统上，运行时现在可以使用操作系统在地址空间任意位置分配的内存，这消除了在某些环境中常见的“操作系统分配的内存不在可用范围内”的错误。

运行时现在可以在所有架构上将未使用的内存返回给操作系统。在 Go 1.6 及更早版本中，运行时无法在 ARM64、64 位 PowerPC 或 MIPS 上释放内存。

在 Windows 上，Go 1.5 及更早版本的 Go 程序在启动时通过调用 `timeBeginPeriod(1)` 强制将全局 Windows 定时器分辨率设置为 1ms。更改全局定时器分辨率在某些系统上引发了问题，并且测试表明，为了获得良好的调度器性能，该调用并非必需，因此 Go 1.6 移除了该调用。Go 1.7 重新引入了该调用：在某些工作负载下，该调用对于获得良好的调度器性能仍然是必要的。

### 库的次要变更 {#minor_library_changes}

一如既往，库中有各种次要的变更和更新，这些变更都遵循了 Go 1 的 [兼容性承诺](/doc/go1compat)。

#### [bufio](/pkg/bufio/)

在 Go 的早期版本中，如果 [`Reader`](/pkg/bufio/#Reader) 的 [`Peek`](/pkg/bufio/#Reader.Peek) 方法请求的字节数多于底层缓冲区可容纳的数量，它会返回一个空切片和错误 `ErrBufferFull`。现在，它会返回整个底层缓冲区，但仍伴随错误 `ErrBufferFull`。

#### [bytes](/pkg/bytes/)

为了与 [`strings`](/pkg/strings/) 包保持对称，新增了函数 [`ContainsAny`](/pkg/bytes/#ContainsAny) 和 [`ContainsRune`](/pkg/bytes/#ContainsRune)。

在 Go 的早期版本中，如果 [`Reader`](/pkg/bytes/#Reader) 的 [`Read`](/pkg/bytes/#Reader.Read) 方法在无剩余数据时请求读取零字节，它会返回计数 0 且不返回错误。现在，它返回计数 0 并返回错误 [`io.EOF`](/pkg/io/#EOF)。

[`Reader`](/pkg/bytes/#Reader) 类型新增了方法 [`Reset`](/pkg/bytes/#Reader.Reset)，允许复用 `Reader`。

#### [compress/flate](/pkg/compress/flate/)

该包在各处进行了多项性能优化。解压速度提高了约 10%，而 `DefaultCompression` 的压缩速度则快了一倍。

除了这些通用改进外，`BestSpeed` 压缩器已被完全替换，使用了类似于 [Snappy](https://github.com/google/snappy) 的算法，速度提升了约 2.5 倍，但输出可能比旧算法大 5-10%。

还新增了一个压缩级别 `HuffmanOnly`，它只应用霍夫曼编码而不应用 Lempel-Ziv 编码。[放弃 Lempel-Ziv 编码](https://blog.klauspost.com/constant-time-gzipzip-compression/) 意味着 `HuffmanOnly` 的运行速度比新的 `BestSpeed` 快约 3 倍，但代价是生成的压缩输出比新的 `BestSpeed` 生成的输出大 20-40%。

需要特别注意的是，`BestSpeed` 和 `HuffmanOnly` 生成的压缩输出都符合 [RFC 1951](https://tools.ietf.org/html/rfc1951)。换句话说，任何有效的 DEFLATE 解压器都将继续能够解压这些输出。

最后，解压器对 [`io.Reader`](/pkg/io/#Reader) 的实现有一个小改动。在以前的版本中，解压器会推迟报告 [`io.EOF`](/pkg/io/#EOF)，直到读取的字节数精确为零。现在，它在读取最后一组字节时会更及时地报告 [`io.EOF`](/pkg/io/#EOF)。

#### [crypto/tls](/pkg/crypto/tls/)TLS 实现在每个连接上最初会使用较小的记录大小发送前几个数据包，然后逐步增加到 TLS 最大记录大小。这种启发式方法减少了在能够解密第一个数据包之前所需接收的数据量，从而改善了低带宽网络上的通信延迟。将 [`Config`](/pkg/crypto/tls/#Config) 的 `DynamicRecordSizingDisabled` 字段设置为 `true`，会强制采用 Go 1.6 及更早版本的行为，即从连接开始就尽可能使用最大的数据包。

TLS 客户端现在对服务器发起的重新协商提供可选的、有限支持，通过设置 [`Config`](/pkg/crypto/tls/#Config) 的 `Renegotiation` 字段来启用。这是连接到许多 Microsoft Azure 服务器所必需的。

现在该包返回的错误始终以 `tls:` 前缀开头。在之前的版本中，有些错误使用 `crypto/tls:` 前缀，有些使用 `tls:` 前缀，还有一些根本没有前缀。

在生成自签名证书时，该包不再默认设置“颁发机构密钥标识符”字段。

#### [crypto/x509](/pkg/crypto/x509/)

新函数 [`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool) 可以访问整个系统证书池（如果可用）。同时还有一个新的相关错误类型 [`SystemRootsError`](/pkg/crypto/x509/#SystemRootsError)。

#### [debug/dwarf](/pkg/debug/dwarf/)

[`Reader`](/pkg/debug/dwarf/#Reader) 类型的新方法 [`SeekPC`](/pkg/debug/dwarf/#Reader.SeekPC) 和 [`Data`](/pkg/debug/dwarf/#Data) 类型的新方法 [`Ranges`](/pkg/debug/dwarf/#Ranges) 有助于找到要传递给 [`LineReader`](/pkg/debug/dwarf/#LineReader) 的编译单元，并识别给定程序计数器对应的具体函数。

#### [debug/elf](/pkg/debug/elf/)

新的 [`R_390`](/pkg/debug/elf/#R_390) 重定位类型及其众多预定义常量支持 S390 平台移植。

#### [encoding/asn1](/pkg/encoding/asn1/)

ASN.1 解码器现在拒绝非最小化的整数编码。这可能导致该包拒绝一些之前被接受但无效的 ASN.1 数据。

#### [encoding/json](/pkg/encoding/json/)

[`Encoder`](/pkg/encoding/json/#Encoder) 的新方法 [`SetIndent`](/pkg/encoding/json/#Encoder.SetIndent) 设置 JSON 编码的缩进参数，类似于顶层 [`Indent`](/pkg/encoding/json/#Indent) 函数的功能。

[`Encoder`](/pkg/encoding/json/#Encoder) 的新方法 [`SetEscapeHTML`](/pkg/encoding/json/#Encoder.SetEscapeHTML) 控制带引号的字符串中的 `&`、`<` 和 `>` 字符是否应分别转义为 `\u0026`、`\u003c` 和 `\u003e`。与之前的版本一样，编码器默认执行此转义，以避免将 JSON 嵌入 HTML 时可能出现的某些问题。

在 Go 的早期版本中，此包仅支持使用字符串类型作为键的映射的编码和解码。Go 1.7 增加了对使用整数类型作为键的映射的支持：编码时使用带引号的十进制表示形式作为 JSON 键。Go 1.7 还增加了对使用实现了 `MarshalText`（参见 [`encoding.TextMarshaler`](/pkg/encoding/#TextMarshaler)）方法的非字符串键的映射进行编码的支持，以及对使用实现了 `UnmarshalText`（参见 [`encoding.TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler)）方法的非字符串键的映射进行解码的支持。为了保持与 Go 早期版本编码解码行为的兼容性，对于字符串类型的键，这些方法会被忽略。

当编码一个类型化字节切片时，[`Marshal`](/pkg/encoding/json/#Marshal) 现在会生成一个元素数组，如果该字节类型存在 `MarshalJSON` 或 `MarshalText` 方法，则使用该方法编码元素，只有在两者都不可用时才回退到默认的 base64 编码字符串数据。Go 的早期版本同时接受原始的 base64 编码字符串编码和数组编码（假设字节类型也适当实现了 `UnmarshalJSON` 或 `UnmarshalText`），因此此更改在语义上应与 Go 的早期版本向后兼容，尽管它确实改变了选择的编码方式。

#### [go/build](/pkg/go/build/)

为了实现 `go` 命令对仅二进制包以及 cgo 包中 Fortran 代码的新支持，[`Package`](/pkg/go/build/#Package) 类型添加了新字段 `BinaryOnly`、`CgoFFLAGS` 和 `FFiles`。

#### [go/doc](/pkg/go/doc/)

为了支持上文描述的 `go` `test` 中的相应更改，[`Example`](/pkg/go/doc/#Example) 结构体添加了一个 `Unordered` 字段，指示该示例是否可以按任意顺序生成其输出行。

#### [io](/pkg/io/)

该包添加了新常量 `SeekStart`、`SeekCurrent` 和 `SeekEnd`，用于 [`Seeker`](/pkg/io/#Seeker) 实现。推荐使用这些常量而不是 `os.SEEK_SET`、`os.SEEK_CUR` 和 `os.SEEK_END`，但为了兼容性，后者仍将保留。

#### [math/big](/pkg/math/big/)

[`Float`](/pkg/math/big/#Float) 类型添加了 [`GobEncode`](/pkg/math/big/#Float.GobEncode) 和 [`GobDecode`](/pkg/math/big/#Float.GobDecode) 方法，因此 `Float` 类型的值现在可以使用 [`encoding/gob`](/pkg/encoding/gob/) 包进行编码和解码。

#### [math/rand](/pkg/math/rand/)

[`Read`](/pkg/math/rand/#Read) 函数和 [`Rand`](/pkg/math/rand/#Rand) 的 [`Read`](/pkg/math/rand/#Rand.Read) 方法现在生成的伪随机字节流是一致的，并且不依赖于输入缓冲区的大小。

文档澄清了 Rand 的 [`Seed`](/pkg/math/rand/#Rand.Seed) 和 [`Read`](/pkg/math/rand/#Rand.Read) 方法不是并发安全的，但全局函数 [`Seed`](/pkg/math/rand/#Seed) 和 [`Read`](/pkg/math/rand/#Read) 是（并且一直是）并发安全的。

#### [mime/multipart](/pkg/mime/multipart/)

[`Writer`](/pkg/mime/multipart/#Writer) 的实现现在按键排序输出每个多部分的头部。以前，遍历映射会导致分段头部使用非确定性的顺序。#### [net](/pkg/net/)

作为引入 [context](#context) 的一部分，[`Dialer`](/pkg/net/#Dialer) 类型新增了一个方法 [`DialContext`](/pkg/net/#Dialer.DialContext)。该方法类似于 [`Dial`](/pkg/net/#Dialer.Dial)，但为拨号操作添加了 [`context.Context`](/pkg/context/#Context)。引入该 context 旨在取代 `Dialer` 的 `Cancel` 和 `Deadline` 字段，但出于向后兼容性考虑，实现仍然会尊重这些字段。

[`IP`](/pkg/net/#IP) 类型的 [`String`](/pkg/net/#IP.String) 方法对于无效 `IP` 地址的结果发生了变化。在过去版本中，如果 `IP` 字节切片的长度不是 0、4 或 16，`String` 会返回 `"?"`。Go 1.7 增加了字节的十六进制编码，例如 `"?12ab"`。

纯 Go 实现的 [名称解析](/pkg/net/#hdr-Name_Resolution) 现在会遵循 `nsswitch.conf` 中关于 DNS 查询与本地文件（即 `/etc/hosts`）查询优先级的配置。

#### [net/http](/pkg/net/http/)

[`ResponseWriter`](/pkg/net/http/#ResponseWriter) 的文档现在明确了开始写入响应可能会阻止后续读取请求体。为了最大程度兼容，建议实现在写入任何响应部分之前完全读取请求体。

作为引入 [context](#context) 的一部分，[`Request`](/pkg/net/http/#Request) 新增了两个方法：[`Context`](/pkg/net/http/#Request.Context) 用于获取关联的 context，以及 [`WithContext`](/pkg/net/http/#Request.WithContext) 用于创建具有修改后 context 的 `Request` 副本。

在 [`Server`](/pkg/net/http/#Server) 的实现中，[`Serve`](/pkg/net/http/#Server.Serve) 会在请求 context 中记录两部分信息：使用键 `ServerContextKey` 存储底层 `*Server`，以及使用键 `LocalAddrContextKey` 存储接收请求的本地地址（类型为 [`Addr`](/pkg/net/#Addr)）。例如，接收请求的地址可以通过 `req.Context().Value(http.LocalAddrContextKey).(net.Addr)` 获取。

服务器的 [`Serve`](/pkg/net/http/#Server.Serve) 方法现在仅在 `Server.TLSConfig` 字段为 `nil` 或其 `TLSConfig.NextProtos` 包含 `"h2"` 时，才启用 HTTP/2 支持。

服务器的实现现在会按照协议要求，将小于 100 的响应状态码填充为三位数，因此 `w.WriteHeader(5)` 使用的 HTTP 响应状态将是 `005`，而不仅仅是 `5`。

服务器的实现现在遵循 [RFC 7230](https://tools.ietf.org/html/rfc7230#section-3.3.1) 的规定，在显式设置 "chunked" 时正确地只发送一个 "Transfer-Encoding" 头。

服务器的实现现在对于拒绝无效 HTTP 版本的请求更加严格。声称是 HTTP/0.x 的无效请求现在会被拒绝（HTTP/0.9 从未被完全支持），除了 "PRI \* HTTP/2.0" 升级请求外，明文 HTTP/2 请求现在也会被拒绝。服务器仍然会处理加密的 HTTP/2 请求。

在服务器中，当响应体为空时，超时处理程序现在会发回 200 状态码，而不是发回 0 作为状态码。

在客户端，[`Transport`](/pkg/net/http/#Transport) 的实现会将请求 context 传递给连接到远程服务器的任何拨号操作。如果需要自定义拨号器，建议使用新的 `Transport` 字段 `DialContext` 而不是现有的 `Dial` 字段，以便 transport 能够提供 context。

[`Transport`](/pkg/net/http/#Transport) 还新增了 `IdleConnTimeout`、`MaxIdleConns` 和 `MaxResponseHeaderBytes` 字段，以帮助控制空闲或频繁通信的服务器所消耗的客户端资源。

[`Client`](/pkg/net/http/#Client) 配置的 `CheckRedirect` 函数现在可以返回 `ErrUseLastResponse`，表示应将最近的重定向响应作为 HTTP 请求的结果返回。现在，`CheckRedirect` 函数可以通过 `req.Response` 访问该响应。

自 Go 1 起，HTTP 客户端的默认行为是使用 `Accept-Encoding` 请求头请求服务器端压缩，然后透明地解压响应体，并且可以通过 [`Transport`](/pkg/net/http/#Transport) 的 `DisableCompression` 字段调整此行为。在 Go 1.7 中，为了辅助 HTTP 代理的实现，[`Response`](/pkg/net/http/#Response) 的新字段 `Uncompressed` 用于报告是否发生了此透明解压。

[`DetectContentType`](/pkg/net/http/#DetectContentType) 增加了对一些新的音频和视频内容类型的支持。

#### [net/http/cgi](/pkg/net/http/cgi/)

[`Handler`](/pkg/net/http/cgi/#Handler) 新增了一个 `Stderr` 字段，允许将子进程的标准错误输出从宿主进程的标准错误输出中重定向出来。

#### [net/http/httptest](/pkg/net/http/httptest/)

新函数 [`NewRequest`](/pkg/net/http/httptest/#NewRequest) 准备了一个新的 [`http.Request`](/pkg/net/http/#Request)，适合在测试期间传递给 [`http.Handler`](/pkg/net/http/#Handler)。

[`ResponseRecorder`](/pkg/net/http/httptest/#ResponseRecorder) 的新方法 [`Result`](/pkg/net/http/httptest/#ResponseRecorder.Result) 返回记录的 [`http.Response`](/pkg/net/http/#Response)。需要检查响应头或拖挂信息的测试应该调用 `Result` 并检查响应字段，而不是直接访问 `ResponseRecorder` 的 `HeaderMap`。

#### [net/http/httputil](/pkg/net/http/httputil/)

[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 的实现在无法连接后端时现在会以 "502 Bad Gateway" 响应；而在早期版本中，它响应的是 "500 Internal Server Error"。[`ClientConn`](/pkg/net/http/httputil/#ClientConn) 和 [`ServerConn`](/pkg/net/http/httputil/#ServerConn) 均已被标记为废弃。它们属于底层且陈旧的接口，当前 Go 语言的 HTTP 栈已不再使用，后续也不会继续更新。程序应改用 [`http.Client`](/pkg/net/http/#Client)、[`http.Transport`](/pkg/net/http/#Transport) 和 [`http.Server`](/pkg/net/http/#Server)。

#### [net/http/pprof](/pkg/net/http/pprof/)

用于处理路径 `/debug/pprof/trace` 的运行时跟踪 HTTP 处理程序，现在其 `seconds` 查询参数支持接受小数数值，允许收集小于一秒的跟踪间隔数据。这在高负载服务器上尤为实用。

#### [net/mail](/pkg/net/mail/)

地址解析器现已允许地址中包含未转义的 UTF-8 文本（遵循 [RFC 6532](https://tools.ietf.org/html/rfc6532)），但不会对结果进行任何标准化处理。为兼容旧版邮件解析器，地址编码器（即 [`Address`](/pkg/net/mail/#Address) 的 [`String`](/pkg/net/mail/#Address.String) 方法）仍会按照 [RFC 5322](https://tools.ietf.org/html/rfc5322) 对所有 UTF-8 文本进行转义。

[`ParseAddress`](/pkg/net/mail/#ParseAddress) 函数和 [`AddressParser.Parse`](/pkg/net/mail/#AddressParser.Parse) 方法现在更加严格。它们过去会忽略电子邮件地址后的所有字符，但现在除了空白字符外，其他字符都会导致返回错误。

#### [net/url](/pkg/net/url/)

[`URL`](/pkg/net/url/#URL) 新增的 `ForceQuery` 字段用于记录 URL 是否必须包含查询字符串，以区分没有查询字符串的 URL（如 `/search`）与带有空查询字符串的 URL（如 `/search?`）。

#### [os](/pkg/os/)

在支持 `syscall.ENOTEMPTY` 错误的系统上，[`IsExist`](/pkg/os/#IsExist) 现在对该错误也返回 `true`。

在 Windows 上，[`Remove`](/pkg/os/#Remove) 现在会尽可能删除只读文件，使其实现行为与非 Windows 系统保持一致。

#### [os/exec](/pkg/os/exec/)

作为引入 [上下文（context）](#context) 的一部分，新增的构造函数 [`CommandContext`](/pkg/os/exec/#CommandContext) 与 [`Command`](/pkg/os/exec/#Command) 类似，但包含一个可用于取消命令执行的上下文。

#### [os/user](/pkg/os/user/)

[`Current`](/pkg/os/user/#Current) 函数现在即使在 cgo 不可用时也能实现。

新增的 [`Group`](/pkg/os/user/#Group) 类型，以及查找函数 [`LookupGroup`](/pkg/os/user/#LookupGroup) 和 [`LookupGroupId`](/pkg/os/user/#LookupGroupId)，再加上 `User` 结构体中新增的 `GroupIds` 字段，提供了访问系统特定用户组信息的能力。

#### [reflect](/pkg/reflect/)

尽管 [`Value`](/pkg/reflect/#Value) 的 [`Field`](/pkg/reflect/#Value.Field) 方法文档一直说明若给定的字段编号 `i` 越界会引发恐慌（panic），但它实际上却静默返回了一个零值的 [`Value`](/pkg/reflect/#Value)。Go 1.7 修改了该方法使其行为与文档描述一致。

新增的 [`StructOf`](/pkg/reflect/#StructOf) 函数可在运行时构造结构体类型。它完善了类型构造器集合，与 [`ArrayOf`](/pkg/reflect/#ArrayOf)、[`ChanOf`](/pkg/reflect/#ChanOf)、[`FuncOf`](/pkg/reflect/#FuncOf)、[`MapOf`](/pkg/reflect/#MapOf)、[`PtrTo`](/pkg/reflect/#PtrTo) 和 [`SliceOf`](/pkg/reflect/#SliceOf) 共同构成完整的类型构造体系。

[`StructTag`](/pkg/reflect/#StructTag) 新增的方法 [`Lookup`](/pkg/reflect/#StructTag.Lookup) 类似于 [`Get`](/pkg/reflect/#StructTag.Get)，但能够区分不包含给定键的标签与将给定键关联到空字符串的标签。

[`Type`](/pkg/reflect/#Type) 和 [`Value`](/pkg/reflect/#Value) 的 [`Method`](/pkg/reflect/#Type.Method) 和 [`NumMethod`](/pkg/reflect/#Type.NumMethod) 方法现在不再返回或计数未导出的方法。

#### [strings](/pkg/strings/)

在 Go 的早期版本中，如果请求 [`Reader`](/pkg/strings/#Reader) 的 [`Read`](/pkg/strings/#Reader.Read) 方法读取零字节且无剩余数据，它会返回计数 0 且无错误。现在它返回计数 0 和错误 [`io.EOF`](/pkg/io/#EOF)。

[`Reader`](/pkg/strings/#Reader) 类型新增了 [`Reset`](/pkg/strings/#Reader.Reset) 方法，以便重用 `Reader`。

#### [time](/pkg/time/)

[`Duration`](/pkg/time/#Duration) 的 `time.Duration.String` 方法现在将零时长报告为 `"0s"` 而非 `"0"`。[`ParseDuration`](/pkg/time/#ParseDuration) 继续接受这两种形式。

方法调用 `time.Local.String()` 现在在所有系统上都返回 `"Local"`；在早期版本中，它在 Windows 上返回空字符串。

`$GOROOT/lib/time` 中的时区数据库已更新至 IANA 版本 2016d。此回退数据库仅在无法找到系统时区数据库时使用（例如在 Windows 上）。Windows 时区缩写列表也已更新。

#### [syscall](/pkg/syscall/)

在 Linux 上，[`SysProcAttr`](/pkg/syscall/#SysProcAttr) 结构体（如用于 [`os/exec.Cmd`](/pkg/os/exec/#Cmd) 的 `SysProcAttr` 字段）新增了 `Unshareflags` 字段。若此字段非零，由 [`ForkExec`](/pkg/syscall/#ForkExec)（如用于 `exec.Cmd` 的 `Run` 方法）创建的子进程将在执行新程序前调用 [_unshare_(2)](https://man7.org/linux/man-pages/man2/unshare.2.html) 系统调用。

#### [unicode](/pkg/unicode/)

[`unicode`](/pkg/unicode/) 包及相关系统支持已从版本 8.0 升级至 [Unicode 9.0](https://www.unicode.org/versions/Unicode9.0.0/)。