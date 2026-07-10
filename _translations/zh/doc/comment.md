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

“文档注释”是指紧接在顶层包、常量、函数、类型和变量声明之前，且之间没有空行的注释。每个导出（大写）的名称都应有文档注释。

[go/doc](/pkg/go/doc) 和 [go/doc/comment](/pkg/go/doc/comment) 包提供了从 Go 源代码中提取文档的功能，各种工具都利用了这一功能。[`go` `doc`](/cmd/go#hdr-Show_documentation_for_package_or_symbol) 命令用于查找并打印给定包或符号的文档注释。（符号是指顶层的常量、函数、类型或变量。）Web 服务器 [pkg.go.dev](https://pkg.go.dev/) 展示了公开 Go 包的文档（在许可允许的情况下）。为该站点提供服务的程序是 [golang.org/x/pkgsite/cmd/pkgsite](https://pkg.go.dev/golang.org/x/pkgsite/cmd/pkgsite)，它也可以在本地运行，用于查看私有模块的文档或在没有互联网连接时使用。语言服务器 [gopls](https://pkg.go.dev/golang.org/x/tools/gopls) 在 IDE 中编辑 Go 源文件时提供文档支持。

本页的其余部分记录了如何编写 Go 文档注释。

## 包 {#package}

每个包都应有一个包注释来介绍该包。它提供与整个包相关的信息，通常用于设定对包的预期。特别是在大型包中，包注释能对 API 最重要的部分进行简要概述，并根据需要链接到其他文档注释，这会很有帮助。

如果包很简单，包注释可以很简短。例如：

	// Package path 实现了用于操作由斜杠分隔的路径的实用程序例程。
	//
	// path 包仅应用于由正斜杠分隔的路径，例如 URL 中的路径。此包不处理带有驱动器字母或反斜杠的 Windows 路径；要操作操作系统路径，请使用 [path/filepath] 包。
	package path

`[path/filepath]` 中的方括号创建了一个[文档链接](#links)。

正如在此示例中所见，Go 文档注释使用完整的句子。对于包注释，这意味着[第一句话](/pkg/go/doc/#Package.Synopsis)以“Package <名称>”开头。

对于多文件包，包注释应仅出现在一个源文件中。如果多个文件都有包注释，它们将被连接起来形成整个包的一个大型注释。

## 命令 {#cmd}

命令的包注释与此类似，但它描述的是程序的行为，而不是包中的 Go 符号。第一句话习惯上以程序本身的名称开头，并大写，因为它位于句子开头。例如，这里是 [gofmt](/cmd/gofmt) 的包注释的节选版本：

	/*
	Gofmt 格式化 Go 程序。
	它使用制表符进行缩进，使用空格进行对齐。
	对齐假设编辑器使用的是等宽字体。

	如果没有明确的路径，它会处理标准输入。给定一个文件时，它操作该文件；给定一个目录时，它递归地操作该目录中的所有 .go 文件。（以句点开头的文件会被忽略。）默认情况下，gofmt 将重新格式化的源代码打印到标准输出。

	用法：

		gofmt [flags] [path ...]

	标志有：

		-d
			不要将重新格式化的源代码打印到标准输出。
			如果文件的格式与 gofmt 的不同，则将差异打印到标准输出。
		-w
			不要将重新格式化的源代码打印到标准输出。
			如果文件的格式与 gofmt 的不同，则用 gofmt 的版本覆盖它。如果在覆盖过程中发生错误，则从自动备份中恢复原始文件。

	当 gofmt 从标准输入读取时，它接受一个完整的 Go 程序或一个程序片段。程序片段必须是语法上有效的声明列表、语句列表或表达式。格式化此类片段时，gofmt 会保留前导缩进以及前导和尾随空格，以便 Go 程序的各个部分可以通过管道传递给 gofmt 进行格式化。
	*/
	package main

注释的开头使用[语义换行](https://rhodesmill.org/brandon/2012/one-sentence-per-line/)编写，其中每个新的句子或长短语单独占一行，这可以使代码和注释演变时差异更易于阅读。后面的段落碰巧没有遵循这个约定，并且是手动换行的。无论哪种方式都适合你的代码库。`go` `doc` 和 `pkgsite` 在打印文档注释文本时会重新换行。例如：

	$ go doc gofmt
	Gofmt 格式化 Go 程序。它使用制表符进行缩进，使用空格进行对齐。对齐假设编辑器使用的是等宽字体。

	如果没有明确的路径，它会处理标准输入。给定一个文件时，它操作该文件；给定一个目录时，它递归地操作该目录中的所有 .go 文件。（以句点开头的文件会被忽略。）默认情况下，gofmt 将重新格式化的源代码打印到标准输出。

	用法：

		gofmt [flags] [path ...]

	标志有：

		-d
			不要将重新格式化的源代码打印到标准输出。
			如果文件的格式与 gofmt 的不同，则将差异打印到标准输出。
	...

缩进的行被视为预格式化文本：它们不会被重新换行，并在 HTML 和 Markdown 演示中以代码字体打印。（[语法](#syntax)部分给出了详细信息。）

## 类型 {#type}

类型的文档注释应解释该类型的每个实例代表或提供什么。如果 API 很简单，文档注释可以非常简短。例如：

	package zip// Reader 用于从 ZIP 存档中读取内容。
type Reader struct {
	...
}

默认情况下，程序员应预期一个类型在同一时间仅能被单个 goroutine（协程）安全使用。
如果类型提供更强的保证，文档注释应予以说明。
例如：

	package regexp

	// Regexp 是编译后正则表达式的表示。
	// 除配置方法（如 Longest）外，Regexp 可被多个 goroutine（协程）并发安全使用。
	type Regexp struct {
		...
	}

Go 类型还应力求让零值具有实用意义。
若此意义不明显，则应予以文档说明。例如：

	package bytes

	// Buffer 是具有读写方法、大小可变的字节缓冲区。
	// Buffer 的零值是一个随时可用的空缓冲区。
	type Buffer struct {
		...
	}

对于包含导出字段的结构体，文档注释或各字段注释应解释每个导出字段的含义。
例如，此类型的文档注释解释了各字段：

{{raw `
	package io

	// LimitedReader 从 R 读取内容，但限制返回的数据量仅为 N 字节。
	// 每次调用 Read 都会更新 N 以反映剩余的数据量。
	// 当 N <= 0 时，Read 返回 EOF。
	type LimitedReader struct {
		R   Reader // 底层读取器
		N   int64  // 剩余最大字节数
	}
`}}

相比之下，此类型的文档注释将解释留给各字段注释：

{{raw `
	package comment

	// Printer 是文档注释打印机。
	// 结构体中的字段可在调用任何打印方法之前填充，
	// 以便自定义打印过程的细节。
	type Printer struct {
		// HeadingLevel 是用于 HTML 和 Markdown 标题的嵌套级别。
		// 若 HeadingLevel 为零，则默认为级别 3，
		// 即使用 <h3> 和 ###。
		HeadingLevel int
		...
	}
`}}

与包（上文）和函数（下文）一样，类型的文档注释
以声明符号的完整句子开头。
明确的主语通常使措辞更清晰，
也使文本更易于搜索，无论是在网页上
还是在命令行中。
例如：

	$ go doc -all regexp | grep pairs
	pairs within the input string: result[2*n:2*n+2] identifies the indexes
	    FindReaderSubmatchIndex returns a slice holding the index pairs identifying
	    FindStringSubmatchIndex returns a slice holding the index pairs identifying
	    FindSubmatchIndex returns a slice holding the index pairs identifying the
	$

## 函数 {#func}

函数的文档注释应解释函数返回什么，
或者，对于因副作用而调用的函数，解释其作用。
命名参数和结果可在注释中直接引用，
无需使用反引号等特殊语法。
（此惯例的一个结果是，像 `a` 这样
可能被误认为普通单词的名字通常会被避免。）
例如：

	package strconv

	// Quote 返回一个表示 s 的双引号 Go 字符串字面量。
	// 返回的字符串使用 Go 转义序列（\t, \n, \xFF, \u0100）
	// 表示 IsPrint 定义的控制字符和不可打印字符。
	func Quote(s string) string {
		...
	}

以及：

	package os

	// Exit 使当前程序以给定的状态码退出。
	// 通常，状态码零表示成功，非零表示错误。
	// 程序立即终止；延迟执行的函数不会运行。
	//
	// 为可移植性考虑，状态码应在 [0, 125] 范围内。
	func Exit(code int) {
		...
	}

文档注释通常使用“报告是否”来描述返回布尔值的函数。
“或不”一词是不必要的。
例如：

	package strings

	// HasPrefix 报告字符串 s 是否以 prefix 开头。
	func HasPrefix(s, prefix string) bool

如果文档注释需要解释多个结果，
对结果进行命名可以使文档注释更易理解，
即使这些名字在函数体中并未使用。
例如：

	package io

	// Copy 从 src 复制到 dst，直到 src 达到 EOF 或发生错误。
	// 它返回已写入的总字节数以及复制过程中遇到的第一个错误（如果有）。
	//
	// 成功的 Copy 返回 err == nil，而非 err == EOF。
	// 因为 Copy 被定义为从 src 读取直到 EOF，它不会
	// 将来自 Read 的 EOF 视为需要报告的错误。
	func Copy(dst Writer, src Reader) (n int64, err error) {
		...
	}

反之，当结果无需在文档注释中命名时，
它们通常也在代码中被省略，就像上面的 `Quote` 示例一样，
以避免演示内容过于杂乱。

这些规则同样适用于普通函数和方法。
对于方法，使用相同的接收者名称可避免在列出类型所有方法时出现不必要的变化：

	$ go doc bytes.Buffer
	package bytes // import "bytes"

	type Buffer struct {
		// Has unexported fields.
	}
	    A Buffer is a variable-sized buffer of bytes with Read and Write methods.
	    The zero value for Buffer is an empty buffer ready to use.

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

此示例还显示，返回类型 `T` 或指针 `*T` 的顶层函数
（可能附加一个错误结果）
会与类型 `T` 及其方法一同显示，
假设它们是 `T` 的构造函数。

默认情况下，程序员可假定顶层函数
可从多个 goroutine（协程）中安全调用；
此事实无需显式说明。另一方面，正如前一节所述，以任何方式使用类型的实例（包括调用方法），通常都假定一次只能由单个 goroutine（协程）操作。如果类型文档注释中未说明哪些方法支持并发调用，则应在每个方法的单独注释中说明。例如：

	package sql

	// Close 返回连接至连接池。在 Close 之后的所有操作都将返回 ErrConnDone。
	// Close 可与其他操作并发调用，并会阻塞直至所有其他操作完成。
	// 首先取消所有使用的上下文，然后直接调用 Close 可能会更有用。
	func (c *Conn) Close() error {
		...
	}

请注意，函数和方法的文档注释应专注于操作返回或执行的内容，详细说明调用者需要知道的信息。特殊情况的文档记录尤为重要。例如：

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

文档注释不应解释内部实现细节，例如当前实现所使用的算法。这些内容最好放在函数体内部的注释中。当渐进时间或空间界限对调用者特别重要时，可以说明这些细节。例如：

	package sort

	// Sort 按 Less 方法确定的升序对数据进行排序。
	// 它会调用一次 data.Len 来确定 n，并调用 O(n*log(n)) 次 data.Less 和 data.Swap。
	// 排序的稳定性不保证。
	func Sort(data Interface) {
		...
	}

由于该文档注释没有提及使用了哪种排序算法，因此将来更容易将实现更改为使用不同的算法。

## 常量 {#const}

Go 的声明语法允许分组声明，这种情况下，单个文档注释可以介绍一组相关的常量，各个常量仅通过简短的行内注释进行文档记录。例如：

	package scanner // import "text/scanner"

	// Scan 的结果是以下标记之一或 Unicode 字符。
	const (
		EOF = -(iota + 1)
		Ident
		Int
		Float
		Char
		...
	)

有时，该组常量根本不需要文档注释。例如：

	package unicode // import "unicode"

	const (
		MaxRune         = '\U0010FFFF' // 最大有效 Unicode 码点。
		ReplacementChar = '\uFFFD'     // 表示无效码点。
		MaxASCII        = '\u007F'     // 最大 ASCII 值。
		MaxLatin1       = '\u00FF'     // 最大 Latin-1 值。
	）

另一方面，未分组的常量通常需要一个以完整句子开头的完整文档注释。例如：

	package unicode

	// Version 是派生表格所依据的 Unicode 版本。
	const Version = "13.0.0"

带类型的常量会显示在其类型的声明旁边，因此通常省略常量组的文档注释，而依赖于类型的文档注释。例如：

	package syntax

	// Op 是单个正则表达式运算符。
	type Op uint8

	const (
		OpNoMatch        Op = 1 + iota // 不匹配任何字符串
		OpEmptyMatch                   // 匹配空字符串
		OpLiteral                      // 匹配 Runes 序列
		OpCharClass                    // 匹配解释为范围对列表的 Runes
		OpAnyCharNotNL                 // 匹配除换行符外的任何字符
		...
	)

（有关 HTML 呈现，请参阅 [pkg.go.dev/regexp/syntax#Op](https://pkg.go.dev/regexp/syntax#Op)。）

## 变量 {#var}

变量的约定与常量的约定相同。例如，这是一组分组的变量：

	package fs

	// 通用文件系统错误。
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

	// Scripts 是 Unicode 脚本表格的集合。
	var Scripts = map[string]*RangeTable{
		"Adlam":                  Adlam,
		"Ahom":                   Ahom,
		"Anatolian_Hieroglyphs":  Anatolian_Hieroglyphs,
		"Arabic":                 Arabic,
		"Armenian":               Armenian,
		...
	}

## 语法 {#syntax}

Go 文档注释采用简单的语法编写，支持段落、标题、链接、列表和预格式化代码块。为了保持源文件中注释的轻量级和可读性，不支持字体更改或原始 HTML 等复杂特性。Markdown 爱好者可以将该语法视为 Markdown 的简化子集。

标准格式化程序 [gofmt](/cmd/gofmt) 会重新格式化文档注释，为每种功能使用规范的格式。Gofmt 旨在提高可读性，并让用户控制注释在源代码中的编写方式，但会调整呈现方式以使特定注释的语义更清晰，类似于在普通源代码中将 `1+2 * 3` 重新格式化为 `1 + 2*3`。

Gofmt 会删除文档注释中的前导和尾随空行。如果文档注释中的所有行都以相同的空格和制表符序列开头，gofmt 会删除该前缀。

### 段落 {#paragraphs}

段落是一段未缩进的非空行。我们已经看到了许多段落的示例。

连续的两个反引号（\` U+0060）会被解释为 Unicode 左引号（“ U+201C），连续的两个单引号（\' U+0027）会被解释为 Unicode 右引号（” U+201D）。Gofmt 会保留段落文本中的换行符：它不会重新对文本进行换行。这使得使用[语义换行](https://rhodesmill.org/brandon/2012/one-sentence-per-line/)成为可能，如前所述。Gofmt 会将段落之间的重复空行替换为单个空行。Gofmt 还会将连续的反引号或单引号重新格式化为其 Unicode 解释形式。

#### 注释 {#notes}

注释是一种特殊形式的注释，格式为 `MARKER(uid): body`。MARKER 应由 2 个或更多个大写 `[A-Z]` 字母组成，用于标识注释的类型，而 uid 至少为 1 个字符，通常是可以提供更多信息的人员的用户名。uid 后面的 `:` 是可选的。

注释会被收集并在 pkg.go.dev 上单独的章节中呈现。

例如：

	// TODO(user1): refactor to use standard library context
	// BUG(user2): not cleaned up
	var ctx context.Context

#### 弃用通知 {#deprecations}

以 `Deprecated: ` 开头的段落会被视为弃用通知。当使用了被弃用的标识符时，某些工具会发出警告。[pkg.go.dev](https://pkg.go.dev) 默认会隐藏其文档。

弃用通知后面会附带一些关于弃用的信息，以及建议使用的替代方案（如果适用）。该段落不一定是文档注释中的最后一个段落。

例如：

	// Package rc4 implements the RC4 stream cipher.
	//
	// Deprecated: RC4 is cryptographically broken and should not be used
	// except for compatibility with legacy systems.
	//
	// This package is frozen and no new functionality will be added.
	package rc4

	// Reset zeros the key data and makes the Cipher unusable.
	//
	// Deprecated: Reset can't guarantee that the key will be entirely removed from
	// the process's memory.
	func (c *Cipher) Reset()

### 标题 {#headings}

标题是以数字符号 (U+0023) 开头，后跟一个空格和标题文本的行。要被识别为标题，该行必须是无缩进的，并且通过空行与相邻的段落文本分隔开。

例如：

	// Package strconv implements conversions to and from string representations
	// of basic data types.
	//
	// # Numeric Conversions
	//
	// The most common numeric conversions are [Atoi] (string to int) and [Itoa] (int to string).
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

`#` 语法是在 Go 1.19 中添加的。在 Go 1.19 之前，标题是通过满足某些条件的单行段落隐式识别的，最显著的是缺少任何终止标点符号。

Gofmt 会将[早期版本的 Go 中视为隐式标题的行](https://github.com/golang/proposal/blob/master/design/51082-godocfmt.md#headings)重新格式化为使用 `#` 标题。如果重新格式化不合适——也就是说，如果该行本意不是作为标题——使其成为段落的最简单方法是引入终止标点符号，如句号或冒号，或者将其分成两行。

### 链接 {#links}

一段无缩进的非空行，如果每一行都符合 `[Text]: URL` 的格式，则定义了链接目标。在同一文档注释的其他文本中，`[Text]` 表示使用给定文本指向 URL 的链接——在 HTML 中表示为 `<a href="URL">Text</a>`。

例如：

	// Package json implements encoding and decoding of JSON as defined in
	// [RFC 7159]. The mapping between JSON and Go values is described
	// in the documentation for the Marshal and Unmarshal functions.
	//
	// For an introduction to this package, see the article
	// "[JSON and Go]."
	//
	// [RFC 7159]: https://tools.ietf.org/html/rfc7159
	// [JSON and Go]: https://golang.org/doc/articles/json_and_go.html
	package json

通过将 URL 保存在单独的部分中，这种格式只会轻微地中断实际文本的流动。它也大致符合 Markdown 的[快捷引用链接格式](https://spec.commonmark.org/0.30/#shortcut-reference-link)，只是没有可选的标题文本。

如果没有对应的 URL 声明，那么（除了下一节描述的文档链接）`[Text]` 不是超链接，并且在显示时会保留方括号。每个文档注释都是独立考虑的：一个注释中的链接目标定义不影响其他注释。

尽管链接目标定义块可以与普通段落交错，但 gofmt 会将所有链接目标定义移动到文档注释的末尾，分为两个块：首先是一个包含注释中引用的所有链接目标的块，然后是一个包含所有_未_被引用的目标的块。单独的块使得未使用的目标易于发现和修复（如果链接或定义有拼写错误）或删除（如果不再需要定义）。

在 HTML 渲染中，被识别为 URL 的纯文本会自动成为链接。

### 文档链接 {#doclinks}

文档链接是形式为 `[Name1]` 或 `[Name1.Name2]` 的链接，用于引用当前包中的导出标识符，或者是 `[pkg]`、`[pkg.Name1]` 或 `[pkg.Name1.Name2]` 以引用其他包中的标识符。

例如：

	package bytes

	// ReadFrom reads data from r until EOF and appends it to the buffer, growing
	// the buffer as needed. The return value n is the number of bytes read. Any
	// error except [io.EOF] encountered during the read is also returned. If the
	// buffer becomes too large, ReadFrom will panic with [ErrTooLarge].
	func (b *Buffer) ReadFrom(r io.Reader) (n int64, err error) {
		...
	}符号链接的括号文本  
可以包含可选的前导星号，以便轻松引用  
指针类型，例如 \[\*bytes.Buffer\]。  

引用其他包时，"pkg" 可以是完整的导入路径，  
也可以是现有导入的假定包名。假定包名  
是重命名导入中的标识符，或  
[goimports 假定的名称](https://pkg.go.dev/golang.org/x/tools/internal/imports#ImportPathToAssumedName)。  
（当该假设不正确时，goimports 会插入重命名，因此  
此规则应适用于几乎所有 Go 代码。）  
例如，如果当前包导入了 encoding/json，  
则可以将 "[json.Decoder]" 写作 "[encoding/json.Decoder]" 的替代，  
以链接到 encoding/json 的 Decoder 文档。  
如果包中的不同源文件使用相同名称导入了不同包，  
则简写形式会产生歧义，不能使用。  

仅当 "pkg" 以域名（  
带有点的路径元素）开头，或者是标准库  
（"[os]"、"[encoding/json]" 等）中的包时，  
才假定为完整导入路径。  
例如，`[os.File]` 和 `[example.com/sys.File]` 是文档链接  
（后者将是断开的链接），  
但 `[os/sys.File]` 不是，因为标准库中没有 os/sys 包。  

为避免与映射、泛型和数组类型相关的问题，  
文档链接的前面和后面必须  
都有标点符号、空格、制表符或行首/行尾。  
例如，文本 "map[ast.Expr]TypeAndValue" 不包含  
文档链接。  

### 列表 {#lists}  

列表是一段缩进或空白行的区域  
（否则将是代码块，  
如下一节所述），  
其中第一行缩进行以  
列表项目符号或编号列表标记开头。  

列表项目符号标记是星号、加号、破折号或 Unicode 项目符号  
（*、+、-、•；U+002A、U+002B、U+002D、U+2022）  
后跟空格或制表符，然后是文本。  
在列表中，每行以项目符号标记开头  
都会开始一个新的列表项。  

例如：  

	package url

	// PublicSuffixList 提供域名的公共后缀。例如：
	//   - "example.com" 的公共后缀是 "com"，
	//   - "foo1.foo2.foo3.co.uk" 的公共后缀是 "co.uk"，并且
	//   - "bar.pvt.k12.ma.us" 的公共后缀是 "pvt.k12.ma.us"。
	//
	// PublicSuffixList 的实现必须对多个 goroutine 的并发使用是安全的。
	//
	// 始终返回 "" 的实现是有效的，可能有助于测试，
	// 但它不安全：这意味着 foo.com 的 HTTP 服务器可以
	// 为 bar.com 设置 cookie。
	//
	// 公共后缀列表的实现位于包
	// golang.org/x/net/publicsuffix 中。
	type PublicSuffixList interface {
		...
	}  

编号列表标记是任意长度的十进制数字  
后跟句点或右括号，然后是空格或制表符，然后是文本。  
在编号列表中，每行以数字列表标记开头  
都会开始一个新的列表项。  
项目编号保持原样，永不重新编号。  

例如：  

	package path

	// Clean 返回通过纯词法处理与 path 等价的
	// 最短路径名。它迭代应用以下规则，
	// 直到无法进一步处理：
	//
	//  1. 将多个斜杠替换为单个斜杠。
	//  2. 消除每个 . 路径名元素（当前目录）。
	//  3. 消除每个内部 .. 路径名元素（父目录），
	//     以及它前面的非 .. 元素。
	//  4. 消除以根路径开头的 .. 元素：
	//     即，在路径开头将 "/.." 替换为 "/"。
	//
	// 返回的路径仅在是根 "/" 时以斜杠结尾。
	//
	// 如果此过程的结果是空字符串，Clean
	// 返回字符串 "."。
	//
	// 另请参见 Rob Pike，"[Plan 9 中的词法文件名]。"
	//
	// [Plan 9 中的词法文件名]: https://9p.io/sys/doc/lexnames.html
	func Clean(path string) string {
		...
	}  

列表项仅包含段落，不包含代码块或嵌套列表。  
这避免了任何空格计数的微妙之处，以及  
在不一致的缩进中制表符算作多少空格的问题。  

Gofmt 重新格式化项目符号列表，使用破折号作为项目符号标记，  
破折号前有两个空格的缩进，  
续行有四个空格的缩进。  

Gofmt 重新格式化编号列表，数字前使用单个空格，  
数字后使用句点，续行  
同样有四个空格的缩进。  

Gofmt 保留但在列表和前一段落之间不需要空行。  
它在列表和后续段落或标题之间插入空行。  

### 代码块 {#code}  

代码块是一段不以项目符号或编号列表标记开头  
的缩进或空白行区域。  
它渲染为预格式化文本（HTML 中的 \<pre> 块）。  

代码块通常包含 Go 代码。例如：  

{{raw `
	package sort

	// Search 使用二分查找...
	//
	// 作为一个更有趣的例子，此程序猜测你的数字：
	//
	//	func GuessingGame() {
	//		var s string
	//		fmt.Printf("从 0 到 100 选一个整数。\n")
	//		answer := sort.Search(100, func(i int) bool {
	//			fmt.Printf("你的数字 <= %d 吗？", i)
	//			fmt.Scanf("%s", &s)
	//			return s != "" && s[0] == 'y'
	//		})
	//		fmt.Printf("你的数字是 %d。\n", answer)
	//	}
	func Search(n int, f func(int) bool) int {
		...
	}
`}}  

当然，代码块通常也包含除代码外的预格式化文本。例如：  

{{raw `
	package path```go
// Match 报告 name 是否匹配 shell 模式。
// 模式语法如下：
//
//	模式:
//		{ 项 }
//	项:
//		'*'         匹配任意数量的非 '/' 字符
//		'?'         匹配任意单个非 '/' 字符
//		'[' [ '^' ] { 字符范围 } ']'
//		            字符类（必须非空）
//		c           匹配字符 c (c != '*', '?', '\\', '[')
//		'\\' c      匹配字符 c
//
//	字符范围:
//		c           匹配字符 c (c != '\\', '-', ']')
//		'\\' c      匹配字符 c
//		lo '-' hi   匹配字符 c，其中 lo <= c <= hi
//
// Match 要求模式必须完全匹配整个 name，而非仅仅是子字符串。
// 唯一可能返回的错误是 [ErrBadPattern]，当模式格式不正确时。
func Match(pattern, name string) (matched bool, err error) {
	...
}
`}}

Gofmt 会将代码块中的所有行缩进一个制表符，
替换掉非空行共有的任何其他缩进。
Gofmt 还会在每个代码块前后插入一个空行，
以便将代码块与周围的段落文本清晰地区分开来。

### 指令 {#directives}

诸如 `//go:generate` 之类的指令注释
不被视为文档注释的一部分，并且会在渲染的文档中被省略。
Gofmt 会将指令注释移动到文档注释的末尾，
前面加一个空行。
例如：

	package regexp

	// Op 是单个正则表达式运算符。
	//
	//go:generate stringer -type Op -trimprefix Op
	type Op uint8

指令注释是以正则表达式
`//(line |extern |export |[a-z0-9]+:[a-z0-9])` 开头的行。

工具可以使用 `//toolname:directive arguments` 的形式
定义自己的指令注释。
工具指令匹配正则表达式
`//([a-z0-9]+):([a-z0-9]\PZ*)($|\pZ+)(.*)`，其中第一组
是工具名称，第二组是指令名称。
可选参数通过一个或多个 Unicode 空白字符与指令名称分隔。
每个工具可以定义自己的参数语法，但常见的约定是
一系列以空格分隔的参数，其中参数可以是
一个裸字（bare word），或一个双引号或反引号括起来的 Go 字符串。
工具名称 `go` 被保留供 Go 工具链使用。

[`go/ast.ParseDirective`](/pkg/go/ast#ParseDirective) 函数及其相关类型
会解析工具指令的语法。

## 常见错误和陷阱 {#mistakes}

关于文档注释中任何连续的缩进行或空行
都会被渲染为代码块的规则
可以追溯到 Go 的早期。
不幸的是，gofmt 对文档注释的支持不足
导致许多现有注释使用了缩进
但并非意在创建代码块。

例如，这个未缩进的列表一直以来都被 godoc
解释为三行段落，后跟一个单行代码块：

	package http

	// cancelTimerBody 是一个包装了 rc 的 io.ReadCloser，具有两个特性：
	// 1) 在读取错误或关闭时，调用 stop 函数。
	// 2) 在读取失败时，如果 reqDidTimeout 为 true，则错误会被包装并
	//    标记为 net.Error，表示其已超时。
	type cancelTimerBody struct {
		...
	}

这在 `go` `doc` 中总是渲染为：

	cancelTimerBody is a io.ReadCloser that wraps rc with two features:
	1) On Read error or close, the stop func is called. 2) On Read failure,
	if reqDidTimeout is true, the error is wrapped and

	    marked as net.Error that hit its timeout.

类似地，此注释中的命令是一个单行段落
后跟一个单行代码块：

	package smtp

	// localhostCert 是从 src/crypto/tls 生成的 PEM 编码 TLS 证书：
	//
	// go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \
	//     --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h
	var localhostCert = []byte(`...`)

这在 `go` `doc` 中渲染为：

	localhostCert is a PEM-encoded TLS cert generated from src/crypto/tls:

	go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \

	    --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h

而此注释是一个两行段落（第二行是“{”），
后跟一个六行缩进的代码块和一个单行段落（“}”）。

	// 在网络传输中，JSON 看起来会像这样：
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
或块语句，同样由“{”和“}”括起来。

Go 1.19 的 gofmt 引入了文档注释重新格式化功能，通过
在代码块周围添加空行，使得这类错误更加明显。

2022 年的分析发现，公开 Go 模块中只有 3% 的文档注释
被 Go 1.19 的 gofmt 草案重新格式化。
仅限于这些注释，大约 87% 的 gofmt 重新格式化
保留了人们阅读注释时会推断出的结构；
大约 6% 被这些类型的未缩进列表、
未缩进的多行 shell 命令和未缩进的用大括号分隔的代码块所困扰。

基于此分析，Go 1.19 的 gofmt 应用了一些启发式方法来将
未缩进的行合并到相邻的缩进列表或代码块中。
经过这些调整后，Go 1.19 的 gofmt 会将上述示例重新格式化为：

	// cancelTimerBody 是一个包装了 rc 的 io.ReadCloser，具有两个特性：
	//  1. 在读取错误或关闭时，调用 stop 函数。
	//  2. 在读取失败时，如果 reqDidTimeout 为 true，则错误会被包装并
	//     标记为 net.Error，表示其已超时。
```// localhostCert 是一个 PEM 编码的 TLS 证书，由 src/crypto/tls 生成：
	//
	//	go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \
	//	    --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h

	// 在线上，JSON 看起来大致是这样的：
	//
	//	{
	//		"kind":"MyAPIObject",
	//		"apiVersion":"v1",
	//		"myPlugin": {
	//			"kind":"PluginA",
	//			"aOption":"foo",
	//		},
	//	}

这种重新格式化不仅使含义更清晰，也让文档注释在早期版本的 Go 中能正确渲染。

如果启发式算法做出了错误判断，可以通过插入一个空行来清晰地分隔段落文本和非段落文本，从而覆盖其决策。

即使有这些启发式方法，其他现有注释仍可能需要手动调整以纠正其渲染效果。
最常见的错误是缩进了换行后的未缩进文本行。
例如：

	// TODO Revisit this design. It may make sense to walk those nodes
	//      only once.

	// According to the document:
	// "The alignment factor (in bytes) that is used to align the raw data of sections in
	//  the image file. The value should be a power of 2 between 512 and 64 K, inclusive."

在这两种情况中，最后一行都被缩进，使其变成了代码块。
修复方法是取消这些行的缩进。

另一个常见错误是未缩进列表或代码块中换行后的已缩进行。
例如：

	// Uses of this error model include:
	//
	//   - Partial errors. If a service needs to return partial errors to the
	// client,
	//     it may embed the `Status` in the normal response to indicate the
	// partial
	//     errors.
	//
	//   - Workflow errors. A typical workflow has multiple steps. Each step
	// may
	//     have a `Status` message for error reporting.

修复方法是缩进这些换行后的行。

Go 文档注释不支持嵌套列表，因此 gofmt 会将

	// Here is a list:
	//
	//  - Item 1.
	//    * Subitem 1.
	//    * Subitem 2.
	//  - Item 2.
	//  - Item 3.

重新格式化为

	// Here is a list:
	//
	//  - Item 1.
	//  - Subitem 1.
	//  - Subitem 2.
	//  - Item 2.
	//  - Item 3.

重写文本以避免嵌套列表通常能改进文档，这是最佳的解决方案。
另一种可能的变通方法是混合使用列表标记，因为项目符号标记在编号列表中不会引入列表项，反之亦然。
例如：

	// Here is a list:
	//
	//  1. Item 1.
	//
	//     - Subitem 1.
	//
	//     - Subitem 2.
	//
	//  2. Item 2.
	//
	//  3. Item 3.