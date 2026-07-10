<!--{
  "Title": "教程：使用 VS Code Go 查找和修复有漏洞的依赖项",
  "Breadcrumb": true
}-->

[返回 Go 安全性](/security)

你可以直接在编辑器内使用 Go 扩展 for Visual Studio Code 来扫描代码中的漏洞。

注意：关于下方图片中包含的漏洞修复说明，请参见 [govulncheck 教程](/doc/tutorial/govulncheck)。

## 前提条件：

- **Go.** 我们建议使用最新版本的 Go 来跟随本教程。有关安装说明，请参见 [安装 Go](/doc/install)。
- **VS Code**，已更新至最新版本。[在此处下载](https://code.visualstudio.com/)。你也可以使用 Vim（详情参见[此处](/security/vuln/editor#editor-specific-instructions)），但本教程重点介绍 VS Code Go。
- **VS Code Go 扩展**，可以[在此处下载](https://marketplace.visualstudio.com/items?itemName=golang.go)。
- **编辑器特定设置更改。** 在能够重现下方结果之前，你需要根据[这些规范](/security/vuln/editor#editor-specific-instructions)修改你的 IDE 设置。

## 如何使用 VS Code Go 扫描漏洞

**步骤 1.** 运行 “Go: Toggle Vulncheck”

[Toggle Vulncheck](https://github.com/golang/vscode-go/wiki/Commands#go-toggle-vulncheck) 命令会显示你模块中列出的所有依赖项的漏洞分析。要使用此命令，请在你的 IDE 中打开[命令面板](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)（在 Linux/Windows 上按 Ctrl+Shift+P，或在 Mac OS 上按 Cmd+Shift+P），然后运行 “Go: Toggle Vulncheck”。在你的 go.mod 文件中，你将看到代码中直接和间接使用的有漏洞依赖项的诊断信息。

<div class="image">
  <center>
    <img style="width: 100%" width="2110" height="952" src="editor_tutorial_1.png" alt="运行 Toggle Vulncheck"></img>
  </center>
</div>

注意：要在你自己的编辑器上重现本教程，请将下面的代码复制到你的 main.go 文件中。// 这个程序接收命令行参数中的语言标签并进行解析。

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
}接下来，请确保程序对应的go.mod文件内容如下所示：```
module module1

go 1.18

require golang.org/x/text v0.3.5
```现在，运行 `go mod tidy` 以确保你的 `go.sum` 文件已更新。

**步骤 2.** 通过代码操作运行 govulncheck。

使用代码操作运行 govulncheck 可以让你专注于代码中实际调用的依赖项。VS Code 中的代码操作以灯泡图标标识；将鼠标悬停在相关依赖项上可以查看关于漏洞的信息，然后选择“快速修复”以显示一个选项菜单。从中选择“运行 govulncheck 进行验证”。这将在你的终端中返回相关的 govulncheck 输出。

<div class="image">
  <center>
    <img style="width: 100%" width="2110" height="952" src="editor_tutorial_2.png" alt="govulncheck 代码操作"></img>
  </center>
</div>

<div class="image">
  <center>
    <img style="width: 100%" width="2110" height="952" src="editor_tutorial_3.png" alt="VS Code Go 扩展的 govulncheck 输出"></img>
  </center>
</div>

**步骤 3.** 将鼠标悬停在 `go.mod` 文件中列出的依赖项上。

通过将鼠标悬停在 `go.mod` 文件中的依赖项上，也可以找到关于特定依赖项的相关 govulncheck 输出。若要快速查看依赖项信息，此选项比使用代码操作更为高效。

<div class="image">
  <center>
    <img style="width: 100%" width="2110" height="952" src="editor_tutorial_4.png" alt="悬停在依赖项上以查看漏洞信息"></img>
  </center>
</div>

**步骤 4.** 升级到依赖项的“已修复版本”。

代码操作也可用于快速升级到你的依赖项中已修复该漏洞的版本。通过选择代码操作下拉菜单中的“升级”选项即可完成此操作。

<div class="image">
  <center>
    <img style="width: 100%" width="2110" height="952" src="editor_tutorial_5.png" alt="通过代码操作菜单升级到最新版本"></img>
  </center>
</div>

## 其他资源

- 请参阅[此页面](/security/vuln/editor)以获取有关在 IDE 中进行漏洞扫描的更多信息。特别是[注意事项和警告部分](/security/vuln/editor#notes-and-caveats)，讨论了漏洞扫描可能比上述示例更复杂的特殊情况。
- [Go 漏洞数据库](https://pkg.go.dev/vuln/)包含来自许多现有来源的信息，以及 Go 包维护者直接向 Go 安全团队提交的报告。
- 请参阅 [Go 漏洞管理](/security/vuln/)页面，该页面提供了 Go 用于检测、报告和管理漏洞的架构的高级视图。