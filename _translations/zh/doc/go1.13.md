---
title: Go 1.13 发布说明
---

<!--
注：在本文档及本目录的其他文档中，惯例是为固定宽度短语设置非固定宽度的空格，如
`hello` `world`。
请勿提交移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.13 简介 {#introduction}

Go 最新版本 1.13 在 [Go 1.12](go1.12) 发布六个月后到来。此版本的大部分变更集中在工具链、运行时和库的实现层面。一如既往，此版本维护了 Go 1 的[兼容性承诺](/doc/go1compat.html)。我们预计几乎所有 Go 程序都将继续像以前一样编译和运行。

从 Go 1.13 开始，go 命令默认使用 Google 运行的 Go 模块镜像和 Go 校验数据库来下载和验证模块。有关这些服务的隐私信息，请参见 <https://proxy.golang.org/privacy>；有关配置详情（包括如何禁用这些服务器或使用不同的服务器），请参阅 [go 命令文档](/cmd/go/#hdr-Module_downloading_and_verification)。如果您依赖非公开模块，请参阅[配置环境文档](/cmd/go/#hdr-Module_configuration_for_non_public_modules)。

## 语言变更 {#language}

根据[数字字面量提案](https://github.com/golang/proposal/blob/master/design/19308-number-literals.md)，Go 1.13 支持一套更统一、更现代化的数字字面量前缀。

  - [二进制整数字面量](/ref/spec#Integer_literals)：
    前缀 `0b` 或 `0B` 表示一个二进制整数字面量，例如 `0b1011`。
  - [八进制整数字面量](/ref/spec#Integer_literals)：
    前缀 `0o` 或 `0O` 表示一个八进制整数字面量，例如 `0o660`。
    以前用前导 `0` 后跟八进制数字表示的八进制记法仍然有效。
  - [十六进制浮点数字面量](/ref/spec#Floating-point_literals)：
    前缀 `0x` 或 `0X` 现在可以用来表示浮点数的尾数部分，采用十六进制格式，例如 `0x1.0p-1021`。
    十六进制浮点数必须始终有一个指数，写为字母 `p` 或 `P` 后跟一个十进制指数。指数将尾数缩放 2 的指数次方。
  - [虚数字面量](/ref/spec#Imaginary_literals)：
    虚数后缀 `i` 现在可以与任何（二进制、十进制、十六进制）整数或浮点字面量一起使用。
  - 数字分隔符：
    任何数字字面量的数字现在都可以使用下划线进行分隔（分组），例如 `1_000_000`、`0b_1010_0110` 或 `3.1415_9265`。
    下划线可以出现在任意两个数字之间，或者字面量前缀和第一个数字之间。

根据[有符号移位计数提案](https://github.com/golang/proposal/blob/master/design/19113-signed-shift-counts.md)，Go 1.13 移除了[移位计数](/ref/spec#Operators)必须是无符号数的限制。此变更消除了许多人为引入的 `uint` 转换的必要性，这些转换仅仅是为了满足 `<<` 和 `>>` 运算符的（现已移除的）限制。

这些语言变更是通过编译器变更以及对库包 [`go/scanner`](#go/scanner) 和 [`text/scanner`](#text/scanner)（数字字面量）、以及 [`go/types`](#go/types)（有符号移位计数）的相应内部更改实现的。

如果您的代码使用了模块，并且您的 `go.mod` 文件指定了语言版本，请确保其设置为至少 `1.13` 以使用这些语言变更。您可以通过直接编辑 `go.mod` 文件来完成，或者运行 `go mod edit -go=1.13`。

## 移植平台 {#ports}

Go 1.13 是最后一个可以在原生客户端 (NaCl) 上运行的版本。

<!-- CL 170119, CL 168882 -->
对于 `GOARCH=wasm`，新的环境变量 `GOWASM` 接受一个逗号分隔的实验性功能列表，二进制文件将使用这些功能进行编译。有效值记录在[此处](/cmd/go/#hdr-Environment_variables)。

### AIX {#aix}

<!-- CL 164003, CL 169120 -->
PPC64 架构上的 AIX (`aix/ppc64`) 现在支持 cgo、外部链接以及 `c-archive` 和 `pie` 构建模式。

### Android {#android}

<!-- CL 170127 -->
Go 程序现在与 Android 10 兼容。

### Darwin {#darwin}

如 Go 1.12 发布说明中[所述](go1.12#darwin)，Go 1.13 现在要求 macOS 10.11 El Capitan 或更高版本；对之前版本的支持已停止。

### FreeBSD {#freebsd}

如 Go 1.12 发布说明中[所述](go1.12#freebsd)，Go 1.13 现在要求 FreeBSD 11.2 或更高版本；对之前版本的支持已停止。FreeBSD 12.0 或更高版本需要一个设置了 `COMPAT_FREEBSD11` 选项的内核（这是默认值）。

### Illumos {#illumos}

<!-- CL 174457 -->
Go 现在通过 `GOOS=illumos` 支持 Illumos。`illumos` 构建标签隐含了 `solaris` 构建标签。

### Windows {#windows}

<!-- CL 178977 -->
内部链接的 Windows 二进制文件指定的 Windows 版本现在是 Windows 7，而不是 NT 4.0。这已经是 Go 要求的最低版本，但可能影响具有向后兼容模式的系统调用的行为。这些系统调用现在将按照文档记录的方式行为。外部链接的二进制文件（任何使用 cgo 的程序）则始终指定更新的 Windows 版本。

## 工具 {#tools}

### 模块 {#modules}

#### 环境变量 {#proxy-vars}

<!-- CL 176580 -->
[`GO111MODULE`](/cmd/go/#hdr-Module_support) 环境变量继续默认设置为 `auto`，但 `auto` 设置现在会在当前工作目录包含 `go.mod` 文件（或位于包含该文件的目录之下）时激活 `go` 命令的模块感知模式——即使当前目录位于 `GOPATH/src` 内部。此变更简化了 `GOPATH/src` 内现有代码的迁移，以及模块感知包与非模块感知导入者并存时的持续维护。<!-- CL 181719 -->
新的
[`GOPRIVATE`](/cmd/go/#hdr-Module_configuration_for_non_public_modules)
环境变量用于指示那些不公开可用的模块路径。它作为底层变量 `GONOPROXY` 和 `GONOSUMDB` 的默认值，后者提供了更精细的控制，用于确定哪些模块通过代理获取以及哪些模块使用校验和数据库进行验证。

<!-- CL 173441, CL 177958 -->
[`GOPROXY`
环境变量](/cmd/go/#hdr-Module_downloading_and_verification)现在可以设置为逗号分隔的代理 URL 列表或特殊标记 `direct`，并且其[默认值](#introduction)现在是 `https://proxy.golang.org,direct`。当将包路径解析为其所属模块时，`go` 命令会依次尝试列表中每个代理上的所有候选模块路径。如果代理不可达，或者返回的 HTTP 状态码不是 404 或 410，则搜索将终止，而不会继续查询剩余的代理。

新的
[`GOSUMDB`](/cmd/go/#hdr-Module_authentication_failures)
环境变量用于指定要查询的数据库名称，以及可选的公钥和服务器 URL，该数据库用于查询主模块 `go.sum` 文件中尚未列出的模块的校验和。如果 `GOSUMDB` 不包含显式的 URL，则该 URL 将通过探测 `GOPROXY` URL 来查找支持校验和数据库的端点来确定；如果所有代理都不支持，则回退到直接连接到指定的数据库。如果将 `GOSUMDB` 设置为 `off`，则不会查询校验和数据库，只验证 `go.sum` 文件中已有的校验和。

无法访问默认代理和校验和数据库的用户（例如，由于防火墙或沙箱配置）可以通过将 `GOPROXY` 设置为 `direct`，和/或将 `GOSUMDB` 设置为 `off` 来禁用它们。
[`go` `env` `-w`](#go-env-w)
可用于独立于平台设置这些变量的默认值：

	go env -w GOPROXY=direct
	go env -w GOSUMDB=off

#### `go` `get` {#go-get}

<!-- CL 174099 -->
在模块感知模式下，
[`go` `get`](/cmd/go/#hdr-Add_dependencies_to_current_module_and_install_them)
带 `-u` 标志现在会更新一个更小的模块集合，这与 GOPATH 模式下 `go` `get` `-u` 更新的包集合更加一致。
`go` `get` `-u` 继续更新命令行上指定的模块和包，但额外只更新那些包含被指定包*导入*的包的模块，而不是包含指定包的模块的传递性模块需求。

特别注意，`go` `get` `-u`
（不带额外参数）现在只更新当前目录中包的传递导入。要改为更新主模块传递导入的所有包（包括测试依赖项），请使用
`go` `get` `-u` `all`。

<!-- CL 177879 -->
由于上述对
`go` `get` `-u` 的更改，
`go` `get` 子命令不再支持 `-m` 标志，该标志曾导致 `go` `get` 在加载包之前停止。`-d` 标志仍然受支持，并继续使 `go` `get` 在下载构建指定包依赖项所需的源代码后停止。

<!-- CL 177677 -->
默认情况下，模块模式下的 `go` `get` `-u`
只升级非测试依赖项，与 GOPATH 模式一样。它现在也接受 `-t` 标志，该标志（与 GOPATH 模式一样）使 `go` `get` 包括命令行上指定的包的*测试*所导入的包。

<!-- CL 167747 -->
在模块感知模式下，`go` `get` 子命令现在支持版本后缀 `@patch`。`@patch` 后缀表示应将指定的模块或包含指定包的模块更新到与构建列表中找到的版本具有相同主版本和次版本的最高补丁版本。

<!-- CL 184440 -->
如果作为参数传递给 `go` `get` 且不带版本后缀的模块已经被要求使用比最新发布版本更新的版本，它将保持在该较新版本上。这与模块依赖项的 `-u` 标志行为一致。这可以防止从预发布版本意外降级。
新的版本后缀 `@upgrade` 显式请求此行为。`@latest` 则显式请求最新版本，无论当前版本如何。

#### 版本验证 {#version-validation}

<!-- CL 181881 -->

当从版本控制系统提取模块时，`go`
命令现在会对请求的版本字符串执行额外的验证。

`+incompatible` 版本注解绕过了对于在引入模块之前存在的仓库的[语义导入版本控制](/cmd/go/#hdr-Module_compatibility_and_semantic_versioning)要求。`go` 命令现在会验证此类版本不包含显式的 `go.mod` 文件。

`go` 命令现在会验证[伪版本](/cmd/go/#hdr-Pseudo_versions)与版本控制元数据之间的映射关系。具体而言：

  - 版本前缀必须是 `vX.0.0` 的形式，或者派生自指定修订的祖先上的标签，或者派生自该指定修订本身上包含[构建元数据](https://semver.org/#spec-item-10)的标签。
  - 日期字符串必须与修订的 UTC 时间戳匹配。
  - 修订的短名称必须使用与 `go` 命令将生成的相同数量的字符。（对于 `git` 使用的 SHA-1 哈希值，为 12 位前缀。）

如果[主模块](/cmd/go/#hdr-The_main_module_and_the_build_list)中的
`require` 指令使用了无效的伪版本，通常可以通过将版本编辑为仅包含提交哈希值并重新运行 `go` 命令来纠正，例如
`go` `list` `-m` `all`
或 `go` `mod` `tidy`。例如，

	require github.com/docker/docker v1.14.0-0.20190319215453-e7b5f7dbe98c

可以编辑为

	require github.com/docker/docker e7b5f7dbe98c

目前它解析为

	require github.com/docker/docker v0.7.3-0.20190319215453-e7b5f7dbe98c如果主模块的某个传递依赖需要无效版本或伪版本，可以在主模块的 `go.mod` 文件中使用 [`replace` 指令](/cmd/go/#hdr-The_go_mod_file) 将其替换为有效版本。若替换内容为提交哈希值，系统将按照前述规则自动解析为对应的伪版本。例如：

	replace github.com/docker/docker v1.14.0-0.20190319215453-e7b5f7dbe98c => github.com/docker/docker e7b5f7dbe98c

当前解析结果为：

	replace github.com/docker/docker v1.14.0-0.20190319215453-e7b5f7dbe98c => github.com/docker/docker v0.7.3-0.20190319215453-e7b5f7dbe98c

### Go 命令 {#go-command}

<!-- CL 171137 -->
[`go` `env`](/cmd/go/#hdr-Environment_variables) 命令现支持 `-w` 参数，用于设置 `go` 命令识别的用户级环境变量默认值，同时提供对应的 `-u` 参数可取消已设置的默认值。通过 `go` `env` `-w` 设置的默认值将存储在 [`os.UserConfigDir()`](/pkg/os/#UserConfigDir) 路径下的 `go/env` 文件中。

<!-- CL 173343 -->
[`go` `version`](/cmd/go/#hdr-Print_Go_version) 命令现可接受可执行文件或目录作为参数。对可执行文件执行时，`go` `version` 将输出构建该文件所用的 Go 版本。若使用 `-m` 参数，将显示可执行文件内嵌的模块版本信息（如存在）。对目录执行时，该命令将展示目录及其子目录中所有可执行文件的信息。

<!-- CL 173345 -->
新增 [`go` `build` 标志](/cmd/go/#hdr-Compile_packages_and_dependencies) `-trimpath`，用于移除编译后可执行文件中的所有文件系统路径，以提高构建可复现性。

<!-- CL 167679 -->
当传递给 `go` `build` 的 `-o` 参数指向现有目录时，该命令现会为匹配包参数的 `main` 包在目录内生成可执行文件。

<!-- CL 173438 -->
`go` `build` 标志 `-tags` 现支持逗号分隔的构建标签列表，允许在 [`GOFLAGS`](/cmd/go/#hdr-Environment_variables) 中设置多个标签。原有空格分隔形式虽已弃用但仍兼容，后续版本将继续支持。

<!-- CL 175983 -->
[`go` `generate`](/cmd/go/#hdr-Generate_Go_files_by_processing_source) 现会设置 `generate` 构建标签，使源文件可在生成阶段被扫描指令却在编译时被忽略。

<!-- CL 165746 -->
如 Go 1.12 发布说明[所述](/doc/go1.12#binary-only)，二进制专用包已不再支持。构建带有 `//go:binary-only-package` 注释的二进制专用包将直接报错。

### 编译器工具链 {#compiler}

<!-- CL 170448 -->
编译器采用精度更高的逃逸分析新实现。对多数 Go 代码应能优化内存分配（即将更多变量和表达式分配至栈而非堆）。但此精度提升可能破坏此前侥幸通过的无效代码（例如违反 [`unsafe.Pointer` 安全规则](/pkg/unsafe/#Pointer) 的代码）。若观察到相关性能退化，可通过 `go` `build` `-gcflags=all=-newescape=false` 重新启用旧版逃逸分析。该兼容选项将在未来版本移除。

<!-- CL 161904 -->
编译器不再向 `go_asm.h` 文件输出浮点数或复数常量。此前这些常量始终以无法在汇编代码中作为数值常量使用的格式生成。

### 汇编器 {#assembler}

<!-- CL 157001 -->
汇编器现支持 ARM v8.1 引入的多数原子操作指令。

### gofmt {#gofmt}

`gofmt`（及 `go fmt`）现将数字字面量前缀和指数规范化为小写字母，但十六进制数字保持原样。这提升了新八进制前缀（`0O` 变为 `0o`）的可读性，并保证重写规则一致性。`gofmt` 现还会移除十进制整数虚数字面量中多余的前导零。（为保持向后兼容，以 `0` 开头的整数虚数字面量仍视为十进制数而非八进制数。移除多余前导零可避免潜在混淆。）例如，`0B1010`、`0XabcDEF`、`0O660`、`1.2E3` 和 `01i` 经 `gofmt` 处理后将变为 `0b1010`、`0xabcDEF`、`0o660`、`1.2e3` 和 `1i`。

### `godoc` 与 `go` `doc` {#godoc}

<!-- CL 174322 -->
`godoc` 网页服务器不再包含于主二进制分发包中。如需本地运行，请先手动安装：

	go get golang.org/x/tools/cmd/godoc
	godoc

<!-- CL 177797 -->
[`go` `doc`](/cmd/go/#hdr-Show_documentation_for_package_or_symbol) 命令现始终在输出中包含包声明语句（命令包除外）。此举取代了原先基于启发式规则在特定条件下省略包声明的行为。

## 运行时 {#runtime}

<!-- CL 161477 -->
越界恐慌信息现包含越界索引值和切片长度（或容量）。例如，对长度为 1 的切片执行 `s[3]` 将触发 "runtime error: index out of range [3] with length 1" 恐慌。

<!-- CL 171758 -->
本版本将多数 `defer` 调用的性能提升约 30%。

<!-- CL 142960 -->
运行时现更积极地将内存归还操作系统，以便相邻应用程序可用。此前运行时可能在堆大小峰值后保留内存长达五分钟。如今堆收缩后将立即开始归还内存。但在包括 Linux 在内的多数操作系统中，系统自身会惰性回收内存，因此进程 RSS 仅在系统内存紧张时才会减少。

## 标准库 {#library}

### TLS 1.3 {#tls_1_3}正如 Go 1.12 中所宣布，Go 1.13 默认启用 `crypto/tls` 包对 TLS 1.3 的支持。可通过向 `GODEBUG` 环境变量添加值 `tls13=0` 来禁用此功能。此退出机制将在 Go 1.14 中移除。

有关重要的兼容性信息，请参阅 [Go 1.12 版本说明](/doc/go1.12#tls_1_3)。

### [crypto/ed25519](/pkg/crypto/ed25519/) {#crypto_ed25519}

<!-- CL 174945, 182698 -->
新的 [`crypto/ed25519`](/pkg/crypto/ed25519/) 包实现了 Ed25519 签名方案。该功能此前由 [`golang.org/x/crypto/ed25519`](https://godoc.org/golang.org/x/crypto/ed25519) 包提供，在 Go 1.13+ 中使用时，后者将成为 `crypto/ed25519` 的封装器。

### 错误包装 {#error_wrapping}

<!-- CL 163558, 176998 -->
Go 1.13 包含对错误包装的支持，该特性最初在 [错误值提案](https://go.googlesource.com/proposal/+/master/design/29934-error-values.md) 中提出，并在 [相关 issue](/issue/29934) 中讨论过。

错误 `e` 可以通过提供一个返回 `w` 的 `Unwrap` 方法来_包装_另一个错误 `w`。`e` 和 `w` 都可被程序访问，允许 `e` 为 `w` 提供额外上下文或重新解释它，同时仍允许程序基于 `w` 做出决策。

为支持包装，[`fmt.Errorf`](#fmt) 现在提供了一个用于创建包装错误的 `%w` 动词，并且 [`errors`](#errors) 包中新增的三个函数（[`errors.Unwrap`](/pkg/errors/#Unwrap)、[`errors.Is`](/pkg/errors/#Is) 和 [`errors.As`](/pkg/errors/#As)）简化了包装错误的拆解和检查。

欲了解更多信息，请阅读 [`errors` 包文档](/pkg/errors/)，或查看 [错误值常见问题解答](/wiki/ErrorValueFAQ)。不久后还会有一篇相关博文。

### 标准库的次要变更 {#minor_library_changes}

一如既往，标准库中存在各种次要的变更和更新，这些都遵循了 Go 1 的[兼容性承诺](/doc/go1compat)。

#### [bytes](/pkg/bytes/)

新的 [`ToValidUTF8`](/pkg/bytes/#ToValidUTF8) 函数返回给定字节切片的副本，其中每段无效的 UTF-8 字节序列被替换为给定的切片。

<!-- bytes -->

#### [context](/pkg/context/)

<!-- CL 169080 -->
由 [`WithValue`](/pkg/context/#WithValue) 返回的上下文的格式化不再依赖于 `fmt`，并且将以不同的方式进行字符串化。依赖于之前精确字符串化方式的代码可能会受到影响。

<!-- context -->

#### [crypto/tls](/pkg/crypto/tls/)

对 SSL 版本 3.0 (SSLv3) 的支持[现已弃用，并将在 Go 1.14 中移除](/issue/32716)。请注意，SSLv3 是[加密协议已损坏](https://tools.ietf.org/html/rfc7568)的、早于 TLS 的协议。

SSLv3 除了在 Go 1.12 中错误地在服务端默认启用外，其他情况下默认都是禁用的。现在它已再次被默认禁用。（客户端从未支持过 SSLv3。）

<!-- CL 177698 -->
TLS 版本 1.2 和 1.3 现在支持 Ed25519 证书。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 175478 -->
根据 [RFC 8410](https://www.rfc-editor.org/info/rfc8410)，证书和证书请求现在支持 Ed25519 密钥，同时 [`ParsePKCS8PrivateKey`](/pkg/crypto/x509/#ParsePKCS8PrivateKey)、[`MarshalPKCS8PrivateKey`](/pkg/crypto/x509/#MarshalPKCS8PrivateKey) 和 [`ParsePKIXPublicKey`](/pkg/crypto/x509/#ParsePKIXPublicKey) 函数也支持 Ed25519 密钥。

<!-- CL 169238 -->
用于搜索系统根证书的路径现在包含 `/etc/ssl/cert.pem`，以支持 Alpine Linux 3.7+ 中的默认位置。

<!-- crypto/x509 -->

#### [database/sql](/pkg/database/sql/)

<!-- CL 170699 -->
新的 [`NullTime`](/pkg/database/sql/#NullTime) 类型表示一个可能为空的 `time.Time`。

<!-- CL 174178 -->
新的 [`NullInt32`](/pkg/database/sql/#NullInt32) 类型表示一个可能为空的 `int32`。

<!-- database/sql -->

#### [debug/dwarf](/pkg/debug/dwarf/)

<!-- CL 158797 -->
[`Data.Type`](/pkg/debug/dwarf/#Data.Type) 方法在类型图中遇到未知的 DWARF 标签时不再引发恐慌。相反，它用一个 [`UnsupportedType`](/pkg/debug/dwarf/#UnsupportedType) 对象来表示类型的该部分。

<!-- debug/dwarf -->

#### [errors](/pkg/errors/)

<!-- CL 163558 -->

新函数 [`As`](/pkg/errors/#As) 在给定错误的链（一系列包装错误）中查找第一个与给定目标类型匹配的错误，如果找到，则将目标设置为该错误值。

新函数 [`Is`](/pkg/errors/#Is) 报告给定错误值是否与另一个错误链中的错误匹配。

新函数 [`Unwrap`](/pkg/errors/#Unwrap) 返回在给定错误上调用 `Unwrap` 的结果（如果存在）。

<!-- errors -->

#### [fmt](/pkg/fmt/)

<!-- CL 160245 -->

打印动词 `%x` 和 `%X` 现在分别以小写和大写十六进制表示法格式化浮点数和复数。

<!-- CL 160246 -->

新的打印动词 `%O` 以八进制格式化整数，并输出 `0o` 前缀。

<!-- CL 160247 -->

扫描器现在接受十六进制浮点值、数字分隔下划线以及前导 `0b` 和 `0o` 前缀。详见[语言变更](#language)。

<!-- CL 176998 -->

[`Errorf`](/pkg/fmt/#Errorf) 函数有一个新的动词 `%w`，其操作数必须是错误。从 `Errorf` 返回的错误将具有一个 `Unwrap` 方法，该方法返回 `%w` 的操作数。

<!-- fmt -->

#### [go/scanner](/pkg/go/scanner/)

<!-- CL 175218 -->
扫描器已更新，可识别新的 Go 数字字面量，特别是带有 `0b`/`0B` 前缀的二进制字面量、带有 `0o`/`0O` 前缀的八进制字面量，以及带有十六进制尾数的浮点数。虚数后缀 `i` 现在可用于任何数字字面量，并且下划线可用作数字分隔符进行分组。详见[语言变更](#language)。

<!-- go/scanner -->

#### [go/types](/pkg/go/types/)类型检查器已更新以遵循整数移位的新规则。详情请参阅[语言变更](#language)。

<!-- go/types -->

#### [html/template](/pkg/html/template/)

<!-- CL 175218 -->
当 `<script>` 标签的 `type` 属性设置为 "module" 时，代码现在将被解释为 [JavaScript 模块脚本](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element:module-script-2)。

<!-- html/template -->

#### [log](/pkg/log/)

<!-- CL 168920 -->
新增的 [`Writer`](/pkg/log/#Writer) 函数返回标准日志记录器的输出目标。

<!-- log -->

#### [math/big](/pkg/math/big/)

<!-- CL 160682 -->
新增的 [`Rat.SetUint64`](/pkg/math/big/#Rat.SetUint64) 方法将 `Rat` 设置为 `uint64` 值。

<!-- CL 166157 -->
对于 [`Float.Parse`](/pkg/math/big/#Float.Parse)，如果基数为 0，可以使用下划线连接数字以提高可读性。详情请参阅[语言变更](#language)。

<!-- CL 166157 -->
对于 [`Int.SetString`](/pkg/math/big/#Int.SetString)，如果基数为 0，可以使用下划线连接数字以提高可读性。详情请参阅[语言变更](#language)。

<!-- CL 168237 -->
[`Rat.SetString`](/pkg/math/big/#Rat.SetString) 现在接受非十进制浮点表示法。

<!-- math/big -->

#### [math/bits](/pkg/math/bits/)

<!-- CL 178177 -->
[`Add`](/pkg/math/bits/#Add)、[`Sub`](/pkg/math/bits/#Sub)、[`Mul`](/pkg/math/bits/#Mul)、[`RotateLeft`](/pkg/math/bits/#RotateLeft) 和 [`ReverseBytes`](/pkg/math/bits/#ReverseBytes) 的执行时间现在保证与输入无关。

<!-- math/bits -->

#### [net](/pkg/net/)

<!-- CL 156366 -->
在 `resolv.conf` 中设置了 `use-vc` 的 Unix 系统上，DNS 解析使用 TCP。

<!-- CL 170678 -->
新增字段 [`ListenConfig.KeepAlive`](/pkg/net/#ListenConfig.KeepAlive) 指定监听器接受的网络连接的保活周期。如果此字段为 0（默认值），则启用 TCP 保活。要禁用它们，请将其设置为负值。

请注意，因保活超时关闭的连接上进行 I/O 操作时返回的错误，其 `Timeout` 方法调用后将返回 `true`。这可能使保活错误难以与因错过通过 [`SetDeadline`](/pkg/net/#Conn) 方法及类似方法设置的截止时间而返回的错误区分。使用截止时间并使用 `Timeout` 方法或 [`os.IsTimeout`](/pkg/os/#IsTimeout) 检查它们的代码，可能希望禁用保活，或者使用 `errors.Is(syscall.ETIMEDOUT)`（在 Unix 系统上），该方法对于保活超时返回 `true`，对于截止时间超时返回 `false`。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 76410 -->
新增字段 [`Transport.WriteBufferSize`](/pkg/net/http/#Transport.WriteBufferSize) 和 [`Transport.ReadBufferSize`](/pkg/net/http/#Transport.ReadBufferSize) 允许指定 [`Transport`](/pkg/net/http/#Transport) 的写和读缓冲区大小。如果任一字段为零，则使用默认大小 4KB。

<!-- CL 130256 -->
新增字段 [`Transport.ForceAttemptHTTP2`](/pkg/net/http/#Transport.ForceAttemptHTTP2) 控制当提供了非零的 `Dial`、`DialTLS` 或 `DialContext` 函数或 `TLSClientConfig` 时，是否启用 HTTP/2。

<!-- CL 140357 -->
[`Transport.MaxConnsPerHost`](/pkg/net/http/#Transport.MaxConnsPerHost) 现在在 HTTP/2 下正常工作。

<!-- CL 154383 -->
[`TimeoutHandler`](/pkg/net/http/#TimeoutHandler) 的 [`ResponseWriter`](/pkg/net/http/#ResponseWriter) 现在实现了 [`Pusher`](/pkg/net/http/#Pusher) 接口。

<!-- CL 157339 -->
添加了状态码 `103` `"Early Hints"`。

<!-- CL 163599 -->
[`Transport`](/pkg/net/http/#Transport) 现在如果可用，会使用 [`Request.Body`](/pkg/net/http/#Request.Body) 的 [`io.ReaderFrom`](/pkg/io/#ReaderFrom) 实现来优化请求体的写入。

<!-- CL 167017 -->
当遇到不支持的传输编码时，[`http.Server`](/pkg/net/http/#Server) 现在按照 HTTP 规范 [RFC 7230 第 3.3.1 节](https://tools.ietf.org/html/rfc7230#section-3.3.1) 的要求返回 "501 Unimplemented" 状态。

<!-- CL 167681 -->
新增的 [`Server`](/pkg/net/http/#Server) 字段 [`BaseContext`](/pkg/net/http/#Server.BaseContext) 和 [`ConnContext`](/pkg/net/http/#Server.ConnContext) 允许更精细地控制提供给请求和连接的 [`Context`](/pkg/context/#Context) 值。

<!-- CL 167781 -->
[`http.DetectContentType`](/pkg/net/http/#DetectContentType) 现在可以正确检测 RAR 签名，并且还可以检测 RAR v5 签名。

<!-- CL 173658 -->
新增的 [`Header`](/pkg/net/http/#Header) 方法 [`Clone`](/pkg/net/http/#Header.Clone) 返回接收者的副本。

<!-- CL 174324 -->
新增了一个函数 [`NewRequestWithContext`](/pkg/net/http/#NewRequestWithContext)，它接受一个 [`Context`](/pkg/context/#Context)，该上下文控制创建的外发 [`Request`](/pkg/net/http/#Request) 的整个生命周期，适用于 [`Client.Do`](/pkg/net/http/#Client.Do) 和 [`Transport.RoundTrip`](/pkg/net/http/#Transport.RoundTrip)。

<!-- CL 179457 -->
当服务器使用 `"408 Request Timeout"` 响应优雅地关闭空闲连接时，[`Transport`](/pkg/net/http/#Transport) 不再记录错误。

<!-- net/http -->

#### [os](/pkg/os/)

<!-- CL 160877 -->
新增的 [`UserConfigDir`](/pkg/os/#UserConfigDir) 函数返回用于存储用户特定配置数据的默认目录。

<!-- CL 166578 -->
如果使用 `O_APPpend` 标志打开 [`File`](/pkg/os/#File)，其 [`WriteAt`](/pkg/os/#File.WriteAt) 方法将始终返回错误。

<!-- os -->

#### [os/exec](/pkg/os/exec/)

<!-- CL 174318 -->
在 Windows 上，[`Cmd`](/pkg/os/exec/#Cmd) 的环境变量总是继承父进程的 `%SYSTEMROOT%` 值，除非 [`Cmd.Env`](/pkg/os/exec/#Cmd.Env) 字段为其包含了一个显式值。

<!-- os/exec -->#### [reflect](/pkg/reflect/)

<!-- CL 171337 -->
新增的 [`Value.IsZero`](/pkg/reflect/#Value.IsZero) 方法用于报告某个 `Value` 是否为其类型的零值。

<!-- CL 174531 -->
[`MakeFunc`](/pkg/reflect/#MakeFunc) 函数现在允许对返回值进行赋值转换，而不再要求精确的类型匹配。这在返回类型为接口类型但实际返回值是实现该接口的具体类型时特别有用。

<!-- reflect -->

#### [runtime](/pkg/runtime/)

<!-- CL 167780 -->
回溯信息、[`runtime.Caller`](/pkg/runtime/#Caller) 和 [`runtime.Callers`](/pkg/runtime/#Caller) 现在将初始化 `PKG` 全局变量的函数称为 `PKG.init`，而不是 `PKG.init.ializers`。

<!-- runtime -->

#### [strconv](/pkg/strconv/)

<!-- CL 160243 -->
对于 [`strconv.ParseFloat`](/pkg/strconv/#ParseFloat)、[`strconv.ParseInt`](/pkg/strconv/#ParseInt) 和 [`strconv.ParseUint`](/pkg/strconv/#ParseUint)，当基数为 0 时，现在允许在数字之间使用下划线以提高可读性。详情请参阅 [语言变更](#language)。

<!-- strconv -->

#### [strings](/pkg/strings/)

<!-- CL 142003 -->
新增的 [`ToValidUTF8`](/pkg/strings/#ToValidUTF8) 函数返回一个给定字符串的副本，其中每段无效的 UTF-8 字节序列都被替换为给定的字符串。

<!-- strings -->

#### [sync](/pkg/sync/)

<!-- CL 148958, CL 148959, CL 152697, CL 152698 -->
[`Mutex.Lock`](/pkg/sync/#Mutex.Lock)、[`Mutex.Unlock`](/pkg/sync/#Mutex.Unlock)、[`RWMutex.Lock`](/pkg/sync/#RWMutex.Lock)、[`RWMutex.RUnlock`](/pkg/sync/#Mutex.RUnlock) 和 [`Once.Do`](/pkg/sync/#Once.Do) 的快速路径现在会在其调用者中被内联。在 amd64 架构上无竞争的情况下，这些更改使得 [`Once.Do`](/pkg/sync/#Once.Do) 的速度提高了一倍，而 [`Mutex`](/pkg/sync/#Mutex)/[`RWMutex`](/pkg/sync/#RWMutex) 方法的速度提升了最多 10%。

<!-- CL 166960 -->
大型 [`Pool`](/pkg/sync/#Pool) 不再增加全局停止（stop-the-world）暂停时间。

<!-- CL 166961 -->
`Pool` 不再需要在每次垃圾回收（GC）后被完全重新填充。它现在会跨 GC 保留一些对象，而不是释放所有对象，从而减少了重度使用 `Pool` 时的负载峰值。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 168479 -->
Darwin 构建中已移除对 `_getdirentries64` 的使用，以允许 Go 二进制文件上传到 macOS App Store。

<!-- CL 174197 -->
在 Windows 上，[`SysProcAttr`](/pkg/syscall/?GOOS=windows#SysProcAttr) 中引入了新的 `ProcessAttributes` 和 `ThreadAttributes` 字段，用于在创建新进程时暴露安全设置。

<!-- CL 174320 -->
在 Windows 上，对零值模式的 [`Chmod`](/pkg/syscall/?GOOS=windows#Chmod) 操作不再返回 `EINVAL`。

<!-- CL 191337 -->
`Errno` 类型的值现在可以使用 [`errors.Is`](/pkg/errors/#Is) 与 `os` 包中的错误值（如 [`ErrExist`](/pkg/os/#ErrExist)）进行比较。

<!-- syscall -->

#### [syscall/js](/pkg/syscall/js/)

<!-- CL 177537 -->
`TypedArrayOf` 已被 [`CopyBytesToGo`](/pkg/syscall/js/#CopyBytesToGo) 和 [`CopyBytesToJS`](/pkg/syscall/js/#CopyBytesToJS) 取代，用于在字节切片（byte slice）和 `Uint8Array` 之间复制字节。

<!-- syscall/js -->

#### [testing](/pkg/testing/)

<!-- CL 112155 -->
运行基准测试时，[`B.N`](/pkg/testing/#B.N) 不再被取整。

<!-- CL 166717 -->
新增的 [`B.ReportMetric`](/pkg/testing/#B.ReportMetric) 方法允许用户报告自定义的基准测试指标并覆盖内置指标。

<!-- CL 173722 -->
测试标志现在注册在新的 [`Init`](/pkg/testing/#Init) 函数中，该函数由测试生成的 `main` 函数调用。因此，测试标志现在仅在运行测试二进制文件时注册，而在包初始化期间调用 `flag.Parse` 的包可能导致测试失败。

<!-- testing -->

#### [text/scanner](/pkg/text/scanner/)

<!-- CL 183077 -->
扫描器已更新，以识别新的 Go 数字字面量，具体包括带有 `0b`/`0B` 前缀的二进制字面量、带有 `0o`/`0O` 前缀的八进制字面量，以及具有十六进制尾数的浮点数。此外，新的 [`AllowDigitSeparators`](/pkg/text/scanner/#AllowDigitSeparators) 模式允许数字字面量包含下划线作为数字分隔符（为向后兼容，默认情况下关闭）。详情请参阅 [语言变更](#language)。

<!-- text/scanner -->

#### [text/template](/pkg/text/template/)

<!-- CL 161762 -->
新增的 [slice 函数](/pkg/text/template/#hdr-Functions) 返回根据后续参数对其第一个参数进行切片操作的结果。

<!-- text/template -->

#### [time](/pkg/time/)

<!-- CL 122876 -->
[`Format`](/pkg/time/#Time.Format) 和 [`Parse`](/pkg/time/#Parse) 现在支持一年中的第几天（day-of-year）。

<!-- CL 167387 -->
新增的 [`Duration`](/pkg/time/#Duration) 方法 [`Microseconds`](/pkg/time/#Duration.Microseconds) 和 [`Milliseconds`](/pkg/time/#Duration.Milliseconds) 分别返回以各自命名的单位（微秒、毫秒）表示的整数计数。

<!-- time -->

#### [unicode](/pkg/unicode/)

[`unicode`](/pkg/unicode/) 包以及整个系统中的相关支持已从 Unicode 10.0 升级到 [Unicode 11.0](https://www.unicode.org/versions/Unicode11.0.0/)，新增了 684 个字符，包括七种新文字系统和 66 个新表情符号。

<!-- unicode -->