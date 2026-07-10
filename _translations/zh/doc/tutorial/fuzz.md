<!--{
  "Template": true,
  "Title": "教程：模糊测试入门",
  "HideTOC": true,
  "Breadcrumb": true
}-->

本教程介绍Go语言中模糊测试的基础知识。通过模糊测试，随机数据将被输入到你的测试中，以尝试发现漏洞或导致崩溃的输入。模糊测试能够发现的漏洞示例包括SQL注入、缓冲区溢出、拒绝服务攻击以及跨站脚本攻击。

在本教程中，你将为一个简单函数编写模糊测试，运行go命令，并调试和修复代码中的问题。

如需本教程中术语的帮助，请参阅[Go模糊测试词汇表](/security/fuzz/#glossary)。

你将按以下章节逐步学习：

1. [为你的代码创建一个文件夹。](#create_folder)
2. [添加待测试代码。](#code_to_test)
3. [添加一个单元测试。](#unit_test)
4. [添加一个模糊测试。](#fuzz_test)
5. [修复两个错误。](#fix_invalid_string_error)
6. [探索更多资源。](#conclusion)

**注意：** 其他教程请参阅[教程列表](/doc/tutorial/index.html)。

**注意：** Go模糊测试目前支持一部分内置类型，列表见[Go模糊测试文档](/security/fuzz/#requirements)，未来将增加对更多内置类型的支持。

## 先决条件

- **安装Go 1.18或更高版本。** 安装说明请参见[安装Go](/doc/install)。
- **一个用于编辑代码的工具。** 你拥有的任何文本编辑器都可以使用。
- **一个命令行终端。** Go在Linux和Mac的任何终端上，以及Windows的PowerShell或cmd上都能良好运行。
- **支持模糊测试的环境。** 目前，带有覆盖率检测的Go模糊测试仅适用于AMD64和ARM64架构。

## 为你的代码创建文件夹 {#create_folder}

首先，为你要编写的代码创建一个文件夹。

1. 打开命令提示符，并切换到你的主目录。

   在Linux或Mac上：```
   $ cd
   ```在Windows上：

在命令提示符下，切换到你的主目录。```
   C:\> cd %HOMEPATH%
   ```本教程的后续部分将使用 $ 作为命令提示符。您所使用的命令在 Windows 上也同样适用。

2. 在命令提示符下，为您的代码创建一个名为 fuzz 的目录。```
   $ mkdir fuzz
   $ cd fuzz
   ```3. 创建一个模块来存放你的代码。

   运行 `go mod init` 命令，并指定新代码的模块路径。```
   $ go mod init example/fuzz
   go: creating new go.mod: module example/fuzz
   ```**注意：** 对于生产代码，你需要指定一个更符合自身需求的模块路径。更多信息，请务必参阅[管理依赖项](/doc/modules/managing-dependencies)。

接下来，你将添加一些简单的代码来反转字符串，我们稍后会对它进行fuzz测试。

## 添加待测试的代码 {#code_to_test}

在本步骤中，你将添加一个用于反转字符串的函数。

### 编写代码

1.  使用你的文本编辑器，在 `fuzz` 目录下创建一个名为 `main.go` 的文件。
2.  在 `main.go` 文件的顶部，粘贴以下包声明。```
    package main
    ```独立程序（与库相对应）始终位于 `main` 包中。

3.  在包声明下方，粘贴以下函数声明。```
    func Reverse(s string) string {
        b := []byte(s)
        for i, j := 0, len(b)-1; i {{raw "<"}} len(b)/2; i, j = i+1, j-1 {
            b[i], b[j] = b[j], b[i]
        }
        return string(b)
    }
    ```该函数接收一个 `string` 参数，逐 `字节` 循环遍历该字符串，并最终返回反转后的字符串。

_注意：_ 此代码基于 golang.org/x/example 中的 `stringutil.Reverse` 函数。

4.  在 main.go 文件顶部、包声明下方，粘贴以下 `main` 函数。该函数将初始化一个字符串，对其进行反转，打印输出结果，并重复执行此过程。```
    func main() {
        input := "The quick brown fox jumped over the lazy dog"
        rev := Reverse(input)
        doubleRev := Reverse(rev)
        fmt.Printf("original: %q\n", input)
        fmt.Printf("reversed: %q\n", rev)
        fmt.Printf("reversed again: %q\n", doubleRev)
    }
    ```该函数将执行若干次 `Reverse` 操作，并将结果输出至命令行。这有助于观察代码实际运行情况，也可用于调试目的。

5.  `main` 函数使用了 fmt 包，因此需要先导入该包。

    代码的前几行应如下所示：```
    package main

    import "fmt"
    ```### 运行代码

在包含 `main.go` 文件的目录下，通过命令行运行该代码。```
$ go run .
original: "The quick brown fox jumped over the lazy dog"
reversed: "god yzal eht revo depmuj xof nworb kciuq ehT"
reversed again: "The quick brown fox jumped over the lazy dog"
```你可以看到原始字符串、反转后的结果，以及再次反转后的结果——这等同于原始字符串。

既然代码已经运行，现在是时候对其进行测试了。

## 添加单元测试 {#unit_test}

在这一步中，你将为 `Reverse` 函数编写一个基础的单元测试。

### 编写代码

1.  使用文本编辑器，在 `fuzz` 目录下创建一个名为 `reverse_test.go` 的文件。
2.  将以下代码粘贴到 `reverse_test.go` 文件中。```
   package main

   import (
       "testing"
   )

   func TestReverse(t *testing.T) {
       testcases := []struct {
           in, want string
       }{
           {"Hello, world", "dlrow ,olleH"},
           {" ", " "},
           {"!12345", "54321!"},
       }
       for _, tc := range testcases {
           rev := Reverse(tc.in)
           if rev != tc.want {
                   t.Errorf("Reverse: %q, want %q", rev, tc.want)
           }
       }
   }
   ```这个简单的测试将验证列出的输入字符串能否被正确反转。

### 运行代码

使用 `go test` 命令运行单元测试。```
$ go test
PASS
ok      example/fuzz  0.013s
```接下来，你将把这个单元测试改为模糊测试。

## 添加模糊测试 {#fuzz_test}

单元测试存在局限性，即每个输入都必须由开发者手动添加到测试中。模糊测试的一个好处是，它能为你的代码自动生成输入，并可能发现你设计的测试用例未能覆盖的边界情况。

在本节中，你将把单元测试转换为模糊测试，从而以更少的工作量生成更多测试输入！

请注意，你可以在同一个 `*_test.go` 文件中同时保留单元测试、基准测试和模糊测试，但在本示例中，我们将把单元测试转换为模糊测试。

### 编写代码

在你的文本编辑器中，用以下模糊测试代码替换 `reverse_test.go` 文件中的单元测试。```go
func FuzzReverse(f *testing.F) {
    testcases := []string{"Hello, world", " ", "!12345"}
    for _, tc := range testcases {
        f.Add(tc)  // 使用 f.Add 来提供种子语料库
    }
    f.Fuzz(func(t *testing.T, orig string) {
        rev := Reverse(orig)
        doubleRev := Reverse(rev)
        if orig != doubleRev {
            t.Errorf("原始值: %q, 转换后的值: %q", orig, doubleRev)
        }
        if utf8.ValidString(orig) && !utf8.ValidString(rev) {
            t.Errorf("Reverse 函数产生了无效的 UTF-8 字符串 %q", rev)
        }
    })
}
```模糊测试也存在一些局限性。在单元测试中，你可以预测 `Reverse` 函数的预期输出，并验证实际输出是否符合预期。

例如，在测试用例 `Reverse("Hello, world")` 中，单元测试将返回值指定为 `"dlrow ,olleH"`。

而在进行模糊测试时，由于无法控制输入内容，你无法预测预期输出。

不过，`Reverse` 函数的某些特性可以在模糊测试中进行验证。本次模糊测试检查的两个特性是：

1.  对字符串进行两次反转后应保留原始值
2.  反转后的字符串应保持有效的UTF-8状态

请注意单元测试与模糊测试在语法上的差异：

- 函数名以 `FuzzXxx` 而非 `TestXxx` 开头，且接收 `*testing.F` 而非 `*testing.T` 参数
- 在预期出现 `t.Run` 执行语句的位置，现在使用的是 `f.Fuzz`，它接收一个模糊测试目标函数作为参数，该函数的参数为 `*testing.T` 和待模糊测试的类型。单元测试中的输入通过 `f.Add` 作为种子语料库输入提供

请确保已导入新包 `unicode/utf8`。```
package main

import (
    "testing"
    "unicode/utf8"
)
```将单元测试转换为模糊测试后，是时候再次运行测试了。

### 运行代码

1. 先在不启用模糊测试功能的情况下运行模糊测试，以确保种子输入能够通过。```
   $ go test
   PASS
   ok      example/fuzz  0.013s
   ```如果你文件中还有其他测试，只想运行模糊测试，也可以使用命令 `go test -run=FuzzReverse`。

2. 运行带模糊测试的 `FuzzReverse`，以查看是否有随机生成的字符串输入会导致失败。这需要使用带新标志 `-fuzz`（设置为参数 `Fuzz`）的 `go test` 命令执行。请复制下方的命令。```
    $ go test -fuzz=Fuzz
    ```另一个实用的标志是 `-fuzztime`，它用于限制模糊测试的运行时间。例如，在下面的测试中指定 `-fuzztime 10s` 意味着，只要没有更早发生失败，测试将在 10 秒后自动退出。如需了解其他测试标志，请参阅 cmd/go 文档中的[此章节](https://pkg.go.dev/cmd/go#hdr-Testing_flags)。

现在，运行你刚刚复制的命令。```
   $ go test -fuzz=Fuzz
   fuzz: elapsed: 0s, gathering baseline coverage: 0/3 completed
   fuzz: elapsed: 0s, gathering baseline coverage: 3/3 completed, now fuzzing with 8 workers
   fuzz: minimizing 38-byte failing input file...
   --- FAIL: FuzzReverse (0.01s)
       --- FAIL: FuzzReverse (0.00s)
           reverse_test.go:20: Reverse produced invalid UTF-8 string "\x9c\xdd"

       Failing input written to testdata/fuzz/FuzzReverse/af69258a12129d6cbba438df5d5f25ba0ec050461c116f777e77ea7c9a0d217a
       To re-run:
       go test -run=FuzzReverse/af69258a12129d6cbba438df5d5f25ba0ec050461c116f777e77ea7c9a0d217a
   FAIL
   exit status 1
   FAIL    example/fuzz  0.030s
   ```模糊测试过程中发生错误时，导致问题的输入会被写入种子语料库文件。即使不使用`-fuzz`标志，下次运行`go test`时也会自动执行该文件。要查看导致失败的输入，请用文本编辑器打开写入testdata/fuzz/FuzzReverse目录的语料库文件。您的种子语料库文件可能包含不同的字符串，但格式保持一致。```
   go test fuzz v1
   string("泃")
   ```语料库文件的第一行表示编码版本，后续每一行代表构成该语料库条目的各个类型的值。由于模糊测试目标仅接受一个输入，因此在版本信息之后只有一个值。

3. 再次运行 `go test` 命令（不添加 `-fuzz` 标志），此时将使用新生成的失败种子语料库条目：```
   $ go test
   --- FAIL: FuzzReverse (0.00s)
       --- FAIL: FuzzReverse/af69258a12129d6cbba438df5d5f25ba0ec050461c116f777e77ea7c9a0d217a (0.00s)
           reverse_test.go:20: Reverse produced invalid string
   FAIL
   exit status 1
   FAIL    example/fuzz  0.016s
   ```既然我们的测试已经失败，现在是时候进行调试了。

## 修复无效字符串错误 {#fix_invalid_string_error}

在本节中，你将调试此失败问题，并修复该缺陷。

在继续之前，你可以花些时间思考并尝试自己解决这个问题。

### 诊断错误

你可以用几种不同的方法来调试这个错误。如果你使用 VS Code 作为文本编辑器，可以[设置调试器](https://github.com/golang/vscode-go/blob/master/docs/debugging.md)来进行调查。

在本教程中，我们将在终端输出有用的调试信息。

首先，查看 [`utf8.ValidString`](https://pkg.go.dev/unicode/utf8) 的文档。```
ValidString reports whether s consists entirely of valid UTF-8-encoded runes.
```当前 `Reverse` 函数是逐字节反转字符串的，这正是问题所在。为了保留原始字符串的 UTF-8 编码码元，我们必须改为逐码元（rune）反转字符串。

为了探究为何输入（此处为中文字符 `泃`）在反转后导致 `Reverse` 函数生成无效字符串，你可以检查反转后字符串中的码元数量。

#### 编写代码

在你的文本编辑器中，将 `FuzzReverse` 内的模糊测试目标替换为以下内容。```
f.Fuzz(func(t *testing.T, orig string) {
    rev := Reverse(orig)
    doubleRev := Reverse(rev)
    t.Logf("Number of runes: orig=%d, rev=%d, doubleRev=%d", utf8.RuneCountInString(orig), utf8.RuneCountInString(rev), utf8.RuneCountInString(doubleRev))
    if orig != doubleRev {
        t.Errorf("Before: %q, after: %q", orig, doubleRev)
    }
    if utf8.ValidString(orig) && !utf8.ValidString(rev) {
        t.Errorf("Reverse produced invalid UTF-8 string %q", rev)
    }
})
```当发生错误，或使用 `-v` 参数执行测试时，这行 `t.Logf` 语句会将信息输出到命令行，这有助于你调试特定问题。

#### 运行代码

使用 `go test` 运行测试```
$ go test
--- FAIL: FuzzReverse (0.00s)
    --- FAIL: FuzzReverse/28f36ef487f23e6c7a81ebdaa9feffe2f2b02b4cddaa6252e87f69863046a5e0 (0.00s)
        reverse_test.go:16: Number of runes: orig=1, rev=3, doubleRev=1
        reverse_test.go:21: Reverse produced invalid UTF-8 string "\x83\xb3\xe6"
FAIL
exit status 1
FAIL    example/fuzz    0.598s
```整个种子语料库使用的字符串中，每个字符都是单字节的。然而，像"泃"这样的字符可能需要多个字节。因此，逐字节反转字符串会使多字节字符失效。

**注意：** 如果您对Go语言如何处理字符串感到好奇，可以阅读博客文章《Go语言中的字符串、字节、符文与字符》以深入理解。

在更好地理解该错误之后，我们需要修正`Reverse`函数中的错误。

### 修复错误

为了修正`Reverse`函数，让我们改为按`rune`（符文）遍历字符串，而不是按字节遍历。

#### 编写代码

在文本编辑器中，用以下代码替换现有的Reverse()函数：

```go
func Reverse(s string) string {
    // [待翻译: 使用 rune 遍历字符串]
    runes := []rune(s)
    // [待翻译: 反转 rune 切片]
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    // [待翻译: 将 rune 切片转换回字符串]
    return string(runes)
}
``````
func Reverse(s string) string {
    r := []rune(s)
    for i, j := 0, len(r)-1; i {{raw "<"}} len(r)/2; i, j = i+1, j-1 {
        r[i], r[j] = r[j], r[i]
    }
    return string(r)
}
```关键区别在于 `Reverse` 函数现在遍历字符串中的每个 `rune`，而不是每个 `byte`。请注意，这只是一个示例，并未正确处理[组合字符](https://en.wikipedia.org/wiki/Combining_character)。

#### 运行代码

1. 使用 `go test` 运行测试```
   $ go test
   PASS
   ok      example/fuzz  0.016s
   ```测试现在通过了！

2. 再次使用 `go test -fuzz` 进行模糊测试，看看是否还有其他错误。```
   $ go test -fuzz=Fuzz
   fuzz: elapsed: 0s, gathering baseline coverage: 0/37 completed
   fuzz: minimizing 506-byte failing input file...
   fuzz: elapsed: 0s, gathering baseline coverage: 5/37 completed
   --- FAIL: FuzzReverse (0.02s)
       --- FAIL: FuzzReverse (0.00s)
           reverse_test.go:33: Before: "\x91", after: "�"

       Failing input written to testdata/fuzz/FuzzReverse/1ffc28f7538e29d79fce69fef20ce5ea72648529a9ca10bea392bcff28cd015c
       To re-run:
       go test -run=FuzzReverse/1ffc28f7538e29d79fce69fef20ce5ea72648529a9ca10bea392bcff28cd015c
   FAIL
   exit status 1
   FAIL    example/fuzz  0.032s
   ```我们可以看到，字符串经过两次反转后与原始字符串不同。这次输入本身是无效的 Unicode。如果我们使用字符串进行模糊测试，这怎么可能发生？

让我们再次调试。

## 修复双重反转错误 {#fix_double_reverse_error}

在本节中，你将调试双重反转失败的问题并修复错误。

在继续之前，你可以花一些时间自己思考并尝试修复这个问题。

### 诊断错误

和之前一样，有几种方法可以调试此失败。在这种情况下，使用[调试器](https://github.com/golang/vscode-go/blob/master/docs/debugging.md)会是一个很好的方法。

在本教程中，我们将在 `Reverse` 函数中记录有用的调试信息。

仔细观察反转后的字符串以发现错误。在 Go 中，[字符串是字节的只读切片](/blog/strings)，并且可以包含无效的 UTF-8 字节。原始字符串是一个包含一个字节 `'\x91'` 的字节切片。当输入字符串被设置为 `[]rune` 时，Go 会将字节切片编码为 UTF-8，并用 UTF-8 字符 `�` 替换该字节。当我们比较替换后的 UTF-8 字符和输入字节切片时，它们明显不相等。

#### 编写代码

1.  在你的文本编辑器中，用以下内容替换 `Reverse` 函数。```
   func Reverse(s string) string {
       fmt.Printf("input: %q\n", s)
       r := []rune(s)
       fmt.Printf("runes: %q\n", r)
       for i, j := 0, len(r)-1; i {{raw "<"}} len(r)/2; i, j = i+1, j-1 {
           r[i], r[j] = r[j], r[i]
       }
       return string(r)
   }
   ```这将帮助我们理解在将字符串转换为 rune 切片时出了什么问题。

#### 运行代码

这次，我们只想运行失败的测试以检查日志。为此，我们将使用 `go test -run`。

要运行 FuzzXxx/testdata 中的特定语料库条目，您可以将 {FuzzTestName}/{filename} 提供给 `-run`。这在调试时很有帮助。
在这种情况下，将 `-run` 标志设置为失败测试的确切哈希值。
从您的终端复制并粘贴这个唯一的哈希值；
它将与下面显示的不同。```
$ go test -run=FuzzReverse/28f36ef487f23e6c7a81ebdaa9feffe2f2b02b4cddaa6252e87f69863046a5e0
input: "\x91"
runes: ['�']
input: "�"
runes: ['�']
--- FAIL: FuzzReverse (0.00s)
    --- FAIL: FuzzReverse/28f36ef487f23e6c7a81ebdaa9feffe2f2b02b4cddaa6252e87f69863046a5e0 (0.00s)
        reverse_test.go:16: Number of runes: orig=1, rev=1, doubleRev=1
        reverse_test.go:18: Before: "\x91", after: "�"
FAIL
exit status 1
FAIL    example/fuzz    0.145s
```知道输入是无效的Unicode，让我们来修复`Reverse`函数中的错误。

### 修复错误

为了解决这个问题，如果`Reverse`的输入不是有效的UTF-8，我们将返回一个错误。

#### 编写代码

1. 在文本编辑器中，用以下代码替换现有的`Reverse`函数。```
   func Reverse(s string) (string, error) {
       if !utf8.ValidString(s) {
           return s, errors.New("input is not valid UTF-8")
       }
       r := []rune(s)
       for i, j := 0, len(r)-1; i {{raw "<"}} len(r)/2; i, j = i+1, j-1 {
           r[i], r[j] = r[j], r[i]
       }
       return string(r), nil
   }
   ```此更改将在输入字符串包含无效 UTF-8 字符时返回错误。

1.  由于 `Reverse` 函数现在会返回错误，请修改 `main` 函数以忽略额外的错误值。将现有的 `main` 函数替换为以下内容。```
   func main() {
       input := "The quick brown fox jumped over the lazy dog"
       rev, revErr := Reverse(input)
       doubleRev, doubleRevErr := Reverse(rev)
       fmt.Printf("original: %q\n", input)
       fmt.Printf("reversed: %q, err: %v\n", rev, revErr)
       fmt.Printf("reversed again: %q, err: %v\n", doubleRev, doubleRevErr)
   }
   ```对 `Reverse` 的这些调用应返回空错误，因为输入的字符串是有效的 UTF-8。

1. 您需要导入 `errors` 和 `unicode/utf8` 包。main.go 中的导入语句应如下所示：

```go
import (
    "errors"
    "fmt"
    "unicode/utf8"
)
``````
   import (
       "errors"
       "fmt"
       "unicode/utf8"
   )
   ```1. 修改 reverse_test.go 文件，添加错误检查逻辑，并在通过返回生成错误时跳过测试。```go
   func FuzzReverse(f *testing.F) {
       testcases := []string {"Hello, world", " ", "!12345"}
       for _, tc := range testcases {
           f.Add(tc)  // 使用 f.Add 来提供一个种子语料库
       }
       f.Fuzz(func(t *testing.T, orig string) {
           rev, err1 := Reverse(orig)
           if err1 != nil {
               return
           }
           doubleRev, err2 := Reverse(rev)
           if err2 != nil {
                return
           }
           if orig != doubleRev {
               t.Errorf("Before: %q, after: %q", orig, doubleRev)
           }
           if utf8.ValidString(orig) && !utf8.ValidString(rev) {
               t.Errorf("Reverse produced invalid UTF-8 string %q", rev)
           }
       })
   }
   ```此外，你也可以调用`t.Skip()`来停止当前模糊测试输入的执行，而不直接返回。

#### 运行代码

1. 使用`go test`运行测试```
   $ go test
   PASS
   ok      example/fuzz  0.019s
   ```2.  使用`go test -fuzz=Fuzz`执行模糊测试，经过几秒钟后，按`ctrl-C`停止测试。模糊测试会持续运行直到遇到失败的输入，除非您使用`-fuzztime`参数指定时长。默认情况下，如果没有发生失败，测试将一直持续运行，可通过`ctrl-C`中断进程。```
   $ go test -fuzz=Fuzz
   fuzz: elapsed: 0s, gathering baseline coverage: 0/38 completed
   fuzz: elapsed: 0s, gathering baseline coverage: 38/38 completed, now fuzzing with 4 workers
   fuzz: elapsed: 3s, execs: 86342 (28778/sec), new interesting: 2 (total: 35)
   fuzz: elapsed: 6s, execs: 193490 (35714/sec), new interesting: 4 (total: 37)
   fuzz: elapsed: 9s, execs: 304390 (36961/sec), new interesting: 4 (total: 37)
   ...
   fuzz: elapsed: 3m45s, execs: 7246222 (32357/sec), new interesting: 8 (total: 41)
   ^Cfuzz: elapsed: 3m48s, execs: 7335316 (31648/sec), new interesting: 8 (total: 41)
   PASS
   ok      example/fuzz  228.000s
   ```3. 使用 `go test -fuzz=Fuzz -fuzztime 30s` 进行模糊测试，如果未发现失败，该命令将在 30 秒后自动退出。```
   $ go test -fuzz=Fuzz -fuzztime 30s
   fuzz: elapsed: 0s, gathering baseline coverage: 0/5 completed
   fuzz: elapsed: 0s, gathering baseline coverage: 5/5 completed, now fuzzing with 4 workers
   fuzz: elapsed: 3s, execs: 80290 (26763/sec), new interesting: 12 (total: 12)
   fuzz: elapsed: 6s, execs: 210803 (43501/sec), new interesting: 14 (total: 14)
   fuzz: elapsed: 9s, execs: 292882 (27360/sec), new interesting: 14 (total: 14)
   fuzz: elapsed: 12s, execs: 371872 (26329/sec), new interesting: 14 (total: 14)
   fuzz: elapsed: 15s, execs: 517169 (48433/sec), new interesting: 15 (total: 15)
   fuzz: elapsed: 18s, execs: 663276 (48699/sec), new interesting: 15 (total: 15)
   fuzz: elapsed: 21s, execs: 771698 (36143/sec), new interesting: 15 (total: 15)
   fuzz: elapsed: 24s, execs: 924768 (50990/sec), new interesting: 16 (total: 16)
   fuzz: elapsed: 27s, execs: 1082025 (52427/sec), new interesting: 17 (total: 17)
   fuzz: elapsed: 30s, execs: 1172817 (30281/sec), new interesting: 17 (total: 17)
   fuzz: elapsed: 31s, execs: 1172817 (0/sec), new interesting: 17 (total: 17)
   PASS
   ok      example/fuzz  31.025s
   ```模糊测试通过！

除了 `-fuzz` 标志外，`go test` 还添加了几个新标志，详情可在[文档](/security/fuzz/#custom-settings)中查看。

更多关于模糊测试输出中使用的术语信息，请参阅 [Go 模糊测试](/security/fuzz/#command-line-output)。例如，“new interesting”（新的有趣项）指的是能够扩展现有模糊测试语料库代码覆盖率的输入。在模糊测试开始时，“new interesting”输入的数量预计会急剧增加，随着发现新的代码路径会多次出现峰值，然后随时间逐渐减少。

## 结论 {#conclusion}

做得好！您刚刚接触了 Go 语言中的模糊测试。

下一步是选择代码中您想要进行模糊测试的函数，并尝试一下！如果模糊测试在您的代码中发现了错误，可以考虑将其添加到 [成果案例](/wiki/Fuzzing-trophy-case) 中。

如果遇到任何问题或有功能建议，请[提交问题](/issue/new/?&labels=fuzz)。

如需讨论和提供关于该功能的反馈，您还可以参与 Gophers Slack 中的 [#fuzzing 频道](https://gophers.slack.com/archives/CH5KV1AKE)。

请查阅 [go.dev/security/fuzz](/security/fuzz/#requirements) 上的文档以获取更多阅读材料。

## 完整代码

--- main.go ---```
package main

import (
    "errors"
    "fmt"
    "unicode/utf8"
)

func main() {
    input := "The quick brown fox jumped over the lazy dog"
    rev, revErr := Reverse(input)
    doubleRev, doubleRevErr := Reverse(rev)
    fmt.Printf("original: %q\n", input)
    fmt.Printf("reversed: %q, err: %v\n", rev, revErr)
    fmt.Printf("reversed again: %q, err: %v\n", doubleRev, doubleRevErr)
}

func Reverse(s string) (string, error) {
    if !utf8.ValidString(s) {
        return s, errors.New("input is not valid UTF-8")
    }
    r := []rune(s)
    for i, j := 0, len(r)-1; i {{raw "<"}} len(r)/2; i, j = i+1, j-1 {
        r[i], r[j] = r[j], r[i]
    }
    return string(r), nil
}
```--- reverse_test.go ---

```go
package main

import (
	"testing"
	"unicode/utf8"
)

// TestReverse 测试 Reverse 函数的功能。
func TestReverse(t *testing.T) {
	testCases := []struct {
		name  string
		input string
		want  string
	}{
		{"Reversed", "Hello, world", "dlrow ,olleH"},
		{"Empty string", "", ""},
		{"Single character", "a", "a"},
		{"Palindrome", "racecar", "racecar"},
		{"Unicode", "Hello, 世界", "界世 ,olleH"},
		{"Invalid UTF-8 input", "\xff", "\xff"},
		{"Invalid UTF-8 in middle", "Hello\xffWorld", "dlroW\xffolleH"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Reverse(tc.input)
			if err != nil {
				if tc.input != got {
					t.Errorf("Reverse(%q) returned %q, want %q", tc.input, got, tc.input)
				}
				return
			}
			if got != tc.want {
				t.Errorf("Reverse(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}

// FuzzReverse 测试 Reverse 函数的随机输入。
func FuzzReverse(f *testing.F) {
	testcases := []string{"Hello, world", " ", "!12345"}
	for _, tc := range testcases {
		f.Add(tc) // 使用 f.Add 提供语料库（种子语料）
	}
	f.Fuzz(func(t *testing.T, orig string) {
		rev, err1 := Reverse(orig)
		if err1 != nil {
			return
		}
		doubleRev, err2 := Reverse(rev)
		if err2 != nil {
			return
		}
		if orig != doubleRev {
			t.Errorf("两次反转前后原始字符串不相等: 原始值 %q, 双反转后 %q", orig, doubleRev)
		}
		if utf8.ValidString(orig) && !utf8.ValidString(rev) {
			t.Errorf("反转产生了无效的 UTF-8 字符串: %q", rev)
		}
	})
}
``````go
package main

import (
    "testing"
    "unicode/utf8"
)

func FuzzReverse(f *testing.F) {
    testcases := []string{"Hello, world", " ", "!12345"}
    for _, tc := range testcases {
        f.Add(tc) // 使用 f.Add 来提供种子语料库
    }
    f.Fuzz(func(t *testing.T, orig string) {
        rev, err1 := Reverse(orig)
        if err1 != nil {
            return
        }
        doubleRev, err2 := Reverse(rev)
        if err2 != nil {
            return
        }
        if orig != doubleRev {
            t.Errorf("两次反转前后原始字符串不相等: 原始值 %q, 双反转后 %q", orig, doubleRev)
        }
        if utf8.ValidString(orig) && !utf8.ValidString(rev) {
            t.Errorf("反转产生了无效的 UTF-8 字符串: %q", rev)
        }
    })
}
```[返回顶部](#top)