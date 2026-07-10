---
path: /doc/go1.17
title: Go 1.17 发行说明
---

<!--
注意：在本文档及本目录中的其他文档中，惯例是将固定宽度短语与非固定宽度空格结合使用，如
`hello` `world`。
请勿提交移除此类短语内部标签的CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.17 简介 {#introduction}

最新的Go语言版本1.17在[Go 1.16](/doc/go1.16)发布六个月后到来。
其大部分变更集中在工具链、运行时和库的实现方面。
一如既往，此版本遵守Go 1的[兼容性承诺](/doc/go1compat)。
我们预计几乎所有Go程序都能继续像以前一样编译和运行。

## 语言变更 {#language}

Go 1.17包含三项语言的小幅增强。

  - <!-- CL 216424; issue 395 -->
    [从切片到数组指针的转换](/ref/spec#Conversions_from_slice_to_array_pointer)：现在可以将类型为`[]T`的表达式`s`转换为数组指针类型`*[N]T`。如果`a`是此类转换的结果，那么对应索引在范围内的元素指向相同的底层元素：对于`0 <= i < N`，有`&a[i] == &s[i]`。如果`len(s)`小于`N`，转换将引发恐慌。
  - <!-- CL 312212; issue 40481 -->
    [`unsafe.Add`](/pkg/unsafe#Add)：
    `unsafe.Add(ptr, len)`将`len`加到`ptr`上，并返回更新后的指针`unsafe.Pointer(uintptr(ptr) + uintptr(len))`。
  - <!-- CL 312212; issue 19367 -->
    [`unsafe.Slice`](/pkg/unsafe#Slice)：
    对于类型为`*T`的表达式`ptr`，
    `unsafe.Slice(ptr, len)`返回一个类型为`[]T`的切片，其底层数据从`ptr`开始，长度和容量均为`len`。

添加unsafe包的增强功能是为了简化编写符合`unsafe.Pointer`[安全规则](/pkg/unsafe/#Pointer)的代码，但规则本身保持不变。特别地，现有正确使用`unsafe.Pointer`的程序仍然有效，而新程序在使用`unsafe.Add`或`unsafe.Slice`时仍必须遵循这些规则。

请注意，从切片到数组指针的新转换是类型转换可能在运行时引发恐慌的首例。假设类型转换永远不会引发恐慌的分析工具应更新，以考虑这种可能性。

## 平台支持 {#ports}

### Darwin {#darwin}

<!-- golang.org/issue/23011 -->
如Go 1.16发行说明中[所宣布](go1.16#darwin)，Go 1.17要求macOS 10.13 High Sierra或更高版本；对旧版本的支持已停止。

### Windows {#windows}

<!-- golang.org/issue/36439 -->
Go 1.17新增了对Windows上64位ARM架构（`windows/arm64`平台）的支持。此平台支持cgo。

### OpenBSD {#openbsd}

<!-- golang.org/issue 43005 -->
OpenBSD上的64位MIPS架构（`openbsd/mips64`平台）现在支持cgo。

<!-- golang.org/issue/36435 -->
在Go 1.16中，OpenBSD上的64位x86和64位ARM架构（`openbsd/amd64`和`openbsd/arm64`平台）通过`libc`进行系统调用，而不是直接使用机器指令。在Go 1.17中，OpenBSD上的32位x86和32位ARM架构（`openbsd/386`和`openbsd/arm`平台）也采用了这种方式。这确保了与OpenBSD 6.9及更高版本的兼容性，这些版本要求非静态Go二进制文件通过`libc`进行系统调用。

### ARM64 {#arm64}

<!-- CL 288814 -->
Go程序现在在所有操作系统的64位ARM架构上都维护栈帧指针。以前，栈帧指针仅在Linux、macOS和iOS上启用。

### 预留的loong64 GOARCH值 {#loong64}

<!-- CL 333909 -->
Go主编译器尚未支持LoongArch架构，但我们已预留了`GOARCH`值"`loong64`"。
这意味着名为`*_loong64.go`的Go文件现在将[被Go工具忽略](/pkg/go/build/#hdr-Build_Constraints)，除非正在使用该GOARCH值。

## 工具 {#tools}

### Go命令 {#go-command}

<a id="lazy-loading"><!-- 仅为现有链接保留 -->
</a>

#### `go 1.17` 模块中的剪枝模块图 {#graph-pruning}

<!-- golang.org/issue/36460 -->
如果一个模块指定`go` `1.17`或更高版本，则模块图仅包含其他`go` `1.17`模块的_直接_依赖项，而不包含其完整的传递性依赖项。（更多详情请参见[模块图剪枝](/ref/mod#graph-pruning)。）

为了让`go`命令使用剪枝后的模块图正确解析传递性导入，每个模块的`go.mod`文件需要包含更多关于该模块相关传递性依赖项的详细信息。如果一个模块在其`go.mod`文件中指定`go` `1.17`或更高版本，则其`go.mod`文件现在包含一个显式的[`require`指令](/ref/mod#go-mod-file-require)，用于每个提供传递性导入包的模块。（在以前的版本中，`go.mod`文件通常只包含_直接_导入包的显式要求。）

由于模块图剪枝所需的扩展`go.mod`文件包含了加载主模块中任何包的导入所需的所有依赖项，如果主模块指定`go` `1.17`或更高版本，`go`工具将不再读取（甚至下载）那些完成所请求命令不需要的依赖项的`go.mod`文件。（参见[懒加载](/ref/mod#lazy-loading)。）

<!-- golang.org/issue 45965 -->
由于在扩展的Go 1.17 `go.mod`文件中显式要求的数量可能显著增加，`go` `1.17`模块中对_间接_依赖项的新添加的要求被维护在一个单独的`require`块中，与包含直接依赖项的块分开。<!-- golang.org/issue/45094 -->
为便于升级到 Go 1.17 的剪枝后模块图，[`go` `mod` `tidy`](/ref/mod#go-mod-tidy) 子命令现支持 `-go` 标志，用于设置或更改 `go.mod` 文件中的 `go` 版本。要将现有模块的 `go.mod` 文件转换为 Go 1.17 版本，且不更改其依赖项的已选版本，请运行：

	  go mod tidy -go=1.17

<!-- golang.org/issue/46141 -->
默认情况下，`go` `mod` `tidy` 会验证与主模块相关的依赖项的已选版本是否与先前 Go 版本（对于指定 `go` `1.17` 的模块即为 Go 1.16）所使用的版本相同，并保留该版本所需的 `go.sum` 条目，即使对于其他命令通常不需要的依赖项也是如此。

`-compat` 标志允许覆盖该版本，以支持更旧（或更新）的版本，最高可达 `go.mod` 文件中 `go` 指令所指定的版本。要仅针对 Go 1.17 整理 `go` `1.17` 模块，而不保存（或不检查与 Go 1.16 的一致性）校验和：

	  go mod tidy -compat=1.17

请注意，即使主模块使用 `-compat=1.17` 进行了整理，从 `go` `1.16` 或更早版本模块 `require` 该模块的用户仍然能够使用它，前提是这些包仅使用兼容的语言和库特性。

<!-- golang.org/issue/46366 -->
[`go` `mod` `graph`](/ref/mod#go-mod-graph) 子命令同样支持 `-go` 标志，这会导致它报告指定 Go 版本所看到的依赖图，显示那些可能被剪枝掉的依赖项。

#### 模块废弃注释 {#module-deprecation-comments}

<!-- golang.org/issue/40357 -->
模块作者可以通过向 `go.mod` 添加 [`// Deprecated:` 注释](/ref/mod#go-mod-file-module-deprecation) 然后标记一个新版本来废弃一个模块。如果构建命令行指定的包所需的模块已被废弃，`go` `get` 现在会打印一条警告。`go` `list` `-m` `-u` 会打印所有依赖项的废弃信息（使用 `-f` 或 `-json` 可显示完整消息）。`go` 命令将不同的主版本视为不同的模块，因此该机制可用于例如为用户提供向新主版本迁移的说明。

#### `go` `get` {#go-get}

<!-- golang.org/issue/37519 -->
`go` `get` `-insecure` 标志已被废弃并移除。要允许在获取依赖项时使用不安全协议，请使用 `GOINSECURE` 环境变量。`-insecure` 标志也曾绕过模块校验和验证，如果需要该功能请使用 `GOPRIVATE` 或 `GONOSUMDB`。详情请参阅 `go` `help` `environment`。

<!-- golang.org/issue/43684 -->
当在主模块之外安装命令（未使用 `-d` 标志）时，`go` `get` 会打印一条废弃警告。应改用 `go` `install` `cmd@version` 来安装特定版本的命令，使用类似 `@latest` 或 `@v1.2.3` 的后缀。在 Go 1.18 中，`-d` 标志将始终启用，并且 `go` `get` 将仅用于更改 `go.mod` 中的依赖项。

#### 缺少 `go` 指令的 `go.mod` 文件 {#missing-go-directive}

<!-- golang.org/issue/44976 -->
如果主模块的 `go.mod` 文件不包含 [`go` 指令](/doc/modules/gomod-ref#go)，并且 `go` 命令无法更新该 `go.mod` 文件，`go` 命令现在会假定为 `go 1.11`，而不是当前版本。（`go` `mod` `init` 自 [Go 1.12](/doc/go1.12#modules) 起会自动添加 `go` 指令。）

<!-- golang.org/issue/44976 -->
如果模块依赖项缺少显式的 `go.mod` 文件，或者其 `go.mod` 文件不包含 [`go` 指令](/doc/modules/gomod-ref#go)，`go` 命令现在会假定该依赖项为 `go 1.16`，而不是当前版本。（在 GOPATH 模式下开发的依赖项可能缺少 `go.mod` 文件，并且 `vendor/modules.txt` 迄今为止从未记录过依赖项 `go.mod` 文件所指示的 `go` 版本。）

#### `vendor` 目录内容 {#vendor}

<!-- golang.org/issue/36876 -->
如果主模块指定 `go` `1.17` 或更高版本，[`go` `mod` `vendor`](/ref/mod#go-mod-vendor) 现在会在 `vendor/modules.txt` 中为每个被 vendor 的模块添加注释，标明其自身 `go.mod` 文件中指示的 `go` 版本。当从 vendored 源代码构建模块的包时，将使用此注释的版本。

<!-- golang.org/issue/42970 -->
如果主模块指定 `go` `1.17` 或更高版本，`go` `mod` `vendor` 现在会省略被 vendor 依赖项的 `go.mod` 和 `go.sum` 文件，否则这些文件可能会干扰 `go` 命令在 `vendor` 目录树内被调用时识别正确的模块根目录的能力。

#### 密码提示 {#password-prompts}

<!-- golang.org/issue/44904 -->
`go` 命令现在默认禁止在通过 SSH 获取 Git 仓库时显示 SSH 密码提示和 Git 凭据管理器提示，这与其先前对其他 Git 密码提示的做法一致。使用受密码保护的 SSH 进行私有 Git 仓库身份验证的用户可以配置 `ssh-agent`，以使 `go` 命令能够使用受密码保护的 SSH 密钥。

#### `go` `mod` `download` {#go-mod-download}

<!-- golang.org/issue/45332 -->
当不带参数调用 `go` `mod` `download` 时，它将不再把下载的模块内容的校验和保存到 `go.sum`。它可能仍会更改加载构建列表所需的 `go.mod` 和 `go.sum`。这与 Go 1.15 中的行为相同。要保存所有模块的校验和，请使用 `go` `mod` `download` `all`。

#### `//go:build` 行 {#build-lines}`go` 命令现在能够识别 `//go:build` 行，
并且优先使用它们而非 `// +build` 行。新语法采用与 Go 语言相同的
布尔表达式，更不易出错。
从这个版本开始，新语法得到完全支持，所有 Go 文件
都应更新为同时包含两种形式且具有相同含义。为了便于迁移，
[`gofmt`](#gofmt) 现在会自动同步这两种形式。关于语法和迁移计划的更多细节，
请参阅 [https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

#### `go` `run` {#go_run}

<!-- golang.org/issue/42088 -->
`go` `run` 现在接受带版本后缀的参数（例如 `go` `run`
`example.com/cmd@v1.0.0`）。这使得 `go`
`run` 在模块感知模式下构建和运行包，忽略当前目录或任何父目录中
（如果存在）的 `go.mod` 文件。这对于在不安装可执行文件或不更改当前模块
依赖的情况下运行可执行文件非常有用。

### Gofmt {#gofmt}

`gofmt`（以及 `go` `fmt`）现在会同步
`//go:build` 行与 `// +build` 行。如果一个文件
只有 `// +build` 行，它们将被移动到文件中的
适当位置，并添加匹配的 `//go:build` 行。
否则，`// +build` 行将根据已有的 `//go:build` 行
被覆盖。更多信息，请参阅
[https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

### Vet {#vet}

#### 新增不匹配的 `//go:build` 和 `// +build` 行警告 {#vet-buildtags}

<!-- CL 240609 -->
`vet` 工具现在会验证 `//go:build` 和
`// +build` 行是否位于文件的正确部分并且相互同步。
如果不是，可以使用 [`gofmt`](#gofmt) 来修复它们。
更多信息，请参阅 [https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

#### 新增在无缓冲通道上调用 `signal.Notify` 的警告 {#vet-sigchanyzer}

<!-- CL 299532 -->
vet 工具现在会对使用传入信号发送到无缓冲通道的 [signal.Notify](/pkg/os/signal/#Notify)
调用发出警告。使用无缓冲通道有丢失信号的风险，因为 `signal.Notify`
在向通道发送时不会阻塞。例如：

```go
c := make(chan os.Signal)
// 信号在通道被读取之前就会在c上发送。
// 由于c是无缓冲的，这个信号可能会被丢弃。
signal.Notify(c, os.Interrupt)
```

`signal.Notify` 的用户应使用具有足够缓冲空间的通道，以跟上预期的信号频率。

#### 新增 Is、As 和 Unwrap 方法警告 {#vet-error-stdmethods}

<!-- CL 321389 -->
vet 工具现在会对实现 `error` 接口的类型上名为 `As`、`Is` 或 `Unwrap`
但签名与 `errors` 包预期不符的方法发出警告。`errors.{As,Is,Unwrap}`
函数期望这些方法分别实现 `Is(error)` `bool`、
`As(interface{})` `bool` 或 `Unwrap()` `error`。
函数 `errors.{As,Is,Unwrap}` 将忽略同名但签名不同的方法。例如：

```go
type MyError struct { hint string }
func (m MyError) Error() string { ... } // MyError 实现了 error。
func (MyError) Is(target interface{}) bool { ... } // target 是 interface{} 而非 error。
func Foo() bool {
    x, y := MyError{"A"}, MyError{"B"}
    return errors.Is(x, y) // 返回 false，因为 x != y 且 MyError 没有 `Is(error) bool` 函数。
}
```

### Cover {#cover}

<!-- CL 249759 -->
`cover` 工具现在使用来自 `golang.org/x/tools/cover`
的优化解析器，在解析大型覆盖配置文件时可能会明显更快。

## 编译器 {#compiler}

<!-- golang.org/issue/40724 -->
Go 1.17 实现了一种通过寄存器（而非栈）传递函数参数和结果的新方式。
对一组具有代表性的 Go 包和程序的基准测试显示
性能提升了约 5%，二进制大小通常减少约 2%。
目前此改进已在 64 位 x86 架构（`linux/amd64`、
`darwin/amd64` 和 `windows/amd64` 平台）的
Linux、macOS 和 Windows 上启用。

此更改不影响任何安全 Go 代码的功能，
并且旨在对大多数汇编代码没有影响。
它可能影响违反 [`unsafe.Pointer`](/pkg/unsafe#Pointer)
规则访问函数参数的代码，或依赖于涉及比较函数代码指针的
未记录行为的代码。为了与现有汇编函数保持兼容，
编译器会生成适配器函数，在新的基于寄存器的调用约定和
之前基于栈的调用约定之间进行转换。
这些适配器通常对用户不可见，除了在汇编代码中取一个 Go 函数的地址，
或者在 Go 代码中使用 `reflect.ValueOf(fn).Pointer()`
或 `unsafe.Pointer` 取一个汇编函数的地址时，
现在会返回适配器的地址。
依赖于这些代码指针值的代码可能不再按预期行为。
适配器在两种情况下也可能导致非常小的性能开销：通过
`func` 值从 Go 间接调用汇编函数，以及从汇编调用 Go 函数。

<!-- CL 304470 -->
运行时栈跟踪的格式（在发生未捕获的 panic 时或调用 `runtime.Stack` 时打印）
已得到改进。以前，函数参数根据内存布局打印为十六进制字。
现在，源代码中的每个参数会单独打印，用逗号分隔。
聚合类型（结构体、数组、字符串、切片、接口和复数）
参数由花括号分隔。需要注意的是，仅存在于寄存器中且未存储到内存的参数
其值可能不准确。函数返回值（通常不准确）不再打印。<!-- CL 283112, golang.org/issue/28727 -->
包含闭包的函数现在可以被内联。
此更改的一个影响是，包含闭包的函数在每次内联点可能会产生一个不同的闭包代码指针。
Go 函数值是不可直接比较的，但此更改可能会暴露那些使用 `reflect` 或 `unsafe.Pointer` 绕过此语言限制、通过代码指针比较函数的代码中的 bug。

### 链接器 {#link}

<!-- CL 310349 -->
当链接器使用外部链接模式（这是链接使用 cgo 的程序时的默认模式）并带 `-I` 选项被调用时，该选项现在将作为 `-Wl,--dynamic-linker` 选项传递给外部链接器。

## 标准库 {#library}

### [Cgo](/pkg/runtime/cgo) {#runtime_cgo}

[runtime/cgo](/pkg/runtime/cgo) 包现在提供了一个新功能，允许将任何 Go 值转换为安全的表示形式，从而可以在 C 和 Go 之间安全地传递值。更多信息请参见 [runtime/cgo.Handle](/pkg/runtime/cgo#Handle)。

### URL 查询解析 {#semicolons}

<!-- CL 325697, CL 326309 -->

`net/url` 和 `net/http` 包过去除了接受 `"&"`（与号）外，也接受 `";"`（分号）作为 URL 查询中的设置分隔符。现在，包含未进行百分号编码的分号的设置将被拒绝，并且 `net/http` 服务器在请求 URL 中遇到此类情况时，会将警告记录到 [`Server.ErrorLog`](/pkg/net/http#Server.ErrorLog)。

例如，在 Go 1.17 之前，URL `example?a=1;b=2&c=3` 的 [`Query`](/pkg/net/url#URL.Query) 方法会返回 `map[a:[1] b:[2] c:[3]]`，而现在它返回 `map[c:[3]]`。

当遇到此类查询字符串时，[`URL.Query`](/pkg/net/url#URL.Query) 和 [`Request.FormValue`](/pkg/net/http#Request.FormValue) 会忽略任何包含分号的设置；[`ParseQuery`](/pkg/net/url#ParseQuery) 返回剩余的设置并附带一个错误；而 [`Request.ParseForm`](/pkg/net/http#Request.ParseForm) 和 [`Request.ParseMultipartForm`](/pkg/net/http#Request.ParseMultipartForm) 会返回一个错误，但仍会基于剩余的设置设置 `Request` 字段。

`net/http` 用户可以通过使用新的 [`AllowQuerySemicolons`](/pkg/net/http#AllowQuerySemicolons) 处理器包装器来恢复原始行为。这也会抑制 `ErrorLog` 的警告。请注意，接受分号作为查询分隔符如果不同系统对缓存键的解释不同，可能会导致安全问题。更多信息请参见 [issue 25192](/issue/25192)。

### TLS 严格 ALPN {#ALPN}

<!-- CL 289209, CL 325432 -->

当设置了 [`Config.NextProtos`](/pkg/crypto/tls#Config.NextProtos) 时，服务器现在会强制要求配置的协议与客户端公告的 ALPN 协议（如果有）之间存在重叠。如果没有双方都支持的协议，连接将被关闭并发送 `no_application_protocol` 警报，这是 RFC 7301 的要求。这有助于缓解 [ALPACA 跨协议攻击](https://alpaca-attack.com/)。

作为例外，当服务器的 `Config.NextProtos` 中包含 `"h2"` 值时，将允许 HTTP/1.1 客户端连接，就好像它们不支持 ALPN 一样。更多信息请参见 [issue 46310](/issue/46310)。

### 库的次要更改 {#minor_library_changes}

一如既往，在牢记 Go 1 [兼容性承诺](/doc/go1compat) 的前提下，库有各种次要更改和更新。

#### [archive/zip](/pkg/archive/zip/)

<!-- CL 312310 -->
新方法 [`File.OpenRaw`](/pkg/archive/zip#File.OpenRaw)、[`Writer.CreateRaw`](/pkg/archive/zip#Writer.CreateRaw)、[`Writer.Copy`](/pkg/archive/zip#Writer.Copy) 为性能优先的场景提供了支持。

<!-- archive/zip -->

#### [bufio](/pkg/bufio/)

<!-- CL 280492 -->
[`Writer.WriteRune`](/pkg/bufio/#Writer.WriteRune) 方法现在会为负的 rune 值写入替换字符 U+FFFD，与处理其他无效 rune 的方式一致。

<!-- bufio -->

#### [bytes](/pkg/bytes/)

<!-- CL 280492 -->
[`Buffer.WriteRune`](/pkg/bytes/#Buffer.WriteRune) 方法现在会为负的 rune 值写入替换字符 U+FFFD，与处理其他无效 rune 的方式一致。

<!-- bytes -->

#### [compress/lzw](/pkg/compress/lzw/)

<!-- CL 273667 -->
[`NewReader`](/pkg/compress/lzw/#NewReader) 函数保证返回新类型 [`Reader`](/pkg/compress/lzw/#Reader) 的值，同样 [`NewWriter`](/pkg/compress/lzw/#NewWriter) 保证返回新类型 [`Writer`](/pkg/compress/lzw/#Writer) 的值。这些新类型都实现了 `Reset` 方法（[`Reader.Reset`](/pkg/compress/lzw/#Reader.Reset)、[`Writer.Reset`](/pkg/compress/lzw/#Writer.Reset)），允许重用 `Reader` 或 `Writer`。

<!-- compress/lzw -->

#### [crypto/ed25519](/pkg/crypto/ed25519/)

<!-- CL 276272 -->
`crypto/ed25519` 包已被重写，所有操作在 amd64 和 arm64 上大约快了两倍。可观察到的行为在其他方面没有变化。

<!-- crypto/ed25519 -->

#### [crypto/elliptic](/pkg/crypto/elliptic/)

<!-- CL 233939 -->
[`CurveParams`](/pkg/crypto/elliptic#CurveParams) 的方法现在在可用时会自动调用针对已知曲线（P-224、P-256 和 P-521）的更快速、更安全的专用实现。请注意，这是一种尽力而为的方法，应用程序应避免使用通用的、非恒定时间的 `CurveParams` 方法，而应使用专用的 [`Curve`](/pkg/crypto/elliptic#Curve) 实现，例如 [`P256`](/pkg/crypto/elliptic#P256)。

<!-- CL 315271, CL 315274 -->
[`P521`](/pkg/crypto/elliptic#P521) 曲线实现已使用 [fiat-crypto 项目](https://github.com/mit-plv/fiat-crypto) 生成的代码重写，该代码基于一个经过形式化验证的算术运算模型。它现在是恒定时间的，并且在 amd64 和 arm64 上快了三倍。可观察到的行为在其他方面没有变化。

<!-- crypto/elliptic -->#### [crypto/rand](/pkg/crypto/rand/)

<!-- CL 302489, CL 299134, CL 269999 -->
`crypto/rand` 包现在在 macOS 上使用 `getentropy` 系统调用，在 Solaris、Illumos 和 DragonFlyBSD 上使用 `getrandom` 系统调用。

<!-- crypto/rand -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 295370 -->
新增的 [`Conn.HandshakeContext`](/pkg/crypto/tls#Conn.HandshakeContext) 方法允许用户控制正在进行中的 TLS 握手的取消操作。提供的 context 可以通过新的 [`ClientHelloInfo.Context`](/pkg/crypto/tls#ClientHelloInfo.Context) 和 [`CertificateRequestInfo.Context`](/pkg/crypto/tls#CertificateRequestInfo.Context) 方法从各个回调中访问。在握手完成后取消 context 不会产生任何效果。

<!-- CL 314609 -->
密码套件的排序现在完全由 `crypto/tls` 包处理。目前，密码套件根据其安全性、性能和硬件支持进行排序，同时考虑了本地端和对等端的硬件。现在会忽略 [`Config.CipherSuites`](/pkg/crypto/tls#Config.CipherSuites) 字段的顺序，以及 [`Config.PreferServerCipherSuites`](/pkg/crypto/tls#Config.PreferServerCipherSuites) 字段。请注意，`Config.CipherSuites` 仍然允许应用程序选择启用哪些 TLS 1.0–1.2 密码套件。

由于[与基本块大小相关的弱点](https://sweet32.info/)，3DES 密码套件已被移至 [`InsecureCipherSuites`](/pkg/crypto/tls#InsecureCipherSuites)。得益于上述密码套件排序的更改，它们虽然默认仍处于启用状态，但仅作为最后的手段。

<!-- golang.org/issue/45428 -->
从下一个版本 Go 1.18 开始，`crypto/tls` 客户端的 [`Config.MinVersion`](/pkg/crypto/tls/#Config.MinVersion) 将默认设为 TLS 1.2，即默认禁用 TLS 1.0 和 TLS 1.1。应用程序可以通过显式设置 `Config.MinVersion` 来覆盖此更改。这不会影响 `crypto/tls` 服务器。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 224157 -->
如果提供的私钥（如果存在）与父证书的公钥不匹配，[`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 现在会返回错误。这样生成的证书将无法通过验证。

<!-- CL 315209 -->
临时的 `GODEBUG=x509ignoreCN=0` 标志已被移除。

<!-- CL 274234 -->
[`ParseCertificate`](/pkg/crypto/x509/#ParseCertificate) 已被重写，现在消耗的资源减少了约 70%。处理 WebPKI 证书时的可观测行为在其他方面没有变化，错误消息除外。

<!-- CL 321190 -->
在 BSD 系统上，现在会搜索 `/etc/ssl/certs` 目录以获取受信任的根证书。这增加了对 FreeBSD 12.2+ 中新系统受信任证书存储的支持。

<!-- golang.org/issue/41682 -->
从下一个版本 Go 1.18 开始，`crypto/x509` 将拒绝使用 SHA-1 哈希函数签名的证书。自签名根证书不受此影响。针对 SHA-1 的实际攻击[已在 2017 年得到证明](https://shattered.io/)，并且自 2015 年以来，公开信任的证书颁发机构 (CA) 已不再颁发 SHA-1 证书。

<!-- crypto/x509 -->

#### [database/sql](/pkg/database/sql/)

<!-- CL 258360 -->
[`DB.Close`](/pkg/database/sql/#DB.Close) 方法现在会关闭 `connector` 字段，如果该字段的类型实现了 [`io.Closer`](/pkg/io/#Closer) 接口。

<!-- CL 311572 -->
新增的 [`NullInt16`](/pkg/database/sql/#NullInt16) 和 [`NullByte`](/pkg/database/sql/#NullByte) 结构体表示可能为 null 的 int16 和 byte 值。这些可以用作 [`Scan`](/pkg/database/sql/#Scan) 方法的目标，类似于 NullString。

<!-- database/sql -->

#### [debug/elf](/pkg/debug/elf/)

<!-- CL 239217 -->
新增了 [`SHT_MIPS_ABIFLAGS`](/pkg/debug/elf/#SHT_MIPS_ABIFLAGS) 常量。

<!-- debug/elf -->

#### [encoding/binary](/pkg/encoding/binary/)

<!-- CL 299531 -->
`binary.Uvarint` 在读取 `10 字节` 后将停止读取，以避免浪费计算。如果需要超过 `10 字节`，则返回的字节数为 `-11`。\
之前的 Go 版本在读取错误编码的 varint 时可能返回更大的负数计数。

<!-- encoding/binary -->

#### [encoding/csv](/pkg/encoding/csv/)

<!-- CL 291290 -->
新增的 [`Reader.FieldPos`](/pkg/encoding/csv/#Reader.FieldPos) 方法返回与 [`Read`](/pkg/encoding/csv/#Reader.Read) 最近返回的记录中给定字段起始位置对应的行和列。

<!-- encoding/csv -->

#### [encoding/xml](/pkg/encoding/xml/)

<!-- CL 277893 -->
当注释出现在 [`Directive`](/pkg/encoding/xml/#Directive) 内时，它现在会被替换为单个空格，而不是被完全省略。

带有前导、尾随或多个冒号的无效元素或属性名称现在将被原样存储到 [`Name.Local`](/pkg/encoding/xml/#Name) 字段中。

<!-- encoding/xml -->

#### [flag](/pkg/flag/)

<!-- CL 271788 -->
如果指定了无效的名称，标志声明现在会引发 panic。

<!-- flag -->

#### [go/build](/pkg/go/build/)

<!-- CL 310732 -->
新增的 [`Context.ToolTags`](/pkg/go/build/#Context.ToolTags) 字段包含适用于当前 Go 工具链配置的构建标签。

<!-- go/build -->

#### [go/format](/pkg/go/format/)

[`Source`](/pkg/go/format/#Source) 和 [`Node`](/pkg/go/format/#Node) 函数现在会将 `//go:build` 行与 `// +build` 行同步。如果文件只有 `// +build` 行，它们将被移动到文件中的适当位置，并添加匹配的 `//go:build` 行。否则，`// +build` 行将根据任何现有的 `//go:build` 行被覆盖。更多信息请参阅 [https://golang.org/design/draft-gobuild](/design/draft-gobuild)。

<!-- go/format -->

#### [go/parser](/pkg/go/parser/)<!-- CL 306149 -->
新的 [`SkipObjectResolution`](/pkg/go/parser/#SkipObjectResolution) `Mode` 值指示解析器不要将标识符解析到其声明。这可能会提高解析速度。

<!-- go/parser -->

#### [image](/pkg/image/)

<!-- CL 311129 -->
具体的图像类型（`RGBA`、`Gray16` 等）现在实现了新的 [`RGBA64Image`](/pkg/image/#RGBA64Image) 接口。先前实现了 [`draw.Image`](/pkg/image/draw/#Image) 的具体类型现在也实现了 [`draw.RGBA64Image`](/pkg/image/draw/#RGBA64Image)，这是 `image/draw` 包中的一个新接口。

<!-- image -->

#### [io/fs](/pkg/io/fs/)

<!-- CL 293649 -->
新的 [`FileInfoToDirEntry`](/pkg/io/fs/#FileInfoToDirEntry) 函数将 `FileInfo` 转换为 `DirEntry`。

<!-- io/fs -->

#### [math](/pkg/math/)

<!-- CL 247058 -->
math 包现在定义了三个额外的常量：`MaxUint`、`MaxInt` 和 `MinInt`。
对于 32 位系统，它们的值分别是 `2^32 - 1`、`2^31 - 1` 和 `-2^31`。
对于 64 位系统，它们的值分别是 `2^64 - 1`、`2^63 - 1` 和 `-2^63`。

<!-- math -->

#### [mime](/pkg/mime/)

<!-- CL 305230 -->
在 Unix 系统上，当本地系统存在 [Shared MIME-info Database](https://specifications.freedesktop.org/shared-mime-info-spec/shared-mime-info-spec-0.21.html) 时，MIME 类型表现在会从该数据库读取。

<!-- mime -->

#### [mime/multipart](/pkg/mime/multipart/)

<!-- CL 313809 -->
[`Part.FileName`](/pkg/mime/multipart/#Part.FileName) 现在会对返回值应用 [`filepath.Base`](/pkg/path/filepath/#Base)。这缓解了接受多部分消息的应用程序（例如调用 [`Request.FormFile`](/pkg/net/http/#Request.FormFile) 的 `net/http` 服务器）中潜在的路径遍历漏洞。

<!-- mime/multipart -->

#### [net](/pkg/net/)

<!-- CL 272668 -->
新方法 [`IP.IsPrivate`](/pkg/net/#IP.IsPrivate) 报告地址是否为根据 [RFC 1918](https://datatracker.ietf.org/doc/rfc1918) 定义的私有 IPv4 地址，或根据 [RFC 4193](https://datatracker.ietf.org/doc/rfc4193) 定义的本地 IPv6 地址。

<!-- CL 301709 -->
Go 的 DNS 解析器现在在解析仅限 IPv4 或仅限 IPv6 的网络地址时，只发送一个 DNS 查询，而不是查询两种地址族。

<!-- CL 307030 -->
哨兵错误 [`ErrClosed`](/pkg/net/#ErrClosed) 和错误类型 [`ParseError`](/pkg/net/#ParseError) 现在实现了 [`net.Error`](/pkg/net/#Error) 接口。

<!-- CL 325829 -->
[`ParseIP`](/pkg/net/#ParseIP) 和 [`ParseCIDR`](/pkg/net/#ParseCIDR) 函数现在拒绝包含前导零的十进制分量的 IPv4 地址。这些分量过去一直被解释为十进制，但某些操作系统会将它们解释为八进制。如果 Go 应用程序用于验证 IP 地址，而这些地址随后以其原始形式被非 Go 应用程序（解释为八进制）使用，这种不匹配理论上可能导致安全问题。通常，建议在验证后始终重新编码值，以避免此类解析器对齐问题。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 295370 -->
[`net/http`](/pkg/net/http/) 包现在在客户端或服务器执行 TLS 握手时，使用新的 [`(*tls.Conn).HandshakeContext`](/pkg/crypto/tls#Conn.HandshakeContext) 与 [`Request`](/pkg/net/http/#Request) 的上下文。

<!-- CL 235437 -->
将 [`Server`](/pkg/net/http/#Server) 的 `ReadTimeout` 或 `WriteTimeout` 字段设置为负值现在表示无超时，而不是立即超时。

<!-- CL 308952 -->
当请求包含多个 Host 头时，[`ReadRequest`](/pkg/net/http/#ReadRequest) 函数现在返回错误。

<!-- CL 313950 -->
当生成指向 URL 清理版本的重定向时，[`ServeMux`](/pkg/net/http/#ServeMux) 现在总是在 `Location` 头中使用相对 URL。先前它会回显请求的完整 URL，如果客户端可能被诱导发送绝对请求 URL，这可能导致非预期的重定向。

<!-- CL 308009, CL 313489 -->
在解释 `net/http` 处理的某些 HTTP 头时，非 ASCII 字符现在会被忽略或拒绝。

<!-- CL 325697 -->
如果 [`Request.ParseMultipartForm`](/pkg/net/http/#Request.ParseMultipartForm) 调用 [`Request.ParseForm`](/pkg/net/http/#Request.ParseForm) 时返回错误，后者现在会在返回前继续填充 [`Request.MultipartForm`](/pkg/net/http/#Request.MultipartForm)。

<!-- net/http -->

#### [net/http/httptest](/pkg/net/http/httptest/)

<!-- CL 308950 -->
当提供的状态码不是有效的三位 HTTP 状态码时，[`ResponseRecorder.WriteHeader`](/pkg/net/http/httptest/#ResponseRecorder.WriteHeader) 现在会触发恐慌。这与 [`net/http`](/pkg/net/http/) 包中 [`ResponseWriter`](/pkg/net/http/#ResponseWriter) 实现的行为一致。

<!-- net/http/httptest -->

#### [net/url](/pkg/net/url/)

<!-- CL 314850 -->
新方法 [`Values.Has`](/pkg/net/url/#Values.Has) 报告查询参数是否已设置。

<!-- net/url -->

#### [os](/pkg/os/)

<!-- CL 268020 -->
[`File.WriteString`](/pkg/os/#File.WriteString) 方法已优化，不再复制输入字符串。

<!-- os -->

#### [reflect](/pkg/reflect/)

<!-- CL 334669 -->
新的 [`Value.CanConvert`](/pkg/reflect/#Value.CanConvert) 方法报告值是否可以转换为指定类型。当将切片转换为数组指针类型且切片过短时，可使用此方法来避免恐慌。先前，使用 [`Type.ConvertibleTo`](/pkg/reflect/#Type.ConvertibleTo) 即可满足此需求，但新允许的从切片到数组指针类型的转换即使类型可转换也可能导致恐慌。<!-- CL 266197 -->
新的
[`StructField.IsExported`](/pkg/reflect/#StructField.IsExported)
和
[`Method.IsExported`](/pkg/reflect/#Method.IsExported)
方法用于报告结构体字段或类型方法是否已导出。
它们提供了一种比检查 `PkgPath` 是否为空更具可读性的替代方案。

<!-- CL 281233 -->
新的 [`VisibleFields`](/pkg/reflect/#VisibleFields) 函数
返回结构体类型中所有可见的字段，包括匿名结构体成员内部的字段。

<!-- CL 284136 -->
当使用负数长度调用时，
[`ArrayOf`](/pkg/reflect/#ArrayOf) 函数现在会引发恐慌。

<!-- CL 301652 -->
检查 [`Type.ConvertibleTo`](/pkg/reflect/#Type.ConvertibleTo) 方法
已不足以保证调用
[`Value.Convert`](/pkg/reflect/#Value.Convert) 不会引发恐慌。
当将 `[]T` 转换为 `*[N]T` 时，如果切片长度小于 N，则可能引发恐慌。
参见上方的 [语言变更](#language) 部分。

<!-- CL 309729 -->
[`Value.Convert`](/pkg/reflect/#Value.Convert) 和
[`Type.ConvertibleTo`](/pkg/reflect/#Type.ConvertibleTo) 方法
已修复，不再将不同包中同名的类型视为相同，
以匹配语言所允许的行为。

<!-- reflect -->

#### [runtime/metrics](/pkg/runtime/metrics)

<!-- CL 308933, CL 312431, CL 312909 -->
添加了新的指标，用于跟踪分配和释放的总字节数和对象数。
还添加了一个跟踪 goroutine 调度延迟分布的新指标。

<!-- runtime/metrics -->

#### [runtime/pprof](/pkg/runtime/pprof)

<!-- CL 299991 -->
阻塞性能分析不再偏向于低频长时间事件而非高频短时间事件。

<!-- runtime/pprof -->

#### [strconv](/pkg/strconv/)

<!-- CL 170079, CL 170080 -->
`strconv` 包现在使用 Ulf Adams 的 Ryū 算法来格式化浮点数。
该算法在大多数输入上提升了性能，在最差情况的输入上性能提升超过 99%。

<!-- CL 314775 -->
新的 [`QuotedPrefix`](/pkg/strconv/#QuotedPrefix) 函数
返回输入开头的带引号字符串（如
[`Unquote`](/pkg/strconv/#Unquote) 所理解的）。

<!-- strconv -->

#### [strings](/pkg/strings/)

<!-- CL 280492 -->
[`Builder.WriteRune`](/pkg/strings/#Builder.WriteRune) 方法
现在对负的 rune 值写入替换字符 U+FFFD，
与其对其他无效 rune 的处理方式一致。

<!-- strings -->

#### [sync/atomic](/pkg/sync/atomic/)

<!-- CL 241678 -->
`atomic.Value` 现在具有 [`Swap`](/pkg/sync/atomic/#Value.Swap) 和
[`CompareAndSwap`](/pkg/sync/atomic/#Value.CompareAndSwap) 方法，提供了
额外的原子操作。

<!-- sync/atomic -->

#### [syscall](/pkg/syscall/)

<!-- CL 295371 -->

[`GetQueuedCompletionStatus`](/pkg/syscall/#GetQueuedCompletionStatus) 和
[`PostQueuedCompletionStatus`](/pkg/syscall/#PostQueuedCompletionStatus)
函数现已弃用。这些函数签名不正确，并已被
[`golang.org/x/sys/windows`](https://godoc.org/golang.org/x/sys/windows) 包中的等效函数取代。

<!-- CL 313653 -->
在类 Unix 系统上，子进程的进程组现在在信号被阻塞的情况下设置。
这避免了当父进程位于后台进程组时向子进程发送 `SIGTTOU` 信号。

<!-- CL 288298, CL 288300 -->
Windows 版本的
[`SysProcAttr`](/pkg/syscall/#SysProcAttr)
有两个新字段。`AdditionalInheritedHandles` 是
一个新子进程将继承的额外句柄列表。`ParentProcess` 允许指定
新进程的父进程。

<!-- CL 311570 -->
常量 `MSG_CMSG_CLOEXEC` 现已在
DragonFly 和所有 OpenBSD 系统上定义（它此前已在
部分 OpenBSD 系统以及所有 FreeBSD、NetBSD 和 Linux 系统上定义）。

<!-- CL 315281 -->
常量 `SYS_WAIT6` 和 `WEXITED`
现已在 NetBSD 系统上定义（`SYS_WAIT6` 此前已在
DragonFly 和 FreeBSD 系统上定义；
`WEXITED` 此前已在 Darwin、DragonFly、
FreeBSD、Linux 和 Solaris 系统上定义）。

<!-- syscall -->

#### [testing](/pkg/testing/)

<!-- CL 310033 -->
添加了一个新的 [测试标志](/cmd/go/#hdr-Testing_flags) `-shuffle`，用于控制测试和基准测试的执行顺序。

<!-- CL 260577 -->
新的
[`T.Setenv`](/pkg/testing/#T.Setenv)
和 [`B.Setenv`](/pkg/testing/#B.Setenv)
方法支持在测试或基准测试期间设置环境变量。

<!-- testing -->

#### [text/template/parse](/pkg/text/template/parse/)

<!-- CL 301493 -->
新的 [`SkipFuncCheck`](/pkg/text/template/parse/#Mode) `Mode`
值将模板解析器更改为不验证函数是否已定义。

<!-- text/template/parse -->

#### [time](/pkg/time/)

<!-- CL 260858 -->
[`Time`](/pkg/time/#Time) 类型现在具有一个
[`GoString`](/pkg/time/#Time.GoString) 方法，
当使用 `fmt` 包中的 `%#v` 格式说明符打印时，该方法将为时间返回一个更有用的值。

<!-- CL 264077 -->
新的 [`Time.IsDST`](/pkg/time/#Time.IsDST) 方法可用于检查时间
在其配置的位置是否处于夏令时。

<!-- CL 293349 -->
新的 [`Time.UnixMilli`](/pkg/time/#Time.UnixMilli) 和
[`Time.UnixMicro`](/pkg/time/#Time.UnixMicro)
方法分别返回自 1970 年 1 月 1 日 UTC 以来经过的毫秒数和微秒数。
\
新的 [`UnixMilli`](/pkg/time/#UnixMilli) 和
[`UnixMicro`](/pkg/time/#UnixMicro) 函数
返回与给定 Unix 时间对应的本地 `Time`。

<!-- CL 300996 -->
该包现在在解析和格式化时间时接受逗号 "," 作为小数秒的分隔符。
例如，现在接受以下时间布局：

  - 2006-01-02 15:04:05,999999999 -0700 MST
  - Mon Jan \_2 15:04:05,000000 2006
  - Monday, January 2 15:04:05,000 2006

<!-- CL 320252 -->
新的常量 [`Layout`](/pkg/time/#Layout)
定义了参考时间。

<!-- time -->

#### [unicode](/pkg/unicode/)<!-- CL 280493 -->
函数 [`Is`](/pkg/unicode/#Is)、[`IsGraphic`](/pkg/unicode/#IsGraphic)、[`IsLetter`](/pkg/unicode/#IsLetter)、[`IsLower`](/pkg/unicode/#IsLower)、[`IsMark`](/pkg/unicode/#IsMark)、[`IsNumber`](/pkg/unicode/#IsNumber)、[`IsPrint`](/pkg/unicode/#IsPrint)、[`IsPunct`](/pkg/unicode/#IsPunct)、[`IsSpace`](/pkg/unicode/#IsSpace)、[`IsSymbol`](/pkg/unicode/#IsSymbol) 和 [`IsUpper`](/pkg/unicode/#IsUpper) 现在对于负值 rune（字符）返回 `false`，这与处理其他无效 rune 时的行为保持一致。

<!-- unicode -->