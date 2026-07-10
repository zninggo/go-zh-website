---
title: Go 1.25 发行说明
---

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.25 简介 {#introduction}

最新的 Go 发行版 1.25 版本将于 [2025年8月](/doc/devel/release#go1.25.0) 发布，距离 [Go 1.24](/doc/go1.24) 发布六个月。其大部分变更集中在工具链、运行时和库的实现上。一如既往，此版本遵守 Go 1 的兼容性承诺。我们预计几乎所有 Go 程序都能像之前一样继续编译和运行。

## 语言变更 {#language}

<!-- go.dev/issue/70128 -->

Go 1.25 中没有影响 Go 程序的语言变更。然而，在[语言规范](/ref/spec)中，**核心类型（core types）** 的概念已被移除，取而代之的是专门的文字描述。更多信息请参阅相关的[博客文章](/blog/coretypes)。

## 工具 {#tools}

### Go 命令 {#go-command}

`go build` 的 `-asan` 选项现在默认在程序退出时执行泄漏检测。如果由 C 分配的内存未被释放，且未被任何其他由 C 或 Go 分配的内存引用，此功能将报告错误。通过设置环境变量 `ASAN_OPTIONS=detect_leaks=0`，可以在运行程序时禁用这些新的错误报告。

<!-- go.dev/issue/71867 -->
Go 发行包将包含更少的预构建工具二进制文件。核心工具链二进制文件（如编译器和链接器）仍将包含，但那些未被构建或测试操作调用的工具将根据需要由 `go tool` 构建并运行。

<!-- go.dev/issue/42965 -->
新的 `go.mod` `ignore` [指令](/ref/mod#go-mod-file-ignore)可用于指定 `go` 命令应忽略的目录。这些目录及其子目录中的文件在匹配包模式（如 `all` 或 `./...`）时将被 `go` 命令忽略，但仍会包含在模块压缩文件中。

<!-- go.dev/issue/68106 -->
新的 `go doc` `-http` 选项将启动一个文档服务器，显示所请求对象的文档，并在浏览器窗口中打开该文档。

<!-- go.dev/issue/69712 -->

新的 `go version -m -json` 选项将打印嵌入在给定 Go 二进制文件中的 `runtime/debug.BuildInfo` 结构体的 JSON 编码。

<!-- go.dev/issue/34055 -->
`go` 命令现在支持使用仓库的子目录作为模块根目录的路径，[解析模块路径](/ref/mod#vcs-find)时使用语法 `<meta name="go-import" content="root-path vcs repo-url subdir">` 来表明 `root-path` 对应于 `repo-url` 的 `subdir` 子目录，版本控制系统为 `vcs`。

<!-- go.dev/issue/71294 -->

新的 `work` 包模式匹配工作区（以前称为主模块）中的所有包：在模块模式下是单个工作模块，在工作区模式下是工作区模块集合。

<!-- go.dev/issue/65847 -->

当 go 命令更新 `go.mod` 或 `go.work` 文件中的 `go` 行时，它[不再](/ref/mod#go-mod-file-toolchain)添加一个指定该命令当前版本的 `toolchain` 行。

### Vet {#vet}

`go vet` 命令包含了新的分析器：

<!-- go.dev/issue/18022 -->

- [waitgroup](https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/waitgroup)，报告对 [`sync.WaitGroup.Add`](/pkg/sync#WaitGroup.Add) 的错误调用；以及

<!-- go.dev/issue/28308 -->

- [hostport](https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/hostport)，报告使用 `fmt.Sprintf("%s:%d", host, port)` 来构造 [`net.Dial`](/pkg/net#Dial) 地址的做法，因为这些在 IPv6 下将无法工作；该分析器建议使用 [`net.JoinHostPort`](/pkg/net#JoinHostPort)。

## 运行时 {#runtime}

### 容器感知的 `GOMAXPROCS`

<!-- go.dev/issue/73193 -->

`GOMAXPROCS` 的默认行为已改变。在之前的 Go 版本中，`GOMAXPROCS` 默认为启动时可用的逻辑 CPU 数量（[`runtime.NumCPU`](/pkg/runtime#NumCPU)）。Go 1.25 引入了两项变更：

1.  在 Linux 上，运行时会考虑包含该进程的 cgroup 的 CPU 带宽限制（如果存在）。如果 CPU 带宽限制低于可用逻辑 CPU 数量，`GOMAXPROCS` 将默认为较低的限制值。在像 Kubernetes 这样的容器运行时系统中，cgroup CPU 带宽限制通常对应于"CPU limit"选项。Go 运行时不考虑"CPU requests"选项。

2.  在所有操作系统上，如果可用逻辑 CPU 数量或 cgroup CPU 带宽限制发生变化，运行时会定期更新 `GOMAXPROCS`。

如果通过 `GOMAXPROCS` 环境变量或调用 [`runtime.GOMAXPROCS`](/pkg/runtime#GOMAXPROCS) 手动设置了 `GOMAXPROCS`，这两种行为都会自动禁用。也可以分别通过 [GODEBUG 设置](/doc/godebug) `containermaxprocs=0` 和 `updatemaxprocs=0` 显式禁用。

为了支持读取更新的 cgroup 限制，运行时会在进程生命周期内保持 cgroup 文件的缓存文件描述符。

### 新的实验性垃圾回收器

<!-- go.dev/issue/73581 -->

一个新的垃圾回收器现已作为实验功能提供。此垃圾回收器的设计通过更好的局部性和 CPU 可扩展性，提高了标记和扫描小型对象的性能。基准测试结果各不相同，但我们预计在大量使用垃圾回收器的真实世界程序中，垃圾回收开销将减少 10-40% 左右。

可以通过在构建时设置 `GOEXPERIMENT=greenteagc` 来启用新的垃圾回收器。我们预计其设计将继续发展和改进。为此，我们鼓励 Go 开发者试用并反馈他们的使用体验。有关设计和分享反馈的说明，请参阅 [GitHub issue](/issue/73581)。

### 跟踪飞行记录器

<!-- go.dev/issue/63185 -->[运行时执行跟踪](/pkg/runtime/trace)长期以来提供了一种强大但开销较大的方式，用于理解和调试应用程序的底层行为。然而，由于其体积庞大且持续写入执行跟踪的成本高昂，它们通常不适用于调试罕见事件。

新增的 [`runtime/trace.FlightRecorder`](/pkg/runtime/trace#FlightRecorder) API 提供了一种轻量级的运行时执行跟踪捕获方式，它通过将跟踪数据持续记录到内存中的环形缓冲区来实现。当发生重要事件时，程序可以调用 [`FlightRecorder.WriteTo`](/pkg/runtime/trace#FlightRecorder.WriteTo) 将最近几秒的跟踪数据快照到文件。这种方式通过让应用程序只捕获重要的跟踪数据，从而生成了体积小得多的跟踪文件。

[`FlightRecorder`](/pkg/runtime/trace#FlightRecorder) 捕获的时间长度和数据量可以通过 [`FlightRecorderConfig`](/pkg/runtime/trace#FlightRecorderConfig) 进行配置。

### 未处理的 panic 输出变更

<!-- go.dev/issue/71517 -->

当程序因一个已被恢复（recover）后又重新抛出（repanic）的未处理 panic 而退出时，其打印的消息不再重复 panic 值的文本。

此前，一个程序执行 `panic("PANIC")`，恢复该 panic，然后以原值重新抛出 panic，会打印：

    panic: PANIC [recovered]
      panic: PANIC

现在，该程序将打印：

    panic: PANIC [recovered, repanicked]

### Linux 上的 VMA 命名

<!-- go.dev/issue/71546 -->

在支持匿名虚拟内存区域（VMA）命名（`CONFIG_ANON_VMA_NAME`）的内核 Linux 系统上，Go 运行时将为匿名内存映射添加关于其用途的上下文注释。例如，堆内存将标记为 `[anon: Go: heap]`。此功能可通过 [GODEBUG 设置](/doc/godebug) `decoratemappings=0` 禁用。

## 编译器 {#compiler}

### `nil` 指针 bug

<!-- https://go.dev/issue/72860, CL 657715 -->

此版本修复了一个 [编译器 bug](/issue/72860)，该 bug 自 Go 1.21 引入，可能导致 nil 指针检查被错误地延迟。像下面这样曾经（错误地）成功执行的程序，现在将（正确地）因 nil 指针异常而发生 panic：

```go
var f *os.File // 值为 nil
f, err := os.Open("foo")
// 此处应检查 err 是否为 nil
// 因为若 err 非 nil，f 可能为 nil
name := f.Name() // 若 f 为 nil，此处应 panic
``````
package main

import "os"

func main() {
	f, err := os.Open("nonExistentFile")
	name := f.Name()
	if err != nil {
		return
	}
	println(name)
}
```该程序存在问题，因为它在检查错误之前就使用了 `os.Open` 的结果。如果 `err` 不为 nil，那么结果 `f` 可能为 nil，此时 `f.Name()` 应该触发 panic。然而，在 Go 1.21 到 1.24 版本中，编译器错误地将空值检查延迟到错误检查*之后*，导致程序能够成功执行，这违反了 Go 语言规范。在 Go 1.25 中，该程序将不再能成功运行。如果此变更影响了你的代码，解决方案是将非空错误检查提前到代码中的更早位置，最好是在产生错误的语句之后立即进行。

### DWARF5 支持

<!-- https://go.dev/issue/26379 -->

Go 1.25 中的编译器和链接器现在使用 [DWARF 5](https://dwarfstd.org/dwarf5std.html) 版本生成调试信息。更新的 DWARF 版本减少了 Go 二进制文件中调试信息所需的空间，并缩短了链接时间，尤其是对于大型 Go 二进制文件。可以通过在构建时设置环境变量 `GOEXPERIMENT=nodwarf5` 来禁用 DWARF 5 的生成（此回退选项可能在未来的 Go 版本中移除）。

### 更快的切片操作

<!-- CLs 653856, 657937, 663795, 664299 -->

编译器现在可以在更多情况下在栈上为切片分配后备存储，这提高了性能。此变更有可能会放大不正确使用 [unsafe.Pointer](/pkg/unsafe#Pointer) 的影响，例如参见 [issue 73199](/issue/73199)。为了追踪这些问题，可以使用 [bisect 工具](https://pkg.go.dev/golang.org/x/tools/cmd/bisect) 配合 `-compile=variablemake` 标志来找出引起问题的分配。所有此类新的栈分配也可以通过 `-gcflags=all=-d=variablemakehash=n` 禁用。

## 链接器 {#linker}

<!-- CL 660996 -->

链接器现在接受 `-funcalign=N` 命令行选项，用于指定函数条目的对齐方式。默认值取决于平台，在此版本中保持不变。

## 标准库 {#library}

### 新的 testing/synctest 包

<!-- go.dev/issue/67434, go.dev/issue/73567 -->
新的 [`testing/synctest`](/pkg/testing/synctest) 包为测试并发代码提供了支持。

[`Test`](/pkg/testing/synctest#Test) 函数在一个隔离的“气泡”中运行测试函数。在气泡内，时间是虚拟化的：[`time`](/pkg/time) 包函数操作一个模拟时钟，并且如果气泡中的所有协程都被阻塞，时钟会瞬时前进。

[`Wait`](/pkg/testing/synctest#Wait) 函数等待当前气泡中的所有协程阻塞。

此包最初在 Go 1.24 中作为实验性功能（`GOEXPERIMENT=synctest`）提供，其 API 与现在略有不同。该实验现已正式发布。如果设置了 `GOEXPERIMENT=synctest`，旧的 API 仍然可用，但将在 Go 1.26 中移除。

### 新的实验性 encoding/json/v2 包 {#json_v2}

Go 1.25 包含一个新的、实验性的 JSON 实现，可以通过在构建时设置环境变量 `GOEXPERIMENT=jsonv2` 来启用。

启用后，将提供两个新包：
- [`encoding/json/v2`](/pkg/encoding/json/v2) 包是 `encoding/json` 包的一次重大修订。
- [`encoding/json/jsontext`](/pkg/encoding/json/jsontext) 包提供了对 JSON 语法的更底层处理。

此外，当启用 "jsonv2" GOEXPERIMENT 时：
- [`encoding/json`](/pkg/encoding/json) 包将使用新的 JSON 实现。序列化和反序列化的行为不受影响，但包函数返回的错误信息文本可能会改变。
- [`encoding/json`](/pkg/encoding/json) 包包含许多可用于配置序列化器和反序列化器的新选项。

在许多场景下，新实现的性能显著优于现有实现。通常，编码性能在两种实现之间相当，而解码性能在新实现中要快得多。更详细的分析请参见 [github.com/go-json-experiment/jsonbench](https://github.com/go-json-experiment/jsonbench) 仓库。

更多细节请参见[提案 issue](/issue/71497)。

我们鼓励 [`encoding/json`](/pkg/encoding/json) 的用户在启用 `GOEXPERIMENT=jsonv2` 的情况下测试他们的程序，以帮助检测新实现可能存在的兼容性问题。

我们预计 [`encoding/json/v2`](/pkg/encoding/json/v2) 的设计将继续演进。我们鼓励开发者尝试新的 API，并在[提案 issue](/issue/71497) 上提供反馈。

### 标准库的次要变更 {#minor_library_changes}

#### [`archive/tar`](/pkg/archive/tar/)

[`Writer.AddFS`](/pkg/archive/tar#Writer.AddFS) 的实现现在支持实现了 [`io/fs.ReadLinkFS`](/pkg/io/fs#ReadLinkFS) 的文件系统中的符号链接。

#### [`encoding/asn1`](/pkg/encoding/asn1/)

[`Unmarshal`](/pkg/encoding/asn1#Unmarshal) 和 [`UnmarshalWithParams`](/pkg/encoding/asn1#UnmarshalWithParams) 现在解析 ASN.1 类型 T61String 和 BMPString 时更一致了。这可能导致一些之前被接受的格式错误的编码现在会被拒绝。

#### [`crypto`](/pkg/crypto/)

[`MessageSigner`](/pkg/crypto#MessageSigner) 是一个新的签名接口，可由希望自行哈希待签名消息的签名器实现。同时引入了一个新函数 [`SignMessage`](/pkg/crypto#SignMessage)，它尝试将 [`Signer`](/pkg/crypto#Signer) 接口升级为 [`MessageSigner`](/pkg/crypto#MessageSigner)，如果成功则使用 [`MessageSigner.SignMessage`](/pkg/crypto#MessageSigner.SignMessage) 方法，否则使用 [`Signer.Sign`](/pkg/crypto#Signer.Sign)。当代码希望同时支持 [`Signer`](/pkg/crypto#Signer) 和 [`MessageSigner`](/pkg/crypto#MessageSigner) 时，可以使用此方法。在程序启动后更改 `fips140` [GODEBUG设置](/doc/godebug) 现在将不起作用（无效操作）。此前，文档规定不允许更改，且更改可能导致恐慌。

当AVX2指令不可用时，SHA-1、SHA-256和SHA-512在amd64架构上的速度现在变慢了。所有2015年及以后生产的服务器处理器（以及大多数其他处理器）都支持AVX2。

#### [`crypto/ecdsa`](/pkg/crypto/ecdsa/)

新增的 [`ParseRawPrivateKey`](/pkg/crypto/ecdsa#ParseRawPrivateKey)、
[`ParseUncompressedPublicKey`](/pkg/crypto/ecdsa#ParseUncompressedPublicKey)、
[`PrivateKey.Bytes`](/pkg/crypto/ecdsa#PrivateKey.Bytes) 和
[`PublicKey.Bytes`](/pkg/crypto/ecdsa#PublicKey.Bytes) 函数及方法实现了底层编码，
不再需要使用 [`crypto/elliptic`](/pkg/crypto/elliptic) 或 [`math/big`](/pkg/math/big) 的函数和方法。

启用FIPS 140-3模式时，签名速度现在快了四倍，与非FIPS模式的性能相当。

#### [`crypto/ed25519`](/pkg/crypto/ed25519/)

启用FIPS 140-3模式时，签名速度现在快了四倍，与非FIPS模式的性能相当。

#### [`crypto/elliptic`](/pkg/crypto/elliptic/)

一些 [`Curve`](/pkg/crypto/elliptic#Curve) 实现中隐藏且未文档化的 `Inverse` 和 `CombinedMult` 方法已被移除。

#### [`crypto/rsa`](/pkg/crypto/rsa/)

[`PublicKey`](/pkg/crypto/rsa#PublicKey) 不再声明模数值被视为机密。
[`VerifyPKCS1v15`](/pkg/crypto/rsa#VerifyPKCS1v15) 和 [`VerifyPSS`](/pkg/crypto/rsa#VerifyPSS) 已经警告所有输入都是公开的且可能被泄露，并且存在可以从其他公开值恢复模数的数学攻击。

密钥生成速度现在快了三倍。

#### [`crypto/sha1`](/pkg/crypto/sha1/)

当SHA-NI指令可用时，amd64架构上的哈希速度现在快了两倍。

#### [`crypto/sha3`](/pkg/crypto/sha3/)

新增的 [`SHA3.Clone`](/pkg/crypto/sha3#SHA3.Clone) 方法实现了 [`hash.Cloner`](/pkg/hash#Cloner) 接口。

在Apple M系列处理器上，哈希速度现在快了两倍。

#### [`crypto/tls`](/pkg/crypto/tls/)

新增的 [`ConnectionState.CurveID`](/pkg/crypto/tls#ConnectionState.CurveID) 字段暴露了用于建立连接的密钥交换机制。

新增的 [`Config.GetEncryptedClientHelloKeys`](/pkg/crypto/tls#Config.GetEncryptedClientHelloKeys) 回调可用于设置服务器在客户端发送加密客户端问候扩展时使用的 [`EncryptedClientHelloKey`](/pkg/crypto/tls#EncryptedClientHelloKey)。

根据 [RFC 9155](https://www.rfc-editor.org/rfc/rfc9155.html)，在TLS 1.2握手中现在禁止使用SHA-1签名算法。可以通过 [GODEBUG设置](/doc/godebug) `tlssha1=1` 重新启用。

启用 [FIPS 140-3模式](/doc/security/fips140) 时，TLS 1.2现在要求使用扩展主密钥，并且现在允许使用Ed25519和X25519MLKEM768。

TLS服务器现在优先选择最高的支持协议版本，即使该版本不是客户端最偏好的版本。

<!-- CL 687855 -->
TLS客户端和服务器现在都更严格地遵循规范并拒绝不规范的行为。与兼容的对等方连接应不受影响。

#### [`crypto/x509`](/pkg/crypto/x509/)

[`CreateCertificate`](/pkg/crypto/x509#CreateCertificate)、
[`CreateCertificateRequest`](/pkg/crypto/x509#CreateCertificateRequest) 和
[`CreateRevocationList`](/pkg/crypto/x509#CreateRevocationList) 现在除了接受 [`crypto.Signer`](/pkg/crypto#Signer) 签名接口外，还可以接受 [`crypto.MessageSigner`](/pkg/crypto#MessageSigner) 签名接口。这允许这些函数使用实现“一次性”签名接口的签名器，其中哈希作为签名操作的一部分完成，而不是由调用者完成。

如果 `SubjectKeyId` 缺失，[`CreateCertificate`](/pkg/crypto/x509#CreateCertificate) 现在使用截断的SHA-256来填充该字段。
[GODEBUG设置](/doc/godebug) `x509sha256skid=0` 可恢复使用SHA-1。

[`ParseCertificate`](/pkg/crypto/x509#ParseCertificate) 现在会拒绝包含负 pathLenConstraint 的BasicConstraints扩展的证书。

[`ParseCertificate`](/pkg/crypto/x509#ParseCertificate) 现在更一致地处理使用ASN.1 T61String和BMPString类型编码的字符串。这可能导致一些先前接受的错误编码现在被拒绝。

#### [`debug/elf`](/pkg/debug/elf/)

[`debug/elf`](/pkg/debug/elf) 包新增了两个常量：
- [`PT_RISCV_ATTRIBUTES`](/pkg/debug/elf#PT_RISCV_ATTRIBUTES)
- [`SHT_RISCV_ATTRIBUTES`](/pkg/debug/elf#SHT_RISCV_ATTRIBUTES)
  用于RISC-V ELF解析。

#### [`go/ast`](/pkg/go/ast/)

函数 [`FilterPackage`](/pkg/ast#FilterPackage)、[`PackageExports`](/pkg/ast#PackageExports)、
[`MergePackageFiles`](/pkg/ast#MergePackageFiles) 以及类型 [`MergeMode`](/pkg/go/ast#MergeMode) 及其常量均已弃用，因为它们仅用于早已弃用的 [`Object`](/pkg/ast#Object) 和 [`Package`](/pkg/ast#Package) 机制。

新增的 [`PreorderStack`](/pkg/go/ast#PreorderStack) 函数，与 [`Inspect`](/pkg/go/ast#Inspect) 类似，遍历语法树并提供对进入子树的控制，但作为一种便利，它还提供每个点处封闭节点的栈。

#### [`go/parser`](/pkg/go/parser/)

函数 [`ParseDir`](/pkg/go/parser#ParseDir) 已弃用。

#### [`go/token`](/pkg/go/token/)

新增的 [`FileSet.AddExistingFiles`](/pkg/go/token#FileSet.AddExistingFiles) 方法允许将现有的 [`File`](/pkg/go/token#File) 添加到 [`FileSet`](/pkg/go/token#FileSet) 中，或者为任意一组 [`File`](/pkg/go/token#File) 构造一个 [`FileSet`](/pkg/go/token#FileSet)，缓解了长期运行的应用程序中与单个全局 [`FileSet`](/pkg/go/token#FileSet) 相关的问题。

#### [`go/types`](/pkg/go/types/)[`Var`](/pkg/go/types#Var) 现在具有一个 [`Var.Kind`](/pkg/go/types#Var.Kind) 方法，该方法将变量分类为以下类型之一：包级别、接收者、参数、结果、局部变量或结构体字段。

新的 [`LookupSelection`](/pkg/go/types#LookupSelection) 函数用于查找给定名称和接收者类型的字段或方法，功能类似于现有的 [`LookupFieldOrMethod`](/pkg/go/types#LookupFieldOrMethod) 函数，但其结果以 [`Selection`](/pkg/go/types#Selection) 的形式返回。

#### [`hash`](/pkg/hash/)

新的 [`XOF`](/pkg/hash#XOF) 接口可由“可扩展输出函数”实现，这类函数是具有任意或无限输出长度的哈希函数，例如 [SHAKE](/pkg/crypto/sha3#SHAKE)。

实现了新 [`Cloner`](/pkg/hash#Cloner) 接口的哈希函数可以返回其状态的副本。现在，所有标准库的 [`Hash`](/pkg/hash#Hash) 实现都实现了 [`Cloner`](/pkg/hash#Cloner) 接口。

#### [`hash/maphash`](/pkg/hash/maphash/)

新的 [`Hash.Clone`](/pkg/hash/maphash#Hash.Clone) 方法实现了 [`hash.Cloner`](/pkg/hash#Cloner) 接口。

#### [`io/fs`](/pkg/io/fs/)

新的 [`ReadLinkFS`](/pkg/io/fs#ReadLinkFS) 接口提供了读取文件系统中符号链接的能力。

#### [`log/slog`](/pkg/log/slog/)

[`GroupAttrs`](/pkg/log/slog#GroupAttrs) 从一个 [`Attr`](/pkg/log/slog#Attr) 值的切片创建一个分组 [`Attr`](/pkg/log/slog#Attr)。

[`Record`](/pkg/log/slog#Record) 现在有一个 [`Source`](/pkg/log/slog#Record.Source) 方法，用于返回其源位置，如果不可用则返回 nil。

#### [`mime/multipart`](/pkg/mime/multipart/)

新的辅助函数 [`FileContentDisposition`](/pkg/mime/multipart#FileContentDisposition) 用于构建多部分（multipart）的 Content-Disposition 头字段。

#### [`net`](/pkg/net/)

[`LookupMX`](/pkg/net#LookupMX) 和 [`Resolver.LookupMX`](/pkg/net#Resolver.LookupMX) 现在会返回看起来像有效 IP 地址的 DNS 名称，以及有效的域名。此前，如果名称服务器将一个 IP 地址作为 DNS 名称返回，[`LookupMX`](/pkg/net#LookupMX) 会根据 RFC 的要求丢弃它。然而，实践中名称服务器有时确实会返回 IP 地址。

在 Windows 上，[`ListenMulticastUDP`](/pkg/net#ListenMulticastUDP) 现在支持 IPv6 地址。

在 Windows 上，现在可以在 [`os.File`](/pkg/os#File) 和网络连接之间进行转换。具体来说，[`FileConn`](/pkg/net#FileConn)、[`FilePacketConn`](/pkg/net#FilePacketConn) 和 [`FileListener`](/pkg/net#FileListener) 函数现已实现，它们返回与打开的文件对应的网络连接或监听器。类似地，[`TCPConn`](/pkg/net#TCPConn.File)、[`UDPConn`](/pkg/net#UDPConn.File)、[`UnixConn`](/pkg/net#UnixConn.File)、[`IPConn`](/pkg/net#IPConn.File)、[`TCPListener`](/pkg/net#TCPListener.File) 和 [`UnixListener`](/pkg/net#UnixListener.File) 的 `File` 方法也已实现，它们返回网络连接底层的 [`os.File`](/pkg/os#File)。

#### [`net/http`](/pkg/net/http/)

新的 [`CrossOriginProtection`](/pkg/net/http#CrossOriginProtection) 通过拒绝非安全的跨域浏览器请求来实现对[跨站请求伪造 (CSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF) 的防护。它使用[现代浏览器 Fetch 元数据](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Site)，不需要令牌或 cookie，并支持基于来源和基于模式的绕过。

#### [`os`](/pkg/os/)

在 Windows 上，[`NewFile`](/pkg/os#NewFile) 现在支持为异步 I/O 打开的句柄（即，在 [`syscall.CreateFile`](/pkg/syscall#CreateFile) 调用中指定了 [`syscall.FILE_FLAG_OVERLAPPED`](/pkg/syscall#FILE_FLAG_OVERLAPPED)）。这些句柄与 Go 运行时的 I/O 完成端口相关联，这为生成的 [`File`](/pkg/os#File) 提供了以下好处：

*   I/O 方法（[`File.Read`](/pkg/os#File.Read)、[`File.Write`](/pkg/os#File.Write)、[`File.ReadAt`](/pkg/os#File.ReadAt) 和 [`File.WriteAt`](/pkg/os#File.WriteAt)）不会阻塞操作系统线程。
*   支持截止时间方法（[`File.SetDeadline`](/pkg/os#File.SetDeadline)、[`File.SetReadDeadline`](/pkg/os#File.SetReadDeadline) 和 [`File.SetWriteDeadline`](/pkg/os#File.SetWriteDeadline)）。

此增强功能对于在 Windows 上通过命名管道进行通信的应用程序尤其有益。

请注意，一个句柄同时只能关联一个完成端口。如果提供给 [`NewFile`](/pkg/os#NewFile) 的句柄已经关联了一个完成端口，则返回的 [`File`](/pkg/os#File) 将降级为同步 I/O 模式。在这种情况下，I/O 方法将阻塞操作系统线程，并且截止时间方法无效。

由 [`DirFS`](/pkg/os#DirFS) 和 [`Root.FS`](/pkg/os#Root.FS) 返回的文件系统实现了新的 [`io/fs.ReadLinkFS`](/pkg/io/fs#ReadLinkFS) 接口。[`CopyFS`](/pkg/os#CopyFS) 在复制实现了 [`io/fs.ReadLinkFS`](/pkg/io/fs#ReadLinkFS) 的文件系统时支持符号链接。

[`Root`](/pkg/os#Root) 类型支持以下附加方法：

*   [`Root.Chmod`](/pkg/os#Root.Chmod)
*   [`Root.Chown`](/pkg/os#Root.Chown)
*   [`Root.Chtimes`](/pkg/os#Root.Chtimes)
*   [`Root.Lchown`](/pkg/os#Root.Lchown)
*   [`Root.Link`](/pkg/os#Root.Link)
*   [`Root.MkdirAll`](/pkg/os#Root.MkdirAll)
*   [`Root.ReadFile`](/pkg/os#Root.ReadFile)
*   [`Root.Readlink`](/pkg/os#Root.Readlink)
*   [`Root.RemoveAll`](/pkg/os#Root.RemoveAll)
*   [`Root.Rename`](/pkg/os#Root.Rename)
*   [`Root.Symlink`](/pkg/os#Root.Symlink)
*   [`Root.WriteFile`](/pkg/os#Root.WriteFile)

<!-- go.dev/issue/73126 的文档已作为 67002 的一部分记录 -->

#### [`reflect`](/pkg/reflect/)新的 [`TypeAssert`](/pkg/reflect#TypeAssert) 函数允许将 [`Value`](/pkg/reflect#Value) 直接转换为给定类型的 Go 值。这类似于对 [`Value.Interface`](/pkg/reflect#Value.Interface) 的结果使用类型断言，但避免了不必要的内存分配。

#### [`regexp/syntax`](/pkg/regexp/syntax/)

`\p{name}` 和 `\P{name}` 字符类语法现在接受名称 Any、ASCII、Assigned、Cn 和 LC，以及 Unicode 类别别名，例如 `\p{Letter}` 等同于 `\pL`。遵循 [Unicode TR18](https://unicode.org/reports/tr18/)，它们现在也使用不区分大小写的名称查找，并忽略空格、下划线和连字符。

#### [`runtime`](/pkg/runtime/)

由 [`AddCleanup`](/pkg/runtime#AddCleanup) 调度的清理函数现在并发且并行执行，这使得清理函数更适用于像 [`unique`](/pkg/unique) 包这样的重度使用场景。请注意，如果单个清理函数必须执行或长时间阻塞，仍然应该将其工作转移到新的协程中，以避免阻塞清理队列。

新的 `GODEBUG=checkfinalizers=1` 设置有助于发现析构器和清理函数的常见问题，例如 [GC 指南](/doc/gc-guide#Finalizers_cleanups_and_weak_pointers)中描述的那些问题。在此模式下，运行时会在每个垃圾回收周期运行诊断，并且还会定期向 stderr 报告析构器和清理队列的长度，以帮助识别长时间运行的析构器和/或清理函数的问题。有关更多详细信息，请参阅 [GODEBUG 文档](https://pkg.go.dev/runtime#hdr-Environment_Variables)。

新的 [`SetDefaultGOMAXPROCS`](/pkg/runtime#SetDefaultGOMAXPROCS) 函数将 `GOMAXPROCS` 设置为运行时默认值，就像 `GOMAXPROCS` 环境变量未设置一样。这对于启用[新的 `GOMAXPROCS` 默认值](#container-aware-gomaxprocs)很有用，如果该默认值之前被 `GOMAXPROCS` 环境变量或对 [`GOMAXPROCS`](/pkg/runtime#GOMAXPROCS) 的先前调用禁用过。

#### [`runtime/pprof`](/pkg/runtime/pprof/)

针对运行时内部锁争用的互斥锁性能分析现在正确地指向导致延迟的关键部分的末尾。这与 `sync.Mutex` 值争用的性能分析行为相匹配。允许在 Go 1.22 到 1.24 版本中针对性能分析的这一部分选择异常行为的 `GODEBUG` 的 `runtimecontentionstacks` 设置现已移除。

#### [`sync`](/pkg/sync/)

新的 [`WaitGroup.Go`](/pkg/sync#WaitGroup.Go) 方法使得创建和计数协程的常见模式更加方便。

#### [`testing`](/pkg/testing/)

新的方法 [`T.Attr`](/pkg/testing#T.Attr)、[`B.Attr`](/pkg/testing#B.Attr) 和 [`F.Attr`](/pkg/testing#F.Attr) 向测试日志中发出一个属性。属性是与测试关联的任意键值对。

例如，在名为 `TestF` 的测试中，`t.Attr("key", "value")` 将输出：```
=== ATTR  TestF key value
```使用 `-json` 标志时，属性会以新的 "attr" 动作形式出现。

<!-- go.dev/issue/59928 -->

[`T`](/pkg/testing#T)、[`B`](/pkg/testing#B) 和 [`F`](/pkg/testing#F) 的新方法 [`Output`](/pkg/testing#T.Output) 提供了一个 [`io.Writer`](/pkg/io#Writer)，它向与 [`TB.Log`](/pkg/testing#TB.Log) 相同的测试输出流写入数据。与 `TB.Log` 类似，输出内容会缩进，但不包含文件名和行号。

<!-- https://go.dev/issue/70464, CL 630137 -->
[`AllocsPerRun`](/pkg/testing#AllocsPerRun) 函数现在会在并行测试运行时触发 panic。如果其他测试正在运行，[`AllocsPerRun`](/pkg/testing#AllocsPerRun) 的结果本质上是不稳定的。新的 panic 行为有助于发现此类错误。

#### [`testing/fstest`](/pkg/testing/fstest/)

[`MapFS`](/pkg/testing/fstest#MapFS) 实现了新的 [`io/fs.ReadLinkFS`](/pkg/io/fs#ReadLinkFS) 接口。如果实现了 [`io/fs.ReadLinkFS`](/pkg/io/fs#ReadLinkFS) 接口，[`TestFS`](/pkg/testing/fstest#TestFS) 将会验证其功能。[`TestFS`](/pkg/testing/fstest#TestFS) 将不再跟踪符号链接以避免无限递归。

#### [`unicode`](/pkg/unicode/)

新的 [`CategoryAliases`](/pkg/unicode#CategoryAliases) 映射提供了对类别别名（例如 “Letter” 代表 “L”）的访问。

新的类别 [`Cn`](/pkg/unicode#Cn) 和 [`LC`](/pkg/unicode#LC) 分别定义了未分配的码点和大小写字母。这些类别一直由 Unicode 定义，但在之前的 Go 版本中被无意遗漏。[`C`](/pkg/unicode#C) 类别现在包含了 [`Cn`](/pkg/unicode#Cn)，意味着它已添加了所有未分配的码点。

#### [`unique`](/pkg/unique/)

[`unique`](/pkg/unique) 包现在更积极、更高效且并行地回收 interned 值。因此，使用 [`Make`](/pkg/unique#Make) 的应用程序在 interned 大量真正唯一的值时，现在更不容易出现内存激增问题。

之前传递给 [`Make`](/pkg/unique#Make) 的、包含 [`Handle`](/pkg/unique#Handle) 的值需要多个垃圾回收周期才能被收集，其周期数与 [`Handle`](/pkg/unique#Handle) 值链的深度成正比。现在，一旦这些值不再使用，它们会在单个周期内被及时收集。

## 平台支持 {#ports}

### Darwin

<!-- go.dev/issue/69839 -->
如 Go 1.24 发布说明中[所述](/doc/go1.24#darwin)，Go 1.25 要求 macOS 12 Monterey 或更高版本。对之前版本的支持已停止。

### Windows

<!-- go.dev/issue/71671 -->
Go 1.25 是最后一个包含[已损坏](/doc/go1.24#windows)的 32 位 windows/arm 端口（`GOOS=windows` `GOARCH=arm`）的版本。它将在 Go 1.26 中被移除。

### AMD64

<!-- go.dev/issue/71204 -->
在 `GOAMD64=v3` 或更高模式下，编译器现在会使用融合乘加指令，使浮点运算更快、更精确。这可能会改变程序生成的精确浮点值。

为避免融合，请使用显式的 `float64` 转换，例如 `float64(a*b)+c`。

### Loong64

<!-- CLs 533717, 533716, 543316, 604176 -->
linux/loong64 平台现在支持竞争检测器，可使用 [`runtime.SetCgoTraceback`](/pkg/runtime#SetCgoTraceback) 从 C 代码收集回溯信息，并支持使用内部链接模式链接 cgo 程序。

### RISC-V

<!-- CL 420114 -->
linux/riscv64 平台现在支持 `plugin` 构建模式。

<!-- https://go.dev/issue/61476, CL 633417 -->
`GORISCV64` 环境变量现在接受一个新的值 `rva23u64`，该值选择 RVA23U64 用户模式应用程序配置文件。

<!--
Output from relnote todo that was generated and reviewed on 2025-05-23, plus summary info from bug/CL: -->

<!-- Items that don't need to be mentioned in Go 1.25 release notes but are picked up by relnote todo
Just updating old prposals
accepted proposal https://go.dev/issue/30999 (from https://go.dev/cl/671795)
accepted proposal https://go.dev/issue/36532 (from https://go.dev/cl/647555)
accepted proposal https://go.dev/issue/48429 (from https://go.dev/cl/648577)
accepted proposal https://go.dev/issue/51572 (from https://go.dev/cl/651996)
accepted proposal https://go.dev/issue/51430 (from https://go.dev/cl/644997, https://go.dev/cl/646355)
accepted proposal https://go.dev/issue/60905 (from https://go.dev/cl/645795)
accepted proposal https://go.dev/issue/61716 (from https://go.dev/cl/644475)
accepted proposal https://go.dev/issue/64876 (from https://go.dev/cl/649435)
accepted proposal https://go.dev/issue/70123 (from https://go.dev/cl/657116)
accepted proposal https://go.dev/issue/61901 (from https://go.dev/cl/647875)
accepted proposal https://go.dev/issue/64207 (from https://go.dev/cl/647015, https://go.dev/cl/652235)
accepted proposal https://go.dev/issue/70200 (from https://go.dev/cl/674916) -->对于子仓库：
已接受提案 https://go.dev/issue/53757 (源自 https://go.dev/cl/644575)
已接受提案 https://go.dev/issue/54743 (源自 https://go.dev/cl/532415)
已接受提案 https://go.dev/issue/57792 (源自 https://go.dev/cl/649716, https://go.dev/cl/651737)
已接受提案 https://go.dev/issue/58523 (源自 https://go.dev/cl/538235)
已接受提案 https://go.dev/issue/61537 (源自 https://go.dev/cl/531935)
已接受提案 https://go.dev/issue/61940 (源自 https://go.dev/cl/650235)
已接受提案 https://go.dev/issue/67839 (源自 https://go.dev/cl/646535)
已接受提案 https://go.dev/issue/68780 (源自 https://go.dev/cl/659835)
已接受提案 https://go.dev/issue/69095 (源自 https://go.dev/cl/649320, https://go.dev/cl/649321, https://go.dev/cl/649337, https://go.dev/cl/649376, https://go.dev/cl/649377, https://go.dev/cl/649378, https://go.dev/cl/649379, https://go.dev/cl/649380, https://go.dev/cl/649397, https://go.dev/cl/649398, https://go.dev/cl/649419, https://go.dev/cl/649497, https://go.dev/cl/649498, https://go.dev/cl/649618, https://go.dev/cl/649675, https://go.dev/cl/649676, https://go.dev/cl/649677, https://go.dev/cl/649695, https://go.dev/cl/649696, https://go.dev/cl/649697, https://go.dev/cl/649698, https://go.dev/cl/649715, https://go.dev/cl/649717, https://go.dev/cl/649718, https://go.dev/cl/649755, https://go.dev/cl/649775, https://go.dev/cl/649795, https://go.dev/cl/649815, https://go.dev/cl/649835, https://go.dev/cl/651336, https://go.dev/cl/651736, https://go.dev/cl/651737, https://go.dev/cl/658018)
已接受提案 https://go.dev/issue/70859 (源自 https://go.dev/cl/666056, https://go.dev/cl/670835, https://go.dev/cl/672015, https://go.dev/cl/672016, https://go.dev/cl/672017)
已接受提案 https://go.dev/issue/32816 (源自 https://go.dev/cl/645155, https://go.dev/cl/645455, https://go.dev/cl/645955, https://go.dev/cl/646255, https://go.dev/cl/646455, https://go.dev/cl/646495, https://go.dev/cl/646655, https://go.dev/cl/646875, https://go.dev/cl/647298, https://go.dev/cl/647299, https://go.dev/cl/647736, https://go.dev/cl/648581, https://go.dev/cl/648715, https://go.dev/cl/648976, https://go.dev/cl/648995, https://go.dev/cl/649055, https://go.dev/cl/649056, https://go.dev/cl/649057, https://go.dev/cl/649456, https://go.dev/cl/649476, https://go.dev/cl/650755, https://go.dev/cl/651615, https://go.dev/cl/651617, https://go.dev/cl/651655, https://go.dev/cl/653436)
-->
[跨站请求伪造 (csrf)]: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF
[sec-fetch-site]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Site