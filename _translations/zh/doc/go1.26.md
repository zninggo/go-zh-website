---
title: Go 1.26 发布说明
---

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.26 简介 {#introduction}

最新的 Go 版本 1.26 将于 [2026 年 2 月](/doc/devel/release#go1.26.0) 发布，距离 [Go 1.25](/doc/go1.25) 发布六个月。该版本的大部分变更集中在工具链、运行时和库的实现方面。如往常一样，此版本遵循 Go 1 兼容性承诺。我们预期几乎所有的 Go 程序都能继续像之前一样编译和运行。

## 语言变更 {#language}

<!-- https://go.dev/issue/45624 --->

内置的 `new` 函数用于创建新变量，现在允许其操作数为一个表达式，以指定变量的初始值。

此特性在与序列化包（如 `encoding/json` 或协议缓冲区）协作时特别有用，这些包使用指针来表示可选值。它使得可选字段可以通过一个简单的表达式进行填充，例如：```go
import "encoding/json"

type Person struct {
	Name string   `json:"name"`
	Age  *int     `json:"age"` // 已知年龄时填充；否则为空值
}

func personJSON(name string, born time.Time) ([]byte, error) {
	return json.Marshal(Person{
		Name: name,
		Age:  new(yearsSince(born)),
	})
}

func yearsSince(t time.Time) int {
	return int(time.Since(t).Hours() / (365.25 * 24)) // 近似值
}
```<!-- https://go.dev/issue/75883 -->

此前泛型类型不得在类型参数列表中引用自身的限制已被解除。
现在可以指定引用受约束泛型类型的类型约束。
例如，泛型类型 `Adder` 可以要求其实例化的类型需与自身相似：```go
type Adder[A Adder[A]] interface {
	Add(A) A
}

func algo[A Adder[A]](x, y A) A {
	return x.Add(y)
}
```此前，首行对 `Adder` 的自引用是不允许的。  
除了使类型约束更强大之外，此变更还略微简化了类型参数的规范规则。

## 工具 {#tools}

### Go 命令 {#go-command}

<!-- go.dev/issue/75432 -->
历史悠久的 `go fix` 命令已完全改造，现已成为 Go 语言*现代化工具*的集散地。它提供了一种可靠的、一键式的方法，用于将 Go 代码库更新至最新的惯用写法和核心库 API。首批现代化工具套件包含数十个修复器，旨在利用 Go 语言和库的现代特性，同时提供一个源码级内联器，允许用户使用 [`//go:fix inline` 指令](https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/inline#hdr-Analyzer_inline) 自动化他们自己的 API 迁移。这些修复器不应改变程序的行为，因此，如果你在使用 `go fix` 执行的修复中遇到任何问题，请[报告该问题](/issue/new)。

重写后的 `go fix` 命令建立在与 `go vet` 完全相同的 [Go 分析框架](https://pkg.go.dev/golang.org/x/tools/go/analysis) 之上。这意味着，在 `go vet` 中提供诊断的相同分析器也可以在 `go fix` 中用于建议和应用修复。`go fix` 命令历史版本中的所有修复器（均已过时）已被移除。

两篇即将发布的 Go 博客文章将更详细地介绍现代化工具、内联器以及如何充分利用 `go fix`。
<!-- TODO(adonovan): 链接到博客文章发布后的位置。 -->

<!-- go.dev/issue/74748 -->
`go mod init` 现在默认为新的 `go.mod` 文件指定较低的 `go` 版本。使用版本为 `1.N.X` 的工具链运行 `go mod init` 将创建一个指定 Go 版本为 `go 1.(N-1).0` 的 `go.mod` 文件。`1.N` 的预发布版本将创建指定 `go 1.(N-2).0` 的 `go.mod` 文件。例如，Go 1.26 发布候选版本将创建带有 `go 1.24.0` 的 `go.mod` 文件，而 Go 1.26 及其次要版本将创建带有 `go 1.25.0` 的 `go.mod` 文件。此举旨在鼓励创建与当前支持的 Go 版本兼容的模块。若需对新模块中的 `go` 版本进行更精细的控制，可以在 `go mod init` 之后使用 `go get go@version`。

<!-- go.dev/issue/74667 -->
`cmd/doc` 和 `go tool doc` 已被删除。`go doc` 可作为 `go tool doc` 的替代品：它接受相同的标志和参数，并具有相同的行为。

### Pprof {#pprof}

<!-- go.dev/issue/74774 -->
使用 `-http` 标志启用的 `pprof` 工具 Web UI 现在默认显示火焰图视图。之前的图视图可通过 "View -> Graph" 菜单或 `/ui/graph` 路径访问。

## 运行时 {#runtime}

### 新的垃圾回收器

Green Tea 垃圾回收器此前在 Go 1.25 中作为实验性功能提供，在采纳反馈意见后，现已默认启用。

该垃圾回收器的设计通过改善局部性和 CPU 可扩展性，提升了标记和扫描小对象的性能。基准测试结果各异，但我们预计，在大量使用垃圾回收器的实际程序中，垃圾回收开销将减少 10% 到 40%。当在较新的基于 amd64 的 CPU 平台（Intel Ice Lake 或 AMD Zen 4 及更新版本）上运行时，预计垃圾回收开销还将进一步减少约 10%，因为垃圾回收器现在会尽可能利用向量指令来扫描小对象。

可以通过在构建时设置 `GOEXPERIMENT=nogreenteagc` 来禁用新的垃圾回收器。此退出设置预计将在 Go 1.27 中移除。如果你因与性能或行为相关的任何原因禁用了新的垃圾回收器，请[提交一个问题](/issue/new)。

### 更快的 cgo 调用

<!-- CL 646198 -->

cgo 调用的基线运行时开销已减少约 30%。

### 堆基地址随机化

<!-- CL 674835 -->

在 64 位平台上，运行时现在会在启动时随机化堆基地址。这是一项安全增强功能，使得攻击者更难预测内存地址并在使用 cgo 时利用漏洞。可以通过在构建时设置 `GOEXPERIMENT=norandomizedheapbase64` 来禁用此功能。此退出设置预计将在未来的 Go 版本中移除。

### 实验性协程泄漏性能分析 {#goroutineleak-profiles}

<!-- CL 688335 -->

一种报告泄漏协程的新性能分析类型现在作为实验性功能提供。这种名为 `goroutineleak` 的新性能分析类型位于 [`runtime/pprof`](/pkg/runtime/pprof) 包中，可通过在构建时设置 `GOEXPERIMENT=goroutineleakprofile` 来启用。启用该实验也会使该性能分析作为 [`net/http/pprof`](/pkg/net/http/pprof) 的端点 `/debug/pprof/goroutineleak` 可用。

*泄漏*的协程是指阻塞在某些并发原语（通道、[`sync.Mutex`](/pkg/sync#Mutex)、[`sync.Cond`](/pkg/sync#Cond) 等）上，并且不可能解除阻塞的协程。运行时使用垃圾回收器检测泄漏的协程：如果一个协程 G 阻塞在并发原语 P 上，并且 P 无法从任何可运行的协程或这些协程*可能解除阻塞*的任何协程访问到，那么 P 就无法解除阻塞，因此协程 G 永远不会被唤醒。虽然不可能检测所有永久阻塞的协程，但此方法能检测到一大类此类泄漏。

以下示例展示了一个可由新的性能分析揭示的真实世界协程泄漏案例：```go
type result struct {
	res workResult
	err error
}

func processWorkItems(ws []workItem) ([]workResult, error) {
	// [待翻译: Process work items in parallel, aggregating results in ch.]
	ch := make(chan result)
	for _, w := range ws {
		go func() {
			res, err := processWorkItem(w)
			ch <- result{res, err}
		}()
	}

	// [待翻译: Collect the results from ch, or return an error if one is found.]
	var results []workResult
	for range len(ws) {
		r := <-ch
		if r.err != nil {
			// [待翻译: This early return may cause goroutine leaks.]
			return nil, r.err
		}
		results = append(results, r.res)
	}
	return results, nil
}
```

```go
type result struct {
	res workResult
	err error
}

func processWorkItems(ws []workItem) ([]workResult, error) {
	// 并行处理工作项，将结果汇总到通道 ch 中。
	ch := make(chan result)
	for _, w := range ws {
		go func() {
			res, err := processWorkItem(w)
			ch <- result{res, err}
		}()
	}

	// 从通道 ch 中收集结果，如果发现错误则返回。
	var results []workResult
	for range len(ws) {
		r := <-ch
		if r.err != nil {
			// 此处提前返回可能导致协程泄漏。
			return nil, r.err
		}
		results = append(results, r.res)
	}
	return results, nil
}
```由于 `ch` 是无缓冲的，如果 `processWorkItems` 因错误而提前返回，所有剩余的 `processWorkItem` 协程将会泄漏。这种情况发生后不久，`ch` 将对所有未参与泄漏的其他协程变得不可达，这使得运行时能够检测并报告这些泄漏的协程。

由于该技术基于可达性分析，运行时可能无法识别那些由阻塞在可通过全局变量或可运行协程的局部变量访问到的并发原语上所引起的泄漏。

特别感谢 Uber 的 Vlad Saioc 贡献此工作。其基础理论在 [Saioc 等人的出版物](https://dl.acm.org/doi/pdf/10.1145/3676641.3715990) 中有详细阐述。

该实现已可用于生产环境，仅出于收集对 API 的反馈目的而被视为实验性功能，特别是关于将其作为新的配置文件类型的选择。此功能的设计也确保除非被实际使用，否则不会产生任何额外的运行时开销。

我们鼓励用户在 [Go 演练场](/play/p/3C71z4Dpav-?v=gotip)、测试、持续集成以及生产环境中试用此新功能。我们欢迎在 [提案 issue](/issue/74609) 上提供额外反馈。

我们计划在 Go 1.27 中默认启用协程泄漏配置文件。

## 编译器 {#compiler}

<!-- CLs 707755, 722440 -->

编译器现在可以在更多情况下在栈上分配切片的底层存储，从而提高性能。如果此更改导致问题，可以使用 [bisect 工具](https://pkg.go.dev/golang.org/x/tools/cmd/bisect) 通过 `-compile=variablemake` 标志来查找导致问题的分配。所有此类新的栈分配也可以通过 `-gcflags=all=-d=variablemakehash=n` 关闭。
如果遇到此优化相关的问题，请 [提交 issue](/issue/new)。

## 链接器 {#linker}

在基于 64 位 ARM 的 Windows 上（即 `windows/arm64` 平台），链接器现在支持 cgo 程序的内部链接模式，可以通过 `-ldflags=-linkmode=internal` 标志请求使用。

可执行文件有一些小的变更。这些变更不影响正在运行的 Go 程序。它们可能影响分析 Go 可执行文件的程序，也可能影响那些使用自定义链接器脚本进行外部链接的用户。

 - `moduledata` 结构体现在位于其自己的节中，名为 `.go.module`。
 - `moduledata` 的 `cutab` 字段（一个切片）现在具有正确的长度；之前其长度是实际值的四倍。
 - 位于 `.gopclntab` 节开头的 `pcHeader` 不再记录文本节的起始位置。该字段现在始终为零。
 - 进行此 `pcHeader` 变更是为了使 `.gopclntab` 节不再包含任何重定位信息。在支持 relro 的平台上，该节已从 relro 段移至 rodata 段。
 - funcdata 符号和 findfunctab 已从 `.rodata` 节移至 `.gopclntab` 节。
 - `.gosymtab` 节已被移除。它以前虽然存在但总是为空。
 - 使用内部链接时，ELF 节现在在节头列表中按地址排序。之前的顺序有些不可预测。

此处提到的节名称使用的是 Linux 和其他系统上的 ELF 名称。Darwin 上的 Mach-O 名称以双下划线开头且不包含任何点。

## 引导 {#bootstrap}

<!-- go.dev/issue/69315 -->
如 [Go 1.24 发布说明](/doc/go1.24#bootstrap) 中所述，Go 1.26 现在要求 Go 1.24.6 或更高版本进行引导。
我们预计 Go 1.28 将需要 Go 1.26 或更高版本的某个次要版本进行引导。

## 标准库 {#library}

### 新的 crypto/hpke 包

新的 [`crypto/hpke`](/pkg/crypto/hpke) 包实现了混合公钥加密（HPKE），如 [RFC 9180](https://rfc-editor.org/rfc/rfc9180.html) 所规定，包括对后量子混合 KEM 的支持。

### 新的实验性 simd/archsimd 包 {#simd}

Go 1.26 引入了一个新的实验性 [`simd/archsimd`](/pkg/simd/archsimd/) 包，可通过在构建时设置环境变量 `GOEXPERIMENT=simd` 启用。
此包提供了访问特定于架构的 SIMD 操作的接口。目前在 amd64 架构上可用，支持 128 位、256 位和 512 位向量类型，例如 [`Int8x16`](/pkg/simd/archsimd#Int8x16) 和 [`Float64x8`](/pkg/simd/archsimd#Float64x8)，以及诸如 [`Int8x16.Add`](/pkg/simd/archsimd#Int8x16.Add) 的操作。
该 API 尚未被认为稳定。

我们计划在未来版本中支持其他架构，但该 API 故意设计为特定于架构，因此不可移植。此外，我们计划在未来开发一个高级的可移植 SIMD 包。

详情请参阅[包文档](/pkg/simd/archsimd)和[提案 issue](/issue/73787)。

### 新的实验性 runtime/secret 包

<!-- https://go.dev/issue/21865 --->

新的 [`runtime/secret`](/pkg/runtime/secret) 包作为实验性功能提供，可通过在构建时设置环境变量 `GOEXPERIMENT=runtimesecret` 启用。
它提供了一种安全擦除在处理机密信息（通常是密码学性质）的代码中使用的临时变量的工具，包括寄存器、栈、新的堆分配等。
此包旨在使确保[前向安全性](https://en.wikipedia.org/wiki/Forward_secrecy)变得更加容易。
目前支持 Linux 上的 amd64 和 arm64 架构。

### 库的次要变更 {#minor_library_changes}

#### [`bytes`](/pkg/bytes/)

新的 [`Buffer.Peek`](/pkg/bytes#Buffer.Peek) 方法返回缓冲区中的下 n 个字节，但不移动读取位置。

#### [`crypto`](/pkg/crypto/)

新的 [`Encapsulator`](/pkg/crypto#Encapsulator) 和 [`Decapsulator`](/pkg/crypto#Decapsulator) 接口允许接受抽象的 KEM 封装或解封装密钥。#### [`crypto/dsa`](/pkg/crypto/dsa/)

[`GenerateKey`](/pkg/crypto/dsa#GenerateKey) 的 `random` 参数现已被忽略。
取而代之，它现在总是使用一个安全的密码学随机字节源。
对于确定性测试，请使用新的 [`testing/cryptotest.SetGlobalRandom`](/pkg/testing/cryptotest#SetGlobalRandom) 函数。
新的 GODEBUG 设置 `cryptocustomrand=1` 可临时恢复旧行为。

#### [`crypto/ecdh`](/pkg/crypto/ecdh/)

[`Curve.GenerateKey`](/pkg/crypto/ecdh#Curve.GenerateKey) 的 `random` 参数现已被忽略。
取而代之，它现在总是使用一个安全的密码学随机字节源。
对于确定性测试，请使用新的 [`testing/cryptotest.SetGlobalRandom`](/pkg/testing/cryptotest#SetGlobalRandom) 函数。
新的 GODEBUG 设置 `cryptocustomrand=1` 可临时恢复旧行为。

新的 [`KeyExchanger`](/pkg/crypto/ecdh#KeyExchanger) 接口，由 [`PrivateKey`](/pkg/crypto/ecdh#PrivateKey) 实现，使得接受抽象的 ECDH 私钥成为可能，例如那些在硬件中实现的私钥。

#### [`crypto/ecdsa`](/pkg/crypto/ecdsa/)

[`PublicKey`](/pkg/crypto/ecdsa#PublicKey) 和 [`PrivateKey`](/pkg/crypto/ecdsa#PrivateKey) 的 `big.Int` 字段现已被弃用。

[`GenerateKey`](/pkg/crypto/ecdsa#GenerateKey)、[`SignASN1`](/pkg/crypto/ecdsa#SignASN1)、[`Sign`](/pkg/crypto/ecdsa#Sign) 和 [`PrivateKey.Sign`](/pkg/crypto/ecdsa#PrivateKey.Sign) 的 `random` 参数现已被忽略。
取而代之，它们现在总是使用一个安全的密码学随机字节源。
对于确定性测试，请使用新的 [`testing/cryptotest.SetGlobalRandom`](/pkg/testing/cryptotest#SetGlobalRandom) 函数。
新的 GODEBUG 设置 `cryptocustomrand=1` 可临时恢复旧行为。

#### [`crypto/ed25519`](/pkg/crypto/ed25519/)

如果 [`GenerateKey`](/pkg/crypto/ed25519#GenerateKey) 的 `random` 参数为 nil，GenerateKey 现在总是使用一个安全的密码学随机字节源，而不是 [`crypto/rand.Reader`](/pkg/crypto/rand#Reader)（后者可能已被覆盖）。新的 GODEBUG 设置 `cryptocustomrand=1` 可临时恢复旧行为。

#### [`crypto/fips140`](/pkg/crypto/fips140/)

[FIPS 140-3 Go 加密模块](/doc/security/fips140) v1.26.0 包含了截至此次版本对 `crypto/internal/fips140/...` 包所做的更改，现在可以通过 GOFIPS140 选择使用。

新的 [`WithoutEnforcement`](/pkg/crypto/fips140#WithoutEnforcement) 和 [`Enforced`](/pkg/crypto/fips140#Enforced) 函数现在允许在 `GODEBUG=fips140=only` 模式下运行，同时有选择地禁用严格的 FIPS 140-3 检查。

当使用 GOFIPS140 针对冻结的模块构建时，[`Version`](/pkg/crypto/fips140#Version) 会返回解析后的 FIPS 140-3 Go 加密模块版本。

#### [`crypto/mlkem`](/pkg/crypto/mlkem/)

新的 [`DecapsulationKey768.Encapsulator`](/pkg/crypto/mlkem#DecapsulationKey768.Encapsulator) 和 [`DecapsulationKey1024.Encapsulator`](/pkg/crypto/mlkem#DecapsulationKey1024.Encapsulator) 方法实现了新的 [`crypto.Decapsulator`](/pkg/crypto#Decapsulator) 接口。

封装和解封装操作的速度现在约快了18%。

#### [`crypto/mlkem/mlkemtest`](/pkg/crypto/mlkem/mlkemtest/)

新的 [`crypto/mlkem/mlkemtest`](/pkg/crypto/mlkem/mlkemtest) 包暴露了 [`Encapsulate768`](/pkg/crypto/mlkem/mlkemtest#Encapsulate768) 和 [`Encapsulate1024`](/pkg/crypto/mlkem/mlkemtest#Encapsulate1024) 函数，它们实现了确定性（去除随机性）的 ML-KEM 封装，用于已知答案测试。

#### [`crypto/rand`](/pkg/crypto/rand/)

[`Prime`](/pkg/crypto/rand#Prime) 的 `random` 参数现已被忽略。
取而代之，它现在总是使用一个安全的密码学随机字节源。
对于确定性测试，请使用新的 [`testing/cryptotest.SetGlobalRandom`](/pkg/testing/cryptotest#SetGlobalRandom) 函数。
新的 GODEBUG 设置 `cryptocustomrand=1` 可临时恢复旧行为。

#### [`crypto/rsa`](/pkg/crypto/rsa/)

新的 [`EncryptOAEPWithOptions`](/pkg/crypto/rsa#EncryptOAEPWithOptions) 函数允许为 OAEP 填充和 MGF1 掩码生成指定不同的哈希函数。

[`GenerateKey`](/pkg/crypto/rsa#GenerateKey)、[`GenerateMultiPrimeKey`](/pkg/crypto/rsa#GenerateMultiPrimeKey) 和 [`EncryptPKCS1v15`](/pkg/crypto/rsa#EncryptPKCS1v15) 的 `random` 参数现已被忽略。
取而代之，它们现在总是使用一个安全的密码学随机字节源。
对于确定性测试，请使用新的 [`testing/cryptotest.SetGlobalRandom`](/pkg/testing/cryptotest#SetGlobalRandom) 函数。
新的 GODEBUG 设置 `cryptocustomrand=1` 可临时恢复旧行为。

如果在调用 [`PrivateKey.Precompute`](/pkg/crypto/rsa#PrivateKey.Precompute) 之后修改了 [`PrivateKey`](/pkg/crypto/rsa#PrivateKey) 的字段，那么 [`PrivateKey.Validate`](/pkg/crypto/rsa#PrivateKey.Validate) 现在会失败。

即使 [`PrivateKey.D`](/pkg/crypto/rsa#PrivateKey.D) 未被使用，现在也会检查其与预计算值的一致性。

不安全的 PKCS #1 v1.5 加密填充（由 [`EncryptPKCS1v15`](/pkg/crypto/rsa#EncryptPKCS1v15)、[`DecryptPKCS1v15`](/pkg/crypto/rsa#DecryptPKCS1v15) 和 [`DecryptPKCS1v15SessionKey`](/pkg/crypto/rsa#DecryptPKCS1v15SessionKey) 实现）现已被弃用。

#### [`crypto/sha3`](/pkg/crypto/sha3/)

[`SHA3`](/pkg/crypto/sha3#SHA3) 的零值现在是一个可用的 SHA3-256 实例，而 [`SHAKE`](/pkg/crypto/sha3#SHAKE) 的零值现在是一个可用的 SHAKE256 实例。

#### [`crypto/subtle`](/pkg/crypto/subtle)

[`WithDataIndependentTiming`](/pkg/crypto/subtle#WithDataIndependentTiming) 函数在执行传递的函数期间，不再将调用的 goroutine 锁定到操作系统线程。此外，在传递的函数执行期间产生的任何 goroutine 及其后代，现在会在其生命周期内继承 `WithDataIndependentTiming` 的属性。此更改也以以下方式影响 cgo：- 任何通过 cgo 从 `WithDataIndependentTiming` 传递的函数内、或从该函数及其后代生成的协程（goroutine）中调用的 C 代码，在调用期间也会启用数据独立计时。如果 C 代码禁用了数据独立计时，则在返回 Go 时将重新启用。
- 如果通过 cgo 调用的 C 代码（无论来自传递给 `WithDataIndependentTiming` 的函数还是其他地方）启用了数据独立计时，那么调用 Go 代码时将保留该状态直到调用结束。

#### [`crypto/tls`](/pkg/crypto/tls/)

混合后量子密钥交换算法 [`SecP256r1MLKEM768`](/pkg/crypto/tls#SecP256r1MLKEM768) 和 [`SecP384r1MLKEM1024`](/pkg/crypto/tls#SecP384r1MLKEM1024) 现已默认启用。可通过设置 [`Config.CurvePreferences`](/pkg/crypto/tls#Config.CurvePreferences) 或使用 `tlssecpmlkem=0` GODEBUG 设置来禁用。

新增的 [`ClientHelloInfo.HelloRetryRequest`](/pkg/crypto/tls#ClientHelloInfo.HelloRetryRequest) 字段表示 ClientHello 是否为响应 HelloRetryRequest 消息而发送。新增的 [`ConnectionState.HelloRetryRequest`](/pkg/crypto/tls#ConnectionState.HelloRetryRequest) 字段则根据连接角色表示服务器是否发送了 HelloRetryRequest，或客户端是否收到了 HelloRetryRequest。

QUIC 实现使用的 [`QUICConn`](/pkg/crypto/tls#QUICConn) 类型新增了一个用于报告 TLS 握手错误的事件。

如果 [`Certificate.PrivateKey`](/pkg/crypto/tls#Certificate.PrivateKey) 实现了 [`crypto.MessageSigner`](/pkg/crypto#MessageSigner)，在 TLS 1.2 及更高版本中将使用其 SignMessage 方法而非 Sign 方法。

在 [Go 1.22](/doc/godebug#go-122) 和 [Go 1.23](/doc/godebug#go-123) 中引入的以下 GODEBUG 设置将在下一个主要 Go 版本中被移除。自 Go 1.27 起，新行为将不受 GODEBUG 设置或 go.mod 语言版本的影响。

- `tlsunsafeekm`：[`ConnectionState.ExportKeyingMaterial`](/pkg/crypto/tls#ConnectionState.ExportKeyingMaterial) 将需要 TLS 1.3 或 Extended Master Secret。
- `tlsrsakex`：默认将不再启用不支持 ECDH 的旧式纯 RSA 密钥交换。
- `tls10server`：客户端和服务器的默认最低 TLS 版本将为 TLS 1.2。
- `tls3des`：默认密码套件将不包括 3DES。
- `x509keypairleaf`：[`X509KeyPair`](/pkg/crypto/tls#X509KeyPair) 和 [`LoadX509KeyPair`](/pkg/crypto/tls#LoadX509KeyPair) 将始终填充 [`Certificate.Leaf`](/pkg/crypto/tls#Certificate.Leaf) 字段。

#### [`crypto/x509`](/pkg/crypto/x509/)

[`ExtKeyUsage`](/pkg/crypto/x509#ExtKeyUsage) 和 [`KeyUsage`](/pkg/crypto/x509#KeyUsage) 类型现在具有 `String` 方法，返回 RFC 5280 和其他注册表中定义的相应 OID 名称。

[`ExtKeyUsage`](/pkg/crypto/x509#ExtKeyUsage) 类型现在具有 `OID` 方法，返回 EKU 对应的 OID。

新增的 [`OIDFromASN1OID`](/pkg/crypto/x509#OIDFromASN1OID) 函数允许将 [`encoding/asn1.ObjectIdentifier`](/pkg/encoding/asn1#ObjectIdentifier) 转换为 [`OID`](/pkg/crypto/x509#OID)。

#### [`debug/elf`](/pkg/debug/elf/)

为 LoongArch 系统新增了来自 [LoongArch ELF psABI v20250521](https://github.com/loongson/la-abi-specs/blob/v2.40/laelf.adoc)（全局版本 v2.40）的其他 `R_LARCH_*` 常量。

#### [`errors`](/pkg/errors/)

新增的 [`AsType`](/pkg/errors#AsType) 函数是 [`As`](/pkg/errors#As) 的泛型版本。它类型安全、速度更快，且在大多数情况下更易于使用。

#### [`fmt`](/pkg/fmt/)

<!-- go.dev/cl/708836 -->
对于非格式化字符串，`fmt.Errorf("x")` 现在分配的内存更少，通常与 `errors.New("x")` 的内存分配相当。

#### [`go/ast`](/pkg/go/ast/)

新增的 [`ParseDirective`](/pkg/go/ast#ParseDirective) 函数用于解析[指令注释](/doc/comment#Syntax)（如 `//go:generate` 这类注释）。源代码工具可以支持它们自己的指令注释，这个新的 API 应该有助于它们实现约定的语法。

<!-- go.dev/issue/76395 -->
新增的 [`BasicLit.ValueEnd`](/pkg/go/ast#BasicLit.ValueEnd) 字段记录字面量的精确结束位置，使得 [`BasicLit.End`](/pkg/go/ast#BasicLit.End) 方法现在总能返回正确结果。（此前它使用启发式方法计算，由于移除了回车符，该方法对 Windows 源文件中的多行原始字符串字面量不正确。）

更新解析器生成的 `BasicLit` 的 `ValuePos` 字段的程序可能还需要更新或清除 `ValueEnd` 字段，以避免格式化输出的细微差异。

#### [`go/token`](/pkg/go/token/)

新增的 [`File.End`](/pkg/go/token#File.End) 便捷方法返回文件的结束位置。

#### [`go/types`](/pkg/go/types/)

在 [Go 1.22](/doc/godebug#go-122) 中引入的 `gotypesalias` GODEBUG 设置将在下一个主要 Go 版本中被移除。自 Go 1.27 起，[`go/types`](/pkg/go/types) 包将始终为[类型别名](/ref/spec#Type_declarations)的表示生成一个[别名类型](/pkg/go/types#Alias)，不受 GODEBUG 设置或 go.mod 语言版本的影响。

#### [`image/jpeg`](/pkg/image/jpeg/)

JPEG 编码器和解码器已被新的、更快的、更准确的实现所替代。依赖编码器或解码器特定比特级输出的代码可能需要更新。

#### [`io`](/pkg/io/)

<!-- go.dev/cl/722500 -->
[`ReadAll`](/pkg/io#ReadAll) 现在分配的中间内存更少，并返回一个大小最小的最终切片（slice）。它通常快约两倍，同时总内存分配量通常减少一半左右，对较大的输入更为明显。

#### [`log/slog`](/pkg/log/slog/)[`NewMultiHandler`](/pkg/log/slog#NewMultiHandler) 函数创建一个 [`MultiHandler`](/pkg/log/slog#MultiHandler)，该处理程序会调用所有给定的处理程序。其 `Enabled` 方法报告是否有任何处理程序的 `Enabled` 方法返回 true。其 `Handle`、`WithAttrs` 和 `WithGroup` 方法会对每个已启用的处理程序调用相应的方法。

#### [`net`](/pkg/net/)

新的 [`Dialer`](/pkg/net/#Dialer) 方法 [`DialIP`](/pkg/net/#Dialer.DialIP)、[`DialTCP`](/pkg/net/#Dialer.DialTCP)、[`DialUDP`](/pkg/net/#Dialer.DialUDP) 和 [`DialUnix`](/pkg/net/#Dialer.DialUnix) 允许使用上下文值建立特定网络类型的连接。

#### [`net/http`](/pkg/net/http/)

新的 [`HTTP2Config.StrictMaxConcurrentRequests`](/pkg/net/http#HTTP2Config.StrictMaxConcurrentRequests) 字段控制当现有的 HTTP/2 连接已超出其流限制时，是否应打开新的连接。

新的 [`Transport.NewClientConn`](/pkg/net/http#Transport.NewClientConn) 方法返回一个到 HTTP 服务器的客户端连接。大多数用户应继续使用 [`Transport.RoundTrip`](/pkg/net/http#Transport.RoundTrip) 来发出请求，该方法管理一个连接池。`NewClientConn` 对于需要自行实现连接管理的用户很有用。

[`Client`](/pkg/net/http#Client) 现在在可用时，会使用并设置与主机部分匹配 [`Request.Host`](/pkg/net/http#Request.Host) 的 URL 范围内的 cookie。之前，总是使用连接地址的主机名。[`ServeMux`](/pkg/net/http#ServeMux) 的尾部斜杠重定向现在使用 HTTP 状态码 307（临时重定向）而不是 301（永久重定向）。

#### [`net/http/httptest`](/pkg/net/http/httptest/)

由 [`Server.Client`](/pkg/net/http/httptest#Server.Client) 返回的 HTTP 客户端现在会将对 `example.com` 及其任何子域名的请求重定向到正在测试的服务器。

#### [`net/http/httputil`](/pkg/net/http/httputil/)

[`ReverseProxy.Director`](/pkg/net/http/httputil#ReverseProxy.Director) 配置字段已被弃用，建议改用 [`ReverseProxy.Rewrite`](/pkg/net/http/httputil#ReverseProxy.Rewrite)。

恶意客户端可以通过将 `Director` 函数添加的头部指定为逐跳（hop-by-hop）头部来移除它们。由于无法在 `Director` API 的范围内解决此问题，我们在 Go 1.20 中添加了一个新的 `Rewrite` 钩子。`Rewrite` 钩子会接收代理收到的未修改的入站请求和代理将要发送的出站请求。

由于 `Director` 钩子从根本上是不安全的，我们现在将其弃用。

#### [`net/netip`](/pkg/net/netip/)

新的 [`Prefix.Compare`](/pkg/net/netip#Prefix.Compare) 方法用于比较两个前缀。

#### [`net/url`](/pkg/net/url/)

[`Parse`](/pkg/net/url#Parse) 现在会拒绝在主机子组件中包含冒号的格式错误的 URL，例如 `http://::1/` 或 `http://localhost:80:80/`。包含方括号括起来的 IPv6 地址的 URL（例如 `http://[::1]/`）仍然可以接受。新的 GODEBUG 设置 `urlstrictcolons=0` 可以恢复旧的行为。

#### [`os`](/pkg/os/)

新的 [`Process.WithHandle`](/pkg/os#Process.WithHandle) 方法在支持的平台上（Linux 5.4 或更高版本上的 pidfd，Windows 上的 Handle）提供了对内部进程句柄的访问。

在 Windows 上，[`OpenFile`](/pkg/os#OpenFile) 的 `flag` 参数现在可以包含任何 Windows 特定文件标志的组合，例如 `FILE_FLAG_OVERLAPPED` 和 `FILE_FLAG_SEQUENTIAL_SCAN`，用于控制文件或设备的缓存行为、访问模式和其他特殊用途标志。

#### [`os/signal`](/pkg/os/signal/)

[`NotifyContext`](/pkg/os/signal#NotifyContext) 现在使用 [`context.CancelCauseFunc`](/pkg/context#CancelCauseFunc) 和一个指示接收到哪个信号的错误来取消返回的上下文。

#### [`reflect`](/pkg/reflect/)

新的方法 [`Type.Fields`](/pkg/reflect#Type.Fields)、[`Type.Methods`](/pkg/reflect#Type.Methods)、[`Type.Ins`](/pkg/reflect#Type.Ins) 和 [`Type.Outs`](/pkg/reflect#Type.Outs) 分别返回一个类型（对于结构体类型）的字段、（对于函数类型的）方法、输入参数和输出参数的迭代器。

类似地，新的方法 [`Value.Fields`](/pkg/reflect#Value.Fields) 和 [`Value.Methods`](/pkg/reflect#Value.Methods) 分别返回一个值（Value）的字段或方法的迭代器。每次迭代都会产生一个字段或方法的类型信息（[`StructField`](/pkg/reflect#StructField) 或 [`Method`](/pkg/reflect#Method)）以及该字段或方法的 [`Value`](/pkg/reflect#Value)。

#### [`runtime/metrics`](/pkg/runtime/metrics/)

添加了几个新的调度器指标，包括 `/sched/goroutines` 前缀下各种状态（等待、可运行等）的 goroutine 数量，`/sched/threads:threads` 下运行时已知的 OS 线程数量，以及 `/sched/goroutines-created:goroutines` 下程序创建的 goroutine 总数。

#### [`testing`](/pkg/testing/)

新的方法 [`T.ArtifactDir`](/pkg/testing#T.ArtifactDir)、[`B.ArtifactDir`](/pkg/testing#B.ArtifactDir) 和 [`F.ArtifactDir`](/pkg/testing#F.ArtifactDir) 返回一个用于写入测试输出文件（工件）的目录。

当向 `go test` 提供 `-artifacts` 标志时，此目录将位于输出目录（由 `-outputdir` 指定，默认为当前目录）下。否则，工件存储在一个临时目录中，测试完成后该目录会被删除。

提供 `-artifacts` 后首次调用 `ArtifactDir` 时，会将目录的位置写入测试日志。

例如，在名为 `TestArtifacts` 的测试中，`t.ArtifactDir()` 会输出：```
=== ARTIFACTS TestArtifacts /path/to/artifact/dir
```<!-- go.dev/issue/73137 -->

[`B.Loop`](/pkg/testing#B.Loop) 方法不再阻止循环体内的内联优化，这可能导致意外的内存分配和基准测试变慢。通过此修复，我们预计所有基准测试都可以从旧的 [`B.N`](/pkg/testing#B) 风格安全地转换为新的 `B.Loop` 风格，不会产生不良影响。在 `for b.Loop() { ... }` 循环体内，函数调用的参数、结果和赋值的变量将保持活跃状态，从而防止编译器优化掉整个基准测试的某些部分。

#### [`testing/cryptotest`](/pkg/testing/cryptotest/)

新的 [`SetGlobalRandom`](/pkg/testing/cryptotest#SetGlobalRandom) 函数可在测试期间配置一个全局的、确定性的加密随机性来源。它会影响 `crypto/rand`，以及 `crypto/...` 包中所有隐式的加密随机性来源。

#### [`time`](/pkg/time/)

在 [Go 1.23](/doc/godebug#go-123) 中引入的 `asynctimerchan` GODEBUG 设置将在下一个主要的 Go 版本中移除。从 Go 1.27 开始，无论 GODEBUG 设置或 go.mod 语言版本如何，[`time`](/pkg/time) 包将始终为定时器使用无缓冲（同步）通道。

## 平台 {#ports}

### Darwin

<!-- go.dev/issue/75836 -->

Go 1.26 是最后一个支持运行在 macOS 12 Monterey 上的版本。Go 1.27 将要求 macOS 13 Ventura 或更高版本。

### FreeBSD

<!-- go.dev/issue/76475 -->

freebsd/riscv64 平台 (`GOOS=freebsd GOARCH=riscv64`) 已被标记为[不兼容](/wiki/PortingPolicy#broken-ports)。详情请参见 [issue 76475](/issue/76475)。

### Windows

<!-- go.dev/issue/71671 -->

正如在 Go 1.25 发行说明中[宣布](/doc/go1.25#windows)的，[不兼容](/doc/go1.24#windows)的 32 位 windows/arm 平台 (`GOOS=windows` `GOARCH=arm`) 已被移除。

### PowerPC

<!-- go.dev/issue/76244 -->

Go 1.26 是最后一个支持 Linux 上大端序 64 位 PowerPC 平台 (`GOOS=linux` `GOARCH=ppc64`) 使用 ELFv1 ABI 的版本。它将在 Go 1.27 中切换到 ELFv2 ABI。由于该平台目前不支持链接其他 ELF 对象，我们预计此更改对用户是透明的。

### RISC-V

<!-- CL 690497 -->

`linux/riscv64` 平台现在支持竞态检测器。

### S390X

<!-- CL 719482 -->

`s390x` 平台现在支持使用寄存器传递函数参数和结果。

### WebAssembly {#wasm}

<!-- CL 707855 -->

编译器现在无条件地利用符号扩展和非陷阱浮点转整数指令。这些特性至少从 Wasm 2.0 起就已标准化。相应的 `GOWASM` 设置 `signext` 和 `satconv` 现在会被忽略。

<!-- CL 683296 -->

对于 WebAssembly 应用程序，运行时现在以更小的增量管理堆内存块，这使得堆大小小于约 16 MiB 的应用程序的内存使用量显著减少。