---
title: Go 1.11 发布说明
---

<!--
注意：在本目录的本文档及其他文档中，惯例是将固定宽度的短语与非固定宽度的空格一起设置，如
`hello` `world`。
请勿发送移除此类短语内部标签的变更列表。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.11 简介 {#introduction}

最新的 Go 发行版本 1.11 在 [Go 1.10](go1.10) 发布六个月后到来。其大部分变更集中在工具链、运行时和库的实现上。一如既往，此版本遵循 Go 1 的[兼容性承诺](/doc/go1compat.html)。我们预计几乎所有 Go 程序都能像之前一样继续编译和运行。

## 语言变更 {#language}

语言规范没有任何变更。

## 平台支持 {#ports}

<!-- CL 94255, CL 115038, 等 -->
正如 [Go 1.10 发布说明中所公告](go1.10#ports)，Go 1.11 现在要求 OpenBSD 6.2 或更高版本、macOS 10.10 Yosemite 或更高版本，或 Windows 7 或更高版本；已移除对这些操作系统旧版本的支持。

<!-- CL 121657 -->
Go 1.11 支持即将发布的 OpenBSD 6.4 版本。由于 OpenBSD 内核的变更，旧版 Go 将无法在 OpenBSD 6.4 上工作。

在 i386 硬件上的 NetBSD 存在[已知问题](/issue/25206)。

<!-- CL 107935 -->
竞争检测器现在支持 `linux/ppc64le`，并在较小程度上支持 `netbsd/amd64`。NetBSD 竞争检测器支持存在[已知问题](/issue/26403)。

<!-- CL 109255 -->
内存消毒器（`-msan`）现在支持 `linux/arm64`。

<!-- CL 93875 -->
构建模式 `c-shared` 和 `c-archive` 现在支持 `freebsd/amd64`。

<!-- CL 108475 -->
在 64 位 MIPS 系统上，新的环境变量设置 `GOMIPS64=hardfloat`（默认）和 `GOMIPS64=softfloat` 用于选择浮点运算是使用硬件指令还是软件仿真。对于 32 位系统，环境变量仍然是 `GOMIPS`，如 [Go 1.10 中所添加](go1.10#mips)。

<!-- CL 107475 -->
在软浮点 ARM 系统（`GOARM=5`）上，Go 现在使用更高效的软浮点接口。这对 Go 代码是透明的，但那些使用了浮点指令且未针对 GOARM 进行保护的 ARM 汇编代码将会中断，必须移植到[新接口](/cl/107475)。

<!-- CL 94076 -->
Go 1.11 在 ARMv7 上不再需要配置了 `KUSER_HELPERS` 的 Linux 内核。此设置在默认内核配置中是启用的，但在精简配置中有时会被禁用。

### WebAssembly {#wasm}

Go 1.11 增加了一个实验性的 [WebAssembly](https://webassembly.org) (`js/wasm`) 端口。

Go 程序目前编译为一个 WebAssembly 模块，其中包含用于协程调度、垃圾回收、映射等的 Go 运行时。因此，生成的结果大小至少约为 2 MB，或压缩后 500 KB。Go 程序可以使用新的实验性 [`syscall/js`](/pkg/syscall/js/) 包调用 JavaScript。二进制文件大小以及与其他语言的互操作性尚未成为优先事项，但可能在未来的版本中解决。

由于新增了 `GOOS` 值 "`js`" 和 `GOARCH` 值 "`wasm`"，命名为 `*_js.go` 或 `*_wasm.go` 的 Go 文件现在将[被 Go 工具忽略](/pkg/go/build/#hdr-Build_Constraints)，除非正在使用这些 GOOS/GOARCH 值。如果您现有的文件名匹配这些模式，则需要重命名它们。

更多信息可以在 [Wiki 上的 WebAssembly 页面](/wiki/WebAssembly)找到。

### RISC-V GOARCH 值预留 {#riscv}

<!-- CL 106256 -->
主要的 Go 编译器尚不支持 RISC-V 架构 <!-- 这将改变一切 -->，但我们已预留了 Gccgo（它确实支持 RISC-V）所使用的 `GOARCH` 值 "`riscv`" 和 "`riscv64`"。这意味着命名为 `*_riscv.go` 的 Go 文件现在也将[被 Go 工具忽略](/pkg/go/build/#hdr-Build_Constraints)，除非正在使用这些 GOOS/GOARCH 值。

## 工具 {#tools}

### 模块、包版本管理和依赖管理 {#modules}

Go 1.11 增加了对一个[称为“模块”的新概念](/cmd/go/#hdr-Modules__module_versions__and_more)的初步支持，这是 GOPATH 的一个替代方案，集成了版本管理和包分发支持。使用模块，开发者不再局限于在 GOPATH 内工作，版本依赖信息显式而轻量，构建更加可靠和可重现。

模块支持被认为是实验性的。细节可能会根据 Go 1.11 用户的反馈而变化，并且我们计划了更多工具。尽管模块支持的细节可能变化，但使用 Go 1.11 转换为模块的项目将继续适用于 Go 1.12 及更高版本。如果您在使用模块时遇到错误，请[提交问题](/issue/new)以便我们修复。更多信息请参阅 [`go` 命令文档](/cmd/go#hdr-Modules__module_versions__and_more)。

### 导入路径限制 {#importpath}

由于 Go 模块支持在命令行操作中赋予了 `@` 符号特殊含义，`go` 命令现在禁止使用包含 `@` 符号的导入路径。这样的导入路径从未被 `go` `get` 允许过，因此此限制只可能影响通过其他方式构建自定义 GOPATH 树的用户。

### 包加载 {#gopackages}

新的包 [`golang.org/x/tools/go/packages`](https://godoc.org/golang.org/x/tools/go/packages) 提供了一个简单的 API，用于定位和加载 Go 源代码包。虽然它还不是标准库的一部分，但对于许多任务，它有效地取代了 [`go/build`](/pkg/go/build) 包，该包的 API 无法完全支持模块。因为它运行外部查询命令（如 [`go list`](/cmd/go/#hdr-List_packages)）来获取有关 Go 包的信息，所以它能够构建与替代构建系统（如 [Bazel](https://bazel.build) 和 [Buck](https://buckbuild.com)）同样良好工作的分析工具。### 构建缓存要求 {#gocache}

Go 1.11 将是最后一个支持通过设置环境变量 `GOCACHE=off` 来禁用[构建缓存](/cmd/go/#hdr-Build_and_test_caching)的版本。该缓存功能在 Go 1.10 中引入。从 Go 1.12 开始，构建缓存将成为必需项，这是逐步淘汰 `$GOPATH/pkg` 的举措之一。上文所述的模块和包加载支持已经要求启用构建缓存。如果您曾为避免遇到问题而禁用构建缓存，请[提交一个问题](/issue/new)告知我们。

### 编译器工具链 {#compiler}

<!-- CL 109918 -->
现在默认情况下，更多函数有资格被内联，包括调用了 `panic` 的函数。

<!-- CL 97375 -->
编译器工具链现在支持[行指令](/cmd/compile/#hdr-Compiler_Directives)中的列信息。

<!-- CL 106797 -->
引入了一种新的包导出数据格式。这对终端用户而言应该是透明的，主要作用是加快大型 Go 项目的构建时间。如果它确实导致问题，可以通过在构建二进制文件时向 `go` 工具传递 `-gcflags=all=-iexport=false` 来再次关闭它。

<!-- CL 100459 -->
编译器现在会拒绝在类型开关守卫中声明的未使用变量，例如以下示例中的 `x`：

	func f(v interface{}) {
		switch x := v.(type) {
		}
	}

这已经被 `gccgo` 和 [go/types](/pkg/go/types/) 所拒绝。

### 汇编器 {#assembler}

<!-- CL 113315 -->
`amd64` 的汇编器现在接受 AVX512 指令。

### 调试 {#debugging}

<!-- CL 100738, CL 93664 -->
编译器现在为优化过的二进制文件生成显著更准确的调试信息，包括变量位置信息、行号和断点位置。这应该使得调试**未**使用 `-N`&nbsp;`-l` 标志编译的二进制文件成为可能。调试信息的质量仍然存在一些限制，其中一些是基础性的，另一些将在未来的版本中持续改进。

<!-- CL 118276 -->
由于编译器生成了扩展且更准确的调试信息，DWARF 段现在默认被压缩。这对大多数 ELF 工具（例如 Linux 和 \*BSD 上的调试器）是透明的，并且在所有平台上都得到 Delve 调试器的支持，但在 macOS 和 Windows 的原生工具中支持有限。要禁用 DWARF 压缩，请在构建二进制文件时向 `go` 工具传递 `-ldflags=-compressdwarf=false`。

<!-- CL 109699 -->
Go 1.11 添加了从调试器内部调用 Go 函数的实验性支持。例如，这在断点处暂停时调用 `String` 方法非常有用。目前这仅被 Delve（版本 1.1.0 及以上）支持。

### 测试 {#test}

自 Go 1.10 起，`go`&nbsp;`test` 命令会针对正在测试的包运行 `go`&nbsp;`vet`，以便在运行测试前识别问题。由于 `vet` 在运行前会使用 [go/types](/pkg/go/types/) 对代码进行类型检查，因此无法通过类型检查的测试现在会失败。特别是，包含在闭包内未使用变量的测试，在 Go 1.10 下可以编译，因为 Go 编译器错误地接受了它们（[Issue #3059](/issues/3059)），但现在会失败，因为 `go/types` 在此情况下会正确报告"未使用变量"错误。

<!-- CL 102696 -->
`go`&nbsp;`test` 的 `-memprofile` 标志现在默认使用"allocs"配置文件，该配置文件记录自测试开始以来分配的总字节数（包括垃圾回收的字节）。

### Vet {#vet}

<!-- CL 108555 -->
[`go`&nbsp;`vet`](/cmd/vet/) 命令现在会在被分析的包无法通过类型检查时报告致命错误。之前，类型检查错误只会导致打印警告，并且 `vet` 以状态 1 退出。

<!-- CL 108559 -->
此外，[`go`&nbsp;`vet`](/cmd/vet) 在格式检查 `printf` 包装器时变得更加健壮。Vet 现在能检测出此示例中的错误：

	func wrapper(s string, args ...interface{}) {
		fmt.Printf(s, args...)
	}

	func main() {
		wrapper("%s", 42)
	}

### 跟踪 {#trace}

<!-- CL 63274 -->
借助新的 `runtime/trace` 包的[用户注解 API](/pkg/runtime/trace/#hdr-User_annotation)，用户可以在执行跟踪中记录应用级信息，并创建相关 goroutine 的分组。`go`&nbsp;`tool`&nbsp;`trace` 命令在跟踪视图以及新的用户任务/区域分析页面中可视化这些信息。

### Cgo {#cgo}

自 Go 1.10 起，cgo 将某些 C 指针类型转换为 Go 类型 `uintptr`。这些类型包括 Darwin 的 CoreFoundation 框架中的 `CFTypeRef` 层级结构以及 Java 的 JNI 接口中的 `jobject` 层级结构。在 Go 1.11 中，检测这些类型的代码进行了若干改进。使用这些类型的代码可能需要进行一些更新。详情请参阅 [Go 1.10 发行说明](go1.10.html#cgo)。<!-- CL 126275, CL 127156, CL 122217, CL 122575, CL 123177 -->

### Go 命令 {#go_command}

<!-- CL 126656 -->
现在可以使用环境变量 `GOFLAGS` 为 `go` 命令设置默认标志。这在某些情况下很有用。在性能较低的系统上，由于 DWARF，链接可能明显变慢，用户可能希望默认设置 `-ldflags=-w`。对于模块，一些用户和 CI 系统会希望始终使用供应商（vendor），因此他们应该默认设置 `-mod=vendor`。更多信息，请参阅 [`go` 命令文档](/cmd/go/#hdr-Environment_variables)。

### Godoc {#godoc}

Go 1.11 将是最后一个支持 `godoc` 命令行界面的版本。在未来的版本中，`godoc` 将仅作为一个网络服务器。用户应改用 `go` `doc` 来获取命令行帮助输出。<!-- CL 85396, CL 124495 -->
`godoc` 网络服务器现在会显示新 API 特性是在哪个 Go 版本中引入的。类型、函数和方法的初始 Go 版本信息会右对齐显示。例如，请查看 [`UserCacheDir`](/pkg/os/#UserCacheDir)，其右侧标有 "1.11"。对于结构体字段，如果该字段在不同于其类型引入版本的其他 Go 版本中添加，则会添加行内注释。关于结构体字段的示例，请参见 [`ClientTrace.Got1xxResponse`](/pkg/net/http/httptrace/#ClientTrace.Got1xxResponse)。

### Gofmt {#gofmt}

Go 源代码默认格式化的一个小细节发生了变化。当格式化包含行内注释的表达式列表时，注释原先会根据一种启发式方法进行对齐。然而，在某些情况下，这种对齐可能会轻易被打断，或者引入过多的空白。现在已更改启发式方法，使其在处理人工编写的代码时表现更好。

请注意，gofmt 的此类小更新预计会不时出现。通常，需要一致格式化 Go 源代码的系统应使用特定版本的 `gofmt` 二进制文件。更多信息，请参阅 [go/format](/pkg/go/format/) 包文档。

### Run {#run}

<!-- CL 109341 -->
[`go`&nbsp;`run`](/cmd/go/) 命令现在允许使用单个导入路径、目录名或匹配单个包的模式。这允许 `go`&nbsp;`run`&nbsp;`pkg` 或 `go`&nbsp;`run`&nbsp;`dir`，最重要的是 `go`&nbsp;`run`&nbsp;`.`。

## Runtime {#runtime}

<!-- CL 85887 -->
运行时现在使用稀疏堆布局，因此 Go 堆的大小不再有限制（之前的限制是 512GiB）。这也修复了混合 Go/C 二进制文件或使用 `-race` 编译的二进制文件中罕见的"地址空间冲突"错误。

<!-- CL 108679, CL 106156 -->
在 macOS 和 iOS 上，运行时现在使用 `libSystem.dylib` 而不是直接调用内核。这应该能让 Go 二进制文件与未来的 macOS 和 iOS 版本更兼容。[syscall](/pkg/syscall) 包仍然进行直接系统调用；计划在未来版本中修复此问题。

## Performance {#performance}

一如既往，这些更改过于普遍和多样，因此很难对性能做出精确的陈述。由于生成的代码更好以及核心库的优化，大多数程序应该会运行得稍快一些。

<!-- CL 74851 -->
`math/big` 包以及整个代码树中针对 `GOARCH=arm64` 的许多更改都带来了多项性能改进。

### Compiler toolchain {#performance-compiler}

<!-- CL 110055 -->
编译器现在优化了如下形式的 map 清除操作：

	for k := range m {
		delete(m, k)
	}

<!-- CL 109517 -->
编译器现在优化了如下形式的 slice 扩展：
`append(s,`&nbsp;`make([]T,`&nbsp;`n)...)`

<!-- CL 100277, CL 105635, CL 109776 -->
编译器现在执行了显著更激进的边界检查和分支消除。值得注意的是，它现在可以识别传递关系，因此如果 `i<j` 且 `j<len(s)`，它可以利用这些事实来消除 `s[i]` 的边界检查。它还能理解诸如 `s[i-10]` 这样的简单算术，并能识别循环中更多的归纳情况。此外，编译器现在还利用边界信息来更激进地优化移位操作。

## Standard library {#library}

标准库的所有更改都是次要的。

### Minor changes to the library {#minor_library_changes}

一如既往，库中有各种次要的更改和更新，这些更改都考虑到了 Go 1 [兼容性承诺](/doc/go1compat)。

<!-- CL 115095: https://golang.org/cl/115095: yes (`go test pkg` now always builds pkg even if there are no test files): cmd/go: output coverage report even if there are no test files -->
<!-- CL 110395: https://golang.org/cl/110395: cmd/go, cmd/compile: use Windows response files to avoid arg length limits -->
<!-- CL 112436: https://golang.org/cl/112436: cmd/pprof: add readline support similar to upstream -->

#### [crypto](/pkg/crypto/)

<!-- CL 64451 -->
某些加密操作，包括
[`ecdsa.Sign`](/pkg/crypto/ecdsa/#Sign)、
[`rsa.EncryptPKCS1v15`](/pkg/crypto/rsa/#EncryptPKCS1v15) 和
[`rsa.GenerateKey`](/pkg/crypto/rsa/#GenerateKey)，现在会随机读取一个额外的随机字节，以确保测试不依赖于内部行为。

<!-- crypto -->

#### [crypto/cipher](/pkg/crypto/cipher/)

<!-- CL 48510, CL 116435 -->
新函数 [`NewGCMWithTagSize`](/pkg/crypto/cipher/#NewGCMWithTagSize) 实现了具有非标准标签长度的 Galois 计数器模式，以便与现有加密系统兼容。

<!-- crypto/cipher -->

#### [crypto/rsa](/pkg/crypto/rsa/)

<!-- CL 103876 -->
[`PublicKey`](/pkg/crypto/rsa/#PublicKey) 现在实现了一个 [`Size`](/pkg/crypto/rsa/#PublicKey.Size) 方法，该方法返回以字节为单位的模数大小。

<!-- crypto/rsa -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 85115 -->
[`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 的新方法 [`ExportKeyingMaterial`](/pkg/crypto/tls/#ConnectionState.ExportKeyingMaterial) 允许根据 RFC 5705 导出与连接绑定的密钥材料。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 123355, CL 123695 -->
当没有主题备用名称时，将 `CommonName` 字段视为主机名的已弃用、遗留行为，现在在 CN 不是有效的主机名时被禁用。
可以通过将实验值 `x509ignoreCN=1` 添加到 `GODEBUG` 环境变量来完全忽略 `CommonName`。
当忽略 CN 时，没有 SAN 的证书将在具有名称约束的链下进行验证，而不是返回 `NameConstraintsWithoutSANs`。

<!-- CL 113475 -->
扩展密钥用法限制现在仅在 [`VerifyOptions`](/pkg/crypto/x509/#VerifyOptions) 的 `KeyUsages` 字段中出现时才进行检查，而不是总是进行检查。这与 Go 1.9 及更早版本的行为一致。<!-- CL 102699 -->
[`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool) 返回的值现在被缓存，可能无法反映调用之间的系统更改。

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
解码器现在对于不完整的块会一致地返回 `io.ErrUnexpectedEOF`。而在某些情况下，之前会返回 `io.EOF`。

<!-- encoding/base32 -->

#### [encoding/csv](/pkg/encoding/csv/)

<!-- CL 99696 -->
`Reader` 现在会拒绝将 [`Comma`](/pkg/encoding/csv/#Reader.Comma) 字段设置为双引号字符的尝试，因为双引号字符在 CSV 中已有特殊含义。

<!-- encoding/csv -->

<!-- CL 100235 已被撤销 -->

#### [html/template](/pkg/html/template/)

<!-- CL 121815 -->
当一个有类型的接口值被传递给隐式转义函数时，该包的行为已改变。之前，这样的值会被写出（作为 `<nil>` 的转义形式）。现在，这样的值将被忽略，就像无类型的 `nil` 值（也一直如此）被忽略一样。

<!-- html/template -->

#### [image/gif](/pkg/image/gif/)

<!-- CL 93076 -->
现在支持非循环播放的动画 GIF。它们通过 [`LoopCount`](/pkg/image/gif/#GIF.LoopCount) 为 -1 来表示。

<!-- image/gif -->

#### [io/ioutil](/pkg/io/ioutil/)

<!-- CL 105675 -->
[`TempFile`](/pkg/io/ioutil/#TempFile) 函数现在支持指定文件名中随机字符的位置。如果 `prefix` 参数包含 "`*`"，则随机字符串会替换该 "`*`"。例如，`prefix` 参数为 "`myname.*.bat`" 将生成类似 "`myname.123456.bat`" 的随机文件名。如果未包含 "`*`"，则保留旧行为，随机数字附加在末尾。

<!-- io/ioutil -->

#### [math/big](/pkg/math/big/)

<!-- CL 108996 -->
[`ModInverse`](/pkg/math/big/#Int.ModInverse) 现在当 g 和 n 不互质时返回 nil。之前的结果是未定义的。

<!-- math/big -->

#### [mime/multipart](/pkg/mime/multipart/)

<!-- CL 121055 -->
对于文件名缺失/为空的 form-data 的处理已恢复为 Go 1.9 的行为：在 form-data 部分的 [`Form`](/pkg/mime/multipart/#Form) 中，该值可在 `Value` 字段中获取，而不是在 `File` 字段中。在 Go 1.10 到 1.10.3 的版本中，文件名缺失/为空但有非空 "Content-Type" 字段的 form-data 部分被存储在 `File` 字段中。此更改是 1.10 中的一个错误，已恢复为 1.9 的行为。

<!-- mime/multipart -->

#### [mime/quotedprintable](/pkg/mime/quotedprintable/)

<!-- CL 121095 -->
为了支持在实际环境中发现的无效输入，该包现在允许非 ASCII 字节，但不验证其编码。

<!-- mime/quotedprintable -->

#### [net](/pkg/net/)

<!-- CL 72810 -->
新的 [`ListenConfig`](/pkg/net/#ListenConfig) 类型和新的 [`Dialer.Control`](/pkg/net/#Dialer.Control) 字段分别允许在接受连接和创建连接之前设置套接字选项。

<!-- CL 76391 -->
[`syscall.RawConn`](/pkg/syscall/#RawConn) 的 `Read` 和 `Write` 方法现在在 Windows 上能正确工作。

<!-- CL 107715 -->
`net` 包现在在 Linux 上复制 TCP 连接之间的数据时，自动使用 [`splice` 系统调用](https://man7.org/linux/man-pages/man2/splice.2.html)，如通过 [`io.Copy`](/pkg/io/#Copy) 调用的 [`TCPConn.ReadFrom`](/pkg/net/#TCPConn.ReadFrom)。这使得 TCP 代理更快、更高效。

<!-- CL 108297 -->
[`TCPConn.File`](/pkg/net/#TCPConn.File)、[`UDPConn.File`](/pkg/net/#UDPConn.File)、[`UnixConn.File`](/pkg/net/#UnixCOnn.File) 和 [`IPConn.File`](/pkg/net/#IPConn.File) 方法不再将返回的 `*os.File` 设置为阻塞模式。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 71272 -->
[`Transport`](/pkg/net/http/#Transport) 类型新增了一个 [`MaxConnsPerHost`](/pkg/net/http/#Transport.MaxConnsPerHost) 选项，允许限制每个主机的最大连接数。

<!-- CL 79919 -->
[`Cookie`](/pkg/net/http/#Cookie) 类型新增了一个 [`SameSite`](/pkg/net/http/#Cookie.SameSite) 字段（其新类型也命名为 [`SameSite`](/pkg/net/http/#SameSite)），用于表示最近大多数浏览器支持的新 cookie 属性。`net/http` 的 `Transport` 自身不使用 `SameSite` 属性，但该包支持为浏览器解析和序列化该属性。

<!-- CL 81778 -->
在调用 [`Shutdown`](/pkg/net/http/#Server.Shutdown) 或 [`Close`](/pkg/net/http/#Server.Close) 后，不再允许重用 [`Server`](/pkg/net/http/#Server)。过去从未正式支持此行为，并且常常产生意外结果。现在，关闭或关闭后对服务器 `Serve` 方法的所有后续调用都将返回错误。

<!-- CL 89275 在 Go 1.11 之前已被撤销 -->

<!-- CL 93296 -->
现在为 HTTP 状态码 421 定义了常量 `StatusMisdirectedRequest`。

<!-- CL 123875 -->
HTTP 服务器在接收到流水线 HTTP/1.1 请求时，不再取消上下文或在 [`CloseNotifier`](/pkg/net/http/#CloseNotifier) 通道上发送消息。浏览器不使用 HTTP 流水线，但某些客户端（如 Debian 的 `apt`）可能被配置为这样做。

<!-- CL 115255 -->
[`ProxyFromEnvironment`](/pkg/net/http/#ProxyFromEnvironment)（由 [`DefaultTransport`](/pkg/net/http/#DefaultTransport) 使用）现在支持 `NO_PROXY` 环境变量中的 CIDR 表示法和端口。

<!-- net/http -->

#### [net/http/httputil](/pkg/net/http/httputil/)<!-- CL 77410 -->
[`反向代理`](/pkg/net/http/httputil/#ReverseProxy) 新增了一个 [`错误处理器`](/pkg/net/http/httputil/#ReverseProxy.ErrorHandler) 选项，允许自定义错误处理方式。

<!-- CL 115135 -->
`反向代理` 现在也会将 "`TE:`&nbsp;`trailers`" 请求头透传至后端，以符合 gRPC 协议的要求。

<!-- net/http/httputil -->

#### [os](/pkg/os/)

<!-- CL 78835 -->
新增的 [`用户缓存目录`](/pkg/os/#UserCacheDir) 函数返回用于存储用户特定缓存数据的默认根目录。

<!-- CL 94856 -->
新增的 [`模式-非常规文件`](/pkg/os/#ModeIrregular) 是一个 [`文件模式`](/pkg/os/#FileMode) 位，表示该文件不是常规文件，但没有其他已知信息，或者它不是套接字、设备、命名管道、符号链接或其他 Go 已定义模式位的文件类型。

<!-- CL 99337 -->
在启用开发者模式的 Windows 10 机器上，[`符号链接`](/pkg/os/#Symlink) 现在对非特权用户也可用。

<!-- CL 100077 -->
当将非阻塞描述符传递给 [`新建文件`](/pkg/os#NewFile) 时，生成的 `*File` 将保持非阻塞模式。这意味着对该 `*File` 的 I/O 操作将使用运行时轮询器而非单独的线程，并且 [`设置截止时间`](/pkg/os/#File.SetDeadline) 方法将生效。

<!-- os -->

#### [os/signal](/pkg/os/signal/)

<!-- CL 108376 -->
新增的 [`已忽略信号`](/pkg/os/signal/#Ignored) 函数用于报告某个信号当前是否被忽略。

<!-- os/signal -->

#### [os/user](/pkg/os/user/)

<!-- CL 92456 -->
`os/user` 包现在可以通过构建标签 "`osusergo`" 使用纯 Go 模式构建，这与环境变量 `CGO_ENABLED=0` 的使用无关。之前，使用该包纯 Go 实现的唯一方法是在整个程序中禁用 `cgo` 支持。

<!-- os/user -->

<!-- CL 101715 已回退 -->

#### [runtime](/pkg/runtime/)

<!-- CL 70993 -->
设置环境变量 <code>GODEBUG=tracebackancestors=_N_</code> 现在会将创建协程时的栈信息扩展到回溯追踪中，其中 _N_ 限制了报告的祖先协程数量。

<!-- runtime -->

#### [runtime/pprof](/pkg/runtime/pprof/)

<!-- CL 102696 -->
本次发布新增了一个 "allocs" 配置类型，用于分析程序启动以来分配的总字节数（包括已垃圾回收的字节）。这与使用 `-alloc_space` 模式查看的现有 "heap" 配置相同。现在，`go test -memprofile=...` 将报告 "allocs" 配置而非 "heap" 配置。

<!-- runtime/pprof -->

#### [sync](/pkg/sync/)

<!-- CL 87095 -->
互斥锁配置文件现在包含了 [`读写锁`](/pkg/sync/#RWMutex) 的读/写争用情况。写/写争用此前已包含在互斥锁配置文件中。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 106275 -->
在 Windows 上，多个字段的类型从 `uintptr` 更改为新的 [`指针`](/pkg/syscall/?GOOS=windows&GOARCH=amd64#Pointer) 类型，以避免 Go 垃圾回收器出现问题。[`golang.org/x/sys/windows`](https://godoc.org/golang.org/x/sys/windows) 包也做了相同的更改。对于受影响的代码，用户应首先从 `syscall` 包迁移到 `golang.org/x/sys/windows` 包，然后在使用时改为使用 `指针`，并遵循 [`unsafe.Pointer` 转换规则](/pkg/unsafe/#Pointer)。

<!-- CL 118658 -->
在 Linux 上，[`访问检查`](/pkg/syscall/?GOOS=linux&GOARCH=amd64#Faccessat) 的 `flags` 参数现在按照与 glibc 相同的方式实现。在之前的 Go 版本中，`flags` 参数被忽略了。

<!-- CL 118658 -->
在 Linux 上，[`修改文件权限（带目录）`](/pkg/syscall/?GOOS=linux&GOARCH=amd64#Fchmodat) 的 `flags` 参数现在会进行验证。Linux 的 `fchmodat` 不支持 `flags` 参数，因此我们现在模拟 glibc 的行为，如果 `flags` 非零则返回错误。

<!-- syscall -->

#### [text/scanner](/pkg/text/scanner/)

<!-- CL 112037 -->
[`扫描器.扫描`](/pkg/text/scanner/#Scanner.Scan) 方法现在对原始字符串字面量返回 [`原始字符串`](/pkg/text/scanner/#RawString) 词元，而非 [`字符串`](/pkg/text/scanner/#String) 词元。

<!-- text/scanner -->

#### [text/template](/pkg/text/template/)

<!-- CL 84480 -->
现在允许通过 `=` 词元修改模板变量：

	  {{ $v := "init" }}
	  {{ if true }}
	    {{ $v = "changed" }}
	  {{ end }}
	  v: {{ $v }} {{/* "changed" */}}

<!-- CL 95215 -->
在以前的版本中，传递给模板函数的无类型 `nil` 值会被忽略。现在它们作为普通参数传递。

<!-- text/template -->

#### [time](/pkg/time/)

<!-- CL 98157 -->
现在支持解析由符号和偏移量表示的时区。在以前的版本中，数字时区名称（如 `+03`）不被视为有效，并且在期望时区名称时只接受三个字母的缩写（如 `MST`）。

<!-- time -->