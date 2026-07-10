---
path: /doc/go1.18
title: Go 1.18 发布说明
---

<!--
注意：在本文档及本目录的其他文档中，惯例是将固定宽度的短语用非固定宽度的空格分隔，例如 `hello` `world`。
请勿提交移除这些短语内部标签的变更列表。
-->

<style>
  main ul li { margin: 0.5em 0; }
</style>

## Go 1.18 简介 {#introduction}

Go 的最新版本 1.18 是一个重要的版本，包括对语言本身、工具链实现、运行时和库的更改。Go 1.18 在 [Go 1.17](/doc/go1.17) 发布七个月后发布。一如既往，该版本维护了 Go 1 的[兼容性承诺](/doc/go1compat)。我们预计几乎所有 Go 程序都将像以前一样继续编译和运行。

## 语言变更 {#language}

### 泛型 {#generics}

<!-- https://golang.org/issue/43651, https://golang.org/issue/45346 -->
Go 1.18 包含了对泛型特性的实现，如 [类型参数提案](https://go.googlesource.com/proposal/+/refs/heads/master/design/43651-type-parameters.md) 所述。这包括对语言的重大变更——但这些变更完全向后兼容。

这些新的语言变更需要大量新代码，而这些代码尚未在生产环境中进行充分测试。这只有随着越来越多的人编写和使用泛型代码才会发生。我们相信这个特性实现得很好且质量很高。然而，与 Go 的大多数方面不同，我们无法用实际经验来支持这一信念。因此，虽然我们鼓励在合理的地方使用泛型，但在生产环境中部署泛型代码时请保持适当的谨慎。

尽管我们相信新的语言特性设计良好且规范明确，但我们仍有可能犯错。我们想强调的是，[Go 1 兼容性保证](/doc/go1compat) 中提到：“如果有必要解决规范中的不一致或不完整性，解决该问题可能会影响现有程序的含义或合法性。我们保留解决此类问题的权利，包括更新实现。” 它还提到：“如果编译器或库存在违反规范的错误，依赖于该错误行为的程序可能会在该错误被修复时中断。我们保留修复此类错误的权利。” 换句话说，可能会有一些使用泛型的代码在 1.18 版本中可以正常工作，但在后续版本中无法工作。我们没有计划或期望进行任何此类更改。但是，在未来的版本中中断 1.18 程序可能因我们今天无法预见的原因而成为必要。我们将尽可能减少任何此类中断，但我们无法保证中断为零。

以下是最明显变更的列表。更全面的概述请参见[提案](https://go.googlesource.com/proposal/+/refs/heads/master/design/43651-type-parameters.md)。详情请参见[语言规范](/ref/spec)。

  - [函数](/ref/spec#Function_declarations) 和 [类型声明](/ref/spec#Type_declarations) 的语法现在接受 [类型参数](/ref/spec#Type_parameter_declarations)。
  - 参数化函数和类型可以通过在它们后面跟一个用方括号括起来的类型参数列表来实例化。
  - 新的标记 `~` 已被添加到 [运算符和标点符号](/ref/spec#Operators_and_punctuation) 集合中。
  - [接口类型](/ref/spec#Interface_types) 的语法现在允许嵌入任意类型（不仅仅是接口的类型名称）以及联合类型和 `~T` 类型元素。此类接口只能用作类型约束。接口现在定义了一组类型以及一组方法。
  - 新的 [预声明标识符](/ref/spec#Predeclared_identifiers) `any` 是空接口的别名。它可以用来代替 `interface{}`。
  - 新的 [预声明标识符](/ref/spec#Predeclared_identifiers) `comparable` 是一个接口，表示可以使用 `==` 或 `!=` 进行比较的所有类型集合。它只能用作（或嵌入）类型约束。

有三个使用泛型的实验性包可能很有用。
这些包位于 x/exp 仓库中；它们的 API 不受 Go 1 保证的覆盖，并且可能会随着我们获得更多泛型使用经验而更改。

#### [`golang.org/x/exp/constraints`](https://pkg.go.dev/golang.org/x/exp/constraints)

对泛型代码有用的约束条件，例如 [`constraints.Ordered`](https://pkg.go.dev/golang.org/x/exp/constraints#Ordered)。

#### [`golang.org/x/exp/slices`](https://pkg.go.dev/golang.org/x/exp/slices)

一组操作任意元素类型的切片的泛型函数集合。

#### [`golang.org/x/exp/maps`](https://pkg.go.dev/golang.org/x/exp/maps)

一组操作任意键或元素类型的映射的泛型函数集合。

当前的泛型实现存在以下已知限制：- <!-- https://golang.org/issue/47631 -->
  Go 编译器目前无法处理泛型函数或方法内部的类型声明。我们希望在未来版本中提供对这一特性的支持。
- <!-- https://golang.org/issue/50937 -->
  Go 编译器不接受将类型参数类型的实参传递给预声明函数 `real`、`imag` 和 `complex`。我们希望在未来版本中解除此限制。
- <!-- https://golang.org/issue/51183 -->
  Go 编译器仅在方法 `m` 由类型参数 `P` 的约束接口明确声明时，才支持在类型参数类型的值 `x` 上调用该方法 `m`。类似地，方法值 `x.m` 和方法表达式 `P.m` 也仅在 `m` 由 `P` 明确声明时才受支持，即使 `m` 可能因其所有类型都实现了 `m` 而属于 `P` 的方法集。我们希望在未来版本中解除此限制。
- <!-- https://golang.org/issue/51576 -->
  Go 编译器不支持访问结构体字段 `x.f`（其中 `x` 为类型参数类型），即使类型参数的类型集中的所有类型都具有字段 `f`。我们可能会在未来版本中解除此限制。
- <!-- https://golang.org/issue/49030 -->
  不允许将类型参数或指向类型参数的指针作为未命名字段嵌入到结构体类型中。类似地，也不允许在接口类型中嵌入类型参数。目前尚不清楚这些是否最终会被允许。
- 一个包含多个项的联合元素不能包含具有非空方法集的接口类型。目前尚不清楚这是否最终会被允许。

泛型也代表了 Go 生态系统的一项重大变革。虽然我们已经为几个核心工具添加了泛型支持，但仍有大量工作待完成。剩余的工具、文档和库需要时间来跟上这些语言变化。

### 缺陷修复 {#bug_fixes}

Go 1.18 编译器现在会正确报告在函数字面量中设置但从未使用的变量所引发的 `declared but not used` 错误。在 Go 1.18 之前，编译器在此类情况下不会报告错误。这修复了长期存在的编译器问题 [#8560](/issue/8560)。由于此更改，（可能是不正确的）程序可能无法再编译。必要的修复很简单：如果程序确实不正确，则修复程序；否则，使用该有问题的变量，例如将其赋值给空白标识符 `_`。由于 `go vet` 一直会指出此错误，因此受影响的程序数量可能非常少。

Go 1.18 编译器现在会在将 rune 常量表达式（如 `'1' << 32`）作为预声明函数 `print` 和 `println` 的参数传递时报告溢出，这与用户定义函数的行为保持一致。在 Go 1.18 之前，编译器在此类情况下不会报告错误，如果常量参数能放入 `int64` 中，编译器会静默接受它们。由于此更改，（可能是不正确的）程序可能无法再编译。必要的修复很简单：如果程序确实不正确，则修复程序；否则，将有问题的参数显式转换为正确的类型。由于 `go vet` 一直会指出此错误，因此受影响的程序数量可能非常少。

## 平台移植 {#ports}

### AMD64 {#amd64}

<!-- CL 349595 -->
Go 1.18 引入了新的 `GOAMD64` 环境变量，用于在编译时选择 AMD64 架构的最低目标版本。允许的值是 `v1`、`v2`、`v3` 或 `v4`。每个更高的级别都需要并利用额外的处理器特性。详细描述可以在[此处](/wiki/MinimumRequirements#amd64)找到。

`GOAMD64` 环境变量默认为 `v1`。

### RISC-V {#riscv}

<!-- golang.org/issue/47100, CL 334872 -->
Linux 上的 64 位 RISC-V 架构（`linux/riscv64` 平台）现在支持 `c-archive` 和 `c-shared` 构建模式。

### Linux {#linux}

<!-- golang.org/issue/45964 -->
Go 1.18 要求 Linux 内核版本为 2.6.32 或更高。

### Windows {#windows}

<!-- https://golang.org/issue/49759 -->
`windows/arm` 和 `windows/arm64` 平台现在支持非协作式抢占，从而将此功能带到了所有四个 Windows 平台，这有望解决调用会阻塞较长时间的 Win32 函数时遇到的隐晦缺陷。

### iOS {#ios}

<!-- golang.org/issue/48076, golang.org/issue/49616 -->
在 iOS（`ios/arm64` 平台）和在基于 AMD64 的 macOS 上运行的 iOS 模拟器（`ios/amd64` 平台）上，Go 1.18 现在要求 iOS 12 或更高版本；对以前版本的支持已停止。

### FreeBSD {#freebsd}

Go 1.18 是最后一个支持 FreeBSD 11.x 的版本，该版本已停止维护。Go 1.19 将要求 FreeBSD 12.2+ 或 FreeBSD 13.0+。FreeBSD 13.0+ 将需要一个设置了 `COMPAT_FREEBSD12` 选项的内核（这是默认设置）。

## 工具 {#tools}

### 模糊测试 {#fuzzing}

Go 1.18 包含了[模糊测试提案](/issue/44551)中描述的模糊测试实现。

请参阅[模糊测试入门页面](/security/fuzz)以开始使用。

请注意，模糊测试可能会消耗大量内存，并可能在运行时影响您机器的性能。同时请注意，模糊测试引擎在运行期间会将扩展测试覆盖率的值写入 `$GOCACHE/fuzz` 内的模糊缓存目录。目前对写入模糊缓存的文件数量或总字节数没有限制，因此它可能占用大量存储空间（可能达到数 GB）。

### Go 命令 {#go-command}

#### `go` `get` {#go-get}<!-- golang.org/issue/43684 -->
在模块感知模式下，`go` `get` 不再构建或安装包。`go` `get` 现在专门用于调整 `go.mod` 中的依赖关系。实际上，`-d` 标志始终处于启用状态。若要在当前模块上下文之外安装可执行文件的最新版本，请使用 [`go` `install` `example.com/cmd@latest`](/ref/mod#go-install)。任何[版本查询](/ref/mod#version-queries)均可替代 `latest`。这种形式的 `go` `install` 是在 Go 1.16 中添加的，因此支持旧版本的项目可能需要同时为 `go` `install` 和 `go` `get` 提供安装说明。`go` `get` 现在在模块外使用时会报告错误，因为没有 `go.mod` 文件可供更新。在 GOPATH 模式下（设置 `GO111MODULE=off`），`go` `get` 仍像以前一样构建和安装包。

#### `go.mod` 和 `go.sum` 的自动更新 {#go-mod-updates}

<!-- https://go.dev/issue/45551 -->
`go` `mod` `graph`、`go` `mod` `vendor`、`go` `mod` `verify` 和 `go` `mod` `why` 子命令不再自动更新 `go.mod` 和 `go.sum` 文件。
（可以使用 `go` `get`、`go` `mod` `tidy` 或 `go` `mod` `download` 来显式更新这些文件。）

#### `go` `version` {#go-version}

<!-- golang.org/issue/37475 -->
`go` 命令现在会在二进制文件中嵌入版本控制信息。这包括当前签出的版本、提交时间以及一个指示是否存在已编辑或未跟踪文件的标志。如果 `go` 命令是在 Git、Mercurial、Fossil 或 Bazaar 仓库内的目录中调用，且 `main` 包及其包含的主模块位于同一仓库中，则会嵌入版本控制信息。可以使用 `-buildvcs=false` 标志来省略此信息。

<!-- golang.org/issue/37475 -->
此外，`go` 命令还会嵌入关于构建的信息，包括构建和工具标签（使用 `-tags` 设置）、编译器、汇编器和链接器标志（如 `-gcflags`）、是否启用了 cgo，以及如果启用了，cgo 环境变量的值（如 `CGO_CFLAGS`）。
版本控制信息和构建信息都可以与模块信息一起使用 `go` `version` `-m` `file`（用于读取二进制文件）或 `runtime/debug.ReadBuildInfo`（用于当前正在运行的二进制文件）或新的 [`debug/buildinfo`](#debug/buildinfo) 包来读取。

<!-- CL 369977 -->
嵌入式构建信息的底层数据格式可能会随着新的 Go 版本发布而更改，因此较旧版本的 `go` 可能无法处理使用较新版本 `go` 生成的构建信息。
要读取使用 `go` 1.18 构建的二进制文件的版本信息，请使用 `go` `version` 命令和来自 `go` 1.18+ 的 `debug/buildinfo` 包。

#### `go` `mod` `download` {#go-mod-download}

<!-- https://golang.org/issue/44435 -->
如果主模块的 `go.mod` 文件指定了 [`go` `1.17`](/ref/mod#go-mod-file-go) 或更高版本，那么不带参数的 `go` `mod` `download` 现在仅下载在主模块的 `go.mod` 文件中明确[声明需要](/ref/mod#go-mod-file-require)的模块的源代码。（在 `go` `1.17` 或更高版本的模块中，该集合已包含构建主模块中的包和测试所需的所有依赖项。）
要同时下载传递依赖项的源代码，请使用 `go` `mod` `download` `all`。

#### `go` `mod` `vendor` {#go-mod-vendor}

<!-- https://golang.org/issue/47327 -->
`go` `mod` `vendor` 子命令现在支持 `-o` 标志来设置输出目录。
（其他 `go` 命令在使用 `-mod=vendor` 加载包时，仍然会从模块根目录下的 `vendor` 目录读取，因此此标志的主要用途是用于需要收集包源代码的第三方工具。）

#### `go` `mod` `tidy` {#go-mod-tidy}

<!-- https://golang.org/issue/47738, CL 344572 -->
`go` `mod` `tidy` 命令现在会保留额外的校验和到 `go.sum` 文件中，这些校验和用于那些其源代码需要验证在[构建列表](/ref/mod#glos-build-list)中每个导入的包仅由一个模块提供的模块。因为这种情况很少见，并且不满足此条件会导致构建错误，所以此更改_不_取决于主模块 `go.mod` 文件中的 `go` 版本。

#### `go` `work` {#go-work}

<!-- https://golang.org/issue/45713 -->
`go` 命令现在支持“工作区”模式。如果在工作目录或父目录中找到 `go.work` 文件，或者使用 `GOWORK` 环境变量指定了一个，它将使 `go` 命令进入工作区模式。
在工作区模式下，`go.work` 文件将用于确定用作模块解析根的主模块集合，而不是使用通常找到的 `go.mod` 文件来指定单个主模块。更多信息请参阅 [`go work`](/pkg/cmd/go#hdr-Workspace_maintenance) 文档。

#### `go` `build` `-asan` {#go-build-asan}

<!-- CL 298612 -->
`go` `build` 命令及相关命令现在支持 `-asan` 标志，该标志可实现与使用地址消毒器（C 编译器选项 `-fsanitize=address`）编译的 C（或 C++）代码的互操作。

#### `go` `test` {#go-test}

<!-- CL 251441 -->
`go` 命令现在为上文描述的新[模糊测试支持](#fuzzing)提供了额外的命令行选项：

  - `go test` 支持 `-fuzz`、`-fuzztime` 和 `-fuzzminimizetime` 选项。
    有关这些选项的文档，请参阅 [`go help testflag`](/pkg/cmd/go#hdr-Testing_flags)。
  - `go clean` 支持 `-fuzzcache` 选项。
    有关文档，请参阅 [`go help clean`](/pkg/cmd/go#hdr-Remove_object_files_and_cached_files)。

#### `//go:build` 行 {#go-build-lines}

<!-- CL 240611 -->
Go 1.17 引入了 `//go:build` 行，作为编写构建约束的一种更易读的方式，以替代 `//` `+build` 行。
从 Go 1.17 开始，`gofmt` 会添加 `//go:build` 行以匹配现有的 `+build` 行并保持它们同步，而 `go` `vet` 会在它们不同步时发出诊断信息。自 Go 1.18 发布起，Go 1.16 的官方支持已正式终止，  
因此目前所有受支持的 Go 版本均已兼容 `//go:build` 行。  
在 Go 1.18 中，`go` `fix` 现在会移除在 `go.mod` 文件中声明  
`go` `1.18` 或更高版本模块中已过时的  
`//` `+build` 行。

更多详细信息请参阅 [go.dev/design/draft-gobuild](/design/draft-gobuild)。

### Gofmt {#gofmt}

<!-- https://golang.org/issue/43566 -->
`gofmt` 现在可并发读取并格式化输入文件，  
其内存使用量与 `GOMAXPROCS` 成正比。在多核处理器的机器上，  
`gofmt` 的执行速度现在将显著提升。

### Vet {#vet}

#### 泛型支持更新 {#vet-generics}

<!-- https://golang.org/issue/48704 -->
`vet` 工具已更新以支持泛型代码。在大多数情况下，  
当泛型代码中的类型参数被替换为其  
[类型集](/ref/spec#Interface_types) 中的具体类型后，  
`vet` 会在等价的非泛型代码中报错时，  
同样报告泛型代码的错误。例如，`vet` 会在以下代码中报告格式错误：

	func Print[T ~int|~string](t T) {
		fmt.Printf("%d", t)
	}

因为它在非泛型等价函数 `Print[string]` 中也会报错：

	func PrintString(x string) {
		fmt.Printf("%d", x)
	}

#### 现有检查器的精度提升 {#vet-precision}

<!-- CL 323589 356830 319689 355730 351553 338529 -->
`cmd/vet` 的检查器 `copylock`、`printf`、  
`sortslice`、`testinggoroutine` 和 `tests`  
均进行了适度的精度改进，以处理更多代码模式。  
这可能导致现有软件包中报告新的错误。例如，  
`printf` 检查器现在能够追踪由字符串常量拼接创建的格式化字符串。  
因此 `vet` 会在以下代码中报告错误：

	  // fmt.Printf formatting directive %d is being passed to Println.
	  fmt.Println("%d"+` ≡ x (mod 2)`+"\n", x%2)

## 运行时 {#runtime}

<!-- https://golang.org/issue/44167 -->
垃圾回收器现在在决定回收频率时，会将非堆来源的垃圾回收工作  
（例如栈扫描）纳入考量。因此，当这些来源的影响较大时，  
垃圾回收的开销将更具可预测性。对于大多数应用程序，这些变化影响甚微；  
但部分 Go 应用现在可能会减少内存使用并增加垃圾回收时间，  
或反之亦然。若有必要，可通过调整 `GOGC` 进行优化。

<!-- CL 358675, CL 353975, CL 353974 -->
运行时现在能更高效地将内存归还给操作系统，  
并已调优为更积极地释放内存。

<!-- CL 352057, https://golang.org/issue/45728 -->
Go 1.17 改进了栈跟踪中参数的格式化，  
但对通过寄存器传递的参数可能打印不准确的值。  
Go 1.18 通过在可能不准确的值后打印问号（`?`）  
对此进行了改进。

<!-- CL 347917 -->
内置函数 `append` 在决定切片扩容时，  
现在采用了略微不同的计算公式。  
新公式能减少分配行为上的突变。

## 编译器 {#compiler}

<!-- https://golang.org/issue/40724 -->
Go 1.17 在选定操作系统的 64 位 x86 架构上  
[实现](go1.17#compiler)了一种通过寄存器而非栈  
传递函数参数和返回值的新方式。  
Go 1.18 将其支持的平台扩展至包括：  
64 位 ARM（`GOARCH=arm64`）、  
大端序和小端序的 64 位 PowerPC（`GOARCH=ppc64`, `ppc64le`），  
以及所有操作系统上的 64 位 x86 架构（`GOARCH=amd64`）。  
在 64 位 ARM 和 64 位 PowerPC 系统上，基准测试显示  
典型性能提升幅度达 10% 或更高。

如 Go 1.17 发布说明中[提及](go1.17#compiler)的，  
此更改不影响任何安全 Go 代码的功能，  
且旨在对大多数汇编代码无影响。  
更多详情请参阅 [Go 1.17 发布说明](go1.17#compiler)。

<!-- CL 355497, CL 356869 -->
编译器现在能够内联包含 range 循环或带标签 for 循环的函数。

<!-- CL 298611 -->
新增的 `-asan` 编译器选项支持  
新的 `go` 命令 `-asan` 选项。

<!-- https://golang.org/issue/50954 -->
由于编译器的类型检查器为支持泛型已完全重构，  
部分错误信息的措辞可能与以往不同。在某些情况下，  
Go 1.18 之前的错误信息提供了更多细节或表述更为清晰。  
我们计划在 Go 1.19 中改进这些情况。

<!-- /issue/49569 -->
由于编译器在泛型支持方面的改动，  
Go 1.18 的编译速度可能比 Go 1.17 慢约 15%。  
编译后代码的执行时间不受影响。  
我们计划在未来的版本中提升编译器速度。

## 链接器 {#linker}

链接器现在生成的[重定位项大幅减少](https://tailscale.com/blog/go-linker/)。  
因此，大多数代码库的链接速度更快、内存占用更少，  
且生成的二进制文件更小。  
处理 Go 二进制文件的工具应使用 Go 1.18 的 `debug/gosym` 包  
以透明处理新旧二进制格式。

<!-- CL 298610 -->
新增的 `-asan` 链接器选项支持  
新的 `go` 命令 `-asan` 选项。

## 引导工具链 {#bootstrap}

<!-- CL 369914, CL 370274 -->
当从源码构建 Go 发行版且未设置 `GOROOT_BOOTSTRAP` 时，  
旧版 Go 会在目录 `$HOME/go1.4`（Windows 下为 `%HOMEDRIVE%%HOMEPATH%\go1.4`）  
中查找 Go 1.4 或更高版本的引导工具链。  
现在 Go 会优先查找 `$HOME/go1.17` 或 `$HOME/sdk/go1.17`，  
若未找到再回退至 `$HOME/go1.4`。  
我们计划在 Go 1.19 中要求使用 Go 1.17 或更高版本进行引导，  
此更改将使过渡更为平滑。  
更多详情请参阅 [go.dev/issue/44505](/issue/44505)。

## 标准库 {#library}

### 新增 `debug/buildinfo` 包 {#debug_buildinfo}<!-- golang.org/issue/39301 -->
新增的 [`debug/buildinfo`](/pkg/debug/buildinfo) 包提供了对 `go` 命令构建的可执行文件中嵌入的模块版本、版本控制信息及构建标志的访问。对于当前运行的二进制文件，相同信息也可以通过 [`runtime/debug.ReadBuildInfo`](/pkg/runtime/debug#ReadBuildInfo) 获取，或通过命令行的 `go version -m` 查看。

### 新增 `net/netip` 包 {#netip}

新增的 [`net/netip`](/pkg/net/netip/) 包定义了一个新的 IP 地址类型 [`Addr`](/pkg/net/netip/#Addr)。与现有的 [`net.IP`](/pkg/net/#IP) 类型相比，`netip.Addr` 类型占用内存更少、不可变且可比较，因此支持 `==` 操作，并可作为映射（map）的键使用。

除了 `Addr`，该包还定义了 [`AddrPort`](/pkg/net/netip/#AddrPort)（表示 IP 和端口）和 [`Prefix`](/pkg/net/netip/#Prefix)（表示网络 CIDR 前缀）。

该包还定义了多个用于创建和检查这些新类型的函数：
[`AddrFrom4`](/pkg/net/netip#AddrFrom4)、[`AddrFrom16`](/pkg/net/netip#AddrFrom16)、[`AddrFromSlice`](/pkg/net/netip#AddrFromSlice)、[`AddrPortFrom`](/pkg/net/netip#AddrPortFrom)、[`IPv4Unspecified`](/pkg/net/netip#IPv4Unspecified)、[`IPv6LinkLocalAllNodes`](/pkg/net/netip#IPv6LinkLocalAllNodes)、[`IPv6Unspecified`](/pkg/net/netip#IPv6Unspecified)、[`MustParseAddr`](/pkg/net/netip#MustParseAddr)、[`MustParseAddrPort`](/pkg/net/netip#MustParseAddrPort)、[`MustParsePrefix`](/pkg/net/netip#MustParsePrefix)、[`ParseAddr`](/pkg/net/netip#ParseAddr)、[`ParseAddrPort`](/pkg/net/netip#ParseAddrPort)、[`ParsePrefix`](/pkg/net/netip#ParsePrefix)、[`PrefixFrom`](/pkg/net/netip#PrefixFrom)。

[`net`](/pkg/net/) 包中新增了与现有方法功能类似的方法，但返回的是 `netip.AddrPort`，而非更重量级的 [`net.IP`](/pkg/net/#IP) 或 [`*net.UDPAddr`](/pkg/net/#UDPAddr) 类型：
[`Resolver.LookupNetIP`](/pkg/net/#Resolver.LookupNetIP)、[`UDPConn.ReadFromUDPAddrPort`](/pkg/net/#UDPConn.ReadFromUDPAddrPort)、[`UDPConn.ReadMsgUDPAddrPort`](/pkg/net/#UDPConn.ReadMsgUDPAddrPort)、[`UDPConn.WriteToUDPAddrPort`](/pkg/net/#UDPConn.WriteToUDPAddrPort)、[`UDPConn.WriteMsgUDPAddrPort`](/pkg/net/#UDPConn.WriteMsgUDPAddrPort)。
这些新增的 `UDPConn` 方法支持无内存分配的 I/O 操作。

`net` 包现在还包含用于在现有 [`TCPAddr`](/pkg/net/#TCPAddr)/[`UDPAddr`](/pkg/net/#UDPAddr) 类型与 `netip.AddrPort` 之间进行转换的函数和方法：
[`TCPAddrFromAddrPort`](/pkg/net/#TCPAddrFromAddrPort)、[`UDPAddrFromAddrPort`](/pkg/net/#UDPAddrFromAddrPort)、[`TCPAddr.AddrPort`](/pkg/net/#TCPAddr.AddrPort)、[`UDPAddr.AddrPort`](/pkg/net/#UDPAddr.AddrPort)。

### 客户端默认禁用 TLS 1.0 和 1.1 {#tls10}

<!-- CL 359779, golang.org/issue/45428 -->
如果未设置 [`Config.MinVersion`](/pkg/crypto/tls/#Config.MinVersion)，对于客户端连接，它现在默认为 TLS 1.2。任何安全更新的服务器预计都支持 TLS 1.2，且自 2020 年起，浏览器已强制要求支持。通过将 `Config.MinVersion` 设置为 `VersionTLS10`，仍然可以支持 TLS 1.0 和 1.1。服务器端的默认值保持不变，仍为 TLS 1.0。

可以通过设置环境变量 `GODEBUG=tls10default=1` 将默认值暂时回退到 TLS 1.0。此选项将在 Go 1.19 中移除。

### 拒绝 SHA-1 证书 {#sha1}

<!-- CL 359777, golang.org/issue/41682 -->
`crypto/x509` 现在将拒绝使用 SHA-1 哈希函数签名的证书。这不适用于自签名的根证书。针对 SHA-1 的实际攻击[自 2017 年以来已被证明可行](https://shattered.io/)，且自 2015 年起，受公众信任的证书颁发机构已不再签发 SHA-1 证书。

可以通过设置环境变量 `GODEBUG=x509sha1=1` 暂时回退此行为。此选项将在未来的版本中移除。

### 标准库的次要变更 {#minor_library_changes}

一如既往，根据 Go 1 的[兼容性承诺](/doc/go1compat)，标准库进行了一些次要的变更和更新。

#### [bufio](/pkg/bufio/)

<!-- CL 345569 -->
新增的 [`Writer.AvailableBuffer`](/pkg/bufio#Writer.AvailableBuffer) 方法返回一个可能具有非空容量的空缓冲区（buffer），用于类似追加（append）的 API。追加后，该缓冲区可以传递给后续的 `Write` 调用，并可能避免任何复制操作。

<!-- CL 345570 -->
[`Reader.Reset`](/pkg/bufio#Reader.Reset) 和 [`Writer.Reset`](/pkg/bufio#Writer.Reset) 方法现在在对缓冲区为 `nil` 的对象调用时，将使用默认缓冲区大小。

<!-- bufio -->

#### [bytes](/pkg/bytes/)

<!-- CL 351710 -->
新增的 [`Cut`](/pkg/bytes/#Cut) 函数围绕分隔符切分 `[]byte`。它可以替代并简化许多对 [`Index`](/pkg/bytes/#Index)、[`IndexByte`](/pkg/bytes/#IndexByte)、[`IndexRune`](/pkg/bytes/#IndexRune) 和 [`SplitN`](/pkg/bytes/#SplitN) 的常见用法。

<!-- CL 323318, CL 332771 -->
[`Trim`](/pkg/bytes/#Trim)、[`TrimLeft`](/pkg/bytes/#TrimLeft) 和 [`TrimRight`](/pkg/bytes/#TrimRight) 现在无需内存分配，特别是对于小型 ASCII 切割集（cutsets），速度可提升多达 10 倍。

<!-- CL 359485 -->
[`Title`](/pkg/bytes/#Title) 函数现已弃用。它无法处理 Unicode 标点符号和特定语言的大小写规则，其功能已被 [golang.org/x/text/cases](https://golang.org/x/text/cases) 包取代。

<!-- bytes -->

#### [crypto/elliptic](/pkg/crypto/elliptic/)<!-- CL 320071, CL 320072, CL 320074, CL 361402, CL 360014 -->
[`P224`](/pkg/crypto/elliptic#P224)、[`P384`](/pkg/crypto/elliptic#P384) 和 [`P521`](/pkg/crypto/elliptic#P521) 曲线实现现在均由 [addchain](https://github.com/mmcloughlin/addchain) 和 [fiat-crypto](https://github.com/mit-plv/fiat-crypto) 项目生成的代码提供支持，其中 fiat-crypto 基于经形式化验证的算术运算模型。它们现在使用了更安全的完整公式和内部 API。P-224 和 P-384 的性能提升了约四倍。所有特定曲线实现现在均为常量时间实现。

对无效曲线点（即 `IsOnCurve` 方法返回 false 的点，且永远不会由 [`Unmarshal`](/pkg/crypto/elliptic#Unmarshal) 或操作有效点的 `Curve` 方法返回）的操作始终属于未定义行为，可能导致密钥恢复攻击，并且现在不受新后端支持。如果向 `P224`、`P384` 或 `P521` 方法提供了无效点，该方法现在将返回一个随机点。在未来版本中，该行为可能会变更为显式引发恐慌。

<!-- crypto/elliptic -->

#### [crypto/tls](/pkg/crypto/tls/)

<!-- CL 325250 -->
新的 [`Conn.NetConn`](/pkg/crypto/tls/#Conn.NetConn) 方法允许访问底层的 [`net.Conn`](/pkg/net#Conn)。

<!-- crypto/tls -->

#### [crypto/x509](/pkg/crypto/x509)

<!-- CL 353132, CL 353403 -->
当使用 `nil` 的 [`VerifyOpts.Roots`](/pkg/crypto/x509/#VerifyOpts.Roots) 调用，或使用从 [`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool) 返回的根证书池时，[`Certificate.Verify`](/pkg/crypto/x509/#Certificate.Verify) 现在在 macOS 和 iOS 上会使用平台 API 来验证证书有效性。

<!-- CL 353589 -->
[`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool) 现在在 Windows 上可用。

在 Windows、macOS 和 iOS 上，当 [`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool) 返回的 [`CertPool`](/pkg/crypto/x509/#CertPool) 被添加了额外的证书时，[`Certificate.Verify`](/pkg/crypto/x509/#Certificate.Verify) 将执行两次验证：一次使用平台验证器 API 和系统根证书，另一次使用 Go 验证器和额外的根证书。平台验证器 API 返回的证书链将具有更高的优先级。

[`CertPool.Subjects`](/pkg/crypto/x509/#CertPool.Subjects) 已弃用。在 Windows、macOS 和 iOS 上，[`SystemCertPool`](/pkg/crypto/x509/#SystemCertPool) 返回的 [`CertPool`](/pkg/crypto/x509/#CertPool) 在 `Subjects` 返回的切片中将不包含系统根证书，因为静态列表无法恰当地表示平台策略，并且平台 API 可能根本无法提供此信息。

对使用依赖于 MD5 哈希（`MD5WithRSA`）的签名算法签署证书的支持可能在 Go 1.19 中被移除。

#### [debug/dwarf](/pkg/debug/dwarf/)

<!-- CL 380714 -->
[`StructField`](/pkg/debug/dwarf#StructField) 和 [`BasicType`](/pkg/debug/dwarf#BasicType) 结构体现在都有一个 `DataBitOffset` 字段，如果存在 `DW_AT_data_bit_offset` 属性，则该字段保存其值。

#### [debug/elf](/pkg/debug/elf/)

<!-- CL 352829 -->
新增了 [`R_PPC64_RELATIVE`](/pkg/debug/elf/#R_PPC64_RELATIVE) 常量。

<!-- debug/elf -->

#### [debug/plan9obj](/pkg/debug/plan9obj/)

<!-- CL 350229 -->
如果文件没有符号节，[File.Symbols](/pkg/debug/plan9obj#File.Symbols) 方法现在会返回新的导出错误值 [ErrNoSymbols](/pkg/debug/plan9obj#ErrNoSymbols)。

<!-- debug/plan9obj -->

#### [embed](/pkg/embed/)

<!-- CL 359413 -->
[`go:embed`](/pkg/embed#hdr-Directives) 指令现在可以以 `all:` 开头，以包含名称以点号或下划线开头的文件。

<!-- debug/plan9obj -->

#### [go/ast](/pkg/go/ast/)

<!-- https://golang.org/issue/47781, CL 325689, CL 327149, CL 348375, CL 348609 -->
根据提案 [向 go/ast 和 go/token 添加对参数化函数和类型的支持](https://go.googlesource.com/proposal/+/master/design/47781-parameterized-go-ast.md)，对 [`go/ast`](/pkg/go/ast) 包进行了以下补充：

  - [`FuncType`](/pkg/go/ast/#FuncType) 和 [`TypeSpec`](/pkg/go/ast/#TypeSpec) 节点新增了 `TypeParams` 字段，用于保存类型参数（如果存在）。
  - 新的表达式节点 [`IndexListExpr`](/pkg/go/ast/#IndexListExpr) 表示具有多个索引的索引表达式，用于具有多个显式类型参数的函数和类型实例化。

#### [go/constant](/pkg/go/constant/)

<!-- https://golang.org/issue/46211, CL 320491 -->
新的 [`Kind.String`](/pkg/go/constant/#Kind.String) 方法返回接收器 kind 的可读名称。

#### [go/token](/pkg/go/token/)

<!-- https://golang.org/issue/47781, CL 324992 -->
根据提案 [向 go/ast 和 go/token 添加对参数化函数和类型的支持](https://go.googlesource.com/proposal/+/master/design/47781-parameterized-go-ast.md)，新增了常量 [`TILDE`](/pkg/go/token/#TILDE)，表示 `~` 标记。

#### [go/types](/pkg/go/types/)

<!-- https://golang.org/issue/46648 -->
新的 [`Config.GoVersion`](/pkg/go/types/#Config.GoVersion) 字段设置可接受的 Go 语言版本。

<!-- https://golang.org/issue/47916 -->
根据提案 [向 go/types 添加对类型参数的支持](https://go.googlesource.com/proposal/+/master/design/47916-parameterized-go-types.md)，对 [`go/types`](/pkg/go/types) 包进行了以下补充：-   新增了用于表示类型参数的类型 [`TypeParam`](/pkg/go/types/#TypeParam)、工厂函数 [`NewTypeParam`](/pkg/go/types/#NewTypeParam) 及相关方法。
-   新增了类型 [`TypeParamList`](/pkg/go/types/#TypeParamList)，用于持有类型参数列表。
-   新增了类型 [`TypeList`](/pkg/go/types/#TypeList)，用于持有类型列表。
-   新增了工厂函数 [`NewSignatureType`](/pkg/go/types/#NewSignatureType)，用于分配一个带有（接收器或函数）类型参数的 [`Signature`](/pkg/go/types/#Signature)。为了访问这些类型参数，`Signature` 类型新增了两个方法 [`Signature.RecvTypeParams`](/pkg/go/types/#Signature.RecvTypeParams) 和 [`Signature.TypeParams`](/pkg/go/types/#Signature.TypeParams)。
-   [`Named`](/pkg/go/types/#Named) 类型新增了四个方法：[`Named.Origin`](/pkg/go/types/#Named.Origin) 用于获取实例化类型的原始参数化类型；[`Named.TypeArgs`](/pkg/go/types/#Named.TypeArgs) 和 [`Named.TypeParams`](/pkg/go/types/#Named.TypeParams) 用于获取实例化或参数化类型的类型实参或类型参数；[`Named.SetTypeParams`](/pkg/go/types/#Named.TypeParams) 用于设置类型参数（例如，在导入命名类型时，由于可能的循环依赖，无法同时分配命名类型和设置类型参数）。
-   [`Interface`](/pkg/go/types/#Interface) 类型新增了四个方法：[`Interface.IsComparable`](/pkg/go/types/#Interface.IsComparable) 和 [`Interface.IsMethodSet`](/pkg/go/types/#Interface.IsMethodSet) 用于查询接口定义的类型集的属性；[`Interface.MarkImplicit`](/pkg/go/types/#Interface.MarkImplicit) 和 [`Interface.IsImplicit`](/pkg/go/types/#Interface.IsImplicit) 用于设置和测试该接口是否为围绕类型约束字面量的隐式接口。
-   新增了用于表示接口中类型集的类型 [`Union`](/pkg/go/types/#Union) 和 [`Term`](/pkg/go/types/#Term)，工厂函数 [`NewUnion`](/pkg/go/types/#NewUnion) 和 [`NewTerm`](/pkg/go/types/#NewTerm)，以及相关方法。
-   新增了函数 [`Instantiate`](/pkg/go/types/#Instantiate)，用于实例化参数化类型。
-   新增的 [`Info.Instances`](/pkg/go/types/#Info.Instances) 映射通过新的 [`Instance`](/pkg/go/types/#Instance) 类型记录了函数和类型的实例化。
-   <!-- CL 342671 -->
    新增了用于表示与类型实参相关错误的类型 [`ArgumentError`](/pkg/go/types/#ArgumentError) 及相关方法。
-   <!-- CL 353089 -->
    新增了类型 [`Context`](/pkg/go/types/#Context) 和工厂函数 [`NewContext`](/pkg/go/types/#NewContext)，以便通过新的 [`Config.Context`](/pkg/go/types/#Config.Context) 字段，促进跨类型检查包的相同类型实例共享。

谓词函数 [`AssignableTo`](/pkg/go/types/#AssignableTo)、[`ConvertibleTo`](/pkg/go/types/#ConvertibleTo)、[`Implements`](/pkg/go/types/#Implements)、[`Identical`](/pkg/go/types/#Identical)、[`IdenticalIgnoreTags`](/pkg/go/types/#IdenticalIgnoreTags) 和 [`AssertableTo`](/pkg/go/types/#AssertableTo) 现在也能处理是或包含广义接口（即在Go代码中仅能用作类型约束的接口）的参数。请注意，对于未实例化的泛型类型参数，`AssignableTo`、`ConvertibleTo`、`Implements` 和 `AssertableTo` 的行为是未定义的，并且如果第一个参数是广义接口，`AssertableTo` 的行为也是未定义的。

#### [html/template](/pkg/html/template/)

<!-- CL 321491 -->
在 `range` 管道中，新增的 `{{break}}` 命令将提前结束循环，新增的 `{{continue}}` 命令将立即开始下一次循环迭代。

<!-- CL 321490 -->
`and` 函数不再总是计算所有参数；它会在第一个计算结果为 `false` 的参数后停止计算。类似地，`or` 函数现在会在第一个计算结果为 `true` 的参数后停止计算。如果任何参数是函数调用，这将产生区别。

<!-- html/template -->

#### [image/draw](/pkg/image/draw/)

<!-- CL 340049 -->
`Draw` 和 `DrawMask` 的回退实现（当参数不是最常见图像类型时使用）现在速度更快了，前提是这些参数实现了 Go 1.17 中添加的可选接口 [`draw.RGBA64Image`](/pkg/image/draw/#RGBA64Image) 和 [`image.RGBA64Image`](/pkg/image/#RGBA64Image)。

<!-- image/draw -->

#### [net](/pkg/net/)

<!-- CL 340261 -->
[`net.Error.Temporary`](/pkg/net#Error) 已被弃用。

<!-- net -->

#### [net/http](/pkg/net/http/)

<!-- CL 330852 -->
在 WebAssembly 目标平台上，[`Transport`](/pkg/net/http/#Transport) 中的 `Dial`、`DialContext`、`DialTLS` 和 `DialTLSContext` 方法字段现在（如果已指定）将被正确用于发出 HTTP 请求。

<!-- CL 338590 -->
新增的 [`Cookie.Valid`](/pkg/net/http#Cookie.Valid) 方法报告 cookie 是否有效。

<!-- CL 346569 -->
新增的 [`MaxBytesHandler`](/pkg/net/http#MaxBytesHandler) 函数创建一个 `Handler`，该处理器使用 [`MaxBytesReader`](/pkg/net/http#MaxBytesReader) 来包装其 `ResponseWriter` 和 `Request.Body`。

<!-- CL 359634, CL 360381, CL 362735 -->
当查询包含非 ASCII 字符的域名时，Unicode 到 ASCII 的转换现在是根据 [Unicode IDNA 兼容性处理](https://unicode.org/reports/tr46/) 标准 (UTS #46) 中定义的非过渡处理进行的。四个不同符文的解释发生了变化：ß、ς、零宽连接符 U+200D 和零宽非连接符 U+200C。非过渡处理与大多数应用程序和网络浏览器一致。

<!-- net/http -->

#### [os/user](/pkg/os/user/)<!-- CL 330753 -->
[`User.GroupIds`](/pkg/os/user#User.GroupIds)
在 cgo 不可用时，现在使用 Go 原生实现。

<!-- os/user -->

#### [reflect](/pkg/reflect/)

<!-- CL 356049, CL 320929 -->
新增的
[`Value.SetIterKey`](/pkg/reflect/#Value.SetIterKey)
和 [`Value.SetIterValue`](/pkg/reflect/#Value.SetIterValue)
方法使用 map 迭代器作为源来设置一个 Value。它们等效于
`Value.Set(iter.Key())` 和 `Value.Set(iter.Value())`，但
分配次数更少。

<!-- CL 350691 -->
新增的
[`Value.UnsafePointer`](/pkg/reflect/#Value.UnsafePointer)
方法以 [`unsafe.Pointer`](/pkg/unsafe/#Pointer) 的形式返回 Value 的值。
这允许调用者从 [`Value.UnsafeAddr`](/pkg/reflect/#Value.UnsafeAddr)
和 [`Value.Pointer`](/pkg/reflect/#Value.Pointer) 迁移过来，
从而无需在调用处执行 uintptr 到 unsafe.Pointer 的转换（这是 unsafe.Pointer 规则所要求的）。

<!-- CL 321891 -->
新增的
[`MapIter.Reset`](/pkg/reflect/#MapIter.Reset)
方法更改其接收器以迭代不同的 map。
使用
[`MapIter.Reset`](/pkg/reflect/#MapIter.Reset)
可以实现无分配地迭代多个 map。

<!-- CL 352131 -->
为 [`Value`](/pkg/reflect#Value) 增加了一系列方法 (
[`Value.CanInt`](/pkg/reflect#Value.CanInt)、
[`Value.CanUint`](/pkg/reflect#Value.CanUint)、
[`Value.CanFloat`](/pkg/reflect#Value.CanFloat)、
[`Value.CanComplex`](/pkg/reflect#Value.CanComplex)
)
，用于测试转换是否安全。

<!-- CL 357962 -->
增加了 [`Value.FieldByIndexErr`](/pkg/reflect#Value.FieldByIndexErr) 以避免在
[`Value.FieldByIndex`](/pkg/reflect#Value.FieldByIndex) 中
当遍历指向嵌入 struct 的 nil 指针时发生的 panic。

<!-- CL 341333 -->
[`reflect.Ptr`](/pkg/reflect#Ptr) 和
[`reflect.PtrTo`](/pkg/reflect#PtrTo)
已分别重命名为
[`reflect.Pointer`](/pkg/reflect#Pointer) 和
[`reflect.PointerTo`](/pkg/reflect#PointerTo)，
以便与 reflect 包的其余部分保持一致。
旧名称将继续可用，但在未来的 Go 版本中将被弃用。

<!-- reflect -->

#### [regexp](/pkg/regexp/)

<!-- CL 354569 -->
[`regexp`](/pkg/regexp/)
现在将 UTF-8 字符串中的每个无效字节视为 `U+FFFD`。

<!-- regexp -->

#### [runtime/debug](/pkg/runtime/debug/)

<!-- CL 354569 -->
[`BuildInfo`](/pkg/runtime/debug#BuildInfo)
struct 新增了两个字段，包含关于二进制文件构建方式的附加信息：

  - [`GoVersion`](/pkg/runtime/debug#BuildInfo.GoVersion)
    保存用于构建二进制文件的 Go 版本。
  - [`Settings`](/pkg/runtime/debug#BuildInfo.Settings)
    是一个 [`BuildSettings`](/pkg/runtime/debug#BuildSettings) struct 切片，
    保存描述构建过程的键/值对。

<!-- runtime/debug -->

#### [runtime/pprof](/pkg/runtime/pprof/)

<!-- CL 324129 -->
CPU 分析器现在在 Linux 上使用每线程计时器。这提高了
分析可观察到的最大 CPU 使用率，并减少了一些形式的
偏差。

<!-- runtime/pprof -->

#### [strconv](/pkg/strconv/)

<!-- CL 343877 -->
[`strconv.Unquote`](/pkg/strconv/#strconv.Unquote)
现在会拒绝 Unicode 代理项一半（surrogate halves）。

<!-- strconv -->

#### [strings](/pkg/strings/)

<!-- CL 351710 -->
新增的 [`Cut`](/pkg/strings/#Cut) 函数
围绕分隔符切片一个 `string`。它可以替代并简化许多常见用途，
例如使用
[`Index`](/pkg/strings/#Index)、
[`IndexByte`](/pkg/strings/#IndexByte)、
[`IndexRune`](/pkg/strings/#IndexRune)
和 [`SplitN`](/pkg/strings/#SplitN)。

<!-- CL 345849 -->
新增的 [`Clone`](/pkg/strings/#Clone) 函数复制输入 `string`，
且返回的克隆 `string` 不会引用输入字符串的内存。

<!-- CL 323318, CL 332771 -->
[`Trim`](/pkg/strings/#Trim)、[`TrimLeft`](/pkg/strings/#TrimLeft)、
和 [`TrimRight`](/pkg/strings/#TrimRight) 现在是零分配的，尤其对于
小型 ASCII 字符集，速度提高了 10 倍。

<!-- CL 359485 -->
[`Title`](/pkg/strings/#Title) 函数现已弃用。它无法
处理 Unicode 标点符号和特定于语言的大写规则，
已被 [golang.org/x/text/cases](https://golang.org/x/text/cases) 包取代。

<!-- strings -->

#### [sync](/pkg/sync/)

<!-- CL 319769 -->
新增的方法
[`Mutex.TryLock`](/pkg/sync#Mutex.TryLock)、
[`RWMutex.TryLock`](/pkg/sync#RWMutex.TryLock) 和
[`RWMutex.TryRLock`](/pkg/sync#RWMutex.TryRLock)，
如果锁当前未被持有，则获取该锁。

<!-- sync -->

#### [syscall](/pkg/syscall/)

<!-- CL 336550 -->
为 Windows 引入了新函数 [`SyscallN`](/pkg/syscall/?GOOS=windows#SyscallN)，
允许使用任意数量的参数进行调用。因此，
[`Syscall`](/pkg/syscall/?GOOS=windows#Syscall)、
[`Syscall6`](/pkg/syscall/?GOOS=windows#Syscall6)、
[`Syscall9`](/pkg/syscall/?GOOS=windows#Syscall9)、
[`Syscall12`](/pkg/syscall/?GOOS=windows#Syscall12)、
[`Syscall15`](/pkg/syscall/?GOOS=windows#Syscall15) 和
[`Syscall18`](/pkg/syscall/?GOOS=windows#Syscall18) 已被弃用，推荐使用
[`SyscallN`](/pkg/syscall/?GOOS=windows#SyscallN)。

<!-- CL 355570 -->
[`SysProcAttr.Pdeathsig`](/pkg/syscall/?GOOS=freebsd#SysProcAttr.Pdeathsig)
现在在 FreeBSD 中受支持。

<!-- syscall -->

#### [syscall/js](/pkg/syscall/js/)

<!-- CL 356430 -->
`Wrapper` 接口已被移除。

<!-- syscall/js -->

#### [testing](/pkg/testing/)

<!-- CL 343883 -->
`-run` 和 `-bench` 参数中 `/` 的优先级已提高。`A/B|C/D` 过去被视为
`A/(B|C)/D`，现在被视为
`(A/B)|(C/D)`。

<!-- CL 356669 -->
如果 `-run` 选项未选择任何测试，则
`-count` 选项将被忽略。在少数情况下，如果测试函数每次运行时所运行的子测试集发生变化，
这可能会改变现有测试的行为。<!-- CL 251441 -->
新的 [`testing.F`](/pkg/testing#F) 类型
已被上述新的[模糊测试支持](#fuzzing)所使用。测试现在也支持命令行选项
`-test.fuzz`、`-test.fuzztime` 和 `-test.fuzzminimizetime`。

<!-- testing -->

#### [text/template](/pkg/text/template/)

<!-- CL 321491 -->
在 `range` 管道中，新的
`{{break}}` 命令将提前结束循环，而新的
`{{continue}}` 命令将立即开始下一次循环迭代。

<!-- CL 321490 -->
`and` 函数不再总是对所有参数求值；它会在第一个求值为 false 的参数后停止求值。
类似地，`or` 函数现在会在第一个求值为 true 的参数后停止求值。如果任何参数是函数调用，这会产生区别。

<!-- text/template -->

#### [text/template/parse](/pkg/text/template/parse/)

<!-- CL 321491 -->
该包通过新的常量
[`NodeBreak`](/pkg/text/template/parse#NodeBreak)
和新的类型
[`BreakNode`](/pkg/text/template/parse#BreakNode)，
支持新的 [text/template](/pkg/text/template/) 和
[html/template](/pkg/html/template/)
`{{break}}` 命令；类似地，通过新的常量
[`NodeContinue`](/pkg/text/template/parse#NodeContinue)
和新的类型
[`ContinueNode`](/pkg/text/template/parse#ContinueNode)，
支持新的 `{{continue}}` 命令。

<!-- text/template -->

#### [unicode/utf8](/pkg/unicode/utf8/)

<!-- CL 345571 -->
新的 [`AppendRune`](/pkg/unicode/utf8/#AppendRune) 函数将一个 `rune` 的 UTF-8 编码追加到 `[]byte` 中。

<!-- unicode/utf8 -->