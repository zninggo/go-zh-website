<!--{
  "Title": "弃用 'go get' 安装可执行文件",
  "Path": "/doc/go-get-install-deprecation",
  "Breadcrumb": true
}-->

## 概述

从 Go 1.17 开始，使用 `go get` 安装可执行文件的方式已被弃用。
可以改用 `go install`。

在 Go 1.18 中，`go get` 将不再构建包；它将只用于在 `go.mod` 中添加、更新或删除依赖项。具体来说，`go get` 将始终表现得如同启用了 `-d` 标志。

## 替代方案

要在当前模块的上下文中安装可执行文件，请使用 `go install`（不带版本后缀），如下所示。这将应用当前目录或父目录中 `go.mod` 文件的版本要求和其他指令。

要安装可执行文件并忽略当前模块，请使用带版本后缀（如 `@v1.2.3` 或 `@latest`）的 `go install`，如下所示。当与版本后缀一起使用时，`go install` 不会读取或更新当前目录或父目录中的 `go.mod` 文件。

```bash
go install example.com/cmd@v1.2.3
```

欲了解更多信息，请参阅[使用版本后缀安装](/ref/mod#version-queries)。```
go install example.com/cmd
```要安装可执行文件并忽略当前模块，请使用 `go install` *配合* [版本后缀](/ref/mod#version-queries)（如 `@v1.2.3` 或 `@latest`），如下所示。当与版本后缀一起使用时，`go install` 不会读取或更新当前目录或父目录中的 `go.mod` 文件。```
# Install a specific version.
go install example.com/cmd@v1.2.3

# Install the highest available version.
go install example.com/cmd@latest
```为避免歧义，当 `go install` 与版本后缀一起使用时，所有参数必须指向同一模块（module）中相同版本的 `main` 包。如果该模块包含 `go.mod` 文件，则其中不得包含 `replace` 或 `exclude` 等指令，否则会导致其被解释为主模块时产生不同的解析结果。该模块的 `vendor` 目录不会被使用。

详见 [`go install`](/ref/mod#go-install)。

## 发生此变化的原因

自引入模块以来，`go get` 命令一直被同时用于更新 `go.mod` 中的依赖项以及安装命令。这种混合用途经常令人困惑且不便：在大多数情况下，开发者希望更新依赖项或安装命令，而非同时进行这两项操作。

自 Go 1.16 起，`go install` 可以在命令行指定的版本安装命令，同时忽略当前目录中的 `go.mod` 文件（如果存在）。现在，大多数情况下应使用 `go install` 来安装命令。

`go get` 构建和安装命令的功能现已被弃用，因为该功能与 `go install` 存在冗余。移除此功能将使 `go get` 更快，因为它默认不再编译或链接包。`go get` 在更新无法为当前平台构建的包时，也不会再报告错误。

完整讨论详见提案 [#40276](/issue/40276)。