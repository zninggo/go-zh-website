---
path: /doc/go1.19
title: Go 1.19 版本说明
---

<!--
注意：在本目录下的本文档及其他文档中，约定使用等宽空格设置等宽短语，例如
`hello` `world`。
请勿提交移除此类短语内部标签的变更。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.19 简介 {#introduction}

最新的 Go 版本 1.19 在 [Go 1.18](/doc/go1.18) 发布五个月后发布。
其大部分更改集中在工具链、运行时和库的实现上。
一如既往，本次发布遵守 Go 1 [兼容性承诺](/doc/go1compat)。
我们预计几乎所有 Go 程序将继续像之前一样编译和运行。

## 语言变更 {#language}

<!-- https://go.dev/issue/52038 -->
语言仅有一处细微变更，
即对[方法声明中类型参数作用域](/ref/spec#Declarations_and_scope)的
[极小修正](/issue/52038)。
现有程序不受影响。

## 内存模型 {#mem}

<!-- https://go.dev/issue/50859 -->
[Go 内存模型](/ref/mem)已被
[修订](https://research.swtch.com/gomm)，以使 Go 与
C、C++、Java、JavaScript、Rust 和 Swift 使用的内存模型保持一致。
Go 仅提供顺序一致性原子操作，不提供其他语言中存在的更宽松形式。
伴随着内存模型的更新，
Go 1.19 在 [`sync/atomic` 包中引入了新类型](#atomic_types)，
使得使用原子值更加方便，例如
[atomic.Int64](/pkg/sync/atomic/#Int64)
和
[atomic.Pointer[T]](/pkg/sync/atomic/#Pointer)。

## 平台支持 {#ports}

### LoongArch 64 位 {#loong64}

<!-- https://go.dev/issue/46229 -->
Go 1.19 新增了对龙芯 64 位架构
[LoongArch](https://loongson.github.io/LoongArch-Documentation)
在 Linux 上的支持 (`GOOS=linux`, `GOARCH=loong64`)。
实现的 ABI 是 LP64D。支持的最低内核版本是 5.19。

请注意，大多数现有的适用于 LoongArch 的商业 Linux 发行版
附带较旧的内核，其系统调用 ABI 与历史版本不兼容。
编译后的二进制文件无法在这些系统上运行，即使是静态链接的。
此类不受支持系统上的用户只能使用发行版提供的 Go 包。

### RISC-V {#riscv64}

<!-- CL 402374 -->
`riscv64` 平台现在支持使用寄存器传递函数参数和返回值。
基准测试显示，在 `riscv64` 上通常可获得 10% 或更高的性能提升。

## 工具 {#tools}

### 文档注释 {#go-doc}

<!-- https://go.dev/issue/51082 -->
<!-- CL 384265, CL 397276, CL 397278, CL 397279, CL 397281, CL 397284 -->
Go 1.19 在文档注释中增加了对链接、列表和更清晰标题的支持。
作为此变更的一部分，[`gofmt`](/cmd/gofmt)
现在会重新格式化文档注释，以使其渲染后的含义更加清晰。
有关语法详情以及 `gofmt` 现在高亮显示的常见错误说明，请参见
"[Go 文档注释](/doc/comment)"。
作为此变更的另一部分，新包 [go/doc/comment](/pkg/go/doc/comment/)
提供了文档注释的解析和重新格式化功能，
以及将其渲染为 HTML、Markdown 和文本的支持。

### 新的 `unix` 构建约束 {#go-unix}

<!-- CL 389934 -->
<!-- https://go.dev/issue/20322 -->
<!-- https://go.dev/issue/51572 -->
构建约束 `unix` 现在可以在 `//go:build` 行中识别。
如果目标操作系统（即 `GOOS`）是 Unix 或类 Unix 系统，则满足此约束。
在 1.19 版本中，当 `GOOS` 是以下之一时满足约束：
`aix`、`android`、`darwin`、
`dragonfly`、`freebsd`、`hurd`、
`illumos`、`ios`、`linux`、
`netbsd`、`openbsd` 或 `solaris`。
在未来的版本中，`unix` 约束可能会匹配额外新支持的操作系统。

### Go 命令 {#go-command}

<!-- https://go.dev/issue/51461 -->

如果设置了 `-trimpath` 标志，现在该标志会被包含在
由 `go` `build` 刻录到 Go 二进制文件的构建设置中，并且可以
通过
[`go` `version` `-m`](https://pkg.go.dev/cmd/go#hdr-Print_Go_version)
或 [`debug.ReadBuildInfo`](https://pkg.go.dev/runtime/debug#ReadBuildInfo) 查看。

`go` `generate` 现在会在生成器的环境中显式设置 `GOROOT`
环境变量，这样即使生成器是用 `-trimpath` 构建的，
也能定位到正确的 `GOROOT`。

<!-- CL 404134 -->
`go` `test` 和 `go` `generate` 现在将
`GOROOT/bin` 置于用于子进程的 `PATH` 的开头，
因此执行 `go` 命令的测试和生成器会将其解析到同一个 `GOROOT`。

<!-- CL 398058 -->
`go` `env` 现在会对它报告的
`CGO_CFLAGS`、`CGO_CPPFLAGS`、`CGO_CXXFLAGS`、`CGO_FFLAGS`、`CGO_LDFLAGS`
和 `GOGCCFLAGS` 变量中包含空格的条目进行引号转义。

<!-- https://go.dev/issue/29666 -->
`go` `list` `-json` 现在接受一个
逗号分隔的 JSON 字段列表来填充。如果指定了列表，
JSON 输出将仅包含这些字段，并且
`go` `list` 可能会避免计算未包含的字段。在某些情况下，这可能会抑制原本会报告的错误。

<!-- CL 410821 -->
`go` 命令现在会缓存加载某些模块所需的信息，
这应该会加速某些 `go` `list` 的调用。

### Vet {#vet}

<!-- https://go.dev/issue/47528 -->
`vet` 检查器 “errorsas” 现在会在
当 [`errors.As`](/pkg/errors/#As) 的第二个参数类型为 `*error`（这是一个常见错误）时报告。

## 运行时 {#runtime}<!-- https://go.dev/issue/48409 -->
<!-- CL 397018 -->
运行时（runtime）现在支持软内存限制。此内存限制包含 Go 堆（heap）以及运行时管理的所有其他内存，但不包括外部内存源，例如二进制文件本身的映射、其他语言管理的内存，以及操作系统代表 Go 程序持有的内存。可以通过 [`runtime/debug.SetMemoryLimit`](/pkg/runtime/debug/#SetMemoryLimit) 或相应的 [`GOMEMLIMIT`](/pkg/runtime/#hdr-Environment_Variables) 环境变量来管理此限制。该限制与 [`runtime/debug.SetGCPercent`](/pkg/runtime/debug/#SetGCPercent) / [`GOGC`](/pkg/runtime/#hdr-Environment_Variables) 协同工作，即使在 `GOGC=off` 的情况下也会被遵守，这使得 Go 程序能够始终最大化地利用其内存限制，在某些情况下提高了资源效率。关于软内存限制的详细解释以及各种常见用例和场景，请参阅 [GC 指南](/doc/gc-guide)。请注意，由于外部延迟因素（如操作系统调度），较小的内存限制（大约几十兆字节或更少）可能不太容易被严格遵守。更多详情请参见 [issue 52433](/issue/52433)。较大的内存限制（大约几百兆字节或更多）是稳定的，可用于生产环境。

<!-- CL 353989 -->
为了限制当程序的活动堆（live heap）大小接近软内存限制时 GC 颠簸（GC thrashing）的影响，Go 运行时还会尝试将总 GC CPU 利用率限制在 50%（不包括空闲时间），选择使用更多内存而非阻止应用程序继续执行。实际上，我们预计此限制只在特殊情况下发挥作用，新的[运行时指标](/pkg/runtime/metrics/#hdr-Supported_metrics) `/gc/limiter/last-enabled:gc-cycle` 会报告上次发生这种情况的时间。

<!-- https://go.dev/issue/44163 -->
当应用程序足够空闲以至于需要强制进行周期性 GC 循环时，运行时现在会更少地在空闲操作系统线程上调度 GC 工作协程（goroutine）。

<!-- https://go.dev/issue/18138 -->
<!-- CL 345889 -->
运行时现在将根据协程的历史平均栈使用量来分配初始协程栈。这避免了平均情况下一些早期的栈增长和复制，代价是在低于平均栈使用量的协程上最多浪费 2 倍的空间。

<!-- https://go.dev/issue/46279 -->
<!-- CL 393354 -->
<!-- CL 392415 -->
在 Unix 操作系统上，导入了 [os](/pkg/os/) 包的 Go 程序现在会自动将打开文件数限制（`RLIMIT_NOFILE`）增加到允许的最大值；也就是说，它们会将软限制（soft limit）更改为与硬限制（hard limit）匹配。这修正了某些系统上为了兼容使用非常老旧的 C 程序（它们使用 [_select_](https://en.wikipedia.org/wiki/Select_(Unix)) 系统调用）而人为设置的过低限制。Go 程序并不会受益于该限制，相反，即使是像 `gofmt` 这样的简单程序，在并行处理大量文件时，也常常在这些系统上耗尽文件描述符。此更改的一个影响是，那些在子进程中执行非常老旧 C 程序的 Go 程序，可能会在过高的限制下运行这些程序。这可以通过在调用 Go 程序之前设置硬限制来解决。

<!-- https://go.dev/issue/51485 -->
<!-- CL 390421 -->
不可恢复的致命错误（例如并发写入 map，或对未上锁的互斥锁进行解锁）现在会打印更简洁的回溯信息（traceback），不包括运行时元数据（等同于致命的 panic），除非设置了 `GOTRACEBACK=system` 或 `crash`。无论 `GOGOTRACEBACK` 的值如何，运行时内部的致命错误回溯信息始终包含完整的元数据。

<!-- https://go.dev/issue/50614 -->
<!-- CL 395754 -->
在 ARM64 架构上增加了对调试器注入函数调用的支持，使用户在使用已更新以利用此功能的调试器时，能够在交互式调试会话中调用其二进制文件中的函数。

<!-- https://go.dev/issue/44853 -->
[在 Go 1.18 中添加的地址消毒器（address sanitizer）支持](/doc/go1.18#go-build-asan)现在能更精确地处理函数参数和全局变量。

## 编译器 {#compiler}

<!-- https://go.dev/issue/5496 -->
<!-- CL 357330, 395714, 403979 -->
编译器现在使用[跳转表](https://en.wikipedia.org/wiki/Branch_table)来实现大型整数和字符串的 switch 语句。switch 语句的性能提升程度不一，但大约可以快 20%。（仅限 `GOARCH=amd64` 和 `GOARCH=arm64`）

<!-- CL 391014 -->
Go 编译器现在需要 `-p=importpath` 标志来构建可链接的目标文件。`go` 命令和 Bazel 已经提供了此标志。任何其他直接调用 Go 编译器的构建系统也需要确保传递此标志。

<!-- CL 415235 -->
Go 编译器不再接受 `-importmap` 标志。直接调用 Go 编译器的构建系统必须改用 `-importcfg` 标志。

## 汇编器 {#assembler}

<!-- CL 404298 -->
与编译器类似，汇编器现在也需要 `-p=importpath` 标志来构建可链接的目标文件。`go` 命令已经提供了此标志。任何其他直接调用 Go 汇编器的构建系统也需要确保传递此标志。

## 链接器 {#linker}

<!-- https://go.dev/issue/50796, CL 380755 -->
在 ELF 平台上，链接器现在以标准 gABI 格式（`SHF_COMPRESSED`）输出压缩的 DWARF 节，而不是旧的 `.zdebug` 格式。

## 标准库 {#library}

### 新的原子类型 {#atomic_types}<!-- https://go.dev/issue/50860 -->
<!-- CL 381317 -->
[`sync/atomic`](/pkg/sync/atomic/) 包定义了新的原子类型：
[`Bool`](/pkg/sync/atomic/#Bool)、
[`Int32`](/pkg/sync/atomic/#Int32)、
[`Int64`](/pkg/sync/atomic/#Int64)、
[`Uint32`](/pkg/sync/atomic/#Uint32)、
[`Uint64`](/pkg/sync/atomic/#Uint64)、
[`Uintptr`](/pkg/sync/atomic/#Uintptr) 以及
[`Pointer`](/pkg/sync/atomic/#Pointer)。
这些类型隐藏了底层值，因此所有访问都必须使用原子 API。
[`Pointer`](/pkg/sync/atomic/#Pointer) 也避免了在调用处需要转换为
[`unsafe.Pointer`](/pkg/unsafe/#Pointer) 的问题。
[`Int64`](/pkg/sync/atomic/#Int64) 和
[`Uint64`](/pkg/sync/atomic/#Uint64) 会自动在结构体和已分配数据中对齐到 64 位边界，
即使是在 32 位系统上也是如此。

### PATH 查找 {#os-exec-path}

<!-- https://go.dev/issue/43724 -->
<!-- CL 381374 -->
<!-- CL 403274 -->
[`Command`](/pkg/os/exec/#Command) 和
[`LookPath`](/pkg/os/exec/#LookPath) 不再允许 PATH 搜索的结果是相对于当前目录找到的。
这消除了一个[常见的安全问题来源](/blog/path-security)，
但也可能破坏那些依赖使用例如 `exec.Command("prog")` 来运行当前目录中名为 `prog`（或在 Windows 上为 `prog.exe`）的二进制文件的现有程序。
请参阅 [`os/exec`](/pkg/os/exec/) 包文档，了解如何最好地更新此类程序。

<!-- https://go.dev/issue/43947 -->
在 Windows 上，`Command` 和 `LookPath` 现在会遵守
[`NoDefaultCurrentDirectoryInExePath`](https://docs.microsoft.com/en-us/windows/win32/api/processenv/nf-processenv-needcurrentdirectoryforexepatha)
环境变量，从而可以在 Windows 系统上禁用 PATH 查找中默认的隐式搜索 “`.`”。

### 库的微小变更 {#minor_library_changes}

一如既往，库中有各种微小变更和更新，
这些变更都遵循 Go 1 的[兼容性承诺](/doc/go1compat)。
此外还有各种性能改进，此处不一一列举。

#### [archive/zip](/pkg/archive/zip/)

<!-- CL 387976 -->
[`Reader`](/pkg/archive/zip/#Reader)
现在会忽略 ZIP 文件开头的非 ZIP 数据，这与大多数其他实现的行为一致。
这对于读取某些 Java JAR 文件等用途是必要的。

<!-- archive/zip -->

#### [crypto/elliptic](/pkg/crypto/elliptic/)

<!-- CL 382995 -->
操作无效的曲线点（即 `IsOnCurve` 方法返回 false，且从未被 `Unmarshal` 或作用于有效点的 `Curve` 方法返回的点）一直是未定义行为，并可能导致密钥恢复攻击。如果向
[`Marshal`](/pkg/crypto/elliptic/#Marshal)、
[`MarshalCompressed`](/pkg/crypto/elliptic/#MarshalCompressed)、
[`Add`](/pkg/crypto/elliptic/#Curve.Add)、
[`Double`](/pkg/crypto/elliptic/#Curve.Double) 或
[`ScalarMult`](/pkg/crypto/elliptic/#Curve.ScalarMult) 提供了无效的点，
这些方法现在将触发 panic。

<!-- golang.org/issue/52182 -->
在 `P224`、`P384` 和 `P521` 曲线上的 `ScalarBaseMult` 操作现在速度提高了最多三倍，这使得一些 ECDSA 操作也获得了类似的速度提升。通用的（非平台优化的）`P256` 实现已被替换为一个源自形式化验证模型的实现；这可能导致在 32 位平台上性能显著下降。

<!-- crypto/elliptic -->

#### [crypto/rand](/pkg/crypto/rand/)

<!-- CL 370894 -->
<!-- CL 390038 -->
[`Read`](/pkg/crypto/rand/#Read) 不再在调用之间缓冲从操作系统获取的随机数据。以高频率执行许多小读取操作的应用程序可能会出于性能原因选择将
[`Reader`](/pkg/crypto/rand/#Reader) 包装在
[`bufio.Reader`](/pkg/bufio/#Reader) 中，并注意使用
[`io.ReadFull`](/pkg/io/#ReadFull) 以确保不会发生部分读取。

<!-- CL 375215 -->
在 Plan 9 上，`Read` 已被重新实现，用快速密钥擦除生成器取代了 ANSI X9.31 算法。

<!-- CL 391554 -->
<!-- CL 387554 -->
[`Prime`](/pkg/crypto/rand/#Prime) 的实现已被更改为仅使用拒绝采样法，这消除了在非加密上下文中生成小素数时的偏差，消除了一个可能的轻微时序泄漏，并更好地使行为与 BoringSSL 保持一致，同时也简化了实现。
此更改确实会导致对于给定的随机源流，与之前的实现相比产生不同的输出，这可能会破坏那些期望特定确定性随机源产生特定结果的测试。
为了帮助防止将来出现此类问题，该实现现在对输入流有意是非确定性的。

<!-- crypto/rand -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 400974 -->
<!-- https://go.dev/issue/45428 -->
`GODEBUG` 选项 `tls10default=1` 已被移除。仍然可以通过设置
[`Config.MinVersion`](/pkg/crypto/tls/#Config.MinVersion) 来启用客户端的 TLS 1.0。

<!-- CL 384894 -->
TLS 服务器和客户端现在会拒绝 TLS 握手中的重复扩展，这符合 RFC 5246 第 7.4.1.4 节和 RFC 8446 第 4.2 节的要求。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 285872 -->
[`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate)
不再支持创建 `SignatureAlgorithm` 设置为 `MD5WithRSA` 的证书。

<!-- CL 400494 -->
`CreateCertificate` 不再接受负序列号。

<!-- CL 399827 -->
当生成的证书没有扩展时，`CreateCertificate` 将不再发出空的 SEQUENCE。

<!-- CL 396774 -->
移除 `GODEBUG` 选项 `x509sha1=1` 的计划（原定于 Go 1.19）已被重新安排到未来的版本。使用它的应用程序应着手迁移。针对 SHA-1 的实际攻击自 2017 年以来已被证明，并且自 2015 年以来，受公开信任的证书颁发机构已不再颁发 SHA-1 证书。<!-- CL 383215 -->
[`ParseCertificate`](/pkg/crypto/x509/#ParseCertificate) 和 [`ParseCertificateRequest`](/pkg/crypto/x509/#ParseCertificateRequest) 现在会拒绝包含重复扩展项的证书和证书签名请求。

<!-- https://go.dev/issue/46057 -->
<!-- https://go.dev/issue/35044 -->
<!-- CL 398237 -->
<!-- CL 400175 -->
<!-- CL 388915 -->
新增的 [`CertPool.Clone`](/pkg/crypto/x509/#CertPool.Clone) 和 [`CertPool.Equal`](/pkg/crypto/x509/#CertPool.Equal) 方法分别允许克隆一个 `CertPool` 以及检查两个 `CertPool` 的等价性。

<!-- https://go.dev/issue/50674 -->
<!-- CL 390834 -->
新增的函数 [`ParseRevocationList`](/pkg/crypto/x509/#ParseRevocationList) 提供了一个更快、更安全的证书吊销列表解析器，它返回一个 [`RevocationList`](/pkg/crypto/x509/#RevocationList)。解析 CRL 同时也会填充 `RevocationList` 的新字段 `RawIssuer`、`Signature`、`AuthorityKeyId` 和 `Extensions`，这些字段会被 [`CreateRevocationList`](/pkg/crypto/x509/#CreateRevocationList) 忽略。

新增的方法 [`RevocationList.CheckSignatureFrom`](/pkg/crypto/x509/#RevocationList.CheckSignatureFrom) 用于检查 CRL 上的签名是否来自一个有效的 [`Certificate`](/pkg/crypto/x509/#Certificate)。

[`ParseCRL`](/pkg/crypto/x509/#ParseCRL) 和 [`ParseDERCRL`](/pkg/crypto/x509/#ParseDERCRL) 函数现已弃用，建议改用 `ParseRevocationList`。[`Certificate.CheckCRLSignature`](/pkg/crypto/x509/#Certificate.CheckCRLSignature) 方法也已弃用，建议改用 `RevocationList.CheckSignatureFrom`。

<!-- CL 389555, CL 401115, CL 403554 -->
[`Certificate.Verify`](/pkg/crypto/x509/#Certificate.Verify) 的路径构建器已彻底改进，现在应能在复杂场景中产生更好的链和/或更高效。名称约束现在也会在非叶子证书上强制执行。

<!-- crypto/x509 -->

#### [crypto/x509/pkix](/pkg/crypto/x509/pkix/)

<!-- CL 390834 -->
类型 [`CertificateList`](/pkg/crypto/x509/pkix/#CertificateList) 和 [`TBSCertificateList`](/pkg/crypto/x509/pkix/#TBSCertificateList) 已弃用。应改用新的 [`crypto/x509` CRL 功能](#crypto/x509)。

<!-- crypto/x509/pkix -->

#### [debug/elf](/pkg/debug/elf/)

<!-- CL 396735 -->
新增的 `EM_LOONGARCH` 和 `R_LARCH_*` 常量支持龙芯64位架构移植。

<!-- debug/elf -->

#### [debug/pe](/pkg/debug/pe/)

<!-- https://go.dev/issue/51868 -->
<!-- CL 394534 -->
新增的方法 [`File.COFFSymbolReadSectionDefAux`](/pkg/debug/pe/#File.COFFSymbolReadSectionDefAux) 返回一个 [`COFFSymbolAuxFormat5`](/pkg/debug/pe/#COFFSymbolAuxFormat5)，提供对 PE 文件节中 COMDAT 信息的访问。这些由新增的 `IMAGE_COMDAT_*` 和 `IMAGE_SCN_*` 常量支持。

<!-- debug/pe -->

#### [encoding/binary](/pkg/encoding/binary/)

<!-- https://go.dev/issue/50601 -->
<!-- CL 386017 -->
<!-- CL 389636 -->
新增的接口 [`AppendByteOrder`](/pkg/encoding/binary/#AppendByteOrder) 提供了将 `uint16`、`uint32` 或 `uint64` 高效追加到字节切片的方法。[`BigEndian`](/pkg/encoding/binary/#BigEndian) 和 [`LittleEndian`](/pkg/encoding/binary/#LittleEndian) 现在实现了该接口。

<!-- https://go.dev/issue/51644 -->
<!-- CL 400176 -->
类似地，新增的函数 [`AppendUvarint`](/pkg/encoding/binary/#AppendUvarint) 和 [`AppendVarint`](/pkg/encoding/binary/#AppendVarint) 是 [`PutUvarint`](/pkg/encoding/binary/#PutUvarint) 和 [`PutVarint`](/pkg/encoding/binary/#PutVarint) 的高效追加版本。

<!-- encoding/binary -->

#### [encoding/csv](/pkg/encoding/csv/)

<!-- https://go.dev/issue/43401 -->
<!-- CL 405675 -->
新增的方法 [`Reader.InputOffset`](/pkg/encoding/csv/#Reader.InputOffset) 以字节偏移量的形式报告读取器的当前输入位置，类似于 `encoding/json` 的 [`Decoder.InputOffset`](/pkg/encoding/json/#Decoder.InputOffset)。

<!-- encoding/csv -->

#### [encoding/xml](/pkg/encoding/xml/)

<!-- https://go.dev/issue/45628 -->
<!-- CL 311270 -->
新增的方法 [`Decoder.InputPos`](/pkg/encoding/xml/#Decoder.InputPos) 以行号和列号的形式报告读取器的当前输入位置，类似于 `encoding/csv` 的 [`Decoder.FieldPos`](/pkg/encoding/csv/#Decoder.FieldPos)。

<!-- encoding/xml -->

#### [flag](/pkg/flag/)

<!-- https://go.dev/issue/45754 -->
<!-- CL 313329 -->
新增的函数 [`TextVar`](/pkg/flag/#TextVar) 定义一个值实现了 [`encoding.TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler) 的标志，允许命令行标志变量拥有 [`big.Int`](/pkg/math/big/#Int)、[`netip.Addr`](/pkg/net/netip/#Addr) 和 [`time.Time`](/pkg/time/#Time) 等类型。

<!-- flag -->

#### [fmt](/pkg/fmt/)

<!-- https://go.dev/issue/47579 -->
<!-- CL 406177 -->
新增的函数 [`Append`](/pkg/fmt/#Append)、[`Appendf`](/pkg/fmt/#Appendf) 和 [`Appendln`](/pkg/fmt/#Appendln) 将格式化数据追加到字节切片。

<!-- fmt -->

#### [go/parser](/pkg/go/parser/)

<!-- CL 403696 -->
解析器现在识别 `~x` 为使用操作符 [token.TILDE](/pkg/go/token/#TILDE) 的一元表达式，从而在类型约束（如 `~int`）在错误上下文中使用时能更好地恢复错误。

<!-- go/parser -->

#### [go/types](/pkg/go/types/)

<!-- https://go.dev/issue/51682 -->
<!-- CL 395535 -->
新增的方法 [`Func.Origin`](/pkg/go/types/#Func.Origin) 和 [`Var.Origin`](/pkg/go/types/#Var.Origin) 返回在类型实例化期间创建的合成 [`Func`](/pkg/go/types/#Func) 和 [`Var`](/pkg/go/types/#Var) 对象所对应的泛型类型的 [`Object`](/pkg/go/types/#Object)。

<!-- https://go.dev/issue/52728 -->
<!-- CL 404885 -->
不再可能通过递归调用 [`Named.Underlying`](/pkg/go/types/#Named.Underlying) 或 [`Named.Method`](/pkg/go/types/#Named.Method) 来产生无限多个不同但相同的 [`Named`](/pkg/go/types/#Named) 类型实例。

<!-- go/types -->

#### [hash/maphash](/pkg/hash/maphash/)<!-- https://go.dev/issue/42710 -->
<!-- CL 392494 -->
新增的 [`Bytes`](/pkg/hash/maphash/#Bytes) 和 [`String`](/pkg/hash/maphash/#String) 函数提供了一种高效的方式来对单个字节切片或字符串进行哈希运算。它们相当于使用更通用的 [`Hash`](/pkg/hash/maphash/#Hash) 进行单次写入操作，但对于小型输入避免了设置开销。

<!-- hash/maphash -->

#### [html/template](/pkg/html/template/)

<!-- https://go.dev/issue/46121 -->
<!-- CL 389156 -->
类型 [`FuncMap`](/pkg/html/template/#FuncMap) 现在是 `text/template` 包中 [`FuncMap`](/pkg/text/template/#FuncMap) 的别名，而不是其自身的命名类型。这使得编写操作来自任一环境的 `FuncMap` 的代码成为可能。

<!-- https://go.dev/issue/59153 -->
<!-- CL 481987 -->
Go 1.19.8 及更高版本[禁止在 ECMAScript 6 模板字面量中使用操作符](/pkg/html/template#hdr-Security_Model)。可以通过 `GODEBUG=jstmpllitinterp=1` 设置来恢复此行为。

<!-- html/template -->

#### [image/draw](/pkg/image/draw/)

<!-- CL 396795 -->
使用 [`Src`](/pkg/image/draw/#Src) 操作符的 [`Draw`](/pkg/image/draw/#Draw) 函数，在目标图像和源图像均为 [`image.NRGBA`](/pkg/image/#NRGBA) 或均为 [`image.NRGBA64`](/pkg/image/#NRGBA64) 时，现在会保留非预乘 alpha 颜色。这回滚了由 Go 1.18 库优化意外引入的行为变更；现在的代码行为与 Go 1.17 及更早版本匹配。

<!-- image/draw -->

#### [io](/pkg/io/)

<!-- https://go.dev/issue/51566 -->
<!-- CL 400236 -->
当其输入实现了 [`WriterTo`](/pkg/io/#WriterTo) 接口时，[`NopCloser`](/pkg/io/#NopCloser) 的结果现在也实现了该接口。

<!-- https://go.dev/issue/50842 -->
[`MultiReader`](/pkg/io/#MultiReader) 的结果现在无条件地实现了 [`WriterTo`](/pkg/io/#WriterTo)。如果任何底层读取器未实现 `WriterTo`，它会进行适当的模拟。

<!-- io -->

#### [mime](/pkg/mime/)

<!-- CL 406894 -->
仅在 Windows 上，mime 包现在会忽略记录 `.js` 扩展名应具有 MIME 类型 `text/plain` 的注册表项。这是 Windows 系统上常见的无意错误配置。其效果是 `.js` 将使用默认的 MIME 类型 `text/javascript; charset=utf-8`。期望在 Windows 上使用 `text/plain` 的应用程序现在必须显式调用 [`AddExtensionType`](/pkg/mime/#AddExtensionType)。

<!-- mime -->

#### [mime/multipart](/pkg/mime/multipart)

<!-- https://go.dev/issue/59153 -->
<!-- CL 481985 -->
在 Go 1.19.8 及更高版本中，此包设置了所处理的 MIME 数据大小限制，以防范恶意输入。`Reader.NextPart` 和 `Reader.NextRawPart` 将一个部分（part）中的头部（header）数量限制为 10000 个，`Reader.ReadForm` 将所有 `FileHeaders` 中的头部总数限制为 10000 个。这些限制可以通过 `GODEBUG=multipartmaxheaders` 设置进行调整。`Reader.ReadForm` 进一步将表单中的部分数量限制为 1000 个。此限制可以通过 `GODEBUG=multipartmaxparts` 设置进行调整。

<!-- mime/multipart -->

#### [net](/pkg/net/)

<!-- CL 386016 -->
纯 Go 解析器现在将使用 EDNS(0) 来包含一个建议的最大回复数据包长度，允许回复数据包最多包含 1232 字节（此前的最大值是 512）。在极少数情况下，如果这导致本地 DNS 解析器出现问题，设置环境变量 `GODEBUG=netdns=cgo` 以使用基于 cgo 的解析器应该可以解决。请在 [问题跟踪器](/issue/new) 上报告任何此类问题。

<!-- https://go.dev/issue/51428 -->
<!-- CL 396877 -->
当 net 包函数或方法返回"I/O 超时"错误时，该错误现在将满足 `errors.Is(err, context.DeadlineExceeded)`。当 net 包函数返回"操作被取消"错误时，该错误现在将满足 `errors.Is(err, context.Canceled)`。这些更改旨在使代码更容易测试上下文取消或超时导致 net 包函数或方法返回错误的情况，同时保持错误消息的向后兼容性。

<!-- https://go.dev/issue/33097 -->
<!-- CL 400654 -->
[`Resolver.PreferGo`](/pkg/net/#Resolver.PreferGo) 现在在 Windows 和 Plan 9 上实现。此前它仅在 Unix 平台上有效。结合 [`Dialer.Resolver`](/pkg/net/#Dialer.Resolver) 和 [`Resolver.Dial`](/pkg/net/#Resolver.Dial)，现在可以编写可移植的程序，并在拨号时控制所有 DNS 名称查找。

`net` 包现在在 Windows 上对 `netgo` 构建标签提供初始支持。使用该标签时，包将使用 Go DNS 客户端（由 `Resolver.PreferGo` 使用），而不是向 Windows 查询 DNS 结果。然而，对于复杂的系统网络配置，它从 Windows 发现的上游 DNS 服务器可能还不正确。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 269997 -->
[`ResponseWriter.WriteHeader`](/pkg/net/http/#ResponseWriter) 现在支持发送用户自定义的 1xx 信息性头部。

<!-- CL 361397 -->
[`MaxBytesReader`](/pkg/net/http/#MaxBytesReader) 返回的 `io.ReadCloser` 在超过其读取限制时，现在将返回定义的错误类型 [`MaxBytesError`](/pkg/net/http/#MaxBytesError)。

<!-- CL 375354 -->
HTTP 客户端将处理没有 `Location` 头部的 3xx 响应，将其返回给调用者，而不是将其视为错误。

<!-- net/http -->

#### [net/url](/pkg/net/url/)

<!-- CL 374654 -->
新增的 [`JoinPath`](/pkg/net/url/#JoinPath) 函数和 [`URL.JoinPath`](/pkg/net/url/#URL.JoinPath) 方法通过连接一系列路径元素来创建一个新的 `URL`。

<!-- https://go.dev/issue/46059 -->
`URL` 类型现在区分了没有授权部分（authority）的 URL 和具有空授权部分的 URL。例如，`http:///path` 具有空授权部分（主机），而 `http:/path` 则没有。

新的 [`URL`](/pkg/net/url/#URL) 字段 `OmitHost` 在 `URL` 具有空授权部分时被设置为 `true`。

<!-- net/url -->

#### [os/exec](/pkg/os/exec/)<!-- https://go.dev/issue/50599 -->
<!-- CL 401340 -->
一个 `Dir` 字段非空且 `Env` 字段为 nil 的 [`Cmd`](/pkg/os/exec/#Cmd) 现在会隐式地为子进程设置 `PWD` 环境变量，使其与 `Dir` 相匹配。

新的方法 [`Cmd.Environ`](/pkg/os/exec/#Cmd.Environ) 现在会报告用于运行该命令的环境变量，其中包含了隐式设置的 `PWD` 变量。

<!-- os/exec -->

#### [reflect](/pkg/reflect/)

<!-- https://go.dev/issue/47066 -->
<!-- CL 357331 -->
方法 [`Value.Bytes`](/pkg/reflect/#Value.Bytes) 现在除了接受切片（slice）外，还接受可寻址的数组（array）。

<!-- CL 400954 -->
方法 [`Value.Len`](/pkg/reflect/#Value.Len) 和 [`Value.Cap`](/pkg/reflect/#Value.Cap) 现在可以成功地作用于指向数组的指针（pointer）并返回该数组的长度，这与内置的 [`len` 和 `cap` 函数](/ref/spec#Length_and_capacity)的行为保持一致。

<!-- reflect -->

#### [regexp/syntax](/pkg/regexp/syntax/)

<!-- https://go.dev/issue/51684 -->
<!-- CL 401076 -->
Go 1.18 候选发布版 1、Go 1.17.8 和 Go 1.16.15 包含一个针对正则表达式解析器的安全性修复，该修复使其拒绝嵌套层数极深的表达式。由于 Go 的补丁版本不会引入新的 API，解析器在此情况下返回的是 [`syntax.ErrInternalError`](/pkg/regexp/syntax/#ErrInternalError)。Go 1.19 添加了一个更具体的错误 [`syntax.ErrNestingDepth`](/pkg/regexp/syntax/#ErrNestingDepth)，解析器现在将返回此错误来代替之前的。

<!-- regexp -->

#### [runtime](/pkg/runtime/)

<!-- https://go.dev/issue/51461 -->
当使用 `-trimpath` 标志编译二进制文件，并且进程环境中未设置 `GOROOT` 变量时，[`GOROOT`](/pkg/runtime/#GOROOT) 函数现在返回空字符串（而不是 `"go"`）。

<!-- runtime -->

#### [runtime/metrics](/pkg/runtime/metrics/)

<!-- https://go.dev/issue/47216 -->
<!-- CL 404305 -->
新的 `/sched/gomaxprocs:threads` [度量指标](/pkg/runtime/metrics/#hdr-Supported_metrics) 报告当前的 [`runtime.GOMAXPROCS`](/pkg/runtime/#GOMAXPROCS) 值。

<!-- https://go.dev/issue/47216 -->
<!-- CL 404306 -->
新的 `/cgo/go-to-c-calls:calls` [度量指标](/pkg/runtime/metrics/#hdr-Supported_metrics) 报告从 Go 调用 C 的总次数。该度量指标与 [`runtime.NumCgoCall`](/pkg/runtime/#NumCgoCall) 函数功能相同。

<!-- https://go.dev/issue/48409 -->
<!-- CL 403614 -->
新的 `/gc/limiter/last-enabled:gc-cycle` [度量指标](/pkg/runtime/metrics/#hdr-Supported_metrics) 报告 GC CPU 限制器最后启用时所在的 GC 周期。关于 GC CPU 限制器的详细信息，请参见 [runtime 相关说明](#runtime)。

<!-- runtime/metrics -->

#### [runtime/pprof](/pkg/runtime/pprof/)

<!-- https://go.dev/issue/33250 -->
<!-- CL 387415 -->
当收集 goroutine 配置文件时，全局暂停（stop-the-world）的暂停时间已显著减少，从而降低了对应用程序的整体延迟影响。

<!-- CL 391434 -->
`MaxRSS` 现在会在所有 Unix 操作系统的堆配置文件中报告（之前仅在 `GOOS=android`、`darwin`、`ios` 和 `linux` 时报告）。

<!-- runtime/pprof -->

#### [runtime/race](/pkg/runtime/race/)

<!-- https://go.dev/issue/49761 -->
<!-- CL 333529 -->
竞态检测器（race detector）已升级，现在在所有受支持的平台上都使用线程消毒器（thread sanitizer）版本 v3，但 `windows/amd64` 和 `openbsd/amd64` 除外，它们仍然使用 v2。与 v2 相比，新版本通常快 1.5 到 2 倍，内存使用量减少一半，并且支持无限数量的 goroutine。在 Linux 上，竞态检测器现在至少需要 glibc 2.17 版本和 GNU binutils 2.26 版本。

<!-- CL 336549 -->
竞态检测器现在支持 `GOARCH=s390x` 平台。

<!-- https://go.dev/issue/52090 -->
线程消毒器的上游项目已移除了对 `openbsd/amd64` 平台的竞态检测支持，因此该平台很可能永远无法从 v2 更新。

<!-- runtime/race -->

#### [runtime/trace](/pkg/runtime/trace/)

<!-- CL 400795 -->
当同时启用执行跟踪和 [CPU 分析器](/pkg/runtime/pprof/#StartCPUProfile)时，执行跟踪将包含 CPU 分析采样作为瞬时事件。

<!-- runtime/trace -->

#### [sort](/pkg/sort/)

<!-- CL 371574 -->
排序算法已重写，使用 [模式击败快速排序（pattern-defeating quicksort）](https://arxiv.org/pdf/2106.05123.pdf)。对于多种常见场景，该算法更快。

<!-- https://go.dev/issue/50340 -->
<!-- CL 396514 -->
新的函数 [`Find`](/pkg/sort/#Find) 类似于 [`Search`](/pkg/sort/#Search)，但通常更容易使用：它会额外返回一个布尔值，报告是否找到了相等的值。

<!-- sort -->

#### [strconv](/pkg/strconv/)

<!-- CL 397255 -->
[`Quote`](/pkg/strconv/#Quote) 及相关函数现在将码位 U+007F 引用为 `\x7f`，而不是 `\u007f`，以便与其他 ASCII 值保持一致。

<!-- strconv -->

#### [syscall](/pkg/syscall/)

<!-- https://go.dev/issue/51192 -->
<!-- CL 385796 -->
在 PowerPC 架构（`GOARCH=ppc64`, `ppc64le`）上，[`Syscall`](/pkg/syscall/#Syscall)、[`Syscall6`](/pkg/syscall/#Syscall6)、[`RawSyscall`](/pkg/syscall/#RawSyscall) 和 [`RawSyscall6`](/pkg/syscall/#RawSyscall6) 现在对于返回值 `r2` 总是返回 0，而不是未定义的值。

<!-- CL 391434 -->
在 AIX 和 Solaris 上，现在定义了 [`Getrusage`](/pkg/syscall/#Getrusage) 函数。

<!-- syscall -->

#### [time](/pkg/time/)

<!-- https://go.dev/issue/51414 -->
<!-- CL 393515 -->
新的方法 [`Duration.Abs`](/pkg/time/#Duration.Abs) 提供了一种便捷且安全的方式来获取时间段的绝对值，它会将 −2⁶³ 转换为 2⁶³−1。（这种边界情况可能发生在从零时间减去一个近期时间时。）

<!-- https://go.dev/issue/50062 -->
<!-- CL 405374 -->
新的方法 [`Time.ZoneBounds`](/pkg/time/#Time.ZoneBounds) 返回给定时间点生效的时区的起始和结束时间。它可以与循环结合使用，以枚举某个给定位置的所有已知时区转换点。

<!-- time --><!-- 屏蔽来自 x/build/cmd/relnote 的以下误报： -->
<!-- CL 382460 -->
<!-- CL 384154 -->
<!-- CL 384554 -->
<!-- CL 392134 -->
<!-- CL 392414 -->
<!-- CL 396215 -->
<!-- CL 403058 -->
<!-- CL 410133 -->
<!-- https://go.dev/issue/27837 -->
<!-- https://go.dev/issue/38340 -->
<!-- https://go.dev/issue/42516 -->
<!-- https://go.dev/issue/45713 -->
<!-- https://go.dev/issue/46654 -->
<!-- https://go.dev/issue/48257 -->
<!-- https://go.dev/issue/50447 -->
<!-- https://go.dev/issue/50720 -->
<!-- https://go.dev/issue/50792 -->
<!-- https://go.dev/issue/51115 -->
<!-- https://go.dev/issue/51447 -->