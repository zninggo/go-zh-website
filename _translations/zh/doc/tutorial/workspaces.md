<!--{
  "Title": "教程：多模块工作区入门",
  "Breadcrumb": true
}-->

本教程介绍 Go 语言中多模块工作区的基础知识。通过多模块工作区，你可以告知 Go 命令你正在同时编写多个模块中的代码，并能轻松地在这些模块中构建和运行代码。

在本教程中，你将在一个共享的多模块工作区中创建两个模块，跨模块进行修改，并在构建中查看这些修改的结果。

<!-- 待办目录 -->

**注意：** 其他教程请参见 [教程列表](/doc/tutorial/index.html)。

## 前提条件

*   **安装 Go 1.18 或更高版本。**
*   **用于编写代码的工具。** 任何文本编辑器均可。
*   **命令行终端。** Go 在 Linux 和 Mac 的任何终端，以及 Windows 的 PowerShell 或 cmd 中均能良好运行。

本教程要求使用 go1.18 或更高版本。请确保你通过 [go.dev/dl](/dl) 提供的链接安装了 Go 1.18 或更高版本。

## 为你的代码创建一个模块 {#create_folder}

首先，为你将要编写的代码创建一个模块。

1.  打开命令提示符，切换到你的主目录。

    在 Linux 或 Mac 上：```
    $ cd
    ```在 Windows 上：```
    C:\> cd %HOMEPATH%
    ```本教程的其余部分将以 `$` 作为命令提示符。您使用的命令在 Windows 系统中同样适用。

2. 从命令提示符开始，为您的代码创建一个名为 `workspace` 的目录。```
    $ mkdir workspace
    $ cd workspace
    ```3.  初始化模块

   我们的示例将创建一个新模块 `hello`，该模块将依赖于 golang.org/x/example 模块。

   创建 hello 模块：```
   $ mkdir hello
   $ cd hello
   $ go mod init example.com/hello
   go: creating new go.mod: module example.com/hello
   ```通过 `go get` 添加对 golang.org/x/example/hello/reverse 包的依赖。```
   $ go get golang.org/x/example/hello/reverse
   ```在hello目录下创建hello.go文件，内容如下：```
   package main

   import (
       "fmt"

       "golang.org/x/example/hello/reverse"
   )

   func main() {
       fmt.Println(reverse.String("Hello"))
   }
   ```现在，运行hello程序：```
   $ go run .
   olleH
   ```## 创建工作空间

在本步骤中，我们将创建一个 `go.work` 文件来指定包含模块的工作空间。

#### 初始化工作空间

在 `workspace` 目录下，运行：```
   $ go work init ./hello
   ````go work init` 命令用于创建包含 `./hello` 目录中模块的工作空间，它会生成一个 `go.work` 文件。

该命令生成的 `go.work` 文件内容如下：

    go work init ./hello```
   go 1.18

   use ./hello
   ````go.work` 文件的语法与 `go.mod` 类似。

`go` 指令告知 Go 语言应使用哪个版本的 Go 来解释该文件。这类似于 `go.mod` 文件中的 `go` 指令。

`use` 指令则告知 Go 语言，在执行构建时，`hello` 目录中的模块应作为主模块。

因此，在 `workspace` 的任何子目录中，该模块都将处于活动状态。

#### 在工作空间目录中运行程序

在 `workspace` 目录中，运行：```
   $ go run ./hello
   olleH
   ```Go 命令会将工作空间中的所有模块视为主模块。这使得我们可以在模块之外引用该模块中的包。若在模块或工作空间之外运行 `go run` 命令将会报错，因为 `go` 命令无法确定应使用哪些模块。

接下来，我们将 `golang.org/x/example/hello` 模块的本地副本添加到工作空间中。该模块存储在 `go.googlesource.com/example` Git 仓库的子目录中。随后我们将为 `reverse` 包添加一个新函数，以替代原有的 `String` 函数。

## 下载并修改 `golang.org/x/example/hello` 模块

   在此步骤中，我们将下载包含 `golang.org/x/example/hello` 模块的 Git 仓库副本，将其添加到工作空间，然后为其添加新函数以供 hello 程序调用。

1. 克隆仓库

   在工作空间目录中，运行 `git` 命令克隆仓库：```
   $ git clone https://go.googlesource.com/example
   正在克隆到 'example'...
   remote: 共计 165（差异 27），复用 165（差异 27）
   接收对象中: 100% (165/165), 434.18 KiB | 1022.00 KiB/s, 完成.
   处理差异中: 100% (27/27), 完成.
   ```2. 将模块添加到工作空间

   Git 仓库刚刚被签出到 `./example` 目录。
   `golang.org/x/example/hello` 模块的源码位于 `./example/hello` 目录。
   将其添加到工作空间：```
   $ go work use ./example/hello
   ````go work use` 命令会向 go.work 文件中添加一个新模块。执行后的文件内容将如下所示：```
   go 1.18

   use (
       ./hello
       ./example/hello
   )
   ```现在工作区包含了 `example.com/hello` 模块和 `golang.org/x/example/hello` 模块，后者提供了 `golang.org/x/example/hello/reverse` 包。

这将使我们能够使用自己编写的 `reverse` 包中的新代码，而不是我们通过 `go get` 命令下载到模块缓存中的包版本。

3. 添加新函数

我们将为 `golang.org/x/example/hello/reverse` 包添加一个用于反转数字的新函数。

在 `workspace/example/hello/reverse` 目录下创建一个名为 `int.go` 的新文件，内容如下：```go
   package reverse

   import "strconv"

   // Int 返回整数 i 的十进制反转结果。
   func Int(i int) int {
       i, _ = strconv.Atoi(String(strconv.Itoa(i)))
       return i
   }
   ```4. 修改 hello 程序以使用该函数。

   修改 `workspace/hello/hello.go` 文件的内容，使其包含以下内容：

    ```go
    package main

    import (
        "fmt"

        "golang.org/x/example/hello/reverse"
    )

    func main() {
        fmt.Println(reverse.String("Hello"))
        fmt.Println(reverse.Int(24601))
    }
    ``````
   package main

   import (
       "fmt"

       "golang.org/x/example/hello/reverse"
   )

   func main() {
       fmt.Println(reverse.String("Hello"), reverse.Int(24601))
   }
   ```#### 在工作区中运行代码

从工作区目录，运行```
   $ go run ./hello
   olleH 10642
   ```Go 命令会在 `go.work` 文件指定的 `hello` 目录中找到命令行中指定的 `example.com/hello` 模块，同样地，它会使用 `go.work` 文件来解析 `golang.org/x/example/hello/reverse` 这个导入包。

`go.work` 可以替代在模块中添加 [`replace`](/ref/mod#go-mod-file-replace) 指令的方式，用于跨多个模块进行开发。

由于这两个模块处于同一个工作区中，因此在一个模块中进行修改并立即在另一个模块中使用变得非常便捷。

#### 后续步骤

现在，为了正确发布这些模块，我们需要为 `golang.org/x/example/hello` 模块创建一个版本，例如 `v0.1.0`。这通常是通过在模块的版本控制仓库中对提交进行标记来完成的。有关更多详情，请参阅[模块发布流程文档](/doc/modules/release-workflow)。一旦发布完成，我们就可以更新 `hello/go.mod` 文件中对 `golang.org/x/example/hello` 模块的版本要求：```
   cd hello
   go get golang.org/x/example/hello@v0.1.0
   ```这样，`go` 命令才能正确解析工作区外部的模块。

## 了解工作区的更多信息

除了本教程前面介绍的 `go work init` 外，`go` 命令还提供了一些用于管理的工作区的子命令：

- `go work use [-r] [dir]`：若目录存在，则向 `go.work` 文件中添加该目录的 `use` 指令；若参数目录不存在，则移除对应的 `use` 指令。`-r` 标志会递归检查 `dir` 的子目录。
- `go work edit`：其编辑 `go.work` 文件的方式与 `go mod edit` 类似。
- `go work sync`：将工作区构建列表中的依赖项同步到每个工作区模块中。

有关工作区及 `go.work` 文件的更多细节，请参阅 Go 模块参考文档中的 [工作区](/ref/mod#workspaces) 章节。