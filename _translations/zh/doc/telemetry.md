---
title: "Go 遥测"
layout: article
breadcrumb: true
date: 2024-02-07:00:00Z
template: true
---

<style>
.DocInfo {
  background-color: var(--color-background-info);
  padding: 1.5rem 2rem 1.5rem 4rem;
  border-left: 0.875rem solid var(--color-border);
  position: relative;
}
.DocInfo:before {
  content: "ⓘ";
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-size: 2rem;
}
</style>

目录：

 [背景](#background)\
 [概述](#overview)\
 [配置](#config)\
 [计数器](#counters)\
 [报告与上传](#reports)\
 [图表](#charts) \
 [遥测提案](#proposals)\
 [IDE 提示](#ide) \
 [常见问题](#faq)

## 背景 {#background}

Go 遥测是 Go 工具链程序收集其性能和使用情况数据的一种方式。这里的“Go 工具链”指的是由 Go 团队维护的开发者工具，包括 `go` 命令以及诸如 Go 语言服务器 [`gopls`] 或 Go 安全工具 [`govulncheck`] 等补充工具。Go 遥测仅适用于由 Go 团队维护的程序及其选定的依赖项，如 [Delve]。

默认情况下，遥测数据仅保存在本地计算机上，但用户可以选择将经批准的遥测数据子集上传至 [telemetry.go.dev]。上传的数据通过帮助我们了解使用情况和故障，有助于 Go 团队改进 Go 语言及其工具。

“遥测”一词在开源软件领域带有一些负面含义，很多情况下这是有道理的。然而，衡量用户体验是现代软件工程的重要组成部分，而像 GitHub 问题或年度调查这类数据源是粗略且滞后的指标，不足以解答 Go 团队需要回答的那类问题。Go 遥测旨在帮助工具链中的程序收集关于其可靠性、性能和使用的有用数据，同时保持用户对 Go 项目所期望的透明度和隐私保护。要了解更多关于遥测的设计过程和动机，请参阅[遥测博客文章](https://research.swtch.com/telemetry)。要了解更多关于遥测和隐私的信息，请参阅[遥测隐私政策](https://telemetry.go.dev/privacy)。

本页面详细解释了 Go 遥测的工作原理。如需常见问题的快速解答，请参阅[常见问题](#faq)。

<div class="DocInfo">
使用 Go 1.23 或更高版本，要<strong>选择加入</strong>将遥测数据上传给 Go 团队，请运行：
<pre>
go telemetry on
</pre>
要完全禁用遥测，包括本地收集，请运行：
<pre>
go telemetry off
</pre>
要恢复到仅本地遥测的默认模式，请运行：
<pre>
go telemetry local
</pre>
在 Go 1.23 之前，也可以通过 <code>golang.org/x/telemetry/cmd/gotelemetry</code> 命令执行此操作。更多详情请参阅<a href="#config">配置</a>。
</div>

## 概述 {#overview}

Go 遥测使用三种核心数据类型：

- [_计数器_](#counters) 是工具链程序中插桩的命名事件的轻量级计数。如果启用了收集（[模式](#config)为 **local** 或 **on**），计数器将写入本地文件系统中的内存映射文件。
- [_报告_](#reports) 是特定周计数器的聚合摘要。如果启用了上传（[模式](#config)为 **on**），[经批准的计数器](#proposals)的报告将被上传至 [telemetry.go.dev]，并在那里公开访问。
- [_图表_](#charts) 汇总了所有用户上传的报告。可以在 [telemetry.go.dev] 查看图表。

所有本地 Go 遥测数据和配置都存储在目录 <code>[os.UserConfigDir()](/pkg/os#UserConfigDir)/go/telemetry</code> 中。下文我们将该目录称为 `<gotelemetry>`。

下图说明了此数据流。

<div class="image">
  <center>
    <img max-width="800px" src="/doc/telemetry/dataflow.png" />
  </center>
</div>

在本文档的其余部分，我们将探讨此图的组成部分。但首先，让我们更多地了解控制它的配置。

## 配置 {#config}

Go 遥测的行为由一个值控制：遥测_模式_。`mode` 的可能值为 `local`（默认）、`on` 或 `off`：

- 当 `mode` 为 `local` 时，遥测数据会被收集并存储在本地计算机上，但绝不上传到远程服务器。
- 当 `mode` 为 `on` 时，数据会被收集，并可能根据[采样](#uploads)进行上传。
- 当 `mode` 为 `off` 时，数据既不收集也不上传。

使用 Go 1.23 或更高版本时，以下命令可与遥测模式交互：

- `go telemetry`：查看当前模式。
- `go telemetry on`：将模式设置为 `on`。
- `go telemetry off`：将模式设置为 `off`。
- `go telemetry local`：将模式设置为 `local`。

关于遥测配置的信息也可通过只读的 Go 环境变量获取：

- `go env GOTELEMETRY`：报告遥测模式。
- `go env GOTELEMETRYDIR`：报告存储遥测配置和数据的目录。

也可以使用 [`gotelemetry`](/pkg/golang.org/x/telemetry/cmd/gotelemetry) 命令来配置遥测模式，以及检查本地遥测数据。使用此命令来安装它：```
go install golang.org/x/telemetry/cmd/gotelemetry@latest
```关于 `gotelemetry` 命令行工具的完整使用信息，请参阅其[包文档](/pkg/golang.org/x/telemetry/cmd/gotelemetry)。

## 计数器 {#counters}

如上所述，Go 遥测通过 _计数器_ 进行检测。计数器有两种变体：基本计数器和堆栈计数器。

### 基本计数器

_基本计数器_ 是一个可递增的值，其名称描述了它所计数的事件。例如，`gopls/client:vscode` 计数器记录了 VS Code 启动 `gopls` 会话的次数。与此计数器一起，我们可能还有 `gopls/client:neovim`、`gopls/client:eglot` 等，用于记录不同编辑器或语言客户端的会话。如果你在一周内使用了多个编辑器，你可能会记录到以下计数器数据：

    gopls/client:vscode 8
    gopls/client:neovim 5
    gopls/client:eglot  2

当计数器以这种方式相关时，我们有时将 `:` 之前的部分称为 _图表名称_（此处为 `gopls/client`），而将 `:` 之后的部分称为 _桶名称_（`vscode`）。当我们讨论[图表](#charts)时，我们将看到为什么这很重要。

基本计数器也可以表示一个 _直方图_。例如，{{raw `<code>gopls/completion/latency:&lt;50ms</code>`}} 计数器记录了自动补全耗时少于 50 毫秒的次数。

{{raw `
<pre>
gopls/completion/latency:&lt;10ms
gopls/completion/latency:&lt;50ms
gopls/completion/latency:&lt;100ms
...
</pre>
`}}

这种记录直方图数据的模式是一种惯例：{{raw `<code>&lt;50ms</code>`}} 桶名称本身并没有什么特殊之处。这类计数器通常用于衡量性能。

### 堆栈计数器

_堆栈计数器_ 是一种在计数递增时还记录 Go 工具链程序当前调用栈的计数器。例如，`crash/crash` 堆栈计数器在工具链程序崩溃时记录调用栈：

    crash/crash
    golang.org/x/tools/gopls/internal/golang.hoverBuiltin:+22
    golang.org/x/tools/gopls/internal/golang.Hover:+94
    golang.org/x/tools/gopls/internal/server.Hover:+42
    ...

堆栈计数器通常用于衡量程序不变量被违反的事件。最常见的例子是崩溃，但另一个例子是 `gopls/bug` 堆栈计数器，它计算程序员预先识别出的异常情况，例如一个已恢复的 panic 或一个"不可能发生"的错误。堆栈计数器仅包含 Go 工具链程序内部的函数名称和行号。它们不包含任何关于用户输入的信息，例如用户源代码的名称或内容。

堆栈计数器可以帮助追踪那些无法通过其他方式报告的罕见或棘手的错误。自引入 `gopls/bug` 计数器以来，我们已经发现了[数十个实例](https://github.com/golang/go/issues?q=label%3Agopls%2Ftelemetry-wins)，其中被认为是"不可达"的代码实际上被执行到了。追踪这些异常导致了许多用户可见错误的发现（和修复），这些错误要么对用户来说不明显，要么难以报告。特别是在预发布测试阶段，堆栈计数器可以帮助我们比在没有自动化的情况下更高效地改进产品。

### 计数器文件

所有计数器数据都写入 `<gotelemetry>/local` 目录，文件按照以下方案命名：```
[program name]@[program version]-[go version]-[GOOS]-[GOARCH]-[date].v1.count
```- **程序名称** 是程序包路径的基本名称，由 [debug.BuildInfo] 报告。
- **程序版本** 和 **Go 版本** 同样由 [debug.BuildInfo] 报告。
- **GOOS** 和 **GOARCH** 的值由 [`runtime.GOOS`](/pkg/runtime#GOOS) 和 [`runtime.GOARCH`](/pkg/runtime#GOARCH) 提供。
- **日期** 是计数器文件的创建日期，采用 `YYYY-MM-DD` 格式。

这些文件被内存映射到每个已检测程序的运行实例中。使用内存映射文件意味着即使程序立即崩溃，或者同时运行多个已检测工具的副本，计数器也能安全地记录下来。

## 报告与上传 {#reports}

每周一次左右，计数器数据会聚合成报告，并以 `<date>.json` 的文件名存储在 `<gotelemetry>/local` 目录中。这些报告将前一周的所有计数按相同的程序标识符（程序名称、程序版本、Go 版本、GOOS 和 GOARCH）进行分组求和。

可以使用 [`gotelemetry view`](/pkg/golang.org/x/telemetry/cmd/gotelemetry) 命令以图表形式查看本地报告。以下是 `gopls/completion/latency` 计数器的示例摘要：

<div class="image">
  <center>
    <img max-width="800px" src="/doc/telemetry/gopls-latency.png" />
  </center>
</div>

### 上传 {#uploads}

如果启用了遥测上传，每周的报告生成过程还会创建包含 [上传配置](https://telemetry.go.dev/config) 中所列计数器子集的报告。这些计数器必须经过下一节描述的公开审查流程批准。成功上传后，已上传报告的副本会存储在 `<gotelemetry>/upload` 目录中。

一旦有足够的用户选择加入上传遥测数据，上传过程会随机跳过部分报告的上传，以在保持统计显著性的同时，减少数据收集量并增强隐私保护。

## 图表 {#charts}

除了接受上传，[telemetry.go.dev] 网站还会公开发布上传的数据。每天，上传的报告会被处理成两种输出形式，可在 [telemetry.go.dev] 主页上查看。

- _合并报告_ 将给定日期收到的所有上传中的计数器进行合并。
- _图表_ 根据 [图表配置] 中的规定绘制上传的数据，该配置是提案流程的一部分。回想一下[计数器](#counters)部分的讨论，像 `foo:bar` 这样的计数器名称会被分解为图表名称 `foo` 和存储桶名称 `bar`。每个图表将具有相同图表名称的计数器聚合到相应的存储桶中。

图表以 [chartconfig] 包的格式指定。例如，以下是 `gopls/client` 图表的图表配置：

    title: Editor Distribution
    counter: gopls/client:{vscode,vscodium,vscode-insiders,code-server,eglot,govim,neovim,coc.nvim,sublimetext,other}
    description: measure editor distribution for gopls users.
    type: partition
    issue: https://go.dev/issue/61038
    issue: https://go.dev/issue/62214 # add vscode-insiders
    program: golang.org/x/tools/gopls
    version: v0.13.0 # temporarily back-version to demonstrate config generation.

此配置描述了要生成的图表，枚举了要聚合的计数器集合，并指定了图表适用的程序版本。此外，[提案流程](#proposals)要求已接受的提案必须与图表关联。以下是根据该配置生成的图表：

<div class="image">
  <center>
    <img src="/doc/telemetry/gopls-clients.png" />
  </center>
</div>

## 遥测提案流程 {#proposals}

对 [telemetry.go.dev] 上的上传配置或图表集的更改必须经过 _遥测提案流程_，该流程旨在确保遥测配置变更的透明度。

值得注意的是，在此流程中，上传配置和图表配置实际上没有区别。上传配置本身就是基于我们希望在 telemetry.go.dev 上呈现的聚合来表达的，其原则是我们应该只收集我们想 _看到_ 的数据。

提案流程如下：

1. 提案创建者提交一个 CL，修改 [chartconfig] 包的 [config.txt]，以包含所需的新计数器聚合。
2. 提案创建者提交一个 [提案] 以合并此 CL。
3. 一旦 issue 上的讨论结束，Go 团队成员会批准或拒绝该提案。
4. 一个自动化过程会重新生成上传配置，以允许上传新图表所需的计数器。此过程还会在相关程序发布新版本时，定期将新版本添加到上传配置中。

为获得批准，新图表不能包含敏感的用户信息，此外还必须同时具备实用性和可行性。要实用，图表必须服务于特定目的，并具有可操作的成果。要可行，必须能够可靠地收集所需数据，并且结果测量必须具有统计显著性。为了证明可行性，可能会要求提案创建者先为目标程序添加计数器并进行本地收集。

所有此类提案的完整列表可在 GitHub 上的 [提案项目](https://github.com/orgs/golang/projects/29) 中查看。

## IDE 提示 {#ide}

为了让遥测能够回答我们想问的问题，选择加入上传的用户集不必很大——大约 16,000 名参与者就能实现所需粒度水平的统计显著性测量。然而，组建这个健康的样本仍有成本：我们需要询问大量的 Go 开发者是否愿意选择加入。此外，即便当前有大量用户选择加入（或许是在阅读了Go博客文章之后），这些用户也可能更倾向于经验丰富的Go开发者，随着时间的推移，这种初始样本的偏差会愈发明显。另外，当人们更换电脑时，他们必须主动再次选择加入。在遥测博客系列文章中，这被称为选择加入模型的["动员成本"](https://research.swtch.com/telemetry-opt-in#campaign)。

为保持参与用户样本的活跃度，Go语言服务器 [`gopls`] 支持一个提示功能，用于询问用户是否选择加入Go遥测。以下是在VS Code中的界面示意：

<div class="image">
  <center>
    <img width="600px" src="/doc/telemetry/prompt.png" />
  </center>
</div>

如果用户选择"Yes"，他们的遥测[模式](#config)将设置为 `on`，这与运行
[`gotelemetry on`](/pkg/golang.org/x/telemetry/cmd/gotelemetry) 命令的效果相同。通过这种方式，选择加入的流程尽可能简化，我们也能持续接触到大量且具有代表性的Go开发者样本。

## 常见问题解答 {#faq}

**问：如何启用或禁用Go遥测？**

答：使用 `gotelemetry` 命令，可通过 `go install golang.org/x/telemetry/cmd/gotelemetry@latest` 安装。运行 `gotelemetry off` 可禁用所有功能，包括本地数据收集。运行 `gotelemetry on` 可启用所有功能，包括将已批准的计数器数据上传至 [telemetry.go.dev]。更多信息请参阅[配置](#config)章节。

**问：本地数据存储在哪里？**

答：存储在 <code>[os.UserConfigDir()](/pkg/os#UserConfigDir)/go/telemetry</code> 目录中。

**问：如果选择加入，数据多久上传一次？**

答：大约每周一次。

**问：如果选择加入，会上传哪些数据？**

答：仅会上传列在[上传配置](https://telemetry.go.dev/config)中的计数器数据。
该配置由[图表配置]生成，后者可能更易读。

**问：计数器如何添加到上传配置中？**

答：通过[公开提案流程](#proposals)。

**问：在哪里可以查看已上传的遥测数据？**

答：已上传的数据可以在 [telemetry.go.dev] 上以图表或合并摘要的形式查看。

**问：Go遥测的源代码在哪里？**

答：在 [golang.org/x/telemetry](/pkg/golang.org/x/telemetry)。

[`gopls`]: /pkg/golang.org/x/tools/gopls
[`govulncheck`]: /pkg/golang.org/x/vuln/cmd/govulncheck
[Delve]: /pkg/github.com/go-delve/delve#section-readme
[debug.BuildInfo]: /pkg/runtime/debug#BuildInfo
[proposal]: /issue/new?assignees=&labels=Telemetry-Proposal&projects=golang%2F29&template=12-telemetry.yml&title=x%2Ftelemetry%2Fconfig%3A+proposal+title
[telemetry.go.dev]: https://telemetry.go.dev
[chartconfig]: /pkg/golang.org/x/telemetry/internal/chartconfig
[config.txt]: https://go.googlesource.com/telemetry/+/refs/heads/master/internal/chartconfig/config.txt