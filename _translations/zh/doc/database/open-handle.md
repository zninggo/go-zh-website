<!--{
  "Title": "打开数据库句柄",
  "Breadcrumb": true
}-->

[`database/sql`](https://pkg.go.dev/database/sql) 包通过减少您手动管理连接的需求，简化了数据库访问。与许多数据访问 API 不同，使用 `database/sql` 时，您无需显式打开连接、执行操作然后关闭连接。相反，您的代码会打开一个代表连接池的数据库句柄，然后使用该句柄执行数据访问操作，仅在需要释放资源（例如检索到的行或预编译语句所持有的资源）时才调用 `Close` 方法。

换句话说，由 [`sql.DB`](https://pkg.go.dev/database/sql#DB) 表示的数据库句柄会替您的代码管理连接，代表您的代码打开和关闭它们。当您的代码使用该句柄执行数据库操作时，这些操作可以并发地访问数据库。更多信息，请参阅[管理连接](/doc/database/manage-connections)。

**注意：** 您也可以预留一个数据库连接。更多信息，请参阅[使用专用连接](/doc/database/manage-connections#dedicated_connections)。

除了 `database/sql` 包中提供的 API 外，Go 社区还为所有最常见的（以及许多不常见的）数据库管理系统（DBMS）开发了驱动程序。

打开数据库句柄时，您需要遵循以下高级步骤：

1.  **定位驱动程序。**
    驱动程序负责在您的 Go 代码和数据库之间转换请求和响应。更多信息，请参阅[定位并导入数据库驱动程序](#database_driver)。

2.  **打开数据库句柄。**
    导入驱动程序后，您可以为特定数据库打开一个句柄。更多信息，请参阅[打开数据库句柄](#opening_handle)。

3.  **确认连接。**
    打开数据库句柄后，您的代码可以检查连接是否可用。更多信息，请参阅[确认连接](#confirm_connection)。

您的代码通常不会显式打开或关闭数据库连接——这些操作由数据库句柄处理。但是，您的代码应释放其在此过程中获取的资源，例如包含查询结果的 `sql.Rows`。更多信息，请参阅[释放资源](#free_resources)。

### 定位并导入数据库驱动程序 {#database_driver}

您需要一个支持您所使用 DBMS 的驱动程序。要定位您的数据库的驱动程序，请参阅 [SQLDrivers](/wiki/SQLDrivers)。

要使驱动程序对您的代码可用，您需要像导入其他 Go 包一样导入它。这是一个示例：```
import "github.com/go-sql-driver/mysql"
```请注意，如果您没有直接调用驱动程序包中的任何函数——例如当该驱动程序被 `sql` 包隐式使用时——您需要使用空白导入，其导入路径以下划线开头：```
import _ "github.com/go-sql-driver/mysql"
```**注意：** 作为最佳实践，应避免使用数据库驱动程序自身的 API 进行数据库操作。请转而使用 `database/sql` 包中的函数。这将有助于保持您的代码与数据库管理系统（DBMS）松散耦合，使得在需要时更容易切换到不同的 DBMS。

### 打开数据库句柄 {#opening_handle}

`sql.DB` 数据库句柄提供了对数据库进行读写操作的能力，无论是单次操作还是在事务中进行。

您可以通过调用 `sql.Open`（接受连接字符串）或 `sql.OpenDB`（接受 `driver.Connector`）来获取数据库句柄。两者都返回一个指向 [`sql.DB`](https://pkg.go.dev/database/sql#DB) 的指针。

**注意：** 请务必确保数据库凭据不包含在您的 Go 源代码中。更多信息，请参阅 [存储数据库凭据](#store_credentials)。

#### 使用连接字符串打开 {#open_connection_string}

当您想使用连接字符串进行连接时，请使用 [`sql.Open` 函数](https://pkg.go.dev/database/sql#Open)。该字符串的格式将根据您使用的驱动程序而有所不同。

以下是针对 MySQL 的一个示例：```
db, err = sql.Open("mysql", "username:password@tcp(127.0.0.1:3306)/jazzrecords")
if err != nil {
	log.Fatal(err)
}
```不过，你可能会发现，以一种更结构化的方式来捕获连接属性，能让代码更具可读性。具体细节会因驱动程序而异。

例如，你可以用以下代码替换前面的例子，它使用 MySQL 驱动程序的 [`Config`](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config) 来指定属性，并使用其 [`FormatDSN 方法`](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config.FormatDSN) 来构建连接字符串。```go
// 指定连接属性。
cfg := mysql.NewConfig()
cfg.User = username
cfg.Passwd = password
cfg.Net = "tcp"
cfg.Addr = "127.0.0.1:3306"
cfg.DBName = "jazzrecords"

// 获取数据库句柄。
db, err = sql.Open("mysql", cfg.FormatDSN())
if err != nil {
	log.Fatal(err)
}
```#### 使用Connector打开连接 {#open_connector}

当您希望利用连接字符串中不可用的驱动特定连接功能时，可以使用 [`sql.OpenDB函数`](https://pkg.go.dev/database/sql#OpenDB)。每个驱动程序都支持自己的一套连接属性，通常提供针对特定数据库管理系统定制连接请求的方法。

若要将前面的 `sql.Open` 示例调整为使用 `sql.OpenDB`，您可以使用如下代码创建句柄：

```go
// 创建驱动特定的连接器。
// 这里以MySQL驱动为例，假设需要自定义连接属性。
// 通常需要导入对应的驱动包，例如：
// import "github.com/go-sql-driver/mysql"

cfg := mysql.NewConfig()
cfg.User = username
cfg.Passwd = password
cfg.Net = "tcp"
cfg.Addr = "127.0.0.1:3306"
cfg.DBName = "jazzrecords"
cfg.Params = map[string]string{
    "charset": "utf8mb4",
    // 添加其他驱动特定参数
}

// 使用配置创建Connector
connector, err := mysql.NewConnector(cfg)
if err != nil {
    log.Fatal(err)
}

// 使用Connector打开数据库句柄
db = sql.OpenDB(connector)
``````
// 指定连接属性
cfg := mysql.NewConfig()
cfg.User = username
cfg.Passwd = password
cfg.Net = "tcp"
cfg.Addr = "127.0.0.1:3306"
cfg.DBName = "jazzrecords"

// 获取驱动特定的连接器
connector, err := mysql.NewConnector(&cfg)
if err != nil {
    log.Fatal(err)
}

// 获取数据库句柄
db = sql.OpenDB(connector)
```#### 处理错误 {#handle_errors}

您的代码应当检查创建句柄时可能发生的错误，例如使用 `sql.Open` 时。这不会是连接错误。相反，如果 `sql.Open` 无法初始化句柄，您会收到错误提示。例如，当它无法解析您指定的 DSN 时，就可能发生这种情况。

### 确认连接 {#confirm_connection}

当您打开数据库句柄时，`sql` 包可能不会立即创建新的数据库连接。相反，它可能会在您的代码需要时才创建连接。如果您不会立即使用数据库，并且想要确认连接是否能够建立，请调用 [`Ping`](https://pkg.go.dev/database/sql#DB.Ping) 或 [`PingContext`](https://pkg.go.dev/database/sql#DB.PingContext)。

以下示例代码通过向数据库发送 ping 来确认连接。```go
db, err = sql.Open("mysql", connString)

// 确认连接成功。
if err := db.Ping(); err != nil {
	log.Fatal(err)
}
```### 存储数据库凭证 {#store_credentials}

请避免将数据库凭证直接存储在Go源代码中，否则可能暴露您的数据库内容。应将其存储在代码外部但可访问的位置。例如，可考虑使用密钥管理器应用程序，该程序专门存储凭证并提供API接口供代码调用，以便向数据库管理系统进行身份验证。

一种常见方案是在程序启动前将密钥存储于环境变量中（可通过密钥管理器加载），随后在Go程序中通过 [`os.Getenv`](https://pkg.go.dev/os#Getenv) 函数读取这些变量：```
username := os.Getenv("DB_USER")
password := os.Getenv("DB_PASS")
```这种方法也允许您自行设置环境变量以进行本地测试。

### 释放资源 {#free_resources}

虽然使用 `database/sql` 包时您无需显式管理或关闭连接，但当资源不再需要时，您的代码应当释放已获取的资源。这些资源可能包括 `sql.Rows`（代表查询返回的数据）或 `sql.Stmt`（代表预处理语句）所持有的资源。

通常情况下，您可以通过延迟调用 `Close` 函数来关闭资源，从而确保在包含该语句的函数退出前释放资源。

以下示例中的代码通过延迟调用 `Close` 来释放 [`sql.Rows`](https://pkg.go.dev/database/sql#Rows) 所持有的资源。```go
rows, err := db.Query("SELECT * FROM album WHERE artist = ?", artist)
if err != nil {
	log.Fatal(err)
}
defer rows.Close()

// 遍历返回的结果集
```