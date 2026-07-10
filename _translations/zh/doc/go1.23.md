---
title: Go 1.23 发布说明
---

<!--
注意：在本文档以及本目录的其他文档中，约定使用固定宽度短语和非固定宽度空格，如
`hello` `world`。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.23 简介 {#introduction}

Go 语言最新版本 1.23 在 [Go 1.22](/doc/go1.22) 发布六个月后问世。其大部分变更集中在工具链、运行时和库的实现上。一如既往，该版本遵守 Go 1 [兼容性承诺](/doc/go1compat)。我们预期几乎所有 Go 程序都能继续像以前一样编译和运行。

## 语言变更 {#language}

<!-- go.dev/issue/61405, CL 557835, CL 584596 -->
`for-range` 循环中的 `range` 子句现在接受以下类型的迭代器函数作为范围表达式：

    func(func() bool)
    func(func(K) bool)
    func(func(K, V) bool)

调用迭代器参数函数将为 `for-range` 循环产生迭代值。详情请参阅 [`iter`](/pkg/iter) 包文档、[语言规范](/ref/spec#For_range) 以及[基于函数的范围遍历博客文章](/blog/range-functions)。动机请参考 2022 年的 ["range-over-func" 讨论](/issue/56413)。

<!-- go.dev/issue/46477, CL 566856, CL 586955, CL 586956 -->
Go 1.23 包含对[泛型类型别名](/issue/46477)的预览支持。使用 `GOEXPERIMENT=aliastypeparams` 构建工具链可在包内启用此功能。（跨包边界使用泛型别名类型暂不支持。）

## 工具 {#tools}

### 遥测

<!-- go.dev/issue/58894, go.dev/issue/67111 -->
从 Go 1.23 开始，Go 工具链可以收集使用情况和故障统计信息，以帮助 Go 团队了解工具链的使用方式及其工作状况。我们将这些统计信息称为 [Go 遥测](/doc/telemetry)。

Go 遥测是一个_选择加入的系统_，由 [`go` `telemetry` 命令](/cmd/go/#hdr-Manage_telemetry_data_and_settings) 控制。默认情况下，工具链程序将统计信息收集在本地计数器文件中，这些文件可以在本地检查，但除此之外未被使用（`go` `telemetry` `local`）。

为了帮助我们保持 Go 的良好运行并了解其使用情况，请考虑通过运行 `go` `telemetry` `on` 来选择加入 Go 遥测。在该模式下，匿名计数器报告将每周上传到 [telemetry.go.dev](https://telemetry.go.dev)，在那里它们被聚合成图表，并可供任何希望分析数据的 Go 贡献者或用户下载。有关 Go 遥测系统的更多详情，请参阅“[Go 遥测](/doc/telemetry)”。

### Go 命令 {#go-command}

设置 `GOROOT_FINAL` 环境变量不再有效（[#62047](/issue/62047)）。将 `go` 命令安装到 `$GOROOT/bin/go` 之外位置的发行版应安装符号链接，而不是移动或复制 `go` 二进制文件。

<!-- go.dev/issue/34208, CL 563137, CL 586095 -->
新的 `go` `env` `-changed` 标志使该命令仅打印其有效值与在空环境中且未使用过 `-w` 标志时所获得的默认值不同的设置。

<!-- go.dev/issue/27005, CL 585401 -->
新的 `go` `mod` `tidy` `-diff` 标志使该命令不修改文件，而是将必要的更改以统一差异格式打印出来。如果需要更新，它将以非零代码退出。

<!-- go.dev/issue/52792, CL 562775 -->
`go` `list` `-m` `-json` 命令现在包含新的 `Sum` 和 `GoModSum` 字段。这与 `go` `mod` `download` `-json` 命令的现有行为类似。

<!-- go.dev/issue/65573 ("cmd/go: separate default GODEBUGs from go language version") -->
`go.mod` 和 `go.work` 中的新 `godebug` 指令声明了一个[GODEBUG 设置](/doc/godebug)，该设置将应用于正在使用的工作模块或工作区。

### Vet {#vet}

<!-- go.dev/issue/46136 -->
`go vet` 子命令现在包含 [stdversion](https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/stdversion) 分析器，该分析器会标记那些对于引用文件中生效的 Go 版本而言太新的符号引用。（生效版本由文件所在 `go.mod` 文件中的 `go` 指令以及文件中的任何 [`//go:build` 约束](/cmd/go#hdr-Build_constraints) 决定。）

例如，它将报告在一个模块的文件中（其 `go.mod` 文件指定 `go 1.21`）引用 `reflect.TypeFor` 函数（在 go1.22 中引入）的诊断信息。

### Cgo {#cgo}

<!-- go.dev/issue/66456 -->
[`cmd/cgo`](/pkg/cmd/cgo) 支持新的 `-ldflags` 标志，用于向 C 链接器传递标志。`go` 命令会自动使用它，避免在 `CGO_LDFLAGS` 非常大时出现“参数列表过长”错误。

### Trace {#trace}

<!-- go.dev/issue/65316 -->
`trace` 工具现在能更好地容忍部分损坏的跟踪记录，它会尝试恢复所能获取的跟踪数据。此功能在查看程序崩溃期间收集的跟踪记录时尤其有用，因为在大多数情况下，导致崩溃的跟踪数据现在[可以恢复](/issue/65319)。

## 运行时 {#runtime}

在未处理的 panic 或其他致命错误后，运行时打印的回溯信息现在将错误消息（例如 panic 的参数）的第二行及后续行缩进一个制表符，以便能明确区分其与第一个 goroutine 的堆栈跟踪。讨论请参见 [#64590](/issue/64590)。

## 编译器 {#compiler}

使用[配置文件引导优化](/doc/pgo)构建的构建时间开销已显著降低。此前，大型构建在启用 PGO 时可能会看到 100% 以上的构建时间增加。在 Go 1.23 中，开销应降至个位数百分比。<!-- https://go.dev/issue/62737 , https://golang.org/cl/576681,  https://golang.org/cl/577615 -->
Go 1.23 的编译器现在可以将函数内访问不连续区域的局部变量的栈帧槽位重叠，从而减少 Go 应用程序的栈使用量。

<!-- https://go.dev/cl/577935 -->
对于 386 和 amd64 架构，编译器将使用配置文件引导优化的信息来对齐循环中的某些热块。这将在增加约 0.1% 的文本和二进制大小的代价下，带来额外 1-1.5% 的性能提升。目前此优化仅在 386 和 amd64 上实现，因为在其他平台上尚未显示出改进。热块对齐可以通过 `-gcflags=[<packages>=]-d=alignhot=0` 禁用。

## 链接器 {#linker}

<!-- go.dev/issue/67401, CL 585556, CL 587220, and many more -->
链接器现在禁止使用 `//go:linkname` 指令来引用标准库（包括运行时）中未在定义处标记 `//go:linkname` 的内部符号。同样地，链接器也禁止从汇编代码中引用此类符号。为了向后兼容，在大型开源代码库中发现的现有 `//go:linkname` 用法仍然受支持。任何对标准库内部符号的新引用都将被禁止。

链接器命令行标志 `-checklinkname=0` 可用于禁用此检查，以便于调试和实验。

<!-- CL 473495 -->
在构建动态链接的 ELF 二进制文件（包括 PIE 二进制文件）时，新的 `-bindnow` 标志启用立即函数绑定。

## 标准库 {#library}

### 计时器变更

Go 1.23 对 [`time.Timer`](/pkg/time#Timer) 和 [`time.Ticker`](/pkg/time#Ticker) 的实现进行了两项重大变更。

<!-- go.dev/issue/61542 -->
首先，不再被程序引用的 `Timer` 和 `Ticker` 将立即变得可被垃圾回收，即使其 `Stop` 方法未被调用。早期版本的 Go 直到 `Timer` 触发后才会回收未停止的 `Timer`，并且永远不会回收未停止的 `Ticker`。

<!-- go.dev/issue/37196 -->
其次，与 `Timer` 或 `Ticker` 关联的计时器通道现在是容量为 0 的无缓冲通道。此变更的主要影响是，Go 现在保证对于任何对 `Reset` 或 `Stop` 方法的调用，该调用之前准备好的陈旧值都不会在调用后发送或接收。早期版本的 Go 使用带有一个元素缓冲区的通道，这使得正确使用 `Reset` 和 `Stop` 变得很困难。此变更的一个可见效果是，计时器通道的 `len` 和 `cap` 现在返回 0 而不是 1，这可能会影响那些轮询长度以决定在计时器通道上接收是否会成功的程序。此类代码应使用非阻塞接收代替。

这些新行为仅当主 Go 程序位于使用 `go.mod` 的 `go` 行指定 Go 1.23.0 或更高版本的模块中时才生效。当 Go 1.23 构建较旧的程序时，旧行为仍然有效。新的 [GODEBUG 设置](/doc/godebug) [`asynctimerchan=1`](/pkg/time/#NewTimer) 可用于恢复异步通道行为，即使程序的 `go.mod` 文件中指定了 Go 1.23.0 或更高版本。

### 新的 unique 包

新的 [`unique`](/pkg/unique) 包提供了用于规范化值（如“驻留”或“哈希一致性”）的工具。

任何可比较类型的值都可以使用新的 `Make[T]` 函数进行规范化，该函数以 `Handle[T]` 的形式生成对值的规范化副本的引用。两个 `Handle[T]` 相等当且仅当用于生成这些句柄的值相等，这允许程序去重值并减少其内存占用。比较两个 `Handle[T]` 值非常高效，简化为简单的指针比较。

### 迭代器

新的 [`iter`](/pkg/iter) 包提供了处理用户自定义迭代器的基本定义。

[`slices`](/pkg/slices) 包添加了几个使用迭代器的函数：
- [All](/pkg/slices#All) 返回一个遍历切片索引和值的迭代器。
- [Values](/pkg/slices#Values) 返回一个遍历切片元素的迭代器。
- [Backward](/pkg/slices#Backward) 返回一个反向遍历切片的迭代器。
- [Collect](/pkg/slices#Collect) 从迭代器收集值到一个新的切片中。
- [AppendSeq](/pkg/slices#AppendSeq) 将迭代器中的值追加到现有切片。
- [Sorted](/pkg/slices#Sorted) 从迭代器收集值到一个新切片，然后对该切片排序。
- [SortedFunc](/pkg/slices#SortedFunc) 类似于 `Sorted`，但带有比较函数。
- [SortedStableFunc](/pkg/slices#SortedStableFunc) 类似于 `SortFunc`，但使用稳定的排序算法。
- [Chunk](/pkg/slices#Chunk) 返回一个迭代器，遍历切片的连续子切片，每个子切片最多包含 n 个元素。

[`maps`](/pkg/maps) 包添加了几个使用迭代器的函数：
- [All](/pkg/maps#All) 返回一个遍历 map 中键值对的迭代器。
- [Keys](/pkg/maps#Keys) 返回一个遍历 map 中键的迭代器。
- [Values](/pkg/maps#Values) 返回一个遍历 map 中值的迭代器。
- [Insert](/pkg/maps#Insert) 将迭代器中的键值对添加到现有 map 中。
- [Collect](/pkg/maps#Collect) 从迭代器收集键值对到一个新的 map 中并返回它。

### 新的 structs 包

新的 [`structs`](/pkg/structs) 包提供了用于结构体字段的类型，这些字段可以修改包含它的结构体类型的属性，例如内存布局。

在此版本中，唯一的此类类型是 [`HostLayout`](/pkg/structs#HostLayout)，它表示具有该类型字段的结构体的布局符合宿主平台的期望。HostLayout 应用于那些作为参数传递给宿主 API、作为返回值从宿主 API 返回，或通过传递给/来自宿主 API 的指针访问的类型。如果没有此标记，结构体的布局顺序不受语言规范保证，尽管截至 Go 1.23，宿主平台和语言布局恰好匹配。

### 库的小幅变更 {#minor_library_changes}#### [`archive/tar`](/pkg/archive/tar/)

如果 [`FileInfoHeader`](/pkg/archive/tar#FileInfoHeader) 的参数实现了新的 [`FileInfoNames`](/pkg/archive/tar#FileInfoNames) 接口，那么将使用该接口的方法来设置文件头中的 Uname/Gname。这允许应用程序覆盖依赖于系统的 Uname/Gname 查找。

#### [`crypto/tls`](/pkg/crypto/tls/)

TLS 客户端现在支持加密客户端问候 [规范草案](https://www.ietf.org/archive/id/draft-ietf-tls-esni-18.html)。通过将 [`Config.EncryptedClientHelloConfigList`](/pkg/crypto/tls#Config.EncryptedClientHelloConfigList) 字段设置为正在连接的主机的编码 ECHConfigList，可以启用此功能。

供 QUIC 实现使用的 [`QUICConn`](/pkg/crypto/tls#QUICConn) 类型包含了报告会话恢复状态的新事件，并为 QUIC 层提供了一种向会话票据和会话缓存条目添加数据的方式。

当 [`Config.CipherSuites`](/pkg/crypto/tls#Config.CipherSuites) 为 nil 时，3DES 密码套件已从默认列表中移除。可以通过在 GODEBUG 环境变量中添加 `tls3des=1` 来恢复默认值。

当 [`Config.CurvePreferences`](/pkg/crypto/tls#Config.CurvePreferences) 为 nil 时，实验性的后量子密钥交换机制 X25519Kyber768Draft00 现已默认启用。可以通过在 GODEBUG 环境变量中添加 `tlskyber=0` 来恢复默认值。在处理不能正确处理大型记录的有缺陷的 TLS 服务器时（这会导致握手超时，请参见 [TLS 后量子 TL;DR 失败](https://tldr.fail/)），此选项可能有用。

Go 1.23 更改了 [`X509KeyPair`](/pkg/crypto/tls#X509KeyPair) 和 [`LoadX509KeyPair`](/pkg/crypto/tls#LoadX509KeyPair) 的行为，以填充返回的 [`Certificate`](/pkg/crypto/tls#Certificate) 的 [`Certificate.Leaf`](/pkg/crypto/tls#Certificate.Leaf) 字段。为此行为添加了新的 `x509keypairleaf` [GODEBUG 设置](/doc/godebug)。

#### [`crypto/x509`](/pkg/crypto/x509/)

[`CreateCertificateRequest`](/pkg/crypto/x509#CreateCertificateRequest) 现在正确支持 RSA-PSS 签名算法。

[`CreateCertificateRequest`](/pkg/crypto/x509#CreateCertificateRequest) 和 [`CreateRevocationList`](/pkg/crypto/x509#CreateRevocationList) 现在使用签名者的公钥验证生成的签名。如果签名无效，则返回错误。自 Go 1.16 起，[`CreateCertificate`](/pkg/crypto/x509#CreateCertificate) 就具有此行为。

[`x509sha1` GODEBUG 设置](/pkg/crypto/x509#InsecureAlgorithmError) 将在下一个 Go 主要版本 (Go 1.24) 中移除。这意味着 `crypto/x509` 将不再支持验证使用基于 SHA-1 的签名算法的证书上的签名。

新的 [`ParseOID`](/pkg/crypto/x509#ParseOID) 函数解析点分隔的 ASN.1 对象标识符字符串。[`OID`](/pkg/crypto/x509#OID) 类型现在实现了 [`encoding.BinaryMarshaler`](/pkg/encoding#BinaryMarshaler)、[`encoding.BinaryUnmarshaler`](/pkg/encoding#BinaryUnmarshaler)、[`encoding.TextMarshaler`](/pkg/encoding#TextMarshaler) 和 [`encoding.TextUnmarshaler`](/pkg/encoding#TextUnmarshaler) 接口。

#### [`database/sql`](/pkg/database/sql/)

由 [`driver.Valuer`](/pkg/driver#Valuer) 实现返回的错误现在会被包装，以改进在 [`DB.Query`](/pkg/database/sql#DB.Query)、[`DB.Exec`](/pkg/database/sql#DB.Exec) 和 [`DB.QueryRow`](/pkg/database/sql#DB.QueryRow) 等操作期间的错误处理。

#### [`debug/elf`](/pkg/debug/elf/)

`debug/elf` 包现在定义了 [`PT_OPENBSD_NOBTCFI`](/pkg/debug/elf#PT_OPENBSD_NOBTCFI)。这个 [`ProgType`](/pkg/debug/elf#ProgType) 用于禁用 OpenBSD 二进制文件上的分支跟踪控制流完整性 (BTCFI) 强制执行。

现在定义了符号类型常量 [`STT_RELC`](/pkg/debug/elf#STT_RELC)、[`STT_SRELC`](/pkg/debug/elf#STT_SRELC) 和 [`STT_GNU_IFUNC`](/pkg/debug/elf#STT_GNU_IFUNC)。

#### [`encoding/binary`](/pkg/encoding/binary/)

新的 [`Encode`](/pkg/encoding/binary#Encode) 和 [`Decode`](/pkg/encoding/binary#Decode) 函数是 [`Read`](/pkg/encoding/binary#Read) 和 [`Write`](/pkg/encoding/binary#Write) 的字节切片等价物。[`Append`](/pkg/encoding/binary#Append) 允许将多个数据编组到同一个字节切片中。

#### [`go/ast`](/pkg/go/ast/)

新的 [`Preorder`](/pkg/go/ast#Preorder) 函数返回一个方便的迭代器，用于遍历语法树的所有节点。

#### [`go/types`](/pkg/go/types/)

<!-- 参见 ../../../../2-language.md -->

表示函数或方法符号的 [`Func`](/pkg/go/types#Func) 类型现在有一个 [`Func.Signature`](/pkg/go/types#Func.Signature) 方法，该方法返回函数的类型，该类型始终是一个 `Signature`。

[`Alias`](/pkg/go/types#Alias) 类型现在有一个 [`Rhs`](/pkg/go/types#Rhs) 方法，该方法返回其声明右侧的类型：给定 `type A = B`，A 的 `Rhs` 是 B。 ([#66559](/issue/66559))

添加了 [`Alias.Origin`](/pkg/go/types#Alias.Origin)、[`Alias.SetTypeParams`](/pkg/go/types#Alias.SetTypeParams)、[`Alias.TypeParams`](/pkg/go/types#Alias.TypeParams) 和 [`Alias.TypeArgs`](/pkg/go/types#Alias.TypeArgs) 方法。它们对于泛型别名类型是必需的。

<!-- CL 577715, CL 579076 -->
默认情况下，go/types 现在为类型别名生成 [`Alias`](/pkg/go/types#Alias) 类型节点。此行为可以通过 `GODEBUG` `gotypesalias` 标志控制。其默认值已从 Go 1.22 中的 0 更改为 Go 1.23 中的 1。

#### [`math/rand/v2`](/pkg/math/rand/v2/)

添加了 [`Uint`](/pkg/math/rand/v2#Uint) 函数和 [`Rand.Uint`](/pkg/math/rand/v2#Rand.Uint) 方法。它们在 Go 1.22 中被意外遗漏。

新的 [`ChaCha8.Read`](/pkg/math/rand/v2#ChaCha8.Read) 方法实现了 [`io.Reader`](/pkg/io#Reader) 接口。

#### [`net`](/pkg/net/)新增 [`KeepAliveConfig`](/pkg/net#KeepAliveConfig) 类型，可通过新的 [`TCPConn.SetKeepAliveConfig`](/pkg/net#TCPConn.SetKeepAliveConfig) 方法及 [`Dialer`](/pkg/net#Dialer) 与 [`ListenConfig`](/pkg/net#ListenConfig) 的新字段，对 TCP 连接的保活参数进行精细调控。

[`DNSError`](/pkg/net#DNSError) 类型现可包装因超时或取消操作引发的错误。例如 `errors.Is(someDNSErr, context.DeadlineExceedeed)` 现在能准确报告 DNS 错误是否由超时引起。

新增 `GODEBUG` 设置项 `netedns0=0` 可禁止在 DNS 请求中发送 EDNS0 扩展头部，因其据报告会干扰部分调制解调器的 DNS 服务。

#### [`net/http`](/pkg/net/http/)

[`Cookie`](/pkg/net/http#Cookie) 现保留 cookie 值周围的双引号。新增 [`Cookie.Quoted`](/pkg/net/http#Cookie.Quoted) 字段标识 [`Cookie.Value`](/pkg/net/http#Cookie.Value) 是否原本带有引号。

新增 [`Request.CookiesNamed`](/pkg/net/http#Request.CookiesNamed) 方法可检索所有匹配给定名称的 cookie。

新增 [`Cookie.Partitioned`](/pkg/net/http#Cookie.Partitioned) 字段识别带有 Partitioned 属性的 cookie。

[`ServeMux`](/pkg/net/http#ServeMux) 使用的模式现在允许方法名后有一个或多个空格或制表符。此前仅允许单个空格。

新增 [`ParseCookie`](/pkg/net/http#ParseCookie) 函数解析 Cookie 头部值并返回其中设置的所有 cookie。由于同名 cookie 可多次出现，返回的 Values 可能包含同一键的多个值。

新增 [`ParseSetCookie`](/pkg/net/http#ParseSetCookie) 函数解析 Set-Cookie 头部值并返回一个 cookie，遇到语法错误时返回错误。

[`ServeContent`](/pkg/net/http#ServeContent)、[`ServeFile`](/pkg/net/http#ServeFile) 和 [`ServeFileFS`](/pkg/net/http#ServeFileFS) 在提供错误响应时，现会移除 `Cache-Control`、`Content-Encoding`、`Etag` 和 `Last-Modified` 头部。这些头部通常适用于非错误内容，而非错误文本。

包装 [`ResponseWriter`](/pkg/net/http#ResponseWriter) 并进行实时编码（如 `Content-Encoding: gzip`）的中间件在此更改后将失效。若需恢复 [`ServeContent`](/pkg/net/http#ServeContent)、[`ServeFile`](/pkg/net/http#ServeFile) 和 [`ServeFileFS`](/pkg/net/http#ServeFileFS) 的旧行为，可设置 `GODEBUG=httpservecontentkeepheaders=1`。

请注意，改变响应内容大小（如压缩）的中间件在 [`ServeContent`](/pkg/net/http#ServeContent) 处理 Range 请求时本就无法正常工作。实时压缩应使用 `Transfer-Encoding` 头部而非 `Content-Encoding`。

对于入站请求，新增的 [`Request.Pattern`](/pkg/net/http#Request.Pattern) 字段包含匹配请求的 [`ServeMux`](/pkg/net/http#ServeMux) 模式（若存在）。设置 `GODEBUG=httpmuxgo121=1` 时该字段不会被设置。

#### [`net/http/httptest`](/pkg/net/http/httptest/)

新增 [`NewRequestWithContext`](/pkg/net/http/httptest#NewRequestWithContext) 方法可创建带 [`context.Context`](/pkg/context#Context) 的入站请求。

#### [`net/netip`](/pkg/net/netip/)

在 Go 1.22 及更早版本中，使用 [`reflect.DeepEqual`](/pkg/reflect#DeepEqual) 比较持有 IPv4 地址的 [`Addr`](/pkg/net/netip#Addr) 与持有该地址 IPv4 映射 IPv6 形式的 [`Addr`](/pkg/net/netip#Addr) 时，会错误返回 true（尽管使用 `==` 或 [`Addr.Compare`](/pkg/net/netip#Addr.Compare) 比较时这些 `Addr` 值不同）。此缺陷已修复，三种比较方式现均报告相同结果。

#### [`os`](/pkg/os/)

[`Stat`](/pkg/os#Stat) 函数现为 Windows 上的 Unix 套接字文件设置 [`ModeSocket`](/pkg/os#ModeSocket) 位。这些文件通过将重解析标签设为 `IO_REPARSE_TAG_AF_UNIX` 来标识。

在 Windows 上，[`Lstat`](/pkg/os#Lstat) 和 [`Stat`](/pkg/os#Stat) 为重解析点报告的模式位已更改。挂载点不再设置 [`ModeSymlink`](/pkg/os#ModeSymlink)，非符号链接、Unix 套接字或去重文件的重解析点现始终设置 [`ModeIrregular`](/pkg/os#ModeIrregular)。此行为由 `winsymlink` 设置控制。Go 1.23 中默认为 `winsymlink=1`，此前版本默认为 `winsymlink=0`。

[`CopyFS`](/pkg/os#CopyFS) 函数将 [`io/fs.FS`](/pkg/io/fs#FS) 复制到本地文件系统。

在 Windows 上，[`Readlink`](/pkg/os#Readlink) 不再尝试将卷标准化为盘符（这并非总是可行）。此行为由 `winreadlinkvolume` 设置控制。Go 1.23 中默认为 `winreadlinkvolume=1`，此前版本默认为 `winreadlinkvolume=0`。

<!-- go.dev/issue/62654, CL 570036, CL 570681 -->
在支持 pidfd 的 Linux 系统（通常为 Linux v5.4+）上，[`Process`](/pkg/os#Process) 相关函数和方法内部使用 pidfd（而非 PID），消除了操作系统重用 PID 时可能导致的误定向。pidfd 支持对用户完全透明，仅额外增加进程文件描述符。

#### [`path/filepath`](/pkg/path/filepath/)

新增 [`Localize`](/pkg/path/filepath#Localize) 函数可安全地将斜杠分隔路径转换为操作系统路径。

在 Windows 上，[`EvalSymlinks`](/pkg/path/filepath#EvalSymlinks) 不再评估挂载点（这曾是许多不一致和缺陷的根源）。此行为由 `winsymlink` 设置控制。Go 1.23 中默认为 `winsymlink=1`，此前版本默认为 `winsymlink=0`。在 Windows 上，[`EvalSymlinks`](/pkg/path/filepath#EvalSymlinks) 不再尝试将卷（volume）规范化为驱动器盘符，这在过去有时甚至不可能实现。此行为由 `winreadlinkvolume` 设置控制。Go 1.23 中默认为 `winreadlinkvolume=1`，此前版本默认为 `winreadlinkvolume=0`。

#### [`reflect`](/pkg/reflect/)

以下新增方法与 [`Value`](/pkg/reflect#Value) 中的同名方法功能相同，被添加到 [`Type`](/pkg/reflect#Type) 中：
1. [`Type.OverflowComplex`](/pkg/reflect#Type.OverflowComplex)
2. [`Type.OverflowFloat`](/pkg/reflect#Type.OverflowFloat)
3. [`Type.OverflowInt`](/pkg/reflect#Type.OverflowInt)
4. [`Type.OverflowUint`](/pkg/reflect#Type.OverflowUint)

新增的 [`SliceAt`](/pkg/reflect#SliceAt) 函数类似于 [`NewAt`](/pkg/reflect#NewAt)，但用于切片（slice）。

[`Value.Pointer`](/pkg/reflect#Value.Pointer) 和 [`Value.UnsafePointer`](/pkg/reflect#Value.UnsafePointer) 方法现在支持 [`String`](/pkg/reflect#String) 类型的值。

新增的 [`Value.Seq`](/pkg/reflect#Value.Seq) 和 [`Value.Seq2`](/pkg/reflect#Value.Seq2) 方法返回序列（sequence），这些序列会像在 for/range 循环中使用该值一样进行迭代。
新增的 [`Type.CanSeq`](/pkg/reflect#Type.CanSeq) 和 [`Type.CanSeq2`](/pkg/reflect#Type.CanSeq2) 方法分别报告调用 [`Value.Seq`](/pkg/reflect#Value.Seq) 和 [`Value.Seq2`](/pkg/reflect#Value.Seq2) 是否会成功而不引发恐慌（panic）。

#### [`runtime/debug`](/pkg/runtime/debug/)

[`SetCrashOutput`](/pkg/runtime/debug#SetCrashOutput) 函数允许用户指定一个备选文件，运行时（runtime）会将致命崩溃报告写入该文件。它可用于为所有意外崩溃（而不仅仅是那些在显式使用 `recover` 的 goroutine 中发生的崩溃）构建自动报告机制。

<!-- pacify TestCheckAPIFragments -->

#### [`runtime/pprof`](/pkg/runtime/pprof/)

`alloc`、`mutex`、`block`、`threadcreate` 和 `goroutine` 配置文件的最大栈深度已从 32 帧提高到 128 帧。

#### [`runtime/trace`](/pkg/runtime/trace/)

<!-- go.dev/issue/65319 -->
当程序因未捕获的恐慌（panic）而崩溃时，运行时现在会显式刷新跟踪（trace）数据。这意味着，如果程序在跟踪处于活动状态时崩溃，跟踪文件中将包含更完整的跟踪数据。

#### [`slices`](/pkg/slices/)

<!-- see ../../3-iter.md -->

[`Repeat`](/pkg/slices#Repeat) 函数返回一个新的切片，该切片将提供的切片重复指定的次数。

#### [`sync`](/pkg/sync/)

[`Map.Clear`](/pkg/sync#Map.Clear) 方法会删除所有条目，使 [`Map`](/pkg/sync#Map) 变空。它类似于 `clear` 函数。

#### [`sync/atomic`](/pkg/sync/atomic/)

<!-- Issue #61395 -->
新增的 [`And`](/pkg/sync/atomic#And) 和 [`Or`](/pkg/sync/atomic#Or) 运算符对给定输入应用按位 `AND` 或 `OR` 操作，并返回旧值。

#### [`syscall`](/pkg/syscall/)

`syscall` 包现在在 Windows 上定义了 [`WSAENOPROTOOPT`](/pkg/syscall#WSAENOPROTOOPT)。

[`GetsockoptInt`](/pkg/syscall#GetsockoptInt) 函数现在在 Windows 上受支持。

#### [`testing/fstest`](/pkg/testing/fstest/)

[`TestFS`](/pkg/testing/fstest#TestFS) 现在返回一个结构化的错误，该错误可以被解包（通过 `Unwrap() []error` 方法）。这允许使用 [`errors.Is`](/pkg/errors#Is) 或 [`errors.As`](/pkg/errors#As) 来检查错误。

#### [`text/template`](/pkg/text/template/)

模板现在支持新的 "else with" 操作（action），在某些使用场景中可以降低模板的复杂性。

#### [`time`](/pkg/time/)

如果时区偏移量超出范围，[`Parse`](/pkg/time#Parse) 和 [`ParseInLocation`](/pkg/time#ParseInLocation) 现在会返回一个错误。

在 Windows 上，[`Timer`](/pkg/time#Timer)、[`Ticker`](/pkg/time#Ticker) 以及会使 goroutine 进入睡眠的函数（例如 [`Sleep`](/pkg/time#Sleep)）的时间分辨率已从 15.6ms 提高到 0.5ms。

#### [`unicode/utf16`](/pkg/unicode/utf16/)

[`RuneLen`](/pkg/unicode/utf16#RuneLen) 函数返回该符文（rune）的 UTF-16 编码中包含的 16 位字（word）的数量。如果该符文不是有效的 UTF-16 编码值，则返回 -1。

## 平台（Ports） {#ports}

### Darwin {#darwin}

<!-- go.dev/issue/64207 -->
正如 Go 1.22 发布说明中所[宣布](go1.22#darwin)的那样，Go 1.23 要求 macOS 11 Big Sur 或更高版本；对之前版本的支持已终止。

### Linux {#linux}

<!-- go.dev/issue/67001 -->
Go 1.23 是最后一个要求 Linux 内核版本 2.6.32 或更高版本的版本。Go 1.24 将要求 Linux 内核版本 3.2 或更高版本。

### OpenBSD {#openbsd}

<!-- go.dev/issue/55999, CL 518629, CL 518630 -->
Go 1.23 为运行在 64 位 RISC-V 架构上的 OpenBSD 添加了实验性支持（`GOOS=openbsd`，`GOARCH=riscv64`）。

### ARM64 {#arm64}

<!-- go.dev/issue/60905, CL 559555 -->
Go 1.23 引入了一个新的 `GOARM64` 环境变量，用于在编译时指定 ARM64 架构的最低目标版本。允许的值为 `v8.{0-9}` 和 `v9.{0-5}`。其后可以跟随一个选项，指定目标硬件实现的扩展。有效的选项是 `,lse` 和 `,crypto`。

`GOARM64` 环境变量默认为 `v8.0`。

### RISC-V {#riscv}

<!-- go.dev/issue/61476, CL 541135 -->
Go 1.23 引入了一个新的 `GORISCV64` 环境变量，用于选择为其编译的 [RISC-V 用户模式应用程序配置文件](https://github.com/riscv/riscv-profiles/blob/main/src/profiles.adoc)。允许的值是 `rva20u64` 和 `rva22u64`。

`GORISCV64` 环境变量默认为 `rva20u64`。

### Wasm {#wasm}

<!-- go.dev/issue/63718 -->
`GOROOT/misc/wasm` 目录中的 `go_wasip1_wasm_exec` 脚本已停止支持低于 14.0.0 版本的 `wasmtime`。

<!-- These items need to be completed and moved to an appropriate location in the release notes. -->

<!-- These items need to be reviewed, and mentioned in the Go 1.23 release notes if applicable. -->当前暂无内容；后续可能会有补充。
-->

<!-- 也许应该记录？也许不应该？需要熟悉该变更的人员来判断。

CL 359594（"x/website/_content/ref/mod：记录无点模块路径"）- 解决了 go.dev/issue/32819（"cmd/go：记录没有点号的模块名是保留的"），并提及了已接受的提案 go.dev/issue/37641
CL 555075（"x/tools/go/ssa：支持 range-over-func"）- x/tools 的 CL 实现了 x/tools/go/ssa 对 range-over-func 的支持，对应已接受的提案 https://go.dev/issue/66601；这个特定的提案和变更似乎不需要在 Go 1.23 发布说明中专门提及，但更熟悉情况的人员应再次确认
-->

<!-- 不需要在 Go 1.23 发布说明中提及，但被 relnote 待办事项列表收集的项目。

CL 458895 - x/playground 的一个修复，该修复在 Go 1.16 里程碑中提及了一个已接受的 cmd/go 提案 go.dev/issue/40728...
CL 582097 - x/build 的一个 CL，用于改进 relnote 本身；不需要发布说明
CL 561935 - crypto 的一个 CL，使用了 purego 标签，并提及了已接受但未实现的提案 https://go.dev/issue/23172 以记录 purego 标签；不需要发布说明
CL 568340 - 修复了 time.Ticker.Reset 中的一个伪竞态条件（通过已接受的提案 https://go.dev/issue/33184 添加），似乎不需要发布说明
CL 562619 - x/website 的一个 CL，在 go.dev 上记录了最低引导版本，提及了已接受的提案 go.dev/issue/54265 和 go.dev/issue/44505；不需要发布说明
CL 557055 - x/tools 的一个 CL，为 x/tools/go/ssa 实现了已接受的提案 https://go.dev/issue/46941
CL 564275 - x/tools 的一个 CL，为已接受的提案 https://go.dev/issue/51473 做准备而更新了测试数据；该提案在 Go 1.23 中未实现，因此不需要发布说明
CL 572535 - 在更多地方使用了 "unix" 构建标签，提及了已接受的提案 https://go.dev/issue/51572；不需要发布说明
CL 555255 - x/tools 的一个 CL，为 x/tools/go/cfg 实现了已接受的提案 https://go.dev/issue/53367
CL 585216 - x/build 的一个 CL 提及了已接受的提案 https://go.dev/issue/56001，因为它修复了一个导致该新至 Go 1.22 的平台没有产生下载的错误；这与 Go 1.23 发布说明无关
CL 481062 - 为已接受的提案 https://go.dev/issue/56102 添加了示例；不需要发布说明
CL 497195 - x/net 的一个 CL，为 x/net/http2 中已接受的提案 https://go.dev/issue/57893 添加了 4 个字段之一；似乎与 net/http 无关，因此不需要 Go 1.23 发布说明
CL 463097, CL 568198 - x/net 的两个 CL，为 x/net/websocket 实现了已接受的提案 https://go.dev/issue/57953；不需要发布说明
多个 x/net 的 CL - 针对已接受的提案 https://go.dev/issue/58547 进行的工作，将 QUIC 实现添加到 x/net/quic
CL 514775 - 为已接受的提案 https://go.dev/issue/59488 实现了一个性能优化
CL 484995 - x/sys 的一个 CL，实现了已接受的提案 https://go.dev/issue/59537，以添加 x/sys/unix API
CL 555597 - 针对非接口类型优化了 TypeFor（在已接受的提案 https://go.dev/issue/60088 中添加）；似乎不需要发布说明
几个 x/tools 的 CL 根据已接受的提案 https://go.dev/issue/60951 废弃并删除了实验性的 golang.org/x/tools/cmd/getgo 工具；这是一个未发布的变更，不属于 Go 1.23 发布说明的范围
多个 x/vuln 的 CL，用于在 govulncheck 中实现已接受的提案 https://go.dev/issue/61347（"x/vuln：将 govulncheck 输出转换为 sarif 格式"）
CL 516355 - x/crypto 的一个 CL，为 x/crypto/ssh 实现了已接受的提案 https://go.dev/issue/61447；不需要 Go 1.23 发布说明
CL 559799 - 一个编辑 Go 1.22 发布说明的 CL 提及了一个 Go 1.22 的已接受提案 https://go.dev/issue/62039，时间在 Go 1.23 开发开始后不久
CL 581555 - x/tools 的一个 CL 提及了 x/tools/go/analysis 的已接受提案 https://go.dev/issue/62292；不需要 Go 1.23 发布说明
CL 578355 - 提及了添加 GOARCH=wasm32 的已接受提案 https://go.dev/issue/63131，但该提案在 Go 1.23 中未实现，因此不需要发布说明
CL 543335 - x/exp 的一个 CL，将 slices 包行为的一个变更（已接受的提案 https://go.dev/issue/63393）回移植到了 x/exp/slices；不需要 Go 1.23 发布说明
CL 556820 - x/tools 的一个 CL，为 x/tools/go/analysis 实现了已接受的提案 https://go.dev/issue/64548
CL 557056 - x/tools 的一个 CL，为 x/tools/go/packages 实现了已接受的提案 https://go.dev/issue/64608
CL 558695 - x/crypto 的一个 CL，为 x/crypto/ssh 致力于已接受的提案 https://go.dev/issue/64962
CL 572016 - x/tools 的一个 CL，为 x/tools/go/cfg 实现了已接受的提案 https://go.dev/issue/65754
几个 x/tools 的 CL 根据已接受的提案 https://go.dev/issue/65880 标记并删除了 golang.org/x/tools/cmd/guru 命令；这是一个未发布的变更，不属于 Go 1.23 发布说明的范围
CL 580076 - 看似是 cmd/go 的一个内部变更，用于为已接受的提案 https://go.dev/issue/66315 传播模块信息；似乎不需要发布说明
CL 529816 - "tests" vet 检查最初根据已接受的提案 https://go.dev/issue/44251 添加到 "go test" 套件中，但该变更已在 CL 571695 中回滚，截至 2024-05-23 尚未重新引入；目前 Go 1.23 发布说明中无需为其记录任何内容
CL 564035 - 更改了 encoding/xml，但该变更破坏性太大，已在 CL 570175 中回滚，并重新打开了跟踪 issue go.dev/issue/65691；Go 1.23 发布说明中无需为其记录任何内容
CL 587855 - 展示了已接受的提案 https://go.dev/issue/60529 的益处；实际的变更并未发生在 Go 1.23 中，因此不需要发布说明
CL 526875 - x/crypto 的一个 CL，为 x/crypto/ssh 实现了已接受的提案 https://go.dev/issue/62518
-->