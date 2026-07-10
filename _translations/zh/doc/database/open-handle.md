<!--{
  "Title": "打开数据库句柄",
  "Breadcrumb": true
}-->

[`database/sql`](https://pkg.go.dev/database/sql) 包简化了数据库访问，减少了您管理连接的需要。与许多数据访问 API 不同，使用 `database/sql` 时，您无需显式打开连接、执行操作，然后再关闭连接。相反，您的代码会打开一个代表连接池的数据库句柄，然后使用该句柄执行数据访问操作，仅在需要释放资源（例如检索到的行或预编译语句持有的资源）时才调用 `Close` 方法。

换言之，代表 [`sql.DB`](https://pkg.go.dev/database/sql#DB) 的数据库句柄负责处理连接，代您的代码打开和关闭它们。当您的代码使用该句柄执行数据库操作时，这些操作可以并发访问数据库。更多信息，请参阅[管理连接](/doc/database/manage-connections)。

**注意：** 您还可以预留数据库连接。有关更多信息，请参阅[使用专用连接](/doc/database/manage-connections#dedicated_connections)。

除了 `database/sql` 包中提供的 API 外，Go 社区还为所有最常见（以及许多不常见）的数据库管理系统（DBMS）开发了驱动程序。

打开数据库句柄时，您通常遵循以下高级步骤：

1.  **定位驱动程序。**

    驱动程序负责在您的 Go 代码和数据库之间转换请求和响应。更多信息，请参阅[定位并导入数据库驱动程序](#database_driver)。

2.  **打开数据库句柄。**

    导入驱动程序后，您可以为特定的数据库打开一个句柄。更多信息，请参阅[打开数据库句柄](#opening_handle)。

3.  **确认连接。**

    打开数据库句柄后，您的代码可以检查连接是否可用。更多信息，请参阅[确认连接](#confirm_connection)。

您的代码通常不会显式地打开或关闭数据库连接——这部分工作由数据库句柄完成。但是，您的代码应该释放其在过程中获得的资源，例如包含查询结果的 `sql.Rows`。更多信息，请参阅[释放资源](#free_resources)。

### 定位并导入数据库驱动程序 {#database_driver}

您需要一个支持您所用 DBMS 的数据库驱动程序。要为您的数据库定位驱动程序，请参阅 [SQLDrivers](/wiki/SQLDrivers)。

要使驱动程序对您的代码可用，您可以像导入其他 Go 包一样导入它。这是一个示例：```
import "github.com/go-sql-driver/mysql"
```请注意，如果您没有直接从驱动程序包调用任何函数——例如当它被某个包隐式使用时——您需要使用一个空白导入，即在导入路径前加上一个下划线：```
import _ "github.com/go-sql-driver/mysql"
```**注意：** 最佳实践是避免使用数据库驱动自身的 API 进行数据库操作。请改用 `database/sql` 包中的函数。这将有助于保持代码与数据库管理系统（DBMS）的松散耦合，从而在需要时更易于切换到不同的 DBMS。

### 打开数据库句柄 {#opening_handle}

`sql.DB` 数据库句柄提供了从数据库读取和写入数据的能力，无论是单次操作还是事务操作。

您可以通过调用 `sql.Open`（接受连接字符串）或 `sql.OpenDB`（接受 `driver.Connector`）来获取数据库句柄。两者都会返回一个指向 [`sql.DB`](https://pkg.go.dev/database/sql#DB) 的指针。

**注意：** 请确保不要将数据库凭据存放在 Go 源代码中。更多信息请参阅[存储数据库凭据](#store_credentials)。

#### 使用连接字符串打开 {#open_connection_string}

当您希望使用连接字符串进行连接时，请使用 [`sql.Open` 函数](https://pkg.go.dev/database/sql#Open)。字符串的格式将因您使用的驱动程序而异。

以下是 MySQL 的示例：```
db, err = sql.Open("mysql", "username:password@tcp(127.0.0.1:3306)/jazzrecords")
if err != nil {
	log.Fatal(err)
}
```然而，您可能会发现，以更结构化的方式捕获连接属性能使代码更具可读性。具体细节会因驱动程序而异。

例如，您可以使用 MySQL 驱动程序的 [`Config`](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config) 结构体来指定连接属性，并结合其 [`FormatDSN` 方法](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config.FormatDSN)来构建连接字符串，从而替代前面的示例。```go
// [待翻译: Specify connection properties.]
cfg := mysql.NewConfig()
cfg.User = username
cfg.Passwd = password
cfg.Net = "tcp"
cfg.Addr = "127.0.0.1:3306"
cfg.DBName = "jazzrecords"

// [待翻译: Get a database handle.]
db, err = sql.Open("mysql", cfg.FormatDSN())
if err != nil {
	log.Fatal(err)
}
```

```go
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
```#### 使用连接器打开连接 {#open_connector}

当您希望利用连接字符串中未提供的驱动程序特定连接特性时，请使用 [`sql.OpenDB 函数`](https://pkg.go.dev/database/sql#OpenDB)。每个驱动程序都支持其自身的一套连接属性，通常提供针对特定数据库管理系统（DBMS）定制连接请求的方式。

若要将前述 `sql.Open` 示例调整为使用 `sql.OpenDB`，可以使用如下代码创建数据库句柄：

```go
// 创建连接器（需实现 driver.Connector 接口）。
connector := &myDriverConnector{ /* 配置参数 */ }

// 通过连接器获取数据库句柄。
db, err = sql.OpenDB(connector)
if err != nil {
	log.Fatal(err)
}
``````
// 指定连接属性。
cfg := mysql.NewConfig()
cfg.User = username
cfg.Passwd = password
cfg.Net = "tcp"
cfg.Addr = "127.0.0.1:3306"
cfg.DBName = "jazzrecords"

// 获取驱动特定的连接器。
connector, err := mysql.NewConnector(&cfg)
if err != nil {
	log.Fatal(err)
}

// 获取数据库句柄。
db = sql.OpenDB(connector)
```#### 处理错误 {#handle_errors}

你的代码应当检查尝试创建数据库句柄（例如通过 `sql.Open`）时产生的错误。这类错误并非连接错误，而是指 `sql.Open` 无法初始化句柄时返回的错误。例如，当它无法解析你指定的 DSN（数据源名称）时，就可能发生此类错误。

### 确认连接 {#confirm_connection}

当你打开一个数据库句柄时，`sql` 包可能并不会立即创建新的数据库连接。相反，它可能会在你的代码需要时才创建连接。如果你不打算立即使用数据库，且希望确认能否建立连接，可以调用 [`Ping`](https://pkg.go.dev/database/sql#DB.Ping) 或 [`PingContext`](https://pkg.go.dev/database/sql#DB.PingContext) 方法。

以下示例代码通过 ping 数据库来确认连接。```go
db, err = sql.Open("mysql", connString)

// 确认连接成功。
if err := db.Ping(); err != nil {
    log.Fatal(err)
}
```### 存储数据库凭证 {#store_credentials}

避免将数据库凭证直接存储在 Go 源代码中，这可能会导致数据库内容暴露给他人。相反，应寻找一种方法将凭证存储在代码外部但可访问的位置。例如，考虑使用一个密钥保管应用来存储凭证，并提供 API 供你的代码调用，以便获取用于数据库管理系统认证的凭证。

一种常见的做法是在程序启动前将密钥存储在环境变量中（这些环境变量可能从密钥管理器加载），随后你的 Go 程序可以使用 [`os.Getenv`](https://pkg.go.dev/os#Getenv) 来读取它们：```
username := os.Getenv("DB_USER")
password := os.Getenv("DB_PASS")
```这种方法也允许你在本地测试时自行设置环境变量。

### 释放资源 {#free_resources}

虽然使用 `database/sql` 包时你无需显式管理或关闭连接，但当不再需要资源时，你的代码应当释放已获取的资源。这些资源可能包括表示查询返回数据的 `sql.Rows` 对象，或表示预处理语句的 `sql.Stmt` 对象所持有的资源。

通常的做法是通过 `defer` 调用 `Close` 函数来释放资源，确保在包含该操作的函数退出前资源得到释放。

以下示例代码通过 `defer` 调用 `Close` 来释放 [`sql.Rows`](https://pkg.go.dev/database/sql#Rows) 所持有的资源。```go
rows, err := db.Query("SELECT * FROM album WHERE artist = ?", artist)
if err != nil {
	log.Fatal(err)
}
defer rows.Close()

// 遍历返回的查询结果
```