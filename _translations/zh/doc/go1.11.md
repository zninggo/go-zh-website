---
title: Go 1.11 发布说明
---

<!--
注意：在本目录下的此文档及其他文档中，通常的作法是
将固定宽度短语用非固定宽度空格分隔，如
`hello` `world`。
请勿提交移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.11 简介 {#introduction}

Go 最新版本 1.11 在 [Go 1.10](go1.10) 发布六个月后面世。
其大部分变更集中在工具链、运行时和库的实现层面。
一如既往，此版本遵循 Go 1 [兼容性承诺](/doc/go1compat.html)。
我们预期几乎所有 Go 程序都能像以前一样继续编译和运行。

## 语言变更 {#language}

语言规范无任何变更。

## 平台支持 {#ports}

<!-- CL 94255, CL 115038 等 -->
如 [Go 1.10 发布说明](go1.10#ports)中所宣布，Go 1.11 现在要求
OpenBSD 6.2 或更高版本、macOS 10.10 Yosemite 或更高版本，或 Windows 7 或更高版本；
已移除对这些操作系统旧版本的支持。

<!-- CL 121657 -->
Go 1.11 支持即将发布的 OpenBSD 6.4。由于
OpenBSD 内核的变更，旧版本的 Go 将无法在 OpenBSD 6.4 上运行。

NetBSD 在 i386 硬件上存在[已知问题](/issue/25206)。

<!-- CL 107935 -->
竞态检测器现支持 `linux/ppc64le` 平台，对 `netbsd/amd64` 的支持程度稍低。NetBSD 的竞态检测器支持存在[已知问题](/issue/26403)。

<!-- CL 109255 -->
内存消毒器 (`-msan`) 现支持 `linux/arm64` 平台。

<!-- CL 93875 -->
构建模式 `c-shared` 和 `c-archive` 现支持 `freebsd/amd64` 平台。

<!-- CL 108475 -->
在 64 位 MIPS 系统上，新增环境变量设置 `GOMIPS64=hardfloat`（默认值）和 `GOMIPS64=softfloat` 可选择浮点计算使用硬件指令还是软件模拟。
对于 32 位系统，环境变量仍为 `GOMIPS`，如 [Go 1.10 中新增](go1.10#mips)。

<!-- CL 107475 -->
在软浮点 ARM 系统（`GOARM=5`）上，Go 现使用更高效的软件浮点接口。这对 Go 代码是透明的，但使用了浮点指令且未基于 GOARM 做保护的 ARM 汇编将无法工作，必须移植到[新接口](/cl/107475)。

<!-- CL 94076 -->
Go 1.11 在 ARMv7 上不再要求 Linux 内核配置 `KUSER_HELPERS`。此设置在默认内核配置中已启用，但有时在精简配置中会被禁用。

### WebAssembly {#wasm}

Go 1.11 新增了对 [WebAssembly](https://webassembly.org) (`js/wasm`) 的实验性平台支持。

Go 程序目前编译为一个 WebAssembly 模块，其中包含用于 goroutine 调度、垃圾回收、映射等的 Go 运行时。
因此，生成的文件大小最小约为 2 MB，压缩后约为 500 KB。Go 程序可以使用新的实验性 [`syscall/js`](/pkg/syscall/js/) 包调用 JavaScript。
与其他语言的二进制大小和互操作性尚未列为优先事项，但可能会在未来的版本中解决。

由于新增了 `GOOS` 值 "`js`" 和 `GOARCH` 值 "`wasm`"，
名为 `*_js.go` 或 `*_wasm.go` 的 Go 文件现将[被 Go 工具忽略](/pkg/go/build/#hdr-Build_Constraints)，除非使用了对应的 GOOS/GOARCH 值。
如果您现有文件名匹配这些模式，则需要重命名它们。

更多信息可在 [Wiki 页面](/wiki/WebAssembly)上找到。

### RISC-V GOARCH 值预留 {#riscv}

<!-- CL 106256 -->
主 Go 编译器尚未支持 RISC-V 架构 <!-- is gonna change everything -->
但我们已预留了 `GOARCH` 值 "`riscv`" 和 "`riscv64`"，这与支持 RISC-V 的 Gccgo 所使用的相同。这意味着
名为 `*_riscv.go` 的 Go 文件现也将[被 Go 工具忽略](/pkg/go/build/#hdr-Build_Constraints)，除非使用了对应的 GOOS/GOARCH 值。

## 工具 {#tools}

### 模块、包版本管理与依赖管理 {#modules}

Go 1.11 新增了对[一种名为“模块”的新概念](/cmd/go/#hdr-Modules__module_versions__and_more)的初步支持，作为 GOPATH 的替代方案，它集成了版本管理和包分发功能。
使用模块，开发者不再局限于在 GOPATH 内工作，版本依赖信息明确且轻量，构建更可靠且可重现。

模块支持被视为实验性功能。
其细节很可能会根据 Go 1.11 用户的反馈而变化，并且我们规划了更多工具。
尽管模块支持的细节可能发生变化，但使用 Go 1.11 转换为模块的项目将在 Go 1.12 及更高版本中继续工作。
如果您在使用模块时遇到错误，请[提交问题](/issue/new)以便我们修复。更多信息请参阅 [`go` 命令文档](/cmd/go#hdr-Modules__module_versions__and_more)。

### 导入路径限制 {#importpath}

由于 Go 模块支持在命令行操作中为 `@` 符号赋予了特殊含义，
`go` 命令现禁止使用包含 `@` 符号的导入路径。
此类导入路径从未被 `go` `get` 允许，因此此限制只会影响通过其他方式构建自定义 GOPATH 树的用户。

### 包加载 {#gopackages}

新包 [`golang.org/x/tools/go/packages`](https://godoc.org/golang.org/x/tools/go/packages) 提供了一个简单的 API，用于定位和加载 Go 源代码包。
虽然它尚未成为标准库的一部分，但对于许多任务，它实际上取代了 [`go/build`](/pkg/go/build) 包，因为后者的 API 无法完全支持模块。
由于它运行外部查询命令（如 [`go list`](/cmd/go/#hdr-List_packages)）来获取 Go 包的信息，因此能够构建与 [Bazel](https://bazel.build) 和 [Buck](https://buckbuild.com) 等替代构建系统同样高效工作的分析工具。### 构建缓存要求 {#gocache}

Go 1.11 将是支持通过设置环境变量 `GOCACHE=off` 来禁用[构建缓存](/cmd/go/#hdr-Build_and_test_caching)的最后一个版本，该缓存功能于 Go 1.10 中引入。从 Go 1.12 开始，构建缓存将成为必需项，这是逐步淘汰 `$GOPATH/pkg` 路径的一步。上文所述的模块和包加载支持已经要求启用构建缓存。如果您为了规避之前遇到的问题而禁用了构建缓存，请[提交一个问题报告](/issue/new)让我们知晓。

### 编译器工具链 {#compiler}

<!-- CL 109918 -->
现在，默认情况下更多函数具备内联资格，包括调用 `panic` 的函数。

<!-- CL 97375 -->
编译器工具链现在支持[行指令](/cmd/compile/#hdr-Compiler_Directives)中的列信息。

<!-- CL 106797 -->
引入了一种新的包导出数据格式。这对最终用户应该是透明的，主要作用是加速大型 Go 项目的构建时间。如果确实导致问题，可以在构建二进制文件时通过向 `go` 工具传递 `-gcflags=all=-iexport=false` 来再次禁用它。

<!-- CL 100459 -->
编译器现在会拒绝在类型开关（type switch）守卫中声明但未使用的变量，如下例中的 `x`：

	func f(v interface{}) {
		switch x := v.(type) {
		}
	}

`gccgo` 和 [go/types](/pkg/go/types/) 此前就已经拒绝这种情况。

### 汇编器 {#assembler}

<!-- CL 113315 -->
`amd64` 架构的汇编器现在接受 AVX512 指令。

### 调试 {#debugging}

<!-- CL 100738, CL 93664 -->
编译器现在为优化过的二进制文件生成显著更准确的调试信息，包括变量位置信息、行号和断点位置。这使得调试 _未_ 使用 `-N`&nbsp;`-l` 编译的二进制文件成为可能。调试信息的质量仍存在一些限制，其中一些是根本性的，另一些将在未来的版本中持续改进。

<!-- CL 118276 -->
由于编译器生成的调试信息范围更广、更准确，DWARF 段现在默认进行压缩。这对大多数 ELF 工具（例如 Linux 和 \*BSD 上的调试器）是透明的，并且在所有平台上都受到 Delve 调试器的支持，但在 macOS 和 Windows 的原生工具中支持有限。要禁用 DWARF 压缩，可在构建二进制文件时向 `go` 工具传递 `-ldflags=-compressdwarf=false`。

<!-- CL 109699 -->
Go 1.11 增加了从调试器内部调用 Go 函数的实验性支持。例如，当在断点处暂停时调用 `String` 方法非常有用。目前这仅受 Delve（1.1.0 及以上版本）支持。

### 测试 {#test}

自 Go 1.10 起，`go`&nbsp;`test` 命令会在被测包上运行 `go`&nbsp;`vet`，以便在运行测试前识别问题。由于 `vet` 在运行前会使用 [go/types](/pkg/go/types/) 对代码进行类型检查，因此类型检查不通过的测试现在将会失败。具体而言，在 Go 1.10 编译的闭包中包含未使用变量的测试能够通过，是因为 Go 编译器错误地接受了它们（[Issue #3059](/issues/3059)），但现在将会失败，因为 `go/types` 在这种情况下会正确报告“未使用变量”的错误。

<!-- CL 102696 -->
`go`&nbsp;`test` 的 `-memprofile` 标志现在默认使用“allocs”配置文件，该文件记录自测试开始以来分配的总字节数（包括已被垃圾回收的字节）。

### Vet {#vet}

<!-- CL 108555 -->
当被分析的包未通过类型检查时，[`go`&nbsp;`vet`](/cmd/vet/) 命令现在会报告一个致命错误。此前，类型检查错误只会导致打印一条警告，并且 `vet` 以状态码 1 退出。

<!-- CL 108559 -->
此外，[`go`&nbsp;`vet`](/cmd/vet) 在对 `printf` 包装函数进行格式检查时变得更加健壮。Vet 现在能检测出此示例中的错误：

	func wrapper(s string, args ...interface{}) {
		fmt.Printf(s, args...)
	}

	func main() {
		wrapper("%s", 42)
	}

### 跟踪 {#trace}

<!-- CL 63274 -->
通过新的 `runtime/trace` 包的[用户注解 API](/pkg/runtime/trace/#hdr-User_annotation)，用户可以在执行跟踪中记录应用层信息，并创建相关 goroutine 的分组。`go`&nbsp;`tool`&nbsp;`trace` 命令在跟踪视图以及新的用户任务/区域分析页面中可视化此信息。

### Cgo {#cgo}

自 Go 1.10 起，cgo 将一些 C 指针类型转换为 Go 类型 `uintptr`。这些类型包括 Darwin CoreFoundation 框架中的 `CFTypeRef` 层次结构和 Java JNI 接口中的 `jobject` 层次结构。在 Go 1.11 中，检测这些类型的代码得到了若干改进。使用这些类型的代码可能需要一些更新。详情请参阅 [Go 1.10 版本说明](go1.10.html#cgo)。 <!-- CL 126275, CL 127156, CL 122217, CL 122575, CL 123177 -->

### Go 命令 {#go_command}

<!-- CL 126656 -->
环境变量 `GOFLAGS` 现在可用于为 `go` 命令设置默认标志。这在某些情况下很有用。在性能较弱的系统上，由于 DWARF 信息，链接过程可能会明显变慢，用户可能希望默认设置 `-ldflags=-w`。对于模块，一些用户和持续集成系统会希望始终使用 vendor 模式，因此他们应该默认设置 `-mod=vendor`。更多信息，请参阅 [`go` 命令文档](/cmd/go/#hdr-Environment_variables)。

### Godoc {#godoc}

Go 1.11 将是支持 `godoc` 命令行界面的最后一个版本。在未来的版本中，`godoc` 将只作为网页服务器。用户应改用 `go` `doc` 来获取命令行帮助输出。<!-- CL 85396, CL 124495 -->
`godoc` 网页服务器现在会显示引入新 API 功能的 Go 版本。类型、函数和方法的初始 Go 版本会显示在右侧对齐。例如，请参阅 [`UserCacheDir`](/pkg/os/#UserCacheDir)，其右侧标有 "1.11"。对于结构体字段，如果该字段是在与类型本身不同的 Go 版本中添加的，则会添加内联注释。
结构体字段示例，请参阅 [`ClientTrace.Got1xxResponse`](/pkg/net/http/httptrace/#ClientTrace.Got1xxResponse)。

### Gofmt {#gofmt}

Go 源代码默认格式化的一个细节发生了变化。
当格式化带有内联注释的表达式列表时，注释原本会按照某种启发式规则进行对齐。
然而，在某些情况下，对齐可能过于容易被打断，或者引入过多的空白。
该启发式规则已更改，以便更好地处理人工编写的代码。

请注意，gofmt 的此类微小更新预计会不时出现。
通常，需要一致格式化 Go 源代码的系统应使用特定版本的 `gofmt` 二进制文件。
更多信息，请参阅 [go/format](/pkg/go/format/) 包文档。

### Run {#run}

<!-- CL 109341 -->
[`go`&nbsp;`run`](/cmd/go/) 命令现在允许指定单个导入路径、目录名称或匹配单个包的模式。
这允许 `go`&nbsp;`run`&nbsp;`pkg` 或 `go`&nbsp;`run`&nbsp;`dir`，最重要的是 `go`&nbsp;`run`&nbsp;`.`。

## Runtime {#runtime}

<!-- CL 85887 -->
运行时现在使用稀疏堆布局，因此 Go 堆的大小不再有限制（之前的限制是 512GiB）。
这也修复了在混合 Go/C 二进制文件或使用 `-race` 编译的二进制文件中偶尔出现的 "address space conflict" 故障。

<!-- CL 108679, CL 106156 -->
在 macOS 和 iOS 上，运行时现在使用 `libSystem.dylib` 而不是直接调用内核。这应该会使 Go 二进制文件与 macOS 和 iOS 的未来版本更加兼容。
[syscall](/pkg/syscall) 包仍然进行直接系统调用；修复此问题计划在未来的版本中进行。

## Performance {#performance}

一如既往，变化如此普遍和多样，以至于很难对性能做出精确的表述。由于生成代码的改进以及核心库的优化，大多数程序的运行速度应该会略有提升。

<!-- CL 74851 -->
`math/big` 包有多项性能改进，同时整个代码树中针对 `GOARCH=arm64` 的改动也有很多。

### Compiler toolchain {#performance-compiler}

<!-- CL 110055 -->
编译器现在优化了以下形式的 map 清除操作：

	for k := range m {
		delete(m, k)
	}

<!-- CL 109517 -->
编译器现在优化了 `append(s,`&nbsp;`make([]T,`&nbsp;`n)...)` 形式的切片扩展操作。

<!-- CL 100277, CL 105635, CL 109776 -->
编译器现在执行了更加积极的边界检查消除和分支消除。值得注意的是，它现在能识别传递关系，因此如果 `i<j` 且 `j<len(s)`，它可以利用这些事实消除 `s[i]` 的边界检查。它还能理解简单的算术运算，如 `s[i-10]`，并能在循环中识别更多的归纳情况。此外，编译器现在利用边界信息更积极地优化移位操作。

## Standard library {#library}

标准库的所有改动都是次要的。

### Minor changes to the library {#minor_library_changes}

一如既往，库中有各种次要的改动和更新，均遵循 Go 1 的[兼容性承诺](/doc/go1compat)。

<!-- CL 115095: https://golang.org/cl/115095: yes (`go test pkg` now always builds pkg even if there are no test files): cmd/go: output coverage report even if there are no test files -->
<!-- CL 110395: https://golang.org/cl/110395: cmd/go, cmd/compile: use Windows response files to avoid arg length limits -->
<!-- CL 112436: https://golang.org/cl/112436: cmd/pprof: add readline support similar to upstream -->

#### [crypto](/pkg/crypto/)

<!-- CL 64451 -->
某些加密操作，包括 [`ecdsa.Sign`](/pkg/crypto/ecdsa/#Sign)、[`rsa.EncryptPKCS1v15`](/pkg/crypto/rsa/#EncryptPKCS1v15) 和 [`rsa.GenerateKey`](/pkg/crypto/rsa/#GenerateKey)，现在会随机读取一个额外的随机字节，以确保测试不依赖于内部行为。

<!-- crypto -->

#### [crypto/cipher](/pkg/crypto/cipher/)

<!-- CL 48510, CL 116435 -->
新函数 [`NewGCMWithTagSize`](/pkg/crypto/cipher/#NewGCMWithTagSize) 实现了具有非标准标签长度的 Galois 计数器模式，以便与现有密码系统兼容。

<!-- crypto/cipher -->

#### [crypto/rsa](/pkg/crypto/rsa/)

<!-- CL 103876 -->
[`PublicKey`](/pkg/crypto/rsa/#PublicKey) 现在实现了 [`Size`](/pkg/crypto/rsa/#PublicKey.Size) 方法，该方法返回以字节为单位的模数大小。

<!-- crypto/rsa -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 85115 -->
[`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 的新方法 [`ExportKeyingMaterial`](/pkg/crypto/tls/#ConnectionState.ExportKeyingMaterial) 允许根据 RFC 5705 导出与连接绑定的密钥材料。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 123355, CL 123695 -->
当没有主题备用名称时，将 `CommonName` 字段视为主机名的已弃用、传统行为，现在如果 CN 不是有效的主机名，则会被禁用。
通过将实验性值 `x509ignoreCN=1` 添加到 `GODEBUG` 环境变量，可以完全忽略 `CommonName`。
当 CN 被忽略时，没有 SAN 的证书将在具有名称约束的链下进行验证，而不是返回 `NameConstraintsWithoutSANs`。

<!-- CL 113475 -->
扩展密钥使用限制现在仅当它们出现在 [`VerifyOptions`](/pkg/crypto/x509/#VerifyOptions) 的 `KeyUsages` 字段中时才进行检查，而不是总是进行检查。
这符合 Go 1.9 及更早版本的行为。<!-- CL 102699 -->
[`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool) 返回的值现在会被缓存，并且可能不会反映调用之间的系统变更。

<!-- crypto/x509 -->

#### [debug/elf](/pkg/debug/elf/)

<!-- CL 112115 -->
新增了更多 [`ELFOSABI`](/pkg/debug/elf/#ELFOSABI_NONE) 和 [`EM`](/pkg/debug/elf/#EM_NONE) 常量。

<!-- debug/elf -->

#### [encoding/asn1](/pkg/encoding/asn1/)

<!-- CL 110561 -->
`Marshal` 和 [`Unmarshal`](/pkg/encoding/asn1/#Unmarshal) 现在支持字段的 "private" 类注解。

<!-- encoding/asn1 -->

#### [encoding/base32](/pkg/encoding/base32/)

<!-- CL 112516 -->
解码器现在在遇到不完整的数据块时，会一致地返回 `io.ErrUnexpectedEOF`。此前，在某些情况下它会返回 `io.EOF`。

<!-- encoding/base32 -->

#### [encoding/csv](/pkg/encoding/csv/)

<!-- CL 99696 -->
`Reader` 现在会拒绝将 [`Comma`](/pkg/encoding/csv/#Reader.Comma) 字段设置为双引号字符的尝试，因为双引号字符在 CSV 中已有特殊含义。

<!-- encoding/csv -->

<!-- CL 100235 已被撤回 -->

#### [html/template](/pkg/html/template/)

<!-- CL 121815 -->
该包更改了将类型化接口值传递给隐式转义函数时的行为。此前，这样的值会被输出为 `<nil>` 的（转义后的）形式。现在，这类值会被忽略，就像非类型化的 `nil` 值被（并且一直是）忽略一样。

<!-- html/template -->

#### [image/gif](/pkg/image/gif/)

<!-- CL 93076 -->
现在支持非循环播放的动画 GIF。它们通过将 [`LoopCount`](/pkg/image/gif/#GIF.LoopCount) 设置为 -1 来表示。

<!-- image/gif -->

#### [io/ioutil](/pkg/io/ioutil/)

<!-- CL 105675 -->
[`TempFile`](/pkg/io/ioutil/#TempFile) 函数现在支持指定文件名中随机字符的位置。如果 `prefix` 参数包含 "`*`"，则随机字符串将替换该 "`*`"。例如，`prefix` 参数为 "`myname.*.bat`" 将生成类似 "`myname.123456.bat`" 的随机文件名。如果不包含 "`*`"，则保留旧行为，随机数字将追加在末尾。

<!-- io/ioutil -->

#### [math/big](/pkg/math/big/)

<!-- CL 108996 -->
[`ModInverse`](/pkg/math/big/#Int.ModInverse) 现在当 g 和 n 不互质时返回 nil。此前其结果是未定义的。

<!-- math/big -->

#### [mime/multipart](/pkg/mime/multipart/)

<!-- CL 121055 -->
对缺失/空文件名的表单数据的处理已恢复到 Go 1.9 中的行为：在表单数据部分的 [`Form`](/pkg/mime/multipart/#Form) 中，该值可在 `Value` 字段中找到，而不是在 `File` 字段中。在 Go 1.10 至 1.10.3 版本中，具有缺失/空文件名且“Content-Type”字段非空的表单数据部分被存储在 `File` 字段中。这个变更在 1.10 中是一个错误，现已恢复为 1.9 的行为。

<!-- mime/multipart -->

#### [mime/quotedprintable](/pkg/mime/quotedprintable/)

<!-- CL 121095 -->
为了支持实际中发现的无效输入，该包现在允许非 ASCII 字节，但不验证其编码。

<!-- mime/quotedprintable -->

#### [net](/pkg/net/)

<!-- CL 72810 -->
新增的 [`ListenConfig`](/pkg/net/#ListenConfig) 类型和新增的 [`Dialer.Control`](/pkg/net/#Dialer.Control) 字段分别允许在接受连接和创建连接之前设置套接字选项。

<!-- CL 76391 -->
[`syscall.RawConn`](/pkg/syscall/#RawConn) 的 `Read` 和 `Write` 方法现在在 Windows 上能正确工作。

<!-- CL 107715 -->
`net` 包现在在 Linux 上通过 [`TCPConn.ReadFrom`](/pkg/net/#TCPConn.ReadFrom)（被 [`io.Copy`](/pkg/io/#Copy) 调用）在 TCP 连接之间复制数据时，会自动使用 [`splice 系统调用`](https://man7.org/linux/man-pages/man2/splice.2.html)。结果是更快、更高效的 TCP 代理。

<!-- CL 108297 -->
[`TCPConn.File`](/pkg/net/#TCPConn.File)、[`UDPConn.File`](/pkg/net/#UDPConn.File)、[`UnixConn.File`](/pkg/net/#UnixCOnn.File) 和 [`IPConn.File`](/pkg/net/#IPConn.File) 方法不再将返回的 `*os.File` 置于阻塞模式。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 71272 -->
[`Transport`](/pkg/net/http/#Transport) 类型有一个新的 [`MaxConnsPerHost`](/pkg/net/http/#Transport.MaxConnsPerHost) 选项，允许限制每个主机的最大连接数。

<!-- CL 79919 -->
[`Cookie`](/pkg/net/http/#Cookie) 类型有一个新的 [`SameSite`](/pkg/net/http/#Cookie.SameSite) 字段（其新类型也命名为 [`SameSite`](/pkg/net/http/#SameSite)），用于表示大多数浏览器最近支持的新 cookie 属性。`net/http` 的 `Transport` 本身不使用 `SameSite` 属性，但该包支持解析和序列化该属性供浏览器使用。

<!-- CL 81778 -->
在调用 [`Shutdown`](/pkg/net/http/#Server.Shutdown) 或 [`Close`](/pkg/net/http/#Server.Shutdown) 后，不再允许重用 [`Server`](/pkg/net/http/#Server)。这在过去从未得到官方支持，并且常常产生令人惊讶的行为。现在，在关闭或关闭后，对服务器 `Serve` 方法的所有未来调用都将返回错误。

<!-- CL 89275 在 Go 1.11 之前被撤回 -->

<!-- CL 93296 -->
现在为 HTTP 状态码 421 定义了常量 `StatusMisdirectedRequest`。

<!-- CL 123875 -->
HTTP 服务器在接收到流水线化的 HTTP/1.1 请求时，将不再取消上下文或在 [`CloseNotifier`](/pkg/net/http/#CloseNotifier) 通道上发送信号。浏览器不使用 HTTP 流水线，但某些客户端（例如 Debian 的 `apt`）可能被配置为这样做。

<!-- CL 115255 -->
[`ProxyFromEnvironment`](/pkg/net/http/#ProxyFromEnvironment)（被 [`DefaultTransport`](/pkg/net/http/#DefaultTransport) 使用）现在支持 `NO_PROXY` 环境变量中的 CIDR 表示法和端口。

<!-- net/http -->

#### [net/http/httputil](/pkg/net/http/httputil/)<!-- CL 77410 -->
[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 新增了 [`ErrorHandler`](/pkg/net/http/httputil/#ReverseProxy.ErrorHandler) 选项，允许自定义错误处理方式。

<!-- CL 115135 -->
`ReverseProxy` 现在也会将 "`TE:`&nbsp;`trailers`" 请求头透传至后端，以满足 gRPC 协议的要求。

<!-- net/http/httputil -->

#### [os](/pkg/os/)

<!-- CL 78835 -->
新增函数 [`UserCacheDir`](/pkg/os/#UserCacheDir)，返回用于存储用户特定缓存数据的默认根目录。

<!-- CL 94856 -->
新增 [`ModeIrregular`](/pkg/os/#ModeIrregular) 文件模式位，表示该文件不是常规文件但未明确其他信息，或表示该文件不是套接字、设备、命名管道、符号链接等 Go 已定义模式位的其他文件类型。

<!-- CL 99337 -->
[`Symlink`](/pkg/os/#Symlink) 函数现在可在启用开发者模式的 Windows 10 计算机上为非特权用户正常工作。

<!-- CL 100077 -->
当向 [`NewFile`](/pkg/os#NewFile) 传递非阻塞描述符时，返回的 `*File` 对象将保持非阻塞模式。这意味着该文件的 I/O 操作将使用运行时轮询器而非独立线程，且 [`SetDeadline`](/pkg/os/#File.SetDeadline) 方法将正常生效。

<!-- os -->

#### [os/signal](/pkg/os/signal/)

<!-- CL 108376 -->
新增函数 [`Ignored`](/pkg/os/signal/#Ignored)，用于报告某个信号当前是否被忽略。

<!-- os/signal -->

#### [os/user](/pkg/os/user/)

<!-- CL 92456 -->
`os/user` 包现可通过构建标签 "`osusergo`" 以纯 Go 模式构建，不再依赖 `CGO_ENABLED=0` 环境变量。此前使用该包纯 Go 实现的唯一方式是在整个程序中禁用 `cgo` 支持。

<!-- os/user -->

<!-- CL 101715 已回滚 -->

#### [runtime](/pkg/runtime/)

<!-- CL 70993 -->
设置环境变量 <code>GODEBUG=tracebackancestors=_N_</code> 后，错误跟踪信息将扩展显示协程创建时的调用栈，其中 _N_ 限制了报告的祖先协程数量。

<!-- runtime -->

#### [runtime/pprof](/pkg/runtime/pprof/)

<!-- CL 102696 -->
本版本新增 "allocs" 性能分析类型，用于统计程序启动以来分配的总字节数（包括垃圾回收的字节）。这与现有 "heap" 性能分析在 `-alloc_space` 模式下的显示内容完全相同。现在 `go test -memprofile=...` 将生成 "allocs" 性能分析文件而非 "heap" 文件。

<!-- runtime/pprof -->

#### [sync](/pkg/sync/)

<!-- CL 87095 -->
互斥锁性能分析现包含 [`RWMutex`](/pkg/sync/#RWMutex) 的读写器竞争数据。此前已包含写写竞争数据。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 106275 -->
在 Windows 平台上，为避免 Go 垃圾回收器问题，多个字段从 `uintptr` 类型改为新的 [`Pointer`](/pkg/syscall/?GOOS=windows&GOARCH=amd64#Pointer) 类型。[`golang.org/x/sys/windows`](https://godoc.org/golang.org/x/sys/windows) 包也进行了相同修改。受影响的代码应先从 `syscall` 包迁移至 `golang.org/x/sys/windows` 包，再改用 `Pointer` 类型，并遵守 [`unsafe.Pointer` 转换规则](/pkg/unsafe/#Pointer)。

<!-- CL 118658 -->
在 Linux 平台上，[`Faccessat`](/pkg/syscall/?GOOS=linux&GOARCH=amd64#Faccessat) 的 `flags` 参数现与 glibc 实现保持一致。在早期 Go 版本中该参数被忽略。

<!-- CL 118658 -->
在 Linux 平台上，[`Fchmodat`](/pkg/syscall/?GOOS=linux&GOARCH=amd64#Fchmodat) 的 `flags` 参数现进行有效性验证。由于 Linux 的 `fchmodat` 不支持该参数，我们现模拟 glibc 行为：若参数非零则返回错误。

<!-- syscall -->

#### [text/scanner](/pkg/text/scanner/)

<!-- CL 112037 -->
[`Scanner.Scan`](/pkg/text/scanner/#Scanner.Scan) 方法对原始字符串字面量现返回 [`RawString`](/pkg/text/scanner/#RawString) 标记而非 [`String`](/pkg/text/scanner/#String) 标记。

<!-- text/scanner -->

#### [text/template](/pkg/text/template/)

<!-- CL 84480 -->
现允许通过赋值语句修改模板变量（使用 `=` 标记）：

	  {{ $v := "init" }}
	  {{ if true }}
	    {{ $v = "changed" }}
	  {{ end }}
	  v: {{ $v }} {{/* "changed" */}}

<!-- CL 95215 -->
在旧版本中，无类型的 `nil` 值在传递给模板函数时会被忽略。现在这些值将作为普通参数传递。

<!-- text/template -->

#### [time](/pkg/time/)

<!-- CL 98157 -->
现支持解析以符号和偏移量表示的时区。旧版本中数字时区名称（如 `+03`）不被识别，当时区名称参数期望接收缩写时仅接受三个字母的格式（如 `MST`）。

<!-- time -->