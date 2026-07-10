---
path: /doc/go1.22
title: Go 1.22 发布说明
<!--
注意：在本文档及该目录下的其他文档中，惯例是将固定宽度短语与非固定宽度空格组合使用，例如
<code>hello</code> <code>world</code>。
请勿提交移除此类短语内部标签的CL。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.22 简介 {#introduction}

最新的Go版本1.22在[Go 1.21](/doc/go1.21)发布六个月后到来。其主要变更集中在工具链、运行时和库的实现方面。一如既往，本次发布遵循Go 1的[兼容性承诺](/doc/go1compat)。我们预计几乎所有Go程序都能像之前一样继续编译和运行。

## 语言变更 {#language}

<!-- 循环变量作用域 -->
<!-- range遍历整数 -->
Go 1.22对"for"循环进行了两项变更：

  - 以往，"for"循环声明的变量仅创建一次并在每次迭代中更新。在Go 1.22中，循环的每次迭代都会创建新变量，以避免意外的变量共享bug。
    提案中描述的[过渡支持工具](/wiki/LoopvarExperiment#my-test-fails-with-the-change-how-can-i-debug-it)将继续以与Go 1.21相同的方式工作。
  - "for"循环现在可以遍历整数。
    例如[示例代码](/play/p/ky02zZxgk_r?v=gotip)：

    	package main

    	import "fmt"

    	func main() {
    	  for i := range 10 {
    	    fmt.Println(10 - i)
    	  }
    	  fmt.Println("go1.22 has lift-off!")
    	}

    详细说明请参阅规范中的[相关部分](/ref/spec#For_range)。

<!-- range遍历函数 GOEXPERIMENT；参见 https://go.dev/issue/61405, https://go.dev/issue/61897, CLs 510541,539277,540263,543319 -->

Go 1.22包含我们正在考虑的未来Go版本语言变更的预览：[range遍历函数的迭代器](/wiki/RangefuncExperiment)。使用`GOEXPERIMENT=rangefunc`构建即可启用此功能。

## 工具更新 {#tools}

### Go命令 {#go-command}

<!-- https://go.dev/issue/60056 -->

[工作空间](/ref/mod#workspaces)中的命令现在可以使用包含工作空间依赖项的`vendor`目录。该目录通过[`go` `work` `vendor`](/pkg/cmd/go#hdr-Make_vendored_copy_of_dependencies)创建，并在`-mod`标志设置为`vendor`时用于构建命令（当工作空间存在`vendor`目录时，这是默认设置）。

请注意，工作空间的`vendor`目录内容与单个模块的目录不同：如果工作空间根目录还包含工作空间中的某个模块，其`vendor`目录可以包含工作空间或该模块的依赖项，但不能同时包含两者。

<!-- CL 518775, https://go.dev/issue/60915 -->

在旧版`GOPATH`模式（即`GO111MODULE=off`）下，模块外部不再支持`go` `get`命令。其他构建命令（如`go` `build`和`go` `test`）将继续为旧版`GOPATH`程序无限期工作。

<!-- CL 518776 -->

`go` `mod` `init`不再尝试从其他供应商工具（如`Gopkg.lock`）的配置文件导入模块依赖项。

<!-- CL 495447 -->

`go` `test` `-cover`现在为没有测试文件的被覆盖包打印覆盖率摘要。在Go 1.22之前，对此类包运行`go` `test` `-cover`会报告：

`?     mymod/mypack    [no test files]`

而在Go 1.22中，包中的函数将被视为未覆盖：

`mymod/mypack    coverage: 0.0% of statements`

请注意，如果包完全不包含可执行代码，我们将无法报告有意义的覆盖率百分比；对于此类包，`go`工具将继续报告没有测试文件。

<!-- CL 522239, https://go.dev/issue/46330 -->

现在，当需要使用外部（C）链接器但未启用cgo时，调用链接器的`go`构建命令会报错。（Go运行时需要cgo支持以确保与C链接器添加的任何附加库兼容。）

### 跟踪工具 {#trace}

<!-- https://go.dev/issue/63960 -->

作为支持新跟踪器工作的一部分，`trace`工具的Web界面已进行轻微更新，解决了多个问题并提高了各子页面的可读性。
Web界面现在支持以线程导向视图探索跟踪记录。
跟踪查看器现在还显示所有系统调用的完整持续时间。
\
这些改进仅适用于查看使用Go 1.22或更新版本构建的程序产生的跟踪记录。
未来版本将把这些改进部分应用于旧版Go生成的跟踪记录。

### 静态检查工具 {#vet}

#### 循环变量引用 {#vet-loopclosure}

<!-- CL 539016, https://go.dev/issue/63888: cmd/vet: 对具有新生命周期规则的循环变量不报告变量捕获 -->
`vet`工具的行为已变更，以匹配Go 1.22中循环变量的新语义（见上文）。
当分析需要Go 1.22或更新版本的文件时（由于其go.mod文件或每个文件的构建约束），`vet`不再报告函数字面量中对循环变量的引用（该引用可能比循环迭代存活更久）。
在Go 1.22中，循环变量在每次迭代中都会重新创建，因此此类引用不再存在循环更新后使用变量的风险。

#### 新增缺失append值的警告 {#vet-appends}

<!-- CL 498416, https://go.dev/issue/60448: 新增用于检查append后缺失值的分析器 -->
`vet`工具现在会报告未传递待追加值的[`append`](/pkg/builtin/#append)调用，例如`slice = append(slice)`。
此类语句无实际效果，经验证表明这几乎总是错误。

#### 新增延迟`time.Since`的警告 {#vet-defers}<!-- CL 527095, https://go.dev/issue/60048: time.Since should not be used in defer statement -->
`vet` 工具现在会报告在 `defer` 语句中对 [`time.Since(t)`](/pkg/time/#Since) 的非延迟调用。这等效于在 `defer` 语句之前调用 `time.Now().Sub(t)`，而不是在延迟函数被调用时执行。在几乎所有情况下，正确的代码都需要延迟 `time.Since` 调用。例如：

	t := time.Now()
	defer log.Println(time.Since(t)) // 对 time.Since 的非延迟调用
	tmp := time.Since(t); defer log.Println(tmp) // 等效于上一个 defer

	defer func() {
	  log.Println(time.Since(t)) // 对 time.Since 的正确延迟调用
	}()

#### 新增对 `log/slog` 调用中键值对不匹配的警告 {#vet-slog}

<!-- CL 496156, https://go.dev/issue/59407: log/slog: add vet checks for variadic ...any inputs -->
`vet` 工具现在会报告对结构化日志包 [`log/slog`](/pkg/log/slog) 中接受交替键/值对的函数和方法的调用中的无效参数。它会报告以下情况：键位置的参数既不是 `string` 也不是 `slog.Attr`，以及缺少最终键所对应的值。

## 运行时 {#runtime}

<!-- CL 543255 -->
运行时现在将基于类型的垃圾回收元数据更靠近每个堆对象，从而将 Go 程序的 CPU 性能（延迟或吞吐量）提升了 1-3%。
此更改还通过消除冗余元数据的重复，将大多数 Go 程序的内存开销降低了约 1%。
由于此更改调整了内存分配器的大小类边界，因此某些对象可能被移至更大的大小类，一些程序可能看到的改进幅度较小。

此更改的一个后果是，一些先前地址总是对齐到 16 字节（或更高）边界上的对象，现在将只对齐到 8 字节边界。
某些使用要求内存地址超过 8 字节对齐的汇编指令，并依赖于内存分配器先前对齐行为的程序可能会出现问题，但我们预计此类程序很少。
此类程序可以使用 `GOEXPERIMENT=noallocheaders` 构建，以恢复到旧的元数据布局和先前的对齐行为，但包所有者应更新其汇编代码以避免对齐假设，因为此变通方法将在未来的版本中移除。

<!-- CL 525475 -->
在 `windows/amd64 平台`上，链接或加载使用 `-buildmode=c-archive` 或 `-buildmode=c-shared` 构建的 Go 库的程序现在可以使用 `SetUnhandledExceptionFilter` Win32 函数来捕获 Go 运行时未处理的异常。请注意，这在 `windows/386` 平台上已经支持。

## 编译器 {#compiler}

<!-- https://go.dev/issue/61577 -->
[配置文件引导优化 (PGO)](/doc/pgo) 构建现在可以对更高比例的调用进行去虚拟化。来自一组代表性 Go 程序的大多数程序，通过启用 PGO，现在在运行时看到 2% 到 14% 的性能提升。

<!-- https://go.dev/cl/528321 -->
编译器现在将去虚拟化和内联操作交错进行，因此接口方法调用得到了更好的优化。

<!-- https://go.dev/issue/61502 -->
Go 1.22 还包含了一个编译器内联阶段增强实现的预览，该实现使用启发式方法来提升在被认为“重要”的调用点（例如，在循环中）的内联性，并抑制在被认为“不重要”的调用点（例如，在 panic 路径上）的内联。
使用 `GOEXPERIMENT=newinliner` 构建可启用新的调用点启发式方法；更多信息和反馈请参阅 [issue #61502](/issue/61502)。

## 链接器 {#linker}

<!-- CL 493136 -->
链接器的 `-s` 和 `-w` 标志现在在所有平台上的行为更加一致。
`-w` 标志抑制 DWARF 调试信息的生成。
`-s` 标志抑制符号表的生成。
`-s` 标志同时也隐含了 `-w` 标志，这可以通过 `-w=0` 取消。
也就是说，`-s` `-w=0` 将生成一个带有 DWARF 调试信息但没有符号表的二进制文件。

<!-- CL 511475 -->
在 ELF 平台上，链接器的 `-B` 标志现在接受一种特殊形式：使用 `-B` `gobuildid` 时，链接器将生成一个派生自 Go 构建 ID 的 GNU 构建 ID（ELF `NT_GNU_BUILD_ID` 注释）。

<!-- CL 534555 -->
在 Windows 上，当使用 `-linkmode=internal` 构建时，链接器现在会通过将 `.pdata` 和 `.xdata` 段复制到最终二进制文件中来保留 C 目标文件中的 SEH 信息。
这有助于使用原生工具（如 WinDbg）进行调试和分析二进制文件。
请注意，直到现在，C 函数的 SEH 异常处理程序尚未被正确处理，因此此更改可能导致某些程序行为不同。
`-linkmode=external` 不受此更改影响，因为外部链接器已经保留了 SEH 信息。

## 引导 {#bootstrap}

如 [Go 1.20 发行说明](/doc/go1.20#bootstrap)中所述，Go 1.22 现在要求使用 Go 1.20 的最终点发行版或更高版本进行引导。
我们预计 Go 1.24 将要求使用 Go 1.22 的最终点发行版或更高版本进行引导。

## 标准库 {#library}

### 新增 math/rand/v2 包 {#math_rand_v2}

<!-- CL 502495 -->
<!-- CL 502497 -->
<!-- CL 502498 -->
<!-- CL 502499 -->
<!-- CL 502500 -->
<!-- CL 502505 -->
<!-- CL 502506 -->
<!-- CL 516857 -->
<!-- CL 516859 -->

Go 1.22 包含了标准库中的第一个“v2”包，[`math/rand/v2`](/pkg/math/rand/v2/)。
与 [`math/rand`](/pkg/math/rand/) 相比的更改详见 [proposal #61716](/issue/61716)。最重要的更改是：- `math/rand` 中已弃用的 `Read` 方法并未在 `math/rand/v2` 中保留。
  （该方法在 `math/rand` 中仍然可用。）
  绝大多数对 `Read` 的调用应改用 [`crypto/rand` 的 `Read`](/pkg/crypto/rand/#Read) 方法。
  否则，可使用 `Uint64` 方法构造自定义的 `Read` 方法。
- 通过顶层函数访问的全局生成器已无条件地采用随机种子初始化。
  由于 API 保证结果序列非固定，现在可以采用诸如“按线程维护独立随机生成器状态”等优化手段。
- [`Source`](/pkg/math/rand/v2/#Source) 接口现在仅包含一个 `Uint64` 方法；
  不再提供 `Source64` 接口。
- 许多方法现已采用更高效的算法，这些算法因会改变输出序列而无法在 `math/rand` 中应用。
- `math/rand` 中的顶层函数和方法
  `Intn`、`Int31`、`Int31n`、`Int63` 和 `Int64n`
  在 `math/rand/v2` 中采用更符合习惯的命名：
  `IntN`、`Int32`、`Int32N`、`Int64` 和 `Int64N`。
  同时新增了顶层函数和方法
  `Uint32`、`Uint32N`、`Uint64`、`Uint64N` 和 `UintN`。
- 新的泛型函数 [`N`](/pkg/math/rand/v2/#N) 类似于
  [`Int64N`](/pkg/math/rand/v2/#Int64N) 或 [`Uint64N`](/pkg/math/rand/v2/#Uint64N)，
  但适用于任意整数类型。
  例如，生成 0 到 5 分钟之间的随机时间间隔可写作 `rand.N(5*time.Minute)`。
- [`math/rand` 的 `Source`](/pkg/math/rand/#Source) 所提供的 Mitchell & Reeds LFSR 生成器已被两种更现代的伪随机生成器源取代：
  [`ChaCha8`](/pkg/math/rand/v2/#ChaCha8) 和 [`PCG`](/pkg/math/rand/v2/#PCG)。
  ChaCha8 是一种加密安全性较强的新型随机数生成器，其效率与 PCG 大致相当。
  ChaCha8 是 `math/rand/v2` 中顶层函数使用的算法。
  自 Go 1.22 起，`math/rand` 的顶层函数（未显式设置种子时）和 Go 运行时也采用 ChaCha8 生成随机数。

我们计划在未来的版本（可能是 Go 1.23）中包含 API 迁移工具。

### 新增 go/version 包 {#go-version}

<!-- https://go.dev/issue/62039, https://go.dev/cl/538895 -->
新的 [`go/version`](/pkg/go/version/) 包实现了用于验证和比较 Go 版本字符串的函数。

### 路由模式增强 {#enhanced_routing_patterns}

<!-- https://go.dev/issue/61410 -->
标准库中的 HTTP 路由现在具有更强的表达能力。
[`net/http.ServeMux`](/pkg/net/http#ServeMux) 使用的模式已增强，可接受方法限定和通配符。

注册带方法限定的处理器（如 `"POST /items/create"`）会将该处理器的调用限制为指定方法的请求。带方法限定的模式优先于匹配但无方法限定的模式。
作为特例，注册处理器时使用 `"GET"` 同样会注册 `"HEAD"` 方法。

模式中的通配符（如 `/items/{id}`）匹配 URL 路径中的段。
可通过调用 [`Request.PathValue`](/pkg/net/http#Request.PathValue) 方法获取实际匹配的路径段值。
以 "..." 结尾的通配符（如 `/files/{path...}`）必须位于模式末尾，并匹配所有剩余路径段。

以 "/" 结尾的模式仍会匹配所有以其为前缀的路径。
如需匹配包含尾部斜杠的精确路径，需以 `{$}` 结尾，
例如 `/exact/match/{$}`。

若两个模式匹配的请求存在重叠，则更具体的模式优先。
若两者具体程度相同，则模式冲突。
此规则概括了原有的优先级规则，并保持了模式注册顺序无关的特性。

此变更在兼容性方面有少量破坏性改变，部分较为明显——包含 "{" 和 "}" 的模式行为不同——
部分较隐晦——转义路径的处理已优化。
该变更受 [`GODEBUG`](/doc/godebug) 字段 `httpmuxgo121` 控制。
设置 `httpmuxgo121=1` 可恢复旧有行为。

### 标准库次要变更 {#minor_library_changes}

如往常一样，标准库包含多项细微变更和更新，
均遵循 Go 1 的[兼容性承诺](/doc/go1compat)。
同时还有多项性能改进，此处不再逐一列举。

[archive/tar](/pkg/archive/tar/)

:   <!-- https://go.dev/issue/58000, CL 513316 -->
    新增方法 [`Writer.AddFS`](/pkg/archive/tar#Writer.AddFS) 可将 [`fs.FS`](/pkg/io/fs#FS) 中的所有文件添加至归档。

<!-- archive/tar -->

[archive/zip](/pkg/archive/zip/)

:   <!-- https://go.dev/issue/54898, CL 513438 -->
    新增方法 [`Writer.AddFS`](/pkg/archive/zip#Writer.AddFS) 可将 [`fs.FS`](/pkg/io/fs#FS) 中的所有文件添加至归档。

<!-- archive/zip -->

[bufio](/pkg/bufio/)

:   <!-- https://go.dev/issue/56381, CL 498117 -->
    当 [`SplitFunc`](/pkg/bufio#SplitFunc) 返回 [`ErrFinalToken`](/pkg/bufio#ErrFinalToken) 且 token 为 `nil` 时，[`Scanner`](/pkg/bufio#Scanner) 现在将立即停止。
    以前它会在停止前报告一个最终的空 token，这通常不符合预期。
    若需报告最终的空 token，可返回 `[]byte{}` 而非 `nil`。

<!-- bufio -->

[crypto/tls](/pkg/crypto/tls/)

<!-- 注意：原文档此处以[crypto/tls]开头，但根据翻译规则，markdown格式保持不变，因此仅翻译描述文本 -->
[cmp](/pkg/cmp/)

:   <!-- https://go.dev/issue/60204 -->
    <!-- CL 504883 -->
    新增函数 `Or` 返回序列中第一个非零值的元素。:   <!-- https://go.dev/issue/43922, CL 544155 -->
    [`ConnectionState.ExportKeyingMaterial`](/pkg/crypto/tls#ConnectionState.ExportKeyingMaterial) 现在会返回错误，除非正在使用 TLS 1.3，或者服务器和客户端都支持 `extended_master_secret` 扩展。`crypto/tls` 自 Go 1.20 起已支持此扩展。可以通过 `tlsunsafeekm=1` GODEBUG 设置来禁用此行为。

    <!-- https://go.dev/issue/62459, CL 541516 -->
    默认情况下，如果未通过 [`config.MinimumVersion`](/pkg/crypto/tls#Config.MinimumVersion) 指定，`crypto/tls` 服务器现在提供的最低版本为 TLS 1.2，这与 `crypto/tls` 客户端的行为一致。可以通过 `tls10server=1` GODEBUG 设置来撤销此变更。

    <!-- https://go.dev/issue/63413, CL 541517 -->
    默认情况下，在 TLS 1.3 之前的握手中，客户端和服务器不再提供不支持 ECDHE 的密码套件。可以通过 `tlsrsakex=1` GODEBUG 设置来撤销此变更。

<!-- crypto/tls -->

[crypto/x509](/pkg/crypto/x509/)

:   <!-- https://go.dev/issue/57178 -->
    新方法 [`CertPool.AddCertWithConstraint`](/pkg/crypto/x509#CertPool.AddCertWithConstraint) 可用于向根证书添加自定义约束，这些约束将在证书链构建期间应用。

    <!-- https://go.dev/issue/58922, CL 519315-->
    在 Android 上，根证书现在会从 `/data/misc/keychain/certs-added` 以及 `/system/etc/security/cacerts` 加载。

    <!-- https://go.dev/issue/60665, CL 520535 -->
    新类型 [`OID`](/pkg/crypto/x509#OID) 支持单个组件大于 31 位的 ASN.1 对象标识符。`Certificate` 结构体中添加了一个使用此类型的新字段 [`Policies`](/pkg/crypto/x509#Certificate.Policies)，并且现在在解析时会填充该字段。任何无法使用 [`asn1.ObjectIdentifier`](/pkg/encoding/asn1#ObjectIdentifier) 表示的 OID 将出现在 `Policies` 中，但不会出现在旧的 `PolicyIdentifiers` 字段中。
    当调用 [`CreateCertificate`](/pkg/crypto/x509#CreateCertificate) 时，`Policies` 字段会被忽略，策略取自 `PolicyIdentifiers` 字段。使用 `x509usepolicies=1` GODEBUG 设置会反转此行为，从 `Policies` 字段填充证书策略，并忽略 `PolicyIdentifiers` 字段。我们可能会在 Go 1.23 中更改 `x509usepolicies` 的默认值，使 `Policies` 成为序列化的默认字段。

<!-- crypto/x509 -->

[database/sql](/pkg/database/sql/)

:   <!-- https://go.dev/issue/60370, CL 501700 -->
    新类型 [`Null[T]`](/pkg/database/sql/#Null) 为任何列类型的可空列提供了一种扫描方式。

<!-- database/sql -->

[debug/elf](/pkg/debug/elf/)

:   <!-- https://go.dev/issue/61974, CL 469395 -->
    定义了常量 `R_MIPS_PC32`，用于 MIPS64 系统。

    <!-- https://go.dev/issue/63725, CL 537615 -->
    为 LoongArch 系统定义了额外的 `R_LARCH_*` 常量。

<!-- debug/elf -->

[encoding](/pkg/encoding/)

:   <!-- https://go.dev/issue/53693, https://go.dev/cl/504884 -->
    包 [`encoding/base32`](/pkg/encoding/base32)、[`encoding/base64`](/pkg/encoding/base64) 和 [`encoding/hex`](/pkg/encoding/hex) 中的每种 `Encoding` 类型都新增了 `AppendEncode` 和 `AppendDecode` 方法，通过处理字节切片缓冲区管理，简化了与字节切片之间的编码和解码操作。

    <!-- https://go.dev/cl/505236 -->
    如果 `padding` 参数是除 `NoPadding` 之外的负值，方法 [`base32.Encoding.WithPadding`](/pkg/encoding/base32#Encoding.WithPadding) 和 [`base64.Encoding.WithPadding`](/pkg/encoding/base64#Encoding.WithPadding) 现在会 panic。

<!-- encoding -->

[encoding/json](/pkg/encoding/json/)

:   <!-- https://go.dev/cl/521675 -->
    序列化（Marshaling）和编码功能现在将 `'\b'` 和 `'\f'` 字符分别转义为 `\b` 和 `\f`，而不是 `\u0008` 和 `\u000c`。

<!-- encoding/json -->

[go/ast](/pkg/go/ast/)

:   <!-- https://go.dev/issue/52463, https://go.dev/cl/504915 -->
    以下与[语法标识符解析](https://pkg.go.dev/go/ast#Object)相关的声明现已被[弃用](/issue/52463)：
    `Ident.Obj`、`Object`、`Scope`、`File.Scope`、`File.Unresolved`、`Importer`、`Package`、`NewPackage`。
    通常，在没有类型信息的情况下无法准确解析标识符。
    例如，考虑 `T{K: ""}` 中的标识符 `K`：如果 T 是 map 类型，它可能是局部变量的名称；如果 T 是 struct 类型，则可能是字段的名称。
    新程序应使用 [go/types](/pkg/go/types) 包来解析标识符；详见 [`Object`](https://pkg.go.dev/go/types#Object)、[`Info.Uses`](https://pkg.go.dev/go/types#Info.Uses) 和 [`Info.Defs`](https://pkg.go.dev/go/types#Info.Defs)。

    <!-- https://go.dev/issue/60061 -->
    新函数 [`ast.Unparen`](https://pkg.go.dev/go/ast#Unparen) 可以移除[表达式](https://pkg.go.dev/go/ast#Expr)外任何包围的[括号](https://pkg.go.dev/go/ast#ParenExpr)。

<!-- go/ast -->

[go/types](/pkg/go/types/):   <!-- https://go.dev/issue/63223, CL 521956, CL 541737 -->
    新的 [`Alias`](/pkg/go/types#Alias) 类型表示类型别名。
    之前，类型别名没有显式表示，因此对类型别名的引用等同于拼写出其别名的具体类型，并且别名的名称会丢失。
    新的表示法保留了中间的 `Alias` 类型。
    这使得错误报告得以改进（可以报告类型别名的名称），并更好地处理涉及类型别名的循环类型声明。
    在未来版本中，`Alias` 类型还将携带[类型参数信息](/issue/46477)。
    新函数 [`Unalias`](/pkg/go/types#Unalias) 返回 `Alias` 类型所表示的实际类型（或任何其他 [`Type`](/pkg/go/types#Type)）。

    由于 `Alias` 类型可能会破坏那些不知道检查它们的现有类型开关，此功能通过名为 `gotypesalias` 的 [`GODEBUG`](/doc/godebug) 字段进行控制。
    设置 `gotypesalias=0` 时，行为与之前一致，不会创建 `Alias` 类型。
    设置 `gotypesalias=1` 时，会创建 `Alias` 类型，客户端必须处理它们。
    默认设置为 `gotypesalias=0`。
    在未来版本中，默认值将改为 `gotypesalias=1`。
    _请 [`go/types`](/pkg/go/types) 的客户端尽快调整代码以支持 `gotypesalias=1`，尽早消除潜在问题。_

    <!-- https://go.dev/issue/62605, CL 540056 -->
    [`Info`](/pkg/go/types#Info) 结构体现在导出了 [`FileVersions`](/pkg/go/types#Info.FileVersions) 映射，该映射提供每个文件的 Go 版本信息。

    <!-- https://go.dev/issue/62037, CL 541575 -->
    新的辅助方法 [`PkgNameOf`](/pkg/go/types#Info.PkgNameOf) 为给定的导入声明返回本地包名称。

    <!-- https://go.dev/issue/61035, 多个 CL，详见 issue -->
    [`SizesFor`](/pkg/go/types#SizesFor) 的实现已调整，当为 `SizesFor` 提供编译器参数 `"gc"` 时，其计算的类型大小将与编译器保持一致。类型检查器使用的默认 [`Sizes`](/pkg/go/types#Sizes) 实现现在是 `types.SizesFor("gc", "amd64")`。

    <!-- https://go.dev/issue/64295, CL 544035 -->
    表示函数体的词法环境块（[`Scope`](/pkg/go/types#Scope)）的起始位置（[`Pos`](/pkg/go/types#Scope.Pos)）已更改：它以前是从函数体的左花括号开始，但现在是从函数的 `func` 令牌开始。

[html/template](/pkg/html/template/)

:   <!-- https://go.dev/issue/61619, CL 507995 -->
    JavaScript 模板字面量现在可以包含 Go 模板动作，并且解析包含此类内容的模板将不再返回 `ErrJSTemplate`。同样，GODEBUG 设置 `jstmpllitinterp` 也不再起作用。

<!-- html/template -->

[io](/pkg/io/)

:   <!-- https://go.dev/issue/61870, CL 526855 -->
    新的 [`SectionReader.Outer`](/pkg/io#SectionReader.Outer) 方法返回传递给 [`NewSectionReader`](/pkg/io#NewSectionReader) 的 [`ReaderAt`](/pkg/io#ReaderAt)、偏移量和大小。

<!-- io -->

[log/slog](/pkg/log/slog/)

:   <!-- https://go.dev/issue/62418 -->
    新的 [`SetLogLoggerLevel`](/pkg/log/slog#SetLogLoggerLevel) 函数控制 `slog` 和 `log` 包之间桥接的日志级别。它设置了对顶级 `slog` 日志函数调用的最低级别，并设置了通过 `slog` 进行的 `log.Logger` 调用的级别。

[math/big](/pkg/math/big/)

:   <!-- https://go.dev/issue/50489, CL 539299 -->
    新方法 [`Rat.FloatPrec`](/pkg/math/big#Rat.FloatPrec) 计算将有理数精确表示为浮点数所需的小数位数，以及是否可能实现精确的十进制表示。

<!-- math/big -->

[net](/pkg/net/)

:   <!-- https://go.dev/issue/58808 -->
    当 [`io.Copy`](/pkg/io#Copy) 从 `TCPConn` 复制到 `UnixConn` 时，现在会尽可能使用 Linux 的 `splice(2)` 系统调用，通过新方法 [`TCPConn.WriteTo`](/pkg/net#TCPConn.WriteTo) 实现。

    <!-- CL 467335 -->
    使用 "-tags=netgo" 构建时使用的 Go DNS 解析器，现在在进行 DNS 查询之前，会在位于 `%SystemRoot%\System32\drivers\etc\hosts` 的 Windows 主机文件中搜索匹配的名称。

<!-- net -->

[net/http](/pkg/net/http/)

:   <!-- https://go.dev/issue/51971 -->
    新函数
    [`ServeFileFS`](/pkg/net/http#ServeFileFS)、
    [`FileServerFS`](/pkg/net/http#FileServerFS) 和
    [`NewFileTransportFS`](/pkg/net/http#NewFileTransportFS)
    是现有 `ServeFile`、`FileServer` 和 `NewFileTransport` 的版本，操作于 `fs.FS` 之上。

    <!-- https://go.dev/issue/61679 -->
    HTTP 服务器和客户端现在会拒绝包含无效空 `Content-Length` 头部的请求和响应。可以通过设置 [`GODEBUG`](/doc/godebug) 字段 `httplaxcontentlength=1` 来恢复旧行为。

    <!-- https://go.dev/issue/61410, CL 528355 -->
    新方法 [`Request.PathValue`](/pkg/net/http#Request.PathValue) 从请求中返回路径通配符值，新方法 [`Request.SetPathValue`](/pkg/net/http#Request.SetPathValue) 设置请求上的路径通配符值。

<!-- net/http -->

[net/http/cgi](/pkg/net/http/cgi/)

:   <!-- CL 539615 -->
    执行 CGI 进程时，`PATH_INFO` 变量现在始终设置为空字符串或以 `/` 字符开头的值，符合 RFC 3875 的要求。之前，[`Handler.Root`](/pkg/net/http/cgi#Handler.Root) 和请求 URL 的某些组合可能会违反此要求。

<!-- net/http/cgi -->

[net/netip](/pkg/net/netip/):   <!-- https://go.dev/issue/61642 -->
    新增 [`AddrPort.Compare`](/pkg/net/netip#AddrPort.Compare)
    方法，用于比较两个 `AddrPort`。

<!-- net/netip -->

[os](/pkg/os/)

:   <!-- CL 516555 -->
    在 Windows 平台上，[`Stat`](/pkg/os#Stat) 函数现在会跟踪所有链接到系统中其他命名实体的重解析点。此前它只跟踪 `IO_REPARSE_TAG_SYMLINK` 和 `IO_REPARSE_TAG_MOUNT_POINT` 重解析点。

    <!-- CL 541015 -->
    在 Windows 平台上，向 [`OpenFile`](/pkg/os#OpenFile) 传递 [`O_SYNC`](/pkg/os#O_SYNC) 标志现在会导致写操作直接同步到磁盘，这与 Unix 平台上的 `O_SYNC` 行为等效。

    <!-- CL 452995 -->
    在 Windows 平台上，[`ReadDir`](/pkg/os#ReadDir)、[`File.ReadDir`](/pkg/os#File.ReadDir)、[`File.Readdir`](/pkg/os#File.Readdir) 和 [`File.Readdirnames`](/pkg/os#File.Readdirnames) 函数现在会批量读取目录条目，以减少系统调用次数，性能提升可达 30%。

    <!-- https://go.dev/issue/58808 -->
    当 [`io.Copy`](/pkg/io#Copy) 从一个 `File` 复制到 `net.UnixConn` 时，现在会尽可能使用 Linux 的 `sendfile(2)` 系统调用，通过新的 [`File.WriteTo`](/pkg/os#File.WriteTo) 方法实现。

<!-- os -->

[os/exec](/pkg/os/exec/)

:   <!-- CL 528037 -->
    在 Windows 平台上，[`LookPath`](/pkg/os/exec#LookPath) 现在会忽略 `%PATH%` 中的空条目，如果找不到可执行文件扩展名来解析一个原本明确的名称，则返回 `ErrNotFound`（而不是 `ErrNotExist`）。

    <!-- CL 528038, CL 527820 -->
    在 Windows 平台上，如果可执行文件的路径已经是绝对路径并且具有可执行文件扩展名，[`Command`](/pkg/os/exec#Command) 和 [`Cmd.Start`](/pkg/os/exec#Cmd.Start) 将不再调用 `LookPath`。此外，`Cmd.Start` 不再将解析后的扩展名写回 [`Path`](/pkg/os/exec#Cmd.Path) 字段，因此现在可以安全地在调用 `Start` 的同时并发调用 `String` 方法。

<!-- os/exec -->

[reflect](/pkg/reflect/)

:   <!-- https://go.dev/issue/61827, CL 517777 -->
    [`Value.IsZero`](/pkg/reflect/#Value.IsZero) 方法现在对于浮点数或复数的负零会返回 true，并且如果一个结构体值中的空字段（名为 `_` 的字段）由于某种原因具有非零值，它也会返回 true。这些更改使 `IsZero` 与使用语言 `==` 运算符将值与零进行比较的行为保持一致。

    <!-- https://go.dev/issue/59599, CL 511035 -->
    [`PtrTo`](/pkg/reflect/#PtrTo) 函数已弃用，应使用 [`PointerTo`](/pkg/reflect/#PointerTo) 替代。

    <!-- https://go.dev/issue/60088, CL 513478 -->
    新增函数 [`TypeFor`](/pkg/reflect/#TypeFor)，它返回表示类型参数 T 的 [`Type`](/pkg/reflect/#Type)。此前，要获取类型的 `reflect.Type` 值，必须使用 `reflect.TypeOf((*T)(nil)).Elem()`。现在可以写为 `reflect.TypeFor[T]()`。

<!-- reflect -->

[runtime/metrics](/pkg/runtime/metrics/)

:   <!-- https://go.dev/issue/63340 -->
    四个新的直方图指标
    `/sched/pauses/stopping/gc:seconds`、
    `/sched/pauses/stopping/other:seconds`、
    `/sched/pauses/total/gc:seconds` 和
    `/sched/pauses/total/other:seconds` 提供了关于“Stop-The-World”暂停的额外细节。
    "stopping" 指标报告从决定 Stop-The-World 到所有协程停止所花费的时间。
    "total" 指标报告从决定 Stop-The-World 到世界重新启动所花费的时间。

    <!-- https://go.dev/issue/63340 -->
    `/gc/pauses:seconds` 指标已弃用，因为它等同于新的 `/sched/pauses/total/gc:seconds` 指标。

    <!-- https://go.dev/issue/57071 -->
    `/sync/mutex/wait/total:seconds` 现在除了包含 [`sync.Mutex`](/pkg/sync#Mutex) 和 [`sync.RWMutex`](/pkg/sync#RWMutex) 的争用外，还包含运行时内部锁的争用。

<!-- runtime/metrics -->

[runtime/pprof](/pkg/runtime/pprof/)

:   <!-- https://go.dev/issue/61015 -->
    互斥锁性能分析现在会将争用程度按阻塞在该互斥锁上的协程数量进行缩放。这能更准确地反映互斥锁在 Go 程序中成为瓶颈的程度。例如，如果 100 个协程在一个互斥锁上阻塞了 10 毫秒，互斥锁性能分析现在将记录 1 秒的延迟，而不是 10 毫秒。

    <!-- https://go.dev/issue/57071 -->
    互斥锁性能分析现在除了包含 [`sync.Mutex`](/pkg/sync#Mutex) 和 [`sync.RWMutex`](/pkg/sync#RWMutex) 的争用外，还包含运行时内部锁的争用。运行时内部锁的争用始终在 `runtime._LostContendedRuntimeLock` 处报告。未来的版本将为这些情况添加完整的堆栈跟踪。

    <!-- https://go.dev/issue/50891 -->
    Darwin 平台上的 CPU 性能分析现在包含进程的内存映射，从而启用了 pprof 工具中的反汇编视图。

<!-- runtime/pprof -->

[runtime/trace](/pkg/runtime/trace/)

:   <!-- https://go.dev/issue/60773 -->
    在此版本中，执行跟踪器已完全重构，解决了几个长期存在的问题，并为执行跟踪的新用例铺平了道路。执行跟踪现在在大多数平台（Windows 除外）上使用操作系统的时钟，因此可以将其与低级组件产生的跟踪关联起来。执行跟踪不再依赖平台时钟的可靠性来产生正确的跟踪。执行跟踪现在会定期进行实时分区，因此可以流式方式处理。执行跟踪现在包含所有系统调用的完整持续时间。执行跟踪现在包含 goroutine 所在的操作系统线程信息。启动和停止执行跟踪的延迟影响已大幅降低。执行跟踪现在可以在垃圾回收标记阶段开始或结束。

为了让 Go 开发者能够利用这些改进，现在提供了一个实验性的跟踪读取包 [golang.org/x/exp/trace](/pkg/golang.org/x/exp/trace)。请注意，该包目前仅适用于由 Go 1.22 构建的程序生成的跟踪。请试用该包并在 [相应的提案 issue](/issue/62627) 上提供反馈。

如果在使用新的执行跟踪器实现时遇到任何问题，可以通过在构建 Go 程序时设置 `GOEXPERIMENT=noexectracer2` 切换回旧实现。如果这样做，请提交一个 issue，否则该选项将在未来的版本中移除。

<!-- runtime/trace -->

[slices](/pkg/slices/)

:   <!-- https://go.dev/issue/56353 -->
    <!-- CL 504882 -->
    新函数 `Concat` 用于连接多个切片。

    <!-- https://go.dev/issue/63393 -->
    <!-- CL 543335 -->
    缩小切片大小的函数（`Delete`、`DeleteFunc`、`Compact`、`CompactFunc` 和 `Replace`）现在会将新长度和旧长度之间的元素清零。

    <!-- https://go.dev/issue/63913 -->
    <!-- CL 540155 -->
    如果参数 `i` 超出范围，`Insert` 现在总是会触发 panic。以前，如果没有要插入的元素，在这种情况下它不会 panic。

<!-- slices -->

[syscall](/pkg/syscall/)

:   <!-- https://go.dev/issue/60797 -->
    `syscall` 包自 Go 1.4 起已被 [冻结](/s/go1.4-syscall)，并在 Go 1.11 中标记为已弃用，导致许多编辑器对使用该包的任何代码发出警告。然而，一些未弃用的功能需要使用 `syscall` 包，例如 [`os/exec.Cmd.SysProcAttr`](/pkg/os/exec#Cmd) 字段。为避免对此类代码产生不必要的警告，`syscall` 包不再标记为已弃用。该包对大多数新功能仍保持冻结状态，并且仍然鼓励新代码在可能的情况下使用 [`golang.org/x/sys/unix`](/pkg/golang.org/x/sys/unix) 或 [`golang.org/x/sys/windows`](/pkg/golang.org/x/sys/windows)。

    <!-- https://go.dev/issue/51246, CL 520266 -->
    在 Linux 上，新的 [`SysProcAttr.PidFD`](/pkg/syscall#SysProcAttr) 字段允许在通过 [`StartProcess`](/pkg/syscall#StartProcess) 或 [`os/exec`](/pkg/os/exec) 启动子进程时获取 PID FD。

    <!-- CL 541015 -->
    在 Windows 上，向 [`Open`](/pkg/syscall#Open) 传递 [`O_SYNC`](/pkg/syscall#O_SYNC) 现在会导致写入操作直接写入磁盘，等同于 Unix 平台上的 `O_SYNC`。

<!-- syscall -->

[testing/slogtest](/pkg/testing/slogtest/)

:   <!-- https://go.dev/issue/61758 -->
    新的 [`Run`](/pkg/testing/slogtest#Run) 函数使用子测试来运行测试用例，提供更细粒度的控制。

<!-- testing/slogtest -->

## 移植 {#ports}

### Darwin {#darwin}

<!-- CL 461697 -->
在 64 位 x86 架构的 macOS（`darwin/amd64` 移植版）上，Go 工具链现在默认生成位置无关可执行文件 (PIE)。可以通过指定 `-buildmode=exe` 构建标志来生成非 PIE 二进制文件。在基于 64 位 ARM 的 macOS（`darwin/arm64` 移植版）上，Go 工具链已经默认生成 PIE。

<!-- go.dev/issue/64207 -->
Go 1.22 将是最后一个在 macOS 10.15 Catalina 上运行的版本。Go 1.23 将需要 macOS 11 Big Sur 或更高版本。

### ARM {#arm}

<!-- CL 514907 -->
`GOARM` 环境变量现在允许您选择使用软件还是硬件浮点。以前，有效的 `GOARM` 值是 `5`、`6` 或 `7`。现在，这些相同的值可以选择性地后接 `,softfloat` 或 `,hardfloat` 来选择浮点实现。

这个新选项对于版本 `5` 默认为 `softfloat`，对于版本 `6` 和 `7` 默认为 `hardfloat`。

### Loong64 {#loong64}

<!-- CL 481315 -->
`loong64` 移植版现在支持使用寄存器传递函数参数和返回值。

<!-- CL 481315,537615,480878 -->
`linux/loong64` 移植版现在支持地址消毒器、内存消毒器、新式链接器重定位和 `plugin` 构建模式。

### OpenBSD {#openbsd}

<!-- CL 517935 -->
Go 1.22 新增了一个针对大端序 64 位 PowerPC 上的 OpenBSD 的实验性移植版（`openbsd/ppc64`）。