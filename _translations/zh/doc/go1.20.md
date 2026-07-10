---
path: /doc/go1.20
title: Go 1.20 版本说明
---

<!--
注意：在此目录下的本文档及其他文档中，约定是将固定宽度短语中的空格设为非固定宽度，如
`hello` `world`。
请勿提交移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.20 概述 {#introduction}

最新版 Go 发行版 1.20，距 [Go 1.19](/doc/go1.19) 发布六个月后推出。
其大部分变更集中在工具链、运行时和库的实现层面。
一如既往，此版本遵循 Go 1 [兼容性承诺](/doc/go1compat)。
我们预期几乎所有 Go 程序将继续像以前一样编译和运行。

## 语言变更 {#language}

Go 1.20 包含四项语言变更。

<!-- https://go.dev/issue/46505 -->
Go 1.17 新增了[从切片到数组指针的转换](/ref/spec#Conversions_from_slice_to_array_or_array_pointer)。
Go 1.20 扩展此特性，允许从切片转换为数组：
给定切片 `x`，现在可将 `[4]byte(x)` 写作
`*(*[4]byte)(x)` 的替代形式。

<!-- https://go.dev/issue/53003 -->
[`unsafe` 包](/ref/spec/#Package_unsafe) 新增了三个函数：
`SliceData`、`String` 和 `StringData`。
结合 Go 1.17 的 `Slice` 函数，这些功能现已能完整地
构造与解构切片和字符串值，且无需依赖其内部具体表示。

<!-- https://go.dev/issue/8606 -->
规范现已明确定义：结构体值的比较将逐字段进行，
按结构体类型定义中字段出现的顺序处理，
并在首个不匹配字段处停止比较。
此前规范可能被理解为：即使发现首个不匹配后，
仍需比较所有后续字段。
类似地，规范现在定义数组值的比较
按索引递增顺序逐个元素进行。
上述两处差异会影响特定比较是否必须触发 panic。
现有程序不受影响：新规范的措辞描述了
现有实现一贯的实际行为。

<!-- https://go.dev/issue/56548 -->
[可比较类型](/ref/spec#Comparison_operators)（如普通接口）
现在可满足 `comparable` 约束，即使类型实参
并非严格可比较（运行时比较可能 panic）。
这使得能够用非严格可比较的类型实参
（例如接口类型，或包含接口类型的复合类型）
实例化受 `comparable` 约束的类型参数
（例如用户定义泛型映射键的类型参数）。

## 平台支持 {#ports}

### Windows {#windows}

<!-- https://go.dev/issue/57003, https://go.dev/issue/57004 -->
Go 1.20 是支持 Windows 7、8、Server 2008 和 Server 2012 任意发行版的最后一个版本。
Go 1.21 将要求至少 Windows 10 或 Server 2016。

### Darwin 和 iOS {#darwin}

<!-- https://go.dev/issue/23011 -->
Go 1.20 是支持 macOS 10.13 High Sierra 或 10.14 Mojave 的最后一个版本。
Go 1.21 将要求 macOS 10.15 Catalina 或更高版本。

### FreeBSD/RISC-V {#freebsd-riscv}

<!-- https://go.dev/issue/53466 -->
Go 1.20 新增了对 RISC-V 架构上 FreeBSD 的实验性支持（`GOOS=freebsd`，`GOARCH=riscv64`）。

## 工具 {#tools}

### Go 命令 {#go-command}

<!-- CL 432535, https://go.dev/issue/47257 -->
目录 `$GOROOT/pkg` 不再存储
标准库的预编译包档案：
`go` `install` 不再写入这些文件，
`go` build 不再检查它们，
Go 发行版也不再包含它们。
取而代之的是，标准库中的包将按需构建
并缓存在构建缓存中，与 `GOROOT` 外的包处理方式一致。
此变更减小了 Go 发行版体积，同时
避免了使用 cgo 的包因 C 工具链差异导致的问题。

<!-- CL 448357: cmd/go: print test2json start events -->
`go` `test` `-json` 的实现
已得到改进，增强了健壮性。
运行 `go` `test` `-json` 的程序
无需任何更新。
直接调用 `go` `tool` `test2json`
的程序现在应使用 `-v=test2json` 运行测试二进制文件
（例如 `go` `test` `-v=test2json`
或 `./pkg.test` `-test.v=test2json`），
而非简单的 `-v`。

<!-- CL 448357: cmd/go: print test2json start events -->
与 `go` `test` `-json` 相关的另一变更是：
在每个测试程序执行开始时，新增一个 `Action` 字段为 `start` 的事件。
使用 `go` 命令运行多个测试时，
这些开始事件的发出顺序将保证
与命令行中指定的包顺序一致。

<!-- https://go.dev/issue/45454, CL 421434 -->
`go` 命令现已定义
架构特性构建标签（如 `amd64.v2`），
以便根据特定架构特性是否存在
来选择包实现文件。
详情请参阅 [`go` `help` `buildconstraint`](/cmd/go#hdr-Build_constraints)。

<!-- https://go.dev/issue/50332 -->
`go` 子命令现接受
`-C` `<dir>` 参数，可在执行命令前将工作目录切换至 \<dir\>，
这对需要在多个不同模块中执行命令的脚本可能很有用。

<!-- https://go.dev/issue/41696, CL 416094 -->
`go` `build` 和 `go` `test`
命令不再接受 `-i` 标志，
该标志[自 Go 1.16 起已弃用](/issue/41696)。

<!-- https://go.dev/issue/38687, CL 421440 -->
`go` `generate` 命令现接受
`-skip` `<pattern>` 参数，以跳过
与 `<pattern>` 匹配的 `//go:generate` 指令。

<!-- https://go.dev/issue/41583 -->
`go` `test` 命令现接受
`-skip` `<pattern>` 参数，以跳过
与 `<pattern>` 匹配的测试、子测试或示例。<!-- https://go.dev/issue/37015 -->
当主模块位于 `GOPATH/src` 内时，`go` `install` 不再将非 `main` 包的库安装到 `GOPATH/pkg`，并且 `go` `list` 不再为此类包报告 `Target` 字段。（在模块模式下，编译后的包仅存储在[构建缓存](https://pkg.go.dev/cmd/go#hdr-Build_and_test_caching)中，但[一个缺陷](/issue/37015)曾导致 `GOPATH` 安装目标意外生效。）

<!-- https://go.dev/issue/55022 -->
`go` `build`、`go` `install` 及其他构建相关命令现在支持 `-pgo` 标志，以启用配置文件引导优化，该优化在下面的[编译器](#compiler)部分有更详细的描述。`-pgo` 标志指定配置文件的文件路径。指定 `-pgo=auto` 会使得 `go` 命令在主包目录中搜索名为 `default.pgo` 的文件，并在找到时使用它。此模式当前要求在命令行中指定单个主包，但我们计划在未来的版本中取消此限制。指定 `-pgo=off` 可关闭配置文件引导优化。

<!-- https://go.dev/issue/51430 -->
`go` `build`、`go` `install` 及其他构建相关命令现在支持 `-cover` 标志，该标志构建指定目标时附带代码覆盖率检测。这在下面的[覆盖率](#cover)部分有更详细的描述。

#### `go` `version` {#go-version}

<!-- https://go.dev/issue/48187 -->
`go` `version` `-m` 命令现在支持读取更多类型的 Go 二进制文件，最值得注意的是，使用 `go` `build` `-buildmode=c-shared` 构建的 Windows DLL 以及没有执行权限的 Linux 二进制文件。

### Cgo {#cgo}

<!-- CL 450739 -->
`go` 命令现在在没有 C 工具链的系统上默认禁用 `cgo`。更具体地说，当 `CGO_ENABLED` 环境变量未设置、`CC` 环境变量未设置，且在路径中找不到默认的 C 编译器（通常是 `clang` 或 `gcc`）时，`CGO_ENABLED` 默认为 `0`。一如既往，您可以通过显式设置 `CGO_ENABLED` 来覆盖默认值。

此默认更改最重要的影响是，当 Go 安装在没有 C 编译器的系统上时，它现在将对标准库中使用 cgo 的包使用纯 Go 构建，而不是使用预分发的包存档（这些存档已如上所述被[移除](#go-command)）或尝试使用 cgo 并失败。这使得 Go 在某些最小化的容器环境以及 macOS 上运行得更好（自 Go 1.16 起，基于 cgo 的包在 macOS 上已不使用预分发的包存档）。

标准库中使用 cgo 的包是 [`net`](/pkg/net/)、[`os/user`](/pkg/os/user/) 和 [`plugin`](/pkg/plugin/)。在 macOS 上，`net` 和 `os/user` 包已被重写为不使用 cgo：相同的代码现在用于 cgo 和非 cgo 构建以及交叉编译构建。在 Windows 上，`net` 和 `os/user` 包从未使用过 cgo。在其他系统上，禁用 cgo 的构建将使用这些包的纯 Go 版本。

一个后果是，在 macOS 上，如果使用 `-buildmode=c-archive` 构建使用 `net` 包的 Go 代码，将生成的归档文件链接到 C 程序时，需要在链接 C 代码时传递 `-lresolv`。

在 macOS 上，竞态检测器已被重写为不使用 cgo：启用竞态检测的程序可以在没有 Xcode 的情况下构建和运行。在 Linux 和其他 Unix 系统以及 Windows 上，使用竞态检测器需要主机 C 工具链。

### Cover {#cover}

<!-- CL 436236, CL 401236, CL 438503 -->
Go 1.20 支持为程序（应用程序和集成测试）收集代码覆盖率配置文件，而不仅仅是单元测试。

要为程序收集覆盖率数据，请使用 `go` `build` 的 `-cover` 标志进行构建，然后通过将环境变量 `GOCOVERDIR` 设置为覆盖率配置文件的输出目录来运行生成的二进制文件。有关如何开始，请参阅[“集成测试的覆盖率”页面](/doc/build-cover)。有关设计和实现的详细信息，请参阅[提案](/issue/51430)。

### Vet {#vet}

#### 改进了对嵌套函数捕获循环变量的检测 {#vet-loopclosure}

<!-- CL 447256, https://go.dev/issue/55972: extend the loopclosure analysis to parallel subtests -->
`vet` 工具现在会报告在子测试函数体内调用 [`T.Parallel()`](/pkg/testing/#T.Parallel) 之后对循环变量的引用。此类引用可能观察到来自不同迭代的变量值（通常导致测试用例被跳过）或由于未同步的并发访问而导致的无效状态。

<!-- CL 452615 -->
该工具还在更多位置检测引用错误。以前它只考虑循环体的最后一条语句，但现在它会递归检查 if、switch 和 select 语句中的最后一条语句。

#### 关于不正确时间格式的新诊断 {#vet-timeformat}

<!-- CL 354010, https://go.dev/issue/48801: check for time formats with 2006-02-01 -->
vet 工具现在会报告在 [`Time.Format`](/pkg/time/#Time.Format) 和 [`time.Parse`](/pkg/time/#Parse) 中使用时间格式 2006-02-01（yyyy-dd-mm）。这种格式并未出现在常见的日期标准中，但在尝试使用 ISO 8601 日期格式（yyyy-mm-dd）时经常被误用。

## Runtime {#runtime}

<!-- CL 422634 -->
垃圾收集器的一些内部数据结构被重组，以提高空间和 CPU 效率。此更改减少了内存开销，并将整体 CPU 性能提高了最多 2%。

<!-- CL 417558, https://go.dev/issue/53892 -->
垃圾收集器在某些情况下关于 goroutine 辅助的行为变得不那么反复无常。

<!-- https://go.dev/issue/51430 -->
Go 1.20 添加了一个新的 `runtime/coverage` 包，其中包含用于从不通过 `os.Exit()` 终止的长时间运行和/或服务器程序在运行时写入覆盖率配置文件数据的 API。

## Compiler {#compiler}<!-- https://go.dev/issue/55022 -->
Go 1.20 增加了对配置引导优化（PGO）的预览支持。PGO 使工具链能够基于运行时的配置文件信息执行针对特定应用程序和负载的优化。目前，编译器支持 pprof CPU 配置文件，这些配置文件可以通过常规方式收集，例如使用 `runtime/pprof` 或 `net/http/pprof` 包。要启用 PGO，需要将 pprof 配置文件文件的路径通过 `-pgo` 标志传递给 `go` `build`，如[上文](#go-command)所述。Go 1.20 使用 PGO 在热点调用位置更积极地进行函数内联。对一组具有代表性的 Go 程序的基准测试表明，启用配置引导的内联优化可将性能提升约 3–4%。详细文档请参阅 [PGO 用户指南](/doc/pgo)。我们计划在未来的版本中添加更多配置引导优化。请注意，配置引导优化目前为预览版，请谨慎使用。

Go 1.20 编译器升级了其前端，使用一种新的方式处理编译器的内部数据，这修复了多个泛型类型问题，并支持在泛型函数和方法内部进行类型声明。

<!-- https://go.dev/issue/56103, CL 445598 -->
编译器现在默认会[拒绝匿名接口循环](/issue/56103)并报错。这类循环源于[嵌入接口](/ref/spec#Embedded_interfaces)的复杂用法，且一直存在微妙的正确性问题，但我们没有证据表明它们在实践中实际被使用。假设没有用户因这一更改受到负面影响的报告，我们计划在 Go 1.22 中更新语言规范以正式禁止它们，这样工具作者也可以停止支持它们。

<!-- https://go.dev/issue/49569 -->
Go 1.18 和 1.19 的构建速度有所下降，这主要是由于添加了泛型支持及后续工作。Go 1.20 将构建速度提高了最多 10%，使其恢复到与 Go 1.17 相当的水平。相对于 Go 1.19，生成的代码性能通常也略有提升。

## 链接器 {#linker}

<!-- https://go.dev/issue/54197, CL 420774 -->
在 Linux 上，链接器现在在链接时选择 `glibc` 或 `musl` 的动态解释器。

<!-- https://go.dev/issue/35006 -->
在 Windows 上，Go 链接器现在支持基于 LLVM 的现代 C 语言工具链。

<!-- https://go.dev/issue/37762, CL 317917 -->
Go 1.20 使用 `go:` 和 `type:` 前缀作为编译器生成的符号，而不是 `go.` 和 `type.`。这避免了对于名称以 `go.` 开头的用户包的混淆。 [`debug/gosym`](/pkg/debug/gosym) 包能够理解这种为 Go 1.20 及更高版本构建的二进制文件的新命名约定。

## 引导 {#bootstrap}

<!-- https://go.dev/issue/44505 -->
从源代码构建 Go 发行版且未设置 `GOROOT_BOOTSTRAP` 时，之前的 Go 版本会在目录 `$HOME/go1.4`（在 Windows 上是 `%HOMEDRIVE%%HOMEPATH%\go1.4`）中查找 Go 1.4 或更高版本的引导工具链。Go 1.18 和 Go 1.19 会首先在 `$HOME/go1.17` 或 `$HOME/sdk/go1.17` 中查找，然后才回退到 `$HOME/go1.4`，这是因为预期在引导 Go 1.20 时将需要使用 Go 1.17。Go 1.20 确实需要 Go 1.17 版本进行引导，但我们意识到应该采用引导工具链的最新补丁版本，因此它需要 Go 1.17.13。Go 1.20 会在回退到 `$HOME/go1.4` 之前查找 `$HOME/go1.17.13` 或 `$HOME/sdk/go1.17.13`（这是为了支持那些硬编码了路径 $HOME/go1.4 但安装了较新 Go 工具链的系统）。未来，我们计划大约每年向前推进一次引导工具链，特别地，我们预计 Go 1.22 将需要 Go 1.20 的最终补丁版本进行引导。

## 标准库 {#library}

### 新的 crypto/ecdh 包 {#crypto_ecdh}

<!-- https://go.dev/issue/52221, CL 398914, CL 450335, https://go.dev/issue/56052 -->
Go 1.20 添加了一个新的 [`crypto/ecdh`](/pkg/crypto/ecdh/) 包，用于为在 NIST 曲线和 Curve25519 上进行椭圆曲线迪菲-赫尔曼密钥交换提供显式支持。

程序应使用 `crypto/ecdh` 而不是 [`crypto/elliptic`](/pkg/crypto/elliptic/) 中更底层的功能来进行 ECDH 操作，对于更高级的用例，应使用第三方模块。

### 包装多个错误 {#errors}

<!-- CL 432898 -->
Go 1.20 扩展了对错误包装的支持，允许一个错误包装多个其他错误。

一个错误 `e` 可以通过提供一个返回 `[]error` 的 `Unwrap` 方法来包装多个错误。

[`errors.Is`](/pkg/errors/#Is) 和 [`errors.As`](/pkg/errors/#As) 函数已更新，以检查多重包装的错误。

[`fmt.Errorf`](/pkg/fmt/#Errorf) 函数现在支持多次出现 `%w` 格式动词，这将导致它返回一个包装了所有这些错误操作数的错误。

新函数 [`errors.Join`](/pkg/errors/#Join) 返回一个包装了错误列表的错误。

### HTTP ResponseController {#http_responsecontroller}

<!-- CL 436890, https://go.dev/issue/54136 -->
新的 [`"net/http".ResponseController`](/pkg/net/http/#ResponseController) 类型提供了对 [`"net/http".ResponseWriter`](/pkg/net/http/#ResponseWriter) 接口未处理的、扩展的每请求功能的访问。

以前，我们通过定义 `ResponseWriter` 可以实现的可选接口来添加新的每请求功能，例如 [`Flusher`](/pkg/net/http/#Flusher)。这些接口不易发现且使用起来很笨拙。

`ResponseController` 类型提供了一种更清晰、更易发现的方式来添加每处理器控制。Go 1.20 中添加的两个此类控制是 `SetReadDeadline` 和 `SetWriteDeadline`，它们允许设置每请求的读写截止时间。例如：

	func RequestHandler(w ResponseWriter, r *Request) {
	  rc := http.NewResponseController(w)
	  rc.SetWriteDeadline(time.Time{}) // 发送大型响应时禁用 Server.WriteTimeout
	  io.Copy(w, bigData)
	}

### 新的 ReverseProxy Rewrite 钩子 {#reverseproxy_rewrite}<!-- https://go.dev/issue/53002, CL 407214 -->
[`httputil.ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy)
转发代理新增了一个
[`Rewrite`](/pkg/net/http/httputil/#ReverseProxy.Rewrite)
钩子函数，取代了之前的 `Director` 钩子。

`Rewrite` 钩子接受一个
[`ProxyRequest`](/pkg/net/http/httputil/#ProxyRequest) 参数，
该参数同时包含代理收到的入站请求和即将发送的出站请求。
与仅操作出站请求的 `Director` 钩子不同，
这使得 `Rewrite` 钩子能够避免某些场景下，恶意入站请求可能导致钩子添加的头部信息在转发前被移除的问题。
参见 [issue #50580](/issue/50580)。

[`ProxyRequest.SetURL`](/pkg/net/http/httputil/#ProxyRequest.SetURL)
方法将出站请求路由到指定的目标地址，并取代了 `NewSingleHostReverseProxy` 函数。
与 `NewSingleHostReverseProxy` 不同，`SetURL`
还会设置出站请求的 `Host` 头部。

<!-- https://go.dev/issue/50465, CL 407414 -->
[`ProxyRequest.SetXForwarded`](/pkg/net/http/httputil/#ProxyRequest.SetXForwarded)
方法设置出站请求的 `X-Forwarded-For`、`X-Forwarded-Host`
和 `X-Forwarded-Proto` 头部。
当使用 `Rewrite` 时，默认不会添加这些头部。

一个使用这些特性的 `Rewrite` 钩子示例如下：

	proxyHandler := &httputil.ReverseProxy{
	  Rewrite: func(r *httputil.ProxyRequest) {
	    r.SetURL(outboundURL) // 将请求转发至 outboundURL。
	    r.SetXForwarded()     // 设置 X-Forwarded-* 头部。
	    r.Out.Header.Set("X-Additional-Header", "由代理设置的头部")
	  },
	}

<!-- CL 407375 -->
当入站请求没有 `User-Agent` 头部时，
[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 不再为转发的请求添加该头部。

### 库的次要变更 {#minor_library_changes}

一如既往，库中存在各种次要变更和更新，
这些都是基于 Go 1 [兼容性承诺](/doc/go1compat) 进行的。
还有一些性能改进，此处未逐一列出。

#### [archive/tar](/pkg/archive/tar/)

<!-- https://go.dev/issue/55356, CL 449937 -->
当设置环境变量 `GODEBUG=tarinsecurepath=0` 时，
[`Reader.Next`](/pkg/archive/tar/#Reader.Next) 方法
现在将为那些文件名是绝对路径、
引用当前目录之外的位置、包含无效字符
或（在 Windows 上）是保留名称（如 `NUL`）的条目返回错误 [`ErrInsecurePath`](/pkg/archive/tar/#ErrInsecurePath)。
Go 的未来版本可能会默认禁用不安全路径。

<!-- archive/tar -->

#### [archive/zip](/pkg/archive/zip/)

<!-- https://go.dev/issue/55356 -->
当设置环境变量 `GODEBUG=zipinsecurepath=0` 时，
[`NewReader`](/pkg/archive/zip/#NewReader) 现在在打开包含任何
文件名是绝对路径、引用当前目录之外的位置、包含无效字符
或（在 Windows 上）是保留名称（如 `NUL`）的归档文件时，将返回错误 [`ErrInsecurePath`](/pkg/archive/zip/#ErrInsecurePath)。
Go 的未来版本可能会默认禁用不安全路径。

<!-- CL 449955 -->
现在，从包含文件数据的目录文件中读取将返回错误。
zip 规范不允许目录文件包含文件数据，
因此此更改仅影响从无效归档文件中读取的情况。

<!-- archive/zip -->

#### [bytes](/pkg/bytes/)

<!-- CL 407176 -->
新增的
[`CutPrefix`](/pkg/bytes/#CutPrefix) 和
[`CutSuffix`](/pkg/bytes/#CutSuffix) 函数
类似于 [`TrimPrefix`](/pkg/bytes/#TrimPrefix)
和 [`TrimSuffix`](/pkg/bytes/#TrimSuffix)，
但还会报告字符串是否被修剪。

<!-- CL 359675, https://go.dev/issue/45038 -->
新增的 [`Clone`](/pkg/bytes/#Clone) 函数
分配一个字节切片的副本。

<!-- bytes -->

#### [context](/pkg/context/)

<!-- https://go.dev/issue/51365, CL 375977 -->
新增的 [`WithCancelCause`](/pkg/context/#WithCancelCause) 函数
提供了一种使用给定错误取消上下文的方法。
该错误可以通过调用新增的 [`Cause`](/pkg/context/#Cause) 函数来获取。

<!-- context -->

#### [crypto/ecdsa](/pkg/crypto/ecdsa/)

<!-- CL 353849 -->
在使用支持的曲线时，所有操作现在都在常量时间内实现。
这导致 CPU 时间增加了 5% 到 30%，主要影响 P-384 和 P-521。

<!-- https://go.dev/issue/56088, CL 450816 -->
新增的 [`PrivateKey.ECDH`](/pkg/crypto/ecdsa/#PrivateKey.ECDH) 方法
将 `ecdsa.PrivateKey` 转换为 `ecdh.PrivateKey`。

<!-- crypto/ecdsa -->

#### [crypto/ed25519](/pkg/crypto/ed25519/)

<!-- CL 373076, CL 404274, https://go.dev/issue/31804 -->
[`PrivateKey.Sign`](/pkg/crypto/ed25519/#PrivateKey.Sign) 方法
和 [`VerifyWithOptions`](/pkg/crypto/ed25519/#VerifyWithOptions) 函数
现在支持使用 Ed25519ph 对预哈希消息进行签名，
这通过返回 [`crypto.SHA512`](/pkg/crypto/#SHA512) 的
[`Options.HashFunc`](/pkg/crypto/ed25519/#Options.HashFunc) 来指示。
它们现在还支持带有上下文的 Ed25519ctx 和 Ed25519ph，
这通过设置新的
[`Options.Context`](/pkg/crypto/ed25519/#Options.Context)
字段来指示。

<!-- crypto/ed25519 -->

#### [crypto/rsa](/pkg/crypto/rsa/)

<!-- CL 418874, https://go.dev/issue/19974 -->
新增的字段 [`OAEPOptions.MGFHash`](/pkg/crypto/rsa/#OAEPOptions.MGFHash)
允许为 OAEP 解密单独配置 MGF1 哈希。<!-- https://go.dev/issue/20654 -->
crypto/rsa 现在使用一个新的、更安全的、常数时间后端。这导致解密操作的 CPU 运行时开销增加，增幅约为 15%（amd64 上的 RSA-2048）到 45%（arm64 上的 RSA-4096），在 32 位架构上增幅更大。加密操作的开销比之前慢大约 20 倍（但仍比解密快 5-10 倍）。预计性能将在未来的版本中得到改善。程序不得修改或手动生成 [`PrecomputedValues`](/pkg/crypto/rsa/#PrecomputedValues) 的字段。

<!-- crypto/rsa -->

#### [crypto/subtle](/pkg/crypto/subtle/)

<!-- https://go.dev/issue/53021, CL 421435 -->
新增的函数 [`XORBytes`](/pkg/crypto/subtle/#XORBytes) 将两个字节切片进行异或运算。

<!-- crypto/subtle -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 426455, CL 427155, CL 426454, https://go.dev/issue/46035 -->
解析后的证书现在在所有积极使用该证书的客户端之间共享。对于与服务器或共享部分证书链的服务器集合建立大量并发连接的程序，这可以显著节省内存。

<!-- https://go.dev/issue/48152, CL 449336 -->
对于因证书验证失败导致的握手失败，TLS 客户端和服务器现在返回新类型 [`CertificateVerificationError`](/pkg/crypto/tls/#CertificateVerificationError) 的错误，该错误包含所呈现的证书。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- CL 450816, CL 450815 -->
[`ParsePKCS8PrivateKey`](/pkg/crypto/x509/#ParsePKCS8PrivateKey) 和 [`MarshalPKCS8PrivateKey`](/pkg/crypto/x509/#MarshalPKCS8PrivateKey) 现在支持 [`*crypto/ecdh.PrivateKey`](/pkg/crypto/ecdh.PrivateKey) 类型的密钥。[`ParsePKIXPublicKey`](/pkg/crypto/x509/#ParsePKIXPublicKey) 和 [`MarshalPKIXPublicKey`](/pkg/crypto/x509/#MarshalPKIXPublicKey) 现在支持 [`*crypto/ecdh.PublicKey`](/pkg/crypto/ecdh.PublicKey) 类型的密钥。解析 NIST 曲线密钥仍然返回 `*ecdsa.PublicKey` 和 `*ecdsa.PrivateKey` 类型的值。使用它们新的 `ECDH` 方法可以转换为 `crypto/ecdh` 类型。

<!-- CL 449235 -->
新增的 [`SetFallbackRoots`](/pkg/crypto/x509/#SetFallbackRoots) 函数允许程序定义一组备用根证书，以防运行时无法使用操作系统验证器或标准平台根证书包。它最常与一个新包 [golang.org/x/crypto/x509roots/fallback](/pkg/golang.org/x/crypto/x509roots/fallback) 一起使用，该包将提供一个最新的根证书包。

<!-- crypto/x509 -->

#### [debug/elf](/pkg/debug/elf/)

<!-- CL 429601 -->
尝试使用 [`Section.Data`](/pkg/debug/elf/#Section.Data) 或 [`Section.Open`](/pkg/debug/elf/#Section.Open) 返回的读取器读取 `SHT_NOBITS` 节现在会返回错误。

<!-- CL 420982 -->
新增的 [`R_LARCH_*`](/pkg/debug/elf/#R_LARCH) 常量已定义，用于 LoongArch 系统。

<!-- CL 420982, CL 435415, CL 425555 -->
新增的 [`R_PPC64_*`](/pkg/debug/elf/#R_PPC64) 常量已定义，用于 PPC64 ELFv2 重定位。

<!-- CL 411915 -->
[`R_PPC64_SECTOFF_LO_DS`](/pkg/debug/elf/#R_PPC64_SECTOFF_LO_DS) 的常量值已更正，从 61 改为 62。

<!-- debug/elf -->

#### [debug/gosym](/pkg/debug/gosym/)

<!-- https://go.dev/issue/37762, CL 317917 -->
由于 [Go 的符号命名规范](#linker) 发生了变化，处理 Go 二进制文件的工具应使用 Go 1.20 的 `debug/gosym` 包，以便透明地处理新旧二进制文件。

<!-- debug/gosym -->

#### [debug/pe](/pkg/debug/pe/)

<!-- CL 421357 -->
新增的 [`IMAGE_FILE_MACHINE_RISCV*`](/pkg/debug/pe/#IMAGE_FILE_MACHINE_RISCV128) 常量已定义，用于 RISC-V 系统。

<!-- debug/pe -->

#### [encoding/binary](/pkg/encoding/binary/)

<!-- CL 420274 -->
[`ReadVarint`](/pkg/encoding/binary/#ReadVarint) 和 [`ReadUvarint`](/pkg/encoding/binary/#ReadVarint) 函数现在在读取部分值后将返回 `io.ErrUnexpectedEOF`，而不是 `io.EOF`。

<!-- encoding/binary -->

#### [encoding/xml](/pkg/encoding/xml/)

<!-- https://go.dev/issue/53346, CL 424777 -->
新增的 [`Encoder.Close`](/pkg/encoding/xml/#Encoder.Close) 方法可用于在编码完成时检查是否存在未关闭的元素。

<!-- CL 103875, CL 105636 -->
解码器现在拒绝包含多个冒号的元素和属性名称（例如 `<a:b:c>`），以及解析为空字符串的命名空间（例如 `xmlns:a=""`）。

<!-- CL 107255 -->
解码器现在拒绝在开始标签和结束标签中使用不同命名空间前缀的元素，即使这些前缀表示的是同一个命名空间。

<!-- encoding/xml -->

#### [errors](/pkg/errors/)

<!-- https://go.dev/issue/53435 -->
新增的 [`Join`](/pkg/errors/#Join) 函数返回一个包装了错误列表的错误。

<!-- errors -->

#### [fmt](/pkg/fmt/)

<!-- https://go.dev/issue/53435 -->
[`Errorf`](/pkg/fmt/#Errorf) 函数现在支持多次使用 `%w` 格式化动词，返回的错误可以展开为所有 `%w` 参数的列表。

<!-- https://go.dev/issue/51668, CL 400875 -->
新增的 [`FormatString`](/pkg/fmt/#FormatString) 函数可以恢复与 [`State`](/pkg/fmt/#State) 对应的格式化指令，这在 [`Formatter`](/pkg/fmt/#Formatter) 实现中可能很有用。

<!-- fmt -->

#### [go/ast](/pkg/go/ast/)

<!-- CL 426091, https://go.dev/issue/50429 -->
新增的 [`RangeStmt.Range`](/pkg/go/ast/#RangeStmt.Range) 字段记录了范围语句中 `range` 关键字的位置。

<!-- CL 427955, https://go.dev/issue/53202 -->
新增的 [`File.FileStart`](/pkg/go/ast/#File.FileStart) 和 [`File.FileEnd`](/pkg/go/ast/#File.FileEnd) 字段记录了整个源文件的起始和结束位置。

<!-- go/ast -->

#### [go/token](/pkg/go/token/)<!-- CL 410114, https://go.dev/issue/53200 -->
新增的 [`FileSet.RemoveFile`](/pkg/go/token/#FileSet.RemoveFile) 方法可从 `FileSet` 中移除一个文件。
长时间运行的程序可使用此方法来释放与不再需要的文件相关联的内存。

<!-- go/token -->

#### [go/types](/pkg/go/types/)

<!-- CL 454575 -->
新增的 [`Satisfies`](/pkg/go/types/#Satisfies) 函数报告一个类型是否满足某个约束。
此变更与[新的语言语义](#language)保持一致，该语义区分了满足约束与实现接口。

<!-- go/types -->

#### [html/template](/pkg/html/template/)

<!-- https://go.dev/issue/59153 -->
<!-- CL 481993 -->
Go 1.20.3 及更高版本
[禁止在 ECMAScript 6 模板字面量中执行动作。](/pkg/html/template#hdr-Security_Model)
此行为可通过设置 `GODEBUG=jstmpllitinterp=1` 来恢复。

<!-- html/template -->

#### [io](/pkg/io/)

<!-- https://go.dev/issue/45899, CL 406776 -->
新增的 [`OffsetWriter`](/pkg/io/#OffsetWriter) 包装了一个底层的
[`WriterAt`](/pkg/io/#WriterAt)，并提供 `Seek`、`Write` 和 `WriteAt` 方法，这些方法会将其有效的文件偏移位置调整一个固定量。

<!-- io -->

#### [io/fs](/pkg/io/fs/)

<!-- CL 363814, https://go.dev/issue/47209 -->
新增的错误值 [`SkipAll`](/pkg/io/fs/#SkipAll)
可立即并成功地终止一个 [`WalkDir`](/pkg/io/fs/#WalkDir) 操作。

<!-- io -->

#### [math/big](/pkg/math/big/)

<!-- https://go.dev/issue/52182 -->
[math/big](/pkg/math/big/) 包的广泛作用域和依赖于输入的执行时间使其不适合用于实现加密算法。
标准库中的加密包不再在攻击者控制的输入上调用非平凡的
[Int](/pkg/math/big#Int) 方法。
未来，math/big 中的某个错误是否被视为安全漏洞，将取决于它对标准库更广泛的影响。

<!-- math/big -->

#### [math/rand](/pkg/math/rand/)

<!-- https://go.dev/issue/54880, CL 436955, https://go.dev/issue/56319 -->
[math/rand](/pkg/math/rand/) 包现在会自动用一个随机值为全局随机数生成器（供 `Float64` 和 `Int` 等顶层函数使用）设定种子，并且顶层的 [`Seed`](/pkg/math/rand/#Seed) 函数已被弃用。
需要可重复随机数序列的程序应优先考虑分配自己的随机源，使用 `rand.New(rand.NewSource(seed))`。

需要早期一致的全局播种行为的程序，可以在其环境中设置 `GODEBUG=randautoseed=0`。

<!-- https://go.dev/issue/20661 -->
顶层的 [`Read`](/pkg/math/rand/#Read) 函数已被弃用。
在几乎所有情况下，使用 [`crypto/rand.Read`](/pkg/crypto/rand/#Read) 更为合适。

<!-- math/rand -->

#### [mime](/pkg/mime/)

<!-- https://go.dev/issue/48866 -->
[`ParseMediaType`](/pkg/mime/#ParseMediaType) 函数现在允许重复的参数名称，只要这些名称的值相同即可。

<!-- mime -->

#### [mime/multipart](/pkg/mime/multipart/)

<!-- CL 431675 -->
[`Reader`](/pkg/mime/multipart/#Reader) 类型的方法现在会包装底层 `io.Reader` 返回的错误。

<!-- https://go.dev/issue/59153 -->
<!-- CL 481985 -->
在 Go 1.19.8 及更高版本中，此包设置了对所处理 MIME 数据大小的限制，以防御恶意输入。
`Reader.NextPart` 和 `Reader.NextRawPart` 将一个部分（part）中的头部数量限制为 10000，`Reader.ReadForm` 将所有 `FileHeaders` 中的头部总数限制为 10000。
这些限制可通过 `GODEBUG=multipartmaxheaders` 设置进行调整。
`Reader.ReadForm` 进一步将表单中的部分数量限制为 1000。
此限制可通过 `GODEBUG=multipartmaxparts` 设置进行调整。

<!-- mime/multipart -->

#### [net](/pkg/net/)

<!-- https://go.dev/issue/50101, CL 446179 -->
[`LookupCNAME`](/pkg/net/#LookupCNAME) 函数现在在存在 `CNAME` 记录时始终返回其内容。之前在 Unix 系统和使用纯 Go 解析器时，如果 `CNAME` 记录指向一个没有 `A`、`AAAA` 或 `CNAME` 记录的名称，`LookupCNAME` 会返回错误。此更改使 `LookupCNAME` 行为与 Windows 上之前的行为保持一致，允许 `LookupCNAME` 在存在 `CNAME` 时就成功返回。

<!-- https://go.dev/issue/53482, CL 413454 -->
[`Interface.Flags`](/pkg/net/#Interface.Flags) 现在包含新的标志 `FlagRunning`，表示一个处于操作活跃状态的接口。一个已被管理配置但未激活（例如，因为网线未连接）的接口将设置 `FlagUp` 但不设置 `FlagRunning`。

<!-- https://go.dev/issue/55301, CL 444955 -->
新增的 [`Dialer.ControlContext`](/pkg/net/#Dialer.ControlContext) 字段包含一个回调函数，其作用类似于现有的 [`Dialer.Control`](/pkg/net/#Dialer.Control) 钩子，但额外接受拨号上下文作为参数。
当 `ControlContext` 不为 nil 时，将忽略 `Control`。

<!-- CL 428955 -->
Go DNS 解析器识别 `trust-ad` 解析器选项。
当在 `resolv.conf` 中设置了 `options trust-ad` 时，Go 解析器将在 DNS 查询中设置 AD 位。解析器不会利用响应中的 AD 位。

<!-- CL 448075 -->
DNS 解析现在会检测 `/etc/nsswitch.conf` 文件的更改，并在更改时重新加载该文件。检查间隔最多为五秒一次，这与之前对 `/etc/hosts` 和 `/etc/resolv.conf` 的处理方式保持一致。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- https://go.dev/issue/51914 -->
[`ResponseWriter.WriteHeader`](/pkg/net/http/#ResponseWriter.WriteHeader) 函数现在支持发送 `1xx` 状态码。

<!-- https://go.dev/issue/41773, CL 356410 -->
新增的 [`Server.DisableGeneralOptionsHandler`](/pkg/net/http/#Server.DisableGeneralOptionsHandler) 配置设置允许禁用默认的 `OPTIONS *` 处理器。<!-- https://go.dev/issue/54299, CL 447216 -->
新增的 [`Transport.OnProxyConnectResponse`](/pkg/net/http/#Transport.OnProxyConnectResponse) 钩子函数会在 `Transport` 从代理收到针对 `CONNECT` 请求的 HTTP 响应时被调用。

<!-- https://go.dev/issue/53960, CL 418614 -->
HTTP 服务器现在接受包含消息体的 HEAD 请求，而不是将其视为无效请求而拒绝。

<!-- https://go.dev/issue/53896 -->
`net/http` 函数返回的 HTTP/2 流错误现在可以使用 [`errors.As`](/pkg/errors/#As) 转换为 [`golang.org/x/net/http2.StreamError`](/pkg/golang.org/x/net/http2/#StreamError)。

<!-- https://go.dev/cl/397734 -->
现在会裁剪 Cookie 名称中的前导和尾随空格，而不是将其视为无效。例如，现在接受将 Cookie 设置为 `"name =value"`，并将其视为设置名为 `"name"` 的 Cookie。

<!-- https://go.dev/issue/52989 -->
现在认为 Expires 字段为空的 [`Cookie`](/pkg/net/http#Cookie) 是有效的。[`Cookie.Valid`](/pkg/net/http#Cookie.Valid) 仅在 Expires 字段被设置时才对其进行检查。

<!-- net/http -->

#### [net/netip](/pkg/net/netip/)

<!-- https://go.dev/issue/51766, https://go.dev/issue/51777, CL 412475 -->
新增的 [`IPv6LinkLocalAllRouters`](/pkg/net/netip/#IPv6LinkLocalAllRouters) 和 [`IPv6Loopback`](/pkg/net/netip/#IPv6Loopback) 函数是 [`net.IPv6loopback`](/pkg/net/#IPv6loopback) 和 [`net.IPv6linklocalallrouters`](/pkg/net/#IPv6linklocalallrouters) 的 `net/netip` 等效形式。

<!-- net/netip -->

#### [os](/pkg/os/)

<!-- CL 448897 -->
在 Windows 上，名称 `NUL` 在 [`Mkdir`](/pkg/os/#Mkdir) 和 [`Stat`](/pkg/os/#Stat) 中不再被视为特殊情况。

<!-- https://go.dev/issue/52747, CL 405275 -->
在 Windows 上，当文件是目录时，[`File.Stat`](/pkg/os/#File.Stat) 现在使用文件句柄来检索属性。此前，它使用的是传递给 [`Open`](/pkg/os/#Open) 的路径，如果文件已被移动或替换，该路径可能不再代表文件句柄对应的文件。此更改修改了 `Open` 以在不使用 `FILE_SHARE_DELETE` 访问权限的情况下打开目录，这与普通文件的行为一致。

<!-- https://go.dev/issue/36019, CL 405275 -->
在 Windows 上，[`File.Seek`](/pkg/os/#File.Seek) 现在支持将目录的偏移量定位到开头。

<!-- os -->

#### [os/exec](/pkg/os/exec/)

<!-- https://go.dev/issue/50436, CL 401835 -->
新增的 [`Cmd`](/pkg/os/exec/#Cmd) 字段 [`Cancel`](/pkg/os/exec/#Cmd.Cancel) 和 [`WaitDelay`](/pkg/os/exec/#Cmd.WaitDelay) 指定了当 `Cmd` 关联的 `Context` 被取消或其进程退出时，但子进程仍持有 I/O 管道打开时 `Cmd` 的行为。

<!-- os/exec -->

#### [path/filepath](/pkg/path/filepath/)

<!-- CL 363814, https://go.dev/issue/47209 -->
新增的错误 [`SkipAll`](/pkg/path/filepath/#SkipAll) 会立即终止 [`Walk`](/pkg/path/filepath/#Walk)，但视为成功结束。

<!-- https://go.dev/issue/56219, CL 449239 -->
新增的 [`IsLocal`](/pkg/path/filepath/#IsLocal) 函数用于报告一个路径在语法上是否相对于某个目录是局部的。例如，如果 `IsLocal(p)` 为 `true`，则 `Open(p)` 将指向一个在语法上位于以当前目录为根的子树内的文件。

<!-- io -->

#### [reflect](/pkg/reflect/)

<!-- https://go.dev/issue/46746, CL 423794 -->
新增的 [`Value.Comparable`](/pkg/reflect/#Value.Comparable) 和 [`Value.Equal`](/pkg/reflect/#Value.Equal) 方法可用于比较两个 `Value` 是否相等。`Comparable` 报告 `Equal` 对于给定的 `Value` 接收者是否为有效操作。

<!-- https://go.dev/issue/48000, CL 389635 -->
新增的 [`Value.Grow`](/pkg/reflect/#Value.Grow) 方法用于扩展切片，以保证为另外 `n` 个元素提供空间。

<!-- https://go.dev/issue/52376, CL 411476 -->
新增的 [`Value.SetZero`](/pkg/reflect/#Value.SetZero) 方法将值设置为其类型的零值。

<!-- CL 425184 -->
Go 1.18 引入了 [`Value.SetIterKey`](/pkg/reflect/#Value.SetIterKey) 和 [`Value.SetIterValue`](/pkg/reflect/#Value.SetIterValue) 方法。这些是优化版本：`v.SetIterKey(it)` 等同于 `v.Set(it.Key())`。这些实现不正确地省略了对未导出字段使用的检查，而未优化的版本中存在此检查。Go 1.20 修正了这些方法，加入了未导出字段检查。

<!-- reflect -->

#### [regexp](/pkg/regexp/)

<!-- CL 444817 -->
Go 1.19.2 和 Go 1.18.7 包含了对正则表达式解析器的安全修复，使其拒绝会消耗过多内存的大型表达式。由于 Go 补丁版本不引入新的 API，解析器在这种情况下返回 [`syntax.ErrInternalError`](/pkg/regexp/syntax/#ErrInternalError)。Go 1.20 添加了一个更具体的错误 [`syntax.ErrLarge`](/pkg/regexp/syntax/#ErrLarge)，解析器现在返回此错误来代替。

<!-- regexp -->

#### [runtime/cgo](/pkg/runtime/cgo/)

<!-- https://go.dev/issue/46731, CL 421879 -->
Go 1.20 新增了 [`Incomplete`](/pkg/runtime/cgo/#Incomplete) 标记类型。cgo 生成的代码将使用 `cgo.Incomplete` 来标记不完整的 C 类型。

<!-- runtime/cgo -->

#### [runtime/metrics](/pkg/runtime/metrics/)

<!-- https://go.dev/issue/47216, https://go.dev/issue/49881 -->
Go 1.20 新增了[支持的指标](/pkg/runtime/metrics/#hdr-Supported_metrics)，包括当前的 `GOMAXPROCS` 设置 (`/sched/gomaxprocs:threads`)、执行的 cgo 调用次数 (`/cgo/go-to-c-calls:calls`)、互斥锁总阻塞时间 (`/sync/mutex/wait/total:seconds`) 以及在垃圾回收上花费的时间的各种度量。

<!-- CL 427615 -->
基于时间的直方图指标现在精度较低，但占用的内存少得多。

<!-- runtime/metrics -->

#### [runtime/pprof](/pkg/runtime/pprof/)

<!-- CL 443056 -->
互斥锁配置文件样本现在是预先缩放的，修复了一个问题，即如果执行期间采样率发生变化，旧的互斥锁配置文件样本会被错误地缩放。<!-- CL 416975 -->
在 Windows 上收集的配置文件现在包含内存映射信息，这修复了位置无关二进制文件的符号化问题。

<!-- runtime/pprof -->

#### [runtime/trace](/pkg/runtime/trace/)

<!-- CL 447135, https://go.dev/issue/55022 -->
垃圾回收器的后台清扫器现在让出（yield）频率降低，导致执行跟踪中的额外事件大大减少。

<!-- runtime/trace -->

#### [strings](/pkg/strings/)

<!-- CL 407176, https://go.dev/issue/42537 -->
新的
[`CutPrefix`](/pkg/strings/#CutPrefix) 和
[`CutSuffix`](/pkg/strings/#CutSuffix) 函数
类似于 [`TrimPrefix`](/pkg/strings/#TrimPrefix)
和 [`TrimSuffix`](/pkg/strings/#TrimSuffix)，
但还会报告字符串是否被修剪。

<!-- strings -->

#### [sync](/pkg/sync/)

<!-- CL 399094, https://go.dev/issue/51972 -->
新的 [`Map`](/pkg/sync/#Map) 方法 [`Swap`](/pkg/sync/#Map.Swap)、
[`CompareAndSwap`](/pkg/sync/#Map.CompareAndSwap) 和
[`CompareAndDelete`](/pkg/sync/#Map.CompareAndDelete)
允许以原子方式更新现有的映射条目。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 411596 -->
在 FreeBSD 上，已移除兼容 FreeBSD 11 及更早版本所需的垫片。

<!-- CL 407574 -->
在 Linux 上，定义了额外的 [`CLONE_*`](/pkg/syscall/#CLONE_CLEAR_SIGHAND) 常量，用于 [`SysProcAttr.Cloneflags`](/pkg/syscall/#SysProcAttr.Cloneflags) 字段。

<!-- CL 417695 -->
在 Linux 上，新的 [`SysProcAttr.CgroupFD`](/pkg/syscall/#SysProcAttr.CgroupFD) 和 [`SysProcAttr.UseCgroupFD`](/pkg/syscall/#SysProcAttr.UseCgroupFD) 字段提供了一种将子进程置于特定 cgroup 中的方法。

<!-- syscall -->

#### [testing](/pkg/testing/)

<!-- https://go.dev/issue/43620, CL 420254 -->
新方法 [`B.Elapsed`](/pkg/testing/#B.Elapsed)
报告基准测试当前的经过时间，这对于计算使用 `ReportMetric` 报告的速率可能很有用。

<!-- https://go.dev/issue/48515, CL 352349 -->
从传递给 [`T.Cleanup`](/pkg/testing/#T.Cleanup) 的函数中调用 [`T.Run`](/pkg/testing/#T.Run) 从未有明确定义，现在将引发恐慌（panic）。

<!-- testing -->

#### [time](/pkg/time/)

<!-- https://go.dev/issue/52746, CL 412495 -->
新的时间布局常量 [`DateTime`](/pkg/time/#DateTime)、
[`DateOnly`](/pkg/time/#DateOnly) 和
[`TimeOnly`](/pkg/time/#TimeOnly)
为在公共 Go 源代码调查中最常用的三种布局字符串提供了名称。

<!-- CL 382734, https://go.dev/issue/50770 -->
新的 [`Time.Compare`](/pkg/time/#Time.Compare) 方法比较两个时间。

<!-- CL 425037 -->
[`Parse`](/pkg/time/#Parse) 现在会忽略输入中的亚纳秒精度，而不是将这些数字报告为错误。

<!-- CL 444277 -->
[`Time.MarshalJSON`](/pkg/time/#Time.MarshalJSON) 方法现在对遵循 RFC 3339 的要求更加严格。

<!-- time -->

#### [unicode/utf16](/pkg/unicode/utf16/)

<!-- https://go.dev/issue/51896, CL 409054 -->
新的 [`AppendRune`](/pkg/unicode/utf16/#AppendRune) 函数将给定 rune 的 UTF-16 编码附加到 uint16 切片上，类似于 [`utf8.AppendRune`](/pkg/unicode/utf8/#AppendRune)。

<!-- unicode/utf16 -->

<!-- 以下是不需要翻译的注释内容，用于标记特定版本或配置 -->
<!-- Silence false positives from x/build/cmd/relnote: -->
<!-- https://go.dev/issue/45964 was documented in Go 1.18 release notes but closed recently -->
<!-- https://go.dev/issue/52114 is an accepted proposal to add golang.org/x/net/http2.Transport.DialTLSContext; it's not a part of the Go release -->
<!-- CL 431335: cmd/api: make check pickier about api/*.txt -->
<!-- CL 447896 api: add newline to 55301.txt; modified api/next/55301.txt -->
<!-- CL 449215 api/next/54299: add missing newline; modified api/next/54299.txt -->
<!-- CL 433057 cmd: update vendored golang.org/x/tools for multiple error wrapping -->
<!-- CL 423362 crypto/internal/boring: update to newer boringcrypto, add arm64 -->
<!-- https://go.dev/issue/53481 x/cryptobyte ReadUint64, AddUint64 -->
<!-- https://go.dev/issue/51994 x/crypto/ssh -->
<!-- https://go.dev/issue/55358 x/exp/slices -->
<!-- https://go.dev/issue/54714 x/sys/unix -->
<!-- https://go.dev/issue/50035 https://go.dev/issue/54237 x/time/rate -->
<!-- CL 345488 strconv optimization -->
<!-- CL 428757 reflect deprecation, rolled back -->
<!-- https://go.dev/issue/49390 compile -l -N is fully supported -->
<!-- https://go.dev/issue/54619 x/tools -->
<!-- CL 448898 reverted -->
<!-- https://go.dev/issue/54850 x/net/http2 Transport.MaxReadFrameSize -->
<!-- https://go.dev/issue/56054 x/net/http2 SETTINGS_HEADER_TABLE_SIZE -->
<!-- CL 450375 reverted -->
<!-- CL 453259 tracking deprecations in api -->
<!-- CL 453260 tracking darwin port in api -->
<!-- CL 453615 fix deprecation comment in archive/tar -->
<!-- CL 453616 fix deprecation comment in archive/zip -->
<!-- CL 453617 fix deprecation comment in encoding/csv -->
<!-- https://go.dev/issue/54661 x/tools/go/analysis -->
<!-- CL 423359, https://go.dev/issue/51317 arena -->