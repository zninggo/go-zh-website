<!--{
  "Title": "管理连接"
}-->

对于绝大多数程序，您无需调整 `sql.DB` 连接池的默认设置。但对于一些高级程序，您可能需要调整连接池参数或显式处理连接。本主题将说明具体方法。

[`sql.DB`](https://pkg.go.dev/database/sql#DB) 数据库句柄支持多个协程并发使用（这意味着该句柄是其他语言可能称之为“线程安全”的）。其他一些数据库访问库基于一次只能执行一个操作的连接。为了弥合这一差距，每个 `sql.DB` 都管理一个到后端数据库的活动连接池，并根据 Go 程序中的并行需求创建新连接。

连接池适用于大多数数据访问需求。当您调用 `sql.DB` 的 `Query` 或 `Exec` 方法时，`sql.DB` 实现会从池中获取一个可用连接，或者在需要时创建一个连接。当不再需要时，该包会将连接返回到池中。这为数据库访问提供了高水平的并行支持。

### 设置连接池属性 {#connection_pool_properties}

您可以设置属性来指导 `sql` 包如何管理连接池。要获取这些属性效果的统计数据，请使用 [`DB.Stats`](https://pkg.go.dev/database/sql#DB.Stats)。

#### 设置最大打开连接数 {#max_open_connections}

[`DB.SetMaxOpenConns`](https://pkg.go.dev/database/sql#DB.SetMaxOpenConns) 对打开的连接数量施加限制。超过此限制后，新的数据库操作将等待现有操作完成，届时 `sql.DB` 将创建另一个连接。默认情况下，当需要连接且所有现有连接都在使用中时，`sql.DB` 会创建新连接。

请记住，设置限制会使数据库使用类似于获取锁或信号量，结果可能导致您的应用程序在等待新数据库连接时发生死锁。

#### 设置最大空闲连接数 {#max_idle_connections}

[`DB.SetMaxIdleConns`](https://pkg.go.dev/database/sql#DB.SetMaxIdleConns) 更改 `sql.DB` 维护的最大空闲连接数限制。

当 SQL 操作在给定数据库连接上完成时，通常不会立即关闭该连接：应用程序可能很快会再次需要它，保留打开的连接可以避免为下一次操作重新连接数据库。默认情况下，`sql.DB` 在任何给定时刻保持两个空闲连接。提高限制可以避免在并行性较高的程序中频繁重连。

#### 设置连接的最大空闲时间 {#max_idle_time}

[`DB.SetConnMaxIdleTime`](https://pkg.go.dev/database/sql#DB.SetConnMaxIdleTime) 设置连接在关闭前可以空闲的最长时间。这会导致 `sql.DB` 关闭空闲时间超过给定持续时间的连接。

默认情况下，当空闲连接被添加到连接池时，它会一直保留在那里，直到再次被需要。当使用 `DB.SetMaxIdleConns` 来增加突发并行活动期间允许的空闲连接数时，同时使用 `DB.SetConnMaxIdleTime` 可以安排在系统空闲时稍后释放这些连接。

#### 设置连接的最大生命周期 {#max_connection_lifetime}

使用 [`DB.SetConnMaxLifetime`](https://pkg.go.dev/database/sql#DB.SetConnMaxLifetime) 设置连接在关闭前可以保持打开状态的最长时间。

默认情况下，连接可以在任意长的时间内被使用和重用，但受上述限制约束。在某些系统中，例如使用负载均衡数据库服务器的系统，确保应用程序永远不会在不重连的情况下长时间使用特定连接可能会很有帮助。

### 使用专用连接 {#dedicated_connections}

`database/sql` 包包含一些函数，当数据库可能对在特定连接上执行的操作序列赋予隐含含义时，您可以使用这些函数。

最常见的例子是事务，它通常以 `BEGIN` 命令开始，以 `COMMIT` 或 `ROLLBACK` 命令结束，并且包括在这两个命令之间在该连接上发出的所有命令。对于此用例，请使用 `sql` 包的事务支持。请参阅[执行事务](/doc/database/execute-transactions)。

对于其他需要一系列独立操作都必须在同一连接上执行的用例，`sql` 包提供了专用连接。[`DB.Conn`](https://pkg.go.dev/database/sql#DB.Conn) 获取一个专用连接，即 [`sql.Conn`](https://pkg.go.dev/database/sql#Conn)。`sql.Conn` 具有方法 `BeginTx`、`ExecContext`、`PingContext`、`PrepareContext`、`QueryContext` 和 `QueryRowContext`，其行为类似于 DB 上的等效方法，但仅使用专用连接。当使用完专用连接后，您的代码必须使用 `Conn.Close` 释放它。