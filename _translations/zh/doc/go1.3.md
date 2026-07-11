---
title: Go 1.3 发布说明
---

## Go 1.3 简介 {#introduction}

最新的 Go 版本 1.3 在 1.2 发布六个月后到来，此版本不包含语言层面的变更。
它主要聚焦于实现层面的改进，提供了：
精确的垃圾回收，
编译器工具链的重大重构，从而带来更快的构建速度，尤其是在大型项目中，
全面的显著性能提升，
以及对 DragonFly BSD、Solaris、Plan 9 和 Google 的 Native Client 架构（NaCl）的支持。
此外，它还对内存模型中关于同步的部分进行了重要的细化。
一如既往，Go 1.3 遵守了[兼容性承诺](/doc/go1compat.html)，
几乎所有现有代码在迁移到 1.3 后都能继续编译和运行，无需任何改动。

## 支持的操作系统和架构变更 {#os}

### 移除对 Windows 2000 的支持 {#win2000}

微软已于 2010 年停止对 Windows 2000 的支持。
由于其在[异常处理（Unix 术语中的信号）方面存在实现困难](https://codereview.appspot.com/74790043)，
自 Go 1.3 起，Go 也不再支持 Windows 2000。

### 支持 DragonFly BSD {#dragonfly}

Go 1.3 现在包含对 DragonFly BSD 在 `amd64`（64 位 x86）和 `386`（32 位 x86）架构上的实验性支持。
它使用 DragonFly BSD 3.6 或更高版本。

### 支持 FreeBSD {#freebsd}

此变更当时未宣布，但自 Go 1.2 发布以来，Go 在 FreeBSD 上的支持要求 FreeBSD 8 或更高版本。

自 Go 1.3 起，Go 在 FreeBSD 上的支持要求内核编译时配置了 `COMPAT_FREEBSD32` 标志。

为了配合 ARM 平台切换到 EABI 系统调用，Go 1.3 将仅在 FreeBSD 10 上运行。
x86 平台（386 和 amd64）不受影响。

### 支持 Native Client {#nacl}

Go 1.3 版本重新加入了对 Native Client 虚拟机架构的支持。
它在 32 位 Intel 架构（`GOARCH=386`）以及 64 位 Intel（但使用 32 位指针，`GOARCH=amd64p32`）上运行。
目前尚未支持 ARM 架构上的 Native Client。
请注意，这是 Native Client (NaCl)，而非 Portable Native Client (PNaCl)。
有关 Native Client 的详细信息，请参见[此处](https://developers.google.com/native-client/dev/)；
关于如何设置 Go 版本的说明，请参见[此处](/wiki/NativeClient)。

### 支持 NetBSD {#netbsd}

自 Go 1.3 起，Go 在 NetBSD 上的支持要求 NetBSD 6.0 或更高版本。

### 支持 OpenBSD {#openbsd}

自 Go 1.3 起，Go 在 OpenBSD 上的支持要求 OpenBSD 5.5 或更高版本。

### 支持 Plan 9 {#plan9}

Go 1.3 现在包含对 Plan 9 在 `386`（32 位 x86）架构上的实验性支持。
它需要 `Tsemacquire` 系统调用，该调用自 2012 年 6 月起已在 Plan 9 中可用。

### 支持 Solaris {#solaris}

Go 1.3 现在包含对 Solaris 在 `amd64`（64 位 x86）架构上的实验性支持。
它需要 illumos、Solaris 11 或更高版本。

## 内存模型变更 {#memory}

Go 1.3 内存模型[新增了一条规则](https://codereview.appspot.com/75130045)，
涉及在有缓冲的 channel 上发送和接收操作，
旨在明确说明有缓冲的 channel 可以用作简单的信号量，
向 channel 发送以获取（资源），从 channel 接收以释放（资源）。
这并非语言变更，只是对通信预期属性的一个澄清。

## 实现和工具变更 {#impl}

### 栈 {#stacks}

Go 1.3 已将 goroutine 栈的实现从旧的“分段”模型更改为连续模型。
当一个 goroutine 需要的栈空间超过当前可用量时，其栈会被转移到一个更大的单一内存块中。
此转移操作的开销摊销良好，并消除了当计算反复跨越分段边界时出现的旧“热点”问题。
包括性能数据在内的详细信息，请参见此[设计文档](/s/contigstacks)。

### 垃圾回收器变更 {#garbage_collector}

一段时间以来，垃圾回收器在检查堆中的值时一直是_精确_的；
Go 1.3 版本为栈上的值增加了同等的精度。
这意味着，非指针类型的 Go 值（如整数）将永远不会被误认为是指针，从而阻止未使用的内存被回收。

自 Go 1.3 起，运行时假定具有指针类型的值包含指针，而其他值则不包含。
此假设是栈扩展和垃圾回收精确行为的基础。
使用 [unsafe 包](/pkg/unsafe/) 将整数存储在指针类型值中的程序是非法的，如果运行时检测到此行为，程序将崩溃。
使用 [unsafe 包](/pkg/unsafe/) 将指针存储在整数类型值中的程序也是非法的，但在执行期间更难诊断。
由于指针对运行时隐藏，栈扩展或垃圾回收可能会回收它们指向的内存，从而产生[悬空指针](https://en.wikipedia.org/wiki/Dangling_pointer)。

_更新_：使用 `unsafe.Pointer` 将内存中整数类型值转换为指针的代码是非法的，必须重写。
此类代码可以通过 `go vet` 识别。

### Map 迭代顺序 {#map}

对小型 map 的迭代不再按一致的顺序进行。
Go 1 定义：“[遍历 map 的迭代顺序未指定，且不保证每次迭代的顺序相同。](/ref/spec#For_statements)”
为了防止代码依赖 map 的迭代顺序，
Go 1.0 开始让每次 map 迭代从 map 中的一个随机索引开始。
Go 1.1 中引入的新 map 实现忽略了对具有八个或更少条目的 map 进行随机化迭代，尽管迭代顺序仍可能因系统而异。
这使得人们可以编写依赖小型 map 迭代顺序的 Go 1.1 和 Go 1.2 程序，因此这些程序仅在某些系统上可靠运行。
Go 1.3 重新引入了对小型 map 的随机迭代，以期暴露这些错误。
**更新_**：如果代码假设小型 map 的迭代顺序固定，它将出错且必须重写，不能做此假设。由于仅影响小型 map，此问题最常出现在测试中。

### 链接器 {#liblink}

作为 Go 链接器整体[大修](/s/go13linker)的一部分，编译器和链接器已被重构。链接器仍是一个 C 程序，但原先属于链接器的指令选择阶段现已通过创建名为 `liblink` 的新库移至编译器。通过仅在首次编译包时执行一次指令选择，这可显著加速大型项目的编译。

**更新_**：尽管这是一项重大的内部变更，但它应该不会对程序产生影响。

### gccgo 状态 {#gccgo}

GCC 4.9 版本将包含 Go 1.2（非 1.3）版本的 gccgo。GCC 和 Go 项目的发布计划不一致，这意味着 1.3 版将在开发分支中可用，但下一个 GCC 版本 4.10 很可能将包含 Go 1.4 版本的 gccgo。

### go 命令变更 {#gocmd}

[`cmd/go`](/cmd/go/) 命令有几个新功能。
[`go run`](/cmd/go/) 和 [`go test`](/cmd/go/) 子命令支持新的 `-exec` 选项，用于指定运行生成二进制文件的替代方式。其直接目的是支持 NaCl。

[`go test`](/cmd/go/) 子命令的测试覆盖率支持现在会在启用竞态检测器时自动将覆盖率模式设置为 `-atomic`，以消除关于不安全访问覆盖率计数器的误报。

[`go test`](/cmd/go/) 子命令现在即使包中没有测试文件也会构建该包。此前，如果没有测试文件存在，它将不执行任何操作。

[`go build`](/cmd/go/) 子命令支持新的 `-i` 选项，用于安装指定目标的依赖项，但不安装目标本身。

现在支持启用 [`cgo`](/cmd/cgo/) 的交叉编译。运行 all.bash 时，使用 CC\_FOR\_TARGET 和 CXX\_FOR\_TARGET 环境变量分别指定 C 和 C++ 代码的交叉编译器。

最后，go 命令现在支持通过 cgo 导入 Objective-C 文件（后缀为 `.m`）的包。

### cgo 变更 {#cgo}

处理 Go 包中 `import "C"` 声明的 [`cmd/cgo`](/cmd/cgo/) 命令已修复一个可能导致某些包无法编译的严重错误。此前，所有指向不完整 struct 类型的指针都被翻译为 Go 类型 `*[0]byte`，其效果是 Go 编译器无法诊断出将一种 struct 指针传递给期望另一种类型的函数。Go 1.3 通过将每个不同的不完整 struct 翻译为不同的命名类型来纠正此错误。

给定不完整 `struct S` 的 C 声明 `typedef struct S T`，一些 Go 代码利用此错误将类型 `C.struct_S` 和 `C.T` 互换使用。Cgo 现在明确允许这种用法，即使对于完整的 struct 类型也是如此。然而，一些 Go 代码也利用此错误传递（例如）来自一个包的 `*C.FILE` 到另一个包。这是不合法的，并且不再有效：通常，Go 包应避免在其 API 中公开 C 类型和名称。

**更新_**：混淆指向不完整类型的指针或跨包传递它们的代码将无法再编译，必须重写。如果转换正确且必须保留，请通过 [`unsafe.Pointer`](/pkg/unsafe/#Pointer) 使用显式转换。

### 使用 SWIG 的程序需要 SWIG 3.0 {#swig}

对于使用 SWIG 的 Go 程序，现在需要 SWIG 版本 3.0。[`cmd/go`](/cmd/go) 命令现在将 SWIG 生成的目标文件直接链接到二进制文件中，而不是构建并链接到共享库。

### 命令行标志解析 {#gc_flag}

在 gc 工具链中，汇编器现在使用与 Go flag 包相同的命令行标志解析规则，这与传统的 Unix 标志解析不同。这可能会影响直接调用该工具的脚本。例如，`go tool 6a -SDfoo` 现在必须写成 `go tool 6a -S -D foo`。（在 [Go 1.1](/doc/go1.1#gc_flag) 中，编译器和链接器已做了相同的更改。）

### godoc 变更 {#godoc}

当使用 `-analysis` 标志调用时，[godoc](https://godoc.org/golang.org/x/tools/cmd/godoc) 现在对其索引的代码执行复杂的静态分析。分析结果在源代码视图和包文档视图中均会呈现，并包括每个包的调用图以及定义与引用、类型及其方法、接口及其实现、通道上的发送和接收操作、函数及其调用者、以及调用点及其被调用者之间的关系。

### 杂项 {#misc}

用于比较多次基准测试运行性能的程序 `misc/benchcmp` 已被重写。它曾是主仓库中的一个 shell 和 awk 脚本，现在是 `go.tools` 仓库中的一个 Go 程序。文档在[此处](https://godoc.org/golang.org/x/tools/cmd/benchcmp)。

对于少数构建 Go 发行版的我们，工具 `misc/dist` 已被移动和重命名；它现在位于 `misc/makerelease`，仍在主仓库中。

## 性能 {#performance}

由于运行时和垃圾回收的变更以及对库的一些更改，此版本的 Go 二进制文件的性能在许多情况下已得到提升。重要的实例包括：
- 运行时对延迟执行的处理效率更高，使得每个调用 defer 的协程内存占用减少约两 KB。
- 垃圾回收器通过采用并发清扫算法、改进并行机制以及使用更大内存页进行了加速。综合效果可将 GC 暂停时间减少 50-70%。
- 竞态检测器（参见[此指南](/doc/articles/race_detector.html)）现在运行速度提升约 40%。
- 正则表达包 [`regexp`](/pkg/regexp/) 由于实现了第二代单遍执行引擎，处理某些简单表达式时性能显著提升。引擎的选择是自动完成的，对用户完全透明。

此外，运行时在协程栈转储信息中新增了协程阻塞时长的显示，这在调试死锁或性能问题时能提供有用信息。

## 标准库变更 {#library}

### 新增包 {#new_packages}

标准库新增了 [`debug/plan9obj`](/pkg/debug/plan9obj/) 包，用于访问 Plan 9 系统的 [a.out](https://9p.io/magic/man2html/6/a.out) 目标文件。

### 标准库重大变更 {#major_library_changes}

[`crypto/tls`](/pkg/crypto/tls/) 包此前存在一个缺陷，可能导致 TLS 验证被意外跳过。Go 1.3 版本已修复此问题：现在必须显式指定 ServerName 或 InsecureSkipVerify 参数，且当指定 ServerName 时系统会强制校验。这可能会破坏那些错误依赖不安全行为的现有代码。

标准库新增了一个重要类型：[`sync.Pool`](/pkg/sync/#Pool)。它为实现特定类型的缓存提供了高效机制，这些缓存的内存可由系统自动回收。

[`testing`](/pkg/testing/) 包的基准测试辅助类型 [`B`](/pkg/testing/#B) 新增了 [`RunParallel`](/pkg/testing/#B.RunParallel) 方法，使得运行需要多 CPU 参与的基准测试更加便捷。

_更新说明_：crypto/tls 的修复可能导致现有代码失效，但此类代码本身存在错误，应当进行更新。

### 标准库次要变更 {#minor_library_changes}

以下列表汇总了多项标准库的次要变更（以功能新增为主）。各变更的详细信息请查阅对应包的文档。
- 在 [`crypto/tls`](/pkg/crypto/tls/) 包中，新增了 [`DialWithDialer`](/pkg/crypto/tls/#DialWithDialer) 函数，允许使用现有的拨号器建立 TLS 连接，从而更便捷地控制拨号选项（如超时设置）。该包现在还在 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 结构体中报告连接所使用的 TLS 版本。

- [`crypto/tls`](/pkg/crypto/tls/) 包中的 [`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 函数现在支持解析（以及在其他场景下的序列化）PKCS #10 证书签名请求。

- `fmt` 包的格式化打印函数现在将 `%F` 定义为打印浮点值时 `%f` 的同义形式。

- [`math/big`](/pkg/math/big/) 包的 [`Int`](/pkg/math/big/#Int) 和 [`Rat`](/pkg/math/big/#Rat) 类型现在实现了 [`encoding.TextMarshaler`](/pkg/encoding/#TextMarshaler) 和 [`encoding.TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler) 接口。

- 复数幂函数 [`Pow`](/pkg/math/cmplx/#Pow) 现在明确规定了第一个参数为零时的行为（此前该行为未定义）。具体细节请参见[该函数的文档](/pkg/math/cmplx/#Pow)。

- [`net/http`](/pkg/net/http/) 包现在通过新的 [`Response.TLS`](/pkg/net/http/#Response) 字段，公开了用于发起客户端请求的 TLS 连接属性。

- [`net/http`](/pkg/net/http/) 包现在允许通过 [`Server.ErrorLog`](/pkg/net/http/#Server) 设置可选的服务器错误日志记录器。默认情况下，所有错误仍会输出到标准错误（stderr）。

- [`net/http`](/pkg/net/http/) 包现在支持通过 [`Server.SetKeepAlivesEnabled`](/pkg/net/http/#Server.SetKeepAlivesEnabled) 在服务器端禁用 HTTP 保持连接（keep-alive）。默认情况下，服务器仍会启用保持连接（即为多个请求复用连接）。只有资源受限的服务器或正在进行优雅关停的服务器才需要禁用此功能。

- [`net/http`](/pkg/net/http/) 包新增了可选的 [`Transport.TLSHandshakeTimeout`](/pkg/net/http/#Transport) 设置，用于限制 HTTP 客户端请求等待 TLS 握手完成的时间上限。该设置现在也被默认应用于 [`DefaultTransport`](/pkg/net/http#DefaultTransport)。

- [`net/http`](/pkg/net/http/) 包中 HTTP 客户端代码使用的 [`DefaultTransport`](/pkg/net/http/#DefaultTransport) 现在默认启用了 [TCP 保持连接](https://en.wikipedia.org/wiki/Keepalive#TCP_keepalive)。其他 `Dial` 字段为 nil 的 [`Transport`](/pkg/net/http/#Transport) 实例则保持原有行为：不使用 TCP 保持连接。

- 当使用 [`ListenAndServe`](/pkg/net/http/#ListenAndServe) 或 [`ListenAndServeTLS`](/pkg/net/http/#ListenAndServeTLS) 启动时，[`net/http`](/pkg/net/http/) 包现在为传入的服务器请求启用了 [TCP 保持连接](https://en.wikipedia.org/wiki/Keepalive#TCP_keepalive)。若通过其他方式启动服务器，则不会启用 TCP 保持连接。

- [`net/http`](/pkg/net/http/) 包现在提供了可选的 [`Server.ConnState`](/pkg/net/http/#Server) 回调函数，用于挂钩服务器连接生命周期的各个阶段（参见 [`ConnState`](/pkg/net/http/#ConnState)）。此功能可用于实现速率限制或优雅关停。

- [`net/http`](/pkg/net/http/) 包的 HTTP 客户端现在新增了可选的 [`Client.Timeout`](/pkg/net/http/#Client) 字段，用于为通过该客户端发起的请求指定端到端超时时间。

- [`net/http`](/pkg/net/http/) 包中的 [`Request.ParseMultipartForm`](/pkg/net/http/#Request.ParseMultipartForm) 方法现在会在请求体的 `Content-Type` 非 `multipart/form-data` 时返回错误。在 Go 1.3 之前，该方法会静默失败并返回 `nil`。依赖此前行为的代码应进行更新。

- 在 [`net`](/pkg/net/) 包中，[`Dialer`](/pkg/net/#Dialer) 结构体现在新增了 `KeepAlive` 选项，用于指定连接的保持活动周期。

- [`net/http`](/pkg/net/http/) 包的 [`Transport`](/pkg/net/http/#Transport) 现在会一致地关闭 [`Request.Body`](/pkg/net/http/#Request)，即使发生错误也是如此。

- [`os/exec`](/pkg/os/exec/) 包现在按照其文档一直以来所述的方式处理二进制文件的相对路径。具体而言，仅当二进制文件的文件名不包含路径分隔符时，才会调用 [`LookPath`](/pkg/os/exec/#LookPath)。

- [`reflect`](/pkg/reflect/) 包中的 [`SetMapIndex`](/pkg/reflect/#Value.SetMapIndex) 函数现在从 `nil` 映射中删除元素时不再引发恐慌（panic）。

- 如果主协程（goroutine）调用了 [`runtime.Goexit`](/pkg/runtime/#Goexit) 且所有其他协程都已执行完毕，程序现在将始终崩溃，并报告检测到的死锁（deadlock）。Go 的早期版本对此情况的处理不一致：大多数实例会被报告为死锁，但一些简单情况会正常退出。

- runtime/debug 包现在新增了函数 [`debug.WriteHeapDump`](/pkg/runtime/debug/#WriteHeapDump)，用于输出堆（heap）的描述信息。

- [`strconv`](/pkg/strconv/) 包中的 [`CanBackquote`](/pkg/strconv/#CanBackquote) 函数现在将 `DEL` 字符（`U+007F`）视为不可打印字符。

- [`syscall`](/pkg/syscall/) 包现在提供了 [`SendmsgN`](/pkg/syscall/#SendmsgN) 作为 [`Sendmsg`](/pkg/syscall/#Sendmsg) 的替代版本，该版本会返回实际写入的字节数。

- 在 Windows 上，[`syscall`](/pkg/syscall/) 包现在通过新增函数 [`NewCallbackCDecl`](/pkg/syscall/#NewCallbackCDecl)（与现有的 [`NewCallback`](/pkg/syscall/#NewCallback) 函数并列）支持 cdecl 调用约定。

- [`testing`](/pkg/testing/) 包现在会诊断调用 `panic(nil)` 的测试（这类测试几乎总是存在错误）。此外，测试现在即使在失败的情况下也会写入性能分析数据（如果启用了性能分析标志）。

- [`unicode`](/pkg/unicode/) 包及其相关的系统支持已从 Unicode 6.2.0 升级到 [Unicode 6.3.0](https://www.unicode.org/versions/Unicode6.3.0/)。