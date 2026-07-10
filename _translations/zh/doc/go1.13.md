---
title: Go 1.13 版本说明
---

<!--
注：本文档及此目录中的其他文档中，惯例是使用固定宽度的短语搭配非固定宽度的空格，如 `hello` `world`。
请勿发送去除此类短语内部标签的变更请求。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.13 简介 {#introduction}

最新的 Go 版本 1.13 在 [Go 1.12](go1.12) 发布六个月后发布。
其大部分变更集中在工具链、运行时和库的实现方面。
与以往一样，该版本维护了 Go 1 [兼容性承诺](/doc/go1compat.html)。
我们预计几乎所有 Go 程序将继续像以前一样编译和运行。

自 Go 1.13 起，`go` 命令默认使用 Google 运行的 Go 模块镜像和 Go 校验和数据库来下载和验证模块。
关于这些服务的隐私信息，请参见 <https://proxy.golang.org/privacy>；
配置详情（包括如何禁用这些服务器或使用不同的服务器），请参见 [`go` 命令文档](/cmd/go/#hdr-Module_downloading_and_verification)。
如果您依赖非公开模块，请参阅 [配置环境的文档](/cmd/go/#hdr-Module_configuration_for_non_public_modules)。

## 语言变更 {#language}

根据[数字字面量提案](https://github.com/golang/proposal/blob/master/design/19308-number-literals.md)，Go 1.13 支持一套更统一、更现代化的数字字面量前缀。

  - [二进制整数字面量](/ref/spec#Integer_literals)：
    前缀 `0b` 或 `0B` 表示二进制整数字面量，例如 `0b1011`。
  - [八进制整数字面量](/ref/spec#Integer_literals)：
    前缀 `0o` 或 `0O` 表示八进制整数字面量，例如 `0o660`。
    现有的以 `0` 开头后跟八进制数字的八进制表示法仍然有效。
  - [十六进制浮点字面量](/ref/spec#Floating-point_literals)：
    前缀 `0x` 或 `0X` 现可用于表示浮点数的尾数部分，采用十六进制格式，例如 `0x1.0p-1021`。
    十六进制浮点数必须始终带有一个指数，写作字母 `p` 或 `P` 后跟十进制的指数值。指数将尾数按 2 的指数次幂进行缩放。
  - [虚数字面量](/ref/spec#Imaginary_literals)：
    虚数后缀 `i` 现可与任何（二进制、十进制、十六进制）整数或浮点字面量一起使用。
  - 数字分隔符：
    任何数字字面量的数字现在都可以使用下划线进行分隔（分组），例如 `1_000_000`、`0b_1010_0110` 或 `3.1415_9265`。
    下划线可以出现在任意两个数字之间，或者字面量前缀和第一个数字之间。

根据[有符号移位计数提案](https://github.com/golang/proposal/blob/master/design/19113-signed-shift-counts.md)，Go 1.13 移除了 [移位计数](/ref/spec#Operators) 必须是无符号数的限制。此变更消除了许多仅为满足 `<<` 和 `>>` 操作符（现已移除）的限制而引入的人为 `uint` 转换。

这些语言变更通过对编译器的更改以及库包 [`go/scanner`](#go/scanner) 和 [`text/scanner`](#text/scanner)（数字字面量）以及 [`go/types`](#go/types)（有符号移位计数）的相应内部变更来实现。

如果您的代码使用模块，并且您的 `go.mod` 文件指定了语言版本，请确保将其设置为至少 `1.13`，以便使用这些语言变更。
您可以直接编辑 `go.mod` 文件，也可以运行 `go mod edit -go=1.13`。

## 移植平台 {#ports}

Go 1.13 是最后一个支持 Native Client (NaCl) 的版本。

<!-- CL 170119, CL 168882 -->
对于 `GOARCH=wasm`，新的环境变量 `GOWASM` 接收一个逗号分隔的实验性特性列表，二进制文件编译时将包含这些特性。
有效值记录在[此处](/cmd/go/#hdr-Environment_variables)。

### AIX {#aix}

<!-- CL 164003, CL 169120 -->
PPC64 上的 AIX (`aix/ppc64`) 现在支持 cgo、外部链接以及 `c-archive` 和 `pie` 构建模式。

### Android {#android}

<!-- CL 170127 -->
Go 程序现在兼容 Android 10。

### Darwin {#darwin}

如 Go 1.12 版本说明中[宣布](go1.12#darwin)的那样，Go 1.13 现在要求 macOS 10.11 El Capitan 或更高版本；对以前版本的支持已停止。

### FreeBSD {#freebsd}

如 Go 1.12 版本说明中[宣布](go1.12#freebsd)的那样，Go 1.13 现在要求 FreeBSD 11.2 或更高版本；对以前版本的支持已停止。
FreeBSD 12.0 或更高版本需要启用 `COMPAT_FREEBSD11` 选项的内核（这是默认设置）。

### Illumos {#illumos}

<!-- CL 174457 -->
Go 现在支持 `GOOS=illumos` 的 Illumos 平台。
`illumos` 构建标签隐含了 `solaris` 构建标签。

### Windows {#windows}

<!-- CL 178977 -->
内部链接的 Windows 二进制文件指定的 Windows 版本现在是 Windows 7，而不是 NT 4.0。这已经是 Go 要求的最低版本，但可能会影响具有向后兼容模式的系统调用行为。这些调用现在将按照文档记录的方式行为。外部链接的二进制文件（任何使用 cgo 的程序）始终指定更新的 Windows 版本。

## 工具 {#tools}

### 模块 {#modules}

#### 环境变量 {#proxy-vars}

<!-- CL 176580 -->
[`GO111MODULE`](/cmd/go/#hdr-Module_support) 环境变量继续默认为 `auto`，但 `auto` 设置现在会在当前工作目录包含（或其父目录包含）`go.mod` 文件时激活 `go` 命令的模块感知模式——即使当前目录位于 `GOPATH/src` 内。此变更简化了 `GOPATH/src` 内现有代码的迁移，以及与非模块感知导入器并行维护模块感知包的工作。<!-- CL 181719 -->
新的 [`GOPRIVATE`](/cmd/go/#hdr-Module_configuration_for_non_public_modules) 环境变量用于指明哪些模块路径是不可公开访问的。它作为底层变量 `GONOPROXY` 和 `GONOSUMDB` 的默认值，这两个变量提供了更精细的控制，用于决定哪些模块通过代理获取，并使用校验和数据库进行验证。

<!-- CL 173441, CL 177958 -->
[`GOPROXY` 环境变量](/cmd/go/#hdr-Module_downloading_and_verification)现在可以设置为逗号分隔的代理 URL 列表或特殊标记 `direct`，并且其[默认值](#introduction)现在是 `https://proxy.golang.org,direct`。在将包路径解析到其所属的模块时，`go` 命令将依次尝试列表中每个代理上的所有候选模块路径。如果某个代理无法访问，或返回除 404 或 410 以外的 HTTP 状态码，则搜索将终止，而不再查询剩余的代理。

新的 [`GOSUMDB`](/cmd/go/#hdr-Module_authentication_failures) 环境变量用于标识用于查询模块校验和的数据库的名称，可选地还包括其公钥和服务器 URL。这些模块是指尚未列在主模块的 `go.sum` 文件中的模块。如果 `GOSUMDB` 未包含显式 URL，则该 URL 将通过探测 `GOPROXY` URL 来确定，以寻找一个表示支持校验和数据库的端点；如果没有任何代理支持，则回退到直接连接到指定的数据库。如果将 `GOSUMDB` 设置为 `off`，则不查询校验和数据库，仅验证 `go.sum` 文件中已有的校验和。

无法访问默认代理和校验和数据库的用户（例如，由于防火墙或沙盒配置限制）可以通过将 `GOPROXY` 设置为 `direct`，和/或将 `GOSUMDB` 设置为 `off` 来禁用它们。可以使用 [`go` `env` `-w`](#go-env-w) 来设置这些变量的默认值，且不受平台限制：

	go env -w GOPROXY=direct
	go env -w GOSUMDB=off

#### `go` `get` {#go-get}

<!-- CL 174099 -->
在模块感知模式下，带有 `-u` 标志的 [`go` `get`](/cmd/go/#hdr-Add_dependencies_to_current_module_and_install_them) 现在更新一个更小的模块集合，这个集合与在 GOPATH 模式下 `go` `get` `-u` 所更新的包集合更为一致。`go` `get` `-u` 仍然会更新命令行中指定的模块和包，但除此之外，它只更新包含这些指定包所导入的包的模块，而不是包含这些指定包的模块的传递模块依赖。

请注意，特别是 `go` `get` `-u`（不带额外参数）现在仅更新当前目录中包的传递导入。要更新主模块传递导入的所有包（包括测试依赖项），请使用 `go` `get` `-u` `all`。

<!-- CL 177879 -->
由于上述对 `go` `get` `-u` 的更改，`go` `get` 子命令不再支持 `-m` 标志（该标志曾导致 `go` `get` 在加载包之前停止）。`-d` 标志仍然受支持，并且仍然会导致 `go` `get` 在下载了构建指定包所需的依赖项源代码后停止。

<!-- CL 177677 -->
默认情况下，模块模式下的 `go` `get` `-u` 仅升级非测试依赖项，这与 GOPATH 模式一致。现在它还接受 `-t` 标志，该标志（与 GOPATH 模式下一样）会导致 `go` `get` 包含命令行指定包的测试所导入的包。

<!-- CL 167747 -->
在模块感知模式下，`go` `get` 子命令现在支持版本后缀 `@patch`。`@patch` 后缀表示应将指定模块（或包含指定包的模块）更新到具有相同主次版本的最高补丁版本。

<!-- CL 184440 -->
如果传递给 `go` `get` 的一个模块参数（不带版本后缀）在构建列表中已被要求为比最新发布版本更新的版本，它将保持在该较新版本。这与 `-u` 标志对模块依赖项的行为是一致的。这可以防止意外地从预发布版本降级。新的版本后缀 `@upgrade` 明确请求这种行为。`@latest` 则明确请求最新版本，无论当前版本如何。

#### 版本验证 {#version-validation}

<!-- CL 181881 -->

当从版本控制系统提取模块时，`go` 命令现在会对请求的版本字符串执行额外的验证。

`+incompatible` 版本注解绕过了对模块引入之前存在的仓库的[语义导入版本控制](/cmd/go/#hdr-Module_compatibility_and_semantic_versioning)要求。`go` 命令现在会验证此类版本是否不包含显式的 `go.mod` 文件。

`go` 命令现在验证[伪版本](/cmd/go/#hdr-Pseudo_versions)与版本控制元数据之间的映射。具体来说：

  - 版本前缀必须为 `vX.0.0` 形式，或者派生自指定修订版祖先的标签，或者派生自在指定修订版本身包含[构建元数据](https://semver.org/#spec-item-10)的标签。
  - 日期字符串必须与修订版的 UTC 时间戳匹配。
  - 修订版的短名称必须使用与 `go` 命令将生成的字符数相同的字符数。（对于 `git` 使用的 SHA-1 哈希，为 12 位前缀。）

如果[主模块](/cmd/go/#hdr-The_main_module_and_the_build_list)中的 `require` 指令使用了无效的伪版本，通常可以通过将版本编辑为仅保留提交哈希值，然后重新运行 `go` 命令（如 `go` `list` `-m` `all` 或 `go` `mod` `tidy`）来修正。例如，

	require github.com/docker/docker v1.14.0-0.20190319215453-e7b5f7dbe98c

可以编辑为

	require github.com/docker/docker e7b5f7dbe98c

这在当前会解析为

	require github.com/docker/docker v0.7.3-0.20190319215453-e7b5f7dbe98c如果主模块的某个传递依赖需要无效版本或伪版本，可以在主模块的 `go.mod` 文件中使用 [`replace` 指令](/cmd/go/#hdr-The_go_mod_file)将其替换为有效版本。如果替换项是提交哈希值，它将按上述方式解析为适当的伪版本。例如：

	replace github.com/docker/docker v1.14.0-0.20190319215453-e7b5f7dbe98c => github.com/docker/docker e7b5f7dbe98c

目前解析为：

	replace github.com/docker/docker v1.14.0-0.20190319215453-e7b5f7dbe98c => github.com/docker/docker v0.7.3-0.20190319215453-e7b5f7dbe98c

### Go 命令 {#go-command}

<!-- CL 171137 -->
[`go` `env`](/cmd/go/#hdr-Environment_variables) 命令现在接受 `-w` 标志，用于设置 `go` 命令识别的环境变量的每用户默认值；同时提供相应的 `-u` 标志，用于取消之前设置的默认值。通过 `go` `env` `-w` 设置的默认值存储在 [`os.UserConfigDir()`](/pkg/os/#UserConfigDir) 下的 `go/env` 文件中。

<!-- CL 173343 -->
[`go` `version`](/cmd/go/#hdr-Print_Go_version) 命令现在接受可执行文件和目录作为参数。当作用于可执行文件时，`go` `version` 打印用于构建该可执行文件的 Go 版本。如果使用了 `-m` 标志，`go` `version` 将打印可执行文件中嵌入的模块版本信息（如果可用）。当作用于目录时，`go` `version` 打印该目录及其子目录中包含的可执行文件信息。

<!-- CL 173345 -->
新增的 [`go` `build` 标志](/cmd/go/#hdr-Compile_packages_and_dependencies) `-trimpath` 会从编译后的可执行文件中移除所有文件系统路径，以提高构建可重现性。

<!-- CL 167679 -->
如果传递给 `go` `build` 的 `-o` 标志指向一个现有目录，`go` `build` 现在将把匹配其包参数的 `main` 包的可执行文件写入该目录内。

<!-- CL 173438 -->
`go` `build` 的 `-tags` 标志现在接受以逗号分隔的构建标签列表，以便在 [`GOFLAGS`](/cmd/go/#hdr-Environment_variables) 中允许多个标签。以空格分隔的形式已被弃用，但仍受识别且将继续维护。

<!-- CL 175983 -->
[`go` `generate`](/cmd/go/#hdr-Generate_Go_files_by_processing_source) 现在会设置 `generate` 构建标签，以便在构建时忽略这些文件，但仍可搜索其中的指令。

<!-- CL 165746 -->
正如 Go 1.12 发布说明中[宣布](/doc/go1.12#binary-only)的那样，二进制专用包不再受支持。构建标记有 `//go:binary-only-package` 注释的二进制专用包现在会导致错误。

### 编译器工具链 {#compiler}

<!-- CL 170448 -->
编译器拥有一个新的、更精确的逃逸分析实现。对于大多数 Go 代码，这应该是一个改进（换句话说，更多的 Go 变量和表达式将分配在栈上而不是堆上）。然而，这种精度的提高也可能破坏以前碰巧能运行的无效代码（例如，违反 [`unsafe.Pointer` 安全规则](/pkg/unsafe/#Pointer) 的代码）。如果您注意到任何看似相关的性能下降，可以通过 `go` `build` `-gcflags=all=-newescape=false` 重新启用旧的逃逸分析阶段。使用旧逃逸分析的选项将在未来版本中移除。

<!-- CL 161904 -->
编译器不再将浮点数或复数常量输出到 `go_asm.h` 文件。这些常量以往总是以无法在汇编代码中用作数值常量的形式输出。

### 汇编器 {#assembler}

<!-- CL 157001 -->
汇编器现在支持 ARM v8.1 中引入的许多原子指令。

### gofmt {#gofmt}

`gofmt`（以及 `go fmt`）现在将数字字面量的前缀和指数规范为使用小写字母，但十六进制数字保持不变。这提高了使用新八进制前缀（`0O` 变为 `0o`）时的可读性，并且重写是统一应用的。`gofmt` 现在还会删除十进制整数虚数字面量中不必要的前导零。（为了向后兼容，以 `0` 开头的整数虚数字面量被视为十进制数，而不是八进制数。删除多余的前导零可以避免潜在的混淆。）例如，应用 `gofmt` 后，`0B1010`、`0XabcDEF`、`0O660`、`1.2E3` 和 `01i` 变为 `0b1010`、`0xabcDEF`、`0o660`、`1.2e3` 和 `1i`。

### `godoc` 和 `go` `doc` {#godoc}

<!-- CL 174322 -->
`godoc` Web 服务器不再包含在主要二进制发行版中。要在本地运行 `godoc` Web 服务器，请先手动安装：

	go get golang.org/x/tools/cmd/godoc
	godoc

<!-- CL 177797 -->
[`go` `doc`](/cmd/go/#hdr-Show_documentation_for_package_or_symbol) 命令现在总是包含输出中的包子句，命令除外。这取代了之前使用启发式方法的行为，该行为在某些条件下会导致包子句被省略。

## 运行时 {#runtime}

<!-- CL 161477 -->
越界恐慌消息现在包含越界的索引以及切片的长度（或容量）。例如，在长度为 1 的切片上执行 `s[3]` 将触发 "runtime error: index out of range [3] with length 1" 恐慌。

<!-- CL 171758 -->
此版本将大多数 `defer` 使用的性能提升了 30%。

<!-- CL 142960 -->
运行时现在更积极地将内存返回给操作系统，以便其可被共同租户的应用程序使用。以前，在堆大小激增后，运行时可能会保留内存长达五分钟或更久。现在，在堆缩小后，它将开始迅速返回内存。然而，在包括 Linux 在内的许多操作系统中，操作系统本身是惰性回收内存的，因此进程的 RSS 直到系统面临内存压力时才会减少。

## 标准库 {#library}

### TLS 1.3 {#tls_1_3}如 Go 1.12 所宣布，Go 1.13 默认启用了 `crypto/tls` 包对 TLS 1.3 的支持。可以通过在 `GODEBUG` 环境变量中添加 `tls13=0` 值来禁用此特性。此退出选项将在 Go 1.14 中移除。

重要的兼容性信息请参见 [Go 1.12 发布说明](/doc/go1.12#tls_1_3)。

### [crypto/ed25519](/pkg/crypto/ed25519/) {#crypto_ed25519}

<!-- CL 174945, 182698 -->
新的 [`crypto/ed25519`](/pkg/crypto/ed25519/) 包实现了 Ed25519 签名方案。此功能先前由 [`golang.org/x/crypto/ed25519`](https://godoc.org/golang.org/x/crypto/ed25519) 包提供，在与 Go 1.13+ 一起使用时，该包将成为 `crypto/ed25519` 的包装器。

### 错误包装 {#error_wrapping}

<!-- CL 163558, 176998 -->
Go 1.13 包含了对错误包装的支持，这最早在[错误值提案](https://go.googlesource.com/proposal/+/master/design/29934-error-values.md)中提出，并在[相关议题](/issue/29934)中进行了讨论。

一个错误 `e` 可以通过提供一个返回 `w` 的 `Unwrap` 方法来 _包装_ 另一个错误 `w`。`e` 和 `w` 都可供程序使用，这使得 `e` 能够为 `w` 提供额外上下文，或者在重新解释它的同时，仍然允许程序基于 `w` 做出决策。

为了支持包装，[`fmt.Errorf`](#fmt) 现在拥有一个用于创建包装错误的 `%w` 动词，并且 [`errors`](#errors) 包中的三个新函数（[`errors.Unwrap`](/pkg/errors/#Unwrap)、[`errors.Is`](/pkg/errors/#Is) 和 [`errors.As`](/pkg/errors/#As)）简化了包装错误的解包和检查操作。

更多信息，请阅读 [`errors` 包文档](/pkg/errors/)，或查看[错误值常见问题解答](/wiki/ErrorValueFAQ)。不久后还将发布一篇相关博客文章。

### 标准库的次要更改 {#minor_library_changes}

一如既往，标准库进行了各种次要更改和更新，这些更改遵循了 Go 1 的[兼容性承诺](/doc/go1compat)。

#### [bytes](/pkg/bytes/)

新的 [`ToValidUTF8`](/pkg/bytes/#ToValidUTF8) 函数返回一个给定字节切片的副本，其中每个无效的 UTF-8 字节序列都被替换为给定的切片。

<!-- bytes -->

#### [context](/pkg/context/)

<!-- CL 169080 -->
由 [`WithValue`](/pkg/context/#WithValue) 返回的上下文的格式化方式不再依赖于 `fmt`，并且其字符串化方式将有所不同。依赖于先前精确字符串化形式的代码可能会受到影响。

<!-- context -->

#### [crypto/tls](/pkg/crypto/tls/)

对 SSL 版本 3.0 (SSLv3) 的支持[现已弃用，将在 Go 1.14 中移除](/issue/32716)。请注意，SSLv3 是早于 TLS 的[加密已破损的](https://tools.ietf.org/html/rfc7568)协议。

SSLv3 始终默认禁用，除了在 Go 1.12 中，它在服务器端被错误地默认启用。现在它再次被默认禁用。（SSLv3 从未在客户端受支持。）

<!-- CL 177698 -->
Ed25519 证书现在在 TLS 版本 1.2 和 1.3 中受支持。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 175478 -->
根据 [RFC 8410](https://www.rfc-editor.org/info/rfc8410)，Ed25519 密钥现在在证书和证书请求中受支持，同时也被 [`ParsePKCS8PrivateKey`](/pkg/crypto/x509/#ParsePKCS8PrivateKey)、[`MarshalPKCS8PrivateKey`](/pkg/crypto/x509/#MarshalPKCS8PrivateKey) 和 [`ParsePKIXPublicKey`](/pkg/crypto/x509/#ParsePKIXPublicKey) 函数支持。

<!-- CL 169238 -->
为支持 Alpine Linux 3.7+ 中的默认位置，搜索系统根证书的路径现在包括 `/etc/ssl/cert.pem`。

<!-- crypto/x509 -->

#### [database/sql](/pkg/database/sql/)

<!-- CL 170699 -->
新的 [`NullTime`](/pkg/database/sql/#NullTime) 类型表示一个可能为空的 `time.Time`。

<!-- CL 174178 -->
新的 [`NullInt32`](/pkg/database/sql/#NullInt32) 类型表示一个可能为空的 `int32`。

<!-- database/sql -->

#### [debug/dwarf](/pkg/debug/dwarf/)

<!-- CL 158797 -->
[`Data.Type`](/pkg/debug/dwarf/#Data.Type) 方法在类型图中遇到未知的 DWARF 标记时不再引发 panic（恐慌）。相反，它会使用一个 [`UnsupportedType`](/pkg/debug/dwarf/#UnsupportedType) 对象来表示该类型的该组成部分。

<!-- debug/dwarf -->

#### [errors](/pkg/errors/)

<!-- CL 163558 -->

新函数 [`As`](/pkg/errors/#As) 在给定错误的链（包装错误的序列）中查找第一个与给定目标类型匹配的错误，如果找到，则将目标设置为该错误值。

新函数 [`Is`](/pkg/errors/#Is) 报告给定的错误值是否与另一个错误链中的某个错误匹配。

新函数 [`Unwrap`](/pkg/errors/#Unwrap) 返回在给定错误上调用 `Unwrap` 的结果（如果存在）。

<!-- errors -->

#### [fmt](/pkg/fmt/)

<!-- CL 160245 -->

打印动词 `%x` 和 `%X` 现在分别以小写和大写十六进制表示法格式化浮点数和复数。

<!-- CL 160246 -->

新的打印动词 `%O` 以八进制格式化整数，并输出 `0o` 前缀。

<!-- CL 160247 -->

扫描器现在接受十六进制浮点值、数字分隔下划线以及前导的 `0b` 和 `0o` 前缀。详见[语言变更](#language)。

<!-- CL 176998 -->

[`Errorf`](/pkg/fmt/#Errorf) 函数有一个新的动词 `%w`，其操作数必须是一个错误。`Errorf` 返回的错误将具有一个 `Unwrap` 方法，该方法返回 `%w` 的操作数。

<!-- fmt -->

#### [go/scanner](/pkg/go/scanner/)

<!-- CL 175218 -->
扫描器已更新以识别新的 Go 数字字面量，特别是带有 `0b`/`0B` 前缀的二进制字面量、带有 `0o`/`0O` 前缀的八进制字面量，以及具有十六进制尾数的浮点数。虚数后缀 `i` 现在可以与任何数字字面量一起使用，并且可以使用下划线作为数字分隔符进行分组。详见[语言变更](#language)。

<!-- go/scanner -->

#### [go/types](/pkg/go/types/)类型检查器已更新，以遵循整数移位的新规则。详见[语言变更](#language)。

<!-- go/types -->

#### [html/template](/pkg/html/template/)

<!-- CL 175218 -->
当使用 `<script>` 标签且 type 属性设置为 "module" 时，其代码现在将被解释为 [JavaScript 模块脚本](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element:module-script-2)。

<!-- html/template -->

#### [log](/pkg/log/)

<!-- CL 168920 -->
新增的 [`Writer`](/pkg/log/#Writer) 函数返回标准日志记录器的输出目标。

<!-- log -->

#### [math/big](/pkg/math/big/)

<!-- CL 160682 -->
新增的 [`Rat.SetUint64`](/pkg/math/big/#Rat.SetUint64) 方法将 `Rat` 设置为 `uint64` 值。

<!-- CL 166157 -->
对于 [`Float.Parse`](/pkg/math/big/#Float.Parse)，如果基数为 0，为了可读性，可以在数字之间使用下划线。详见[语言变更](#language)。

<!-- CL 166157 -->
对于 [`Int.SetString`](/pkg/math/big/#Int.SetString)，如果基数为 0，为了可读性，可以在数字之间使用下划线。详见[语言变更](#language)。

<!-- CL 168237 -->
[`Rat.SetString`](/pkg/math/big/#Rat.SetString) 现在接受非十进制浮点表示法。

<!-- math/big -->

#### [math/bits](/pkg/math/bits/)

<!-- CL 178177 -->
[`Add`](/pkg/math/bits/#Add)、
[`Sub`](/pkg/math/bits/#Sub)、
[`Mul`](/pkg/math/bits/#Mul)、
[`RotateLeft`](/pkg/math/bits/#RotateLeft) 和
[`ReverseBytes`](/pkg/math/bits/#ReverseBytes) 的执行时间现在被保证与输入无关。

<!-- math/bits -->

#### [net](/pkg/net/)

<!-- CL 156366 -->
在 Unix 系统上，如果 `resolv.conf` 中设置了 `use-vc`，则 DNS 解析将使用 TCP。

<!-- CL 170678 -->
新增字段 [`ListenConfig.KeepAlive`](/pkg/net/#ListenConfig.KeepAlive) 指定了监听器接受的网络连接的保持活动周期。如果此字段为 0（默认值），将启用 TCP 保持活动。要禁用它们，请将其设置为负值。

请注意，对一个因保持活动超时而关闭的连接进行 I/O 操作时返回的错误，其 `Timeout` 方法如果被调用，会返回 `true`。这使得保持活动错误难以与因错过通过 [`SetDeadline`](/pkg/net/#Conn) 等方法设置的截止时间而返回的错误区分开来。使用截止时间并用 `Timeout` 方法或 [`os.IsTimeout`](/pkg/os/#IsTimeout) 检查它们的代码，可能需要禁用保持活动，或者使用 `errors.Is(syscall.ETIMEDOUT)`（在 Unix 系统上），该方法对保持活动超时返回 `true`，对截止时间超时返回 `false`。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 76410 -->
新增字段 [`Transport.WriteBufferSize`](/pkg/net/http/#Transport.WriteBufferSize) 和 [`Transport.ReadBufferSize`](/pkg/net/http/#Transport.ReadBufferSize) 允许为 [`Transport`](/pkg/net/http/#Transport) 指定写入和读取缓冲区的大小。如果任一字段为零，则使用 4KB 的默认大小。

<!-- CL 130256 -->
新增字段 [`Transport.ForceAttemptHTTP2`](/pkg/net/http/#Transport.ForceAttemptHTTP2) 控制当提供了非零的 `Dial`、`DialTLS` 或 `DialContext` 函数或 `TLSClientConfig` 时，是否启用 HTTP/2。

<!-- CL 140357 -->
[`Transport.MaxConnsPerHost`](/pkg/net/http/#Transport.MaxConnsPerHost) 现在与 HTTP/2 正常工作。

<!-- CL 154383 -->
[`TimeoutHandler`](/pkg/net/http/#TimeoutHandler) 的 [`ResponseWriter`](/pkg/net/http/#ResponseWriter) 现在实现了 [`Pusher`](/pkg/net/http/#Pusher) 接口。

<!-- CL 157339 -->
新增了状态码 `103` `"Early Hints"`。

<!-- CL 163599 -->
[`Transport`](/pkg/net/http/#Transport) 现在在可用时使用 [`Request.Body`](/pkg/net/http/#Request.Body) 的 [`io.ReaderFrom`](/pkg/io/#ReaderFrom) 实现，以优化请求体的写入。

<!-- CL 167017 -->
遇到不支持的传输编码时，[`http.Server`](/pkg/net/http/#Server) 现在会返回 HTTP 规范 [RFC 7230 第 3.3.1 节](https://tools.ietf.org/html/rfc7230#section-3.3.1) 规定的 "501 未实现" 状态。

<!-- CL 167681 -->
新增的 [`Server`](/pkg/net/http/#Server) 字段 [`BaseContext`](/pkg/net/http/#Server.BaseContext) 和 [`ConnContext`](/pkg/net/http/#Server.ConnContext) 允许对提供给请求和连接的 [`Context`](/pkg/context/#Context) 值进行更精细的控制。

<!-- CL 167781 -->
[`http.DetectContentType`](/pkg/net/http/#DetectContentType) 现在能正确检测 RAR 签名，并且还能检测 RAR v5 签名。

<!-- CL 173658 -->
新增的 [`Header`](/pkg/net/http/#Header) 方法 [`Clone`](/pkg/net/http/#Header.Clone) 返回接收者的副本。

<!-- CL 174324 -->
新增函数 [`NewRequestWithContext`](/pkg/net/http/#NewRequestWithContext)，它接受一个 [`Context`](/pkg/context/#Context) 来控制所创建的外出 [`Request`](/pkg/net/http/#Request) 的整个生命周期，适用于与 [`Client.Do`](/pkg/net/http/#Client.Do) 和 [`Transport.RoundTrip`](/pkg/net/http/#Transport.RoundTrip) 一起使用。

<!-- CL 179457 -->
当服务器使用 `"408 请求超时"` 响应正常关闭空闲连接时，[`Transport`](/pkg/net/http/#Transport) 不再记录错误。

<!-- net/http -->

#### [os](/pkg/os/)

<!-- CL 160877 -->
新增的 [`UserConfigDir`](/pkg/os/#UserConfigDir) 函数返回用于用户特定配置数据的默认目录。

<!-- CL 166578 -->
如果 [`File`](/pkg/os/#File) 使用 O\_APPEND 标志打开，其 [`WriteAt`](/pkg/os/#File.WriteAt) 方法将始终返回错误。

<!-- os -->

#### [os/exec](/pkg/os/exec/)

<!-- CL 174318 -->
在 Windows 上，[`Cmd`](/pkg/os/exec/#Cmd) 的环境变量总是继承父进程的 `%SYSTEMROOT%` 值，除非 [`Cmd.Env`](/pkg/os/exec/#Cmd.Env) 字段包含了该值的显式设置。

<!-- os/exec -->#### [reflect](/pkg/reflect/)

<!-- CL 171337 -->
新增的 [`Value.IsZero`](/pkg/reflect/#Value.IsZero) 方法用于报告一个 `Value` 是否为其类型的零值。

<!-- CL 174531 -->
[`MakeFunc`](/pkg/reflect/#MakeFunc) 函数现在允许对返回值进行赋值转换，而不是要求精确的类型匹配。这在返回类型为接口类型，但实际返回的值是实现该接口的具体类型时特别有用。

<!-- reflect -->

#### [runtime](/pkg/runtime/)

<!-- CL 167780 -->
回溯信息、[`runtime.Caller`](/pkg/runtime/#Caller) 和 [`runtime.Callers`](/pkg/runtime/#Caller) 现在将初始化 `PKG` 包全局变量的函数称为 `PKG.init`，而不是 `PKG.init.ializers`。

<!-- runtime -->

#### [strconv](/pkg/strconv/)

<!-- CL 160243 -->
对于 [`strconv.ParseFloat`](/pkg/strconv/#ParseFloat)、[`strconv.ParseInt`](/pkg/strconv/#ParseInt) 和 [`strconv.ParseUint`](/pkg/strconv/#ParseUint)，如果基数为 0，则数字之间可以使用下划线以提高可读性。详见[语言变更](#language)部分。

<!-- strconv -->

#### [strings](/pkg/strings/)

<!-- CL 142003 -->
新增的 [`ToValidUTF8`](/pkg/strings/#ToValidUTF8) 函数返回一个给定字符串的副本，其中每个无效的 UTF-8 字节序列都被替换为一个给定的字符串。

<!-- strings -->

#### [sync](/pkg/sync/)

<!-- CL 148958, CL 148959, CL 152697, CL 152698 -->
[`Mutex.Lock`](/pkg/sync/#Mutex.Lock)、[`Mutex.Unlock`](/pkg/sync/#Mutex.Unlock)、[`RWMutex.Lock`](/pkg/sync/#RWMutex.Lock)、[`RWMutex.RUnlock`](/pkg/sync/#Mutex.RUnlock) 和 [`Once.Do`](/pkg/sync/#Once.Do) 的快速路径现在会在其调用者处内联。在 amd64 架构上无竞争的情况下，这些变更使 [`Once.Do`](/pkg/sync/#Once.Do) 的速度提升了一倍，[`Mutex`](/pkg/sync/#Mutex)/[`RWMutex`](/pkg/sync/#RWMutex) 方法的速度提升了高达 10%。

<!-- CL 166960 -->
大型 [`Pool`](/pkg/sync/#Pool) 不再增加停止世界（stop-the-world）的暂停时间。

<!-- CL 166961 -->
`Pool` 不再需要在每次垃圾回收后完全重新填充。它现在会在多次垃圾回收之间保留一些对象，而不是释放所有对象，从而减轻了 `Pool` 重度用户的负载峰值。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 168479 -->
Darwin 构建版本已移除对 `_getdirentries64` 的使用，以便允许将 Go 二进制文件上传到 macOS App Store。

<!-- CL 174197 -->
为 Windows 引入了 [`SysProcAttr`](/pkg/syscall/?GOOS=windows#SysProcAttr) 中新增的 `ProcessAttributes` 和 `ThreadAttributes` 字段，用于在创建新进程时暴露安全设置。

<!-- CL 174320 -->
在 Windows 上，当 [`Chmod`](/pkg/syscall/?GOOS=windows#Chmod) 模式为零时，不再返回 `EINVAL`。

<!-- CL 191337 -->
`Errno` 类型的值现在可以使用 [`errors.Is`](/pkg/errors/#Is) 与 `os` 包中的错误值（如 [`ErrExist`](/pkg/os/#ErrExist)）进行比较。

<!-- syscall -->

#### [syscall/js](/pkg/syscall/js/)

<!-- CL 177537 -->
`TypedArrayOf` 已被 [`CopyBytesToGo`](/pkg/syscall/js/#CopyBytesToGo) 和 [`CopyBytesToJS`](/pkg/syscall/js/#CopyBytesToJS) 替代，用于在字节切片和 `Uint8Array` 之间复制字节。

<!-- syscall/js -->

#### [testing](/pkg/testing/)

<!-- CL 112155 -->
运行基准测试时，[`B.N`](/pkg/testing/#B.N) 不再进行取整。

<!-- CL 166717 -->
新增方法 [`B.ReportMetric`](/pkg/testing/#B.ReportMetric) 允许用户报告自定义基准测试指标并覆盖内置指标。

<!-- CL 173722 -->
测试标志现在注册在新增的 [`Init`](/pkg/testing/#Init) 函数中，该函数由生成的测试 `main` 函数调用。因此，测试标志现在仅在运行测试二进制文件时注册，在包初始化期间调用 `flag.Parse` 的包可能会导致测试失败。

<!-- testing -->

#### [text/scanner](/pkg/text/scanner/)

<!-- CL 183077 -->
扫描器已更新，以识别新的 Go 数字字面量，具体包括带有 `0b`/`0B` 前缀的二进制字面量、带有 `0o`/`0O` 前缀的八进制字面量，以及带有十六进制尾数的浮点数。此外，新增的 [`AllowDigitSeparators`](/pkg/text/scanner/#AllowDigitSeparators) 模式允许数字字面量包含下划线作为数字分隔符（默认关闭以保持向后兼容）。详见[语言变更](#language)部分。

<!-- text/scanner -->

#### [text/template](/pkg/text/template/)

<!-- CL 161762 -->
新增的 [slice 函数](/pkg/text/template/#hdr-Functions) 返回通过后续参数对其第一个参数进行切片的结果。

<!-- text/template -->

#### [time](/pkg/time/)

<!-- CL 122876 -->
[`Format`](/pkg/time/#Time.Format) 和 [`Parse`](/pkg/time/#Parse) 现在支持年中的日序数。

<!-- CL 167387 -->
新增的 [`Duration`](/pkg/time/#Duration) 方法 [`Microseconds`](/pkg/time/#Duration.Microseconds) 和 [`Milliseconds`](/pkg/time/#Duration.Milliseconds) 返回以其各自命名单位表示的整数持续时间值。

<!-- time -->

#### [unicode](/pkg/unicode/)

[`unicode`](/pkg/unicode/) 包及系统中的相关支持已从 Unicode 10.0 升级到 [Unicode 11.0](https://www.unicode.org/versions/Unicode11.0.0/)，新增了 684 个字符，包括七种新文字和 66 个新表情符号。

<!-- unicode -->