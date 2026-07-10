<!--{
  "Title": "教程：使用govulncheck查找并修复存在漏洞的依赖项",
  "HideTOC": true,
  "Breadcrumb": true
}-->

Govulncheck是一款低噪声工具，可帮助您查找并修复Go项目中存在漏洞的依赖项。它通过扫描项目依赖项中的已知漏洞，并识别代码中对这些漏洞的任何直接或间接调用来实现这一功能。

在本教程中，您将学习如何使用govulncheck扫描一个简单程序是否存在漏洞。同时，您还将学习如何对漏洞进行优先级排序和评估，以便优先修复最重要的问题。

要了解更多关于govulncheck的信息，请参阅[govulncheck文档](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)，以及这篇关于Go语言[漏洞管理的博客文章](/blog/vuln)。我们也期待[收到您的反馈](/s/govulncheck-feedback)。

## 前置条件

- **Go语言**：建议使用最新版本的Go来跟随本教程操作（安装说明请参阅[安装Go](/doc/install)）。
- **代码编辑器**：您拥有的任何编辑器均可正常使用。
- **命令终端**：在Linux和Mac系统上，Go与任何终端都能良好协作；在Windows系统上，可使用PowerShell或cmd。

本教程将引导您完成以下步骤：

1. 创建一个包含漏洞依赖项的Go示例模块
2. 安装并运行govulncheck
3. 评估漏洞
4. 升级存在漏洞的依赖项

## 创建一个包含漏洞依赖项的Go示例模块

**步骤1：** 首先，创建一个名为`vuln-tutorial`的新文件夹，并初始化Go模块（如果您不熟悉Go模块，请查看[go.dev/doc/tutorial/create-module](/doc/tutorial/create-module)）。

例如，在您的主目录下运行以下命令：```
$ mkdir vuln-tutorial
$ cd vuln-tutorial
$ go mod init vuln.tutorial
```**步骤2.** 在`vuln-tutorial`文件夹中创建一个名为`main.go`的文件，并将以下代码复制到其中：```
package main

import (
        "fmt"
        "os"

        "golang.org/x/text/language"
)

func main() {
        for _, arg := range os.Args[1:] {
                tag, err := language.Parse(arg)
                if err != nil {
                        fmt.Printf("%s: error: %v\n", arg, err)
                } else if tag == language.Und {
                        fmt.Printf("%s: undefined\n", arg)
                } else {
                        fmt.Printf("%s: tag %s\n", arg, tag)
                }
        }
}
```本示例程序接收一系列语言标签作为命令行参数，并为每个标签输出解析结果：成功解析、标签未定义或解析过程中出现错误。

**步骤 3.** 运行 `go mod tidy`，该命令将填充 `go.mod` 文件，添加上一步在 `main.go` 中新增代码所需的所有依赖项。

从 `vuln-tutorial` 文件夹中运行：```
$ go mod tidy
```你应该会看到以下输出：```
go: finding module for package golang.org/x/text/language
go: downloading golang.org/x/text v0.9.0
go: found golang.org/x/text/language in golang.org/x/text v0.9.0
```**步骤 4.** 打开你的 `go.mod` 文件以验证其内容如下：```
module vuln.tutorial

go 1.20

require golang.org/x/text v0.9.0
```**步骤 5.** 将 `golang.org/x/text` 的版本降级到 v0.3.5，该版本包含已知漏洞。运行：```
$ go get golang.org/x/text@v0.3.5
```你应该会看到这样的输出：```
go: downgraded golang.org/x/text v0.9.0 => v0.3.5
````go.mod` 文件的内容现在应显示为：```
module vuln.tutorial

go 1.20

require golang.org/x/text v0.3.5
```现在，让我们看看 govulncheck 的实际应用。

## 安装并运行 govulncheck

**第六步.** 使用 `go install` 命令安装 govulncheck：```
$ go install golang.org/x/vuln/cmd/govulncheck@latest
```**第七步.** 在您希望分析的文件夹中（本例为 `vuln-tutorial`）。运行以下命令：```
$ govulncheck ./...
```您应该会看到如下输出：```
govulncheck 是一个实验性工具。请在 https://go.dev/s/govulncheck-feedback 提供反馈。

使用 go1.20.3 和 govulncheck@v0.0.0，漏洞数据来自 https://vuln.go.dev （最后修改时间 2023-04-18 21:32:26 +0000 UTC）。

正在扫描您的代码及 1 个相关模块中的 46 个包，以查找已知漏洞...
您的代码受到来自 1 个模块的 1 个漏洞影响。

漏洞 #1: GO-2021-0113
  由于索引计算不当，格式错误的语言标签可能导致 Parse 函数通过越界读取引发 panic。
  如果 Parse 用于处理不受信任的用户输入，这可能被用作拒绝服务攻击的途径。

  更多信息: https://pkg.go.dev/vuln/GO-2021-0113

  模块: golang.org/x/text
    发现于: golang.org/x/text@v0.3.5
    修复于: golang.org/x/text@v0.3.7

    您代码中的调用栈:
      main.go:12:29: vuln.tutorial.main 调用了 golang.org/x/text/language.Parse

=== 信息性提示 ===

在您导入的包中发现了 1 个漏洞，但没有指向使用此漏洞的调用栈。
您可能无需采取任何行动。详情请参阅 https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck。

漏洞 #1: GO-2022-1059
  攻击者可能通过构造一个需要 ParseAcceptLanguage 花费大量时间解析的 Accept-Language 头部来导致拒绝服务。
  更多信息: https://pkg.go.dev/vuln/GO-2022-1059
  发现于: golang.org/x/text@v0.3.5
  修复于: golang.org/x/text@v0.3.8
```### 解读输出结果

<font size="2">  *注意：若您未使用最新版本的 Go，您可能会发现标准库中存在额外的漏洞。 </font>

我们的代码受到一个漏洞的影响，即 [GO-2021-0113](https://pkg.go.dev/vuln/GO-2021-0113)，因为它在存在漏洞的版本 (v0.3.5) 中直接调用了 `golang.org/x/text/language` 包的 `Parse` 函数。

另一个漏洞 [GO-2022-1059](https://pkg.go.dev/vuln/GO-2022-1059) 存在于 `golang.org/x/text` 模块的 v0.3.5 版本中。然而，它被报告为“信息性”漏洞，因为我们的代码从未（直接或间接）调用其任何存在漏洞的函数。

现在，让我们评估这些漏洞并决定采取的措施。

### 评估漏洞

a. 评估漏洞。

首先，阅读漏洞描述，并判断它是否确实适用于您的代码和使用场景。如需更多信息，请访问“更多信息”链接。

根据描述，漏洞 GO-2021-0113 在使用 `Parse` 函数处理不可信的用户输入时可能导致 panic（恐慌）。假设我们的程序预期能承受不可信输入，并且我们关注拒绝服务问题，因此该漏洞很可能适用。

GO-2022-1059 很可能不会影响我们的代码，因为我们的代码没有调用该报告中列出的任何存在漏洞的函数。

b. 决定采取的行动。

为了缓解 GO-2021-0113，我们有几个选项：
- **选项 1：升级到已修复的版本。** 如果存在可用的修复版本，我们可以通过升级到该模块的已修复版本来移除存在漏洞的依赖项。
- **选项 2：停止使用存在漏洞的符号。** 我们可以选择移除代码中所有对该漏洞函数的调用。这需要我们找到替代方案或自行实现。

在本例中，存在可用的修复版本，并且 `Parse` 函数是我们程序不可或缺的部分。让我们将依赖项升级到“于...版本修复”中的版本 v0.3.7。

我们决定降低修复信息性漏洞 GO-2022-1059 的优先级，但由于它与 GO-2021-0113 在同一个模块中，并且其修复版本是 v0.3.8，我们可以通过升级到 v0.3.8 轻松地同时移除这两个漏洞。

## 升级存在漏洞的依赖项

幸运的是，升级存在漏洞的依赖项非常简单。

**步骤 8.** 将 `golang.org/x/text` 升级到 v0.3.8：```
$ go get golang.org/x/text@v0.3.8
```你应该会看到类似以下输出：```
go: upgraded golang.org/x/text v0.3.5 => v0.3.8
```（请注意，我们也可以选择升级到 `latest` 版本，或 v0.3.8 之后的任何其他版本。）

**步骤 9.** 现在再次运行 govulncheck：```
$ govulncheck ./...
```您将看到如下输出：govulncheck 是一个实验性工具。欢迎通过 https://go.dev/s/govulncheck-feedback 分享反馈意见。

使用 go1.20.3 和 govulncheck@v0.0.0
漏洞数据来源：https://vuln.go.dev（最后更新于 2023-04-06 19:19:26 +0000 UTC）

正在扫描您的代码及 1 个依赖模块中的 46 个包，检查已知漏洞...
未发现漏洞。最终，govulncheck 确认未发现任何漏洞。

通过定期使用 `govulncheck` 命令扫描依赖项，您可以识别、优先处理并修复漏洞，从而保护代码库的安全。