<!--{
  "Title": "组织Go模块"
}-->

Go语言开发者经常提出的一个常见问题是“如何组织我的Go项目？”，具体涉及文件和文件夹的布局。本文档的目标是提供一些指南来帮助解答这个问题。要充分利用本文档，请确保您已经通过阅读[教程](/doc/tutorial/create-module)和[管理模块源码](/doc/modules/managing-source)熟悉Go模块的基础知识。

Go项目可以包括包、命令行程序或两者的结合。本指南按项目类型进行组织。

### 基本包

一个基本的Go包将其所有代码放在项目的根目录中。项目由单个模块组成，而该模块由单个包组成。包名与模块名的最后一个路径组件匹配。对于只需要单个Go文件的简单包，项目结构为：```
project-root-directory/
  go.mod
  modname.go
  modname_test.go
```_[在整个文档中，文件/包名完全是任意的]_

假设此目录已上传到位于 `github.com/someuser/modname` 的GitHub仓库，则 `go.mod` 文件中的 `module` 行应写作：
```
module github.com/someuser/modname
```

`modname.go` 中的代码使用以下内容声明包：```
package modname

// 此处为包的代码
```用户随后可以在他们的 Go 代码中通过 `import` 语句来导入此包并使用它：```
import "github.com/someuser/modname"
```一个Go包可以分割到多个文件中，且所有文件位于同一目录下，例如：```
project-root-directory/
  go.mod
  modname.go
  modname_test.go
  auth.go
  auth_test.go
  hash.go
  hash_test.go
```该目录中的所有文件均声明 `package modname`。

### 基本命令

一个基础的可执行程序（或命令行工具）根据其复杂度和代码规模来组织结构。最简单的程序可以只包含一个定义了 `func main` 的Go文件。较大的程序可以将代码分布到多个文件中，但所有文件都需声明 `package main`：```
project-root-directory/
  go.mod
  auth.go
  auth_test.go
  client.go
  main.go
```这里 `main.go` 文件包含 `func main`，但这只是一种惯例。主文件也可以命名为 `modname.go`（其中 `modname` 为合适的名称）或其他任意名称。

假设此目录已上传到 GitHub 仓库 `github.com/someuser/modname`，那么 `go.mod` 文件中的 `module` 行应填写为：

```go
module github.com/someuser/modname
``````
module github.com/someuser/modname
```用户应该能够通过以下方式将其安装到自己的机器上：```
$ go install github.com/someuser/modname@latest
```### 带有支持包的包或命令

对于较大型的包或命令，将部分功能拆分到支持包中可能会更有益。最初建议将这类包放置在名为 `internal` 的目录中；[这样可以防止](https://pkg.go.dev/cmd/go#hdr-Internal_Directories)其他模块依赖那些我们不一定希望对外暴露和支持外部使用的包。由于其他项目无法从我们的 `internal` 目录导入代码，我们可以自由地重构其 API 并整体移动内容，而不会影响外部用户。因此，一个包的项目结构如下所示：```
project-root-directory/
  internal/
    auth/
      auth.go
      auth_test.go
    hash/
      hash.go
      hash_test.go
  go.mod
  modname.go
  modname_test.go
```文件 `modname.go` 声明为 `package modname`，`auth.go` 声明为 `package auth`，以此类推。`modname.go` 可以通过以下方式导入 `auth` 包：```
import "github.com/someuser/modname/internal/auth"
```包含 `internal` 目录的命令式布局结构非常相似，只是根目录下的文件声明为 `package main`。

### 多包结构

一个模块可以包含多个可导入的包；每个包拥有自己的目录，并且可以层级化组织。以下是一个示例项目结构：```
project-root-directory/
  go.mod
  modname.go
  modname_test.go
  auth/
    auth.go
    auth_test.go
    token/
      token.go
      token_test.go
  hash/
    hash.go
  internal/
    trace/
      trace.go
```提醒一下，我们假设 `go.mod` 文件中的 `module` 行内容为：```
module github.com/someuser/modname
````modname` 包位于根目录中，声明为 `package modname`，用户可通过以下方式导入：```
import "github.com/someuser/modname"
```用户可以通过以下方式导入子包：```
import "github.com/someuser/modname/auth"
import "github.com/someuser/modname/auth/token"
import "github.com/someuser/modname/hash"
````internal/trace` 包中的 `trace` 包无法在该模块外部导入。建议尽可能将包保留在 `internal` 目录中。

### 多个命令

同一仓库中的多个程序通常具有独立的目录结构：```
project-root-directory/
  go.mod
  internal/
    ... shared internal packages
  prog1/
    main.go
  prog2/
    main.go
```在每个目录中，程序的Go文件都声明`package main`。顶层的`internal`目录可以包含该仓库中所有命令共享的包。

用户可以通过以下方式安装这些程序：```
$ go install github.com/someuser/modname/prog1@latest
$ go install github.com/someuser/modname/prog2@latest
```常见的惯例是将仓库中所有命令都放置在 `cmd` 目录下；虽然在仅包含命令的仓库中这并非严格必要，但在同时包含命令和可导入包的混合仓库中（我们将在下文中讨论）则非常实用。

### 同一仓库中的包与命令

有时一个仓库会同时提供可导入的包和具有相关功能的可安装命令。以下是这类仓库的示例项目结构：```
project-root-directory/
  go.mod
  modname.go
  modname_test.go
  auth/
    auth.go
    auth_test.go
  internal/
    ... internal packages
  cmd/
    prog1/
      main.go
    prog2/
      main.go
```假设此模块名为 `github.com/someuser/modname`，现在用户既可以从该模块中

导入包：```
import "github.com/someuser/modname"
import "github.com/someuser/modname/auth"
```并从中安装程序：```
$ go install github.com/someuser/modname/cmd/prog1@latest
$ go install github.com/someuser/modname/cmd/prog2@latest
```### 服务器项目

Go 是实现*服务器*的常用语言选择。鉴于服务器开发涉及众多方面——例如协议（REST？gRPC？）、部署方式、前端文件、容器化、脚本等——这类项目的结构存在巨大差异。本指南将重点聚焦于项目中用 Go 编写的部分。

服务器项目通常不会包含可导出的包（packages for export），因为服务器一般是自包含的二进制文件（或一组二进制文件）。因此，建议将实现服务器逻辑的 Go 包放在 `internal` 目录下。此外，由于项目很可能包含许多存放非 Go 文件的目录，将所有 Go 命令统一放在 `cmd` 目录中是一个不错的选择：```
project-root-directory/
  go.mod
  internal/
    auth/
      ...
    metrics/
      ...
    model/
      ...
  cmd/
    api-server/
      main.go
    metrics-analyzer/
      main.go
    ...
  ... the project's other directories with non-Go code
```如果服务器项目中逐渐形成的包对其他项目也变得可复用，最佳做法是将它们拆分成独立的模块。