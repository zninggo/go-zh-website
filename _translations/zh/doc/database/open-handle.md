<!--{
  "Title": "打开数据库句柄",
  "Breadcrumb": true
}-->

[`database/sql`](https://pkg.go.dev/database/sql) 包通过减少你对连接管理的需求，简化了数据库访问。与许多数据访问 API 不同，使用 `database/sql` 时，你无需显式地打开连接、执行工作、然后关闭连接。相反，你的代码会打开一个代表连接池的数据库句柄，然后使用该句柄执行数据访问操作，仅在需要释放资源时（例如检索到的行或预处理语句所持有的资源）才调用 `Close` 方法。

换句话说，是由数据库句柄（以 [`sql.DB`](https://pkg.go.dev/database/sql#DB) 表示）负责处理连接，代表你的代码打开和关闭它们。当你的代码使用该句柄执行数据库操作时，这些操作可以并发地访问数据库。更多信息，请参阅[管理连接](/doc/database/manage-connections)。

**注意：** 你也可以预留一个数据库连接。更多信息，请参阅[使用专用连接](/doc/database/manage-connections#dedicated_connections)。

除了 `database/sql` 包中提供的 API 之外，Go 社区已经为所有最常见（以及许多不常见）的数据库管理系统 (DBMS) 开发了驱动程序。

打开一个数据库句柄时，你需要遵循以下高层步骤：

1.  **定位驱动程序。**

    驱动程序负责在你的 Go 代码和数据库之间翻译请求和响应。更多信息，请参阅[定位并导入数据库驱动程序](#database_driver)。

2.  **打开数据库句柄。**

    导入驱动程序后，你就可以为特定数据库打开一个句柄。更多信息，请参阅[打开数据库句柄](#opening_handle)。

3.  **确认连接。**

    打开数据库句柄后，你的代码可以检查连接是否可用。更多信息，请参阅[确认连接](#confirm_connection)。

你的代码通常不会显式地打开或关闭数据库连接——这是由数据库句柄来完成的。然而，你的代码应当释放它在此过程中获取的资源，例如包含查询结果的 `sql.Rows`。更多信息，请参阅[释放资源](#free_resources)。

### 定位并导入数据库驱动程序 {#database_driver}

你需要一个支持你所使用 DBMS 的数据库驱动程序。要为你使用的数据库定位驱动程序，请参阅 [SQLDrivers](/wiki/SQLDrivers)。

要使驱动程序对你的代码可用，你需要像导入其他 Go 包一样导入它。这是一个示例：```
import "github.com/go-sql-driver/mysql"
```需要注意的是，如果你没有直接调用驱动程序包中的任何函数——例如当它被 `sql` 包隐式使用时——你需要使用一个空白导入，即在导入路径前加上下划线前缀：```
import _ "github.com/go-sql-driver/mysql"
```**注意：** 作为最佳实践，避免使用数据库驱动程序自身的 API 进行数据库操作。相反，请使用 `database/sql` 包中的函数。这将有助于保持代码与 DBMS 的松散耦合，使得在需要时更容易切换到不同的 DBMS。

### 打开数据库句柄 {#opening_handle}

`sql.DB` 数据库句柄提供了读取和写入数据库的能力，可以单独操作，也可以在事务中进行。

你可以通过调用 `sql.Open`（接受连接字符串）或 `sql.OpenDB`（接受 `driver.Connector`）来获取数据库句柄。两者都返回一个指向 [`sql.DB`](https://pkg.go.dev/database/sql#DB) 的指针。

**注意：** 务必确保你的数据库凭据不包含在 Go 源代码中。更多信息，请参阅[存储数据库凭据](#store_credentials)。

#### 使用连接字符串打开 {#open_connection_string}

当你想使用连接字符串进行连接时，请使用 [`sql.Open` 函数](https://pkg.go.dev/database/sql#Open)。字符串的格式将根据你使用的驱动程序而有所不同。

以下是 MySQL 的一个示例：```
db, err = sql.Open("mysql", "username:password@tcp(127.0.0.1:3306)/jazzrecords")
if err != nil {
	log.Fatal(err)
}
```然而，你很可能会发现，采用更结构化的方式来管理连接属性，能使代码更具可读性。具体细节会因驱动程序而异。

例如，你可以用以下代码替换之前的示例。这里使用了 MySQL 驱动程序的 [`Config` 结构体](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config) 来指定属性，并调用其 [`FormatDSN` 方法](https://pkg.go.dev/github.com/go-sql-driver/mysql#Config.FormatDSN) 来构建连接字符串。```
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

当您希望利用连接字符串中未提供的驱动程序特定连接功能时，可使用 [`sql.OpenDB 函数`](https://pkg.go.dev/database/sql#OpenDB)。每个驱动程序都支持其独有的连接属性集，通常能针对特定数据库管理系统定制连接请求。

将前述 `sql.Open` 示例改编为使用 `sql.OpenDB`，可通过类似以下代码创建数据库句柄：```
// [待翻译: Specify connection properties.]
// 指定连接属性。
cfg := mysql.NewConfig()
cfg.User = username
cfg.Passwd = password
cfg.Net = "tcp"
cfg.Addr = "127.0.0.1:3306"
cfg.DBName = "jazzrecords"

// [待翻译: Get a driver-specific connector.]
// 获取驱动程序特定的连接器。
connector, err := mysql.NewConnector(&cfg)
if err != nil {
	log.Fatal(err)
}

// [待翻译: Get a database handle.]
// 获取数据库句柄。
db = sql.OpenDB(connector)
```#### 错误处理 {#handle_errors}

你的代码应当检查创建句柄时可能发生的错误，例如调用 `sql.Open` 时。这并非连接错误，而是在 `sql.Open` 无法初始化句柄时才会出现。例如，当它无法解析你指定的数据源名称（DSN）时，就可能发生这种情况。

### 确认连接 {#confirm_connection}

当你打开一个数据库句柄时，`sql` 包本身可能不会立即创建新的数据库连接。相反，它可能会在你的代码实际需要时才创建连接。如果你不会立即使用数据库，但又希望确认连接可以成功建立，请调用 [`Ping`](https://pkg.go.dev/database/sql#DB.Ping) 或 [`PingContext`](https://pkg.go.dev/database/sql#DB.PingContext)。

以下示例代码向数据库发送 Ping 请求以确认连接是否建立。```go
db, err = sql.Open("mysql", connString)

// 确认连接是否成功。
if err := db.Ping(); err != nil {
	log.Fatal(err)
}
```### 存储数据库凭证 {#store_credentials}

避免在 Go 源代码中直接存储数据库凭证，这可能会将您的数据库内容暴露给他人。相反，您应该寻找一种方法将这些凭证存储在代码之外、但代码仍可访问的位置。例如，可以考虑使用一个密钥保管应用，该应用负责存储凭证，并提供一个 API，您的代码可以通过它来获取凭证，以用于与您的数据库管理系统进行身份验证。

一种常见的做法是在程序启动前将密钥存储到环境变量中（这些变量可能从密钥管理器加载），然后您的 Go 程序可以使用 [`os.Getenv`](https://pkg.go.dev/os#Getenv) 来读取它们。```
username := os.Getenv("DB_USER")
password := os.Getenv("DB_PASS")
```这种方法也允许您为本地测试自行设置环境变量。

### 释放资源 {#free_resources}

虽然使用 `database/sql` 包时您无需显式管理或关闭连接，但您的代码应该在不再需要时释放它所获取的资源。这些资源可能包括代表查询返回数据的 `sql.Rows` 或代表预处理语句的 `sql.Stmt` 所持有的资源。

通常，您可以通过延迟调用 `Close` 函数来关闭资源，以便在包含该代码的函数退出前释放资源。

以下示例代码中的 `Close` 延迟调用用于释放 [`sql.Rows`](https://pkg.go.dev/database/sql#Rows) 所持有的资源。```go
rows, err := db.Query("SELECT * FROM album WHERE artist = ?", artist)
if err != nil {
	log.Fatal(err)
}
defer rows.Close()

// 遍历返回的行。
```