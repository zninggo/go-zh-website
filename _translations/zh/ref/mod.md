<!--{
  "Template": true,
  "Title": "Go 模块参考"
}-->
<!-- TODO(golang.org/issue/33637): 编写专注于特定模块主题和任务的“指南”文章。届时将链接到这些文章，而非可能长期不更新的博客文章。 -->

## 引言 {#introduction}

模块是 Go 管理依赖的方式。

本文档是 Go 模块系统的详细参考手册。有关创建 Go 项目的入门介绍，请参阅 [如何编写 Go 代码](/doc/code.html)。关于使用模块、将项目迁移到模块以及其他主题的信息，请参阅以 [使用 Go 模块](/blog/using-go-modules) 开头的博客系列。

## 模块、包和版本 {#modules-overview}

<dfn>模块</dfn>是一组一起发布、进行版本控制和分发的包的集合。模块可以直接从版本控制仓库或模块代理服务器下载。

模块由一个[模块路径](#glos-module-path)标识，该路径在 [`go.mod` 文件](#go-mod-file)中声明，并包含有关该模块依赖关系的信息。<dfn>模块根目录</dfn>是包含 `go.mod` 文件的目录。<dfn>主模块</dfn>是包含运行 `go` 命令时所在目录的模块。

模块中的每个<dfn>包</dfn>是同一目录中一组一起编译的源文件的集合。<dfn>包路径</dfn>是模块路径与包含该包的子目录（相对于模块根目录）的连接。例如，模块 `"golang.org/x/net"` 包含一个位于目录 `"html"` 中的包。该包的路径就是 `"golang.org/x/net/html"`。

### 模块路径 {#module-path}

<dfn>模块路径</dfn>是模块的规范名称，在模块的 [`go.mod` 文件](#glos-go-mod-file)中通过 [`module` 指令](#go-mod-file-module)声明。模块路径是该模块内所有包路径的前缀。

模块路径应描述模块的功能和查找位置。通常，模块路径由仓库根路径、仓库内的目录（通常为空）和主版本后缀（仅适用于主版本 2 或更高版本）组成。

* <dfn>仓库根路径</dfn>是模块路径中与模块开发所在的版本控制仓库根目录相对应的部分。大多数模块定义在其仓库的根目录中，因此这通常是整个路径。例如，`golang.org/x/net` 就是同名模块的仓库根路径。有关 `go` 命令如何通过 HTTP 请求（基于模块路径派生）定位仓库的信息，请参阅[为模块路径查找仓库](#vcs-find)。
* 如果模块不是定义在仓库的根目录中，则<dfn>模块子目录</dfn>是模块路径中命名该目录的部分，不包括主版本后缀。这部分也用作语义化版本标签的前缀。例如，模块 `golang.org/x/tools/gopls` 位于根路径为 `golang.org/x/tools` 的仓库中的 `gopls` 子目录下，因此其模块子目录是 `gopls`。请参阅[将版本映射到提交](#vcs-version)和[仓库内的模块目录](#vcs-dir)。
* 如果模块在主版本 2 或更高版本发布，则其模块路径必须以像 `/v2` 这样的[主版本后缀](#major-version-suffixes)结尾。这部分可能属于子目录名称的一部分，也可能不属于。例如，路径为 `golang.org/x/repo/sub/v2` 的模块可能位于仓库 `golang.org/x/repo` 的 `/sub` 或 `/sub/v2` 子目录中。

如果一个模块可能被其他模块依赖，则必须遵循这些规则，以便 `go` 命令能够找到并下载该模块。模块路径允许的字符还有几项[词法限制](#go-mod-file-ident)。

一个永远不会作为任何其他模块的依赖项被获取的模块，可以使用任何有效的包路径作为其模块路径，但必须注意不要与该模块的依赖项或 Go 标准库可能使用的路径发生冲突。Go 标准库使用的包路径在第一个路径元素中不包含点号，并且 `go` 命令不会尝试从网络服务器解析此类路径。路径 `example` 和 `test` 是保留给用户的：它们不会在标准库中使用，适合用于自包含的模块，例如教程或示例代码中定义的模块，或作为测试的一部分创建和操作的模块。

### 版本 {#versions}

<dfn>版本</dfn>标识模块的一个不可变快照，可以是[发布版本](#glos-release-version)或[预发布版本](#glos-pre-release-version)。每个版本都以字母 `v` 开头，后跟一个语义化版本。有关版本的格式、解释和比较的详细信息，请参阅[语义化版本 2.0.0](https://semver.org/spec/v2.0.0.html)。

总结一下，语义化版本由三个由点号分隔的非负整数组成（从左到右依次为主版本号、次版本号和修订版本号）。修订版本号后面可以跟一个可选的、以连字符开头的预发布字符串。预发布字符串或修订版本号后面可以跟一个以加号开头的构建元数据字符串。例如，`v0.0.0`、`v1.12.134`、`v8.0.5-pre` 和 `v2.0.9+meta` 都是有效的版本。

版本的每个部分都指示了该版本是否稳定以及是否与先前版本兼容。* 当模块的公开接口或文档记录的功能发生向后不兼容的更改（例如移除某个包）后，[主版本号](#glos-major-version)必须递增，且次版本号和修订版本号必须置零。
* 当发生向后兼容的更改（例如添加新函数）后，[次版本号](#glos-minor-version)必须递增，且修订版本号必须置零。
* 当更改不影响模块的公开接口（例如缺陷修复或优化）时，[修订版本号](#glos-patch-version)必须递增。
* 预发布后缀表示该版本是[预发布版](#glos-pre-release-version)。预发布版本的排序优先于对应的正式发布版本。例如，`v1.2.3-pre` 排在 `v1.2.3` 之前。
* 构建元数据后缀在版本比较时会被忽略。`go` 命令接受带有构建元数据的版本，并将其转换为伪版本以维持版本间的全序关系。
  * 特殊后缀 `+incompatible` 表示该版本是在迁移至模块系统前发布的主版本 2 或更高版本（参见[与非模块仓库的兼容性](#non-module-compat)）。
  * 特殊后缀 `+dirty` 会被添加到二进制文件的版本信息中，当使用 Go 工具链 1.24 或更高版本在有效的本地版本控制系统（VCS）仓库中构建，且工作目录包含未提交的更改时。

如果版本的主版本号为 0 或带有预发布后缀，则该版本被视为不稳定版本。不稳定版本不受兼容性要求约束。例如，`v0.2.0` 可能与 `v0.1.0` 不兼容，`v1.5.0-beta` 可能与 `v1.5.0` 不兼容。

Go 可以通过标签、分支或修订版本来访问版本控制系统中的模块，即使这些标识符不符合上述约定。然而，在主模块内部，`go` 命令会自动将不符合此标准的修订版本名称转换为规范版本。作为此过程的一部分，`go` 命令还会移除构建元数据后缀（`+incompatible` 除外）。这可能会产生[伪版本](#glos-pseudo-version)——一种预发布版本，其中编码了修订版本标识符（如 Git 提交哈希）和版本控制系统的时间戳。例如，命令 `go get golang.org/x/net@daa7c041` 会将提交哈希 `daa7c041` 转换为伪版本 `v0.0.0-20191109021931-daa7c04131f5`。在主模块之外要求使用规范版本，如果 `go.mod` 文件中出现非规范版本（如 `master`），`go` 命令将报告错误。

### 伪版本 {#pseudo-versions}

<dfn>伪版本</dfn>是一种格式特殊的[预发布](#glos-pre-release-version)[版本](#glos-version)，它编码了版本控制仓库中特定修订版本的信息。例如，`v0.0.0-20191109021931-daa7c04131f5` 就是一个伪版本。

伪版本可以指向那些没有可用[语义化版本标签](#glos-semantic-version-tag)的修订版本。它们可用于在创建版本标签之前测试提交，例如在开发分支上。

每个伪版本由三个部分组成：

* 基础版本前缀（`vX.0.0` 或 `vX.Y.Z-0`），它要么源自该修订版本之前的一个语义化版本标签，要么在没有此类标签时设为 `vX.0.0`。
* 时间戳（`yyyymmddhhmmss`），即修订版本创建时的 UTC 时间。在 Git 中，这是提交时间，而非作者时间。
* 修订版本标识符（`abcdefabcdef`），它是提交哈希的 12 个字符前缀，或者在 Subversion 中，是一个补零的修订版本号。

根据基础版本的不同，每个伪版本可以是以下三种形式之一。这些形式确保伪版本在排序时高于其基础版本，但低于下一个打了标签的版本。

* `vX.0.0-yyyymmddhhmmss-abcdefabcdef` 用于没有已知基础版本的情况。与所有版本一样，主版本号 `X` 必须与模块的[主版本后缀](#glos-major-version-suffix)匹配。
* `vX.Y.Z-pre.0.yyyymmddhhmmss-abcdefabcdef` 用于基础版本是预发布版本（如 `vX.Y.Z-pre`）的情况。
* `vX.Y.(Z+1)-0.yyyymmddhhmmss-abcdefabcdef` 用于基础版本是正式发布版本（如 `vX.Y.Z`）的情况。例如，如果基础版本是 `v1.2.3`，则对应的伪版本可能是 `v1.2.4-0.20191109021931-daa7c04131f5`。

多个伪版本可能通过使用不同的基础版本指向同一个提交。当一个伪版本被写入后，又为更低的版本打上标签时，这种情况会自然发生。

这些形式赋予了伪版本两个有用的属性：

* 具有已知基础版本的伪版本在排序上高于该基础版本，但低于该基础版本之后的其他预发布版本。
* 具有相同基础版本前缀的伪版本按时间顺序排序。

`go` 命令会执行多项检查，以确保模块作者能够控制伪版本与其他版本的比较方式，并且确保伪版本所指向的修订版本确实属于该模块的提交历史。* 如果指定了基础版本，那么必须存在一个对应的语义化版本标签，且该标签是伪版本所描述修订的祖先。这可以防止开发者利用一个比所有已打标签版本都高的伪版本（例如 `v1.999.999-99999999999999-daa7c04131f5`）来绕过[最小版本选择](#glos-minimal-version-selection)规则。
* 时间戳必须与修订版本的时间戳匹配。这可以防止攻击者通过生成大量内容相同但伪版本不同的条目来对[模块代理](#glos-module-proxy)进行洪水攻击。同时也能防止模块使用者擅自改变版本的相对顺序。
* 该修订必须是模块仓库某个分支或标签的祖先。这可以防止攻击者引用未获批准的变更或拉取请求。

伪版本永远无需手动输入。许多命令接受一个提交哈希值或分支名称，并会自动将其转换为伪版本（如果存在对应的标签版本，则会转换为标签版本）。例如：```
go get example.com/mod@master
go list -m -json example.com/mod@abcd1234
```### 主版本后缀 {#major-version-suffixes}

从主版本 2 开始，模块路径必须包含与主版本匹配的 <dfn>主版本后缀</dfn>（例如 `/v2`）。例如，如果模块在 `v1.0.0` 时的路径为 `example.com/mod`，那么在 `v2.0.0` 版本时必须使用路径 `example.com/mod/v2`。

主版本后缀实现了 [<dfn>导入兼容性规则</dfn>](https://research.swtch.com/vgo-import)：

> 如果旧包和新包具有相同的导入路径，那么新包必须向后兼容旧包。

根据定义，模块新主版本中的包与旧主版本中对应的包不具有向后兼容性。因此，从 `v2` 开始，包需要新的导入路径。这通过在模块路径中添加主版本后缀来实现。由于模块路径是模块中每个包的导入路径前缀，因此为模块路径添加主版本后缀可为每个不兼容版本提供唯一的导入路径。

主版本后缀在 `v0` 或 `v1` 主版本中不允许使用。在 `v0` 和 `v1` 之间无需更改模块路径，因为 `v0` 版本不稳定且无兼容性保证。此外，对于大多数模块，`v1` 向后兼容最后一个 `v0` 版本；`v1` 版本代表了对兼容性的承诺，而非相对于 `v0` 存在不兼容的变更。

作为特例，以 `gopkg.in/` 开头的模块路径必须始终包含主版本后缀，即使在 `v0` 和 `v1` 时也是如此。后缀必须以点号而非斜杠开头（例如 `gopkg.in/yaml.v2`）。

主版本后缀允许同一构建中包含模块的多个主版本。由于[菱形依赖问题](https://research.swtch.com/vgo-import#dependency_story)，这可能是必要的。通常情况下，如果传递依赖项需要同一个模块的两个不同版本，则会使用较高版本。然而，如果两个版本不兼容，则任一版本都无法满足所有客户端需求。由于不兼容的版本必须具有不同的主版本号，因此由于主版本后缀的存在，它们也必须具有不同的模块路径。这解决了冲突：具有不同后缀的模块被视为独立模块，它们的包——即使相对于模块根目录位于相同子目录中——也是独立的。

许多 Go 项目在迁移到模块之前（可能在模块功能引入之前）就发布了 `v2` 或更高版本，且未使用主版本后缀。这些版本会标注 `+incompatible` 构建标签（例如 `v2.0.0+incompatible`）。详情请参见[与非模块仓库的兼容性](#non-module-compat)。

### 将包解析到模块 {#resolve-pkg-mod}

当 `go` 命令使用[包路径](#glos-package-path)加载包时，它需要确定哪个模块提供了该包。

`go` 命令首先搜索[构建列表](#glos-build-list)，查找路径是包路径前缀的模块。例如，如果导入了包 `example.com/a/b`，并且模块 `example.com/a` 位于构建列表中，那么 `go` 命令将检查 `example.com/a` 是否在目录 `b` 中包含该包。目录中至少需要存在一个扩展名为 `.go` 的文件才能被视为一个包。[构建约束](/pkg/go/build/#hdr-Build_Constraints)不用于此目的。如果构建列表中恰好有一个模块提供了该包，则使用该模块。如果没有模块提供该包，或者两个或多个模块提供了该包，`go` 命令将报告错误。`-mod=mod` 标志指示 `go` 命令尝试查找提供缺失包的新模块并更新 `go.mod` 和 `go.sum`。[`go get`](#go-get) 和 [`go mod tidy`](#go-mod-tidy) 命令会自动执行此操作。

<!-- 注意(golang.org/issue/27899)：如上所述，当两个或多个模块提供相同路径的包时，go 命令会报告错误。未来我们可能会尝试升级冲突模块中的一个（或全部）。
-->

当 `go` 命令为包路径查找新模块时，它会检查 `GOPROXY` 环境变量，该变量是以逗号分隔的代理 URL 列表，或关键词 `direct` 或 `off`。代理 URL 表示 `go` 命令应使用 [`GOPROXY` 协议](#goproxy-protocol)联系[模块代理](#glos-module-proxy)。`direct` 表示 `go` 命令应[与版本控制系统通信](#vcs)。`off` 表示不应尝试任何通信。`GOPRIVATE` 和 `GONOPROXY` [环境变量](#environment-variables)也可用于控制此行为。

对于 `GOPROXY` 列表中的每个条目，`go` 命令会请求可能提供该包的每个模块路径（即包路径的每个前缀）的最新版本。对于每个成功请求的模块路径，`go` 命令将下载该模块的最新版本，并检查模块是否包含所请求的包。如果一个或多个模块包含所请求的包，则使用路径最长的模块。如果找到一个或多个模块但都不包含所请求的包，则报告错误。如果未找到任何模块，`go` 命令将尝试 `GOPROXY` 列表中的下一个条目。如果没有剩余条目，则报告错误。

例如，假设 `go` 命令正在查找提供包 `golang.org/x/net/html` 的模块，并且 `GOPROXY` 设置为 `https://corp.example.com,https://proxy.golang.org`。`go` 命令可能会发出以下请求：* 请求 `https://corp.example.com/`（并行）：
  * 请求 `golang.org/x/net/html` 的最新版本
  * 请求 `golang.org/x/net` 的最新版本
  * 请求 `golang.org/x` 的最新版本
  * 请求 `golang.org` 的最新版本
* 若对 `https://corp.example.com/` 的所有请求均因 404 或 410 错误失败，则请求 `https://proxy.golang.org/`：
  * 请求 `golang.org/x/net/html` 的最新版本
  * 请求 `golang.org/x/net` 的最新版本
  * 请求 `golang.org/x` 的最新版本
  * 请求 `golang.org` 的最新版本

找到合适的模块后，`go` 命令会将新模块的路径与版本作为新的[依赖要求](#go-mod-file-require)添加到主模块的 `go.mod` 文件中。这确保了将来加载同一包时，会使用相同版本的同一模块。若解析的包未被主模块的包导入，新依赖要求会附带 `// indirect` 注释。

## `go.mod` 文件 {#go-mod-file}

模块由其根目录下名为 `go.mod` 的 UTF-8 编码文本文件定义。`go.mod` 文件采用行导向结构。每行包含一条指令，由关键字和参数组成。例如：```
module example.com/my/thing

go 1.23.0

require example.com/other/thing v1.0.2
require example.com/new/thing/v2 v2.3.4
exclude example.com/old/thing v1.2.3
replace example.com/bad/thing v1.4.5 => example.com/good/thing v1.4.5
retract [v1.9.0, v1.9.5]
```可以将相邻行的主要关键字提取出来形成代码块，正如Go语言中的import语句。```
require (
    example.com/new/thing/v2 v2.3.4
    example.com/old/thing v1.2.3
)
````go.mod` 文件设计为人类可读且机器可写。`go` 命令提供了多个可修改 `go.mod` 文件的子命令。例如，[`go get`](#go-get) 可以升级或降级特定的依赖项。当需要时，加载模块图的命令会[自动更新](#go-mod-file-updates) `go.mod`。[`go mod edit`](#go-mod-edit) 可以执行低级编辑操作。Go 程序也可以使用 [`golang.org/x/mod/modfile`](https://pkg.go.dev/golang.org/x/mod/modfile?tab=doc) 包来以编程方式进行相同的修改。

[主模块](#glos-main-module)以及通过本地文件路径指定的任何[替换模块](#go-mod-file-replace)都需要一个 `go.mod` 文件。但是，缺乏显式 `go.mod` 文件的模块仍然可以作为依赖项被[需要](#go-mod-file-require)，或者作为通过模块路径和版本指定的替换模块使用；请参阅[与非模块仓库的兼容性](#non-module-compat)。

### 词法元素 {#go-mod-file-lexical}

解析 `go.mod` 文件时，其内容会被分解为一系列词法单元（tokens）。词法单元有多种类型：空白、注释、标点符号、关键字、标识符和字符串。

*空白* 包括空格（U+0020）、制表符（U+0009）、回车符（U+000D）和换行符（U+000A）。除换行符外的空白字符除了分隔原本可能合并的词法单元外，没有其他作用。换行符是有意义的词法单元。

*注释* 以 `//` 开始，直到行尾。不允许使用 `/* */` 格式的注释。

*标点符号* 词法单元包括 `(`、`)` 和 `=>`。

*关键字* 用于区分 `go.mod` 文件中不同类型的指令。允许的关键字有 `module`、`go`、`require`、`replace`、`exclude` 和 `retract`。

*标识符* 是非空白字符的序列，例如模块路径或语义化版本号。

*字符串* 是带引号的字符序列。字符串有两种类型：以双引号（`"`，U+0022）开头和结尾的解释型字符串，以及以反引号（<code>&#x60;</code>，U+0060）开头和结尾的原始字符串。解释型字符串可以包含由反斜杠（`\`，U+005C）后跟另一个字符组成的转义序列。转义后的双引号（`\"`）不会终止解释型字符串。解释型字符串的未转义值是双引号之间的字符序列，其中每个转义序列被反斜杠后面的字符替换（例如，`\"` 被替换为 `"`，`\n` 被替换为 `n`）。相比之下，原始字符串的未转义值就是反引号之间的字符序列；反斜杠在原始字符串中没有特殊含义。

在 `go.mod` 语法中，标识符和字符串可以互换使用。

### 模块路径和版本 {#go-mod-file-ident}

`go.mod` 文件中的大多数标识符和字符串要么是模块路径，要么是版本。

模块路径必须满足以下要求：

* 路径必须由一个或多个路径元素组成，元素之间用斜杠（`/`，U+002F）分隔。不能以斜杠开头或结尾。
* 每个路径元素是一个非空字符串，由 ASCII 字母、ASCII 数字和有限的 ASCII 标点符号（`-`、`.`、`_` 和 `~`）组成。
* 路径元素不能以点（`.`，U+002E）开头或结尾。
* 第一个点之前的元素前缀在 Windows 上不能是保留的文件名，无论大小写（如 `CON`、`com1`、`NuL` 等）。
* 第一个点之前的元素前缀不能以波浪号后跟一个或多个数字结尾（如 `EXAMPL~1.COM`）。

如果模块路径出现在 `require` 指令中且未被替换，或者出现在 `replace` 指令的右侧，则 `go` 命令可能需要下载该路径下的模块，此时必须满足一些额外的要求。

* 主要路径元素（直到第一个斜杠，如果有），按惯例是一个域名，必须仅包含小写 ASCII 字母、ASCII 数字、点（`.`，U+002E）和连字符（`-`，U+002D）；它必须至少包含一个点，且不能以连字符开头。
* 对于形式为 `/vN`（其中 `N` 看起来像数字，即 ASCII 数字和点）的最终路径元素，`N` 不能以零开头，不能是 `/v1`，且不能包含任何点。
  * 对于以 `gopkg.in/` 开头的路径，此要求被替换为路径需遵循 [gopkg.in](https://gopkg.in) 服务的约定。

`go.mod` 文件中的版本可以是[规范的](#glos-canonical-version)或非规范的。

规范的版本以字母 `v` 开头，后跟遵循 [语义化版本控制 2.0.0](https://semver.org/spec/v2.0.0.html) 规范的语义化版本。更多信息请参见[版本](#versions)。

大多数其他标识符和字符串可以用作非规范版本，但存在一些限制以避免文件系统、仓库和[模块代理](#glos-module-proxy)出现问题。非规范版本仅允许在主模块的 `go.mod` 文件中使用。`go` 命令在自动[更新](#go-mod-file-updates) `go.mod` 文件时，会尝试将每个非规范版本替换为等效的规范版本。

在模块路径与版本关联的地方（如 `require`、`replace` 和 `exclude` 指令中），最终路径元素必须与版本保持一致。请参阅[主版本号后缀](#major-version-suffixes)。

### 语法 {#go-mod-file-grammar}

`go.mod` 语法使用扩展的巴科斯-诺尔范式（EBNF）在下方指定。有关 EBNF 语法的详细信息，请参阅 [Go 语言规范中的记法部分](/ref/spec#Notation)。```
GoMod = { Directive } .
Directive = ModuleDirective |
            GoDirective |
            ToolDirective |
            IgnoreDirective |
            RequireDirective |
            ExcludeDirective |
            ReplaceDirective |
            RetractDirective .
```换行符、标识符和字符串分别用 `newline`、`ident` 和 `string` 表示。

模块路径和版本分别用 `ModulePath` 和 `Version` 表示。```go
ModulePath = ident | string . /* 参见上文中的限制 */
Version = ident | string .    /* 参见上文中的限制 */
```### `module` 指令 {#go-mod-file-module}

`module` 指令定义主模块的[路径](#glos-module-path)。一个 `go.mod` 文件必须恰好包含一个 `module` 指令。```
ModuleDirective = "module" ( ModulePath | "(" newline ModulePath newline ")" ) newline .
```示例：```
module golang.org/x/net
```#### 弃用（Deprecation）{#go-mod-file-module-module-deprecation}

当 `module` 指令的上方（或同一行的注释中）出现一段包含 `Deprecated:`（大小写敏感）字符串的注释段落时，该模块将被标记为弃用。弃用信息从冒号后开始，延续至段落末尾。

示例：

```go
// Deprecated: use example.com/mod/v2 instead.
module example.com/mod
``````go
// 弃用：请改用 example.com/mod/v2 替代。
module example.com/mod
```自Go 1.17起，[`go list -m -u`](#go-list-m)会检查[构建列表](#glos-build-list)中所有弃用模块的信息。而[`go get`](#go-get)则会检查构建命令行指定包所需的弃用模块。

当`go`命令获取模块的弃用信息时，它会从匹配`@latest`[版本查询](#version-queries)的版本加载`go.mod`文件，且不考虑[撤回版本](#go-mod-file-retract)或[排除版本](#go-mod-file-exclude)。`go`命令会从同一`go.mod`文件中加载[已撤回版本](#glos-retracted-version)的列表。

要弃用某个模块，作者可在`go.mod`文件中添加`// Deprecated:`注释并标记新版本发布。作者可在更高版本中修改或移除弃用信息。

弃用声明适用于模块的所有次要版本。高于`v2`的主要版本在此场景下被视为独立模块，因为它们的[主版本后缀](#glos-major-version-suffix)使其拥有不同的模块路径。

弃用信息旨在告知用户该模块已停止维护，并提供迁移指导（例如迁移至最新主版本）。单个次要版本或补丁版本无法通过此方式弃用；此时使用[`retract`](#go-mod-file-retract)指令更为合适。

### `go`指令 {#go-mod-file-go}

`go`指令表明该模块基于特定Go版本的语义编写。版本号必须是有效的[Go版本](/doc/toolchain#version)，例如`1.14`、`1.21rc1`或`1.23.0`。

该指令设定了使用此模块所需的最低Go版本。在Go 1.21之前，此指令仅具有建议性质；现在已成为强制要求：Go工具链会拒绝使用声明了更新Go版本的模块。

`go`指令是选择运行哪个Go工具链的输入依据。详情参阅"[Go工具链](/doc/toolchain)"。

该指令会影响新语言特性的使用：

* 对于模块内的包，编译器会拒绝使用`go`指令指定版本之后引入的语言特性。例如，若模块声明`go 1.12`，则其包不能使用Go 1.13引入的数值字面量`1_000_000`。
* 若较低版本的Go编译该模块的某个包时遇到编译错误，错误信息会注明该模块是为更新版本的Go编写的。例如，假设模块声明`go 1.13`且某包使用了数值字面量`1_000_000`，若该包使用Go 1.12编译，编译器会提示代码是为Go 1.13编写的。

`go`指令还会影响`go`命令的行为：

* 在`go 1.14`或更高版本中，可启用自动[供应商模式](#vendoring)。若存在`vendor/modules.txt`文件且与`go.mod`一致，则无需显式使用`-mod=vendor`标志。
* 在`go 1.16`或更高版本中，`all`包模式仅匹配[主模块](#glos-main-module)中包和测试传递导入的包。这与自模块功能引入以来[`go mod vendor`](#go-mod-vendor)保留的包集合一致。在更低版本中，`all`还包括主模块中包所导入包的测试、这些测试的导入包等。
* 在`go 1.17`或更高版本中：
   * `go.mod`文件会为每个向主模块中的包或测试传递提供包的模块显式包含[`require`指令](#go-mod-file-require)。（在`go 1.16`及以下版本中，仅当[最小版本选择](#minimal-version-selection)会选择不同版本时才包含[间接依赖](#glos-direct-dependency)。）这些额外信息支持[模块图剪枝](#graph-pruning)和[懒加载模块](#lazy-loading)。
   * 由于间接依赖可能比先前Go版本多得多，这些依赖会记录在`go.mod`文件内的独立区块中。
   * `go mod vendor`会省略供应商依赖的`go.mod`和`go.sum`文件。（这允许在`vendor`子目录内调用`go`命令时识别正确的主模块。）
   * `go mod vendor`会将每个依赖项`go.mod`文件中的`go`版本记录到`vendor/modules.txt`中。
* 在`go 1.21`或更高版本中：
   * `go`行声明使用此模块所需的最低Go版本。
   * `go`行必须大于或等于所有依赖项的`go`行。
   * `go`命令不再尝试保持与先前旧版Go的兼容性。
   * `go`命令在`go.sum`文件中维护`go.mod`文件校验和时更为谨慎。
<!-- 若更新此列表，请同步更新 /doc/modules/gomod-ref#go-notes。 -->

`go.mod`文件最多只能包含一个`go`指令。大多数命令在未找到该指令时会添加当前Go版本的`go`指令。

若缺失`go`指令，则默认假设为`go 1.16`。```
GoDirective = "go" GoVersion newline .
GoVersion = string | ident .  /* 有效的发行版本；参见上文 */
```示例：```
go 1.23.0
```### `toolchain` 指令 {#go-mod-file-toolchain}

`toolchain` 指令声明了模块建议使用的 Go 工具链。建议工具链的版本不能低于 `go` 指令中声明的 Go 最低版本要求。该指令仅在模块为主模块且默认工具链版本低于建议工具链版本时生效。

为确保可重现性，每当 `go` 命令更新 `go.mod` 文件中的 `go` 版本（通常在执行 `go get` 时），它会在 `toolchain` 行中写入自身的工具链名称。

详情请参阅“[Go 工具链](/doc/toolchain)”。```
ToolchainDirective = "toolchain" ToolchainName newline .
ToolchainName = string | ident .  /* 有效的工具链名称；参见 "Go 工具链" */
```示例：```
toolchain go1.21.0
```### `godebug` 指令 {#go-mod-file-godebug}

`godebug` 指令用于声明一个 [GODEBUG 设置](/doc/godebug)，当本模块作为主模块时应用。此类指令可以有多行，且支持分组书写。若主模块引用了不存在的 GODEBUG 键，则会报错。`godebug key=value` 的作用相当于每个正在编译的主包都包含一个列出 `//go:debug key=value` 的源文件。```
GodebugDirective = "godebug" ( GodebugSpec | "(" newline { GodebugSpec } ")" newline ) .
GodebugSpec = GodebugKey "=" GodebugValue newline.
GodebugKey = GodebugChar { GodebugChar }.
GodebugValue = GodebugChar { GodebugChar }.
GodebugChar = any non-space character except , " ` ' (comma and quotes).
```示例：```
godebug default=go1.21
godebug (
	panicnil=1
	asynctimerchan=0
)
```### `require` 指令 {#go-mod-file-require}

`require` 指令声明了对给定模块依赖的最低版本要求。对于每个被要求的模块版本，`go` 命令会加载该版本的 `go.mod` 文件，并将该文件中的要求纳入其中。在所有要求加载完毕后，`go` 命令使用[最小版本选择算法（MVS）](#minimal-version-selection)来解析它们，以生成[构建列表](#glos-build-list)。

`go` 命令会为某些依赖要求自动添加 `// indirect` 注释。一个 `// indirect` 注释表明，[主模块](#glos-main-module)中的任何包都没有直接导入被要求模块中的包。

如果 [`go` 指令](#go-mod-file-go)指定了 `go 1.16` 或更低版本，那么当某个模块的被选版本高于主模块其他依赖项已隐含（传递性地）的版本时，`go` 命令会添加一个间接要求。这种情况可能由于显式升级（`go get -u ./...`）、移除了先前施加该要求的某个依赖项（`go mod tidy`），或者某个依赖项导入了一个包，但其自身的 `go.mod` 文件中却没有相应的条目（例如一个完全没有 `go.mod` 文件的依赖项）而导致。

在 `go 1.17` 及更高版本中，`go` 命令会为每一个提供了被主模块中的包或测试（即使是[间接](#glos-indirect-dependency)地）导入的包的模块，或者被作为参数传递给 `go get` 的模块，添加一个间接要求。这些更全面的要求使得[模块图修剪](#graph-pruning)和[延迟模块加载](#lazy-loading)成为可能。```
RequireDirective = "require" ( RequireSpec | "(" newline { RequireSpec } ")" newline ) .
RequireSpec = ModulePath Version newline .
```### `tool` 指令 {#go-mod-file-tool}

自Go 1.24起，`tool` 指令用于将包添加为当前模块的依赖项。同时，当当前工作目录位于该模块内，或位于包含该模块的工作区中时，该指令也使得该工具可通过 `go tool` 命令运行。

如果该工具```require golang.org/x/net v1.2.3

require (
    golang.org/x/crypto v1.4.5 // 间接依赖
    golang.org/x/text v1.6.7
)
```### `tool` 指令 {#go-mod-file-tool}

自 Go 1.24 起，`tool` 指令用于将一个包添加为当前模块的依赖项。同时，当当前工作目录位于该模块内，或位于包含该模块的工作区中时，该指令也使得该工具可通过 `go tool` 命令运行。

如果该工具包不在当前模块中，则必须存在一个 `require` 指令来指定要使用的工具版本。

`tool` 元模式（meta-pattern）会解析为当前模块 `go.mod` 中定义的工具列表，或在工作区模式下，解析为工作区内所有模块中定义的所有工具的并集。```
ToolDirective = "tool" ( ToolSpec | "(" newline { ToolSpec } ")" newline ) .
ToolSpec = ModulePath newline .
```示例：

```go
tool golang.org/x/tools/cmd/stringer
tool golang.org/x/tools/cmd/goimports
```

当 `tool` 指令引用的工具所在的目录位于该模块内，或位于包含该模块的工作区中时，该指令也使得该工具可通过 `go tool` 命令运行。

如果该工具包不在当前模块中，则必须存在一个 `require` 指令来指定要使用的工具版本。

`tool` 元模式（meta-pattern）会解析为当前模块 `go.mod` 中定义的工具列表，或在工作区模式下，解析为工作区内所有模块中定义的所有工具的并集。```
ToolDirective = "tool" ( ToolSpec | "(" newline { ToolSpec } ")" newline ) .
ToolSpec = ModulePath newline .
```

### `ignore` 指令 {#go-mod-file-ignore}

`ignore` 指令会导致 `go` 命令在匹配包模式时，忽略由斜杠分隔的目录路径，以及这些路径下递归包含的所有文件和目录。

如果路径以 `./` 开头，则该路径相对于```
tool golang.org/x/tools/cmd/stringer

tool (
    example.com/module/cmd/a
    example.com/module/cmd/b
)
```### `ignore` 指令 {#go-mod-file-ignore}

`ignore` 指令会导致 `go` 命令在匹配包模式时，忽略由斜杠分隔的目录路径，以及这些路径下递归包含的所有文件和目录。

如果路径以 `./` 开头，则该路径相对于模块根目录进行解释，该目录及其递归包含的任何目录或文件在匹配包模式时将被忽略。

否则，模块中任何深度具有该路径的目录，以及它们递归包含的任何目录或文件都将被忽略。```
IgnoreDirective = "ignore" ( IgnoreSpec | "(" newline { IgnoreSpec } ")" newline ) .
IgnoreSpec = RelativeFilePath newline .
RelativeFilePath = /* 斜杠分隔的相对文件路径 */ .
```示例```
ignore ./node_modules

ignore (
    static
    content/html
    ./third_party/javascript
)
```### `exclude` 指令 {#go-mod-file-exclude}

`exclude` 指令可阻止 `go` 命令加载特定模块版本。

自 Go 1.16 起，若任何 `go.mod` 文件中 `require` 指令引用的版本被主模块 `go.mod` 文件中的 `exclude` 指令排除，则该依赖要求将被忽略。这可能导致 [`go get`](#go-get) 和 [`go mod tidy`](#go-mod-tidy) 等命令向 `go.mod` 中添加更高版本的依赖要求（必要时会附带 `// indirect` 注释）。

Go 1.16 之前，若被排除的版本被 `require` 指令引用，`go` 命令会列出该模块的可用版本（通过 [`go list -m -versions`](#go-list-m) 查看），并自动加载次高且未被排除的版本。这可能导致版本选择的不确定性，因为次高版本可能随时间变化。正式版和预发布版均会在此过程中被考虑，但伪版本不会。若不存在更高版本，`go` 命令将报错。

`exclude` 指令仅在主模块的 `go.mod` 文件中生效，在其他模块中不起作用。详见[最小版本选择](#minimal-version-selection)机制。```
ExcludeDirective = "exclude" ( ExcludeSpec | "(" newline { ExcludeSpec } ")" newline ) .
ExcludeSpec = ModulePath Version newline .
```### `replace` 指令 {#go-mod-file-replace}

`replace` 指令用于将某个模块的特定版本或所有版本的内容替换为其他位置的内容。替换源可以通过另一个模块路径及版本指定，也可以通过平台相关的文件路径指定。

**示例：**

```
replace example.com/bob v1.2.3 => example.com/bob-fork v1.4.5
replace example.com/bob => ../bob-fork
replace example.com/bob v1.3.0 => ../bob
```

`replace` 指令有两个参数：
-   第一个参数（左侧）指定应替换的模块路径和版本。
-   第二个参数（右侧）指定替换模块的路径，以及可选的版本。

**替换规则：**
-   如果左侧指定了版本，则仅替换该特定版本。
-   如果左侧省略了版本（即只有模块路径），则替换该模块的所有版本。
-   右侧如果通过文件路径指定（如 `../bob`），则必须省略版本。
-   右侧如果通过模块路径指定（如 `example.com/bob-fork v1.4.5`），则必须包含版本。
-   如果右侧是相对路径，则相对于包含 `go.mod` 文件的目录进行解析。

**主要用途：**
-   在本地开发时，将外部依赖指向本地的克隆副本。
-   在应用临时补丁时，将上游模块指向一个包含修复的 fork 版本。
-   使用不在任何公共仓库中的私有模块。

**重要说明：**
-   与 `exclude` 指令不同，`replace` 指令仅在主模块的 `go.mod` 文件中生效，在其他模块中不起作用。
-   在构建时，所有匹配的模块版本都将被右侧指定的版本或路径所替换。
-   为了确保可复现的构建，建议在开发完成后将指向本地文件路径的 `replace` 指令更新或移除，并在 CI/CD 流程中谨慎使用。```
exclude golang.org/x/net v1.2.3

exclude (
    golang.org/x/crypto v1.4.5
    golang.org/x/text v1.6.7
)
```### `replace` 指令 {#go-mod-file-replace}

`replace` 指令将模块的某个特定版本或所有版本的内容，替换为其他位置的内容。替换来源可以指定为另一个模块路径及版本，或者平台相关的文件路径。

如果箭头（`=>`）左侧指定了版本，则仅替换该模块的特定版本；其他版本将正常获取。如果左侧省略了版本号，则替换该模块的所有版本。

如果箭头右侧的路径是绝对路径或相对路径（以 `./` 或 `../` 开头），则将其解释为替换模块根目录的本地文件路径，该目录下必须包含 `go.mod` 文件。此时必须省略替换版本号。

如果右侧路径不是本地路径，则必须是一个有效的模块路径。此时必须指定版本。且该模块版本不能同时出现在构建列表中。

无论替换是通过本地路径还是模块路径指定，如果替换模块有 `go.mod` 文件，其 `module` 指令必须与其替换的模块路径匹配。

`replace` 指令仅在主模块的 `go.mod` 文件中生效，在其他模块中会被忽略。详见[最小版本选择](#minimal-version-selection)。

如果存在多个主模块，则所有主模块的 `go.mod` 文件都适用。不允许主模块之间存在冲突的 `replace` 指令，冲突必须通过移除或在 [`go.work 文件中设置 replace 指令`](#go-work-file-replace) 来解决。

请注意，单独一个 `replace` 指令并不会将模块添加到[模块图](#glos-module-graph)中。还需要在主模块的 `go.mod` 文件或某个依赖的 `go.mod` 文件中，有一个引用被替换模块版本的 [`require` 指令](#go-mod-file-require)。如果左侧的模块版本未被需要，则 `replace` 指令不生效。```
ReplaceDirective = "replace" ( ReplaceSpec | "(" newline { ReplaceSpec } ")" newline ) .
ReplaceSpec = ModulePath [ Version ] "=>" FilePath newline
            | ModulePath [ Version ] "=>" ModulePath Version newline .
FilePath = /* 平台相关的相对或绝对文件路径 */
```示例：

```go
replace example.com/a v1.2.3 => example.com/b v1.4.5
replace example.com/a => example.com/b v1.4.5

// 假设 my/other 未被需要
replace example.com/a v1.2.3 => ./fork/example.com/a
replace example.com/a => ./fork/example.com/a
```

如果左侧的模块版本未被需要，则 `replace` 指令不生效。```
replace golang.org/x/net v1.2.3 => example.com/fork/net v1.4.5

replace (
    golang.org/x/net v1.2.3 => example.com/fork/net v1.4.5
    golang.org/x/net => example.com/fork/net v1.4.5
    golang.org/x/net v1.2.3 => ./fork/net
    golang.org/x/net => ./fork/net
)
```### `retract` 指令 {#go-mod-file-retract}

`retract` 指令表明不应依赖由 `go.mod` 定义的模块的某个特定版本或版本范围。当某个版本被过早发布，或在版本发布后发现严重问题时，`retract` 指令就非常有用。被撤回的版本应继续保留在版本控制仓库和[模块代理](#glos-module-proxy)中，以确保依赖于它们的构建不会因此中断。*retract*（撤回）一词借鉴自学术文献：一篇被撤回的研究论文仍然可用，但它存在问题，不应作为未来工作的依据。

当某个模块版本被撤回时，用户将无法通过 [`go get`](#go-get)、[`go mod tidy`](#go-mod-tidy) 或其他命令自动升级到该版本。依赖于被撤回版本的构建应继续正常工作，但当用户通过 [`go list -m -u`](#go-list-m) 检查更新或通过 [`go get`](#go-get) 更新相关模块时，会收到撤回通知。

要撤回某个版本，模块作者应在 `go.mod` 中添加一条 `retract` 指令，然后发布一个包含该指令的新版本。新版本必须高于其他发布版本或预发布版本；也就是说，在考虑撤回之前，`@latest` [版本查询](#version-queries) 应解析到这个新版本。`go` 命令会加载并应用由 `go list -m -retracted $modpath@latest`（其中 `$modpath` 是模块路径）所示版本中的撤回信息。

被撤回的版本在 [`go list -m -versions`](#go-list-m) 打印的版本列表中默认是隐藏的，除非使用 `-retracted` 标志。在解析 `@>=v1.2.3` 或 `@latest` 这类版本查询时，被撤回的版本会被排除。

包含撤回指令的版本也可以撤回自身。如果一个模块的最高发布版本或预发布版本撤回了自身，那么在排除被撤回的版本后，`@latest` 查询将解析到一个较低的版本。

例如，假设模块 `example.com/m` 的作者意外发布了 `v1.0.0` 版本。为了防止用户升级到 `v1.0.0`，作者可以在 `go.mod` 中添加两条 `retract` 指令，然后为包含这些撤回指令的 `v1.0.1` 版本打上标签。```
retract (
    v1.0.0 // 意外发布
    v1.0.1 // 仅包含撤回指令
)
```当用户执行 `go get example.com/m@latest` 命令时，`go` 命令会读取当前最高版本 `v1.0.1` 中的撤回指令。由于 `v1.0.0` 和 `v1.0.1` 都已被撤回，`go` 命令将自动升级（或降级！）到次高版本，例如 `v0.9.5`。

`retract` 指令可以指定单个版本（如 `v1.0.0`），也可以使用方括号 `[` 和 `]` 界定一个闭区间版本范围（如 `[v1.1.0, v1.2.0]`）。单个版本等价于上下限相同的区间。与其他指令类似，多个 `retract` 指令可以聚合在由行尾的 `(` 和独立成行的 `)` 包裹的代码块中。

每个 `retract` 指令最好附带注释说明撤回原因，尽管这不是强制性要求。`go` 命令可能会在关于已撤回版本的警告信息及 `go list` 输出中显示这些说明注释。说明注释可以直接写在 `retract` 指令上方（中间无需空行）或同行末尾。如果注释出现在代码块上方，则适用于该代码块内所有未单独注释的 `retract` 指令。说明注释可以跨越多行书写。```
RetractDirective = "retract" ( RetractSpec | "(" newline { RetractSpec } ")" newline ) .
RetractSpec = ( Version | "[" Version "," Version "]" ) newline .
```示例：

* 撤回 `v1.0.0` 到 `v1.9.9` 之间的所有版本：```
retract v1.0.0
retract [v1.0.0, v1.9.9]
retract (
    v1.0.0
    [v1.0.0, v1.9.9]
)
```* 在过早发布版本 `v1.0.0` 后返回到无版本状态：```retract [v0.0.0, v1.0.1] // 假设 v1.0.1 版本中包含了此撤回声明。```* 清除某个模块的所有伪版本（pseudo-versions）和带标签的版本（tagged versions）：```
retract [v0.0.0-0, v0.15.2]  // 假设 v0.15.2 版本中包含了此撤回声明。
````retract` 指令是在 Go 1.16 中新增的。如果在[主模块](#glos-main-module)的 `go.mod` 文件中写入了 `retract` 指令，Go 1.15 及更低版本会报告错误，并且会忽略依赖项 `go.mod` 文件中的 `retract` 指令。

### 自动更新 {#go-mod-file-updates}

如果 `go.mod` 文件缺失信息或未能准确反映实际情况，大多数命令会报告错误。可以使用 [`go get`](#go-get) 和 [`go mod tidy`](#go-mod-tidy) 命令来修复大多数此类问题。此外，`-mod=mod` 标志可以与大多数模块感知命令（`go build`、`go test` 等）一起使用，以指示 `go` 命令自动修复 `go.mod` 和 `go.sum` 中的问题。

例如，考虑以下 `go.mod` 文件：

```go
// 需要 example.com/A 和 example.com/E。
module example.com/M

go 1.16

require example.com/A v1
require example.com/E v0.0.0
```

如果运行 `go get -mod=mod`，它会将依赖关系解析为最新版本，将伪版本替换为完整的发布版本标签（如果可用），并将 `go.mod` 重写为：

```go
module example.com/M

go 1.16

require example.com/A v1.2.3
require example.com/E v0.5.0

require (
    example.com/B v0.2.0 // indirect
    example.com/C v1.4.0 // indirect
    example.com/D v1.0.0 // indirect
)
```

（在实际中，将 `// indirect` 注释放在单独行中是更好的做法。）```
module example.com/M

go 1.23.0

require (
    example.com/A v1
    example.com/B v1.0.0
    example.com/C v1.0.0
    example.com/D v1.2.3
    example.com/E dev
)

exclude example.com/D v1.2.3
```使用 `-mod=mod` 触发的更新会将非规范化的版本标识符重写为[规范化的](#glos-canonical-version)语义化版本形式，因此 `example.com/A` 的 `v1` 会变为 `v1.0.0`，而 `example.com/E` 的 `dev` 会变为 `dev` 分支上最新提交的伪版本，例如 `v0.0.0-20180523231146-b3f5c0f6e5f1`。

此更新会修改依赖要求以遵守排除规则，因此对于被排除的 `example.com/D v1.2.3` 的要求将更新为使用 `example.com/D` 的下一个可用版本，例如 `v1.2.4` 或 `v1.3.0`。

此更新会移除冗余或误导性的依赖要求。例如，如果 `example.com/A v1.0.0` 本身依赖 `example.com/B v1.2.0` 和 `example.com/C v1.0.0`，那么 `go.mod` 中对 `example.com/B v1.0.0` 的要求是误导性的（因为它被 `example.com/A` 对 `v1.2.0` 的需求所取代），而其对 `example.com/C v1.0.0` 的要求是冗余的（因为它隐含在 `example.com/A` 对相同版本的需求中），因此两者都将被移除。如果主模块包含直接导入 `example.com/B` 或 `example.com/C` 中包的包，则这些要求将被保留，但会更新为实际正在使用的版本。

最后，此更新会以规范化的格式重新格式化 `go.mod` 文件，以便未来的机器化更改产生最小的差异。如果只需要格式更改，`go` 命令将不会更新 `go.mod`。

由于模块图定义了导入语句的含义，任何加载包的命令也会使用 `go.mod`，因此也可以更新它，包括 `go build`、`go get`、`go install`、`go list`、`go test`、`go mod tidy`。

在 Go 1.15 及更低版本中，`-mod=mod` 标志默认启用，因此更新会自动执行。从 Go 1.16 开始，`go` 命令的行为类似于设置了 `-mod=readonly`：如果需要对 `go.mod` 进行任何更改，`go` 命令会报告错误并提出修复建议。

## 最小版本选择（MVS） {#minimal-version-selection}

Go 使用一种称为 <dfn>最小版本选择（MVS）</dfn> 的算法来选择构建包时要使用的一组模块版本。MVS 在 Russ Cox 的 [Minimal Version Selection](https://research.swtch.com/vgo-mvs) 中有详细描述。

从概念上讲，MVS 在模块的有向图上运行，该图由 [`go.mod` 文件](#glos-go-mod-file)指定。图中的每个顶点代表一个模块版本。每条边代表依赖项的最低要求版本，使用 [`require`](#go-mod-file-require) 指令指定。该图可能会被主模块 `go.mod` 文件中的 [`exclude`](#go-mod-file-exclude) 和 [`replace`](#go-mod-file-replace) 指令以及 `go.work` 文件中的 [`replace`](#go-work-file-replace) 指令修改。

MVS 生成[构建列表](#glos-build-list)作为输出，即用于构建的模块版本列表。

MVS 从主模块（图中没有版本的特殊顶点）开始遍历图，跟踪每个模块的最高要求版本。遍历结束时，最高要求版本构成构建列表：它们是满足所有要求的最小版本。

可以使用命令 [`go list -m all`](#go-list-m) 检查构建列表。与其他依赖管理系统不同，构建列表不会保存在“锁”文件中。MVS 是确定性的，并且构建列表在发布新版本依赖项时不会改变，因此在每个模块感知命令开始时都会使用 MVS 来计算它。

考虑下图中的示例。主模块要求模块 A 的版本 >=1.2，模块 B 的版本 >=1.2。A 1.2 和 B 1.2 分别要求 C 1.3 和 C 1.4。C 1.3 和 C 1.4 都要求 D 1.2。

![Module version graph with visited versions highlighted](/doc/mvs/buildlist.svg "MVS build list graph")

MVS 访问并加载图中以蓝色高亮显示的每个模块版本的 `go.mod` 文件。在图遍历结束时，MVS 返回一个包含加粗版本的构建列表：A 1.2、B 1.2、C 1.4 和 D 1.2。请注意，B 和 D 有更高版本可用，但 MVS 不会选择它们，因为没有模块要求它们。

### 替换 {#mvs-replace}

模块的内容（包括其 `go.mod` 文件）可以使用主模块的 `go.mod` 文件或工作区的 `go.work` 文件中的 [`replace` 指令](#go-mod-file-replace)进行替换。`replace` 指令可以应用于模块的特定版本或所有版本。

替换会改变模块图，因为替换后的模块可能具有与被替换版本不同的依赖关系。

考虑下面的示例，其中 C 1.4 已被替换为 R。R 依赖于 D 1.3 而不是 D 1.2，因此 MVS 返回一个包含 A 1.2、B 1.2、C 1.4（被替换为 R）和 D 1.3 的构建列表。

![Module version graph with a replacement](/doc/mvs/replace.svg "MVS replacement")

### 排除 {#mvs-exclude}

也可以使用主模块 `go.mod` 文件中的 [`exclude` 指令](#go-mod-file-exclude)排除模块的特定版本。

排除也会改变模块图。当一个版本被排除时，它会从模块图中移除，对其的要求会重定向到下一个更高的版本。

考虑下面的示例。C 1.3 已被排除。MVS 的行为将如同 A 1.2 要求的是 C 1.4（下一个更高版本）而不是 C 1.3。

![Module version graph with an exclusion](/doc/mvs/exclude.svg "MVS exclude")

### 升级 {#mvs-upgrade}

可以使用 [`go get`](#go-get) 命令来升级一组模块。要执行升级，`go` 命令会在运行 MVS 之前通过添加从已访问版本到升级版本的边来更改模块图。

考虑下面的示例。模块 B 可以从 1.2 升级到 1.3，C 可以从 1.3 升级到 1.4，D 可以从 1.2 升级到 1.3。

![Module version graph with upgrades](/doc/mvs/upgrade.svg "MVS upgrade")升级（和降级）操作可能会添加或移除间接依赖。在此例中，升级后 E 1.1 和 F 1.1 出现在构建列表中，因为 E 1.1 是 B 1.3 的依赖项。

为保留升级结果，`go` 命令会更新 `go.mod` 中的依赖要求。它会将对 B 的依赖要求更改为 1.3 版本，并添加对 C 1.4 和 D 1.3 的依赖要求（附带 `// indirect` 注释），因为这些版本在正常情况下不会被选中。

### 降级 {#mvs-downgrade}

同样可以使用 [`go get`](#go-get) 命令对一组模块进行降级。执行降级时，`go` 命令通过移除高于降级版本的版本来修改模块图。同时也会移除依赖于已移除版本的其他模块版本，因为这些版本可能与降级后的依赖版本不兼容。若主模块依赖的模块版本在降级过程中被移除，该依赖要求将更改至未被移除的先前版本。若没有可用的先前版本，则移除该依赖要求。

以下面的示例说明：假设发现 C 1.4 存在问题，因此我们将其降级至 C 1.3。C 1.4 将从模块图中移除。B 1.2 也会被移除，因为它依赖于 C 1.4 或更高版本。主模块对 B 的依赖要求将更改为 1.1。

![带降级的模块版本图](/doc/mvs/downgrade.svg "MVS 降级")

[`go get`](#go-get) 也可通过参数后添加 `@none` 后缀来完全移除依赖项，其工作原理类似降级操作：所有指定模块的版本都将从模块图中移除。

## 模块图修剪 {#graph-pruning}

如果主模块处于 `go 1.17` 或更高版本，用于[最小版本选择](#minimal-version-selection)的[模块图](#glos-module-graph)将仅包含每个模块依赖项的_直接_要求（前提是该模块自身的 `go.mod` 文件中指定了 `go 1.17` 或更高版本），除非该模块版本也被其他处于 `go 1.16` 或更低版本的依赖项间接要求。（`go 1.17` 依赖项的_间接_依赖将从模块图中_修剪移除_。）

由于 `go 1.17` 的 `go.mod` 文件包含了该模块中所有包或测试所需的依赖项的[require 指令](#go-mod-file-require)，修剪后的模块图包含了 `go build` 或 `go test` 运行时所需的所有依赖——这些依赖属于[主模块](#glos-main-module)明确要求的依赖包。对于任何模块而言，不需要构建其包或测试的依赖项不会影响这些包的运行时行为，因此从模块图中修剪移除的依赖只会干扰原本无关的模块。

依赖要求已被修剪的模块仍会出现在模块图中，并会通过 `go list -m all` 报告：它们的[选定版本](#glos-selected-version)是已知且明确的，并且可以从这些模块中加载包（例如作为其他模块加载的测试的间接依赖）。然而，由于 `go` 命令无法轻松识别这些模块的哪些依赖已满足，`go build` 和 `go test` 的参数不能包含来自依赖要求已被修剪的模块的包。[`go get`](#go-get) 会将包含每个指定包的模块提升为显式依赖，从而允许对该包执行 `go build` 或 `go test`。

由于 Go 1.16 及更早版本不支持模块图修剪，对于指定 `go 1.16` 或更低版本的每个模块，仍会包含完整的传递依赖闭包（包括间接的 `go 1.17` 依赖）。（在 `go 1.16` 及更低版本中，`go.mod` 文件仅包含[直接依赖](#glos-direct-dependency)，因此需要加载更大的图以确保包含所有间接依赖。）

[`go mod tidy`](#go-mod-tidy) 为模块生成的 [`go.sum` 文件](#go-sum-files)默认包含比其 [`go` 指令](#go-mod-file-go)中指定版本低一个版本的 Go 版本所需的校验和。因此，`go 1.17` 模块会包含 Go 1.16 加载的完整模块图所需的校验和，而 `go 1.18` 模块将仅包含 Go 1.17 加载的修剪后模块图所需的校验和。`-compat` 标志可用于覆盖默认版本（例如，在 `go 1.17` 模块中更积极地修剪 `go.sum` 文件）。

更多详细信息请参见[设计文档](https://go.googlesource.com/proposal/+/master/design/36460-lazy-module-loading.md)。

### 延迟模块加载 {#lazy-loading}

为模块图修剪添加的更全面要求也支持在模块内工作时进行另一项优化。如果主模块处于 `go 1.17` 或更高版本，`go` 命令会避免加载完整的模块图，直到（且仅当）需要时才加载。相反，它仅加载主模块的 `go.mod` 文件，然后尝试仅使用这些依赖来加载要构建的包。如果要导入的包（例如，主模块外的包的测试依赖）在这些依赖中未找到，则按需加载模块图的其余部分。

如果无需加载模块图即可找到所有导入的包，则 `go` 命令_仅_加载包含这些包的模块的 `go.mod` 文件，并将其依赖要求与主模块的要求进行核对，以确保本地一致性。（由于版本控制合并、手动编辑以及使用本地文件系统路径进行的[替换](#go-mod-file-replace)，可能会出现不一致。）

## 工作区 {#workspaces}

<dfn>工作区</dfn>是磁盘上的一组模块，在运行[最小版本选择 (MVS)](#minimal-version-selection) 时用作主模块。可以在 [`go.work` 文件](#go-work-file) 中声明工作区，该文件指定了工作区中每个模块所在目录的相对路径。当不存在 `go.work` 文件时，工作区仅包含当前目录所在的单个模块。

大多数处理模块的 `go` 子命令会针对当前工作区确定的模块集进行操作。而 `go mod init`、`go mod why`、`go mod edit`、`go mod tidy`、`go mod vendor` 和 `go get` 始终作用于单个主模块。

命令通过首先检查 `GOWORK` 环境变量来判断是否处于工作区上下文中。若 `GOWORK` 被设置为 `off`，则命令将在单模块上下文中运行。若该变量为空或未设置，命令将从当前工作目录开始，依次向上级目录搜索名为 `go.work` 的文件。若找到该文件，命令将在其定义的工作区中运行；否则工作区将仅包含当前工作目录所在的模块。若 `GOWORK` 指定了一个以 `.work` 结尾的现有文件路径，则会启用工作区模式。其他任何值均会引发错误。您可以通过 `go env GOWORK` 命令查看 `go` 命令当前使用的 `go.work` 文件。当 `go` 命令未处于工作区模式时，`go env GOWORK` 的输出将为空。

### `go.work` 文件 {#go-work-file}

工作区由一个名为 `go.work` 的 UTF-8 编码文本文件定义。该文件按行组织，每行包含一条指令，由关键字和参数组成。例如：```
go 1.23.0

use ./my/first/thing
use ./my/second/thing

replace example.com/bad/thing v1.4.5 => example.com/good/thing v1.4.5
```与 `go.mod` 文件类似，可以将相邻行中的前导关键字提取出来形成一个代码块。```
use (
    ./my/first/thing
    ./my/second/thing
)
````go` 命令提供了若干子命令来操作 `go.work` 文件。  
[`go work init`](#go-work-init) 用于创建新的 `go.work` 文件。[`go work use`](#go-work-use) 用于向 `go.work` 文件添加模块目录。[`go work edit`](#go-work-edit) 用于执行底层编辑操作。  
Go 程序还可以通过 [`golang.org/x/mod/modfile`](https://pkg.go.dev/golang.org/x/mod/modfile?tab=doc) 包以编程方式实现相同的更改。

go 命令会维护一个 `go.work.sum` 文件，该文件记录了工作区使用但未包含在工作区各模块的 go.sum 文件中的哈希值。

通常不建议将 go.work 文件提交到版本控制系统，原因有二：

*   已提交的 `go.work` 文件可能会覆盖开发者父目录中自己的 `go.work` 文件，当其 `use` 指令不适用时会造成混淆。
*   已提交的 `go.work` 文件可能导致持续集成（CI）系统选择并测试模块依赖项的错误版本。通常不应允许 CI 系统使用 `go.work` 文件，以便测试该模块在被其他模块依赖时的实际行为——此时模块内部的 `go.work` 文件不起作用。

话虽如此，在某些情况下提交 `go.work` 文件是合理的。例如，当一个代码仓库中的模块彼此间排他性地共同开发（不与外部模块协作），开发者没有理由在工作区中使用不同的模块组合。此时，模块作者应确保各个模块经过充分测试并正确发布。

### 词法元素 {#go-work-file-lexical}

`go.work` 文件中的词法元素定义方式[与 `go.mod` 文件完全相同](#go-mod-file-lexical)。

### 语法 {#go-work-file-grammar}

下文使用扩展巴科斯-诺尔范式（EBNF）规定了 `go.work` 的语法。  
有关 EBNF 语法的详细信息，请参阅 [Go 语言规范中的表示法章节](/ref/spec#Notation)。```
GoWork = { Directive } .
Directive = GoDirective |
            ToolchainDirective |
            UseDirective |
            ReplaceDirective .
```换行符、标识符和字符串分别使用 `newline`、`ident` 和 `string` 表示。

模块路径和版本分别使用 `ModulePath` 和 `Version` 表示。模块路径和版本的指定方式与 [`go.mod` 文件中的规定完全相同](#go-mod-file-lexical)。```
ModulePath = ident | string . /* 参见上述限制 */
Version = ident | string .    /* 参见上述限制 */
```### `go` 指令 {#go-work-file-go}

有效的 `go.work` 文件中必须包含一个 `go` 指令。其版本必须是有效的 Go 发布版本：格式为正整数后跟一个点号和非负整数（例如 `1.18`、`1.19`）。

`go` 指令指定了该 `go.work` 文件预期使用的 Go 工具链版本。如果 `go.work` 文件格式在未来发生变化，后续的工具链版本将根据文件指定的版本来解析该文件。

一个 `go.work` 文件最多只能包含一个 `go` 指令。```
GoDirective = "go" GoVersion newline .
GoVersion = string | ident .  /* 有效的发布版本；参见上述说明 */
```示例：```
go 1.23.0
```### `toolchain` 指令 {#go-work-file-toolchain}

`toolchain` 指令声明在工作区中建议使用的 Go 工具链。
仅当默认工具链比建议的工具链版本更旧时，此指令才会生效。

有关详细信息，请参阅“[Go 工具链](/doc/toolchain)”。```
ToolchainDirective = "toolchain" ToolchainName newline .
ToolchainName = string | ident .  /* 有效的工具链名称；参见“Go 工具链” */
```示例：

```
go 1.23.0
```

### `toolchain` 指令 {#go-work-file-toolchain}

`toolchain` 指令声明了在该工作区中建议使用的 Go 工具链。仅当默认工具链比建议的工具链版本更旧时，此指令才会生效。

有关详细信息，请参阅 "[Go 工具链](/doc/toolchain)"。

```
ToolchainDirective = "toolchain" ToolchainName newline .
ToolchainName = string | ident .  /* 有效的工具链名称；参见 "Go 工具链" */
``````
toolchain go1.21.0
```### `godebug` 指令 {#go-work-file-godebug}

`godebug` 指令声明了一个单一的 [GODEBUG 设置](/doc/godebug)，该设置将在此工作区中生效。其语法和效果与 [`go.mod` 文件中的 `godebug` 指令](#go-mod-file-godebug)相同。当工作区处于使用状态时，`go.mod` 文件中的 `godebug` 指令将被忽略。

### `use` 指令 {#go-work-file-use}

`use` 指令将磁盘上的一个模块添加到工作区的主模块集合中。其参数是一个相对路径，指向包含该模块 `go.mod` 文件的目录。`use` 指令不会添加其参数目录的子目录中包含的模块。这些模块可以通过包含其自身 `go.mod` 文件的目录，在单独的 `use` 指令中被添加。```
UseDirective = "use" ( UseSpec | "(" newline { UseSpec } ")" newline ) .
UseSpec = FilePath newline .
FilePath = /* 平台相关的相对或绝对文件路径 */
```示例：

`use` 指令将磁盘上的一个模块添加到工作区的主模块集合中。其参数是一个相对路径，指向包含该模块 `go.mod` 文件的目录。`use` 指令不会添加其参数目录的子目录中包含的模块。这些模块可以通过包含其自身 `go.mod` 文件的目录，在单独的 `use` 指令中被添加。
```
UseDirective = "use" ( UseSpec | "(" newline { UseSpec } ")" newline ) .
UseSpec = FilePath newline .
FilePath = /* 平台相关的相对或绝对文件路径 */
``````
use ./mymod  // 示例模块路径

use (
    ../othermod
    ./subdir/thirdmod
)
```### `replace` 指令 {#go-work-file-replace}

与 `go.mod` 文件中的 `replace` 指令类似，`go.work` 文件中的 `replace` 指令可将特定版本模块或全部版本模块的内容替换为其他位置的内容。在 `go.work` 中使用通配符替换时，会覆盖 `go.mod` 文件中针对特定版本的 `replace` 设置。

`go.work` 文件中的 `replace` 指令会覆盖工作空间内各模块中对同一模块或模块版本的任何替换设置。```
Replace指令定义 = "replace" ( ReplaceSpec | "(" newline { ReplaceSpec } ")" newline ) .
ReplaceSpec = 模块路径 [ 版本 ] "=>" 文件路径 newline
            | 模块路径 [ 版本 ] "=>" 模块路径 版本 newline .
文件路径 = /* 平台相关的相对或绝对文件路径 */
```示例：```
replace golang.org/x/net v1.2.3 => example.com/fork/net v1.4.5

replace (
    golang.org/x/net v1.2.3 => example.com/fork/net v1.4.5
    golang.org/x/net => example.com/fork/net v1.4.5
    golang.org/x/net v1.2.3 => ./fork/net
    golang.org/x/net => ./fork/net
)
```## 与非模块仓库的兼容性 {#non-module-compat}

为确保从 `GOPATH` 平滑过渡到模块系统，`go` 命令可以在模块感知模式下，通过添加 [`go.mod` 文件](#glos-go-mod-file)从尚未迁移至模块的仓库下载和构建包。

当 `go` 命令[直接](#vcs)从仓库下载指定版本的模块时，它会根据模块路径查找对应的仓库 URL，将版本映射到仓库中的某个修订版本，然后提取该修订版本对应的仓库存档。如果[模块路径](#glos-module-path)等于[仓库根路径](#glos-repository-root-path)，且仓库根目录下不存在 `go.mod` 文件，`go` 命令会在模块缓存中合成一个 `go.mod` 文件，其中仅包含 [`module` 指令](#go-mod-file-module)。由于合成的 `go.mod` 文件不包含其依赖项的 [`require` 指令](#go-mod-file-require)，其他依赖它的模块可能需要额外的 `require` 指令（带 `// indirect` 注释），以确保每次构建时每个依赖项都获取到相同版本。

当 `go` 命令从[代理服务器](#communicating-with-proxies)下载模块时，`go.mod` 文件会与模块的其余内容分开下载。若原始模块没有 `go.mod` 文件，代理服务器应提供一个合成的 `go.mod` 文件。

### `+incompatible` 版本 {#incompatible-versions}

在主版本号 2 或更高版本发布的模块，其模块路径必须包含匹配的[主版本后缀](#major-version-suffixes)。例如，如果一个模块以 `v2.0.0` 版本发布，其路径必须包含 `/v2` 后缀。这使得 `go` 命令能够将项目的多个主版本视为不同的模块，即使它们是在同一个仓库中开发的。

主版本后缀要求是在 `go` 命令增加模块支持时引入的，而在此之前，许多仓库已经为主版本号 `2` 或更高版本打上了标签。为了保持与这些仓库的兼容性，`go` 命令会为主版本号为 2 或更高但没有 `go.mod` 文件的版本添加 `+incompatible` 后缀。`+incompatible` 表明该版本与主版本号较低的版本属于同一模块；因此，`go` 命令可能会自动升级到更高的 `+incompatible` 版本，即使这可能会破坏构建。

考虑下面的示例依赖项：```
require example.com/m v4.1.2+incompatible
```版本 `v4.1.2+incompatible` 指的是提供模块 `example.com/m` 的仓库中的[语义化版本标签](#glos-semantic-version-tag) `v4.1.2`。该模块必须位于仓库根目录下（即[仓库根路径](#glos-module-path)也必须是 `example.com/m`），并且该目录下不能存在 `go.mod` 文件。该模块可能拥有较低主版本号的版本，如 `v1.5.2`，而 `go` 命令可能会从这些版本自动升级到 `v4.1.2+incompatible`（有关升级工作原理的更多信息，请参阅[最小版本选择（MVS）](#minimal-version-selection)）。

一个在标签 `v2.0.0` 之后才迁移到模块的仓库，通常应该发布一个新的主版本。在上面的例子中，作者应该创建一个路径为 `example.com/m/v5` 的模块，并发布版本 `v5.0.0`。作者还应更新模块中包的导入，使用前缀 `example.com/m/v5` 而不是 `example.com/m`。有关更详细的示例，请参阅 [Go Modules: v2 及更高版本](/blog/v2-go-modules)。

请注意，`+incompatible` 后缀不应出现在仓库的标签中；像 `v4.1.2+incompatible` 这样的标签将被忽略。该后缀仅出现在 `go` 命令使用的版本中。有关版本与标签区别的详细信息，请参阅[将版本映射到提交](#vcs-version)。

还要注意，`+incompatible` 后缀也可能出现在[伪版本](#glos-pseudo-version)上。例如，`v2.0.1-20200722182040-012345abcdef+incompatible` 可能是一个有效的伪版本。

### 最小模块兼容性 {#minimal-module-compatibility}

主版本号为 2 或更高时发布的模块，要求在其[模块路径](#glos-module-path)上包含[主版本后缀](#glos-major-version-suffix)。该模块在其仓库中，可能开发在[主版本子目录](#glos-major-version-subdirectory)内，也可能不是。这会对在构建 `GOPATH` 模式下，导入该模块内部包的包产生影响。

通常在 `GOPATH` 模式下，一个包存储在与其[仓库根路径](#glos-repository-root-path)匹配，再拼接其仓库内目录的路径下。例如，一个根路径为 `example.com/repo` 的仓库中的子目录 `sub` 下的包，将存储在 `$GOPATH/src/example.com/repo/sub`，并被导入为 `example.com/repo/sub`。

对于带有主版本后缀的模块，人们可能期望在目录 `$GOPATH/src/example.com/repo/v2/sub` 中找到包 `example.com/repo/v2/sub`。这将要求该模块在其仓库的 `v2` 子目录下进行开发。`go` 命令支持这一点，但不强制要求（请参阅[将版本映射到提交](#vcs-version)）。

如果一个模块*并非*在主版本子目录下开发，那么它在 `GOPATH` 中的目录将不包含主版本后缀，并且其包可以不带主版本后缀被导入。在上面的例子中，该包将在目录 `$GOPATH/src/example.com/repo/sub` 中找到，并被导入为 `example.com/repo/sub`。

这给旨在同时在模块模式和 `GOPATH` 模式下构建的包带来了问题：模块模式要求后缀，而 `GOPATH` 模式则不要求。

为了解决这个问题，Go 1.11 中添加了 <dfn>最小模块兼容性</dfn>，并已向后移植到 Go 1.9.7 和 1.10.3。当在 `GOPATH` 模式下解析一个导入路径时：

* 当解析一个格式为 `$modpath/$vn/$dir` 的导入时，其中：
  * `$modpath` 是一个有效的模块路径，
  * `$vn` 是一个主版本后缀，
  * `$dir` 是一个可能为空的子目录，
* 如果以下条件全部为真：
  * 包 `$modpath/$vn/$dir` 不在任何相关的 [`vendor` 目录](#glos-vendor-directory)中。
  * 与导入文件相同的目录中或直至 `$GOPATH/src` 根目录的任何父目录中存在 `go.mod` 文件，
  * 不存在目录 `$GOPATH[i]/src/$modpath/$vn/$suffix`（对于任何根 `$GOPATH[i]`），
  * 文件 `$GOPATH[d]/src/$modpath/go.mod` 存在（对于某个根 `$GOPATH[d]`）并且声明模块路径为 `$modpath/$vn`，
* 则 `$modpath/$vn/$dir` 的导入将被解析到目录 `$GOPATH[d]/src/$modpath/$dir`。

这些规则使得已迁移到模块的包，在 `GOPATH` 模式下构建时，即使未使用主版本子目录，也能够导入其他已迁移到模块的包。

## 模块感知命令 {#mod-commands}

大多数 `go` 命令可以在*模块感知模式*或*`GOPATH` 模式*下运行。在模块感知模式下，`go` 命令使用 `go.mod` 文件来查找版本化的依赖项，并且通常从[模块缓存](#glos-module-cache)加载包，如果模块缺失则会下载它们。在 `GOPATH` 模式下，`go` 命令忽略模块；它会在 [`vendor` 目录](#glos-vendor-directory)和 `GOPATH` 中查找依赖项。

从 Go 1.16 开始，模块感知模式默认启用，无论是否存在 `go.mod` 文件。在较低版本中，只有当当前目录或任何父目录中存在 `go.mod` 文件时，才会启用模块感知模式。

模块感知模式可以通过 `GO111MODULE` 环境变量来控制，该变量可以设置为 `on`、`off` 或 `auto`。

* 如果 `GO111MODULE=off`，则 `go` 命令忽略 `go.mod` 文件，并以 `GOPATH` 模式运行。
* 如果 `GO111MODULE=on` 或未设置，则 `go` 命令以模块感知模式运行，即使不存在 `go.mod` 文件。并非所有命令在没有 `go.mod` 文件的情况下都能工作：请参阅[模块外的模块命令](#commands-outside)。
* 如果 `GO111MODULE=auto`，则如果当前目录或任何父目录中存在 `go.mod` 文件，`go` 命令就以模块感知模式运行。在 Go 1.15 及更低版本中，这是默认行为。`go mod` 子命令和带有[版本查询](#version-queries)的 `go install` 会以模块感知模式运行，即使不存在 `go.mod` 文件。在模块感知模式下，`GOPATH` 不再定义构建时导入的含义，但它仍然存储下载的依赖项（位于 `GOPATH/pkg/mod`；参见[模块缓存](#module-cache)）和已安装的命令（位于 `GOPATH/bin`，除非设置了 `GOBIN`）。

### 构建命令 {#build-commands}

所有加载包信息的命令都是模块感知的。这包括：

* `go build`
* `go fix`
* `go generate`
* `go install`
* `go list`
* `go run`
* `go test`
* `go vet`

在模块感知模式下运行时，这些命令使用 `go.mod` 文件来解释命令行上列出或在 Go 源文件中写入的导入路径。这些命令接受以下标志，这些标志对所有模块命令通用。

* `-mod` 标志控制 `go.mod` 是否可以被自动更新，以及是否使用 `vendor` 目录。
  * `-mod=mod` 告诉 `go` 命令忽略供应商目录并[自动更新](#go-mod-file-updates) `go.mod`，例如，当导入的包不由任何已知模块提供时。
  * `-mod=readonly` 告诉 `go` 命令忽略供应商目录，并在 `go.mod` 需要更新时报告错误。
  * `-mod=vendor` 告诉 `go` 命令使用供应商目录。在此模式下，`go` 命令将不使用网络或模块缓存。
  * 默认情况下，如果 `go.mod` 中的 [`go` 版本](#go-mod-file-go)为 `1.14` 或更高，并且存在 `vendor` 目录，则 `go` 命令的行为就好像使用了 `-mod=vendor`。否则，`go` 命令的行为就好像使用了 `-mod=readonly`。
  * `go get` 会拒绝此标志，因为该命令的目的是修改依赖项，而这仅允许通过 `-mod=mod` 进行。
* `-modcacherw` 标志指示 `go` 命令在模块缓存中创建具有读写权限的新目录，而不是使它们成为只读。当始终使用此标志时（通常通过在环境变量中设置 `GOFLAGS=-modcacherw` 或运行 `go env -w GOFLAGS=-modcacherw`），可以使用 `rm -r` 等命令删除模块缓存，而无需先更改权限。无论是否使用了 `-modcacherw`，都可以使用 [`go clean -modcache`](#go-clean-modcache) 命令删除模块缓存。
* `-modfile=file.mod` 标志指示 `go` 命令读取（也可能写入）一个替代文件，而不是模块根目录中的 `go.mod`。文件名必须以 `.mod` 结尾。为了确定模块根目录，仍然必须存在一个名为 `go.mod` 的文件，但它不会被访问。当指定 `-modfile` 时，也会使用一个替代的 `go.sum` 文件：其路径通过截取 `-modfile` 标志的 `.mod` 扩展名并追加 `.sum` 派生而来。

### 供应商目录 {#vendoring}

使用模块时，`go` 命令通常通过从源代码下载模块到模块缓存，然后从这些下载的副本加载包来满足依赖关系。<dfn>供应商目录</dfn>可用于允许与旧版本的 Go 互操作，或确保构建所使用的所有文件都存储在单一的文件树中。

[`go mod vendor`](#go-mod-vendor) 命令在[主模块](#glos-main-module)的根目录中构造一个名为 `vendor` 的目录，其中包含构建和测试主模块中包所需的所有包的副本。仅被主模块外部包的测试导入的包不包括在内。与 [`go mod tidy`](#go-mod-tidy) 和其他模块命令一样，在构造 `vendor` 目录时不考虑除 `ignore` 之外的[构建约束](#glos-build-constraint)。

`go mod vendor` 还会创建文件 `vendor/modules.txt`，其中包含已供应商的包列表以及它们从中复制的模块版本。当启用供应商目录时，此清单将用作模块版本信息的来源，如 [`go list -m`](#go-list-m) 和 [`go version -m`](#go-version-m) 所报告。当 `go` 命令读取 `vendor/modules.txt` 时，它会检查模块版本是否与 `go.mod` 一致。如果在生成 `vendor/modules.txt` 后 `go.mod` 已经更改，`go` 命令将报告错误。应再次运行 `go mod vendor` 以更新 `vendor` 目录。

如果主模块的根目录中存在 `vendor` 目录，并且主模块的 [`go.mod` 文件](#glos-go-mod-file)中的 [`go` 版本](#go-mod-file-go)为 `1.14` 或更高，则会自动使用该目录。要显式启用供应商目录，请使用标志 `-mod=vendor` 调用 `go` 命令。要禁用供应商目录，请使用标志 `-mod=readonly` 或 `-mod=mod`。

当启用供应商目录时，`go build` 和 `go test` 等[构建命令](#build-commands)从 `vendor` 目录加载包，而不是访问网络或本地模块缓存。[`go list -m`](#go-list-m) 命令仅打印 `go.mod` 中列出的模块的信息。当启用供应商目录时，`go mod` 命令（如 [`go mod download`](#go-mod-download) 和 [`go mod tidy`](#go-mod-tidy)）的工作方式不会不同，仍然会下载模块和访问模块缓存。当启用供应商目录时，[`go get`](#go-get) 的工作方式也不同。

与 [`GOPATH` 模式下的供应商目录](/s/go15vendor)不同，`go` 命令会忽略主模块根目录以外位置的供应商目录。此外，由于不使用其他模块中的供应商目录，`go` 命令在构建[模块 zip 文件](#zip-files)时不包含供应商目录（但请参阅已知 bug [#31562](/issue/31562) 和 [#37397](/issue/37397)）。

### `go get` {#go-get}

用法：```
go get [-d] [-t] [-u] [-tool] [build flags] [packages]
```示例：

`go get` 命令会更新[主模块](#glos-main-module)的 [`go.mod` 文件](#go-mod-file)中的模块依赖关系，然后构建并安装命令行中列出的包。

第一步是确定要更新哪些模块。`go get` 接受一个包列表、包模式（package patter```
# Upgrade a specific module.
$ go get golang.org/x/net

# Upgrade modules that provide packages imported by packages in the main module.
$ go get -u ./...

# Upgrade or downgrade to a specific version of a module.
$ go get golang.org/x/text@v0.3.2

# Update to the commit on the module's master branch.
$ go get golang.org/x/text@master

# Remove a dependency on a module and downgrade modules that require it
# to versions that don't require it.
$ go get golang.org/x/text@none

# Upgrade the minimum required Go version for the main module.
$ go get go

# Upgrade the suggested Go toolchain, leaving the minimum Go version alone.
$ go get toolchain

# Upgrade to the latest patch release of the suggested Go toolchain.
$ go get toolchain@patch
````go get` 命令会更新 [`go.mod` 文件](#go-mod-file)中[主模块](#glos-main-module)的模块依赖项，然后构建并安装命令行中列出的包。

第一步是确定要更新哪些模块。`go get` 接受一组包、包模式（package patterns）和模块路径作为参数。如果指定了一个包参数，`go get` 会更新提供该包的模块。如果指定了一个包模式（例如 `all` 或包含 `...` 通配符的路径），`go get` 会将该模式扩展为一组包，然后更新提供这些包的模块。如果某个参数命名了一个模块而非一个包（例如，模块 `golang.org/x/net` 的根目录下没有包），`go get` 将更新该模块但不会构建包。如果未指定任何参数，`go get` 将表现如同指定了 `.`（即当前目录中的包）；这可以与 `-u` 标志一起使用来更新那些提供已导入包的模块。

每个参数可以包含一个<dfn>版本查询后缀</dfn>来指定期望的版本，例如 `go get golang.org/x/text@v0.3.0`。版本查询后缀由 `@` 符号后跟一个[版本查询](#version-queries)组成，该查询可以指示一个具体版本（`v0.3.0`）、一个版本前缀（`v0.3`）、一个分支或标签名（`master`）、一个修订版号（`1234abcd`），或者一个特殊查询：`latest`、`upgrade`、`patch` 或 `none`。如果未指定版本，`go get` 使用 `@upgrade` 查询。

一旦 `go get` 将其参数解析为特定的模块和版本，它将在主模块的 `go.mod` 文件中添加、更改或移除 [`require` 指令](#go-mod-file-require)，以确保这些模块在未来保持期望的版本。请注意，`go.mod` 文件中要求的版本是*最低版本*，并且随着新依赖项的添加，该版本可能会自动提高。有关模块感知命令如何选择版本和解决冲突的详细信息，请参阅[最小版本选择（MVS）](#minimal-version-selection)。

当命令行中指定的模块被添加、升级或降级时，如果该命名模块的新版本要求其他模块处于更高版本，则其他模块也可能被升级。例如，假设模块 `example.com/a` 升级到版本 `v1.5.0`，而该版本要求模块 `example.com/b` 的版本为 `v1.2.0`。如果当前要求的模块 `example.com/b` 版本为 `v1.1.0`，那么执行 `go get example.com/a@v1.5.0` 也会将 `example.com/b` 升级到 `v1.2.0`。

![go get 升级传递性要求](/doc/mvs/get-upgrade.svg)

当命令行中指定的模块被降级或移除时，其他模块也可能被降级。继续上面的例子，假设模块 `example.com/b` 被降级到 `v1.1.0`。那么模块 `example.com/a` 也会被降级到一个版本，该版本要求 `example.com/b` 的版本为 `v1.1.0` 或更低。

![go get 降级传递性要求](/doc/mvs/get-downgrade.svg)

可以使用版本后缀 `@none` 移除一个模块要求。这是一种特殊的降级。依赖于被移除模块的模块将根据需要被降级或移除。即使主模块中的包导入了被移除模块的一个或多个包，也可以移除该模块要求。在这种情况下，下一个构建命令可能会添加一个新的模块要求。

如果某个模块在两个不同版本（由命令行参数显式指定或为满足升级/降级要求）下都需要，`go get` 将报告错误。

在 `go get` 选择了一组新版本后，它会检查新选择的模块版本或命令行中命名的包所提供的任何模块是否被[撤回](#glos-retracted-version)或[弃用](#glos-deprecated-module)。`go get` 会为它找到的每个被撤回的版本或被弃用的模块打印警告。可以使用 [`go list -m -u all`](#go-list-m) 来检查所有依赖项中的撤回和弃用情况。

`go get` 更新 `go.mod` 文件后，会构建命令行中命名的包。可执行文件将被安装在 `GOBIN` 环境变量指定的目录中；如果未设置 `GOPATH` 环境变量，则默认为 `$GOPATH/bin` 或 `$HOME/go/bin`。

`go get` 支持以下标志：

* `-d` 标志告诉 `go get` 不要构建或安装包。当使用 `-d` 时，`go get` 将只管理 `go.mod` 中的依赖项。不使用 `-d` 来构建和安装包的方式已被弃用（自 Go 1.17 起）。在 Go 1.18 中，`-d` 将始终被启用。
* `-u` 标志告诉 `go get` 升级那些提供由命令行中命名的包直接或间接导入的包的模块。除非已被要求更高版本（预发布版本），否则 `-u` 选择的每个模块都将被升级到其最新版本。
* `-u=patch` 标志（不是 `-u patch`）也告诉 `go get` 升级依赖项，但 `go get` 会将每个依赖项升级到最新的补丁版本（类似于 `@patch` 版本查询）。
* `-t` 标志告诉 `go get` 考虑构建命令行中命名的包的测试所需的模块。当 `-t` 和 `-u` 一起使用时，`go get` 也会更新测试依赖项。
* `-insecure` 标志不应再使用。它允许 `go get` 解析自定义导入路径，并使用不安全的方案（如 HTTP）从仓库和模块代理获取。`GOINSECURE` [环境变量](#environment-variables)提供了更细粒度的控制，应改用该变量。
* `-tool` 标志指示 `go` 为每个列出的包在 `go.mod` 中添加一个匹配的 `tool` 行。如果 `-tool` 与 `@none` 一起使用，该行将被移除。自 Go 1.16 版本起，[`go install`](#go-install) 成为推荐用于构建和安装程序的命令。当使用版本后缀（如 `@latest` 或 `@v1.4.6`）时，`go install` 会在模块感知模式下构建包，同时忽略当前目录或任何父目录（如果存在）中的 `go.mod` 文件。

`go get` 则更专注于管理 `go.mod` 中的需求。其 `-d` 标志已被弃用，并且自 Go 1.18 版本起，该标志的功能已默认启用。

### `go install` {#go-install}

用法：```
go install [build flags] [packages]
```示例：```
# Install the latest version of a program,
# ignoring go.mod in the current directory (if any).
$ go install golang.org/x/tools/gopls@latest

# Install a specific version of a program.
$ go install golang.org/x/tools/gopls@v0.6.4

# Install a program at the version selected by the module in the current directory.
$ go install golang.org/x/tools/gopls

# Install all programs in a directory.
$ go install ./cmd/...
````go install` 命令用于构建并安装命令行参数指定的包。可执行文件（即 `main` 包）会被安装到由 `GOBIN` 环境变量指定的目录中；若未设置该变量，则默认安装到 `$GOPATH/bin` 或 `$HOME/go/bin`。位于 `$GOROOT` 中的可执行文件将安装到 `$GOROOT/bin` 或 `$GOTOOLDIR`，而非 `$GOBIN`。非可执行包则仅被构建和缓存，不会被安装。

自 Go 1.16 起，如果参数带有版本后缀（如 `@latest` 或 `@v1.0.0`），`go install` 将以**模块感知模式**构建包，并忽略当前目录或任何父目录中的 `go.mod` 文件（如果存在）。这在安装可执行文件时非常有用，因为它不会影响主模块的依赖关系。

为消除构建过程中使用的模块版本可能存在的歧义，如果任何参数带有版本后缀，则必须满足以下约束：

*   参数必须是包路径或包模式（使用 "`...`" 通配符）。它们不能是标准库包（如 `fmt`）、元模式（`std`、`cmd`、`all`、`work`、`tool`）或相对/绝对文件路径。请注意，`go install tool` 可以不带版本后缀使用：参见下文。
*   所有参数必须具有相同的版本后缀。不允许使用不同的查询条件，即使它们引用的是相同版本。
*   所有参数必须指向同一模块中同一版本的包。
*   包路径参数必须指向 `main` 包。模式参数将只匹配 `main` 包。
*   没有任何模块被视为[主模块](#glos-main-module)。
    *   如果命令行中指定的包所在的模块包含 `go.mod` 文件，则该文件不得包含可能导致其在作为主模块时被不同解释的指令（`replace` 和 `exclude`）。
    *   该模块不得依赖更高版本的自身。
    *   任何模块中都不使用 vendor 目录。（vendor 目录不包含在[模块 zip 文件](#zip-files)中，因此 `go install` 不会下载它们。）

关于支持的版本查询语法，请参见[版本查询](#version-queries)。Go 1.15 及更低版本不支持与 `go install` 一起使用版本查询。

如果参数不带版本后缀，`go install` 可能以模块感知模式或 `GOPATH` 模式运行，具体取决于 `GO111MODULE` 环境变量以及是否存在 `go.mod` 文件。详见[模块感知命令](#mod-commands)。如果启用了模块感知模式，`go install` 将在主模块的上下文中运行，该主模块可能与被安装包所在的模块不同。在模块感知模式下，可以从一个模块使用 `go install tool` 来安装该模块中的所有工具。

### `go tool` {#go-tool}

用法：```
go tool [-n] command [args...]
```示例：```
$ go tool golang.org/x/tools/cmd/stringer
$ go tool stringer
```在模块模式下，`go tool` 命令可用于构建并运行在 `go.mod` 文件中通过 [`tool` 指令](#go-mod-file-tool)声明的工具。该命令可通过工具的完整包路径指定，也可以使用工具的默认二进制名称（即包路径的最后一部分，不包含主版本后缀），前提是该名称在已安装的工具中是唯一的。

### `go list -m` {#go-list-m}

用法：```
go list -m [-u] [-retracted] [-versions] [list flags] [modules]
```示例：```
$ go list -m all
$ go list -m -versions example.com/m
$ go list -m -json example.com/m@latest
```使用 `-m` 标志会使 `go list` 列出模块而非包。在此模式下，`go list` 的参数可以是模块、模块模式（包含 `...` 通配符）、[版本查询](#version-queries) 或特殊模式 `all`（匹配[构建列表](#glos-build-list)中的所有模块）。若未指定参数，则列出[主模块](#glos-main-module)。

当列出模块时，`-f` 标志仍用于指定应用于Go结构体的格式模板，但此时对应的结构体为 `Module`：```go
type Module struct {
    Path       string        // 模块路径
    Version    string        // 模块版本
    Versions   []string      // 可用的模块版本列表
    Replace    *Module       // 替换为此模块
    Time       *time.Time    // 版本创建时间
    Update     *Module       // 可用的更新版本（使用 -u 标志时）
    Main       bool          // 是否为主模块
    Indirect   bool          // 模块是否仅被主模块间接依赖
    Dir        string        // 包含文件本地副本的目录（如有）
    GoMod      string        // 描述模块的 go.mod 文件路径（如有）
    GoVersion  string        // 模块使用的 Go 版本
    Retracted  []string      // 撤回信息（使用 -retracted 或 -u 标志时）
    Deprecated string        // 废弃信息（使用 -u 标志时）
    Error      *ModuleError  // 加载模块时的错误
}

type ModuleError struct {
    Err string // 错误本身
}
```默认输出是先打印模块路径，然后是版本信息及任何替换信息（如有）。例如，`go list -m all` 命令可能会打印：```
example.com/main/module
golang.org/x/net v0.1.0
golang.org/x/text v0.3.0 => /tmp/text
rsc.io/pdf v0.1.1
````Module` 结构体包含一个 `String` 方法用于格式化输出行，因此默认格式等效于 {{raw "`-f '{{.String}}'`"}}。

请注意，当模块被替换时，其 `Replace` 字段会描述替换模块的信息，若存在替换模块的源码，其 `Dir` 字段将指向该替换模块的源码路径。（即当 `Replace` 非空时，`Dir` 会被设置为 `Replace.Dir`，此时无法访问被替换的原始源码。）

`-u` 标志会添加可用升级信息。当指定模块存在比当前版本更新的版本时，`list -u` 会将该新模块信息设置到模块的 `Update` 字段中。同时 `list -u` 还会显示当前选择的版本是否处于[已撤回](#glos-retracted-version)状态，以及该模块是否已被[标记弃用](#go-mod-file-module-deprecation)。模块的 `String` 方法会在当前版本后方以方括号格式显示可用升级的版本号。例如，`go list -m -u all` 可能输出如下内容：```
example.com/main/module
golang.org/x/old v1.9.9 (deprecated)
golang.org/x/net v0.1.0 (retracted) [v0.2.0]
golang.org/x/text v0.3.0 [v0.4.0] => /tmp/text
rsc.io/pdf v0.1.1 [v0.1.2]
```（对于工具而言，`go list -m -u -json all` 可能更便于解析。）

`-versions` 标志会使 `list` 命令将模块的 `Versions` 字段设置为该模块所有已知版本的列表，按语义化版本控制排序，从低到高。此标志还会改变默认输出格式，使其显示模块路径后跟以空格分隔的版本列表。除非同时指定 `-retracted` 标志，否则已撤回的版本将从该列表中省略。

`-retracted` 标志指示 `list` 命令在通过 `-versions` 标志打印的列表中显示已撤回的版本，并在解析[版本查询](#version-queries)时考虑已撤回的版本。例如，`go list -m -retracted example.com/m@latest` 会显示模块 `example.com/m` 的最高发布版或预发布版，即使该版本已被撤回。此版本对应的 [`retract` 指令](#go-mod-file-retract)和[弃用信息](#go-mod-file-module-deprecation)会从 `go.mod` 文件中加载。`-retracted` 标志在 Go 1.16 中新增。

模板函数 `module` 接受一个必须为模块路径或查询的单个字符串参数，并将指定模块作为 `Module` 结构体返回。如果发生错误，结果将是一个 `Error` 字段非空的 `Module` 结构体。

### `go mod download` {#go-mod-download}

用法：```
go mod download [-x] [-json] [-reuse=old.json] [modules]
```示例：```
$ go mod download
$ go mod download golang.org/x/mod@v0.2.0
````go mod download` 命令会将指定的模块下载到[模块缓存](#glos-module-cache)中。其参数可以是模块路径、匹配主模块依赖的模块模式，或采用 `path@version` 格式的[版本查询](#version-queries)。如果不带参数，`download` 将作用于[主模块](#glos-main-module)的所有依赖项。

在常规执行过程中，`go` 命令会按需自动下载模块。`go mod download` 命令主要用于预填充模块缓存，或为[模块代理](#glos-module-proxy)加载待提供的数据。

默认情况下，`download` 不会向标准输出写入任何内容。它会将进度消息和错误信息打印到标准错误输出。

`-json` 标志会使 `download` 向标准输出打印一系列 JSON 对象，每个对象描述一个已下载的模块（或下载失败的情况），对应以下 Go 结构体：```go
type Module struct {
    Path     string // 模块路径
    Query    string // 对应此版本的版本查询
    Version  string // 模块版本
    Error    string // 加载模块时的错误
    Info     string // 已缓存的.info文件的绝对路径
    GoMod    string // 已缓存的.mod文件的绝对路径
    Zip      string // 已缓存的.zip文件的绝对路径
    Dir      string // 已缓存的源代码根目录的绝对路径
    Sum      string // 路径和版本的校验和（如go.sum中所示）
    GoModSum string // go.mod的校验和（如go.sum中所示）
    Origin   any    // 模块的来源信息
    Reuse    bool   // 重用旧模块信息是否安全
}
````-x` 标志会导致 `download` 命令将其执行的命令输出到标准错误流。

`-reuse` 标志接受一个文件名作为参数，该文件应包含之前执行 `go mod download -json` 命令时产生的 JSON 输出。go 命令可以利用此文件来判断某个自上次调用后是否已发生变更，从而避免重新下载。那些未被重新下载的模块会在新输出中通过将 `Reuse` 字段设置为 `true` 来标记。通常，模块缓存会自动提供这种复用机制；`-reuse` 标志在不保留模块缓存的系统上可能会非常有用。

### `go mod edit` {#go-mod-edit}

用法：```
go mod edit [editing flags] [-fmt|-print|-json] [go.mod]
```示例：

`go mod edit` 命令提供了一个用于编辑和格式化 `go.mod` 文件的命令行界面，主要供工具和脚本使用。`go mod edit` 仅读取一个 `go.mod` 文件；它不会查找关于其他模块的信息。默认情况下，`go mod edit` 读取并写入当前目录下的 `go.mod` 文件。```
# Add a replace directive.
$ go mod edit -replace example.com/a@v1.0.0=./a

# Remove a replace directive.
$ go mod edit -dropreplace example.com/a@v1.0.0

# Set the go version, add a requirement, and print the file
# instead of writing it to disk.
$ go mod edit -go=1.14 -require=example.com/m@v1.0.0 -print

# Format the go.mod file.
$ go mod edit -fmt

# Format and print a different .mod file.
$ go mod edit -print tools.mod

# Print a JSON representation of the go.mod file.
$ go mod edit -json
````go mod edit` 命令为编辑和格式化 `go.mod` 文件提供了一个命令行界面，主要供工具和脚本使用。`go mod edit` 仅读取一个 `go.mod` 文件；它不会查找关于其他模块的信息。默认情况下，`go mod edit` 读写主模块的 `go.mod` 文件，但可以在编辑标志之后指定一个不同的目标文件。

编辑标志指定一系列编辑操作。

*   `-module` 标志用于更改模块的路径（即 `go.mod` 文件的 `module` 行）。
*   `-go=version` 标志用于设置预期的 Go 语言版本。
*   `-require=path@version` 和 `-droprequire=path` 标志用于添加和移除针对给定模块路径和版本的依赖项。请注意，`-require` 会覆盖任何已存在的对 `path` 的依赖项。这些标志主要供理解模块图的工具使用。用户应优先使用 `go get path@version` 或 `go get path@none`，它们会根据需要对 `go.mod` 进行其他调整，以满足其他模块施加的约束。请参阅 [`go get`](#go-get)。
*   `-exclude=path@version` 和 `-dropexclude=path@version` 标志用于添加和移除针对给定模块路径和版本的排除项。请注意，如果该排除项已存在，`-exclude=path@version` 将不执行任何操作。
*   `-replace=old[@v]=new[@v]` 标志用于添加给定模块路径和版本对的替换项。如果省略了 `old@v` 中的 `@v`，则会添加一个左侧没有版本的替换项，该替换项适用于旧模块路径的所有版本。如果省略了 `new@v` 中的 `@v`，则新路径应该是一个本地模块根目录，而不是模块路径。请注意，`-replace` 会覆盖任何对 `old[@v]` 的冗余替换项，因此省略 `@v` 将移除针对特定版本的替换项。
*   `-dropreplace=old[@v]` 标志用于移除给定模块路径和版本对的替换项。如果提供了 `@v`，则移除具有给定版本的替换项。一个左侧没有版本的现有替换项可能仍然会替换该模块。如果省略了 `@v`，则移除一个没有版本的替换项。
*   `-retract=version` 和 `-dropretract=version` 标志用于添加和移除针对给定版本的撤回声明，该版本可以是单个版本（例如 `v1.2.3`）或一个区间（例如 `[v1.1.0,v1.2.0]`）。请注意，`-retract` 标志无法为 `retract` 指令添加理由注释。推荐提供理由注释，并且它们可能会被 `go list -m -u` 和其他命令显示。
*   `-tool=path` 和 `-droptool=path` 标志用于添加和移除给定路径的 `tool` 指令。请注意，这不会将必要的依赖项添加到构建图中。用户应优先使用 `go get -tool path` 来添加工具，或使用 `go get -tool path@none` 来移除工具。

编辑标志可以重复使用。更改将按给定的顺序应用。

`go mod edit` 还有其他控制其输出的标志。

*   `-fmt` 标志会重新格式化 `go.mod` 文件，而不进行其他更改。任何使用或重写 `go.mod` 文件的其他修改操作也会隐含这种重新格式化。唯一需要此标志的情况是没有指定其他标志，例如 `go mod edit -fmt`。
*   `-print` 标志会以文本格式打印最终的 `go.mod` 文件，而不是将其写回磁盘。
*   `-json` 标志会以 JSON 格式打印最终的 `go.mod` 文件，而不是以文本格式将其写回磁盘。JSON 输出对应以下 Go 类型：```
type Module struct {
    Path    string
    Version string
}

type GoMod struct {
    Module  ModPath
    Go      string
    Require []Require
    Exclude []Module
    Replace []Replace
    Retract []Retract
}

type ModPath struct {
    Path       string
    Deprecated string
}

type Require struct {
    Path     string
    Version  string
    Indirect bool
}

type Replace struct {
    Old Module
    New Module
}

type Retract struct {
    Low       string
    High      string
    Rationale string
}

type Tool struct {
    Path      string
}
```请注意，这仅描述 `go.mod` 文件本身，而非间接引用的其他模块。要获取构建可用的完整模块集合，请使用 `go list -m -json all`。详情请参阅 [`go list -m`](#go-list-m)。

例如，工具可以通过解析 `go mod edit -json` 的输出将 `go.mod` 文件作为数据结构获取，随后通过调用带有 `-require`、`-exclude` 等参数的 `go mod edit` 命令进行修改。

工具也可使用 [`golang.org/x/mod/modfile`](https://pkg.go.dev/golang.org/x/mod/modfile?tab=doc) 包来解析、编辑和格式化 `go.mod` 文件。

### `go mod graph` {#go-mod-graph}

用法：```
go mod graph [-go=version]
````go mod graph` 命令以文本形式打印[模块需求图](#glos-module-graph)（应用替换后）。例如：```
example.com/main example.com/a@v1.1.0
example.com/main example.com/b@v1.2.0
example.com/a@v1.1.0 example.com/b@v1.1.1
example.com/a@v1.1.0 example.com/c@v1.3.0
example.com/b@v1.1.0 example.com/c@v1.1.0
example.com/b@v1.2.0 example.com/c@v1.2.0
```模块图中的每个顶点代表模块的一个特定版本。图中的每条边表示对依赖项最低版本的需求。

`go mod graph` 命令会逐行打印图的边，每行包含两个以空格分隔的字段：一个模块版本及其依赖项之一。每个模块版本以 `路径@版本` 的字符串形式标识。主模块没有 `@版本` 后缀，因为它没有版本号。

`-go` 标志会使 `go mod graph` 报告由指定 Go 版本加载的模块图，而不是 `go.mod` 文件中 [`go` 指令](#go-mod-file-go) 指定的版本。

关于版本选择机制的详细信息，请参阅[最小版本选择（MVS）](#minimal-version-selection)。另请参阅 [`go list -m`](#go-list-m) 了解如何打印已选版本，以及 [`go mod why`](#go-mod-why) 了解为何需要某个模块。

### `go mod init` {#go-mod-init}

用法：```
go mod init [module-path]
```示例：```
go mod init
go mod init example.com/m
````go mod init` 命令会在当前目录初始化并写入一个新的 `go.mod` 文件，实质上是以当前目录为根创建了一个新模块。该 `go.mod` 文件必须不存在。

`init` 接受一个可选参数，即新模块的[模块路径](#glos-module-path)。有关选择模块路径的说明，请参阅[模块路径](#module-path)。若省略模块路径参数，`init` 将尝试通过 `.go` 文件中的导入注释以及当前目录（若位于 `GOPATH` 内）推断模块路径。

### `go mod tidy` {#go-mod-tidy}

用法：```
go mod tidy [-e] [-v] [-x] [-diff] [-go=version] [-compat=version]
````go mod tidy` 确保 `go.mod` 文件与模块中的源代码匹配。它会添加构建当前模块的包及其依赖项所需的任何缺失的模块要求，并移除不提供任何相关包的模块要求。它还会向 `go.sum` 添加所有缺失的条目，并移除不必要的条目。

`-e` 标志（Go 1.16 中新增）会使 `go mod tidy` 在加载包时遇到错误后仍尝试继续执行。

`-v` 标志会使 `go mod tidy` 将有关被移除模块的信息打印到标准错误输出。

`-x` 标志会使 `go mod tidy` 打印 `tidy` 执行的命令。

`-diff` 标志会使 `go mod tidy` 不修改 go.mod 或 go.sum，而是将必要的更改作为统一的 diff 输出。如果 diff 不为空，则以非零退出码退出。

`go mod tidy` 通过递归加载[主模块](#glos-main-module)中的所有包、其所有工具以及它们导入的所有包来工作。这包括被测试导入的包（包括其他模块中的测试）。`go mod tidy` 的行为如同所有构建标签均已启用，因此它会考虑特定于平台的源文件以及需要自定义构建标签的文件，即使这些源文件通常不会被构建。有一个例外：`ignore` 构建标签不会被启用，因此带有构建约束 `// +build ignore` 的文件不会被考虑。请注意，除非这些包被其他包显式导入，否则 `go mod tidy` 不会考虑主模块中名为 `testdata` 或以 `.` 或 `_` 开头的目录中的包。

一旦 `go mod tidy` 加载了这组包，它会确保每个提供一个或多个包的模块在主模块的 `go.mod` 文件中都有一个 `require` 指令，或者——如果主模块的版本是 `go 1.16` 或更低——被另一个必需的模块所要求。`go mod tidy` 将会为每个缺失的模块添加其最新版本的要求（关于 `latest` 版本的定义，请参阅[版本查询](#version-queries)）。`go mod tidy` 将移除那些未提供上述包集合中任何包的模块的 `require` 指令。

`go mod tidy` 可能还会添加或移除 `require` 指令上的 `// indirect` 注释。`// indirect` 注释表示一个模块，它未提供主模块中的包所导入的包。（有关何时添加 `// indirect` 依赖项和注释的更多详情，请参阅 [`require` 指令](#go-mod-file-require)。）

如果设置了 `-go` 标志，`go mod tidy` 将把 [`go` 指令](#go-mod-file-go)更新到指定的版本，并根据该版本启用或禁用[模块图剪枝](#graph-pruning)和[延迟模块加载](#lazy-loading)（并根据需要添加或移除间接依赖项）。

默认情况下，`go mod tidy` 会检查当模块图由 `go` 指令指定版本的前一个 Go 版本加载时，模块的[选定版本](#glos-selected-version)是否保持不变。要检查兼容性的版本也可以通过 `-compat` 标志显式指定。

### `go mod vendor` {#go-mod-vendor}

用法：```
go mod vendor [-e] [-v] [-o]
````go mod vendor` 命令会在[主模块](#glos-main-module)的根目录下创建一个名为 `vendor` 的目录，其中包含支持主模块中包的构建和测试所需的所有包的副本。仅被主模块外部包的测试导入的包不会被包含。与 [`go mod tidy`](#go-mod-tidy) 和其他模块命令一样，构建 `vendor` 目录时不会考虑[构建约束](#glos-build-constraint)（`ignore` 除外）。

当启用依赖提供（vendoring）时，`go` 命令将从 `vendor` 目录加载包，而不是将模块从其源代码下载到模块缓存并使用这些下载的副本。更多信息请参阅[依赖提供](#vendoring)。

`go mod vendor` 还会创建文件 `vendor/modules.txt`，该文件包含已提供依赖项的包列表以及它们复制自的模块版本。当启用依赖提供时，此清单将作为模块版本信息的来源，由 [`go list -m`](#go-list-m) 和 [`go version -m`](#go-version-m) 报告。当 `go` 命令读取 `vendor/modules.txt` 时，它会检查模块版本是否与 `go.mod` 一致。如果 `go.mod` 在生成 `vendor/modules.txt` 后已更改，则应再次运行 `go mod vendor`。

请注意，`go mod vendor` 会在重新构建 `vendor` 目录之前（如果存在）将其删除。不应在已提供的依赖包中进行本地更改。`go` 命令不会检查 `vendor` 目录中的包是否已被修改，但可以通过运行 `go mod vendor` 并检查是否发生了更改来验证 `vendor` 目录的完整性。

`-e` 标志（在 Go 1.16 中添加）使 `go mod vendor` 在加载包时遇到错误时仍尝试继续执行。

`-v` 标志使 `go mod vendor` 将已提供依赖项的模块和包名称打印到标准错误输出。

`-o` 标志（在 Go 1.18 中添加）使 `go mod vendor` 将依赖项树输出到指定的目录，而不是 `vendor`。参数可以是绝对路径或相对于模块根目录的路径。

### `go mod verify` {#go-mod-verify}

用法：```
go mod verify
````go mod verify` 检查存储在[模块缓存](#glos-module-cache)中的[主模块](#glos-main-module)依赖项自下载后是否被修改过。为执行此检查，`go mod verify` 会计算每个已下载模块的[`.zip` 文件](#zip-files)及其解压目录的哈希值，然后将这些哈希值与模块首次下载时记录的哈希值进行比较。`go mod verify` 会检查[构建列表](#glos-build-list)中的每个模块（可通过 [`go list -m all`](#go-list-m) 命令打印该列表）。

如果所有模块均未被修改，`go mod verify` 将输出 "all modules verified"。否则，它会报告哪些模块已被更改，并以非零状态码退出。

请注意，所有模块感知命令都会验证主模块的 `go.sum` 文件中的哈希值是否与下载到模块缓存中的模块所记录的哈希值匹配。如果 `go.sum` 中缺少某个哈希值（例如，因为该模块是首次使用），`go` 命令将使用[校验和数据库](#checksum-database)来验证其哈希值（除非模块路径与 `GOPRIVATE` 或 `GONOSUMDB` 匹配）。详见[模块认证](#authenticating)部分。

相比之下，`go mod verify` 检查模块 `.zip` 文件及其解压目录的哈希值是否与它们首次下载时记录在模块缓存中的哈希值匹配。这对于检测模块下载并验证*之后*对模块缓存中文件的更改非常有用。`go mod verify` 不会下载不在缓存中的模块内容，也不使用 `go.sum` 文件来验证模块内容。但是，`go mod verify` 可能需要下载 `go.mod` 文件以执行[最小版本选择](#minimal-version-selection)。它将使用 `go.sum` 来验证这些文件，并且可能会为缺失的哈希值添加 `go.sum` 条目。

### `go mod why` {#go-mod-why}

用法：```
go mod why [-m] [-vendor] packages...
````go mod why` 命令显示从主模块到每个列出的包的导入图中的最短路径。

输出由多个段落组成，每个段落对应命令行中指定的一个包或模块，段落之间用空行分隔。每个段落以 `#` 开头的注释行开始，标注目标包或模块。后续的行展示通过导入图的一条路径，每行一个包。如果某个包或模块没有被主模块引用，该段落将只显示一个括号注释说明该情况。

例如：```
$ go mod why golang.org/x/text/language golang.org/x/text/encoding
# golang.org/x/text/language
rsc.io/quote
rsc.io/sampler
golang.org/x/text/language

# golang.org/x/text/encoding
(main module does not need package golang.org/x/text/encoding)
````-m` 标志会使 `go mod why` 将其参数视为模块列表。`go mod why` 会打印出每个模块中任意包的路径。请注意，即使使用了 `-m` 标志，`go mod why` 查询的仍然是包图，而不是 [`go mod graph`](#go-mod-graph) 所打印的模块图。

`-vendor` 标志会使 `go mod why` 忽略主模块外部包的测试中的导入（如同 [`go mod vendor`](#go-mod-vendor) 一样）。默认情况下，`go mod why` 会考虑与 `all` 模式匹配的包图。在声明了 `go 1.16` 或更高版本（通过 `go.mod` 文件中的 [`go` 指令](#go-mod-file-go)）的模块中，自 Go 1.16 起此标志不再有效，因为 `all` 的含义已更改为匹配 `go mod vendor` 所匹配的包集合。

### `go version -m` {#go-version-m}

用法：```
go version [-m] [-v] [file ...]
```示例:

```
go version [-m] [-v] [file ...]
```

`go version` 会报告用于构建命令行中指定的每个可执行文件所使用的 Go 版本。

如果命令行中未指定文件，`go version` 将打印其自身的版本信息。

如果指定了一个目录，`go version` 会递归地遍历该目录，查找可识别的 Go 可执行文件。```
# Print Go version used to build go.
$ go version

# Print Go version used to build a specific executable.
$ go version ~/go/bin/gopls

# Print Go version and module versions used to build a specific executable.
$ go version -m ~/go/bin/gopls

# Print Go version and module versions used to build executables in a directory.
$ go version -m ~/go/bin/
````go version` 命令报告用于构建命令行中指定的每个可执行文件的Go版本。

如果命令行中未指定文件，`go version` 将打印其自身的版本信息。

如果指定了一个目录，`go version` 会递归遍历该目录，查找已识别的Go二进制文件并报告它们的版本。默认情况下，`go version` 不会报告在目录扫描过程中发现的未识别文件。使用 `-v` 标志可以使其报告未识别的文件。

`-m` 标志会使 `go version` 打印每个可执行文件内嵌的模块版本信息（如果可用）。对于每个可执行文件，`go version -m` 会打印一个由制表符分隔的列组成的表格，如下所示。```
$ go version -m ~/go/bin/goimports
/home/jrgopher/go/bin/goimports: go1.14.3
        path    golang.org/x/tools/cmd/goimports
        mod     golang.org/x/tools      v0.0.0-20200518203908-8018eb2c26ba      h1:0Lcy64USfQQL6GAJma8BdHCgeofcchQj+Z7j0SXYAzU=
        dep     golang.org/x/mod        v0.2.0          h1:KU7oHjnv3XNWfa5COkzUifxZmxp1TyI7ImMXqFxLwvQ=
        dep     golang.org/x/xerrors    v0.0.0-20191204190536-9bdfabe68543      h1:E7g+9GITq07hpfrRu66IVDexMakfv52eLZ2CXBWiKr4=
```该表格的格式未来可能会改变。同样的信息也可以通过 [`runtime/debug.ReadBuildInfo`](https://pkg.go.dev/runtime/debug?tab=doc#ReadBuildInfo) 获取。

表格中每一行的含义由其第一列的关键词决定：

* **`path`**：用于构建该可执行文件的 `main`（主）包的路径。
* **`mod`**：包含 `main` 包的模块。各列分别代表模块路径、版本和校验和。[主模块](#glos-main-module) 的版本显示为 `(devel)` 且没有校验和。
* **`dep`**：提供了链接到该可执行文件中的一个或多个包的模块。格式与 `mod` 相同。
* **`=>`**：前一行模块的 [替换项](#go-mod-file-replace)。如果替换的是一个本地目录，则只列出目录路径（无版本或校验和）。如果替换的是一个模块版本，则列出其路径、版本和校验和，与 `mod` 和 `dep` 的格式相同。被替换的模块没有校验和。

### `go clean -modcache` {#go-clean-modcache}

用法：```
go clean [-modcache]
````-modcache` 标志会导致 [`go clean`](/cmd/go/#hdr-Remove_object_files_and_cached_files) 移除整个[模块缓存](#glos-module-cache)，包括已解压的版本化依赖项的源代码。

这通常是移除模块缓存的最佳方式。默认情况下，模块缓存中的大多数文件和目录都是只读的，这是为了防止在[验证](#authenticating)之后，测试和编辑器意外更改文件。不幸的是，这导致类似 `rm -r` 的命令失败，因为除非先使父目录可写，否则无法删除文件。

`-modcacherw` 标志（被 [`go build`](/cmd/go/#hdr-Compile_packages_and_dependencies) 和其他模块感知命令接受）会使模块缓存中的新目录变为可写。要将 `-modcacherw` 传递给所有模块感知命令，请将其添加到 `GOFLAGS` 变量中。`GOFLAGS` 可以在环境中设置，也可以通过 [`go env -w`](/cmd/go/#hdr-Print_Go_environment_information) 设置。例如，下面的命令将其永久设置：```
go env -w GOFLAGS=-modcacherw
````-modcacherw` 应谨慎使用；开发者需注意不要修改模块缓存中的文件。可使用 [`go mod verify`](#go-mod-verify) 命令检查缓存中的文件是否与主模块 `go.sum` 文件中的哈希值匹配。

### 版本查询 {#version-queries}

部分命令允许您通过 *版本查询* 来指定模块的版本，该查询位于命令行中模块或包路径后的 `@` 字符之后。

示例：```
go get example.com/m@latest
go mod download example.com/m@master
go list -m -json example.com/m@e3702bed2
```版本查询可以是以下形式之一：

*   完全指定的语义版本，例如 `v1.2.3`，用于选择特定版本。语法详见 [版本](#versions)。
*   语义版本前缀，例如 `v1` 或 `v1.2`，用于选择具有该前缀的最高可用版本。
*   语义版本比较，例如 {{raw "`<v1.2.3` 或 `>=v1.5.6`"}}，用于选择最接近比较目标的可用版本（对于 `>` 和 `>=` 选择最低版本，对于 {{raw "`<` 和 `<=`"}} 选择最高版本）。
*   底层源代码仓库的修订标识符，例如提交哈希前缀、修订标签或分支名称。如果该修订版已用语义版本标记，则此查询选择该版本。否则，此查询为底层提交选择一个 [伪版本](#glos-pseudo-version)。请注意，名称与其他版本查询匹配的分支和标签不能通过此方式选择。例如，查询 `v2` 选择的是以 `v2` 开头的最新版本，而不是名为 `v2` 的分支。
*   字符串 `latest`，用于选择最高的可用发布版本。如果没有发布版本，`latest` 选择最高的预发布版本。如果没有带标签的版本，`latest` 选择仓库默认分支尖端提交的伪版本。
*   字符串 `upgrade`，类似于 `latest`，但不同之处在于，如果模块当前被要求使用的版本高于 `latest` 将选择的版本（例如，一个预发布版本），则 `upgrade` 将选择当前版本。
*   字符串 `patch`，用于选择与当前要求的主要版本号和次要版本号相同的最新可用版本。如果当前没有要求任何版本，则 `patch` 等同于 `latest`。自 Go 1.16 起，使用 `patch` 时，[`go get`](#go-get) 要求指定当前版本（但 `-u=patch` 标志没有此要求）。

除了针对特定命名版本或修订的查询外，所有查询都考虑 `go list -m -versions`（参见 [`go list -m`](#go-list-m)）报告的可用版本。此列表仅包含带标签的版本，不包括伪版本。不考虑被主模块的 [`go.mod` 文件](#glos-go-mod-file)中的 [`exclude` 指令](#go-mod-file-exclude) 所禁止的模块版本。同一模块的 `latest` 版本的 `go.mod` 文件中 [`retract` 指令](#go-mod-file-retract) 所覆盖的版本也会被忽略，除非在使用 [`go list -m`](#go-list-m) 时使用了 `-retracted` 标志，并且除非在加载 `retract` 指令时。

[发布版本](#glos-release-version) 优先于预发布版本。例如，如果版本 `v1.2.2` 和 `v1.2.3-pre` 都可用，`latest` 查询将选择 `v1.2.2`，即使 `v1.2.3-pre` 更高。{{raw "`<v1.2.4`"}} 查询也会选择 `v1.2.2`，即使 `v1.2.3-pre` 更接近 `v1.2.4`。如果没有任何发布或预发布版本可用，`latest`、`upgrade` 和 `patch` 查询将选择仓库默认分支尖端提交的伪版本。其他查询将报告错误。

### 模块外部的模块命令 {#commands-outside}

模块感知模式的 Go 命令通常在由当前工作目录或父目录中的 `go.mod` 文件定义的[主模块](#glos-main-module)上下文中运行。某些命令可以在没有 `go.mod` 文件的模块感知模式下运行，但大多数命令在没有 `go.mod` 文件时行为会有所不同或报告错误。

有关启用和禁用模块感知模式的信息，请参阅 [模块感知命令](#mod-commands)。

<table class="ModTable">
  <thead>
    <tr>
      <th>命令</th>
      <th>行为</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <code>go build</code><br>
        <code>go doc</code><br>
        <code>go fix</code><br>
        <code>go fmt</code><br>
        <code>go generate</code><br>
        <code>go install</code><br>
        <code>go list</code><br>
        <code>go run</code><br>
        <code>go test</code><br>
        <code>go vet</code>
      </td>
      <td>
        只能加载、导入和构建标准库中的包以及命令行上指定为 <code>.go</code> 文件的包。无法构建来自其他模块的包，因为没有地方记录模块要求并确保确定性构建。
      </td>
    </tr>
    <tr>
      <td><code>go get</code></td>
      <td>
        可以像往常一样构建和安装包及可执行文件。请注意，当 <code>go get</code> 在没有 <code>go.mod</code> 文件的情况下运行时，不存在主模块，因此不会应用 <code>replace</code> 和 <code>exclude</code> 指令。
      </td>
    </tr>
    <tr>
      <td><code>go list -m</code></td>
      <td>
        除了使用 <code>-versions</code> 标志的情况外，大多数参数都需要显式的 <a href="#version-queries">版本查询</a>。
      </td>
    </tr>
    <tr>
      <td><code>go mod download</code></td>
      <td>
        大多数参数都需要显式的 <a href="#version-queries">版本查询</a>。
      </td>
    </tr>
    <tr>
      <td><code>go mod edit</code></td>
      <td>需要显式的文件参数。</td>
    </tr>
    <tr>
      <td>
        <code>go mod graph</code><br>
        <code>go mod tidy</code><br>
        <code>go mod vendor</code><br>
        <code>go mod verify</code><br>
        <code>go mod why</code>
      </td>
      <td>
        这些命令需要 <code>go.mod</code> 文件，如果不存在则会报告错误。
      </td>
    </tr>
  </tbody>
</table>

### `go work init` {#go-work-init}

用法：```
go work init [moddirs]
```Init 命令会在当前目录下初始化并写入一个新的 go.work 文件，实际上相当于在当前目录创建一个新的工作区。

go work init 可以选择性地接受工作区模块的路径作为参数。如果省略参数，则会创建一个没有模块的空工作区。

每个参数路径都会作为 use 指令添加到 go.work 文件中。当前 go 版本也会列在 go.work 文件中。

### `go work edit` {#go-work-edit}

用法：```
go work edit [editing flags] [go.work]
````go work edit` 命令为编辑 `go.work` 文件提供了一个命令行接口，主要用于工具或脚本。它仅读取 `go.work` 文件；不会查询相关模块的信息。如果未指定文件，Edit 命令会在当前目录及其父目录中查找 `go.work` 文件。

编辑标志指定了一系列编辑操作。
* `-fmt` 标志会重新格式化 go.work 文件，而不进行其他更改。任何使用或重写 `go.work` 文件的修改也隐含了此重新格式化操作。仅当未指定其他标志时才需要此标志，如 `go work edit '-fmt'`。
* `-use=path` 和 `-dropuse=path` 标志分别从 `go.work` 文件的模块目录集中添加和移除一个 use 指令。
* `-replace=old[@v]=new[@v]` 标志为给定的模块路径和版本对添加一个替换项。如果省略 `old@v` 中的 `@v`，则添加一个左侧不带版本的替换项，该替换项适用于旧模块路径的所有版本。如果省略 `new@v` 中的 `@v`，则新路径应为本地模块根目录，而非模块路径。请注意，`-replace` 会覆盖 `old[@v]` 的任何冗余替换项，因此省略 `@v` 将丢弃针对特定版本的现有替换项。
* `-dropreplace=old[@v]` 标志移除给定模块路径和版本对的替换项。如果省略 `@v`，则移除一个左侧不带版本的替换项。
* `-go=version` 标志设置预期的 Go 语言版本。

编辑标志可以重复使用。更改按给定的顺序应用。

`go work edit` 还有其他控制其输出的标志：

* `-print` 标志以文本格式打印最终的 go.work 文件，而不是将其写回 go.mod。
* `-json` 标志以 JSON 格式打印最终的 go.work 文件，而不是将其写回 go.mod。JSON 输出对应以下 Go 类型：```
type Module struct {
    Path    string
    Version string
}

type GoWork struct {
    Go        string
    Directory []Directory
    Replace   []Replace
}

type Use struct {
    Path       string
    ModulePath string
}

type Replace struct {
    Old Module
    New Module
}
```### `go work use` {#go-work-use}

用法：```
go work use [-r] [moddirs]
````go work use` 命令提供了一个命令行界面，用于将目录（可递归地）添加到 `go.work` 文件中。

对于命令行中列出的每个参数目录，如果该目录在磁盘上存在，则会在 `go.work` 文件中添加一个对应的 [`use` 指令](#go-work-file-use)；如果该目录在磁盘上不存在，则会从 `go.work` 文件中移除该指令。

使用 `-r` 标志会递归搜索参数目录中的模块，此时 use 命令的行为就像将每个子目录都作为参数单独指定一样。

### `go work sync` {#go-work-sync}

用法：```
go work sync
````go work sync` 命令将工作空间的构建列表同步回工作空间中的各个模块。

工作空间的构建列表是指在工作空间中进行构建时使用的所有（传递性）依赖模块的版本集合。`go work sync` 使用[最小版本选择（MVS）](#glos-minimal-version-selection)算法生成该构建列表，然后将这些版本同步回工作空间中通过`use`指令指定的各个模块。

一旦计算出工作空间的构建列表，工作空间中每个模块的 `go.mod` 文件都会被重写，其中与该模块相关的依赖项将升级为与工作空间构建列表相匹配的版本。请注意，[最小版本选择](#glos-minimal-version-selection)保证构建列表中每个模块的版本始终等于或高于工作空间中各模块原有的版本。

## 模块代理 {#module-proxy}

### `GOPROXY` 协议 {#goproxy-protocol}

<dfn>模块代理</dfn>是一个 HTTP 服务器，能够响应对以下指定路径的 `GET` 请求。这些请求没有查询参数，也不需要特定的头部，因此即使是提供固定文件系统（包括 `file://` URL）的站点也可以作为模块代理。

成功的 HTTP 响应必须具有状态码 200 (OK)。重定向（3xx）会被跟踪。状态码为 4xx 和 5xx 的响应被视为错误。错误码 404 (Not Found) 和 410 (Gone) 表示请求的模块或版本在代理上不可用，但可能在其他地方找到。错误响应的内容类型应为 `text/plain`，`charset` 为 `utf-8` 或 `us-ascii`。

`go` 命令可以通过 `GOPROXY` 环境变量配置联系代理或源代码控制服务器，该变量接受一个代理 URL 列表。该列表可以包含关键字 `direct` 或 `off`（详见[环境变量](#environment-variables)）。列表元素可以用逗号 (`,`) 或竖线 (`|`) 分隔，这决定了错误回退行为。当 URL 后面跟逗号时，`go` 命令仅在收到 404 (Not Found) 或 410 (Gone) 响应后才回退到后续源。当 URL 后面跟竖线时，`go` 命令在遇到任何错误（包括超时等非 HTTP 错误）后都会回退到后续源。这种错误处理行为使代理能够充当未知模块的守门员。例如，对于不在批准列表上的模块，代理可以响应错误 403 (Forbidden)（参见[使用私有代理提供私有模块](#private-module-proxy-private)）。

下表指定了模块代理必须响应的查询。对于每个路径，`$base` 是代理 URL 的路径部分，`$module` 是模块路径，`$version` 是版本。例如，如果代理 URL 是 `https://example.com/mod`，客户端正在请求模块 `golang.org/x/text` 版本 `v0.3.2` 的 `go.mod` 文件，则客户端将发送一个 `GET` 请求到 `https://example.com/mod/golang.org/x/text/@v/v0.3.2.mod`。

为避免在不区分大小写的文件系统上提供服务时出现歧义，`$module` 和 `$version` 元素通过将每个大写字母替换为感叹号后跟相应的小写字母来进行大小写编码。这允许模块 `example.com/M` 和 `example.com/m` 都可以存储在磁盘上，因为前者被编码为 `example.com/!m`。<table class="ModTable">
  <thead>
    <tr>
      <th>路径</th>
      <th>描述</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>$base/$module/@v/list</code></td>
      <td>
        以纯文本形式返回给定模块的已知版本列表，每行一个版本。此列表不应包含伪版本。
      </td>
    </tr>
    <tr>
      <td><code>$base/$module/@v/$version.info</code></td>
      <td>
        <p>
          返回特定模块版本的 JSON 格式元数据。响应必须是一个 JSON 对象，对应于以下 Go 数据结构：
        </p>
        <pre>
type Info struct {
    Version string    // 版本字符串
    Time    time.Time // 提交时间
}
</pre>
        <p>
          <code>Version</code> 字段是必需的，并且必须包含一个有效的、<a href="#glos-canonical-version">规范版本</a>（参见<a href="#versions">版本</a>）。请求路径中的 <code>$version</code> 不需要是相同的版本，甚至不必是有效版本；此端点可用于查找分支名称或修订标识符对应的版本。但是，如果 <code>$version</code> 是一个与 <code>$module</code> 兼容的主版本号的规范版本，那么成功响应中的 <code>Version</code> 字段必须相同。
        </p>
        <p>
          <code>Time</code> 字段是可选的。如果存在，它必须是 RFC 3339 格式的字符串。它表示该版本的创建时间。
        </p>
        <p>
          未来可能会添加更多字段，因此其他名称已被保留。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>$base/$module/@v/$version.mod</code></td>
      <td>
        返回特定模块版本的 <code>go.mod</code> 文件。如果所请求的版本中该模块没有 <code>go.mod</code> 文件，则必须返回一个仅包含带有请求的模块路径的 <code>module</code> 语句的文件。否则，必须返回原始的、未经修改的 <code>go.mod</code> 文件。
      </td>
    </tr>
    <tr>
      <td><code>$base/$module/@v/$version.zip</code></td>
      <td>
        返回一个包含特定模块版本内容的 zip 文件。关于此 zip 文件格式要求的详细信息，请参见<a href="#zip-files">模块 zip 文件</a>。
      </td>
    </tr>
    <tr>
      <td><code>$base/$module/@latest</code></td>
      <td>
        返回关于模块最新已知版本的 JSON 格式元数据，格式与 <code>$base/$module/@v/$version.info</code> 相同。最新版本应该是当 <code>$base/$module/@v/list</code> 为空或列出的版本都不合适时，<code>go</code> 命令应使用的模块版本。此端点是可选的，模块代理并非必须实现它。
      </td>
    </tr>
  </tbody>
</table>

当解析模块的最新版本时，`go` 命令会先请求 `$base/$module/@v/list`，如果没有找到合适的版本，则请求 `$base/$module/@latest`。`go` 命令优先选择：语义上最高的发布版本，然后是语义上最高的预发布版本，最后是按时间排序最近的伪版本。在 Go 1.12 及更早版本中，`go` 命令将 `$base/$module/@v/list` 中的伪版本视为预发布版本，但从 Go 1.13 开始，情况已不再如此。

模块代理必须始终为成功的 `$base/$module/$version.mod` 和 `$base/$module/$version.zip` 查询请求返回相同的内容。此内容通过 [`go.sum` 文件](#go-sum-files) 和（默认情况下）[校验和数据库](#checksum-database) 进行[密码学验证](#authenticating)。

`go` 命令将从模块代理下载的大部分内容缓存在其位于 `$GOPATH/pkg/mod/cache/download` 的模块缓存中。即使直接从版本控制系统下载，`go` 命令也会合成显式的 `info`、`mod` 和 `zip` 文件，并将它们存储在此目录中，就像从代理直接下载一样。缓存的目录布局与代理 URL 空间相同，因此如果将 `$GOPATH/pkg/mod/cache/download` 提供在（或复制到）`https://example.com/proxy`，用户可以通过将 `GOPROXY` 设置为 `https://example.com/proxy` 来访问缓存的模块版本。

### 与代理通信 {#communicating-with-proxies}

`go` 命令可以从[模块代理](#glos-module-proxy)下载模块源代码和元数据。`GOPROXY` [环境变量](#environment-variables)可用于配置 `go` 命令可以连接到哪些代理，以及是否可以直接与[版本控制系统](#vcs)通信。下载的模块数据保存在[模块缓存](#glos-module-cache)中。`go` 命令仅在缓存中没有所需信息时才联系代理。

[`GOPROXY` 协议](#goproxy-protocol) 部分描述了可以发送给 `GOPROXY` 服务器的请求。然而，了解 `go` 命令何时发出这些请求也很有帮助。例如，`go build` 遵循以下过程：

* 通过读取 [`go.mod` 文件](#glos-go-mod-file) 并执行[最小版本选择 (MVS)](#glos-minimal-version-selection) 来计算[构建列表](#glos-build-list)。
* 读取命令行上指定的包及其导入的包。
* 如果构建列表中的任何模块都无法提供某个包，则找到一个提供它的模块。将其最新版本添加为 `go.mod` 中的模块依赖要求，然后重新开始。
* 在所有内容加载完成后构建包。当 `go` 命令计算构建列表时，它会加载[模块图](#glos-module-graph)中每个模块的 `go.mod` 文件。如果缓存中不存在某个 `go.mod` 文件，`go` 命令将通过代理使用 `$module/@v/$version.mod` 请求（其中 `$module` 是模块路径，`$version` 是版本）来下载它。可以使用类似 `curl` 的工具测试这些请求。例如，以下命令下载 `golang.org/x/mod` 在 `v0.2.0` 版本的 `go.mod` 文件：```
$ curl https://proxy.golang.org/golang.org/x/mod/@v/v0.2.0.mod
module golang.org/x/mod

go 1.12

require (
    golang.org/x/crypto v0.0.0-20191011191535-87dc89f01550
    golang.org/x/tools v0.0.0-20191119224855-298f0cb1881e
    golang.org/x/xerrors v0.0.0-20191011141410-1b5146add898
)
```为了加载一个包，`go` 命令需要获取提供该包的模块的源代码。模块的源代码以 `.zip` 文件的形式分发，并解压到模块缓存中。如果某个模块的 `.zip` 文件不在缓存中，`go` 命令将通过 `$module/@v/$version.zip` 请求来下载它。```shell
$ curl -O https://[待翻译: proxy.golang.org/golang.org/x/mod/@v/v0.2.0.zip]
$ unzip -l v0.2.0.zip | head
Archive:  v0.2.0.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1479  00-00-1980 00:00   golang.org/x/mod@v0.2.0/LICENSE
     1303  00-00-1980 00:00   golang.org/x/mod@v0.2.0/PATENTS
      559  00-00-1980 00:00   golang.org/x/mod@v0.2.0/README
       21  00-00-1980 00:00   golang.org/x/mod@v0.2.0/codereview.cfg
      214  00-00-1980 00:00   golang.org/x/mod@v0.2.0/go.mod
     1476  00-00-1980 00:00   golang.org/x/mod@v0.2.0/go.sum
     5224  00-00-1980 00:00   golang.org/x/mod@v0.2.0/gosumcheck/main.go
```请注意，`.mod` 和 `.zip` 的请求是分开的，即使 `go.mod` 文件通常包含在 `.zip` 文件中。Go 命令可能需要下载许多不同模块的 `go.mod` 文件，而且 `.mod` 文件比 `.zip` 文件小得多。此外，如果一个 Go 项目没有 `go.mod` 文件，代理将提供一个合成的 `go.mod` 文件，该文件仅包含一个 [`module` 指令](#go-mod-file-module)。当从[版本控制系统](#vcs)下载时，Go 命令会生成合成的 `go.mod` 文件。

如果 Go 命令需要加载一个不由构建列表中任何模块提供的包，它会尝试寻找一个提供该包的新模块。章节[将包解析到模块](#resolve-pkg-mod)描述了这一过程。总而言之，Go 命令会请求关于每个可能包含该包的模块路径的最新版本的信息。例如，对于包 `golang.org/x/net/html`，Go 命令会尝试查找模块 `golang.org/x/net/html`、`golang.org/x/net`、`golang.org/x/` 和 `golang.org` 的最新版本。实际上只有 `golang.org/x/net` 存在并提供该包，因此 Go 命令使用该模块的最新版本。如果有多个模块提供该包，Go 命令将使用路径最长的模块。

当 Go 命令请求一个模块的最新版本时，它首先发送一个 `$module/@v/list` 的请求。如果列表为空或返回的版本均无法使用，它会发送一个 `$module/@latest` 的请求。一旦选定版本，Go 命令会发送一个 `$module/@v/$version.info` 请求来获取元数据。随后，它可能发送 `$module/@v/$version.mod` 和 `$module/@v/$version.zip` 请求，以加载 `go.mod` 文件和源代码。```
$ curl https://proxy.golang.org/golang.org/x/mod/@v/list
v0.1.0
v0.2.0

$ curl https://proxy.golang.org/golang.org/x/mod/@v/v0.2.0.info
{"版本":"v0.2.0","时间":"2020年1月2日 17:33:45（协调世界时）"}
```下载 `.mod` 或 `.zip` 文件后，`go` 命令会计算一个密码学哈希值，并检查该值是否与主模块 `go.sum` 文件中的哈希值匹配。如果 `go.sum` 中没有该哈希值，默认情况下 `go` 命令会从[校验和数据库](#checksum-database)获取。如果计算出的哈希值不匹配，`go` 命令会报告安全错误，并且不会将文件安装到模块缓存中。`GOPRIVATE` 和 `GONOSUMDB` [环境变量](#environment-variables)可用于针对特定模块禁用对校验和数据库的请求。`GOSUMDB` 环境变量也可以设置为 `off`，以完全禁用对校验和数据库的请求。更多信息请参阅[模块认证](#authenticating)。请注意，针对 `.info` 请求返回的版本列表和版本元数据未经认证，并且可能随时间变化。

### 从代理直接服务模块 {#serving-from-proxy}

大多数模块都是从版本控制仓库进行开发和服务的。在[直接模式](#glos-direct-mode)下，`go` 命令使用版本控制工具下载此类模块（参见[版本控制系统](#vcs)）。也可以从模块代理直接服务一个模块。这对于希望在不暴露其版本控制服务器的情况下服务模块的组织，以及使用 `go` 命令不支持的版本控制工具的组织非常有用。

当 `go` 命令在直接模式下下载模块时，它首先会根据模块路径，通过一个 HTTP GET 请求查找模块服务器的 URL。它会在 HTML 响应中寻找一个名为 `go-import` 的 `<meta>` 标签。该标签的内容必须包含[仓库根路径](#glos-repository-root-path)、版本控制系统和 URL，三者之间用空格分隔。详见[为模块路径查找仓库](#vcs-find)。

如果版本控制系统是 `mod`，`go` 命令将使用 [`GOPROXY` 协议](#goproxy-protocol)从给定的 URL 下载该模块。

例如，假设 `go` 命令正在尝试下载版本为 `v1.0.0` 的模块 `example.com/gopher`。它会向 `https://example.com/gopher?go-get=1` 发送一个请求。服务器响应一个包含以下标签的 HTML 文档：```html
<meta name="go-import" content="example.com/gopher mod https://[模块代理.示例.com">
```基于此响应，`go` 命令通过向 `https://modproxy.example.com/example.com/gopher/@v/v1.0.0.info`、`v1.0.0.mod` 和 `v1.0.0.zip` 发送请求来下载该模块。

请注意，直接从代理提供的模块无法在 GOPATH 模式下通过 `go get` 下载。

## 版本控制系统 {#vcs}

`go` 命令可以直接从版本控制仓库下载模块源代码和元数据。从[代理](#communicating-with-proxies)下载模块通常更快，但在代理不可用或代理无法访问模块仓库（私有仓库常出现这种情况）时，必须直接连接到仓库。目前支持 Git、Subversion、Mercurial、Bazaar 和 Fossil。要使用版本控制工具，该工具必须安装在 `PATH` 目录中。

要从源代码仓库而非代理下载特定模块，请设置 `GOPRIVATE` 或 `GONOPROXY` 环境变量。要配置 `go` 命令直接从源代码仓库下载所有模块，请将 `GOPROXY` 设置为 `direct`。更多信息请参阅[环境变量](#environment-variables)。

### 为模块路径查找仓库 {#vcs-find}

当 `go` 命令以 `direct` 模式下载模块时，它首先定位包含该模块的仓库。

如果模块路径的末尾包含版本控制限定符（`.bzr`、`.fossil`、`.git`、`.hg`、`.svn` 之一），`go` 命令将使用该路径限定符之前的所有内容作为仓库 URL。例如，对于模块 `example.com/foo.git/bar`，`go` 命令会使用 git 下载位于 `example.com/foo` 的仓库，并期望在 `bar` 子目录中找到该模块。`go` 命令会根据版本控制工具支持的协议来猜测要使用的协议。

如果模块路径没有限定符，`go` 命令会向一个根据模块路径派生并附加 `?go-get=1` 查询字符串的 URL 发送 HTTP `GET` 请求。例如，对于模块 `golang.org/x/mod`，`go` 命令可能会发送以下请求：```
https://[待翻译: golang.org/x/mod?go-get=1 （首选）]
http://[待翻译: golang.org/x/mod?go-get=1 （回退，仅适用于 GOINSECURE 设置）]
````go` 命令会跟随重定向，但其他情况下会忽略响应状态码，因此服务器可以用 404 或任何其他错误状态码响应。`GOINSECURE` 环境变量可以设置为允许对特定模块回退并重定向到未加密的 HTTP。

服务器必须响应一个 HTML 文档，该文档的 `<head>` 部分需包含一个 `<meta>` 标签。该 `<meta>` 标签应出现在文档的开头位置，以避免混淆 `go` 命令的受限解析器。特别是，它应出现在任何原始 JavaScript 或 CSS 之前。`<meta>` 标签必须采用以下形式：```
<meta name="go-import" content="root-path vcs repo-url [subdirectory]">
````root-path` 是仓库根路径，对应于仓库根目录的那部分模块路径，或者当存在 `subdirectory` 且使用 Go 1.25 或更高版本时对应于该 `subdirectory`（详见下文关于 `subdirectory` 的章节）。它必须是请求的模块路径的前缀或完全匹配。如果不是完全匹配，系统会再次发起一个前缀匹配的请求，以验证 `<meta>` 标签是否匹配。

`vcs` 是版本控制系统。它必须是下表中列出的工具之一，或者是关键字 `mod`，后者指示 `go` 命令使用 [`GOPROXY` 协议](#goproxy-protocol) 从给定的 URL 下载该模块。详情请参阅[直接从代理提供模块](#serving-from-proxy)。

`repo-url` 是仓库的 URL，包含协议方案且不包含 `.vcs` 限定符。不安全的协议（例如 `http://` 和 `git://`）仅在模块路径与 `GOINSECURE` 环境变量匹配时才能使用。

`subdirectory`，如果存在，是指 `root-path` 所对应的仓库内由斜杠分隔的子目录，它会覆盖默认的仓库根目录。提供 `subdirectory` 的 `go-import` 元标签仅在 Go 1.25 及更高版本中被识别。尝试在早期版本的 Go 上获取或解析模块时，将忽略该元标签，如果模块无法在其他地方被解析，则会导致解析失败。

<table id="vcs-support" class="ModTable">
  <thead>
    <tr>
      <th>名称</th>
      <th>命令</th>
      <th>GOVCS默认设置</th>
      <th>安全方案</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Bazaar</td>
      <td><code>bzr</code></td>
      <td>仅私有</td>
      <td><code>https</code>, <code>bzr+ssh</code></td>
    </tr>
    <tr>
      <td>Fossil</td>
      <td><code>fossil</code></td>
      <td>仅私有</td>
      <td><code>https</code></td>
    </tr>
    <tr>
      <td>Git</td>
      <td><code>git</code></td>
      <td>公开和私有</td>
      <td><code>https</code>, <code>git+ssh</code>, <code>ssh</code></td>
    </tr>
    <tr>
      <td>Mercurial</td>
      <td><code>hg</code></td>
      <td>公开和私有</td>
      <td><code>https</code>, <code>ssh</code></td>
    </tr>
    <tr>
      <td>Subversion</td>
      <td><code>svn</code></td>
      <td>仅私有</td>
      <td><code>https</code>, <code>svn+ssh</code></td>
    </tr>
  </tbody>
</table>

举个例子，再次考虑 `golang.org/x/mod`。`go` 命令向 `https://golang.org/x/mod?go-get=1` 发送请求。服务器响应一个 HTML 文档，其中包含以下标签：```html
<meta name="go-import" content="golang.org/x/mod git https://go.googlesource.com/mod">
```根据此响应，`go` 命令将使用位于远程 URL `https://go.googlesource.com/mod` 的 Git 仓库。

GitHub 和其他流行的托管服务会对所有仓库的 `?go-get=1` 查询进行响应，因此，对于托管在这些站点上的模块，通常不需要进行任何服务器配置。

找到仓库 URL 后，`go` 命令会将仓库克隆到模块缓存中。通常，`go` 命令会尝试避免从仓库获取不必要的数据。但是，实际使用的命令因版本控制系统而异，并且可能会随时间变化。对于 Git，`go` 命令可以在不下载提交的情况下列出大多数可用版本。它通常会在不下载祖先提交的情况下获取提交，但有时这样做是必要的。

### 将版本映射到提交 {#vcs-version}

`go` 命令可能会在仓库中检出一个处于特定[规范版本](#glos-canonical-version)的模块，例如 `v1.2.3`、`v2.4.0-beta` 或 `v3.0.0+incompatible`。每个模块版本都应在仓库中有一个 <dfn>语义版本标签</dfn>，该标签指示对于给定版本应检出哪个修订版。

如果模块定义在仓库的根目录或根目录的主版本子目录中，那么每个版本标签名称都等于其对应的版本。例如，模块 `golang.org/x/text` 定义在其仓库的根目录中，因此版本 `v0.3.2` 在该仓库中对应的标签是 `v0.3.2`。大多数模块都是如此。

如果模块定义在仓库内的子目录中，即模块路径的 [模块子目录](#glos-module-subdirectory) 部分不为空，那么每个标签名称必须以前缀模块子目录开头，后跟一个斜杠。例如，模块 `golang.org/x/tools/gopls` 定义在根路径为 `golang.org/x/tools` 的仓库的 `gopls` 子目录中。该模块的版本 `v0.4.0` 在该仓库中对应的标签名称必须是 `gopls/v0.4.0`。

语义版本标签的主版本号必须与模块路径的主版本后缀（如果有的话）保持一致。例如，标签 `v1.0.0` 可以属于模块 `example.com/mod`，但不能属于 `example.com/mod/v2`，后者将拥有如 `v2.0.0` 这样的标签。

如果主版本为 `v2` 或更高的标签所在的模块没有主版本后缀，并且该模块位于仓库根目录，那么它可能属于该模块。这种版本使用后缀 `+incompatible` 来表示。版本标签本身不能包含此后缀。请参阅[与非模块仓库的兼容性](#non-module-compat)。

一旦创建了标签，就不应将其删除或更改为指向不同的修订版本。版本是经过[认证](#authenticating)的，以确保构建的安全性和可重复性。如果标签被修改，客户端在下载它时可能会看到安全错误。即使标签被删除，其内容也可能仍可在[模块代理](#glos-module-proxy)上找到。

### 将伪版本映射到提交 {#vcs-pseudo}

`go` 命令可能会在仓库中检出一个处于特定修订版本的模块，该修订版本被编码为一个[伪版本](#glos-pseudo-version)，例如 `v1.3.2-0.20191109021931-daa7c04131f5`。

伪版本的最后 12 个字符（上例中的 `daa7c04131f5`）表示要检出的仓库中的一个修订版本。其含义取决于版本控制系统。对于 Git 和 Mercurial，这是提交哈希值的前缀。对于 Subversion，这是填充了零的修订版本号。

在检出提交之前，`go` 命令会验证时间戳（上例中的 `20191109021931`）是否与提交日期匹配。它还会验证基础版本（上例中 `v1.3.2` 之前的版本 `v1.3.1`）是否对应于一个作为该提交祖先的语义版本标签。这些检查确保了模块作者能完全控制伪版本与其他已发布版本的比较方式。

更多信息请参阅[伪版本](#pseudo-versions)。

### 将分支和提交映射到版本 {#vcs-branch}

可以使用[版本查询](#version-queries)在特定的分支、标签或修订版本处检出一个模块。```
go get example.com/mod@master
````go` 命令将这些名称转换为[规范版本](#glos-canonical-version)，以便与[最小版本选择（MVS）](#minimal-version-selection)一起使用。MVS 依赖于能够对版本进行无歧义的排序。分支名称和修订版本在时间上的比较是不可靠的，因为它们依赖于可能变化的仓库结构。

如果一个修订版本被打上了一个或多个语义版本标签，例如 `v1.2.3`，则会使用有效版本中最高的那个标签。`go` 命令仅考虑可能属于目标模块的语义版本标签；例如，对于 `example.com/mod/v2`，标签 `v1.5.2` 将不会被考虑，因为其主版本号与模块路径的后缀不匹配。

如果一个修订版本没有被打上有效的语义版本标签，`go` 命令将生成一个[伪版本](#glos-pseudo-version)。如果该修订版本的祖先具有有效的语义版本标签，那么最高的祖先版本将被用作伪版本的基础。详见[伪版本](#pseudo-versions)。

### 仓库内的模块目录 {#vcs-dir}

一旦模块的仓库在特定的修订版本被检出，`go` 命令必须定位包含该模块 `go.mod` 文件的目录（即模块的根目录）。

回顾一下，一个[模块路径](#module-path)由三部分组成：一个仓库根路径（对应于仓库的根目录）、一个模块子目录，以及一个主版本后缀（仅适用于在 `v2` 或更高版本发布的模块）。

对于大多数模块，模块路径等于仓库根路径，因此模块的根目录就是仓库的根目录。

模块有时定义在仓库的子目录中。这通常用于具有多个组件且需要独立发布和版本控制的大型仓库。这样的模块应该位于与模块路径中仓库根路径之后部分相匹配的子目录中。例如，假设模块 `example.com/monorepo/foo/bar` 位于根路径为 `example.com/monorepo` 的仓库中。那么它的 `go.mod` 文件必须位于 `foo/bar` 子目录中。

如果一个模块的主版本为 `v2` 或更高，其路径必须包含一个[主版本后缀](#major-version-suffixes)。带有主版本后缀的模块可以定义在两个子目录中的一个：一个带有后缀，一个不带后缀。例如，假设上述模块以路径 `example.com/monorepo/foo/bar/v2` 发布了新版本。它的 `go.mod` 文件可能位于 `foo/bar` 或 `foo/bar/v2` 中。

带有主版本后缀的子目录被称为<dfn>主版本子目录</dfn>。它们可用于在单个分支上开发一个模块的多个主版本。当多个主版本的开发在不同分支上进行时，这可能是不必要的。然而，主版本子目录有一个重要特性：在 `GOPATH` 模式下，包导入路径与 `GOPATH/src` 下的目录完全匹配。`go` 命令在 `GOPATH` 模式下提供了最小的模块兼容性（参见[与非模块仓库的兼容性](#non-module-compat)），因此主版本子目录对于兼容在 `GOPATH` 模式下构建的项目并非总是必需的。但是，不支持最小模块兼容性的较旧工具可能会出现问题。

一旦 `go` 命令找到了模块根目录，它会创建该目录内容的 `.zip` 文件，然后将 `.zip` 文件解压到模块缓存中。关于哪些文件可以包含在 `.zip` 文件中，请参见[文件路径和大小限制](#zip-path-size-constraints)。在解压到模块缓存之前，`.zip` 文件的内容会经过[认证](#authenticating)，其方式与从代理下载 `.zip` 文件时相同。

模块 zip 文件不包括 `vendor` 目录的内容或任何嵌套模块（包含 `go.mod` 文件的子目录）。这意味着一个模块必须注意不要引用其目录之外或其他模块中的文件。例如，[`//go:embed`](https://pkg.go.dev/embed#hdr-Directives) 模式不得匹配嵌套模块中的文件。在不应将文件包含在模块中的情况下，此行为可能是一种有用的变通方法。例如，如果一个仓库将大文件检入到 `testdata` 目录，模块作者可以在 `testdata` 中添加一个空的 `go.mod` 文件，这样其用户就不需要下载那些文件。当然，这可能会降低用户测试其依赖项时的覆盖率。

### LICENSE 文件的特殊处理情况 {#vcs-license}

当 `go` 命令为一个不在仓库根目录中的模块创建 `.zip` 文件时，如果该模块在其根目录中（与 `go.mod` 同级）没有名为 `LICENSE` 的文件，`go` 命令将从仓库根目录中复制名为 `LICENSE` 的文件（如果在相同修订版本中存在）。

这种特殊情况允许同一个 `LICENSE` 文件适用于仓库内的所有模块。这仅适用于文件名恰好为 `LICENSE` 的文件，不带如 `.txt` 之类的扩展名。不幸的是，这无法扩展而不破坏现有模块的加密校验和；请参阅[模块认证](#authenticating)。其他工具和网站如 [pkg.go.dev](https://pkg.go.dev) 可能识别其他名称的文件。

另请注意，`go` 命令在创建模块 `.zip` 文件时不包含符号链接；请参见[文件路径和大小限制](#zip-path-size-constraints)。因此，如果仓库根目录中没有 `LICENSE` 文件，作者可以在定义于子目录的模块中创建其许可证文件的副本，以确保这些文件被包含在模块的 `.zip` 文件中。

### 使用 `GOVCS` 控制版本控制工具 {#vcs-govcs}`go` 命令能够使用类似 `git` 这样的版本控制命令下载模块，这对于代码可以从任何服务器导入的分布式包生态系统至关重要。但如果恶意服务器设法使被调用的版本控制命令运行非预期代码，这也会带来潜在的安全问题。

为了平衡功能性和安全性，`go` 命令默认情况下只会使用 `git` 和 `hg` 从公共服务器下载代码。它将使用任何[已知的版本控制系统](#vcs-support)从私有服务器下载代码，私有服务器定义为托管匹配 `GOPRIVATE` [环境变量](#environment-variables)的包的服务器。背后允许仅使用 Git 和 Mercurial 的理由是，这两个系统在作为不受信任服务器的客户端运行时，所受到的安全审查最为严格。相比之下，Bazaar、Fossil 和 Subversion 主要在受信任、经过身份验证的环境中使用，并且作为攻击面没有受到像前两者那样严格的审视。

版本控制命令限制仅在使用直接的版本控制访问来下载代码时适用。当从代理下载模块时，`go` 命令转而使用 [`GOPROXY` 协议](#goproxy-protocol)，这始终是被允许的。默认情况下，`go` 命令对公共模块使用 Go 模块镜像（[proxy.golang.org](https://proxy.golang.org)），只有在镜像拒绝提供公共包时（通常是出于法律原因），才会回退到版本控制来处理私有模块。因此，默认情况下，客户端仍然可以访问来自 Bazaar、Fossil 或 Subversion 仓库的公共代码，因为这些下载使用的是 Go 模块镜像，而镜像承担了使用自定义沙盒运行版本控制命令的安全风险。

可以使用 `GOVCS` 变量来更改特定模块允许使用的版本控制系统。`GOVCS` 变量在模块感知模式和 GOPATH 模式下构建包时都适用。使用模块时，模式与模块路径匹配。使用 GOPATH 时，模式与版本控制仓库根目录对应的导入路径匹配。

`GOVCS` 变量的一般形式是逗号分隔的 `pattern:vcslist` 规则列表。模式是一个 [glob 模式](/pkg/path#Match)，必须匹配模块或导入路径的一个或多个前导元素。vcslist 是一个竖线分隔的、允许使用的版本控制命令列表，或者使用 `all` 来允许使用任何已知命令，或者使用 `off` 来禁止所有命令。请注意，如果一个模块匹配了一个 vcslist 为 `off` 的模式，当源服务器使用 `mod` 方案时，它仍然可能被下载，该方案指示 `go` 命令使用 [`GOPROXY` 协议](#goproxy-protocol) 来下载模块。列表中第一个匹配的模式生效，即使后续模式也可能匹配。

例如，考虑：```
GOVCS=github.com:git,evil.com:off,*:git|hg
```使用此设置时，以 `github.com/` 开头的模块或导入路径只能使用 `git`；`evil.com` 上的路径不能使用任何版本控制命令；所有其他路径（`*` 匹配一切）只能使用 `git` 或 `hg`。

特殊模式 `public` 和 `private` 分别匹配公开和私有的模块或导入路径。若路径匹配 `GOPRIVATE` 变量，则视为私有路径；否则即为公开路径。

如果 `GOVCS` 变量中没有规则匹配某个特定的模块或导入路径，`go` 命令将应用其默认规则，该规则现在可以用 `GOVCS` 表示法概括为 `public:git|hg,private:all`。

若要允许对任何包无限制地使用任何版本控制系统，请使用：```
GOVCS=*:all
```要完全禁用版本控制，请使用：```
GOVCS=*:off
```可以通过 [`go env -w` 命令](/cmd/go/#hdr-Print_Go_environment_information) 为后续的 `go` 命令调用设置 `GOVCS` 变量。

`GOVCS` 于 Go 1.16 版本引入。更早版本的 Go 可以对任何模块使用任何已知的版本控制工具。

## 模块压缩文件 {#zip-files}

模块版本以 `.zip` 文件的形式分发。通常很少需要直接操作这些文件，因为 `go` 命令会从[模块代理](#glos-module-proxy)和版本控制仓库中自动创建、下载和解压它们。但是，了解这些文件对于理解跨平台兼容性约束或在实现模块代理时仍然很有用。

[`go mod download`](#go-mod-download) 命令下载一个或多个模块的压缩文件，然后将这些文件解压到[模块缓存](#glos-module-cache)中。根据 `GOPROXY` 和其他[环境变量](#environment-variables)的设置，`go` 命令可能会从代理下载压缩文件，或者克隆源代码控制仓库并从中创建压缩文件。可以使用 `-json` 标志来查找下载的压缩文件及其在模块缓存中解压内容的位置。

[`golang.org/x/mod/zip`](https://pkg.go.dev/golang.org/x/mod/zip?tab=doc) 包可用于以编程方式创建、解压或检查压缩文件的内容。

### 文件路径和大小约束 {#zip-path-size-constraints}

模块压缩文件的内容受到多项限制。这些约束确保压缩文件能够在各种平台上安全且一致地解压。

*   一个模块压缩文件的大小上限为 500 MiB。其文件解压后的总大小同样限制为 500 MiB。`go.mod` 文件限制为 16 MiB。`LICENSE` 文件也限制为 16 MiB。设置这些限制是为了缓解对用户、代理以及模块生态系统其他部分的拒绝服务攻击。模块目录树中包含超过 500 MiB 文件的仓库，应该在仅包含构建模块包所需文件的提交点处打上模块版本标签；视频、模型和其他大型资源文件通常不是构建所必需的。
*   模块压缩文件中的每个文件必须以前缀 `$module@$version/` 开头，其中 `$module` 是模块路径，`$version` 是版本，例如 `golang.org/x/mod@v0.3.0/`。模块路径必须有效，版本必须有效且规范，并且版本必须与模块路径的主版本号后缀匹配。具体定义和限制请参见[模块路径和版本](#go-mod-file-ident)。
*   文件模式、时间戳和其他元数据将被忽略。
*   空目录（路径以斜杠结尾的条目）可以包含在模块压缩文件中，但不会被解压。`go` 命令在创建压缩文件时不包含空目录。
*   创建压缩文件时，会忽略符号链接和其他不规则文件，因为它们不能跨操作系统和文件系统移植，并且在 zip 文件格式中也没有可移植的表示方式。
*   创建压缩文件时，会忽略 `vendor` 目录中的文件，因为主模块之外的 `vendor` 目录永远不会被使用。
*   创建压缩文件时，会忽略包含 `go.mod` 文件的目录（模块根目录除外）中的文件，因为它们不是模块的一部分。`go` 命令在解压压缩文件时会忽略包含 `go.mod` 文件的子目录。
*   压缩文件中不允许有两个文件路径在 Unicode 大小写折叠后相等（参见 [`strings.EqualFold`](https://pkg.go.dev/strings?tab=doc#EqualFold)）。这确保压缩文件可以在不区分大小写的文件系统上解压而不会发生冲突。
*   `go.mod` 文件可以出现在顶级目录（`$module@$version/go.mod`）中，也可以不出现。如果存在，其名称必须是 `go.mod`（全小写）。任何其他目录中不允许存在名为 `go.mod` 的文件。
*   模块内的文件和目录名称可以由 Unicode 字母、ASCII 数字、ASCII 空格字符 (U+0020) 以及 ASCII 标点符号 `!#$%&()+,-.=@[]^_{}~` 组成。请注意，包路径可能不包含所有这些字符。两者区别请参见 [`module.CheckFilePath`](https://pkg.go.dev/golang.org/x/mod/module?tab=doc#CheckFilePath) 和 [`module.CheckImportPath`](https://pkg.go.dev/golang.org/x/mod/module?tab=doc#CheckImportPath)。
*   文件或目录名称的第一个点之前的部分不能是 Windows 上的保留文件名，不区分大小写（例如 `CON`、`com1`、`NuL` 等）。

## 私有模块 {#private-modules}

Go 模块通常在公共互联网上不可用的版本控制服务器和模块代理上进行开发和分发。`go` 命令可以从私有源下载和构建模块，尽管这通常需要一些配置。

可以使用以下环境变量来配置对私有模块的访问。详情请参见[环境变量](#environment-variables)。关于控制发送到公共服务器的信息，请参见[隐私](#private-module-privacy)。* `GOPROXY` — 模块代理 URL 列表。`go` 命令将按顺序尝试从每个服务器下载模块。关键字 `direct` 指示 `go` 命令直接从模块开发所在的版本控制仓库下载，而不使用代理。
* `GOPRIVATE` — 应视为私有模块路径前缀的 glob 模式列表。它作为 `GONOPROXY` 和 `GONOSUMDB` 的默认值。
* `GONOPROXY` — 不应从代理下载的模块路径前缀的 glob 模式列表。`go` 命令将直接从匹配模块开发所在的版本控制仓库下载，而忽略 `GOPROXY` 设置。
* `GONOSUMDB` — 不应使用公共校验和数据库 [sum.golang.org](https://sum.golang.org) 进行校验的模块路径前缀的 glob 模式列表。
* `GOINSECURE` — 可以通过 HTTP 和其他不安全协议检索的模块路径前缀的 glob 模式列表。

这些环境变量可以在开发环境中设置（例如，在 `.profile` 文件中），也可以使用 [`go env -w`](/cmd/go/#hdr-Print_Go_environment_information) 命令永久设置。

本节其余部分将介绍提供私有模块代理和版本控制仓库访问权限的常见配置模式。

### 提供所有模块的私有代理 {#private-module-proxy-all}

一个提供所有模块（公共和私有）服务的中心化私有代理服务器，为管理员提供了最大的控制权，并为单个开发人员所需的配置最少。

要将 `go` 命令配置为使用此类服务器，请设置以下环境变量，并将 `https://proxy.corp.example.com` 替换为您的代理 URL，将 `corp.example.com` 替换为您的模块路径前缀：

```bash
# [待翻译: 配置模块代理] 设置模块代理
GOPROXY=https://proxy.corp.example.com,direct
# [待翻译: 设置私有模块模式] 设置私有模块路径模式
GOPRIVATE=corp.example.com
```

`GOPROXY` 设置指示 `go` 命令仅从 `https://proxy.corp.example.com` 下载模块；`go` 命令将不会连接到其他代理或版本控制仓库。

`GONOSUMDB` 设置指示 `go` 命令不要使用公共校验和数据库来验证```
GOPROXY=https://proxy.corp.example.com
GONOSUMDB=corp.example.com
````GOPROXY` 设置指示 `go` 命令仅从 `https://proxy.corp.example.com` 下载模块；`go` 命令将不会连接到其他代理或版本控制仓库。

`GONOSUMDB` 设置指示 `go` 命令不要使用公共校验和数据库来验证路径以 `corp.example.com` 开头的模块。

以这种配置运行的代理可能需要对私有版本控制服务器的读取权限。它还需要能够访问公共互联网以下载公共模块的新版本。

现有多种 `GOPROXY` 服务器实现可供此用途。一个最小化的实现可以从[模块缓存](#glos-module-cache)目录提供文件，并使用 [`go mod download`](#go-mod-download)（需进行适当配置）来获取缺失的模块。

### 仅服务于私有模块的私有代理 {#private-module-proxy-private}

私有代理服务器可以仅服务于私有模块，而不必同时提供公开可用的模块。可以配置 `go` 命令，使其在私有服务器上找不到模块时回退到公共来源。

要按此方式配置 `go` 命令，请设置以下环境变量，将 `https://proxy.corp.example.com` 替换为代理 URL，将 `corp.example.com` 替换为模块前缀：```
GOPROXY=https://[私有代理地址].corp.example.com,https://proxy.golang.org,direct
GONOSUMDB=corp.example.com
````GOPROXY` 设置指示 `go` 命令首先尝试从 `https://proxy.corp.example.com` 下载模块。如果该服务器返回 404（未找到）或 410（已删除）响应，`go` 命令将回退到 `https://proxy.golang.org`，然后再尝试直接连接代码仓库。

`GONOSUMDB` 设置指示 `go` 命令不要使用公共校验和数据库来验证路径以 `corp.example.com` 开头的模块。

请注意，在此配置中使用的代理仍然可能控制对公共模块的访问，即使它不提供这些模块。如果代理对请求返回的错误状态码不是 404 或 410，`go` 命令将不会回退到 `GOPROXY` 列表中的后续条目。例如，代理可能会对许可证不合适或存在已知安全漏洞的模块返回 403（禁止访问）。

### 直接访问私有模块 {#private-module-proxy-direct}

可以配置 `go` 命令绕过公共代理，直接从版本控制服务器下载私有模块。当运行私有代理服务器不可行时，此方法很有用。

要配置 `go` 命令以此方式工作，请设置 `GOPRIVATE`，将 `corp.example.com` 替换为私有模块前缀：```
GOPRIVATE=corp.example.com
```在这一情况下，`GOPROXY` 变量无需更改。其默认值为 `https://proxy.golang.org,direct`，这指示 `go` 命令首先尝试从 `https://proxy.golang.org` 下载模块，如果该代理响应 404（未找到）或 410（已删除），则回退到直接连接。

`GOPRIVATE` 设置指示 `go` 命令不要为以 `corp.example.com` 开头的模块连接代理或校验和数据库。

可能仍然需要一个内部 HTTP 服务器来[将模块路径解析到仓库 URL](#vcs-find)。例如，当 `go` 命令下载模块 `corp.example.com/mod` 时，它会向 `https://corp.example.com/mod?go-get=1` 发送一个 GET 请求，并在响应中寻找仓库 URL。为避免此要求，请确保每个私有模块路径都具有标记仓库根路径前缀的 VCS 后缀（如 `.git`）。例如，当 `go` 命令下载模块 `corp.example.com/repo.git/mod` 时，它会克隆位于 `https://corp.example.com/repo.git` 或 `ssh://corp.example.com/repo.git` 的 Git 仓库，而无需发出额外的请求。

开发者需要对包含私有模块的仓库具有读取权限。这可以在全局 VCS 配置文件（如 `.gitconfig`）中进行配置。最好将 VCS 工具配置为不需要交互式认证提示。默认情况下，当调用 Git 时，`go` 命令通过设置 `GIT_TERMINAL_PROMPT=0` 来禁用交互式提示，但它会遵从显式的设置。

### 向私有代理传递凭据 {#private-module-proxy-auth}

`go` 命令在与代理服务器通信时支持 HTTP [基本认证](https://en.wikipedia.org/wiki/Basic_access_authentication)。

可以在 [`.netrc` 文件](https://www.gnu.org/software/inetutils/manual/html_node/The-_002enetrc-file.html) 中指定凭据。例如，包含以下各行的 `.netrc` 文件将配置 `go` 命令使用给定的用户名和密码连接到机器 `proxy.corp.example.com`。```
machine proxy.corp.example.com
login jrgopher
password hunter2
```可通过 `NETRC` 环境变量设置该文件的路径。如果未设置 `NETRC`，`go` 命令将在类 UNIX 平台读取 `$HOME/.netrc` 文件，在 Windows 平台则读取 `%USERPROFILE%\_netrc` 文件。

`.netrc` 文件中的字段使用空格、制表符和换行符分隔。需要特别注意的是，这些字符无法在用户名或密码中使用。还需注意机器名不能是完整的 URL，因此无法为同一机器的不同路径指定不同的用户名和密码。

或者，也可以在 `GOPROXY` URL 中直接指定凭据。例如：```
GOPROXY=https://jrgopher:hunter2@proxy.corp.example.com
```采用此方法时需谨慎：环境变量可能会出现在 shell 历史记录和日志中。

### 向私有仓库传递凭据 {#private-module-repo-auth}

`go` 命令可能直接从版本控制仓库下载模块。如果未使用私有代理，这对于私有模块是必需的。有关配置，请参阅[直接访问私有模块](#private-module-proxy-direct)。

当直接下载模块时，`go` 命令会运行如 `git` 等版本控制工具。这些工具会自行进行身份验证，因此您可能需要在工具特定的配置文件（如 `.gitconfig`）中配置凭据。

为确保此过程顺利，请确保 `go` 命令使用正确的仓库 URL，并且版本控制工具不会以交互方式要求输入密码。`go` 命令偏好使用 `https://` URL，而非 `ssh://` 等其他协议，除非在[查找仓库 URL](#vcs-find) 时已指定了协议。具体到 GitHub 仓库，`go` 命令默认使用 `https://`。

<!-- TODO(golang.org/issue/26134): 如果此问题得到解决，我们可以移除上述关于 GitHub 特殊情况的说明。 -->

对于大多数服务器，您可以配置客户端通过 HTTP 进行身份验证。例如，GitHub 支持使用 [OAuth 个人访问令牌作为 HTTP 密码](https://docs.github.com/en/free-pro-team@latest/github/extending-github/git-automation-with-oauth-tokens)。您可以像[向私有代理传递凭据](#private-module-proxy-auth)时那样，将 HTTP 密码存储在 `.netrc` 文件中。

或者，您可以将 `https://` URL 重写为其他协议。例如，在 `.gitconfig` 中：```
[url "git@github.com:"]
    insteadOf = https://github.com/
```更多信息，请参阅[为何“go get”在克隆仓库时使用HTTPS？](/doc/faq#git_https)

### 隐私保护 {#private-module-privacy}

`go` 命令可能会从模块代理服务器和版本控制系统下载模块及相关元数据。环境变量 `GOPROXY` 控制所使用的服务器，而环境变量 `GOPRIVATE` 和 `GONOPROXY` 则控制哪些模块通过代理获取。

`GOPROXY` 的默认值为：```
https://[待翻译: proxy.golang.org,direct]
```
```
https://[代理.golang.org,直接]
```在此设置下，当`go`命令下载模块或模块元数据时，它将首先向`proxy.golang.org`（谷歌运营的公共模块代理，[隐私政策](https://proxy.golang.org/privacy)）发送请求。关于每个请求中传输的具体信息，请参阅 [`GOPROXY`协议](#goproxy-protocol)。`go`命令不会传输个人身份信息，但会传输请求的完整模块路径。如果代理返回404（未找到）或410（已删除）状态码，`go`命令将尝试直接连接提供该模块的版本控制系统。详情请参阅[版本控制系统](#vcs)。

可通过设置`GOPRIVATE`或`GONOPROXY`环境变量来指定匹配私有模块前缀的通配符模式列表，这些模块不应通过任何代理请求。例如：```
GOPRIVATE=*.corp.example.com,*.research.example.com
````GOPRIVATE` 仅充当 `GONOPROXY` 和 `GONOSUMDB` 的默认值，因此除非 `GONOSUMDB` 需要设置不同的值，否则无需单独设置 `GONOPROXY`。当模块路径匹配 `GONOPROXY` 时，`go` 命令会忽略该模块的 `GOPROXY` 设置，直接从其版本控制仓库获取。这在无代理服务私有模块时非常有用。详见[直接访问私有模块](#private-module-proxy-direct)。

如果存在[服务所有模块的可信代理](#private-module-proxy-all)，则不应设置 `GONOPROXY`。例如，当 `GOPROXY` 设定为单一源时，`go` 命令将不会从其他源下载模块。在此场景下仍需设置 `GONOSUMDB`。```
GOPROXY=https://proxy.corp.example.com
GONOSUMDB=*.corp.example.com,*.research.example.com
```如果存在[仅服务私有模块的可信代理](#private-module-proxy-private)，则不应设置 `GONOPROXY`，但必须注意确保该代理能返回正确的状态码。例如，考虑以下配置：```
GOPROXY=https://公司代理服务器.proxy.corp.example.com,https://公共代理服务器.proxy.golang.org
GONOSUMDB=*.corp.example.com,*.research.example.com
```假设由于拼写错误，开发者尝试下载一个不存在的模块。```
go mod download corp.example.com/secret-product/typo@latest
````go` 命令会首先向 `proxy.corp.example.com` 请求此模块。如果该代理以 404 (未找到) 或 410 (已移除) 响应，`go` 命令将回退到 `proxy.golang.org`，并在请求 URL 中传输 `secret-product` 路径。如果私有代理以任何其他错误代码响应，`go` 命令将打印错误信息，并且不会回退到其他源。

除了代理之外，`go` 命令可能会连接校验和数据库，以验证未在 `go.sum` 中列出的模块的加密哈希值。`GOSUMDB` 环境变量用于设置校验和数据库的名称、URL 和公钥。`GOSUMDB` 的默认值是 `sum.golang.org`，这是由 Google 运营的公共校验和数据库（[隐私政策](https://sum.golang.org/privacy)）。有关每次请求传输哪些内容的详细信息，请参见[校验和数据库](#checksum-database)。与代理一样，`go` 命令不会传输个人身份信息，但它会传输正在请求的完整模块路径，并且校验和数据库无法计算非公开模块的校验和。

`GONOSUMDB` 环境变量可以设置为模式，以指示哪些模块是私有的，并且不应从校验和数据库请求。`GOPRIVATE` 充当 `GONOSUMDB` 和 `GONOPROXY` 的默认值，因此除非需要为 `GONOPROXY` 设置不同的值，否则无需设置 `GONOSUMDB`。

代理可以[镜像校验和数据库](https://go.googlesource.com/proposal/+/master/design/25530-sumdb.md#proxying-a-checksum-database)。如果 `GOPROXY` 中的某个代理这样做，`go` 命令将不会直接连接到校验和数据库。

可以将 `GOSUMDB` 设置为 `off` 以完全禁用校验和数据库。使用此设置时，`go` 命令将不会验证下载的模块，除非它们已经在 `go.sum` 中。请参阅[验证模块](#authenticating)。

## 模块缓存 {#module-cache}

<dfn>模块缓存</dfn>是 `go` 命令存储已下载模块文件的目录。模块缓存与构建缓存（包含已编译的包和其他构建工件）不同。

模块缓存的默认位置是 `$GOPATH/pkg/mod`。要使用不同的位置，请设置 `GOMODCACHE` [环境变量](#environment-variables)。

模块缓存没有最大大小限制，并且 `go` 命令不会自动删除其内容。

该缓存可以由在同一台机器上开发的多个 Go 项目共享。无论主模块的位置如何，`go` 命令都将使用相同的缓存。多个 `go` 命令实例可以安全地同时访问同一个模块缓存。

`go` 命令在缓存中创建模块源文件和目录时使用只读权限，以防止模块在下载后被意外更改。这带来了一个不幸的副作用，即很难使用 `rm -rf` 等命令删除缓存。可以改用 [`go clean -modcache`](#go-clean-modcache) 来删除缓存。或者，当使用 `-modcacherw` 标志时，`go` 命令将创建具有读写权限的新目录。这增加了编辑器、测试和其他程序修改模块缓存中文件的风险。可以使用 [`go mod verify`](#go-mod-verify) 命令来检测主模块的依赖项是否被修改。它会扫描每个模块依赖项的提取内容，并确认它们与 `go.sum` 中的预期哈希值匹配。

下表解释了模块缓存中大多数文件的用途。一些临时文件（锁文件、临时目录）已省略。对于每个路径，`$module` 是模块路径，`$version` 是版本。以斜杠 (`/`) 结尾的路径是目录。模块路径和版本中的大写字母使用感叹号 (`!`) 进行转义（例如 `Azure` 转义为 `!azure`），以避免在大小写不敏感的文件系统上发生冲突。<table class="ModTable">
  <thead>
    <tr>
      <th>路径</th>
      <th>说明</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>$module@$version/</code></td>
      <td>
        包含模块 <code>.zip</code> 文件解压内容的目录。此目录作为已下载模块的根目录使用。如果原始模块没有 <code>go.mod</code> 文件，则该目录也不会包含该文件。
      </td>
    </tr>
    <tr>
      <td><code>cache/download/</code></td>
      <td>
        包含从模块代理下载的文件以及从<a href="#vcs">版本控制系统</a>衍生的文件的目录。此目录的布局遵循 <a href="#goproxy-protocol"><code>GOPROXY</code> 协议</a>，因此该目录可在由 HTTP 文件服务器提供服务时或通过 <code>file://</code> URL 引用时用作代理。
      </td>
    </tr>
    <tr>
      <td><code>cache/download/$module/@v/list</code></td>
      <td>
        已知版本列表（参见 <a href="#goproxy-protocol"><code>GOPROXY</code> 协议</a>）。此列表可能随时间变化，因此 <code>go</code> 命令通常会获取新副本而非重用此文件。
      </td>
    </tr>
    <tr>
      <td><code>cache/download/$module/@v/$version.info</code></td>
      <td>
        版本的 JSON 元数据（参见 <a href="#goproxy-protocol"><code>GOPROXY</code> 协议</a>）。此数据可能随时间变化，因此 <code>go</code> 命令通常会获取新副本而非重用此文件。
      </td>
    </tr>
    <tr>
      <td><code>cache/download/$module/@v/$version.mod</code></td>
      <td>
        此版本的 <code>go.mod</code> 文件（参见 <a href="#goproxy-protocol"><code>GOPROXY</code> 协议</a>）。如果原始模块没有 <code>go.mod</code> 文件，此处将是一个不含依赖项的合成文件。
      </td>
    </tr>
    <tr>
      <td><code>cache/download/$module/@v/$version.zip</code></td>
      <td>
        模块的压缩内容（参见 <a href="#goproxy-protocol"><code>GOPROXY</code> 协议</a>和<a href="#zip-files">模块 zip 文件</a>）。
      </td>
    </tr>
    <tr>
      <td><code>cache/download/$module/@v/$version.ziphash</code></td>
      <td>
        <code>.zip</code> 文件中文件的加密哈希值。注意，此处哈希计算的对象是文件内容而非 <code>.zip</code> 文件本身，因此文件顺序、压缩方式、对齐和元数据不影响哈希值。使用模块时，<code>go</code> 命令会验证此哈希值是否与 <a href="#go-sum-files"><code>go.sum</code></a> 中的对应行匹配。<a href="#go-mod-verify"><code>go mod verify</code></a> 命令会检查模块 <code>.zip</code> 文件和解压目录的哈希值是否与这些文件匹配。
      </td>
    </tr>
    <tr>
      <td><code>cache/download/sumdb/</code></td>
      <td>
        包含从<a href="#checksum-database">校验和数据库</a>（通常是 <code>sum.golang.org</code>）下载的文件的目录。
      </td>
    </tr>
    <tr>
      <td><code>cache/vcs/</code></td>
      <td>
        存放从源代码直接获取的模块克隆版本控制仓库的目录。目录名称是从仓库类型和 URL 派生的十六进制编码哈希值。仓库经过优化以减小磁盘占用。例如，克隆的 Git 仓库在可能的情况下会采用裸仓库和浅克隆模式。
      </td>
    </tr>
  </tbody>
</table>

## 模块认证 {#authenticating}

当 `go` 命令将模块 [zip 文件](#zip-files)或 [`go.mod` 文件](#go-mod-file)下载到[模块缓存](#module-cache)时，它会计算加密哈希值并与已知值进行比对，以验证文件自首次下载后未被篡改。若下载文件的哈希值不正确，`go` 命令将报告安全错误。

对于 `go.mod` 文件，`go` 命令根据文件内容计算哈希值。对于模块 zip 文件，`go` 命令则按照确定性顺序根据归档文件内的文件名和内容计算哈希值。此哈希值不受文件顺序、压缩方式、对齐及其他元数据的影响。具体实现细节请参阅 [`golang.org/x/mod/sumdb/dirhash`](https://pkg.go.dev/golang.org/x/mod/sumdb/dirhash?tab=doc)。

`go` 命令会将每个哈希值与主模块的 [`go.sum` 文件](#go-sum-files)中的对应行进行比对。若哈希值与 `go.sum` 中的记录不符，`go` 命令将报告安全错误并删除已下载文件，且不会将其加入模块缓存。

如果 `go.sum` 文件不存在，或其中不包含已下载文件的哈希值，`go` 命令可能会通过[校验和数据库](#checksum-database)（针对公开可用模块的全球哈希源）来验证哈希值。验证通过后，`go` 命令会将该哈希值添加到 `go.sum`，并将已下载文件存入模块缓存。若模块为私有模块（匹配 `GOPRIVATE` 或 `GONOSUMDB` 环境变量）或校验和数据库被禁用（通过设置 `GOSUMDB=off`），`go` 命令将直接接受该哈希值并将文件添加到模块缓存而不进行验证。系统上通常所有Go项目共享同一个模块缓存，每个模块可能拥有自己的 `go.sum` 文件，其中记录的哈希值可能各不相同。为避免依赖其他模块的 `go.sum`，当 `go` 命令访问模块缓存中的文件时，总是基于主模块的 `go.sum` 进行哈希验证。由于计算压缩包的哈希值较为耗时，`go` 命令会检查随压缩包一同存储的预计算哈希值，而非重新计算。可使用 [`go mod verify`](#go-mod-verify) 命令检查压缩包及其解压目录自加入缓存后是否被修改。

### go.sum 文件 {#go-sum-files}

模块根目录中通常会有一个与 `go.mod` 同级的 `go.sum` 文本文件。该文件记录了该模块直接依赖与间接依赖的加密哈希值。当 `go` 命令下载模块的 `.mod` 或 `.zip` 文件至[模块缓存](#module-cache)时，会计算哈希值并与主模块 `go.sum` 中的对应记录进行校验。若模块无依赖关系，或所有依赖均通过 [`replace` 指令](#go-mod-file-replace) 替换为本地目录，则 `go.sum` 文件可能为空或不存在。

`go.sum` 文件的每一行包含三个以空格分隔的字段：模块路径、版本（可能以 `/go.mod` 结尾）和哈希值。

* 模块路径字段表示该哈希值所属的模块名称
* 版本字段表示该哈希值对应的模块版本。若版本以 `/go.mod` 结尾，则哈希值仅针对该模块的 `go.mod` 文件；否则哈希值对应模块 `.zip` 压缩包内的文件
* 哈希值字段由算法名称（如 `h1`）和 Base64 编码的加密哈希值组成，以冒号（`:`）分隔。当前仅支持 SHA-256 算法（标识为 `h1`）。若未来发现 SHA-256 存在漏洞，将会新增其他算法（依次命名为 `h2` 等）

`go.sum` 文件可能包含同一模块的多个版本记录。为执行[最小版本选择](#minimal-version-selection)，`go` 命令可能需要加载依赖项的多个版本对应的 `go.mod` 文件。文件中也可能保留已无需使用的模块版本记录（例如升级后的旧版本）。[`go mod tidy`](#go-mod-tidy) 命令可补充缺失的哈希记录，并清理 `go.sum` 中多余的记录。

### 校验和数据库 {#checksum-database}

校验和数据库是 `go.sum` 记录的全球统一数据源。`go` 命令可在多种场景下使用该数据库，以检测代理服务器或源服务器的异常行为。

该数据库为所有公开可用的模块版本提供了全局一致性和可靠性保障。由于代理服务器无法在不被察觉的情况下篡改代码，使得不可信代理得以存在。同时确保特定版本对应的文件内容不会随时间变化，即便模块作者后续修改了仓库中的标签。

校验和数据库由 Google 运营的 [sum.golang.org](https://sum.golang.org) 提供服务。这是一个基于 [Trillian](https://github.com/google/trillian) 实现的[透明日志](https://research.swtch.com/tlog)（或称“Merkle 树”）结构。Merkle 树的主要优势在于独立审计方可以验证其完整性，因此比普通数据库更值得信赖。

`go` 命令通过《[提案：保护公共Go模块生态系统](https://go.googlesource.com/proposal/+/master/design/25530-sumdb.md#checksum-database)》中定义的协议与校验和数据库交互。

下表说明了校验和数据库必须响应的查询格式。其中 `$base` 代表校验和数据库URL的路径部分，`$module` 为模块路径，`$version` 为版本号。例如当数据库URL为 `https://sum.golang.org`，客户端请求查询 `golang.org/x/text` 模块的 `v0.3.2` 版本时，将向 `https://sum.golang.org/lookup/golang.org/x/text@v0.3.2` 发送 GET 请求。

为避免大小写不敏感文件系统的歧义，`$module` 和 `$version` 部分会进行[大小写编码](https://pkg.go.dev/golang.org/x/mod/module#EscapePath)处理——将每个大写字母替换为感叹号加对应小写字母。这使得 `example.com/M` 和 `example.com/m` 两个模块能够共存于磁盘（前者编码为 `example.com/!m`）。

路径中用方括号包裹的部分（如 `[.p/$W]`）表示可选参数。<table class="ModTable">
  <thead>
    <tr>
      <th>路径</th>
      <th>描述</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>$base/latest</code></td>
      <td>
        返回最新日志的签名、编码后的树描述。该签名描述的格式为
        <a href="https://pkg.go.dev/golang.org/x/mod/sumdb/note">note</a>，
        它是一种经由一个或多个服务器密钥签名的文本，可使用服务器的公钥进行验证。
        树描述提供了该规模下树的大小和树头哈希。此编码格式在
        <code><a href="https://pkg.go.dev/golang.org/x/mod/sumdb/tlog#FormatTree">
        golang.org/x/mod/sumdb/tlog#FormatTree</a></code> 中描述。
      </td>
    </tr>
    <tr>
    <tr>
      <td><code>$base/lookup/$module@$version</code></td>
      <td>
        返回关于 <code>$module</code> 在 <code>$version</code> 的条目对应的日志记录号，
        随后是该记录的数据（即 <code>$module</code> 在 <code>$version</code> 对应的
        <code>go.sum</code> 行）以及包含该记录的签名、编码后的树描述。
      </td>
    </tr>
    <tr>
    <tr>
      <td><code>$base/tile/$H/$L/$K[.p/$W]</code></td>
      <td>
        返回一个<a href="https://research.swtch.com/tlog#serving_tiles">日志块</a>，
        它是一组构成日志某一部分的哈希值。每个块由二维坐标定义：块层级 <code>$L</code>、
        从左数第 <code>$K</code> 个，块高度为 <code>$H</code>。
        可选的 <code>.p/$W</code> 后缀表示仅包含 <code>$W</code> 个哈希的部分日志块。
        如果未找到部分日志块，客户端必须回退到获取完整日志块。
      </td>
    </tr>
    <tr>
    <tr>
      <td><code>$base/tile/$H/data/$K[.p/$W]</code></td>
      <td>
        返回 <code>/tile/$H/0/$K[.p/$W]</code> 中叶哈希对应的记录数据
        （路径元素 <code>data</code> 为字面值）。
      </td>
    </tr>
    <tr>
  </tbody>
</table>

如果 `go` 命令需要查询校验数据库，则第一步是通过 `/lookup` 端点检索记录数据。
如果该模块版本尚未记录在日志中，校验数据库会在回复前尝试从源服务器获取它。
此 `/lookup` 数据提供了该模块版本的校验和及其在日志中的位置，
从而告知客户端应获取哪些日志块以执行证明。
在将新的 `go.sum` 行添加到主模块的 `go.sum` 文件之前，
`go` 命令会执行“存在性”证明（证明特定记录存在于日志中）和
“一致性”证明（证明树未被篡改）。
关键点在于：来自 `/lookup` 的数据必须先针对签名的树哈希进行认证，
并针对客户端的签名的树哈希时间线进行认证，之后才能使用。

校验数据库提供的签名的树哈希和新日志块存储在模块缓存中，
因此 `go` 命令只需获取缺失的日志块。

`go` 命令不需要直接连接到校验数据库。
它可以通过[镜像校验数据库](https://go.googlesource.com/proposal/+/master/design/25530-sumdb.md#proxying-a-checksum-database)
并支持上述协议的模块代理来请求模块校验和。
这对于阻止组织外部请求的私有企业代理尤其有用。

`GOSUMDB` 环境变量指定了要使用的校验数据库的名称，可选地指定其公钥和 URL，格式如下：```
GOSUMDB="sum.golang.org"
GOSUMDB="sum.golang.org+<公钥>"
GOSUMDB="sum.golang.org+<公钥> https://sum.golang.org"
````go` 命令已知 `sum.golang.org` 的公钥，并且知道名称 `sum.golang.google.cn`（中国大陆境内可用）连接到 `sum.golang.org` 校验和数据库；使用任何其他数据库则需要显式提供其公钥。URL 默认为 `https://` 加上数据库名称。

`GOSUMDB` 默认为 `sum.golang.org`，即由 Google 运营的 Go 校验和数据库。有关该服务的隐私政策，请参阅 https://sum.golang.org/privacy。

如果将 `GOSUMDB` 设置为 `off`，或者使用 `-insecure` 标志调用 `go get`，则不会查询校验和数据库，并且所有未识别的模块都会被接受，代价是放弃对所有模块进行经过验证的可重复下载的安全保证。绕过特定模块校验和数据库的更好方法是使用 `GOPRIVATE` 或 `GONOSUMDB` 环境变量。有关详情，请参阅[私有模块](#private-modules)。

可以使用 `go env -w` 命令
[设置这些变量](/pkg/cmd/go/#hdr-Print_Go_environment_information)，
以便在后续 `go` 命令调用中生效。

## 环境变量 {#environment-variables}

`go` 命令中的模块行为可以通过以下列出的环境变量进行配置。此列表仅包含与模块相关的环境变量。有关 `go` 命令识别的所有环境变量列表，请参阅 [`go help
environment`](/cmd/go/#hdr-Environment_variables)。<table class="ModTable">
  <thead>
    <tr>
      <th>变量</th>
      <th>描述</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>GO111MODULE</code></td>
      <td>
        <p>
          控制 <code>go</code> 命令是在模块感知模式还是 <code>GOPATH</code> 模式下运行。可识别的值有三个：
        </p>
        <ul>
          <li>
            <code>off</code>：<code>go</code> 命令忽略 <code>go.mod</code> 文件，并在 <code>GOPATH</code> 模式下运行。
          </li>
          <li>
            <code>on</code>（或未设置）：即使当前目录没有 <code>go.mod</code> 文件，<code>go</code> 命令也在模块感知模式下运行。
          </li>
          <li>
            <code>auto</code>：如果当前目录或任何父目录中存在 <code>go.mod</code> 文件，则 <code>go</code> 命令在模块感知模式下运行。在 Go 1.15 及更低版本中，这是默认设置。
          </li>
        </ul>
        <p>
          更多信息请参阅 <a href="#mod-commands">模块感知命令</a>。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GOMODCACHE</code></td>
      <td>
        <p>
          <code>go</code> 命令将下载的模块和相关文件存储在此目录中。有关此目录结构的详细信息，请参阅 <a href="#module-cache">模块缓存</a>。
        </p>
        <p>
          如果未设置 <code>GOMODCACHE</code>，则默认为 <code>$GOPATH/pkg/mod</code>。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GOINSECURE</code></td>
      <td>
        <p>
          一个逗号分隔的 glob 模式列表（语法遵循 Go 的 <a href="/pkg/path/#Match"><code>path.Match</code></a>），表示可以始终以不安全方式获取的模块路径前缀。仅适用于正在直接获取的依赖项。
        </p>
        <p>
          与 <code>go get</code> 上的 <code>-insecure</code> 标志不同，<code>GOINSECURE</code> 不会禁用模块校验和数据库的验证。可以使用 <code>GOPRIVATE</code> 或 <code>GONOSUMDB</code> 来实现该目的。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GONOPROXY</code></td>
      <td>
        <p>
          一个逗号分隔的 glob 模式列表（语法遵循 Go 的 <a href="/pkg/path/#Match"><code>path.Match</code></a>），表示应始终从版本控制仓库直接获取，而不是通过模块代理获取的模块路径前缀。
        </p>
        <p>
          如果未设置 <code>GONOPROXY</code>，则默认为 <code>GOPRIVATE</code>。请参阅 <a href="#private-module-privacy">隐私</a>。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GONOSUMDB</code></td>
      <td>
        <p>
          一个逗号分隔的 glob 模式列表（语法遵循 Go 的 <a href="/pkg/path/#Match"><code>path.Match</code></a>），表示 <code>go</code> 命令不应使用校验和数据库验证其校验和的模块路径前缀。
        </p>
        <p>
          如果未设置 <code>GONOSUMDB</code>，则默认为 <code>GOPRIVATE</code>。请参阅 <a href="#private-module-privacy">隐私</a>。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GOPATH</code></td>
      <td>
        <p>
          在 <code>GOPATH</code> 模式下，<code>GOPATH</code> 变量是一个可能包含 Go 代码的目录列表。
        </p>
        <p>
          在模块感知模式下，<a href="#glos-module-cache">模块缓存</a> 存储在第一个 <code>GOPATH</code> 目录的 <code>pkg/mod</code> 子目录中。缓存之外的模块源代码可以存储在任何目录中。
        </p>
        <p>
          如果未设置 <code>GOPATH</code>，则默认为用户主目录下的 <code>go</code> 子目录。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GOPRIVATE</code></td>
      <td>
        一个逗号分隔的 glob 模式列表（语法遵循 Go 的 <a href="/pkg/path/#Match"><code>path.Match</code></a>），表示应被视为私有的模块路径前缀。<code>GOPRIVATE</code> 是 <code>GONOPROXY</code> 和 <code>GONOSUMDB</code> 的默认值。请参阅 <a href="#private-module-privacy">隐私</a>。<code>GOPRIVATE</code> 还决定一个模块是否为 <code>GOVCS</code> 视为私有。
      </td>
    </tr>
    <tr>
      <td><code>GOPROXY</code></td>
      <td>
        <p>
          模块代理 URL 列表，由逗号（<code>,</code>）或竖线（<code>|</code>）分隔。当 <code>go</code> 命令查找模块信息时，它会按顺序联系列表中的每个代理，直到收到成功响应或遇到终止性错误。代理可以返回 404（未找到）或 410（已消失）状态码来表示该模块在该服务器上不可用。
        </p>
        <p>
          <code>go</code> 命令的错误回退行为由 URL 之间的分隔符决定。如果代理 URL 后跟逗号，<code>go</code> 命令在遇到 404 或 410 错误后将回退到下一个 URL；所有其他错误均视为终止性错误。如果代理 URL 后跟竖线，<code>go</code> 命令在遇到任何错误（包括超时等非 HTTP 错误）后都将回退到下一个源。
        </p>
        <p>
          <code>GOPROXY</code> URL 可以使用 <code>https</code>、<code>http</code> 或 <code>file</code> 协议。如果 URL 没有协议，则假定为 <code>https</code>。模块缓存可以直接用作文件代理：
        </p>
        <pre>GOPROXY=file://$(go env GOMODCACHE)/cache/download</pre>
        <p>可以使用两个关键字代替代理 URL：</p>
        <ul>
          <li>
            <code>off</code>：禁止从任何源下载模块。
          </li>
          <li>
            <code>direct</code>：直接从版本控制仓库下载，而不是使用模块代理。
          </li>
        </ul>
        <p>
          <code>GOPROXY</code> 默认为 <code>https://proxy.golang.org,direct</code>。在此配置下，<code>go</code> 命令首先联系 Google 运行的 Go 模块镜像，如果镜像中没有该模块，则回退到直接连接。有关该镜像的隐私政策，请参阅 <a href="https://proxy.golang.org/privacy">https://proxy.golang.org/privacy</a>。可以设置 <code>GOPRIVATE</code> 和 <code>GONOPROXY</code> 环境变量来防止特定模块通过代理下载。有关私有代理配置的信息，请参阅 <a href="#private-module-privacy">隐私</a>。
        </p>
        <p>
          有关代理使用方式的更多信息，请参阅 <a href="#module-proxy">模块代理</a> 和 <a href="#resolve-pkg-mod">将包解析为模块</a>。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GOSUMDB</code></td>
      <td>
        <p>
          指定要使用的校验和数据库的名称，以及可选的公钥和 URL。例如：
        </p>
        <pre>
GOSUMDB="sum.golang.org"
GOSUMDB="sum.golang.org+&lt;publickey&gt;"
GOSUMDB="sum.golang.org+&lt;publickey&gt; https://sum.golang.org"
</pre>
        <p>
          <code>go</code> 命令已知 <code>sum.golang.org</code> 的公钥，并且知道名称 <code>sum.golang.google.cn</code>（中国大陆境内可用）连接到 <code>sum.golang.org</code> 数据库；使用任何其他数据库都需要显式提供公钥。URL 默认为 <code>https://</code> 加上数据库名称。
        </p>
        <p>
          <code>GOSUMDB</code> 默认为 <code>sum.golang.org</code>，即由 Google 运行的 Go 校验和数据库。有关该服务的隐私政策，请参阅 <a href="https://sum.golang.org/privacy">https://sum.golang.org/privacy</a>。
        <p>
        <p>
          如果 <code>GOSUMDB</code> 设置为 <code>off</code> 或者如果使用 <code>-insecure</code> 标志调用 <code>go get</code>，则不会查询校验和数据库，并且所有未识别的模块都会被接受，代价是放弃对所有模块进行已验证可重复下载的安全保证。绕过特定模块的校验和数据库的更好方法是使用 <code>GOPRIVATE</code> 或 <code>GONOSUMDB</code> 环境变量。
        </p>
        <p>
          更多信息请参阅 <a href="#authenticating">模块认证</a> 和 <a href="#private-module-privacy">隐私</a>。
        </p>
      </td>
    </tr>
    <tr>
      <td><code>GOVCS</code></td>
      <td>
        <p>
          控制 <code>go</code> 命令可以用来下载公共和私有模块（根据其路径是否匹配 <code>GOPRIVATE</code> 中的模式来定义）或匹配 glob 模式的其他模块的版本控制工具集。
        </p>
        <p>
          如果未设置 <code>GOVCS</code>，或者模块不匹配 <code>GOVCS</code> 中的任何模式，则 <code>go</code> 命令对公共模块可以使用 <code>git</code> 和 <code>hg</code>，对私有模块可以使用任何已知的版本控制工具。具体来说，<code>go</code> 命令的行为就像 <code>GOVCS</code> 设置为：
        </p>
        <pre>public:git|hg,private:all</pre>
        <p>
          完整解释请参阅 <a href="#vcs-govcs">使用 <code>GOVCS</code> 控制版本控制工具</a>。
        </p>
      </td>
    </tr>
     <tr>
      <td><code>GOWORK</code></td>
      <td>
       <p>
        <code>GOWORK</code> 环境变量指示 <code>go</code> 命令使用提供的 <a href="#go-work-file"><code>go.work</code> 文件</a> 来定义工作区，从而进入工作区模式。如果 <code>GOWORK</code> 设置为 <code>off</code>，则禁用工作区模式。这可用于在单模块模式下运行 <code>go</code> 命令：例如，<code>GOWORK=off go build .</code> 将在单模块模式下构建 <code>.</code> 包。如果 <code>GOWORK</code> 为空，<code>go</code> 命令将按照 <a href="#workspaces">工作区</a> 部分所述搜索 <code>go.work</code> 文件。
       </p>
      </td>
    </tr>
  </tbody>
</table>## 术语表 {#glossary}

<a id="glos-build-constraint"></a>
**构建约束：** 决定编译包时是否使用某个 Go 源文件的条件。构建约束可以通过文件名后缀（例如 `foo_linux_amd64.go`）或构建约束注释（例如 `// +build linux,amd64`）来表达。参见[构建约束](/pkg/go/build/#hdr-Build_Constraints)。

<a id="glos-build-list"></a>
**构建列表：** 将用于 `go build`、`go list` 或 `go test` 等构建命令的模块版本列表。构建列表根据[主模块](#glos-main-module)的 [`go.mod` 文件](#glos-go-mod-file)以及通过传递性依赖关系所需模块中的 `go.mod` 文件，使用[最小版本选择](#glos-minimal-version-selection)来确定。构建列表包含[模块图](#glos-module-graph)中所有模块的版本，而不仅仅是特定命令相关的版本。

<a id="glos-canonical-version"></a>
**规范版本：** 格式正确且不包含 `+incompatible` 之外的构建元数据后缀的[版本](#glos-version)。例如，`v1.2.3` 是规范版本，但 `v1.2.3+meta` 不是。

<a id="glos-current-module"></a>
**当前模块：** [主模块](#glos-main-module)的同义词。

<a id="glos-deprecated-module"></a>
**已弃用模块：** 不再由其作者支持的模块（就此事而言，主版本被视为不同的模块）。已弃用模块在其最新版本的 [`go.mod` 文件](#glos-go-mod-file)中会通过[弃用注释](#go-mod-file-module-deprecation)进行标记。

<a id="glos-direct-dependency"></a>
**直接依赖：** 其路径出现在[主模块](#glos-main-module)中某个包或测试的 `.go` 源文件的 [`import` 声明](/ref/spec#import_declarations)中的包，或者包含此类包的模块。（对比[间接依赖](#glos-indirect-dependency)。）

<a id="glos-direct-mode"></a>
**直接模式：** [环境变量](#environment-variables)的一种设置，它使 `go` 命令直接从[版本控制系统](#vcs)下载模块，而不是通过[模块代理](#glos-module-proxy)。`GOPROXY=direct` 会对所有模块执行此操作。`GOPRIVATE` 和 `GONOPROXY` 则会对匹配模式列表的模块执行此操作。

<a id="glos-go-mod-file"></a>
**`go.mod` 文件：** 定义模块路径、依赖关系和其他元数据的文件。位于[模块的根目录](#glos-module-root-directory)中。参见关于 [`go.mod` 文件](#go-mod-file)的部分。

<a id="glos-go-work-file"></a>
**`go.work` 文件** 定义在[工作区](#workspaces)中使用的模块集合的文件。参见关于 [`go.work` 文件](#go-work-file)的部分。

<a id="glos-import-path"></a>
**导入路径：** 用于在 Go 源文件中导入包的字符串。与[包路径](#glos-package-path)同义。

<a id="glos-indirect-dependency"></a>
**间接依赖：** 被[主模块](#glos-main-module)中的包或测试传递性导入的包，但其路径未出现在主模块中的任何 [`import` 声明](/ref/spec#import_declarations)中；或者出现在[模块图](#glos-module-graph)中但未直接提供被主模块导入的任何包的模块。（对比[直接依赖](#glos-direct-dependency)。）

<a id="glos-lazy-module-loading"></a>
**延迟模块加载：** Go 1.17 中的一项变更，对于指定了 `go 1.17` 或更高版本的模块，可以避免为不需要它的命令加载[模块图](#glos-module-graph)。参见[延迟模块加载](#lazy-loading)。

<a id="glos-main-module"></a>
**主模块：** 调用 `go` 命令时所在的模块。主模块由当前目录或父目录中的 [`go.mod` 文件](#glos-go-mod-file)定义。参见[模块、包和版本](#modules-overview)。

<a id="glos-major-version"></a>
**主版本：** 语义版本中的第一个数字（`v1.2.3` 中的 `1`）。在包含不兼容变更的版本中，主版本号必须递增，次版本号和修订号必须设为 0。主版本号为 0 的语义版本被视为不稳定。

<a id="glos-major-version-subdirectory"></a>
**主版本子目录：** 版本控制仓库中与模块的[主版本后缀](#glos-major-version-suffix)匹配的子目录，模块可以在其中定义。例如，[根路径](#glos-repository-root-path)为 `example.com/mod` 的仓库中的模块 `example.com/mod/v2` 可以在仓库根目录或主版本子目录 `v2` 中定义。参见[仓库中的模块目录](#vcs-dir)。

<a id="glos-major-version-suffix"></a>
**主版本后缀：** 与主版本号匹配的模块路径后缀。例如，`example.com/mod/v2` 中的 `/v2`。在 `v2.0.0` 及更高版本中需要主版本后缀，在早期版本中不允许使用。参见关于[主版本后缀](#major-version-suffixes)的部分。

<a id="glos-minimal-version-selection"></a>
**最小版本选择 (MVS)：** 用于确定构建中将使用的所有模块版本的算法。有关详细信息，请参阅关于[最小版本选择](#minimal-version-selection)的部分。

<a id="glos-minor-version"></a>
**次版本：** 语义版本中的第二个数字（`v1.2.3` 中的 `2`）。在包含向后兼容新功能的版本中，次版本号必须递增，修订号必须设为 0。

<a id="glos-module"></a>
**模块：** 一组一起发布、版本控制和分发的包的集合。

<a id="glos-module-cache"></a>
**模块缓存：** 存储已下载模块的本地目录，位于 `GOPATH/pkg/mod`。参见[模块缓存](#module-cache)。<a id="glos-module-graph"></a>
**模块图：** 模块依赖关系的有向图，以[主模块](#glos-main-module)为根。图中的每个顶点代表一个模块；每条边代表一个来自 `go.mod` 文件中 `require` 语句的版本（受主模块 `go.mod` 文件中 `replace` 和 `exclude` 语句的影响）。

<a id="glos-module-graph-pruning"></a>
**模块图剪枝：** Go 1.17 中引入的一项变更，通过省略指定 `go 1.17` 或更高版本的模块的传递性依赖项，来减小模块图的大小。参见[模块图剪枝](#graph-pruning)。

<a id="glos-module-path"></a>
**模块路径：** 用于标识一个模块的路径，并作为该模块内包导入路径的前缀。例如，`"golang.org/x/net"`。

<a id="glos-module-proxy"></a>
**模块代理：** 实现了 [`GOPROXY` 协议](#goproxy-protocol)的网络服务器。`go` 命令从模块代理下载版本信息、`go.mod` 文件和模块压缩文件。

<a id="glos-module-root-directory"></a>
**模块根目录：** 包含定义该模块的 `go.mod` 文件的目录。

<a id="glos-module-subdirectory"></a>
**模块子目录：** [模块路径](#glos-module-path)中位于[仓库根路径](#glos-repository-root-path)之后的部分，用于指明模块定义所在的子目录。当该部分非空时，模块子目录同时也是[语义版本标签](#glos-semantic-version-tag)的前缀。模块子目录不包含[主版本后缀](#glos-major-version-suffix)（如果存在的话），即使模块位于[主版本子目录](#glos-major-version-subdirectory)中也是如此。参见[模块路径](#module-path)。

<a id="glos-package"></a>
**包：** 同一目录下被一起编译的源文件集合。参见 Go 语言规范中的[包](/ref/spec#Packages)部分。

<a id="glos-package-path"></a>
**包路径：** 唯一标识一个包的路径。包路径是将[模块路径](#glos-module-path)与模块内的子目录连接而成。例如，`"golang.org/x/net/html"` 是模块 `"golang.org/x/net"` 中位于 `"html"` 子目录下的包的路径。与[导入路径](#glos-import-path)同义。

<a id="glos-patch-version"></a>
**修订版本：** 语义版本中的第三个数字（`v1.2.3` 中的 `3`）。在未对模块公共接口进行更改的版本发布中，必须递增修订版本号。

<a id="glos-pre-release-version"></a>
**预发布版本：** 版本号中紧随修订版本之后带有一个短横线及一系列由点分隔的标识符的版本，例如 `v1.2.3-beta4`。预发布版本被视为不稳定版本，并且不假定与其他版本兼容。预发布版本排序在对应的正式版本之前：`v1.2.3-pre` 排在 `v1.2.3` 之前。另见[正式版本](#glos-release-version)。

<a id="glos-pseudo-version"></a>
**伪版本：** 编码了修订标识符（如 Git 提交哈希）和来自版本控制系统的时间戳的版本。例如，`v0.0.0-20191109021931-daa7c04131f5`。用于[与非模块仓库兼容](#non-module-compat)以及在没有可用标签版本的其他情况。

<a id="glos-release-version"></a>
**正式版本：** 不带预发布后缀的版本。例如，`v1.2.3`，而不是 `v1.2.3-pre`。另见[预发布版本](#glos-pre-release-version)。

<a id="glos-repository-root-path"></a>
**仓库根路径：** [模块路径](#glos-module-path)中对应于版本控制仓库根目录的部分。参见[模块路径](#module-path)。

<a id="glos-retracted-version"></a>
**撤回版本：** 不应被依赖的版本，可能是因为发布过早，或在发布后发现了严重问题。参见 [`retract` 指令](#go-mod-file-retract)。

<a id="glos-semantic-version-tag"></a>
**语义版本标签：** 版本控制仓库中将[版本](#glos-version)映射到特定修订版本的标签。参见[将版本映射到提交](#vcs-version)。

<a id="glos-selected-version"></a>
**选定版本：** 由[最小版本选择](#minimal-version-selection)为给定模块选择的版本。选定版本是在[模块图](#glos-module-graph)中找到的该模块路径的最高版本。

<a id="glos-vendor-directory"></a>
**供应商目录：** 一个名为 `vendor` 的目录，包含构建主模块中的包所需的其他模块的包。使用 [`go mod vendor`](#go-mod-vendor) 命令进行维护。参见[供应商](#vendoring)。

<a id="glos-version"></a>
**版本：** 模块不可变快照的标识符，写作字母 `v` 后跟一个语义版本。参见[版本](#versions)部分。

<a id="glos-workspace"></a>
**工作区：** 磁盘上的一组模块，在运行[最小版本选择 (MVS)](#minimal-version-selection) 时用作主模块。参见[工作区](#workspaces)部分。