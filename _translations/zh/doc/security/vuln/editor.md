---
title: IDE 中的漏洞扫描
layout: article
---

[返回 Go 语言安全](/security)

集成了 [Go 语言服务器](https://pkg.go.dev/golang.org/x/tools/cmd/gopls)的编辑器，例如 [VS Code 配合 Go 扩展](https://marketplace.visualstudio.com/items?itemName=golang.go)，能够检测您依赖项中的漏洞。

依赖项漏洞检测主要有两种模式。两种模式都基于 [Go 漏洞数据库](https://vuln.go.dev)，并互为补充。

*   基于导入的分析：在此模式下，编辑器通过扫描工作区中导入的包集来报告漏洞，并将结果作为诊断信息显示在 `go.mod` 文件中。这种方式速度很快，但如果您的代码导入了包含有漏洞符号的包，而实际含有漏洞的函数又未被执行，则可能报告误报。此模式可通过设置 `gopls` 的 [`"vulncheck": "Imports"`](https://github.com/golang/tools/blob/master/gopls/doc/settings.md#vulncheck-enum) 来启用。
*   `Govulncheck` 分析：这是基于 [`govulncheck`](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) 命令行工具，该工具已内嵌于 `gopls` 中。它提供了一种低噪音、可靠的方法来确认您的代码是否实际调用了有漏洞的函数。由于此分析计算成本较高，必须通过“运行 govulncheck 进行验证”代码操作（与基于导入的分析生成的诊断报告关联）或使用 `go.mod` 文件上的 [`"codelenses.run_govulncheck"`](https://github.com/golang/tools/blob/master/gopls/doc/settings.md#run-govulncheck) 代码镜头手动触发。

<div style="text-align: center;"><img src="vscode.gif" alt="漏洞检查">

<em>Go: 切换漏洞检查</em> <a
href="https://user-images.githubusercontent.com/4999471/206977512-a821107d-9ffb-4456-9b27-6a6a4f900ba6.mp4">(vulncheck.mp4)</a>
</div>

这些功能在 `gopls` v0.11.0 或更新版本中可用。请在 [go.dev/s/vsc-vulncheck-feedback](/s/vsc-vulncheck-feedback) 分享您的反馈。

## 编辑器具体说明

### VS Code

[Go 扩展](https://marketplace.visualstudio.com/items?itemName=golang.go)提供了与 gopls 的集成。需要以下设置来启用漏洞扫描功能：```json
"go.diagnostic.vulncheck": "Imports", // 默认启用基于导入的分析。
"gopls": {
  "ui.codelenses": {
    "run_govulncheck": true  // 在go.mod文件上显示"运行govulncheck"的代码镜头。
  }
}
```["切换漏洞检查"](https://github.com/golang/vscode-go/wiki/Commands#go-toggle-vulncheck) 命令可用于在当前工作区中开启或关闭基于导入的分析。

### Vim/NeoVim

使用 [coc.nvim](https://www.vim.org/scripts/script.php?script_id=5779) 时，以下设置将启用基于导入的分析。```
{
    "codeLens.enable": true,
    "languageserver": {
        "go": {
            "command": "gopls",
            ...
            "initializationOptions": {
                "vulncheck": "Imports",
            }
        }
    }
}
```## 注意事项与警告

- 此扩展不会扫描私有包，也不会发送任何关于私有模块的信息。所有分析都通过从Go漏洞数据库拉取已知漏洞模块列表，并在本地计算交集完成。
- 基于导入的分析使用工作区模块中的包列表，如果使用了 `go.work` 或模块 `replace`/`exclude` 配置，该列表可能与您在 `go.mod` 文件中看到的内容不同。
- 随着您修改代码或Go漏洞数据库更新，govulncheck 的分析结果可能会变得陈旧。要手动使分析结果失效，请使用 `go.mod` 文件顶部显示的 `"重置 go.mod 诊断"` 代码透镜。否则，结果将在一小时后自动失效。
- 这些功能目前不会报告标准库或工具链中的漏洞。我们仍在研究如何在用户界面中展示这些发现以及如何帮助用户处理这些问题。