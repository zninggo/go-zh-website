<!--{
  "Title": "管理连接"
}-->

对于绝大多数程序，您无需调整 `sql.DB` 连接池的默认设置。但对于某些高级程序，您可能需要调优连接池参数或显式处理连接。本主题将解释如何操作。

[`sql.DB`](https://pkg.go.dev/database/sql#DB) 数据库句柄可供多个 goroutine（协程）并发使用（这意味着该句柄在其他语言中可能被称为“线程安全的”）。其他一些数据库访问库基于一次只能执行一个操作的连接。为了弥补这一差距，每个 `sql.DB` 都管理一个与底层数据库的活动连接池，并根据您 Go 程序中的并行需求创建新连接。

连接池适用于大多数数据访问需求。当您调用 `sql.DB` 的 `Query` 或 `Exec` 方法时，`sql.DB` 实现会从池中检索一个可用的连接，如果需要则会创建一个新连接。当连接不再需要时，包会将其归还到池中。这为数据库访问提供了高水平的并行支持。

### 设置连接池属性 {#connection_pool_properties}

您可以设置属性来指导 `sql` 包如何管理连接池。要获取这些属性效果的统计信息，请使用 [`DB.Stats`](https://pkg.go.dev/database/sql#DB.Stats)。

#### 设置最大打开连接数 {#max_open_connections}

[`DB.SetMaxOpenConns`](https://pkg.go.dev/database/sql#DB.SetMaxOpenConns) 限制了打开连接的数量。超过此限制后，新的数据库操作将等待现有操作完成，届时 `sql.DB` 将创建另一个连接。默认情况下，`sql.DB` 会在需要连接且所有现有连接都已被使用时创建新连接。

请记住，设置限制会使数据库使用类似于获取锁或信号量，其结果是您的应用程序可能会因等待新的数据库连接而发生死锁。

#### 设置最大空闲连接数 {#max_idle_connections}

[`DB.SetMaxIdleConns`](https://pkg.go.dev/database/sql#DB.SetMaxIdleConns) 更改了 `sql.DB` 维护的最大空闲连接数限制。

当在给定的数据库连接上完成 SQL 操作时，它通常不会立即关闭：应用程序可能很快又需要它，并且保留已打开的连接可以避免为下一次操作重新连接数据库。默认情况下，`sql.DB` 在任何给定时刻保持两个空闲连接。提高此限制可以在具有显著并行性的程序中避免频繁的重连。

#### 设置连接最大空闲时间 {#max_idle_time}

[`DB.SetConnMaxIdleTime`](https://pkg.go.dev/database/sql#DB.SetConnMaxIdleTime) 设置连接在关闭前可以空闲的最长时间。这会导致 `sql.DB` 关闭空闲时间超过给定时长的连接。

默认情况下，当空闲连接被添加到连接池时，它会一直保留在那里直到再次被使用。当使用 `DB.SetMaxIdleConns` 在并发活动突发期间增加允许的空闲连接数时，同时使用 `DB.SetConnMaxIdleTime` 可以安排在系统安静时稍后释放这些连接。

#### 设置连接最大生命周期 {#max_connection_lifetime}

使用 [`DB.SetConnMaxLifetime`](https://pkg.go.dev/database/sql#DB.SetConnMaxLifetime) 设置连接在关闭前可以保持打开的最长时间。

默认情况下，连接可以被任意长时间地使用和重用，但要遵守上述描述的限制。在某些系统中，例如使用负载均衡数据库服务器的系统，确保应用程序永远不会在不重新连接的情况下长时间使用特定连接可能是有帮助的。

### 使用专用连接 {#dedicated_connections}

`database/sql` 包包含一些函数，当数据库可能对在特定连接上执行的操作序列赋予隐含含义时，您可以使用它们。

最常见的例子是事务，通常以 `BEGIN` 命令开始，以 `COMMIT` 或 `ROLLBACK` 命令结束，并包含在整体事务中这两个命令之间在该连接上发出的所有命令。对于此用例，请使用 `sql` 包的事务支持。参见[执行事务](/doc/database/execute-transactions)。

对于其他需要一系列独立操作必须全部在同一连接上执行的用例，`sql` 包提供了专用连接。[`DB.Conn`](https://pkg.go.dev/database/sql#DB.Conn) 获取一个专用连接，即 [`sql.Conn`](https://pkg.go.dev/database/sql#Conn)。`sql.Conn` 具有 `BeginTx`、`ExecContext`、`PingContext`、`PrepareContext`、`QueryContext` 和 `QueryRowContext` 方法，它们的行为类似于 DB 上的等效方法，但仅使用专用连接。当不再使用专用连接时，您的代码必须使用 `Conn.Close` 释放它。