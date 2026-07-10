---
path: /doc/go1.21
title: Go 1.21 版本说明
---

<!--
注意：在本目录下的本文档及其他文档中，惯例是使用固定宽度的短语与非固定宽度的空格，如 `hello` `world`。
请勿提交去除此类短语内部标签的变更请求。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.21 简介 {#introduction}

最新的 Go 版本 1.21 在 [Go 1.20](/doc/go1.20) 发布六个月后问世。
其大部分更改集中在工具链、运行时和库的实现方面。
一如既往，本次发布遵循 Go 1 [兼容性承诺](/doc/go1compat)；实际上，Go 1.21 [对此承诺做出了改进](#tools)。
我们预期几乎所有 Go 程序都能像以前一样继续编译和运行。

<!-- https://go.dev/issue/57631 -->
Go 1.21 对版本号的命名规则进行了小幅调整。
过去，我们使用 Go 1._N_ 来同时指代整个 Go 语言版本与发布系列，以及该系列中的第一个版本。
从 Go 1.21 开始，第一个版本现在是 Go 1._N_.0。
今天，我们发布的是 Go 1.21 语言及其初始实现，即 Go 1.21.0 版本。
这些说明中指的是“Go 1.21”；像 `go` `version` 这样的工具将报告“`go1.21.0`”（在您升级到 Go 1.21.1 之前）。
有关新版本编号的详细信息，请参阅“Go 工具链”文档中的“[Go 版本](/doc/toolchain#version)”部分。

## 语言变更 {#language}

Go 1.21 为该语言新增了三个内置函数。

  - <!-- https://go.dev/issue/59488 -->
    新函数 `min` 和 `max` 用于计算给定数量参数中的最小值（或 `max` 为最大值）。
    详情请参阅语言规范中的 [说明](/ref/spec#Min_and_max)。
  - <!-- https://go.dev/issue/56351 -->
    新函数 `clear` 用于删除映射中的所有元素，或将切片中的所有元素置为零值。
    详情请参阅语言规范中的 [说明](/ref/spec#Clear)。

<!-- https://go.dev/issue/57411 -->
包初始化顺序现在有了更精确的规范。新算法如下：

- 按导入路径对所有包进行排序。
- 重复以下步骤，直到包列表为空：
  - 在列表中找到第一个其所有导入都已被初始化的包。
  - 初始化该包，并将其从列表中移除。

这可能会改变一些依赖于特定初始化顺序（而该顺序并未通过显式导入表达）的程序的行为。在过去版本的规范中，此类程序的行为定义并不明确。新规则提供了明确的定义。

对类型推断能力进行了多项改进，使其更强大、更精确。

  - <!-- https://go.dev/issue/59338 -->
    现在，一个（可能是部分实例化的泛型）函数可以用其自身为（可能是部分实例化的）泛型函数的参数来调用。
    编译器将尝试推断被调用函数缺失的类型参数（如以前一样），并且（新特性）对于每一个作为未完全实例化的泛型函数的参数，还会推断该参数缺失的类型参数。
    典型用例是调用操作容器（如 [slices.IndexFunc](/pkg/slices#IndexFunc)）的泛型函数，其中的函数参数本身也可能是泛型的，并且被调用函数及其参数的类型参数是从容器类型推断出来的。
    更一般地，如果类型参数可以从赋值中推断出来，那么泛型函数现在可以在赋值给变量或作为返回值时无需显式实例化即可使用。
  - <!-- https://go.dev/issue/60353, https://go.dev/issue/57192, https://go.dev/issue/52397, https://go.dev/issue/41176 -->
    类型推断现在还会在将值赋给接口时考虑方法：方法签名中使用的类型参数的类型，可以从匹配方法的相应参数类型中推断出来。
  - <!-- https://go.dev/issue/51593 https://go.dev/issue/39661 -->
    类似地，由于类型参数必须实现其对应约束的所有方法，类型参数的方法和约束的方法会被匹配，这可能导致推断出额外的类型参数。
  - <!-- https://go.dev/issue/58671 -->
    如果多个不同类型（例如，一个无类型整数常量和一个无类型浮点常量）的无类型常量参数被传递给具有相同（未另行指定的）类型参数类型的参数，现在不再报错，而是使用与处理无类型常量操作数的操作符相同的方法来确定类型。
    此更改使得从无类型常量参数推断出的类型与常量表达式的类型保持一致。
  - <!-- https://go.dev/issue/59750 -->
    现在，在匹配赋值中的对应类型时，类型推断是精确的：组件类型（例如切片的元素，或函数签名中的参数类型）必须相同（在给定合适的类型参数的情况下）才能匹配，否则推断将失败。
    此更改产生了更准确的错误信息：过去类型推断可能错误地成功并导致无效的赋值，现在如果两个类型不可能匹配，编译器将报告推断错误。

<!-- https://go.dev/issue/58650 -->
更一般地说，语言规范中关于 [类型推断](/ref/spec#Type_inference) 的描述已得到澄清。
综合来看，所有这些更改使得类型推断更加强大，推断失败的情况也变得不那么意外了。

<!-- https://go.dev/issue/57969 -->

Go 1.21 包含了我们正在考虑在未来版本中实施的一项语言变更预览：使 `for` 循环变量是每次迭代独立，而不是整个循环共享，以避免意外的共享错误。
有关如何尝试该语言变更的详细信息，请参阅 [LoopvarExperiment wiki 页面](/wiki/LoopvarExperiment)。

<!-- https://go.dev/issue/25448 -->Go 1.21 现在规定：如果一个 goroutine 正在 panic，且 recover 是由一个 deferred 函数直接调用的，那么 recover 的返回值保证不为 nil。为确保这一点，使用 nil 接口值（或无类型的 nil）调用 panic 会引发一个类型为 [`*runtime.PanicNilError`](/pkg/runtime/#PanicNilError) 的运行时 panic。

为了支持针对旧版 Go 编写的程序，可以通过设置 `GODEBUG=panicnil=1` 来重新启用 nil panic。当编译一个其主包位于声明了 `go` `1.20` 或更早版本的模块中的程序时，此设置会自动启用。

## 工具 {#tools}

Go 1.21 增强了 Go 工具链对向后兼容和向前兼容的支持。

<!-- https://go.dev/issue/56986 -->
为了提高向后兼容性，Go 1.21 正式确定了 Go 使用 `GODEBUG` 环境变量来控制默认行为的做法，以应对那些根据[兼容性策略](/doc/go1compat)并非破坏性但可能导致现有程序出现问题的变更。（例如，依赖于有缺陷行为的程序可能在 bug 修复后中断，但 bug 修复不被视为破坏性变更。）当 Go 必须进行此类行为变更时，它现在会基于工作区 `go.work` 文件或主模块 `go.mod` 文件中的 `go` 行，在旧行为和新行为之间进行选择。将工具链升级到新版本，但将 `go` 行保留为其原始（较旧）的 Go 版本，可以保持旧工具链的行为。借助此兼容性支持，最新的 Go 工具链应始终是旧版 Go 的最佳、最安全的实现。详情请参阅“[Go、向后兼容性和 GODEBUG](/doc/godebug)”。

<!-- https://go.dev/issue/57001 -->
为了提高向前兼容性，Go 1.21 现在将 `go.work` 或 `go.mod` 文件中的 `go` 行视为严格的最低要求：`go` `1.21.0` 意味着该工作区或模块不能与 Go 1.20 或 Go 1.21rc1 一起使用。这允许依赖于 Go 后续版本修复的项目确保其不被用于早期版本。这也为使用新 Go 特性的项目提供了更好的错误报告：当问题在于需要更新的 Go 版本时，该问题会被清晰地报告出来，而不是尝试构建代码并打印关于未解析导入或语法错误的信息。

为了使这些新的、更严格的版本要求更易于管理，`go` 命令现在不仅可以调用其自身发布版本中捆绑的工具链，还可以调用在 PATH 中找到的或按需下载的其他 Go 工具链版本。如果 `go.mod` 或 `go.work` 的 `go` 行声明了对更新版本 Go 的最低要求，`go` 命令将自动查找并运行该版本。新的 `toolchain` 指令设置了建议使用的最低工具链版本，该版本可能比严格的 `go` 最低要求更新。详情请参阅“[Go 工具链](/doc/toolchain)”。

### Go 命令 {#go-command}

<!-- https://go.dev/issue/58099, CL 474236 -->
`-pgo` 构建标志现在默认为 `-pgo=auto`，并且命令行上指定单个主包的限制现已取消。如果主包目录中存在名为 `default.pgo` 的文件，`go` 命令将使用它为构建相应的程序启用配置文件引导优化。

`-C` `dir` 标志现在使用时必须是命令行上的第一个标志。

<!-- https://go.dev/issue/37708, CL 463837 -->
新的 `go` `test` 选项 `-fullpath` 在测试日志消息中打印完整路径名，而不仅仅是基本名称。

<!-- https://go.dev/issue/15513, CL 466397 -->
`go` `test` 的 `-c` 标志现在支持为多个包编写测试二进制文件，每个文件输出为 `pkg.test`，其中 `pkg` 是包名。如果被编译的多个测试包具有相同的包名，则会报错。

<!-- https://go.dev/issue/15513, CL 466397 -->
`go` `test` 的 `-o` 标志现在接受目录参数，在这种情况下，测试二进制文件将写入该目录，而不是当前目录。

<!-- https://go.dev/issue/31544, CL 477839 -->
在使用 cgo 启用的外部（C）链接器时，`runtime/cgo` 包现在作为附加依赖项提供给 Go 链接器，以确保 Go 运行时与 C 链接器添加的任何附加库兼容。

### Cgo {#cgo}

<!-- CL 490819 -->
在 `import "C"` 的文件中，Go 工具链现在会正确报告在 C 类型上声明 Go 方法的尝试错误。

## 运行时 {#runtime-changes}

<!-- https://go.dev/issue/7181 -->
在打印非常深的栈时，运行时现在会打印最前面 50 个（最内层）帧，然后是最后面 50 个（最外层）帧，而不是只打印最前面的 100 个帧。这使得观察深度递归栈是如何开始的变得更加容易，对于调试栈溢出尤其有价值。

<!-- https://go.dev/issue/59960 -->
在支持透明大页的 Linux 平台上，Go 运行时现在更明确地管理堆的哪些部分可以由大页支持。这带来了更好的内存利用率：小堆应该会看到更少的内存使用（在极端情况下可达 50%），而大堆在堆的密集部分应该会看到更少的断裂大页，从而将 CPU 使用率和延迟提高高达 1%。此更改的一个后果是，运行时不再尝试规避特定的有问题的 Linux 配置设置，这可能导致更高的内存开销。建议的修复方法是根据 [GC 指南](/doc/gc-guide#Linux_transparent_huge_pages)调整操作系统的大页设置。不过，也提供了其他解决方法。请参阅有关 [`max_ptes_none`](/doc/gc-guide#Linux_THP_max_ptes_none_workaround) 的章节。<!-- https://go.dev/issue/57069, https://go.dev/issue/56966 -->
由于运行时内部的垃圾回收调优，应用程序的尾部延迟可能减少高达40%，内存使用也可能略有下降。部分应用程序可能会观察到吞吐量略有下降。
内存使用的减少应与吞吐量的损失成比例，因此，通过略微增加 `GOGC` 和/或 `GOMEMLIMIT`，可以恢复（几乎不改变延迟）上一个版本的吞吐量/内存权衡。

<!-- https://go.dev/issue/51676 -->
在C创建的线程上从C调用Go需要进行一些准备工作。在Unix平台上，现在可以从同一线程的多次调用之间保留此准备工作。这显著降低了后续从C调用Go的开销，从每次调用约1-3微秒降至约100-200纳秒。

## 编译器 {#compiler}

在Go 1.20中作为预览版添加的配置文件引导优化（PGO）现已准备就绪，可供普遍使用。PGO能够根据生产工作负载的配置文件，对识别为热点的代码启用额外优化。如 [Go命令章节](#go-command) 所述，对于在主包目录中包含 `default.pgo` 配置文件的二进制文件，PGO默认启用。性能提升因应用程序行为而异，在一个代表性的Go程序集合中，大多数程序通过启用PGO获得了2%到7%的性能提升。详细文档请参阅 [PGO用户指南](/doc/pgo)。

<!-- https://go.dev/issue/59959 -->
PGO构建现在可以对一些接口方法调用进行去虚拟化，添加一个指向最常见目标的具体调用。这使得进一步的优化成为可能，例如内联被调用者。

<!-- CL 497455 -->
Go 1.21通过使用PGO构建编译器本身，将构建速度提升了高达6%。

## 汇编器 {#assembler}

<!-- https://go.dev/issue/58378 -->
在amd64架构上，无栈帧且不拆分的汇编函数不再自动标记为 `NOFRAME`。相反，如果需要，必须显式指定 `NOFRAME` 属性，这与支持帧指针的其他架构的行为一致。因此，运行时现在可以为栈转换维护帧指针。

<!-- CL 476295 -->
改进了用于检查动态链接时 `R15` 错误使用的验证器。

## 链接器 {#linker}

<!-- https://go.dev/issue/57302, CL 461749, CL 457455 -->
在windows/amd64上，链接器（在编译器的帮助下）现在默认生成SEH展开数据，这改善了Go应用程序与Windows调试器及其他工具的集成。

<!-- CL 463395, CL 461315 -->
在Go 1.21中，链接器（在编译器的帮助下）现在能够删除无用的（未被引用的）全局map变量，前提是变量初始化器中的条目数量足够大，并且初始化表达式没有副作用。

## 标准库 {#library}

### 新的 log/slog 包 {#slog}

<!--
 https://go.dev/issue/59060, https://go.dev/issue/59141, https://go.dev/issue/59204, https://go.dev/issue/59280,
        https://go.dev/issue/59282, https://go.dev/issue/59339, https://go.dev/issue/59345, https://go.dev/issue/61200,
        CL 477295, CL 484096, CL 486376, CL 486415, CL 487855, CL 508195
 -->
新的 [log/slog](/pkg/log/slog) 包提供了带级别的结构化日志记录。结构化日志记录会发出键值对，以便快速、准确地处理大量日志数据。该包支持与流行的日志分析工具和服务集成。

### 新的 testing/slogtest 包 {#slogtest}

<!-- CL 487895 -->
新的 [testing/slogtest](/pkg/testing/slogtest) 包可以帮助验证 [slog.Handler](/pkg/log/slog#Handler) 的实现。

### 新的 slices 包 {#slices}

<!-- https://go.dev/issue/45955, https://go.dev/issue/54768 -->
<!-- https://go.dev/issue/57348, https://go.dev/issue/57433 -->
<!-- https://go.dev/issue/58565, https://go.dev/issue/60091 -->
<!-- https://go.dev/issue/60546 -->
<!-- CL 467417, CL 468855, CL 483175, CL 496078, CL 498175, CL 502955 -->
新的 [slices](/pkg/slices) 包提供了许多对切片的常用操作，使用了适用于任何元素类型切片的泛型函数。

### 新的 maps 包 {#maps}

<!-- https://go.dev/issue/57436, CL 464343 -->
新的 [maps](/pkg/maps/) 包提供了几种对映射的常用操作，使用了适用于任何键或元素类型映射的泛型函数。

### 新的 cmp 包 {#cmp}

<!-- https://go.dev/issue/59488, CL 496356 -->
新的 [cmp](/pkg/cmp/) 包定义了类型约束 [`Ordered`](/pkg/cmp/#Ordered) 以及两个新的泛型函数 [`Less`](/pkg/cmp/#Less) 和 [`Compare`](/pkg/cmp/#Compare)，这些对于[有序类型](/ref/spec/#Comparison_operators)非常有用。

### 标准库的小改动 {#minor_library_changes}

一如既往，库中有各种细微的更改和更新，这些都遵循Go 1的[兼容性承诺](/doc/go1compat)。
此处未列举的各种性能改进也同样如此。

#### [archive/tar](/pkg/archive/tar/)

<!-- https://go.dev/issue/54451, CL 491175 -->
由 [`Header.FileInfo`](/pkg/archive/tar/#Header.FileInfo) 返回的 [`io/fs.FileInfo`](/pkg/io/fs/#FileInfo) 接口的实现现在提供了一个 `String` 方法，该方法调用了 [`io/fs.FormatFileInfo`](/pkg/io/fs/#FormatFileInfo)。

<!-- archive/tar -->

#### [archive/zip](/pkg/archive/zip/)

<!-- https://go.dev/issue/54451, CL 491175 -->
由 [`FileHeader.FileInfo`](/pkg/archive/zip/#FileHeader.FileInfo) 返回的 [`io/fs.FileInfo`](/pkg/io/fs/#FileInfo) 接口的实现现在提供了一个 `String` 方法，该方法调用了 [`io/fs.FormatFileInfo`](/pkg/io/fs/#FormatFileInfo)。<!-- https://go.dev/issue/54451, CL 491175 -->
由 [`Reader.Open`](/pkg/archive/zip/#Reader.Open) 返回的 [`io/fs.File`](/pkg/io/fs/#File) 的 [`io/fs.ReadDirFile.ReadDir`](/pkg/io/fs/#ReadDirFile.ReadDir) 方法返回的 [`io/fs.DirEntry`](/pkg/io/fs/#DirEntry) 接口的实现，现在提供了一个 `String` 方法，该方法调用了 [`io/fs.FormatDirEntry`](/pkg/io/fs/#FormatDirEntry)。

<!-- archive/zip -->

#### [bytes](/pkg/bytes/)

<!-- https://go.dev/issue/53685, CL 474635 -->
[`Buffer`](/pkg/bytes/#Buffer) 类型
新增了两个方法：
[`Available`](/pkg/bytes/#Buffer.Available)
和 [`AvailableBuffer`](/pkg/bytes/#Buffer.AvailableBuffer)。
这些方法可以与
[`Write`](/pkg/bytes/#Buffer.Write)
方法配合使用，以直接向 `Buffer` 追加内容。

<!-- bytes -->

#### [context](/pkg/context/)

<!-- https://go.dev/issue/40221, CL 479918 -->
新增的 [`WithoutCancel`](/pkg/context/#WithoutCancel)
函数返回一个上下文的副本，当原始上下文被取消时，该副本不会被取消。

<!-- https://go.dev/issue/56661, CL 449318 -->
新增的 [`WithDeadlineCause`](/pkg/context/#WithDeadlineCause)
和 [`WithTimeoutCause`](/pkg/context/#WithTimeoutCause)
函数提供了一种在截止时间或计时器到期时设置上下文取消原因的方式。原因可以通过
[`Cause`](/pkg/context/#Cause) 函数检索。

<!-- https://go.dev/issue/57928, CL 482695 -->
新增的 [`AfterFunc`](/pkg/context/#AfterFunc)
函数注册一个在上下文被取消后运行的函数。

<!-- CL 455455 -->
一项优化意味着，调用
[`Background`](/pkg/context/#Background)
和 [`TODO`](/pkg/context/#TODO) 的结果
转换为共享类型后可以被视为相等。
在之前的版本中，它们总是不同的。比较
[`Context`](/pkg/context/#Context) 值
的相等性从未被明确定义，因此这不
被视为不兼容的更改。

#### [crypto/ecdsa](/pkg/crypto/ecdsa/)

<!-- CL 492955 -->
[`PublicKey.Equal`](/pkg/crypto/ecdsa/#PublicKey.Equal) 和
[`PrivateKey.Equal`](/pkg/crypto/ecdsa/#PrivateKey.Equal)
现在以常量时间执行。

<!-- crypto/ecdsa -->

#### [crypto/elliptic](/pkg/crypto/elliptic/)

<!-- CL 459977 -->
所有 [`Curve`](/pkg/crypto/elliptic/#Curve) 方法以及 [`GenerateKey`](/pkg/crypto/elliptic/#GenerateKey)、[`Marshal`](/pkg/crypto/elliptic/#Marshal) 和 [`Unmarshal`](/pkg/crypto/elliptic/#Unmarshal) 均已被弃用。对于 ECDH 操作，应使用新的 [`crypto/ecdh`](/pkg/crypto/ecdh/) 包。对于更底层的操作，请使用第三方模块，如 [filippo.io/nistec](https://pkg.go.dev/filippo.io/nistec)。

<!-- crypto/elliptic -->

#### [crypto/rand](/pkg/crypto/rand/)

<!-- CL 463123 -->
在 NetBSD 10.0 及更高版本上，[`crypto/rand`](/pkg/crypto/rand/) 包现在使用 `getrandom` 系统调用。

<!-- crypto/rand -->

#### [crypto/rsa](/pkg/crypto/rsa/)

<!-- CL 471259, CL 492935 -->
对于 `GOARCH=amd64` 和 `GOARCH=arm64`，RSA 私钥操作（解密和签名）的性能现在优于 Go 1.19。其性能在 Go 1.20 中有所退化。

由于向 [`PrecomputedValues`](/pkg/crypto/rsa/#PrecomputedValues) 添加了私有字段，即使是从 JSON 反序列化（例如）之前已预计算的私钥，也必须调用 [`PrivateKey.Precompute`](/pkg/crypto/rsa/#PrivateKey.Precompute) 以获得最佳性能。

<!-- CL 492955 -->
[`PublicKey.Equal`](/pkg/crypto/rsa/#PublicKey.Equal) 和
[`PrivateKey.Equal`](/pkg/crypto/rsa/#PrivateKey.Equal)
现在以常量时间执行。

<!-- https://go.dev/issue/56921, CL 459976 -->
[`GenerateMultiPrimeKey`](/pkg/crypto/rsa/#GenerateMultiPrimeKey) 函数和 [`PrecomputedValues.CRTValues`](/pkg/crypto/rsa/#PrecomputedValues.CRTValues) 字段已被弃用。调用 [`PrivateKey.Precompute`](/pkg/crypto/rsa/#PrivateKey.Precompute) 时仍将填充 [`PrecomputedValues.CRTValues`](/pkg/crypto/rsa/#PrecomputedValues.CRTValues)，但这些值在解密操作期间不会被使用。

<!-- crypto/rsa -->

<!-- CL 483815 reverted -->

#### [crypto/sha256](/pkg/crypto/sha256/)

<!-- https://go.dev/issue/50543, CL 408795 -->
当 `GOARCH=amd64` 时，SHA-224 和 SHA-256 操作在可用的情况下现在使用本地指令，性能提升约 3-4 倍。

<!-- crypto/sha256 -->

<!-- CL 481478 reverted -->
<!-- CL 483816 reverted -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 497895 -->
服务器现在对于恢复的连接会跳过验证客户端证书（包括不运行 [`Config.VerifyPeerCertificate`](/pkg/crypto/tls/#Config.VerifyPeerCertificate)），仅检查过期时间。这在使用客户端证书时会导致会话票据变大。客户端之前已经会在恢复时跳过验证，但现在即使设置了 [`Config.InsecureSkipVerify`](/pkg/crypto/tls/#Config.InsecureSkipVerify)，也会检查过期时间。

<!-- https://go.dev/issue/60105, CL 496818, CL 496820, CL 496822, CL 496821, CL 501675 -->
应用程序现在可以控制会话票据的内容。- 新增的 [`SessionState`](/pkg/crypto/tls/#SessionState) 类型用于描述一个可恢复的会话。
  - [`SessionState.Bytes`](/pkg/crypto/tls/#SessionState.Bytes) 方法和 [`ParseSessionState`](/pkg/crypto/tls/#ParseSessionState) 函数用于序列化和反序列化 `SessionState`。
  - [`Config.WrapSession`](/pkg/crypto/tls/#Config.WrapSession) 和 [`Config.UnwrapSession`](/pkg/crypto/tls/#Config.UnwrapSession) 钩子函数在服务器端将 `SessionState` 与票据相互转换。
  - [`Config.EncryptTicket`](/pkg/crypto/tls/#Config.EncryptTicket) 和 [`Config.DecryptTicket`](/pkg/crypto/tls/#Config.DecryptTicket) 方法为 `WrapSession` 和 `UnwrapSession` 提供了默认实现。
  - [`ClientSessionState.ResumptionState`](/pkg/crypto/tls/#ClientSessionSessionState.ResumptionState) 方法和 [`NewResumptionState`](/pkg/crypto/tls/#NewResumptionState) 函数可被 `ClientSessionCache` 的实现用于在客户端存储和恢复会话。

<!-- CL 496817 -->
为了减少会话票据被用作跨连接追踪机制的可能性，服务器现在会在每次恢复时（如果支持且未被禁用）发放新的票据，并且票据不再携带加密所用密钥的标识符。如果向 [`Conn.SetSessionTicketKeys`](/pkg/crypto/tls/#Conn.SetSessionTicketKeys) 传递大量密钥，这可能会导致明显的性能开销。

<!-- CL 497376 -->
客户端和服务器现在都实现了扩展主密钥扩展（RFC 7627）。已撤销 [`ConnectionState.TLSUnique`](/pkg/crypto/tls/#ConnectionState.TLSUnique) 的废弃决定，现在它会在支持扩展主密钥的恢复连接上被设置。

<!-- https://go.dev/issue/44886, https://go.dev/issue/60107, CL 493655, CL 496995, CL 514997 -->
新增的 [`QUICConn`](/pkg/crypto/tls/#QUICConn) 类型为 QUIC 实现提供了支持，包括 0-RTT 支持。请注意，这本身不是一个 QUIC 实现，并且 TLS 中仍然不支持 0-RTT。

<!-- https://go.dev/issue/46308, CL 497377 -->
新增的 [`VersionName`](/pkg/crypto/tls/#VersionName) 函数返回给定 TLS 版本号的名称。

<!-- https://go.dev/issue/52113, CL 410496 -->
服务器为客户端认证失败发送的 TLS 警报代码已得到改进。以前，这些失败总是导致 "bad certificate" 警报。现在，某些失败将导致更合适的警报代码，如 RFC 5246 和 RFC 8446 所定义：

  - 对于 TLS 1.3 连接，如果服务器配置为使用 [RequireAnyClientCert](/pkg/crypto/tls/#RequireAnyClientCert) 或 [RequireAndVerifyClientCert](/pkg/crypto/tls/#RequireAndVerifyClientCert) 要求客户端认证，而客户端未提供任何证书，服务器现在将返回 "certificate required" 警报。
  - 如果客户端提供的证书未由服务器上配置的受信任证书颁发机构集签名，服务器将返回 "unknown certificate authority" 警报。
  - 如果客户端提供的证书已过期或尚未生效，服务器将返回 "expired certificate" 警报。
  - 在所有其他与客户端认证失败相关的场景中，服务器仍然返回 "bad certificate"。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509/)

<!-- https://go.dev/issue/53573, CL 468875 -->
[`RevocationList.RevokedCertificates`](/pkg/crypto/x509/#RevocationList.RevokedCertificates) 已被弃用，并被新的 [`RevokedCertificateEntries`](/pkg/crypto/x509/#RevocationList.RevokedCertificateEntries) 字段取代，该字段是一个 [`RevocationListEntry`](/pkg/crypto/x509/#RevocationListEntry) 的切片。[`RevocationListEntry`](/pkg/crypto/x509/#RevocationListEntry) 包含了 [`pkix.RevokedCertificate`](/pkg/crypto/x509/pkix#RevokedCertificate) 中的所有字段，以及吊销原因代码。

<!-- CL 478216 -->
名称约束现在正确地在非叶子证书上强制执行，而不是在定义它们的证书上执行。

<!-- crypto/x509 -->

#### [debug/elf](/pkg/debug/elf/)

<!-- https://go.dev/issue/56892, CL 452617 -->
新增的 [`File.DynValue`](/pkg/debug/elf/#File.DynValue) 方法可用于检索与给定动态标签关联的数值。

<!-- https://go.dev/issue/56887, CL 452496 -->
在 `DT_FLAGS_1` 动态标签中允许的常量标志现在已定义为 [`DynFlag1`](/pkg/debug/elf/#DynFlag1) 类型。这些标签的名称以 `DF_1` 开头。

<!-- CL 473256 -->
该包现在定义了常量 [`COMPRESS_ZSTD`](/pkg/debug/elf/#COMPRESS_ZSTD)。

<!-- https://go.dev/issue/60348, CL 496918 -->
该包现在定义了常量 [`R_PPC64_REL24_P9NOTOC`](/pkg/debug/elf/#R_PPC64_REL24_P9NOTOC)。

<!-- debug/elf -->

#### [debug/pe](/pkg/debug/pe/)

<!-- CL 488475 -->
尝试使用 [`Section.Data`](/pkg/debug/pe/#Section.Data) 或 [`Section.Open`](/pkg/debug/pe/#Section.Open) 返回的读取器读取包含未初始化数据的节现在会返回错误。

<!-- debug/pe -->

#### [embed](/pkg/embed/)

<!-- https://go.dev/issue/57803, CL 483235 -->
由 [`FS.Open`](/pkg/embed/#FS.Open) 返回的 [`io/fs.File`](/pkg/io/fs/#File) 现在有一个 `ReadAt` 方法，该方法实现了 [`io.ReaderAt`](/pkg/io/#ReaderAt)。

<!-- https://go.dev/issue/54451, CL 491175 -->
调用 <code>[FS.Open](/pkg/embed/FS.Open).[Stat](/pkg/io/fs/#File.Stat)</code> 返回的类型现在实现了 `String` 方法，该方法会调用 [`io/fs.FormatFileInfo`](/pkg/io/fs/#FormatFileInfo)。

<!-- embed -->

#### [encoding/binary](/pkg/encoding/binary/)

<!-- https://go.dev/issue/57237, CL 463218, CL 463985 -->
新增的 [`NativeEndian`](/pkg/encoding/binary/#NativeEndian) 变量可用于使用当前机器的本地字节序在字节切片和整数之间进行转换。

<!-- encoding/binary -->#### [errors](/pkg/errors/)

<!-- https://go.dev/issue/41198, CL 473935 -->
新增的 [`ErrUnsupported`](/pkg/errors/#ErrUnsupported) 错误提供了一种标准化的方式来表明：由于不支持所请求的操作，该操作可能无法执行。例如，当使用的文件系统不支持硬链接时调用 [`os.Link`](/pkg/os/#Link)。

<!-- errors -->

#### [flag](/pkg/flag/)

<!-- https://go.dev/issue/53747, CL 476015 -->
新增的 [`BoolFunc`](/pkg/flag/#BoolFunc) 函数和 [`FlagSet.BoolFunc`](/pkg/flag/#FlagSet.BoolFunc) 方法定义了一个不需要参数的标志，当使用该标志时会调用一个函数。这类似于 [`Func`](/pkg/flag/#Func)，但适用于布尔类型的标志。

<!-- CL 480215 -->
如果已经对同名的标志调用过 [`Set`](/pkg/flag/#Set)，那么该标志的定义（通过 [`Bool`](/pkg/flag/#Bool)、[`BoolVar`](/pkg/flag/#BoolVar)、[`Int`](/pkg/flag/#Int)、[`IntVar`](/pkg/flag/#IntVar) 等）将会引发 panic。此更改旨在检测[初始化顺序变化](#language)导致标志操作顺序与预期不同的情况。在很多情况下，修复此问题的方法是引入一个显式的包依赖，以确保在任何 [`Set`](/pkg/flag/#Set) 操作之前正确定义标志。

<!-- flag -->

#### [go/ast](/pkg/go/ast/)

<!-- https://go.dev/issue/28089, CL 487935 -->
新增的 [`IsGenerated`](/pkg/go/ast/#IsGenerated) 谓词函数用于报告文件语法树是否包含[特殊注释](/s/generatedcode)，该注释通常表明该文件是由工具生成的。

<!-- https://go.dev/issue/59033, CL 476276 -->
新增的 [`File.GoVersion`](/pkg/go/ast/#File.GoVersion) 字段记录了任何 `//go:build` 或 `// +build` 指令所需的最低 Go 版本。

<!-- go/ast -->

#### [go/build](/pkg/go/build/)

<!-- https://go.dev/issue/56986, CL 453603 -->
该包现在可以解析文件头（`package` 声明之前）中的构建指令（以 `//go:` 开头的注释）。这些指令现在可以通过新增的 [`Package`](/pkg/go/build#Package) 字段 [`Directives`](/pkg/go/build#Package.Directives)、[`TestDirectives`](/pkg/go/build#Package.TestDirectives) 和 [`XTestDirectives`](/pkg/go/build#Package.XTestDirectives) 来访问。

<!-- go/build -->

#### [go/build/constraint](/pkg/go/build/constraint/)

<!-- https://go.dev/issue/59033, CL 476275 -->
新增的 [`GoVersion`](/pkg/go/build/constraint/#GoVersion) 函数返回一个构建表达式所隐含的最低 Go 版本。

<!-- go/build/constraint -->

#### [go/token](/pkg/go/token/)

<!-- https://go.dev/issue/57708, CL 464515 -->
新增的 [`File.Lines`](/pkg/go/token/#File.Lines) 方法以与 `File.SetLines` 接受的相同格式返回文件的行号表。

<!-- go/token -->

#### [go/types](/pkg/go/types/)

<!-- https://go.dev/issue/61175, CL 507975 -->
新增的 [`Package.GoVersion`](/pkg/go/types/#Package.GoVersion) 方法返回用于检查该包的 Go 语言版本。

<!-- go/types -->

#### [hash/maphash](/pkg/hash/maphash/)

<!-- https://go.dev/issue/47342, CL 468795 -->
`hash/maphash` 包现在提供了一个纯 Go 语言实现，可通过 `purego` 构建标签选择使用。

<!-- hash/maphash -->

#### [html/template](/pkg/html/template/)

<!-- https://go.dev/issue/59584, CL 496395 -->
当操作（action）出现在 JavaScript 模板字面量中时，会返回新的错误 [`ErrJSTemplate`](/pkg/html/template/#ErrJSTemplate)。以前返回的是一个未导出的错误。

<!-- html/template -->

#### [io/fs](/pkg/io/fs/)

<!-- https://go.dev/issue/54451, CL 489555 -->
新增的 [`FormatFileInfo`](/pkg/io/fs/#FormatFileInfo) 函数返回一个格式化后的 [`FileInfo`](/pkg/io/fs/#FileInfo)。新增的 [`FormatDirEntry`](/pkg/io/fs/#FormatDirEntry) 函数返回一个格式化后的 [`DirEntry`](/pkg/io/fs/#DirEntry)。[`ReadDir`](/pkg/io/fs/#ReadDir) 返回的 [`DirEntry`](/pkg/io/fs/#DirEntry) 实现现在包含一个调用 [`FormatDirEntry`](/pkg/io/fs/#FormatDirEntry) 的 `String` 方法，传递给 [`WalkDirFunc`](/pkg/io/fs/#WalkDirFunc) 的 [`DirEntry`](/pkg/io/fs/#DirEntry) 值也同样如此。

<!-- io/fs -->

<!-- https://go.dev/issue/56491 rolled back by https://go.dev/issue/60519 -->
<!-- CL 459435 reverted by CL 467255 -->
<!-- CL 467515 reverted by CL 499416 -->

#### [math/big](/pkg/math/big/)

<!-- https://go.dev/issue/56984, CL 453115, CL 500116 -->
新增的 [`Int.Float64`](/pkg/math/big/#Int.Float64) 方法返回最接近该多精度整数的浮点值，并指示发生的任何舍入情况。

<!-- math/big -->

#### [net](/pkg/net/)

<!-- https://go.dev/issue/59166, https://go.dev/issue/56539 -->
<!-- CL 471136, CL 471137, CL 471140 -->
在 Linux 系统上，当内核支持时，[net](/pkg/net/) 包现在可以使用多路径 TCP（Multipath TCP）。默认情况下不使用该功能。要在客户端可用时使用多路径 TCP，请在调用 [`Dialer.Dial`](/pkg/net/#Dialer.Dial) 或 [`Dialer.DialContext`](/pkg/net/#Dialer.DialContext) 方法之前调用 [`Dialer.SetMultipathTCP`](/pkg/net/#Dialer.SetMultipathTCP) 方法。要在服务端可用时使用多路径 TCP，请在调用 [`ListenConfig.Listen`](/pkg/net/#ListenConfig.Listen) 方法之前调用 [`ListenConfig.SetMultipathTCP`](/pkg/net/#ListenConfig.SetMultipathTCP) 方法。像往常一样指定网络为 `"tcp"`、`"tcp4"` 或 `"tcp6"`。如果内核或远程主机不支持多路径 TCP，连接将静默回退到普通的 TCP。要测试特定连接是否正在使用多路径 TCP，可以使用 [`TCPConn.MultipathTCP`](/pkg/net/#TCPConn.MultipathTCP) 方法。

在未来的 Go 版本中，我们可能会在支持它的系统上默认启用多路径 TCP。

<!-- net -->

#### [net/http](/pkg/net/http/)<!-- CL 472636 -->
新的 [`ResponseController.EnableFullDuplex`](/pkg/net/http#ResponseController.EnableFullDuplex) 方法允许服务器端处理程序在编写响应的同时并发读取 HTTP/1 请求体。通常，HTTP/1 服务器会在开始编写响应前自动消费掉所有剩余的请求体，以避免那些在读取响应前尝试写入完整请求的客户端出现死锁。`EnableFullDuplex` 方法会禁用此行为。

<!-- https://go.dev/issue/44855, CL 382117 -->
新的 [`ErrSchemeMismatch`](/pkg/net/http/#ErrSchemeMismatch) 错误由 [`Client`](/pkg/net/http/#Client) 和 [`Transport`](/pkg/net/http/#Transport) 在服务器以 HTTP 响应应答 HTTPS 请求时返回。

<!-- CL 494122 -->
[net/http](/pkg/net/http/) 包现在支持 [`errors.ErrUnsupported`](/pkg/errors/#ErrUnsupported)，
这意味着表达式 `errors.Is(http.ErrNotSupported, errors.ErrUnsupported)` 将返回 true。

<!-- net/http -->

#### [os](/pkg/os/)

<!-- https://go.dev/issue/32558, CL 219638 -->
程序现在可以向 [`Chtimes`](/pkg/os/#Chtimes) 函数传递一个空的 `time.Time` 值，以保持访问时间或修改时间不变。

<!-- CL 480135 -->
在 Windows 上，[`File.Chdir`](/pkg/os#File.Chdir) 方法现在会将当前目录更改为该文件，而不是总返回错误。

<!-- CL 495079 -->
在 Unix 系统上，如果一个非阻塞描述符被传递给 [`NewFile`](/pkg/os/#NewFile)，调用 [`File.Fd`](/pkg/os/#File.Chdir) 方法现在将返回一个非阻塞描述符。以前该描述符会被转换为阻塞模式。

<!-- CL 477215 -->
在 Windows 上，对不存在的文件调用 [`Truncate`](/pkg/os/#Truncate) 以前会创建一个空文件。现在它会返回一个指示文件不存在的错误。

<!-- https://go.dev/issue/56899, CL 463219 -->
在 Windows 上，调用 [`TempDir`](/pkg/os/#TempDir) 现在会使用 GetTempPath2W（如果可用），而不是 GetTempPathW。这一新行为是一项安全加固措施，可防止以 SYSTEM 身份运行的进程创建的临时文件被非 SYSTEM 进程访问。

<!-- CL 493036 -->
在 Windows 上，os 包现在支持处理文件名（以 UTF-16 存储）无法表示为有效 UTF-8 的文件。

<!-- CL 463177 -->
在 Windows 上，[`Lstat`](/pkg/os/#Lstat) 现在会对以路径分隔符结尾的路径解析符号链接，与其在 POSIX 平台上的行为保持一致。

<!-- https://go.dev/issue/54451, CL 491175 -->
由 [`ReadDir`](/pkg/os/#ReadDir) 函数和 [`File.ReadDir`](/pkg/os/#File.ReadDir) 方法返回的 [`io/fs.DirEntry`](/pkg/io/fs/#DirEntry) 接口的实现，现在实现了一个调用 [`io/fs.FormatDirEntry`](/pkg/io/fs/#FormatDirEntry) 的 `String` 方法。

<!-- https://go.dev/issue/53761, CL 416775, CL 498015-->
由 [`DirFS`](/pkg/os/#DirFS) 函数返回的 [`io/fs.FS`](/pkg/io/fs/#FS) 接口的实现，现在也实现了 [`io/fs.ReadFileFS`](/pkg/io/fs/#ReadFileFS) 和 [`io/fs.ReadDirFS`](/pkg/io/fs/#ReadDirFS) 接口。

<!-- os -->

#### [path/filepath](/pkg/path/filepath/)

传递给 [`WalkDir`](/pkg/path/filepath/#WalkDir) 函数参数的 [`io/fs.DirEntry`](/pkg/io/fs/#DirEntry) 接口的实现，现在实现了一个调用 [`io/fs.FormatDirEntry`](/pkg/io/fs/#FormatDirEntry) 的 `String` 方法。

<!-- path/filepath -->

<!-- CL 459455 reverted -->

#### [reflect](/pkg/reflect/)

<!-- CL 408826, CL 413474 -->
在 Go 1.21 中，[`ValueOf`](/pkg/reflect/#ValueOf) 不再强制将其参数分配在堆上，允许 `Value` 的内容分配在栈上。对 `Value` 的大多数操作也允许底层值进行栈分配。

<!-- https://go.dev/issue/55002 -->
新的 [`Value`](/pkg/reflect/#Value) 方法 [`Value.Clear`](/pkg/reflect/#Value.Clear) 可以清空 map 的内容或将 slice 的内容置零。这对应于语言[新增](#language)的内置 `clear` 函数。

<!-- https://go.dev/issue/56906, CL 452762 -->
[`SliceHeader`](/pkg/reflect/#SliceHeader) 和 [`StringHeader`](/pkg/reflect/#StringHeader) 类型现已弃用。在新代码中，请优先使用 [`unsafe.Slice`](/pkg/unsafe/#Slice)、[`unsafe.SliceData`](/pkg/unsafe/#SliceData)、[`unsafe.String`](/pkg/unsafe/#String) 或 [`unsafe.StringData`](/pkg/unsafe/#StringData)。

<!-- reflect -->

#### [regexp](/pkg/regexp/)

<!-- https://go.dev/issue/46159, CL 479401 -->
[`Regexp`](/pkg/regexp#Regexp) 现在定义了 [`MarshalText`](/pkg/regexp#Regexp.MarshalText) 和 [`UnmarshalText`](/pkg/regexp#Regexp.UnmarshalText) 方法。它们实现了 [`encoding.TextMarshaler`](/pkg/encoding#TextMarshaler) 和 [`encoding.TextUnmarshaler`](/pkg/encoding#TextUnmarshaler) 接口，并将被诸如 [encoding/json](/pkg/encoding/json) 等包使用。

<!-- regexp -->

#### [runtime](/pkg/runtime/)

<!-- https://go.dev/issue/38651, CL 435337 -->
Go 程序产生的文本堆栈跟踪信息，例如在崩溃、调用 `runtime.Stack` 或使用 `debug=2` 收集 goroutine 配置文件时产生的信息，现在包含了在堆栈跟踪中创建每个 goroutine 的 goroutine 的 ID。

<!-- https://go.dev/issue/57441, CL 474915 -->
崩溃的 Go 应用程序现在可以通过设置环境变量 `GOTRACEBACK=wer` 或在崩溃前调用 [`debug.SetTraceback("wer")`](/pkg/runtime/debug/#SetTraceback) 来选择加入 Windows 错误报告 (WER)。除了启用 WER 之外，运行时的行为将与 `GOTRACEBACK=crash` 相同。在非 Windows 系统上，`GOTRACEBACK=wer` 将被忽略。

<!-- CL 447778 -->
`GODEBUG=cgocheck=2`（一个用于彻底检查 cgo 指针传递规则的工具）不再作为[调试选项](/pkg/runtime#hdr-Environment_Variables)可用。取而代之的是，可以使用 `GOEXPERIMENT=cgocheck2` 将其作为实验特性启用。特别地，这意味着该模式必须在构建时而非启动时选择。`GODEBUG=cgocheck=1` 仍然可用（并且仍然是默认值）。

<!-- https://go.dev/issue/46787, CL 367296 -->
runtime 包中添加了一个新的类型 `Pinner`。`Pinner` 可用于 "固定" Go 内存，以便非 Go 代码能更自由地使用它。例如，现在允许将引用了已固定 Go 内存的 Go 值传递给 C 代码。此前，根据 [cgo 指针传递规则](https://pkg.go.dev/cmd/cgo#hdr-Passing_pointers)，传递任何此类嵌套引用都是不允许的。详情请参阅[文档](/pkg/runtime#Pinner)。

<!-- CL 472195 no release note needed -->

<!-- runtime -->

#### [runtime/metrics](/pkg/runtime/metrics/)

<!-- https://go.dev/issue/56857, CL 497315 -->
一些以前是内部指标的 GC 指标，例如活跃堆大小，现在可供外部访问了。`GOGC` 和 `GOMEMLIMIT` 现在也可作为指标获取。

<!-- runtime/metrics -->

#### [runtime/trace](/pkg/runtime/trace/)

<!-- https://go.dev/issue/16638 -->
现在，在 amd64 和 arm64 上收集跟踪信息产生的 CPU 开销大大减少：相比上一版本，性能提升了高达 10 倍。

<!-- CL 494495 -->
跟踪信息现在包含显式的 "stop-the-world" 事件，涵盖了 Go 运行时可能暂停所有 goroutine 的每一个原因，而不仅仅是垃圾回收。

<!-- runtime/trace -->

#### [sync](/pkg/sync/)

<!-- https://go.dev/issue/56102, CL 451356 -->
新增的 [`OnceFunc`](/pkg/sync/#OnceFunc)、[`OnceValue`](/pkg/sync/#OnceValue) 和 [`OnceValues`](/pkg/sync/#OnceValues) 函数封装了 [Once](/pkg/sync/#Once) 的一种常见用法：在首次使用时延迟初始化一个值。

#### [syscall](/pkg/syscall/)

<!-- CL 480135 -->
在 Windows 上，[`Fchdir`](/pkg/syscall#Fchdir) 函数现在会将当前目录更改为其实参指定的目录，而不是总返回错误。

<!-- https://go.dev/issue/46259, CL 458335 -->
在 FreeBSD 上，[`SysProcAttr`](/pkg/syscall#SysProcAttr) 增加了一个新字段 `Jail`，可用于将新创建的进程放入受限环境（jail）中。

<!-- CL 493036 -->
在 Windows 上，syscall 包现在支持处理那些以 UTF-16 编码存储、无法用有效 UTF-8 表示的文件名。[`UTF16ToString`](/pkg/syscall#UTF16ToString) 和 [`UTF16FromString`](/pkg/syscall#UTF16FromString) 函数现在可以在 UTF-16 数据和 [WTF-8](https://simonsapin.github.io/wtf-8/) 字符串之间进行转换。这是向后兼容的，因为 WTF-8 是早期版本使用的 UTF-8 格式的超集。

<!-- CL 476578, CL 476875, CL 476916 -->
若干错误值现在与新的 [`errors.ErrUnsupported`](/pkg/errors/#ErrUnsupported) 匹配，使得 `errors.Is(err, errors.ErrUnsupported)` 会返回 true。
  - `ENOSYS`
  - `ENOTSUP`
  - `EOPNOTSUPP`
  - `EPLAN9` (仅 Plan 9)
  - `ERROR_CALL_NOT_IMPLEMENTED` (仅 Windows)
  - `ERROR_NOT_SUPPORTED` (仅 Windows)
  - `EWINDOWS` (仅 Windows)

<!-- syscall -->

#### [testing](/pkg/testing/)

<!-- https://go.dev/issue/37708, CL 463837 -->
新增的 `-test.fullpath` 选项将在测试日志消息中打印完整路径名，而不是仅打印基本文件名。

<!-- https://go.dev/issue/52600, CL 475496 -->
新增的 [`Testing`](/pkg/testing/#Testing) 函数用于报告当前程序是否是由 `go` `test` 创建的测试。

<!-- testing -->

#### [testing/fstest](/pkg/testing/fstest/)

<!-- https://go.dev/issue/54451, CL 491175 -->
调用 <code>[Open](/pkg/testing/fstest/MapFS.Open).[Stat](/pkg/io/fs/#File.Stat)</code> 返回的类型现在实现了一个 `String` 方法，该方法会调用 [`io/fs.FormatFileInfo`](/pkg/io/fs/#FormatFileInfo)。

<!-- testing/fstest -->

#### [unicode](/pkg/unicode/)

<!-- CL 456837 -->
[`unicode`](/pkg/unicode/) 包以及整个系统的相关支持已升级到 [Unicode 15.0.0](https://www.unicode.org/versions/Unicode15.0.0/)。

<!-- unicode -->

## 平台支持 {#ports}

### Darwin {#darwin}

<!-- https://go.dev/issue/57125 -->
正如 Go 1.20 发布说明中所[宣布](go1.20#darwin)的，Go 1.21 要求 macOS 10.15 Catalina 或更高版本；已停止对早期版本的支持。

### Windows {#windows}

<!-- https://go.dev/issue/57003, https://go.dev/issue/57004 -->
正如 Go 1.20 发布说明中所[宣布](go1.20#windows)的，Go 1.21 要求至少 Windows 10 或 Windows Server 2016；已停止对早期版本的支持。

### ARM

<!-- CL 470695 -->

当在非 ARM 系统上使用 `GOARCH=arm` 构建 Go 发行版时（即构建面向 ARM 的交叉编译器时），`GOARM` 环境变量的默认值现在总是设置为 `7`。此前，该默认值取决于构建系统的特性。

当不构建交叉编译器时，默认值通过检查构建系统来确定。这在之前和 Go 1.21 中都没有变化。变化的是构建交叉编译器时的行为。

### WebAssembly {#wasm}

<!-- https://go.dev/issue/38248, https://go.dev/issue/59149, CL 489255 -->
新的 `go:wasmimport` 指令现在可用于 Go 程序中，以从 WebAssembly 宿主环境导入函数。

<!-- https://go.dev/issue/56100 -->

Go 调度器现在与 JavaScript 事件循环的交互效率大大提高，尤其是在那些经常因异步事件而阻塞的应用程序中。

### WebAssembly System Interface {#wasip1}

<!-- https://go.dev/issue/58141 -->
Go 1.21 增加了一个面向 [WebAssembly System Interface (WASI)](https://wasi.dev/) 预览版 1 的实验性移植 (`GOOS=wasip1`, `GOARCH=wasm`)。

由于增加了新的 `GOOS` 值 "`wasip1`"，名为 `*_wasip1.go` 的 Go 文件现在将[被 Go 工具忽略](/pkg/go/build/#hdr-Build_Constraints)，除非正在使用该 `GOOS` 值。如果你现有的文件名匹配该模式，则需要将其重命名。

### ppc64/ppc64le {#PPC64}<!-- go.dev/issue/44549 -->
在 Linux 上，`GOPPC64=power10` 现在会生成 PC 相对指令、带前缀指令以及其他新的 Power10 指令。在 AIX 上，`GOPPC64=power10` 会生成 Power10 指令，但不生成 PC 相对指令。

当为 `GOOS=linux` `GOARCH=ppc64le` 平台并设置 `GOPPC64=power10` 构建位置无关二进制文件时，用户在大多数情况下可以预期二进制文件大小会减小，在某些情况下能减少 3.5%。为 ppc64le 构建位置无关二进制文件时需要使用以下 `-buildmode` 值：
`c-archive`、`c-shared`、`shared`、`pie`、`plugin`。

### loong64 {#loong64}

<!-- go.dev/issue/53301, CL 455075, CL 425474, CL 425476, CL 425478, CL 489576 -->
`linux/loong64` 移植版本现在支持 `-buildmode=c-archive`、`-buildmode=c-shared` 和 `-buildmode=pie`。

<!--
 以下为 x 仓库的相关提案，无需在此提及，但会被 relnote 工具捕获。
 -->
<!-- https://go.dev/issue/54232 -->
<!-- https://go.dev/issue/57051 -->
<!-- https://go.dev/issue/57792 -->
<!-- https://go.dev/issue/57906 -->
<!-- https://go.dev/issue/58668 -->
<!-- https://go.dev/issue/59016 -->
<!-- https://go.dev/issue/59676 -->
<!-- https://go.dev/issue/60409 -->
<!-- https://go.dev/issue/61176 -->
<!-- cmd/api 的相关变更，无需发布说明。 -->
<!-- CL 469115, CL 469135, CL 499981 -->
<!-- 无需发布说明的提案。 -->
<!-- https://go.dev/issue/10275 -->
<!-- https://go.dev/issue/59719 -->