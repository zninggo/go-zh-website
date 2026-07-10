---
title: Go 1.14 发布说明
---

<!--
注意：在本文档及此目录下的其他文档中，惯例是将固定宽度的短语用非固定宽度的空格连接，例如
`hello` `world`。
请勿发送移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.14 简介 {#introduction}

最新的 Go 版本，1.14，在 [Go 1.13](go1.13) 发布六个月后到来。
其大部分变更集中在工具链、运行时和库的实现上。
一如既往，此版本遵循 Go 1 [兼容性承诺](/doc/go1compat.html)。
我们预计几乎所有 Go 程序都将继续像以前一样编译和运行。

`go` 命令的模块支持现已可用于生产环境，
我们鼓励所有用户 [迁移到 Go 模块进行依赖管理](/blog/migrating-to-go-modules)。如果你因 Go 工具链中的问题而无法迁移，请确保该问题已提交了
[待解决的 issue](/issue?q=is%3Aissue+is%3Aopen+label%3Amodules)。
（如果该 issue 不在 `Go1.15` 里程碑中，请告知我们它为何阻碍了你的迁移，以便我们适当地确定其优先级。）

## 语言变更 {#language}

根据[重叠接口提案](https://github.com/golang/proposal/blob/master/design/6977-overlapping-interfaces.md)，
Go 1.14 现在允许嵌入具有重叠方法集的接口：
来自嵌入接口的方法可以具有与（嵌入）接口中已存在方法相同的名称和相同的签名。这解决了通常（但不限于）出现在菱形嵌入图中的问题。
接口中显式声明的方法必须像以前一样保持[唯一性](https://tip.golang.org/ref/spec#Uniqueness_of_identifiers)。

## 平台支持 {#ports}

### Darwin {#darwin}

Go 1.14 是最后一个支持在 macOS 10.11 El Capitan 上运行的版本。
Go 1.15 将要求 macOS 10.12 Sierra 或更高版本。

<!-- golang.org/issue/34749 -->
Go 1.14 是最后一个支持 macOS 上 32 位二进制文件（`darwin/386` 端口）的 Go 版本。从 macOS 10.15 (Catalina) 开始，它们不再受支持。
Go 继续支持 64 位的 `darwin/amd64` 端口。

<!-- golang.org/issue/34751 -->
Go 1.14 很可能是最后一个支持 iOS、iPadOS、watchOS 和 tvOS 上 32 位二进制文件（`darwin/arm` 端口）的 Go 版本。Go 继续支持 64 位的 `darwin/arm64` 端口。

### Windows {#windows}

<!-- CL 203601 -->
Windows 上的 Go 二进制文件现已启用 [DEP（数据执行保护）](https://docs.microsoft.com/en-us/windows/win32/memory/data-execution-prevention)。

<!-- CL 202439 -->
在 Windows 上，通过 [`os.OpenFile`](/pkg/os#CreateFile) 使用 [`os.O_CREATE`](/pkg/os/#O_CREATE) 标志创建文件，或通过 [`syscall.Open`](/pkg/syscall#Open) 使用 [`syscall.O_CREAT`](/pkg/syscall#O_CREAT) 标志创建文件时，如果权限参数中未设置 `0o200`（所有者写权限）位，现在将创建只读文件。这使得 Windows 上的行为更接近 Unix 系统。

### WebAssembly {#wasm}

<!-- CL 203600 -->
通过 `js.Value` 对象从 Go 引用的 JavaScript 值现在可以被垃圾回收。

<!-- CL 203600 -->
`js.Value` 值不再能使用 `==` 运算符进行比较，而必须使用其 `Equal` 方法进行比较。

<!-- CL 203600 -->
`js.Value` 现在新增了 `IsUndefined`、`IsNull` 和 `IsNaN` 方法。

### RISC-V {#riscv}

<!-- Issue 27532 -->
Go 1.14 包含对 Linux 上 64 位 RISC-V 的实验性支持（`GOOS=linux`, `GOARCH=riscv64`）。请注意，性能、汇编语法稳定性以及可能的正确性仍在持续改进中。

### FreeBSD {#freebsd}

<!-- CL 199919 -->
Go 现在支持在 FreeBSD 12.0 或更高版本上运行的 64 位 ARM 架构（`freebsd/arm64` 端口）。

### Native Client (NaCl) {#nacl}

<!-- golang.org/issue/30439 -->
正如 [Go 1.13 发布说明](go1.13#ports)中所宣布的，Go 1.14 放弃了对 Native Client 平台（`GOOS=nacl`）的支持。

### Illumos {#illumos}

<!-- CL 203758 -->
运行时现在会考虑区域 CPU 上限（`zone.cpu-cap` 资源控制），用于 `runtime.NumCPU` 和 `GOMAXPROCS` 的默认值。

## 工具 {#tools}

### Go 命令 {#go-command}

#### 供应商 {#vendor}

<!-- golang.org/issue/33848 -->

当主模块包含一个顶级 `vendor` 目录且其 `go.mod` 文件指定 `go` `1.14` 或更高版本时，`go` 命令现在对接受该标志的操作默认使用 `-mod=vendor`。该标志的一个新值 `-mod=mod` 会使 `go` 命令转而从模块缓存中加载模块（如同没有 `vendor` 目录时一样）。

当设置了 `-mod=vendor`（显式设置或通过默认值设置）时，`go` 命令现在会验证主模块的 `vendor/modules.txt` 文件与其 `go.mod` 文件是否一致。

`go` `list` `-m` 不再静默地忽略未在 `vendor` 目录中提供包的传递依赖项。如果设置了 `-mod=vendor` 且请求了 `vendor/modules.txt` 中未提及的模块信息，它现在会显式地失败。

#### 标志 {#go-flags}

<!-- golang.org/issue/32502, golang.org/issue/30345 -->
`go` `get` 命令不再接受 `-mod` 标志。以前，该标志的设置要么[被忽略](/issue/30345)，要么[导致构建失败](/issue/32502)。

<!-- golang.org/issue/33326 -->
当 `go.mod` 文件为只读且不存在顶级 `vendor` 目录时，现在默认设置 `-mod=readonly`。

<!-- golang.org/issue/31481 -->
`-modcacherw` 是一个新标志，它指示 `go` 命令将模块缓存中新创建的目录保持在其默认权限，而不是使其变为只读。使用此标志会使测试或其他工具更有可能意外添加模块已验证校验和中未包含的文件。但是，它允许使用 `rm` `-rf`（而不是 `go` `clean` `-modcache`）来删除模块缓存。<!-- golang.org/issue/34506 -->
`-modfile=file` 是一个新的标志，它指示 `go` 命令读取（并可能写入）一个替代的 `go.mod` 文件，而不是模块根目录下的默认文件。模块根目录下仍然需要存在一个名为 `go.mod` 的文件以确定模块根目录，但该文件本身不会被访问。当指定 `-modfile` 时，也会使用一个替代的 `go.sum` 文件：其路径通过去掉 `-modfile` 标志的 `.mod` 扩展名并附加 `.sum` 来派生。

#### 环境变量 {#go-env-vars}

<!-- golang.org/issue/32966 -->
`GOINSECURE` 是一个新的环境变量，它指示 `go` 命令在直接从源头获取某些模块时，不要求 HTTPS 连接，并跳过证书验证。与现有的 `GOPRIVATE` 变量类似，`GOINSECURE` 的值是一个逗号分隔的 glob 模式列表。

#### 模块外的命令 {#commands-outside-modules}

<!-- golang.org/issue/32027 -->
当明确启用模块感知模式（通过设置 `GO111MODULE=on`）时，如果没有 `go.mod` 文件，大多数模块相关命令的功能会受到限制。例如，`go` `build`、`go` `run` 和其他构建命令只能构建标准库中的包以及通过命令行指定为 `.go` 文件的包。

此前，`go` 命令会将每个包路径解析为模块的最新版本，但不会记录模块路径或版本。这导致了[缓慢且不可重现的构建](/issue/32027)。

`go` `get` 仍然像以前一样工作，`go` `mod` `download` 和带有明确版本的 `go` `list` `-m` 也是如此。

#### `+incompatible` 版本 {#incompatible-versions}

<!-- golang.org/issue/34165 -->

如果一个模块的最新版本包含 `go.mod` 文件，除非明确请求或已经需要该版本，否则 `go` `get` 将不再升级到该模块的[不兼容](/cmd/go/#hdr-Module_compatibility_and_semantic_versioning)主版本。`go` `list` 在直接从版本控制系统获取时，也会省略此类模块的不兼容主版本，但如果由代理报告，则可能会包含它们。

#### `go.mod` 文件维护 {#go.mod}

<!-- golang.org/issue/34822 -->

除了 `go` `mod` `tidy` 之外的 `go` 命令，现在不再删除指定了间接依赖项版本的 `require` 指令，如果该版本已经被主模块的其他（传递性）依赖项所隐含。

除了 `go` `mod` `tidy` 之外的 `go` 命令，现在不会在更改仅是表面上的情况下编辑 `go.mod` 文件。

当设置 `-mod=readonly` 时，`go` 命令将不再因为缺少 `go` 指令或错误的 `// indirect` 注释而失败。

#### 模块下载 {#module-downloading}

<!-- golang.org/issue/26092 -->
`go` 命令现在在模块模式下支持 Subversion 仓库。

<!-- golang.org/issue/30748 -->
`go` 命令现在包含来自模块代理和其他 HTTP 服务器的纯文本错误消息片段。仅当错误消息是有效的 UTF-8 且仅由图形字符和空格组成时，才会显示。

#### 测试 {#go-test}

<!-- golang.org/issue/24929 -->
`go test -v` 现在会流式传输 `t.Log` 的输出（发生时即输出），而不是在所有测试结束后。

## 运行时 {#runtime}

<!-- CL 190098 -->
此版本改进了大多数 `defer` 使用的性能，与直接调用延迟函数相比，几乎没有额外开销。因此，`defer` 现在可以在性能关键的代码中使用，无需担心开销问题。

<!-- CL 201760, CL 201762 等多个提交 -->
Goroutine 现在是可异步抢占的。因此，没有函数调用的循环不再可能导致调度器死锁或显著延迟垃圾回收。此功能在除 `windows/arm`、`darwin/arm`、`js/wasm` 和 `plan9/*` 之外的所有平台上都受支持。

抢占实现的一个后果是，在 Unix 系统（包括 Linux 和 macOS 系统）上，用 Go 1.14 构建的程序将比用早期版本构建的程序接收更多信号。这意味着使用 [`syscall`](/pkg/syscall/) 或 [`golang.org/x/sys/unix`](https://godoc.org/golang.org/x/sys/unix) 等包的程序将看到更多慢速系统调用因 `EINTR` 错误而失败。这些程序将不得不以某种方式处理这些错误，最可能是循环以重试系统调用。有关此问题的更多信息，请参阅 Linux 系统的 [`man 7 signal`](https://man7.org/linux/man-pages/man7/signal.7.html) 或其他系统的类似文档。

<!-- CL 201765, CL 195701 等多个提交 -->
页分配器效率更高，在 `GOMAXPROCS` 值较高时锁争用显著减少。这在并行且高速进行大内存分配时表现为更低的延迟和更高的吞吐量，最为明显。

<!-- CL 171844 等多个提交 -->
内部计时器（被 [`time.After`](/pkg/time/#After)、[`time.Tick`](/pkg/time/#Tick)、[`net.Conn.SetDeadline`](/pkg/net/#Conn) 等使用）效率更高，锁争用更少，上下文切换更少。这是一个性能改进，不应引起任何用户可见的变化。

## 编译器 {#compiler}

<!-- CL 162237 -->
此版本添加了 `-d=checkptr` 作为编译时选项，用于插入动态检查 Go 代码是否遵循 `unsafe.Pointer` 安全规则。此选项在使用 `-race` 或 `-msan` 标志时默认启用（Windows 除外），并且可以通过 `-gcflags=all=-d=checkptr=0` 禁用。具体来说，`-d=checkptr` 检查以下内容：

 1. 将 `unsafe.Pointer` 转换为 `*T` 时，结果指针必须为 `T` 适当对齐。
 2. 如果指针算术的结果指向 Go 堆对象内部，则其中一个 `unsafe.Pointer` 类型的操作数必须指向同一对象。

目前不建议在 Windows 上使用 `-d=checkptr`，因为它会在标准库中导致误报。<!-- CL 204338 -->
编译器现在可以使用 `-json` 标志输出关键优化的机器可读日志，包括内联、逃逸分析、边界检查消除和空值检查消除。

<!-- CL 196959 -->
详细的逃逸分析诊断（`-m=2`）现已恢复正常工作。此功能在上一版本的新逃逸分析实现中曾被移除。

<!-- CL 196217 -->
macOS 二进制文件中的所有 Go 符号现在均以下划线开头，以遵循平台惯例。

<!-- CL 202117 -->
本版本包含实验性支持，为模糊测试提供编译器插入的覆盖率检测。详情请参阅 [issue 14565](/issue/14565)。此 API 可能在未来版本中发生变化。

<!-- CL 174704 -->
<!-- CL 196784 -->
边界检查消除现在利用切片创建的信息，并可消除类型小于 `int` 的索引的检查。

## 标准库 {#library}

### 新的字节序列哈希包 {#hash_maphash}

<!-- golang.org/issue/28322, CL 186877 -->
Go 1.14 包含一个新包 [`hash/maphash`](/pkg/hash/maphash/)，它提供了对字节序列的哈希函数。这些哈希函数旨在用于实现哈希表或其他需要将任意字符串或字节序列映射到无符号 64 位整数均匀分布的数据结构。

这些哈希函数具有抗碰撞性，但不具备密码学安全性。

给定字节序列的哈希值在单个进程内保持一致，但在不同进程中会不同。

### 库的细微变更 {#minor_library_changes}

一如既往，标准库存在各种细微变更和更新，这些都是在 Go 1 [兼容性承诺](/doc/go1compat) 的指导下进行的。

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 191976 -->
已移除对 SSL 版本 3.0 (SSLv3) 的支持。请注意，SSLv3 是早于 TLS 的[加密协议](https://tools.ietf.org/html/rfc7568)。

<!-- CL 191999 -->
现在无法再通过 `GODEBUG` 环境变量禁用 TLS 1.3。请使用 [`Config.MaxVersion`](/pkg/crypto/tls/#Config.MaxVersion) 字段来配置 TLS 版本。

<!-- CL 205059 -->
当通过 [`Config.Certificates`](/pkg/crypto/tls/#Config.Certificates) 字段提供多个证书链时，现在会自动选择第一个与对等方兼容的证书链。例如，这允许同时提供 ECDSA 和 RSA 证书，并让包自动选择最佳证书。请注意，除非设置了 [`Certificate.Leaf`](/pkg/crypto/tls/#Certificate.Leaf) 字段，否则此选择的性能将较差。仅支持将单个证书与给定名称关联的 [`Config.NameToCertificate`](/pkg/crypto/tls/#Config.NameToCertificate) 字段现已弃用，应保留为 `nil`。类似地，从叶子证书构建 `NameToCertificate` 字段的 [`Config.BuildNameToCertificate`](/pkg/crypto/tls/#Config.BuildNameToCertificate) 方法现已弃用，不应再调用。

<!-- CL 175517 -->
新的 [`CipherSuites`](/pkg/crypto/tls/#CipherSuites) 和 [`InsecureCipherSuites`](/pkg/crypto/tls/#InsecureCipherSuites) 函数返回当前实现的密码套件列表。新的 [`CipherSuiteName`](/pkg/crypto/tls/#CipherSuiteName) 函数返回给定密码套件 ID 的名称。

<!-- CL 205058, 205057 -->
新的 [`(*ClientHelloInfo).SupportsCertificate`](/pkg/crypto/tls/#ClientHelloInfo.SupportsCertificate) 和 [`(*CertificateRequestInfo).SupportsCertificate`](/pkg/crypto/tls/#CertificateRequestInfo.SupportsCertificate) 方法暴露了对等方是否支持某个证书。

<!-- CL 174329 -->
`tls` 包不再支持旧的下一协议协商 (NPN) 扩展，现在仅支持 ALPN。在之前的版本中，它同时支持两者。没有 API 变更，应用程序应能像以前一样正常运行。大多数其他客户端和服务器已经移除了 NPN 支持，转而使用标准化的 ALPN。

<!-- CL 205063, 205062 -->
在 TLS 1.2 握手期间，现在当支持时会使用 RSA-PSS 签名。这不会影响大多数应用程序，但不支持 RSA-PSS 签名的自定义 [`Certificate.PrivateKey`](/pkg/crypto/tls/#Certificate.PrivateKey) 实现将需要使用新的 [`Certificate.SupportedSignatureAlgorithms`](/pkg/crypto/tls/#Certificate.SupportedSignatureAlgorithms) 字段来禁用它们。

<!-- CL 205059, 205059 -->
如果设置了 [`Config.GetConfigForClient`](/pkg/crypto/tls/#Config.GetConfigForClient)，则 [`Config.Certificates`](/pkg/crypto/tls/#Config.Certificates) 和 [`Config.GetCertificate`](/pkg/crypto/tls/#Config.GetCertificate) 现在均可为 nil。如果回调函数既不返回证书也不返回错误，则现在会发送 `unrecognized_name`。

<!-- CL 205058 -->
新的 [`CertificateRequestInfo.Version`](/pkg/crypto/tls/#CertificateRequestInfo.Version) 字段为客户端证书回调提供 TLS 版本。

<!-- CL 205068 -->
新的 `TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256` 和 `TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256` 常量使用了之前称为 `TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305` 和 `TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305` 的密码套件的最终名称。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 204046 -->
[`Certificate.CreateCRL`](/pkg/crypto/x509/#Certificate.CreateCRL) 现在支持 Ed25519 颁发者。

#### [debug/dwarf](/pkg/debug/dwarf/)

<!-- CL 175138 -->
`debug/dwarf` 包现在支持读取 DWARF 版本 5。

新的方法 [`(*Data).AddSection`](/pkg/debug/dwarf/#Data.AddSection) 支持从输入文件向 DWARF `Data` 添加任意新的 DWARF 节。<!-- CL 192698 -->
新增的方法 [`(*Reader).ByteOrder`](/pkg/debug/dwarf/#Reader.ByteOrder) 返回当前编译单元的字节序。此信息可用于解释以本地顺序编码的属性，例如位置描述符。

<!-- CL 192699 -->
新增的方法 [`(*LineReader).Files`](/pkg/debug/dwarf/#LineReader.Files) 从行号读取器返回文件名表。此信息可用于解释 DWARF 属性（如 `AttrDeclFile`）的值。

<!-- debug/dwarf -->

#### [encoding/asn1](/pkg/encoding/asn1/)

<!-- CL 126624 -->
[`Unmarshal`](/pkg/encoding/asn1/#Unmarshal) 现在支持 ASN.1 字符串类型 BMPString，该类型由新的常量 [`TagBMPString`](/pkg/encoding/asn1/#TagBMPString) 表示。

<!-- encoding/asn1 -->

#### [encoding/json](/pkg/encoding/json/)

<!-- CL 200677 -->
[`Decoder`](/pkg/encoding/json/#Decoder) 类型支持一个新的方法 [`InputOffset`](/pkg/encoding/json/#Decoder.InputOffset)，该方法返回当前解码器位置在输入流中的字节偏移量。

<!-- CL 200217 -->
[`Compact`](/pkg/encoding/json/#Compact) 不再转义 `U+2028` 和 `U+2029` 字符，这从来不是文档化的特性。如需正确的转义，请参见 [`HTMLEscape`](/pkg/encoding/json/#HTMLEscape)。

<!-- CL 195045 -->
[`Number`](/pkg/encoding/json/#Number) 不再接受无效数字，以更贴近文档化的行为了。如果程序需要接受像空字符串这样的无效数字，考虑使用 [`Unmarshaler`](/pkg/encoding/json/#Unmarshaler) 对该类型进行包装。

<!-- CL 200237 -->
[`Unmarshal`](/pkg/encoding/json/#Unmarshal) 现在支持底层类型为字符串并实现了 [`encoding.TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler) 的 map 键。

<!-- encoding/json -->

#### [go/build](/pkg/go/build/)

<!-- CL 203820, 211657 -->
[`Context`](/pkg/go/build/#Context) 类型有一个新字段 `Dir`，可用于设置构建的工作目录。默认是运行进程的当前目录。在模块模式下，此字段用于定位主模块。

<!-- go/build -->

#### [go/doc](/pkg/go/doc/)

<!-- CL 204830 -->
新增的函数 [`NewFromFiles`](/pkg/go/doc/#NewFromFiles) 从一组 `*ast.File` 列表计算包文档，并将示例与相应的包元素关联起来。新的信息可在 [`Package`](/pkg/go/doc/#Package)、[`Type`](/pkg/go/doc/#Type) 和 [`Func`](/pkg/go/doc/#Func) 类型的新 `Examples` 字段中获取，以及在 [`Example`](/pkg/go/doc/#Example) 类型的新 [`Suffix`](/pkg/go/doc/#Example.Suffix) 字段中获取。

<!-- go/doc -->

#### [io/ioutil](/pkg/io/ioutil/)

<!-- CL 198488 -->
[`TempDir`](/pkg/io/ioutil/#TempDir) 现在可以创建名称具有可预测前缀和后缀的目录。与 [`TempFile`](/pkg/io/ioutil/#TempFile) 类似，如果模式包含 `'\*'`，则随机字符串会替换最后一个 `'\*'`。

#### [log](/pkg/log/)

<!-- CL 186182 -->
新的 [`Lmsgprefix`](https://tip.golang.org/pkg/log/#pkg-constants) 标志可用于指示日志函数在日志消息前立即发出可选的输出前缀，而不是在行首发出。

<!-- log -->

#### [math](/pkg/math/)

<!-- CL 127458 -->
新的 [`FMA`](/pkg/math/#FMA) 函数以浮点数计算 `x*y+z`，且不中间舍入 `x*y` 的计算结果。某些架构使用专用硬件指令实现此计算以获得额外性能。

<!-- math -->

#### [math/big](/pkg/math/big/)

<!-- CL 164972 -->
[`GCD`](/pkg/math/big/#Int.GCD) 方法现在允许输入参数 `a` 和 `b` 为零或负数。

<!-- math/big -->

#### [math/bits](/pkg/math/bits/)

<!-- CL 197838 -->
新的函数 [`Rem`](/pkg/math/bits/#Rem)、[`Rem32`](/pkg/math/bits/#Rem32) 和 [`Rem64`](/pkg/math/bits/#Rem64) 支持在商溢出的情况下计算余数。

<!-- math/bits -->

#### [mime](/pkg/mime/)

<!-- CL 186927 -->
`.js` 和 `.mjs` 文件的默认类型现在是 `text/javascript` 而不是 `application/javascript`。这是根据一项将 `application/javascript` 视为过时的 [IETF 草案](https://datatracker.ietf.org/doc/draft-ietf-dispatch-javascript-mjs/)。

<!-- mime -->

#### [mime/multipart](/pkg/mime/multipart/)

新增的 [`Reader`](/pkg/mime/multipart/#Reader) 方法 [`NextRawPart`](/pkg/mime/multipart/#Reader.NextRawPart) 支持获取下一个 MIME 部分，而无需透明地解码 `quoted-printable` 数据。

<!-- mime/multipart -->

#### [net/http](/pkg/net/http/)

<!-- CL 200760 -->
新增的 [`Header`](/pkg/net/http/#Header) 方法 [`Values`](/pkg/net/http/#Header.Values) 可用于获取与规范化键关联的所有值。

<!-- CL 61291 -->
新增的 [`Transport`](/pkg/net/http/#Transport) 字段 [`DialTLSContext`](/pkg/net/http/#Transport.DialTLSContext) 可用于为非代理 HTTPS 请求指定创建 TLS 连接的可选拨号函数。这个新字段可以用来替代 [`DialTLS`](/pkg/net/http/#Transport.DialTLS)，`DialTLS` 现已被视为弃用；`DialTLS` 将继续工作，但新代码应使用 `DialTLSContext`，它允许传输层在拨号不再需要时立即取消拨号。

<!-- CL 192518, CL 194218 -->
在 Windows 上，[`ServeFile`](/pkg/net/http/#ServeFile) 现在能正确处理大于 2GB 的文件。

<!-- net/http -->

#### [net/http/httptest](/pkg/net/http/httptest/)

<!-- CL 201557 -->
新增的 [`Server`](/pkg/net/http/httptest/#Server) 字段 [`EnableHTTP2`](/pkg/net/http/httptest/#Server.EnableHTTP2) 支持在测试服务器上启用 HTTP/2。

<!-- net/http/httptest -->

#### [net/textproto](/pkg/net/textproto/)

<!-- CL 200760 -->
新增的 [`MIMEHeader`](/pkg/net/textproto/#MIMEHeader) 方法 [`Values`](/pkg/net/textproto/#MIMEHeader.Values) 可用于获取与规范化键关联的所有值。

<!-- net/textproto -->

#### [net/url](/pkg/net/url/)<!-- CL 185117 -->
当 URL 解析失败时（例如通过 [`Parse`](/pkg/net/url/#Parse) 或 [`ParseRequestURI`](/pkg/net/url/#ParseRequestURI)），所产生的 [`Error`](/pkg/net/url/#Error.Error) 消息现在会引用无法解析的 URL。这提供了更清晰的结构，并与其他解析错误保持一致。

<!-- net/url -->

#### [os/signal](/pkg/os/signal/)

<!-- CL 187739 -->
在 Windows 上，`CTRL_CLOSE_EVENT`、`CTRL_LOGOFF_EVENT` 和 `CTRL_SHUTDOWN_EVENT` 事件现在会生成 `syscall.SIGTERM` 信号，类似于 Control-C 和 Control-Break 生成 `syscall.SIGINT` 信号的方式。

<!-- os/signal -->

#### [plugin](/pkg/plugin/)

<!-- CL 191617 -->
`plugin` 包现在支持 `freebsd/amd64`。

<!-- plugin -->

#### [reflect](/pkg/reflect/)

<!-- CL 85661 -->
[`StructOf`](/pkg/reflect#StructOf) 现在支持创建包含未导出字段的结构体类型，方法是通过设置 `StructField` 元素中的 `PkgPath` 字段。

<!-- reflect -->

#### [runtime](/pkg/runtime/)

<!-- CL 200081 -->
`runtime.Goexit` 不再能被递归的 `panic`/`recover` 中止。

<!-- CL 188297, CL 191785 -->
在 macOS 上，`SIGPIPE` 不再转发给在 Go 运行时初始化之前安装的信号处理程序。这是必要的，因为 macOS 将 `SIGPIPE` [传递给主线程](/issue/33384)，而不是写入已关闭管道的线程。

<!-- runtime -->

#### [runtime/pprof](/pkg/runtime/pprof/)

<!-- CL 204636, 205097 -->
生成的性能分析文件不再包含用于内联标记的伪 PC。内联函数的符号信息以 pprof 工具预期的 [格式](https://github.com/google/pprof/blob/5e96527/proto/profile.proto#L177-L184) 进行编码。这是对近期版本引入的回归错误的修复。

<!-- runtime/pprof -->

#### [strconv](/pkg/strconv/)

[`NumError`](/pkg/strconv/#NumError) 类型现在新增了一个 [`Unwrap`](/pkg/strconv/#NumError.Unwrap) 方法，可用于获取转换失败的原因。这使得可以将 `NumError` 值与 [`errors.Is`](/pkg/errors/#Is) 配合使用，以判断底层错误是否为 [`strconv.ErrRange`](/pkg/strconv/#pkg-variables) 或 [`strconv.ErrSyntax`](/pkg/strconv/#pkg-variables)。

<!-- strconv -->

#### [sync](/pkg/sync/)

<!-- CL 200577 -->
解锁一个高争用的 `Mutex` 现在会直接将 CPU 让给等待该 `Mutex` 的下一个 goroutine。这显著提升了在 CPU 核心数较多的机器上处理高争用互斥锁的性能。

<!-- sync -->

#### [testing](/pkg/testing/)

<!-- CL 201359 -->
testing 包现在支持清理函数，这些函数在测试或基准测试完成后被调用，可分别通过调用 [`T.Cleanup`](/pkg/testing#T.Cleanup) 或 [`B.Cleanup`](/pkg/testing#B.Cleanup) 来注册。

<!-- testing -->

#### [text/template](/pkg/text/template/)

<!-- CL 206124 -->
text/template 包现在能正确报告当带括号的参数被用作函数时的错误。这最常见于像 `{{if (eq .F "a") or (eq .F "b")}}` 这样的错误用法中。正确的写法应为 `{{if or (eq .F "a") (eq .F "b")}}`。错误的用法从未按预期工作，现在将报告错误 `can't give argument to non-function`。

<!-- CL 207637 -->
[`JSEscape`](/pkg/text/template/#JSEscape) 现在会转义 `&` 和 `=` 字符，以减轻其输出在 HTML 上下文中被误用的影响。

<!-- text/template -->

#### [unicode](/pkg/unicode/)

[`unicode`](/pkg/unicode/) 包及系统中的相关支持已从 Unicode 11.0 升级到 [Unicode 12.0](https://www.unicode.org/versions/Unicode12.0.0/)，新增了 554 个字符，包括四种新的文字系统和 61 个新的 emoji。

<!-- unicode -->