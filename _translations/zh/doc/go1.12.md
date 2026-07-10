---
title: Go 1.12 发布说明
---

<!--
注意：在本文件及本目录的其他文件中，约定使用非固定宽度的空格来分隔固定宽度的短语，例如
`hello` `world`。
请勿提交移除此类短语内部标签的 CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.12 简介 {#introduction}

最新的 Go 版本 1.12 在 [Go 1.11](go1.11) 发布六个月后发布。
其大部分更改集中在工具链、运行时和库的实现上。
一如既往，该版本遵循 Go 1 的 [兼容性承诺](/doc/go1compat)。
我们预计几乎所有 Go 程序都能像以前一样继续编译和运行。

## 语言变更 {#language}

语言规范没有任何更改。

## 移植 {#ports}

<!-- CL 138675 -->
竞态检测器现已支持 `linux/arm64`。

Go 1.12 是支持 FreeBSD 10.x 的最后一个版本，该版本已停止维护。Go 1.13 将要求 FreeBSD 11.2+ 或 FreeBSD 12.0+。
FreeBSD 12.0+ 要求内核设置了 COMPAT\_FREEBSD11 选项（这是默认值）。

<!-- CL 146898 -->
cgo 现已支持 `linux/ppc64`。

<!-- CL 146023 -->
`hurd` 现已被识别为 `GOOS` 的值，为 GNU/Hurd 系统保留，与 `gccgo` 一起使用。

### Windows {#windows}

Go 新增的 `windows/arm` 移植支持在 Windows 10 IoT Core 上运行 Go，适用于 Raspberry Pi 3 等 32 位 ARM 芯片。

### AIX {#aix}

Go 现已支持 POWER8 架构上的 AIX 7.2 及更高版本（`aix/ppc64`）。目前尚不支持外部链接、cgo、pprof 和竞态检测器。

### Darwin {#darwin}

Go 1.12 是能在 macOS 10.10 Yosemite 上运行的最后一个版本。
Go 1.13 将要求 macOS 10.11 El Capitan 或更高版本。

<!-- CL 141639 -->
在 Darwin 上进行系统调用时现在使用 `libSystem`，确保了与未来版本的 macOS 和 iOS 的前向兼容性。 <!-- CL 153338 -->
切换到 `libSystem` 触发了 App Store 对私有 API 使用情况的额外检查。由于它被视为私有 API，
`syscall.Getdirentries` 现在在 iOS 上总是返回
`ENOSYS` 失败。
此外，[`syscall.Setrlimit`](/pkg/syscall/#Setrlimit)
在历史上成功的地方现在会报告 `invalid` `argument`。这些后果并非 Go 独有，用户应预期未来的行为将与 `libSystem` 的实现保持一致。

## 工具 {#tools}

### 不再支持 `go tool vet` {#vet}

`go vet` 命令已被重写，作为一系列不同源代码分析工具的基础。详见
[golang.org/x/tools/go/analysis](https://godoc.org/golang.org/x/tools/go/analysis)
包。一个副作用是 `go tool vet`
不再受支持。使用 `go tool
  vet` 的外部工具必须改为使用 `go
  vet`。使用 `go vet` 代替 `go tool
  vet` 应适用于所有受支持的 Go 版本。

作为此更改的一部分，实验性的 `-shadow` 选项
不再可用于 `go vet`。变量遮蔽检查现在可以通过以下方式完成

	go get -u golang.org/x/tools/go/analysis/passes/shadow/cmd/shadow
	go vet -vettool=$(which shadow)

### Tour {#tour}

<!-- CL 152657 -->
Go tour 不再包含在主要二进制发行版中。要在本地运行 tour，而不是运行 `go` `tool` `tour`，
请手动安装：

	go get -u golang.org/x/tour
	tour

### 构建缓存要求 {#gocache}

[构建缓存](/cmd/go/#hdr-Build_and_test_caching) 现在是必须的，这是朝着消除
`$GOPATH/pkg` 方向迈出的一步。设置环境变量
`GOCACHE=off` 将导致写入缓存的 `go` 命令失败。

### 仅二进制包 {#binary-only}

Go 1.12 是支持仅二进制包的最后一个版本。

### Cgo {#cgo}

Go 1.12 将把 C 类型 `EGLDisplay` 转换为 Go 类型 `uintptr`。
此更改类似于 Go 1.10 及更新版本处理 Darwin 的 CoreFoundation
和 Java 的 JNI 类型的方式。更多信息请参阅
[cgo 文档](/cmd/cgo/#hdr-Special_cases)。

<!-- CL 152657 -->
使用 Cgo 的包中不再接受经过修改的 C 名称。请改用 Cgo
名称。例如，使用文档中的 cgo 名称 `C.char`，
而不是 cgo 生成的经过修改的名称 `_Ctype_char`。

### 模块 {#modules}

<!-- CL 148517 -->
当 `GO111MODULE` 设置为 `on` 时，`go`
命令现在支持在模块目录外执行模块感知操作，
前提是这些操作不需要相对于
当前目录解析导入路径或显式编辑 `go.mod` 文件。
`go`&nbsp;`get`、
`go`&nbsp;`list` 和
`go`&nbsp;`mod`&nbsp;`download` 等命令的行为就好像在一个
初始需求为空的模块中。
在此模式下，`go`&nbsp;`env`&nbsp;`GOMOD` 报告
系统的空设备 (`/dev/null` 或 `NUL`)。

<!-- CL 146382 -->
下载和解压模块的 `go` 命令现在可以安全地并发调用。
模块缓存 (`GOPATH/pkg/mod`) 必须位于支持文件锁定的文件系统上。

<!-- CL 147282, 147281 -->
`go.mod` 文件中的 `go` 指令现在表示
该模块内文件使用的语言版本。
如果不存在现有版本，它将被设置为当前发布版本
（`go`&nbsp;`1.12`）。
如果某个模块的 `go` 指令指定的版本比正在使用的工具链更新，`go` 命令
仍将尝试构建包，并且仅在构建失败时才会注意到不匹配。

<!-- CL 147282, 147281 -->
`go` 指令用途的这种更改意味着，如果你
使用 Go 1.12 构建模块，从而在 `go.mod` 文件中记录 `go 1.12`，
当你尝试使用 Go 1.11 到 Go 1.11.3 构建同一模块时，你会得到一个错误。
Go 1.11.4 或更高版本可以正常工作，比 Go 1.11 更早的版本也可以。
如果你必须使用 Go 1.11 到 1.11.3，可以通过使用 Go 1.12 的 go 工具
将语言版本设置为 1.11 来避免此问题，命令为 `go mod edit -go=1.11`。<!-- CL 152739 -->
当使用当前活跃模块无法解析导入时，`go` 命令现在会在查询模块缓存和常规网络源之前，先尝试使用主模块 `replace` 指令中指定的模块。如果找到匹配的替换但 `replace` 指令未指定版本，`go` 命令将使用基于零值 `time.Time` 生成的伪版本（例如 `v0.0.0-00010101000000-000000000000`）。

### 编译器工具链 {#compiler}

<!-- CL 134155, 134156 -->
编译器的活跃变量分析已得到改进。这可能意味着在此版本中，析构函数（finalizers）将比之前版本更早执行。若此行为引发问题，请考虑适当添加 [`runtime.KeepAlive`](/pkg/runtime/#KeepAlive) 调用。

<!-- CL 147361 -->
更多函数现已被默认纳入内联候选范围，包括那些仅调用其他函数而无其他操作的函数。这种额外的内联使得使用 [`runtime.CallersFrames`](/pkg/runtime/#CallersFrames) 比直接遍历 [`runtime.Callers`](/pkg/runtime/#Callers) 的结果更为重要。```
// 旧版代码已无法正常工作（会丢失内联调用栈帧）。
var pcs [10]uintptr
n := runtime.Callers(1, pcs[:])
for _, pc := range pcs[:n] {
	f := runtime.FuncForPC(pc)
	if f != nil {
		fmt.Println(f.Name())
	}
}
``````go
// 新代码，可以正常工作。
var pcs [10]uintptr
n := runtime.Callers(1, pcs[:])
frames := runtime.CallersFrames(pcs[:n])
for {
	frame, more := frames.Next()
	fmt.Println(frame.Function)
	if !more {
		break
	}
}
```<!-- CL 153477 -->
编译器为实现方法表达式而生成的包装器，将不再被 [`runtime.CallersFrames`](/pkg/runtime/#CallersFrames) 和 [`runtime.Stack`](/pkg/runtime/#Stack) 报告。它们也不会在恐慌堆栈跟踪中被打印出来。此变更使得 `gc` 工具链与 `gccgo` 工具链保持一致，后者已经在堆栈跟踪中省略了此类包装器。这些 API 的客户端可能需要调整以适应丢失的帧。对于必须在 1.11 和 1.12 版本之间互操作的代码，可以将方法表达式 `x.M` 替换为函数字面量 `func (...) { x.M(...) }`。

<!-- CL 144340 -->
编译器现在接受 `-lang` 标志来设置要使用的 Go 语言版本。例如，`-lang=go1.8` 会在程序使用 Go 1.9 中添加的类型别名时导致编译器报错。Go 1.12 之前的语言变更并未得到一致性强制执行。

<!-- CL 147160 -->
编译器工具链现在使用不同的约定来调用 Go 函数和汇编函数。这对用户通常是不可见的，除非调用同时跨越 Go 和汇编_以及_跨越包边界。如果链接导致类似 "relocation target not defined for ABIInternal (but is defined for ABI0)" 的错误，请参考 ABI 设计文档的[兼容性部分](https://github.com/golang/proposal/blob/master/design/27539-internal-abi.md#compatibility)。

<!-- CL 145179 -->
编译器生成的 DWARF 调试信息已有许多改进，包括参数打印和变量位置信息的改进。

<!-- CL 61511 -->
Go 程序现在也在 `linux/arm64` 上维护栈帧指针，以便于 `perf` 等分析工具使用。栈帧指针维护会带来小幅运行时开销，开销各异但平均约为 3%。要构建不使用栈帧指针的工具链，请在运行 `make.bash` 时设置 `GOEXPERIMENT=noframepointer`。

<!-- CL 142717 -->
过时的 "安全" 编译器模式（通过 `-u` gcflag 启用）已被移除。

### `godoc` 和 `go` `doc` {#godoc}

在 Go 1.12 中，`godoc` 不再具有命令行界面，仅作为 Web 服务器运行。用户应改用 `go` `doc` 获取命令行帮助输出。Go 1.12 是最后一个包含 `godoc` Web 服务器的版本；在 Go 1.13 中，它将通过 `go` `get` 提供。

<!-- CL 141977 -->
`go` `doc` 现在支持 `-all` 标志，该标志会使其打印所有导出的 API 及其文档，就像以前 `godoc` 命令行所做的那样。

<!-- CL 140959 -->
`go` `doc` 还新增了 `-src` 标志，该标志将显示目标的源代码。

### Trace {#trace}

<!-- CL 60790 -->
trace 工具现在支持绘制 mutator 利用率曲线，并包括对执行跟踪的交叉引用。这对于分析垃圾回收器对应用延迟和吞吐量的影响非常有用。

### 汇编器 {#assembler}

<!-- CL 147218 -->
在 `arm64` 上，平台寄存器已从 `R18` 重命名为 `R18_PLATFORM` 以防止意外使用，因为操作系统可能会选择保留该寄存器。

## 运行时 {#runtime}

<!-- CL 138959 -->
Go 1.12 显著提升了当堆中大部分空间仍存活时的清扫性能。这降低了垃圾回收后的分配延迟。

<!-- CL 139719 -->
Go 运行时现在更积极地将内存释放回操作系统，尤其是在处理无法重用现有堆空间的大型分配时。

<!-- CL 146342, CL 146340, CL 146345, CL 146339, CL 146343, CL 146337, CL 146341, CL 146338 -->
Go 运行时的定时器和截止时间代码速度更快，并且在 CPU 数量较多时扩展性更好。具体而言，这提升了操作网络连接截止时间的性能。

<!-- CL 135395 -->
在 Linux 上，运行时现在使用 `MADV_FREE` 来释放未使用的内存。这效率更高，但可能导致报告的 RSS 更高。当需要时，内核将回收未使用的数据。要恢复到 Go 1.11 的行为（`MADV_DONTNEED`），请设置环境变量 `GODEBUG=madvdontneed=1`。

<!-- CL 149578 -->
在 [GODEBUG](/doc/diagnostics.html#godebug) 环境变量中添加 `cpu._extension_=off` 现在可以禁用标准库和运行时中可选的 CPU 指令集扩展的使用。此功能在 Windows 上尚不支持。

<!-- CL 158337 -->
Go 1.12 通过修复大型堆分配的重复计数问题，提高了内存配置文件的准确性。

<!-- CL 159717 -->
堆栈回溯、`runtime.Caller` 和 `runtime.Callers` 不再包含编译器生成的初始化函数。在全局变量初始化期间执行堆栈回溯现在将显示一个名为 `PKG.init.ializers` 的函数。

## 标准库 {#library}

### TLS 1.3 {#tls_1_3}

Go 1.12 在 `crypto/tls` 包中添加了对 TLS 1.3 的可选支持，如 [RFC 8446](https://www.rfc-editor.org/info/rfc8446) 所规定。可以通过将值 `tls13=1` 添加到 `GODEBUG` 环境变量来启用它。该功能将在 Go 1.13 中默认启用。

要协商 TLS 1.3，请确保不要在 [`Config`](/pkg/crypto/tls/#Config) 中设置显式的 `MaxVersion`，并在设置环境变量 `GODEBUG=tls13=1` 的情况下运行程序。

除了 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 中的 `TLSUnique` 和重新协商外，所有 TLS 1.2 功能在 TLS 1.3 中均可用，并提供同等或更好的安全性和性能。请注意，尽管 TLS 1.3 向后兼容先前的版本，但某些旧系统在尝试协商它时可能无法正常工作。过小而不安全的 RSA 证书密钥（包括 512 位密钥）将无法与 TLS 1.3 配合使用。

TLS 1.3 密码套件不可配置。所有支持的密码套件都是安全的，如果 [`Config`](/pkg/crypto/tls/#Config) 中设置了 `PreferServerCipherSuites`，则优先顺序基于可用的硬件。当前不支持作为客户端或服务器使用提前数据（也称为"0-RTT 模式"）。此外，Go 1.12 服务器不支持在客户端发送意外提前数据时跳过它。由于 TLS 1.3 的 0-RTT 模式涉及客户端记录哪些服务器支持 0-RTT 的状态，因此 Go 1.12 服务器无法作为负载均衡池的一部分，如果池中的某些其他服务器支持 0-RTT 的话。如果将一个域名从支持 0-RTT 的服务器切换到 Go 1.12 服务器，则必须在切换前至少禁止 0-RTT 一个已签发会话票据的生命周期，以确保不间断运行。

在 TLS 1.3 中，客户端是握手中最后一个发言方，因此如果它导致服务器上发生错误，该错误将通过客户端首次执行 [`Read`](/pkg/crypto/tls/#Conn.Read) 时返回，而不是通过 [`Handshake`](/pkg/crypto/tls/#Conn.Handshake) 返回。例如，如果服务器拒绝客户端证书，就会出现这种情况。同样，会话票据现在是握手后的消息，因此客户端只能通过其首次 [`Read`](/pkg/crypto/tls/#Conn.Read) 来接收它们。

### 库的细微变更 {#minor_library_changes}

一如既往，库中存在各种细微的变更和更新，这些变更都考虑到了 Go 1 的[兼容性承诺](/doc/go1compat)。

<!-- TODO: CL 115677: https://golang.org/cl/115677: cmd/vet: check embedded field tags too -->

#### [bufio](/pkg/bufio/)

<!-- CL 149297 -->
`Reader` 的 [`UnreadRune`](/pkg/bufio/#Reader.UnreadRune) 和 [`UnreadByte`](/pkg/bufio/#Reader.UnreadByte) 方法现在如果在调用 [`Peek`](/pkg/bufio/#Reader.Peek) 之后被调用，将会返回一个错误。

<!-- bufio -->

#### [bytes](/pkg/bytes/)

<!-- CL 137855 -->
新函数 [`ReplaceAll`](/pkg/bytes/#ReplaceAll) 返回一个字节切片的副本，其中所有不重叠的值实例都被替换为另一个值。

<!-- CL 145098 -->
一个指向零值 [`Reader`](/pkg/bytes/#Reader) 的指针现在在功能上等同于 [`NewReader`](/pkg/bytes/#NewReader)`(nil)`。在 Go 1.12 之前，前者在所有情况下都不能替代后者。

<!-- bytes -->

#### [crypto/rand](/pkg/crypto/rand/)

<!-- CL 139419 -->
现在，如果 `Reader.Read` 在等待从内核读取熵时被阻塞超过 60 秒，第一次发生时将会打印一条警告到标准错误输出。

<!-- CL 120055 -->
在 FreeBSD 上，`Reader` 现在如果可用则使用 `getrandom` 系统调用，否则使用 `/dev/urandom`。

<!-- crypto/rand -->

#### [crypto/rc4](/pkg/crypto/rc4/)

<!-- CL 130397 -->
此版本移除了汇编实现，仅保留纯 Go 版本。Go 编译器生成的代码可能稍好或稍差，具体取决于具体的 CPU。RC4 是不安全的，应仅用于与遗留系统的兼容性。

<!-- crypto/rc4 -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 143177 -->
如果客户端发送的初始消息看起来不像 TLS，服务器将不再回复警报，并且它将在 [`RecordHeaderError`](/pkg/crypto/tls/#RecordHeaderError) 的新字段 `Conn` 中暴露底层的 `net.Conn`。

<!-- crypto/tls -->

#### [database/sql](/pkg/database/sql/)

<!-- CL 145738 -->
现在可以通过将 [`*Rows`](/pkg/database/sql/#Rows) 值传递给 [`Row.Scan`](/pkg/database/sql/#Row.Scan) 方法来获取查询游标。

<!-- database/sql -->

#### [expvar](/pkg/expvar/)

<!-- CL 139537 -->
新的 [`Delete`](/pkg/expvar/#Map.Delete) 方法允许从 [`Map`](/pkg/expvar/#Map) 中删除键/值对。

<!-- expvar -->

#### [fmt](/pkg/fmt/)

<!-- CL 142737 -->
映射现在按键排序的顺序打印，以便于测试。排序规则如下：
  - 适用时，nil 排在前面
  - 整数、浮点数和字符串按 `<` 排序
  - NaN 比非 NaN 浮点数小
  - 布尔值 false 排在 true 之前
  - 复数先比较实部，再比较虚部
  - 指针按机器地址比较
  - 通道（Channel）值按机器地址比较
  - 结构体（Struct）依次比较每个字段
  - 数组依次比较每个元素
  - 接口（Interface）值先按描述具体类型的 `reflect.Type` 比较，然后按上述规则描述的具体值比较。

<!-- CL 129777 -->
以前在打印映射时，像 `NaN` 这样的非自反性键值被显示为 `<nil>`。从这个版本开始，将打印正确的值。

<!-- fmt -->

#### [go/doc](/pkg/go/doc/)

<!-- CL 140958 -->
为了解决 [`cmd/doc`](/cmd/doc/) 中一些遗留问题，此包增加了一个新的 [`Mode`](/pkg/go/doc/#Mode) 位 `PreserveAST`，用于控制是否清除 AST 数据。

<!-- go/doc -->

#### [go/token](/pkg/go/token/)

<!-- CL 134075 -->
[`File`](/pkg/go/token#File) 类型增加了一个新的 [`LineStart`](/pkg/go/token#File.LineStart) 字段，该字段返回给定行的起始位置。这对于偶尔处理非 Go 文件（如汇编）但希望使用 `token.Pos` 机制来识别文件位置的程序特别有用。

<!-- go/token -->

#### [image](/pkg/image/)

<!-- CL 118755 -->
[`RegisterFormat`](/pkg/image/#RegisterFormat) 函数现在支持并发使用。

<!-- image -->

#### [image/png](/pkg/image/png/)

<!-- CL 134235 -->
少于 16 种颜色的调色板图像现在编码后的输出更小。

<!-- image/png -->

#### [io](/pkg/io/)

<!-- CL 139457 -->
新的 [`StringWriter`](/pkg/io#StringWriter) 接口封装了 [`WriteString`](/pkg/io/#WriteString) 函数。

<!-- io -->

#### [math](/pkg/math/)

<!-- CL 153059 -->
函数
[`Sin`](/pkg/math/#Sin)、
[`Cos`](/pkg/math/#Cos)、
[`Tan`](/pkg/math/#Tan)
和 [`Sincos`](/pkg/math/#Sincos) 现在对巨大的参数应用 Payne-Hanek 范围缩减。这会产生更准确的结果，但它们与早期版本中的结果不会逐位一致。

<!-- math -->

#### [math/bits](/pkg/math/bits/)<!-- CL 123157 -->
新的扩展精度运算 [`Add`](/pkg/math/bits/#Add)、[`Sub`](/pkg/math/bits/#Sub)、[`Mul`](/pkg/math/bits/#Mul) 和 [`Div`](/pkg/math/bits/#Div) 现已提供 `uint`、`uint32` 和 `uint64` 版本。

<!-- math/bits -->

#### [net](/pkg/net/)

<!-- CL 146659 -->
[`Dialer.DualStack`](/pkg/net/#Dialer.DualStack) 设置现已忽略并被弃用；
RFC 6555 快速回退（"Happy Eyeballs"）现已默认启用。要禁用此功能，请将 [`Dialer.FallbackDelay`](/pkg/net/#Dialer.FallbackDelay) 设置为负值。

<!-- CL 107196 -->
类似地，如果 [`Dialer.KeepAlive`](/pkg/net/#Dialer.KeepAlive) 为零，TCP keep-alive 现已默认启用。
要禁用，请将其设置为负值。

<!-- CL 113997 -->
在 Linux 上，当从 [`UnixConn`](/pkg/net/#UnixConn) 复制到 [`TCPConn`](/pkg/net/#TCPConn) 时，现在会使用 [`splice 系统调用`](https://man7.org/linux/man-pages/man2/splice.2.html)。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 143177 -->
HTTP 服务器现在会以纯文本 "400 Bad Request" 响应拒绝错误指向 HTTPS 服务器的 HTTP 请求。

<!-- CL 130115 -->
新的 [`Client.CloseIdleConnections`](/pkg/net/http/#Client.CloseIdleConnections) 方法会调用 `Client` 底层 `Transport` 的 `CloseIdleConnections`（如果存在的话）。

<!-- CL 145398 -->
[`Transport`](/pkg/net/http/#Transport) 不再拒绝那些声明了 HTTP Trailers 但未使用分块编码的 HTTP 响应。现在，已声明的 trailers 会被直接忽略。

<!-- CL 152080 -->
<!-- CL 151857 -->
[`Transport`](/pkg/net/http/#Transport) 对 HTTP/2 服务器公布的 `MAX_CONCURRENT_STREAMS` 值的处理方式不再像 Go 1.10 和 Go 1.11 期间那样严格。现在的默认行为已恢复到 Go 1.9 的状态：与服务器的每个连接最多可以有 `MAX_CONCURRENT_STREAMS` 个活跃请求，然后根据需要创建新的 TCP 连接。在 Go 1.10 和 Go 1.11 中，`http2` 包会阻塞并等待请求完成，而不是创建新连接。
要恢复更严格的行为，请直接导入 [`golang.org/x/net/http2`](https://godoc.org/golang.org/x/net/http2) 包，并将 [`Transport.StrictMaxConcurrentStreams`](https://godoc.org/golang.org/x/net/http2#Transport.StrictMaxConcurrentStreams) 设置为 `true`。

<!-- net/http -->

#### [net/url](/pkg/net/url/)

<!-- CL 159157, CL 160178 -->
[`Parse`](/pkg/net/url/#Parse)、[`ParseRequestURI`](/pkg/net/url/#ParseRequestURI) 和 [`URL.Parse`](/pkg/net/url/#URL.Parse) 现在会对包含 ASCII 控制字符（包括 NULL、制表符和换行符）的 URL 返回错误。

<!-- net/url -->

#### [net/http/httputil](/pkg/net/http/httputil/)

<!-- CL 146437 -->
[`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 现在可以自动代理 WebSocket 请求。

<!-- net/http/httputil -->

#### [os](/pkg/os/)

<!-- CL 125443 -->
新的 [`ProcessState.ExitCode`](/pkg/os/#ProcessState.ExitCode) 方法返回进程的退出码。

<!-- CL 135075 -->
`ModeCharDevice` 已被添加到 `ModeType` 位掩码中，使得在用 `ModeType` 掩码 [`FileMode`](/pkg/os/#FileMode) 时可以恢复 `ModeDevice | ModeCharDevice`。

<!-- CL 139418 -->
新的函数 [`UserHomeDir`](/pkg/os/#UserHomeDir) 返回当前用户的主目录。

<!-- CL 146020 -->
[`RemoveAll`](/pkg/os/#RemoveAll) 现在在大多数 Unix 系统上支持超过 4096 个字符的路径。

<!-- CL 130676 -->
[`File.Sync`](/pkg/os/#File.Sync) 现在在 macOS 上使用 `F_FULLFSYNC` 来正确地将文件内容刷新到永久存储。
这可能导致该方法比之前的版本运行得更慢。

<!--CL 155517 -->
[`File`](/pkg/os/#File) 现在支持 [`SyscallConn`](/pkg/os/#File.SyscallConn) 方法，该方法返回一个 [`syscall.RawConn`](/pkg/syscall/#RawConn) 接口值。这可用于对底层文件描述符执行特定于系统的操作。

<!-- os -->

#### [path/filepath](/pkg/path/filepath/)

<!-- CL 145220 -->
[`IsAbs`](/pkg/path/filepath/#IsAbs) 函数现在在 Windows 上传递保留文件名（例如 `NUL`）时返回 true。
[保留名称列表。](https://docs.microsoft.com/en-us/windows/desktop/fileio/naming-a-file#naming-conventions)

<!-- path/filepath -->

#### [reflect](/pkg/reflect/)

<!-- CL 33572 -->
新增 [`MapIter`](/pkg/reflect#MapIter) 类型，这是一个用于遍历 map 的迭代器。该类型通过 [`Value`](/pkg/reflect#Value) 类型的新方法 [`MapRange`](/pkg/reflect#Value.MapRange) 暴露。
它遵循与 range 语句相同的迭代语义，使用 `Next` 推进迭代器，使用 `Key`/`Value` 访问每个条目。

<!-- reflect -->

#### [regexp](/pkg/regexp/)

<!-- CL 139784 -->
[`Copy`](/pkg/regexp/#Regexp.Copy) 不再是为了避免锁竞争所必需的，因此对其添加了部分弃用注释。
如果使用它的原因是创建两个具有不同 [`Longest`](/pkg/regexp/#Regexp.Longest) 设置的副本，那么 [`Copy`](/pkg/regexp/#Regexp.Copy) 可能仍然是合适的。

<!-- regexp -->

#### [runtime/debug](/pkg/runtime/debug/)

<!-- CL 144220 -->
新的 [`BuildInfo`](/pkg/runtime/debug/#BuildInfo) 类型暴露了从正在运行的二进制文件中读取的构建信息，仅在使用模块支持构建的二进制文件中可用。这包括主包路径、主模块信息和模块依赖关系。该类型通过 [`ReadBuildInfo`](/pkg/runtime/debug/#ReadBuildInfo) 函数在 [`BuildInfo`](/pkg/runtime/debug/#BuildInfo) 上提供。

<!-- runtime/debug -->

#### [strings](/pkg/strings/)

<!-- CL 137855 -->
新的函数 [`ReplaceAll`](/pkg/strings/#ReplaceAll) 返回一个字符串的副本，其中所有非重叠的某个值实例都被替换为另一个值。<!-- CL 145098 -->
指向零值 [`Reader`](/pkg/strings/#Reader) 的指针现在在功能上等同于 [`NewReader`](/pkg/strings/#NewReader)`(nil)`。在 Go 1.12 之前，前者在所有情况下都不能作为后者的替代品。

<!-- CL 122835 -->
新的 [`Builder.Cap`](/pkg/strings/#Builder.Cap) 方法返回构建器底层字节切片（byte slice）的容量。

<!-- CL 131495 -->
字符映射函数 [`Map`](/pkg/strings/#Map)、[`Title`](/pkg/strings/#Title)、[`ToLower`](/pkg/strings/#ToLower)、[`ToLowerSpecial`](/pkg/strings/#ToLowerSpecial)、[`ToTitle`](/pkg/strings/#ToTitle)、[`ToTitleSpecial`](/pkg/strings/#ToTitleSpecial)、[`ToUpper`](/pkg/strings/#ToUpper) 和 [`ToUpperSpecial`](/pkg/strings/#ToUpperSpecial) 现在始终保证返回有效的 UTF-8。在早期版本中，如果输入是无效的 UTF-8 但无需应用字符替换，这些函数会错误地原样返回无效的 UTF-8。

<!-- strings -->

#### [syscall](/pkg/syscall/)

<!-- CL 138595 -->
现在已在 FreeBSD 12 上支持 64 位 inode。相应地调整了一些类型。

<!-- CL 125456 -->
现在已在兼容版本的 Windows 上支持 Unix 套接字（[`AF_UNIX`](https://blogs.msdn.microsoft.com/commandline/2017/12/19/af_unix-comes-to-windows/)）地址族。

<!-- CL 147117 -->
为 Windows 引入了新函数 [`Syscall18`](/pkg/syscall/?GOOS=windows&GOARCH=amd64#Syscall18)，允许最多 18 个参数的调用。

<!-- syscall -->

#### [syscall/js](/pkg/syscall/js/)

<!-- CL 153559 -->
`Callback` 类型和 `NewCallback` 函数已重命名；它们现在分别称为 [`Func`](/pkg/syscall/js/?GOOS=js&GOARCH=wasm#Func) 和 [`FuncOf`](/pkg/syscall/js/?GOOS=js&GOARCH=wasm#FuncOf)。这是一个破坏性变更，但 WebAssembly 支持仍处于实验阶段，尚未遵守 [Go 1 兼容性承诺](/doc/go1compat)。任何使用旧名称的代码都需要更新。

<!-- CL 141644 -->
如果一个类型实现了新的 [`Wrapper`](/pkg/syscall/js/?GOOS=js&GOARCH=wasm#Wrapper) 接口，[`ValueOf`](/pkg/syscall/js/?GOOS=js&GOARCH=wasm#ValueOf) 将使用它来返回该类型的 JavaScript 值。

<!-- CL 143137 -->
零值 [`Value`](/pkg/syscall/js/?GOOS=js&GOARCH=wasm#Value) 的含义已更改。它现在代表 JavaScript 的 `undefined` 值，而不是数字零。这是一个破坏性变更，但 WebAssembly 支持仍处于实验阶段，尚未遵守 [Go 1 兼容性承诺](/doc/go1compat)。任何依赖零值 [`Value`](/pkg/syscall/js/?GOOS=js&GOARCH=wasm#Value) 表示数字零的代码都需要更新。

<!-- CL 144384 -->
新的 [`Value.Truthy`](/pkg/syscall/js/?GOOS=js&GOARCH=wasm#Value.Truthy) 方法报告给定值的 [JavaScript "真值性"](https://developer.mozilla.org/en-US/docs/Glossary/Truthy)。

<!-- syscall/js -->

#### [testing](/pkg/testing/)

<!-- CL 139258 -->
[`-benchtime`](/cmd/go/#hdr-Testing_flags) 标志现在支持当值以 "`x`" 结尾时设置显式迭代次数，而不是时间。例如，`-benchtime=100x` 将运行基准测试 100 次。

<!-- testing -->

#### [text/template](/pkg/text/template/)

<!-- CL 142217 -->
执行模板时，错误消息中不再截断长的上下文值。

`executing "tmpl" at <.very.deep.context.v...>: map has no entry for key "notpresent"`

现在变为

`executing "tmpl" at <.very.deep.context.value.notpresent>: map has no entry for key "notpresent"`

<!-- CL 143097 -->
如果模板调用的用户自定义函数发生 panic（恐慌），该 panic 现在会被捕获并由 `Execute` 或 `ExecuteTemplate` 方法作为 error（错误）返回。

<!-- text/template -->

#### [time](/pkg/time/)

<!-- CL 151299 -->
`$GOROOT/lib/time/zoneinfo.zip` 中的时区数据库已更新至版本 2018i。请注意，此 ZIP 文件仅在操作系统未提供时区数据库时使用。

<!-- time -->

#### [unsafe](/pkg/unsafe/)

<!-- CL 146058 -->
将 nil `unsafe.Pointer` 转换为 `uintptr` 并通过算术运算转回是无效的。（这本来就是无效的，但现在会导致编译器行为异常。）

<!-- unsafe -->