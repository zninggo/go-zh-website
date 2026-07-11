---
title: Go 1.4 版本说明
---

## Go 1.4 简介 {#introduction}

最新发布的 Go 1.4 版本，如预期在 1.3 版本发布六个月后到来。

它只包含一处微小的语言变更，即一个向后兼容的简单 `for`-`range` 循环变体，以及一个可能具有破坏性的编译器变更，涉及指针的指针（指向指针的指针）上的方法调用。

该版本主要侧重于实现工作，改进垃圾回收器（garbage collector），并为在接下来的几个版本中推出完全并发的回收器奠定基础。
现在，栈（stack）是连续的，在必要时重新分配，而不是链接到新的“段”上；
因此，该版本消除了臭名昭著的“热点栈分割”问题。
引入了一些新的工具，包括 `go` 命令中对构建时源代码生成的支持。
该版本还增加了对在 Android 和 Native Client (NaCl) 上运行的 ARM 处理器，以及在 Plan 9 上运行的 AMD64 的支持。

一如既往，Go 1.4 遵守[兼容性承诺](/doc/go1compat.html)，几乎所有现有代码迁移到 1.4 后，都将继续正常编译和运行。

## 语言变更 {#language}

### for-range 循环 {#forrange}

直到 Go 1.3，`for`-`range` 循环有两种形式：

	for i, v := range x {
		...
	}

和

	for i := range x {
		...
	}

如果对循环的值不感兴趣，只关心迭代本身，仍然需要提及一个变量（很可能是[空白标识符](/ref/spec#Blank_identifier)，如 `for` `_` `=` `range` `x`），因为形式：

	for range x {
		...
	}

在语法上是不允许的。

这种情况显得有些尴尬，因此从 Go 1.4 开始，无变量的形式现在是合法的。这种模式虽然少见，但当它出现时，代码会更简洁。

_升级说明_：此更改对现有 Go 程序是严格向后兼容的，但分析 Go 解析树的工具可能需要修改以接受这种新形式，因为 [`RangeStmt`](/pkg/go/ast/#RangeStmt) 的 `Key` 字段现在可能为 `nil`。

### 在 \*\*T 上调用方法 {#methodonpointertopointer}

给定以下声明：

	type T int
	func (T) M() {}
	var x **T

`gc` 和 `gccgo` 编译器都接受方法调用：

	x.M()

这是对指针的指针 `x` 的双重解引用。Go 规范允许自动插入一次解引用，但不允许两次，因此根据语言定义，此调用是错误的。
因此，在 Go 1.4 中，它已被禁止，这是一个破坏性变更，尽管受影响的程序很少。

_升级说明_：依赖旧有、错误行为的代码将无法再编译，但可以通过添加显式解引用轻松修复。

## 支持的操作系统和架构变更 {#os}

### Android {#android}

Go 1.4 可以为运行 Android 操作系统的 ARM 处理器构建二进制文件。
它还可以构建一个 `.so` 库，该库可以由使用 [mobile](https://golang.org/x/mobile) 子仓库中支持包的 Android 应用程序加载。
关于此实验性移植计划的简要说明可在[此处](/s/go14android)找到。

### ARM 上的 NaCl {#naclarm}

之前的版本引入了对 32 位 x86 (`GOARCH=386`) 和使用 32 位指针的 64 位 x86 (`GOARCH=amd64p32`) 的 Native Client (NaCl) 支持。
1.4 版本增加了对 ARM (`GOARCH=arm`) 的 NaCl 支持。

### AMD64 上的 Plan9 {#plan9amd64}

此版本增加了在 AMD64 处理器上对 Plan 9 操作系统的支持，前提是内核支持 `nsec` 系统调用并使用 4K 页面。

## 兼容性准则变更 {#compatibility}

[`unsafe`](/pkg/unsafe/) 包允许通过利用实现或数据机器表示的内部细节来绕过 Go 的类型系统。
对于在 [Go 兼容性准则](go1compat.html) 所指定的兼容性方面，使用 `unsafe` 意味着什么，之前从未明确规定。
当然，答案是我们不能对执行不安全操作的代码做出任何兼容性承诺。

我们在发布版附带的文档中澄清了这一点。
[Go 兼容性准则](go1compat.html) 和 [`unsafe`](/pkg/unsafe/) 包的文档现在明确说明，不安全的代码不保证保持兼容。

_升级说明_：技术上没有任何改变；这仅仅是文档的澄清。

## 实现和工具变更 {#impl}

### 运行时变更 {#runtime}

在 Go 1.4 之前，运行时（runtime）（包括垃圾回收器、并发支持、接口管理、映射（map）、切片（slice）、字符串等）大部分是用 C 编写的，并辅以一些汇编程序。
在 1.4 中，大部分代码已被翻译成 Go，以便垃圾回收器能够扫描运行时中程序的栈（stack），并获取关于哪些变量处于活跃状态的精确信息。
这一变更很大，但应该不会对程序产生语义上的影响。

这次重写使得 1.4 中的垃圾回收器能够完全精确（fully precise），这意味着它知道程序中所有活跃指针（pointer）的位置。
这意味着堆（heap）将更小，因为不会有误判（false positives）将非指针数据保持存活。
其他相关变更也减少了堆的大小，与之前的版本相比，总体堆大小减小了 10%-30%。

其结果是，栈不再是分段的，消除了“热点分割”问题。
当达到栈限制时，会分配一个新的、更大的栈，将该协程（goroutine）的所有活跃帧（frame）复制到新栈中，并更新任何指向栈内的指针。
在某些情况下，性能可以显著提高，并且始终更具可预测性。详细信息可在[设计文档](/s/contigstacks)中找到。

使用连续栈意味着栈可以以更小的尺寸开始，而不会引发性能问题，因此在 1.4 中，协程栈的默认起始大小已从 8192 字节减小到 2048 字节。
作为计划在1.5版本中实现的并发垃圾回收器的准备工作，现在对堆中指针值的写入是通过一个函数调用（称为写屏障）来完成的，而不是由函数直接更新值。在下一个版本中，这将使垃圾回收器能够在运行时协调对堆的写入。此变更对1.4版本中的程序语义没有影响，但在此版本中引入是为了测试编译器及其产生的性能。

接口值的实现已得到修改。在早期版本中，接口包含一个字，该字可能是指针，也可能是一个字的标量值，具体取决于存储的具体对象类型。此实现对垃圾回收器来说存在问题，因此从1.4版本开始，接口值始终持有指针。在运行中的程序中，大多数接口值本来就是指针，因此影响很小，但在接口中存储整数（例如）的程序将看到更多的内存分配。

从Go 1.3开始，如果运行时发现一个本应包含有效指针的内存字却包含了一个明显无效的指针（例如，值3），则会崩溃。在指针值中存储整数的程序可能会触发此检查并崩溃。在Go 1.4中，设置[`GODEBUG`](/pkg/runtime/)变量`invalidptr=0`可以禁用崩溃作为一种变通方法，但我们无法保证未来的版本能够避免崩溃；正确的修复方法是重写代码，不要将整数和指针混用。

### 汇编 {#asm}

汇编器 `cmd/5a`、`cmd/6a` 和 `cmd/8a` 接受的语言经历了几处变更，主要是为了更方便地向运行时传递类型信息。

首先，定义`TEXT`指令标志的`textflag.h`文件已从链接器源目录复制到标准位置，以便可以使用简单的指令包含：

	#include "textflag.h"

更重要的变更在于汇编源代码如何定义必要的类型信息。对于大多数程序来说，将数据定义（`DATA`和`GLOBL`指令）从汇编移出到Go文件中，并为每个汇编函数编写一个Go声明就足够了。[汇编文档](/doc/asm#runtime)描述了具体操作方法。

_更新_：
从旧位置包含`textflag.h`的汇编文件仍然可以工作，但应进行更新。对于类型信息，大多数汇编例程无需更改，但所有例程都应进行检查。定义了数据、具有非空栈帧的函数或返回指针的函数的汇编源文件需要特别关注。[汇编文档](/doc/asm#runtime)中描述了必要（但简单）的更改。

关于这些变更的更多信息，请参见[汇编文档](/doc/asm)。

### gccgo 状态 {#gccgo}

GCC和Go项目的发布计划并不一致。GCC 4.9版本包含gccgo的Go 1.2版本。下一个版本GCC 5，可能会包含gccgo的Go 1.4版本。

### 内部包 {#internalpackages}

Go的包系统使得将程序构建为具有清晰边界的组件变得容易，但只有两种访问形式：局部（未导出）和全局（导出）。有时人们希望有一些不被导出的组件，例如，为了避免获得代码库中属于公共仓库但不打算在该程序之外使用的接口的客户。

Go语言本身没有强制执行这种区分的能力，但从Go 1.4开始，[`go`](/cmd/go/)命令引入了一种机制来定义“内部”包，这些包不能被其所在源代码子树之外的包导入。

要创建这样的包，请将其放在名为`internal`的目录中，或放在名为`internal`的目录的子目录中。当`go`命令看到导入路径中包含`internal`的包时，它会验证进行导入的包是否位于以`internal`目录的父目录为根的树内。例如，包`.../a/b/c/internal/d/e/f`只能被以`.../a/b/c`为根的目录树中的代码导入。它不能被`.../a/b/g`中的代码或任何其他仓库中的代码导入。

对于Go 1.4，内部包机制将在主Go仓库中强制执行；从1.5开始，它将在任何仓库中强制执行。

该机制的完整细节请参见[设计文档](/s/go14internal)。

### 规范导入路径 {#canonicalimports}

代码通常存放在由`github.com`等公共服务托管的仓库中，这意味着包的导入路径以托管服务的名称开头，例如`github.com/rsc/pdf`。可以使用[现有机制](/cmd/go/#hdr-Remote_import_paths)提供一个“自定义”或“个性化”的导入路径，例如`rsc.io/pdf`，但这会为同一个包创建两个有效的导入路径。这会产生问题：人们可能不经意间在单个程序中通过这两个不同路径导入该包，造成浪费；或者因为使用的路径未被识别为过时而错过包的更新；或者将包移动到其他托管服务时破坏了使用旧路径的客户端。

Go 1.4引入了一种用于Go源代码中包子句的注解，以标识该包的规范导入路径。如果尝试使用非规范路径进行导入，[`go`](/cmd/go/)命令将拒绝编译该导入包。

语法很简单：在包声明行上添加一个标识性注释。对于我们的例子，包子句如下所示：

	package pdf // import "rsc.io/pdf"

有了这个注解后，`go`命令将拒绝编译导入`github.com/rsc/pdf`的包，确保代码可以在不破坏用户的情况下迁移。

此检查发生在构建时，而非下载时，因此如果`go` `get`因该检查而失败，被错误导入的包已被复制到本地机器，应手动移除。
为配合这项新功能，在更新时增加了一项检查，用于验证本地包的远程仓库是否与其自定义导入路径匹配。`go` `get` `-u` 命令在远程仓库自首次下载后发生变更时，将无法更新该包。
新的 `-f` 标志可以覆盖此检查。

更多信息请参阅
[设计文档](/s/go14customimport)。

### 子仓库的导入路径 {#subrepo}

Go 项目子仓库（如 `code.google.com/p/go.tools` 等）现已支持自定义导入路径，将 `code.google.com/p/go.` 替换为 `golang.org/x/`，例如 `golang.org/x/tools`。
我们将在2015年6月1日左右为代码添加规范导入注释，届时Go 1.4及更高版本将停止接受旧的 `code.google.com` 路径。

_更新指南_：所有从子仓库导入的代码应改用新的 `golang.org` 路径。
Go 1.0及更高版本可以解析并导入这些新路径，因此更新不会破坏与旧版本的兼容性。
尚未更新的代码在2015年6月1日左右将无法在Go 1.4下编译。

### go generate 子命令 {#gogenerate}

[`go`](/cmd/go/) 命令新增了一个子命令
[`go generate`](/cmd/go/#hdr-Generate_Go_files_by_processing_source)，用于在编译前自动化运行工具来生成源代码。
例如，它可以用于在 `.y` 文件上运行 [`yacc`](/cmd/yacc) 编译器生成器以生成实现语法的Go源文件，或使用 `golang.org/x/tools` 子仓库中的新工具
[stringer](https://godoc.org/golang.org/x/tools/cmd/stringer)
来自动化为类型化常量生成 `String` 方法。

更多信息请参阅
[设计文档](/s/go1.4-generate)。

### 文件名处理变更 {#filenames}

构建约束（也称为构建标签）通过包含或排除文件来控制编译（参见文档 [`/go/build`](/pkg/go/build/)）。
编译也可以通过文件名本身来控制，方法是在 `.go` 或 `.s` 扩展名之前添加一个后缀，该后缀以下划线开头，并附上架构或操作系统名称。
例如，文件 `gopher_arm.go` 仅在目标处理器为ARM时才会被编译。

在Go 1.4之前，名为 `arm.go` 的文件也会被类似标记，但此行为在新架构添加时可能导致源代码中断，使文件突然被标记。
因此，在1.4中，只有当标签（架构或操作系统名称）前有下划线时，文件才会以这种方式被标记。

_更新指南_：依赖旧行为的包将不再能正确编译。
名为 `windows.go` 或 `amd64.go` 的文件应要么在源代码中添加显式构建标签，要么重命名为类似 `os_windows.go` 或 `support_amd64.go` 的名称。

### go 命令的其他变更 {#gocmd}

[`cmd/go`](/cmd/go/)
命令有一些值得注意的次要变更。

  - 除非正在使用 [`cgo`](/cmd/cgo/) 构建包，
    否则 `go` 命令现在会拒绝编译C源文件，
    因为相关的C编译器
    （[`6c`](/cmd/6c/) 等）
    计划在未来的某个版本中从安装中移除。
    （它们目前仅用于构建运行时的一部分。）
    在任何情况下都难以正确使用它们，因此任何现有用法都可能是错误的，所以我们已禁用它们。
  - [`go` `test`](/cmd/go/#hdr-Test_packages)
    子命令新增了一个 `-o` 标志，用于设置生成二进制文件的名称，
    与其他子命令中的同名标志相对应。
    无实际功能的 `-file` 标志已被移除。
  - [`go` `test`](/cmd/go/#hdr-Test_packages)
    子命令现在将编译并链接包中的所有 `*_test.go` 文件，
    即使其中没有 `Test` 函数。
    之前它会忽略此类文件。
  - 对于非开发安装，[`go` `build`](/cmd/go/#hdr-Test_packages)
    子命令的 `-a` 标志行为已更改。
    对于运行已发布发行版的安装，`-a` 标志将不再
    重新构建标准库和命令，以避免覆盖安装文件。

### 包源代码布局变更 {#pkg}

在主要的Go源代码仓库中，包的源代码存放在 `src/pkg` 目录下，这有其道理，但与其他仓库（包括Go子仓库）不同。
在Go 1.4中，源代码树的 `pkg` 层级现已移除，因此例如 [`fmt`](/pkg/fmt/) 包的源代码，
之前存放在目录 `src/pkg/fmt` 中，现在位于更高一级的 `src/fmt`。

_更新指南_：像 `godoc` 这样需要发现源代码的工具需要知道新的位置。Go团队维护的所有工具和服务都已更新。

### SWIG {#swig}

由于此版本中的运行时变更，Go 1.4 需要 SWIG 3.0.3。

### 杂项 {#misc}

标准仓库顶层的 `misc` 目录过去包含对编辑器和IDE的Go支持：插件、初始化脚本等。
维护这些内容变得耗时且需要外部帮助，因为列出的许多编辑器核心团队成员并未使用。
这还要求我们为给定编辑器决定哪个插件最佳，即使是我们不使用的编辑器。

广大Go社区更适合管理这些信息。
因此，在Go 1.4中，此支持已从仓库中移除。
取而代之的是，在一个[Wiki页面](/wiki/IDEsAndTextEditorPlugins)上提供了一份精心策划的、信息丰富的可用工具列表。

## 性能 {#performance}

大多数程序在1.4中的运行速度将与1.3大致相同或略快；
部分程序可能会略慢。
变更众多，因此难以精确预期。
如上所述，运行时大量代码已从 C 语言转换为 Go 语言，这导致堆大小有所减小。同时性能也略有提升，因为 Go 编译器在优化方面（例如内联）比过去构建运行时所使用的 C 编译器更为出色。

垃圾回收器的速度得到了提升，对于垃圾回收密集型程序带来了可观的性能改善。但另一方面，新增的写屏障又再次拖慢了速度——其影响程度通常与性能提升相当，不过具体到某些程序，可能会出现稍慢或稍快的情况。

影响性能的库变更将记录如下。

## 标准库变更 {#library}

### 新增包 {#new_packages}

本次版本未新增任何包。

### 库的主要变更 {#major_library_changes}

#### bufio.Scanner {#scanner}

[`bufio`](/pkg/bufio/) 包中的 [`Scanner`](/pkg/bufio/#Scanner) 类型修复了一个可能影响自定义 [`分割函数`](/pkg/bufio/#SplitFunc) 的缺陷。该缺陷导致无法在 EOF 处生成空标记；此修复变更了分割函数所见的结束条件。此前，若无更多数据，扫描会在 EOF 处停止。自 1.4 版本起，当输入耗尽后，分割函数会在 EOF 处被额外调用一次，从而能够如文档先前所承诺的那样生成最终的空标记。

_更新说明_：自定义分割函数可能需要修改以在 EOF 处按需处理空标记。

#### syscall {#syscall}

[`syscall`](/pkg/syscall/) 包现已冻结，仅保留为核心仓库维护所需的变更。特别是，它将不再扩展以支持核心未使用的新增或不同系统调用。其原因在[单独文档](/s/go1.4-syscall)中有详细阐述。

为支持所有内核上的系统调用新开发，已创建新的子仓库 [golang.org/x/sys](https://golang.org/x/sys)。该仓库结构更优，包含三个包，分别承载针对 [Unix](https://godoc.org/golang.org/x/sys/unix)、[Windows](https://godoc.org/golang.org/x/sys/windows) 和 [Plan 9](https://godoc.org/golang.org/x/sys/plan9) 的系统调用实现。这些包将接受更广泛的维护，收录所有反映这些操作系统内核接口的合理变更。更多信息请参阅相关文档及前述文章。

_更新说明_：现有程序不受影响，因为 `syscall` 包与 1.3 版本相比基本未变。未来需要 `syscall` 包中未包含的系统调用的开发，应基于 `golang.org/x/sys` 进行构建。

### 库的次要变更 {#minor_library_changes}

以下列表概述了多项库的次要变更，以新增内容为主。有关每项变更的详细信息，请参阅相关包的文档。
- [`archive/zip`](/pkg/archive/zip/) 包的 [`Writer`](/pkg/archive/zip/#Writer) 现在支持 [`Flush`](/pkg/archive/zip/#Writer.Flush) 方法。
- [`compress/flate`](/pkg/compress/flate/)、[`compress/gzip`](/pkg/compress/gzip/) 和 [`compress/zlib`](/pkg/compress/zlib/) 包现在为解压缩器支持 `Reset` 方法，允许重用缓冲区以提高性能。[`compress/gzip`](/pkg/compress/gzip/) 包还增加了 [`Multistream`](/pkg/compress/gzip/#Reader.Multistream) 方法，用于控制对多流文件的支持。
- [`crypto`](/pkg/crypto/) 包现在拥有 [`Signer`](/pkg/crypto/#Signer) 接口，该接口由 [`crypto/ecdsa`](/pkg/crypto/ecdsa) 和 [`crypto/rsa`](/pkg/crypto/rsa) 中的 `PrivateKey` 类型实现。
- [`crypto/tls`](/pkg/crypto/tls/) 包现在支持 [RFC 7301](https://tools.ietf.org/html/rfc7301) 中定义的 ALPN。
- [`crypto/tls`](/pkg/crypto/tls/) 包现在通过 [`Config`](/pkg/crypto/tls/#Config) 结构体新增的 [`CertificateForName`](/pkg/crypto/tls/#Config.CertificateForName) 函数，支持程序化选择服务器证书。
- 同样在 `crypto/tls` 包中，服务器现在支持 [TLS\_FALLBACK\_SCSV](https://tools.ietf.org/html/draft-ietf-tls-downgrade-scsv-00)，以帮助客户端检测降级攻击。（Go 客户端本身不支持降级，因此不受这些攻击的影响。）
- [`database/sql`](/pkg/database/sql/) 包现在可以列出所有已注册的 [`Drivers`](/pkg/database/sql/#Drivers)。
- [`debug/dwarf`](/pkg/debug/dwarf/) 包现在支持 [`UnspecifiedType`](/pkg/debug/dwarf/#UnspecifiedType)。
- 在 [`encoding/asn1`](/pkg/encoding/asn1/) 包中，带有默认值的可选元素现在只有在具有该默认值时才会被省略。
- [`encoding/csv`](/pkg/encoding/csv/) 包不再为加引号的空字符串添加引号，但会对数据结束标记 `\.`（反斜杠点）添加引号。这符合 CSV 规范，并能更好地与 PostgreSQL 配合工作。
- [`encoding/gob`](/pkg/encoding/gob/) 包已被重写，以消除不安全操作的使用，使其可以在不允许使用 [`unsafe`](/pkg/unsafe/) 包的环境中使用。对于典型用途，性能可能会降低 10-30%，但具体差异取决于数据类型；在某些情况下（尤其是涉及数组时），性能可能更快。功能上没有变化。
- [`encoding/xml`](/pkg/encoding/xml/) 包的 [`Decoder`](/pkg/encoding/xml/#Decoder) 现在可以报告其输入偏移量。
- 在 [`fmt`](/pkg/fmt/) 包中，指向映射（map）的指针的格式化方式已更改，以与指向结构体、数组等的指针保持一致。例如，`&map[string]int{"one":` `1}` 现在默认打印为 `&map[one:` `1]`，而不是十六进制指针值。
- [`image`](/pkg/image/) 包的 [`Image`](/pkg/image/#Image) 实现（如 [`RGBA`](/pkg/image/#RGBA) 和 [`Gray`](/pkg/image/#Gray)）除了通用的 [`At`](/pkg/image/#Image.At) 方法外，还提供了专门的 [`RGBAAt`](/pkg/image/#RGBA.RGBAAt) 和 [`GrayAt`](/pkg/image/#Gray.GrayAt) 方法。
- [`image/png`](/pkg/image/png/) 包现在拥有 [`Encoder`](/pkg/image/png/#Encoder) 类型，用于控制编码时使用的压缩级别。
- [`math`](/pkg/math/) 包现在拥有 [`Nextafter32`](/pkg/math/#Nextafter32) 函数。
- [`net/http`](/pkg/net/http/) 包的 [`Request`](/pkg/net/http/#Request) 类型新增了一个 [`BasicAuth`](/pkg/net/http/#Request.BasicAuth) 方法，该方法从使用 HTTP 基本身份验证方案进行认证的请求中返回用户名和密码。
- [`net/http`](/pkg/net/http/) 包的 [`Transport`](/pkg/net/http/#Transport) 类型新增了一个 [`DialTLS`](/pkg/net/http/#Transport.DialTLS) 钩子，允许自定义出站 TLS 连接的行为。
- [`net/http/httputil`](/pkg/net/http/httputil/) 包的 [`ReverseProxy`](/pkg/net/http/httputil/#ReverseProxy) 类型新增了一个 [`ErrorLog`](/pkg/net/http/httputil/#ReverseProxy.ErrorLog) 字段，提供了用户对日志记录的控制。
- [`os`](/pkg/os/) 包现在通过 [`Symlink`](/pkg/os/#Symlink) 函数在 Windows 操作系统上实现了符号链接。（其他操作系统已有此功能。）此外，还新增了一个 [`Unsetenv`](/pkg/os/#Unsetenv) 函数。
- [`reflect`](/pkg/reflect/) 包的 [`Type`](/pkg/reflect/#Type) 接口新增了一个 [`Comparable`](/pkg/reflect/#type.Comparable) 方法，用于报告该类型是否支持通用比较。
- 同样在 [`reflect`](/pkg/reflect/) 包中，由于运行时接口实现的变更，[`Value`](/pkg/reflect/#Value) 接口现在占三个字（word）而非四个字。这节省了内存，但没有语义上的影响。
- [`runtime`](/pkg/runtime/) 包现在在 Windows 上实现了单调时钟，这与其在其他系统上已有的实现一致。
- [`runtime`](/pkg/runtime/) 包的 [`Mallocs`](/pkg/runtime/#MemStats.Mallocs) 计数器现在会计数 Go 1.3 中遗漏的非常小的内存分配。由于答案更精确，这可能会破坏使用 [`ReadMemStats`](/pkg/runtime/#ReadMemStats) 或 [`AllocsPerRun`](/pkg/testing/#AllocsPerRun) 的测试。
- 在 [`runtime`](/pkg/runtime/) 包中，[`MemStats`](/pkg/runtime/#MemStats) 和 [`GCStats`](/pkg/runtime/#GCStats) 结构体新增了一个数组 [`PauseEnd`](/pkg/runtime/#MemStats.PauseEnd)。该数组是一个循环缓冲区，记录了垃圾回收暂停结束的时间。相应的暂停持续时间已记录在 [`PauseNs`](/pkg/runtime/#MemStats.PauseNs) 中。
- [`runtime/race`](/pkg/runtime/race/) 包现在支持 FreeBSD，这意味着 [`go`](/pkg/cmd/go/) 命令的 `-race` 标志现在可在 FreeBSD 上使用。
- [`sync/atomic`](/pkg/sync/atomic/) 包新增了一个类型 [`Value`](/pkg/sync/atomic/#Value)。`Value` 为任意类型的值的原子加载和存储提供了一种高效的机制。
- 在 [`syscall`](/pkg/syscall/) 包的 Linux 实现中，[`Setuid`](/pkg/syscall/#Setuid) 和 [`Setgid`](/pkg/syscall/#Setgid) 已被禁用，因为这些系统调用作用于调用线程而非整个进程，这与其他平台不同，且并非预期行为。
- [`testing`](/pkg/testing/) 包新增了一个功能，用于更好地控制一组测试的运行。如果测试代码包含函数 `func TestMain(m *<a href="/pkg/testing/#M"><code>testing.M</code></a>)`，则会调用该函数而不是直接运行测试。`M` 结构体包含访问和运行测试的方法。
- 同样在 [`testing`](/pkg/testing/) 包中，新增的 [`Coverage`](/pkg/testing/#Coverage) 函数报告当前的测试覆盖率分数，使单个测试能够报告其对整体覆盖率的贡献。
- [`text/scanner`](/pkg/text/scanner/) 包的 [`Scanner`](/pkg/text/scanner/#Scanner) 类型新增了一个函数 [`IsIdentRune`](/pkg/text/scanner/#Scanner.IsIdentRune)，允许在扫描时控制标识符的定义。
- [`text/template`](/pkg/text/template/) 包的布尔函数 `eq`、`lt` 等已被泛化，允许比较有符号和无符号整数，简化了实际使用。（此前只能比较相同符号类型的值。）所有负值都小于所有无符号值。
- `time` 包现在使用微前缀的标准符号，即微符号（U+00B5 'µ'），来打印微秒持续时间。[`ParseDuration`](/pkg/time/#ParseDuration) 仍然接受 `us`，但该包不再将微秒打印为 `us`。\
  _更新_：依赖于持续时间输出格式但不使用 `ParseDuration` 的代码需要更新。