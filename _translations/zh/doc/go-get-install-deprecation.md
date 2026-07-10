<!--{
  "Title": "废弃使用 'go get' 安装可执行文件",
  "Path": "/doc/go-get-install-deprecation",
  "Breadcrumb": true
}-->

## 概述

从 Go 1.17 开始，使用 `go get` 安装可执行文件已被废弃。
可以转而使用 `go install`。

在 Go 1.18 中，`go get` 将不再构建包；它将仅用于在 `go.mod` 文件中添加、更新或删除依赖项。具体而言，`go get` 的行为将始终等同于启用了 `-d` 标志。

## 替代用法

要在当前模块的上下文中安装可执行文件，请使用不带版本后缀的 `go install`，如下所示。这将应用当前目录或父目录中 `go.mod` 文件的版本要求和其他指令。```
go install example.com/cmd
```要在忽略当前模块上下文的情况下安装可执行文件，请使用带有[版本后缀](/ref/mod#version-queries)的 `go install` 命令，例如 `@v1.2.3` 或 `@latest`，如下所示。当配合版本后缀使用时，`go install` 将不会读取或更新当前目录或父目录中的 `go.mod` 文件。```
# Install a specific version.
go install example.com/cmd@v1.2.3

# Install the highest available version.
go install example.com/cmd@latest
```为避免歧义，当 `go install` 与版本后缀配合使用时，所有参数必须指向同一模块中相同版本的 `main` 包。如果该模块包含 `go.mod` 文件，则其中不得包含 `replace` 或 `exclude` 等指令，否则将其视为主模块时会导致解析差异。该模块的 `vendor` 目录也不会被使用。

详情请参阅 [`go install`](/ref/mod#go-install)。

## 变更原因

自模块功能引入以来，`go get` 命令既用于更新 `go.mod` 中的依赖，也用于安装命令。这种双重功能常常令人困惑且不便：大多数情况下，开发者只需更新依赖或安装命令，而非同时进行。

自 Go 1.16 起，`go install` 可以在命令行指定版本安装命令，同时忽略当前目录下的 `go.mod` 文件（如果存在）。在大多数场景中，现在应使用 `go install` 来安装命令。

`go get` 构建和安装命令的功能现已弃用，因为该功能与 `go install` 存在冗余。移除此功能将使 `go get` 更快执行，因为它默认不会编译或链接软件包。同时，当更新的软件包无法在当前平台构建时，`go get` 也不会再报告错误。

完整讨论请参阅提案 [#40276](/issue/40276)。