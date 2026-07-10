<!--{
  "Title": "管理模块源码"
}-->

在开发用于发布供他人使用的模块时，遵循本主题中描述的仓库惯例，可以帮助确保您的模块更易于其他开发者使用。

本主题描述了在管理模块仓库时可能需要采取的操作。关于从一个版本修订到另一个版本的工作流程步骤序列信息，请参阅[模块发布与版本管理流程](release-workflow)。

此处描述的部分惯例是模块必须遵循的，而其他一些则是最佳实践。本内容假设您已熟悉[管理依赖项](/doc/modules/managing-dependencies)中描述的基本模块使用实践。

Go 支持以下仓库用于发布模块：Git、Subversion、Mercurial、Bazaar 和 Fossil。

有关模块开发的概述，请参阅[开发和发布模块](developing)。

## Go 工具如何找到您发布的模块 {#tools}

在 Go 用于发布模块并检索其代码的去中心化系统中，您可以在发布模块的同时将代码保留在您的仓库中。Go 工具依赖于仓库路径和仓库标签来指示模块的名称和版本号的命名规则。当您的仓库遵循这些要求时，您的模块代码就可以通过 [`go get` 命令](/ref/mod#go-get) 等 Go 工具从您的仓库下载。

当开发者使用 `go get` 命令获取其代码导入的包的源代码时，该命令会执行以下操作：

1. 从 Go 源代码中的 `import` 语句，`go get` 识别包路径内的模块路径。
1. 使用从模块路径派生的 URL，该命令在模块代理服务器或其仓库上直接定位模块源代码。
1. 通过将模块的版本号与仓库标签进行匹配来定位要下载的模块版本源码，以发现仓库中的代码。当要使用的版本号尚未确定时，`go get` 会定位最新的发布版本。
1. 检索模块源代码并将其下载到开发者的本地模块缓存中。

## 组织仓库中的代码 {#repository}

遵循此处描述的惯例，您可以保持维护简单，并改善开发者使用您的体验。将您的模块代码放入仓库通常与其他代码一样简单。

下图展示了一个包含两个包的简单模块的源代码层次结构。

<img src="images/source-hierarchy.png"
     alt="展示模块源代码层次结构的示意图"
     style="width: 250px;" />

您的初始提交应包含下表列出的文件：

<table id="module-files" class="DocTable">
  <thead>
    <tr class="DocTable-head">
      <th class="DocTable-cell" width="20%">文件</td>
      <th class="DocTable-cell">描述</th>
    </tr>
  </thead>
  <tbody>
    <tr class="DocTable-row">
      <td class="DocTable-cell">LICENSE</td>
      <td class="DocTable-cell">模块的许可证。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">go.mod</td>
      <td class="DocTable-cell"><p>描述模块，包括其模块路径（实质上是其名称）及其依赖项。更多信息请参阅 <a href="gomod-ref">go.mod 参考文档</a>。</p>
      <p>模块路径将在模块指令中给出，例如：</p>
      <pre>module example.com/mymodule</pre>
      <p>关于如何选择模块路径的更多信息，请参阅 <a href="/doc/modules/managing-dependencies#naming_module">管理依赖项</a>。</p>
      <p>虽然您可以编辑 go.mod 文件，但您会发现通过 <code>go</code> 命令进行更改更可靠。</p>
      </td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">go.sum</td>
      <td class="DocTable-cell"><p>包含代表模块依赖项的加密哈希值。Go 工具使用这些哈希值来验证下载的模块，尝试确认下载的模块是真实的。如果此确认失败，Go 将显示安全错误。</p>
      <p>当没有依赖项时，该文件为空或不存在。除了使用 <code>go mod tidy</code> 命令（用于删除不需要的条目）外，您不应编辑此文件。</p>
      </td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">包目录和 .go 源文件</td>
      <td class="DocTable-cell">包含模块中 Go 包和源代码的目录及 .go 文件。</td>
    </tr>
  </tbody>
</table>

您可以通过命令行创建一个空仓库，添加将成为初始提交一部分的文件，并进行带有消息的提交。以下是使用 git 的示例：```
$ git init
$ git add --all
$ git commit -m "mycode: initial commit"
$ git push
```## 选择仓库范围 {#repository-scope}

当代码需要与其他模块中的代码进行独立版本控制时，您可以在一个模块中发布代码。

将仓库设计为在根目录托管单个模块，将有助于简化维护工作，尤其是在您持续发布新的次版本和补丁版本、创建新主版本分支等过程中。然而，如果您的需求允许，您也可以在单个仓库中维护多个模块的集合。

### 每个仓库管理单一模块的源码 {#one-module-source}

您可以维护一个仅包含单一模块源码的仓库。在这种模式下，您将 `go.mod` 文件放置在仓库根目录，并在其下方的子目录中包含 Go 源代码的包。

这是最简单的方法，可能使您的模块在长期维护中更加便捷。它帮助您避免在模块版本号前添加目录路径前缀。

<img src="images/single-module.png"
     alt="展示单个仓库中单一模块源码的示意图"
     style="width: 425px;" />

### 在单个仓库中管理多个模块的源码 {#multiple-module-source}

您可以从单个仓库发布多个模块。例如，您可能在一个仓库中拥有构成多个模块的代码，但希望对这些模块进行独立的版本控制。

每个作为模块根目录的子目录都必须拥有其自己的 `go.mod` 文件。

在子目录中管理模块源码会改变发布模块时所需使用的版本标签格式。您必须在版本标签的版本号部分前，加上作为模块根目录的子目录名称。有关版本号的更多信息，请参阅[模块版本编号](/doc/modules/version-numbers)。

例如，对于下面的模块 `example.com/mymodules/module1`，版本 v1.2.3 的相关信息如下：

*   模块路径：`example.com/mymodules/module1`
*   版本标签：`module1/v1.2.3`
*   用户导入的包路径：`example.com/mymodules/module1/package1`
*   用户 `require` 指令中指定的模块路径和版本：`example.com/mymodules/module1 v1.2.3`

<img src="images/multiple-modules.png"
     alt="展示单个仓库中两个模块的示意图"
     style="width: 480px;" />