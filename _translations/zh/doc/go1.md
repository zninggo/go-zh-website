---
template: true
title: Go 1 发布说明
---

## Go 1 简介 {#introduction}

Go 版本 1（简称 Go 1）定义了一种语言和一组核心库，为创建可靠的产品、项目和出版物奠定了稳定的基础。

Go 1 的主要动机是为其用户提供稳定性。人们应当能够编写 Go 程序，并期望它们在未来数年内，包括在 Google App Engine 等生产环境中，能够无需修改地持续编译和运行。同样，人们应当能够编写关于 Go 的书籍，明确指出书中描述的是哪个 Go 版本，并且该版本号在很久以后仍然具有意义。

在 Go 1 中编译的代码，在整个版本生命周期内应能继续编译和运行，即使我们发布了更新和错误修复（如 Go 版本 1.1、1.2 等），极少数情况除外。除了关键性修复，针对 Go 1 后续版本对语言和库所做的更改可能会增加功能，但不会破坏现有的 Go 1 程序。[Go 1 兼容性文档](go1compat.html)更详细地解释了兼容性准则。

Go 1 代表了 Go 语言当前的使用方式，而不是对语言的彻底重新设计。我们避免设计新功能，而是专注于清理问题和不一致性，并提高可移植性。我们曾考虑并原型化了 Go 语言和库的许多更改，但一直未发布，主要是因为它们是重大更改且不向后兼容。Go 1 是推出这些更改的机会，这对长期发展有益，但也意味着 Go 1 为旧程序引入了不兼容性。幸运的是，`go` `fix` 工具可以自动化将程序升级到 Go 1 标准所需的大部分工作。

本文档概述了将影响程序员更新现有代码的 Go 1 主要变更；其参考点是之前的版本 r60（标记为 r60.3）。它还解释了如何将代码从 r60 更新到 Go 1 环境下运行。

## 语言变更 {#language}

### Append {#append}

`append` 预定义可变参数函数使得向切片末尾添加元素以增长切片变得简单。
一个常见用法是在生成输出时，将字节添加到字节切片的末尾。
然而，`append` 并未提供将字符串追加到 `[]byte` 的方法，这是另一种常见情况。

{{code "/doc/progs/go1.go" `/greeting := ..byte/` `/append.*hello/`}}

类比 `copy` 的类似属性，Go 1 允许将字符串直接（按字节）追加到字节切片，减少了字符串和字节切片之间的转换摩擦。
不再需要进行转换：

{{code "/doc/progs/go1.go" `/append.*world/`}}

_更新_：
这是一个新功能，因此现有代码无需更改。

### Close {#close}

`close` 预定义函数提供了一种机制，让发送方发出不再发送任何值的信号。
它对实现通道的 `for` `range` 循环至关重要，在其他情况下也很有用。
部分出于设计，部分因为否则可能发生的竞态条件，它只应由在通道上发送数据的 goroutine（协程）使用，而不是由接收数据的 goroutine（协程）使用。
然而，在 Go 1 之前，没有编译时检查来确保 `close` 被正确使用。

为了至少部分地弥补这一缺陷，Go 1 禁止对只接收通道调用 `close`。
尝试关闭此类通道将导致编译时错误。

{{code "/doc/progs/go1.go" `/STARTCLOSE/` `/ENDCLOSE/`}}

_更新_：
尝试关闭只接收通道的现有代码即使在 Go 1 之前也是错误的，应该修正。编译器现在会拒绝此类代码。

### 复合字面量 {#literals}

在 Go 1 中，如果数组、切片或映射类型的元素初始化器是指针类型，则可以省略它们的类型说明。
此示例中的所有四个初始化都是合法的；最后一个在 Go 1 之前是非法的。

{{code "/doc/progs/go1.go" `/type Date struct/` `/STOP/`}}

_更新_：
此变更对现有代码没有影响，但对现有源代码应用 `gofmt` `-s` 命令，除了其他操作外，还会在允许的地方省略显式的元素类型。

### 初始化期间的 Goroutine {#init}

旧的语言规范定义，在初始化期间执行的 `go` 语句会创建 goroutine（协程），但它们直到整个程序初始化完成后才开始运行。
这在许多地方引入了笨拙性，并且实际上限制了 `init` 构造的效用：
如果另一个包在初始化期间可能使用该库，则该库被迫避免使用 goroutine（协程）。
这样做是出于简单性和安全性的考虑，但随着我们对语言信心的增长，这似乎变得不必要了。
在初始化期间运行 goroutine（协程）并不比在正常执行期间运行它们更复杂或更不安全。

在 Go 1 中，可以在 `init` 例程和全局初始化表达式中调用使用 goroutine（协程）的代码，而不会引入死锁。

{{code "/doc/progs/go1.go" `/PackageGlobal/` `/^}/`}}

_更新_：
这是一个新功能，因此现有代码无需更改，尽管依赖于在 `main` 之前不启动 goroutine（协程）的代码可能会中断。
标准仓库中不存在此类代码。

### rune 类型 {#rune}

语言规范允许 `int` 类型为 32 位或 64 位宽，但当前实现即使在 64 位平台上也将 `int` 设置为 32 位。
在 64 位平台上使用 64 位 `int` 会更好。
（这对大型切片的索引有重要影响。）
然而，这一更改在使用旧语言处理 Unicode 字符时会造成空间浪费，因为 `int` 类型也用于保存 Unicode 码点：如果 `int` 从 32 位增长到 64 位，每个码点将浪费额外的 32 位存储空间。为实现将 `int` 改为 64 位的可行性，Go 1 引入了一个新的基本类型 `rune`，用于表示单个 Unicode 码点。它是 `int32` 的别名，类似于 `byte` 作为 `uint8` 的别名。

字符字面量（如 `'a'`、`'語'` 和 `'\u0345'`）现在默认类型为 `rune`，类似于 `1.0` 默认为 `float64` 类型。因此，除非另有指定，初始化为字符常量的变量将具有 `rune` 类型。

库函数已更新为在适当情况下使用 `rune` 而非 `int`。例如，`unicode.ToLower` 及相关函数现在接收和返回 `rune` 类型值。

{{code "/doc/progs/go1.go" `/STARTRUNE/` `/ENDRUNE/` }}

**更新说明**：
大多数源代码不会受到影响，因为 `:=` 初始化器的类型推断会静默引入新类型，并由此传播。
部分代码可能会因类型错误需要简单转换即可解决。

### error 类型 {#error}

Go 1 引入了一个新的内置类型 `error`，其定义如下：

	    type error interface {
	        Error() string
	    }

由于该类型的所有影响均体现在标准库中，相关内容将在[下文](#errors)讨论。

### 从 map 中删除元素 {#delete}

在旧版语言中，要从 map `m` 中删除键为 `k` 的条目，需编写如下语句：

	    m[k] = value, false

此语法是特殊的赋值方式，也是唯一的二对一赋值。它要求传递一个通常被忽略的值（该值会被计算但丢弃），以及一个几乎总是常量 `false` 的布尔值。虽然功能实现，但语法怪异且存在争议。

在 Go 1 中，该语法已被移除，取而代之的是新的内置函数 `delete`。调用

{{code "/doc/progs/go1.go" `/delete\(m, k\)/` }}

将删除表达式 `m[k]` 所对应的 map 条目。该函数无返回值。删除不存在的条目将不执行任何操作。

**更新说明**：
运行 `go` `fix` 命令会将形如 `m[k] = value, false` 的表达式转换为 `delete(m, k)`，前提是能明确识别被忽略的值可安全丢弃且 `false` 指代预定义的布尔常量。修复工具会对该语法的其他用法进行标记，供程序员检查。

### map 的迭代顺序 {#iteration}

旧版语言规范未定义 map 的迭代顺序，实践中不同硬件平台的迭代顺序存在差异。这导致依赖 map 迭代顺序的测试变得脆弱且不可移植，可能出现测试在某台机器上始终通过而在其他机器上失败的情况。

在 Go 1 中，使用 `for` `range` 语句遍历 map 时，元素访问顺序被明确定义为不可预测——即使对同一 map 多次运行相同循环。代码不应假设元素按任何特定顺序访问。

此变更意味着依赖迭代顺序的代码很可能尽早暴露问题并得到修复。同样重要的是，它允许 map 实现在程序使用 range 循环选择元素时确保更好的负载均衡。

{{code "/doc/progs/go1.go" `/Sunday/` `/^	}/` }}

**更新说明**：
这是工具无法自动处理的变更之一。大多数现有代码不受影响，但部分程序可能出错或行为异常；建议手动检查所有涉及 map 的 range 语句，确保其不依赖迭代顺序。标准库中曾存在此类示例，现均已修复。需注意，依赖未规范的迭代顺序本身就是错误的，此变更正式确认了其不可预测性。

### 多重赋值 {#multiple_assignment}

语言规范长期保证：在赋值操作中，右侧表达式均会在左侧表达式赋值前全部完成计算。为确保可预测行为，Go 1 对此规范进行了细化。

若赋值语句的左侧包含需计算的表达式（如函数调用或数组索引操作），这些表达式将遵循从左到右的常规计算顺序完成后，再进行变量赋值。所有计算完成后，实际赋值按从左到右顺序执行。

以下示例说明了该行为：

{{code "/doc/progs/go1.go" `/sa :=/` `/then sc.0. = 2/` }}

**更新说明**：
这是工具无法自动处理的变更之一，但引发兼容性问题的可能性极低。标准库中无代码因此变更被破坏，而依赖先前未规范行为的代码本身即存在错误。

### return 语句与变量遮蔽 {#shadowing}

常见错误是在赋值后使用无参数的 `return` 语句，而被赋值的变量与返回值同名但并非同一变量。这种情况称为**变量遮蔽**：返回值变量被内层作用域中同名的另一个变量所遮蔽。

在具名返回值的函数中，若任何具名返回值在 return 语句处被遮蔽，Go 1 编译器将禁止使用无参数 return 语句。（该限制未纳入规范，因该领域仍处于探索阶段；类似情况如编译器拒绝未以显式 return 语句结束的函数。）

以下函数隐式返回了被遮蔽的返回值，将被编译器拒绝：

{{code "/doc/progs/go1.go" `/^func Bug/` `/^}$/` }}

**更新说明**：
以这种方式遮蔽返回值的代码将被编译器拒绝，需手动修复。标准库中出现的少数此类情况大多属于缺陷。

### 复制含有未导出字段的结构体 {#unexported}旧语言不允许一个包复制包含其他包私有字段的结构体值。不过，方法接收器是个必要的例外；此外，`copy` 和 `append` 的实现也从未遵守过这一限制。

Go 1 将允许包复制包含其他包私有字段的结构体值。除了解决不一致性问题外，这一变化还引入了一种新的 API 设计：包可以返回一个不透明的值，而无需依赖指针或接口。`time.Time` 和 `reflect.Value` 的新实现就是利用此新特性的类型示例。

例如，如果包 `p` 包含以下定义：

    type Struct struct {
        Public int
        secret int
    }
    func NewStruct(a int) Struct {  // 注意：不是指针。
        return Struct{a, f(a)}
    }
    func (s Struct) String() string {
        return fmt.Sprintf("{%d (secret %d)}", s.Public, s.secret)
    }

那么导入 `p` 的包就可以随意赋值和复制 `p.Struct` 类型的值。在底层，私有字段将像导出字段一样被赋值和复制，但客户端代码永远不会察觉到它们。代码：

    import "p"

    myStruct := p.NewStruct(23)
    copyOfMyStruct := myStruct
    fmt.Println(myStruct, copyOfMyStruct)

将显示该结构体的私有字段 `secret` 已被复制到新值中。

_更新_：
这是一个新特性，因此现有代码无需更改。

### 相等性 {#equality}

在 Go 1 之前，语言未定义结构体和数组值的相等性。这意味着，除其他事项外，结构体和数组不能用作映射（map）的键。另一方面，Go 确实定义了函数和映射值的相等性。在存在闭包的情况下，函数的相等性是有问题的（何时两个闭包相等？），而映射的相等性比较的是指针而非映射的内容，这通常不是用户想要的。

Go 1 解决了这些问题。首先，结构体和数组可以进行相等性（`==`）和不等性（`!=`）比较，因此可以作为映射的键，前提是它们由也定义了相等性的元素组成，使用逐元素比较。

{{code "/doc/progs/go1.go" `/type Day struct/` `/Printf/`}}

其次，Go 1 移除了函数值的相等性定义，除了与 `nil` 的比较。最后，映射的相等性也被移除，同样除了与 `nil` 的比较。

请注意，切片（slice）的相等性仍未定义，因为其计算通常是不可行的。另请注意，有序比较运算符（< <= `>` `>=`）对于结构体和数组也仍未定义。

_更新_：
结构体和数组相等性是新特性，因此现有代码无需更改。依赖函数或映射相等性的现有代码将被编译器拒绝，需要手动修复。受影响的程序可能不多，但修复可能需要一些重新设计。

## 包层级结构 {#packages}

Go 1 解决了旧标准库中的许多不足，并清理了多个包，使其内部更加一致和可移植。

本节描述了 Go 1 中包是如何重新组织的。有些移动了，有些重命名了，有些被删除了。新包将在后续章节中描述。

### 包层级结构 {#hierarchy}

Go 1 有一个重新安排的包层级结构，将相关项目分组到子目录中。例如，`utf8` 和 `utf16` 现在位于 `unicode` 的子目录中。此外，[一些包](#subrepo)已移至 [`code.google.com/p/go`](https://code.google.com/p/go) 的子仓库，而[另一些](#deleted)则被彻底删除。

<table class="codetable" frame="border" summary="已移动的包">
<colgroup align="left" width="60%"></colgroup>
<colgroup align="left" width="40%"></colgroup>
<tbody><tr>
<th align="left">旧路径</th>
<th align="left">新路径</th>
</tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>asn1</td> <td>encoding/asn1</td></tr>
<tr><td>csv</td> <td>encoding/csv</td></tr>
<tr><td>gob</td> <td>encoding/gob</td></tr>
<tr><td>json</td> <td>encoding/json</td></tr>
<tr><td>xml</td> <td>encoding/xml</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>exp/template/html</td> <td>html/template</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>big</td> <td>math/big</td></tr>
<tr><td>cmath</td> <td>math/cmplx</td></tr>
<tr><td>rand</td> <td>math/rand</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>http</td> <td>net/http</td></tr>
<tr><td>http/cgi</td> <td>net/http/cgi</td></tr>
<tr><td>http/fcgi</td> <td>net/http/fcgi</td></tr>
<tr><td>http/httptest</td> <td>net/http/httptest</td></tr>
<tr><td>http/pprof</td> <td>net/http/pprof</td></tr>
<tr><td>mail</td> <td>net/mail</td></tr>
<tr><td>rpc</td> <td>net/rpc</td></tr>
<tr><td>rpc/jsonrpc</td> <td>net/rpc/jsonrpc</td></tr>
<tr><td>smtp</td> <td>net/smtp</td></tr>
<tr><td>url</td> <td>net/url</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>exec</td> <td>os/exec</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>scanner</td> <td>text/scanner</td></tr>
<tr><td>tabwriter</td> <td>text/tabwriter</td></tr>
<tr><td>template</td> <td>text/template</td></tr>
<tr><td>template/parse</td> <td>text/template/parse</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>utf8</td> <td>unicode/utf8</td></tr>
<tr><td>utf16</td> <td>unicode/utf16</td></tr>
</tbody></table>

请注意，旧的 `cmath` 和 `exp/template/html` 包的包名已分别更改为 `cmplx` 和 `template`。

_更新_：
运行 `go` `fix` 命令将更新仍保留在标准仓库中的所有导入和包重命名。导入已不在标准仓库中的包的程序将需要手动编辑。

### 包目录树 exp {#exp}由于未经标准化，`exp` 目录下的包在标准 Go 1 发行版中将不可用，但开发者如需使用，可在[代码仓库](https://code.google.com/p/go/)中以源码形式获取。

在 Go 1 发布时，以下几个包已移至 `exp` 目录下：

  - `ebnf`
  - `html`<sup>†</sup>
  - `go/types`

(<sup>†</sup> `EscapeString` 和 `UnescapeString` 类型仍保留在 `html` 包中。)

所有这些包仍以相同名称可用，只需加上 `exp/` 前缀：如 `exp/ebnf` 等。

此外，`utf8.String` 类型已移至其独立的包 `exp/utf8string` 中。

最后，`gotype` 命令现在位于 `exp/gotype`，而 `ebnflint` 则位于 `exp/ebnflint`。若已安装，它们现在位于 `$GOROOT/bin/tool`。

_更新说明_：
使用 `exp` 中包的代码需要手动更新，或者从已安装 `exp` 的环境进行编译。`go` `fix` 工具或编译器会对此类用法发出警告。

### 包目录树 old {#old}

由于已被弃用，`old` 目录下的包在标准 Go 1 发行版中将不可用，但开发者如需使用，仍可以源码形式获取。

它们在新位置的包是：

  - `old/netchan`

_更新说明_：
使用现位于 `old` 中包的代码需要手动更新，或者从已安装 `old` 的环境进行编译。`go` `fix` 工具会对此类用法发出警告。

### 已删除的包 {#deleted}

Go 1 彻底删除了以下几个包：

  - `container/vector`
  - `exp/datafmt`
  - `go/typechecker`
  - `old/regexp`
  - `old/template`
  - `try`

同时也删除了 `gotry` 命令。

_更新说明_：
使用 `container/vector` 的代码应更新为直接使用切片（slice）。可参考 [Go 语言社区 Wiki](https://code.google.com/p/go-wiki/wiki/SliceTricks) 获取一些建议。使用其他包（应几乎为零）的代码需要重新设计。

### 移至子仓库的包 {#subrepo}

Go 1 已将许多包移入其他仓库，通常是[主 Go 仓库](https://code.google.com/p/go/)的子仓库。此表列出了旧的和新的导入路径：

<table class="codetable" frame="border" summary="Sub-repositories">
<colgroup align="left" width="40%"></colgroup>
<colgroup align="left" width="60%"></colgroup>
<tbody><tr>
<th align="left">旧路径</th>
<th align="left">新路径</th>
</tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>crypto/bcrypt</td> <td>code.google.com/p/go.crypto/bcrypt</td></tr>
<tr><td>crypto/blowfish</td> <td>code.google.com/p/go.crypto/blowfish</td></tr>
<tr><td>crypto/cast5</td> <td>code.google.com/p/go.crypto/cast5</td></tr>
<tr><td>crypto/md4</td> <td>code.google.com/p/go.crypto/md4</td></tr>
<tr><td>crypto/ocsp</td> <td>code.google.com/p/go.crypto/ocsp</td></tr>
<tr><td>crypto/openpgp</td> <td>code.google.com/p/go.crypto/openpgp</td></tr>
<tr><td>crypto/openpgp/armor</td> <td>code.google.com/p/go.crypto/openpgp/armor</td></tr>
<tr><td>crypto/openpgp/elgamal</td> <td>code.google.com/p/go.crypto/openpgp/elgamal</td></tr>
<tr><td>crypto/openpgp/errors</td> <td>code.google.com/p/go.crypto/openpgp/errors</td></tr>
<tr><td>crypto/openpgp/packet</td> <td>code.google.com/p/go.crypto/openpgp/packet</td></tr>
<tr><td>crypto/openpgp/s2k</td> <td>code.google.com/p/go.crypto/openpgp/s2k</td></tr>
<tr><td>crypto/ripemd160</td> <td>code.google.com/p/go.crypto/ripemd160</td></tr>
<tr><td>crypto/twofish</td> <td>code.google.com/p/go.crypto/twofish</td></tr>
<tr><td>crypto/xtea</td> <td>code.google.com/p/go.crypto/xtea</td></tr>
<tr><td>exp/ssh</td> <td>code.google.com/p/go.crypto/ssh</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>image/bmp</td> <td>code.google.com/p/go.image/bmp</td></tr>
<tr><td>image/tiff</td> <td>code.google.com/p/go.image/tiff</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>net/dict</td> <td>code.google.com/p/go.net/dict</td></tr>
<tr><td>net/websocket</td> <td>code.google.com/p/go.net/websocket</td></tr>
<tr><td>exp/spdy</td> <td>code.google.com/p/go.net/spdy</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>encoding/git85</td> <td>code.google.com/p/go.codereview/git85</td></tr>
<tr><td>patch</td> <td>code.google.com/p/go.codereview/patch</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>exp/wingui</td> <td>code.google.com/p/gowingui</td></tr>
</tbody></table>

_更新说明_：
运行 `go` `fix` 将更新这些包的导入路径为新路径。依赖于这些包的安装环境需要使用 `go get` 命令来安装它们。

## 库的重大变更 {#major}

本节描述核心库的重大变更，这些变更影响最广泛。

### error 类型与 errors 包 {#errors}

`os.Error` 位于 `os` 包中主要是历史原因：错误最初在实现 `os` 包时出现，当时看来与系统相关。此后人们意识到错误比操作系统更为基础。例如，如果能在 `os` 依赖的包（如 `syscall`）中使用 `Errors` 将是件好事。此外，将 `Error` 放在 `os` 中引入了许多原本不会存在的对 `os` 的依赖。

Go 1 通过引入内置的 `error` 接口类型和一个独立的 `errors` 包（类似于 `bytes` 和 `strings` 包）来解决这些问题，该包包含实用函数。它用 [`errors.New`](/pkg/errors/#New) 取代了 `os.NewError`，使错误在环境中占据更核心的位置。

为了确保广泛使用的 `String` 方法不会意外满足 `error` 接口，`error` 接口改用 `Error` 作为该方法的名称：

	    type error interface {
	        Error() string
	    }`fmt` 库现在会自动调用 `Error` 方法，就像它已经为 `String` 方法所做的那样，以便轻松打印错误值。

{{code "/doc/progs/go1.go" `/START ERROR EXAMPLE/` `/END ERROR EXAMPLE/`}}

所有标准库包都已更新为使用新的接口；旧的 `os.Error` 已被移除。

一个新的 [`errors`](/pkg/errors/) 包包含了函数

	func New(text string) error

用于将字符串转换为错误。它取代了旧的 `os.NewError`。

{{code "/doc/progs/go1.go" `/ErrSyntax/`}}

_更新方法_：
运行 `go` `fix` 命令将更新受此变更影响的几乎全部代码。
定义了带有 `String` 方法的错误类型的代码需要手动更新，将这些方法重命名为 `Error`。

### 系统调用错误 {#errno}

旧的 `syscall` 包（早于 `os.Error`，也早于几乎所有其他内容）以 `int` 值的形式返回错误。
相应地，`os` 包转发了许多这些错误，例如 `EINVAL`，但在每个平台上使用不同的错误集。这种行为不理想且不可移植。

在 Go 1 中，[`syscall`](/pkg/syscall/) 包改为对系统调用错误返回一个 `error`。
在 Unix 上，其实现由一个满足 `error` 接口的 [`syscall.Errno`](/pkg/syscall/#Errno) 类型完成，取代了旧的 `os.Errno`。

影响 `os.EINVAL` 及其相关错误的更改[另有所述](#os)。

_更新方法_：
运行 `go` `fix` 命令将更新受此变更影响的几乎全部代码。
无论如何，大多数代码应该使用 `os` 包而不是 `syscall`，因此不会受到影响。

### 时间 {#time}

在编程语言中良好支持时间总是一个挑战。
旧的 Go `time` 包使用 `int64` 单位，缺乏真正的类型安全，并且不区分绝对时间和持续时间。

因此，Go 1 库中最重要的改变之一就是对 [`time`](/pkg/time/) 包进行了彻底的重新设计。
取代以 `int64` 表示的纳秒数整数以及用于处理人类可读单位（如小时、年）的单独 `*time.Time` 类型，现在有两个基本类型：
[`time.Time`](/pkg/time/#Time)（一个值，因此 `*` 被移除），代表一个时间点；
以及 [`time.Duration`](/pkg/time/#Duration)，代表一个时间间隔。
两者都具有纳秒精度。`Time` 可以表示远古过去到遥远未来的任何时间，而 `Duration` 只能跨越大约正负 290 年。
这些类型上有许多方法，加上一些有用的预定义常量持续时间，如 `time.Second`。

新方法包括诸如
[`Time.Add`](/pkg/time/#Time.Add)（将一个 `Duration` 加到 `Time` 上）和
[`Time.Sub`](/pkg/time/#Time.Sub)（两个 `Time` 相减得到一个 `Duration`）等功能。

最重要的语义变化是 Unix 纪元（1970年1月1日）现在仅对那些提及 Unix 的函数和方法相关：
[`time.Unix`](/pkg/time/#Unix) 以及 `Time` 类型的
[`Unix`](/pkg/time/#Time.Unix) 和 [`UnixNano`](/pkg/time/#Time.UnixNano) 方法。
特别是，[`time.Now`](/pkg/time/#Now) 返回一个 `time.Time` 值，而不是旧的 API 中自 Unix 纪元以来的整数纳秒计数。

{{code "/doc/progs/go1.go" `/sleepUntil/` `/^}/`}}

新的类型、方法和常量已经传播到所有使用时间的标准库包中，例如 `os` 包及其文件时间戳的表示。

_更新方法_：
`go` `fix` 工具将更新许多旧 `time` 包的使用，使其采用新的类型和方法，尽管它不会替换像 `1e9` 这样表示每秒纳秒数的值。
此外，由于某些涉及值的类型更改，由修复工具重写的一些表达式可能需要进一步手动编辑；在这种情况下，重写将包含用于旧功能的正确函数或方法，但可能类型错误或需要进一步分析。

## 库的次要更改 {#minor}

本节描述了一些较小的更改，例如对不常用包的更改，或者影响范围较小、只需要运行 `go` `fix` 命令的程序更改。此类别包括 Go 1 中新增的包。总体而言，这些更改提高了可移植性，规范了行为，并使接口更现代化、更符合 Go 的风格。

### archive/zip 包 {#archive_zip}

在 Go 1 中，[`*zip.Writer`](/pkg/archive/zip/#Writer) 不再具有 `Write` 方法。之前存在这个方法是一个错误。

_更新方法_：
受影响的少量代码会被编译器捕获，必须手动更新。

### bufio 包 {#bufio}

在 Go 1 中，[`bufio.NewReaderSize`](/pkg/bufio/#NewReaderSize) 和 [`bufio.NewWriterSize`](/pkg/bufio/#NewWriterSize) 函数在大小无效时不再返回错误。如果参数 size 太小或无效，它将被调整。

_更新方法_：
运行 `go` `fix` 命令将更新那些将错误赋值给 \_ 的调用。
未被修复的调用将被编译器捕获，必须手动更新。

### compress/flate、compress/gzip 和 compress/zlib 包 {#compress}

在 Go 1 中，[`compress/flate`](/pkg/compress/flate)、[`compress/gzip`](/pkg/compress/gzip) 和 [`compress/zlib`](/pkg/compress/zlib) 中的 `NewWriterXxx` 函数，如果接受压缩级别，则全部返回 `(*Writer, error)`，否则返回 `*Writer`。`gzip` 包的 `Compressor` 和 `Decompressor` 类型已重命名为 `Writer` 和 `Reader`。`flate` 包的 `WrongValueError` 类型已被移除。

_更新方法_：
运行 `go` `fix` 命令将更新旧名称以及将错误赋值给 \_ 的调用。
未被修复的调用将被编译器捕获，必须手动更新。

### crypto/aes 和 crypto/des 包 {#crypto_aes_des}

在 Go 1 中，`Reset` 方法已被移除。Go 不保证内存不会被复制，因此该方法具有误导性。

特定于密码的类型 `*aes.Cipher`、`*des.Cipher` 和 `*des.TripleDESCipher` 已被移除，转而使用 `cipher.Block`。

_更新方法_：
移除对 Reset 的调用。将特定密码类型的使用替换为 cipher.Block。### crypto/elliptic 包 {#crypto_elliptic}

在 Go 1 中，[`elliptic.Curve`](/pkg/crypto/elliptic/#Curve) 已被定义为一个接口，以允许替代实现。曲线参数已移至 [`elliptic.CurveParams`](/pkg/crypto/elliptic/#CurveParams) 结构体。

_更新方法_：
现有的 `*elliptic.Curve` 用户需要将其更改为简单的 `elliptic.Curve`。对 `Marshal`、`Unmarshal` 和 `GenerateKey` 的调用现在是 `crypto/elliptic` 中的函数，它们将 `elliptic.Curve` 作为第一个参数。

### crypto/hmac 包 {#crypto_hmac}

在 Go 1 中，特定于哈希的函数（如 `hmac.NewMD5`）已从 `crypto/hmac` 中移除。相反，`hmac.New` 接受一个返回 `hash.Hash` 的函数，例如 `md5.New`。

_更新方法_：
运行 `go` `fix` 将执行所需的更改。

### crypto/x509 包 {#crypto_x509}

在 Go 1 中，`crypto/x509` 中的 [`CreateCertificate`](/pkg/crypto/x509/#CreateCertificate) 函数和 [`CreateCRL`](/pkg/crypto/x509/#Certificate.CreateCRL) 方法已更改为接受 `interface{}`，而之前它们接受的是 `*rsa.PublicKey` 或 `*rsa.PrivateKey`。这将允许在未来实现其他公钥算法。

_更新方法_：
不需要进行任何更改。

### encoding/binary 包 {#encoding_binary}

在 Go 1 中，`binary.TotalSize` 函数已被 [`Size`](/pkg/encoding/binary/#Size) 替换，后者接受 `interface{}` 参数，而不是 `reflect.Value`。

_更新方法_：
受影响的少量代码将由编译器捕获，必须手动更新。

### encoding/xml 包 {#encoding_xml}

在 Go 1 中，[`xml`](/pkg/encoding/xml/) 包的设计已更接近其他编组包，如 [`encoding/gob`](/pkg/encoding/gob/)。

旧的 `Parser` 类型已重命名为 [`Decoder`](/pkg/encoding/xml/#Decoder)，并拥有新的 [`Decode`](/pkg/encoding/xml/#Decoder.Decode) 方法。同时还引入了 [`Encoder`](/pkg/encoding/xml/#Encoder) 类型。

函数 [`Marshal`](/pkg/encoding/xml/#Marshal) 和 [`Unmarshal`](/pkg/encoding/xml/#Unmarshal) 现在处理 `[]byte` 值。要处理流，请使用新的 [`Encoder`](/pkg/encoding/xml/#Encoder) 和 [`Decoder`](/pkg/encoding/xml/#Decoder) 类型。

在编组或解组值时，字段标签中支持的标志格式已更改，更接近 [`json`](/pkg/encoding/json) 包（`` `xml:"name,flag"` ``）。字段标签、字段名称与 XML 属性和元素名称之间的匹配现在是区分大小写的。如果存在 `XMLName` 字段标签，它还必须与正在编组的 XML 元素名称匹配。

_更新方法_：
运行 `go` `fix` 将更新该包的大部分用法，但对 `Unmarshal` 的一些调用除外。需要特别注意字段标签，因为修复工具不会更新它们，如果不手动修复，它们在某些情况下会静默地产生错误行为。例如，旧的 `"attr"` 现在写作 `",attr"`，而单纯的 `"attr"` 仍然有效，但含义不同。

### expvar 包 {#expvar}

在 Go 1 中，`RemoveAll` 函数已被移除。`Iter` 函数和 `*Map` 上的 Iter 方法已被替换为 [`Do`](/pkg/expvar/#Do) 和 [`(*Map).Do`](/pkg/expvar/#Map.Do)。

_更新方法_：
大多数使用 `expvar` 的代码不需要更改。使用了 `Iter` 的罕见代码可以更新为向 `Do` 传递一个闭包以实现相同的效果。

### flag 包 {#flag}

在 Go 1 中，接口 [`flag.Value`](/pkg/flag/#Value) 略有更改。`Set` 方法现在返回 `error` 而不是 `bool` 来表示成功或失败。

还有一种新标志 `Duration`，用于支持指定时间间隔的参数值。此类标志的值必须带有单位，格式与 `time.Duration` 相同：`10s`、`1h30m` 等。

{{code "/doc/progs/go1.go" `/timeout/`}}

_更新方法_：
实现自己标志的程序将需要对其 `Set` 方法进行微小的手动修复。`Duration` 标志是新增的，不影响现有代码。

### go/\* 包 {#go}

`go` 下的几个包的 API 有略微修订。

在包 [`go/scanner`](/pkg/go/scanner/)、[`go/parser`](/pkg/go/parser/)、[`go/printer`](/pkg/go/printer/) 和 [`go/doc`](/pkg/go/doc/) 中引入了具体的 `Mode` 类型用于配置模式标志。

`AllowIllegalChars` 和 `InsertSemis` 模式已从 [`go/scanner`](/pkg/go/scanner/) 包中移除。它们主要用于扫描非 Go 源文件的文本。相反，应使用 [`text/scanner`](/pkg/text/scanner/) 包来实现此目的。

提供给扫描器的 [`Init`](/pkg/go/scanner/#Scanner.Init) 方法的 [`ErrorHandler`](/pkg/go/scanner/#ErrorHandler) 现在只是一个函数，而不是一个接口。`ErrorVector` 类型已被移除，取而代之的是（现有的）[`ErrorList`](/pkg/go/scanner/#ErrorList) 类型，`ErrorVector` 的方法已迁移。现在，扫描器的客户端不应嵌入 `ErrorVector`，而应维护一个 `ErrorList`。

[`go/parser`](/pkg/go/parser/) 包提供的解析函数集已精简为主要的解析函数 [`ParseFile`](/pkg/go/parser/#ParseFile)，以及几个便捷函数 [`ParseDir`](/pkg/go/parser/#ParseDir) 和 [`ParseExpr`](/pkg/go/parser/#ParseExpr)。

[`go/printer`](/pkg/go/printer/) 包支持额外的配置模式 [`SourcePos`](/pkg/go/printer/#Mode)；如果设置，打印器将发出 `//line` 注释，使得生成的输出包含原始源代码位置信息。新类型 [`CommentedNode`](/pkg/go/printer/#CommentedNode) 可用于提供与任意 [`ast.Node`](/pkg/go/ast/#Node) 相关联的注释（直到现在只有 [`ast.File`](/pkg/go/ast/#File) 携带注释信息）。[`go/doc`](/pkg/go/doc/) 包的类型名称已通过去除 `Doc` 后缀进行了精简：`PackageDoc` 现在是 `Package`，`ValueDoc` 是 `Value`，等等。此外，所有类型现在都一致地拥有一个 `Name` 字段（或对于类型 `Value` 是 `Names`），并且 `Type.Factories` 已变为 `Type.Funcs`。
现在创建包文档不再调用 `doc.NewPackageDoc(pkg, importpath)`，而是使用：

    doc.New(pkg, importpath, mode)

其中新的 `mode` 参数指定操作模式：如果设置为 [`AllDecls`](/pkg/go/doc/#AllDecls)，则会考虑所有声明（而不仅仅是导出的声明）。函数 `NewFileDoc` 已被移除，函数 `CommentText` 已成为 [`ast.CommentGroup`](/pkg/go/ast/#CommentGroup) 的方法 [`Text`](/pkg/go/ast/#CommentGroup.Text)。

在 [`go/token`](/pkg/go/token/) 包中，[`token.FileSet`](/pkg/go/token/#FileSet) 方法 `Files`（原返回一个 `*token.File` 的 channel）已被接受函数参数的迭代器 [`Iterate`](/pkg/go/token/#FileSet.Iterate) 所替代。

在 [`go/build`](/pkg/go/build/) 包中，API 几乎完全被替换。该包仍然计算 Go 包信息，但它不再运行构建：`Cmd` 和 `Script` 类型已移除。（要构建代码，请改用新的 [`go`](/cmd/go/) 命令。）`DirInfo` 类型现在命名为 [`Package`](/pkg/go/build/#Package)。`FindTree` 和 `ScanDir` 被 [`Import`](/pkg/go/build/#Import) 和 [`ImportDir`](/pkg/go/build/#ImportDir) 所替代。

_更新_：
使用 `go` 中包的代码将需要手动更新；编译器会拒绝不正确的用法。与任何 `go/doc` 类型一起使用的模板可能需要手动修复；重命名的字段将导致运行时错误。

### hash 包 {#hash}

在 Go 1 中，[`hash.Hash`](/pkg/hash/#Hash) 的定义包含一个新方法 `BlockSize`。这个新方法主要用于密码学库。

[`hash.Hash`](/pkg/hash/#Hash) 接口的 `Sum` 方法现在接受一个 `[]byte` 参数，哈希值将被追加到此参数中。先前的行为可以通过向调用中添加一个 `nil` 参数来重现。

_更新_：
`hash.Hash` 的现有实现需要添加一个 `BlockSize` 方法。每次处理一个字节输入的哈希可以将 `BlockSize` 实现为返回 1。运行 `go` `fix` 将更新对 `hash.Hash` 各种实现的 `Sum` 方法的调用。

### http 包 {#http}

在 Go 1 中，[`http`](/pkg/net/http/) 包被重构，将一些实用程序放入了 [`httputil`](/pkg/net/http/httputil/) 子目录。这些部分很少被 HTTP 客户端需要。受影响的项目有：

  - ClientConn
  - DumpRequest
  - DumpRequestOut
  - DumpResponse
  - NewChunkedReader
  - NewChunkedWriter
  - NewClientConn
  - NewProxyClientConn
  - NewServerConn
  - NewSingleHostReverseProxy
  - ReverseProxy
  - ServerConn

`Request.RawURL` 字段已被移除；它是一个历史遗留产物。

`Handle` 和 `HandleFunc` 函数，以及 `ServeMux` 的同名方法，现在如果尝试注册相同的模式两次，会引发恐慌（panic）。

_更新_：
运行 `go` `fix` 将更新受影响的少数程序，但 `RawURL` 的使用除外，必须手动修复。

### image 包 {#image}

[`image`](/pkg/image/) 包经历了一些小的变更、重组和重命名。

大部分颜色处理代码已移入其自己的包 [`image/color`](/pkg/image/color/)。对于移动的元素，产生了一种对称性；例如，每个 [`image.RGBA`](/pkg/image/#RGBA) 的像素都是一个 [`color.RGBA`](/pkg/image/color/#RGBA)。

旧的 `image/ycbcr` 包经过一些重命名后，已被并入 [`image`](/pkg/image/) 和 [`image/color`](/pkg/image/color/) 包。

旧的 `image.ColorImage` 类型仍在 `image` 包中，但已重命名为 [`image.Uniform`](/pkg/image/#Uniform)，而 `image.Tiled` 已被移除。

下表列出了重命名项。<table class="codetable" frame="border" summary="image 包重命名项">
<colgroup align="left" width="50%"></colgroup>
<colgroup align="left" width="50%"></colgroup>
<tbody><tr>
<th align="left">旧名称</th>
<th align="left">新名称</th>
</tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>image.Color</td> <td>color.Color</td></tr>
<tr><td>image.ColorModel</td> <td>color.Model</td></tr>
<tr><td>image.ColorModelFunc</td> <td>color.ModelFunc</td></tr>
<tr><td>image.PalettedColorModel</td> <td>color.Palette</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>image.RGBAColor</td> <td>color.RGBA</td></tr>
<tr><td>image.RGBA64Color</td> <td>color.RGBA64</td></tr>
<tr><td>image.NRGBAColor</td> <td>color.NRGBA</td></tr>
<tr><td>image.NRGBA64Color</td> <td>color.NRGBA64</td></tr>
<tr><td>image.AlphaColor</td> <td>color.Alpha</td></tr>
<tr><td>image.Alpha16Color</td> <td>color.Alpha16</td></tr>
<tr><td>image.GrayColor</td> <td>color.Gray</td></tr>
<tr><td>image.Gray16Color</td> <td>color.Gray16</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>image.RGBAColorModel</td> <td>color.RGBAModel</td></tr>
<tr><td>image.RGBA64ColorModel</td> <td>color.RGBA64Model</td></tr>
<tr><td>image.NRGBAColorModel</td> <td>color.NRGBAModel</td></tr>
<tr><td>image.NRGBA64ColorModel</td> <td>color.NRGBA64Model</td></tr>
<tr><td>image.AlphaColorModel</td> <td>color.AlphaModel</td></tr>
<tr><td>image.Alpha16ColorModel</td> <td>color.Alpha16Model</td></tr>
<tr><td>image.GrayColorModel</td> <td>color.GrayModel</td></tr>
<tr><td>image.Gray16ColorModel</td> <td>color.Gray16Model</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>ycbcr.RGBToYCbCr</td> <td>color.RGBToYCbCr</td></tr>
<tr><td>ycbcr.YCbCrToRGB</td> <td>color.YCbCrToRGB</td></tr>
<tr><td>ycbcr.YCbCrColorModel</td> <td>color.YCbCrModel</td></tr>
<tr><td>ycbcr.YCbCrColor</td> <td>color.YCbCr</td></tr>
<tr><td>ycbcr.YCbCr</td> <td>image.YCbCr</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>ycbcr.SubsampleRatio444</td> <td>image.YCbCrSubsampleRatio444</td></tr>
<tr><td>ycbcr.SubsampleRatio422</td> <td>image.YCbCrSubsampleRatio422</td></tr>
<tr><td>ycbcr.SubsampleRatio420</td> <td>image.YCbCrSubsampleRatio420</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>image.ColorImage</td> <td>image.Uniform</td></tr>
</tbody></table>

`image` 包的 `New` 函数（例如 [`NewRGBA`](/pkg/image/#NewRGBA)、[`NewRGBA64`](/pkg/image/#NewRGBA64) 等）现在接受一个 [`image.Rectangle`](/pkg/image/#Rectangle) 作为参数，而不是四个整数。

最后，新增了预定义的 `color.Color` 变量：[`color.Black`](/pkg/image/color/#Black)、[`color.White`](/pkg/image/color/#White)、[`color.Opaque`](/pkg/image/color/#Opaque) 和 [`color.Transparent`](/pkg/image/color/#Transparent)。

_更新方法_：
运行 `go fix` 将更新几乎所有受此变更影响的代码。

### log/syslog 包 {#log_syslog}

在 Go 1 中，[`syslog.NewLogger`](/pkg/log/syslog/#NewLogger) 函数现在会同时返回一个错误和一个 `log.Logger`。

_更新方法_：
受影响的代码很少，编译器会捕获到，必须手动更新。

### mime 包 {#mime}

在 Go 1 中，`mime` 包的 [`FormatMediaType`](/pkg/mime/#FormatMediaType) 函数已被简化，以使其与 [`ParseMediaType`](/pkg/mime/#ParseMediaType) 保持一致。它现在接受 `"text/html"` 而不是 `"text"` 和 `"html"` 两个参数。

_更新方法_：
受影响的代码很少，编译器会捕获到，必须手动更新。

### net 包 {#net}

在 Go 1 中，各种 `SetTimeout`、`SetReadTimeout` 和 `SetWriteTimeout` 方法已分别被 [`SetDeadline`](/pkg/net/#IPConn.SetDeadline)、[`SetReadDeadline`](/pkg/net/#IPConn.SetReadDeadline) 和 [`SetWriteDeadline`](/pkg/net/#IPConn.SetWriteDeadline) 替换。新方法不是接受一个以纳秒为单位的超时值（该值适用于连接上的任何活动），而是设置一个绝对截止时间（`time.Time` 值），在此之后读写操作将超时且不再阻塞。

还新增了函数 [`net.DialTimeout`](/pkg/net/#DialTimeout) 以简化网络地址拨号的超时设置，以及 [`net.ListenMulticastUDP`](/pkg/net/#ListenMulticastUDP) 以允许 UDP 多播在多个监听器上并发监听。`net.ListenMulticastUDP` 函数取代了旧的 `JoinGroup` 和 `LeaveGroup` 方法。

_更新方法_：
使用旧方法的代码将无法编译，必须手动更新。语义上的变化使得修复工具难以自动更新。

### os 包 {#os}

`Time` 函数已被移除；调用者应使用 `time` 包中的 [`Time`](/pkg/time/#Time) 类型。

`Exec` 函数已被移除；调用者应使用 `syscall` 包中的 `Exec`（如果可用）。

`ShellExpand` 函数已重命名为 [`ExpandEnv`](/pkg/os/#ExpandEnv)。

[`NewFile`](/pkg/os/#NewFile) 函数现在接受一个 `uintptr` 类型的文件描述符 fd，而不是 `int`。文件上的 [`Fd`](/pkg/os/#File.Fd) 方法现在也返回一个 `uintptr`。

`os` 包中不再包含像 `EINVAL` 这样的错误常量，因为其值集随底层操作系统而异。新增了一些可移植的函数，如 [`IsPermission`](/pkg/os/#IsPermission) 用于测试常见的错误属性，以及一些名称更符合 Go 风格的新错误值，例如 [`ErrPermission`](/pkg/os/#ErrPermission) 和 [`ErrNotExist`](/pkg/os/#ErrNotExist)。

`Getenverror` 函数已被移除。要区分不存在的环境变量和空字符串，请使用 [`os.Environ`](/pkg/os/#Environ) 或 [`syscall.Getenv`](/pkg/syscall/#Getenv)。

[`Process.Wait`](/pkg/os/#Process.Wait) 方法已移除其选项参数，相关的常量也从包中消失了。此外，`Wait` 函数也不复存在；只有 `Process` 类型的方法得以保留。由 [`Process.Wait`](/pkg/os/#Process.Wait) 返回的 `Waitmsg` 类型已被替换为更具可移植性的 [`ProcessState`](/pkg/os/#ProcessState) 类型，该类型带有访问器方法以获取进程相关信息。
由于 `Wait` 方法的变更，`ProcessState` 值现在始终描述已退出的进程。
出于可移植性考虑，其他方面的接口也得到了简化，但 [`ProcessState.Sys`](/pkg/os/#ProcessState.Sys) 和 [`ProcessState.SysUsage`](/pkg/os/#ProcessState.SysUsage) 方法返回的值可以通过类型断言转换为底层系统特定的数据结构，例如在 Unix 系统上可断言为 [`syscall.WaitStatus`](/pkg/syscall/#WaitStatus) 和 [`syscall.Rusage`](/pkg/syscall/#Rusage)。

_更新说明_：
运行 `go fix` 会自动移除传递给 `Process.Wait` 的零值参数。
其他所有变更将由编译器捕获，必须手动更新。

#### os.FileInfo 类型 {#os_fileinfo}

Go 1 重新定义了 [`os.FileInfo`](/pkg/os/#FileInfo) 类型，将其从结构体改为接口：

    type FileInfo interface {
        Name() string       // 文件的基本名称
        Size() int64        // 以字节为单位的长度
        Mode() FileMode     // 文件模式位
        ModTime() time.Time // 修改时间
        IsDir() bool        // Mode().IsDir() 的简写
        Sys() interface{}   // 底层数据源（可能返回 nil）
    }

文件模式信息被移入名为 [`os.FileMode`](/pkg/os/#FileMode) 的子类型中，这是一个简单的整数类型，具有 `IsDir`、`Perm` 和 `String` 方法。
文件模式及属性（例如在 Unix 系统上的 inode 号）的系统特定细节已从 `FileInfo` 中完全移除。
取而代之的是，每个操作系统的 `os` 包都提供了 `FileInfo` 接口的实现，该实现具有一个 `Sys` 方法，用于返回文件元数据的系统特定表示形式。
例如，要在 Unix 系统上获取文件的 inode 号，可以像这样解包 `FileInfo`：

    fi, err := os.Stat("hello.go")
    if err != nil {
        log.Fatal(err)
    }
    // 检查是否为 Unix 文件。
    unixStat, ok := fi.Sys().(*syscall.Stat_t)
    if !ok {
        log.Fatal("hello.go: not a Unix file")
    }
    fmt.Printf("file i-number: %d\n", unixStat.Ino)

假设（这并不明智）`"hello.go"` 是一个 Unix 文件，inode 号的表达式可以简化为：

    fi.Sys().(*syscall.Stat_t).Ino

绝大多数使用 `FileInfo` 的地方只需要标准接口的方法即可。
`os` 包不再包含对 POSIX 错误（如 `ENOENT`）的包装函数。
对于少数需要验证特定错误条件的程序，现在可以使用布尔函数 [`IsExist`](/pkg/os/#IsExist)、[`IsNotExist`](/pkg/os/#IsNotExist) 和 [`IsPermission`](/pkg/os/#IsPermission)。

{{code "/doc/progs/go1.go" `/os\.Open/` `/}/`}}

_更新说明_：
运行 `go fix` 会自动更新使用旧版 `os.FileInfo` 和 `os.FileMode` API 等效项的代码。
需要系统特定文件详细信息的代码需要手动更新。
使用旧版 `os` 包中 POSIX 错误值的代码将无法编译，也需要手动更新。

### os/signal 包 {#os_signal}

Go 1 中的 `os/signal` 包用选择性的 `Notify` 函数替换了返回接收所有传入信号的通道的 `Incoming` 函数，`Notify` 函数要求在指定的已有通道上传递特定信号。

_更新说明_：
代码必须手动更新。
以下代码：

    c := signal.Incoming()

的直接翻译是：

    c := make(chan os.Signal, 1)
    signal.Notify(c) // 请求所有信号

但大多数代码应该列出它想要处理的具体信号：

    c := make(chan os.Signal, 1)
    signal.Notify(c, syscall.SIGHUP, syscall.SIGQUIT)

### path/filepath 包 {#path_filepath}

在 Go 1 中，`path/filepath` 包的 [`Walk`](/pkg/path/filepath/#Walk) 函数已被修改，它现在接受一个类型为 [`WalkFunc`](/pkg/path/filepath/#WalkFunc) 的函数值，而不是 `Visitor` 接口值。`WalkFunc` 统一了对文件和目录的处理。

    type WalkFunc func(path string, info os.FileInfo, err error) error

即使对于无法打开的文件或目录，`WalkFunc` 函数也会被调用；在这种情况下，错误参数将描述失败原因。
如果要跳过某个目录的内容，该函数应返回值 [`filepath.SkipDir`](/pkg/path/filepath/#pkg-variables)。

{{code "/doc/progs/go1.go" `/STARTWALK/` `/ENDWALK/`}}

_更新说明_：
此变更简化了大多数代码，但可能产生细微影响，因此受影响的程序需要手动更新。
编译器将捕获使用旧接口的代码。

### regexp 包 {#regexp}

[`regexp`](/pkg/regexp/) 包已被重写。
它的接口保持不变，但其支持的正则表达式规范已从旧的 "egrep" 形式更改为 [RE2](https://code.google.com/p/re2/) 规范。

_更新说明_：
使用该包的代码应手动检查其正则表达式。

### runtime 包 {#runtime}

在 Go 1 中，`runtime` 包导出的大部分 API 已被移除，转而由其他包提供功能。
使用 `runtime.Type` 接口或其具体类型实现的代码现在应使用 [`reflect`](/pkg/reflect/) 包。
使用 `runtime.Semacquire` 或 `runtime.Semrelease` 的代码应使用通道或 [`sync`](/pkg/sync/) 包中的抽象。
`runtime.Alloc`、`runtime.Free` 和 `runtime.Lookup` 函数是为调试内存分配器而创建的非安全 API，没有替代方案。

之前，`runtime.MemStats` 是一个持有内存分配统计信息的全局变量，调用 `runtime.UpdateMemStats` 可确保其内容最新。
在 Go 1 中，`runtime.MemStats` 是一个结构体类型，代码应使用 [`runtime.ReadMemStats`](/pkg/runtime/#ReadMemStats) 来获取当前的统计信息。该包新增了一个函数[`runtime.NumCPU`](/pkg/runtime/#NumCPU)，用于返回操作系统内核报告的可用并行执行CPU数量，其值可为设置`GOMAXPROCS`提供参考。`runtime.Cgocalls`和`runtime.Goroutines`函数已分别重命名为`runtime.NumCgoCall`和`runtime.NumGoroutine。

_更新方法_：  
运行 `go` `fix` 可自动更新函数重命名相关的代码，其他代码需手动调整。

### strconv 包 {#strconv}

在 Go 1 中，[`strconv`](/pkg/strconv/) 包进行了重大重构，使其更符合Go语言风格而非C语言风格（但`Atoi`函数保留，其功能类似于 `int(ParseInt(x, 10, 0))`，`Itoa(x)` 函数也类似 `FormatInt(int64(x), 10)`）。部分函数新增了向字节切片追加数据而非返回字符串的变体，以提供更精细的内存分配控制。

下表总结了重命名情况，完整详情请查阅[包文档](/pkg/strconv/)。

<table class="codetable" frame="border" summary="strconv 函数重命名表">
<colgroup align="left" width="50%"></colgroup>
<colgroup align="left" width="50%"></colgroup>
<tbody><tr>
<th align="left">原调用</th>
<th align="left">新调用</th>
</tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Atob(x)</td> <td>ParseBool(x)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Atof32(x)</td> <td>ParseFloat(x, 32)§</td></tr>
<tr><td>Atof64(x)</td> <td>ParseFloat(x, 64)</td></tr>
<tr><td>AtofN(x, n)</td> <td>ParseFloat(x, n)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Atoi(x)</td> <td>Atoi(x)</td></tr>
<tr><td>Atoi(x)</td> <td>ParseInt(x, 10, 0)§</td></tr>
<tr><td>Atoi64(x)</td> <td>ParseInt(x, 10, 64)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Atoui(x)</td> <td>ParseUint(x, 10, 0)§</td></tr>
<tr><td>Atoui64(x)</td> <td>ParseUint(x, 10, 64)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Btoi64(x, b)</td> <td>ParseInt(x, b, 64)</td></tr>
<tr><td>Btoui64(x, b)</td> <td>ParseUint(x, b, 64)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Btoa(x)</td> <td>FormatBool(x)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Ftoa32(x, f, p)</td> <td>FormatFloat(float64(x), f, p, 32)</td></tr>
<tr><td>Ftoa64(x, f, p)</td> <td>FormatFloat(x, f, p, 64)</td></tr>
<tr><td>FtoaN(x, f, p, n)</td> <td>FormatFloat(x, f, p, n)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Itoa(x)</td> <td>Itoa(x)</td></tr>
<tr><td>Itoa(x)</td> <td>FormatInt(int64(x), 10)</td></tr>
<tr><td>Itoa64(x)</td> <td>FormatInt(x, 10)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Itob(x, b)</td> <td>FormatInt(int64(x), b)</td></tr>
<tr><td>Itob64(x, b)</td> <td>FormatInt(x, b)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Uitoa(x)</td> <td>FormatUint(uint64(x), 10)</td></tr>
<tr><td>Uitoa64(x)</td> <td>FormatUint(x, 10)</td></tr>
<tr>
<td colspan="2"><hr></hr></td>
</tr>
<tr><td>Uitob(x, b)</td> <td>FormatUint(uint64(x), b)</td></tr>
<tr><td>Uitob64(x, b)</td> <td>FormatUint(x, b)</td></tr>
</tbody></table>

_更新方法_：  
运行 `go` `fix` 可自动更新大部分受影响的代码。  
注意：`Atoi` 函数保留，但 `Atoui` 和 `Atof32` 已移除，因此可能需要手动添加类型转换；`go` `fix` 工具会对此发出警告。

### 模板包 {#templates}

`template` 和 `exp/template/html` 包已迁移至 [`text/template`](/pkg/text/template/) 和 [`html/template`](/pkg/html/template/)。更重要的是，这些包的接口已简化。模板语言保持不变，但“模板集”概念已被移除，相关函数和方法也相应调整（多数为简化）。

`Template` 对象现可包含多个命名的模板定义，从而为模板调用构建命名空间。模板可调用任何与之关联的其他模板（仅限关联模板）。最简单的关联方式是将模板共同解析，新包结构使这一操作更加便捷。

_更新方法_：  
导入语句将由修复工具自动更新。单模板用法基本不受影响，但协调使用多模板的代码需手动调整。`text/template` 文档中的[示例](/pkg/text/template/#pkg-examples)可提供参考。

### 测试包 {#testing}

测试包中存在一个类型 `B`，作为基准测试函数的参数传递。在 Go 1 中，`B` 新增了与 `T` 类似的方法，支持日志记录和失败报告。

{{code "/doc/progs/go1.go" `/func.*Benchmark/` `/^}/`}}

_更新方法_：  
现有代码不受影响，但使用 `println` 或 `panic` 的基准测试应改用新方法。

### testing/script 包 {#testing_script}

testing/script 包已被删除，该包已弃用。

_更新方法_：  
基本不会影响现有代码。

### unsafe 包 {#unsafe}

在 Go 1 中，`unsafe.Typeof`、`unsafe.Reflect`、`unsafe.Unreflect`、`unsafe.New` 和 `unsafe.NewArray` 函数已被移除，因其功能与更安全的 [`reflect`](/pkg/reflect/) 包重复。

_更新方法_：  
使用这些函数的代码必须重写为使用 [`reflect`](/pkg/reflect/) 包。[encoding/gob](/change/2646dc956207) 和[协议缓冲区库](https://code.google.com/p/goprotobuf/source/detail?r=5340ad310031)的改动可作为参考示例。

### url 包 {#url}

在 Go 1 中，[`url.URL`](/pkg/net/url/#URL) 类型的多个字段被移除或替换。

[`String`](/pkg/net/url/#URL.String) 方法现在会明确使用 `URL` 的所有必要字段重新构建编码后的URL字符串，且结果字符串将不再转义密码字段。

`Raw` 字段已被移除，大多数情况下可直接使用 `String` 方法替代。旧的 `RawUserinfo` 字段已被替换为 `User` 字段，其类型为 [`*net.Userinfo`](/pkg/net/url/#Userinfo)。该类型的值可以使用新的 [`net.User`](/pkg/net/url/#User) 和 [`net.UserPassword`](/pkg/net/url/#UserPassword) 函数来创建。`EscapeUserinfo` 和 `UnescapeUserinfo` 函数也已移除。

`RawAuthority` 字段已被移除。相同的信息现在可通过 `Host` 和 `User` 字段获取。

`RawPath` 字段和 `EncodedPath` 方法已被移除。在根URL（模式后跟斜杠）中，路径信息现在仅以解码形式存在于 `Path` 字段中。有时，可能需要编码后的数据来获取在解码过程中丢失的信息。这些情况必须通过访问构建URL的原始数据来处理。

对于非根路径的URL，例如 `"mailto:dev@golang.org?subject=Hi"`，处理方式也有所不同。`OpaquePath` 布尔字段已被移除，并引入了新的 `Opaque` 字符串字段来保存此类URL的编码路径。在 Go 1 中，引用的URL解析为：

	    URL{
	        Scheme: "mailto",
	        Opaque: "dev@golang.org",
	        RawQuery: "subject=Hi",
	    }

为 `URL` 添加了一个新的 [`RequestURI`](/pkg/net/url/#URL.RequestURI) 方法。

`ParseWithReference` 函数已重命名为 `ParseWithFragment`。

_更新_：
使用旧字段的代码将无法编译，必须手动更新。语义上的变化使得修复工具难以自动更新。

## go 命令 {#cmd_go}

Go 1 引入了 [go 命令](/cmd/go/)，这是一个用于获取、构建和安装 Go 包及命令的工具。`go` 命令摒弃了 makefile，转而使用 Go 源代码来查找依赖项并确定构建条件。大多数现有的 Go 程序将不再需要 makefile 来构建。

有关 `go` 命令的入门指南，请参阅 [如何编写 Go 代码](/doc/code.html)，完整详情请参阅 [go 命令文档](/cmd/go/)。

_更新_：
依赖于 Go 项目旧的基于 makefile 的构建基础设施（`Make.pkg`、`Make.cmd` 等）的项目应转而使用 `go` 命令来构建 Go 代码，并在必要时重写其 makefile 以执行任何辅助构建任务。

## cgo 命令 {#cmd_cgo}

在 Go 1 中，[cgo 命令](/cmd/cgo) 使用了不同的 `_cgo_export.h` 文件，该文件是为包含 `//export` 行的包生成的。现在，`_cgo_export.h` 文件以 C 语言序言注释开头，以便导出的函数定义可以使用其中定义的类型。这会产生多次编译序言的效果，因此使用 `//export` 的包不得在 C 序言中放置函数定义或变量初始化。

## 打包发布 {#releases}

与 Go 1 相关的最重要变化之一是提供了预打包的、可下载的发行版。它们可用于多种架构和操作系统组合（包括 Windows），并且列表将继续增长。安装详情在 [入门指南](/doc/install) 页面描述，而发行版本身则在 [下载页面](/dl/) 列出。