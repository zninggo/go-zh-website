---
title: Go 1.16 发布说明
---

<!--
注意：在本目录下的本文档及其他文档中，约定采用如下格式：将固定宽度短语中的空格设置为非固定宽度，例如 `hello` `world`。
请勿提交删除此类短语内部标签的变更请求（CL）。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.16 简介 {#introduction}

最新 Go 发行版 1.16 在 [Go 1.15](/doc/go1.15) 发布六个月后到来。
其大部分变更集中在工具链、运行时和库的实现层面。
与以往一样，此版本遵循 Go 1 [兼容性承诺](/doc/go1compat.html)。
我们预期几乎所有 Go 程序仍能像之前一样编译和运行。

## 语言变更 {#language}

语言本身无变更。

## 移植版本 {#ports}

### Darwin 和 iOS {#darwin}

<!-- golang.org/issue/38485, golang.org/issue/41385, CL 266373, 更多 CL -->
Go 1.16 新增了对 macOS 上 64 位 ARM 架构（也称为 Apple Silicon）的支持，对应的 `GOOS=darwin`，`GOARCH=arm64`。
与 `darwin/amd64` 移植版本类似，`darwin/arm64` 移植版本支持 cgo、内部和外部链接、`c-archive`、`c-shared` 和 `pie` 构建模式，以及竞态检测器。

<!-- CL 254740 -->
此前名为 `darwin/arm64` 的 iOS 移植版本已重命名为 `ios/arm64`。`GOOS=ios` 会隐含 `darwin` 构建标签，这与 `GOOS=android` 会隐含 `linux` 构建标签的方式类似。对于使用 gomobile 构建 iOS 应用的用户，此变更应是透明的。

引入 `GOOS=ios` 意味着像 `x_ios.go` 这样的文件名现在只会为 `GOOS=ios` 构建；详见 [`go` `help` `buildconstraint`](/cmd/go/#hdr-Build_constraints)。
使用此类文件名的现有包将需要重命名文件。

<!-- golang.org/issue/42100, CL 263798 -->
Go 1.16 新增了 `ios/amd64` 移植版本，其目标是在基于 AMD64 的 macOS 上运行的 iOS 模拟器。此前，这通过 `darwin/amd64` 并设置 `ios` 构建标签来非正式支持。另请参阅 [`misc/ios/README`](/misc/ios/README) 了解如何为 iOS 和 iOS 模拟器构建程序的详细信息。

<!-- golang.org/issue/23011 -->
Go 1.16 是最后一个支持 macOS 10.12 Sierra 的版本。
Go 1.17 将要求 macOS 10.13 High Sierra 或更高版本。

### NetBSD {#netbsd}

<!-- golang.org/issue/30824 -->
Go 现已支持 NetBSD 上的 64 位 ARM 架构（`netbsd/arm64` 移植版本）。

### OpenBSD {#openbsd}

<!-- golang.org/issue/40995 -->
Go 现已支持 OpenBSD 上的 MIPS64 架构（`openbsd/mips64` 移植版本）。此移植版本尚不支持 cgo。

<!-- golang.org/issue/36435, 多个 CL -->
在 OpenBSD 上的 64 位 x86 和 64 位 ARM 架构（`openbsd/amd64` 和 `openbsd/arm64` 移植版本）中，系统调用现在通过 `libc` 进行，而不是直接使用 `SYSCALL`/`SVC` 指令。这确保了与未来 OpenBSD 版本的前向兼容性。特别是，OpenBSD 6.9 起将要求非静态 Go 二进制文件通过 `libc` 进行系统调用。

### 386 {#386}

<!-- golang.org/issue/40255, golang.org/issue/41848, CL 258957, 以及 CL 260017 -->
如 [Go 1.15 发布说明中所述](go1.15#386)，
Go 1.16 放弃了对 x87 模式编译（`GO386=387`）的支持。
对非 SSE2 处理器的支持现在可通过软浮点模式（`GO386=softfloat`）实现。
在非 SSE2 处理器上运行的用户应将 `GO386=387` 替换为 `GO386=softfloat`。

### RISC-V {#riscv}

<!-- golang.org/issue/36641, CL 267317 -->
`linux/riscv64` 移植版本现已支持 cgo 和 `-buildmode=pie`。此版本还包括针对 RISC-V 的性能优化和代码生成改进。

## 工具 {#tools}

### Go 命令 {#go-command}

#### 模块 {#modules}

<!-- golang.org/issue/41330 -->
模块感知模式默认启用，无论当前工作目录或父目录中是否存在 `go.mod` 文件。更准确地说，`GO111MODULE` 环境变量现在默认为 `on`。要切换回旧行为，请将 `GO111MODULE` 设置为 `auto`。

<!-- golang.org/issue/40728 -->
像 `go` `build` 和 `go` `test` 这样的构建命令默认不再修改 `go.mod` 和 `go.sum`。相反，如果需要添加或更新模块需求或校验和（如同使用了 `-mod=readonly` 标志），它们会报告错误。模块需求和总和可通过 `go` `mod` `tidy` 或 `go` `get` 进行调整。

<!-- golang.org/issue/40276 -->
`go` `install` 现在接受带有版本后缀的参数（例如，`go` `install` `example.com/cmd@v1.0.0`）。这会导致 `go` `install` 在模块感知模式下构建和安装包，忽略当前目录或任何父目录中可能存在的 `go.mod` 文件。这对于安装可执行文件而不影响主模块的依赖关系非常有用。

<!-- golang.org/issue/40276 -->
`go` `install`，无论是否带有版本后缀（如上所述），现在是在模块模式下构建和安装包的推荐方式。`go` `get` 应与 `-d` 标志一起使用，以调整当前模块的依赖关系而不构建包，而使用 `go` `get` 来构建和安装包已被弃用。在未来的版本中，`-d` 标志将始终启用。

<!-- golang.org/issue/24031 -->
`retract`（撤回）指令现在可用于 `go.mod` 文件中，以指示模块的某些已发布版本不应被其他模块使用。在发现严重问题或版本被意外发布时，模块作者可以撤回该版本。

<!-- golang.org/issue/26603 -->
`go` `mod` `vendor` 和 `go` `mod` `tidy` 子命令现在接受 `-e` 标志，该标志指示它们在解析缺失包时遇到错误仍继续执行。<!-- golang.org/issue/36465 -->
`go` 命令现在会忽略主模块中通过 `exclude` 指令排除的模块版本需求。此前，`go` 命令会使用高于被排除版本的下一个版本，但该版本可能随时间变化，导致构建结果不可重现。

<!-- golang.org/issue/43052, golang.org/issue/43985 -->
在模块模式下，`go` 命令现在禁止使用包含非 ASCII 字符或以点字符（`.`）开头的路径元素的导入路径。包含此类字符的模块路径早已被禁止（参见[模块路径与版本](/ref/mod#go-mod-file-ident)），因此此变更仅影响模块子目录内的路径。

#### 嵌入文件 {#embed}

`go` 命令现支持通过新的 `//go:embed` 指令将静态文件及文件树作为最终可执行文件的一部分包含。详细信息请参阅新的 [`embed`](/pkg/embed/) 包文档。

#### `go` `test` {#go-test}

<!-- golang.org/issue/29062 -->
使用 `go` `test` 时，若测试在执行测试函数过程中调用了 `os.Exit(0)`，现在将被视为失败。这有助于捕获测试代码调用 `os.Exit(0)` 导致后续所有测试停止运行的情况。若 `TestMain` 函数调用 `os.Exit(0)`，仍被视为测试通过。

<!-- golang.org/issue/39484 -->
当 `-c` 或 `-i` 标志与未知标志一起使用时，`go` `test` 将报告错误。通常未知标志会传递给测试，但当使用 `-c` 或 `-i` 时，测试不会运行。

#### `go` `get` {#go-get}

<!-- golang.org/issue/37519 -->
`go` `get` 的 `-insecure` 标志已弃用，并将在未来版本中移除。该标志允许通过不安全协议（如 HTTP）获取代码仓库和解析自定义域名，同时绕过校验和数据库的模块校验。如需允许不安全协议，请改用 `GOINSECURE` 环境变量。如需绕过模块校验，请使用 `GOPRIVATE` 或 `GONOSUMDB`。详见 `go` `help` `environment`。

<!-- golang.org/cl/263267 -->
`go` `get` `example.com/mod@patch` 现在要求主模块已依赖 `example.com/mod` 的某个版本。（但 `go` `get` `-u=patch` 仍会为新增依赖项打补丁。）

#### `GOVCS` 环境变量 {#govcs}

<!-- golang.org/issue/266420 -->
`GOVCS` 是新增的环境变量，用于限制 `go` 命令可使用的版本控制工具来下载源代码。这缓解了通常用于受信任认证环境中的工具的安全风险。默认情况下，`git` 和 `hg` 可用于从任意仓库下载代码。`svn`、`bzr` 和 `fossil` 仅可用于模块路径或包路径匹配 `GOPRIVATE` 环境变量模式的仓库。详见 [`go` `help` `vcs`](/cmd/go/#hdr-Controlling_version_control_with_GOVCS)。

#### `all` 匹配模式 {#all-pattern}

<!-- golang.org/cl/240623 -->
当主模块的 `go.mod` 文件声明 `go` `1.16` 或更高版本时，`all` 包匹配模式现在仅匹配主模块中包或测试直接传递导入的那些包。（主模块导入的包的_测试_所导入的包不再包含在内。）这与 Go 1.11 以来 `go` `mod` `vendor` 保留的包集合一致。

#### `-toolexec` 构建标志 {#toolexec}

<!-- golang.org/cl/263357 -->
当指定 `-toolexec` 构建标志以在调用工具链程序（如编译器或汇编器）时使用外部程序时，环境变量 `TOOLEXEC_IMPORTPATH` 现在会被设置为当前构建包的导入路径。

#### `-i` 构建标志 {#i-flag}

<!-- golang.org/issue/41696 -->
`go` `build`、`go` `install` 和 `go` `test` 接受的 `-i` 标志现已弃用。该标志指示 `go` 命令安装命令行指定包所导入的依赖包。自 Go 1.10 引入构建缓存后，`-i` 标志对构建时间已无显著影响，且在安装目录不可写时会导致错误。

#### `list` 命令 {#list-buildid}

<!-- golang.org/cl/263542 -->
当指定 `-export` 标志时，`BuildID` 字段现在会被设置为编译后包的构建 ID。这等同于对 `go` `list` `-exported` `-f` `{{.Export}}` 输出的包运行 `go` `tool` `buildid`，但无需额外步骤。

#### `-overlay` 标志 {#overlay-flag}

<!-- golang.org/issue/39958 -->
`-overlay` 标志指定一个 JSON 配置文件，其中包含一组文件路径替换规则。该标志可用于所有构建命令和 `go` `mod` 子命令。主要用于 gopls 等编辑器工具，以理解未保存的源码修改的影响。配置文件将实际文件路径映射到替换文件路径，`go` 命令及其构建过程将运行，如同实际文件路径存在替换文件路径指定的内容，或当替换文件路径为空时视为文件不存在。

### Cgo {#cgo}

<!-- CL 252378 -->
[cgo](/cmd/cgo) 工具将不再尝试将 C 结构体的位字段转换为 Go 结构体字段，即使其大小可在 Go 中表示。C 位字段在内存中的出现顺序取决于实现，因此在某些情况下 cgo 工具会产生静默错误的结果。

### Vet {#vet}

#### 针对 goroutine 中无效使用 testing.T 的新警告 {#vet-testing-T}

<!-- CL 235677 -->
vet 工具现在会对在测试期间创建的 goroutine 中无效调用 `testing.T` 方法 `Fatal` 发出警告。此警告也适用于对 `testing.T` 测试或 `testing.B` 基准测试中 `Fatalf`、`FailNow` 和 `Skip{,f,Now}` 方法的调用。对这些方法的调用会停止所创建的协程的执行，而不会停止 `Test*` 或 `Benchmark*` 函数。因此，这些方法[必须](/pkg/testing/#T.FailNow)由运行测试或基准测试函数的协程来调用。例如：

	func TestFoo(t *testing.T) {
	    go func() {
	        if condition() {
	            t.Fatal("oops") // 此处退出的是内部匿名函数，而非 TestFoo 函数。
	        }
	        ...
	    }()
	}

如果代码从创建的协程中调用 `t.Fatal`（或类似方法），应将其改写为使用 `t.Error` 来报告测试失败，并使用其他方法（例如 `return` 语句）提前退出协程。前面的例子可以改写为：

	func TestFoo(t *testing.T) {
	    go func() {
	        if condition() {
	            t.Error("oops")
	            return
	        }
	        ...
	    }()
	}

#### 帧指针的新警告 {#vet-frame-pointer}

<!-- CL 248686, CL 276372 -->
vet 工具现在会对违反调用约定、未保存和恢复便破坏 BP 寄存器（帧指针）的 amd64 汇编代码发出警告。未保存 BP 寄存器的代码必须进行修改，要么完全不使用 BP，要么通过保存和恢复来保存 BP。保存 BP 的一种简单方法是将帧大小设置为非零值，这将导致生成的序言和尾声代码自动为你保存 BP 寄存器。具体示例修复可参见 [CL 248260](/cl/248260)。

#### asn1.Unmarshal 的新警告 {#vet-asn1-unmarshal}

<!-- CL 243397 -->
vet 工具现在会对向 [`asn1.Unmarshal`](/pkg/encoding/asn1/#UnMarshal) 错误传递非指针或 nil 参数的情况发出警告。这类似于对 [`encoding/json.Unmarshal`](/pkg/encoding/json/#UnMarshal) 和 [`encoding/xml.Unmarshal`](/pkg/encoding/xml/#UnMarshal) 的现有检查。

## 运行时 {#runtime}

新的 [`runtime/metrics`](/pkg/runtime/metrics/) 包引入了一个稳定的接口，用于从 Go 运行时读取实现定义的指标。它取代了现有的函数，如 [`runtime.ReadMemStats`](/pkg/runtime/#ReadMemStats) 和 [`debug.GCStats`](/pkg/runtime/debug/#GCStats)，并且功能更全面、效率显著更高。更多详情请参阅该包的文档。

<!-- CL 254659 -->
现在，将 `GODEBUG` 环境变量设置为 `inittrace=1` 会使运行时为每个包的 `init` 函数向标准错误输出一行信息，总结其执行时间和内存分配。此跟踪可用于查找 Go 启动性能中的瓶颈或退化问题。`GODEBUG` 文档描述了其格式。

<!-- CL 267100 -->
在 Linux 上，运行时现在默认会及时将内存释放给操作系统（使用 `MADV_DONTNEED`），而不是等到操作系统面临内存压力时才懒释放（使用 `MADV_FREE`）。这意味着像 RSS 这样的进程级内存统计信息将更准确地反映 Go 进程正在使用的物理内存量。那些目前使用 `GODEBUG=madvdontneed=1` 来改善内存监控行为的系统不再需要设置此环境变量。

<!-- CL 220419, CL 271987 -->
Go 1.16 修复了竞态检测器与 [Go 内存模型](/ref/mem) 之间的一个差异。竞态检测器现在能更精确地遵循内存模型中的通道同步规则。因此，检测器现在可能会报告它之前遗漏的竞态条件。

## 编译器 {#compiler}

<!-- CL 256459, CL 264837, CL 266203, CL 256460 -->
编译器现在可以内联包含非标签 `for` 循环、方法值和类型开关的函数。内联器还能检测更多可进行内联的间接调用。

## 链接器 {#linker}

<!-- CL 248197 -->
本版本包含了对 Go 链接器的额外改进，减少了链接器资源使用（包括时间和内存）并提高了代码的健壮性/可维护性。这些变更构成了两期发布项目中用于[现代化 Go 链接器](/s/better-linker)的第二部分。

1.16 中的链接器变更将 1.15 的改进扩展到了所有支持的架构/操作系统组合（1.15 的性能改进主要针对基于 `ELF` 的操作系统和 `amd64` 架构）。对于一组具有代表性的大型 Go 程序，在 `linux/amd64` 平台上，链接速度比 1.15 快 20-25%，平均所需内存减少 5-15%，对于其他架构和操作系统，改进幅度更大。由于更积极的符号裁剪，大多数二进制文件的体积也变小了。

<!-- CL 255259 -->
在 Windows 上，`go build -buildmode=c-shared` 现在默认生成支持 Windows ASLR 的 DLL。可以通过 `--ldflags=-aslr=false` 禁用 ASLR。

## 标准库 {#library}

### 嵌入式文件 {#library-embed}

新的 [`embed`](/pkg/embed/) 包提供了访问在编译期间嵌入到程序中的文件的功能，它使用新的 [`//go:embed` 指令](#embed)。

### 文件系统 {#fs}

新的 [`io/fs`](/pkg/io/fs/) 包定义了 [`fs.FS`](/pkg/io/fs/#FS) 接口，这是一个用于只读文件树的抽象。标准库中的包已被适配以适当使用该接口。

在接口的提供方（生产者）一侧，新的 [`embed.FS`](/pkg/embed/#FS) 类型实现了 `fs.FS`，[`zip.Reader`](/pkg/archive/zip/#Reader) 也是如此。新的 [`os.DirFS`](/pkg/os/#DirFS) 函数提供了一个由操作系统文件树支持的 `fs.FS` 实现。

在接口的使用方（消费者）一侧，新的 [`http.FS`](/pkg/net/http/#FS) 函数将 `fs.FS` 转换为 [`http.FileSystem`](/pkg/net/http/#FileSystem)。此外，[`html/template`](/pkg/html/template/) 和 [`text/template`](/pkg/text/template/) 包的 [`ParseFS`](/pkg/html/template/#ParseFS) 函数和方法可以从 `fs.FS` 读取模板。对于实现 `fs.FS` 接口的代码进行测试，新的 [`testing/fstest`](/pkg/testing/fstest/) 包提供了一个 [`TestFS`](/pkg/testing/fstest/#TestFS) 函数，用于检查并报告常见错误。它还提供了一个简单的内存文件系统实现 [`MapFS`](/pkg/testing/fstest/#MapFS)，这对于测试接受 `fs.FS` 实现的代码很有用。

### io/ioutil 包废弃 {#ioutil}

[`io/ioutil`](/pkg/io/ioutil/) 包已被证明是一个定义模糊且难以理解的功能集合。该包提供的所有功能都已迁移到其他包中。`io/ioutil` 包将继续存在并像以前一样工作，但我们鼓励新代码使用 [`io`](/pkg/io/) 和 [`os`](/pkg/os/) 包中的新定义。以下是 `io/ioutil` 导出的名称在新位置的列表：

  - [`Discard`](/pkg/io/ioutil/#Discard)
    => [`io.Discard`](/pkg/io/#Discard)
  - [`NopCloser`](/pkg/io/ioutil/#NopCloser)
    => [`io.NopCloser`](/pkg/io/#NopCloser)
  - [`ReadAll`](/pkg/io/ioutil/#ReadAll)
    => [`io.ReadAll`](/pkg/io/#ReadAll)
  - [`ReadDir`](/pkg/io/ioutil/#ReadDir)
    => [`os.ReadDir`](/pkg/os/#ReadDir)
    (注意：返回的是
    [`os.DirEntry`](/pkg/os/#DirEntry) 的切片，而不是
    [`fs.FileInfo`](/pkg/io/fs/#FileInfo) 的切片)
  - [`ReadFile`](/pkg/io/ioutil/#ReadFile)
    => [`os.ReadFile`](/pkg/os/#ReadFile)
  - [`TempDir`](/pkg/io/ioutil/#TempDir)
    => [`os.MkdirTemp`](/pkg/os/#MkdirTemp)
  - [`TempFile`](/pkg/io/ioutil/#TempFile)
    => [`os.CreateTemp`](/pkg/os/#CreateTemp)
  - [`WriteFile`](/pkg/io/ioutil/#WriteFile)
    => [`os.WriteFile`](/pkg/os/#WriteFile)

### 标准库细微改动 {#minor_library_changes}

一如既往，标准库中有各种细微的改动和更新，这些都是在考虑到 Go 1 [兼容性承诺](/doc/go1compat) 的情况下进行的。

#### [archive/zip](/pkg/archive/zip/)

<!-- CL 243937 -->
新的 [`Reader.Open`](/pkg/archive/zip/#Reader.Open) 方法实现了 [`fs.FS`](/pkg/io/fs/#FS) 接口。

#### [crypto/dsa](/pkg/crypto/dsa/)

<!-- CL 257939 -->
[`crypto/dsa`](/pkg/crypto/dsa/) 包现已废弃。参见 [issue #40337](/issue/40337)。

<!-- crypto/dsa -->

#### [crypto/hmac](/pkg/crypto/hmac/)

<!-- CL 261960 -->
如果对哈希生成函数的多次独立调用未能返回新值，[`New`](/pkg/crypto/hmac/#New) 现在将触发 panic。以前，此行为是未定义的，并且有时会产生无效输出。

<!-- crypto/hmac -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 256897 -->
现在可以使用新的 [`net.ErrClosed`](/pkg/net/#ErrClosed) 错误来检测对正在关闭或已关闭的 TLS 连接的 I/O 操作。典型用法是 `errors.Is(err, net.ErrClosed)`。

<!-- CL 266037 -->
现在在发送 "close notify" 警报之前，会在 [`Conn.Close`](/pkg/crypto/tls/#Conn.Close) 中设置默认写入截止时间，以防止无限期阻塞。

<!-- CL 239748 -->
如果服务器选择的 [ALPN 协议](/pkg/crypto/tls/#ConnectionState.NegotiatedProtocol) 不在 [客户端通告的列表](/pkg/crypto/tls/#Config.NextProtos) 中，客户端现在将返回握手错误。

<!-- CL 262857 -->
除非同时设置了 [`Config.PreferServerCipherSuites`](/pkg/crypto/tls/#Config.PreferServerCipherSuites) 和 [`Config.CipherSuites`](/pkg/crypto/tls/#Config.CipherSuites)，否则如果客户端或服务器任一方没有 AES 硬件支持，服务器现在将优先使用其他可用的 AEAD 密码套件（例如 ChaCha20Poly1305），而不是 AES-GCM 密码套件。如果客户端没有发出对 AES-GCM 密码套件的偏好信号，则假定其没有 AES 硬件支持。

<!-- CL 246637 -->
如果接收者为 nil，[`Config.Clone`](/pkg/crypto/tls/#Config.Clone) 现在将返回 nil，而不是引发 panic。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

`GODEBUG=x509ignoreCN=0` 标志将在 Go 1.17 中移除。它启用了在没有主题备用名称时，将 X.509 证书的 `CommonName` 字段视为主机名的旧行为。

<!-- CL 235078 -->
[`ParseCertificate`](/pkg/crypto/x509/#ParseCertificate) 和 [`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 现在强制执行 `DNSNames`、`EmailAddresses` 和 `URIs` 字段的字符串编码限制。这些字段只能包含 ASCII 范围内的字符。

<!-- CL 259697 -->
[`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 现在会使用签名者的公钥验证生成的证书签名。如果签名无效，将返回错误，而不是生成格式错误的证书。

<!-- CL 257939 -->
不再支持 DSA 签名验证。请注意，DSA 签名生成从未被支持。参见 [issue #40337](/issue/40337)。

<!-- CL 257257 -->
在 Windows 上，[`Certificate.Verify`](/pkg/crypto/x509/#Certificate.Verify) 现在将返回由平台证书验证器构建的所有证书链，而不仅仅是最高等级的链。

<!-- CL 262343 -->
新的 [`SystemRootsError.Unwrap`](/pkg/crypto/x509/#SystemRootsError.Unwrap) 方法允许通过 [`errors`](/pkg/errors) 包的函数访问 [`Err`](/pkg/crypto/x509/#SystemRootsError.Err) 字段。

<!-- CL 230025 -->
在 Unix 系统上，`crypto/x509` 包现在在存储其系统证书池副本方面更高效。仅使用少量根证书的程序将减少约半兆字节的内存占用。

<!-- crypto/x509 -->

#### [debug/elf](/pkg/debug/elf/)

<!-- CL 255138 -->
增加了更多的 [`DT`](/pkg/debug/elf/#DT_NULL) 和 [`PT`](/pkg/debug/elf/#PT_NULL) 常量。

<!-- debug/elf -->

#### [encoding/asn1](/pkg/encoding/asn1)<!-- CL 255881 -->
当参数不是指针或为空时，[`Unmarshal`](/pkg/encoding/asn1/#Unmarshal) 和 [`UnmarshalWithParams`](/pkg/encoding/asn1/#UnmarshalWithParams) 现在会返回错误而非引发恐慌。此变更与其他编码包（如 [`encoding/json`](/pkg/encoding/json)）的行为保持一致。

#### [encoding/json](/pkg/encoding/json/)

<!-- CL 234818 -->
[`Marshal`](/pkg/encoding/json/#Marshal)、[`Unmarshal`](/pkg/encoding/json/#Unmarshal) 及相关功能现在理解的 `json` 结构体字段标签，允许在 Go 结构体字段的 JSON 对象名称中使用分号字符。

<!-- encoding/json -->

#### [encoding/xml](/pkg/encoding/xml/)

<!-- CL 264024 -->
编码器历来注意避免使用以 `xml` 开头的命名空间前缀，因为该前缀受 XML 规范保留。
现在，为了更严格地遵循规范，该检查不再区分大小写，因此也会避免使用以 `XML`、`XmL` 等开头的前缀。

<!-- encoding/xml -->

#### [flag](/pkg/flag/)

<!-- CL 240014 -->
新的 [`Func`](/pkg/flag/#Func) 函数允许注册通过调用函数实现的标志，这比实现 [`Value`](/pkg/flag/#Value) 接口更轻量级。

<!-- flag -->

#### [go/build](/pkg/go/build/)

<!-- CL 243941, CL 283636 -->
[`Package`](/pkg/go/build/#Package) 结构体新增了字段，用于报告包中关于 `//go:embed` 指令的信息：
[`EmbedPatterns`](/pkg/go/build/#Package.EmbedPatterns)、
[`EmbedPatternPos`](/pkg/go/build/#Package.EmbedPatternPos)、
[`TestEmbedPatterns`](/pkg/go/build/#Package.TestEmbedPatterns)、
[`TestEmbedPatternPos`](/pkg/go/build/#Package.TestEmbedPatternPos)、
[`XTestEmbedPatterns`](/pkg/go/build/#Package.XTestEmbedPatterns)、
[`XTestEmbedPatternPos`](/pkg/go/build/#Package.XTestEmbedPatternPos)。

<!-- CL 240551 -->
[`Package`](/pkg/go/build/#Package) 的字段 [`IgnoredGoFiles`](/pkg/go/build/#Package.IgnoredGoFiles) 将不再包含以 "\_" 或 "." 开头的文件，因为这些文件总是被忽略。`IgnoredGoFiles` 仅用于因构建约束而被忽略的文件。

<!-- CL 240551 -->
新增的 [`Package`](/pkg/go/build/#Package) 字段 [`IgnoredOtherFiles`](/pkg/go/build/#Package.IgnoredOtherFiles) 包含了因构建约束而被忽略的非 Go 文件列表。

<!-- go/build -->

#### [go/build/constraint](/pkg/go/build/constraint/)

<!-- CL 240604 -->
新增的 [`go/build/constraint`](/pkg/go/build/constraint/) 包用于解析构建约束行，既支持原有的 `// +build` 语法，也支持将在 Go 1.17 中引入的 `//go:build` 语法。
该包的存在使得用 Go 1.16 构建的工具能够处理 Go 1.17 的源代码。
关于构建约束语法及计划向 `//go:build` 语法过渡的详情，请参阅 [https://golang.org/design/draft-gobuild](/design/draft-gobuild)。
请注意，Go 1.16 **不**支持 `//go:build` 行，目前不应将其引入 Go 程序中。

<!-- go/build/constraint -->

#### [html/template](/pkg/html/template/)

<!-- CL 243938 -->
新增的 [`template.ParseFS`](/pkg/html/template/#ParseFS) 函数和 [`template.Template.ParseFS`](/pkg/html/template/#Template.ParseFS) 方法类似于 [`template.ParseGlob`](/pkg/html/template/#ParseGlob) 和 [`template.Template.ParseGlob`](/pkg/html/template/#Template.ParseGlob)，但它们从一个 [`fs.FS`](/pkg/io/fs/#FS) 中读取模板。

<!-- html/template -->

#### [io](/pkg/io/)

<!-- CL 261577 -->
该包现在定义了 [`ReadSeekCloser`](/pkg/io/#ReadSeekCloser) 接口。

<!-- CL 263141 -->
该包现在定义了 [`Discard`](/pkg/io/#Discard)、[`NopCloser`](/pkg/io/#NopCloser) 和 [`ReadAll`](/pkg/io/#ReadAll)，用于替代 [`io/ioutil`](/pkg/io/ioutil/) 包中的同名功能。

<!-- io -->

#### [log](/pkg/log/)

<!-- CL 264460 -->
新增的 [`Default`](/pkg/log/#Default) 函数提供了访问默认 [`Logger`](/pkg/log/#Logger) 的途径。

<!-- log -->

#### [log/syslog](/pkg/log/syslog/)

<!-- CL 264297 -->
当记录到自定义 Unix 域套接字时，[`Writer`](/pkg/log/syslog/#Writer) 现在使用本地消息格式（省略主机名并使用更短的时间戳），这与默认日志套接字使用的格式一致。

<!-- log/syslog -->

#### [mime/multipart](/pkg/mime/multipart/)

<!-- CL 247477 -->
当传递 `int64` 最大值作为限制时，[`Reader`](/pkg/mime/multipart/#Reader) 的 [`ReadForm`](/pkg/mime/multipart/#Reader.ReadForm) 方法不再拒绝表单数据。

<!-- mime/multipart -->

#### [net](/pkg/net/)

<!-- CL 250357 -->
在已关闭的网络连接上进行 I/O 操作，或在任何 I/O 操作完成前网络连接即已关闭的情况，现在可以使用新的 [`ErrClosed`](/pkg/net/#ErrClosed) 错误来检测。典型用法是 `errors.Is(err, net.ErrClosed)`。在早期版本中，唯一可靠检测此情况的方法是将 `Error` 方法返回的字符串与 `"use of closed network connection"` 进行匹配。

<!-- CL 255898 -->
在之前的 Go 版本中，Linux 系统上默认的 TCP 监听器积压大小（由 `/proc/sys/net/core/somaxconn` 设置）被限制为最大 `65535`。在 Linux 内核版本 4.1 及以上，最大值现在为 `4294967295`。

<!-- CL 238629 -->
在 Linux 上，当 `/etc/nsswitch.conf` 缺失时，主机名查找不再先使用 DNS 而是直接检查 `/etc/hosts`；这在基于 musl 的系统上很常见，使得 Go 程序的行为与这些系统上的 C 程序一致。

<!-- net -->

#### [net/http](/pkg/net/http/)<!-- CL 233637 -->
在 [`net/http`](/pkg/net/http/) 包中，[`StripPrefix`](/pkg/net/http/#StripPrefix) 的行为已经更改，现在它会同时从请求 URL 的 `RawPath` 字段和 `Path` 字段中剥离前缀。在过去的版本中，仅会修剪 `Path` 字段，因此如果请求 URL 包含任何转义字符，URL 将被修改为具有不匹配的 `Path` 和 `RawPath` 字段。在 Go 1.16 中，`StripPrefix` 会修剪这两个字段。如果请求 URL 的前缀部分包含转义字符，处理器将返回 404 错误，而不是像以前那样使用不匹配的 `Path`/`RawPath` 对来调用底层处理器。

<!-- CL 252497 -->
[`net/http`](/pkg/net/http/) 包现在会拒绝 `"Range": "bytes=--N"` 形式的 HTTP 范围请求，其中 `"-N"` 是一个负的后缀长度（例如 `"Range": "bytes=--2"`）。它现在会回复 `416 "Range Not Satisfiable"` 响应。

<!-- CL 256498, golang.org/issue/36990 -->
使用 [`SameSiteDefaultMode`](/pkg/net/http/#SameSiteDefaultMode) 设置的 Cookie 现在的行为符合当前规范（不设置任何属性），而不是生成一个没有值的 SameSite 键。

<!-- CL 250039 -->
[`Client`](/pkg/net/http/#Client) 现在会在带有空消息体的 `PATCH` 请求中发送显式的 `Content-Length: 0` 头部，这与 `POST` 和 `PUT` 的现有行为保持一致。

<!-- CL 249440 -->
当未设置 `HTTPS_PROXY` 时，[`ProxyFromEnvironment`](/pkg/net/http/#ProxyFromEnvironment) 函数不再为 `https://` URL 返回 `HTTP_PROXY` 环境变量的设置。

<!-- 259917 -->
[`Transport`](/pkg/net/http/#Transport) 类型有一个新字段 [`GetProxyConnectHeader`](/pkg/net/http/#Transport.GetProxyConnectHeader)，可以将其设置为一个函数，该函数返回在 `CONNECT` 请求期间发送给代理的头部。实际上，`GetProxyConnectHeader` 是现有字段 [`ProxyConnectHeader`](/pkg/net/http/#Transport.ProxyConnectHeader) 的动态版本；如果 `GetProxyConnectHeader` 不为 `nil`，则会忽略 `ProxyConnectHeader`。

<!-- CL 243939 -->
新的 [`http.FS`](/pkg/net/http/#FS) 函数将 [`fs.FS`](/pkg/io/fs/#FS) 转换为 [`http.FileSystem`](/pkg/net/http/#FileSystem)。

<!-- net/http -->

#### [net/http/httputil](/pkg/net/http/httputil/)

<!-- CL 260637 -->
[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 在代理具有未知消息体长度的流式响应时，现在会更积极地刷新缓冲数据。

<!-- net/http/httputil -->

#### [net/smtp](/pkg/net/smtp/)

<!-- CL 247257 -->
[`Client`](/pkg/net/smtp/#Client) 的 [`Mail`](/pkg/net/smtp/#Client.Mail) 方法现在会向支持它的服务器发送 `SMTPUTF8` 指令，表明地址是使用 UTF-8 编码的。

<!-- net/smtp -->

#### [os](/pkg/os/)

<!-- CL 242998 -->
当进程已经完成时，[`Process.Signal`](/pkg/os/#Process.Signal) 现在会返回 [`ErrProcessDone`](/pkg/os/#ErrProcessDone)，而不是未导出的 `errFinished`。

<!-- CL 261540 -->
该包定义了一个新类型 [`DirEntry`](/pkg/os/#DirEntry)，作为 [`fs.DirEntry`](/pkg/io/fs/#DirEntry) 的别名。新的 [`ReadDir`](/pkg/os/#ReadDir) 函数和新的 [`File.ReadDir`](/pkg/os/#File.ReadDir) 方法可用于将目录内容读取到一个 [`DirEntry`](/pkg/os/#DirEntry) 切片中。 [`File.Readdir`](/pkg/os/#File.Readdir) 方法（注意 `dir` 中的小写 `d`）仍然存在，它返回一个 [`FileInfo`](/pkg/os/#FileInfo) 切片，但对于大多数程序来说，切换到 [`File.ReadDir`](/pkg/os/#File.ReadDir) 会更高效。

<!-- CL 263141 -->
该包现在定义了 [`CreateTemp`](/pkg/os/#CreateTemp)、[`MkdirTemp`](/pkg/os/#MkdirTemp)、[`ReadFile`](/pkg/os/#ReadFile) 和 [`WriteFile`](/pkg/os/#WriteFile)，用于替代 [`io/ioutil`](/pkg/io/ioutil/) 包中定义的函数。

<!-- CL 243906 -->
类型 [`FileInfo`](/pkg/os/#FileInfo)、[`FileMode`](/pkg/os/#FileMode) 和 [`PathError`](/pkg/os/#PathError) 现在是 [`io/fs`](/pkg/io/fs/) 包中同名类型的别名。 [`os`](/pkg/os/) 包中的函数签名已更新，以引用 [`io/fs`](/pkg/io/fs/) 包中的名称。这不应影响任何现有代码。

<!-- CL 243911 -->
新的 [`DirFS`](/pkg/os/#DirFS) 函数提供了一个由操作系统文件树支持的 [`fs.FS`](/pkg/io/fs/#FS) 实现。

<!-- os -->

#### [os/signal](/pkg/os/signal/)

<!-- CL 219640 -->
新的 [`NotifyContext`](/pkg/os/signal/#NotifyContext) 函数允许创建在接收到特定信号时被取消的上下文。

<!-- os/signal -->

#### [path](/pkg/path/)

<!-- CL 264397, golang.org/issues/28614 -->
如果模式中未匹配的部分存在语法错误，[`Match`](/pkg/path/#Match) 函数现在会返回错误。此前，该函数在匹配失败时会提前返回，因此不会报告模式中后续的任何语法错误。

<!-- path -->

#### [path/filepath](/pkg/path/filepath/)

<!-- CL 267887 -->
新函数 [`WalkDir`](/pkg/path/filepath/#WalkDir) 类似于 [`Walk`](/pkg/path/filepath/#Walk)，但通常更高效。传递给 `WalkDir` 的函数接收一个 [`fs.DirEntry`](/pkg/io/fs/#DirEntry)，而不是 [`fs.FileInfo`](/pkg/io/fs/#FileInfo)。（为那些记得 `Walk` 函数接收 [`os.FileInfo`](/pkg/os/#FileInfo) 的人澄清一下，`os.FileInfo` 现在是 `fs.FileInfo` 的别名。）

<!-- CL 264397, golang.org/issues/28614 -->
如果模式中未匹配的部分存在语法错误，[`Match`](/pkg/path/filepath#Match) 和 [`Glob`](/pkg/path/filepath#Glob) 函数现在会返回错误。此前，这些函数在匹配失败时会提前返回，因此不会报告模式中后续的任何语法错误。

<!-- path/filepath -->

#### [reflect](/pkg/reflect/)<!-- CL 192331 -->
`Zero` 函数已优化，以避免内存分配。如果代码使用 `==` 或 `DeepEqual` 错误地将返回的 `Value` 与另一个 `Value` 进行比较，可能会得到与先前 Go 版本不同的结果。[`reflect.Value`](/pkg/reflect#Value) 的文档描述了如何正确比较两个 `Value`。

<!-- reflect -->

#### [runtime/debug](/pkg/runtime/debug/)

<!-- CL 249677 -->
当启用 `SetPanicOnFault` 时使用的 [`runtime.Error`](/pkg/runtime#Error) 值现在可能具有一个 `Addr` 方法。如果该方法存在，它将返回触发故障的内存地址。

<!-- runtime/debug -->

#### [strconv](/pkg/strconv/)

<!-- CL 260858 -->
[`ParseFloat`](/pkg/strconv/#ParseFloat) 现在使用 [Eisel-Lemire 算法](https://nigeltao.github.io/blog/2020/eisel-lemire.html)，性能提升了约 2 倍。这也可能加速解码文本格式，如 [`encoding/json`](/pkg/encoding/json/)。

<!-- strconv -->

#### [syscall](/pkg/syscall/)

<!-- CL 263271 -->
[`NewCallback`](/pkg/syscall/?GOOS=windows#NewCallback) 和 [`NewCallbackCDecl`](/pkg/syscall/?GOOS=windows#NewCallbackCDecl) 现在正确支持包含连续多个小于 `uintptr` 大小参数的回调函数。这可能需要调整对这些函数的使用，以消除小型参数之间的手动填充。

<!-- CL 261917 -->
Windows 上的 [`SysProcAttr`](/pkg/syscall/?GOOS=windows#SysProcAttr) 增加了一个新的 `NoInheritHandles` 字段，用于在创建新进程时禁用句柄继承。

<!-- CL 269761, golang.org/issue/42584 -->
Windows 上的 [`DLLError`](/pkg/syscall/?GOOS=windows#DLLError) 现在具有一个 `Unwrap` 方法，用于解包其底层错误。

<!-- CL 210639 -->
在 Linux 上，[`Setgid`](/pkg/syscall/#Setgid)、[`Setuid`](/pkg/syscall/#Setuid) 及相关调用现已实现。此前，它们返回 `syscall.EOPNOTSUPP` 错误。

<!-- CL 210639 -->
在 Linux 上，新函数 [`AllThreadsSyscall`](/pkg/syscall/#AllThreadsSyscall) 和 [`AllThreadsSyscall6`](/pkg/syscall/#AllThreadsSyscall6) 可用于在进程的所有 Go 线程上执行系统调用。这些函数只能由不使用 cgo 的程序使用；如果程序使用了 cgo，它们将始终返回 [`syscall.ENOTSUP`](/pkg/syscall/#ENOTSUP)。

<!-- syscall -->

#### [testing/iotest](/pkg/testing/iotest/)

<!-- CL 199501 -->
新函数 [`ErrReader`](/pkg/testing/iotest/#ErrReader) 返回一个始终返回错误的 [`io.Reader`](/pkg/io/#Reader)。

<!-- CL 243909 -->
新函数 [`TestReader`](/pkg/testing/iotest/#TestReader) 用于测试 [`io.Reader`](/pkg/io/#Reader) 的行为是否正确。

<!-- testing/iotest -->

#### [text/template](/pkg/text/template/)

<!-- CL 254257, golang.org/issue/29770 -->
现在允许在动作定界符内使用换行符，使得动作可以跨越多行。

<!-- CL 243938 -->
新函数 [`template.ParseFS`](/pkg/text/template/#ParseFS) 和方法 [`template.Template.ParseFS`](/pkg/text/template/#Template.ParseFS) 类似于 [`template.ParseGlob`](/pkg/text/template/#ParseGlob) 和 [`template.Template.ParseGlob`](/pkg/text/template/#Template.ParseGlob)，但它们从 [`fs.FS`](/pkg/io/fs/#FS) 读取模板。

<!-- text/template -->

#### [text/template/parse](/pkg/text/template/parse/)

<!-- CL 229398, golang.org/issue/34652 -->
解析树中新增了 [`CommentNode`](/pkg/text/template/parse/#CommentNode)。`parse.Tree` 中的 [`Mode`](/pkg/text/template/parse/#Mode) 字段用于启用对其的访问。

<!-- text/template/parse -->

#### [time/tzdata](/pkg/time/tzdata/)

<!-- CL 261877 -->
`$GOROOT/lib/time/zoneinfo.zip` 中的时区数据库及本包中的嵌入副本现在使用精简的时区数据格式。这使时区数据库的大小减少了约 350 KB。

<!-- time/tzdata -->

#### [unicode](/pkg/unicode/)

<!-- CL 248765 -->
[`unicode`](/pkg/unicode/) 包及系统各处的相关支持已从 Unicode 12.0.0 升级到 [Unicode 13.0.0](https://www.unicode.org/versions/Unicode13.0.0/)，新增了 5,930 个字符，包括四种新的文字系统和 55 个新的表情符号。Unicode 13.0.0 还将第三表意文字平面（U+30000-U+3FFFF）指定为第三表意文字平面。

<!-- unicode -->