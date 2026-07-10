---
title: Go 1.24 发布说明
---

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.24 简介 {#introduction}

最新的Go语言版本1.24
将于[2025年2月](/doc/devel/release#go1.24.0)发布，
距上一版本 [Go 1.23](/doc/go1.23) 发布六个月后。
本次更新的大部分改动集中在工具链、运行时和标准库的实现上。
与以往一样，本次发布遵守Go 1 [兼容性承诺](/doc/go1compat)。
我们预计几乎所有Go程序都能像以前一样继续编译和运行。

## 语言变更 {#language}

<!-- go.dev/issue/46477 -->
Go 1.24 现在完全支持[泛型类型别名](/issue/46477)：类型别名可以像自定义类型一样被参数化。
详情请参阅[语言规范](/ref/spec#Alias_declarations)。
目前，可以通过设置 `GOEXPERIMENT=noaliastypeparams` 来禁用此特性；
但该设置将在 Go 1.25 中移除。

## 工具 {#tools}

### Go 命令 {#go-command}

<!-- go.dev/issue/48429 -->

Go模块现在可以通过go.mod文件中的`tool`指令来跟踪可执行文件依赖项。这消除了之前需要将工具作为空白导入（blank import）添加到约定名为 "tools.go" 的文件中的变通方案。现在，`go tool` 命令除了可以运行Go发行版附带的工具外，还可以运行这些工具。更多信息请参阅[相关文档](/doc/modules/managing-dependencies#tools)。

`go get` 命令新增的 `-tool` 标志，除了添加 `require` 指令外，还会为命名的包在当前模块中添加一个 `tool` 指令。

新增的 [`tool` 元模式](/cmd/go#hdr-Package_lists_and_patterns) 指代当前模块中的所有工具。这可以用于通过 `go get tool` 升级所有工具，或者通过 `go install tool` 将它们安装到你的 GOBIN 目录中。

<!-- go.dev/issue/69290 -->

`go run` 创建的可执行文件以及 `go tool` 的新行为现在都会被缓存在Go构建缓存中。这使得重复执行更快，但代价是缓存会变大。参见 [#69290](/issue/69290)。

<!-- go.dev/issue/62067 -->

`go build` 和 `go install` 命令现在接受一个新的 `-json` 标志，该标志将构建输出和失败信息作为结构化的JSON输出报告到标准输出。报告格式的详细信息请参见 `go help buildjson`。

此外，`go test -json` 现在也会以JSON格式报告构建输出和失败信息，与测试结果JSON交织在一起。这些信息通过新的 `Action` 类型来区分，但如果它们在测试集成系统中引起问题，你可以通过 [GODEBUG 设置](/doc/godebug) `gotestjsonbuildtext=1` 恢复到文本构建输出。

<!-- go.dev/issue/26232 -->

新的 `GOAUTH` 环境变量提供了一种灵活的方式来认证私有模块的获取。更多信息请参见 `go help goauth`。

<!-- go.dev/issue/50603 -->

`go build` 命令现在会根据版本控制系统的标签和/或提交记录，在编译后的二进制文件中设置[主模块的版本](/pkg/runtime/debug#BuildInfo.Main)。如果有未提交的更改，将追加 `+dirty` 后缀。使用 `-buildvcs=false` 标志可以从二进制文件中省略版本控制信息。

<!-- go.dev/issue/63939 -->

新的 [GODEBUG 设置](/doc/godebug) [`toolchaintrace=1`](/doc/toolchain#select) 可用于跟踪 `go` 命令的工具链选择过程。

### Cgo {#cgo}

<!-- go.dev/issue/56378, CL 579955 -->
Cgo 支持对C函数使用新的注解，以提高运行时性能。
`#cgo noescape cFunctionName` 告诉编译器，传递给C函数 `cFunctionname` 的内存不会逃逸（escape）。
`#cgo nocallback cFunctionName` 告诉编译器，C函数 `cFunctionName` 不会回调任何Go函数。
更多信息请参阅 [cgo 文档](/pkg/cmd/cgo#hdr-Optimizing_calls_of_C_code)。

<!-- go.dev/issue/67699 -->
目前，如果一个C函数有多个不兼容的声明，Cgo会拒绝编译对其的调用。例如，如果 `f` 同时被声明为 `void f(int)` 和 `void f(double)`，cgo 会报告一个错误，而不是可能为 `f(0)` 生成错误的调用序列。本次发布新增的功能是，当不兼容的声明出现在不同文件中时，对此错误条件的检测能力有所增强。参见 [#67699](/issue/67699)。

### Objdump

<!-- go.dev/issue/15255, go.dev/issue/36738 -->
[Objdump](/cmd/objdump) 工具现在支持在64位龙架构 (`GOARCH=loong64`)、RISC-V (`GOARCH=riscv64`) 和 S390X (`GOARCH=s390x`) 上进行反汇编。

### Vet

<!-- go.dev/issue/44251 -->
新增的 `tests` 分析器用于报告测试包中测试、模糊测试、基准测试和示例声明的常见错误，例如格式错误的名称、不正确的函数签名，或者示例中引用了不存在的标识符。其中一些错误可能导致测试无法运行。
该分析器是 `go test` 运行的一部分分析器之一。

<!-- go.dev/issue/60529 -->
现有的 `printf` 分析器现在会为形如 `fmt.Printf(s)` 的调用报告诊断信息，其中 `s` 是一个非常量格式字符串，且没有其他参数。这类调用几乎总是一个错误，因为 `s` 的值可能包含 `%` 符号；应使用 `fmt.Print` 代替。参见 [#60529](/issue/60529)。此检查倾向于在现有代码中产生发现，因此仅当语言版本（由 go.mod 中的 `go` 指令或 `//go:build` 注释指定）至少为 Go 1.24 时才应用，以避免在更新到 1.24 Go 工具链时导致持续集成失败。

<!-- go.dev/issue/64127 -->
现有的 `buildtag` 分析器现在会报告诊断信息，当 `//go:build` 指令中存在无效的Go[主版本构建约束](/pkg/cmd/go#hdr-Build_constraints)时。例如，`//go:build go1.23.1` 引用了一个点版本；应使用 `//go:build go1.23` 代替。参见 [#64127](/issue/64127)。<!-- go.dev/issue/66387 -->
现有的 `copylock` 分析器现在会报告诊断信息，当一个在三子句"for"循环中声明的变量（如 `for i := iter(); done(i); i = next(i) { ... }`）包含 `sync.Locker`（例如 `sync.Mutex`）时。[Go 1.22](/doc/go1.22#language) 改变了此类循环的行为，使其为每次迭代创建一个新变量，并从上一次迭代复制值；这个复制操作对于锁来说是不安全的。参见 [#66387](/issue/66387)。

### GOCACHEPROG

<!-- go.dev/issue/64876 -->
`cmd/go` 的内部二进制文件和测试缓存机制现在可以由子进程实现，这些子进程通过 `GOCACHEPROG` 环境变量指定的 JSON 协议与 `cmd/go` 工具进行通信。这此前是 GOEXPERIMENT 实验性功能。有关协议细节，请参阅[文档](/cmd/go/internal/cacheprog)。

## Runtime {#runtime}

<!-- go.dev/issue/54766 -->
<!-- go.dev/cl/614795 -->
<!-- go.dev/issue/68578 -->

对运行时进行的多项性能改进，在一系列有代表性的基准测试中，平均将 CPU 开销降低了 2–3%。具体结果可能因应用程序而异。这些改进包括：基于 [Swiss Tables](https://abseil.io/about/design/swisstables) 的新内置 `map` 实现、小对象的更高效内存分配，以及一个新的运行时内部互斥锁实现。

新的内置 `map` 实现和新的运行时内部互斥锁可以通过在构建时分别设置 `GOEXPERIMENT=noswissmap` 和 `GOEXPERIMENT=nospinbitmutex` 来禁用。

## Compiler {#compiler}

<!-- go.dev/issue/60725, go.dev/issue/57926 -->
编译器已经不允许为 cgo 生成的接收器类型定义新方法，但可以通过别名类型绕过此限制。现在，Go 1.24 会始终报告错误，如果接收器表示一个 cgo 生成的类型，无论是直接表示还是间接（通过别名类型）表示。

## Linker {#linker}

<!-- go.dev/issue/68678, go.dev/issue/68652, CL 618598, CL 618601 -->
链接器现在默认在 ELF 平台生成 GNU 构建 ID（ELF `NT_GNU_BUILD_ID` 注释），在 macOS 上生成 UUID（Mach-O `LC_UUID` 加载命令）。构建 ID 或 UUID 派生自 Go 构建 ID。可以通过 `-B none` 链接器标志禁用，或者使用 `-B 0xNNNN` 链接器标志指定一个十六进制值来覆盖它。

## Bootstrap {#bootstrap}

<!-- go.dev/issue/64751 -->
如 [Go 1.22 发行说明](/doc/go1.22#bootstrap)中所述，Go 1.24 现在要求使用 Go 1.22.6 或更高版本进行引导。我们预计 Go 1.26 将需要 Go 1.24 或更高版本的某个补丁版本进行引导。

## Standard library {#library}

### 目录限制的文件系统访问

<!-- go.dev/issue/67002 -->
新的 [`os.Root`](/pkg/os#Root) 类型提供了在特定目录内执行文件系统操作的能力。

[`os.OpenRoot`](/pkg/os#OpenRoot) 函数打开一个目录并返回一个 [`os.Root`](/pkg/os#Root)。[`os.Root`](/pkg/os#Root) 上的方法在该目录内操作，不允许路径指向目录外部的位置，包括那些通过符号链接指向目录外部的路径。`os.Root` 上的方法镜像了 `os` 包中可用的大部分文件系统操作，例如 [`os.Root.Open`](/pkg/os#Root.Open)、[`os.Root.Create`](/pkg/os#Root.Create)、[`os.Root.Mkdir`](/pkg/os#Root.Mkdir) 和 [`os.Root.Stat`](/pkg/os#Root.Stat)。

### 新的基准测试函数

基准测试现在可以使用更快且不易出错的 [`testing.B.Loop`](/pkg/testing#B.Loop) 方法来执行基准测试迭代，例如 `for b.Loop() { ... }`，以替代涉及 `b.N` 的典型循环结构（如 `for range b.N`）。这有两个显著优势：
 - 基准测试函数将精确执行 `-count` 次，因此昂贵的设置和清理步骤只执行一次。
 - 函数调用的参数和结果保持存活状态，防止编译器完全优化掉循环体。

### 改进的终结器

<!-- go.dev/issue/67535 -->
新的 [`runtime.AddCleanup`](/pkg/runtime#AddCleanup) 函数是一种终结机制，比 [`runtime.SetFinalizer`](/pkg/runtime#SetFinalizer) 更灵活、更高效且不易出错。`AddCleanup` 将一个清理函数附加到一个对象上，该函数将在对象不再可达时运行。然而，与 `SetFinalizer` 不同的是：
 - 可以向单个对象附加多个清理函数。
 - 清理函数可以附加到内部指针上。
 - 当对象形成循环时，清理函数通常不会导致泄漏。
 - 清理函数不会延迟对象或它指向的对象的释放。
新代码应优先选择 `AddCleanup` 而非 `SetFinalizer`。

### 新的 weak 包 {#weak}

新的 [`weak`](/pkg/weak/) 包提供了弱指针。

弱指针是一种低级原语，旨在支持创建内存高效的数据结构，例如用于关联值的弱映射、用于 [`unique`](/pkg/unique/) 包未涵盖的任何内容的规范化映射，以及各种缓存。为了支持这些用例，此版本还提供了 [`runtime.AddCleanup`](/pkg/runtime/#AddCleanup) 和 [`maphash.Comparable`](/pkg/maphash/#Comparable)。

### 新的 crypto/mlkem 包 {#crypto-mlkem}

<!-- go.dev/issue/70122 -->
新的 [`crypto/mlkem`](/pkg/crypto/mlkem/) 包实现了 ML-KEM-768 和 ML-KEM-1024。

ML-KEM 是一种后量子密钥交换机制，以前称为 Kyber，并在 [FIPS 203](https://doi.org/10.6028/NIST.FIPS.203) 中规定。

### 新的 crypto/hkdf、crypto/pbkdf2 和 crypto/sha3 包 {#crypto-packages}

<!-- go.dev/issue/61477, go.dev/issue/69488, go.dev/issue/69982, go.dev/issue/65269, CL 629176 -->
新的 [`crypto/hkdf`](/pkg/crypto/hkdf/) 包实现了基于 HMAC 的 Extract-and-Expand 密钥派生函数 HKDF，其定义见 [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869.html)。新的 [`crypto/pbkdf2`](/pkg/crypto/pbkdf2/) 包实现了基于密码的密钥派生函数 PBKDF2，其定义见 [RFC 8018](https://www.rfc-editor.org/rfc/rfc8018.html)。

新的 [`crypto/sha3`](/pkg/crypto/sha3/) 包实现了 SHA-3 哈希函数以及 SHAKE 和 cSHAKE 可扩展输出函数，其定义见 [FIPS 202](http://doi.org/10.6028/NIST.FIPS.202)。

这三个包均基于现有的 `golang.org/x/crypto/...` 包。

### FIPS 140-3 合规性 {#fips140}

此版本包含[一套新的机制以促进 FIPS 140-3 合规性](/doc/security/fips140)。

Go 加密模块是一组内部标准库包，被透明地用于实现 FIPS 140-3 批准的算法。应用程序无需更改即可使用 Go 加密模块执行批准的算法。

新的 `GOFIPS140` 环境变量可用于选择要在构建中使用的 Go 加密模块版本。新的 `fips140` [GODEBUG 设置](/doc/godebug) 可用于在运行时启用 FIPS 140-3 模式。

Go 1.24 包含 Go 加密模块版本 v1.0.0，该版本目前正由经 CMVP 认可的实验室进行测试。

### 新增实验性 testing/synctest 包 {#testing-synctest}

新的实验性 [`testing/synctest`](/pkg/testing/synctest/) 包为测试并发代码提供了支持。
- [`synctest.Run`](/pkg/testing/synctest/#Run) 函数在一个隔离的“气泡”中启动一组 goroutine。在该气泡内，[`time`](/pkg/time) 包的函数操作一个假的时钟。
- [`synctest.Wait`](/pkg/testing/synctest#Wait) 函数等待当前气泡中的所有 goroutine 阻塞。

更多详情请参阅包文档。

`synctest` 包是实验性的，必须在构建时设置 `GOEXPERIMENT=synctest` 才能启用。该包的 API 在未来的版本中可能会发生变化。更多信息和反馈请参见 [issue #67434](/issue/67434)。

### 库的次要更改 {#minor_library_changes}

#### [`archive`](/pkg/archive/)

`archive/zip` 和 `archive/tar` 中的 `(*Writer).AddFS` 实现现在会为空目录写入目录头。

#### [`bytes`](/pkg/bytes/)

[`bytes`](/pkg/bytes) 包增加了几个处理迭代器的函数：
- [`Lines`](/pkg/bytes#Lines) 返回一个在字节切片中按换行符分隔的行上进行迭代的迭代器。
- [`SplitSeq`](/pkg/bytes#SplitSeq) 返回一个在字节切片中按分隔符拆分后的所有子切片上进行迭代的迭代器。
- [`SplitAfterSeq`](/pkg/bytes#SplitAfterSeq) 返回一个在字节切片中按每个分隔符实例拆分后的子切片上进行迭代的迭代器。
- [`FieldsSeq`](/pkg/bytes#FieldsSeq) 返回一个在字节切片中按空白字符序列（定义参见 [`unicode.IsSpace`](/pkg/unicode#IsSpace)）拆分后的子切片上进行迭代的迭代器。
- [`FieldsFuncSeq`](/pkg/bytes#FieldsFuncSeq) 返回一个在字节切片中按满足谓词的 Unicode 码点序列拆分后的子切片上进行迭代的迭代器。

#### [`crypto/aes`](/pkg/crypto/aes/)

[`NewCipher`](/pkg/crypto/aes#NewCipher) 返回的值不再实现 `NewCTR`、`NewGCM`、`NewCBCEncrypter` 和 `NewCBCDecrypter` 方法。这些方法未记录在文档中，且并非在所有架构上都可用。相反，[`Block`](/pkg/crypto/cipher#Block) 值应直接传递给相关的 [`crypto/cipher`](/pkg/crypto/cipher/) 函数。目前，`crypto/cipher` 仍然会检查 `Block` 值上的这些方法，即使标准库不再使用它们。

#### [`crypto/cipher`](/pkg/crypto/cipher/)

新的 [`NewGCMWithRandomNonce`](/pkg/crypto/cipher#NewGCMWithRandomNonce) 函数返回一个 [`AEAD`](/pkg/crypto/cipher#AEAD)，它通过在 Seal 期间生成随机数（nonce）并将其前置到密文来实现 AES-GCM。

当与 [`crypto/aes`](/pkg/crypto/aes/) 一起使用时，[`NewCTR`](/pkg/crypto/cipher#NewCTR) 返回的 [`Stream`](/pkg/crypto/cipher#Stream) 实现现在在 amd64 和 arm64 上快了几倍。

[`NewOFB`](/pkg/crypto/cipher#NewOFB)、[`NewCFBEncrypter`](/pkg/crypto/cipher#NewCFBEncrypter) 和 [`NewCFBDecrypter`](/pkg/crypto/cipher#NewCFBDecrypter) 现已弃用。OFB 和 CFB 模式未经验证，这通常使得主动攻击能够操纵和恢复明文。建议应用程序改用 [`AEAD`](/pkg/crypto/cipher#AEAD) 模式。如果需要未经验证的 [`Stream`](/pkg/crypto/cipher#Stream) 模式，请改用 [`NewCTR`](/pkg/crypto/cipher#NewCTR)。

#### [`crypto/ecdsa`](/pkg/crypto/ecdsa/)

<!-- go.dev/issue/64802 -->
如果随机源为 nil，[`PrivateKey.Sign`](/pkg/crypto/ecdsa#PrivateKey.Sign) 现在会根据 [RFC 6979](https://www.rfc-editor.org/rfc/rfc6979.html) 生成确定性签名。

#### [`crypto/md5`](/pkg/crypto/md5/)

[`md5.New`](/pkg/md5#New) 返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`crypto/rand`](/pkg/crypto/rand/)

<!-- go.dev/issue/66821 -->
[`Read`](/pkg/crypto/rand#Read) 函数现在保证不会失败。它将始终将 `error` 结果返回为 `nil`。如果 `Read` 在从 [`Reader`](/pkg/crypto/rand#Reader) 读取时遇到错误，程序将不可恢复地崩溃。请注意，默认 `Reader` 使用的平台 API 被记录为总是成功，因此此更改应该只影响那些覆盖了 `Reader` 变量的程序。一个例外是 Linux 3.17 之前的内核，其中默认的 `Reader` 仍然打开 `/dev/urandom`，并且可能会失败。

<!-- go.dev/issue/69577 -->
在 Linux 6.11 及更高版本上，`Reader` 现在通过 vDSO 使用 `getrandom` 系统调用。这快了几倍，尤其对于小的读取操作。

<!-- CL 608395 -->
在 OpenBSD 上，`Reader` 现在使用 `arc4random_buf(3)`。<!-- go.dev/issue/67057 -->
新的 [`Text`](/pkg/crypto/rand#Text) 函数可用于生成密码学安全的随机文本字符串。

#### [`crypto/rsa`](/pkg/crypto/rsa/)

如果请求的密钥少于 1024 位，[`GenerateKey`](/pkg/crypto/rsa#GenerateKey) 现在会返回错误。
所有 Sign、Verify、Encrypt 和 Decrypt 方法在用于少于 1024 位的密钥时现在也会返回错误。这类密钥不安全，不应使用。
[GODEBUG 设置](/doc/godebug) `rsa1024min=0` 可恢复旧行为，但我们建议仅在必要时且仅在测试中使用，例如在测试文件中添加一行 `//go:debug rsa1024min=0`。
一个新的 `GenerateKey` [示例](/pkg/crypto/rsa#example-GenerateKey-TestKey) 提供了易于使用的标准 2048 位测试密钥。

在 [`PrivateKey.Precompute`](/pkg/crypto/rsa#PrivateKey.Precompute) 之前调用 [`PrivateKey.Validate`](/pkg/crypto/rsa#PrivateKey.Validate) 现在是安全且更高效的。
在部分填充了 [`PrecomputedValues`](/pkg/crypto/rsa#PrecomputedValues) 的情况下（例如从 JSON 反序列化密钥时），`Precompute` 现在更快。

该包现在会拒绝更多无效密钥，即使未调用 `Validate`，并且 [`GenerateKey`](/pkg/crypto/rsa#GenerateKey) 可能会对损坏的随机源返回新的错误。
[`PrivateKey`](/pkg/crypto/rsa#PrivateKey) 的 [`Primes`](/pkg/crypto/rsa#PrivateKey.Primes) 和 [`Precomputed`](/pkg/crypto/rsa#PrivateKey.Precomputed) 字段现在即使缺少某些值也会被使用和验证。
另请参阅下文[描述的](#cryptox509pkgcryptox509) `crypto/x509` 对 RSA 密钥的解析和序列化变更。

<!-- go.dev/issue/43923 -->
[`SignPKCS1v15`](/pkg/crypto/rsa#SignPKCS1v15) 和 [`VerifyPKCS1v15`](/pkg/crypto/rsa#VerifyPKCS1v15) 现在支持 SHA-512/224、SHA-512/256 和 SHA-3。

<!-- CL 639936 -->
[`GenerateKey`](/pkg/crypto/rsa#GenerateKey) 现在使用略有不同的方法来生成私有指数（使用 Carmichael's totient 而不是 Euler's totient）。那些仅从质因数外部重新生成密钥的罕见应用程序可能会产生不同但兼容的结果。

<!-- CL 626957 -->
在 wasm 上，公钥和私钥操作现在最多快两倍。

#### [`crypto/sha1`](/pkg/crypto/sha1/)

[`sha1.New`](/pkg/sha1#New) 返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`crypto/sha256`](/pkg/crypto/sha256/)

[`sha256.New`](/pkg/sha256#New) 和 [`sha256.New224`](/pkg/sha256#New224) 返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`crypto/sha512`](/pkg/crypto/sha512/)

[`sha512.New`](/pkg/sha512#New)、[`sha512.New384`](/pkg/sha512#New384)、[`sha512.New512_224`](/pkg/sha512#New512_224) 和 [`sha512.New512_256`](/pkg/sha512#New512_256) 返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`crypto/subtle`](/pkg/crypto/subtle/)

新的 [`WithDataIndependentTiming`](/pkg/crypto/subtle#WithDataIndependentTiming) 函数允许用户运行一个函数，并启用特定于架构的功能，该功能保证特定指令是数据值时序不变的。这可用于确保设计为在恒定时间内运行的代码不会被 CPU 级别的特性优化为以可变时间运行。
目前，`WithDataIndependentTiming` 在 arm64 上使用 PSTATE.DIT 位，在所有其他架构上为空操作。[GODEBUG 设置](/doc/godebug) `dataindependenttiming=1` 会为整个 Go 程序启用 DIT 模式。

<!-- CL 622276 -->
[`XORBytes`](/pkg/crypto/subtle#XORBytes) 的输出必须与输入完全重叠或完全不重叠。以前，其行为是未定义的，现在 `XORBytes` 会 panic。

#### [`crypto/tls`](/pkg/crypto/tls/)

TLS 服务器现在支持加密客户端你好 (ECH)。可以通过填充 [`Config.EncryptedClientHelloKeys`](/pkg/crypto/tls#Config.EncryptedClientHelloKeys) 字段来启用此功能。

现在支持新的后量子 [`X25519MLKEM768`](/pkg/crypto/tls#X25519MLKEM768) 密钥交换机制，并且在 [`Config.CurvePreferences`](/pkg/crypto/tls#Config.CurvePreferences) 为 nil 时默认启用。
[GODEBUG 设置](/doc/godebug) `tlsmlkem=0` 可恢复默认值。
当与有缺陷的 TLS 服务器交互时（这些服务器不能正确处理大记录，导致握手期间超时），这可能很有用（参见 [TLS 后量子 TL;DR fail](https://tldr.fail/)）。

已移除对实验性 `X25519Kyber768Draft00` 密钥交换的支持。

<!-- go.dev/issue/69393, CL 630775 -->
密钥交换排序现在完全由 `crypto/tls` 包处理。现在忽略 [`Config.CurvePreferences`](/pkg/crypto/tls#Config.CurvePreferences) 的顺序，其内容仅用于确定当该字段被填充时要启用哪些密钥交换。

<!-- go.dev/issue/32936 -->
新的 [`ClientHelloInfo.Extensions`](/pkg/crypto/tls#ClientHelloInfo.Extensions) 字段列出了在 Client Hello 消息中收到的扩展的 ID。这对于 TLS 客户端指纹识别很有用。

#### [`crypto/x509`](/pkg/crypto/x509/)

<!-- go.dev/issue/41682 -->
`x509sha1` [GODEBUG 设置](/doc/godebug) 已被移除。
[`Certificate.Verify`](/pkg/crypto/x509#Certificate.Verify) 不再支持基于 SHA-1 的签名。

[`OID`](/pkg/crypto/x509#OID) 现在实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 和 [`encoding.TextAppender`](/pkg/encoding#TextAppender) 接口。默认证书策略字段已从 [`Certificate.PolicyIdentifiers`](/pkg/crypto/x509#Certificate.PolicyIdentifiers) 变更为 [`Certificate.Policies`](/pkg/crypto/x509#Certificate.Policies)。解析证书时，两个字段均会被填充，但创建证书时，策略现在将取自 `Certificate.Policies` 字段，而非 `Certificate.PolicyIdentifiers` 字段。此变更可通过 [GODEBUG 设置](/doc/godebug) `x509usepolicies=0` 恢复。

<!-- go.dev/issue/67675 -->
当传入的模板中 [`Certificate.SerialNumber`](/pkg/crypto/x509#Certificate.SerialNumber) 字段为 nil 时，[`CreateCertificate`](/pkg/crypto/x509#CreateCertificate) 现在将使用符合 RFC 5280 的方法生成序列号，而不会导致失败。

[`Certificate.Verify`](/pkg/crypto/x509#Certificate.Verify) 现在支持策略验证，定义见 RFC 5280 和 RFC 9618。新的 [`VerifyOptions.CertificatePolicies`](/pkg/crypto/x509#VerifyOptions.CertificatePolicies) 字段可设置为一组可接受的策略 [`OIDs`](/pkg/crypto/x509#OID)。[`Certificate.Verify`](/pkg/crypto/x509#Certificate.Verify) 仅返回具有有效策略图的证书链。

[`MarshalPKCS8PrivateKey`](/pkg/crypto/x509#MarshalPKCS8PrivateKey) 现在会返回错误，而不是编组无效的 RSA 密钥。（[`MarshalPKCS1PrivateKey`](/pkg/crypto/x509#MarshalPKCS1PrivateKey) 没有错误返回，当提供无效密钥时，其行为仍属未定义。）

[`ParsePKCS1PrivateKey`](/pkg/crypto/x509#ParsePKCS1PrivateKey) 和 [`ParsePKCS8PrivateKey`](/pkg/crypto/x509#ParsePKCS8PrivateKey) 现在会使用并验证编码的 CRT 值，因此可能会拒绝之前可接受的无效 RSA 密钥。可使用 [GODEBUG 设置](/doc/godebug) `x509rsacrt=0` 恢复到重新计算 CRT 值的行为。

#### [`debug/elf`](/pkg/debug/elf/)

<!-- go.dev/issue/63952 -->
[`debug/elf`](/pkg/debug/elf) 包新增了对动态 ELF（可执行与可链接格式）文件中符号版本处理的支持。新的 [`File.DynamicVersions`](/pkg/debug/elf#File.DynamicVersions) 方法返回 ELF 文件中定义的动态版本列表。新的 [`File.DynamicVersionNeeds`](/pkg/debug/elf#File.DynamicVersionNeeds) 方法返回此 ELF 文件所需的、定义在其他 ELF 对象中的动态版本列表。最后，新的 [`Symbol.HasVersion`](/pkg/debug/elf#Symbol) 和 [`Symbol.VersionIndex`](/pkg/debug/elf#Symbol) 字段指示符号的版本。

#### [`encoding`](/pkg/encoding/)

引入了两个新接口 [`TextAppender`](/pkg/encoding#TextAppender) 和 [`BinaryAppender`](/pkg/encoding#BinaryAppender)，用于将对象的文本或二进制表示追加到字节切片中。这些接口提供了与 [`TextMarshaler`](/pkg/encoding#TextMarshaler) 和 [`BinaryMarshaler`](/pkg/encoding#BinaryMarshaler) 相同的功能，但不同的是，它们不是每次分配一个新的切片，而是直接将数据追加到现有切片中。标准库中已实现 `TextMarshaler` 和/或 `BinaryMarshaler` 的类型现在也实现了这些接口。

#### [`encoding/json`](/pkg/encoding/json/)

<!-- go.dev/issue/45669 -->
在编组时，如果结构体字段标签中包含新的 `omitzero` 选项，且该字段的值为零，则该字段将被省略。如果该字段类型具有 `IsZero() bool` 方法，则会使用该方法来判断值是否为零。否则，如果该值是[其类型的零值](/ref/spec#The_zero_value)，则该值为零。当意图是省略零值时，`omitzero` 字段标签比 `omitempty` 更清晰，更不容易出错。特别是，与 `omitempty` 不同，`omitzero` 会省略零值的 [`time.Time`](/pkg/time#Time) 值，这是一个常见的摩擦点。

如果同时指定了 `omitempty` 和 `omitzero`，那么当字段值为空或为零（或两者兼有）时，该字段将被省略。

[`UnmarshalTypeError.Field`](/pkg/encoding/json#UnmarshalTypeError.Field) 现在包含嵌入的结构体，以提供更详细的错误消息。

#### [`go/types`](/pkg/go/types/)

所有使用成对方法（如 `Len() int` 和 `At(int) T`）来暴露序列的 `go/types` 数据结构，现在还提供了返回迭代器的方法，这允许您简化如下代码：```
params := fn.Type.(*types.Signature).Params()
for i := 0; i < params.Len(); i++ {
   use(params.At(i))
}
```以下是翻译后的内容：

#### [`go/types`](/pkg/go/types/)

所有 `go/types` 数据结构中，通过成对方法（如 `Len() int` 和 `At(int) T`）来暴露序列的模式，现在还提供了返回迭代器的方法。这使您可以简化如下代码：
```go
params := fn.Type.(*types.Signature).Params()
for i := 0; i < params.Len(); i++ {
   use(params.At(i))
}
```

这些方法是：
[`Interface.EmbeddedTypes`](/pkg/go/types#Interface.EmbeddedTypes),
[`Interface.ExplicitMethods`](/pkg/go/types#Interface.ExplicitMethods),
[`Interface.Methods`](/pkg/go/types#Interface.Methods),
[`MethodSet.Methods`](/pkg/go/types#MethodSet.Methods),
[`Named.Methods`](/pkg/go/typ```
for param := range fn.Signature().Params().Variables() {
   use(param)
}
```相关方法包括：
[`Interface.EmbeddedTypes`](/pkg/go/types#Interface.EmbeddedTypes)、
[`Interface.ExplicitMethods`](/pkg/go/types#Interface.ExplicitMethods)、
[`Interface.Methods`](/pkg/go/types#Interface.Methods)、
[`MethodSet.Methods`](/pkg/go/types#MethodSet.Methods)、
[`Named.Methods`](/pkg/go/types#Named.Methods)、
[`Scope.Children`](/pkg/go/types#Scope.Children)、
[`Struct.Fields`](/pkg/go/types#Struct.Fields)、
[`Tuple.Variables`](/pkg/go/types#Tuple.Variables)、
[`TypeList.Types`](/pkg/go/types#TypeList.Types)、
[`TypeParamList.TypeParams`](/pkg/go/types#TypeParamList.TypeParams)、
[`Union.Terms`](/pkg/go/types#Union.Terms)。

#### [`hash/adler32`](/pkg/hash/adler32/)

[`New`](/pkg/hash/adler32#New) 函数返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`hash/crc32`](/pkg/hash/crc32/)

[`New`](/pkg/hash/crc32#New) 和 [`NewIEEE`](/pkg/hash/crc32#NewIEEE) 函数返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`hash/crc64`](/pkg/hash/crc64/)

[`New`](/pkg/hash/crc64#New) 函数返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`hash/fnv`](/pkg/hash/fnv/)

[`New32`](/pkg/hash/fnv#New32)、[`New32a`](/pkg/hash/fnv#New32a)、[`New64`](/pkg/hash/fnv#New64)、[`New64a`](/pkg/hash/fnv#New64a)、[`New128`](/pkg/hash/fnv#New128) 和 [`New128a`](/pkg/hash/fnv#New128a) 函数返回的值现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`hash/maphash`](/pkg/hash/maphash/)

新增的 [`Comparable`](/pkg/hash/maphash#Comparable) 和 [`WriteComparable`](/pkg/hash/maphash#WriteComparable) 函数可以计算任何可比较值的哈希值。这使得哈希任何可作为 Go map 键的值成为可能。

#### [`log/slog`](/pkg/log/slog/)

新增的 [`DiscardHandler`](/pkg/log/slog#DiscardHandler) 是一个永远不会被启用并始终丢弃其输出的处理器。

[`Level`](/pkg/log/slog#Level) 和 [`LevelVar`](/pkg/log/slog#LevelVar) 现在实现了 [`encoding.TextAppender`](/pkg/encoding#TextAppender) 接口。

#### [`math/big`](/pkg/math/big/)

[`Float`](/pkg/math/big#Float)、[`Int`](/pkg/math/big#Int) 和 [`Rat`](/pkg/math/big#Rat) 现在实现了 [`encoding.TextAppender`](/pkg/encoding#TextAppender) 接口。

#### [`math/rand`](/pkg/math/rand/)

调用已弃用的顶层 [`Seed`](/pkg/math/rand#Seed) 函数不再产生任何效果。要恢复旧行为，请使用 [GODEBUG 设置](/doc/godebug) `randseednop=0`。更多背景信息请参见 [提案 #67273](/issue/67273)。

#### [`math/rand/v2`](/pkg/math/rand/v2/)

[`ChaCha8`](/pkg/math/rand/v2#ChaCha8) 和 [`PCG`](/pkg/math/rand/v2#PCG) 现在实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`net`](/pkg/net/)

[`ListenConfig`](/pkg/net#ListenConfig) 现在默认在支持的系统上使用 MPTCP（目前仅限于 Linux）。

[`IP`](/pkg/net#IP) 现在实现了 [`encoding.TextAppender`](/pkg/encoding#TextAppender) 接口。

#### [`net/http`](/pkg/net/http/)

[`Transport`](/pkg/net/http#Transport) 对请求响应中接收到的 1xx 信息性响应的限制已更改。它之前会在接收到超过 5 个 1xx 响应后中止请求并返回错误。现在，如果所有 1xx 响应的总大小超过 [`Transport.MaxResponseHeaderBytes`](/pkg/net/http#Transport.MaxResponseHeaderBytes) 配置设置，则会返回错误。

此外，当请求设置了 [`net/http/httptrace.ClientTrace.Got1xxResponse`](/pkg/net/http/httptrace#ClientTrace.Got1xxResponse) 跟踪钩子时，现在对 1xx 响应的总数没有限制。`Got1xxResponse` 钩子可以返回错误以中止请求。

[`Transport`](/pkg/net/http#Transport) 和 [`Server`](/pkg/net/http#Server) 现在都有一个 HTTP2 字段，允许配置 HTTP/2 协议设置。

新增的 [`Server.Protocols`](/pkg/net/http#Server.Protocols) 和 [`Transport.Protocols`](/pkg/net/http#Transport.Protocols) 字段提供了一种简单的方式来配置服务器或客户端使用的 HTTP 协议。

服务器和客户端可以配置为支持未加密的 HTTP/2 连接。

当 [`Server.Protocols`](/pkg/net/http#Server.Protocols) 包含 `UnencryptedHTTP2` 时，服务器将在未加密端口上接受 HTTP/2 连接。服务器可以在同一端口上同时接受 HTTP/1 和未加密的 HTTP/2。

当 [`Transport.Protocols`](/pkg/net/http#Transport.Protocols) 包含 `UnencryptedHTTP2` 且不包含 `HTTP1` 时，传输层将为 `http://` URL 使用未加密的 HTTP/2。如果传输层配置为同时使用 HTTP/1 和未加密的 HTTP/2，它将使用 HTTP/1。

未加密的 HTTP/2 支持使用“具有先验知识的 HTTP/2”（RFC 9113，第 3.3 节）。不支持已弃用的“Upgrade: h2c”头。

#### [`net/netip`](/pkg/net/netip/)

[`Addr`](/pkg/net/netip#Addr)、[`AddrPort`](/pkg/net/netip#AddrPort) 和 [`Prefix`](/pkg/net/netip#Prefix) 现在实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 和 [`encoding.TextAppender`](/pkg/encoding#TextAppender) 接口。

#### [`net/url`](/pkg/net/url/)

[`URL`](/pkg/net/url#URL) 现在也实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 接口。

#### [`os/user`](/pkg/os/user/)

在 Windows 上，[`Current`](/pkg/os/user#Current) 现在可以在 Windows Nano Server 中使用。其实现已更新，以避免使用 Nano Server 中不可用的 `NetApi32` 库中的函数。

在 Windows 上，[`Current`](/pkg/os/user#Current)、[`Lookup`](/pkg/os/user#Lookup) 和 [`LookupId`](/pkg/os/user#LookupId) 现在支持以下内置服务用户账户：
- `NT AUTHORITY\SYSTEM`
- `NT AUTHORITY\LOCAL SERVICE`
- `NT AUTHORITY\NETWORK SERVICE`在 Windows 系统上，当当前用户隶属于一个缓慢的域时（这在许多企业用户中是常见情况），[`Current`](/pkg/os/user#Current) 函数的速度已得到显著提升。新实现的性能现在达到毫秒级别，而之前的实现可能需要数秒甚至数分钟才能完成。

在 Windows 系统上，当当前线程正在模拟其他用户时，[`Current`](/pkg/os/user#Current) 现在会返回进程所有者用户。此前，该操作会返回一个错误。

#### [`regexp`](/pkg/regexp/)

[`Regexp`](/pkg/regexp#Regexp) 现在实现了 [`encoding.TextAppender`](/pkg/encoding#TextAppender) 接口。

#### [`runtime`](/pkg/runtime/)

[`GOROOT`](/pkg/runtime#GOROOT) 函数现已弃用。在新代码中，建议使用系统路径来定位“go”二进制文件，并使用 `go env GOROOT` 命令来查找其 GOROOT。

#### [`strings`](/pkg/strings/)

[`strings`](/pkg/strings) 包新增了几个处理迭代器的函数：
- [`Lines`](/pkg/strings#Lines) 返回一个迭代器，遍历字符串中以换行符结尾的行。
- [`SplitSeq`](/pkg/strings#SplitSeq) 返回一个迭代器，遍历字符串中围绕分隔符分割的所有子串。
- [`SplitAfterSeq`](/pkg/strings#SplitAfterSeq) 返回一个迭代器，遍历字符串中在每个分隔符实例之后分割得到的子串。
- [`FieldsSeq`](/pkg/strings#FieldsSeq) 返回一个迭代器，遍历字符串中围绕空白字符序列分割的子串，空白字符的定义参照 [`unicode.IsSpace`](/pkg/unicode#IsSpace)。
- [`FieldsFuncSeq`](/pkg/strings#FieldsFuncSeq) 返回一个迭代器，遍历字符串中围绕满足特定谓词的 Unicode 码点序列分割的子串。

#### [`sync`](/pkg/sync/)

[`sync.Map`](/pkg/sync#Map) 的实现已更新，提升了性能，尤其是在映射修改方面。例如，对不相交键集的修改在较大映射上发生竞争的可能性大大降低，并且不再需要任何预热时间即可实现从映射中进行低竞争加载。

如果您遇到任何问题，请在构建时设置 `GOEXPERIMENT=nosynchashtriemap` 以切换回旧实现，并请[提交问题](/issue/new)。

#### [`testing`](/pkg/testing/)

新增的 [`T.Context`](/pkg/testing#T.Context) 和 [`B.Context`](/pkg/testing#B.Context) 方法会返回一个上下文（context），该上下文在测试完成之后、测试清理函数运行之前被取消。

<!-- 6-stdlib/6-testing-bloop.md 中提到的 testing.B.Loop。 -->

新增的 [`T.Chdir`](/pkg/testing#T.Chdir) 和 [`B.Chdir`](/pkg/testing#B.Chdir) 方法可用于在测试或基准测试运行期间更改工作目录。

#### [`text/template`](/pkg/text/template/)

模板现在支持 range-over-func 和 range-over-int。

#### [`time`](/pkg/time/)

[`Time`](/pkg/time#Time) 现在实现了 [`encoding.BinaryAppender`](/pkg/encoding#BinaryAppender) 和 [`encoding.TextAppender`](/pkg/encoding#TextAppender) 接口。

## 移植性 {#ports}

### Linux {#linux}

<!-- go.dev/issue/67001 -->
正如 Go 1.23 版本说明中[宣布](go1.23#linux)的那样，Go 1.24 要求 Linux 内核版本 3.2 或更高。

### Darwin {#darwin}

<!-- go.dev/issue/69839 -->
Go 1.24 是最后一个支持在 macOS 11 Big Sur 上运行的版本。Go 1.25 将要求 macOS 12 Monterey 或更高版本。

### WebAssembly {#wasm}

<!-- go.dev/issue/65199, CL 603055 -->
新增了 `go:wasmexport` 编译器指令，允许 Go 程序向 WebAssembly 宿主导出函数。

在 WebAssembly 系统接口预览版 1 (`GOOS=wasip1 GOARCH=wasm`) 上，Go 1.24 支持通过指定 `-buildmode=c-shared` 构建标志，将 Go 程序构建为[反应器/库](https://github.com/WebAssembly/WASI/blob/63a46f61052a21bfab75a76558485cf097c0dbba/legacy/application-abi.md#current-unstable-abi)。

<!-- go.dev/issue/66984, CL 626615 -->
现在允许将更多类型用作 `go:wasmimport` 函数的参数或结果类型。具体来说，允许使用 `bool`、`string`、`uintptr` 以及指向特定类型的指针（详见[文档](/pkg/cmd/compile#hdr-WebAssembly_Directives)），同时也允许使用已支持的 32 位和 64 位整数与浮点类型以及 `unsafe.Pointer`。这些类型同样被允许用作 `go:wasmexport` 函数的参数或结果类型。

<!-- go.dev/issue/68024 -->
WebAssembly 的支持文件已从 `misc/wasm` 移动到 `lib/wasm`。

<!-- CL 621635, CL 621636 -->
初始内存大小已显著减小，尤其是对于小型 WebAssembly 应用程序。

### Windows {#windows}

<!-- go.dev/issue/70705 -->
32 位 windows/arm 端口 (`GOOS=windows GOARCH=arm`) 已被标记为损坏。详情请参阅 [issue #70705](/issue/70705)。

<!-- 无需在 Go 1.24 版本说明中提及，但会被 relnote todo 捕获的条目。 -->已接受提案 https://go.dev/issue/25309（来自 https://go.dev/cl/594018、https://go.dev/cl/595120、https://go.dev/cl/595564、https://go.dev/cl/601778）- 新增 x/crypto 包；似乎无需提及
已接受提案 https://go.dev/issue/43744（来自 https://go.dev/cl/357530）- 标准库无变化
已接受提案 https://go.dev/issue/60905（来自 https://go.dev/cl/610195）- CL 610195 已被回滚
已接受提案 https://go.dev/issue/61395（来自 https://go.dev/cl/594738、https://go.dev/cl/594976）- CL 594738 使 sync/atomic 的 AND/OR 操作在 amd64 上成为内建函数，但该 API 已在 Go 1.23 中添加；CL 594976 是一个修复；可能不需要在 Go 1.24 版本说明中提及（仅为性能变更）
已接受提案 https://go.dev/issue/51269（来自 https://go.dev/cl/627035）- 可能值得在 Go 1.24 版本说明中提及，也可能省略无妨；已在 https://go.dev/issue/51269#issuecomment-2501802763 留下评论；Ian 确认可以省略
已接受提案 https://go.dev/issue/66540（来自 https://go.dev/cl/603958）- Go 语言规范澄清；可能不需要在 Go 1.24 版本说明中提及；已在 https://go.dev/issue/66540#issuecomment-2502051684 留下评论；Robert 确认确实不需要
已接受提案 https://go.dev/issue/34208（来自 https://go.dev/cl/586241）- CL 586241 为 Go 1.23 功能实现了一个修复，似乎不需要在 Go 1.24 版本说明中提及任何内容
已接受提案 https://go.dev/issue/43993（来自 https://go.dev/cl/626116）- CL 626116 为即将进行的 vet 变更做了准备，但该 vet 变更本身在 Go 1.24 中并未实现，因此 Go 1.24 版本说明中无需提及
已接受提案 https://go.dev/issue/44505（来自 https://go.dev/cl/609955）- CL 609955 是 x/tools 中的一项内部清理工作，无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/61476（来自 https://go.dev/cl/608255）- CL 608255 基于 Go 1.23 新增的 GORISCV64 构建；Go 1.24 版本说明中无需提及
已接受提案 https://go.dev/issue/66315（来自 https://go.dev/cl/577996）- 在 x/tools/go/analysis 中添加 Pass.Module 字段，似乎不需要在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/57786（来自 https://go.dev/cl/472717）- CL 472717 位于 x/net/http2 中，并提及了一个 Go 1.21 提案；似乎不需要在 Go 1.24 版本说明中提及任何内容
已接受提案 https://go.dev/issue/54265（来自 https://go.dev/cl/609915、https://go.dev/cl/610675）- 引用了 Go 1.22 提案的 CL，Go 1.24 版本说明中无需再提及更多内容
已接受提案 https://go.dev/issue/53021（来自 https://go.dev/cl/622276）- CL 622276 改进了文档；提案 53021 在 Go 1.20 中已处理，因此 Go 1.24 版本说明中无需再提及
已接受提案 https://go.dev/issue/51430（来自 https://go.dev/cl/613375）- CL 613375 是一项内部文档注释；提案 51430 在 Go 1.20/1.21 中已处理，因此 Go 1.24 版本说明中无需再提及
已接受提案 https://go.dev/issue/38445（来自 https://go.dev/cl/626495）- CL 626495 处理提案 38445，该提案涉及 x/tools/go/package，无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/56986（来自 https://go.dev/cl/618115）- CL 618115 添加了文档；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/60061（来自 https://go.dev/cl/612038）- CL 612038 是一个 CL，它弃用了 x/tools/go/ast 中的某些内容，并提及了一个 Go 1.22 提案；无需在 Go 1.24 版本说明中提及任何内容
已接受提案 https://go.dev/issue/61324（来自 https://go.dev/cl/411907）- CL 411907 是一个 x/tools 的 CL，它为该处的一个新包实现了提案；无需在 Go 1.24 版本说明中提及任何内容
已接受提案 https://go.dev/issue/61777（来自 https://go.dev/cl/601496）- CL 601496 为 x/net/http2.Server 添加了 WriteByteTimeout 字段；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/61940（来自 https://go.dev/cl/600997）- CL 600997 删除了 x/build 中的过时代码，并提及了一个已接受的提案；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/62113（来自 https://go.dev/cl/594195）- CL 594195 在 x/net/html 中进行了与迭代器相关的添加；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/62484（来自 https://go.dev/cl/600775）- CL 600775 记录了 CopyFS 的符号链接行为，并提及了 Go 1.23 提案；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/64207（来自 https://go.dev/cl/605875）- 一个 x/website 的 CL，是 Go 1.23 提案的后续；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/65236（来自 https://go.dev/cl/596135）- CL 596135 为 Go 1.23 提案 65236 添加了测试；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/67795（来自 https://go.dev/cl/616218）- 为 x/tools/go/ast/inspector 提供迭代器支持；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/67812（来自 https://go.dev/cl/601497）- x/net/http2.Server 的可配置服务器 ping；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/68232（来自 https://go.dev/cl/595676）- x/sys/unix 的新增内容；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/68898（来自 https://go.dev/cl/607495、https://go.dev/cl/620036、https://go.dev/cl/620135、https://go.dev/cl/623638）- 一项关于 x/tools/go/gcexportdata 的提案，旨在记录支持 2 个发布版 + tip 的策略；由于变更位于 x/tools 中，无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/69095（来自 https://go.dev/cl/593683、https://go.dev/cl/608955、https://go.dev/cl/610716）- 一项影响 golang.org/x 代码仓库维护和支持的提案；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/68384（来自 https://go.dev/cl/611875）- 将 Go 遥测的范围扩大以包含 Delve，这与 Go 1.24 并无直接关联，似乎无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/69291（来自 https://go.dev/cl/610939）- CL 610939 重构了 x/tools 中的代码，并提及了仍在开放的提案 #69291，该提案旨在向 x/tools/go/ssa/ssautil 添加 Reachable；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/69360（来自 https://go.dev/cl/614158、https://go.dev/cl/614159、https://go.dev/cl/614635、https://go.dev/cl/614675）- 提案 69360 旨在标记并从 x/tools 中删除 gorename；无需在 Go 1.24 版本说明中提及
已接受提案 https://go.dev/issue/61417（来自 https://go.dev/cl/605955）- x/oauth2 中的一个新字段；Go 1.24 版本说明中无需提及
已接受提案 https://go.dev/issue/29266（来自 https://go.dev/cl/632897）- 一项仅涉及 go.dev/doc/contribute 文档的提案；无需在 Go 1.24 版本说明中提及
-->