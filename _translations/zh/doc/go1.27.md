---
title: Go 1.27 版本发布说明
template: false
---

<style>
  main ul li { margin: 0.5em 0; }
</style>

## 草稿版本发布说明 — Go 1.27 简介 {#introduction}

**Go 1.27 尚未正式发布。以下为正在编写中的发布说明。
Go 1.27 预计将于 2026 年 8 月发布。**

## 语言变更 {#language}

<!-- go.dev/issue/77273 -->

Go 1.27 现在支持[泛型方法](/issue/77273)：
[方法声明](/ref/spec#Method_declarations)现在可以声明自己的[类型参数](/ref/spec#Type_parameter_declarations)。
这项广受期待的变更允许在特定数据类型的命名空间内添加泛型函数，而此前此类函数的声明作用域只能是整个包。
请注意，[接口](/ref/spec#Interface_types)的方法不能声明类型参数，接口方法也不能通过泛型方法来实现。

<!-- go.dev/issue/9859 -->

[结构体字面量](/ref/spec#Composite_literals)中的键现在可以是该结构体类型的任何有效[字段选择器](/issue/9859)，而不仅仅是结构体的（顶层）字段名。

<!-- go.dev/issue/77245 -->

函数类型推断已得到[泛化](/issue/77245)，现在适用于所有将泛型函数[赋值](/ref/spec#Assignability)给一个（匹配的）函数类型的变量（或转换为该类型）的上下文。

## 工具 {#tools}

<!-- go.dev/issue/77177 -->

现在为 `compile`、`link`、`asm`、`cgo`、`cover` 和 `pack` 工具提供了响应文件（`@file`）解析支持。
响应文件包含以空白分隔的参数，并支持单引号和双引号字符串、转义序列以及反斜杠换行续行。
该格式与 GCC 的响应文件实现兼容，以确保与现有构建系统的互操作性。

### Go 命令 {#go-command}

<!-- go.dev/issue/78090 -->

`go` 命令已不再支持 `bzr` 版本控制系统。
它将无法再直接获取托管在 `bzr` 服务器上的模块。

#### `GODEBUG`

<!-- go.dev/issue/79422 -->

从 Go 1.27 开始，`go` 命令现在能够识别那些支持已被移除（例如 `asynctimerchan`，见[下文](#runtime)）的 `GODEBUG` 设置，即使它们出现在 `go.mod` 文件（`godebug` 条目）和 `.go` 源文件（`//go:debug` 注释）中。
如果这些设置的值是其被移除前确定的最终默认值，`go` 命令将接受它们。
如果它们被设置为旧值，`go` 命令将失败。
此变更遵循 [Go 1 兼容性保证](/doc/go1compat)的精神，并允许那些设置了受支持 `GODEBUG` 设置的现有程序，在相应设置支持被移除后，仍能无需更改地继续构建和运行。

#### `go test`

`go test` 现在默认调用 `stdversion` vet 检查。
该检查会报告使用了对于引用文件当前生效的 Go 版本来说过新的标准库符号。
当前版本由 `go.mod` 中的 `go` 指令和文件上的构建标签决定。

<!-- go.dev/issue/62728 -->

`go test -json` 现在会为 `"Action":"output"` 行添加一个可选的新字段 `"OutputType"`，用于指定输出类型。
目前，可能的值包括 "error"、"error-continue" 和 "frame"。
详情请参见 [cmd/test2json 帮助](/cmd/test2json#hdr-Output_Format)。

#### `go doc`

<!-- go.dev/issue/63696 -->

`go doc` 命令现在支持 `package@version` 语法，例如 `go doc example.com/pkg@v1.2.3`。

<!-- go.dev/issue/26715 -->

`go doc` 命令现在接受 `-ex` 命令行选项，用于列出给定包或符号的可执行示例。
当在命令行传递示例名称时（例如 `go doc bytes.ExampleBuffer`），`go doc` 现在会连同注释一起打印示例源代码。

#### `go fix`

`go fix` 命令包含几个新的现代化器（`atomictypes`、`embedlit`、`slicesbackward` 和 `unsafefuncs`）。

<!-- go.dev/issue/77581 -->

现有的 `fmtappendf` 分析器因风格问题被移除。

现有的 `waitgroup` 分析器被重命名为 `waitgroupgo` 以避免歧义。

#### `go mod tidy`

<!-- go.dev/issue/56471 -->

对于在其 `go.mod` 文件中指定 `go 1.27` 或更高版本的模块，`go mod tidy` 现在会自动合并重复的 require 块。这确保文件保持一个干净、标准的结构，最多只包含两个 require 块：一个用于直接依赖，一个用于间接依赖。

在此合并过程中，现有的附着于依赖项的注释块会被保留。如果一个注释块关联了一组混合指令（同时包含直接和间接依赖），则该注释块会被合并并附着到新的直接依赖块。

此前，如果一个 `go.mod` 文件累积了多个不连续的 require 块（通常由于手动编辑、未解决的 Git 合并冲突或遗留的升级操作），`go mod tidy` 会保留这些额外的块或无意中创建新的块。该工具现在严格执行两块布局，将分散的要求合并到各自的块中，并自动清理模块文件的结构。

### Trace

<!-- go.dev/issue/78921 -->

`go tool trace` 的 `-http` 命令行选项现在在仅传递端口时（例如 `-http=:6060`），会将监听地址限制为 localhost。
此变更使 `go tool trace` 的行为与 `go tool pprof` 的 `-http` 标志保持一致。
若要监听所有地址，请显式包含指定的地址（例如 `-http=0.0.0.0:6060`）。

## 运行时 {#runtime}

<!-- CL 742580 -->为配置了 Go 1.27 或更高版本 `go` 指令的模块提供的 Traceback，现在会在头部行中包含 [`runtime/pprof`](https://pkg.go.dev/runtime/pprof) 的 goroutine 标签。可以通过 `tracebacklabels=0` 的 `GODEBUG` 设置（在 [Go 1.26](/doc/godebug#go-126) 中新增）禁用此行为。此禁用选项预计将无限期保留，以防 goroutine 标签获取了不应在 Traceback 中提供的敏感信息。

<!-- CL 781580 -->

`asynctimerchan` `GODEBUG` 设置（在 [Go 1.23](/doc/godebug#go-123) 中新增）已被永久移除。无论 `GODEBUG` 设置如何，[time](https://pkg.go.dev/time) 包创建的 channel 现在始终是无缓冲的（同步的）。

### 更快的内存分配

<!-- go.dev.issue/79286 -->

编译器现在会生成对特定大小专用内存分配例程的调用，从而将部分小（<80 字节）内存分配的开销降低高达 30%。
改进程度因工作负载而异，但在实际分配密集型程序中，整体预期改进约为 ~1%。
这会导致二进制体积增大约 60 KB（与工作负载无关）。
如果您发现任何性能回退，请[提交 issue](/issue/new)。
您可以在构建时设置 `GOEXPERIMENT=nosizespecializedmalloc` 来禁用它。
此禁用设置预计将在 Go 1.28 中移除。

### Goroutine 泄漏性能分析文件 {#goroutineleak-profiles}

<!-- go.dev/issue/74609 -->

一种报告泄漏 goroutine 的新性能分析文件类型，之前在 [Go 1.26](/doc/go1.26#goroutineleak-profiles) 中作为实验性功能提供，现已正式可用。
这种名为 `goroutineleak` 的新性能分析文件类型在 [`runtime/pprof`](/pkg/runtime/pprof) 包中受支持。
它也作为 [`net/http/pprof`](/pkg/net/http/pprof) 的端点 `/debug/pprof/goroutineleak` 可用。

一个*泄漏的* goroutine 是指一个阻塞在某个并发原语（channel、[`sync.Mutex`](/pkg/sync#Mutex)、[`sync.Cond`](/pkg/sync#Cond) 等）上，并且不可能解除阻塞的 goroutine。
运行时使用垃圾回收器检测泄漏的 goroutine：如果一个 goroutine G 阻塞在并发原语 P 上，并且 P 无法从任何可运行的 goroutine 或任何*那些* goroutine 可以解除阻塞的 goroutine 访问到，那么 P 就无法解除阻塞，因此 goroutine G 永远不会被唤醒。
虽然无法检测所有永久阻塞的 goroutine，但这种方法可以检测到很大一类此类泄漏。

由于这种技术建立在可达性分析之上，运行时可能无法识别那些通过全局变量或可运行 goroutine 的局部变量可访问的并发原语导致的阻塞泄漏。

参见 [Go 1.26 发布说明](/doc/go1.26#goroutineleak-profiles)中的示例。

特别感谢 Uber 的 Vlad Saioc 贡献了这项工作。

`goroutineleakprofile` `GOEXPERIMENT` 设置现已被删除。

## 编译器 {#compiler}

编译器现在针对包含指令的文件的目录解析 `//line` 或 `/*line*/` 指令中的相对文件名，这与 [`go/scanner`](/pkg/go/scanner) 的行为一致。
绝对文件名不受影响。
参见 [#70478](/issue/70478)。

<!-- go.dev/issue/60324, CL 770200 -->

编译器现在为函数字面量（闭包）生成更简单的名称。
此前，当包含函数被内联时，函数字面量的名称可能会变得相当长。
现在，无论是否内联，编译器都会为函数字面量选择相同的名称。
它还可以将相同的函数字面量的多个实例（当其包含函数被内联时）合并，以便在编译后的二进制文件中共享相同的代码。
此更改不影响 Go 代码的功能。
检查符号名称的测试可能需要更新，尽管建议不要依赖函数字面量的名称。
对于[错误地](/pkg/reflect#Value.Pointer)比较函数代码指针以判断相等性的程序，在 Go 1.27 中，此问题可能更加突出，因为具有不同捕获闭包数据的函数字面量在更多情况下可能拥有相等的代码指针。

## 链接器 {#linker}

<!-- CL 751260, go.dev/issue/58722 -->

当目标平台为 macOS 时，链接器现在接受 `-macos` 和 `-macsdk` 命令行选项，用于在 `LC_BUILD_VERSION` 加载命令中指定操作系统和 SDK 版本。
默认情况下，它会选择支持的最旧的 macOS 版本（当前为 [13.0.0](#darwin)）和一个较新的 SDK 版本（当前为 26.2.0）。

## 标准库 {#library}

### 新增 encoding/json/v2 和 encoding/json/jsontext 包 {#jsonv2}

<!-- go.dev/issue/71497 -->

现在可用两个新包：

  - [`encoding/json/v2`](/pkg/encoding/json/v2) 包是 [`encoding/json`](/pkg/encoding/json) 的一个主要修订版。它提供了 [`Marshal`](/pkg/encoding/json/v2#Marshal)、[`MarshalWrite`](/pkg/encoding/json/v2#MarshalWrite)、[`MarshalEncode`](/pkg/encoding/json/v2#MarshalEncode)、[`Unmarshal`](/pkg/encoding/json/v2#Unmarshal)、[`UnmarshalRead`](/pkg/encoding/json/v2#UnmarshalRead) 和 [`UnmarshalDecode`](/pkg/encoding/json/v2#UnmarshalDecode) 函数，这些函数都接受可变参数 [`Options`](/pkg/encoding/json/v2#Options) 来配置编组和解组行为。

  - [`encoding/json/jsontext`](/pkg/encoding/json/jsontext) 包提供更底层的 JSON 语法处理。
    [`Encoder`](/pkg/encoding/json/jsontext#Encoder) 和 [`Decoder`](/pkg/encoding/json/jsontext#Decoder) 类型将 JSON 视为一系列 [`Token`](/pkg/encoding/json/jsontext#Token) 和 [`Value`](/pkg/encoding/json/jsontext#Value) 进行操作，维护一个状态机以确保生成或消费的序列是有效的 JSON 文本。v2 版本的包选择了比 v1 更严格、更具互操作性的默认设置：它会拒绝 JSON 字符串中无效的 UTF-8 序列，并拒绝 JSON 对象内的重复名称。关于完整的行为差异集以及可调整这些行为的可用选项，请参阅 v1 版本的 [`encoding/json`](/pkg/encoding/json#hdr-Migrating_to_v2) 包文档。

目前 [`encoding/json`](/pkg/encoding/json) 包由 v2 实现提供支持。其序列化和反序列化行为得以保留，但错误消息的确切文本可能有所不同。该包还新增了一些 [`Options`](/pkg/encoding/json#Options) 配置项，可以将 v2 配置为按 v1 语义运行，从而避免强制要求完全迁移到新 API。v1 API 将继续得到支持，用户无需强制迁移。

序列化性能与之前的实现大致相当，而反序列化性能则显著提升。

如果用户在新实现中遇到兼容性问题，可以在构建时通过设置 `GOEXPERIMENT=nojsonv2` 来禁用它，从而恢复原始的 v1 实现。预计此禁用选项将在未来版本中移除。

相关背景和更多详情，请参见[提案 issue](/issue/71497)。如果您需要禁用新实现，[请提交一个 issue](/issue/new)。

### 新增的 crypto/mldsa 包 {#crypto_mldsa}

<!-- https://go.dev/issue/77626, https://go.dev/issue/78888 -->

新增的 [`crypto/mldsa`](/pkg/crypto/mldsa) 包实现了 FIPS 204 规范中定义的后量子 ML-DSA 签名方案。

[`crypto/x509`](/pkg/crypto/x509) 现已支持 ML-DSA 私钥、公钥和签名。

[`crypto/tls`](/pkg/crypto/tls) 现已支持 TLS 1.3 中的 ML-DSA 签名，新增了 [`MLDSA44`](/pkg/crypto/tls#MLDSA44)、[`MLDSA65`](/pkg/crypto/tls#MLDSA65) 和 [`MLDSA87`](/pkg/crypto/tls#MLDSA87) 等 [`SignatureScheme`](/pkg/crypto/tls#SignatureScheme) 值。

### 新增的 uuid 包 {#uuid}

<!-- https://go.dev/issue/62026 -->

新增的 [`uuid`](/pkg/uuid) 包用于生成和解析 UUID。

### 新增的实验性 simd 包 {#simd}

Go 1.27 引入了一个新的实验性 [`simd`](/pkg/simd) 包，该包提供了可移植且与向量大小无关的 SIMD 支持。如果硬件指令可用，它将加以利用。
此包需要在构建时通过设置环境变量 `GOEXPERIMENT=simd` 来启用。

`simd` 包适用于所有架构，并提供未指定大小的向量类型，如 [`Int8s`](/pkg/simd#Int8s) 和 [`Float32s`](/pkg/simd#Float32s)。它支持 [`simd/archsimd`](/pkg/simd/archsimd) 包中操作的一个“可扩展”子集，这些操作在硬件上得到支持或在不同架构和向量宽度间易于模拟。

更多详情请参见[提案 issue](/issue/78902)。

### 实验性 simd/archsimd 包 {#archsimd}

Go 1.27 继续了在 [`simd/archsimd`](/pkg/simd/archsimd/) 包中对 SIMD 操作的实验性支持，此支持始于 [Go 1.26](/doc/go1.26#simd)。本版本修订了 amd64 API，并增加了对 arm64 "Neon" 128 位 SIMD 和 WebAssembly 128 位 SIMD 的支持。`simd/archsimd` 包需要在构建时通过设置环境变量 `GOEXPERIMENT=simd` 来启用。

该包提供了访问特定于架构的 SIMD 操作的能力。它支持 wasm、arm64 和 amd64 上的 128 位向量类型，并在某些 amd64 处理器上支持 256 位和 512 位向量类型。其 API 尚未被视为稳定。

更多详情请参见[包文档](/pkg/simd/archsimd)和[提案 issue](/issue/73787)。

我们计划在未来版本中增加对更多架构的支持，但该 API 本质上是特定于架构的，因此不具有可移植性。

### 库的微小改动 {#minor_library_changes}

#### [`bytes`](/pkg/bytes/)

<!-- 6-stdlib/99-minor/bytes/71151.md -->

新增的 [`CutLast`](/pkg/bytes#CutLast) 函数可以在 `[]byte` 中围绕分隔符的最后一次出现进行切片。它可以替代并简化 [`LastIndex`](/pkg/bytes#LastIndex) 的一些常见用法。

#### [`compress/flate`](/pkg/compress/flate/)

<!-- go.dev/issue/75532, CL 707355 -->

Go 1.27 改进了压缩速度。由于编码器实现的变化，[`Writer`](/pkg/compress/flate#Writer) 的精确编码输出可能与 Go 1.26 不同。由于 DEFLATE 是 [`archive/zip`](/pkg/archive/zip)、[`compress/gzip`](/pkg/compress/gzip)、[`compress/zlib`](/pkg/compress/zlib) 和 [`image/png`](/pkg/image/png) 使用的基础压缩算法，这些包的输出也可能已发生变化。

#### [`crypto`](/pkg/crypto/)

<!-- 6-stdlib/99-minor/crypto/77626.md -->

新增了 [`MLDSAMu`](/pkg/crypto#MLDSAMu) [`Hash`](/pkg/crypto#Hash) 值，用作外部 μ ML-DSA 签名的信号机制。

#### [`crypto/ecdsa`](/pkg/crypto/ecdsa/)

<!-- 6-stdlib/99-minor/crypto/ecdsa/hashlen.md -->

如果提供了非空的 [`SignerOpts`](/pkg/crypto#SignerOpts)，[`PrivateKey.Sign`](/pkg/crypto/ecdsa#PrivateKey.Sign) 现在会检查哈希长度是否正确。

#### [`crypto/tls`](/pkg/crypto/tls/)

<!-- 6-stdlib/99-minor/crypto/tls/77363.md -->

新增的 [`QUICConfig.ClientHelloInfoConn`](/pkg/crypto/tls#QUICConfig.ClientHelloInfoConn) 字段指定了在 QUIC 服务器握手期间用于 [`ClientHelloInfo.Conn`](/pkg/crypto/tls#ClientHelloInfo.Conn) 字段的 [`net.Conn`](/pkg/net#Conn)。

<!-- 6-stdlib/99-minor/crypto/tls/78543.md -->

现已支持 [`MLKEM1024`](/pkg/crypto/tls#MLKEM1024) 密钥交换。可以通过将其添加到 [`Config.CurvePreferences`](/pkg/crypto/tls#Config.CurvePreferences) 中来启用它。

<!-- 6-stdlib/99-minor/crypto/tls/78888.md -->
<!-- crypto/tls 对 ML-DSA 的支持记录在 doc/next/6-stdlib/70-mldsa.md 中。 -->

<!-- 6-stdlib/99-minor/crypto/tls/79367.md -->[`Config.Rand`](/pkg/crypto/tls#Config.Rand) 现已被弃用。
对于确定性测试，请使用 [`testing/cryptotest.SetGlobalRandom`](/pkg/testing/cryptotest#SetGlobalRandom)。

<!-- 6-stdlib/99-minor/crypto/tls/tlsmlkem.md -->

即使使用了 `tlsmlkem=0` 或 `tlssecpmlkem=0` `GODEBUG` 选项，现在也可以在 [`Config.CurvePreferences`](/pkg/crypto/tls#Config.CurvePreferences) 中显式启用后量子混合密钥交换。这些选项最初的设计意图仅适用于 [`Config.CurvePreferences`](/pkg/crypto/tls#Config.CurvePreferences) 为 nil 时使用的默认集合。

<!-- go.dev/issue/24673 -->

新增的 [`ConnectionState.LocalCertificate`](/pkg/crypto/tls#ConnectionState.LocalCertificate) 字段包含了握手期间向连接对端展示的证书链。

<!-- go.dev/issue/75316 -->

`tlsunsafeekm`（在 [Go 1.22](/doc/godebug#go-122) 中添加）、
`tlsrsakex`（在 [Go 1.22](/doc/godebug#go-122) 中添加）、
`tls3des`（在 [Go 1.23](/doc/godebug#go-123) 中添加）、
`tls10server`（在 [Go 1.22](/doc/godebug#go-122) 中添加）以及
`x509keypairleaf`（在 [Go 1.23](/doc/godebug#go-123) 中添加）
`GODEBUG` 设置已被永久移除。

#### [`crypto/x509`](/pkg/crypto/x509/)

<!-- 6-stdlib/99-minor/crypto/x509/75260.md -->

解析到 [`pkix.Name`](/pkg/crypto/x509/pkix#Name) 字段时，现在支持更广泛的 [`pkix.AttributeTypeAndValue.Value`](/pkg/crypto/x509/pkix#AttributeTypeAndValue.Value) 类型，未知类型将被解析为 [`asn1.RawValue`](/pkg/encoding/asn1#RawValue)。

<!-- 6-stdlib/99-minor/crypto/x509/76133.md -->

新增的 [`Certificate.RawSignatureAlgorithm`](/pkg/crypto/x509#Certificate.RawSignatureAlgorithm)、[`CertificateRequest.RawSignatureAlgorithm`](/pkg/crypto/x509#CertificateRequest.RawSignatureAlgorithm) 和 [`RevocationList.RawSignatureAlgorithm`](/pkg/crypto/x509#RevocationList.RawSignatureAlgorithm) 字段暴露了签名算法的 DER 编码的 AlgorithmIdentifier，包括当 SignatureAlgorithm 字段为 [`UnknownSignatureAlgorithm`](/pkg/crypto/x509#UnknownSignatureAlgorithm) 的情况。

<!-- 6-stdlib/99-minor/crypto/x509/77865.md -->

[`SystemCertPool`](/pkg/crypto/x509#SystemCertPool) 现在在 Windows 和 Darwin 系统上会遵守 SSL_CERT_FILE 和 SSL_CERT_DIR 环境变量。设置这些环境变量后，根证书将从磁盘加载，并使用原生 Go 验证器而非平台证书验证 API。此行为可通过 `GODEBUG=x509sslcertoverrideplatform=0` 禁用。

<!-- 6-stdlib/99-minor/crypto/x509/78888.md -->
<!-- crypto/x509 对 ML-DSA 的支持记录在 doc/next/6-stdlib/70-mldsa.md 中。 -->

#### [`crypto/x509/pkix`](/pkg/crypto/x509/pkix/)

<!-- 6-stdlib/99-minor/crypto/x509/pkix/33093.md -->

[`RDNSequence.String`](/pkg/crypto/x509/pkix#RDNSequence.String)（以及因此 [`Name.String`](/pkg/crypto/x509/pkix#Name.String)）现在即使在属性的 OID 无法识别时，也会将字符串类型的属性值渲染为字符串。之前，此类值总是以其 DER 形式进行十六进制编码。参见 [#33093](/issue/33093)。

#### [`database/sql`](/pkg/database/sql/)

<!-- 6-stdlib/99-minor/database/sql/67546.md -->

新增的 [`ConvertAssign`](/pkg/database/sql#ConvertAssign) 函数使数据库驱动能够访问 [`Rows.Scan`](/pkg/database/sql#Rows.Scan) 执行的类型转换。

#### [`database/sql/driver`](/pkg/database/sql/driver/)

<!-- 6-stdlib/99-minor/database/sql/driver/67546.md -->

驱动可以实现新的 [`RowsColumnScanner`](/pkg/database/sql/driver#RowsColumnScanner) 接口，以直接扫描到用户提供的目标地址。

#### [`go/constant`](/pkg/go/constant/)

<!-- 6-stdlib/99-minor/go/constant/79042.md -->

新增的 [`StringLen`](/pkg/go/constant#StringLen) 函数返回字符串 [`Value`](/pkg/go/constant#Value) 的长度，无需完全构造该 `Value`。

#### [`go/scanner`](/pkg/go/scanner/)

<!-- 6-stdlib/99-minor/go/scanner/74958.md -->

词法分析器现在允许通过新的 [`Scanner.End`](/pkg/go/scanner#Scanner.End) 方法检索词素的结束位置。

#### [`go/token`](/pkg/go/token/)

<!-- 6-stdlib/99-minor/go/token/76285.md -->

[`File`](/pkg/go/token#File) 现在具有 `String` 方法。

#### [`go/types`](/pkg/go/types/)

<!-- 6-stdlib/99-minor/go/types/69420.md -->

[`Hasher`](/pkg/go/types#Hasher) 类型是 [`maphash.Hasher`](/pkg/maphash#Hasher) 针对 [`Type`](/pkg/go/types#Type) 的一种实现，它遵循 [`Identical`](/pkg/go/types#Identical) 等价关系，允许 `Types` 用于哈希表及类似数据结构。
[`HasherIgnoreTags`](/pkg/go/types#HasherIgnoreTags) 是针对 [`IdenticalIgnoreTags`](/pkg/go/types#IdenticalIgnoreTags) 的类似哈希器。

<!-- 6-stdlib/99-minor/go/types/76472.md -->
<!-- CL 736441 -->

`gotypesalias` `GODEBUG` 设置（在 [Go 1.22](/doc/godebug#go-122) 中添加）已被永久移除，并且 [`go/types`](/pkg/go/types) 包现在始终为[别名声明](/ref/spec#Alias_declarations)生成 [`Alias`](/pkg/go/types#Alias) 类型节点，无论 `GODEBUG` 设置如何。

<!-- 6-stdlib/99-minor/go/types/79287.md -->
<!-- 除了某些 String 方法外，此处无其他内容 -->

#### [`hash/maphash`](/pkg/hash/maphash/)

<!-- 6-stdlib/99-minor/hash/maphash/70471.md -->

[`Hasher`](/pkg/hash/maphash#Hasher) 接口类型定义了特定类型的值与未来基于哈希的数据结构（如哈希表和布隆过滤器）之间的契约；参见 [#70471](/issue/70471)。

[`ComparableHasher`](/pkg/hash/maphash#ComparableHasher) 类型为可比较类型提供了 [`Hasher`](/pkg/hash/maphash#Hasher) 的一个便捷实现，其中 `Equal` 方法定义为 `==`。

#### [`math/big`](/pkg/math/big/)

<!-- 6-stdlib/99-minor/math/big/76821.md -->
<!-- go.dev/issue/76821 -->[`Int`](/pkg/math/big#Int) 现在新增了 [`Divide`](/pkg/math/big#Int.Divide) 方法，用于计算两个 [`Int`](/pkg/math/big#Int) 值的商和余数。该方法支持舍入模式 [`Trunc`](/pkg/math/big#Trunc)、[`Floor`](/pkg/math/big#Floor)、[`Round`](/pkg/math/big#Round) 和 [`Ceil`](/pkg/math/big#Ceil)。

#### [`math/rand/v2`](/pkg/math/rand/v2/)

<!-- 6-stdlib/99-minor/math/rand/v2/77853.md -->

[`Rand`](/pkg/math/rand/v2#Rand) 现在支持泛型方法 [`N`](/pkg/math/rand/v2#Rand.N)，其行为与顶层 [`N`](/pkg/math/rand/v2#N) 函数一致。

#### [`net`](/pkg/net/)

<!-- 6-stdlib/99-minor/net/78137.md -->

[`UnixConn`](/pkg/net#UnixConn) 的读取方法现在当底层读取返回 EOF 时，会直接返回 [`io.EOF`](/pkg/io#EOF)，而不再将其包装在 [`net.OpError`](/pkg/net#OpError) 中。

#### [`net/http`](/pkg/net/http/)

<!-- 6-stdlib/99-minor/net/http/21753.md -->

[`Transport`](/pkg/net/http#Transport) 和 [`Server`](/pkg/net/http#Server) 现在支持在用户提供的、实现了 `ConnectionState() tls.ConnectionState` 方法的 [`net.Conn`](/pkg/net#Conn) 连接上进行 TLS ALPN 协议协商。

<!-- 6-stdlib/99-minor/net/http/75500.md -->

HTTP/2 服务器现在接受客户端优先级信号（依据 RFC 9218 定义），允许其优先服务具有更高优先级的 HTTP/2 流。如果希望保持旧的行为，即无论优先级如何都以轮询方式服务流，可以将 [`Server.DisableClientPriority`](/pkg/net/http#Server.DisableClientPriority) 设置为 `true`。

<!-- 6-stdlib/99-minor/net/http/77370.md -->

HTTP/1 的 [`Response.Body`](/pkg/net/http#Response.Body) 在关闭时现在会自动排空（drain）任何未读的内容，但有一个保守的限制，以允许更好的连接复用。对于大多数程序而言，此变更应无实际影响，或者会带来性能提升。在少数情况下，那些未能从连接复用中获益的程序，如果之前不当地允许了过量的空闲连接滞留（通常是将 [`Transport.MaxIdleConns`](/pkg/net/http#Transport.MaxIdleConns) 设置为 `0`，或为不同的请求使用不同的 [`Client`](/pkg/net/http#Client)，从而绕过了 [`Transport.MaxIdleConns`](/pkg/net/http#Transport.MaxIdleConns) 的限制），则可能会经历性能下降。在这些情况下，将 [`Transport.DisableKeepAlives`](/pkg/net/http#Transport.DisableKeepAlives) 设置为 `true` 将禁用连接复用。然而，这种性能下降通常最初就表明 [`Transport`](/pkg/net/http#Transport) 或 [`Client`](/pkg/net/http#Client) 的配置或使用不当，进行更深入的检查可能会有所帮助。

<!-- go.dev/issue/79936 -->

新的 [`Server.MaxHeaderValueCount`](/pkg/net/http#Server.MaxHeaderValueCount) 字段允许 HTTP 服务器控制其愿意接受的头部值数量。如果未设置，则使用 [`DefaultMaxHeaderValueCount`](/pkg/net/http#DefaultMaxHeaderValueCount)。

#### [`net/http/httptest`](/pkg/net/http/httptest/)

<!-- 6-stdlib/99-minor/net/http/httptest/76608.md -->

新的 [`NewTestServer`](/pkg/net/http/httptest#NewTestServer) 函数创建一个 [`Server`](/pkg/net/http/httptest#Server)，该服务器配置为使用一个适用于 [`testing/synctest`](/pkg/testing/synctest) 包的内存中的虚拟网络。

#### [`net/url`](/pkg/net/url/)

<!-- 6-stdlib/99-minor/net/url/73450.md -->

新的 [`URL.Clone`](/pkg/net/url#URL.Clone) 方法创建 URL 的深拷贝。
新的 [`Values.Clone`](/pkg/net/url#Values.Clone) 方法创建 Values 的深拷贝。

#### [`runtime/secret`](/pkg/runtime/secret/)

在 [秘密模式](/pkg/runtime/secret#Do) 下创建的 Goroutine 现在自身也会在秘密模式下执行。

#### [`strings`](/pkg/strings/)

<!-- 6-stdlib/99-minor/strings/71151.md -->

新的 [`CutLast`](/pkg/strings#CutLast) 函数在字符串中最后一次出现分隔符的位置进行切割。
它可以替代并简化一些 [`LastIndex`](/pkg/strings#LastIndex) 的常见用法。

#### [`syscall`](/pkg/syscall/)

<!-- CL 750680 -->

在 Plan 9 上，[`Errno`](/pkg/syscall#Errno) 类型现在已被定义并实现了 `error` 接口，与其他平台一致。Plan 9 系统调用返回 `ErrorString` 值，因此该包在 Plan 9 上从不返回 `Errno`。定义它是为了让引用 `syscall.Errno` 的可移植代码在 Plan 9 上无需构建约束即可编译。

#### [`testing/synctest`](/pkg/testing/synctest/)

<!-- 6-stdlib/99-minor/testing/synctest/77169.md -->

新的 [`Sleep`](/pkg/testing/synctest#Sleep) 辅助函数结合了 [`time.Sleep`](/pkg/time#Sleep) 和 [`synctest.Wait`](/pkg/testing/synctest#Wait) 的功能。

#### [`unicode`](/pkg/unicode/)

<!-- 6-stdlib/99-minor/unicode/77266.md -->

unicode 包及整个系统相关的支持已从 Unicode 15 升级到 Unicode 17。
有关变更信息，请参阅 [Unicode 16.0.0](https://www.unicode.org/versions/Unicode16.0.0/) 和 [Unicode 17.0.0](https://www.unicode.org/versions/Unicode17.0.0/) 的发行说明。

## 移植 {#ports}

### Darwin {#darwin}

<!-- go.dev/issue/75836 -->

正如 Go 1.26 发行说明中[宣布](go1.26#darwin)的那样，
Go 1.27 要求 macOS 13 Ventura 或更高版本；
对先前版本的支持已停止。

### PowerPC {#ppc64}

<!-- go.dev/issue/76244 -->

在 Linux 上的 64 位大端序 PowerPC 移植版本（`GOOS=linux` `GOARCH=ppc64`）中，
Go 工具链现在生成使用 ELFv2 系统 ABI 的二进制文件。
ELFv2 支持需要 Linux 内核 3.13 或更高版本。
RHEL7 已将此支持回移到其 3.10 内核中。

Cgo、位置无关可执行文件 (PIE) 和外部链接现在都受支持。
使用这些特性需要一个兼容 ELFv2 的运行时（libc 以及所有链接和加载的库）。对于不使用 cgo 的程序，Go 工具链默认仍然通过内部链接生成静态二进制文件。  
对于启用了 cgo 选项的程序，若需要生成纯粹的静态 Go 二进制文件，可在运行 `go build` 时设置环境变量 `CGO_ENABLED=0`。