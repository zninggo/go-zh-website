---
title: Go 模糊测试
layout: article
breadcrumb: true
---

从 Go 1.18 开始，Go 在其标准工具链中支持模糊测试。原生的 Go 模糊测试[已获得 OSS-Fuzz 的支持](https://google.github.io/oss-fuzz/getting-started/new-project-guide/go-lang/#native-go-fuzzing-support)。

**尝试学习[使用 Go 进行模糊测试的教程](/doc/tutorial/fuzz)。**

## 概述

模糊测试是一种自动化测试类型，它持续操纵程序的输入以发现缺陷。Go 模糊测试使用覆盖引导来智能地遍历被测试的代码，以发现并向用户报告失败。由于它能发现人类常常忽略的边缘情况，模糊测试在发现安全漏洞方面尤其有价值。

下面是一个[模糊测试](#glos-fuzz-test)的示例，突出了其主要组成部分。

<img class="DarkMode-img" alt="示例代码展示了整体模糊测试，其中包含一个模糊目标。模糊目标之前通过 f.Add 添加了种子语料库，模糊目标的参数被高亮为模糊参数。"
src="/security/fuzz/example-dark.png" style="width: 600px; height:
auto;"/>
<img alt="示例代码展示了整体模糊测试，其中包含一个模糊目标。模糊目标之前通过 f.Add 添加了种子语料库，模糊目标的参数被高亮为模糊参数。"
src="/security/fuzz/example.png" style="width: 600px; height:
auto;" class="LightMode-img"/>

## 编写模糊测试

### 要求

以下是模糊测试必须遵守的规则。

- 模糊测试必须是一个命名为类似 `FuzzXxx` 的函数，该函数只接受一个 `*testing.F` 参数，且没有返回值。
- 模糊测试必须位于 \*_test.go 文件中才能运行。
- [模糊目标](#glos-fuzz-target)必须是对 <code>[(\*testing.F).Fuzz](https://pkg.go.dev/testing#F.Fuzz)</code> 的方法调用，该方法接受一个 `*testing.T` 作为第一个参数，后面跟随模糊参数。没有返回值。
- 每个模糊测试必须恰好有一个模糊目标。
- 所有[种子语料库](#glos-seed-corpus)条目的类型必须与[模糊参数](#glos-fuzzing-arguments)的类型相同，且顺序一致。这适用于调用 <code>[(\*testing.F).Add](https://pkg.go.dev/testing#F.Add)</code> 以及模糊测试的 testdata/fuzz 目录中的任何语料库文件。
- 模糊参数只能是以下类型：
  - `string`, `[]byte`
  - `int`, `int8`, `int16`, `int32`/`rune`, `int64`
  - `uint`, `uint8`/`byte`, `uint16`, `uint32`, `uint64`
  - `float32`, `float64`
  - `bool`

### 建议 {#suggestions}

以下建议可以帮助您充分利用模糊测试。

- 模糊目标应快速且确定，以便模糊测试引擎能够高效工作，并且新的失败和代码覆盖可以轻松重现。
- 由于模糊目标在多个工作者中并行调用且顺序不确定，模糊目标的状态不应在每次调用结束后持续存在，并且其行为不应依赖于全局状态。

## 运行模糊测试

运行模糊测试有两种模式：作为单元测试运行（默认 `go test`），或进行模糊测试运行（`go test -fuzz=FuzzTestName`）。

默认情况下，模糊测试的运行方式与单元测试非常相似。每个[种子语料库条目](#glos-seed-corpus)将针对模糊目标进行测试，在退出前报告任何失败。

要启用模糊测试，请运行带有 `-fuzz` 标志的 `go test`，并提供匹配单个模糊测试的正则表达式。默认情况下，该包中的所有其他测试将在模糊测试开始前运行。这是为了确保模糊测试不会报告已被现有测试捕获的问题。

请注意，由您决定运行模糊测试多长时间。如果未发现任何错误，模糊测试的执行很可能无限期运行。未来将支持使用 OSS-Fuzz 等工具持续运行这些模糊测试，参见 [Issue #50192](/issue/50192)。

**注意：** 应在支持覆盖插桩的平台（目前是 AMD64 和 ARM64）上运行模糊测试，这样语料库才能在运行过程中有意义地增长，并且在模糊测试期间可以覆盖更多代码。

### 命令行输出

在模糊测试进行过程中，[模糊测试引擎](#glos-fuzzing-engine)会生成新的输入并针对提供的模糊目标运行它们。默认情况下，它会持续运行直到发现[失败输入](#glos-failing-input)，或者用户取消进程（例如使用 Ctrl^C）。

输出看起来像这样：```
~ go test -fuzz FuzzFoo
fuzz: elapsed: 0s, gathering baseline coverage: 0/192 completed
fuzz: elapsed: 0s, gathering baseline coverage: 192/192 completed, now fuzzing with 8 workers
fuzz: elapsed: 3s, execs: 325017 (108336/sec), new interesting: 11 (total: 202)
fuzz: elapsed: 6s, execs: 680218 (118402/sec), new interesting: 12 (total: 203)
fuzz: elapsed: 9s, execs: 1039901 (119895/sec), new interesting: 19 (total: 210)
fuzz: elapsed: 12s, execs: 1386684 (115594/sec), new interesting: 21 (total: 212)
PASS
ok      foo 12.692s
```初始几行显示在模糊测试开始前会收集"基线覆盖"数据。

为了收集基线覆盖数据，模糊测试引擎会执行[种子语料库](#glos-seed-corpus)和[生成语料库](#glos-generated-corpus)，以确保没有错误发生，并了解现有语料库已提供的代码覆盖范围。

后续几行则揭示了主动模糊测试的执行情况：

  - elapsed：自进程开始以来经过的时间
  - execs：针对模糊测试目标运行的输入总数（附带自上次日志行以来的平均执行次数/秒）
  - new interesting：在本次模糊测试执行期间已添加到生成语料库中的"有趣"输入总数（附带整个语料库的总大小）

一个输入要被视为"有趣"，它必须将代码覆盖范围扩展到现有生成语料库所能达到之外。通常，新增有趣输入的数量在开始时会快速增长，最终会放缓，偶尔会在发现新分支时出现突增。

你应该预期看到"new interesting"数值随时间逐渐减少，因为语料库中的输入开始覆盖更多的代码行，偶尔会在模糊测试引擎发现新代码路径时出现突增。

### 失败输入

在模糊测试过程中可能出现失败的原因有几个：

  - 代码或测试中发生了恐慌（panic）。
  - 模糊测试目标直接调用了 `t.Fail`，或者通过诸如 `t.Error` 或 `t.Fatal` 等方法间接调用。
  - 发生了不可恢复的错误，例如 `os.Exit` 或栈溢出。
  - 模糊测试目标完成耗时过长。目前，模糊测试目标单次执行的超时时间为 1 秒。这可能是由于死锁、无限循环或代码中的预期行为导致失败。这也是[建议你的模糊测试目标要快速](#suggestions)的原因之一。

如果发生错误，模糊测试引擎会尝试将输入最小化为尽可能小且人类可读的值，该值仍能产生错误。要配置此行为，请参阅[自定义设置](#custom-settings)部分。

最小化完成后，错误消息将被记录，输出将以类似以下内容结束：```
    Failing input written to testdata/fuzz/FuzzFoo/a878c3134fe0404d44eb1e662e5d8d4a24beb05c3d68354903670ff65513ff49
    To re-run:
    go test -run=FuzzFoo/a878c3134fe0404d44eb1e662e5d8d4a24beb05c3d68354903670ff65513ff49
FAIL
exit status 1
FAIL    foo 0.839s
```模糊测试引擎会将此[失败输入](#glos-failing-input)写入该模糊测试的种子语料库，并在修复错误后默认通过 `go test` 运行，从而作为回归测试使用。

接下来您需要诊断问题、修复错误、通过重新运行 `go test` 验证修复效果，并提交包含新测试数据文件的补丁，该文件将作为您的回归测试。

### 自定义设置 {#custom-settings}

默认的 go 命令设置适用于大多数模糊测试场景。通常，在命令行上执行模糊测试应如下所示：```
$ go test -fuzz={FuzzTestName}
```然而，`go` 命令确实提供了一些模糊测试运行时的设置选项。这些设置已记录在 [`cmd/go` 包文档](https://pkg.go.dev/cmd/go) 中。

以下摘取几个重点：

- `-fuzztime`：模糊测试目标在退出前执行的总时间或迭代次数，默认为无限期。
- `-fuzzminimizetime`：每次最小化尝试期间模糊测试目标执行的时间或迭代次数，默认为 60 秒。在模糊测试时设置 `-fuzzminimizetime 0` 可以完全禁用最小化。
- `-parallel`：同时运行的模糊测试进程数量，默认为 `$GOMAXPROCS`。目前，在模糊测试期间设置 -cpu 无效。

## 语料库文件格式

语料库文件采用特殊格式编码。[种子语料库](#glos-seed-corpus)和[生成的语料库](#glos-generated-corpus)使用相同的格式。

以下是一个语料库文件的示例：```
go test fuzz v1
[]byte("hello\\xbd\\xb2=\\xbc ⌘")
int64(572293)
```第一行用于告知模糊测试引擎文件的编码版本。虽然目前尚未规划未来编码格式的版本更新，但设计必须支持这种可能性。

接下来的每一行是构成语料库条目的值，如果需要，这些值可以直接复制到Go代码中使用。

在上面的示例中，我们有一个 `[]byte` 类型和一个 `int64` 类型。这些类型必须与模糊测试的参数完全匹配，且顺序一致。针对这些类型的模糊测试目标函数将如下所示：```
f.Fuzz(func(*testing.T, []byte, int64) {})
```指定您自己的种子语料库值的最简单方式是使用 `(*testing.F).Add` 方法。在上面的示例中，会像这样：```
f.Add([]byte("hello\\xbd\\xb2=\\xbc ⌘"), int64(572293))
```然而，如果存在较大的二进制文件，您可能不希望将其作为代码复制到测试中，而是希望它们作为独立的种子语料库条目保留在 `testdata/fuzz/{FuzzTestName}` 目录下。`golang.org/x/tools/cmd/file2fuzz` 中的 [`file2fuzz`](https://pkg.go.dev/golang.org/x/tools/cmd/file2fuzz) 工具可用于将这些二进制文件转换为为 `[]byte` 编码的语料库文件。

要使用此工具：```
$ go install golang.org/x/tools/cmd/file2fuzz@latest
$ file2fuzz -h
```## 资源

- **教程**：
  - 尝试[Go 模糊测试教程](/doc/tutorial/fuzz)，深入了解这些新概念。
  - 若需要更简短的模糊测试入门教程，请参阅[这篇博客文章](/blog/fuzz-beta)。
- **文档**：
  - [`testing`](https://pkg.go.dev//testing#hdr-Fuzzing) 包文档描述了编写模糊测试时使用的 `testing.F` 类型。
  - [`cmd/go`](https://pkg.go.dev/cmd/go) 包文档描述了与模糊测试相关的标志。
- **技术细节**：
  - [设计草案](/s/draft-fuzzing-design)
  - [提案](/issue/44551)

## 术语表 {#glossary}

<a id="glos-corpus-entry"></a>
**语料库条目（corpus entry）：** 语料库中的一项输入，可在模糊测试期间使用。它可以是特殊格式的文件，也可以是对
<code>[(\*testing.F).Add](https://pkg.go.dev/testing#F.Add)</code> 的调用。

<a id="glos-coverage-guidance"></a>
**覆盖率引导（coverage guidance）：** 一种模糊测试方法，它利用代码覆盖率的扩展来决定哪些语料库条目值得保留以供将来使用。

<a id="glos-failing-input"></a>
**失败输入（failing input）：** 一种语料库条目，当针对[模糊测试目标](#glos-fuzz-target)运行时，会导致错误或恐慌。

<a id="glos-fuzz-target"></a>
**模糊测试目标（fuzz target）：** 模糊测试中执行的函数，用于处理语料库条目和生成值。它通过将函数传递给
<code>[(\*testing.F).Fuzz](https://pkg.go.dev/testing#F.Fuzz)</code> 提供给模糊测试。

<a id="glos-fuzz-test"></a>
**模糊测试（fuzz test）：** 测试文件中形式为 `func FuzzXxx(*testing.F)` 的函数，可用于进行模糊测试。

<a id="glos-fuzzing"></a>
**模糊测试（fuzzing）：** 一种自动化测试类型，通过持续操纵程序的输入来发现可能使代码易受攻击的问题，例如缺陷或[漏洞](#glos-vulnerability)。

<a id="glos-fuzzing-arguments"></a>
**模糊测试参数（fuzzing arguments）：** 将传递给模糊测试目标，并由[变异器](#glos-mutator)进行变异处理的类型。

<a id="glos-fuzzing-engine"></a>
**模糊测试引擎（fuzzing engine）：** 管理模糊测试的工具，包括维护语料库、调用变异器、识别新的覆盖率以及报告失败情况。

<a id="glos-generated-corpus"></a>
**生成语料库（generated corpus）：** 由模糊测试引擎在模糊测试过程中维护的语料库，用于跟踪进度。它存储在 `$GOCACHE`/fuzz 中。这些条目仅在模糊测试期间使用。

<a id="glos-mutator"></a>
**变异器（mutator）：** 模糊测试期间使用的工具，用于在将语料库条目传递给模糊测试目标之前对其进行随机操纵。

<a id="glos-package"></a>
**包（package）：** 同一目录中一起编译的源文件集合。参阅 Go 语言规范中的[包](/ref/spec#Packages)章节。

<a id="glos-seed-corpus"></a>
**种子语料库（seed corpus）：** 用户为模糊测试提供的语料库，可用于引导模糊测试引擎。它由模糊测试中 f.Add 调用提供的语料库条目，以及包内 `testdata/fuzz/{FuzzTestName}` 目录下的文件组成。这些条目在运行 `go test` 时默认执行，无论是否进行模糊测试。

<a id="glos-test-file"></a>
**测试文件（test file）：** 格式为 xxx_test.go 的文件，可能包含测试、基准测试、示例和模糊测试。

<a id="glos-vulnerability"></a>
**漏洞（vulnerability）：** 代码中可能被攻击者利用的安全性缺陷。

## 反馈

如果遇到任何问题或对功能有建议，请[提交 issue](/issue/new?&labels=fuzz)。

如需讨论或提供关于此功能的一般反馈，您也可以参与 Gophers Slack 中的 [#fuzzing 频道](https://gophers.slack.com/archives/CH5KV1AKE)。