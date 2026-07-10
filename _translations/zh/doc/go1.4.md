---
title: Go 1.4 版本发布说明
---

## Go 1.4 简介 {#introduction}

最新的 Go 版本 1.4 如期在 1.3 发布六个月后与我们见面。

此版本只包含一个微小的语言变更，即 `for`-`range` 循环的一种向后兼容的简单变体形式，以及一个可能具有破坏性的编译器变更，涉及指向指针的指针上的方法。

该版本主要侧重于实现工作，改进垃圾回收器，并为在未来几个版本中推出完全并发的垃圾回收器奠定基础。
现在栈是连续的，会在必要时重新分配，而不是链接新的"段"；
因此，此版本消除了臭名昭著的"热栈分裂"问题。
新增了一些工具，包括 `go` 命令对构建时源代码生成的支持。
此版本还增加了对 Android 和 Native Client (NaCl) 上的 ARM 处理器以及 Plan 9 上的 AMD64 的支持。

一如既往，Go 1.4 遵守[兼容性承诺](/doc/go1compat.html)，几乎所有程序在迁移到 1.4 时都能继续编译和运行，无需更改。

## 语言变更 {#language}

### For-range 循环 {#forrange}

直到 Go 1.3 为止，`for`-`range` 循环有两种形式：

	for i, v := range x {
		...
	}

和

	for i := range x {
		...
	}

如果对循环的值不感兴趣，只关心迭代本身，仍然需要提及一个变量（可能是[空标识符](/ref/spec#Blank_identifier)，如 `for` `_` `=` `range` `x`），因为以下形式：

	for range x {
		...
	}

在语法上是不允许的。

这种情况似乎有些笨拙，因此从 Go 1.4 开始，无变量的变体形式现在是合法的。这种模式出现的频率不高，但当它出现时，代码可以更简洁。

_更新说明_：此变更对现有的 Go 程序严格向后兼容，但是分析 Go 解析树的工具可能需要修改以接受这种新形式，因为 [`RangeStmt`](/pkg/go/ast/#RangeStmt) 的 `Key` 字段现在可能是 `nil`。

### \*\*T 上的方法调用 {#methodonpointertopointer}

给定以下声明：

	type T int
	func (T) M() {}
	var x **T

`gc` 和 `gccgo` 都接受方法调用：

	x.M()

这是对指向指针的指针 `x` 的双重解引用。Go 规范允许自动插入一次解引用，但不允许两次，因此根据语言定义，此调用是错误的。因此，在 Go 1.4 中，此调用已被禁止，这是一个破坏性变更，尽管受影响的程序极少。

_更新说明_：依赖旧的、错误行为的代码将无法再编译，但可以通过添加显式解引用来轻松修复。

## 支持的操作系统和架构变更 {#os}

### Android {#android}

Go 1.4 可以为运行 Android 操作系统的 ARM 处理器构建二进制文件。它还可以构建一个 `.so` 库，该库可以使用 [mobile](https://golang.org/x/mobile) 子仓库中的支持包被 Android 应用程序加载。关于此实验性移植的计划简介可在[此处](/s/go14android)查看。

### NaCl 在 ARM 上的支持 {#naclarm}

上一版本引入了 Native Client (NaCl) 对 32 位 x86 (`GOARCH=386`) 和使用 32 位指针的 64 位 x86 (GOARCH=amd64p32) 的支持。1.4 版本增加了 NaCl 对 ARM (GOARCH=arm) 的支持。

### Plan9 在 AMD64 上的支持 {#plan9amd64}

此版本增加了对 Plan 9 操作系统在 AMD64 处理器上的支持，前提是内核支持 `nsec` 系统调用并使用 4K 页面。

## 兼容性准则变更 {#compatibility}

[`unsafe`](/pkg/unsafe/) 包允许通过利用实现或数据机器表示的内部细节来规避 Go 的类型系统。关于在 [Go 兼容性准则](go1compat.html)中规定的兼容性方面，使用 `unsafe` 意味着什么，从未被明确指定过。答案当然是，我们无法为做出不安全操作的代码提供任何兼容性保证。

我们已在该版本附带的文档中澄清了这一情况。[Go 兼容性准则](go1compat.html)和 [`unsafe`](/pkg/unsafe/) 包的文档现在明确指出，不保证 unsafe 代码保持兼容性。

_更新说明_：在技术层面没有变化；这仅是对文档的澄清。

## 实现和工具变更 {#impl}

### 运行时变更 {#runtime}

在 Go 1.4 之前，运行时（垃圾回收器、并发支持、接口管理、映射、切片、字符串等）大部分是用 C 编写的，并辅以一些汇编支持。在 1.4 中，大部分代码已被翻译成 Go，以便垃圾回收器能够扫描运行时中程序的栈，并获取关于哪些变量是活跃的准确信息。这个改动很大，但对程序的语义不应有影响。

这次重写使得 1.4 中的垃圾回收器能够完全精确，意味着它知道程序中所有活跃指针的位置。这意味着堆会更小，因为不会有误报导致非指针数据继续存活。其他相关变更也减少了堆大小，与上一版本相比，总体堆大小减少了 10%-30%。

一个结果是栈不再是分段的，从而消除了"热分裂"问题。当达到栈限制时，会分配一个新的、更大的栈，该 goroutine 的所有活跃帧都会被复制过去，并且任何指向该栈的指针都会被更新。在某些情况下性能会明显更好，并且总是更可预测。详细信息可在[设计文档](/s/contigstacks)中找到。

使用连续栈意味着栈可以以更小的初始大小开始，而不会引发性能问题，因此在 1.4 中，goroutine 栈的默认起始大小已从 8192 字节减少到 2048 字节。为1.5版本计划中的并发垃圾回收器做准备，现在堆中指针值的写入操作通过函数调用（称为写屏障）完成，而非由更新值的函数直接执行。在下一个版本中，这将允许垃圾回收器在运行期间介入堆的写入操作。此变更对1.4版本的程序无语义影响，但为测试编译器及性能表现而提前纳入版本。

接口值的实现方式已修改。早期版本中，接口包含一个根据存储具体对象类型可能是指针或单字标量值的字。这种实现方式对垃圾回收器造成困扰，因此从1.4版本起接口值始终持有指针。运行程序中大多数接口值本就是指针，故影响甚微，但存储整数（示例）至接口的程序将经历更多内存分配。

自Go 1.3起，运行时若发现本应包含有效指针的内存字存有明显无效指针（如数值3），将会崩溃。将整数存入指针值的程序可能触发此检查并崩溃。Go 1.4中通过设置[`GODEBUG`](/pkg/runtime/)变量`invalidptr=0`可禁用崩溃作为临时方案，但无法保证未来版本能避免此类崩溃；根本解决方法是重写代码避免整数与指针混用。

### 汇编语言 {#asm}

汇编器`cmd/5a`、`cmd/6a`和`cmd/8a`接受的语言进行多项调整，主要为便于向运行时传递类型信息。

首先，定义`TEXT`指令标志的`textflag.h`文件已从链接器源目录复制至标准位置，现在可通过简单指令引入：

	#include "textflag.h"

更重要的变更在于汇编源码定义必要类型信息的方式。对多数程序而言，将数据定义（`DATA`和`GLOBL`指令）从汇编文件移至Go文件，并为每个汇编函数编写Go声明即可。[汇编文档](/doc/asm#runtime)详细说明了操作方法。

_更新指南_：
从旧路径引入`textflag.h`的汇编文件仍可运行，但建议更新。类型信息方面，多数汇编程序无需修改，但所有文件应进行检查。定义数据、包含非空栈帧函数或返回指针函数的汇编源文件需特别关注。必要（但简单）的变更说明见[汇编文档](/doc/asm#runtime)。

更多变更详情参阅[汇编文档](/doc/asm)。

### gccgo状态 {#gccgo}

GCC与Go项目的发布计划并不同步。GCC 4.9版本包含Go 1.2版gccgo。下一版本GCC 5很可能搭载Go 1.4版gccgo。

### 内部包 {#internalpackages}

Go的包系统便于将程序划分为边界清晰的组件，但访问控制仅两种形式：本地（未导出）和全局（已导出）。有时需要不导出的组件，例如避免公共仓库中非外部使用的代码接口被外部依赖。

Go语言本身无法强制此区分，但自Go 1.4起[`go`](/cmd/go/)命令引入机制定义"内部"包——此类包不得被所在源代码子树外的包导入。

创建此类包需将其置于名为`internal`的目录或其子目录中。当`go`命令检测到导入路径含`internal`的包时，将验证导入方是否位于`internal`目录父级根的目录树内。例如，包`.../a/b/c/internal/d/e/f`仅允许`.../a/b/c`根目录树内的代码导入，而无法被`.../a/b/g`或其他仓库的代码引用。

Go 1.4版本中，内部包机制在主Go仓库强制执行；自1.5版本起将扩展至所有仓库。

机制完整说明参见[设计文档](/s/go14internal)。

### 规范导入路径 {#canonicalimports}

代码常存于`github.com`等公共服务托管的仓库，导致包导入路径以托管服务名开头（如`github.com/rsc/pdf`）。可通过[现有机制](/cmd/go/#hdr-Remote_import_paths)提供`rsc.io/pdf`等自定义导入路径，但这会导致包存在两个有效导入路径。问题在于：同一程序可能无意间通过两个不同路径导入同一包（造成资源浪费）；因使用未识别路径而错过更新；或通过迁移托管服务导致旧路径客户端中断。

Go 1.4引入包声明注解机制标识包的规范导入路径。若尝试使用非规范路径导入，[`go`](/cmd/go/)命令将拒绝编译导入方。

语法简单：在package行添加标识注释。示例中包声明应为：

	package pdf // import "rsc.io/pdf"

配置后`go`命令将拒绝编译导入`github.com/rsc/pdf`的包，确保代码迁移时不影响用户。

检查发生在构建时而非下载时，因此若`go get`因检查失败，误导入的包已复制到本地，需手动清理。为配合此新特性，在更新时新增了一项检查，以验证本地包的远程仓库是否与其自定义导入路径相匹配。若包的远程仓库自首次下载后已发生变更，`go get -u`命令将无法更新该包。新的`-f`标志将覆盖此检查。

更多信息请参阅[设计文档](/s/go14customimport)。

### 子仓库导入路径 {#subrepo}

Go项目子仓库（如`code.google.com/p/go.tools`等）现已支持自定义导入路径，使用`golang.org/x/`替代`code.google.com/p/go.`，例如`golang.org/x/tools`。我们将在2015年6月1日左右向代码库添加规范导入注释，届时Go 1.4及更高版本将停止接受旧的`code.google.com`路径。

_更新说明_：所有从子仓库导入的代码应改为使用新的`golang.org`路径。Go 1.0及更高版本能够解析并导入新路径，因此更新操作不会影响与旧版本的兼容性。未更新的代码在2015年6月1日左右将无法通过Go 1.4编译。

### go generate子命令 {#gogenerate}

[`go`](/cmd/go/)命令新增了[`go generate`](/cmd/go/#hdr-Generate_Go_files_by_processing_source)子命令，可在编译前自动化运行工具生成源代码。例如，可用于对`.y`文件运行[`yacc`](/cmd/yacc)编译器-编译器以生成实现语法规则的Go源文件，或使用`golang.org/x/tools`子仓库中的[stringer](https://godoc.org/golang.org/x/tools/cmd/stringer)工具自动化为带类型常量生成`String`方法。

详情请参阅[设计文档](/s/go1.4-generate)。

### 文件名处理变更 {#filenames}

构建约束（亦称构建标签）通过包含或排除文件来控制编译（详见文档[`/go/build`](/pkg/go/build/)）。文件名本身也可通过"标记"方式控制编译：在`.go`或`.s`扩展名前添加下划线及架构或操作系统名称后缀。例如，文件`gopher_arm.go`仅在目标处理器为ARM时才会编译。

在Go 1.4之前，仅命名为`arm.go`的文件也会被同样标记，但此行为在新增架构时可能破坏源码，导致文件被意外标记。因此在1.4版本中，仅当标记（架构或操作系统名称）前存在下划线时，文件才会被以此方式标记。

_更新说明_：依赖旧行为的包将无法正确编译。类似`windows.go`或`amd64.go`的文件应添加显式构建标签或重命名为`os_windows.go`、`support_amd64.go`等形式。

### go命令的其他变更 {#gocmd}

[`cmd/go`](/cmd/go/)命令有多项值得留意的细微变更：

  - 除非使用[`cgo`](/cmd/cgo/)构建包，否则`go`命令现在将拒绝编译C源文件，因为相关C编译器（[`6c`](/cmd/6c/)等）计划在未来某个版本中从安装中移除（目前仅用于构建部分运行时）。无论如何都难以正确使用它们，因此现有用法很可能存在错误，我们已禁用此功能。
  - [`go test`](/cmd/go/#hdr-Test_packages)子命令新增`-o`标志以设置生成二进制文件的名称，与其他子命令的同名标志功能对应。无效的`-file`标志已被移除。
  - [`go test`](/cmd/go/#hdr-Test_packages)子命令现将编译并链接包内所有`*_test.go`文件，即使其中不包含`Test`函数。此前会忽略此类文件。
  - [`go build`](/cmd/go/#hdr-Test_packages)子命令的`-a`标志行为在非开发环境中已变更：对于运行发行版的系统，`-a`标志将不再重新构建标准库和命令，以避免覆盖安装文件。

### 包源代码布局变更 {#pkg}

在Go主代码仓库中，包的源代码原保存在`src/pkg`目录下，这符合逻辑但与其他仓库（包括Go子仓库）存在差异。Go 1.4版本移除了源码树中的`pkg`层级，例如[`fmt`](/pkg/fmt/)包的源码原位于`src/pkg/fmt`目录，现提升至`src/fmt`目录。

_更新说明_：诸如`godoc`等需要定位源码的工具需知晓新路径。Go团队维护的所有工具和服务均已更新。

### SWIG {#swig}

由于本次发布中的运行时变更，Go 1.4要求SWIG 3.0.3版本。

### 杂项 {#misc}

标准仓库的顶级`misc`目录原先包含编辑器和IDE的Go支持内容：插件、初始化脚本等。维护这些内容日益耗时且需要外部协助，因为许多列出的编辑器并非核心团队成员所使用。这还要求我们为特定编辑器选择最佳插件，即使是我们未使用的编辑器。

Go社区整体更擅长管理此类信息。因此在Go 1.4版本中，这些支持内容已从仓库移除，取而代之的是一个策划完善的[wiki页面](/wiki/IDEsAndTextEditorPlugins)，提供详细的功能列表。

## 性能 {#performance}

多数程序在1.4版本中的运行速度与1.3版本基本持平或略有提升；少数可能稍慢。由于变更众多，难以精确预测性能表现。如上所述，大量运行时代码已从C语言转换为Go语言实现，这带来了堆内存占用的减少。由于Go编译器在优化方面（例如内联等机制）优于原先构建运行时所使用的C编译器，性能也得到了小幅提升。

垃圾回收器（GC）的加速使得面向高内存分配场景的程序获得了可衡量的性能改善。另一方面，新增的写屏障机制又带来了一定的性能损耗，其影响程度通常与优化效果相当，但具体表现取决于程序行为，部分程序可能略有变慢或变快。

下文将记录影响性能的标准库变更。

## 标准库变更 {#library}

### 新增包 {#new_packages}

本次发布无新增包。

### 标准库重大变更 {#major_library_changes}

#### bufio.Scanner {#scanner}

[`bufio`](/pkg/bufio/) 包中的 [`Scanner`](/pkg/bufio/#Scanner) 类型修复了一个缺陷，该修复可能需要对自定义 [`分割函数`](/pkg/bufio/#SplitFunc) 进行调整。此前的缺陷导致在文件结束符（EOF）处无法生成空标记；修复后改变了分割函数接收到的终止条件。在1.4版本之前，当数据读取完毕时扫描会在EOF处停止；自1.4版本起，分割函数将在输入耗尽后于EOF处被额外调用一次，从而能够如文档所述生成最终的空标记。

_升级建议_：自定义分割函数可能需要相应修改，以按预期处理EOF处的空标记。

#### syscall {#syscall}

除为维护核心仓库所必需的变更外，[`syscall`](/pkg/syscall/) 包现已进入冻结状态。该包将不再扩展以支持核心未使用的新增或异类系统调用，详细原因参见[专项说明文档](/s/go1.4-syscall)。

为支持全平台系统调用开发，已创建新的子仓库 [golang.org/x/sys](https://golang.org/x/sys)。该仓库采用更优的架构，包含三个独立包分别实现 [Unix](https://godoc.org/golang.org/x/sys/unix)、[Windows](https://godoc.org/golang.org/x/sys/windows) 和 [Plan 9](https://godoc.org/golang.org/x/sys/plan9) 系统的系统调用。这些包将采取更开放的维护策略，接受所有合理反映操作系统内核接口的变更。详细信息请参阅上述文档及相关文章。

_升级建议_：由于 `syscall` 包与1.3版本基本保持一致，现有程序不受影响。未来需要调用未包含在 `syscall` 包中的系统调用时，应基于 `golang.org/x/sys` 进行开发。

### 标准库次要变更 {#minor_library_changes}

以下列表汇总了标准库的若干次要变更，主要为功能新增。具体变更详情请查阅相关包文档。-   [`archive/zip`](/pkg/archive/zip/) 包的 [`Writer`](/pkg/archive/zip/#Writer) 现在支持 [`Flush`](/pkg/archive/zip/#Writer.Flush) 方法。
-   [`compress/flate`](/pkg/compress/flate/)、[`compress/gzip`](/pkg/compress/gzip/) 和 [`compress/zlib`](/pkg/compress/zlib/) 包现在为解压缩器支持 `Reset` 方法，允许它们重用缓冲区以提高性能。[`compress/gzip`](/pkg/compress/gzip/) 包还增加了 [`Multistream`](/pkg/compress/gzip/#Reader.Multistream) 方法，用于控制对多流文件的支持。
-   [`crypto`](/pkg/crypto/) 包现在拥有一个 [`Signer`](/pkg/crypto/#Signer) 接口，由 [`crypto/ecdsa`](/pkg/crypto/ecdsa) 和 [`crypto/rsa`](/pkg/crypto/rsa) 中的 `PrivateKey` 类型实现。
-   [`crypto/tls`](/pkg/crypto/tls/) 包现在支持 [RFC 7301](https://tools.ietf.org/html/rfc7301) 中定义的 ALPN。
-   [`crypto/tls`](/pkg/crypto/tls/) 包现在通过 [`Config`](/pkg/crypto/tls/#Config) 结构体的新函数 [`CertificateForName`](/pkg/crypto/tls/#Config.CertificateForName) 支持编程式选择服务器证书。
-   同样在 crypto/tls 包中，服务器现在支持 [TLS\_FALLBACK\_SCSV](https://tools.ietf.org/html/draft-ietf-tls-downgrade-scsv-00)，以帮助客户端检测回退攻击。（Go 客户端根本不支持回退，因此不易受此类攻击影响。）
-   [`database/sql`](/pkg/database/sql/) 包现在可以列出所有已注册的 [`Drivers`](/pkg/database/sql/#Drivers)。
-   [`debug/dwarf`](/pkg/debug/dwarf/) 包现在支持 [`UnspecifiedType`](/pkg/debug/dwarf/#UnspecifiedType)。
-   在 [`encoding/asn1`](/pkg/encoding/asn1/) 包中，具有默认值的可选元素现在只有在值等于该默认值时才会被省略。
-   [`encoding/csv`](/pkg/encoding/csv/) 包不再为**空字符串**添加引号，但**会**为数据结束标记 `\.`（反斜杠加点）添加引号。这是 CSV 定义所允许的，并使其能更好地与 Postgres 配合工作。
-   [`encoding/gob`](/pkg/encoding/glob/) 包已重写，以消除对 unsafe 操作的使用，从而允许其在不允许使用 [`unsafe`](/pkg/unsafe/) 包的环境中使用。对于典型用例，其性能会降低 10-30%，但具体差值取决于数据类型，在某些情况下（尤其是涉及数组时）甚至可能更快。功能方面没有变化。
-   [`encoding/xml`](/pkg/encoding/xml/) 包的 [`Decoder`](/pkg/encoding/xml/#Decoder) 现在可以报告其输入偏移量。
-   在 [`fmt`](/pkg/fmt/) 包中，指向 map 的指针的格式化方式已更改，以与指向 struct、数组等的指针保持一致。例如，`&map[string]int{"one":` `1}` 现在默认打印为 `&map[one:` `1]`，而不是十六进制指针值。
-   [`image`](/pkg/image/) 包中像 [`RGBA`](/pkg/image/#RGBA) 和 [`Gray`](/pkg/image/#Gray) 这样的 [`Image`](/pkg/image/#Image) 实现，除了通用的 [`At`](/pkg/image/#Image.At) 方法外，现在还有专门的 [`RGBAAt`](/pkg/image/#RGBA.RGBAAt) 和 [`GrayAt`](/pkg/image/#Gray.GrayAt) 方法。
-   [`image/png`](/pkg/image/png/) 包现在拥有一个 [`Encoder`](/pkg/image/png/#Encoder) 类型，用于控制编码时使用的压缩级别。
-   [`math`](/pkg/math/) 包现在拥有一个 [`Nextafter32`](/pkg/math/#Nextafter32) 函数。
-   [`net/http`](/pkg/net/http/) 包的 [`Request`](/pkg/net/http/#Request) 类型新增了一个 [`BasicAuth`](/pkg/net/http/#Request.BasicAuth) 方法，用于从使用 HTTP 基本身份验证方案的已验证请求中返回用户名和密码。
-   [`net/http`](/pkg/net/http/) 包的 [`Transport`](/pkg/net/http/#Transport) 类型新增了一个 [`DialTLS`](/pkg/net/http/#Transport.DialTLS) 钩子，允许自定义出站 TLS 连接的行为。
-   [`net/http/httputil`](/pkg/net/http/httputil/) 包的 [`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 类型新增了一个字段 [`ErrorLog`](/pkg/net/http/httputil/#ReverseProxy.ErrorLog)，提供用户对日志记录的控制。
-   [`os`](/pkg/os/) 包现在通过 [`Symlink`](/pkg/os/#Symlink) 函数在 Windows 操作系统上实现了符号链接。其他操作系统已经具备此功能。同时新增了一个 [`Unsetenv`](/pkg/os/#Unsetenv) 函数。
-   [`reflect`](/pkg/reflect/) 包的 [`Type`](/pkg/reflect/#Type) 接口新增了一个方法 [`Comparable`](/pkg/reflect/#Type.Comparable)，用于报告该类型是否支持通用比较。
-   同样在 [`reflect`](/pkg/reflect/) 包中，由于运行时对接口实现的更改，[`Value`](/pkg/reflect/#Value) 接口现在占**三个**字（word）而不是四个字。这节省了内存，但没有语义上的影响。
-   [`runtime`](/pkg/runtime/) 包现在在 Windows 上实现了单调时钟（monotonic clock），这与其在其他系统上已实现的功能一致。
-   [`runtime`](/pkg/runtime/) 包的 [`Mallocs`](/pkg/runtime/#MemStats.Mallocs) 计数器现在计入了 Go 1.3 中遗漏的非常小的内存分配。由于答案更准确，这可能会导致使用 [`ReadMemStats`](/pkg/runtime/#ReadMemStats) 或 [`AllocsPerRun`](/pkg/testing/#AllocsPerRun) 的测试失败。
-   在 [`runtime`](/pkg/runtime/) 包中，向 [`MemStats`](/pkg/runtime/#MemStats) 和 [`GCStats`](/pkg/runtime/#GCStats) 结构体添加了一个数组 [`PauseEnd`](/pkg/runtime/#MemStats.PauseEnd)。该数组是一个记录垃圾回收暂停结束时间的循环缓冲区。相应的暂停时长已记录在 [`PauseNs`](/pkg/runtime/#MemStats.PauseNs) 中。
-   [`runtime/race`](/pkg/runtime/race/) 包现在支持 FreeBSD，这意味着 [`go`](/pkg/cmd/go/) 命令的 `-race` 标志现在可以在 FreeBSD 上工作。
-   [`sync/atomic`](/pkg/sync/atomic/) 包新增了一个类型 [`Value`](/pkg/sync/atomic/#Value)。`Value` 提供了一种高效的机制，用于对任意类型的值进行原子加载和存储。
-   在 [`syscall`](/pkg/syscall/) 包的 Linux 实现中，[`Setuid`](/pkg/syscall/#Setuid) 和 [`Setgid`](/pkg/syscall/#Setgid) 已被禁用，因为这些系统调用作用于调用线程，而非整个进程，这与其他平台不同，也不是预期的结果。
-   [`testing`](/pkg/testing/) 包新增了一项功能，以便更好地控制运行一组测试。如果测试代码包含函数
    <pre>
    func TestMain(m *<a href="/pkg/testing/#M"><code>testing.M</code></a>)
    </pre>
    该函数将被调用，而不是直接运行测试。`M` 结构体包含访问和运行测试的方法。
-   同样在 [`testing`](/pkg/testing/) 包中，新增的 [`Coverage`](/pkg/testing/#Coverage) 函数报告当前测试覆盖率分数，使得单个测试能够报告它们对整体覆盖率的贡献。
-   [`text/scanner`](/pkg/text/scanner/) 包的 [`Scanner`](/pkg/text/scanner/#Scanner) 类型新增了一个函数 [`IsIdentRune`](/pkg/text/scanner/#Scanner.IsIdentRune)，允许在扫描时控制标识符的定义。
-   [`text/template`](/pkg/text/template/) 包中的布尔函数 `eq`、`lt` 等已泛化，允许比较有符号和无符号整数，简化了其实际使用。（以前只能比较相同符号性的值。）所有负值都小于所有无符号值。
-   `time` 包现在使用微前缀的标准符号，即微符号（U+00B5 'µ'），来打印微秒持续时间。[`ParseDuration`](/pkg/time/#ParseDuration) 仍然接受 `us`，但该包不再将微秒打印为 `us`。
    \
    _更新提示_：依赖于持续时间输出格式但未使用 ParseDuration 的代码需要进行更新。