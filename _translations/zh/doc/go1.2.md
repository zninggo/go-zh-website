---
title: Go 1.2 发布说明
---

## Go 1.2 简介 {#introduction}

自2013年4月[Go 1.1版本](/doc/go1.1.html)发布以来，发布周期已缩短，以使发布过程更加高效。此次发布的Go 1.2版本（简称Go 1.2）在1.1之后大约六个月发布，而1.1在1.0之后则用了一年多的时间。由于时间周期更短，1.2相比从1.0到1.1的增量要小，但它仍包含一些重要的改进，包括一个更好的调度器和一个新的语言特性。当然，Go 1.2保持了[兼容性承诺](/doc/go1compat.html)。用Go 1.1（或1.0）编写的绝大多数程序在迁移到1.2时无需做任何更改即可运行，不过对语言中某个角落引入的一项限制可能会暴露原本就存在的错误代码（参见关于[nil的使用](#use_of_nil)的讨论）。

## 语言变更 {#language}

为了巩固规范，一个边界情况得到了澄清，这会对程序产生影响。此外，还增加了一个新的语言特性。

### nil的使用 {#use_of_nil}

语言现在规定，出于安全原因，某些对nil指针的使用将保证触发运行时恐慌。例如，在Go 1.0中，给定如下代码：

	type T struct {
	    X [1<<24]byte
	    Field int32
	}

	func main() {
	    var x *T
	    ...
	}

`nil`指针`x`可能被用来不正确地访问内存：表达式`x.Field`可能访问地址为`1<<24`的内存。为了防止这种不安全的行为，在Go 1.2中，编译器现在保证任何通过nil指针进行的解引用（如此处所示，也包括nil数组指针、nil接口值、nil切片等）要么触发恐慌，要么返回一个正确的、安全的非nil值。简而言之，任何显式或隐式要求对nil地址求值的表达式都是错误的。实现可能会在编译后的程序中注入额外的测试来强制执行此行为。

更多细节请参见[设计文档](/s/go12nil)。

_更新指南_：
依赖旧行为的代码大多存在错误，运行时将会失败。此类程序需要手动更新。

### 三索引切片 {#three_index}

Go 1.2增加了在切片操作中指定容量（而不仅仅是长度）的能力。切片操作通过描述已创建的数组或切片的一个连续部分来创建新的切片：

	var array [10]int
	slice := array[2:4]

切片的容量是切片可以容纳的最大元素数量，即使在重新切片之后；它反映了底层数组的大小。在此示例中，`slice`变量的容量为8。

Go 1.2增加了新的语法，允许切片操作同时指定容量和长度。第二个冒号引入容量值，该值必须小于或等于源切片或数组（根据起始位置调整后）的容量。例如，

	slice = array[2:4:7]

设置切片的长度与前面的例子相同，但其容量现在仅为5个元素（7-2）。不可能使用这个新的切片值来访问原始数组的最后三个元素。

在这种三索引表示法中，省略的第一个索引（`[:i:j]`）默认为零，但其他两个索引必须始终显式指定。Go的未来版本可能会为这些索引引入默认值。

更多细节请参见[设计文档](/s/go12slice)。

_更新指南_：
这是一个向后兼容的更改，不会影响现有程序。

## 实现与工具的变更 {#impl}

### 调度器中的抢占 {#preemption}

在之前的版本中，一个无限循环的协程（goroutine）可能会饿死同一线程上的其他协程，当GOMAXPROCS仅提供一个用户线程时，这是一个严重的问题。在Go 1.2中，这个问题得到了部分解决：调度器会在进入函数时偶尔被调用。这意味着任何包含（非内联）函数调用的循环都可以被抢占，从而允许其他协程在同一线程上运行。

### 线程数量限制 {#thread_limit}

Go 1.2引入了对单个程序在其地址空间中可能拥有的线程总数的可配置限制（默认为10,000），以避免某些环境中的资源耗尽问题。请注意，协程是复用在多个线程上的，因此此限制并不直接限制协程的数量，只限制可能同时在系统调用中阻塞的协程数量。在实践中，很难达到这个限制。

[`runtime/debug`](/pkg/runtime/debug/)包中的新函数[`SetMaxThreads`](/pkg/runtime/debug/#SetMaxThreads)用于控制线程数量限制。

_更新指南_：
很少有函数会受到此限制的影响，但如果程序因达到此限制而终止，可以修改程序以调用`SetMaxThreads`来设置更高的数量。更好的做法是重构程序以减少所需线程数量，从而减少内核资源的消耗。

### 栈大小 {#stack_size}

在Go 1.2中，创建协程时的栈最小大小已从4KB提升到8KB。许多程序因旧的大小而遇到性能问题，旧大小倾向于在性能关键部分引入开销较大的栈段切换。新数值是通过经验测试确定的。

另一方面，[`runtime/debug`](/pkg/runtime/debug)包中的新函数[`SetMaxStack`](/pkg/runtime/debug/#SetMaxStack)用于控制单个协程栈的*最大*大小。在64位系统上默认为1GB，在32位系统上默认为250MB。在Go 1.2之前，失控的递归很容易耗尽机器上的所有内存。_更新说明_:
增大的最小栈大小可能导致拥有大量协程的程序占用更多内存。目前尚无解决方案，但计划在未来的版本中引入新的栈管理技术，以更好地解决该问题。

### Cgo与C++ {#cgo_and_cpp}

[`cgo`](/cmd/cgo/) 命令现在将调用C++编译器来构建链接库中任何用C++编写的部分；[相关文档](/cmd/cgo/) 中有更多细节。

### Godoc和vet已移至go.tools子仓库 {#go_tools_godoc}

这两个二进制文件仍包含在发布版中，但godoc和vet命令的源代码已移至
[go.tools](https://code.google.com/p/go.tools) 子仓库。

此外，godoc程序的核心已被拆分为一个
[库](https://code.google.com/p/go/source/browse/?repo=tools#hg%2Fgodoc)，
而命令本身则位于一个单独的
[目录](https://code.google.com/p/go/source/browse/?repo=tools#hg%2Fcmd%2Fgodoc) 中。
这次迁移使得代码更新更加便捷，并且将库与命令分离后，更容易为本地站点和不同的部署方法构建自定义的二进制文件。

_更新说明_:
由于godoc和vet不属于库的一部分，
没有任何客户端Go代码依赖于它们的源代码，因此无需进行更新。

从 [golang.org](/) 获取的二进制发布版包含这些文件，因此这些发布版的用户不受影响。

从源代码构建时，用户必须使用"go get"来安装godoc和vet。
（这些二进制文件将继续安装到它们通常的安装位置，而非 `$GOPATH/bin`。）

	$ go get code.google.com/p/go.tools/cmd/godoc
	$ go get code.google.com/p/go.tools/cmd/vet

### gccgo状态 {#gccgo}

我们预计未来的GCC 4.9版本将包含完全支持Go 1.2的gccgo。
在当前（4.8.2）版本的GCC中，gccgo实现的是Go 1.1.2。

### gc编译器和链接器的变更 {#gc_changes}

Go 1.2对gc编译器套件的工作方式有若干语义上的变更。
大多数用户将不受这些变更影响。

当链接的库中包含C++代码时，[`cgo`](/cmd/cgo/) 命令现在可以正常工作。
详情请参阅 [`cgo`](/cmd/cgo/) 文档。

当程序没有 `package` 子句时，gc编译器会显示其起源的一个残留细节：它会假设该文件属于 `main` 包。
现在这段历史已被抹去，缺失的 `package` 子句会被视为一个错误。

在ARM架构上，工具链支持"外部链接"，这是朝着能够使用gc工具链构建共享库以及为需要该功能的环境提供动态链接支持所迈出的一步。

在ARM的运行时中，使用 `5a` 时，过去可以直接使用 `R9` 和 `R10` 来引用运行时内部的 `m`（机器）和 `g`（协程）变量。
现在则需要通过它们的正式名称来引用。

同样在ARM上，`5l` 链接器现在将 `MOVBS` 和 `MOVHS` 指令
定义为 `MOVB` 和 `MOVH` 的同义词，
以便更清晰地区分有符号和无符号的子字长移动操作；无符号版本之前已经存在，并带有 `U` 后缀。

### 测试覆盖率 {#cover}

[`go test`](/pkg/go/) 的一个主要新特性是它现在可以计算测试覆盖率，并且借助一个单独安装的新程序 "go tool cover" 来显示测试覆盖率结果。

cover工具是
[`go.tools`](https://code.google.com/p/go/source/checkout?repo=tools)
子仓库的一部分。
可以通过运行以下命令来安装：

	$ go get code.google.com/p/go.tools/cmd/cover

cover工具做两件事。
首先，当给 "go test" 加上 `-cover` 标志时，它会自动运行，重写包的源代码并插入检测语句。
然后，测试会照常编译和运行，并报告基本的覆盖率统计信息：

	$ go test -cover fmt
	ok  	fmt	0.060s	coverage: 91.4% of statements
	$

其次，要获得更详细的报告，可以对 "go test" 使用不同的标志来创建覆盖率配置文件，然后可以使用 "go tool cover" 调用的cover程序对其进行分析。

有关如何生成和分析覆盖率统计信息的详细信息，可以通过运行以下命令找到：

	$ go help testflag
	$ go tool cover -help

### go doc命令已删除 {#go_doc}

"go doc" 命令已被删除。
请注意，[`godoc`](/cmd/godoc/) 工具本身并未被删除，
只是删除了 [`go`](/cmd/go/) 命令对它的封装。
该命令所做的仅仅是通过包路径显示包的文档，而godoc本身已经能更灵活地做到这一点。
因此，为了减少文档工具的数量，并作为godoc重组的一部分，鼓励未来有更好的替代方案，故将其删除。

_更新说明_：对于那些仍然需要在目录中运行以下命令以获得精确功能的用户：

	$ go doc

其行为与运行以下命令完全相同：

	$ godoc .

### go命令的变更 {#gocmd}

[`go get`](/cmd/go/) 命令
现在有了一个 `-t` 标志，该标志会导致它下载包所运行的测试的依赖项，而不仅仅是包本身的依赖项。
默认情况下，与之前一样，测试的依赖项不会被下载。

## 性能 {#performance}

标准库中有许多显著的性能改进；以下列举其中一些。

  - [`compress/bzip2`](/pkg/compress/bzip2/) 的解压速度提升了约30%。
  - [`crypto/des`](/pkg/crypto/des/) 包的速度提升了约五倍。
  - [`encoding/json`](/pkg/encoding/json/) 包的编码速度提升了约30%。
  - 在Windows和BSD系统上，通过使用运行时中集成的网络轮询器（类似于Go 1.1中为Linux和OS X所做的），网络性能提升了约30%。

## 标准库的变更 {#library}

### archive/tar 和 archive/zip 包 {#archive_tar_zip}[`archive/tar`](/pkg/archive/tar/) 和 [`archive/zip`](/pkg/archive/zip/) 包的语义发生了可能导致现有程序中断的变更。问题在于它们都提供了 [`os.FileInfo`](/pkg/os/#FileInfo) 接口的实现，但这些实现不符合该接口的规范。具体而言，它们的 `Name` 方法返回的是条目的完整路径名，但接口规范要求该方法仅返回基础名称（最终路径元素）。

_更新_：由于此行为是新实现的且较为隐晦，可能没有代码依赖于已更改的行为。若有程序确实依赖此行为，则需要手动识别并修复。

### 新的 encoding 包 {#encoding}

新增了一个 [`encoding`](/pkg/encoding/) 包，它定义了一组标准编码接口，可用于为 [`encoding/xml`](/pkg/encoding/xml/)、[`encoding/json`](/pkg/encoding/json/) 和 [`encoding/binary`](/pkg/encoding/binary/) 等包构建自定义的编组器和解组器。这些新接口已被用于清理标准库中的一些实现。

新接口包括 [`BinaryMarshaler`](/pkg/encoding/#BinaryMarshaler)、[`BinaryUnmarshaler`](/pkg/encoding/#BinaryUnmarshaler)、[`TextMarshaler`](/pkg/encoding/#TextMarshaler) 和 [`TextUnmarshaler`](/pkg/encoding/#TextUnmarshaler)。完整详情请参见该包的[文档](/pkg/encoding/)及单独的[设计文档](/s/go12encoding)。

### fmt 包 {#fmt_indexed_arguments}

[`fmt`](/pkg/fmt/) 包的格式化打印例程（如 [`Printf`](/pkg/fmt/#Printf)）现在允许通过在格式化规范中使用索引操作来按任意顺序访问待打印的数据项。在需要从参数列表中获取参数进行格式化的任何地方——无论是作为待格式化的值，还是作为宽度或规范整数——都可以使用新的可选索引标记 `[`_n_`]` 来获取第 _n_ 个参数。_n_ 的值从1开始索引。在此类索引操作之后，正常处理流程要获取的下一个参数将是 _n_+1。

例如，正常的 `Printf` 调用：

	fmt.Sprintf("%c %c %c\n", 'a', 'b', 'c')

会创建字符串 `"a b c"`，但使用如下索引操作时：

	fmt.Sprintf("%[3]c %[1]c %c\n", 'a', 'b', 'c')

结果为 "`"c a b"`。`[3]` 索引访问第三个格式化参数，即 `'c'`；`[1]` 访问第一个参数 `'a'`；随后的下一次获取则访问该参数之后的参数 `'b'`。

此功能的设计初衷是为了支持可编程的格式语句，以便在国际化场景中以不同顺序访问参数，但它也有其他用途：

	log.Printf("trace: value %v of type %[1]T\n", expensiveFunction(a.b[c]))

_更新_：格式化规范语法的更改是严格向后兼容的，因此不会影响任何正常工作的程序。

### text/template 和 html/template 包 {#text_template}

[`text/template`](/pkg/text/template/) 包在 Go 1.2 中有几项变更，这些变更也同样体现在 [`html/template`](/pkg/html/template/) 包中。

首先，新增了用于比较基本类型的默认函数。这些函数列于下表中，显示了它们的名称和对应的习惯比较运算符。

<table cellpadding="0" summary="模板比较函数">
<tbody><tr>
<th width="50"></th><th width="100">名称</th> <th width="50">运算符</th>
</tr>
<tr>
<td></td><td><code>eq</code></td> <td><code>==</code></td>
</tr>
<tr>
<td></td><td><code>ne</code></td> <td><code>!=</code></td>
</tr>
<tr>
<td></td><td><code>lt</code></td> <td><code>&lt;</code></td>
</tr>
<tr>
<td></td><td><code>le</code></td> <td><code>&lt;=</code></td>
</tr>
<tr>
<td></td><td><code>gt</code></td> <td><code>&gt;</code></td>
</tr>
<tr>
<td></td><td><code>ge</code></td> <td><code>&gt;=</code></td>
</tr>
</tbody></table>

这些函数的行为与对应的 Go 运算符略有不同。首先，它们仅适用于基本类型（`bool`、`int`、`float64`、`string` 等）。（在某些情况下，Go 也允许比较数组和结构体。）其次，只要值属于相同类别即可进行比较：例如，任何有符号整数值都可以与任何其他有符号整数值进行比较。（Go 不允许比较 `int8` 和 `int16`。）最后，`eq` 函数（仅此函数）允许将第一个参数与一个或多个后续参数进行比较。在以下示例的模板中：

	{{if eq .A 1 2 3}} equal {{else}} not equal {{end}}

如果 `.A` 等于 1、2 或 3 中的 _任意一个_，则报告 "equal"。

第二个变更是对语法的小幅补充，使得 "else if" 链的编写更加简便。无需再写成：

	{{if eq .A 1}} X {{else}} {{if eq .A 2}} Y {{end}} {{end}}

而是可以将第二个 "if" 折叠进 "else" 中，并且只使用一个 "end"，如下所示：

	{{if eq .A 1}} X {{else if eq .A 2}} Y {{end}}

这两种形式在效果上完全相同；区别仅在于语法。

_更新_："else if" 的变更和比较函数均不影响现有程序。那些已经通过函数映射（function map）定义了名为 `eq` 等函数的程序不受影响，因为相关的函数映射将覆盖新的默认函数定义。

### 新增包 {#new_packages}

新增了两个包。

  - [`encoding`](/pkg/encoding/) 包已在[上文描述](#encoding)。
  - [`image/color/palette`](/pkg/image/color/palette/) 包提供了标准的调色板。

### 标准库的次要变更 {#minor_library_changes}

以下列表总结了对标准库的一系列次要变更，主要是新增内容。有关每项变更的详细信息，请参阅相关包文档。- [`archive/zip`](/pkg/archive/zip/) 包
    添加了
    [`DataOffset`](/pkg/archive/zip/#File.DataOffset) 访问器，
    用于返回文件（可能已压缩）数据在归档文件中的偏移量。
  - [`bufio`](/pkg/bufio/) 包
    为 [`Reader`](/pkg/bufio/#Reader) 和
    [`Writer`](/pkg/bufio/#Writer) 添加了
    [`Reset`](/pkg/bufio/#Reader.Reset) 方法。
    这些方法允许 [`Reader`](/pkg/io/#Reader) 和
    [`Writer`](/pkg/io/#Writer)
    在新的输入输出读写器上重用，从而节省分配开销。
  - [`compress/bzip2`](/pkg/compress/bzip2/) 现在可以解压串联的归档文件。
  - [`compress/flate`](/pkg/compress/flate/) 包
    为 [`Writer`](/pkg/compress/flate/#Writer) 添加了
    [`Reset`](/pkg/compress/flate/#Writer.Reset) 方法，
    使得例如在构建包含多个压缩文件的归档时能够减少内存分配。
  - [`compress/gzip`](/pkg/compress/gzip/) 包的
    [`Writer`](/pkg/compress/gzip/#Writer) 类型添加了
    [`Reset`](/pkg/compress/gzip/#Writer.Reset) 方法以便其可被重用。
  - [`compress/zlib`](/pkg/compress/zlib/) 包的
    [`Writer`](/pkg/compress/zlib/#Writer) 类型添加了
    [`Reset`](/pkg/compress/zlib/#Writer.Reset) 方法以便其可被重用。
  - [`container/heap`](/pkg/container/heap/) 包
    添加了 [`Fix`](/pkg/container/heap/#Fix) 方法，
    提供了一种更高效的方式来更新堆中元素的位置。
  - [`container/list`](/pkg/container/list/) 包
    添加了 [`MoveBefore`](/pkg/container/list/#List.MoveBefore) 和
    [`MoveAfter`](/pkg/container/list/#List.MoveAfter) 方法，
    实现了直观的重新排列功能。
  - [`crypto/cipher`](/pkg/crypto/cipher/) 包
    添加了新的 GCM 模式（伽罗瓦计数器模式），该模式几乎总是与 AES 加密一起使用。
  - [`crypto/md5`](/pkg/crypto/md5/) 包
    添加了新的 [`Sum`](/pkg/crypto/md5/#Sum) 函数，
    以简化哈希计算而不牺牲性能。
  - 类似地，[`crypto/sha1`](/pkg/crypto/md5/) 包
    添加了新的 [`Sum`](/pkg/crypto/sha1/#Sum) 函数。
  - 此外，[`crypto/sha256`](/pkg/crypto/sha256/) 包
    添加了 [`Sum256`](/pkg/crypto/sha256/#Sum256) 和 [`Sum224`](/pkg/crypto/sha256/#Sum224) 函数。
  - 最后，[`crypto/sha512`](/pkg/crypto/sha512/) 包
    添加了 [`Sum512`](/pkg/crypto/sha512/#Sum512) 和 [`Sum384`](/pkg/crypto/sha512/#Sum384) 函数。
  - [`crypto/x509`](/pkg/crypto/x509/) 包
    添加了对读写任意扩展的支持。
  - [`crypto/tls`](/pkg/crypto/tls/) 包
    添加了对 TLS 1.1、1.2 和 AES-GCM 的支持。
  - [`database/sql`](/pkg/database/sql/) 包
    为 [`DB`](/pkg/database/sql/#DB) 添加了
    [`SetMaxOpenConns`](/pkg/database/sql/#DB.SetMaxOpenConns) 方法，
    用于限制到数据库的打开连接数。
  - [`encoding/csv`](/pkg/encoding/csv/) 包
    现在总是允许字段末尾有逗号。
  - [`encoding/gob`](/pkg/encoding/gob/) 包
    现在将结构体的 channel（通道）和 function（函数）字段视为未导出（即使它们实际上是导出的），即完全忽略它们。以前这些字段会触发错误，如果嵌入的结构体添加了此类字段，可能会导致意外的兼容性问题。
    该包现在也支持上述 [`encoding`](/pkg/encoding/) 包的通用 `BinaryMarshaler` 和 `BinaryUnmarshaler` 接口。
  - [`encoding/json`](/pkg/encoding/json/) 包
    现在在打印字符串时总是将 & 转义为 "\u0026"。
    在 [`Marshal`](/pkg/encoding/json/#Marshal) 中，它现在接受并修正无效的 UTF-8 输入（以前此类输入会被拒绝）。
    最后，它现在支持上述 [`encoding`](/pkg/encoding/) 包的通用编码接口。
  - [`encoding/xml`](/pkg/encoding/xml/) 包
    现在允许存储在指针中的属性被序列化。
    它也通过新增的 [`Marshaler`](/pkg/encoding/xml/#Marshaler)、
    [`Unmarshaler`](/pkg/encoding/xml/#Unmarshaler) 以及相关的
    [`MarshalerAttr`](/pkg/encoding/xml/#MarshalerAttr) 和
    [`UnmarshalerAttr`](/pkg/encoding/xml/#UnmarshalerAttr) 接口，
    支持上述 [`encoding`](/pkg/encoding/) 包的通用编码接口。
    该包还为 [`Encoder`](/pkg/encoding/xml/#Encoder) 类型添加了
    [`Flush`](/pkg/encoding/xml/#Encoder.Flush) 方法，
    供自定义编码器使用。相关用法请参阅 [`EncodeToken`](/pkg/encoding/xml/#Encoder.EncodeToken) 的文档。
  - [`flag`](/pkg/flag/) 包现在
    有一个 [`Getter`](/pkg/flag/#Getter) 接口，
    允许检索标志的值。由于 Go 1 的兼容性准则，此方法无法添加到现有的 [`Value`](/pkg/flag/#Value) 接口中，但所有现有的标准标志类型都实现了它。
    该包现在还导出了 [`CommandLine`](/pkg/flag/#CommandLine) 标志集，该集合包含来自命令行的标志。
  - [`go/ast`](/pkg/go/ast/) 包的
    [`SliceExpr`](/pkg/go/ast/#SliceExpr) 结构体
    有一个新的布尔字段 `Slice3`，当表示带有三个索引（两个冒号）的切片表达式时，该字段设置为 true。默认为 false，表示通常的两个索引形式。
  - [`go/build`](/pkg/go/build/) 包
    向 [`Package`](/pkg/go/build/#Package) 类型添加了 `AllTags` 字段，
    使处理构建标签变得更加容易。
  - [`image/draw`](/pkg/image/draw/) 包现在
    导出了一个接口 [`Drawer`](/pkg/image/draw/#Drawer)，
    它封装了标准的 [`Draw`](/pkg/image/draw/#Draw) 方法。
    Porter-Duff 运算符现在实现了此接口，实际上是将操作绑定到绘图运算符，而不是显式提供。
    给定一个调色板图像作为目标，新的 [`Drawer`](/pkg/image/draw/#Drawer) 接口的
    [`FloydSteinberg`](/pkg/image/draw/#FloydSteinberg) 实现将使用 Floyd-Steinberg 误差扩散算法来绘制图像。
    为了创建适合此类处理的调色板，新的 [`Quantizer`](/pkg/image/draw/#Quantizer) 接口
    表示量化算法的实现，这些算法根据全彩图像选择调色板。
    库中没有该接口的实现。
  - [`image/gif`](/pkg/image/gif/) 包现在可以使用新的
    [`Encode`](/pkg/image/gif/#Encode) 和 [`EncodeAll`](/pkg/image/gif/#EncodeAll) 函数创建 GIF 文件。
    它们的选项参数允许指定要使用的图像 [`Quantizer`](/pkg/image/draw/#Quantizer)；
    如果为 `nil`，生成的 GIF 将使用在新的 [`image/color/palette`](/pkg/image/color/palette/) 包中定义的
    [`Plan9`](/pkg/image/color/palette/#Plan9) 颜色映射（调色板）。
    选项还指定用于创建输出图像的 [`Drawer`](/pkg/image/draw/#Drawer)；
    如果为 `nil`，则使用 Floyd-Steinberg 误差扩散。
  - [`io`](/pkg/io/) 包的
    [`Copy`](/pkg/io/#Copy) 方法现在以不同的优先级处理其参数。
    如果一个参数实现了 [`WriterTo`](/pkg/io/#WriterTo) 而另一个实现了 [`ReaderFrom`](/pkg/io/#ReaderFrom)，
    那么 [`Copy`](/pkg/io/#Copy) 现在将调用 [`WriterTo`](/pkg/io/#WriterTo) 来完成工作，
    因此通常需要更少的中间缓冲。
  - [`net`](/pkg/net/) 包默认需要 cgo，
    因为主机操作系统通常需要协调网络调用的建立。
    然而，在某些系统上，可以在没有 cgo 的情况下使用网络，并且这样做是有用的，例如为了避免动态链接。
    新的构建标签 `netgo`（默认关闭）允许在那些可能的系统上用纯 Go 构建 `net` 包。
  - [`net`](/pkg/net/) 包为 [`Dialer`](/pkg/net/#Dialer) 结构体
    添加了一个新字段 `DualStack`，
    用于使用 [RFC 6555](https://tools.ietf.org/html/rfc6555) 中描述的双 IP 栈进行 TCP 连接设置。
  - [`net/http`](/pkg/net/http/) 包将不再传输
    根据 [RFC 6265](https://tools.ietf.org/html/rfc6265) 不正确的 cookie。
    它只记录一个错误并且不发送任何内容。
    此外，[`net/http`](/pkg/net/http/) 包的
    [`ReadResponse`](/pkg/net/http/#ReadResponse) 函数现在允许 `*Request` 参数为 `nil`，
    此时它假定是一个 GET 请求。
    最后，HTTP 服务器现在将透明地处理 HEAD 请求，
    而无需在处理程序代码中进行特殊处理。在处理 HEAD 请求期间，对 [`Handler`](/pkg/net/http/#Handler) 的
    [`ResponseWriter`](/pkg/net/http/#ResponseWriter) 的写入将被 [`Server`](/pkg/net/http/#Server) 吸收，
    客户端将根据 HTTP 规范收到一个空的正文。
  - [`os/exec`](/pkg/os/exec/) 包的
    [`Cmd.StdinPipe`](/pkg/os/exec/#Cmd.StdinPipe) 方法返回一个 `io.WriteCloser`，
    但其具体实现已从 `*os.File` 更改为一个嵌入 `*os.File` 的未导出类型，
    现在关闭返回值是安全的。
    在 Go 1.2 之前，存在一个不可避免的竞态条件，此更改修复了它。
    需要访问 `*os.File` 方法的代码可以使用接口类型断言，例如 `wc.(interface{ Sync() error })`。
  - [`runtime`](/pkg/runtime/) 包
    放宽了 [`SetFinalizer`](/pkg/runtime/#SetFinalizer) 中对终结器函数的约束：
    实参现在可以是任何可赋值给函数形参类型的值，这与 Go 中任何普通函数调用的情况一致。
  - [`sort`](/pkg/sort/) 包有一个新的
    [`Stable`](/pkg/sort/#Stable) 函数，实现了稳定排序。然而，它的效率低于普通排序算法。
  - [`strings`](/pkg/strings/) 包
    添加了 [`IndexByte`](/pkg/strings/#IndexByte) 函数，
    以与 [`bytes`](/pkg/bytes/) 包保持一致。
  - [`sync/atomic`](/pkg/sync/atomic/) 包
    添加了一组新的交换函数，这些函数原子地将参数与存储在指针中的值交换，并返回旧值。
    这些函数是
    [`SwapInt32`](/pkg/sync/atomic/#SwapInt32)、
    [`SwapInt64`](/pkg/sync/atomic/#SwapInt64)、
    [`SwapUint32`](/pkg/sync/atomic/#SwapUint32)、
    [`SwapUint64`](/pkg/sync/atomic/#SwapUint64)、
    [`SwapUintptr`](/pkg/sync/atomic/#SwapUintptr)
    和 [`SwapPointer`](/pkg/sync/atomic/#SwapPointer)（交换一个 `unsafe.Pointer`）。
  - [`syscall`](/pkg/syscall/) 包现在为 Darwin 实现了 [`Sendfile`](/pkg/syscall/#Sendfile)。
  - [`testing`](/pkg/testing/) 包
    现在导出了 [`TB`](/pkg/testing/#TB) 接口。
    它记录了 [`T`](/pkg/testing/#T) 和 [`B`](/pkg/testing/#B) 类型的共同方法，
    以便更轻松地在测试和基准测试之间共享代码。
    此外，[`AllocsPerRun`](/pkg/testing/#AllocsPerRun) 函数现在将返回值量化为整数（尽管它仍然是 `float64` 类型），
    以消除由初始化引起的任何误差，使结果更具可重复性。
  - [`text/template`](/pkg/text/template/) 包
    现在在计算“转义”函数（如 "html"）的参数时自动解引用指针值，
    以使此类函数的行为与其他打印函数（如 "printf"）一致。
  - 在 [`time`](/pkg/time/) 包中，[`Parse`](/pkg/time/#Parse) 函数和 [`Format`](/pkg/time/#Time.Format) 方法
    现在处理带有秒数的时区偏移，例如历史日期 "1871-01-01T05:33:02+00:34:08"。
    此外，这些例程的格式中的模式匹配更严格：标准单词（如 "Jan" 和 "Mon"）之后现在必须跟一个非小写字母。
  - [`unicode`](/pkg/unicode/) 包
    添加了 [`In`](/pkg/unicode/#In) 函数，
    它是原始 [`IsOneOf`](/pkg/unicode/#IsOneOf) 的一个更易用但等效的版本，
    用于查看字符是否是某个 Unicode 类别的成员。