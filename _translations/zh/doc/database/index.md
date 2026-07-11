<!--{
  "Title": "访问关系型数据库",
  "Breadcrumb": true
}-->

使用 Go 语言，您可以将各种数据库和数据访问方法集成到应用程序中。本节主题将介绍如何使用标准库的 [`database/sql`](https://pkg.go.dev/database/sql) 包来访问关系型数据库。

有关使用 Go 进行数据访问的入门教程，请参阅[教程：访问关系型数据库](/doc/tutorial/database-access)。

Go 还支持其他数据访问技术，包括用于更高级别关系型数据库访问的 ORM 库，以及非关系型 NoSQL 数据存储。

*   **对象关系映射 (ORM) 库**。虽然 `database/sql` 包包含用于底层数据访问逻辑的函数，但您也可以使用 Go 在更高级别的抽象层访问数据存储。有关两个流行的 Go 对象关系映射 (ORM) 库的更多信息，请参阅 [GORM](https://gorm.io/index.html)（[包参考](https://pkg.go.dev/gorm.io/gorm)）和 [ent](https://entgo.io/)（[包参考](https://pkg.go.dev/entgo.io/ent)）。
*   **NoSQL 数据存储**。Go 社区已为大多数 NoSQL 数据存储开发了驱动程序，包括 [MongoDB](https://docs.mongodb.com/drivers/go/) 和 [Couchbase](https://docs.couchbase.com/go-sdk/current/hello-world/overview.html)。您可以在 [pkg.go.dev](https://pkg.go.dev/) 上搜索更多信息。

### 支持的数据库管理系统 {#supported_dbms}

Go 支持所有最常见的关系型数据库管理系统，包括 MySQL、Oracle、Postgres、SQL Server、SQLite 等。

您可以在 [SQLDrivers](/wiki/SQLDrivers) 页面找到完整的驱动程序列表。

### 执行查询或更改数据库的函数 {#functions}

`database/sql` 包包含专门为您要执行的数据库操作类型设计的函数。例如，虽然您可以使用 `Query` 或 `QueryRow` 来执行查询，但 `QueryRow` 是为预期只返回单行数据的情况设计的，它省去了返回仅包含一行数据的 `sql.Rows` 的开销。您可以使用 `Exec` 函数通过 SQL 语句（如 `INSERT`、`UPDATE` 或 `DELETE`）来更改数据库。

更多信息，请参阅以下内容：

*   [执行不返回数据的 SQL 语句](/doc/database/change-data)
*   [查询数据](/doc/database/querying)

### 事务 {#transactions}

通过 `sql.Tx`，您可以编写代码在事务中执行数据库操作。在一个事务中，多个操作可以一起执行，并通过最终的提交（以原子步骤应用所有更改）或回滚（丢弃所有更改）来结束。

有关事务的更多信息，请参阅[执行事务](/doc/database/execute-transactions)。

### 查询取消 {#query_cancellation}

当您需要取消数据库操作的能力时（例如，当客户端的连接关闭或操作运行时间超出预期时），可以使用 `context.Context`。

对于任何数据库操作，您都可以使用接受 `Context` 作为参数的 `database/sql` 包函数。使用 `Context`，您可以为操作指定超时或截止时间。您还可以使用 `Context` 在您的应用程序中传播取消请求到执行 SQL 语句的函数，确保在资源不再需要时被释放。

更多信息，请参阅[取消正在进行的操作](/doc/database/cancel-operations)。

### 托管连接池 {#connection_pool}

当您使用 `sql.DB` 数据库句柄时，您连接的是一个内置的连接池，它会根据您代码的需要创建和处置连接。通过 `sql.DB` 获得的句柄是进行 Go 数据库访问的最常用方式。更多信息，请参阅[打开数据库句柄](/doc/database/open-handle)。

`database/sql` 包为您管理连接池。然而，对于更高级的需求，您可以按照[设置连接池属性](/doc/database/manage-connections#connection_pool_properties)中的描述来设置连接池属性。

对于那些需要单个专用连接的操作，`database/sql` 包提供了 [`sql.Conn`](https://pkg.go.dev/database/sql#Conn)。当使用 `sql.Tx` 的事务不是最佳选择时，`Conn` 尤其有用。

例如，您的代码可能需要：

*   通过 DDL 进行模式更改，其中包含其自身的事务语义。如[执行事务](/doc/database/execute-transactions)中所述，将 `sql` 包的事务函数与 SQL 事务语句混合使用是一种不良实践。
*   执行创建临时表的查询锁定操作。

更多信息，请参阅[使用专用连接](/doc/database/manage-connections#dedicated_connections)。