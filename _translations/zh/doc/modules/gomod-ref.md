<!--{
  "Title": "go.mod 文件参考"
}-->

每个 Go 模块都由一个 go.mod 文件定义，该文件描述了模块的属性，包括其对其他模块的依赖关系以及所需的 Go 语言版本。

这些属性包括：

* 当前模块的**模块路径**。这应是一个可被 Go 工具下载的位置，例如模块代码的仓库位置。结合模块的版本号，它可作为唯一标识符。它也是该模块中所有包路径的前缀。关于 Go 如何定位模块的更多信息，请参阅 <a href="/ref/mod#vcs-find">Go 模块参考</a>。
* 当前模块所需的最低 **Go 版本**。
* 当前模块所需的其他**模块的最低版本**列表。
* 可选的操作指令：**替换**某个所需模块为另一个模块版本或本地目录；**排除**某个所需模块的特定版本；或在匹配包模式时**忽略**模块内的特定目录。

当你运行 [`go mod init` 命令](/ref/mod#go-mod-init)时，Go 会生成一个 go.mod 文件。以下示例创建了一个 go.mod 文件，并将模块的路径设置为 example/mymodule：```
$ go mod init example/mymodule
```使用`go`命令来管理依赖项。这些命令确保您go.mod文件中描述的需求保持一致，且go.mod文件的内容有效。这些命令包括[`go get`](/ref/mod#go-get)、[`go mod tidy`](/ref/mod#go-mod-tidy)和[`go mod edit`](/ref/mod#go-mod-edit)。

有关`go`命令的参考，请参阅[Command go](/cmd/go/)。您可以在命令行输入`go help` _命令名称_ 来获取帮助，例如`go help mod tidy`。

**另请参阅**

* Go工具会在您使用它们管理依赖项时修改您的go.mod文件。更多详情，请参阅[管理依赖项](/doc/modules/managing-dependencies)。
* 有关go.mod文件的更多详细信息和约束，请参阅[Go模块参考](/ref/mod#go-mod-file)。

## 示例 {#example}

go.mod文件包含如以下示例所示的指令。这些指令将在本主题的其他地方进行描述。```
module example.com/mymodule

go 1.14

require (
    example.com/othermodule v1.2.3
    example.com/thismodule v1.2.3
    example.com/thatmodule v1.2.3
)

replace example.com/thatmodule => ../thatmodule
exclude example.com/thismodule v1.3.0
```## module {#module}

声明模块的模块路径，该路径是模块的唯一标识符（与模块版本号结合使用时）。该模块路径将成为该模块包含的所有包的导入前缀。

更多信息，请参阅Go模块参考中的 [`module` 指令](/ref/mod#go-mod-file-module)。

### 语法 {#module-syntax}

<pre>module <var>module-path</var></pre>

<dl>
    <dt>module-path</dt>
    <dd>模块的模块路径，通常是Go工具可从中下载该模块的仓库位置。对于v2及更高版本的模块，此值必须以主版本号结尾，例如 <code>/v2</code>。</dd>
</dl>

### 示例 {#module-examples}

以下示例使用 `example.com` 作为模块可从中下载的仓库域名。

*   v0 或 v1 模块的模块声明：```
  module example.com/mymodule
  ```* v2模块的模块路径：```
  module example.com/mymodule/v2
  ```### 注意事项 {#module-notes}

模块路径必须能唯一标识您的模块。对于大多数模块而言，该路径是一个 URL，`go` 命令可以通过它找到代码（或找到代码的重定向）。对于永远不会被直接下载的模块，模块路径可以是您控制的、能确保唯一性的任何名称。前缀 `example/` 也被保留用于此类示例中。

更多详情，请参阅[管理依赖项](/doc/modules/managing-dependencies#naming_module)。

在实践中，模块路径通常是模块源代码的仓库域名加上模块在仓库内的路径。`go` 命令在下载模块版本时，会依赖这种形式来解析模块用户的依赖项。

即使您最初并不打算让您的模块供其他代码使用，使用其仓库路径仍是一种最佳实践，这将有助于您在后续发布模块时避免不得不重命名它。

如果您最初不知道模块的最终仓库位置，可以考虑暂时使用一个安全的替代名称，例如您拥有的域名名称或您控制的名称（例如您的公司名称），后跟模块名称或源目录路径。更多信息，请参阅[管理依赖项](/doc/modules/managing-dependencies#naming_module)。

例如，如果您正在一个 `stringtools` 目录中进行开发，您的临时模块路径可能是 `<company-name>/stringtools`，如下例所示，其中 _company-name_ 是您公司的名称：```
go mod init <company-name>/stringtools
```## go {#go}

表示该模块是按照 `go` 指令指定的 Go 版本的语义编写的。

更多信息，请参阅 Go 模块参考文档中的 [`go` 指令](/ref/mod#go-mod-file-go) 部分。

### 语法 {#go-syntax}

<pre>go <var>最低Go版本</var></pre>

<dl>
    <dt>最低Go版本</dt>
    <dd>编译此模块中的包所需的最低 Go 版本。</dd>
</dl>

### 示例 {#go-examples}

* 模块必须能在 Go 1.14 或更高版本上运行：```
  go 1.14
  ```### 注意事项 {#go-notes}

`go` 指令设置了使用此模块所需的 Go 最低版本。在 Go 1.21 之前，该指令仅作为建议；现在已成为强制性要求：Go 工具链会拒绝使用声明了更高 Go 版本的模块。

`go` 指令是选择要运行哪个 Go 工具链的输入之一。详见“[Go 工具链](/doc/toolchain)”。

`go` 指令影响新语言特性的使用：

* 对于模块内的包，编译器会拒绝使用在 `go` 指令指定版本之后引入的语言特性。例如，如果模块的指令为 `go 1.12`，则其包不能使用在 Go 1.13 中引入的 `1_000_000` 这样的数字字面量。
* 如果使用较旧的 Go 版本构建模块中的某个包并遇到编译错误，错误信息会指出该模块是为更新的 Go 版本编写的。例如，假设某个模块的指令为 `go 1.13`，并且一个包使用了数字字面量 `1_000_000`。如果用 Go 1.12 构建该包，编译器会提示代码是为 Go 1.13 编写的。

`go` 指令还会影响 `go` 命令的行为：

* 当版本为 `go 1.14` 或更高时，可能启用自动 [vendoring](/ref/mod#vendoring)。如果存在 `vendor/modules.txt` 文件且其内容与 `go.mod` 一致，则无需显式使用 `-mod=vendor` 标志。
* 当版本为 `go 1.16` 或更高时，`all` 包模式仅匹配[主模块](/ref/mod#glos-main-module)中的包和测试所传递导入的包。这与自模块引入以来 [`go mod vendor`](/ref/mod#go-mod-vendor) 所保留的包集合相同。在较低版本中，`all` 还包括主模块中包所导入的包的测试、这些测试的测试，依此类推。
* 当版本为 `go 1.17` 或更高时：
   * `go.mod` 文件会为每个提供主模块中任意包或测试所传递导入的包的模块包含一个显式的 [`require` 指令](/ref/mod#go-mod-file-require)。（在 `go 1.16` 及更低版本中，仅当[最小版本选择](/ref/mod#minimal-version-selection)会选择不同版本时，才会包含间接依赖项。）这些额外信息使得[模块图剪枝](/ref/mod#graph-pruning)和[惰性模块加载](/ref/mod#lazy-loading)成为可能。
   * 由于 `// indirect` 依赖项可能比以前的 `go` 版本多很多，因此间接依赖项记录在 `go.mod` 文件中的单独区块中。
   * `go mod vendor` 会忽略已 vendor 化依赖项的 `go.mod` 和 `go.sum` 文件。（这允许在 `vendor` 子目录内调用 `go` 命令时识别正确的主模块。）
   * `go mod vendor` 会将每个依赖项 `go.mod` 文件中的 `go` 版本记录到 `vendor/modules.txt` 中。
* 当版本为 `go 1.21` 或更高时：
   * `go` 行声明了使用此模块所需的 Go 最低版本。
   * `go` 行必须大于或等于所有依赖项的 `go` 行。
   * `go` 命令不再尝试与上一个更旧的 Go 版本保持兼容。
   * `go` 命令在将 `go.mod` 文件的校验和保存到 `go.sum` 文件中时更加谨慎。
<!-- 如果您更新此列表，请同时更新 /ref/mod#go-mod-file-go。 -->

一个 `go.mod` 文件最多只能包含一个 `go` 指令。如果缺失，大多数命令会添加一个使用当前 Go 版本的 `go` 指令。

## toolchain {#toolchain}

声明建议用于此模块的 Go 工具链。仅当该模块是主模块且默认工具链早于建议的工具链时才生效。

更多信息请参阅“[Go 工具链](/doc/toolchain)”以及 Go 模块参考文档中的 [`toolchain` 指令](/ref/mod/#go-mod-file-toolchain)。

### 语法 {#toolchain-syntax}

<pre>toolchain <var>工具链名称</var></pre>

<dl>
    <dt>工具链名称</dt>
    <dd>建议的 Go 工具链的名称。标准工具链名称采用 <code>go<i>V</i></code> 的形式，其中 <i>V</i> 是 Go 版本，如 <code>go1.21.0</code> 和 <code>go1.18rc1</code>。特殊值 <code>default</code> 会禁用自动工具链切换。</dd>
</dl>

### 示例 {#toolchain-examples}

* 建议使用 Go 1.21.0 或更新版本：
     ```go.mod
     toolchain go1.21.0
     ``````
    toolchain go1.21.0
    ```### 注意事项 {#toolchain-notes}

参阅《[Go 工具链](/doc/toolchain)》了解 `toolchain` 配置行如何影响 Go 工具链选择。

## godebug {#godebug}

指定应用于本模块主包的默认 [GODEBUG](/doc/godebug) 设置。
这些设置会覆盖工具链的默认值，同时也会被主包中显式的 `//go:debug` 注释行覆盖。

### 语法 {#godebug-syntax}

<pre>godebug <var>debug-key</var>=<var>debug-value</var></pre>

<dl>
    <dt>debug-key</dt>
    <dd>要应用的设置项名称。
      设置项列表及其引入版本可在 <a href="/doc/godebug#history">GODEBUG 版本历史</a> 中查看。
    </dd>
    <dt>debug-value</dt>
    <dd>为该设置项提供的值。
      若无特别说明，<code>0</code> 表示禁用，<code>1</code> 表示启用指定行为。</dd>
</dl>

### 示例 {#godebug-examples}

* 启用 1.23 版本中新的 `asynctimerchan=0` 行为：```
  godebug asynctimerchan=0
  ```*   使用 Go 1.21 版本的默认 GODEBUG 设置，但保留旧的 `panicnil=1` 行为：```
  godebug (
      default=go1.21
      panicnil=1
  )
  ```### 注意事项 {#godebug-notes}

GODEBUG 设置仅适用于当前模块中主包和测试二进制文件的构建。
当模块作为依赖项使用时，这些设置不会生效。

有关向后兼容性的详细信息，请参阅"[Go、向后兼容性与 GODEBUG](/doc/godebug)"。

## require {#require}

声明一个模块为当前模块的依赖项，并指定所需的最低版本。

更多信息请参阅 Go 模块参考中的 [`require` 指令](/ref/mod#go-mod-file-require)。

### 语法 {#require-syntax}

<pre>require <var>模块路径</var> <var>模块版本</var></pre>

<dl>
    <dt>模块路径</dt>
    <dd>模块的路径，通常是模块源代码的仓库域名与模块名称的组合。对于 v2 及更高版本的模块，此值必须以主版本号结尾，例如 <code>/v2</code>。</dd>
    <dt>模块版本</dt>
    <dd>模块的版本。可以是发布版本号（例如 v1.2.3），也可以是 Go 工具生成的伪版本号（例如 v0.0.0-20200921210052-fa0125251cc4）。</dd>
</dl>

### 示例 {#require-examples}

* 要求发布版本 v1.2.3：```
    require example.com/othermodule v1.2.3
    ```* 通过使用Go工具生成的伪版本号来引用仓库中尚未打标签的版本：
   （保留原文格式及术语一致性）```
    require example.com/othermodule v0.0.0-20200921210052-fa0125251cc4
    ```### 注意事项 {#require-notes}

当您运行类似 `go get` 的 `go` 命令时，Go 会为每个包含已导入包的模块插入 `require` 指令。若模块尚未在其仓库中标注版本标签，Go 会在您运行命令时生成一个伪版本号。

您可以通过使用 [`replace` 指令](#replace) 使 Go 从非其代码仓库的其他位置引入模块。

关于版本号的更多信息，请参阅 [模块版本编号](/doc/modules/version-numbers)。

关于依赖项管理的更多信息，请参阅以下内容：

* [添加依赖项](/doc/modules/managing-dependencies#adding_dependency)
* [获取特定依赖版本](/doc/modules/managing-dependencies#getting_version)
* [发现可用更新](/doc/modules/managing-dependencies#discovering_updates)
* [升级或降级依赖项](/doc/modules/managing-dependencies#upgrading)
* [同步代码的依赖项](/doc/modules/managing-dependencies#synchronizing)

## tool {#tool}

将一个包添加为当前模块的依赖项，并使该包在当前工作目录位于此模块内时，可通过 `go tool` 命令运行。

### 语法 {#tool-syntax}

<pre>tool <var>package-path</var></pre>

<dl>
    <dt>package-path</dt>
    <dd>工具的包路径，由包含该工具的模块路径与该模块内实现该工具的（可能为空）包路径组合而成。</dd>
</dl>

### 示例 {#tool-examples}

* 声明一个在当前模块中实现的工具：```
    module example.com/mymodule

    tool example.com/mymodule/cmd/mytool
    ```* 声明一个在独立模块中实现的工具：```
    module example.com/mymodule

    tool example.com/atool/cmd/atool

    require example.com/atool v1.2.3
    ```### 注意事项 {#tool-notes}

您可以使用 `go tool` 通过完整的包路径运行模块中声明的工具，或者在无歧义的情况下，通过路径的最后一段来运行。在上面的第一个示例中，您可以运行 `go tool mytool` 或 `go tool example.com/mymodule/cmd/mytool`。

在工作区模式下，您可以使用 `go tool` 运行任何工作区模块中声明的工具。

工具的构建使用与模块本身相同的模块图。需要使用 [`require` 指令](#require) 来选择实现该工具的模块版本。任何 [`replace` 指令](#replace) 或 [`exclude` 指令](#exclude) 同样适用于该工具及其依赖项。

更多信息请参阅 [工具依赖项](/doc/modules/managing-dependencies#tools)。

## replace {#replace}

将特定版本（或所有版本）的模块内容替换为另一个模块版本或本地目录。Go 工具在解析依赖项时将使用替换路径。

更多详情，请参阅 Go 模块参考中的 [`replace` 指令](/ref/mod#go-mod-file-replace)。

### 语法 {#replace-syntax}

<pre>replace <var>module-path</var> <var>[module-version]</var> => <var>replacement-path</var> <var>[replacement-version]</var></pre>

<dl>
    <dt>module-path</dt>
    <dd>要替换的模块的模块路径。</dd>
    <dt>module-version</dt>
    <dd>可选。要替换的特定版本。如果省略此版本号，则该模块的所有版本都将被箭头右侧的内容替换。</dd>
    <dt>replacement-path</dt>
    <dd>Go 应查找所需模块的路径。这可以是一个模块路径，也可以是替换模块本地文件系统上的目录路径。如果这是模块路径，您必须指定 <em>replacement-version</em> 值。如果这是本地路径，则不能使用 <em>replacement-version</em> 值。</dd>
    <dt>replacement-version</dt>
    <dd>替换模块的版本。只有当 <em>replacement-path</em> 是模块路径（而不是本地目录）时，才能指定替换版本。</dd>
</dl>

### 示例 {#replace-examples}

* 使用模块仓库的分支进行替换

  在以下示例中，example.com/othermodule 的任何版本都将被其代码的指定分支替换。```
  require example.com/othermodule v1.2.3

  replace example.com/othermodule => example.com/myfork/othermodule v1.2.3-fixed
  ```当您将一个模块路径替换为另一个时，不要修改被替换模块中各个包的 import 语句。

如需了解更多关于使用模块代码分支复制品的信息，请参阅[从您自己的仓库分支要求外部模块代码](/doc/modules/managing-dependencies#external_fork)。

* 使用不同的版本号进行替换

  以下示例指定应使用版本 v1.2.3 代替该模块的任何其他版本。```
  require example.com/othermodule v1.2.2

  replace example.com/othermodule => example.com/othermodule v1.2.3
  ```以下示例将模块版本 v1.2.5 替换为同一模块的 v1.2.3 版本。```
  replace example.com/othermodule v1.2.5 => example.com/othermodule v1.2.3
  ```* 使用本地代码替换

  以下示例指定应使用本地目录替换该模块的所有版本。```
  require example.com/othermodule v1.2.3

  replace example.com/othermodule => ../othermodule
  ```以下示例指定仅对 v1.2.5 版本使用本地目录进行替代。```
  require example.com/othermodule v1.2.5

  replace example.com/othermodule v1.2.5 => ../othermodule
  ```如需了解使用模块代码本地副本的更多信息，请参阅[在本地目录中要求模块代码](/doc/modules/managing-dependencies#local_directory)。

### 注意事项 {#replace-notes}

使用 `replace` 指令可以在需要时临时将模块路径值替换为其他值，引导 Go 工具链使用该路径查找模块源代码。这会将 Go 的模块搜索重定向到替换位置，而无需修改包导入路径即可使用替换路径。

构建当前模块时，可使用 `exclude` 和 `replace` 指令控制构建时的依赖解析。这些指令在依赖当前模块的其他模块中会被忽略。

`replace` 指令适用于以下场景：

* 您正在开发尚未入库的新模块，希望使用本地版本与客户端进行测试。
* 您发现某个依赖存在问题，已克隆该依赖的代码库，并使用本地仓库测试修复方案。

请注意，单独使用 `replace` 指令并不会将模块添加到[模块图](/ref/mod#glos-module-graph)中。还需要在主模块的 `go.mod` 文件或依赖的 `go.mod` 文件中使用指向被替换模块版本的 [`require` 指令](#require)。如果没有特定版本需要替换，可以采用如下示例中的虚拟版本。但需注意，这会导致依赖您模块的项目构建失败，因为 `replace` 指令仅作用于主模块。```
require example.com/mod v0.0.0-replace

replace example.com/mod v0.0.0-replace => ./mod
```更多关于替换所需模块的信息，包括如何使用Go工具进行更改，请参见：

* [从您自己的代码仓库分叉中引入外部模块代码](/doc/modules/managing-dependencies#external_fork)
* [引入本地目录中的模块代码](/doc/modules/managing-dependencies#local_directory)

更多关于版本号的信息，请参阅[模块版本编号](/doc/modules/version-numbers)。

## exclude {#exclude}

指定要从当前模块的依赖图中排除的模块或模块版本。

更多信息，请参阅Go Modules参考文档中的 [`exclude` 指令](/ref/mod#go-mod-file-exclude)。

### 语法 {#exclude-syntax}

<pre>exclude <var>module-path</var> <var>module-version</var></pre>

<dl>
    <dt>module-path</dt>
    <dd>要排除的模块路径。</dd>
    <dt>module-version</dt>
    <dd>要排除的特定版本。</dd>
</dl>

### 示例 {#exclude-example}

* 排除 example.com/theirmodule 的 v1.3.0 版本```
  exclude example.com/theirmodule v1.3.0
  ```### 注意事项 {#exclude-notes}

使用 `exclude` 指令可以排除一个因某些原因无法加载的间接依赖模块的特定版本。例如，你可以用它来排除某个校验和无效的模块版本。

当构建当前模块（即你正在构建的主模块）时，可以使用 `exclude` 和 `replace` 指令来控制构建时的依赖解析。这些指令在依赖于当前模块的其他模块中会被忽略。

你可以使用 [`go mod edit`](/ref/mod#go-mod-edit) 命令来排除模块，示例如下。```
go mod edit -exclude=example.com/theirmodule@v1.3.0
```有关版本号的更多信息，请参阅
[模块版本编号](/doc/modules/version-numbers)。

## 撤回 {#retract}

表示 `go.mod` 文件定义的模块的某个版本或某个版本范围不应被依赖。当某个版本被过早发布，或在版本发布后发现严重问题时，`retract` 指令非常有用。

更多信息，请参阅 Go 模块参考文档中的 [`retract` 指令](/ref/mod#go-mod-file-retract)。

### 语法 {#retract-syntax}

<pre>
retract <var>version</var> // <var>rationale</var>
retract [<var>version-low</var>,<var>version-high</var>] // <var>rationale</var>
</pre>

<dl>
  <dt>version</dt>
  <dd>要撤回的单个版本。</dd>
  <dt>version-low</dt>
  <dd>要撤回的版本范围的下限。</dd>
  <dt>version-high</dt>
  <dd>
    要撤回的版本范围的上限。<var>version-low</var> 和 <var>version-high</var> 均包含在该范围内。
  </dd>
  <dt>rationale</dt>
  <dd>
    可选的注释，解释撤回的原因。可能会显示给用户。
  </dd>
</dl>

### 示例 {#retract-example}

* 撤回单个版本```
  retract v1.1.0 // 误发布。
  ```* 撤回一个版本范围
  ```go
  retract v1.0.0 // v1.0.0 至 v1.0.5 存在漏洞。
  retract [v1.0.0, v1.1.0]
  ``````
  retract [v1.0.0,v1.0.5] // 在某些平台上构建失败。
  ```### 注意事项 {#retract-notes}

使用 `retract` 指令表示不应使用您模块的早期版本。用户使用 `go get`、`go mod tidy` 或其他命令时不会自动升级到已撤回的版本。用户执行 `go list -m -u` 时也不会将已撤回的版本显示为可用更新。

已撤回的版本应保持可用状态，以便依赖这些版本的用户能够构建其包。即使某个已撤回的版本从源代码仓库中删除，它可能仍可通过镜像站点（如 [proxy.golang.org](https://proxy.golang.org)）访问。当依赖已撤回版本的用户对相关模块执行 `go get` 或 `go list -m -u` 时，可能会收到相应通知。

`go` 命令通过读取模块最新版本中 `go.mod` 文件里的 `retract` 指令来识别已撤回的版本。最新版本的判定优先级如下：

1.  若有发行版本，则取其最高发行版本
2.  若无发行版本但有预发行版本，则取其最高预发行版本
3.  以上皆无时，则取仓库默认分支顶端对应的伪版本

当您添加撤回声明时，几乎总是需要标记一个更高的新版本，以确保命令能在模块最新版本中看到该撤回指令。

您可以发布一个专为传达撤回信息而存在的版本。在这种情况下，新版本也可以撤回其自身。

例如，如果您意外标记了 `v1.0.0`，可以通过以下指令标记 `v1.0.1`：

```go
retract v1.0.0 // 误发布。
``````go
retract v1.0.0 // 误发布。
retract v1.0.1 // 仅包含撤回信息。
```遗憾的是，一旦版本发布后便无法更改。若后续在另一提交点标记 `v1.0.0`，`go` 命令可能检测到 `go.sum` 或[校验和数据库](/ref/mod#checksum-database)中的哈希值不匹配。

模块的撤回版本通常不会出现在 `go list -m -versions` 命令的输出中，但可通过添加 `-retracted` 参数显示。更多信息请参阅 Go 模块参考文档中的 [`go list -m`](/ref/mod#go-list-m) 章节。

## ignore {#ignore}

指定模块中应被 `go` 命令忽略的目录路径，在匹配包模式时生效。

更多信息请参阅 Go 模块参考文档中的 [`ignore` 指令](/ref/mod#go-mod-file-ignore)章节。

### 语法 {#ignore-syntax}

<pre>
ignore <var>路径</var>
</pre>

<dl>
  <dt>路径</dt>
  <dd>
    需忽略的斜杠分隔路径。若以 <code>./</code> 开头，则相对于模块根目录解析；否则将忽略模块内任意深度下匹配该名称的目录。
  </dd>
</dl>

### 示例 {#ignore-examples}

* 忽略相对于模块根目录的本地目录```
  ignore ./node_modules
  ```* 忽略模块中所有名为 `generated` 的目录```
  ignore generated
  ```* 使用代码块忽略多个路径```
  ignore (
      static
      content/html
      ./third_party/javascript
  )
  ```### 注意事项 {#ignore-notes}

使用 `ignore` 指令可以防止 `go` 命令在应用 `./...` 等通配符模式时匹配到生成目录或非 Go 目录中的包。被忽略的目录及其内容将从包模式中排除，但仍保留在模块文件树中。

`ignore` 指令仅在主模块的 `go.mod` 文件中生效。它对依赖项的 `go.mod` 文件没有影响。