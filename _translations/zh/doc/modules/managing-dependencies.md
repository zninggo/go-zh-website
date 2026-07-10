<!--{
  "Title": "依赖管理"
}-->

当你的代码使用外部包时，这些包（以模块形式分发）就成为了依赖项。随着时间的推移，你可能需要升级或替换它们。Go 提供了依赖管理工具，帮助你在引入外部依赖的同时，确保 Go 应用程序的安全性。

本主题描述了如何执行各种任务来管理你代码中引入的依赖项。你可以使用 Go 工具来完成大部分操作。本主题还介绍了其他一些你可能会发现有用的、与依赖相关的任务。

**另请参阅**

*   如果你是初次接触以模块形式管理的依赖项，请查看[入门教程](/doc/tutorial/getting-started)获取简要介绍。
*   使用 `go` 命令管理依赖项有助于确保你的需求保持一致，并且你的 go.mod 文件内容有效。关于这些命令的参考，请参阅 [Command go](/cmd/go/)。你也可以通过在命令行输入 `go help` _命令名称_ 来获取帮助，例如 `go help mod tidy`。
*   你用于更改依赖项的 Go 命令会编辑你的 go.mod 文件。有关该文件内容的更多信息，请参阅 [go.mod 文件参考](/doc/modules/gomod-ref)。
*   让你的编辑器或 IDE 感知 Go 模块可以使管理它们的工作变得更加轻松。有关支持 Go 的编辑器的更多信息，请参阅[编辑器插件和 IDE](/doc/editors.html)。
*   本主题不描述如何开发、发布和管理供他人使用的模块版本。有关更多信息，请参阅[开发和发布模块](developing)。

## 使用和管理工作流程 {#workflow}

你可以使用 Go 工具获取和使用有用的包。在 [pkg.go.dev](https://pkg.go.dev) 上，你可以搜索可能有用的包，然后使用 `go` 命令将这些包导入到你自己的代码中以调用它们的函数。

以下列出了最常见的依赖管理步骤。有关每一步的更多详细信息，请参见本主题中的相关章节。

1.  在 [pkg.go.dev](https://pkg.go.dev) 上[查找有用的包](#locating_packages)。
2.  在你的代码中[导入所需的包](#locating_packages)。
3.  将你的代码添加到一个模块中以便进行依赖跟踪（如果它尚未在模块中）。请参阅[启用依赖跟踪](#enable_tracking)。
4.  [将外部包添加为依赖项](#adding_dependency)以便进行管理。
5.  根据需要，随着时间的推移[升级或降级依赖版本](#upgrading)。

## 以模块形式管理依赖 {#modules}

在 Go 中，你将依赖项作为模块来管理，这些模块包含了你导入的包。此过程由以下部分支持：

*   一个**用于发布模块和获取其代码的分布式系统**。开发者可以从自己的代码仓库中使其模块可供其他开发者使用，并使用版本号进行发布。
*   一个**包搜索引擎**和文档浏览器（pkg.go.dev），你可以在此查找模块。请参阅[查找和导入有用的包](#locating_packages)。
*   一个模块**版本编号约定**，帮助你理解模块的稳定性和向后兼容性保证。请参阅[模块版本编号](version-numbers)。
*   **Go 工具**使你可以更轻松地管理依赖项，包括获取模块源代码、升级等。更多信息请参阅本主题的各个章节。

## 查找和导入有用的包 {#locating_packages}

你可以搜索 [pkg.go.dev](https://pkg.go.dev) 来查找可能有用的包含特定函数的包。

当你找到想在代码中使用的包后，在页面顶部找到包路径，然后点击“Copy path”按钮将路径复制到剪贴板。在你自己的代码中，将路径粘贴到一条 import 语句中，如以下示例所示：```
import "rsc.io/quote"
```在代码导入该包后，你需要启用依赖跟踪并获取该包的代码以便编译。更多信息请参阅[在代码中启用依赖跟踪](#enable_tracking)和[添加依赖项](#adding_dependency)。

## 在代码中启用依赖跟踪 {#enable_tracking}

要跟踪和管理你添加的依赖项，首先需要将你的代码放在独立的模块中。这会在源代码树的根目录下创建一个 `go.mod` 文件。你添加的依赖项将列在此文件中。

要将你的代码添加到独立模块中，请使用 [`go mod init` 命令](/ref/mod#go-mod-init)。例如，在命令行中，切换到代码的根目录，然后按照以下示例运行命令：```
$ go mod init example/mymodule
````go mod init` 命令的参数是你的模块路径。如果可能，该模块路径应设置为源代码的仓库位置。

如果最初不知道模块的最终仓库位置，可以使用一个安全的替代路径。这可以是你拥有的域名或可控制的名称（例如公司名称），后面接模块名称或源码目录相关的路径。更多信息请参见[命名模块](#naming_module)。

使用 Go 工具管理依赖项时，工具会更新 `go.mod` 文件，使其维护当前的依赖项列表。

添加依赖项时，Go 工具还会创建一个 `go.sum` 文件，其中包含所依赖模块的校验和。Go 使用此文件验证已下载模块文件的完整性，这对项目中的其他开发者尤为重要。

请将 `go.mod` 和 `go.sum` 文件与你的代码一起包含在版本库中。

更多详细信息请参阅 [go.mod 参考文档](/doc/modules/gomod-ref)。

## 命名模块 {#naming_module}

运行 `go mod init` 创建用于跟踪依赖项的模块时，需要指定一个作为模块名称的模块路径。该模块路径将成为模块内所有包的导入路径前缀。请确保指定的模块路径不会与其他模块的路径冲突。

模块路径至少需要表明其来源信息，如公司、作者或所有者名称。但路径也可以更具体地描述模块的功能或用途。

模块路径通常采用以下形式：```
<prefix>/<descriptive-text>
```* _前缀_ 通常是一个部分描述模块的字符串，例如描述其来源的字符串。这可能是：
    *   Go工具可以找到模块源代码的存储库位置（如果要发布模块则必须提供）。
        例如，可能是 `github.com/<project-name>/`。
        如果您认为可能会发布模块供他人使用，建议采用此最佳实践。关于发布的更多信息，请参阅[开发与发布模块](/doc/modules/developing)。
    *   您控制的名称。
        如果不使用存储库名称，请务必选择一个您确信不会被他人使用的前缀。一个不错的选择是使用您的公司名称。避免使用通用术语，如 `widgets`、`utilities` 或 `app`。

* 对于_描述性文本_，一个不错的选择是项目名称。请记住，包名称承担了描述功能的主要任务。模块路径为这些包名称创建了一个命名空间。

**保留的模块路径前缀**

Go保证以下字符串不会被用作包名。

- `test` -- 您可以将 `test` 用作模块路径前缀，用于其代码旨在本地测试另一个模块中函数的模块。
    将 `test` 路径前缀用于作为测试一部分创建的模块。例如，您的测试本身可能运行 `go mod init test`，然后以某种特定方式设置该模块，以便使用Go源代码分析工具进行测试。

- `example` -- 在某些Go文档中用作模块路径前缀，例如在教程中，您创建模块仅用于跟踪依赖项。
    请注意，Go文档还使用 `example.com` 来说明当示例可能是已发布的模块时的情况。

## 添加依赖项 {#adding_dependency}

一旦您开始从已发布的模块导入包，您就可以使用 [`go get` 命令](/cmd/go/#hdr-Add_dependencies_to_current_module_and_install_them)添加该模块以进行依赖管理。

该命令执行以下操作：

*   如有必要，它会将 `require` 指令添加到您的 `go.mod` 文件中，以跟踪构建命令行中指定的包所需的模块。`require` 指令跟踪您的模块所依赖的模块的最低版本。更多详情请参阅 [go.mod 参考文档](/doc/modules/gomod-ref)。
*   如有必要，它会下载模块源代码，以便您可以编译依赖于它们的包。它可以从模块代理（如 proxy.golang.org）或直接从版本控制存储库下载模块。源代码在本地缓存。

    您可以设置Go工具下载模块的位置。更多信息，请参阅[指定模块代理服务器](#proxy_server)。

以下是一些示例。

*   要为模块中的某个包添加所有依赖项，请运行类似下面的命令（"." 表示当前目录中的包）：
    ```sh
    go get .
    ``````
    $ go get .
    ```*   要添加特定依赖项，请将其模块路径作为参数提供给命令。```
    $ go get example.com/theirmodule
    ```该命令还会验证下载的每个模块，确保其自发布以来未被篡改。如果模块在发布后发生了更改——例如开发者修改了提交内容——Go工具将提示安全错误。此验证机制可保护您免受潜在被篡改模块的影响。

## 获取特定版本的依赖 {#getting_version}

您可以通过在 `go get` 命令中指定版本号来获取依赖模块的特定版本。该命令会更新您 go.mod 文件中的 `require` 指令（您也可以手动更新）。

以下场景可能需要指定版本：
*   希望尝试某个模块的特定预发布版本
*   发现当前要求的版本无法正常工作，需要切换到已知可靠的版本
*   需要对已引入的模块进行版本升级或降级

以下是使用 [`go get` 命令](/ref/mod#go-get)的示例：

*   要获取特定数字版本，请在模块路径后添加 @ 符号及目标版本号：```
    $ go get example.com/theirmodule@v1.3.4
    ```*   要获取最新版本，请在模块路径后附加 `@latest`：

    ```
    $ go get example.com/theirmodule@latest
    ``````
    $ go get example.com/theirmodule@latest
    ```以下 `go.mod` 文件中的 `require` 指令示例（更多详情请参阅 [go.mod 参考文档](/doc/modules/gomod-ref)）展示了如何要求特定版本号：```
require example.com/theirmodule v1.3.4
```## 发现可用更新 {#discovering_updates}

您可以检查当前模块中正在使用的依赖项是否有新版本。使用 `go list` 命令可显示模块依赖项列表，同时列出每个依赖项可用的最新版本。发现可用升级后，可以在代码中尝试这些新版本，以决定是否升级。

关于 `go list` 命令的更多信息，请参阅 [`go list -m`](/ref/mod#go-list-m)。

以下是几个示例。

*   列出当前模块的所有依赖模块，以及每个模块可用的最新版本：

     ```     ```     $ go list -m -versions example.com/theirmodule```     example.com/theirmodule v1.0.0 v1.1.0 v1.2.0 v1.3.0 v1.3.4 v2.0.0     ```     ```*   显示特定模块可用的最新版本：

     ```     ```     $ go list -m -versions example.com/theirmodule```     example.com/theirmodule v2.0.0     ```     ``````
    $ go list -m -u all
    ```*   显示特定模块可用的最新版本：```
    $ go list -m -u example.com/theirmodule
    ```## 升级或降级依赖项 {#upgrading}

你可以通过 Go 工具发现可用版本，然后添加不同版本作为依赖项，从而升级或降级依赖模块。

1. 要发现新版本，请使用 `go list` 命令，具体操作方法参见 [发现可用更新](#discovering_updates) 部分。

2. 要将特定版本添加为依赖项，请使用 `go get` 命令，具体操作方法参见 [获取特定依赖项版本](#getting_version) 部分。

## 同步代码的依赖项 {#synchronizing}

你可以确保为你代码中所有导入的包管理依赖项，同时移除不再导入的包的依赖项。

当你对代码和依赖项进行更改后，这会很有用——可能已产生一组不再完全匹配代码中导入包所需依赖项的已管理依赖项和已下载模块集合。

为保持已管理依赖项集合的整洁，请使用 `go mod tidy` 命令。该命令会根据你代码中导入的包集合，编辑 `go.mod` 文件以添加缺失的必要模块，并移除未提供任何相关包的未使用模块。

此命令除 `-v` 参数外无其他参数，该参数用于打印有关已移除模块的信息。```
$ go mod tidy
```## 针对未发布模块代码进行开发和测试 {#unpublished}

你可以指定你的代码使用那些可能尚未发布的依赖模块。这些模块的代码可能位于它们各自的代码仓库中、这些仓库的某个分支中，或是位于与消费它们的当前模块相同的驱动器上。

你可能希望在以下情况下这样做：

*   你希望对外部模块的代码进行自己的修改，例如在复制和/或克隆它之后。例如，你可能希望为该模块准备一个修复程序，然后将其作为合并请求发送给模块的开发者。
*   你正在构建一个新模块并且尚未发布它，因此在`go get`命令能够访问的仓库中无法找到它。

### 在本地目录中要求模块代码 {#local_directory}

你可以指定所需模块的代码与要求它的代码位于同一个本地驱动器上。你可能在以下情况下发现这很有用：

*   你正在开发自己独立的模块，并希望从当前模块进行测试。
*   你正在修复外部模块中的问题或为其添加功能，并希望从当前模块进行测试。（请注意，你也可以从你自己复制的仓库中要求外部模块。更多信息，请参阅[从你自己的仓库副本中要求外部模块代码](#external_fork)。）

要告知Go命令使用该模块代码的本地副本，请在你的go.mod文件中使用`replace`指令，将`require`指令中给出的模块路径替换掉。有关指令的更多信息，请参阅[go.mod参考文档](/doc/modules/gomod-ref)。

在下面的go.mod文件示例中，当前模块要求外部模块`example.com/theirmodule`，使用了一个不存在的版本号（`v0.0.0-unpublished`）以确保替换正确生效。然后，`replace`指令将原始模块路径替换为`../theirmodule`，这是一个与当前模块目录同级的目录。```
module example.com/mymodule

go 1.23.0

require example.com/theirmodule v0.0.0-unpublished

replace example.com/theirmodule v0.0.0-unpublished => ../theirmodule
```在设置 `require`/`replace` 指令对时，请使用
[`go mod edit`](/ref/mod#go-mod-edit) 和 [`go get`](/ref/mod#go-get) 命令，
以确保文件描述的依赖要求保持一致：```
$ go mod edit -replace=example.com/theirmodule@v0.0.0-unpublished=../theirmodule
$ go get example.com/theirmodule@v0.0.0-unpublished
```**注意：** 使用 `replace` 指令时，Go 工具不会按照[添加依赖项](#adding_dependency)中描述的方式对外部模块进行身份验证。

关于版本号的更多信息，请参阅[模块版本编号](/doc/modules/version-numbers)。

Go 1.18 为 Go 添加了[工作区模式](/blog/get-familiar-with-workspaces)，该模式允许你同时处理多个模块。请参阅[教程：开始使用多模块工作区](/doc/tutorial/workspaces)。

### 从您自己的仓库分叉中要求外部模块代码 {#external_fork}

当您分叉了某个外部模块的代码仓库（例如，为了修复该模块代码中的问题或添加功能），您可以指示 Go 工具使用您的分叉作为该模块的源代码。这在测试您自己代码的变更时可能很有用。（请注意，您也可以要求位于本地驱动器上的模块代码，与需要它的模块一起。更多详情，请参阅[要求本地目录中的模块代码](#local_directory)。）

您可以通过在 `go.mod` 文件中使用 `replace` 指令来实现此目的，将外部模块的原始模块路径替换为指向您仓库中分叉的路径。这会指示 Go 工具在编译（例如）时使用替换路径（即分叉的位置），同时允许您的 `import` 语句保持与原始模块路径一致，无需更改。

关于 `replace` 指令的更多信息，请参阅 [`go.mod` 文件参考](gomod-ref)。

在下面的 `go.mod` 文件示例中，当前模块要求外部模块 `example.com/theirmodule`。`replace` 指令随后将原始模块路径替换为 `example.com/myfork/theirmodule`，这是该模块自身代码仓库的一个分叉。```
module example.com/mymodule

go 1.23.0

require example.com/theirmodule v1.2.3

replace example.com/theirmodule v1.2.3 => example.com/myfork/theirmodule v1.2.3-fixed
```在设置 `require`/`replace` 指令组合时，请使用 Go 工具命令来确保文件中描述的要求保持一致。使用 [`go list`](/ref/mod#go-list-m) 命令获取当前模块正在使用的版本。然后使用 [`go mod edit`](/ref/mod#go-mod-edit) 命令将所需模块替换为分叉版本：

```bash
go mod edit -replace example.com/theirmodule@v1.2.3=example.com/myfork/theirmodule@v1.2.3-fixed
``````
$ go list -m example.com/theirmodule
example.com/theirmodule v1.2.3
$ go mod edit -replace=example.com/theirmodule@v1.2.3=example.com/myfork/theirmodule@v1.2.3-fixed
```**注意：** 使用 `replace` 指令时，Go 工具不会按照[添加依赖项](#adding_dependency)中所述的方式对外部模块进行身份验证。

有关版本号的更多信息，请参阅[模块版本编号](/doc/modules/version-numbers)。

## 使用仓库标识符获取特定提交 {#repo_identifier}

您可以使用 `go get` 命令从模块仓库中的特定提交获取未发布的代码。

具体操作时，您需要使用 `go get` 命令，并通过 `@` 符号指定所需的代码。当使用 `go get` 时，该命令会在您的 go.mod 文件中添加一个 `require` 指令，该指令会要求外部模块，并使用基于提交详情生成的伪版本号。

以下示例提供了一些说明。这些示例基于一个源代码托管在 git 仓库中的模块。

*   若要获取特定提交的模块，请附加 @<em>commithash</em> 形式：

    ```bash
    go get example.com/theirmodule@4cf701e
    ```

*   若要获取特定分支的模块，请附加 @<em>branchname</em> 形式：

    ```bash
    go get example.com/theirmodule@main
    ```

*   若要获取模块在特定日期的状态，请附加 @<em>date</em> 形式（格式为 `YYYYMMDD` 或 `YYYY-MM-DD`）：

    ```bash
    go get example.com/theirmodule@2023-01-01
    ```

当您使用 `go get` 从特定提交获取模块时，Go 工具会更新 `go.mod` 文件，将对 `example.com/theirmodule` 的要求更改为具有特定伪版本号的要求。例如：

```
require example.com/theirmodule v0.0.0-20230101120000-4cf701e
```

其中，`v0.0.0` 是基本版本，`20230101120000` 是时间戳，`4cf701e` 是提交哈希的前 12 位（小写）。```
    $ go get example.com/theirmodule@4cf76c2
    ```*   要获取特定分支的模块，请附加 `@<em>分支名称</em>` 形式：```
    $ go get example.com/theirmodule@bugfixes
    ```## 移除依赖 {#removing_dependency}

当您的代码不再使用某个模块中的任何包时，可以停止将该模块作为依赖项进行跟踪。

要停止跟踪所有未使用的模块，请运行 [`go mod tidy` 命令](/ref/mod#go-mod-tidy)。此命令还可能添加构建模块中包所需的缺失依赖项。```
$ go mod tidy
```要移除特定依赖项，请使用 [`go get` 命令](/ref/mod#go-get)，并指定模块的模块路径并附加 `@none`，如下例所示：```
$ go get example.com/theirmodule@none
````go get` 命令也会降级或移除其他依赖于该被移除模块的依赖项。

## 工具依赖 {#tools}

工具依赖允许您管理用 Go 编写的、在开发模块时使用的开发者工具。例如，您可能会使用 [`stringer`](https://pkg.go.dev/golang.org/x/tools/cmd/stringer) 配合 [`go generate`](/blog/generate)，或者在准备提交更改时使用特定的代码检查器或格式化程序。

在 Go 1.24 及更高版本中，您可以通过以下方式添加工具依赖：```
$ go get -tool golang.org/x/tools/cmd/stringer
```这将在您的 `go.mod` 文件中添加一个 [`tool` 指令](/ref/mod/#go-mod-file-tool)，并确保必要的 `require` 指令存在。添加该指令后，您可以通过将工具导入路径的最后[非主版本](/ref/mod#major-version-suffixes)组件传递给 `go tool` 来运行该工具：```
$ go tool stringer
```如果多个工具共享最后的路径片段，或者该路径片段与Go发行版附带的某个工具重名，您则需要传递完整的包路径：```
$ go tool golang.org/x/tools/cmd/stringer
```要查看当前所有可用工具的列表，请运行不带参数的 `go tool` 命令：```
$ go tool
```您可以手动向 `go.mod` 文件添加 `tool` 指令，但必须确保有对应的 `require` 指令来声明定义该工具的模块。添加缺失 `require` 指令的最简便方法是运行：```
$ go mod tidy
```为满足工具依赖项所需的行为，与模块图中的其他任何需求项类似。它们参与最小版本选择，并遵循 `require`、`replace` 和 `exclude` 指令。由于模块剪裁的存在，当您依赖一个本身具有工具依赖项的模块时，仅为满足该工具依赖项而存在的需求项通常不会成为您模块的需求项。

`tool` 元模式提供了一种同时对所有工具执行操作的方法。例如，您可以使用 `go get tool` 升级所有工具（等同于 `go get tool@upgrade`），或使用 `go install tool` 将所有工具安装到 $GOBIN 目录。

在 Go 1.24 之前的版本中，您可以通过在模块的 Go 文件中添加一个利用构建约束排除在构建之外的空白导入，来实现类似于 `tool` 指令的效果。这样做之后，您就可以使用带有完整包路径的 `go run` 命令来运行该工具。

## 指定模块代理服务器 {#proxy_server}

当您使用 Go 工具处理模块时，这些工具默认会从 proxy.golang.org（一个由 Google 运营的公共模块镜像）或直接从模块的代码仓库下载模块。您可以指定 Go 工具使用另一个代理服务器来下载和验证模块。

如果您（或您的团队）已搭建或选择了希望使用的其他模块代理服务器，您可能会想这样做。例如，有些人会搭建模块代理服务器，以便更好地控制依赖项的使用方式。

要指定 Go 工具使用的另一个模块代理服务器，请将 `GOPROXY` 环境变量设置为一个或多个服务器的 URL。Go 工具会按照您指定的顺序依次尝试每个 URL。默认情况下，`GOPROXY` 首先指定一个由 Google 运营的公共模块代理，然后再指定直接从模块仓库下载（依据其模块路径中的指定）：```
GOPROXY="https://proxy.golang.org,直连"
```有关 `GOPROXY` 环境变量的更多信息（包括支持其他行为的取值），请参阅 [`go` 命令参考文档](/cmd/go/#hdr-Module_downloading_and_verification)。

您可以将该变量设置为其他模块代理服务器的 URL，URL 之间使用逗号或管道符号分隔。

*   当您使用逗号时，Go 工具仅在当前 URL 返回 HTTP 404 或 410 错误时，才会尝试列表中的下一个 URL。```
    GOPROXY="https://[翻译: proxy.example.com,https://proxy2.example.com"]
    ```*   当您使用管道符号时，Go工具会尝试列表中的下一个URL，无论前一个URL返回何种HTTP错误代码。```    
GOPROXY="https://proxy.example.com|https://proxy2.example.com"
```Go模块通常在版本控制服务器和模块代理上进行开发与分发，这些服务在公共互联网上可能无法直接访问。您可以设置 `GOPRIVATE` 环境变量，配置 `go` 命令从私有源下载和构建模块。这样 `go` 命令就能从私有源获取并构建模块。

`GOPRIVATE` 或 `GONOPROXY` 环境变量可设置为匹配私有模块前缀的 glob 模式列表，这些模块不应向任何代理发起请求。例如：

```go
GOPRIVATE="*.corp.example.com,rsc.io/private"
```

此示例中，所有以 `corp.example.com` 结尾的模块路径（包括子域名如 `dev.corp.example.com`）以及 `rsc.io/private` 及其子路径均被视为私有模块。```
GOPRIVATE=*.corp.example.com,*.research.example.com
```