---
title: Go 1.3 发布说明
---

## Go 1.3 简介 {#introduction}

Go 语言最新版本 1.3 在 1.2 版本发布六个月后正式发布，此次更新不包含语言层面的变更。该版本主要侧重于底层实现的优化，包括提供精确垃圾回收、对编译器工具链进行重大重构以加速构建过程（尤其适用于大型项目）、全面提升运行性能，以及新增对 DragonFly BSD、Solaris、 Plan 9 和 Google Native Client 架构（NaCl）的支持。此外，该版本还针对内存模型中的同步机制进行了重要改进。与以往版本一致，Go 1.3 严格遵守[兼容性承诺](/doc/go1compat.html)，几乎所有代码无需修改即可在 1.3 版本中正常编译和运行。

## 支持的操作系统与架构变更 {#os}

### 移除对 Windows 2000 的支持 {#win2000}

微软已于 2010 年停止对 Windows 2000 的支持。由于该系统在异常处理（Unix 术语中的信号机制）方面存在[实现难题](https://codereview.appspot.com/74790043)，自 Go 1.3 起将不再支持该操作系统。

### 新增 DragonFly BSD 支持 {#dragonfly}

Go 1.3 现在提供对 DragonFly BSD 在 `amd64`（64位 x86）和 `386`（32位 x86）架构上的实验性支持，要求运行 DragonFly BSD 3.6 或更高版本。

### FreeBSD 支持变更 {#freebsd}

虽然此前未正式公告，但自 Go 1.2 发布起，Go 语言在 FreeBSD 上的运行已要求 FreeBSD 8 或更高版本。

从 Go 1.3 开始，在 FreeBSD 上运行 Go 程序还需要系统内核编译时启用 `COMPAT_FREEBSD32` 配置标志。

配合 ARM 平台切换至 EABI 系统调用，Go 1.3 将仅支持 FreeBSD 10 及以上版本。x86 平台（386 和 amd64）不受此影响。

### 新增 Native Client 支持 {#nacl}

Native Client 虚拟机架构支持在 Go 1.3 版本中回归。该架构可在 32 位 Intel 平台（`GOARCH=386`）及使用 32 位指针的 64 位 Intel 平台（`GOARCH=amd64p32`）上运行，目前暂不支持 ARM 架构的 Native Client。请注意此处特指 Native Client（NaCl），而非 Portable Native Client（PNaCl）。Native Client 详细信息请参阅[此处](https://developers.google.com/native-client/dev/)，Go 语言环境配置指南请查阅[此文档](/wiki/NativeClient)。

### NetBSD 支持变更 {#netbsd}

自 Go 1.3 起，Go 语言在 NetBSD 上的运行要求 NetBSD 6.0 或更高版本。

### OpenBSD 支持变更 {#openbsd}

自 Go 1.3 起，Go 语言在 OpenBSD 上的运行要求 OpenBSD 5.5 或更高版本。

### 新增 Plan 9 支持 {#plan9}

Go 1.3 现在提供对 Plan 9 在 `386`（32位 x86）架构上的实验性支持，该功能依赖 `Tsemacquire` 系统调用（该调用自 2012 年 6 月起已在 Plan 9 中实现）。

### 新增 Solaris 支持 {#solaris}

Go 1.3 现在提供对 Solaris 在 `amd64`（64位 x86）架构上的实验性支持，要求运行 illumos、Solaris 11 或更高版本。

## 内存模型变更 {#memory}

Go 1.3 内存模型[新增规则](https://codereview.appspot.com/75130045)，明确说明带缓冲通道可作为简易信号量使用：通过向通道发送消息获取资源，通过从通道接收消息释放资源。这并非语言层面的变更，仅是对通信预期属性的规范性补充。

## 实现与工具链变更 {#impl}

### 栈结构 {#stacks}

Go 1.3 将协程栈的实现从旧版"分段模型"改为连续内存模型。当协程需要超出当前容量的栈空间时，其栈数据将迁移至更大的连续内存块。该迁移操作的性能开销经过良好优化，并消除了旧模型中因计算频繁跨越分段边界产生的"热点"问题。性能数据与设计细节详见此[设计文档](/s/contigstacks)。

### 垃圾回收机制变更 {#garbage_collector}

垃圾回收器此前已实现堆上数值的精确回收，Go 1.3 版本进一步将等效精确性扩展到栈上数值。这意味着整数等非指针类型的 Go 数值将不再被误判为指针，从而避免阻碍未使用内存的回收。

自 Go 1.3 起，运行时环境假设具有指针类型的值包含指针，而其他类型则不包含。该假设是栈扩展和垃圾回收精确性的基础。任何通过[unsafe 包](/pkg/unsafe/)将整数存入指针类型值的操作均属非法行为，运行时检测到此类行为将触发程序崩溃。通过[unsafe 包](/pkg/unsafe/)将指针存入整数类型值的操作同样非法，但运行时诊断更为困难——由于指针对运行时不可见，栈扩展或垃圾回收可能回收其指向的内存，进而产生[悬垂指针](https://en.wikipedia.org/wiki/Dangling_pointer)。

_升级提示_：使用 `unsafe.Pointer` 将内存中的整数值转换为指针的代码属于非法操作，必须重写。此类代码可通过 `go vet` 工具识别。

### Map 迭代顺序 {#map}

小型 Map 的迭代不再保持固定顺序。Go 1 语言规范规定"[Map 的迭代顺序未作指定，且不保证各次迭代顺序一致](/ref/spec#For_statements)"。为防止代码依赖 Map 迭代顺序，Go 1.0 从 Map 的随机索引位置开始迭代。Go 1.1 引入的新 Map 实现未对包含八个及以下元素的 Map 进行随机化处理（尽管不同系统的迭代顺序可能仍有差异）。这导致部分开发者编写出依赖小型 Map 迭代顺序的 Go 1.1/1.2 程序，这些程序仅在特定系统上可靠运行。Go 1.3 重新引入小型 Map 的随机迭代机制，以消除此类隐患。_更新说明_：如果代码假定小型映射的迭代顺序固定，将会出现错误，必须重写以消除这种假设。由于仅小型映射受影响，此问题最常出现在测试中。

### 链接器 {#liblink}

作为对Go链接器进行全面[重构](/s/go13linker)的一部分，编译器和链接器已进行重构。链接器仍为C程序，但原本属于链接器一部分的指令选择阶段现已通过创建名为`liblink`的新库移至编译器。通过仅在包首次编译时执行指令选择，这可以显著加速大型项目的编译。

_更新说明_：尽管这是重大的内部变更，但对程序应无影响。

### gccgo 状态 {#gccgo}

GCC 4.9版本将包含Go 1.2（而非1.3）版的gccgo。GCC和Go项目的发布时间表并不一致，这意味着1.3版本将在开发分支中可用，但下一个GCC版本4.10很可能将包含Go 1.4版的gccgo。

### go 命令的更改 {#gocmd}

[`cmd/go`](/cmd/go/) 命令具有多项新功能。[`go run`](/cmd/go/) 和 [`go test`](/cmd/go/) 子命令支持新的 `-exec` 选项，用于指定运行生成二进制文件的替代方式。其直接目的是支持NaCl。

当启用竞态检测器时，[`go test`](/cmd/go/) 子命令的测试覆盖率支持现在会自动将覆盖率模式设置为 `-atomic`，以消除关于不安全访问覆盖率计数器的错误报告。

[`go test`](/cmd/go/) 子命令现在始终构建包，即使该包没有测试文件。此前，如果没有测试文件存在，它不会执行任何操作。

[`go build`](/cmd/go/) 子命令支持新的 `-i` 选项，用于安装指定目标的依赖项，但不安装目标本身。

现在支持启用 [`cgo`](/cmd/cgo/) 的交叉编译。在运行all.bash时，使用 CC\_FOR\_TARGET 和 CXX\_FOR\_TARGET 环境变量分别指定C和C++代码的交叉编译器。

最后，go命令现在支持通过cgo导入Objective-C文件（后缀为 `.m`）的包。

### cgo 的更改 {#cgo}

处理Go包中 `import "C"` 声明的 [`cmd/cgo`](/cmd/cgo/) 命令已修复一个严重错误，该错误可能导致某些包无法编译。此前，所有指向不完整结构体类型的指针都被翻译为Go类型 `*[0]byte`，导致Go编译器无法诊断将一种结构体指针传递给期望另一种结构体的函数的情况。Go 1.3 通过将每个不同的不完整结构体翻译为不同的命名类型来纠正此错误。

鉴于C声明 `typedef struct S T` 定义了一个不完整的 `struct S`，一些Go代码利用此错误来互换地使用类型 `C.struct_S` 和 `C.T`。Cgo现在明确允许这种用法，即使是对于完整的结构体类型。然而，一些Go代码还利用此错误来（例如）在包之间传递 `*C.FILE`。这是非法的，且不再有效：通常，Go包应避免在其API中暴露C类型和名称。

_更新说明_：混淆指向不完整类型的指针或跨包边界传递它们的代码将无法再编译，必须重写。如果转换正确且必须保留，请使用通过 [`unsafe.Pointer`](/pkg/unsafe/#Pointer) 进行的显式转换。

### 使用SWIG的程序需要SWIG 3.0 {#swig}

对于使用SWIG的Go程序，现在需要SWIG 3.0版本。[`cmd/go`](/cmd/go) 命令现在将直接把SWIG生成的目标文件链接到二进制文件中，而不是构建并链接共享库。

### 命令行标志解析 {#gc_flag}

在gc工具链中，汇编器现在使用与Go flag包相同的命令行标志解析规则，这背离了传统的Unix标志解析方式。这可能会影响直接调用该工具的脚本。例如，`go tool 6a -SDfoo` 现在必须写成 `go tool 6a -S -D foo`。（编译器和链接器在 [Go 1.1](/doc/go1.1#gc_flag) 中进行了相同的更改。）

### godoc 的更改 {#godoc}

当使用 `-analysis` 标志调用时，[godoc](https://godoc.org/golang.org/x/tools/cmd/godoc) 现在对其索引的代码执行复杂的静态分析。分析结果在源代码视图和包文档视图中均有展示，包括每个包的调用图，以及定义与引用、类型及其方法、接口及其实现、通道上的发送和接收操作、函数及其调用者、调用点及其被调用者之间的关系。

### 杂项 {#misc}

用于比较基准测试运行性能的程序 `misc/benchcmp` 已重写。它曾是主仓库中的一个shell和awk脚本，现在是 `go.tools` 仓库中的一个Go程序。文档位于[此处](https://godoc.org/golang.org/x/tools/cmd/benchcmp)。

对于我们少数构建Go发行版的人来说，工具 `misc/dist` 已被移动并重命名；它现在位于 `misc/makerelease`，仍在主仓库中。

## 性能 {#performance}

由于运行时和垃圾回收的更改以及对库的一些更改，此版本Go二进制文件的性能在许多情况下有所提高。重要的实例包括：- 运行时更高效地处理延迟调用（defer），每个使用 defer 的 goroutine 内存占用减少约两千字节。
- 垃圾回收器通过采用并发清除算法、改进并行化和使用更大的内存页，速度得到提升。
  累计效果可使垃圾回收器暂停时间减少50-70%。
- 竞态检测器（参见[此指南](/doc/articles/race_detector.html)）运行速度提升约40%。
- 正则表达式包 [`regexp`](/pkg/regexp/) 通过实现第二代单遍执行引擎，对某些简单表达式的处理速度显著提升。
  引擎选择自动完成；具体细节对用户透明。

此外，运行时现在会在协程转储信息中包含 goroutine 的阻塞时长，这有助于调试死锁或性能问题。

## 标准库变更 {#library}

### 新增包 {#new_packages}

标准库新增包 [`debug/plan9obj`](/pkg/debug/plan9obj/)，用于访问 Plan 9 系统的 [a.out](https://9p.io/magic/man2html/6/a.out) 目标文件。

### 库主要变更 {#major_library_changes}

[`crypto/tls`](/pkg/crypto/tls/) 包此前存在一个 bug，可能导致 TLS 验证被意外跳过。在 Go 1.3 中该问题已修复：必须显式指定 ServerName 或 InsecureSkipVerify，若指定了 ServerName 则会被强制执行。这可能会破坏依赖于不安全行为的现有代码。

标准库新增重要类型：[`sync.Pool`](/pkg/sync/#Pool)，为实现特定类型的缓存提供了高效机制，其内存可被系统自动回收。

[`testing`](/pkg/testing/) 包的测试辅助类型 [`B`](/pkg/testing/#B) 新增 [`RunParallel`](/pkg/testing/#B.RunParallel) 方法，更便于执行涉及多 CPU 的基准测试。

_升级提示_：crypto/tls 的修复可能导致现有代码中断，但这些代码本身存在错误，应当更新。

### 库次要变更 {#minor_library_changes}

以下列表概括了标准库的若干次要变更（主要为功能新增）。具体变更详情请参阅相关包文档。- 在 [`crypto/tls`](/pkg/crypto/tls/) 包中，新增的 [`DialWithDialer`](/pkg/crypto/tls/#DialWithDialer) 函数允许使用现有拨号器建立 TLS 连接，更便于控制拨号选项（如超时时间）。该包现在还在 [`ConnectionState`](/pkg/crypto/tls/#ConnectionState) 结构体中报告连接所使用的 TLS 版本。
- [`crypto/tls`](/pkg/crypto/tls/) 包的 [`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 函数现支持解析（以及在其他场景中的序列化）PKCS #10 证书签名请求。
- `fmt` 包的格式化打印函数现定义 `%F` 作为打印浮点值时 `%f` 的同义词。
- [`math/big`](/pkg/math/big/) 包的 [`Int`](/pkg/math/big/#Int) 和 [`Rat`](/pkg/math/big/#Rat) 类型现实现了 [`encoding.TextMarshaler`](/pkg/encoding/#TextMarshaler) 和 [`encoding.TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler) 接口。
- 复数幂函数 [`Pow`](/pkg/math/cmplx/#Pow) 现明确了当第一个参数为零时的行为（此前未定义）。详情见[该函数的文档](/pkg/math/cmplx/#Pow)。
- [`net/http`](/pkg/net/http/) 包现通过新的 [`Response.TLS`](/pkg/net/http/#Response) 字段公开客户端请求所使用的 TLS 连接属性。
- [`net/http`](/pkg/net/http/) 包现允许通过 [`Server.ErrorLog`](/pkg/net/http/#Server) 设置可选的服务器错误日志记录器（默认仍向 stderr 输出所有错误）。
- [`net/http`](/pkg/net/http/) 包现支持通过 [`Server.SetKeepAlivesEnabled`](/pkg/net/http/#Server.SetKeepAlivesEnabled) 禁用服务器的 HTTP keep-alive 连接。默认行为仍保持服务器启用 keep-alive（为多个请求复用连接），仅资源受限的服务器或正在优雅关闭的服务器需要禁用此功能。
- [`net/http`](/pkg/net/http/) 包新增可选设置 [`Transport.TLSHandshakeTimeout`](/pkg/net/http/#Transport)，用于限制 HTTP 客户端请求等待 TLS 握手完成的时间。该设置现也已在 [`DefaultTransport`](/pkg/net/http#DefaultTransport) 中默认启用。
- [`net/http`](/pkg/net/http/) 包中供 HTTP 客户端使用的 [`DefaultTransport`](/pkg/net/http/#DefaultTransport) 现默认启用 [TCP keep-alive](https://en.wikipedia.org/wiki/Keepalive#TCP_keepalive)。其他 `Dial` 字段为 nil 的 [`Transport`](/pkg/net/http/#Transport) 值仍保持原行为：不启用 TCP keep-alive。
- [`net/http`](/pkg/net/http/) 包现为使用 [`ListenAndServe`](/pkg/net/http/#ListenAndServe) 或 [`ListenAndServeTLS`](/pkg/net/http/#ListenAndServeTLS) 启动的服务器启用传入请求的 [TCP keep-alive](https://en.wikipedia.org/wiki/Keepalive#TCP_keepalive)。若以其他方式启动服务器，则不启用 TCP keep-alive。
- [`net/http`](/pkg/net/http/) 包新增可选的 [`Server.ConnState`](/pkg/net/http/#Server) 回调函数，用于挂钩服务器连接生命周期的各个阶段（参见 [`ConnState`](/pkg/net/http/#ConnState)）。此功能可用于实现速率限制或优雅关闭。
- [`net/http`](/pkg/net/http/) 包的 HTTP 客户端现新增可选的 [`Client.Timeout`](/pkg/net/http/#Client) 字段，用于指定使用该客户端发起的请求的端到端超时时间。
- [`net/http`](/pkg/net/http/) 包的 [`Request.ParseMultipartForm`](/pkg/net/http/#Request.ParseMultipartForm) 方法现会在请求体 `Content-Type` 非 `multipart/form-data` 时返回错误（Go 1.3 之前会静默失败并返回 `nil`）。依赖旧行为的代码需相应更新。
- 在 [`net`](/pkg/net/) 包中，[`Dialer`](/pkg/net/#Dialer) 结构体现在具有 `KeepAlive` 选项，用于指定连接的 keep-alive 周期。
- [`net/http`](/pkg/net/http/) 包的 [`Transport`](/pkg/net/http/#Transport) 现在即使在出错时也会一致地关闭 [`Request.Body`](/pkg/net/http/#Request)。
- [`os/exec`](/pkg/os/exec/) 包现正确实现了文档中关于二进制文件相对路径的描述。具体而言，仅当二进制文件名不包含路径分隔符时才会调用 [`LookPath`](/pkg/os/exec/#LookPath)。
- [`reflect`](/pkg/reflect/) 包中的 [`SetMapIndex`](/pkg/reflect/#Value.SetMapIndex) 函数在从 nil 映射中删除元素时不再触发恐慌。
- 若主 goroutine 调用 [`runtime.Goexit`](/pkg/runtime/#Goexit) 且所有其他 goroutine 执行完毕，程序现将始终崩溃并报告检测到的死锁。此前 Go 版本对此情况处理不一致：大多数实例会报告为死锁，但某些简单情况会直接正常退出。
- runtime/debug 包新增函数 [`debug.WriteHeapDump`](/pkg/runtime/debug/#WriteHeapDump)，用于输出堆内存描述信息。
- [`strconv`](/pkg/strconv/) 包中的 [`CanBackquote`](/pkg/strconv/#CanBackquote) 函数现将 `DEL` 字符（`U+007F`）视为不可打印字符。
- [`syscall`](/pkg/syscall/) 包现提供 [`SendmsgN`](/pkg/syscall/#SendmsgN) 作为 [`Sendmsg`](/pkg/syscall/#Sendmsg) 的替代版本，该函数会返回写入的字节数。
- 在 Windows 平台上，[`syscall`](/pkg/syscall/) 包现通过新增函数 [`NewCallbackCDecl`](/pkg/syscall/#NewCallbackCDecl) 支持 cdecl 调用约定（现有函数 [`NewCallback`](/pkg/syscall/#NewCallback) 保持不变）。
- [`testing`](/pkg/testing/) 包现会检测调用 `panic(nil)` 的测试（此类测试几乎总是错误的）。此外，测试现即使在失败时也会写入性能分析文件（若使用分析标志调用）。
- [`unicode`](/pkg/unicode/) 包及系统相关支持已从 Unicode 6.2.0 升级至 [Unicode 6.3.0](https://www.unicode.org/versions/Unicode6.3.0/)。