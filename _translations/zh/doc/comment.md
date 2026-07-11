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
[常见错误和陷阱](#mistakes)

“文档注释”是指紧接在顶层包、常量、函数、类型和变量声明之前，且中间没有空行的注释。每个导出（首字母大写）的名称都应该有一个文档注释。

[go/doc](/pkg/go/doc) 和 [go/doc/comment](/pkg/go/doc/comment) 包提供了从 Go 源代码中提取文档的功能，各种工具都利用了这一功能。[`go` `doc`](/cmd/go#hdr-Show_documentation_for_package_or_symbol) 命令用于查找并打印给定包或符号的文档注释。（符号是指顶层的常量、函数、类型或变量。）Web 服务器 [pkg.go.dev](https://pkg.go.dev/) 展示了公开 Go 包的文档（如果其许可证允许的话）。服务于该网站的程序是 [golang.org/x/pkgsite/cmd/pkgsite](https://pkg.go.dev/golang.org/x/pkgsite/cmd/pkgsite)，它也可以在本地运行，以在没有互联网连接的情况下查看私有模块的文档。语言服务器 [gopls](https://pkg.go.dev/golang.org/x/tools/gopls) 在 IDE 中编辑 Go 源文件时提供文档支持。

本页的其余部分将介绍如何编写 Go 文档注释。

## 包 {#package}

每个包都应该有一个介绍该包的包注释。它提供与整个包相关的信息，并通常设定对包的期望。特别是在大型包中，包注释可以简要概述 API 最重要的部分，并根据需要链接到其他文档注释，这会很有帮助。

如果包很简单，包注释可以很简短。例如：

	// Package path 实现了用于操作斜杠分隔路径的实用程序。
	//
	// path 包应仅用于由正斜杠分隔的路径，例如 URL 中的路径。此包不处理带有驱动器盘符或反斜杠的 Windows 路径；要操作操作系统路径，请使用 [path/filepath] 包。
	package path

`[path/filepath]` 中的方括号会创建一个[文档链接](#links)。

正如在此示例中看到的，Go 文档注释使用完整的句子。对于包注释，这意味着[第一句话](/pkg/go/doc/#Package.Synopsis)以 “Package <名称>” 开头。

对于多文件包，包注释应只出现在一个源文件中。如果多个文件都有包注释，它们将被连接起来，形成整个包的一个大注释。

## 命令 {#cmd}

命令的包注释类似，但它描述的是程序的行为，而不是包中的 Go 符号。第一句话通常以程序本身的名称开头，因为它位于句首所以大写。例如，这里是 [gofmt](/cmd/gofmt) 的包注释的简略版本：

	/*
	Gofmt 格式化 Go 程序。
	它使用制表符进行缩进，使用空格进行对齐。
	对齐假设编辑器使用的是等宽字体。

	在没有指定明确路径的情况下，它会处理标准输入。如果给定一个文件，它会操作该文件；如果给定一个目录，它会递归地操作该目录中的所有 .go 文件。（忽略以点开头的文件。）默认情况下，gofmt 将重新格式化的源代码打印到标准输出。

	用法：

		gofmt [flags] [path ...]

	标志包括：

		-d
			不要将重新格式化的源代码打印到标准输出。
			如果文件的格式与 gofmt 的不同，则将差异打印到标准输出。
		-w
			不要将重新格式化的源代码打印到标准输出。
			如果文件的格式与 gofmt 的不同，则用 gofmt 的版本覆盖它。如果在覆盖过程中发生错误，则从自动备份中恢复原始文件。

	当 gofmt 从标准输入读取时，它接受一个完整的 Go 程序或一个程序片段。程序片段必须是语法有效的声明列表、语句列表或表达式。在格式化此类片段时，gofmt 会保留前导缩进以及前导和尾随空格，以便 Go 程序的各个部分可以通过管道传输到 gofmt 来格式化。
	*/
	package main

注释的开头使用[语义换行符](https://rhodesmill.org/brandon/2012/one-sentence-per-line/)编写，其中每个新的句子或长短语都独占一行，这可以使代码和注释演变时的差异更易读。后面的段落碰巧没有遵循这个约定，是手动换行的。选择最适合您代码库的方式即可。无论哪种方式，`go` `doc` 和 `pkgsite` 在打印时都会重新换行文档注释文本。例如：

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

缩进的行被视为预格式化文本：它们不会被重新换行，并且在 HTML 和 Markdown 演示中以代码字体显示。（下面的[语法](#syntax)部分给出了详细信息。）

## 类型 {#type}

类型的文档注释应解释该类型的每个实例代表或提供什么。如果 API 很简单，文档注释可以非常简短。例如：

	package zip// Reader 用于提供来自 ZIP 归档的内容。
	type Reader struct {
		...
	}

默认情况下，程序员应期望某个类型在同一时间只能由单个 goroutine（协程）安全使用。
如果某个类型提供了更强的保证，其文档注释应予以说明。例如：

	package regexp

	// Regexp 是已编译正则表达式的表示。
	// Regexp 可安全地由多个 goroutine（协程）并发使用，
	// 但配置方法（如 Longest）除外。
	type Regexp struct {
		...
	}

Go 的类型还应致力于使零值具有实用意义。
若其意义并非显而易见，则应加以文档说明。例如：

	package bytes

	// Buffer 是一个具有可变大小、支持 Read 和 Write 方法的字节缓冲区。
	// Buffer 的零值是一个即用型的空缓冲区。
	type Buffer struct {
		...
	}

对于具有导出字段的结构体，文档注释或逐字段注释应解释每个导出字段的含义。
例如，此类型的文档注释解释了各个字段：

{{raw `
	package io

	// LimitedReader 从 R 读取数据，但将返回的数据量限制为 N 字节。
	// 每次调用 Read 都会更新 N 以反映剩余的数据量。
	// 当 N <= 0 时，Read 返回 EOF。
	type LimitedReader struct {
		R   Reader // 底层读取器
		N   int64  // 剩余最大字节数
	}
`}}

与此相反，此类型的文档注释将解释留给了逐字段注释：

{{raw `
	package comment

	// Printer 是一个文档注释打印机。
	// 可在调用任何打印方法之前填充结构体中的字段，
	// 以定制打印过程的细节。
	type Printer struct {
		// HeadingLevel 是用于 HTML 和 Markdown 标题的嵌套级别。
		// 如果 HeadingLevel 为零，则默认为级别 3，
		// 即使用 <h3> 和 ###。
		HeadingLevel int
		...
	}
`}}

与包（见上文）和函数（见下文）一样，类型的文档注释
应以命名已声明符号的完整句子开头。
明确的主语通常能使措辞更清晰，
并且使文本更易于搜索，无论是在网页上还是命令行中。
例如：

	$ go doc -all regexp | grep pairs
	pairs within the input string: result[2*n:2*n+2] identifies the indexes
	    FindReaderSubmatchIndex returns a slice holding the index pairs identifying
	    FindStringSubmatchIndex returns a slice holding the index pairs identifying
	    FindSubmatchIndex returns a slice holding the index pairs identifying the
	$

## 函数 {#func}

函数的文档注释应解释函数返回什么，或者
对于因副作用而被调用的函数，则应解释其行为。
命名参数和结果可以直接在注释中提及，
无需使用反引号等特殊语法。
（此约定的一个后果是，像 `a` 这样的名称，
如果可能被误认为普通单词，通常会被避免。）例如：

	package strconv

	// Quote 返回一个表示 s 的带双引号的 Go 字符串字面量。
	// 返回的字符串使用 Go 转义序列（\t, \n, \xFF, \u0100）
	// 来表示控制字符和由 IsPrint 定义的非打印字符。
	func Quote(s string) string {
		...
	}

以及：

	package os

	// Exit 导致当前程序以给定的状态码退出。
	// 惯例上，代码零表示成功，非零表示错误。
	// 程序立即终止；延迟函数不会运行。
	//
	// 为保证可移植性，状态码应在 [0, 125] 范围内。
	func Exit(code int) {
		...
	}

文档注释通常使用“报告是否”这一短语
来描述返回布尔值的函数。“或不”一词是不必要的。
例如：

	package strings

	// HasPrefix 报告字符串 s 是否以 prefix 开头。
	func HasPrefix(s, prefix string) bool

如果文档注释需要解释多个结果，
为结果命名可以使文档注释更易于理解，
即使这些名称在函数体中未被使用。
例如：

	package io

	// Copy 从 src 复制数据到 dst，直到在 src 上遇到 EOF
	// 或发生错误。它返回写入的字节总数
	// 以及在复制过程中遇到的第一个错误（如果有）。
	//
	// 成功的 Copy 返回 err == nil，而非 err == EOF。
	// 因为 Copy 被定义为从 src 读取直到 EOF，所以它
	// 不会将来自 Read 的 EOF 视为需要报告的错误。
	func Copy(dst Writer, src Reader) (n int64, err error) {
		...
	}

相反，当结果无需在文档注释中命名时，
它们通常也会在代码中被省略，如上面的 `Quote` 示例所示，
以避免混淆。

这些规则既适用于普通函数，也适用于方法。
对于方法，使用相同的接收器名称可以避免在列出类型的所有方法时
出现不必要的变化：

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

此示例还表明，返回类型 `T` 或指针 `*T` 的顶层函数
（可能带有额外的错误结果）会显示在类型 `T` 及其方法旁边，
前提是它们被视为 `T` 的构造函数。

默认情况下，程序员可以假设顶层函数
从多个 goroutine（协程）调用是安全的；
此事实无需明确说明。另一方面，如上一节所述，
以任何方式使用某个类型的实例（包括调用方法），
通常被假定为同时只能由一个 goroutine（协程）进行操作。
如果某个类型对于并发使用安全的方法未在类型文档注释中说明，
则应在各方法的独立注释中进行文档说明。
例如：

	package sql

	// Close 将连接归还至连接池。
	// Close 之后的所有操作都将返回 ErrConnDone。
	// Close 可与其他操作并发调用，且将阻塞直至所有其他操作完成。
	// 通常建议先取消所有使用的 context，然后直接调用 Close。
	func (c *Conn) Close() error {
		...
	}

请注意，函数和方法的文档注释应侧重于
操作的返回结果或执行效果，
详述调用者需要了解的内容。
特殊情况的说明尤为重要。
例如：

{{raw `
	package math

	// Sqrt 返回 x 的平方根。
	//
	// 特殊情况包括：
	//
	//	Sqrt(+Inf) = +Inf
	//	Sqrt(±0) = ±0
	//	Sqrt(x < 0) = NaN
	//	Sqrt(NaN) = NaN
	func Sqrt(x float64) float64 {
		...
	}
`}}

文档注释不应解释内部实现细节
（例如当前使用的算法）。
这些内容应留存在函数体内的注释中。
当渐近时间复杂度或空间复杂度
对调用者特别重要时，
可以在文档注释中说明。
例如：

	package sort

	// Sort 根据 Less 方法确定的顺序对数据进行升序排序。
	// 函数会调用一次 data.Len 以确定 n，并调用 O(n*log(n)) 次
	// data.Less 和 data.Swap。该排序不保证稳定性。
	func Sort(data Interface) {
		...
	}

由于该文档注释未指明具体使用的排序算法，
因此后续将实现更改为其他算法会更加容易。

## Consts {#const}

Go 的声明语法允许声明分组，
此时单个文档注释可以介绍一组相关常量，
各常量仅通过行末简短注释进行说明。
例如：

	package scanner // import "text/scanner"

	// Scan 的结果为以下词元或 Unicode 字符之一。
	const (
		EOF = -(iota + 1)
		Ident
		Int
		Float
		Char
		...
	)

有时分组根本不需要文档注释。例如：

	package unicode // import "unicode"

	const (
		MaxRune         = '\U0010FFFF' // 有效的最大 Unicode 码点。
		ReplacementChar = '\uFFFD'     // 表示无效码点。
		MaxASCII        = '\u007F'     // 最大 ASCII 值。
		MaxLatin1       = '\u00FF'     // 最大 Latin-1 值。
	)

另一方面，未分组的常量通常需要以完整句子开头的
完整文档注释。例如：

	package unicode

	// Version 是生成字符表所依据的 Unicode 版本。
	const Version = "13.0.0"

类型化常量会显示在其类型声明旁边，
因此通常省略常量分组的文档注释，
而依赖类型的文档注释。
例如：

	package syntax

	// Op 是单个正则表达式运算符。
	type Op uint8

	const (
		OpNoMatch        Op = 1 + iota // 不匹配任何字符串
		OpEmptyMatch                   // 匹配空字符串
		OpLiteral                      // 匹配符文序列
		OpCharClass                    // 匹配解释为范围对列表的符文
		OpAnyCharNotNL                 // 匹配除换行符外的任意字符
		...
	)

（HTML 展示效果参见 [pkg.go.dev/regexp/syntax#Op](https://pkg.go.dev/regexp/syntax#Op)）

## Vars {#var}

变量的约定与常量相同。
例如，以下是一组分组变量：

	package fs

	// 通用文件系统错误。
	// 文件系统返回的错误可通过 errors.Is 与这些错误进行比对。
	var (
		ErrInvalid    = errInvalid()    // "无效参数"
		ErrPermission = errPermission() // "权限不足"
		ErrExist      = errExist()      // "文件已存在"
		ErrNotExist   = errNotExist()   // "文件不存在"
		ErrClosed     = errClosed()     // "文件已关闭"
	)

以及一个单独的变量：

	package unicode

	// Scripts 是 Unicode 脚本字符表的集合。
	var Scripts = map[string]*RangeTable{
		"Adlam":                  Adlam,
		"Ahom":                   Ahom,
		"Anatolian_Hieroglyphs":  Anatolian_Hieroglyphs,
		"Arabic":                 Arabic,
		"Armenian":               Armenian,
		...
	}

## Syntax {#syntax}

Go 文档注释采用简洁的语法编写，支持
段落、标题、链接、列表和预格式化代码块。
为保持源代码中注释的轻量级和可读性，
不支持字体更改或原始 HTML 等复杂特性。
Markdown 爱好者可将该语法视为 Markdown 的简化子集。

标准格式化工具 [gofmt](/cmd/gofmt) 会对文档注释重新格式化，
使其采用每种特性的规范格式。
gofmt 旨在提升可读性，并允许用户控制注释在源代码中的编写方式，
但会调整呈现形式以更清晰地表达特定注释的语义，
类似于在普通源代码中将 `1+2 * 3` 重新格式化为 `1 + 2*3`。

gofmt 会删除文档注释首尾的空行。
如果文档注释中所有行都以相同的空格和制表符序列开头，
gofmt 将删除该前缀。

### Paragraphs {#paragraphs}

段落是由连续非缩进非空行组成的文本区域。
我们已经看到了许多段落的示例。

连续的两个反引号（\` U+0060）会被解释为 Unicode 左双引号（“ U+201C），
连续的两个单引号（\' U+0027）会被解释为 Unicode 右双引号（” U+201D）。Gofmt 保留段落文本中的换行符：它不会重新排版文本。
这允许使用[语义换行](https://rhodesmill.org/brandon/2012/one-sentence-per-line/)，
如前所述。
Gofmt 将段落之间重复的空白行替换为单个空白行。
Gofmt 还会重新格式化连续的反引号或单引号，
将其转换为相应的 Unicode 字符。

#### 注解 {#notes}

注解是形式为 `MARKER(uid): body` 的特殊注释。
MARKER 应由 2 个或更多大写字母 `[A-Z]` 组成，
用于标识注解类型，而 uid 至少为 1 个字符，
通常是可以提供更多信息的人员的用户名。
uid 后面的 `:` 是可选的。

注解会被收集并在 pkg.go.dev 上单独的一个部分中进行渲染。

例如：

	// TODO(user1): 重构以使用标准库的 context
	// BUG(user2): 未清理
	var ctx context.Context

#### 弃用声明 {#deprecations}

以 `Deprecated: ` 开头的段落被视为弃用声明。
一些工具会在使用被弃用的标识符时发出警告。
[pkg.go.dev](https://pkg.go.dev) 默认会隐藏其文档。

弃用声明后通常会提供一些关于弃用的信息，
以及关于推荐使用什么替代方案的建议（如果适用）。
该段落不一定是文档注释中的最后一个段落。

例如：

	// Package rc4 实现了 RC4 流密码。
	//
	// Deprecated: RC4 在密码学上已被破解，不应使用，
	// 除非是为了与遗留系统兼容。
	//
	// 此包已冻结，不会添加新功能。
	package rc4

	// Reset 将密钥数据置零，并使 Cipher 不可用。
	//
	// Deprecated: Reset 无法保证密钥会完全从
	// 进程内存中移除。
	func (c *Cipher) Reset()

### 标题 {#headings}

标题是以井号 (U+0023) 开头，后跟一个空格和标题文本的行。
要被识别为标题，该行必须是无缩进的，
并且通过空白行与相邻的段落文本分隔开。

例如：

	// Package strconv 实现了基本数据类型与字符串表示之间的转换。
	//
	// # 数字转换
	//
	// 最常见的数字转换是 [Atoi]（字符串转整数）和 [Itoa]（整数转字符串）。
	...
	package strconv

另一方面：

	// #这不是标题，因为没有空格。
	//
	// # 这不是标题，
	// # 因为它是多行的。
	//
	// # 这不是标题，
	// 因为它也是多行的。
	//
	// 下一个段落不是标题，因为后面没有额外的文本：
	//
	// #
	//
	// 在连续的非空行中间，
	// # 这也不是标题。
	//
	//     # 这不是标题，因为它是缩进的。

`#` 语法是在 Go 1.19 中添加的。
在 Go 1.19 之前，标题是隐式地通过满足某些条件的单行段落来标识的，
最显著的是没有终止标点符号。

Gofmt 会将早期 Go 版本中[被视为隐式标题的行](https://github.com/golang/proposal/blob/master/design/51082-godocfmt.md#headings)重新格式化为使用 `#` 标题。
如果重新格式化不合适——也就是说，如果该行并非本意是标题——
最简单的修复方法是引入终止标点符号，
例如句号或冒号，或者将其拆分为两行。

### 链接 {#links}

一段连续的、无缩进的非空行，
当每一行都符合 “[文本]: URL” 形式时，
会定义链接目标。
在同一文档注释的其他文本中，
“[文本]” 表示一个使用给定文本指向 URL 的链接——在 HTML 中，
即 \<a href="URL">文本\</a>。
例如：

	// Package json 实现了 [RFC 7159] 中定义的 JSON 的编码和解码。
	// JSON 和 Go 值之间的映射在 Marshal 和 Unmarshal 函数的
	// 文档中有所描述。
	//
	// 关于此包的介绍，请参阅文章
	// “[JSON and Go]”。
	//
	// [RFC 7159]: https://tools.ietf.org/html/rfc7159
	// [JSON and Go]: https://golang.org/doc/articles/json_and_go.html
	package json

通过将 URL 放在单独的部分中，
这种格式对实际文本流的干扰最小。
它也大致符合 Markdown
[快捷引用链接格式](https://spec.commonmark.org/0.30/#shortcut-reference-link)，
但省略了可选的标题文本。

如果没有对应的 URL 声明，
那么（除了下一节描述的文档链接）
“[文本]” 不是超链接，并且在显示时会保留方括号。
每个文档注释是独立考虑的：
一个注释中的链接目标定义不影响其他注释。

尽管链接目标定义块可能与普通段落交错，
但 gofmt 会将所有链接目标定义移动到文档注释的末尾，
最多分为两个块：第一个块包含注释中引用的所有链接目标，
第二个块包含所有未被引用的目标。
单独的块使得未使用的目标容易被发现和修复（例如链接或定义有拼写错误），
或者被删除（例如定义不再需要）。

在 HTML 渲染中，被识别为 URL 的纯文本会自动被转换为链接。

### 文档链接 {#doclinks}

文档链接是形式为 “[Name1]” 或 “[Name1.Name2]” 的链接，
用于引用当前包中的导出标识符，
或者形式为 “[pkg]”、 “[pkg.Name1]” 或 “[pkg.Name1.Name2]” 的链接，
用于引用其他包中的标识符。

例如：

	package bytes

	// ReadFrom 从 r 读取数据直到 EOF，并将其追加到缓冲区，
	// 根据需要增长缓冲区。返回值 n 是读取的字节数。
	// 读取期间遇到的任何错误（[io.EOF] 除外）也会返回。
	// 如果缓冲区变得太大，ReadFrom 将会 panic 并显示 [ErrTooLarge]。
	func (b *Buffer) ReadFrom(r io.Reader) (n int64, err error) {
		...
	}符号链接的方括号内文本  
可以包含可选的前导星号，便于引用指针类型，例如 \[\*bytes.Buffer\]。

当引用其他包时，“pkg”可以是完整的导入路径  
或现有导入的假定包名。假定包名  
要么是重命名导入中的标识符，要么  
是[goimports 假定的名称](https://pkg.go.dev/golang.org/x/tools/internal/imports#ImportPathToAssumedName)。  
（当该假定不正确时，goimports 会插入重命名，因此  
该规则应适用于几乎所有 Go 代码。）  
例如，如果当前包导入了 encoding/json，  
那么可以写“[json.Decoder]”代替“[encoding/json.Decoder]”  
来链接到 encoding/json 的 Decoder 的文档。  
如果包中的不同源文件使用相同名称导入不同的包，  
那么该简写就会有歧义，不能使用。

只有当“pkg”以域名（包含点的路径元素）开头  
或属于标准库中的包（“[os]”、“[encoding/json]”等）时，  
才会被假定为完整的导入路径。  
例如，`[os.File]` 和 `[example.com/sys.File]` 是文档链接  
（后者将是断开的链接），  
但 `[os/sys.File]` 不是，因为标准库中没有 os/sys 包。

为避免与 map、泛型和数组类型相关的问题，  
文档链接的前后必须是标点符号、空格、制表符或行的开头或结尾。  
例如，文本“map[ast.Expr]TypeAndValue”不包含  
文档链接。

### 列表 {#lists}

列表是一段缩进或空行  
（否则将是代码块，如下一节所述），  
其中第一行缩进行以  
项目符号列表标记或编号列表标记开头。

项目符号列表标记是星号、加号、短划线或 Unicode 项目符号  
（\*、+、-、•；U+002A、U+002B、U+002D、U+2022）  
后跟空格或制表符，然后是文本。  
在项目符号列表中，以项目符号列表  
标记开头的每一行都会开始一个新列表项。

例如：

	package url

	// PublicSuffixList 提供了域名的公共后缀。例如：
	//   - "example.com" 的公共后缀是 "com"，
	//   - "foo1.foo2.foo3.co.uk" 的公共后缀是 "co.uk"，以及
	//   - "bar.pvt.k12.ma.us" 的公共后缀是 "pvt.k12.ma.us"。
	//
	// PublicSuffixList 的实现必须保证多个 goroutine 并发使用的安全性。
	//
	// 一个始终返回 "" 的实现是有效的，可能对测试有用，但它是不安全的：
	// 这意味着 foo.com 的 HTTP 服务器可以为 bar.com 设置 cookie。
	//
	// 公共后缀列表的实现在包
	// golang.org/x/net/publicsuffix 中。
	type PublicSuffixList interface {
		...
	}

编号列表标记是任意长度的十进制数  
后跟句点或右括号，然后是空格或制表符，最后是文本。  
在编号列表中，以数字列表标记开头的每一行都会开始一个新列表项。  
项目编号按原样保留，永远不会重新编号。

例如：

	package path

	// Clean 返回通过纯词法处理等效于 path 的最短路径名。
	// 它迭代地应用以下规则，直到无法进一步处理：
	//
	//  1. 将多个斜杠替换为单个斜杠。
	//  2. 消除每个 . 路径名元素（当前目录）。
	//  3. 消除每个内部的 .. 路径名元素（父目录）及其前面的非 .. 元素。
	//  4. 消除以根路径开头的 .. 元素：
	//     即在路径开头用 "/" 替换 "/.."。
	//
	// 返回的路径仅在它是根 "/" 时才以斜杠结尾。
	//
	// 如果此过程的结果是空字符串，Clean
	// 返回字符串 "."。
	//
	// 另请参阅 Rob Pike 的“[Plan 9 中的词法文件名]”。
	//
	// [Plan 9 中的词法文件名]: https://9p.io/sys/doc/lexnames.html
	func Clean(path string) string {
		...
	}

列表项只包含段落，不包含代码块或嵌套列表。  
这避免了任何空格计数的细微差别，以及关于  
在缩进不一致的情况下制表符算作多少空格的问题。

Gofmt 会将项目符号列表重新格式化为使用短划线作为项目符号标记，  
短划线前有两个空格的缩进，  
续行有四个空格的缩进。

Gofmt 会将编号列表重新格式化为数字前使用一个空格，  
数字后使用句点，并且续行  
再次使用四个空格的缩进。

Gofmt 会保留但不要求列表与前面段落之间的空行。  
它会在列表与后续段落或标题之间插入一个空行。

### 代码块 {#code}

代码块是一段缩进或空行，  
不以项目符号列表标记或编号列表标记开头。  
它被渲染为预格式化文本（HTML 中的 \<pre> 块）。

代码块通常包含 Go 代码。例如：

{{raw `
	package sort

	// Search 使用二分搜索...
	//
	// 作为一个更有趣的例子，这个程序猜你的数字：
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

当然，代码块也经常包含代码之外的预格式化文本。例如：

{{raw `
	package pathMatch 函数判断 name 是否与 shell 模式匹配。
模式语法如下：

    模式：
        { 项 }
    项：
        '*'         匹配任意数量的非 '/' 字符
        '?'         匹配任意单个非 '/' 字符
        '[' [ '^' ] { 字符范围 } ']'
                    字符类（必须非空）
        c           匹配字符 c（c != '*', '?', '\\', '['）
        '\\' c      匹配字符 c

    字符范围：
        c           匹配字符 c（c != '\\', '-', ']')
        '\\' c      匹配字符 c
        lo '-' hi   匹配字符 c，满足 lo <= c <= hi

Match 要求模式完全匹配整个 name，而非仅匹配子串。
唯一可能返回的错误是 [ErrBadPattern]，当模式格式错误时出现。

    func Match(pattern, name string) (matched bool, err error) {
        ...
    }
```

Gofmt 会使用单个制表符缩进代码块中的所有行，替换掉所有非空行共有的其他缩进。
Gofmt 还会在每个代码块前后插入空行，将其与周围段落文本清晰区分开。

### 指令 {#directives}

指令注释（如 `//go:generate`）不被视为文档注释的一部分，并且会在渲染的文档中被省略。
Gofmt 会将指令注释移至文档注释的末尾，并在其前面添加一个空行。
例如：

    package regexp

    // Op 是单个正则表达式运算符。
    //
    //go:generate stringer -type Op -trimprefix Op
    type Op uint8

指令注释是匹配正则表达式 `//(line |extern |export |[a-z0-9]+:[a-z0-9])` 的行。

工具可以使用 `//toolname:directive arguments` 的形式定义它们自己的指令注释。
工具指令匹配正则表达式 `//([a-z0-9]+):([a-z0-9]\PZ*)($|\pZ+)(.*)`，其中第一组是工具名，第二组是指令名。
可选参数与指令名之间通过一个或多个 Unicode 空白字符分隔。
每个工具可以定义自己的参数语法，但一个常见惯例是使用一系列以空格分隔的参数，其中参数可以是裸词，或者是双引号或反引号括起来的 Go 字符串。
工具名 `go` 是保留给 Go 工具链使用的。

[`go/ast.ParseDirective`](/pkg/go/ast#ParseDirective) 函数及其相关类型解析工具指令的语法。

## 常见错误与陷阱 {#mistakes}

在文档注释中，任何缩进或空白行跨度都会被渲染为代码块的规则，可以追溯到 Go 语言的早期。
不幸的是，gofmt 缺乏对文档注释的支持，导致许多现有注释在无意中使用了缩进，从而形成了代码块。

例如，这个无缩进的列表始终被 godoc 解释为一个三行段落，后面跟一个单行代码块：

    package http

    // cancelTimerBody 是一个包装了 rc 的 io.ReadCloser，具有两个特性：
    // 1) 读取出错或关闭时，会调用 stop func。
    // 2) 读取失败时，如果 reqDidTimeout 为 true，则错误会被包装并标记为超时的 net.Error。
    type cancelTimerBody struct {
        ...
    }

这在 `go` `doc` 中始终渲染为：

    cancelTimerBody 是一个包装了 rc 的 io.ReadCloser，具有两个特性：
    1) 读取出错或关闭时，会调用 stop func。 2) 读取失败时，如果 reqDidTimeout 为 true，错误会被包装并

        标记为超时的 net.Error。

类似地，此注释中的命令是一个单行段落，后面跟一个单行代码块：

    package smtp

    // localhostCert 是一个 PEM 编码的 TLS 证书，由 src/crypto/tls 生成：
    //
    // go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \
    //     --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h
    var localhostCert = []byte(`...`)

这在 `go` `doc` 中渲染为：

    localhostCert 是一个 PEM 编码的 TLS 证书，由 src/crypto/tls 生成：

    go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \

        --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h

而此注释是一个两行段落（第二行是 “{”），后面跟一个六行缩进的代码块和一个单行段落（“}”）。

    // 在网络传输中，JSON 看起来大致如下：
    // {
    //	"kind":"MyAPIObject",
    //	"apiVersion":"v1",
    //	"myPlugin": {
    //		"kind":"PluginA",
    //		"aOption":"foo",
    //	},
    // }

这在 `go` `doc` 中渲染为：

    在网络传输中，JSON 看起来大致如下： {

        "kind":"MyAPIObject",
        "apiVersion":"v1",
        "myPlugin": {
        	"kind":"PluginA",
        	"aOption":"foo",
        },

    }

另一个常见错误是未缩进的 Go 函数定义或块语句，同样由 “{” 和 “}” 括起来。

在 Go 1.19 的 gofmt 中引入的文档注释重新格式化功能，通过在代码块周围添加空行，使这类错误更加明显。

2022 年的分析发现，在公共 Go 模块中，只有 3% 的文档注释被 Go 1.19 版本的 gofmt 草案重新格式化。
如果我们仅关注这些注释，那么大约 87% 的 gofmt 重新格式化操作保留了人们阅读注释时会推断出的结构；大约 6% 的操作则被这类未缩进的列表、未缩进的多行 shell 命令以及未缩进的大括号分隔代码块所误导。

基于此分析，Go 1.19 的 gofmt 应用了一些启发式规则，将未缩进的行合并到相邻的缩进列表或代码块中。
经过这些调整后，Go 1.19 的 gofmt 将上述示例重新格式化为：

    // cancelTimerBody 是一个包装了 rc 的 io.ReadCloser，具有两个特性：
    //  1. 读取出错或关闭时，会调用 stop func。
    //  2. 读取失败时，如果 reqDidTimeout 为 true，错误会被包装并
    //     标记为超时的 net.Error。// localhostCert 是从 src/crypto/tls 生成的 PEM 编码 TLS 证书：
//
//	go run generate_cert.go --rsa-bits 1024 --host 127.0.0.1,::1,example.com \
//	    --ca --start-date "Jan 1 00:00:00 1970" --duration=1000000h

// 在传输线上，JSON 数据看起来大致如下：
//
//	{
//		"kind":"MyAPIObject",
//		"apiVersion":"v1",
//		"myPlugin": {
//			"kind":"PluginA",
//			"aOption":"foo",
//		},
//	}

这种重新格式化不仅使含义更清晰，还能确保文档注释在早期版本的 Go 中正确渲染。
如果启发式规则做出了错误判断，可以通过插入空行来明确分隔段落文本与非段落文本，从而覆盖其决定。

即使有这些启发式规则，其他现有注释仍需手动调整以纠正其渲染效果。
最常见的错误是缩进了换行的未缩进文本行。例如：

	// TODO 重新审视此设计。遍历这些节点
	//      可能更合理。

	// 根据文档：
	// "用于对齐镜像文件中各节原始数据的对齐因子（以字节为单位）。
	//  其值应为 512 到 64 K 之间的 2 的幂（含两端）。"

在以上两个示例中，最后一行被缩进，从而使其成为代码块。
解决方法是取消这些行的缩进。

另一个常见错误是未缩进列表或代码块中换行的已缩进行。例如：

	// 此错误模型的用途包括：
	//
	//   - 部分错误。如果服务需要向客户端返回部分错误，
	// client,
	//     它可以将 `Status` 嵌入正常响应以指示部分
	// partial
	//     错误。
	//
	//   - 工作流错误。典型的工作流有多个步骤。每个步骤
	// may
	//     有一个 `Status` 消息用于错误报告。

解决方法是缩进换行的行。

Go 文档注释不支持嵌套列表，因此 gofmt 会将

	// 这是一个列表：
	//
	//  - Item 1.
	//    * Subitem 1.
	//    * Subitem 2.
	//  - Item 2.
	//  - Item 3.

重新格式化为

	// 这是一个列表：
	//
	//  - Item 1.
	//  - Subitem 1.
	//  - Subitem 2.
	//  - Item 2.
	//  - Item 3.

重写文本以避免嵌套列表通常能改善文档质量，这是最佳解决方案。
另一种潜在的解决方法是混合使用列表标记，
因为项目符号标记不会在编号列表中引入列表项，反之亦然。
例如：

	// 这是一个列表：
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