<!--{
  "Title": "弃用 'go get' 安装可执行文件",
  "Path": "/doc/go-get-install-deprecation",
  "Breadcrumb": true
}-->

## 概述

自 Go 1.17 起，使用 `go get` 安装可执行文件的方式已被弃用。
建议改用 `go install`。

在 Go 1.18 中，`go get` 将不再用于构建软件包；它将仅用于在 `go.mod` 文件中添加、更新或移除依赖项。具体来说，`go get` 的行为将始终等同于启用了 `-d` 标志。

## 替代方案

若要在当前模块环境中安装可执行文件，请使用不带版本后缀的 `go install`，如下所示。这会应用当前目录或父级目录中 `go.mod` 文件内的版本要求及其他指令。```
go install example.com/cmd
```要安装可执行文件同时忽略当前模块，请使用带 [版本后缀](/ref/mod#version-queries)（如 `@v1.2.3` 或 `@latest`）的 `go install` 命令，如下所示。当使用带版本后缀时，`go install` 不会读取或更新当前目录或父级目录中的 `go.mod` 文件。```
# Install a specific version.
go install example.com/cmd@v1.2.3

# Install the highest available version.
go install example.com/cmd@latest
```为避免歧义，当 `go install` 与版本后缀一起使用时，所有参数必须引用同一模块中相同版本的 `main` 包。如果该模块包含 `go.mod` 文件，则该文件不得包含 `replace` 或 `exclude` 等指令，否则在作为主模块时会导致不同的解释。模块的 `vendor` 目录不会被使用。

详见 [`go install`](/ref/mod#go-install)。

## 此变更的原因

自引入模块机制以来，`go get` 命令既用于更新 `go.mod` 中的依赖项，也用于安装命令。这种组合经常令人困惑且不便：在大多数情况下，开发者希望更新依赖项或安装命令，而不是同时进行两者。

自 Go 1.16 起，`go install` 可以在命令行指定版本安装命令，同时忽略当前目录中的 `go.mod` 文件（如果存在）。现在，在大多数情况下应使用 `go install` 来安装命令。

`go get` 构建和安装命令的功能现已弃用，因为该功能与 `go install` 重复。移除此功能将使 `go get` 更快，因为它默认不会编译或链接包。此外，当更新的包无法为当前平台构建时，`go get` 也不会报错。

完整讨论请参见提案 [#40276](/issue/40276)。