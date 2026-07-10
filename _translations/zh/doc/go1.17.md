---
path: /doc/go1.17
title: Go 1.17 发布说明
---

<!--
注意：在本文档以及此目录中的其他文档中，惯例是使用固定宽度短语和非固定宽度空格，如
`hello` `world`。
请勿提交移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.17 简介 {#introduction}

Go 最新版本 1.17 在 [Go 1.16](/doc/go1.16) 发布六个月后到来。
其大部分更改在于工具链、运行时和库的实现。
一如既往，该版本维护了 Go 1 的[兼容性承诺](/doc/go1compat)。
我们期望几乎所有 Go 程序都能继续像以前一样编译和运行。

## 语言变更 {#language}

Go 1.17 包含三个小的语言增强。

  - <!-- CL 216424; issue 395 -->
    [从 slice 到数组指针的转换](/ref/spec#Conversions_from_slice_to_array_pointer)：现在可以将类型为 `[]T` 的表达式 `s` 转换为数组指针类型 `*[N]T`。如果 `a` 是此类转换的结果，则范围内的相应索引指向相同的底层元素：`&a[i] == &s[i]` 对于 `0 <= i < N` 成立。如果 `len(s)` 小于 `N`，转换将引发 panic。
  - <!-- CL 312212; issue 40481 -->
    [`unsafe.Add`](/pkg/unsafe#Add)：
    `unsafe.Add(ptr, len)` 将 `len` 加到 `ptr` 上并返回更新后的指针 `unsafe.Pointer(uintptr(ptr) + uintptr(len))`。
  - <!-- CL 312212; issue 19367 -->
    [`unsafe.Slice`](/pkg/unsafe#Slice)：
    对于类型为 `*T` 的表达式 `ptr`，
    `unsafe.Slice(ptr, len)` 返回一个类型为 `[]T` 的 slice，其底层起始于 `ptr`，长度和容量为 `len`。

添加 unsafe 包的增强功能是为了简化编写符合 `unsafe.Pointer`[安全规则](/pkg/unsafe/#Pointer)的代码，但规则本身并未改变。特别是，现有正确使用 `unsafe.Pointer` 的程序仍然有效，而新程序在使用 `unsafe.Add` 或 `unsafe.Slice` 时仍然必须遵循这些规则。

请注意，新的从 slice 到数组指针的转换是第一个可能在运行时引发 panic 的类型转换。假设类型转换永远不会引发 panic 的分析工具应进行更新以考虑此可能性。

## 移植 {#ports}

### Darwin {#darwin}

<!-- golang.org/issue/23011 -->
正如在 Go 1.16 发布说明中[宣布](go1.16#darwin)的那样，Go 1.17 要求 macOS 10.13 High Sierra 或更高版本；对旧版本的支持已停止。

### Windows {#windows}

<!-- golang.org/issue/36439 -->
Go 1.17 添加了对 Windows 上 64 位 ARM 架构（`windows/arm64` 移植）的支持。此移植支持 cgo。

### OpenBSD {#openbsd}

<!-- golang.org/issue 43005 -->
OpenBSD 上的 64 位 MIPS 架构（`openbsd/mips64` 移植）现在支持 cgo。

<!-- golang.org/issue 36435 -->
在 Go 1.16 中，在 OpenBSD 上的 64 位 x86 和 64 位 ARM 架构（`openbsd/amd64` 和 `openbsd/arm64` 移植）上，系统调用是通过 `libc` 进行的，而不是直接使用机器指令。在 Go 1.17 中，在 OpenBSD 上的 32 位 x86 和 32 位 ARM 架构（`openbsd/386` 和 `openbsd/arm` 移植）上也采用此方式。这确保了与 OpenBSD 6.9 及更高版本的兼容性，后者要求非静态 Go 二进制文件的系统调用通过 `libc` 进行。

### ARM64 {#arm64}

<!-- CL 288814 -->
Go 程序现在在所有操作系统上的 64 位 ARM 架构上维护栈帧指针。以前，栈帧指针仅在 Linux、macOS 和 iOS 上启用。

### loong64 GOARCH 值已保留 {#loong64}

<!-- CL 333909 -->
主要的 Go 编译器尚不支持 LoongArch 架构，但我们已保留了 `GOARCH` 值 "`loong64`"。这意味着名为 `*_loong64.go` 的 Go 文件现在将被 [Go 工具忽略](/pkg/go/build/#hdr-Build_Constraints)，除非正在使用该 GOARCH 值。

## 工具 {#tools}

### Go 命令 {#go-command}

<a id="lazy-loading"><!-- 仅为现有链接保留 -->
</a>

#### `go 1.17` 模块中的精简模块图 {#graph-pruning}

<!-- golang.org/issue/36460 -->
如果一个模块指定 `go` `1.17` 或更高版本，则模块图仅包含其他 `go` `1.17` 模块的*直接*依赖项，而不是其完整的传递依赖项。（有关更多详细信息，请参阅[模块图精简](/ref/mod#graph-pruning)。）

为了让 `go` 命令使用精简的模块图正确解析传递导入，每个模块的 `go.mod` 文件需要包含更多关于该模块相关传递依赖项的详细信息。如果一个模块在其 `go.mod` 文件中指定 `go` `1.17` 或更高版本，那么它的 `go.mod` 文件现在包含一个显式的 [`require` 指令](/ref/mod#go-mod-file-require)，用于提供传递导入包的每个模块。（在以前的版本中，`go.mod` 文件通常只包含对*直接*导入包的显式要求。）

由于为模块图精简而扩展的 `go.mod` 文件包含了加载主模块中任何包的导入所需的所有依赖项，如果主模块指定 `go` `1.17` 或更高版本，`go` 工具将不再读取（甚至下载）依赖项的 `go.mod` 文件，如果完成请求的命令不需要它们。（参见[延迟加载](/ref/mod#lazy-loading)。）

<!-- golang.org/issue 45965 -->
由于扩展的 Go 1.17 `go.mod` 文件中的显式要求数量可能大幅增加，`go` `1.17` 模块中关于*间接*依赖项的新添加的要求与包含直接依赖项的块分开维护在一个单独的 `require` 块中。<!-- golang.org/issue/45094 -->
为了方便升级到 Go 1.17 精简模块图，[`go` `mod` `tidy`](/ref/mod#go-mod-tidy) 子命令现在支持 `-go` 标志，用于设置或更改 `go.mod` 文件中的 `go` 版本。要将现有模块的 `go.mod` 文件转换为 Go 1.17，而不更改其依赖项的已选版本，请运行：

	  go mod tidy -go=1.17

<!-- golang.org/issue/46141 -->
默认情况下，`go` `mod` `tidy` 会验证与主模块相关的依赖项的已选版本，是否与之前 Go 版本（对于指定 `go` `1.17` 的模块，即 Go 1.16）将使用的版本相同，并且会保留该版本所需的 `go.sum` 条目，即使对于通常不被其他命令需要的依赖项也是如此。

`-compat` 标志允许覆盖该版本，以支持更旧（或仅更新）的版本，直至 `go.mod` 文件中 `go` 指令指定的版本。要仅针对 Go 1.17 清理 `go` `1.17` 模块，而不保存 Go 1.16 的校验和（或检查与其的一致性）：

	  go mod tidy -compat=1.17

请注意，即使主模块使用 `-compat=1.17` 清理，从 `go` `1.16` 或更早版本模块 `require` 该模块的用户仍然可以使用它，前提是这些包仅使用了兼容的语言和库特性。

<!-- golang.org/issue/46366 -->
[`go` `mod` `graph`](/ref/mod#go-mod-graph) 子命令也支持 `-go` 标志，该标志会使其报告指定 Go 版本所看到的依赖图，显示可能被精简掉的依赖项。

#### 模块弃用注释 {#module-deprecation-comments}

<!-- golang.org/issue/40357 -->
模块作者可以通过在 `go.mod` 中添加 [`// Deprecated:` 注释](/ref/mod#go-mod-file-module-deprecation) 并标记一个新版本来弃用某个模块。现在，如果构建命令行上指定包所需的模块已被弃用，`go` `get` 会打印警告。`go` `list` `-m` `-u` 会打印所有依赖项的弃用信息（使用 `-f` 或 `-json` 可显示完整消息）。`go` 命令将不同的主版本视为不同的模块，因此此机制可用于例如为用户提供迁移新主版本的说明。

#### `go` `get` {#go-get}

<!-- golang.org/issue/37519 -->
`go` `get` `-insecure` 标志已被弃用并移除。要允许在获取依赖项时使用不安全的协议，请使用 `GOINSECURE` 环境变量。`-insecure` 标志也会绕过模块校验和验证，如果需要此功能，请使用 `GOPRIVATE` 或 `GONOSUMDB`。详情请参见 `go` `help` `environment`。

<!-- golang.org/issue/43684 -->
当在主模块之外安装命令（不带 `-d` 标志）时，`go` `get` 会打印弃用警告。应改用 `go` `install` `cmd@version` 在特定版本安装命令，使用像 `@latest` 或 `@v1.2.3` 这样的后缀。在 Go 1.18 中，`-d` 标志将始终启用，`go` `get` 将仅用于更改 `go.mod` 中的依赖项。

#### 缺少 `go` 指令的 `go.mod` 文件 {#missing-go-directive}

<!-- golang.org/issue/44976 -->
如果主模块的 `go.mod` 文件不包含 [`go` 指令](/doc/modules/gomod-ref#go)，且 `go` 命令无法更新该 `go.mod` 文件，则 `go` 命令现在会假定为 `go 1.11` 而不是当前发布版本。（自 [Go 1.12](/doc/go1.12#modules) 起，`go` `mod` `init` 已自动添加 `go` 指令。）

<!-- golang.org/issue/44976 -->
如果某个模块依赖项缺少显式的 `go.mod` 文件，或其 `go.mod` 文件不包含 [`go` 指令](/doc/modules/gomod-ref#go)，`go` 命令现在会为该依赖项假定 `go 1.16`，而不是当前发布版本。（在 GOPATH 模式下开发的依赖项可能缺少 `go.mod` 文件，并且 `vendor/modules.txt` 迄今为止从未记录过依赖项 `go.mod` 文件中指示的 `go` 版本。）

#### `vendor` 目录内容 {#vendor}

<!-- golang.org/issue/36876 -->
如果主模块指定 `go` `1.17` 或更高版本，[`go` `mod` `vendor`](/ref/mod#go-mod-vendor) 现在会在 `vendor/modules.txt` 中为每个 vendor 化的模块添加注释，注明其 `go.mod` 文件中指示的 `go` 版本。当从 vendor 源代码构建模块的包时，会使用此注释的版本。

<!-- golang.org/issue/42970 -->
如果主模块指定 `go` `1.17` 或更高版本，`go` `mod` `vendor` 现在会忽略 vendor 依赖项的 `go.mod` 和 `go.sum` 文件，这些文件在其他情况下可能会干扰 `go` 命令在 `vendor` 目录树内调用时识别正确的模块根目录的能力。

#### 密码提示 {#password-prompts}

<!-- golang.org/issue/44904 -->
默认情况下，`go` 命令现在会抑制在使用 SSH 获取 Git 仓库时的 SSH 密码提示和 Git 凭据管理器提示，就像它之前对其他 Git 密码提示所做的那样。使用受密码保护的 SSH 对私有 Git 仓库进行身份验证的用户可以配置 `ssh-agent`，以使 `go` 命令能够使用受密码保护的 SSH 密钥。

#### `go` `mod` `download` {#go-mod-download}

<!-- golang.org/issue/45332 -->
当不带参数调用 `go` `mod` `download` 时，它将不再把下载的模块内容的校验和保存到 `go.sum` 中。它可能仍会更改加载构建列表所需的 `go.mod` 和 `go.sum`。这与 Go 1.15 中的行为相同。要保存所有模块的校验和，请使用 `go` `mod` `download` `all`。

#### `//go:build` 行 {#build-lines}`go` 命令现在能够识别 `//go:build` 行
并优先采用该语法而非 `// +build` 行。新语法使用布尔表达式，
与 Go 语言本身风格一致，且更不易出错。
本版本已完全支持该新语法，所有 Go 文件都应同步更新两种形式
并确保其语义一致。为便于迁移，[`gofmt`](#gofmt) 现可自动
同步两种形式。有关语法细节与迁移计划，请参阅
[https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

#### `go` `run` {#go_run}

<!-- golang.org/issue/42088 -->
`go` `run` 现支持带版本后缀的参数
（例如 `go` `run` `example.com/cmd@v1.0.0`）。此操作会
使 `go` `run` 以模块感知模式构建并运行包，同时忽略
当前目录或任何父目录中可能存在的 `go.mod` 文件。该功能
适用于在不安装可执行文件或不修改当前模块依赖的情况下运行程序。

### Gofmt {#gofmt}

`gofmt`（及 `go` `fmt`）现可自动同步
`//go:build` 行与 `// +build` 行。若文件
仅包含 `// +build` 行，工具会将其移至文件中的适当位置，
并添加对应的 `//go:build` 行。否则，现有 `//go:build` 行
将覆盖原有的 `// +build` 行。更多信息请参阅
[https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

### Vet {#vet}

#### 针对不匹配的 `//go:build` 与 `// +build` 行的新警告 {#vet-buildtags}

<!-- CL 240609 -->
`vet` 工具现会验证 `//go:build` 与
`// +build` 行是否位于文件正确位置且相互同步。若存在异常，
可使用 [`gofmt`](#gofmt) 进行修复。更多信息请参阅
[https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

#### 针对无缓冲通道调用 `signal.Notify` 的新警告 {#vet-sigchanyzer}

<!-- CL 299532 -->
vet 工具现会对以下情况发出警告：向 [signal.Notify](/pkg/os/signal/#Notify)
传递信号并将其发送至无缓冲通道。使用无缓冲通道时，
由于 `signal.Notify` 向通道发送信号时不阻塞，
可能导致信号丢失。例如：

	c := make(chan os.Signal)
	// 在通道被读取前，信号已发送至 c
	// 该信号可能丢失，因为 c 是无缓冲通道
	signal.Notify(c, os.Interrupt)

`signal.Notify` 用户应使用具有足够缓冲空间的通道，以跟上预期的信号速率。

#### 针对 Is、As 和 Unwrap 方法的新警告 {#vet-error-stdmethods}

<!-- CL 321389 -->
vet 工具现会对实现 `error` 接口的类型中命名为
`As`、`Is` 或 `Unwrap` 的方法发出警告，
若其签名与 `errors` 包预期不符。`errors.{As,Is,Unwrap}` 函数
预期这些方法分别实现 `Is(error)` `bool`、
`As(interface{})` `bool` 或 `Unwrap()` `error` 签名。
同名但签名不同的方法将被 `errors.{As,Is,Unwrap}` 函数忽略。例如：

	type MyError struct { hint string }
	func (m MyError) Error() string { ... } // MyError 实现了 error 接口
	func (MyError) Is(target interface{}) bool { ... } // target 应为 error 而非 interface{}
	func Foo() bool {
		x, y := MyError{"A"}, MyError{"B"}
		return errors.Is(x, y) // 返回 false，因为 x != y 且 MyError 未实现 `Is(error) bool` 函数
	}

### Cover {#cover}

<!-- CL 249759 -->
`cover` 工具现采用来自 `golang.org/x/tools/cover` 的优化解析器，
在解析大型覆盖率配置文件时性能将有显著提升。

## 编译器 {#compiler}

<!-- golang.org/issue/40724 -->
Go 1.17 实现了基于寄存器传递函数参数和返回值的新方式，
替代原有基于栈的传递方式。对代表性 Go 包和程序的基准测试表明，
性能提升约 5%，二进制文件体积通常减少约 2%。
当前该特性已在 64 位 x86 架构的 Linux、macOS 和 Windows 平台
（即 `linux/amd64`、`darwin/amd64` 和 `windows/amd64` 端口）上启用。

此变更不影响任何安全 Go 代码的功能，
且设计上对大多数汇编代码无影响。
但若代码在访问函数参数时违反
[`unsafe.Pointer`](/pkg/unsafe#Pointer) 规则，
或依赖于涉及函数代码指针比较的未定义行为，则可能受影响。
为保持与现有汇编函数的兼容性，编译器会生成适配函数，
用于在新的寄存器调用约定与原有栈调用约定之间转换。
这些适配器通常对用户不可见，但以下情况除外：在汇编代码中
取 Go 函数的地址，或在 Go 代码中通过
`reflect.ValueOf(fn).Pointer()` 或 `unsafe.Pointer`
获取汇编函数的地址时，现在返回的是适配器的地址。
依赖这些代码指针值的代码可能不再按预期行为运行。
在两种情况下适配器可能导致极小性能开销：从 Go 中通过
`func` 值间接调用汇编函数，以及从汇编中调用 Go 函数。

<!-- CL 304470 -->
运行时堆栈跟踪的格式已改进（当未捕获的 panic 发生
或调用 `runtime.Stack` 时输出）。此前，
函数参数按内存布局以十六进制字显示。现在源代码中的每个
参数单独显示并以逗号分隔。聚合类型（结构体、数组、字符串、
切片、接口和复数）参数以花括号界定。需注意的是，
仅存在于寄存器中且未存储到内存的参数值可能不准确。
函数返回值（通常不准确）不再显示。<!-- CL 283112, golang.org/issue/28727 -->
包含闭包的函数现在可以被内联了。
此项变更的一个影响是，带有闭包的函数可能会在每次函数被内联的位置产生一个不同的闭包代码指针。
Go 函数值本身不可直接比较，但此项变更可能会暴露那些通过 `reflect` 或 `unsafe.Pointer` 来绕过此语言限制并按代码指针比较函数的代码中的错误。

### 链接器 {#link}

<!-- CL 310349 -->
当链接器使用外部链接模式（这是链接使用 cgo 的程序时的默认模式），且链接器被调用时使用了 `-I` 选项，该选项现在将作为 `-Wl,--dynamic-linker` 选项传递给外部链接器。

## 标准库 {#library}

### [Cgo](/pkg/runtime/cgo) {#runtime_cgo}

[runtime/cgo](/pkg/runtime/cgo) 包现在提供了一项新功能，允许将任意 Go 值转换为一种安全表示形式，从而能够在 C 和 Go 之间安全地传递值。更多信息请参阅 [runtime/cgo.Handle](/pkg/runtime/cgo#Handle)。

### URL 查询解析 {#semicolons}

<!-- CL 325697, CL 326309 -->

`net/url` 和 `net/http` 包过去接受 `";"`（分号）作为 URL 查询中的设置分隔符，除此之外还有 `"&"`（& 符号）。现在，包含未经百分比编码的分号的设置将被拒绝，`net/http` 服务器在请求 URL 中遇到此类情况时，会记录一条警告到 [`Server.ErrorLog`](/pkg/net/http#Server.ErrorLog)。

例如，在 Go 1.17 之前，URL `example?a=1;b=2&c=3` 的 [`Query`](/pkg/net/url#URL.Query) 方法会返回 `map[a:[1] b:[2] c:[3]]`，而现在它返回 `map[c:[3]]`。

当遇到此类查询字符串时：
- [`URL.Query`](/pkg/net/url#URL.Query) 和 [`Request.FormValue`](/pkg/net/http#Request.FormValue) 会忽略任何包含分号的设置。
- [`ParseQuery`](/pkg/net/url#ParseQuery) 会返回剩余的设置和一个错误。
- [`Request.ParseForm`](/pkg/net/http#Request.ParseForm) 和 [`Request.ParseMultipartForm`](/pkg/net/http#Request.ParseMultipartForm) 会返回一个错误，但仍会基于剩余的设置来设置 `Request` 的字段。

`net/http` 用户可以通过使用新的 [`AllowQuerySemicolons`](/pkg/net/http#AllowQuerySemicolons) 处理器包装器来恢复原来的行为。这也会抑制 `ErrorLog` 中的警告。需注意，接受分号作为查询分隔符可能会导致安全问题，如果不同系统对缓存键的解释方式不同的话。更多信息请参阅 [issue 25192](/issue/25192)。

### TLS 严格 ALPN {#ALPN}

<!-- CL 289209, CL 325432 -->

当设置了 [`Config.NextProtos`](/pkg/crypto/tls#Config.NextProtos) 时，服务器现在会强制要求配置的协议与客户端公布的 ALPN 协议（如有）之间存在交集。如果没有共同支持的协议，连接将被关闭并发送 `no_application_protocol` 警报，这是 RFC 7301 所要求的。这有助于缓解 [ALPACA 跨协议攻击](https://alpaca-attack.com/)。

作为例外，当服务器的 `Config.NextProtos` 中包含值 `"h2"` 时，HTTP/1.1 客户端将被允许连接，就好像它们不支持 ALPN 一样。更多信息请参阅 [issue 46310](/issue/46310)。

### 标准库次要变更 {#minor_library_changes}

一如既往，库中进行了各种次要更改和更新，所有更改均遵循 Go 1 的[兼容性承诺](/doc/go1compat)。

#### [archive/zip](/pkg/archive/zip/)

<!-- CL 312310 -->
新增的方法 [`File.OpenRaw`](/pkg/archive/zip#File.OpenRaw)、[`Writer.CreateRaw`](/pkg/archive/zip#Writer.CreateRaw)、[`Writer.Copy`](/pkg/archive/zip#Writer.Copy) 为性能优先的场景提供了支持。

#### [bufio](/pkg/bufio/)

<!-- CL 280492 -->
[`Writer.WriteRune`](/pkg/bufio/#Writer.WriteRune) 方法现在对负的 rune 值会写入替换字符 U+FFFD，与其处理其他无效 rune 的方式一致。

#### [bytes](/pkg/bytes/)

<!-- CL 280492 -->
[`Buffer.WriteRune`](/pkg/bytes/#Buffer.WriteRune) 方法现在对负的 rune 值会写入替换字符 U+FFFD，与其处理其他无效 rune 的方式一致。

#### [compress/lzw](/pkg/compress/lzw/)

<!-- CL 273667 -->
[`NewReader`](/pkg/compress/lzw/#NewReader) 函数保证返回新类型 [`Reader`](/pkg/compress/lzw/#Reader) 的值，同样，[`NewWriter`](/pkg/compress/lzw/#NewWriter) 保证返回新类型 [`Writer`](/pkg/compress/lzw/#Writer) 的值。这些新类型都实现了 `Reset` 方法（[`Reader.Reset`](/pkg/compress/lzw/#Reader.Reset), [`Writer.Reset`](/pkg/compress/lzw/#Writer.Reset)），允许重用 `Reader` 或 `Writer`。

#### [crypto/ed25519](/pkg/crypto/ed25519/)

<!-- CL 276272 -->
`crypto/ed25519` 包已被重写，在 amd64 和 arm64 架构上，所有操作的速度现在大约提高了一倍。可观察的行为没有其他变化。

#### [crypto/elliptic](/pkg/crypto/elliptic/)

<!-- CL 233939 -->
[`CurveParams`](/pkg/crypto/elliptic#CurveParams) 的方法现在会自动调用针对已知曲线（P-224、P-256 和 P-521）的更快且更安全的专用实现（如果可用）。请注意，这是一种尽力而为的方法，应用程序应避免使用通用的、非恒定时间的 `CurveParams` 方法，而应使用专用的 [`Curve`](/pkg/crypto/elliptic#Curve) 实现，例如 [`P256`](/pkg/crypto/elliptic#P256)。

<!-- CL 315271, CL 315274 -->
[`P521`](/pkg/crypto/elliptic#P521) 曲线实现已使用 [fiat-crypto 项目](https://github.com/mit-plv/fiat-crypto) 生成的代码重写，该项目基于算术运算的形式化验证模型。它现在是恒定时间的，并且在 amd64 和 arm64 架构上速度提高了三倍。可观察的行为没有其他变化。#### [crypto/rand](/pkg/crypto/rand/)

<!-- CL 302489, CL 299134, CL 269999 -->
`crypto/rand` 包现在在 macOS 上使用 `getentropy` 系统调用，在 Solaris、Illumos 和 DragonFlyBSD 上使用 `getrandom` 系统调用。

<!-- crypto/rand -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 295370 -->
新增的 [`Conn.HandshakeContext`](/pkg/crypto/tls#Conn.HandshakeContext) 方法允许用户控制正在进行的 TLS 握手的取消。提供的上下文可通过新的 [`ClientHelloInfo.Context`](/pkg/crypto/tls#ClientHelloInfo.Context) 和 [`CertificateRequestInfo.Context`](/pkg/crypto/tls#CertificateRequestInfo.Context) 方法在各种回调中访问。在握手完成后取消上下文不会产生任何效果。

<!-- CL 314609 -->
密码套件的排序现在完全由 `crypto/tls` 包处理。目前，密码套件的排序基于其安全性、性能和硬件支持，同时考虑本地和对端的硬件情况。[`Config.CipherSuites`](/pkg/crypto/tls#Config.CipherSuites) 字段的顺序现在会被忽略，[`Config.PreferServerCipherSuites`](/pkg/crypto/tls#Config.PreferServerCipherSuites) 字段也同样如此。请注意，`Config.CipherSuites` 仍然允许应用程序选择启用哪些 TLS 1.0–1.2 密码套件。

由于[基础块大小相关的弱点](https://sweet32.info/)，3DES 密码套件已被移至 [`InsecureCipherSuites`](/pkg/crypto/tls#InsecureCipherSuites)。得益于上述密码套件排序的更改，它们仍默认启用，但仅作为最后的选择。

<!-- golang.org/issue/45428 -->
从下一个版本 Go 1.18 开始，`crypto/tls` 客户端的 [`Config.MinVersion`](/pkg/crypto/tls/#Config.MinVersion) 将默认为 TLS 1.2，默认禁用 TLS 1.0 和 TLS 1.1。应用程序可以通过显式设置 `Config.MinVersion` 来覆盖此更改。这不会影响 `crypto/tls` 服务器。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 224157 -->
如果提供的私钥与父级的公钥（如果存在）不匹配，[`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 现在会返回错误。这样生成的证书将无法通过验证。

<!-- CL 315209 -->
临时的 `GODEBUG=x509ignoreCN=0` 标志已被移除。

<!-- CL 274234 -->
[`ParseCertificate`](/pkg/crypto/x509/#ParseCertificate) 已被重写，现在消耗的资源减少了约 70%。处理 WebPKI 证书时的可观察行为没有其他变化，除了错误消息。

<!-- CL 321190 -->
在 BSD 系统上，现在会搜索 `/etc/ssl/certs` 来查找受信任的根证书。这增加了对 FreeBSD 12.2+ 中新的系统受信任证书存储的支持。

<!-- golang.org/issue/41682 -->
从下一个版本 Go 1.18 开始，`crypto/x509` 将拒绝使用 SHA-1 哈希函数签名的证书。这不适用于自签名的根证书。针对 SHA-1 的实际攻击[已在 2017 年得到证实](https://shattered.io/)，并且受公开信任的证书颁发机构自 2015 年以来就未再签发 SHA-1 证书。

<!-- crypto/x509 -->

#### [database/sql](/pkg/database/sql/)

<!-- CL 258360 -->
如果 `connector` 字段中的类型实现了 [`io.Closer`](/pkg/io/#Closer) 接口，[`DB.Close`](/pkg/database/sql/#DB.Close) 方法现在会关闭该字段。

<!-- CL 311572 -->
新的 [`NullInt16`](/pkg/database/sql/#NullInt16) 和 [`NullByte`](/pkg/database/sql/#NullByte) 结构体表示可能为 null 的 int16 和 byte 值。它们可以用作 [`Scan`](/pkg/database/sql/#Scan) 方法的目标，类似于 NullString。

<!-- database/sql -->

#### [debug/elf](/pkg/debug/elf/)

<!-- CL 239217 -->
添加了 [`SHT_MIPS_ABIFLAGS`](/pkg/debug/elf/#SHT_MIPS_ABIFLAGS) 常量。

<!-- debug/elf -->

#### [encoding/binary](/pkg/encoding/binary/)

<!-- CL 299531 -->
`binary.Uvarint` 在读取 `10 字节` 后将停止读取，以避免浪费计算。如果需要超过 `10 字节`，则返回的字节数为 `-11`。
\
之前的 Go 版本在读取错误编码的 varint 时可能会返回更大的负数。

<!-- encoding/binary -->

#### [encoding/csv](/pkg/encoding/csv/)

<!-- CL 291290 -->
新的 [`Reader.FieldPos`](/pkg/encoding/csv/#Reader.FieldPos) 方法返回最近由 [`Read`](/pkg/encoding/csv/#Reader.Read) 返回的记录中，给定字段开始位置对应的行和列。

<!-- encoding/csv -->

#### [encoding/xml](/pkg/encoding/xml/)

<!-- CL 277893 -->
当注释出现在 [`Directive`](/pkg/encoding/xml/#Directive) 中时，现在会替换为单个空格，而不是完全省略。

带有前导、尾随或多个冒号的无效元素或属性名称现在会原样存储在 [`Name.Local`](/pkg/encoding/xml/#Name) 字段中。

<!-- encoding/xml -->

#### [flag](/pkg/flag/)

<!-- CL 271788 -->
如果指定的名称无效，标志声明现在会引发 panic。

<!-- flag -->

#### [go/build](/pkg/go/build/)

<!-- CL 310732 -->
新的 [`Context.ToolTags`](/pkg/go/build/#Context.ToolTags) 字段包含适合当前 Go 工具链配置的构建标签。

<!-- go/build -->

#### [go/format](/pkg/go/format/)

[`Source`](/pkg/go/format/#Source) 和 [`Node`](/pkg/go/format/#Node) 函数现在会同步 `//go:build` 行和 `// +build` 行。如果文件只有 `// +build` 行，它们将被移动到文件中的适当位置，并添加匹配的 `//go:build` 行。否则，`// +build` 行将根据任何现有的 `//go:build` 行进行覆盖。更多信息，请参阅 [https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

<!-- go/format -->

#### [go/parser](/pkg/go/parser/)<!-- CL 306149 -->
新的 [`SkipObjectResolution`](/pkg/go/parser/#SkipObjectResolution) `Mode` 值指示解析器不要将标识符解析到其声明处。这可能会提高解析速度。

<!-- go/parser -->

#### [image](/pkg/image/)

<!-- CL 311129 -->
具体的图像类型（`RGBA`、`Gray16` 等）现在实现了一个新的 [`RGBA64Image`](/pkg/image/#RGBA64Image) 接口。先前实现了 [`draw.Image`](/pkg/image/draw/#Image) 的具体类型现在也实现了 [`draw.RGBA64Image`](/pkg/image/draw/#RGBA64Image)，这是 `image/draw` 包中的一个新接口。

<!-- image -->

#### [io/fs](/pkg/io/fs/)

<!-- CL 293649 -->
新的 [`FileInfoToDirEntry`](/pkg/io/fs/#FileInfoToDirEntry) 函数可将 `FileInfo` 转换为 `DirEntry`。

<!-- io/fs -->

#### [math](/pkg/math/)

<!-- CL 247058 -->
math 包现在定义了另外三个常量：`MaxUint`、`MaxInt` 和 `MinInt`。
对于 32 位系统，它们的值分别为 `2^32 - 1`、`2^31 - 1` 和 `-2^31`。
对于 64 位系统，它们的值分别为 `2^64 - 1`、`2^63 - 1` 和 `-2^63`。

<!-- math -->

#### [mime](/pkg/mime/)

<!-- CL 305230 -->
在 Unix 系统上，当可用时，MIME 类型表现在会从本地系统的 [共享 MIME-info 数据库](https://specifications.freedesktop.org/shared-mime-info-spec/shared-mime-info-spec-0.21.html) 读取。

<!-- mime -->

#### [mime/multipart](/pkg/mime/multipart/)

<!-- CL 313809 -->
[`Part.FileName`](/pkg/mime/multipart/#Part.FileName) 现在会对其返回值应用 [`filepath.Base`](/pkg/path/filepath/#Base)。这缓解了接受多部分消息的应用程序（例如调用 [`Request.FormFile`](/pkg/net/http/#Request.FormFile) 的 `net/http` 服务器）中潜在的路径遍历漏洞。

<!-- mime/multipart -->

#### [net](/pkg/net/)

<!-- CL 272668 -->
新的方法 [`IP.IsPrivate`](/pkg/net/#IP.IsPrivate) 报告一个地址是否是根据 [RFC 1918](https://datatracker.ietf.org/doc/rfc1918) 规定的私有 IPv4 地址，或是根据 [RFC 4193](https://datatracker.ietf.org/doc/rfc4193) 规定的本地 IPv6 地址。

<!-- CL 301709 -->
Go 的 DNS 解析器现在在解析仅 IPv4 或仅 IPv6 网络的地址时，只发送一个 DNS 查询，而不是同时查询两种地址族。

<!-- CL 307030 -->
哨兵错误 [`ErrClosed`](/pkg/net/#ErrClosed) 和错误类型 [`ParseError`](/pkg/net/#ParseError) 现在实现了 [`net.Error`](/pkg/net/#Error) 接口。

<!-- CL 325829 -->
[`ParseIP`](/pkg/net/#ParseIP) 和 [`ParseCIDR`](/pkg/net/#ParseCIDR) 函数现在拒绝包含前导零的十进制分量的 IPv4 地址。这些分量以前总是被解释为十进制，但某些操作系统会将其视为八进制。如果 Go 应用程序用于验证 IP 地址，而这些地址随后以其原始形式被解释分量为八进制的非 Go 应用程序使用，这种不匹配可能会导致安全问题。通常，建议在验证后总是重新编码值，这样可以避免此类解析器对齐问题。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 295370 -->
[`net/http`](/pkg/net/http/) 包现在在客户端或服务器执行 TLS 握手时，使用新的 [`(*tls.Conn).HandshakeContext`](/pkg/crypto/tls#Conn.HandshakeContext) 并结合 [`Request`](/pkg/net/http/#Request) 的上下文。

<!-- CL 235437 -->
将 [`Server`](/pkg/net/http/#Server) 的 `ReadTimeout` 或 `WriteTimeout` 字段设置为负值现在表示没有超时，而不是立即超时。

<!-- CL 308952 -->
当请求包含多个 Host 头时，[`ReadRequest`](/pkg/net/http/#ReadRequest) 函数现在会返回一个错误。

<!-- CL 313950 -->
当产生重定向到 URL 的清理版本时，[`ServeMux`](/pkg/net/http/#ServeMux) 现在总是在 `Location` 头中使用相对 URL。以前它会回显请求的完整 URL，如果客户端被诱导发送绝对请求 URL，这可能导致非预期的重定向。

<!-- CL 308009, CL 313489 -->
在解释 `net/http` 处理的某些 HTTP 头时，非 ASCII 字符现在会被忽略或拒绝。

<!-- CL 325697 -->
如果 [`Request.ParseForm`](/pkg/net/http/#Request.ParseForm) 在被 [`Request.ParseMultipartForm`](/pkg/net/http/#Request.ParseMultipartForm) 调用时返回错误，后者现在会在返回前继续填充 [`Request.MultipartForm`](/pkg/net/http/#Request.MultipartForm)。

<!-- net/http -->

#### [net/http/httptest](/pkg/net/http/httptest/)

<!-- CL 308950 -->
当提供的代码不是有效的三位数 HTTP 状态码时，[`ResponseRecorder.WriteHeader`](/pkg/net/http/httptest/#ResponseRecorder.WriteHeader) 现在会引发 panic。这与 [`net/http`](/pkg/net/http/) 包中 [`ResponseWriter`](/pkg/net/http/#ResponseWriter) 实现的行为一致。

<!-- net/http/httptest -->

#### [net/url](/pkg/net/url/)

<!-- CL 314850 -->
新的方法 [`Values.Has`](/pkg/net/url/#Values.Has) 报告是否设置了某个查询参数。

<!-- net/url -->

#### [os](/pkg/os/)

<!-- CL 268020 -->
[`File.WriteString`](/pkg/os/#File.WriteString) 方法已优化，不再复制输入字符串。

<!-- os -->

#### [reflect](/pkg/reflect/)

<!-- CL 334669 -->
新的 [`Value.CanConvert`](/pkg/reflect/#Value.CanConvert) 方法报告一个值是否可以被转换为某种类型。这可用于避免在将切片转换为数组指针类型时，如果切片太短而引发 panic。以前，使用 [`Type.ConvertibleTo`](/pkg/reflect/#Type.ConvertibleTo) 就足够了，但新允许的从切片到数组指针类型的转换即使类型可转换也可能引发 panic。

<!-- reflect --><!-- CL 266197 -->
新增了 [`StructField.IsExported`](/pkg/reflect/#StructField.IsExported) 和 [`Method.IsExported`](/pkg/reflect/#Method.IsExported) 方法，用于报告结构体字段或类型方法是否被导出。它们提供了比检查 `PkgPath` 是否为空更具可读性的替代方案。

<!-- CL 281233 -->
新增了 [`VisibleFields`](/pkg/reflect/#VisibleFields) 函数，该函数返回结构体类型中所有可见的字段，包括匿名结构体成员内部的字段。

<!-- CL 284136 -->
当使用负数长度调用时，[`ArrayOf`](/pkg/reflect/#ArrayOf) 函数现在会引发 panic。

<!-- CL 301652 -->
仅检查 [`Type.ConvertibleTo`](/pkg/reflect/#Type.ConvertibleTo) 方法已不足以保证调用 [`Value.Convert`](/pkg/reflect/#Value.Convert) 不会引发 panic。如果切片的长度小于 N，在将 `\`[]T\`` 转换为 `\`*[N]T\`` 时可能会引发 panic。请参阅上方的 [语言变更](#language) 部分。

<!-- CL 309729 -->
已修复 [`Value.Convert`](/pkg/reflect/#Value.Convert) 和 [`Type.ConvertibleTo`](/pkg/reflect/#Type.ConvertibleTo) 方法，使其不再将不同包中同名的类型视为相同，以符合语言规范允许的行为。

<!-- reflect -->

#### [runtime/metrics](/pkg/runtime/metrics)

<!-- CL 308933, CL 312431, CL 312909 -->
新增了用于追踪已分配和已释放的总字节数和对象数的指标。还新增了一个用于追踪 goroutine 调度延迟分布的指标。

<!-- runtime/metrics -->

#### [runtime/pprof](/pkg/runtime/pprof)

<!-- CL 299991 -->
阻塞分析（Block profiles）不再偏向于优先显示低频长耗时事件，而忽略高频短耗时事件。

<!-- runtime/pprof -->

#### [strconv](/pkg/strconv/)

<!-- CL 170079, CL 170080 -->
`strconv` 包现在使用 Ulf Adams 的 Ryū 算法来格式化浮点数。该算法提高了大多数输入的性能，并且对于最坏情况的输入，速度提升超过 99%。

<!-- CL 314775 -->
新增了 [`QuotedPrefix`](/pkg/strconv/#QuotedPrefix) 函数，该函数返回输入开头的带引号的字符串（其格式应为 [`Unquote`](/pkg/strconv/#Unquote) 所理解的格式）。

<!-- strconv -->

#### [strings](/pkg/strings/)

<!-- CL 280492 -->
[`Builder.WriteRune`](/pkg/strings/#Builder.WriteRune) 方法现在会为负的 rune 值写入替换字符 U+FFFD，就像处理其他无效 rune 值一样。

<!-- strings -->

#### [sync/atomic](/pkg/sync/atomic/)

<!-- CL 241678 -->
`atomic.Value` 现在拥有 [`Swap`](/pkg/sync/atomic/#Value.Swap) 和 [`CompareAndSwap`](/pkg/sync/atomic/#Value.CompareAndSwap) 方法，提供了额外的原子操作。

<!-- sync/atomic -->

#### [syscall](/pkg/syscall/)

<!-- CL 295371 -->
[`GetQueuedCompletionStatus`](/pkg/syscall/#GetQueuedCompletionStatus) 和 [`PostQueuedCompletionStatus`](/pkg/syscall/#PostQueuedCompletionStatus) 函数现已弃用。这些函数的签名不正确，已被 [`golang.org/x/sys/windows`](https://godoc.org/golang.org/x/sys/windows) 包中的等效函数取代。

<!-- CL 313653 -->
在类 Unix 系统上，现在设置子进程的进程组时会阻塞信号。这避免了当父进程处于后台进程组时向子进程发送 `SIGTTOU` 信号。

<!-- CL 288298, CL 288300 -->
Windows 版本的 [`SysProcAttr`](/pkg/syscall/#SysProcAttr) 结构体新增了两个字段。`AdditionalInheritedHandles` 是一个列表，包含新子进程需要继承的额外句柄。`ParentProcess` 允许指定新进程的父进程。

<!-- CL 311570 -->
常量 `MSG_CMSG_CLOEXEC` 现已在 DragonFly 和所有 OpenBSD 系统上定义（它之前已在部分 OpenBSD 系统以及所有 FreeBSD、NetBSD 和 Linux 系统上定义）。

<!-- CL 315281 -->
常量 `SYS_WAIT6` 和 `WEXITED` 现已在 NetBSD 系统上定义（`SYS_WAIT6` 之前已在 DragonFly 和 FreeBSD 系统上定义；`WEXITED` 之前已在 Darwin、DragonFly、FreeBSD、Linux 和 Solaris 系统上定义）。

<!-- syscall -->

#### [testing](/pkg/testing/)

<!-- CL 310033 -->
新增了一个 [测试标志](/cmd/go/#hdr-Testing_flags) `-shuffle`，用于控制测试和基准测试的执行顺序。

<!-- CL 260577 -->
新增了 [`T.Setenv`](/pkg/testing/#T.Setenv) 和 [`B.Setenv`](/pkg/testing/#B.Setenv) 方法，支持在测试或基准测试期间设置环境变量。

<!-- testing -->

#### [text/template/parse](/pkg/text/template/parse/)

<!-- CL 301493 -->
新增了 [`SkipFuncCheck`](/pkg/text/template/parse/#Mode) `Mode` 值，它会改变模板解析器的行为，使其不再验证函数是否已定义。

<!-- text/template/parse -->

#### [time](/pkg/time/)

<!-- CL 260858 -->
[`Time`](/pkg/time/#Time) 类型现在拥有一个 [`GoString`](/pkg/time/#Time.GoString) 方法，当使用 `fmt` 包的 `%#v` 格式化动词打印时间时，该方法会返回一个更有用的值。

<!-- CL 264077 -->
新增了 [`Time.IsDST`](/pkg/time/#Time.IsDST) 方法，可用于检查时间在其配置的位置是否处于夏令时。

<!-- CL 293349 -->
新增了 [`Time.UnixMilli`](/pkg/time/#Time.UnixMilli) 和 [`Time.UnixMicro`](/pkg/time/#Time.UnixMicro) 方法，分别返回自 UTC 1970 年 1 月 1 日以来经过的毫秒数和微秒数。新增了 [`UnixMilli`](/pkg/time/#UnixMilli) 和 [`UnixMicro`](/pkg/time/#UnixMicro) 函数，返回与给定 Unix 时间对应的本地 `Time`。

<!-- CL 300996 -->
该包在解析和格式化时间时，现在接受逗号 "," 作为小数秒的分隔符。例如，以下时间布局现在可被接受：

  - 2006-01-02 15:04:05,999999999 -0700 MST
  - Mon Jan \_2 15:04:05,000000 2006
  - Monday, January 2 15:04:05,000 2006

<!-- CL 320252 -->
新增了常量 [`Layout`](/pkg/time/#Layout)，用于定义参考时间。

<!-- time -->

#### [unicode](/pkg/unicode/)<!-- CL 280493 -->
对于 [`Is`](/pkg/unicode/#Is)、
[`IsGraphic`](/pkg/unicode/#IsGraphic)、
[`IsLetter`](/pkg/unicode/#IsLetter)、
[`IsLower`](/pkg/unicode/#IsLower)、
[`IsMark`](/pkg/unicode/#IsMark)、
[`IsNumber`](/pkg/unicode/#IsNumber)、
[`IsPrint`](/pkg/unicode/#IsPrint)、
[`IsPunct`](/pkg/unicode/#IsPunct)、
[`IsSpace`](/pkg/unicode/#IsSpace)、
[`IsSymbol`](/pkg/unicode/#IsSymbol) 以及
[`IsUpper`](/pkg/unicode/#IsUpper) 函数，
当输入为负的 rune 值时，现在会返回 `false`，这与处理其他无效 rune 值的行为一致。

<!-- unicode -->