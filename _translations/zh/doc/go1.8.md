---
title: Go 1.8 发布说明
---

<!--
注意：在本目录的本文档及其他文档中，惯例是将固定宽度的短语
设置为非固定宽度的空格，例如 `hello` `world`。
请勿提交移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.8 简介 {#introduction}

Go 最新版本 1.8 在 [Go 1.7](go1.7) 发布六个月后发布。
其大部分变更集中在工具链、运行时和库的实现层面。
语言规范方面有[两处小改动](#language)。
一如既往，此版本遵循 Go 1 [兼容性承诺](/doc/go1compat.html)。
我们预期几乎所有 Go 程序将继续像之前一样编译和运行。

此版本新增了 [32 位 MIPS 支持](#ports)，
[更新了编译器后端](#compiler) 以生成更高效的代码，
[减少了 GC 暂停](#gc)（通过消除 stop-the-world 栈重扫描），
[增加了 HTTP/2 Push 支持](#h2push)，
[增加了 HTTP 优雅关闭功能](#http_shutdown)，
[增强了 context 支持](#more_context)，
[启用了互斥锁性能分析](#mutex_prof)，
并[简化了切片排序](#sort_slice)。

## 语言变更 {#language}

从 Go 1.8 开始，在将一个结构体类型的值显式转换为另一个结构体类型时，标签将被忽略。因此，仅标签不同的两个结构体可以相互转换：

	func example() {
		type T1 struct {
			X int `json:"foo"`
		}
		type T2 struct {
			X int `json:"bar"`
		}
		var v1 T1
		var v2 T2
		v1 = T1(v2) // 现在合法
	}

<!-- CL 17711 -->
语言规范现在仅要求实现支持浮点常量中最多 16 位的指数。这不会影响
“[`gc`](/cmd/compile/)” 或
`gccgo` 编译器，它们仍然支持 32 位指数。

## 平台支持 {#ports}

Go 现在支持 Linux 上的 32 位 MIPS，包括大端序
(`linux/mips`) 和小端序 (`linux/mipsle`) 机器，
前提是它们实现了 MIPS32r1 指令集并具备 FPU 或内核 FPU 模拟。
请注意，许多常见的基于 MIPS 的路由器缺少 FPU，并且其固件未启用内核 FPU 模拟；
Go 将无法在此类机器上运行。

在 DragonFly BSD 上，Go 现在要求 DragonFly 4.4.4 或更高版本。 <!-- CL 29491, CL 29971 -->

在 OpenBSD 上，Go 现在要求 OpenBSD 5.9 或更高版本。 <!-- CL 34093 -->

Plan 9 移植版的网络支持现在更加完善，
在截止时间和取消操作方面的行为与 Unix 和 Windows 保持一致。
有关 Plan 9 内核要求，请参阅 [Plan 9 wiki 页面](/wiki/Plan9)。

Go 1.8 现在仅支持 OS X 10.8 或更高版本。这很可能是最后一个支持 10.8 的 Go 版本。
在更旧的 OS X 版本上编译 Go 或运行二进制文件未经测试。

Go 1.8 将是最后一个支持 Linux 上 ARMv5E 和 ARMv6 处理器的版本：
Go 1.9 很可能要求 ARMv6K（如 Raspberry Pi 1 中所见）或更高版本。
要识别 Linux 系统是否为 ARMv6K 或更高版本，请运行
“`go` `tool` `dist` `-check-armv6k`”
（为方便测试，也可以仅将 `dist` 命令复制到系统，而无需安装完整的 Go 1.8 副本），
如果程序以输出 "ARMv6K supported." 终止，则表明该系统实现了 ARMv6K 或更高版本。
在非 Linux 的 ARM 系统上，Go 已经要求 ARMv6K 或更高版本。

<!-- CL 31596, go.dev/issue/17528 -->
`zos` 现在是 `GOOS` 的一个公认值，为 z/OS 操作系统保留。

### 已知问题 {#known_issues}

在 FreeBSD 和 NetBSD 上存在一些已知但尚未完全理解的不稳定性。
在极少数情况下可能导致程序崩溃。
请参阅 [issue 15658](/issue/15658) 和 [issue 16511](/issue/16511)。
欢迎任何帮助解决这些问题。

## 工具 {#tools}

### 汇编器 {#cmd_asm}

对于 64 位 x86 系统，新增了以下指令：
`VBROADCASTSD`、
`BROADCASTSS`、
`MOVDDUP`、
`MOVSHDUP`、
`MOVSLDUP`、
`VMOVDDUP`、
`VMOVSHDUP` 和
`VMOVSLDUP`。

对于 64 位 PPC 系统，新增了通用向量标量指令：
`LXS`、
`LXSDX`、
`LXSI`、
`LXSIWAX`、
`LXSIWZX`、
`LXV`、
`LXVD2X`、
`LXVDSX`、
`LXVW4X`、
`MFVSR`、
`MFVSRD`、
`MFVSRWZ`、
`MTVSR`、
`MTVSRD`、
`MTVSRWA`、
`MTVSRWZ`、
`STXS`、
`STXSDX`、
`STXSI`、
`STXSIWX`、
`STXV`、
`STXVD2X`、
`STXVW4X`、
`XSCV`、
`XSCVDPSP`、
`XSCVDPSPN`、
`XSCVDPSXDS`、
`XSCVDPSXWS`、
`XSCVDPUXDS`、
`XSCVDPUXWS`、
`XSCVSPDP`、
`XSCVSPDPN`、
`XSCVSXDDP`、
`XSCVSXDSP`、
`XSCVUXDDP`、
`XSCVUXDSP`、
`XSCVX`、
`XSCVXP`、
`XVCV`、
`XVCVDPSP`、
`XVCVDPSXDS`、
`XVCVDPSXWS`、
`XVCVDPUXDS`、
`XVCVDPUXWS`、
`XVCVSPDP`、
`XVCVSPSXDS`、
`XVCVSPSXWS`、
`XVCVSPUXDS`、
`XVCVSPUXWS`、
`XVCVSXDDP`、
`XVCVSXDSP`、
`XVCVSXWDP`、
`XVCVSXWSP`、
`XVCVUXDDP`、
`XVCVUXDSP`、
`XVCVUXWDP`、
`XVCVUXWSP`、
`XVCVX`、
`XVCVXP`、
`XXLAND`、
`XXLANDC`、
`XXLANDQ`、
`XXLEQV`、
`XXLNAND`、
`XXLNOR`、
`XXLOR`、
`XXLORC`、
`XXLORQ`、
`XXLXOR`、
`XXMRG`、
`XXMRGHW`、
`XXMRGLW`、
`XXPERM`、
`XXPERMDI`、
`XXSEL`、
`XXSI`、
`XXSLDWI`、
`XXSPLT` 和
`XXSPLTW`。

### Yacc {#tool_yacc}

<!-- CL 27324, CL 27325 -->
`yacc` 工具（之前通过运行 “`go` `tool` `yacc`” 获取）已被移除。
自 Go 1.7 起，它不再被 Go 编译器使用。
它已移至 “tools” 仓库，现在可在 [`golang.org/x/tools/cmd/goyacc`](https://godoc.org/golang.org/x/tools/cmd/goyacc) 获取。

### Fix {#tool_fix}

<!-- CL 28872 -->
`fix` 工具新增了一个 “`context`”
修复程序，用于将导入从 “`golang.org/x/net/context`”
更改为 “[`context`](/pkg/context/)”。

### Pprof {#tool_pprof}

<!-- CL 33157 -->
`pprof` 工具现在可以分析 TLS 服务器，
并可通过使用 “`https+insecure`”
URL 模式跳过证书验证。

<!-- CL 23781 -->
callgrind 输出现在具有指令级粒度。

### Trace {#tool_trace}

<!-- CL 23324 -->
`trace` 工具新增了一个 `-pprof` 标志，用于
从执行跟踪生成 pprof 兼容的阻塞和延迟分析文件。<!-- CL 30017, CL 30702 -->
垃圾回收事件在执行跟踪查看器中现在显示得更加清晰。垃圾回收活动会在其专属的行上显示，而GC（垃圾回收器）辅助协程（goroutine）则会标注其角色。

### Vet {#tool_vet}

Vet在某些方面变得更严格，而在它之前容易导致误报的地方则变得宽松。

Vet 现在会检查：复制锁数组、重复的JSON和XML结构体（struct）字段标签、非空格分隔的结构体标签、在检查错误之前延迟调用HTTP `Response.Body.Close`，以及`Printf`中的索引参数。它也改进了现有的检查。

### 编译器工具链 {#compiler}

Go 1.7为64位x86系统引入了一个新的编译器后端。在Go 1.8中，该后端得到了进一步开发，现在用于所有架构。

新的后端基于[静态单赋值形式](https://en.wikipedia.org/wiki/Static_single_assignment_form) (SSA)，生成更紧凑、更高效的代码，并为诸如边界检查消除等优化提供了更好的平台。在32位ARM系统上，新后端使我们的基准测试程序的CPU时间减少了20-30%。对于在Go 1.7中已经使用SSA后端的64位x86系统，改进幅度则为更温和的0-10%。其他架构可能会看到接近32位ARM数字的改进。

Go 1.7中引入的用于禁用新后端的临时`-ssa=0`编译器标志已在Go 1.8中移除。

除了为所有系统启用新的编译器后端外，Go 1.8还引入了一个新的编译器前端。新的编译器前端对用户来说应该感觉不到变化，但它是未来性能工作的基础。

编译器和链接器在此版本中进行了优化，运行速度比Go 1.7更快，尽管它们仍然比我们期望的要慢，并且将在未来的版本中继续优化。与上一版本相比，Go 1.8的速度[大约提高了15%](https://dave.cheney.net/2016/11/19/go-1-8-toolchain-improvements)。

### Cgo {#cmd_cgo}

<!-- CL 31141 -->
Go工具现在会记住在`make.bash`期间设置的`CGO_ENABLED`环境变量的值，并默认将其应用于所有未来的编译，以修复问题[#12808](/issue/12808)。在进行本地编译时，很少需要显式设置`CGO_ENABLED`环境变量，因为`make.bash`会自动检测正确的设置。显式设置`CGO_ENABLED`环境变量的主要原因是，当你的环境支持cgo，但你明确不希望cgo支持时，在这种情况下，请在`make.bash`或`all.bash`期间设置`CGO_ENABLED=0`。

<!-- CL 29991 -->
现在可以使用环境变量`PKG_CONFIG`来设置处理`#cgo` `pkg-config`指令时要运行的程序。默认值是`pkg-config`，这是早期版本一直使用的程序。此更改旨在使交叉编译[cgo](/cmd/cgo/)代码更容易。

<!-- CL 32354 -->
[cgo](/cmd/cgo/)工具现在支持一个`-srcdir`选项，该选项由[go](/cmd/go/)命令使用。

<!-- CL 31768, 31811 -->
如果[cgo](/cmd/cgo/)代码调用`C.malloc`，而`malloc`返回`NULL`，程序现在会因内存不足错误而崩溃。`C.malloc`永远不会返回`nil`。与大多数C函数不同，`C.malloc`不能以返回errno值的双结果形式使用。

<!-- CL 33237 -->
如果使用[cgo](/cmd/cgo/)调用一个C函数，并传递一个指向C联合体的指针，且如果该C联合体可以包含任何指针值，并且启用了[cgo指针检查](/cmd/cgo/#hdr-Passing_pointers)（默认启用），那么现在会检查该联合体值中是否包含Go指针。

### Gccgo {#gccgo}

由于Go的半年发行计划与GCC的年度发行计划对齐，GCC 6版本包含了Go 1.6.1版本的gccgo。我们预计下一个版本GCC 7将包含Go 1.8版本的gccgo。

### 默认GOPATH {#gopath}

如果未设置，[`GOPATH`环境变量](/cmd/go/#hdr-GOPATH_environment_variable)现在有一个默认值。它在Unix上默认为`$HOME/go`，在Windows上默认为`%USERPROFILE%/go`。

### Go get {#go_get}

<!-- CL 34818 -->
`go get` 命令现在总是遵循HTTP代理环境变量，无论是否使用了`-insecure`标志。在之前的版本中，`-insecure`标志的副作用是不使用代理。

### Go bug {#go_bug}

新的`go bug`命令会在GitHub上开始一份错误报告，并预先填写了关于当前系统的信息。

### Go doc {#cmd_doc}

<!-- CL 25419 -->
`go doc`命令现在将常量和变量与其类型分组显示，遵循[`godoc`](/cmd/godoc/)的行为。

<!-- CL 25420 -->
为了提高`doc`输出的可读性，一级项目的每个摘要都保证占据一行。

<!-- CL 31852 -->
现在可以请求接口定义中特定方法的文档，例如`go doc net.Conn.SetDeadline`。

### 插件 {#plugin}

Go现在提供了对插件的初步支持，包括一个用于生成用Go编写的插件的“`plugin`”构建模式，以及一个新的[`plugin`](/pkg/plugin/)包用于在运行时加载此类插件。插件支持目前仅在Linux上可用。请报告任何问题。

## 运行时 {#runtime}

### 参数活跃性 {#liveness}

<!-- Issue 15843 -->
垃圾回收器不再认为参数在整个函数期间都是活跃的。有关更多信息，以及如何强制保持变量的活跃状态，请参见Go 1.7中添加的[`runtime.KeepAlive`](/pkg/runtime/#KeepAlive)函数。_更新说明：_
为已分配对象设置终结器的代码，可能需要在使用该对象的函数或方法中添加对 `runtime.KeepAlive` 的调用。
请阅读
[`KeepAlive`
文档](/pkg/runtime/#KeepAlive) 及其示例以获取更多详情。

### 并发映射误用 {#mapiter}

在 Go 1.6 中，运行时
[增加了对并发误用映射的轻量级、尽力检测](/doc/go1.6#runtime)。本次发布改进了该检测器，增加了对并发写入和迭代同一映射的程序的检测支持。

一如既往，如果一个 goroutine 正在写入一个映射，则其他任何 goroutine 都不应并发地读取（包括迭代）或写入该映射。
如果运行时检测到这种情况，它会打印诊断信息并使程序崩溃。
进一步了解问题的最佳方式是使用
[竞态检测器](/blog/race-detector) 运行程序，
它将更可靠地识别竞态条件并提供更多细节。

### MemStats 文档 {#memstats}

<!-- CL 28972 -->
[`runtime.MemStats`](/pkg/runtime/#MemStats) 类型的文档已更加详尽。

## 性能 {#performance}

一如既往，变更范围广泛且多样，难以对性能做出精确陈述。
由于垃圾回收器的速度提升以及标准库中的优化，大多数程序的运行速度应该会略有提升。

以下包的实现已进行了优化：
[`bytes`](/pkg/bytes/)、
[`crypto/aes`](/pkg/crypto/aes/)、
[`crypto/cipher`](/pkg/crypto/cipher/)、
[`crypto/elliptic`](/pkg/crypto/elliptic/)、
[`crypto/sha256`](/pkg/crypto/sha256/)、
[`crypto/sha512`](/pkg/crypto/sha512/)、
[`encoding/asn1`](/pkg/encoding/asn1/)、
[`encoding/csv`](/pkg/encoding/csv/)、
[`encoding/hex`](/pkg/encoding/hex/)、
[`encoding/json`](/pkg/encoding/json/)、
[`hash/crc32`](/pkg/hash/crc32/)、
[`image/color`](/pkg/image/color/)、
[`image/draw`](/pkg/image/draw/)、
[`math`](/pkg/math/)、
[`math/big`](/pkg/math/big/)、
[`reflect`](/pkg/reflect/)、
[`regexp`](/pkg/regexp/)、
[`runtime`](/pkg/runtime/)、
[`strconv`](/pkg/strconv/)、
[`strings`](/pkg/strings/)、
[`syscall`](/pkg/syscall/)、
[`text/template`](/pkg/text/template/) 以及
[`unicode/utf8`](/pkg/unicode/utf8/)。

### 垃圾回收器 {#gc}

垃圾回收暂停时间应该会比 Go 1.7 中显著缩短，通常低于 100 微秒，有时甚至低至 10 微秒。
详情请参阅
[消除 Stop-the-World 栈重扫描的设计文档](https://github.com/golang/proposal/blob/master/design/17503-eliminate-rescan.md)。
Go 1.9 将继续相关工作。

### Defer {#defer}

<!-- CL 29656, CL 29656 -->

[延迟函数调用](/ref/spec/#Defer_statements) 的开销已减少约一半。

### Cgo {#cgoperf}

从 Go 调用 C 的开销已减少约一半。

## 标准库 {#library}

### 示例 {#examples}

许多包的文档中已添加了示例。

### Sort {#sort_slice}

[sort](/pkg/sort/) 包现在包含一个便捷函数
[`Slice`](/pkg/sort/#Slice)，用于根据给定的 _less_ 函数对切片进行排序。
在许多情况下，这意味着无需再编写新的排序器类型。

另外还新增了
[`SliceStable`](/pkg/sort/#SliceStable) 和
[`SliceIsSorted`](/pkg/sort/#SliceIsSorted)。

### HTTP/2 Push {#h2push}

[net/http](/pkg/net/http/) 包现在包含一个机制，用于从
[`Handler`](/pkg/net/http/#Handler) 发送 HTTP/2 服务器推送。
类似于现有的 `Flusher` 和 `Hijacker`
接口，HTTP/2
[`ResponseWriter`](/pkg/net/http/#ResponseWriter)
现在实现了新的
[`Pusher`](/pkg/net/http/#Pusher) 接口。

### HTTP 服务器优雅关闭 {#http_shutdown}

<!-- CL 32329 -->
HTTP 服务器现在支持使用新的
[`Server.Shutdown`](/pkg/net/http/#Server.Shutdown) 方法进行优雅关闭，以及使用新的
[`Server.Close`](/pkg/net/http/#Server.Close) 方法进行立即关闭。

### 更多 Context 支持 {#more_context}

延续 [Go 1.7 采纳](/doc/go1.7#context)
[`context.Context`](/pkg/context/#Context) 到标准库的趋势，Go 1.8 为现有包增加了更多上下文支持：

  - 新的 [`Server.Shutdown`](/pkg/net/http/#Server.Shutdown) 接受一个上下文参数。
  - [database/sql](/pkg/database/sql/) 包进行了[重要添加](#database_sql)，增加了上下文支持。
  - 新 [`net.Resolver`](/pkg/net/#Resolver) 上新增的全部九个 `Lookup` 方法现在都接受一个上下文。

### 互斥锁争用分析 {#mutex_prof}

运行时和工具现在支持对争用的互斥锁进行分析。

大多数用户会希望在 “[`go` `test`](/cmd/go/#hdr-Description_of_testing_flags)” 中使用新的 `-mutexprofile` 标志，然后对生成的文件使用 [pprof](/cmd/pprof/)。

也可以通过新的
[`MutexProfile`](/pkg/runtime/#MutexProfile)
和
[`SetMutexProfileFraction`](/pkg/runtime/#SetMutexProfileFraction) 获取更低层级的支持。

Go 1.8 的一个已知限制是，该分析仅报告
[`sync.Mutex`](/pkg/sync/#Mutex) 的争用情况，不包括
[`sync.RWMutex`](/pkg/sync/#RWMutex)。

### 库的微小变更 {#minor_library_changes}

一如既往，考虑到 Go 1 的[兼容性承诺](/doc/go1compat)，库有各种微小的变更和更新。以下部分列出了对用户可见的更改和新增内容。优化和小错误修复未列出。

#### [archive/tar](/pkg/archive/tar/)

<!-- CL 28471, CL 31440, CL 31441, CL 31444, CL 28418, CL 31439 -->
tar 的实现修复了文件格式边缘情况中的许多错误。
[`Reader`](/pkg/archive/tar/#Reader) 现在能够处理条目大于 8GB 的 PAX 格式的 tar 文件。
[`Writer`](/pkg/archive/tar/#Writer) 在某些涉及长路径名的情况下不再生成无效的 tar 文件。

#### [compress/flate](/pkg/compress/flate/)<!-- CL 31640, CL 31174, CL 32149 -->
编码器已有一些细微修复，以改善特定情况下的压缩比。因此，`DEFLATE` 的确切编码输出可能与 Go 1.7 不同。由于 `DEFLATE` 是 gzip、png、zlib 和 zip 的底层压缩格式，这些格式的输出可能也发生了变化。

<!-- CL 31174 -->
当编码器在 [`NoCompression`](/pkg/compress/flate/#NoCompression) 模式下运行时，现在产生的输出是固定的，不再依赖于传递给 [`Write`](/pkg/compress/flate/#Writer.Write) 方法的切片大小。

<!-- CL 28216 -->
解码器在遇到错误时，现在会连同错误一起返回任何它已经解压的缓冲数据。

#### [compress/gzip](/pkg/compress/gzip/)

当 [`Header.ModTime`](/pkg/compress/gzip/#Header) 字段为零值时，[`Writer`](/pkg/compress/gzip/#Writer) 现在会编码一个零 `MTIME` 字段。在 Go 的先前版本中，`Writer` 会编码一个无意义的值。类似地，[`Reader`](/pkg/compress/gzip/#Reader) 现在将编码值为零的 `MTIME` 字段报告为零 `Header.ModTime`。

#### [context](/pkg/context/)

<!-- CL 30370 -->
[`DeadlineExceeded`](/pkg/context#DeadlineExceeded) 错误现在实现了 [`net.Error`](/pkg/net/#Error) 接口，并且其 `Timeout` 和 `Temporary` 方法均返回 true。

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 25159, CL 31318 -->
新方法 [`Conn.CloseWrite`](/pkg/crypto/tls/#Conn.CloseWrite) 允许 TLS 连接进行半关闭。

<!-- CL 28075 -->
新方法 [`Config.Clone`](/pkg/crypto/tls/#Config.Clone) 克隆一个 TLS 配置。

<!-- CL 30790 -->
新的 [`Config.GetConfigForClient`](/pkg/crypto/tls/#Config.GetConfigForClient) 回调允许基于客户端的 [`ClientHelloInfo`](/pkg/crypto/tls/#ClientHelloInfo) 动态选择配置。<!-- CL 31391, CL 32119 --> [`ClientHelloInfo`](/pkg/crypto/tls/#ClientHelloInfo) 结构体现在增加了新字段 `Conn`、`SignatureSchemes`（使用新类型 [`SignatureScheme`](/pkg/crypto/tls/#SignatureScheme)）、`SupportedProtos` 和 `SupportedVersions`。

<!-- CL 32115 -->
新的 [`Config.GetClientCertificate`](/pkg/crypto/tls/#Config.GetClientCertificate) 回调允许基于服务器的 TLS `CertificateRequest` 消息（由新的 [`CertificateRequestInfo`](/pkg/crypto/tls/#CertificateRequestInfo) 表示）选择客户端证书。

<!-- CL 27434 -->
新的 [`Config.KeyLogWriter`](/pkg/crypto/tls/#Config.KeyLogWriter) 允许在 [WireShark](https://www.wireshark.org/) 和类似工具中调试 TLS 连接。

<!-- CL 32115 -->
新的 [`Config.VerifyPeerCertificate`](/pkg/crypto/tls/#Config.VerifyPeerCertificate) 回调允许对对等方呈现的证书进行额外验证。

<!-- CL 18130 -->
`crypto/tls` 包现在实现了针对 CBC 填充 oracle 的基本对策。不应存在显式的依赖于秘密的时序，但它并不试图规范化内存访问以防止缓存时序泄漏。

`crypto/tls` 包现在支持 X25519 和 <!-- CL 30824, CL 30825 --> ChaCha20-Poly1305。<!-- CL 30957, CL 30958 --> 除非 <!-- CL 32871 --> 存在硬件对 AES-GCM 的支持，否则 ChaCha20-Poly1305 现在被优先使用。

<!-- CL 27315, CL 35290 -->
带有 SHA-256 的 AES-128-CBC 密码套件现在也受支持，但默认禁用。

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 24743 -->
现在支持 PSS 签名。

<!-- CL 32644 -->
[`UnknownAuthorityError`](/pkg/crypto/x509/#UnknownAuthorityError) 现在有一个 `Cert` 字段，报告不受信任的证书。

证书验证在少数情况下更宽松，在另一些情况下更严格。
<!--
crypto/x509: allow a leaf certificate to be specified directly as root (CL 27393)
crypto/x509: check that the issuer name matches the issuer's subject name (CL 23571)
crypto/x509: don't accept a root that already appears in a chain. (CL 32121)
crypto/x509: fix name constraints handling (CL 30155)
crypto/x509: parse all names in an RDN (CL 30810)
crypto/x509: recognise ISO OID for RSA+SHA1 (CL 27394)
crypto/x509: require a NULL parameters for RSA public keys (CL 16166, CL 27312)
crypto/x509: return error for missing SerialNumber (CL 27238)
-->

<!-- CL 30375 -->
在 Linux 上，根证书现在还会在 `/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem` 路径下查找，以支持 RHEL 和 CentOS。

#### [database/sql](/pkg/database/sql/)

该包现在支持 `context.Context`。有一些以 `Context` 结尾的新方法，如 [`DB.QueryContext`](/pkg/database/sql/#DB.QueryContext) 和 [`DB.PrepareContext`](/pkg/database/sql/#DB.PrepareContext)，这些方法接受上下文参数。使用新的 `Context` 方法可以确保在请求完成时关闭连接并将其返回到连接池；如果驱动程序支持，可以取消正在进行的查询；并允许数据库池取消等待下一个可用连接。

现在可以通过设置 [`TxOptions.Isolation`](/pkg/database/sql#TxOptions.Isolation) 上的隔离级别，并将其传递给 [`DB.BeginTx`](/pkg/database/sql#DB.BeginTx)，在开始事务时设置 [`IsolationLevel`](/pkg/database/sql#IsolationLevel)。如果选择了驱动程序不支持的隔离级别，将返回错误。还可以通过将 [`TxOptions.ReadOnly`](/pkg/database/sql/#TxOptions.ReadOnly) 设置为 true 来将事务设置为只读。

查询现在可以公开支持它的驱动程序的 SQL 列类型信息。行可以返回 [`ColumnTypes`](/pkg/database/sql#Rows.ColumnTypes)，其中可以包括 SQL 类型信息、列类型长度和 Go 类型。一个 [`Rows`](/pkg/database/sql/#Rows) 现在可以表示多个结果集。在 [`Rows.Next`](/pkg/database/sql/#Rows.Next) 返回 false 后，可以调用 [`Rows.NextResultSet`](/pkg/database/sql/#Rows.NextResultSet) 以推进到下一个结果集。在推进到下一个结果集后，应继续使用现有的 `Rows`。

[`NamedArg`](/pkg/database/sql/#NamedArg) 可以用作查询参数。新函数 [`Named`](/pkg/database/sql/#Named) 有助于更简洁地创建 [`NamedArg`](/pkg/database/sql/#NamedArg)。

如果驱动程序支持新的 [`Pinger`](/pkg/database/sql/driver/#Pinger) 接口，那么 [`DB.Ping`](/pkg/database/sql/#DB.Ping) 和 [`DB.PingContext`](/pkg/database/sql/#DB.PingContext) 方法将使用该接口来检查数据库连接是否仍然有效。

新的 `Context` 查询方法适用于所有驱动程序，但 `Context` 取消操作不会立即响应，除非驱动程序已更新以使用它们。其他功能需要 [`database/sql/driver`](/pkg/database/sql/driver) 中的驱动程序支持。驱动程序作者应查看新的接口。现有驱动程序的用户应查阅驱动程序文档以了解其支持的功能以及关于每项功能的系统特定文档。

#### [debug/pe](/pkg/debug/pe/)

<!-- CL 22720, CL 27212, CL 22181, CL 22332, CL 22336, Issue 15345 -->
该包已扩展，现在被 [Go 链接器](/cmd/link/) 用于读取 `gcc` 生成的目标文件。新的 [`File.StringTable`](/pkg/debug/pe/#File.StringTable) 和 [`Section.Relocs`](/pkg/debug/pe/#Section.Relocs) 字段提供对 COFF 字符串表和 COFF 重定位的访问。新的 [`File.COFFSymbols`](/pkg/debug/pe/#File.COFFSymbols) 允许对 COFF 符号表进行底层访问。

#### [encoding/base64](/pkg/encoding/base64/)

<!-- CL 24964 -->
新的 [`Encoding.Strict`](/pkg/encoding/base64/#Encoding.Strict) 方法返回一个 `Encoding`，当尾部填充位不为零时，会导致解码器返回错误。

#### [encoding/binary](/pkg/encoding/binary/)

<!-- CL 28514 -->
[`Read`](/pkg/encoding/binary/#Read) 和 [`Write`](/pkg/encoding/binary/#Write) 现在支持布尔值。

#### [encoding/json](/pkg/encoding/json/)

<!-- CL 18692  -->
[`UnmarshalTypeError`](/pkg/encoding/json/#UnmarshalTypeError) 现在包含了结构体和字段名称。

<!-- CL 31932 -->
一个 nil [`Marshaler`](/pkg/encoding/json/#Marshaler) 现在会被序列化为 JSON `null` 值。

<!-- CL 21811 -->
一个 [`RawMessage`](/pkg/encoding/json/#RawMessage) 值现在序列化的方式与其指针类型相同。

<!-- CL 30371 -->
[`Marshal`](/pkg/encoding/json/#Marshal) 使用与 ES6 相同的格式编码浮点数，在更广泛的数值范围内优先使用十进制（非指数）表示法。特别是，所有不超过 2<sup>64</sup> 的浮点整数格式与等效的 `int64` 表示相同。

<!-- CL 30944 -->
在之前的 Go 版本中，将 JSON `null` 反序列化到 [`Unmarshaler`](/pkg/encoding/json/#Unmarshaler) 被视为无操作；现在 `Unmarshaler` 的 `UnmarshalJSON` 方法会使用 JSON 字面量 `null` 调用，并且可以定义该情况的语义。

#### [encoding/pem](/pkg/encoding/pem/)

<!-- CL 27391 -->
[`Decode`](/pkg/encoding/pem/#Decode) 现在对结束行的格式要求更严格。

#### [encoding/xml](/pkg/encoding/xml/)

<!-- CL 30946 -->
[`Unmarshal`](/pkg/encoding/xml/#Unmarshal) 现在支持使用新的 `",any,attr"` 结构体标签来通配收集所有属性。

#### [expvar](/pkg/expvar/)

<!-- CL 30917 -->
新方法 [`Int.Value`](/pkg/expvar/#Int.Value)、[`String.Value`](/pkg/expvar/#String.Value)、[`Float.Value`](/pkg/expvar/#Float.Value) 和 [`Func.Value`](/pkg/expvar/#Func.Value) 报告导出变量的当前值。

<!-- CL 24722 -->
新函数 [`Handler`](/pkg/expvar/#Handler) 返回该包的 HTTP 处理程序，以便将其安装在非标准位置。

#### [fmt](/pkg/fmt/)

<!-- CL 30611 -->
[`Scanf`](/pkg/fmt/#Scanf)、[`Fscanf`](/pkg/fmt/#Fscanf) 和 [`Sscanf`](/pkg/fmt/#Sscanf) 现在对空格的处理与之前的版本不同且更一致。详情请参阅 [扫描文档](/pkg/fmt/#hdr-Scanning)。

#### [go/doc](/pkg/go/doc/)

<!-- CL 29870 -->
新函数 [`IsPredeclared`](/pkg/go/doc/#IsPredeclared) 报告一个字符串是否是预声明标识符。

#### [go/types](/pkg/go/types/)

<!-- CL 30715 -->
新函数 [`Default`](/pkg/go/types/#Default) 返回 "untyped" 类型的默认 "typed" 类型。

<!-- CL 31939 -->
`complex64` 的对齐方式现在与 [Go 编译器](/cmd/compile/) 匹配。

#### [html/template](/pkg/html/template/)

<!-- CL 14336 -->
该包现在会验证 `<script>` 标签上的 `"type"` 属性。

#### [image/png](/pkg/image/png/)

<!-- CL 32143, CL 32140 -->
[`Decode`](/pkg/image/png/#Decode)（和 `DecodeConfig`）现在支持真彩色和灰度透明度。

<!-- CL 29872 -->
[`Encoder`](/pkg/image/png/#Encoder) 在编码调色板图像时现在更快，并且生成的输出更小。

#### [math/big](/pkg/math/big/)

<!-- CL 30706 -->
新方法 [`Int.Sqrt`](/pkg/math/big/#Int.Sqrt) 计算 ⌊√x⌋。

新方法 [`Float.Scan`](/pkg/math/big/#Float.Scan) 是 [`fmt.Scanner`](/pkg/fmt/#Scanner) 的支持例程。

[`Int.ModInverse`](/pkg/math/big/#Int.ModInverse) 现在支持负数。

#### [math/rand](/pkg/math/rand/)

<!-- CL 27253, CL 33456 -->
新方法 [`Rand.Uint64`](/pkg/math/rand/#Rand.Uint64) 返回 `uint64` 值。新接口 [`Source64`](/pkg/math/rand/#Source64) 描述能够直接生成此类值的源；否则，`Rand.Uint64` 方法将通过两次调用 [`Source`](/pkg/math/rand/#Source) 的 `Int63` 方法来构造一个 `uint64`。

#### [mime](/pkg/mime/)<!-- CL 32175 -->
[`ParseMediaType`](/pkg/mime/#ParseMediaType)
函数现在会将不必要的反斜杠转义保留为字面字符，以便支持 MSIE。
当 MSIE 发送完整文件路径（在“intranet 模式”下）时，它不会转义反斜杠："`C:\dev\go\foo.txt`"，而不是
"`C:\\dev\\go\\foo.txt`"。
如果我们发现不必要的反斜杠转义，现在会假定它来自 MSIE 并且意在表示字面反斜杠。
已知的 MIME 生成器不会对数字和字母等简单标记字符产生不必要的反斜杠转义。

#### [mime/quotedprintable](/pkg/mime/quotedprintable/)

[`Reader`](/pkg/mime/quotedprintable/#Reader) 的解析在两方面有所放宽，以接受更多实际中遇到的输入。 <!-- CL 32174 -->
首先，它接受一个不紧跟两个十六进制数字的等号（`=`），将其视为字面等号。 <!-- CL 27530 -->
其次，它会静默忽略编码输入末尾多余的等号。

#### [net](/pkg/net/)

<!-- CL 30164, CL 33473 -->
[`Conn`](/pkg/net/#Conn) 的文档已更新，以明确对接口实现的要求。`net/http` 包中的更新依赖于实现遵守文档规定。

_更新：_ `Conn` 接口的实现者应验证其实现了文档所述的语义。
[golang.org/x/net/nettest](https://godoc.org/golang.org/x/net/nettest)
包将对 `Conn` 进行测试并验证其行为是否正确。

<!-- CL 32099 -->
新方法
[`UnixListener.SetUnlinkOnClose`](/pkg/net/#UnixListener.SetUnlinkOnClose)
设置当监听器关闭时，是否应从文件系统中移除底层的 socket 文件。

<!-- CL 29951 -->
新的 [`Buffers`](/pkg/net/#Buffers) 类型允许更高效地从内存中多个不连续的缓冲区写入网络。在某些机器上，对于某些类型的连接，这被优化为特定于操作系统的批量写入操作（例如 `writev`）。

<!-- CL 29440 -->
新的 [`Resolver`](/pkg/net/#Resolver) 用于查找名称和数字，并支持 [`context.Context`](/pkg/context/#Context)。
[`Dialer`](/pkg/net/#Dialer) 现在有一个可选的
[`Resolver` 字段](/pkg/net/#Dialer.Resolver)。

<!-- CL 29892 -->
[`Interfaces`](/pkg/net/#Interfaces) 现在在 Solaris 上受支持。

<!-- CL 29233, CL 24901 -->
Go DNS 解析器现在支持 `resolv.conf` 的“`rotate`”和“`option` `ndots:0`”选项。“`ndots`”选项现在按照与 `libresolve` 相同的方式被尊重。

#### [net/http](/pkg/net/http/)

服务器端变更：

  - 服务器现在支持优雅关闭支持，[如上所述](#http_shutdown)。
  - <!-- CL 32024 -->
    [`Server`](/pkg/net/http/#Server) 添加了配置选项
    `ReadHeaderTimeout` 和 `IdleTimeout`，并记录了 `WriteTimeout`。
  - <!-- CL 32014 -->
    [`FileServer`](/pkg/net/http/#FileServer)
    和
    [`ServeContent`](/pkg/net/http/#ServeContent)
    现在除了之前对 `If-None-Match` 的支持外，还支持 HTTP `If-Match` 条件请求，前提是 ETags 根据 RFC 7232 第 2.3 节正确格式化。

服务器的 `Handler` 能力有多项新增：

  - <!-- CL 31173 -->
    [`Request.Context`](/pkg/net/http/#Request.Context) 返回的
    [`Context`](/pkg/context/#Context)
    在底层 `net.Conn` 关闭时会被取消。例如，如果用户在一个慢速请求中途关闭浏览器，`Handler` 现在可以检测到用户已离开。这补充了现有的 [`CloseNotifier`](/pkg/net/http/#CloseNotifier) 支持。此功能要求底层的
    [`net.Conn`](/pkg/net/#Conn) 实现了
    [最近澄清的接口文档](#net)。
  - <!-- CL 32479 -->
    要提供在头部已经写入后产生的 trailer，请参见新的
    [`TrailerPrefix`](/pkg/net/http/#TrailerPrefix) 机制。
  - <!-- CL 33099 -->
    `Handler` 现在可以通过使用错误
    [`ErrAbortHandler`](/pkg/net/http/#ErrAbortHandler) 进行 panic 来中止响应。
  - <!-- CL 30812 -->
    向
    [`ResponseWriter`](/pkg/net/http/#ResponseWriter)
    写入零字节现在被定义为一种测试 `ResponseWriter` 是否已被劫持的方式：如果已被劫持，`Write` 将返回
    [`ErrHijacked`](/pkg/net/http/#ErrHijacked)，并且不会向服务器的错误日志打印错误。

客户端与传输层变更：- <!-- CL 28930, CL 31435 -->
  [`Client`](/pkg/net/http/#Client)
  现在会在重定向时复制大多数请求头。详情请参阅
  [`Client`](/pkg/net/http/#Client) 类型的文档。
- <!-- CL 29072 -->
  [`Transport`](/pkg/net/http/#Transport)
  现在支持国际域名。因此，[Get](/pkg/net/http/#Get) 和其他辅助函数也支持了。
- <!-- CL 31733, CL 29852 -->
  `Client` 现在支持 301、307 和 308 重定向。例如，`Client.Post` 现在会遵循 301 重定向，将其转换为不带请求体的 `GET` 请求，就像之前处理 302 和 303 重定向响应那样。
  `Client` 现在也会遵循 307 和 308 重定向，并保留原始的请求方法（如果有请求体也会保留）。如果重定向需要重新发送请求体，则请求必须定义新的 [`Request.GetBody`](/pkg/net/http/#Request) 字段。
  [`NewRequest`](/pkg/net/http/#NewRequest) 会为常见的请求体类型自动设置 `Request.GetBody`。
- <!-- CL 32482 -->
  `Transport` 现在会拒绝端口中包含非数字字符的 URL 请求。
- <!-- CL 27117 -->
  `Transport` 现在会重试非幂等请求，条件是在网络故障前没有写入任何字节且请求没有请求体。
- <!-- CL 32481 -->
  新的 [`Transport.ProxyConnectHeader`](/pkg/net/http/#Transport) 允许在 `CONNECT` 请求期间配置发送给代理的头信息。
- <!-- CL 28077 -->
  [`DefaultTransport.Dialer`](/pkg/net/http/#DefaultTransport) 现在启用了 `DualStack`（"[Happy Eyeballs](https://tools.ietf.org/html/rfc6555)"）支持，允许在 IPv6 可能失败时使用 IPv4 作为备份。
- <!-- CL 31726 -->
  [`Transport`](/pkg/net/http/#Transport) 不再读取非空 [`Request.Body`](/pkg/net/http/#Request.Body) 的一个字节来判断 [`Request.ContentLength`](/pkg/net/http/#Request.ContentLength) 为零是实际为零还是未定义。要显式表示请求体长度为零，可以将其设置为 `nil`，或设置为新的值 [`NoBody`](/pkg/net/http/#NoBody)。新的 `NoBody` 值旨在供 `Request` 构造函数使用；[`NewRequest`](/pkg/net/http/#NewRequest) 就使用了它。

#### [net/http/httptrace](/pkg/net/http/httptrace/)

<!-- CL 30359 -->
现在支持通过新的
[`ClientTrace.TLSHandshakeStart`](/pkg/net/http/httptrace/#ClientTrace.TLSHandshakeStart)
和
[`ClientTrace.TLSHandshakeDone`](/pkg/net/http/httptrace/#ClientTrace.TLSHandshakeDone)
来跟踪客户端请求的 TLS 握手过程。

#### [net/http/httputil](/pkg/net/http/httputil/)

<!-- CL 32356 -->
[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy)
新增了一个可选钩子
[`ModifyResponse`](/pkg/net/http/httputil/#ReverseProxy.ModifyResponse)，
用于在将后端响应代理给客户端之前对其进行修改。

#### [net/mail](/pkg/net/mail/)

<!-- CL 32176 -->
现在再次允许地址名称部分包含空的引号字符串。也就是说，Go 1.4 及更早版本接受 `""` `<gopher@example.com>`，但 Go 1.5 引入了一个拒绝此地址的 bug。现在该地址再次被正确识别。

<!-- CL 31581 -->
[`Header.Date`](/pkg/net/mail/#Header.Date) 方法一直提供了解析 `Date:` 头信息的方法。新的 [`ParseDate`](/pkg/net/mail/#ParseDate) 函数允许解析在其他头信息行中找到的日期，例如 `Resent-Date:` 头信息。

#### [net/smtp](/pkg/net/smtp/)

<!-- CL 33143 -->
如果 [`Auth.Start`](/pkg/net/smtp/#Auth) 方法的实现返回空的 `toServer` 值，该包将不再在 SMTP `AUTH` 命令中发送尾随空格（这曾被一些服务器拒绝）。

#### [net/url](/pkg/net/url/)

<!-- CL 31322 -->
新的函数
[`PathEscape`](/pkg/net/url/#PathEscape)
和
[`PathUnescape`](/pkg/net/url/#PathUnescape)
类似于查询字符串的转义和反转义函数，但用于路径元素。

<!-- CL 28933 -->
新的方法
[`URL.Hostname`](/pkg/net/url/#URL.Hostname)
和
[`URL.Port`](/pkg/net/url/#URL.Port)
返回 URL 的主机名和端口字段，并正确处理了端口可能不存在的情况。

<!-- CL 28343 -->
现有的方法
[`URL.ResolveReference`](/pkg/net/url/#URL.ResolveReference)
现在能正确处理包含转义字节的路径，而不会丢失转义。

<!-- CL 31467 -->
`URL` 类型现在实现了
[`encoding.BinaryMarshaler`](/pkg/encoding/#BinaryMarshaler) 和
[`encoding.BinaryUnmarshaler`](/pkg/encoding/#BinaryUnmarshaler)，
使得在 [gob 数据](/pkg/encoding/gob/) 中处理 URL 成为可能。

<!-- CL 29610, CL 31582 -->
遵循 RFC 3986，
[`Parse`](/pkg/net/url/#Parse)
现在会拒绝类似 `this_that:other/thing` 的 URL，而不是将其解释为相对路径（`this_that` 不是有效的协议方案）。要强制解释为相对路径，此类 URL 应以 “`./`” 为前缀。`URL.String` 方法现在会根据需要插入此前缀。

#### [os](/pkg/os/)

<!-- CL 16551 -->
新的函数
[`Executable`](/pkg/os/#Executable) 返回正在运行的可执行文件的路径名。

<!-- CL 30614 -->
尝试对已关闭的 [`os.File`](/pkg/os/#File) 调用方法现在将返回新的错误值 [`os.ErrClosed`](/pkg/os/#ErrClosed)。之前它返回的是系统特定的错误，例如 `syscall.EBADF`。

<!-- CL 31358 -->
在 Unix 系统上，[`os.Rename`](/pkg/os/#Rename) 现在会返回错误，当它用于将一个目录重命名到一个已存在的空目录时。之前，重命名到非空目录会失败，但重命名到空目录会成功。这使得 Unix 上的行为与其他系统保持一致。<!-- CL 32451 -->
在 Windows 系统上，过长的绝对路径现在会被透明地转换为扩展长度路径（以 "`\\?\`" 开头的路径）。这使得该包能够处理路径名超过 260 个字符的文件。

<!-- CL 29753 -->
在 Windows 系统上，[`os.IsExist`](/pkg/os/#IsExist) 现在对系统错误 `ERROR_DIR_NOT_EMPTY` 会返回 `true`。这大致对应于现有对 Unix 错误 `ENOTEMPTY` 的处理方式。

<!-- CL 32152 -->
在 Plan 9 系统上，未由 `#M` 提供服务的文件现在将在 [`FileInfo.Mode`](/pkg/os/#FileInfo) 返回的值中设置 [`ModeDevice`](/pkg/os/#ModeDevice) 标志位。

#### [path/filepath](/pkg/path/filepath/)

修复了 Windows 上的一系列错误和边缘情况：
[`Abs`](/pkg/path/filepath/#Abs) 现在会按文档所述调用 `Clean`，
[`Glob`](/pkg/path/filepath/#Glob) 现在能匹配 "`\\?\c:\*`"，
[`EvalSymlinks`](/pkg/path/filepath/#EvalSymlinks) 现在能正确处理 "`C:.`"，并且
[`Clean`](/pkg/path/filepath/#Clean) 现在能正确处理路径开头的 "`..`"。

#### [reflect](/pkg/reflect/)

<!-- CL 30088 -->
新增了函数 [`Swapper`](/pkg/reflect/#Swapper) 以支持 [`sort.Slice`](#sortslice)。

#### [strconv](/pkg/strconv/)

<!-- CL 31210 -->
[`Unquote`](/pkg/strconv/#Unquote) 函数现在会移除原始字符串字面量（反引号括起来的字符串）中的回车符（`\r`），遵循 [Go 语言规范](/ref/spec#String_literals)。

#### [syscall](/pkg/syscall/)

<!-- CL 25050, CL 25022 -->
[`Getpagesize`](/pkg/syscall/#Getpagesize) 现在返回系统实际的页面大小，而非一个常量值。之前它总是返回 4KB。

<!-- CL 31446 -->
在 Solaris 系统上，[`Utimes`](/pkg/syscall/#Utimes) 的函数签名已更改，以与其他所有 Unix 系统的签名保持一致。可移植的代码应继续改用 [`os.Chtimes`](/pkg/os/#Chtimes)。

<!-- CL 32319 -->
`X__cmsg_data` 字段已从 [`Cmsghdr`](/pkg/syscall/#Cmsghdr) 结构体中移除。

#### [text/template](/pkg/text/template/)

<!-- CL 31462 -->
[`Template.Execute`](/pkg/text/template/#Template.Execute) 现在可以接受一个 [`reflect.Value`](/pkg/reflect/#Value) 作为其数据参数，并且 [`FuncMap`](/pkg/text/template/#FuncMap) 中的函数现在也可以接受和返回 `reflect.Value`。

#### [time](/pkg/time/)

<!-- CL 20118 -->
新增了函数 [`Until`](/pkg/time/#Until)，作为现有 `Since` 函数的对应补充。

<!-- CL 29338 -->
[`ParseDuration`](/pkg/time/#ParseDuration) 现在接受更长的分数部分。

<!-- CL 33429 -->
[`Parse`](/pkg/time/#Parse) 现在会拒绝月份开始之前的日期，例如 6 月 0 日；它之前已经拒绝超出月末的日期，例如 6 月 31 日和 7 月 32 日。

<!-- CL 33029 -->
<!-- CL 34816 -->
对于没有本地时区数据库的系统，`tzdata` 数据库已更新至 2016j 版本。

#### [testing](/pkg/testing/)

<!-- CL 29970 -->
新增了方法 [`T.Name`](/pkg/testing/#T.Name)（和 `B.Name`），用于返回当前测试或基准测试的名称。

<!-- CL 32483 -->
新增了函数 [`CoverMode`](/pkg/testing/#CoverMode)，用于报告测试覆盖率的模式。

<!-- CL 32615 -->
如果启用了竞态检测器且在执行期间发生数据竞争，测试和基准测试现在会被标记为失败。之前，各个测试用例会显示为通过，只有测试二进制文件的整体执行会失败。

<!-- CL 32455 -->
[`MainStart`](/pkg/testing/#MainStart) 函数的签名已按文档允许的方式更改。这是一个内部细节，并非 Go 1 兼容性承诺的一部分。如果你没有直接调用 `MainStart` 但看到错误，很可能意味着你设置了通常为空的 `GOROOT` 环境变量，且其值与你 `go` 命令二进制文件的版本不匹配。

#### [unicode](/pkg/unicode/)

<!-- CL 30935 -->
[`SimpleFold`](/pkg/unicode/#SimpleFold) 现在如果提供的输入是一个无效的 Unicode 码点，则会原样返回该参数。之前，其实现会因索引越界检查 panic 而失败。