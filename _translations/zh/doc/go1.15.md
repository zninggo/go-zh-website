---
title: Go 1.15 发行说明
---

<!--
注意：在本文件及同目录下其他文件中，惯例是将短语用等宽字体设置，内部包含非等宽空格，如
`hello` `world`。
请勿提交 CL 以移除此类短语中的内部标签。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.15 简介 {#introduction}

Go 最新版本 1.15 在 [Go 1.14](go1.14) 发布六个月后发布。该版本的大部分变更集中在工具链、运行时和库的实现方面。一如既往，此版本遵守 Go 1 [兼容性承诺](/doc/go1compat.html)。我们预计几乎所有 Go 程序都能继续像以前一样编译和运行。

Go 1.15 包含了 [链接器的重大改进](#linker)，改善了 [高核心数下小对象的分配](#runtime)，并弃用了 [X.509 CommonName](#commonname)。`GOPROXY` 现在支持跳过返回错误的代理，并且新增了 [嵌入式 tzdata 包](#time/tzdata)。

## 语言变更 {#language}

语言本身没有变更。

## 平台 {#ports}

### Darwin {#darwin}

正如 Go 1.14 发行说明中[宣布](go1.14#darwin)的那样，Go 1.15 要求 macOS 10.12 Sierra 或更高版本；已不再支持之前的版本。

<!-- golang.org/issue/37610, golang.org/issue/37611, CL 227582, and CL 227198  -->
正如 Go 1.14 发行说明中[宣布](/doc/go1.14#darwin)的那样，Go 1.15 在 macOS、iOS、iPadOS、watchOS 和 tvOS 上停止了对 32 位二进制文件的支持（即 `darwin/386` 和 `darwin/arm` 平台）。Go 继续支持 64 位的 `darwin/amd64` 和 `darwin/arm64` 平台。

### Windows {#windows}

<!-- CL 214397 and CL 230217 -->
现在，当提供 `-buildmode=pie` cmd/link 标志时，Go 会生成 Windows ASLR 可执行文件。Go 命令在 Windows 上默认使用 `-buildmode=pie`。

<!-- CL 227003 -->
`-race` 和 `-msan` 标志现在总是启用 `-d=checkptr`，用于检查 `unsafe.Pointer` 的使用情况。此前，除 Windows 外的所有操作系统上都是如此。

<!-- CL 211139 -->
Go 构建的 DLL 不再在进程收到信号（例如终端中的 Ctrl-C）时导致进程退出。

### Android {#android}

<!-- CL 235017, golang.org/issue/38838 -->
在为 Android 链接二进制文件时，Go 1.15 明确选择了在近期 NDK 版本中可用的 `lld` 链接器。`lld` 链接器可以避免在某些设备上崩溃，并且计划在未来成为 NDK 的默认链接器。

### OpenBSD {#openbsd}

<!-- CL 234381 -->
Go 1.15 为 `GOARCH=arm` 和 `GOARCH=arm64` 添加了对 OpenBSD 6.7 的支持。此前版本的 Go 已经支持 `GOARCH=386` 和 `GOARCH=amd64` 上的 OpenBSD 6.7。

### RISC-V {#riscv}

<!-- CL 226400, CL 226206, and others -->
64 位 RISC-V 平台（`GOOS=linux`, `GOARCH=riscv64`）在 Linux 上的稳定性和性能方面取得了进展。该平台现在还支持异步抢占。

### 386 {#386}

<!-- golang.org/issue/40255 -->
Go 1.15 是最后一个支持仅限 x87 浮点硬件（`GO386=387`）的版本。未来的版本将要求 386 至少支持 SSE2，从而将 Go 的最低 `GOARCH=386` 要求提高到 Intel Pentium 4（2000 年发布）或 AMD Opteron/Athlon 64（2003 年发布）。

## 工具 {#tools}

### Go 命令 {#go-command}

<!-- golang.org/issue/37367 -->
`GOPROXY` 环境变量现在支持跳过返回错误的代理。代理 URL 现在可以用逗号（`,`）或竖线（`|`）分隔。如果代理 URL 后面跟逗号，`go` 命令只有在收到 404 或 410 HTTP 响应后才会尝试列表中的下一个代理。如果代理 URL 后面跟竖线，`go` 命令会在遇到任何错误后尝试列表中的下一个代理。请注意，`GOPROXY` 的默认值仍然是 `https://proxy.golang.org,direct`，在出错时不会回退到 `direct`。

#### `go` `test` {#go-test}

<!-- https://golang.org/issue/36134 -->
更改 `-timeout` 标志现在会使缓存的测试结果失效。当使用较短超时重新调用 `go` `test` 时，使用较长超时运行的测试的缓存结果将不再被视为通过。

#### 标志解析 {#go-flag-parsing}

<!-- https://golang.org/cl/211358 -->
修复了 `go` `test` 和 `go` `vet` 中的多个标志解析问题。特别是，`GOFLAGS` 中指定的标志处理更加一致，并且 `-outputdir` 标志现在将相对路径解释为相对于 `go` 命令的工作目录（而不是每个单独测试的工作目录）。

#### 模块缓存 {#module-cache}

<!-- https://golang.org/cl/219538 -->
现在可以通过 `GOMODCACHE` 环境变量设置模块缓存的位置。`GOMODCACHE` 的默认值是 `GOPATH[0]/pkg/mod`，即此更改前的模块缓存位置。

<!-- https://golang.org/cl/221157 -->
现在有一个解决方法可用于因外部程序并发扫描文件系统而导致的 `go` 命令访问模块缓存时出现 Windows "访问被拒绝" 错误（参见 [issue #36568](/issue/36568)）。此解决方法默认未启用，因为当低于 1.14.2 和 1.13.10 版本的 Go 与同一模块缓存并发运行时不安全。可以通过显式设置环境变量 `GODEBUG=modcacheunzipinplace=1` 来启用它。

### Vet {#vet}

#### `string(x)` 的新警告 {#vet-string-int}

<!-- CL 212919, 232660 -->
vet 工具现在会对 `string(x)` 形式的转换发出警告，其中 `x` 是除 `rune` 或 `byte` 之外的整数类型。Go 的经验表明，许多此类转换错误地假设 `string(x)` 会求值为整数 `x` 的字符串表示形式。它实际上求值为一个包含 `x` 值的 UTF-8 编码的字符串。例如，`string(9786)` 不会求值为字符串 `"9786"`；它求值为字符串 `"\xe2\x98\xba"`，即 `"☺"`。正确使用 `string(x)` 的代码可以改写为
`string(rune(x))`。
或者，在某些情况下，调用 `utf8.EncodeRune(buf, x)` 并使用
合适的字节切片 `buf` 可能是正确的解决方案。
其他代码很可能应该使用 `strconv.Itoa`
或 `fmt.Sprint`。

这个新的 vet 检查在使用 `go` `test` 时
默认启用。

我们正在考虑在 Go 的未来版本中禁止此类转换。
也就是说，语言将改变为只允许
当 `x` 的类型是 `rune` 或 `byte` 时，
才对整数 `x` 使用 `string(x)`。
这样的语言更改将不是向后兼容的。
我们正在使用这个 vet 检查作为改变
语言的第一步尝试。

#### 对不可能的接口转换的新警告 {#vet-impossible-interface}

<!-- CL 218779, 232660 -->
vet 工具现在会对从一个接口类型到
另一个接口类型的类型断言发出警告，当该类型断言将始终失败时。
如果两个接口类型都实现了同名但
类型签名不同的方法，就会发生这种情况。

没有理由编写一个始终失败的类型断言，因此
任何触发此 vet 检查的代码都应该被重写。

这个新的 vet 检查在使用 `go` `test` 时
默认启用。

我们正在考虑在 Go 的未来版本中禁止不可能的接口类型断言。
这样的语言更改将不是向后兼容的。
我们正在使用这个 vet 检查作为改变
语言的第一步尝试。

## 运行时 {#runtime}

<!-- CL 221779 -->
如果用以下任何一种类型派生的值调用 `panic`：
`bool`、`complex64`、`complex128`、`float32`、`float64`、
`int`、`int8`、`int16`、`int32`、`int64`、`string`、
`uint`、`uint8`、`uint16`、`uint32`、`uint64`、`uintptr`，
那么现在将打印该值本身，而不仅仅是其地址。
以前，这仅对恰好是这些类型的值成立。

<!-- CL 228900 -->
在 Unix 系统上，如果使用 `kill` 命令
或 `kill` 系统调用向 Go 程序发送
`SIGSEGV`、`SIGBUS` 或 `SIGFPE` 信号，并且如果该信号
没有通过 [`os/signal.Notify`](/pkg/os/signal/#Notify) 处理，
那么 Go 程序现在将可靠地崩溃并输出堆栈跟踪。
在早期版本中，其行为是不可预测的。

<!-- CL 221182, CL 229998 -->
小对象的分配现在在核心数较高时性能
表现好得多，并且最坏情况下的延迟也更低。

<!-- CL 216401 -->
将小整数值转换为接口值不再
导致内存分配。

<!-- CL 216818 -->
在已关闭的 channel 上进行非阻塞接收现在与
在已打开的 channel 上进行非阻塞接收的性能一样好。

## 编译器 {#compiler}

<!-- CL 229578 -->
`unsafe` 包的[安全规则](/pkg/unsafe/#Pointer)允许在调用某些
函数时将 `unsafe.Pointer` 转换为 `uintptr`。
以前，在某些情况下，编译器允许多次
链接转换（例如，`syscall.Syscall(…,`
`uintptr(uintptr(ptr)),` `…)`）。编译器
现在要求恰好一次转换。使用了多次
转换的代码应该更新以满足安全规则。

<!-- CL 230544, CL 231397 -->
Go 1.15 通过消除某些类型的 GC 元数据和更
积极地消除未使用的类型元数据，将典型的二进制文件大小比 Go
1.14 减少了约 5%。

<!-- CL 219357, CL 231600 -->
工具链现在通过在 `GOARCH=amd64` 上将函数对齐到 32 字节边界并填充跳转指令，来缓解
[英特尔 CPU 错误 SKX102](https://www.intel.com/content/www/us/en/support/articles/000055650/processors.html)。虽然
这种填充增加了二进制文件大小，但这完全被
上面提到的二进制文件大小改进所弥补。

<!-- CL 222661 -->
Go 1.15 为编译器和汇编器都添加了 `-spectre` 标志，
以允许启用 Spectre 缓解措施。
这些几乎永远不应该被需要，主要是作为
“深度防御”机制提供的。
有关详细信息，请参阅 [Spectre wiki 页面](/wiki/Spectre)。

<!-- CL 228578 -->
编译器现在会对那些
对它们所应用的声明没有意义的 `//go:` 编译器指令报错，错误信息为
"misplaced compiler directive"（编译器指令位置错误）。这类错误的指令
以前就不起作用，但编译器会静默忽略它们。

<!-- CL 206658, CL 205066 -->
编译器的 `-json` 优化日志现在会报告
大的（>= 128 字节）复制操作，并包含逃逸
分析决策的解释。

## 链接器 {#linker}

此版本包含对 Go 链接器的重大改进，
减少了链接器资源使用（时间和内存），
并提高了代码的健壮性/可维护性。

对于一组具有代表性的大型 Go 程序，在基于 `ELF` 的操作系统（Linux、FreeBSD、NetBSD、OpenBSD、Dragonfly 和 Solaris）上运行于 `amd64` 架构时，链接速度平均提高了 20%，
内存使用减少了 30%，
其他架构/操作系统的组合也有适度的改进。

链接器性能提升的关键因素是重新设计的目标文件格式，
以及重新调整内部阶段以增加并发性（例如，并行地对符号应用重定位）。
Go 1.15 中的目标文件比其 1.14 版本略大。

这些更改是一个多版本项目的一部分，
旨在[现代化 Go 链接器](/s/better-linker)，
这意味着我们预计未来的版本中会有额外的链接器改进。

<!-- CL 207877 -->
链接器现在在 `linux/amd64` 和 `linux/arm64` 上为 `-buildmode=pie` 默认使用内部链接模式，
因此这些配置不再需要 C 链接器。
外部链接模式（这在 Go 1.14 中是 `-buildmode=pie` 的默认值）仍然可以通过 `-ldflags=-linkmode=external` 标志来请求。

## Objdump {#objdump}

<!-- CL 225459 -->
[objdump](/cmd/objdump/) 工具现在支持
使用 `-gnu` 标志以 GNU 汇编语法进行反汇编。

## 标准库 {#library}

### 新的嵌入式 tzdata 包 {#time_tzdata}<!-- CL 224588 -->
Go 1.15 引入了一个新的包，
[`time/tzdata`](/pkg/time/tzdata/)，
它允许将时区数据库嵌入到程序中。
导入这个包（作为 `import _ "time/tzdata"`）可以让程序即使在本地系统没有时区数据库的情况下也能找到时区信息。
你也可以通过使用 `-tags timetzdata` 构建标签来嵌入时区数据库。
这两种方法都会使程序大小增加约 800 KB。

### Cgo {#cgo}

<!-- CL 235817 -->
Go 1.15 将把 C 类型 `EGLConfig` 转换为
Go 类型 `uintptr`。这个变化类似于 Go
1.12 及更新版本处理 `EGLDisplay`、Darwin 的 CoreFoundation 和
Java 的 JNI 类型的方式。更多信息请参阅 [cgo
文档](/cmd/cgo/#hdr-Special_cases)。

<!-- CL 250940 -->
从 Go 1.15.3 开始，cgo 将不允许 Go 代码在栈或堆上分配
未定义的结构体类型（即仅被声明为 `struct
  S;` 或类似形式的 C 结构体）。
Go 代码只被允许使用指向这些类型的指针。
分配这样一个结构体的实例并传递指针或完整的结构体值给 C 代码一直是不安全且不太可能正确工作的；现在这种行为已被禁止。
修复方法是：要么重写 Go 代码，使其仅使用指针；
要么通过包含适当的 C 头文件，确保 Go 代码能看到该结构体的完整定义。

### X.509 CommonName 弃用 {#commonname}

<!-- CL 231379 -->
当没有主题备用名称（Subject Alternative Names）时，将 X.509 证书上的 `CommonName` 字段作为主机名处理的已弃用、遗留行为现在默认是禁用的。可以通过将值 `x509ignoreCN=0` 添加到 `GODEBUG` 环境变量中来临时重新启用它。

请注意，如果 `CommonName` 是一个无效的主机名，无论 `GODEBUG` 设置如何，它都将被忽略。无效的名称包括包含除字母、数字、连字符和下划线以外字符的名称，以及具有空标签或尾随点的名称。

### 标准库的微小变更 {#minor_library_changes}

一如既往，根据 Go 1 的[兼容性承诺](/doc/go1compat)，标准库中进行了各种微小的更改和更新。

#### [bufio](/pkg/bufio/)

<!-- CL 225357, CL 225557 -->
当 [`Scanner`](/pkg/bufio/#Scanner) 与一个错误的 [`io.Reader`](/pkg/io/#Reader) 一起使用时，如果该 Reader 的 `Read` 方法错误地返回了一个负数，`Scanner` 不再会导致 panic，而是会返回一个新的错误 [`ErrBadReadCount`](/pkg/bufio/#ErrBadReadCount)。

<!-- bufio -->

#### [context](/pkg/context/)

<!-- CL 223777 -->
现在明确禁止使用 nil 父上下文创建派生 `Context`。任何使用 [`WithValue`](/pkg/context/#WithValue)、[`WithDeadline`](/pkg/context/#WithDeadline) 或 [`WithCancel`](/pkg/context/#WithCancel) 函数进行此操作的尝试都会导致 panic。

<!-- context -->

#### [crypto](/pkg/crypto/)

<!-- CL 231417, CL 225460 -->
[`crypto/rsa`](/pkg/crypto/rsa/)、[`crypto/ecdsa`](/pkg/crypto/ecdsa/) 和 [`crypto/ed25519`](/pkg/crypto/ed25519/) 包中的 `PrivateKey` 和 `PublicKey` 类型现在有了 `Equal` 方法，用于比较密钥是否等价，或为公钥创建类型安全的接口。该方法签名与 [`go-cmp` 的相等性定义](https://pkg.go.dev/github.com/google/go-cmp/cmp#Equal)兼容。

<!-- CL 224937 -->
[`Hash`](/pkg/crypto/#Hash) 现在实现了 [`fmt.Stringer`](/pkg/fmt/#Stringer)。

<!-- crypto -->

#### [crypto/ecdsa](/pkg/crypto/ecdsa/)

<!-- CL 217940 -->
新的 [`SignASN1`](/pkg/crypto/ecdsa/#SignASN1) 和 [`VerifyASN1`](/pkg/crypto/ecdsa/#VerifyASN1) 函数允许以标准 ASN.1 DER 编码生成和验证 ECDSA 签名。

<!-- crypto/ecdsa -->

#### [crypto/elliptic](/pkg/crypto/elliptic/)

<!-- CL 202819 -->
新的 [`MarshalCompressed`](/pkg/crypto/elliptic/#MarshalCompressed) 和 [`UnmarshalCompressed`](/pkg/crypto/elliptic/#UnmarshalCompressed) 函数允许以压缩格式编码和解码 NIST 椭圆曲线点。

<!-- crypto/elliptic -->

#### [crypto/rsa](/pkg/crypto/rsa/)

<!-- CL 226203 -->
根据 RFC 8017，[`VerifyPKCS1v15`](/pkg/crypto/rsa/#VerifyPKCS1v15) 现在会拒绝缺少前导零的无效短签名。

<!-- crypto/rsa -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 214977 -->
新的 [`Dialer`](/pkg/crypto/tls/#Dialer) 类型及其 [`DialContext`](/pkg/crypto/tls/#Dialer.DialContext) 方法允许使用上下文来连接 TLS 服务器并进行握手。

<!-- CL 229122 -->
[`Config`](/pkg/crypto/tls/#Config) 类型上的新回调 [`VerifyConnection`](/pkg/crypto/tls/#Config.VerifyConnection) 允许对每个连接进行自定义验证逻辑。它可以访问 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState)，其中包含对等方证书、SCT 和装订的 OCSP 响应。

<!-- CL 230679 -->
自动生成的会话票据密钥现在每 24 小时自动轮换一次，有效期为 7 天，以限制其对前向保密性的影响。

<!-- CL 231317 -->
在 TLS 1.2 及更早版本中，用于恢复连接的会话密钥的会话票据有效期现在也限制为 7 天，同样是为了限制其对前向保密性的影响。

<!-- CL 231038 -->
RFC 8446 中规定的客户端降级保护检查现在已被强制执行。这可能导致客户端在遇到行为类似于未授权降级攻击的中间件时出现连接错误。

<!-- CL 208226 -->
[`SignatureScheme`](/pkg/crypto/tls/#SignatureScheme)、[`CurveID`](/pkg/crypto/tls/#CurveID) 和 [`ClientAuthType`](/pkg/crypto/tls/#ClientAuthType) 现在实现了 [`fmt.Stringer`](/pkg/fmt/#Stringer)。

<!-- CL 236737 -->
`ConnectionState` 字段 `OCSPResponse` 和 `SignedCertificateTimestamps` 现在在客户端恢复连接时也会被重新填充。<!-- CL 227840 -->
[`tls.Conn`](/pkg/crypto/tls/#Conn) 现在在连接永久断开时会返回不透明错误，该错误封装了临时性的 [`net.Error`](/pkg/net/http/#Error)。要访问原始的 `net.Error`，请使用 [`errors.As`](/pkg/errors/#As)（或 [`errors.Unwrap`](/pkg/errors/#Unwrap)），而非类型断言。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 231378, CL 231380, CL 231381 -->
如果证书上的名称或正在验证的名称（使用 [`VerifyOptions.DNSName`](/pkg/crypto/x509/#VerifyOptions.DNSName) 或 [`VerifyHostname`](/pkg/crypto/x509/#Certificate.VerifyHostname)）无效，它们现在将不进行进一步处理（不识别通配符或去除尾部点号）而进行不区分大小写的比较。无效名称包括包含字母、数字、连字符和下划线以外任何字符的名称、标签为空的名称，以及证书上带尾部点号的名称。

<!-- CL 217298 -->
新增的 [`CreateRevocationList`](/pkg/crypto/x509/#CreateRevocationList) 函数和 [`RevocationList`](/pkg/crypto/x509/#RevocationList) 类型允许创建符合 RFC 5280 标准的 X.509 v2 证书吊销列表。

<!-- CL 227098 -->
[`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 现在会自动生成 `SubjectKeyId`（如果模板是 CA 且未显式指定该字段）。

<!-- CL 228777 -->
如果模板指定了 `MaxPathLen` 但不是 CA，[`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 现在会返回错误。

<!-- CL 205237 -->
在 macOS 以外的 Unix 系统上，`SSL_CERT_DIR` 环境变量现在可以是冒号分隔的列表。

<!-- CL 227037 -->
在 macOS 上，二进制文件现在总是链接 `Security.framework` 以提取系统信任根，无论 cgo 是否可用。由此产生的行为应与操作系统验证程序更加一致。

<!-- crypto/x509 -->

#### [crypto/x509/pkix](/pkg/crypto/x509/pkix/)

<!-- CL 229864, CL 240543 -->
如果 [`ExtraNames`](/pkg/crypto/x509/pkix/#Name.ExtraNames) 为 nil，[`Name.String`](/pkg/crypto/x509/pkix/#Name.String) 现在会打印 [`Names`](/pkg/crypto/x509/pkix/#Name.Names) 中的非标准属性。

<!-- crypto/x509/pkix -->

#### [database/sql](/pkg/database/sql/)

<!-- CL 145758 -->
新增的 [`DB.SetConnMaxIdleTime`](/pkg/database/sql/#DB.SetConnMaxIdleTime) 方法允许在连接空闲一段时间后将其从连接池中移除，而无需考虑连接的总寿命。[`DBStats.MaxIdleTimeClosed`](/pkg/database/sql/#DBStats.MaxIdleTimeClosed) 字段显示了因 `DB.SetConnMaxIdleTime` 而关闭的连接总数。

<!-- CL 214317 -->
新增的 [`Row.Err`](/pkg/database/sql/#Row.Err) getter 允许在不调用 `Row.Scan` 的情况下检查查询错误。

<!-- database/sql -->

#### [database/sql/driver](/pkg/database/sql/driver/)

<!-- CL 174122 -->
新增的 [`Validator`](/pkg/database/sql/driver/#Validator) 接口可由 `Conn` 实现，以允许驱动程序指示连接是否有效或是否应丢弃。

<!-- database/sql/driver -->

#### [debug/pe](/pkg/debug/pe/)

<!-- CL 222637 -->
该包现在定义了 PE 文件格式使用的 `IMAGE_FILE`、`IMAGE_SUBSYSTEM` 和 `IMAGE_DLLCHARACTERISTICS` 常量。

<!-- debug/pe -->

#### [encoding/asn1](/pkg/encoding/asn1/)

<!-- CL 226984 -->
[`Marshal`](/pkg/encoding/asn1/#Marshal) 现在根据 X.690 DER 对 SET OF 的组件进行排序。

<!-- CL 227320 -->
[`Unmarshal`](/pkg/encoding/asn1/#Unmarshal) 现在会拒绝未根据 X.690 DER 进行最小化编码的标签和对象标识符。

<!-- encoding/asn1 -->

#### [encoding/json](/pkg/encoding/json/)

<!-- CL 199837 -->
该包现在对解码时的嵌套最大深度有内部限制。这降低了深度嵌套输入可能使用大量栈内存，甚至导致“goroutine 栈超过限制”恐慌的可能性。

<!-- encoding/json -->

#### [flag](/pkg/flag/)

<!-- CL 221427 -->
当 `flag` 包遇到 `-h` 或 `-help`，并且这些标志未定义时，它现在会打印使用信息。如果 [`FlagSet`](/pkg/flag/#FlagSet) 是使用 [`ExitOnError`](/pkg/flag/#ExitOnError) 创建的，[`FlagSet.Parse`](/pkg/flag/#FlagSet.Parse) 将会以状态码 2 退出。在此版本中，`-h` 或 `-help` 的退出状态已更改为 0。特别是，这适用于命令行标志的默认处理。

#### [fmt](/pkg/fmt/)

<!-- CL 215001 -->
打印动词 `%#g` 和 `%#G` 现在会保留浮点值的尾随零。

<!-- fmt -->

#### [go/format](/pkg/go/format/)

<!-- golang.org/issue/37476, CL 231461, CL 240683 -->
[`Source`](/pkg/go/format/#Source) 和 [`Node`](/pkg/go/format/#Node) 函数现在在格式化 Go 源代码时会对数字字面量前缀和指数进行规范化。这与 [`gofmt`](/pkg/cmd/gofmt/) 命令自 [Go 1.13](/doc/go1.13#gofmt) 起实现的行为一致。

<!-- go/format -->

#### [html/template](/pkg/html/template/)

<!-- CL 226097 -->
该包现在在所有 JavaScript 和 JSON 上下文中使用 Unicode 转义（`\uNNNN`）。这修复了 `application/ld+json` 和 `application/json` 上下文中的转义错误。

<!-- html/template -->

#### [io/ioutil](/pkg/io/ioutil/)

<!-- CL 212597 -->
[`TempDir`](/pkg/io/ioutil/#TempDir) 和 [`TempFile`](/pkg/io/ioutil/#TempFile) 现在会拒绝包含路径分隔符的模式。也就是说，像 `ioutil.TempFile("/tmp", "../base*")` 这样的调用将不再成功。这可以防止意外的目录遍历。

<!-- io/ioutil -->

#### [math/big](/pkg/math/big/)

<!-- CL 230397 -->
新增的 [`Int.FillBytes`](/pkg/math/big/#Int.FillBytes) 方法允许序列化到固定大小的预分配字节切片。

<!-- math/big -->

#### [math/cmplx](/pkg/math/cmplx/)<!-- CL 220689 -->
本包中的函数已更新，以符合C99标准（IEC 60559兼容的复数运算附件G），特别是在处理无穷大、NaN和有符号零等特殊参数方面。

<!-- math/cmplx -->

#### [net](/pkg/net/)

<!-- CL 228645 -->
若I/O操作超过由 [`Conn.SetDeadline`](/pkg/net/#Conn.SetDeadline)、`Conn.SetReadDeadline` 或 `Conn.SetWriteDeadline` 方法设置的截止时间，现在将返回一个错误，该错误本身就是或包装了 [`os.ErrDeadlineExceeded`](/pkg/os/#ErrDeadlineExceeded)。这可用于可靠地检测错误是否因超过截止时间引起。早期版本建议在错误上调用 `Timeout` 方法，但I/O操作可能返回 `Timeout` 为 `true` 的错误，而实际上并未超过截止时间。

<!-- CL 228641 -->
新增的 [`Resolver.LookupIP`](/pkg/net/#Resolver.LookupIP) 方法支持同时指定网络类型和接受上下文的IP查找。

#### [net/http](/pkg/net/http/)

<!-- CL 231418, CL 231419 -->
作为抵御请求走私攻击的加固措施，解析现在更严格：非ASCII空白字符不再像SP和HTAB那样被修剪，并且已移除对 "`identity`" `Transfer-Encoding` 的支持。

<!-- net/http -->

#### [net/http/httputil](/pkg/net/http/httputil/)

<!-- CL 230937 -->
当传入的 `Request.Header` 映射条目中 `X-Forwarded-For` 字段为 `nil` 时，[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 现在支持不修改该标头。

<!-- CL 224897 -->
当由 [`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 处理的协议切换请求（如WebSocket）被取消时，后端连接现在会被正确关闭。

#### [net/http/pprof](/pkg/net/http/pprof/)

<!-- CL 147598, CL 229537 -->
所有性能分析端点现在都支持一个 "`seconds`" 参数。当提供此参数时，端点将对指定的秒数进行性能分析并报告差异。`cpu` 性能分析和跟踪端点中 "`seconds`" 参数的含义保持不变。

#### [net/url](/pkg/net/url/)

<!-- CL 227645 -->
新增的 [`URL`](/pkg/net/url/#URL) 字段 `RawFragment` 和方法 [`EscapedFragment`](/pkg/net/url/#URL.EscapedFragment) 提供了对特定片段确切编码的详细信息和控制。它们类似于 `RawPath` 和 [`EscapedPath`](/pkg/net/url/#URL.EscapedPath)。

<!-- CL 207082 -->
新增的 [`URL`](/pkg/net/url/#URL) 方法 [`Redacted`](/pkg/net/url/#URL.Redacted) 以字符串形式返回URL，并将任何密码替换为 `xxxxx`。

#### [os](/pkg/os/)

<!-- CL -->
若I/O操作超过由 [`File.SetDeadline`](/pkg/os/#File.SetDeadline)、[`File.SetReadDeadline`](/pkg/os/#File.SetReadDeadline) 或 [`File.SetWriteDeadline`](/pkg/os/#File.SetWriteDeadline) 方法设置的截止时间，现在将返回一个错误，该错误本身就是或包装了 [`os.ErrDeadlineExceeded`](/pkg/os/#ErrDeadlineExceeded)。这可用于可靠地检测错误是否因超过截止时间引起。早期版本建议在错误上调用 `Timeout` 方法，但I/O操作可能返回 `Timeout` 为 `true` 的错误，而实际上并未超过截止时间。

<!-- CL 232862 -->
`os` 和 `net` 包现在会自动重试因 `EINTR` 而失败的系统调用。此前这会导致虚假失败，随着Go 1.14中异步抢占的添加，这种情况变得更加常见。现在已透明地处理此问题。

<!-- CL 229101 -->
[`os.File`](/pkg/os/#File) 类型现在支持 [`ReadFrom`](/pkg/os/#File.ReadFrom) 方法。这允许在某些系统上使用 `copy_file_range` 系统调用，当使用 [`io.Copy`](/pkg/io/#Copy) 从一个 `os.File` 复制数据到另一个时。一个后果是，当复制到 `os.File` 时，[`io.CopyBuffer`](/pkg/io/#CopyBuffer) 并不总是使用提供的缓冲区。如果程序希望强制使用提供的缓冲区，可以通过编写 `io.CopyBuffer(struct{ io.Writer }{dst}, src, buf)` 来实现。

#### [plugin](/pkg/plugin/)

<!-- CL 182959 -->
macOS上的 `-buildmode=plugin` 现在支持（默认启用）DWARF生成。

<!-- CL 191617 -->
现在支持在 `freebsd/amd64` 上使用 `-buildmode=plugin` 构建。

#### [reflect](/pkg/reflect/)

<!-- CL 228902 -->
`reflect` 包现在禁止访问所有未导出字段的方法，而此前它允许访问未导出的嵌入字段的方法。依赖于先前行为的代码应更新，改为访问包含变量的相应提升方法。

#### [regexp](/pkg/regexp/)

<!-- CL 187919 -->
新增的 [`Regexp.SubexpIndex`](/pkg/regexp/#Regexp.SubexpIndex) 方法返回正则表达式中第一个具有给定名称的子表达式的索引。

<!-- regexp -->

#### [runtime](/pkg/runtime/)

<!-- CL 216557 -->
包括 [`ReadMemStats`](/pkg/runtime/#ReadMemStats) 和 [`GoroutineProfile`](/pkg/runtime/#GoroutineProfile) 在内的若干函数，现在在垃圾回收进行期间不再阻塞。

#### [runtime/pprof](/pkg/runtime/pprof/)

<!-- CL 189318 -->
goroutine性能分析现在包含在分析时与每个goroutine关联的性能分析标签。此功能尚未针对通过 `debug=2` 报告的性能分析实现。

#### [strconv](/pkg/strconv/)

<!-- CL 216617 -->
新增了用于处理复数的 [`FormatComplex`](/pkg/strconv/#FormatComplex) 和 [`ParseComplex`](/pkg/strconv/#ParseComplex)。

[`FormatComplex`](/pkg/strconv/#FormatComplex) 将复数转换为 (a+bi) 形式的字符串，其中a和b分别为实部和虚部。

[`ParseComplex`](/pkg/strconv/#ParseComplex) 将字符串转换为指定精度的复数。`ParseComplex` 接受格式为 `N+Ni` 的复数。

<!-- strconv -->

#### [sync](/pkg/sync/)<!-- CL 205899, golang.org/issue/33762 -->
新增方法
[`Map.LoadAndDelete`](/pkg/sync/#Map.LoadAndDelete)
会以原子操作删除一个键，如果该键存在则返回其之前的值。

<!-- CL 205899 -->
方法
[`Map.Delete`](/pkg/sync/#Map.Delete)
现在效率更高。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 231638 -->
在Unix系统上，使用
[`SysProcAttr`](/pkg/syscall/#SysProcAttr)
的函数现在会拒绝同时设置 `Setctty`
和 `Foreground` 字段的尝试，因为两者都使用
`Ctty` 字段但使用方式不兼容。
我们预计只有少数现有程序会同时设置这两个字段。

设置 `Setctty` 字段现在要求
`Ctty` 字段被设置为子进程中的文件描述符编号，
该编号由 `ProcAttr.Files` 字段确定。
使用子进程的描述符一直有效，但在某些情况下
使用父进程的文件描述符也可能恰好能工作。
一些设置了 `Setctty` 的程序可能需要更改
`Ctty` 的值以使用子进程的描述符编号。

<!-- CL 220578 -->
[现在可以在](/pkg/syscall/#Proc.Call)`windows/amd64`
上调用返回浮点值的系统调用了。

#### [testing](/pkg/testing/)

<!-- golang.org/issue/28135 -->
`testing.T` 类型现在有一个
[`Deadline`](/pkg/testing/#T.Deadline) 方法，
它会报告测试二进制文件将超过其超时限制的时间点。

<!-- golang.org/issue/34129 -->
`TestMain` 函数不再需要调用
`os.Exit`。如果一个 `TestMain` 函数返回，
测试二进制文件将使用 `m.Run` 返回的值
来调用 `os.Exit`。

<!-- CL 226877, golang.org/issue/35998 -->
新增方法
[`T.TempDir`](/pkg/testing/#T.TempDir) 和
[`B.TempDir`](/pkg/testing/#B.TempDir)
会返回临时目录，这些目录会在测试结束时
被自动清理。

<!-- CL 229085 -->
`go` `test` `-v` 现在按测试名称分组输出，
而不是在每一行都打印测试名称。

<!-- testing -->

#### [text/template](/pkg/text/template/)

<!-- CL 226097 -->
[`JSEscape`](/pkg/text/template/#JSEscape) 现在
始终使用Unicode转义（`\u00XX`），这与JSON兼容。

<!-- text/template -->

#### [time](/pkg/time/)

<!-- CL 220424, CL 217362, golang.org/issue/33184 -->
新增方法
[`Ticker.Reset`](/pkg/time/#Ticker.Reset)
支持更改计时器的持续时间。

<!-- CL 227878 -->
当返回错误时，[`ParseDuration`](/pkg/time/#ParseDuration) 现在会引用原始值。

<!-- time -->