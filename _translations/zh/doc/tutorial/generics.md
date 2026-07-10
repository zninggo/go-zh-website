<!--{
  "Title": "教程：泛型入门",
  "Breadcrumb": true
}-->

本教程介绍 Go 语言泛型的基础知识。使用泛型，您可以声明并使用那些为能处理调用代码所提供的一组类型中的任意类型而编写的函数或类型。

在本教程中，您将声明两个简单的非泛型函数，然后将相同的逻辑封装在一个泛型函数中。

您将按以下步骤进行学习：

1.  为代码创建一个文件夹。
2.  添加非泛型函数。
3.  添加一个泛型函数以处理多种类型。
4.  调用泛型函数时省略类型参数。
5.  声明一个类型约束。

**注意：** 如需查看其他教程，请参阅[教程列表](/doc/tutorial/index.html)。

## 前提条件

*   **Go.** 我们推荐使用最新版本的 Go 来学习本教程。
    安装说明请参阅[安装 Go](/doc/install)。
*   **代码编辑工具。** 您拥有的任何文本编辑器均可。
*   **命令终端。** Go 在 Linux 和 Mac 的任何终端，以及 Windows 的 PowerShell 或 cmd 中都能良好运行。

## 为代码创建文件夹 {#create_folder}

首先，为您要编写的代码创建一个文件夹。

1.  打开命令提示符，并切换到您的主目录。

    在 Linux 或 Mac 上：```
    $ cd
    ```在 Windows 上：

    类似地，请从命令提示符中创建一个名为 `generics` 的目录：

    ```
    > mkdir generics
    ``````
    C:\> cd %HOMEPATH%
    ```本教程的其余部分将使用 $ 作为命令提示符。您使用的命令在 Windows 上同样适用。

2. 在命令提示符中，为您的代码创建一个名为 `generics` 的目录。```
    $ mkdir generics
    $ cd generics
    ```3. 创建一个模块来存放你的代码。

    运行 `go mod init` 命令，并为新代码指定模块路径。```
    $ go mod init example/generics
    go: creating new go.mod: module example/generics
    ```**注意：** 对于生产代码，您应该根据自身需求指定更具体的模块路径。更多信息，请参阅 [管理依赖项](/doc/modules/managing-dependencies)。

接下来，您将添加一些简单代码来处理映射。

## 添加非泛型函数 {#non_generic_functions}

在此步骤中，您将添加两个函数，每个函数都会累加一个映射中的值并返回总和。

您声明的是两个函数而非一个，因为您需要处理两种不同类型的映射：一种存储 `int64` 值，另一种存储 `float64` 值。

#### 编写代码

1.  使用您的文本编辑器，在 `generics` 目录中创建一个名为 `main.go` 的文件。您将在此文件中编写您的 Go 代码。
2.  在 `main.go` 文件的顶部，粘贴以下包声明。

    ```go
    package main
    ``````
    package main
    ```一个独立程序（相对于库而言）始终属于 `main` 包。

3. 在包声明下方，粘贴以下两个函数声明。```go
    // SumInts 将 m 中所有值相加。
    func SumInts(m map[string]int64) int64 {
    	var s int64
    	for _, v := range m {
    		s += v
    	}
    	return s
    }

    // SumFloats 将 m 中所有值相加。
    func SumFloats(m map[string]float64) float64 {
    	var s float64
    	for _, v := range m {
    		s += v
    	}
    	return s
    }
    ```在这段代码中，您需要：

*   声明两个函数，用于将映射中的值相加并返回求和结果。
    *   `SumFloats` 接收一个键为 `string`、值为 `float64` 的映射。
    *   `SumInts` 接收一个键为 `string`、值为 `int64` 的映射。

4. 在 `main.go` 文件的顶部，位于包声明的下方，粘贴以下 `main` 函数。该函数用于初始化两个映射，并在调用前一步声明的函数时将它们作为参数使用。

    ```go
    func main() {
        // 初始化两个映射。
        ints := map[string]int64{
            "first":  34,
            "second": 12,
        }

        floats := map[string]float64{
            "first":  35.98,
            "second": 26.99,
        }

        fmt.Printf("Ints 的和: %d\n",
            SumInts(ints))

        fmt.Printf("Floats 的和: %f\n",
            SumFloats(floats))
    }
    ``````go
    func main() {
    	// 初始化整型值的映射
    	ints := map[string]int64{
    		"first":  34,
    		"second": 12,
    	}

    	// 初始化浮点值的映射
    	floats := map[string]float64{
    		"first":  35.98,
    		"second": 26.99,
    	}

    	fmt.Printf("非泛型求和结果：%v 和 %v\n",
    		SumInts(ints),
    		SumFloats(floats))
    }
    ```在这些代码中，你需要：

*   初始化一个包含 `float64` 值的映射和一个包含 `int64` 值的映射，每个映射包含两个条目。
*   调用你之前声明的两个函数，分别求出每个映射中值的总和。
*   打印结果。

5.  在 main.go 文件的顶部，紧接在包声明下方，导入你刚才编写的代码所需要的包。

    代码的前几行应如下所示：```
    package main

    import "fmt"
    ```6. 保存 main.go 文件。

#### 运行代码

在命令行中，切换到包含 main.go 文件的目录，然后运行代码。```
$ go run .
Non-Generic Sums: 46 and 62.97
```通过泛型，您可以在此处编写一个函数来替代之前的两个函数。接下来，您将添加一个通用的泛型函数，它可以处理包含整数或浮点数的映射。

## 添加一个泛型函数以处理多种类型 {#add_generic_function}

在本节中，您将添加一个泛型函数，该函数能够接收包含整数或浮点数值的映射，从而有效地用单个函数替代您刚才编写的两个函数。

为了支持这两种类型的数值，这个单一函数需要一种方式来声明它支持哪些类型。另一方面，调用代码也需要一种方式来指定它是以整数映射还是浮点映射来调用。

为了实现这一点，您将编写一个除了普通函数参数外，还声明了 _类型参数_ 的函数。这些类型参数使函数成为泛型，使其能够处理不同类型的参数。您将通过 _类型参数_ 和普通函数参数来调用该函数。

每个类型参数都有一个 _类型约束_，它充当该类型参数的一种元类型。每个类型约束指定了调用代码可以用于相应类型参数的允许类型。

虽然类型参数的约束通常代表一组类型，但在编译时，类型参数仅代表单一类型——即调用代码作为类型参数提供的具体类型。如果类型参数的类型不被类型参数的约束所允许，代码将无法编译。

请记住，类型参数必须支持泛型代码对其执行的所有操作。例如，如果您的函数代码试图对一个约束包含数值类型的类型参数执行 `string` 操作（例如索引），代码将无法编译。

在您即将编写的代码中，您将使用一个允许整数或浮点类型的约束。

#### 编写代码

1.  在您之前添加的两个函数下方，粘贴以下泛型函数。```go
    // [待翻译: SumIntsOrFloats计算map m中所有值的总和。它支持int64和float64]
    // [待翻译: 作为map值的类型。]
    func SumIntsOrFloats[K comparable, V int64 | float64](m map[K]V) V {
        var s V
        for _, v := range m {
            s += v
        }
        return s
    }
    ```在此代码中，您：

*   声明了一个 `SumIntsOrFloats` 函数，该函数包含两个类型参数（位于方括号内）`K` 和 `V`，以及一个使用类型参数的参数 `m`，其类型为 `map[K]V`。该函数返回一个 `V` 类型的值。
*   为 `K` 类型参数指定了 `comparable` 类型约束。`comparable` 约束是 Go 中预定义的，专门用于此类情况。它允许任何类型的值可以作为比较运算符 `==` 和 `!=` 的操作数。Go 要求 map 的键必须是可比较的。因此，将 `K` 声明为 `comparable` 是必要的，这样您才能将 `K` 用作 map 变量的键。它还确保调用代码使用了 map 键的允许类型。
*   为 `V` 类型参数指定了一个由两个类型 `int64` 和 `float64` 组成的联合约束。使用 `|` 指定了这两个类型的联合，这意味着该约束允许其中任何一种类型。编译器将允许调用代码中的任一种类型作为参数。
*   指定 `m` 参数的类型为 `map[K]V`，其中 `K` 和 `V` 是先前为类型参数指定的类型。请注意，我们知道 `map[K]V` 是一个有效的 map 类型，因为 `K` 是一个可比较的类型。如果我们没有将 `K` 声明为可比较的，编译器将拒绝 `map[K]V` 的引用。

2. 在 `main.go` 中，在您已有的代码下方，粘贴以下代码。```
    fmt.Printf("Generic Sums: %v and %v\n",
    	SumIntsOrFloats[string, int64](ints),
    	SumIntsOrFloats[string, float64](floats))
    ```在这段代码中，您：

*   调用了刚刚声明的泛型函数，并传递了您创建的每个映射。
*   指定了类型参数——即方括号中的类型名称——以便明确在调用的函数中，应该用哪些具体类型来替换类型参数。

    正如您将在下一节中看到的，在函数调用时通常可以省略类型参数。Go 语言通常能从您的代码中推断出这些类型。
*   打印了函数返回的和。

#### 运行代码

在包含 `main.go` 文件的目录中，从命令行运行该代码。```
$ go run .
Non-Generic Sums: 46 and 62.97
Generic Sums: 46 and 62.97
```要运行您的代码，在每次调用中，编译器都会用该次调用所指定的具体类型来替换类型参数。

在调用您编写的泛型函数时，您指定了类型参数，这些参数告诉编译器应该用哪些具体类型来替换函数的类型参数。正如您将在下一节中看到的，在许多情况下您可以省略这些类型参数，因为编译器能够推断出它们。

## 调用泛型函数时省略类型参数 {#remove_type_arguments}

在本节中，您将添加一个修改后的泛型函数调用版本，对调用代码稍作简化。您将移除类型参数，在本例中它们并非必需。

当 Go 编译器能够推断出您想使用的类型时，您可以在调用代码中省略类型参数。编译器会根据函数参数的类型来推断类型参数。

请注意，这并非总是可行。例如，如果您需要调用一个没有参数的泛型函数，则必须在函数调用中包含类型参数。

#### 编写代码

*   在 `main.go` 文件中，在已有代码的下方，粘贴以下代码。```
    fmt.Printf("Generic Sums, type parameters inferred: %v and %v\n",
    	SumIntsOrFloats(ints),
    	SumIntsOrFloats(floats))
    ```在此代码中，您：

*   调用泛型函数时省略了类型参数。

#### 运行代码

在包含 main.go 文件的目录中，从命令行运行代码。```
$ go run .
Non-Generic Sums: 46 and 62.97
Generic Sums: 46 and 62.97
Generic Sums, type parameters inferred: 46 and 62.97
```接下来，我们将通过把整数与浮点数的联合类型提取为一个可重用的类型约束来进一步简化函数，这样其他代码也能直接复用该约束。

## 声明类型约束 {#declare_type_constraint}

在本节最后，我们将把先前定义的约束提取到独立的接口中，以便在多个位置复用。以这种方式声明约束有助于简化代码，尤其当约束较为复杂时。

我们可以将类型约束声明为接口。该约束允许任何实现了该接口的类型。例如，若声明一个包含三个方法的类型约束接口，并在泛型函数中将其用作类型参数，那么调用该函数时使用的类型实参必须实现所有这些方法。

约束接口也可以指定具体类型，这一点将在本节中看到。

#### 编写代码

1.  在 `main` 函数上方、导入语句之后，粘贴以下代码以声明类型约束：
    
    ```go
    // Number 约束允许任意整数或浮点数类型
    type Number interface {
        int64 | float64
    }
    ``````
    type Number interface {
        int64 | float64
    }
    ```在这段代码中，您：

*   声明 `Number` 接口类型用作类型约束。
*   在接口内部声明一个由 `int64` 和 `float64` 组成的联合类型。

    本质上，您是将联合类型从函数声明中移入一个新的类型约束中。这样，当您想要将类型参数约束为 `int64` 或 `float64` 时，就可以使用这个 `Number` 类型约束，而无需每次都写出 `int64 | float64`。

2. 在您已有的函数下方，粘贴以下泛型 `SumNumbers` 函数。```
    // SumNumbers 对映射 m 的值进行求和。支持整型和浮点型作为映射值。
    func SumNumbers[K comparable, V Number](m map[K]V) V {
        var s V
        for _, v := range m {
            s += v
        }
        return s
    }
    ```在这段代码中，您：

*   声明了一个泛型函数，其逻辑与之前声明的泛型函数相同，但使用了新的接口类型而非联合类型作为类型约束。与之前一样，您使用类型参数来定义参数和返回类型。

3. 在 `main.go` 文件中已有的代码下方，粘贴以下代码。```
    fmt.Printf("Generic Sums with Constraint: %v and %v\n",
    	SumNumbers(ints),
    	SumNumbers(floats))
    ```在这段代码中，您：

*   使用每个映射调用 `SumNumbers`，打印出每个映射值的总和。

    如同前一节，您在调用泛型函数时省略了类型参数（方括号中的类型名称）。Go编译器可以从其他参数推断出类型参数。

#### 运行代码

在包含 `main.go` 的目录的命令行中，运行代码。```
$ go run .
Non-Generic Sums: 46 and 62.97
Generic Sums: 46 and 62.97
Generic Sums, type parameters inferred: 46 and 62.97
Generic Sums with Constraint: 46 and 62.97
```## 结论 {#conclusion}

做得很好！你刚刚体验了Go语言中的泛型功能。

建议接下来学习以下主题：

*   [Go之旅](/tour/) 是一个优秀的分步教程，系统介绍Go语言基础。
*   你可以在[高效Go编程](/doc/effective_go)和[如何编写Go代码](/doc/code)中找到实用的Go最佳实践。

## 完整代码 {#completed_code}

你可以在[Go Playground](/play/p/apNmfVwogK0)运行这个程序。在Playground界面只需点击**Run**按钮即可执行。

```
package main

import "fmt"

type Number interface {
	int64 | float64
}

func main() {
	// 初始化整型数值映射
	ints := map[string]int64{
		"first": 34,
		"second": 12,
	}

	// 初始化浮点数值映射
	floats := map[string]float64{
		"first": 35.98,
		"second": 26.99,
	}

	fmt.Printf("Non-Generic Sums: %v and %v\n",
		SumInts(ints),
		SumFloats(floats))

	fmt.Printf("Generic Sums: %v and %v\n",
		SumIntsOrFloats[string, int64](ints),
		SumIntsOrFloats[string, float64](floats))

	fmt.Printf("Generic Sums, type parameters inferred: %v and %v\n",
		SumIntsOrFloats(ints),
		SumIntsOrFloats(floats))

	fmt.Printf("Generic Sums with Constraint: %v and %v\n",
		SumNumbers(ints),
		SumNumbers(floats))
}

// SumInts 计算映射m中所有值的总和
func SumInts(m map[string]int64) int64 {
	var s int64
	for _, v := range m {
		s += v
	}
	return s
}

// SumFloats 计算映射m中所有值的总和
func SumFloats(m map[string]float64) float64 {
	var s float64
	for _, v := range m {
		s += v
	}
	return s
}

// SumIntsOrFloats 计算映射m中所有值的总和，支持整型和浮点型映射值
func SumIntsOrFloats[K comparable, V int64 | float64](m map[K]V) V {
	var s V
	for _, v := range m {
		s += v
	}
	return s
}

// SumNumbers 计算映射m中所有值的总和，支持整型和浮点型映射值
func SumNumbers[K comparable, V Number](m map[K]V) V {
	var s V
	for _, v := range m {
		s += v
	}
	return s
}
```