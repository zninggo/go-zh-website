<!--{
  "Title": "教程：访问关系型数据库",
  "Breadcrumb": true
}-->

本教程介绍使用 Go 语言及其标准库中的 `database/sql` 包访问关系型数据库的基础知识。

若你对 Go 语言及其工具链有基本了解，将能更好地学习本教程。如果你是第一次接触 Go，请先阅读[教程：Go 快速入门](/doc/tutorial/getting-started)了解基础。

你将使用的 [`database/sql`](https://pkg.go.dev/database/sql) 包包含用于连接数据库、执行事务、取消正在进行的操作等功能的类型和函数。有关该包的更多使用细节，请参阅[访问数据库](/doc/database/index)。

在本教程中，你将先创建一个数据库，然后编写代码访问该数据库。示例项目将是一个存储经典爵士唱片数据的仓库。

本教程将按以下章节逐步讲解：

1. 创建代码文件夹
2. 搭建数据库环境
3. 导入数据库驱动
4. 获取数据库连接句柄并建立连接
5. 查询多行数据
6. 查询单行数据
7. 插入数据

**注意：** 查看其他教程请访问[教程列表](/doc/tutorial/index.html)。

## 前置条件 {#prerequisites}

*   **已安装 [MySQL](https://dev.mysql.com/doc/mysql-installation-excerpt/5.7/en/) 关系型数据库管理系统（DBMS）**
*   **已安装 Go 语言**，安装指南请参考[安装 Go](/doc/install)
*   **代码编辑工具**——任意文本编辑器均可
*   **命令行终端**——在 Linux 和 Mac 系统上可使用任意终端，在 Windows 系统上推荐 PowerShell 或 cmd

## 创建代码文件夹 {#create_folder}

首先创建一个存放代码的文件夹。

1. 打开命令提示符并切换到主目录：

    Linux 或 Mac 系统：
     ```bash
    cd ~
    ``````
    $ cd
    ```在Windows系统上：```
    C:\> cd %HOMEPATH%
    ```在本教程的后续部分，我们将以 $ 符号作为命令提示符。这些命令在 Windows 系统上同样适用。

2. 在命令提示符中，为你的代码创建一个名为 data-access 的目录。```
    $ mkdir data-access
    $ cd data-access
    ```3. 创建一个模块，用于管理在本教程后续步骤中将要添加的依赖项。

    运行 `go mod init` 命令，并为其指定新代码的模块路径。```
    $ go mod init example/data-access
    go: creating new go.mod: module example/data-access
    ```该命令会创建一个 go.mod 文件，用于列出和跟踪后续添加的依赖项。更多详情请参阅[依赖项管理](/doc/modules/managing-dependencies)。

**注意：** 在实际开发中，你需要指定一个更符合自身需求的模块路径。更多信息请参阅[依赖项管理](/doc/modules/managing-dependencies#naming_module)。

接下来，你将创建一个数据库。

## 设置数据库 {#set_up_database}

在此步骤中，你将创建需要使用的数据库。你将使用数据库管理系统本身的命令行界面来创建数据库和表，并添加数据。

你将创建一个包含黑胶唱片爵士乐录音信息的数据库。

此处的代码使用了 [MySQL 命令行界面](https://dev.mysql.com/doc/refman/8.0/en/mysql.html)，但大多数数据库管理系统都提供具有类似功能的命令行界面。

1. 打开一个新的命令提示符。
2. 在命令行中登录到你的数据库管理系统，以下是 MySQL 的示例。```
    $ mysql -u root -p
    Enter password:

    mysql>
    ```3. 在 `mysql` 命令提示符下，创建数据库。```
    mysql> create database recordings;
    ```4. 切换到你刚刚创建的数据库，以便添加表格。```
    mysql> use recordings;
    Database changed
    ```5. 在你的文本编辑器中，在data-access文件夹下，新建一个名为create-tables.sql的文件，用于存放添加表格的SQL脚本。
6. 将以下SQL代码粘贴到该文件中，然后保存文件。```
    DROP TABLE IF EXISTS album;
    CREATE TABLE album (
      id         INT AUTO_INCREMENT NOT NULL,
      title      VARCHAR(128) NOT NULL,
      artist     VARCHAR(255) NOT NULL,
      price      DECIMAL(5,2) NOT NULL,
      PRIMARY KEY (`id`)
    );

    INSERT INTO album
      (title, artist, price)
    VALUES
      ('Blue Train', 'John Coltrane', 56.99),
      ('Giant Steps', 'John Coltrane', 63.99),
      ('Jeru', 'Gerry Mulligan', 17.99),
      ('Sarah Vaughan', 'Sarah Vaughan', 34.98);
    ```在这段SQL代码中，您将：

*   删除（drop）一个名为 `album` 的表。首先执行此命令，便于您日后重新运行脚本时从头开始创建该表。

*   创建一个包含四列的 `album` 表：`title`、`artist` 和 `price`。每行的 `id` 值将由数据库管理系统（DBMS）自动生成。

*   插入包含指定值的四行数据。

7.  在 `mysql` 命令提示符下，运行您刚刚创建的脚本。

    您将使用如下形式的 `source` 命令：```
    mysql> source /path/to/create-tables.sql
    ```8. 在数据库管理系统命令提示符下，使用 `SELECT` 语句验证您是否已成功创建包含数据的表。```
    mysql> select * from album;
    +----+---------------+----------------+-------+
    | id | title         | artist         | price |
    +----+---------------+----------------+-------+
    |  1 | Blue Train    | John Coltrane  | 56.99 |
    |  2 | Giant Steps   | John Coltrane  | 63.99 |
    |  3 | Jeru          | Gerry Mulligan | 17.99 |
    |  4 | Sarah Vaughan | Sarah Vaughan  | 34.98 |
    +----+---------------+----------------+-------+
    4 rows in set (0.00 sec)
    ```接下来，您将编写一些Go代码来建立连接，以便进行查询。

## 查找并导入数据库驱动 {#import_driver}

现在您已经拥有一个包含数据的数据库，可以开始编写Go代码了。

查找并导入一个数据库驱动，它将通过`database/sql`包中的函数将您的请求转换为数据库能够理解的请求。

1. 在浏览器中访问[SQLDrivers](/wiki/SQLDrivers)维基页面，以确定您可以使用的驱动。

   使用页面上的列表来确定您将使用的驱动。在本教程中为了访问MySQL，您将使用[Go-MySQL-Driver](https://github.com/go-sql-driver/mysql/)。

2. 记录该驱动的包名——这里是 `github.com/go-sql-driver/mysql`。

3. 使用文本编辑器创建一个用于编写Go代码的文件，并将该文件保存为之前创建的 `data-access` 目录中的 `main.go`。

4. 将以下代码粘贴到 `main.go` 中，以导入驱动包。```
    package main

    import "github.com/go-sql-driver/mysql"
    ```在以下代码中，您将：

*   将代码添加到 `main` 包中，以便独立执行。
*   导入 MySQL 驱动 `github.com/go-sql-driver/mysql`。

导入驱动后，您将开始编写访问数据库的代码。

## 获取数据库句柄并连接 {#get_handle}

现在编写一些 Go 代码，通过数据库句柄使你能访问数据库。

你将使用一个指向 `sql.DB` 结构体的指针，该结构体代表对特定数据库的访问。

#### 编写代码

1. 在 `main.go` 文件中你刚刚添加的 `import` 代码下方，粘贴以下 Go 代码以创建数据库句柄。```go
var db *sql.DB

func main() {
	// 获取连接属性。
	cfg := mysql.NewConfig()
	cfg.User = os.Getenv("DBUSER")
	cfg.Passwd = os.Getenv("DBPASS")
	cfg.Net = "tcp"
	cfg.Addr = "127.0.0.1:3306"
	cfg.DBName = "recordings"

	// 获取数据库句柄。
	var err error
	db, err = sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		log.Fatal(err)
	}

	pingErr := db.Ping()
	if pingErr != nil {
		log.Fatal(pingErr)
	}
	fmt.Println("Connected!")
}
```在这段代码中，你进行了以下操作：

*   声明了一个类型为 [`*sql.DB`](https://pkg.go.dev/database/sql#DB) 的 `db` 变量。
    这就是你的数据库句柄。

    将 `db` 设为全局变量是为了简化本示例。在生产环境中，你应避免使用全局变量，例如可以将该变量传递给需要它的函数，或者将其封装在结构体中。

*   使用 MySQL 驱动程序的 [`Config`](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config) 结构体及其 [`FormatDSN`](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config.FormatDSN) 方法来收集连接属性，并将其格式化为用于连接字符串的数据源名称（DSN）。

    `Config` 结构体使得代码比使用连接字符串更易于阅读。

*   调用 [`sql.Open`](https://pkg.go.dev/database/sql#Open) 函数来初始化 `db` 变量，并传入 `FormatDSN` 的返回值。

*   检查 `sql.Open` 是否返回错误。例如，如果你的数据库连接参数格式不正确，该操作可能会失败。

    为了简化代码，此处调用 `log.Fatal` 来终止程序并将错误信息打印到控制台。在生产代码中，你可能需要更优雅的错误处理方式。

*   调用 [`DB.Ping`](https://pkg.go.dev/database/sql#DB.Ping) 方法来确认数据库连接是否正常。在运行时，`sql.Open` 可能不会立即建立连接，这取决于驱动程序的实现。你在这里使用 `Ping` 是为了确认 `database/sql` 包在需要时能够成功连接。

*   检查 `Ping` 是否返回错误，以防连接失败。

*   如果 `Ping` 成功连接，则打印一条消息。

2. 在 main.go 文件的顶部，紧接在 package 声明之下，导入你刚刚编写代码所需的包。

    文件顶部现在应如下所示：```
    package main

    import (
    	"database/sql"
    	"fmt"
    	"log"
    	"os"

    	"github.com/go-sql-driver/mysql"
    )
    ```3. 保存 main.go 文件。

#### 运行代码

1. 将 MySQL 驱动模块作为依赖项开始跟踪。

    使用 [`go get`](/cmd/go/#hdr-Add_dependencies_to_current_module_and_install_them) 命令将 github.com/go-sql-driver/mysql 模块添加为你自己模块的依赖项。使用点（`.`）作为参数表示“获取当前目录下代码的依赖项”。```
    $ go get .
    go: added filippo.io/edwards25519 v1.1.0
    go: added github.com/go-sql-driver/mysql v1.8.1
    ```Go下载了此依赖项，因为您在上一步中已将其添加到`import`声明中。如需了解更多关于依赖项追踪的信息，请参阅[添加依赖项](/doc/modules/managing-dependencies#adding_dependency)。

2. 在命令提示符中，设置`DBUSER`和`DBPASS`环境变量供Go程序使用。

    在Linux或Mac系统上：```
    $ export DBUSER=username
    $ export DBPASS=password
    ```在Windows系统上：

    ```
    > set DBUSER=username
    > set DBPASS=password
    ``````
    C:\Users\you\data-access> set DBUSER=username
    C:\Users\you\data-access> set DBPASS=password
    ```3. 在命令行中，进入包含 main.go 文件的目录，通过输入 `go run .` 命令来运行代码。这里的点号参数表示"运行当前目录下的包"。```
    $ go run .
    Connected!
    ```现在你可以连接数据库了！接下来，我们将查询一些数据。

## 查询多行数据 {#multiple_rows}

在本节中，你将使用 Go 语言执行一个设计为返回多行的 SQL 查询。

对于可能返回多行的 SQL 语句，你需要使用 `database/sql` 包中的 `Query` 方法，然后循环遍历它返回的行。（你将在后续章节 [查询单行数据](#single_row) 中学习如何查询单行。）

#### 编写代码

1.  在 `main.go` 文件中，在 `func main` 函数定义的正上方，粘贴以下 `Album` 结构体的定义。你将使用它来保存查询返回的行数据。

     ```go
     // Album 结构体定义用于映射数据库中的表行
     type Album struct {
         ID     int64
         Title  string
         Artist string
         Price  float32
     }
     ``````
    type Album struct {
    	ID     int64
    	Title  string
    	Artist string
    	Price  float32
    }
    ```2. 在 `func main` 下方，粘贴以下 `albumsByArtist` 函数以查询数据库。```
    // albumsByArtist 查询指定艺术家的专辑。
    func albumsByArtist(name string) ([]Album, error) {
    	// 用于保存返回行的专辑切片。
    	var albums []Album

    	rows, err := db.Query("SELECT * FROM album WHERE artist = ?", name)
    	if err != nil {
    		return nil, fmt.Errorf("albumsByArtist %q: %v", name, err)
    	}
    	defer rows.Close()
    	// 遍历行，使用 Scan 将列数据赋值给结构体字段。
    	for rows.Next() {
    		var alb Album
    		if err := rows.Scan(&alb.ID, &alb.Title, &alb.Artist, &alb.Price); err != nil {
    			return nil, fmt.Errorf("albumsByArtist %q: %v", name, err)
    		}
    		albums = append(albums, alb)
    	}
    	if err := rows.Err(); err != nil {
    		return nil, fmt.Errorf("albumsByArtist %q: %v", name, err)
    	}
    	return albums, nil
    }
    ```在上述代码中，你执行了以下操作：

*   声明一个 `Album` 类型的切片 `albums`。该切片将用于存储返回的行数据。结构体字段的名称和类型对应数据库的列名和类型。

*   使用 [`DB.Query`](https://pkg.go.dev/database/sql#DB.Query) 执行 `SELECT` 语句，查询指定艺术家名称的专辑。

    `Query` 的第一个参数是 SQL 语句。之后，你可以传递零个或多个任意类型的参数。这些参数用于指定 SQL 语句中参数的值。通过将 SQL 语句与参数值分离（而不是像使用 `fmt.Sprintf` 那样拼接），你使得 `database/sql` 包能够将值与 SQL 文本分开发送，从而消除了任何 SQL 注入风险。

*   延迟关闭 `rows`，以便在函数退出时释放其占用的所有资源。

*   遍历返回的行，使用 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 将每行的列值赋值给 `Album` 结构体的字段。

    `Scan` 接收一个指向 Go 值的指针列表，列值将被写入这些指针指向的位置。这里，你传递的是指向 `alb` 变量中字段的指针，该变量通过 `&` 运算符创建。`Scan` 通过指针写入来更新结构体字段。

*   在循环内部，检查将列值扫描到结构体字段时是否发生错误。

*   在循环内部，将新的 `alb` 追加到 `albums` 切片中。

*   循环结束后，使用 `rows.Err` 检查整个查询过程中是否发生错误。请注意，如果查询本身失败，这里是发现结果不完整的唯一途径。

3.  更新你的 `main` 函数以调用 `albumsByArtist`。

    在 `func main` 的末尾，添加以下代码。```
    albums, err := albumsByArtist("John Coltrane")
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Printf("Albums found: %v\n", albums)
    ```在新代码中，你现在：

*   调用你添加的 `albumsByArtist` 函数，将其返回值赋给一个新的 `albums` 变量。
*   打印结果。

#### 运行代码

在包含 main.go 的目录中，从命令行运行该代码。```
$ go run .
Connected!
Albums found: [{1 Blue Train John Coltrane 56.99} {2 Giant Steps John Coltrane 63.99}]
```接下来，你将查询单行数据。

## 查询单行 {#single_row}

在本节中，你将使用 Go 来查询数据库中的单行数据。

对于你已知最多只返回一行的 SQL 语句，你可以使用 `QueryRow`，这比使用 `Query` 循环更简单。

#### 编写代码

1.  在 `albumsByArtist` 函数下方，粘贴以下 `albumByID` 函数。```go
    // albumByID 根据指定ID查询专辑信息。
    func albumByID(id int64) (Album, error) {
        // 用于存储返回行数据的专辑对象。
    	var alb Album

    	row := db.QueryRow("SELECT * FROM album WHERE id = ?", id)
    	if err := row.Scan(&alb.ID, &alb.Title, &alb.Artist, &alb.Price); err != nil {
    		if err == sql.ErrNoRows {
    			return alb, fmt.Errorf("albumsById %d: no such album", id)
    		}
    		return alb, fmt.Errorf("albumsById %d: %v", id, err)
    	}
    	return alb, nil
    }
```在这段代码中，您：

*   使用 [`DB.QueryRow`](https://pkg.go.dev/database/sql#DB.QueryRow) 执行一个 `SELECT` 语句，以查询具有指定 ID 的专辑。
    
    它返回一个 `sql.Row`。为了简化调用代码（您编写的代码！），`QueryRow` 不会返回错误。相反，它安排在后续通过 `Rows.Scan` 返回任何查询错误（例如 `sql.ErrNoRows`）。

*   使用 [`Row.Scan`](https://pkg.go.dev/database/sql#Row.Scan) 将列值复制到结构体字段。

*   检查 `Scan` 返回的错误。
    
    特殊错误 `sql.ErrNoRows` 表示查询没有返回任何行。通常，这个错误值得用更具描述性的文本替换，例如此处的 "no such album"（无此专辑）。

2.  更新 `main` 函数以调用 `albumByID`。
    
    在 `func main` 的末尾添加以下代码。// 此处硬编码ID 2来测试查询功能。
    alb, err := albumByID(2)
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Printf("Album found: %v\n", alb)
    ```在新的代码中，你现在需要：

*   调用你添加的 `albumByID` 函数。
*   打印返回的专辑ID。

#### 运行代码

在包含 main.go 的目录下，从命令行运行代码。```
$ go run .
Connected!
Albums found: [{1 Blue Train John Coltrane 56.99} {2 Giant Steps John Coltrane 63.99}]
Album found: {2 Giant Steps John Coltrane 63.99}
```接下来，我们将向数据库中添加专辑数据。

## 添加数据 {#add_data}

在本节中，你将使用Go执行SQL的`INSERT`语句，向数据库插入一行新数据。

你已经了解了如何使用`Query`和`QueryRow`处理会返回数据的SQL语句。对于**不返回数据**的SQL语句，则需要使用`Exec`来执行。

#### 编写代码

1. 在`albumByID`函数下方，粘贴以下`addAlbum`函数以将新专辑插入数据库，然后保存main.go文件。

     ```go
     // addAlbum adds the specified album to the database,
     // returning the album ID of the new entry
     func addAlbum(alb Album) (int64, error) {
         result, err := db.Exec("INSERT INTO album (title, artist, price) VALUES (?, ?, ?)", alb.Title, alb.Artist, alb.Price)
         if err != nil {
             return 0, fmt.Errorf("addAlbum: %v", err)
         }
         id, err := result.LastInsertId()
         if err != nil {
             return 0, fmt.Errorf("addAlbum: %v", err)
         }
         return id, nil
     }
     ``````
    // addAlbum 将指定的专辑添加到数据库中，并返回新条目的专辑 ID。
    func addAlbum(alb Album) (int64, error) {
    	result, err := db.Exec("INSERT INTO album (title, artist, price) VALUES (?, ?, ?)", alb.Title, alb.Artist, alb.Price)
    	if err != nil {
    		return 0, fmt.Errorf("addAlbum: %v", err)
    	}
    	id, err := result.LastInsertId()
    	if err != nil {
    		return 0, fmt.Errorf("addAlbum: %v", err)
    	}
    	return id, nil
    }
    ```在这段代码中，你执行了以下操作：

*   使用 [`DB.Exec`](https://pkg.go.dev/database/sql#DB.Exec) 执行了一条 `INSERT` 语句。
    和 `Query` 类似，`Exec` 接收一个 SQL 语句，后面跟着该 SQL 语句的参数值。

*   检查执行 `INSERT` 操作时是否发生错误。

*   使用 [`Result.LastInsertId`](https://pkg.go.dev/database/sql#Result.LastInsertId) 检索刚刚插入的数据库行的 ID。

*   检查尝试检索 ID 时是否发生错误。

2. 更新 `main` 函数，使其调用新的 `addAlbum` 函数。
    在 `func main` 的末尾，添加以下代码。```
    albID, err := addAlbum(Album{
    	Title:  "The Modern Sound of Betty Carter",
    	Artist: "Betty Carter",
    	Price:  49.99,
    })
    if err != nil {
    	log.Fatal(err)
    }
    fmt.Printf("ID of added album: %v\n", albID)
    ```在新增的代码中，您现在：

*   调用 `addAlbum` 函数并传入一张新专辑，将所添加专辑的 ID 赋值给 `albID` 变量。

#### 运行代码

在命令行中进入包含 main.go 的目录，执行代码运行。```
$ go run .
Connected!
Albums found: [{1 Blue Train John Coltrane 56.99} {2 Giant Steps John Coltrane 63.99}]
Album found: {2 Giant Steps John Coltrane 63.99}
ID of added album: 5
```## 结论 {#conclusion}

恭喜！您刚刚使用 Go 完成了对关系数据库的一些基本操作。

建议的后续学习主题：

*   查看数据访问指南，其中包含了这里仅简要提及的主题的更多信息。

*   如果您是 Go 语言新手，可以在 [Effective Go](/doc/effective_go) 和 [How to write Go code](/doc/code) 中找到有用的最佳实践描述。

*   [Go Tour](/tour/) 是逐步学习 Go 语言基础知识的绝佳资源。

## 完成的代码 {#completed_code}

本节包含您通过本教程构建的应用程序的代码。```go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/go-sql-driver/mysql"
)

var db *sql.DB

type Album struct {
	ID     int64
	Title  string
	Artist string
	Price  float32
}

func main() {
	// 捕获连接属性。
	cfg := mysql.NewConfig()
	cfg.User = os.Getenv("DBUSER")
	cfg.Passwd = os.Getenv("DBPASS")
	cfg.Net = "tcp"
	cfg.Addr = "127.0.0.1:3306"
	cfg.DBName = "recordings"

	// 获取数据库句柄。
	var err error
	db, err = sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		log.Fatal(err)
	}

	pingErr := db.Ping()
	if pingErr != nil {
		log.Fatal(pingErr)
	}
	fmt.Println("Connected!")

	albums, err := albumsByArtist("John Coltrane")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Albums found: %v\n", albums)

	// 此处硬编码ID 2来测试查询。
	alb, err := albumByID(2)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Album found: %v\n", alb)

	albID, err := addAlbum(Album{
		Title:  "The Modern Sound of Betty Carter",
		Artist: "Betty Carter",
		Price:  49.99,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("ID of added album: %v\n", albID)
}

// albumsByArtist查询具有指定艺术家名称的专辑。
func albumsByArtist(name string) ([]Album, error) {
	// 一个用于保存返回行数据的专辑切片。
	var albums []Album

	rows, err := db.Query("SELECT * FROM album WHERE artist = ?", name)
	if err != nil {
		return nil, fmt.Errorf("albumsByArtist %q: %v", name, err)
	}
	defer rows.Close()
	// 遍历行，使用Scan将列数据赋值给结构体字段。
	for rows.Next() {
		var alb Album
		if err := rows.Scan(&alb.ID, &alb.Title, &alb.Artist, &alb.Price); err != nil {
			return nil, fmt.Errorf("albumsByArtist %q: %v", name, err)
		}
		albums = append(albums, alb)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("albumsByArtist %q: %v", name, err)
	}
	return albums, nil
}

// albumByID查询具有指定ID的专辑。
func albumByID(id int64) (Album, error) {
	// 一个用于保存返回行数据的专辑。
	var alb Album

	row := db.QueryRow("SELECT * FROM album WHERE id = ?", id)
	if err := row.Scan(&alb.ID, &alb.Title, &alb.Artist, &alb.Price); err != nil {
		if err == sql.ErrNoRows {
			return alb, fmt.Errorf("albumsById %d: no such album", id)
		}
		return alb, fmt.Errorf("albumsById %d: %v", id, err)
	}
	return alb, nil
}

// addAlbum将指定的专辑添加到数据库，
// 返回新条目的专辑ID。
func addAlbum(alb Album) (int64, error) {
	result, err := db.Exec("INSERT INTO album (title, artist, price) VALUES (?, ?, ?)", alb.Title, alb.Artist, alb.Price)
	if err != nil {
		return 0, fmt.Errorf("addAlbum: %v", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("addAlbum: %v", err)
	}
	return id, nil
}
```