---
title: Go 1.7 发布说明
---

<!--
for acme:
Edit .,s;^PKG:([a-z][A-Za-z0-9_/]+);<a href="/pkg/\1/"><code>\1</code></a>;g
Edit .,s;^([a-z][A-Za-z0-9_/]+)\.([A-Z][A-Za-z0-9_]+\.)?([A-Z][A-Za-z0-9_]+)([ .',)]|$);<a href="/pkg/\1/#\2\3"><code>\3</code></a>\4;g
Edit .,s;^FULL:([a-z][A-Za-z0-9_/]+)\.([A-Z][A-Za-z0-9_]+\.)?([A-Z][A-Za-z0-9_]+)([ .',)]|$);<a href="/pkg/\1/#\2\3"><code>\1.\2\3</code></a>\4;g
Edit .,s;^DPKG:([a-z][A-Za-z0-9_/]+);<dl id="\1"><a href="/pkg/\1/">\1</a></dl>;g
rsc last updated through 6729576
-->

<!--
NOTE: In this document and others in this directory, the convention is to
set fixed-width phrases with non-fixed-width spaces, as in
`hello` `world`.
Do not send CLs removing the interior tags from such phrases.
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.7 简介 {#introduction}

最新的 Go 发行版 1.7 在 1.6 版本发布六个月后问世。
其大部分变更集中在工具链、运行时和库的实现方面。
语言规范有一个微小的改动。
一如既往，此版本遵守 Go 1 的[兼容性承诺](/doc/go1compat.html)。
我们预期几乎所有 Go 程序都能像以前一样继续编译和运行。

本次发布[新增了 IBM LinuxOne 平台移植](#ports)；[更新了 x86-64 编译器后端](#compiler)以生成更高效的代码；包含了从[x/net 子仓库](https://golang.org/x/net/context)提升并现已被标准库使用的[context 包](#context)；并且[在 testing 包中增加了支持](#testing)，用于创建测试和基准测试的层次结构。
此次发布还[完成了在 Go 1.5 中开始的 vendor 支持](#cmd_go)，使其成为标准功能。

## 语言变更 {#language}

本次发布有一个微小的语言变更。
关于[终止语句](/ref/spec#Terminating_statements)的章节进行了澄清：为了确定一个语句列表是否以终止语句结尾，将考虑“最终非空语句”作为结束，这与 gc 和 gccgo 编译器工具链的现有行为一致。
在早期版本中，定义仅提及“最终语句”，这使得尾随空语句的效果至少是不清楚的。
[`go/types`](/pkg/go/types/) 包已更新以匹配 gc 和 gccgo 编译器工具链在这一方面的行为。
此变更不影响现有程序的正确性。

## 平台移植 {#ports}

Go 1.7 增加了对 macOS 10.12 Sierra 的支持。
使用 1.7 之前版本 Go 构建的二进制文件将无法在 Sierra 上正确运行。

Go 1.7 增加了对 [Linux on z Systems](https://en.wikipedia.org/wiki/Linux_on_z_Systems) (`linux/s390x`) 的实验性移植，并开始了向 Plan 9 on ARM (`plan9/arm`) 的移植工作。

在 Go 1.6 中添加的针对 Linux 上 64 位 MIPS (`linux/mips64` 和 `linux/mips64le`) 的实验性移植现在已完全支持 cgo 和外部链接。

针对 Linux 上小端序 64 位 PowerPC (`linux/ppc64le`) 的实验性移植现在要求 POWER8 或更新的架构。
大端序 64 位 PowerPC (`linux/ppc64`) 仅要求 POWER5 架构。

OpenBSD 移植现在要求 OpenBSD 5.6 或更高版本，以便使用 [_getentropy_(2)](https://man.openbsd.org/getentropy.2) 系统调用。

### 已知问题 {#known_issues}

FreeBSD 上存在一些已知但尚未理解的不稳定情况。
这些情况在极少数情况下可能导致程序崩溃。
参见 [issue 16136](/issue/16136)、[issue 15658](/issue/15658) 和 [issue 16396](/issue/16396)。
任何有助于解决这些 FreeBSD 特定问题的帮助都将不胜感激。

## 工具 {#tools}

### 汇编器 {#cmd_asm}

对于 64 位 ARM 系统，向量寄存器名称已更正为 `V0` 到 `V31`；之前的发行版错误地将它们称为 `V32` 到 `V63`。

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

此版本为 64 位 x86 系统包含了一个新的代码生成后端，这基于一个[2015 年的提案](/s/go17ssa)，该提案自那时起一直在开发中。
新的后端基于 [SSA](https://en.wikipedia.org/wiki/Static_single_assignment_form)（静态单赋值形式），生成更紧凑、更高效的代码，并为边界检查消除等优化提供了更好的平台。
新的后端将我们基准测试程序所需的 CPU 时间减少了 5-35%。

对于此版本，可以通过向编译器传递 `-ssa=0` 来禁用新的后端。
如果您发现您的程序仅在禁用新后端的情况下才能成功编译或运行，请[提交错误报告](/issue/new)。

编译器写入包存档中的导出元数据格式已更改：旧的文本格式已被更紧凑的二进制格式取代。
这导致包存档略有减小，并修复了一些长期存在的边缘情况错误。

对于此版本，可以通过向编译器传递 `-newexport=0` 来禁用新的导出格式。
如果您发现您的程序仅在禁用新导出格式的情况下才能成功编译或运行，请[提交错误报告](/issue/new)。

链接器的 `-X` 选项不再支持不常见的双参数形式 `-X` `name` `value`，正如 Go 1.6 发布说明中的[公告](/doc/go1.6#compiler)以及链接器打印的警告中所述。
请改用 `-X` `name=value` 形式。

编译器和链接器已优化，在此版本中的运行速度明显快于 Go 1.6，尽管它们仍然比我们期望的要慢，并且将在未来的版本中继续优化。

由于整个编译器工具链和标准库的变更，使用此版本构建的二进制文件通常比使用 Go 1.6 构建的二进制文件要小，有时甚至小 20-30%。
在 x86-64 系统上，Go 程序现在会像 Linux 的 perf 和 Intel 的 VTune 等性能分析工具所预期的那样维护栈帧指针，这使得使用这些工具分析和优化 Go 程序变得更加容易。维护帧指针会带来少量的运行时开销，其大小不一，但平均约为 2%。我们希望在未来版本中降低此成本。若要构建不使用帧指针的工具链，请在运行 `make.bash`、`make.bat` 或 `make.rc` 时设置 `GOEXPERIMENT=noframepointer`。

### Cgo {#cmd_cgo}

使用 [cgo](/cmd/cgo/) 的包现在可以包含 Fortran 源文件（除了 C、C++、Objective C 和 SWIG 之外），尽管 Go 绑定仍然必须使用 C 语言 API。

Go 绑定现在可以使用一个新的辅助函数 `C.CBytes`。与接受 Go `string` 并返回 `*C.byte`（C 的 `char*`）的 `C.CString` 不同，`C.CBytes` 接受 Go 的 `[]byte` 并返回一个 `unsafe.Pointer`（C 的 `void*`）。

在之前的版本中，使用 `cgo` 构建的包和二进制文件每次构建都会产生不同的输出，这是由于嵌入了临时目录名称。当使用此版本以及足够新版本的 GCC 或 Clang（那些支持 `-fdebug-prefix-map` 选项的版本）时，这些构建最终应该是确定性的。

### Gccgo {#gccgo}

由于 Go 的半年度发布计划与 GCC 的年度发布计划对齐，GCC 6 发布版本包含了 Go 1.6.1 版本的 gccgo。下一个发布版本 GCC 7 很可能会包含 Go 1.8 版本的 gccgo。

### Go 命令 {#cmd_go}

[`go`](/cmd/go/) 命令的基本操作保持不变，但有许多值得注意的变更。

此版本移除了对 `GO15VENDOREXPERIMENT` 环境变量的支持，正如 Go 1.6 发布说明中的[公告](/doc/go1.6#go_command)所述。[Vendoring 支持](/s/go15vendor)现在是 `go` 命令和工具链的标准功能。

现在，“`go` `list`” 命令可用的 `Package` 数据结构包含了一个 `StaleReason` 字段，用于解释为什么特定的包被视为过时（需要重建）或没有。该字段可用于 `-f` 或 `-json` 选项，对于理解目标为何正在重建非常有用。

“`go` `get`” 命令现在支持指向 `git.openstack.org` 的导入路径。

此版本添加了使用[仅二进制包](/pkg/go/build#hdr-Binary_Only_Packages)构建程序的实验性、最小化支持，即以二进制形式分发而没有相应源代码的包。此功能在某些商业环境中是必需的，但并不打算完全集成到工具链的其余部分。例如，假设可以访问完整源代码的工具将无法与此类包一起使用，并且目前没有计划在“`go` `get`”命令中支持此类包。

### Go doc {#cmd_doc}

“`go` `doc`” 命令现在将构造函数与其构造的类型分组，遵循 [`godoc`](/cmd/godoc/) 的做法。

### Go vet {#cmd_vet}

“`go` `vet`” 命令在其 `-copylock` 和 `-printf` 检查中具有更准确的分析，并新增了一个 `-tests` 检查，用于检查可能测试函数的名称和签名。为避免与新的 `-tests` 检查混淆，旧的、未公布的 `-test` 选项已被移除；它等同于 `-all` `-shadow`。

`vet` 命令还有一个新的检查项 `-lostcancel`，它能检测未调用由 Go 1.7 新 `context` 包中的 `WithCancel`、`WithTimeout` 和 `WithDeadline` 函数返回的取消函数的情况（参见[下文](#context)）。未调用该函数会导致新的 `Context` 无法被回收，直到其父级被取消。（背景上下文永远不会被取消。）

### Go tool dist {#cmd_dist}

新的子命令“`go` `tool` `dist` `list`”会打印所有支持的操作系统/架构对。

### Go tool trace {#cmd_trace}

“`go` `tool` `trace`” 命令，[在 Go 1.5 中引入](/doc/go1.5#trace_command)，已在多方面进行了改进。

首先，收集跟踪数据比之前的版本显著高效。在此版本中，收集跟踪的典型执行时间开销约为 25%；而在过去的版本中，至少为 400%。其次，跟踪文件现在包含文件和行号信息，使其更加自包含，并且在运行跟踪工具时原始可执行文件变为可选。第三，跟踪工具现在会拆分大型跟踪，以避免基于浏览器的查看器的限制。

尽管此版本的跟踪文件格式有所变更，但 Go 1.7 工具仍然可以读取早期版本的跟踪。

## 性能 {#performance}

一如既往，变更非常普遍和多样，因此难以做出精确的性能说明。大多数程序应该会运行得稍快一些，这是由于垃圾回收的加速以及核心库的优化。在 x86-64 系统上，由于新编译器后端带来的生成代码改进，许多程序将运行得明显更快。如上所述，在我们自己的基准测试中，仅代码生成的变更通常就能使程序 CPU 时间减少 5-35%。

<!-- git log -''-grep '-[0-9][0-9]\.[0-9][0-9]%' go1.6.. -->
在以下包的实现中，已有显著优化带来了超过 10% 的性能提升：
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
[`unicode`](/pkg/unicode/) 以及
[`unicode/utf16`](/pkg/unicode/utf16/)。

对于拥有大量空闲 goroutine、栈大小显著波动或大型包级变量的程序，垃圾回收暂停时间应比 Go 1.6 中显著缩短。

## 标准库 {#library}

### Context {#context}
Go 1.7 将 `golang.org/x/net/context` 包迁移至标准库，成为 [`context`](/pkg/context/)。这使得在其他标准库包中可以使用 context 进行取消操作、超时设置以及传递请求作用域数据，这些包包括：

- [net](#net)、
- [net/http](#net_http) 和
- [os/exec](#os_exec)，

具体说明见下文。

更多关于 context 的信息，请参阅
[包文档](/pkg/context/)
和 Go 官方博客文章
“[Go 并发模式：Context](/blog/context)”。

### HTTP 追踪 {#httptrace}

Go 1.7 引入了 [`net/http/httptrace`](/pkg/net/http/httptrace/) 包，该包提供了跟踪 HTTP 请求内部事件的机制。

### 测试 {#testing}

`testing` 包现在支持定义包含子测试的测试用例和包含子基准测试的基准测试。这项支持使得编写表驱动基准测试和创建层次化测试变得容易。它还提供了一种共享通用设置和清理代码的方式。详情请参阅[包文档](/pkg/testing/#hdr-Subtests_and_Sub_benchmarks)。

### 运行时 {#runtime}

现在，运行时触发的所有 panic 都使用实现了内建
[`error`](/ref/spec#Errors) 和
[`runtime.Error`](/pkg/runtime/#Error) 接口的 panic 值，这符合
[语言规范的要求](/ref/spec#Run_time_panics)。

在 panic 期间，如果已知信号的名称，它将被打印在堆栈跟踪中。否则，将像 Go 1.7 之前一样使用信号的编号。

新函数
[`KeepAlive`](/pkg/runtime/#KeepAlive)
提供了一种显式机制，用于声明一个已分配的对象在程序中的特定点必须被视为可达的，通常用于延迟关联析构器的执行。

新函数
[`CallersFrames`](/pkg/runtime/#CallersFrames)
将从 [`Callers`](/pkg/runtime/#Callers) 获取的 PC 切片转换为与调用栈对应的帧序列。这个新的 API 应该优先于直接使用 [`FuncForPC`](/pkg/runtime/#FuncForPC)，因为帧序列可以更准确地描述包含内联函数调用的调用栈。

新函数
[`SetCgoTraceback`](/pkg/runtime/#SetCgoTraceback)
有助于通过 cgo 调用、在同一进程中执行的 Go 代码和 C 代码之间更紧密地集成。

在 32 位系统上，运行时现在可以使用操作系统在地址空间任意位置分配的内存，消除了某些环境中常见的“OS 分配的内存不在可用范围内”错误。

现在，在所有架构上，运行时都可以将未使用的内存归还给操作系统。在 Go 1.6 及更早版本中，运行时无法在 ARM64、64 位 PowerPC 或 MIPS 上释放内存。

在 Windows 上，Go 1.5 及更早版本的 Go 程序在启动时会通过调用 `timeBeginPeriod(1)` 将全局 Windows 定时器分辨率强制设置为 1ms。更改全局定时器分辨率在某些系统上会导致问题，并且测试表明，为了获得良好的调度器性能，并不需要此调用，因此 Go 1.6 移除了该调用。Go 1.7 重新引入了该调用：在某些工作负载下，该调用对于保持良好的调度器性能仍然是必需的。

### 库的次要变更 {#minor_library_changes}

一如既往，库中包含了各种次要变更和更新，这些都是在遵循 Go 1 [兼容性承诺](/doc/go1compat)的前提下进行的。

#### [bufio](/pkg/bufio/)

在以前的 Go 版本中，如果向 [`Reader`](/pkg/bufio/#Reader) 的 [`Peek`](/pkg/bufio/#Reader.Peek) 方法请求的字节数超过了底层缓冲区的大小，它会返回一个空切片和错误 `ErrBufferFull`。现在，它会返回整个底层缓冲区，同时仍然伴有错误 `ErrBufferFull`。

#### [bytes](/pkg/bytes/)

新增了函数 [`ContainsAny`](/pkg/bytes/#ContainsAny) 和 [`ContainsRune`](/pkg/bytes/#ContainsRune)，以保持与 [`strings`](/pkg/strings/) 包的对称性。

在以前的 Go 版本中，如果向 [`Reader`](/pkg/bytes/#Reader) 的 [`Read`](/pkg/bytes/#Reader.Read) 方法请求零字节且没有剩余数据，它会返回计数 0 且没有错误。现在，它会返回计数 0 和错误 [`io.EOF`](/pkg/io/#EOF)。

[`Reader`](/pkg/bytes/#Reader) 类型新增了一个方法 [`Reset`](/pkg/bytes/#Reader.Reset)，允许重用 `Reader`。

#### [compress/flate](/pkg/compress/flate/)

整个包中进行了多项性能优化。解压速度提高了约 10%，而 `DefaultCompression` 的压缩速度提升了一倍。

除了这些通用改进外，
`BestSpeed` 压缩器已被完全替换，它使用了类似于 [Snappy](https://github.com/google/snappy) 的算法，速度提高了约 2.5 倍，尽管输出可能比之前的算法大 5-10%。

还新增了一个压缩级别
`HuffmanOnly`，它仅应用霍夫曼编码而不应用 Lempel-Ziv 编码。
[放弃 Lempel-Ziv 编码](https://blog.klauspost.com/constant-time-gzipzip-compression/)意味着
`HuffmanOnly` 的运行速度比新的 `BestSpeed` 快约 3 倍，但代价是生成的压缩输出比新的 `BestSpeed` 大 20-40%。

需要注意的是，`BestSpeed` 和 `HuffmanOnly` 生成的压缩输出都符合
[RFC 1951](https://tools.ietf.org/html/rfc1951) 标准。
换句话说，任何有效的 DEFLATE 解压缩器都将继续能够解压缩这些输出。

最后，解压器对 [`io.Reader`](/pkg/io/#Reader) 的实现有一个小改动。在之前的版本中，解压器会将 [`io.EOF`](/pkg/io/#EOF) 的报告推迟到完全无法再读取更多字节时。现在，它在读取最后一组字节时会更及时地报告 [`io.EOF`](/pkg/io/#EOF)。

#### [crypto/tls](/pkg/crypto/tls/)
TLS实现在每个连接初始发送数据时使用较小的记录大小，逐步增加至TLS最大记录大小。这种启发式方法减少了首包解密前所需接收的数据量，从而改善低带宽网络下的通信延迟。若将[`Config`](/pkg/crypto/tls/#Config)结构体的`DynamicRecordSizingDisabled`字段设为true，则会强制使用Go 1.6及更早版本的行为——从连接开始就使用尽可能大的数据包。

TLS客户端现在对服务端发起的重协商提供了可选的有限支持，需通过设置[`Config`](/pkg/crypto/tls/#Config)结构体的`Renegotiation`字段来启用。该功能对于连接许多Microsoft Azure服务器是必要的。

该包返回的错误现在统一以`tls:`前缀开头。在以往版本中，部分错误使用`crypto/tls:`前缀，部分使用`tls:`前缀，还有部分完全没有前缀。

生成自签名证书时，该包默认不再设置"Authority Key Identifier"字段。

#### [crypto/x509](/pkg/crypto/x509/)

新增函数[`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool)可在系统可用时访问整个系统证书池。同时新增关联错误类型[`SystemRootsError`](/pkg/crypto/x509/#SystemRootsError)。

#### [debug/dwarf](/pkg/debug/dwarf/)

[`Reader`](/pkg/debug/dwarf/#Reader)类型新增的[`SeekPC`](/pkg/debug/dwarf/#Reader.SeekPC)方法与[`Data`](/pkg/debug/dwarf/#Data)类型新增的[`Ranges`](/pkg/debug/dwarf/#Ranges)方法，有助于查找要传递给[`LineReader`](/pkg/debug/dwarf/#LineReader)的编译单元，并识别给定程序计数器对应的具体函数。

#### [debug/elf](/pkg/debug/elf/)

新增的[`R_390`](/pkg/debug/elf/#R_390)重定位类型及其众多预定义常量为S390端口提供支持。

#### [encoding/asn1](/pkg/encoding/asn1/)

ASN.1解码器现在会拒绝非最小化整数编码。这可能导致该包拒绝某些此前虽无效但仍被接受的ASN.1数据。

#### [encoding/json](/pkg/encoding/json/)

[`Encoder`](/pkg/encoding/json/#Encoder)新增的[`SetIndent`](/pkg/encoding/json/#Encoder.SetIndent)方法可设置JSON编码的缩进参数，功能类似顶层的[`Indent`](/pkg/encoding/json/#Indent)函数。

[`Encoder`](/pkg/encoding/json/#Encoder)新增的[`SetEscapeHTML`](/pkg/encoding/json/#Encoder.SetEscapeHTML)方法控制是否将带引号字符串中的`&`、`<`和`>`字符分别转义为`\u0026`、`\u003c`和`\u003e`。与之前版本相同，编码器默认启用此转义功能，以避免JSON嵌入HTML时可能引发的问题。

在Go早期版本中，该包仅支持使用字符串类型作为键的映射（map）编码与解码。Go 1.7新增了对整数类型键映射的支持：编码时使用带引号的十进制表示作为JSON键。Go 1.7还支持编码实现了`MarshalText`方法（参见[`encoding.TextMarshaler`](/pkg/encoding/#TextMarshaler)）的非字符串键映射，以及支持解码实现了`UnmarshalText`方法（参见[`encoding.TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler)）的非字符串键映射。为保持与Go早期版本编码解码行为的兼容，这些方法对字符串类型键无效。

当编码字节类型的切片时，[`Marshal`](/pkg/encoding/json/#Marshal)现在会优先使用该字节类型的`MarshalJSON`或`MarshalText`方法（若存在）生成元素数组编码，仅当两种方法都不可用时才回退到默认的base64编码字符串。Go早期版本同时接受原始base64字符串编码和数组编码（假设字节类型相应实现了`UnmarshalJSON`或`UnmarshalText`），因此此变更在语义上应与早期版本向后兼容，尽管它确实改变了编码选择。

#### [go/build](/pkg/go/build/)

为实现go命令对二进制专用包及cgo包中Fortran代码的新支持，[`Package`](/pkg/go/build/#Package)类型新增了`BinaryOnly`、`CgoFFLAGS`和`FFiles`字段。

#### [go/doc](/pkg/go/doc/)

为支持前述`go test`的对应变更，[`Example`](/pkg/go/doc/#Example)结构体新增Unordered字段，指示该示例的输出行是否可能以任意顺序生成。

#### [io](/pkg/io/)

该包新增常量`SeekStart`、`SeekCurrent`和`SeekEnd`，供[`Seeker`](/pkg/io/#Seeker)实现使用。推荐优先使用这些常量而非`os.SEEK_SET`、`os.SEEK_CUR`和`os.SEEK_END`，但后者将为兼容性而保留。

#### [math/big](/pkg/math/big/)

[`Float`](/pkg/math/big/#Float)类型新增[`GobEncode`](/pkg/math/big/#Float.GobEncode)和[`GobDecode`](/pkg/math/big/#Float.GobDecode)方法，使得`Float`类型值现在可通过[`encoding/gob`](/pkg/encoding/gob/)包进行编码解码。

#### [math/rand](/pkg/math/rand/)

[`Read`](/pkg/math/rand/#Read)函数及[`Rand`](/pkg/math/rand/#Rand)的[`Read`](/pkg/math/rand/#Rand.Read)方法现在生成的伪随机字节流具有确定性，且不依赖于输入缓冲区的大小。

文档明确说明：Rand的[`Seed`](/pkg/math/rand/#Rand.Seed)和[`Read`](/pkg/math/rand/#Rand.Read)方法并非并发安全，而全局函数[`Seed`](/pkg/math/rand/#Seed)和[`Read`](/pkg/math/rand/#Read)则是（且一直是）安全的。

#### [mime/multipart](/pkg/mime/multipart/)

[`Writer`](/pkg/mime/multipart/#Writer)实现现在按键排序输出每个multipart部分的头部。此前因映射迭代顺序的不确定性，部分头部字段顺序不固定。
#### [net](/pkg/net/)

随着 [context](#context) 的引入，[`Dialer`](/pkg/net/#Dialer) 类型新增了一个方法 [`DialContext`](/pkg/net/#Dialer.DialContext)，它与 [`Dial`](/pkg/net/#Dialer.Dial) 类似，但为拨号操作增加了 [`context.Context`](/pkg/context/#Context) 参数。该上下文旨在取代 `Dialer` 的 `Cancel` 和 `Deadline` 字段，但为了向后兼容，实现中仍会继续支持这些字段。

`IP` 类型的 `String` 方法对于无效的 `IP` 地址更改了其返回结果。在过去版本中，如果一个 `IP` 字节切片长度不是 0、4 或 16，`String` 会返回 `"?"`。Go 1.7 增加了该字节的十六进制编码，例如 `"?12ab"`。

纯 Go 实现的 [名称解析](/pkg/net/#hdr-Name_Resolution) 现在会尊重 `nsswitch.conf` 中关于 DNS 查找与本地文件（即 `/etc/hosts`）查找优先级的配置。

#### [net/http](/pkg/net/http/)

[`ResponseWriter`](/pkg/net/http/#ResponseWriter) 的文档现在明确说明，开始写入响应可能会阻止后续读取请求正文。为了获得最大兼容性，建议实现者在写入任何响应部分之前，完整读取请求正文。

随着 [context](#context) 的引入，[`Request`](/pkg/net/http/#Request) 新增了方法 [`Context`](/pkg/net/http/#Request.Context)（用于检索关联的上下文）和 [`WithContext`](/pkg/net/http/#Request.WithContext)（用于构建带有修改后上下文的 `Request` 副本）。

在 [`Server`](/pkg/net/http/#Server) 实现中，[`Serve`](/pkg/net/http/#Server.Serve) 方法会将底层的 `*Server`（使用键 `ServerContextKey`）以及接收请求的本地地址（一个 [`net.Addr`](/pkg/net/#Addr)）（使用键 `LocalAddrContextKey`）记录到请求上下文中。例如，接收请求的地址是 `req.Context().Value(http.LocalAddrContextKey).(net.Addr)`。

服务器的 [`Serve`](/pkg/net/http/#Server.Serve) 方法现在仅在 `Server.TLSConfig` 字段为 `nil` 或在其 `TLSConfig.NextProtos` 中包含 `"h2"` 时才启用 HTTP/2 支持。

服务器实现现在会按照协议要求，将小于 100 的响应状态码填充为三位数字，因此 `w.WriteHeader(5)` 将使用 HTTP 响应状态 `005`，而不是 `5`。

服务器实现在显式设置 "chunked" 时，现在能正确地只发送一个 "Transfer-Encoding" 头部，遵循 [RFC 7230](https://tools.ietf.org/html/rfc7230#section-3.3.1)。

服务器实现在拒绝包含无效 HTTP 版本的请求方面更加严格。声称是 HTTP/0.x 的无效请求现在会被拒绝（HTTP/0.9 从未被完全支持），并且除了 "PRI * HTTP/2.0" 升级请求外，明文 HTTP/2 请求现在也会被拒绝。服务器继续处理加密的 HTTP/2 请求。

在服务器中，当响应体为空时，超时处理器现在会回送 200 状态码，而不是回送 0 作为状态码。

在客户端，[`Transport`](/pkg/net/http/#Transport) 实现会将请求上下文传递给任何连接到远程服务器的拨号操作。如果需要自定义拨号器，推荐使用 `Transport` 的新字段 `DialContext`，而不是现有的 `Dial` 字段，以便传输层能够提供上下文。

[`Transport`](/pkg/net/http/#Transport) 还新增了字段 `IdleConnTimeout`、`MaxIdleConns` 和 `MaxResponseHeaderBytes`，以帮助控制因空闲或通信频繁的服务器而消耗的客户端资源。

[`Client`](/pkg/net/http/#Client) 配置的 `CheckRedirect` 函数现在可以返回 `ErrUseLastResponse`，表示应将最近的重定向响应作为 HTTP 请求的结果返回。该响应现在可以通过 `req.Response` 提供给 `CheckRedirect` 函数。

自 Go 1 起，HTTP 客户端的默认行为是使用 `Accept-Encoding` 请求头请求服务端压缩，然后透明地解压缩响应体，并且此行为可通过 [`Transport`](/pkg/net/http/#Transport) 的 `DisableCompression` 字段进行调整。在 Go 1.7 中，为了辅助 HTTP 代理的实现，[`Response`](/pkg/net/http/#Response) 新增了 `Uncompressed` 字段，用于报告是否进行了这种透明解压缩。

[`DetectContentType`](/pkg/net/http/#DetectContentType) 增加了对一些新的音频和视频内容类型的支持。

#### [net/http/cgi](/pkg/net/http/cgi/)

[`Handler`](/pkg/net/http/cgi/#Handler) 新增了一个字段 `Stderr`，允许将子进程的标准错误从宿主进程的标准错误重定向出去。

#### [net/http/httptest](/pkg/net/http/httptest/)

新函数 [`NewRequest`](/pkg/net/http/httptest/#NewRequest) 用于准备一个新的 [`http.Request`](/pkg/net/http/#Request)，适合在测试期间传递给 [`http.Handler`](/pkg/net/http/#Handler)。

[`ResponseRecorder`](/pkg/net/http/httptest/#ResponseRecorder) 新增了 [`Result`](/pkg/net/http/httptest/#ResponseRecorder.Result) 方法，用于返回记录的 [`http.Response`](/pkg/net/http/#Response)。需要检查响应头部或尾部的测试应调用 `Result` 并检查响应字段，而不是直接访问 `ResponseRecorder` 的 `HeaderMap`。

#### [net/http/httputil](/pkg/net/http/httputil/)

[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 实现在无法到达后端时现在会返回 “502 Bad Gateway”；在早期版本中，它返回的是 “500 Internal Server Error”。
[
  {"package": "net/http/httputil", "updates": [
    "Both [`ClientConn`](/pkg/net/http/httputil/#ClientConn) and [`ServerConn`](/pkg/net/http/httputil/#ServerConn) have been documented as deprecated. They are low-level, old, and unused by Go's current HTTP stack and will no longer be updated. Programs should use [`http.Client`](/pkg/net/http/#Client), [`http.Transport`](/pkg/net/http/#Transport), and [`http.Server`](/pkg/net/http/#Server) instead.",
    "`ClientConn` 和 `ServerConn` 均已被标记为已弃用。它们属于底层、陈旧且未被 Go 当前 HTTP 栈使用的接口，后续将不再更新。程序应改用 [`http.Client`](/pkg/net/http/#Client)、[`http.Transport`](/pkg/net/http/#Transport) 和 [`http.Server`](/pkg/net/http/#Server)。"
  ]},
  {"package": "net/http/pprof", "updates": [
    "The runtime trace HTTP handler, installed to handle the path `/debug/pprof/trace`, now accepts a fractional number in its `seconds` query parameter, allowing collection of traces for intervals smaller than one second. This is especially useful on busy servers.",
    "用于处理 `/debug/pprof/trace` 路径的运行时追踪 HTTP 处理程序，现在其 `seconds` 查询参数支持小数形式，允许采集短于一秒的追踪数据。这在繁忙服务器上尤为实用。"
  ]},
  {"package": "net/mail", "updates": [
    "The address parser now allows unescaped UTF-8 text in addresses following [RFC 6532](https://tools.ietf.org/html/rfc6532), but it does not apply any normalization to the result. For compatibility with older mail parsers, the address encoder, namely [`Address`](/pkg/net/mail/#Address)'s [`String`](/pkg/net/mail/#Address.String) method, continues to escape all UTF-8 text following [RFC 5322](https://tools.ietf.org/html/rfc5322).",
    "地址解析器现遵循 [RFC 6532](https://tools.ietf.org/html/rfc6532) 标准，允许地址中包含未转义的 UTF-8 文本，但不会对结果进行规范化处理。为保持与旧版邮件解析器的兼容性，地址编码器（即 [`Address`](/pkg/net/mail/#Address) 的 [`String`](/pkg/net/mail/#Address.String) 方法）将继续按 [RFC 5322](https://tools.ietf.org/html/rfc5322) 标准转义所有 UTF-8 文本。",
    "The [`ParseAddress`](/pkg/net/mail/#ParseAddress) function and the [`AddressParser.Parse`](/pkg/net/mail/#AddressParser.Parse) method are stricter. They used to ignore any characters following an e-mail address, but will now return an error for anything other than whitespace.",
    "[`ParseAddress`](/pkg/net/mail/#ParseAddress) 函数与 [`AddressParser.Parse`](/pkg/net/mail/#AddressParser.Parse) 方法的校验变得更加严格。此前它们会忽略电子邮件地址后的任意字符，但现在除空白符外的任何内容都会返回错误。"
  ]},
  {"package": "net/url", "updates": [
    "The [`URL`](/pkg/url/#URL)'s new `ForceQuery` field records whether the URL must have a query string, in order to distinguish URLs without query strings (like `/search`) from URLs with empty query strings (like `/search?`).",
    "新增的 [`URL`](/pkg/url/#URL) 结构体字段 `ForceQuery` 用于记录该 URL 是否必须包含查询字符串，以区分无查询字符串的 URL（如 `/search`）与查询字符串为空的 URL（如 `/search?`）。"
  ]},
  {"package": "os", "updates": [
    "[`IsExist`](/pkg/os/#IsExist) now returns true for `syscall.ENOTEMPTY`, on systems where that error exists.",
    "在支持 `syscall.ENOTEMPTY` 错误的系统上，[`IsExist`](/pkg/os/#IsExist) 函数现在对该错误返回 true。",
    "On Windows, [`Remove`](/pkg/os/#Remove) now removes read-only files when possible, making the implementation behave as on non-Windows systems.",
    "在 Windows 系统上，[`Remove`](/pkg/os/#Remove) 函数现在会尽可能删除只读文件，使其行为与非 Windows 系统保持一致。"
  ]},
  {"package": "os/exec", "updates": [
    "As part of the introduction of [context](#context), the new constructor [`CommandContext`](/pkg/os/exec/#CommandContext) is like [`Command`](/pkg/os/exec/#Command) but includes a context that can be used to cancel the command execution.",
    "作为[上下文](#context)引入的一部分，新增的构造函数 [`CommandContext`](/pkg/os/exec/#CommandContext) 与 [`Command`](/pkg/os/exec/#Command) 类似，但额外包含可用于取消命令执行的上下文参数。"
  ]},
  {"package": "os/user", "updates": [
    "The [`Current`](/pkg/os/user/#Current) function is now implemented even when cgo is not available.",
    "即使在不支持 cgo 的环境中，[`Current`](/pkg/os/user/#Current) 函数现在也能正常实现。",
    "The new [`Group`](/pkg/os/user/#Group) type, along with the lookup functions [`LookupGroup`](/pkg/os/user/#LookupGroup) and [`LookupGroupId`](/pkg/os/user/#LookupGroupId) and the new field `GroupIds` in the `User` struct, provides access to system-specific user group information.",
    "新增的 [`Group`](/pkg/os/user/#Group) 类型，配合查询函数 [`LookupGroup`](/pkg/os/user/#LookupGroup)、[`LookupGroupId`](/pkg/os/user/#LookupGroupId) 以及 `User` 结构体中的新字段 `GroupIds`，提供了访问系统用户组信息的能力。"
  ]},
  {"package": "reflect", "updates": [
    "Although [`Value`](/pkg/reflect/#Value)'s [`Field`](/pkg/reflect/#Value.Field) method has always been documented to panic if the given field number `i` is out of range, it has instead silently returned a zero [`Value`](/pkg/reflect/#Value). Go 1.7 changes the method to behave as documented.",
    "尽管 [`Value`](/pkg/reflect/#Value) 的 [`Field`](/pkg/reflect/#Value.Field) 方法文档注明当字段索引 `i` 越界时会引发恐慌，但此前它会静默返回零值 [`Value`](/pkg/reflect/#Value)。Go 1.7 修正了该方法使其符合文档描述。",
    "The new [`StructOf`](/pkg/reflect/#StructOf) function constructs a struct type at run time. It completes the set of type constructors, joining [`ArrayOf`](/pkg/reflect/#ArrayOf), [`ChanOf`](/pkg/reflect/#ChanOf), [`FuncOf`](/pkg/reflect/#FuncOf), [`MapOf`](/pkg/reflect/#MapOf), [`PtrTo`](/pkg/reflect/#PtrTo), and [`SliceOf`](/pkg/reflect/#SliceOf).",
    "新增的 [`StructOf`](/pkg/reflect/#StructOf) 函数可在运行时动态构造结构体类型。它与 [`ArrayOf`](/pkg/reflect/#ArrayOf)、[`ChanOf`](/pkg/reflect/#ChanOf)、[`FuncOf`](/pkg/reflect/#FuncOf)、[`MapOf`](/pkg/reflect/#MapOf)、[`PtrTo`](/pkg/reflect/#PtrTo) 和 [`SliceOf`](/pkg/reflect/#SliceOf) 共同构成了完整的类型构造器集合。",
    "[`StructTag`](/pkg/reflect/#StructTag)'s new method [`Lookup`](/pkg/reflect/#StructTag.Lookup) is like [`Get`](/pkg/reflect/#StructTag.Get) but distinguishes the tag not containing the given key from the tag associating an empty string with the given key.",
    "[`StructTag`](/pkg/reflect/#StructTag) 新增的 [`Lookup`](/pkg/reflect/#StructTag.Lookup) 方法类似 [`Get`](/pkg/reflect/#StructTag.Get)，但能区分“标签不含指定键”与“标签将指定键关联空字符串”两种情况。",
    "The [`Method`](/pkg/reflect/#Type.Method) and [`NumMethod`](/pkg/reflect/#Type.NumMethod) methods of [`Type`](/pkg/reflect/#Type) and [`Value`](/pkg/reflect/#Value) no longer return or count unexported methods.",
    "[`Type`](/pkg/reflect/#Type) 和 [`Value`](/pkg/reflect/#Value) 的 [`Method`](/pkg/reflect/#Type.Method) 与 [`NumMethod`](/pkg/reflect/#Type.NumMethod) 方法不再返回或统计未导出的方法。"
  ]},
  {"package": "strings", "updates": [
    "In previous releases of Go, if [`Reader`](/pkg/strings/#Reader)'s [`Read`](/pkg/strings/#Reader.Read) method were asked for zero bytes with no data remaining, it would return a count of 0 and no error. Now it returns a count of 0 and the error [`io.EOF`](/pkg/io/#EOF).",
    "在 Go 的早期版本中，若 [`Reader`](/pkg/strings/#Reader) 的 [`Read`](/pkg/strings/#Reader.Read) 方法在数据已读完时被请求读取 0 字节，会返回计数 0 且不返回错误。现在则返回计数 0 和 [`io.EOF`](/pkg/io/#EOF) 错误。",
    "The [`Reader`](/pkg/strings/#Reader) type has a new method [`Reset`](/pkg/strings/#Reader.Reset) to allow reuse of a `Reader`.",
    "[`Reader`](/pkg/strings/#Reader) 类型新增了 [`Reset`](/pkg/strings/#Reader.Reset) 方法，允许复用 `Reader` 实例。"
  ]},
  {"package": "time", "updates": [
    "[`Duration`](/pkg/time/#Duration)'s time.Duration.String method now reports the zero duration as `\"0s\"`, not `\"0\"`. [`ParseDuration`](/pkg/time/#ParseDuration) continues to accept both forms.",
    "[`Duration`](/pkg/time/#Duration) 的 `time.Duration.String` 方法现在将零时长显示为 `\"0s\"` 而非 `\"0\"`。[`ParseDuration`](/pkg/time/#ParseDuration) 仍同时接受两种格式。",
    "The method call `time.Local.String()` now returns `\"Local\"` on all systems; in earlier releases, it returned an empty string on Windows.",
    "方法调用 `time.Local.String()` 现在在所有系统上均返回 `\"Local\"`；早期版本中 Windows 系统会返回空字符串。",
    "The time zone database in `$GOROOT/lib/time` has been updated to IANA release 2016d. This fallback database is only used when the system time zone database cannot be found, for example on Windows. The Windows time zone abbreviation list has also been updated.",
    "`$GOROOT/lib/time` 中的时区数据库已更新至 IANA 2016d 版本。该备用数据库仅在系统时区数据库缺失时使用（例如 Windows 系统）。Windows 系统的时区缩写列表也同步更新。"
  ]},
  {"package": "syscall", "updates": [
    "On Linux, the [`SysProcAttr`](/pkg/syscall/#SysProcAttr) struct (as used in [`os/exec.Cmd`](/pkg/os/exec/#Cmd)'s `SysProcAttr` field) has a new `Unshareflags` field. If the field is nonzero, the child process created by [`ForkExec`](/pkg/syscall/#ForkExec) (as used in `exec.Cmd`'s `Run` method) will call the [_unshare_(2)](https://man7.org/linux/man-pages/man2/unshare.2.html) system call before executing the new program.",
    "在 Linux 系统上，[`SysProcAttr`](/pkg/syscall/#SysProcAttr) 结构体（用于 [`os/exec.Cmd`](/pkg/os/exec/#Cmd) 的 `SysProcAttr` 字段）新增了 `Unshareflags` 字段。若该字段非零，由 [`ForkExec`](/pkg/syscall/#ForkExec) 创建的子进程（如 `exec.Cmd` 的 `Run` 方法）将在执行新程序前调用 [_unshare_(2)](https://man7.org/linux/man-pages/man2/unshare.2.html) 系统调用。"
  ]},
  {"package": "unicode", "updates": [
    "The [`unicode`](/pkg/unicode/) package and associated support throughout the system has been upgraded from version 8.0 to [Unicode 9.0](https://www.unicode.org/versions/Unicode9.0.0/).",
    "系统全局的 [`unicode`](/pkg/unicode/) 包及相关支持已从 8.0 版升级至 [Unicode 9.0](https://www.unicode.org/versions/Unicode9.0.0/)。"
  ]}
]