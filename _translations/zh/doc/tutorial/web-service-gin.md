<!--{
  "Title": "教程：使用 Go 和 Gin 开发 RESTful API",
  "Breadcrumb": true
}-->

本教程介绍使用 Go 和 [Gin Web Framework](https://gin-gonic.com/en/docs/)（Gin）编写 RESTful 网络服务 API 的基础知识。

如果您已经对 Go 及其工具有基本的熟悉程度，将能从本教程中获得最大收获。如果您是首次接触 Go，请参阅[教程：Go 入门](/doc/tutorial/getting-started)以快速了解。

Gin 简化了许多与构建网络应用程序（包括网络服务）相关的编码任务。在本教程中，您将使用 Gin 来路由请求、检索请求详情以及为响应编组 JSON。

在本教程中，您将构建一个包含两个端点的 RESTful API 服务器。您的示例项目将是一个关于复古爵士唱片的数据仓库。

本教程包含以下部分：

1.  设计 API 端点。
2.  为代码创建文件夹。
3.  创建数据。
4.  编写处理函数以返回所有条目。
5.  编写处理函数以添加新条目。
6.  编写处理函数以返回特定条目。

**注意：** 其他教程请参见[教程](/doc/tutorial/index.html)。

如需尝试本教程的互动版本（在 Google Cloud Shell 中完成），请点击下方按钮。

[![在 Cloud Shell 中打开](https://gstatic.com/cloudssh/images/open-btn.png)](https://ide.cloud.google.com/?cloudshell_workspace=~&walkthrough_tutorial_url=https://raw.githubusercontent.com/golang/tour/master/tutorial/web-service-gin.md)

## 前提条件

*   **已安装 Go 1.16 或更高版本。** 安装说明请参阅[安装 Go](/doc/install)。
*   **用于编辑代码的工具。** 您拥有的任何文本编辑器都可以正常工作。
*   **命令终端。** Go 在 Linux 和 Mac 上的任何终端，以及在 Windows 上的 PowerShell 或 cmd 中都能良好运行。
*   **curl 工具。** 在 Linux 和 Mac 上，它通常已预装。在 Windows 上，它包含在 Windows 10 Insider 内部版本 17063 及更高版本中。对于更早的 Windows 版本，您可能需要安装它。更多信息请参阅 [Tar 和 Curl 登陆 Windows](https://docs.microsoft.com/en-us/virtualization/community/team-blog/2017/20171219-tar-and-curl-come-to-windows)。

## 设计 API 端点 {#design_endpoints}

您将构建一个 API，用于访问一家销售黑胶复古唱片的商店。因此，您需要提供端点，以便客户端可以获取和添加用户的专辑。

在开发 API 时，通常从设计端点开始。如果端点易于理解，API 的用户将更容易成功。

以下是您将在本教程中创建的端点。

/albums
*   `GET` – 获取所有专辑的列表，以 JSON 格式返回。
*   `POST` – 根据以 JSON 形式发送的请求数据添加新专辑。

/albums/:id
*   `GET` – 通过 ID 获取一个专辑，以 JSON 格式返回专辑数据。

接下来，您将为代码创建一个文件夹。

## 为代码创建文件夹 {#create_folder}

首先，为要编写的代码创建一个项目。

1. 打开命令提示符并切换到主目录。

    在 Linux 或 Mac 上：```
    $ cd
    ```在 Windows 上：```
    C:\> cd %HOMEPATH%
    ```2.  使用命令提示符，为您的代码创建一个名为 `web-service-gin` 的目录。```
    $ mkdir web-service-gin
    $ cd web-service-gin
    ```3. 创建一个模块，用于管理依赖项。

    运行 `go mod init` 命令，并指定代码所在的模块路径。```
    $ go mod init example/web-service-gin
    go: creating new go.mod: module example/web-service-gin
    ```此命令会创建一个 `go.mod` 文件，用于跟踪和管理您添加的依赖项。关于使用模块路径命名模块的更多信息，请参阅[管理依赖项](/doc/modules/managing-dependencies#naming_module)。

接下来，您将设计用于处理数据的数据结构。

## 创建数据 {#create_data}

为简化本教程内容，我们将数据存储在内存中。更典型的 API 会与数据库进行交互。

请注意，将数据存储在内存中意味着每次停止服务器时，专辑数据集都会丢失，并在重新启动时重新创建。

#### 编写代码

1. 使用文本编辑器，在 `web-service` 目录下创建一个名为 `main.go` 的文件。您将在此文件中编写 Go 代码。
2. 在 `main.go` 文件顶部粘贴以下包声明。```
    package main
    ```一个独立程序（相对于库而言）始终位于 `main` 包中。

3. 在包声明下方，粘贴以下 `album` 结构体的声明。您将使用它来在内存中存储专辑数据。

    结构体标签（如 ``json:"artist"``）指定了当结构体内容序列化为 JSON 时，字段应使用的名称。如果没有它们，JSON 将使用结构体中首字母大写的字段名——这种风格在 JSON 中并不常见。```
    // album表示唱片专辑的数据。
    type album struct {
    	ID     string  `json:"id"`
    	Title  string  `json:"title"`
    	Artist string  `json:"artist"`
    	Price  float64 `json:"price"`
    }
    ```4. 在你刚添加的结构体声明下方，粘贴以下包含初始数据的 `album` 结构体切片。```
    // albums切片用于初始化记录的专辑数据。
    var albums = []album{
    	{ID: "1", Title: "Blue Train", Artist: "John Coltrane", Price: 56.99},
    	{ID: "2", Title: "Jeru", Artist: "Gerry Mulligan", Price: 17.99},
    	{ID: "3", Title: "Sarah Vaughan and Clifford Brown", Artist: "Sarah Vaughan", Price: 39.99},
    }
    ```接下来，你将编写代码来实现第一个端点。

## 编写处理器以返回所有专辑 {#all_items}

当客户端向 `GET /albums` 发起请求时，你希望以 JSON 格式返回所有专辑数据。

为此，你需要编写以下内容：

*   准备响应数据的逻辑
*   将请求路径映射到对应处理逻辑的代码

需要注意的是，这与它们在运行时的执行顺序相反，但你在这里是先添加依赖项，再编写依赖于这些依赖项的代码。

#### 编写代码

1. 在上一节添加的结构体代码下方，粘贴以下代码以获取专辑列表。

    这个 `getAlbums` 函数从 `album` 结构体的切片创建 JSON，并将 JSON 数据写入响应中。// getAlbums 以 JSON 格式返回所有专辑的列表。
    func getAlbums(c *gin.Context) {
    	c.IndentedJSON(http.StatusOK, albums)
    }在这段代码中，你：

*   编写了一个 `getAlbums` 函数，该函数接受一个 [`gin.Context`](https://pkg.go.dev/github.com/gin-gonic/gin#Context) 参数。请注意，你可以为这个函数取任何名字——Gin 和 Go 都不要求特定的函数名格式。

    `gin.Context` 是 Gin 框架最重要的部分。它承载了请求的详细信息，负责验证和序列化 JSON 等任务。（尽管名字相似，但它不同于 Go 内置的 [`context`](/pkg/context/) 包。）

*   调用 [`Context.IndentedJSON`](https://pkg.go.dev/github.com/gin-gonic/gin#Context.IndentedJSON) 来将结构体序列化为 JSON 并将其添加到响应中。

    该函数的第一个参数是你希望发送给客户端的 HTTP 状态码。在这里，你传递了 `net/http` 包中的 [`StatusOK`](https://pkg.go.dev/net/http#StatusOK) 常量来表示 `200 OK`。

    请注意，你可以将 `Context.IndentedJSON` 替换为调用 [`Context.JSON`](https://pkg.go.dev/github.com/gin-gonic/gin#Context.JSON)，以发送更紧凑的 JSON。在实践中，调试时带缩进的格式要易用得多，而两者在体积上的差异通常很小。

2. 在 `main.go` 文件顶部，`albums` 切片声明的正下方，粘贴下面的代码，以便将处理函数分配给一个端点路径。

    这建立了一个关联：`getAlbums` 函数将处理对 `/albums` 端点路径的请求。```
    func main() {
    	router := gin.Default()
    	router.GET("/albums", getAlbums)

    	router.Run("localhost:8080")
    }
    ```在此代码中，您执行了以下操作：

*   使用 [`Default`](https://pkg.go.dev/github.com/gin-gonic/gin#Default) 初始化一个 Gin 路由器。
*   使用 [`GET`](https://pkg.go.dev/github.com/gin-gonic/gin#RouterGroup.GET) 函数将 `GET` HTTP 方法和 `/albums` 路径与一个处理函数关联。

    请注意，您传递的是 `getAlbums` 函数的**名称**。这与传递函数的**结果**不同，后者需要通过 `getAlbums()`（注意括号）来传递。

*   使用 [`Run`](https://pkg.go.dev/github.com/gin-gonic/gin#Engine.Run) 函数将路由器附加到一个 `http.Server` 并启动服务器。

3. 在 `main.go` 文件顶部，紧接在 package 声明下方，导入您刚才编写的代码所需的支持包。

    代码的开头几行应如下所示：```
    package main

    import (
    	"net/http"

    	"github.com/gin-gonic/gin"
    )
    ```4. 保存 main.go 文件。

#### 运行代码

1. 开始将 Gin 模块作为依赖项进行跟踪。

    在命令行中，使用 [`go get`](/cmd/go/#hdr-Add_dependencies_to_current_module_and_install_them) 命令将 github.com/gin-gonic/gin 模块添加为您模块的依赖项。
    使用点参数表示“为当前目录中的代码获取依赖项”。```
    $ go get .
    go get: added github.com/gin-gonic/gin v1.7.2
    ```Go 解析并下载了此依赖项，以满足您在上一步中添加的 `import` 声明。

2. 在包含 main.go 文件的目录的命令行中，运行代码。
    使用点（`.`）参数表示“运行当前目录中的代码”。```
    $ go run .
    ```代码运行后，您将拥有一个可接收请求的运行中HTTP服务器。

3. 从新的命令行窗口中，使用 `curl` 向您运行中的Web服务发送请求。```
    $ curl http://localhost:8080/albums
    ```该命令应显示您预先植入服务的数据。```
    [
            {
                    "id": "1",
                    "title": "Blue Train",
                    "artist": "John Coltrane",
                    "price": 56.99
            },
            {
                    "id": "2",
                    "title": "Jeru",
                    "artist": "Gerry Mulligan",
                    "price": 17.99
            },
            {
                    "id": "3",
                    "title": "Sarah Vaughan and Clifford Brown",
                    "artist": "Sarah Vaughan",
                    "price": 39.99
            }
    ]
    ```您已经启动了一个 API！在下一节中，您将创建另一个端点，用于处理 `POST` 请求以添加项目。

## 编写处理程序以添加新项目 {#add_item}

当客户端向 `/albums` 发送 `POST` 请求时，您需要将请求体中描述的专辑添加到现有专辑数据中。

为此，您需要编写以下内容：

*   将新专辑添加到现有列表的逻辑。
*   将 `POST` 请求路由到该逻辑的代码。

#### 编写代码

1. 添加将专辑数据添加到专辑列表中的代码。

    在 `import` 语句之后的某个位置，粘贴以下代码。（将代码放在文件末尾是个不错的位置，但 Go 并不要求必须按特定顺序声明函数。）```go
    // postAlbums 从请求体接收的 JSON 数据中添加专辑。
    func postAlbums(c *gin.Context) {
    	var newAlbum album

    	// 调用 BindJSON 将接收到的 JSON 绑定到
    	// newAlbum 变量。
    	if err := c.BindJSON(&newAlbum); err != nil {
    		return
    	}

    	// 将新专辑添加到切片中。
    	albums = append(albums, newAlbum)
    	c.IndentedJSON(http.StatusCreated, newAlbum)
    }
    ```在这段代码中，你：

*   使用 [`Context.BindJSON`](https://pkg.go.dev/github.com/gin-gonic/gin#Context.BindJSON) 将请求体绑定到 `newAlbum`。
*   将从 JSON 初始化的 `album` 结构体追加到 `albums` 切片中。
*   向响应添加 `201` 状态码，以及代表你所添加专辑的 JSON 数据。

2. 修改你的 `main` 函数，使其包含 `router.POST` 函数，如下所示。```
    func main() {
    	router := gin.Default()
    	router.GET("/albums", getAlbums)
    	router.POST("/albums", postAlbums)

    	router.Run("localhost:8080")
    }
    ```在这段代码中，你执行了以下操作：

*   将 `/albums` 路径上的 `POST` 方法与 `postAlbums` 函数关联起来。

    通过 Gin 框架，你可以将处理函数（handler）与一个特定的 HTTP 方法及路径组合相关联。这样，你就可以根据客户端使用的不同方法，将发送到同一个路径的请求分别路由到不同的处理函数。

#### 运行代码

1.  如果上一节中的服务器仍在运行，请先停止它。
2.  在命令行中，进入包含 `main.go` 文件的目录，然后运行代码。```
    $ go run .
    ```3. 接着，打开另一个命令行窗口，使用 `curl` 向运行中的Web服务发起请求。```
    $ curl http://localhost:8080/albums \
        --include \
        --header "Content-Type: application/json" \
        --request "POST" \
        --data '{"id": "4","title": "The Modern Sound of Betty Carter","artist": "Betty Carter","price": 49.99}'
    ```该命令应该会显示头部信息和新专辑的JSON数据。```
    HTTP/1.1 201 Created
    Content-Type: application/json; charset=utf-8
    Date: Wed, 02 Jun 2021 00:34:12 GMT
    Content-Length: 116

    {
        "id": "4",
        "title": "The Modern Sound of Betty Carter",
        "artist": "Betty Carter",
        "price": 49.99
    }
    ```4. 如前一部分所述，使用 `curl` 命令获取完整的专辑列表，以确认新专辑已成功添加。```
    $ curl http://本地主机:8080/albums \
        --header "Content-Type: application/json" \
        --request "GET"
    ```该命令应显示专辑列表。```
    [
            {
                    "id": "1",
                    "title": "Blue Train",
                    "artist": "John Coltrane",
                    "price": 56.99
            },
            {
                    "id": "2",
                    "title": "Jeru",
                    "artist": "Gerry Mulligan",
                    "price": 17.99
            },
            {
                    "id": "3",
                    "title": "Sarah Vaughan and Clifford Brown",
                    "artist": "Sarah Vaughan",
                    "price": 39.99
            },
            {
                    "id": "4",
                    "title": "The Modern Sound of Betty Carter",
                    "artist": "Betty Carter",
                    "price": 49.99
            }
    ]
    ```在接下来的部分，你将添加代码来处理针对特定项目的`GET`请求。

## 编写处理程序以返回特定项目 {#specific_item}

当客户端向 `GET /albums/[id]` 发起请求时，你需要返回ID与路径参数 `id` 匹配的专辑。

为此，你将：

*   添加检索请求专辑的逻辑。
*   将路径映射到该逻辑。

#### 编写代码

1. 在上一部分你添加的 `postAlbums` 函数下方，粘贴以下代码以检索特定专辑。

    这个 `getAlbumByID` 函数将从请求路径中提取ID，然后定位匹配的专辑。```go
    // getAlbumByID 根据客户端发送的ID参数查找对应的专辑
    // 并将该专辑作为响应返回
    func getAlbumByID(c *gin.Context) {
    	id := c.Param("id")

    	// 遍历专辑列表，查找
    	// ID值与参数匹配的专辑
    	for _, a := range albums {
    		if a.ID == id {
    			c.IndentedJSON(http.StatusOK, a)
    			return
    		}
    	}
    	c.IndentedJSON(http.StatusNotFound, gin.H{"message": "album not found"})
    }
    ```在这段代码中，您：

*   使用 [`Context.Param`](https://pkg.go.dev/github.com/gin-gonic/gin#Context.Param)
    从 URL 中检索 `id` 路径参数。当您将此处理程序映射到某个路径时，路径中将包含一个该参数的占位符。
*   遍历切片中的 `album` 结构体，查找其 `ID` 字段值与 `id` 参数值匹配的结构体。如果找到，就将该 `album` 结构体序列化为 JSON，并作为带有 `200 OK` HTTP 状态码的响应返回。

    如上所述，实际的服务很可能会使用数据库查询来执行此查找。

*   如果未找到专辑，则返回一个 HTTP `404` 错误，状态码为 [`http.StatusNotFound`](https://pkg.go.dev/net/http#StatusNotFound)。

2. 最后，修改您的 `main` 函数，添加一个新的 `router.GET` 调用，其路径现在为 `/albums/:id`，如下例所示。```
    func main() {
    	router := gin.Default()
    	router.GET("/albums", getAlbums)
    	router.GET("/albums/:id", getAlbumByID)
    	router.POST("/albums", postAlbums)

    	router.Run("localhost:8080")
    }
    ```在这段代码中，您：

*   将 `/albums/:id` 路径与 `getAlbumByID` 函数关联。在 Gin 框架中，路径中冒号前的项目表示该项是一个路径参数。

#### 运行代码

1. 如果服务器仍在运行上一节的内容，请先停止它。
2. 在包含 main.go 文件的目录的命令行中，运行代码以启动服务器。```
    $ go run .
    ```3. 在另一个命令行窗口中，使用 `curl` 向您运行的 Web 服务发送请求。```
    $ curl http://localhost:8080/albums/2
    ```该命令应显示与所用ID对应的相册的JSON数据。如果未找到该相册，您将收到包含错误信息的JSON响应。```
    {
            "id": "2",
            "title": "Jeru",
            "artist": "Gerry Mulligan",
            "price": 17.99
    }
    ```## 结论 {#conclusion}

恭喜！你刚刚使用Go和Gin编写了一个简单的RESTful Web服务。

建议接下来学习的主题：

*   如果你是Go语言新手，你会在[Effective Go](/doc/effective_go)和[如何编写Go代码](/doc/code)中找到有用的最佳实践。
*   [Go语言之旅](/tour/)是一个循序渐进了解Go语言基础知识的绝佳指南。
*   欲了解更多关于Gin的信息，请参阅[Gin Web框架包文档](https://pkg.go.dev/github.com/gin-gonic/gin)或[Gin Web框架文档](https://gin-gonic.com/en/docs/)。

## 完整代码 {#completed_code}

本节包含你通过本教程构建的应用程序的完整代码。```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// album 代表唱片专辑的数据结构。
type album struct {
	ID     string  `json:"id"`
	Title  string  `json:"title"`
	Artist string  `json:"artist"`
	Price  float64 `json:"price"`
}

// albums 切片用于预填充唱片专辑数据。
var albums = []album{
	{ID: "1", Title: "Blue Train", Artist: "John Coltrane", Price: 56.99},
	{ID: "2", Title: "Jeru", Artist: "Gerry Mulligan", Price: 17.99},
	{ID: "3", Title: "Sarah Vaughan and Clifford Brown", Artist: "Sarah Vaughan", Price: 39.99},
}

func main() {
	router := gin.Default()
	router.GET("/albums", getAlbums)
	router.GET("/albums/:id", getAlbumByID)
	router.POST("/albums", postAlbums)

	router.Run("localhost:8080")
}

// getAlbums 以JSON格式返回所有专辑的列表作为响应。
func getAlbums(c *gin.Context) {
	c.IndentedJSON(http.StatusOK, albums)
}

// postAlbums 从请求体接收的JSON数据中添加一个新专辑。
func postAlbums(c *gin.Context) {
	var newAlbum album

	// 调用 BindJSON 将接收到的JSON绑定到 newAlbum。
	if err := c.BindJSON(&newAlbum); err != nil {
		return
	}

	// 将新专辑添加到切片中。
	albums = append(albums, newAlbum)
	c.IndentedJSON(http.StatusCreated, newAlbum)
}

// getAlbumByID 查找ID值与客户端发送的id参数相匹配的专辑，然后将该专辑作为响应返回。
func getAlbumByID(c *gin.Context) {
	id := c.Param("id")

	// 遍历专辑列表，查找ID值与参数匹配的专辑。
	for _, a := range albums {
		if a.ID == id {
			c.IndentedJSON(http.StatusOK, a)
			return
		}
	}
	c.IndentedJSON(http.StatusNotFound, gin.H{"message": "album not found"})
}
```