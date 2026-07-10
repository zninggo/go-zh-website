---
title: "Go 文档注释"
layout: article
date: 2022-06-01T00:00:00Z
template: true
---

目录：

[包](#package)\
[命令](#cmd)\
[类型](#type)\
[函数](#func)\
[常量](#const)\
[变量](#var)\
[语法](#syntax)\
[常见错误与陷阱](#mistakes)

“文档注释” 是指紧接在顶层包（package）、常量（const）、函数（func）、类型（type）和变量（var）声明之前、中间没有空行的注释。每个导出（大写）的名称都应该有一个文档注释。

[go/doc](/pkg/go/doc) 和 [go/doc/comment](/pkg/go/doc/comment) 包提供了从 Go 源代码中提取文档的功能，许多工具都利用了这一功能。[`go` `doc`](/cmd/go#hdr-Show_documentation_for_package_or_symbol) 命令会查找并打印给定包或符号的文档注释。（符号是指顶层常量、函数、类型或变量。）Web 服务器 [pkg.go.dev](https://pkg.go.dev/) 展示了公共 Go 包的文档（前提是其许可证允许此类使用）。服务于该网站的程序是 [golang.org/x/pkgsite/cmd/pkgsite](https://pkg.go.dev/golang.org/x/pkgsite/cmd/pkgsite)，它也可以在本地运行，用于查看私有模块的文档或在没有网络连接时使用。语言服务器 [gopls](https://pkg.go.dev/golang.org/x/tools/gopls) 在 IDE 中编辑 Go 源文件时提供文档支持。

本页的其余部分将介绍如何编写 Go 文档注释。

## 包 {#package}

每个包都应该有一个包注释来介绍该包。它提供与整个包相关的信息，并通常为该包设定期望。特别是在大型包中，包注释可以简要概述 API 最重要的部分，并根据需要链接到其他文档注释，这会很有帮助。

如果包很简单，包注释可以很简短。例如：

	// Package path implements utility routines for manipulating slash-separated
	// paths.
	//
	// The path package should only be used for paths separated by forward
	// slashes, such as the paths in URLs. This package does not deal with
	// Windows paths with drive letters or backslashes; to manipulate
	// operating system paths, use the [path/filepath] package.
	package path

方括号 `[path/filepath]` 创建了一个[文档链接](#links)。

正如这个例子所示，Go 文档注释使用完整的句子。对于包注释，这意味着[第一句话](/pkg/go/doc/#Package.Synopsis)以 “Package <name>” 开头。

对于多文件包，包注释应该只出现在一个源文件中。如果多个文件都有包注释，它们会被连接起来形成一个针对整个包的大注释。

## 命令 {#cmd}

命令的包注释类似，但它描述的是程序的行为，而不是包中的 Go 符号。第一句话通常以程序本身的名称开头，并且因为它位于句子开头而大写。例如，这是 [gofmt](/cmd/gofmt) 包注释的节选版本：

	/*
	Gofmt formats Go programs.
	It uses tabs for indentation and blanks for alignment.
	Alignment assumes that an editor is using a fixed-width font.

	Without an explicit path, it processes the standard input. Given a file,
	it operates on that file; given a directory, it operates on all .go files in
	that directory, recursively. (Files starting with a period are ignored.)
	By default, gofmt prints the reformatted sources to standard output.

	Usage:

		gofmt [flags] [path ...]

	The flags are:

		-d
			Do not print reformatted sources to standard output.
			If a file's formatting is different than gofmt's, print diffs
			to standard output.
		-w
			Do not print reformatted sources to standard output.
			If a file's formatting is different from gofmt's, overwrite it
			with gofmt's version. If an error occurred during overwriting,
			the original file is restored from an automatic backup.

	When gofmt reads from standard input, it accepts either a full Go program
	or a program fragment. A program fragment must be a syntactically
	valid declaration list, statement list, or expression. When formatting
	such a fragment, gofmt preserves leading indentation as well as leading
	and trailing spaces, so that individual sections of a Go program can be
	formatted by piping them through gofmt.
	*/
	package main

注释的开头使用[语义换行](https://rhodesmill.org/brandon/2012/one-sentence-per-line/)编写，即每个新的句子或长短语单独占一行，这可以使代码和注释演进时，差异更容易阅读。后面的段落碰巧没有遵循这个惯例，是手动换行的。无论哪种方式，只要最适合你的代码库就好。无论哪种方式，`go` `doc` 和 `pkgsite` 在打印时都会重新包装文档注释文本。例如：

	$ go doc gofmt
	Gofmt formats Go programs. It uses tabs for indentation and blanks for
	alignment. Alignment assumes that an editor is using a fixed-width font.

	Without an explicit path, it processes the standard input. Given a file, it
	operates on that file; given a directory, it operates on all .go files in that
	directory, recursively. (Files starting with a period are ignored.) By default,
	gofmt prints the reformatted sources to standard output.

	Usage:

		gofmt [flags] [path ...]

	The flags are:

		-d
			Do not print reformatted sources to standard output.
			If a file's formatting is different than gofmt's, print diffs
			to standard output.
	...

缩进的行被视为预格式化文本：它们不会被重新包装，并且在 HTML 和 Markdown 展示中会以代码字体打印。（下面的[语法](#syntax)部分给出了详细信息。）

## 类型 {#type}

一个类型的文档注释应该解释该类型的每个实例代表或提供了什么。如果 API 很简单，文档注释可以非常简短。例如：

	package zip```go
// Reader 从 ZIP 归档文件中提供内容。
type Reader struct {
	...
}
```

默认情况下，程序员应认为一个类型在同一时间仅能被单个 goroutine（协程）安全使用。  
若类型能提供更强的安全性保证，应在文档注释中明确说明。例如：

```go
package regexp

// Regexp 是已编译正则表达式的表示形式。
// Regexp 可被多个 goroutine（协程）并发安全使用，
// 但配置方法除外（如 Longest）。
type Regexp struct {
	...
}
```

Go 类型还应尽量使零值具有实际用途。  
若其用途不明显，则应在文档中予以说明。例如：

```go
package bytes

// Buffer 是具有可变大小的字节缓冲区，提供 Read 和 Write 方法。
// Buffer 的零值即为可立即使用的空缓冲区。
type Buffer struct {
	...
}
```

对于包含导出字段的结构体（struct），文档注释或各字段的行内注释  
应解释每个导出字段的含义。  
例如，以下类型的文档注释解释了各字段：

```go
package io

// LimitedReader 从 R 读取数据，但将返回的数据量限制为 N 字节。
// 每次调用 Read 方法都会更新 N 以反映剩余数据量。
// 当 N ≤ 0 时，Read 返回 EOF。
type LimitedReader struct {
	R   Reader // 底层读取器
	N   int64  // 剩余最大字节数
}
```

相反，以下类型的文档注释将字段说明留给行内注释处理：

```go
package comment

// Printer 是文档注释打印器。
// 调用任意打印方法前，可填充结构体中的字段
// 以自定义打印过程的细节。
type Printer struct {
	// HeadingLevel 是用于 HTML 和 Markdown 标题的嵌套层级。
	// 若 HeadingLevel 为零，则默认为第 3 级，
	// 即使用 <h3> 和 ### 标记。
	HeadingLevel int
	...
}
```

与包（见上文）和函数（见下文）相同，类型的文档注释  
应以完整句子开头，明确命名所声明的符号。  
使用明确的主语通常能使表述更清晰，  
并便于在网页或命令行中搜索该内容。  
例如：

```bash
$ go doc -all regexp | grep pairs
pairs within the input string: result[2*n:2*n+2] identifies the indexes
    FindReaderSubmatchIndex returns a slice holding the index pairs identifying
    FindStringSubmatchIndex returns a slice holding the index pairs identifying
    FindSubmatchIndex returns a slice holding the index pairs identifying the
$
```

## 函数 {#func}

函数的文档注释应说明函数的返回值，  
或对于为产生副作用而调用的函数，应说明其功能。  
命名参数和返回结果可直接在注释中引用，  
无需使用反引号等特殊语法。  
（此约定的推论是：类似 `a` 这类可能被误认为普通单词的名称通常应避免使用。）  
例如：

```go
package strconv

// Quote 返回一个表示 s 的双引号 Go 字符串字面量。
// 返回的字符串使用 Go 转义序列（\t、\n、\xFF、\u0100）
// 表示控制字符和 IsPrint 定义的不可打印字符。
func Quote(s string) string {
	...
}
```

又如：

```go
package os

// Exit 使当前程序以给定状态码退出。
// 按照惯例，状态码 0 表示成功，非零值表示错误。
// 程序将立即终止；延迟执行的函数不会运行。
//
// 为保持可移植性，状态码应在 [0, 125] 范围内。
func Exit(code int) {
	...
}
```

文档注释通常使用短语 "reports whether"  
来描述返回布尔值的函数。  
无需添加 "or not"。  
例如：

```go
package strings

// HasPrefix 报告字符串 s 是否以 prefix 开头。
func HasPrefix(s, prefix string) bool
```

若文档注释需要说明多个返回结果，  
为返回结果命名可使注释更易理解，  
即使这些名称未在函数体中使用。  
例如：

```go
package io

// Copy 从 src 复制数据到 dst，直到 src 达到 EOF
// 或发生错误。它返回写入的字节总数
// 以及复制过程中遇到的第一个错误（如有）。
//
// 成功的 Copy 返回 err == nil，而非 err == EOF。
// 因为 Copy 被定义为从 src 读取直到 EOF，
// 它不会将 Read 返回的 EOF 视为需要报告的错误。
func Copy(dst Writer, src Reader) (n int64, err error) {
	...
}
```

相反，当文档注释无需说明返回结果时，  
代码中通常也会省略命名，如上面的 `Quote` 示例，  
以避免内容冗杂。

以上规则同样适用于普通函数和方法。  
对于方法，使用相同的接收者名称可避免在列出类型所有方法时出现不必要的差异：

```bash
$ go doc bytes.Buffer
package bytes // import "bytes"

type Buffer struct {
	// 包含未导出字段。
}
    Buffer 是具有可变大小的字节缓冲区，提供 Read 和 Write 方法。
    Buffer 的零值即为可立即使用的空缓冲区。

func NewBuffer(buf []byte) *Buffer
func NewBufferString(s string) *Buffer
func (b *Buffer) Bytes() []byte
func (b *Buffer) Cap() int
func (b *Buffer) Grow(n int)
func (b *Buffer) Len() int
func (b *Buffer) Next(n int) []byte
func (b *Buffer) Read(p []byte) (n int, err error)
func (b *Buffer) ReadByte() (byte, error)
...
```

此示例还表明，返回类型 `T` 或指针 `*T`（可能带有额外的错误返回值）的顶层函数  
会与类型 `T` 及其方法并列显示，  
因为这些函数通常被视为 `T` 的构造函数。

默认情况下，程序员可假定顶层函数  
可被多个 goroutine（协程）安全调用；  
此事实无需显式声明。另一方面，正如前一节所提到的，
以任何方式使用一个类型的实例，
包括调用其方法，通常被假定为
一次仅限于单个 goroutine（协程）。
如果某个类型对于并发使用是安全的
但其文档注释中未明确说明，
则应在各个方法的注释中进行文档记录。
例如：

	package sql

	// Close 将连接归还给连接池。
	// Close 之后的所有操作都将返回 ErrConnDone。
	// Close 可以安全地与其他操作并发调用，并且会
	// 阻塞直到所有其他操作完成。首先取消任何正在使用的
	// 上下文然后直接调用 Close 可能会很有用。
	func (c *Conn) Close() error {
		...
	}

请注意，函数和方法的文档注释侧重于
操作返回或执行的内容，
详细说明调用者需要了解的信息。
特殊情况的记录尤为重要。
例如：

{{raw `
	package math

	// Sqrt 返回 x 的平方根。
	//
	// 特殊情况：
	//
	//	Sqrt(+Inf) = +Inf
	//	Sqrt(±0) = ±0
	//	Sqrt(x < 0) = NaN
	//	Sqrt(NaN) = NaN
	func Sqrt(x float64) float64 {
		...
	}
`}}

文档注释不应解释内部细节，
例如当前实现所使用的算法。
这些最好留到函数体内部的注释中。
当渐近的时间或空间界限对调用者特别重要时，
提及这些细节可能是合适的。
例如：

	package sort

	// Sort 根据 Less 方法确定的顺序对数据进行升序排序。
	// 它会调用 data.Len 一次以确定 n，并调用
	// data.Less 和 data.Swap O(n*log(n)) 次。排序不保证稳定。
	func Sort(data Interface) {
		...
	}

由于此文档注释未提及使用了哪种排序算法，
未来更改实现以使用不同的算法会更加容易。

## 常量 {#const}

Go 的声明语法允许对声明进行分组，
在这种情况下，单个文档注释可以介绍一组相关的常量，
而各个常量仅通过简短的行内注释进行文档记录。
例如：

	package scanner // import "text/scanner"

	// Scan 的结果是以下这些标记之一或一个 Unicode 字符。
	const (
		EOF = -(iota + 1)
		Ident
		Int
		Float
		Char
		...
	)

有时，分组甚至不需要文档注释。例如：

	package unicode // import "unicode"

	const (
		MaxRune         = '\U0010FFFF' // 最大有效 Unicode 码位。
		ReplacementChar = '\uFFFD'     // 代表无效码位。
		MaxASCII        = '\u007F'     // 最大 ASCII 值。
		MaxLatin1       = '\u00FF'     // 最大 Latin-1 值。
	)

另一方面，未分组的常量通常需要完整的
文档注释，以完整句子开头。例如：

	package unicode

	// Version 是派生这些表的 Unicode 版本。
	const Version = "13.0.0"

有类型的常量会显示在其类型的声明旁边，
因此通常会省略 const 分组的文档注释，
而优先使用类型的文档注释。
例如：

	package syntax

	// Op 是一个单一的正则表达式运算符。
	type Op uint8

	const (
		OpNoMatch        Op = 1 + iota // 不匹配任何字符串
		OpEmptyMatch                   // 匹配空字符串
		OpLiteral                      // 匹配 Rune 序列
		OpCharClass                    // 匹配解释为范围对列表的 Rune
		OpAnyCharNotNL                 // 匹配除换行符外的任何字符
		...
	)

(关于 HTML 呈现，请参见 [pkg.go.dev/regexp/syntax#Op](https://pkg.go.dev/regexp/syntax#Op)。)

## 变量 {#var}

变量的惯例与常量相同。
例如，这是一组分组的变量：

	package fs

	// 通用的文件系统错误。
	// 文件系统返回的错误可以使用 errors.Is 与这些错误进行比较。
	var (
		ErrInvalid    = errInvalid()    // "无效参数"
		ErrPermission = errPermission() // "权限被拒绝"
		ErrExist      = errExist()      // "文件已存在"
		ErrNotExist   = errNotExist()   // "文件不存在"
		ErrClosed     = errClosed()     // "文件已关闭"
	)

以及单个变量：

	package unicode

	// Scripts 是 Unicode 脚本表的集合。
	var Scripts = map[string]*RangeTable{
		"Adlam":                  Adlam,
		"Ahom":                   Ahom,
		"Anatolian_Hieroglyphs":  Anatolian_Hieroglyphs,
		"Arabic":                 Arabic,
		"Armenian":               Armenian,
		...
	}

## 语法 {#syntax}

Go 文档注释使用简单的语法编写，支持
段落、标题、链接、列表和预格式化的代码块。
为了保持注释在源文件中轻量且可读，
不支持复杂的特性，如字体更改或原始 HTML。
Markdown 爱好者可以将此语法视为 Markdown 的一个简化子集。

标准格式化工具 [gofmt](/cmd/gofmt) 会重新格式化文档注释，
为每个特性使用规范的格式。
gofmt 旨在提高可读性并让用户控制注释
在源代码中的编写方式，但会调整呈现方式以使
特定注释的语义更清晰，
这类似于在普通源代码中将 `1+2 * 3` 重新格式化为 `1 + 2*3`。

gofmt 会移除文档注释中开头和结尾的空行。
如果文档注释中的所有行都以相同的
空格和制表符序列开头，gofmt 会移除该前缀。

### 段落 {#paragraphs}

段落是一段未缩进的非空行。
我们已经看过许多段落的例子。

一对连续的反引号 (\` U+0060)
被解释为 Unicode 左引号 (“ U+201C)，
而一对连续的单引号 (\' U+0027)
被解释为 Unicode 右引号 (” U+201D)。Gofmt 会保留段落文本中的换行符：它不会重新包装文本。
这允许使用[语义换行](https://rhodesmill.org/brandon/2012/one-sentence-per-line/)，
如前所述。
Gofmt 会将段落之间重复的空行替换为单个空行。
Gofmt 还会将连续的反引号或单引号
重新格式化为它们的 Unicode 解释形式。

#### 注释 {#notes}

注释是格式为 `MARKER(uid): body` 的特殊注释。
MARKER 应由 2 个或更多大写 `[A-Z]` 字母组成，
用于标识注释的类型，而 uid 至少为 1 个字符，
通常是能够提供更多信息的人员的用户名。
uid 后面的 `:` 是可选的。

注释会被收集并在 pkg.go.dev 上以其自己的部分进行渲染。

例如：

	// TODO(user1): 重构为使用标准库 context
	// BUG(user2): 未清理
	var ctx context.Context

#### 废弃标记 {#deprecations}

以 `Deprecated: ` 开头的段落被视为废弃通知。
某些工具会在使用已废弃的标识符时发出警告。
[pkg.go.dev](https://pkg.go.dev) 默认会隐藏它们的文档。

废弃通知之后通常会跟一些关于该废弃项的信息，
以及（如果适用）关于建议使用什么替代方案的建议。
该段落不一定是文档注释的最后一段。

例如：

	// Package rc4 实现了 RC4 流密码。
	//
	// Deprecated: RC4 已在密码学上被破解，除了为了与遗留系统兼容外不应使用。
	//
	// 此包已冻结，不会添加新功能。
	package rc4

	// Reset 将密钥数据置零并使 Cipher 不可用。
	//
	// Deprecated: Reset 无法保证密钥会完全从进程内存中移除。
	func (c *Cipher) Reset()

### 标题 {#headings}

标题是以井号（U+0023）开头，后跟空格和标题文本的行。
要被识别为标题，该行必须是非缩进的，并且通过空行与相邻的段落文本分隔开。

例如：

	// Package strconv 实现了基本数据类型与字符串表示之间的转换。
	//
	// # 数值转换
	//
	// 最常见的数值转换是 [Atoi]（字符串到 int）和 [Itoa]（int 到字符串）。
	...
	package strconv

另一方面：

	// #This is not a heading, because there is no space.
	//
	// # This is not a heading,
	// # because it is multiple lines.
	//
	// # This is not a heading,
	// because it is also multiple lines.
	//
	// The next paragraph is not a heading, because there is no additional text:
	//
	// #
	//
	// In the middle of a span of non-blank lines,
	// # this is not a heading either.
	//
	//     # This is not a heading, because it is indented.

`#` 语法是在 Go 1.19 中添加的。
在 Go 1.19 之前，标题是通过满足某些条件的单行段落隐式标识的，
最显著的条件是没有任何结尾标点符号。

Gofmt 会将早期版本 Go 中[被视为隐式标题的行](https://github.com/golang/proposal/blob/master/design/51082-godocfmt.md#headings)
重新格式化为使用 `#` 标题。
如果重新格式化不合适——也就是说，如果该行原本不打算作为标题——最简单的
将其变为段落的方法是添加结尾标点符号，
如句号或冒号，或者将其拆分为两行。

### 链接 {#links}

一段非缩进的非空行在每行都是 “[文本]: URL” 格式时定义了链接目标。
在同一文档注释的其他文本中，
“[文本]” 表示使用给定文本指向 URL 的链接——在 HTML 中，
即 `<a href="URL">文本</a>`。
例如：

	// Package json 实现了 RFC 7159 中定义的 JSON 的编码和解码。
	// JSON 和 Go 值之间的映射在 Marshal 和 Unmarshal 函数的文档中有描述。
	//
	// 关于此包的介绍，请参阅文章
	// “[JSON and Go].”
	//
	// [RFC 7159]: https://tools.ietf.org/html/rfc7159
	// [JSON and Go]: https://golang.org/doc/articles/json_and_go.html
	package json

通过将 URL 保持在单独的部分，
这种格式只会最小限度地中断实际文本的流畅性。
它也大致匹配 Markdown 的[快捷引用链接格式](https://spec.commonmark.org/0.30/#shortcut-reference-link)，
但没有可选的标题文本。

如果没有相应的 URL 声明，
那么（除了下一节中描述的文档链接）
“[文本]” 不是一个超链接，并且在显示时会保留方括号。
每个文档注释都是独立考虑的：
一个注释中的链接目标定义不会影响其他注释。

尽管链接目标定义块可以与普通段落交错排列，
gofmt 会将所有链接目标定义移至文档注释的末尾，
最多分为两个块：首先是包含注释中引用的所有链接目标的块，
然后是包含注释中_未_引用的所有目标的块。
单独的块使得未使用的目标易于
被注意到和修复（以防链接或定义有拼写错误）
或删除（以防定义不再需要）。

被识别为 URL 的纯文本在 HTML 渲染中会自动创建链接。

### 文档链接 {#doclinks}

文档链接是格式为 “[Name1]” 或 “[Name1.Name2]” 的链接，用于引用
当前包中导出的标识符，或者格式为 “[pkg]”、
“[pkg.Name1]” 或 “[pkg.Name1.Name2]” 用于引用其他包中的标识符。

例如：

	package bytes

	// ReadFrom 从 r 读取数据直到 EOF 并将其附加到缓冲区，根据需要
	// 增加缓冲区。返回值 n 是读取的字节数。读取期间遇到的
	// 任何错误（[io.EOF] 除外）也会被返回。如果
	// 缓冲区变得太大，ReadFrom 将会 panic 并带有 [ErrTooLarge]。
	func (b *Buffer) ReadFrom(r io.Reader) (n int64, err error) {
		...
	}符号链接的括号文本  
可以包含可选的前导星号，便于引用  
指针类型，如 \[\*bytes.Buffer\]。

引用其他包时，"pkg" 既可以是完整的导入路径  
也可以是现有导入的假定包名。假定包名  
是重命名导入中的标识符，或是  
[goimports 假定的名称](https://pkg.go.dev/golang.org/x/tools/internal/imports#ImportPathToAssumedName)。  
（当该假定不正确时，goimports 会插入重命名，因此  
此规则应适用于几乎所有 Go 代码。）  
例如，若当前包导入了 encoding/json，  
则可写成 "[json.Decoder]" 而非 "[encoding/json.Decoder]"  
来链接到 encoding/json 的 Decoder 文档。  
若同一包的不同源文件使用相同名称导入了不同包，  
则简写会产生歧义，不可使用。

仅当 "pkg" 以域名开头（路径  
元素包含点）或是标准库中的包（如 "[os]"、"[encoding/json]" 等）时，  
才会被假定为完整导入路径。  
例如，`[os.File]` 和 `[example.com/sys.File]` 是文档链接  
（后者将是失效链接），  
但 `[os/sys.File]` 不是，因为标准库中不存在 os/sys 包。

为避免映射、泛型和数组类型引发问题，文档链接必须前后  
均接标点符号、空格、制表符或行首/行尾。  
例如，文本 "map[ast.Expr]TypeAndValue" 不包含  
文档链接。

### 列表 {#lists}

列表是一段缩进或空白行的范围  
（若无列表标记则将成为代码块，  
如后文所述），其中首个缩进行  
以项目符号列表标记或数字列表标记开头。

项目符号列表标记是星号、加号、短横线或 Unicode 圆点  
（\*、+、\-、•；U+002A、U+002B、U+002D、U+2022）  
后接空格或制表符，再接文本。  
在项目符号列表中，每个以项目符号列表  
标记开头的行都会开始新的列表项。

例如：

	package url

	// PublicSuffixList 提供域名的公共后缀。例如：
	//   - "example.com" 的公共后缀是 "com"，
	//   - "foo1.foo2.foo3.co.uk" 的公共后缀是 "co.uk"，且
	//   - "bar.pvt.k12.ma.us" 的公共后缀是 "pvt.k12.ma.us"。
	//
	// PublicSuffixList 的实现必须支持多个 goroutine 并发安全使用。
	//
	// 始终返回 "" 的实现是有效的，可能适用于测试，但并不安全：这意味着 foo.com 的 HTTP 服务器可以
	// 为 bar.com 设置 cookie。
	//
	// 公共后缀列表的实现在包
	// golang.org/x/net/publicsuffix 中。
	type PublicSuffixList interface {
		...
	}

数字列表标记是任意长度的十进制数  
后接句点或右括号，再接空格或制表符，最后接文本。  
在数字列表中，每个以数字列表标记开头的行都会开始新的列表项。  
项目编号保持原样，绝不重新编号。

例如：

	package path

	// Clean 通过纯词法处理返回与 path 等价的最短路径名。它迭代应用以下规则
	// 直到无法进一步处理：
	//
	//  1. 将多个斜杠替换为单个斜杠。
	//  2. 消除每个 . 路径名元素（当前目录）。
	//  3. 消除每个内部 .. 路径名元素（父目录）
	//     以及其前的非 .. 元素。
	//  4. 消除根路径起始的 .. 元素：
	//     即在路径开头将 "/.." 替换为 "/"。
	//
	// 返回的路径仅在是根目录 "/" 时以斜杠结尾。
	//
	// 若此过程结果为空字符串，Clean
	// 返回字符串 "."。
	//
	// 另见 Rob Pike 的《[Plan 9 中的词法文件名]》。
	//
	// [Plan 9 中的词法文件名]: https://9p.io/sys/doc/lexnames.html
	func Clean(path string) string {
		...
	}

列表项仅包含段落，不包含代码块或嵌套列表。  
这避免了任何空格计数的复杂性，以及  
不一致缩进下制表符对应多少空格的问题。

Gofmt 会重新格式化项目符号列表，使用短横线作为项目符号标记，  
短横线前有两格缩进，  
续行有四格缩进。

Gofmt 会重新格式化数字列表，数字前使用一个空格，  
数字后接句点，续行同样  
有四格缩进。

Gofmt 保留但不强制要求列表与前文段落之间空行。  
它会在列表与后文段落或标题之间插入空行。

### 代码块 {#code}

代码块是一段缩进或空白行的范围，  
不以项目符号列表标记或数字列表标记开头。  
它渲染为预格式化文本（HTML 中的 \<pre> 块）。

代码块通常包含 Go 代码。例如：

{{raw `
	package sort

	// Search 使用二分搜索...
	//
	// 作为一个更有趣的示例，此程序猜测你的数字：
	//
	//	func GuessingGame() {
	//		var s string
	//		fmt.Printf("Pick an integer from 0 to 100.\n")
	//		answer := sort.Search(100, func(i int) bool {
	//			fmt.Printf("Is your number <= %d? ", i)
	//			fmt.Scanf("%s", &s)
	//			return s != "" && s[0] == 'y'
	//		})
	//		fmt.Printf("Your number is %d.\n", answer)
	//	}
	func Search(n int, f func(int) bool) int {
		...
	}
`}}

当然，代码块也常包含除代码外的预格式化文本。例如：

{{raw `
	package path```go
	// Match 函数报告 name 是否匹配 shell 模式。
	// 模式语法如下：
	//
	//	pattern:
	//		{ term }
	//	term:
	//		'*'         匹配任意数量的非 '/' 字符序列
	//		'?'         匹配任意单个非 '/' 字符
	//		'[' [ '^' ] { character-range } ']'
	//		            字符类（必须非空）
	//		c           匹配字符 c (c != '*', '?', '\\', '[')
	//		'\\' c      匹配字符 c
	//
	//	character-range:
	//		c           匹配字符 c (c != '\\', '-', ']')
	//		'\\' c      匹配字符 c
	//		lo '-' hi   匹配字符 c，当 lo <= c <= hi
	//
	// Match 要求模式完全匹配整个 name，而不仅仅是子字符串。
	// 唯一可能返回的错误是 [ErrBadPattern]，当模式格式不正确时。
	func Match(pattern, name string) (matched bool, err error) {
		...
	}
`}}

Gofmt 会将代码块中的所有行缩进一个制表符，
替换掉非空行共有的任何其他缩进。
Gofmt 还会在每个代码块前后各插入一个空行，
从而清晰地区分代码块与周围的段落文本。

### 指令 {#directives}

像 `//go:generate` 这样的指令注释
不被视为文档注释的一部分，并且会从
渲染的文档中省略。
Gofmt 会将指令注释移动到文档注释的末尾，
并在其前面加一个空行。
例如：

	package regexp

	// Op 是单个正则表达式运算符。
	//
	//go:generate stringer -type Op -trimprefix Op
	type Op uint8

指令注释是以正则表达式
`//(line |extern |export |[a-z0-9]+:[a-z0-9])` 开头的行。

工具可以使用 `//toolname:directive arguments` 的形式
定义它们自己的指令注释。
工具指令匹配正则表达式
`//([a-z0-9]+):([a-z0-9]\PZ*)($|\pZ+)(.*)`，其中第一个组
是工具名称，第二个组是指令名称。
可选参数由指令名称后的一个或多个 Unicode 空白字符分隔。
每个工具可以定义自己的参数语法，但一个常见的约定是
一系列用空格分隔的参数，其中一个参数可以是
一个裸字，或一个用双引号或反引号括起来的 Go 字符串。
工具名称 `go` 保留给 Go 工具链使用。

[`go/ast.ParseDirective`](/pkg/go/ast#ParseDirective) 函数及其
相关类型解析工具指令的语法。

## 常见错误与陷阱 {#mistakes}

关于文档注释中任何缩进或空行段
都会被渲染为代码块的规则
可以追溯到 Go 语言最早期。
遗憾的是，gofmt 对文档注释支持不足
导致许多现有注释使用了缩进，
而无意创建代码块。

例如，这个未缩进的列表始终被
godoc 解释为一个三行段落，后跟一个一行代码块：

	package http

	// cancelTimerBody 是一个包装了 rc 的 io.ReadCloser，具有两个特性：
	// 1) 在读取错误或关闭时，调用 stop 函数。
	// 2) 在读取失败时，如果 reqDidTimeout 为 true，则错误会被包装并
	//    标记为 net.Error，表明其超时。
	type cancelTimerBody struct {
		...
	}

这始终在 `go` `doc` 中渲染为：

	cancelTimerBody is an io.ReadCloser that wraps rc with two features:
	1) On Read error or close, the stop func is called. 2) On Read failure,
	if reqDidTimeout is true, the error is wrapped and

	    marked as net.Error that hit its timeout.

类似地，此注释中的命令是一个一行段落，
后跟一个一行代码块：

	package smtp

	// localhostCert 是一个 PEM 编码的 TLS 证书，由 src/crypto/tls 生成：
	//
	// go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \
	//     --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h
	var localhostCert = []byte(`...`)

这在 `go` `doc` 中渲染为：

	localhostCert is a PEM-encoded TLS cert generated from src/crypto/tls:

	go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \

	    --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h

而这个注释是一个两行段落（第二行是 “{”），
后跟一个六行缩进的代码块和一个一行段落（“}”）。

	// 在网络传输中，JSON 将类似于：
	// {
	//	"kind":"MyAPIObject",
	//	"apiVersion":"v1",
	//	"myPlugin": {
	//		"kind":"PluginA",
	//		"aOption":"foo",
	//	},
	// }

这在 `go` `doc` 中渲染为：

	On the wire, the JSON will look something like this: {

	    "kind":"MyAPIObject",
	    "apiVersion":"v1",
	    "myPlugin": {
	    	"kind":"PluginA",
	    	"aOption":"foo",
	    },

	}

另一个常见错误是未缩进的 Go 函数定义
或块语句，同样由 “{” 和 “}” 括起来。

Go 1.19 的 gofmt 中引入的文档注释重新格式化
通过在代码块周围添加空行，
使得这类错误更加显眼。

2022 年的分析发现，公开 Go 模块中只有 3% 的文档注释
被 Go 1.19 gofmt 草案完全重新格式化。
仅限于这些注释，大约 87% 的 gofmt 重新格式化
保留了人们阅读注释后会推断出的结构；
大约 6% 被这类未缩进的列表、
未缩进的多行 shell 命令和未缩进的花括号分隔的代码块所干扰。

基于此分析，Go 1.19 gofmt 应用了一些启发式方法，将
未缩进的行合并到相邻的缩进列表或代码块中。
通过这些调整，Go 1.19 gofmt 将上述示例重新格式化为：

	// cancelTimerBody 是一个包装了 rc 的 io.ReadCloser，具有两个特性：
	//  1. 在读取错误或关闭时，调用 stop 函数。
	//  2. 在读取失败时，如果 reqDidTimeout 为 true，则错误会被包装并
	//     标记为 net.Error，表明其超时。
```// localhostCert 是从 src/crypto/tls 生成的 PEM 编码 TLS 证书：
//
//   go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \
//       --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h

// 在传输格式上，JSON 内容大致如下所示：
//
//	{
//		"kind":"MyAPIObject",
//		"apiVersion":"v1",
//		"myPlugin": {
//			"kind":"PluginA",
//			"aOption":"foo",
//		},
//	}

这种重新格式化不仅使含义更清晰，还能确保文档注释在早期 Go 版本中正确渲染。
如果启发式方法做出错误判断，可以通过插入空行来明确分隔段落文本与非段落文本，从而覆盖其格式决定。

即便使用这些启发式方法，其他现有注释仍需手动调整以保证渲染效果。
最常见的错误是缩进了换行后的未缩进文本行。例如：

	// TODO 重新考虑此设计。遍历这些节点可能只需进行一次。
	//      仅一次。

	// 根据文档：
	// "用于对齐映像文件中各节原始数据的对齐因子（以字节为单位）。该值应为 512 至 64 K 之间的 2 的幂次（含边界值）。"

这两处示例中，最后一行均被缩进，导致其成为代码块。
解决方法是取消这些行的缩进。

另一个常见错误是未缩进列表或代码块中换行后的缩进行。例如：

	// 此错误模型的用途包括：
	//
	//   - 部分错误。若服务需要向客户端返回部分错误，可在正常响应中嵌入
	// `Status` 以指示部分错误。
	//
	//   - 工作流错误。典型工作流包含多个步骤，每个步骤都可能设有用于
	// 错误报告的 `Status` 消息。

解决方法是缩进这些换行后的行。

Go 文档注释不支持嵌套列表，因此 gofmt 会将

	// 这是一个列表：
	//
	//  - 项目 1。
	//    * 子项 1。
	//    * 子项 2。
	//  - 项目 2。
	//  - 项目 3。

重新格式化为

	// 这是一个列表：
	//
	//  - 项目 1。
	//  - 子项 1。
	//  - 子项 2。
	//  - 项目 2。
	//  - 项目 3。

重写文本以避免嵌套列表通常能改善文档质量，这是最佳解决方案。
另一种可能的变通方法是混合使用列表标记符号，
因为项目符号标记不会在编号列表中引入列表项，反之亦然。
例如：

	// 这是一个列表：
	//
	//  1. 项目 1。
	//
	//     - 子项 1。
	//
	//     - 子项 2。
	//
	//  2. 项目 2。
	//
	//  3. 项目 3。