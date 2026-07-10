---
title: Go 1.9 发布说明
---

<!--
注意：在本文档以及此目录下的其他文档中，约定对固定宽度的短语使用非固定宽度的空格，例如：
`hello` `world`。
请勿提交移除此类短语内部标签的变更请求（CL）。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.9 简介 {#introduction}

最新的 Go 版本 1.9，在 [Go 1.8](go1.8) 发布六个月后到来，是 [Go 1.x 系列](/doc/devel/release.html) 的第十个版本。
此版本有两项[语言变更](#language)：增加了对类型别名的支持，并明确了实现何时可以融合浮点运算。
大部分变更集中在工具链、运行时和库的实现中。
一如既往，此版本恪守 Go 1 的[兼容性承诺](/doc/go1compat.html)。
我们预期几乎所有 Go 程序都能像以前一样继续编译和运行。

此版本增加了[透明的单调时间支持](#monotonic-time)，在包内[并行编译函数](#parallel-compile)，更好地支持[测试辅助函数](#test-helper)，包含一个新的[位操作包](#math-bits)，并提供了一个新的[并发映射类型](#sync-map)。

## 语言变更 {#language}

语言有两处变更。

Go 现在支持类型别名，以便在将类型从一个包移动到另一个包时，支持渐进式的代码修复。
[类型别名设计文档](/design/18130-type-alias) 和一篇[关于重构的文章](/talks/2016/refactor.article) 详细阐述了这个问题。
简而言之，类型别名声明的形式为：

	type T1 = T2

此声明为 `T2` 所表示的类型引入了一个别名 `T1`——一种替代的拼写方式；也就是说，`T1` 和 `T2` 都表示同一个类型。

<!-- CL 40391 -->
另一项较小的语言变更是，[语言规范现在明确规定](/ref/spec#Floating_point_operators)了实现何时允许将浮点运算融合在一起，例如，使用架构的“融合乘加”（FMA）指令来计算 `x*y` `+` `z`，而不对中间结果 `x*y` 进行舍入。
要强制进行中间舍入，请写成 `float64(x*y)` `+` `z`。

## 平台支持 {#ports}

此版本没有新增受支持的操作系统或处理器架构。

### ppc64x 需要 POWER8 {#power8}

<!-- CL 36725, CL 36832 -->
现在，`GOARCH=ppc64` 和 `GOARCH=ppc64le` 都需要至少 POWER8 支持。在之前的版本中，只有 `GOARCH=ppc64le` 需要 POWER8，而大端序的 `ppc64` 架构支持更旧的硬件。

### FreeBSD {#freebsd}

Go 1.9 是最后一个能在 FreeBSD 9.3 上运行的版本，而 FreeBSD 9.3 已经[不受 FreeBSD 支持](https://www.freebsd.org/security/unsupported.html)。Go 1.10 将要求 FreeBSD 10.3+。

### OpenBSD 6.0 {#openbsd}

<!-- CL 40331 -->
Go 1.9 现在为 cgo 二进制文件启用了 PT_TLS 生成，因此需要 OpenBSD 6.0 或更高版本。Go 1.9 不再支持 OpenBSD 5.9。

### 已知问题 {#known_issues}

在 FreeBSD 上存在一些已知但尚未完全理解的不稳定性问题。这些问题在极少数情况下可能导致程序崩溃。参见 [issue 15658](/issue/15658)。我们非常感谢任何帮助解决此 FreeBSD 特定问题的贡献。

在 Go 1.9 开发周期内，由于 NetBSD 内核崩溃问题（包括 NetBSD 7.1），Go 停止了运行 NetBSD 构建器。在 Go 1.9 发布之际，NetBSD 7.1.1 正在发布修复。然而，目前我们没有能够通过测试套件的 NetBSD 构建器。我们非常感谢任何帮助调查[各种 NetBSD 问题](https://github.com/golang/go/labels/OS-NetBSD)的贡献。

## 工具 {#tools}

### 并行编译 {#parallel-compile}

Go 编译器现在支持并行编译一个包内的函数，从而利用多个 CPU 核心。这在 `go` 命令已有的对不同包进行并行编译的支持基础上，又增加了功能。并行编译默认是开启的，但可以通过将环境变量 `GO19CONCURRENTCOMPILATION` 设置为 `0` 来禁用。

### 使用 ./... 匹配 vendor 目录 {#vendor-dotdotdot}

<!-- CL 38745 -->
根据广泛的需求，在接受包名的工具（如 `go` `test`）中，`./...` 不再匹配 `vendor` 目录中的包。要匹配 vendor 目录，请写 `./vendor/...`。

### 移动 GOROOT {#goroot}

<!-- CL 42533 -->
[go 工具](/cmd/go/) 现在会使用其被调用的路径来尝试定位 Go 安装树的根目录。这意味着，如果整个 Go 安装被移动到新位置，go 工具应该能继续正常工作。这可以通过在环境中设置 `GOROOT` 来覆盖，但这仅应在非同寻常的情况下进行。请注意，这不会影响 [runtime.GOROOT](/pkg/runtime/#GOROOT) 函数的结果，它将继续报告原始的安装位置；这可能会在后续版本中修复。

### 编译器工具链 {#compiler}

<!-- CL 37441 -->
复数除法现在与 C99 兼容。这在 gccgo 中一直是如此，现在在 gc 工具链中也已修复。

<!-- CL 36983 -->
链接器现在将在 Windows 上为 cgo 可执行文件生成 DWARF 信息。

<!-- CL 44210, CL 40095 -->
如果提供了 `-N -l` 标志，编译器现在会在生成的 DWARF 中包含词法作用域，允许调试器隐藏不在作用域内的变量。`.debug_info` 段现在是 DWARF 版本 4。

<!-- CL 43855 -->
`GOARM` 和 `GO386` 的值现在会影响已编译包的构建 ID，该 ID 被 `go` 工具的依赖缓存使用。

### 汇编器 {#asm}<!-- CL 42028 -->
四操作数 ARM `MULA` 指令现在能够正确汇编，其中加法寄存器作为第三个参数，结果寄存器作为第四个（也是最后一个）参数。在之前的版本中，这两个参数的含义是相反的。三操作数形式（第四个参数隐式地与第三个相同）不受影响。使用四操作数 `MULA` 指令的代码需要更新，但我们认为这种形式很少使用。`MULAWT` 和 `MULAWB` 在所有形式中已经使用了正确的顺序，因此没有变化。

<!-- CL 42990 -->
汇编器现在支持 `ADDSUBPS/PD`，补全了之前缺失的两条 x86 SSE3 指令。

### 文档 {#go-doc}

<!-- CL 36031 -->
长参数列表现在会被截断。这提高了 `go` `doc` 在一些生成代码上的可读性。

<!-- CL 38438 -->
现在支持查看结构体字段的文档。例如，`go` `doc` `http.Client.Jar`。

### 环境变量 {#go-env-json}

<!-- CL 38757 -->
新的 `go` `env` `-json` 标志启用了 JSON 输出，替代了默认的操作系统特定输出格式。

### 测试 {#go-test-list}

<!-- CL 41195 -->
[`go` `test`](/cmd/go/#hdr-Description_of_testing_flags) 命令接受一个新的 `-list` 标志，该标志接受一个正则表达式作为参数，并将匹配的任何测试、基准测试或示例的名称打印到标准输出，而不实际运行它们。

### 性能分析 {#go-tool-pprof}

<!-- CL 34192 -->
`runtime/pprof` 包生成的性能分析数据现在包含符号信息，因此可以在 `go` `tool` `pprof` 中查看，而无需生成该分析数据的二进制文件。

<!-- CL 38343 -->
`go` `tool` `pprof` 命令现在使用环境中定义的 HTTP 代理信息，使用的是 [`http.ProxyFromEnvironment`](/pkg/net/http/#ProxyFromEnvironment)。

### Vet {#vet}

<!-- CL 40112 -->
[`vet` 命令](/cmd/vet/) 已更好地集成到 [`go` 工具](/cmd/go/) 中，因此 `go` `vet` 现在支持所有标准构建标志，而 `vet` 自身的标志现在也可以从 `go` `vet` 以及 `go` `tool` `vet` 中使用。

### Gccgo {#gccgo}

由于 Go 的半年发布周期与 GCC 的年度发布周期对齐，GCC 7 版本包含了 Go 1.8.3 版本的 gccgo。我们预计下一个版本 GCC 8 将包含 Go 1.10 版本的 gccgo。

## 运行时 {#runtime}

### 包含内联帧的调用栈 {#callersframes}

[`runtime.Callers`](/pkg/runtime#Callers) 的用户应避免直接检查返回的 PC 切片，而应使用 [`runtime.CallersFrames`](/pkg/runtime#CallersFrames) 来获取调用栈的完整视图，或使用 [`runtime.Caller`](/pkg/runtime#Caller) 来获取单个调用者的信息。这是因为 PC 切片中的单个元素无法考虑内联帧或调用栈的其他细微差别。

具体来说，直接迭代 PC 切片并使用 [`runtime.FuncForPC`](/pkg/runtime#FuncForPC) 等函数来解析每个 PC 的代码将错过内联帧。为了获得完整的栈视图，此类代码应改为使用 `CallersFrames`。同样，代码不应假设 `Callers` 返回的长度能指示调用深度。它应改为计算 `CallersFrames` 返回的帧数。

查询特定深度单个调用者的代码应使用 `Caller`，而不是向 `Callers` 传递长度为 1 的切片。

[`runtime.CallersFrames`](/pkg/runtime#CallersFrames) 自 Go 1.7 起就已可用，因此代码可以在升级到 Go 1.9 之前进行更新。

## 性能 {#performance}

一如既往，变化是如此普遍和多样，以至于很难做出关于性能的精确陈述。由于垃圾回收器的速度提升、生成的代码质量更好以及核心库的优化，大多数程序的运行速度应该会略有提升。

### 垃圾回收器 {#gc}

<!-- CL 37520 -->
过去会触发“停止世界”垃圾回收的库函数现在会触发并发垃圾回收。具体来说，[`runtime.GC`](/pkg/runtime/#GC)、[`debug.SetGCPercent`](/pkg/runtime/debug/#SetGCPercent) 和 [`debug.FreeOSMemory`](/pkg/runtime/debug/#FreeOSMemory) 现在会触发并发垃圾回收，仅阻塞调用该函数的 goroutine，直到垃圾回收完成。

<!-- CL 34103, CL 39835 -->
[`debug.SetGCPercent`](/pkg/runtime/debug/#SetGCPercent) 函数仅当由于新的 GOGC 值导致立即需要垃圾回收时才会触发一次垃圾回收。这使得可以动态调整 GOGC。

<!-- CL 38732 -->
在使用包含许多大对象的大堆（>50GB）的应用程序中，大对象的分配性能得到显著提升。

<!-- CL 34937 -->
即使对于非常大的堆，[`runtime.ReadMemStats`](/pkg/runtime/#ReadMemStats) 函数现在也只需不到 100 微秒即可完成。

## 标准库 {#library}

### 透明单调时间支持 {#monotonic-time}

<!-- CL 36255 -->
[`time`](/pkg/time/) 包现在透明地在每个 [`Time`](/pkg/time/#Time) 值中跟踪单调时间，使得在存在挂钟调整的情况下，计算两个 `Time` 值之间的时间差成为一个安全的操作。详情请参阅[包文档](/pkg/time/#hdr-Monotonic_Clocks)和[设计文档](/design/12914-monotonic)。

### 新的位操作包 {#math-bits}

<!-- CL 36315 -->
Go 1.9 包含一个新包 [`math/bits`](/pkg/math/bits/)，提供了用于操作位的优化实现。在大多数架构上，该包中的函数还会被编译器识别，并作为内建函数（intrinsics）处理以获得额外的性能提升。

### 测试辅助函数 {#test-helper}

<!-- CL 38796 -->
新增的 [`(*T).Helper`](/pkg/testing/#T.Helper) 和 [`(*B).Helper`](/pkg/testing/#B.Helper) 方法将调用函数标记为测试辅助函数。在打印文件和行号信息时，该函数将被跳过。这允许编写测试辅助函数，同时仍能为用户提供有用的行号信息。### 并发映射 {#sync-map}

<!-- CL 36617 -->
[`sync`](/pkg/sync/) 包中新增的 [`Map`](/pkg/sync/#Map) 类型是一个并发映射，其加载、存储和删除操作具有摊销常量时间。多个协程可以同时安全地调用 `Map` 的方法。

### 性能分析器标签 {#pprof-labels}

<!-- CL 34198 -->
[`runtime/pprof` 包](/pkg/runtime/pprof) 现在支持为 `pprof` 性能分析记录添加标签。标签构成一个键值映射，用于在使用 [`pprof` 命令](/cmd/pprof/) 查看分析数据时，区分在不同上下文中对同一函数的调用。`pprof` 包的新 [`Do` 函数](/pkg/runtime/pprof/#Do) 可运行与提供的标签相关联的代码。该包中的其他新函数也有助于处理标签。

<!-- runtime/pprof -->

### 库的次要更改 {#minor_library_changes}

与往常一样，考虑到 Go 1 的[兼容性承诺](/doc/go1compat)，对库进行了各种次要更改和更新。

#### [archive/zip](/pkg/archive/zip/)

<!-- CL 39570 -->
ZIP [`Writer`](/pkg/archive/zip/#Writer) 现在会在适当时在 [`FileHeader.Flags`](/pkg/archive/zip/#FileHeader.Flags) 中设置 UTF-8 标志位。

<!-- archive/zip -->

#### [crypto/rand](/pkg/crypto/rand/)

<!-- CL 43852 -->
在 Linux 上，Go 现在调用 `getrandom` 系统调用时不带 `GRND_NONBLOCK` 标志；它会阻塞，直到内核拥有足够的随机性。对于早于 `getrandom` 系统调用的内核，Go 仍会从 `/dev/urandom` 读取。

<!-- crypto/rand -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 36093 -->
在 Unix 系统上，现在可以使用环境变量 `SSL_CERT_FILE` 和 `SSL_CERT_DIR` 分别覆盖 SSL 证书文件和 SSL 证书文件目录的系统默认位置。

FreeBSD 文件 `/usr/local/etc/ssl/cert.pem` 现已包含在证书搜索路径中。

<!-- CL 36900 -->
该包现在支持名称约束中的排除域名。除了强制执行此类约束外，如果提供的模板证书填充了新字段 [`ExcludedDNSDomains`](/pkg/crypto/x509/#Certificate.ExcludedDNSDomains)，[`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 将创建带有排除名称约束的证书。

<!-- CL 36696 -->
如果证书中存在任何 SAN 扩展（包括没有 DNS 名称的情况），则 [`Subject`](/pkg/crypto/x509/#Certificate.Subject) 中的通用名称将被忽略。在先前的版本中，代码仅测试证书中是否存在 DNS 名称 SAN。

<!-- crypto/x509 -->

#### [database/sql](/pkg/database/sql/)

<!-- CL 35476 -->
该包现在将在 [`Tx.Stmt`](/pkg/database/sql/#Tx.Stmt) 中使用缓存的 [`Stmt`](/pkg/database/sql/#Stmt)（如果可用）。这可以防止每次调用 [`Tx.Stmt`](/pkg/database/sql/#Tx.Stmt) 时重新准备语句。

<!-- CL 38533 -->
该包现在允许驱动程序通过实现 [`driver.NamedValueChecker`](/pkg/database/sql/driver/#NamedValueChecker) 来实现自己的参数检查器。这也允许驱动程序支持 `OUTPUT` 和 `INOUT` 参数类型。如果驱动程序支持，应使用 [`Out`](/pkg/database/sql/#Out) 来返回输出参数。

<!-- CL 39031 -->
[`Rows.Scan`](/pkg/database/sql/#Rows.Scan) 现在可以扫描用户定义的字符串类型。此前，该包支持扫描到 `type Int int64` 等数值类型。现在它还支持扫描到 `type String string` 等字符串类型。

<!-- CL 40694 -->
新的 [`DB.Conn`](/pkg/database/sql/#DB.Conn) 方法返回新的 [`Conn`](/pkg/database/sql/#Conn) 类型，它代表从连接池获取的与数据库的专用连接。在调用 [`Conn.Close`](/pkg/database/sql/#Conn.Close) 将连接返回到连接池之前，在 [`Conn`](/pkg/database/sql/#Conn) 上运行的所有查询都将使用相同的底层连接。

<!-- database/sql -->

#### [encoding/asn1](/pkg/encoding/asn1/)

<!-- CL 38660 -->
新的 [`NullBytes`](/pkg/encoding/asn1/#NullBytes) 和 [`NullRawValue`](/pkg/encoding/asn1/#NullRawValue) 表示 ASN.1 NULL 类型。

<!-- encoding/asn1 -->

#### [encoding/base32](/pkg/encoding/base32/)

<!-- CL 38634 -->
新的 [Encoding.WithPadding](/pkg/encoding/base32/#Encoding.WithPadding) 方法增加了对自定义填充字符和禁用填充的支持。

<!-- encoding/base32 -->

#### [encoding/csv](/pkg/encoding/csv/)

<!-- CL 41730 -->
新字段 [`Reader.ReuseRecord`](/pkg/encoding/csv/#Reader.ReuseRecord) 控制对 [`Read`](/pkg/encoding/csv/#Reader.Read) 的调用是否可以返回一个切片，该切片与上一次调用返回的切片共享后备数组，以提高性能。

<!-- encoding/csv -->

#### [fmt](/pkg/fmt/)

<!-- CL 37051 -->
打印浮点数和复数时，现在支持井号标志（'`#`'）。对于 `%e`、`%E`、`%f`、`%F`、`%g` 和 `%G`，它将始终打印小数点；对于 `%g` 和 `%G`，它不会删除尾随的零。

<!-- fmt -->

#### [hash/fnv](/pkg/hash/fnv/)

<!-- CL 38356 -->
该包现在通过 [`New128`](/pkg/hash/fnv/#New128) 和 [`New128a`](/pkg/hash/fnv/#New128a) 分别包含 128 位的 FNV-1 和 FNV-1a 哈希支持。

<!-- hash/fnv -->

#### [html/template](/pkg/html/template/)

<!-- CL 37880, CL 40936 -->
如果在管道中发现预定义转义器（"html"、"urlquery" 和 "js" 之一），并且它与自动转义器自行决定的转义方式不匹配，该包现在会报告错误。这避免了某些安全或正确性问题。现在使用这些转义器之一总是要么无效，要么是错误。（无效的情况简化了从 [text/template](/pkg/text/template/) 的迁移。）

<!-- html/template -->

#### [image](/pkg/image/)<!-- CL 36734 -->
当对相邻但不重叠的矩形调用时，[`Rectangle.Intersect`](/pkg/image/#Rectangle.Intersect) 方法现在会按照文档说明返回零值 `Rectangle`。在早期版本中，它会错误地返回一个空但非零的 `Rectangle`。

<!-- image -->

#### [image/color](/pkg/image/color/)

<!-- CL 36732 -->
YCbCr 到 RGBA 的转换公式已进行微调，以确保舍入调整覆盖完整的 [0, 0xffff] RGBA 范围。

<!-- image/color -->

#### [image/png](/pkg/image/png/)

<!-- CL 34150 -->
新的 [`Encoder.BufferPool`](/pkg/image/png/#Encoder.BufferPool) 字段允许指定一个 [`EncoderBufferPool`](/pkg/image/png/#EncoderBufferPool)，编码器在编码 PNG 图像时将使用它来获取临时的 `EncoderBuffer` 缓冲区。
使用 `BufferPool` 可以减少编码多幅图像时执行的内存分配次数。

<!-- CL 38271 -->
该包现在支持解码透明 8 位灰度（"Gray8"）图像。

<!-- image/png -->

#### [math/big](/pkg/math/big/)

<!-- CL 36487 -->
新的
[`IsInt64`](/pkg/math/big/#Int.IsInt64)
和
[`IsUint64`](/pkg/math/big/#Int.IsUint64)
方法报告一个 `Int`
值是否可以表示为 `int64` 或 `uint64`
值。

<!-- math/big -->

#### [mime/multipart](/pkg/mime/multipart/)

<!-- CL 39223 -->
新的
[`FileHeader.Size`](/pkg/mime/multipart/#FileHeader.Size)
字段描述了多部分消息中文件的大小。

<!-- mime/multipart -->

#### [net](/pkg/net/)

<!-- CL 32572 -->
新的
[`Resolver.StrictErrors`](/pkg/net/#Resolver.StrictErrors)
提供了对 Go 内置 DNS 解析器在处理由多个子查询组成的查询期间如何处理临时错误的控制，
例如 A+AAAA 地址查找。

<!-- CL 37260 -->
新的
[`Resolver.Dial`](/pkg/net/#Resolver.Dial)
允许 `Resolver` 使用自定义的拨号函数。

<!-- CL 40510 -->
[`JoinHostPort`](/pkg/net/#JoinHostPort) 现在只在主机包含冒号时才将地址放在方括号中。
在之前的版本中，如果地址包含百分号（'`%`'），它也会将地址括在方括号中。

<!-- CL 37913 -->
新的方法
[`TCPConn.SyscallConn`](/pkg/net/#TCPConn.SyscallConn),
[`IPConn.SyscallConn`](/pkg/net/#IPConn.SyscallConn),
[`UDPConn.SyscallConn`](/pkg/net/#UDPConn.SyscallConn),
和
[`UnixConn.SyscallConn`](/pkg/net/#UnixConn.SyscallConn)
提供了对连接底层文件描述符的访问。

<!-- 45088 -->
在使用 <code>[Listen](/pkg/net/#Listen)("tcp", ":0")</code> 创建监听器后，现在可以安全地使用 `(*TCPListener).String()` 返回的地址调用 [`Dial`](/pkg/net/#Dial)。
以前，这在某些 IPv6 堆栈配置不完整的机器上会失败。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 37328 -->
用于 `Cookie` 和 `Set-Cookie` 头的 [`Cookie.String`](/pkg/net/http/#Cookie.String) 方法现在会在值包含空格或逗号时用双引号将值括起来。

服务器变更：

  - <!-- CL 38194 -->
    [`ServeMux`](/pkg/net/http/#ServeMux) 现在在匹配处理器时会忽略主机头中的端口。对于 `CONNECT` 请求，主机会未经修改地进行匹配。
  - <!-- CL 44074 -->
    新的 [`Server.ServeTLS`](/pkg/net/http/#Server.ServeTLS) 方法包装了 [`Server.Serve`](/pkg/net/http/#Server.Serve)，并增加了 TLS 支持。
  - <!-- CL 34727 -->
    [`Server.WriteTimeout`](/pkg/net/http/#Server.WriteTimeout) 现在也适用于 HTTP/2 连接，并且是按流强制执行的。
  - <!-- CL 43231 -->
    HTTP/2 现在默认使用优先级写入调度器。
    帧的调度遵循 [RFC 7540 第 5.3 节](https://tools.ietf.org/html/rfc7540#section-5.3) 中描述的 HTTP/2 优先级。
  - <!-- CL 36483 -->
    [`StripPrefix`](/pkg/net/http/#StripPrefix) 返回的 HTTP 处理器现在会使用原始 `*http.Request` 的修改后的克隆来调用其提供的处理器。
    任何以 `*http.Request` 为键在映射中存储每请求状态的代码都应该改用
    [`Request.Context`](/pkg/net/http/#Request.Context)、
    [`Request.WithContext`](/pkg/net/http/#Request.WithContext) 和
    [`context.WithValue`](/pkg/context/#WithValue)。
  - <!-- CL 35490 -->
    [`LocalAddrContextKey`](/pkg/net/http/#LocalAddrContextKey) 现在包含连接的实际网络地址，而不是监听器使用的接口地址。

客户端和传输层变更：

  - <!-- CL 35488 -->
    当 [`Transport.Proxy`](/pkg/net/http/#Transport.Proxy) 返回的 URL 的 scheme 为 `socks5` 时，[`Transport`](/pkg/net/http/#Transport) 现在支持通过 SOCKS5 代理发起请求。

<!-- net/http -->

#### [net/http/fcgi](/pkg/net/http/fcgi/)

<!-- CL 40012 -->
新的
[`ProcessEnv`](/pkg/net/http/fcgi/#ProcessEnv)
函数返回与 HTTP 请求关联的 FastCGI 环境变量，这些变量没有对应的
[`http.Request`](/pkg/net/http/#Request) 字段，例如 `REMOTE_USER`。

<!-- net/http/fcgi -->

#### [net/http/httptest](/pkg/net/http/httptest/)

<!-- CL 34639 -->
新的
[`Server.Client`](/pkg/net/http/httptest/#Server.Client)
方法返回一个为向测试服务器发起请求而配置的 HTTP 客户端。

新的
[`Server.Certificate`](/pkg/net/http/httptest/#Server.Certificate)
方法返回测试服务器的 TLS 证书（如果有）。

<!-- net/http/httptest -->

#### [net/http/httputil](/pkg/net/http/httputil/)

<!-- CL 43712 -->
[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 现在会代理所有 HTTP/2 响应尾部，包括那些在初始响应头中未声明的尾部。gRPC 协议会使用这种未声明的尾部。

<!-- net/http/httputil -->

#### [os](/pkg/os/)<!-- CL 36800 -->
`os` 包现在对文件 I/O 使用内部运行时轮询器。这减少了在管道上执行读/写操作所需的线程数量，并消除了当一个 goroutine 在另一个 goroutine 正在使用文件进行 I/O 时关闭文件所产生的竞态条件。

<!-- CL 37915 -->
在 Windows 上，[`Args`](/pkg/os/#Args) 现在无需 `shell32.dll` 即可填充，从而将进程启动时间提高了 1-7 毫秒。

<!-- os -->

#### [os/exec](/pkg/os/exec/)

<!-- CL 37586 -->
`os/exec` 包现在防止在创建子进程时使用任何重复的环境变量。如果 [`Cmd.Env`](/pkg/os/exec/#Cmd.Env) 包含重复的环境变量键，则每个重复键在切片中仅使用最后一个值。

<!-- os/exec -->

#### [os/user](/pkg/os/user/)

<!-- CL 37664 -->
[`Lookup`](/pkg/os/user/#Lookup) 和 [`LookupId`](/pkg/os/user/#LookupId) 现在在 `CGO_ENABLED=0` 时，通过读取 `/etc/passwd` 文件可在 Unix 系统上工作。

<!-- CL 33713 -->
[`LookupGroup`](/pkg/os/user/#LookupGroup) 和 [`LookupGroupId`](/pkg/os/user/#LookupGroupId) 现在在 `CGO_ENABLED=0` 时，通过读取 `/etc/group` 文件可在 Unix 系统上工作。

<!-- os/user -->

#### [reflect](/pkg/reflect/)

<!-- CL 38335 -->
新增的 [`MakeMapWithSize`](/pkg/reflect/#MakeMapWithSize) 函数用于创建带有容量提示的映射（map）。

<!-- reflect -->

#### [runtime](/pkg/runtime/)

<!-- CL 37233, CL 37726 -->
运行时生成并记录在性能剖析数据中的回溯（tracebacks）现在在存在内联的情况下是准确的。要以编程方式检索回溯信息，应用程序应使用 [`runtime.CallersFrames`](/pkg/runtime/#CallersFrames)，而不是直接迭代 [`runtime.Callers`](/pkg/runtime/#Callers) 的结果。

<!-- CL 38403 -->
在 Windows 上，当程序空闲时，Go 不再强制系统计时器以高分辨率运行。这应能减少 Go 程序对电池续航时间的影响。

<!-- CL 29341 -->
在 FreeBSD 上，`GOMAXPROCS` 和 [`runtime.NumCPU`](/pkg/runtime/#NumCPU) 现在基于进程的 CPU 掩码，而不是 CPU 的总数。

<!-- CL 43641 -->
运行时对 Android O 有初步支持。

<!-- runtime -->

#### [runtime/debug](/pkg/runtime/debug/)

<!-- CL 34013 -->
使用负值调用 [`SetGCPercent`](/pkg/runtime/debug/#SetGCPercent) 不再会立即运行一次垃圾回收。

<!-- runtime/debug -->

#### [runtime/trace](/pkg/runtime/trace/)

<!-- CL 36015 -->
执行跟踪现在会显示标记协助（mark assist）事件，这些事件表明应用程序 goroutine 因分配过快而被迫协助垃圾回收。

<!-- CL 40810 -->
"Sweep"事件现在涵盖了为分配查找可用空间的整个过程，而不是记录每个被清扫的独立跨度（span）。这在跟踪分配密集型程序时降低了分配延迟。清扫事件显示了被清扫的字节数和被回收的字节数。

<!-- runtime/trace -->

#### [sync](/pkg/sync/)

<!-- CL 34310 -->
[`Mutex`](/pkg/sync/#Mutex) 现在更加公平。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 36697 -->
新字段 [`Credential.NoSetGroups`](/pkg/syscall/#Credential.NoSetGroups) 控制 Unix 系统在启动新进程时，是否执行 `setgroups` 系统调用来设置补充组。

<!-- CL 43512 -->
新字段 [`SysProcAttr.AmbientCaps`](/pkg/syscall/#SysProcAttr.AmbientCaps) 允许在 Linux 4.3+ 上创建新进程时设置环境能力（ambient capabilities）。

<!-- CL 37439 -->
在 64 位 x86 Linux 上，通过使用 `CLONE_VFORK` 和 `CLONE_VM`，进程创建延迟已得到优化。

<!-- CL 37913 -->
新的 [`Conn`](/pkg/syscall/#Conn) 接口描述了 [`net`](/pkg/net/) 包中的一些类型，这些类型可以使用新的 [`RawConn`](/pkg/syscall/#RawConn) 接口来提供对其底层文件描述符的访问。

<!-- syscall -->

#### [testing/quick](/pkg/testing/quick/)

<!-- CL 39152 -->
该包现在在生成 `int64` 和 `uint64` 随机数时，选择整个范围内的值；在早期版本中，生成的值始终限制在 [-2<sup>62</sup>, 2<sup>62</sup>) 范围内。

在先前的版本中，使用 nil 值的 [`Config.Rand`](/pkg/testing/quick/#Config.Rand) 会导致使用固定的确定性随机数生成器。现在则使用以当前时间为种子的随机数生成器。若要获得旧行为，请将 `Config.Rand` 设置为 `rand.New(rand.NewSource(0))`。

<!-- testing/quick -->

#### [text/template](/pkg/text/template/)

<!-- CL 38420 -->
对空块的处理已被修复，恢复了 Go 1.7 的旧行为。该问题是由 Go 1.8 中的一项更改引起的，该更改曾导致结果依赖于模板的顺序。

<!-- text/template -->

#### [time](/pkg/time/)

<!-- CL 36615 -->
新增方法 [`Duration.Round`](/pkg/time/#Duration.Round) 和 [`Duration.Truncate`](/pkg/time/#Duration.Truncate) 用于将时长（duration）舍入或截断为给定时长的倍数。

<!-- CL 35710 -->
在 Wine 下，获取时间和休眠现在可以正常工作。

如果一个 `Time` 值具有单调时钟读数，其字符串表示形式（由 `String` 返回）现在会包含一个最后的字段 `"m=±value"`，其中 `value` 是格式化为十进制秒数的单调时钟读数。

<!-- CL 44832 -->
包含的 `tzdata` 时区数据库已更新至版本 2017b。与往常一样，仅当系统尚无可用数据库时才会使用它。

<!-- time -->