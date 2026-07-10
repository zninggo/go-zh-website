<!--{
  "Title": "管理连接"
}-->

对于绝大多数程序，您无需调整 `sql.DB` 连接池的默认设置。但对于一些高级程序，您可能需要调整连接池参数或显式地操作连接。本主题将对此进行说明。

[`sql.DB`](https://pkg.go.dev/database/sql#DB) 数据库句柄可供多个 goroutine（协程）并发使用（这意味着该句柄在其他语言中可能被称为“线程安全”）。其他一些数据库访问库基于一次只能用于一个操作的连接。为了弥合这一差距，每个 `sql.DB` 都会管理一个到基础数据库的活动连接池，并在您的 Go 程序需要并发执行时按需创建新连接。

连接池适用于大多数数据访问需求。当您调用 `sql.DB` 的 `Query` 或 `Exec` 方法时，`sql.DB` 的实现会从池中检索一个可用连接，或者在需要时创建一个。当连接不再需要时，包会将其返回到池中。这支持了高级别的数据库访问并发性。

### 设置连接池属性 {#connection_pool_properties}

您可以设置属性来指导 `sql` 包如何管理连接池。要获取这些属性影响的统计数据，请使用 [`DB.Stats`](https://pkg.go.dev/database/sql#DB.Stats)。

#### 设置最大打开连接数 {#max_open_connections}

[`DB.SetMaxOpenConns`](https://pkg.go.dev/database/sql#DB.SetMaxOpenConns) 对打开的连接数量施加限制。超过此限制后，新的数据库操作将等待现有操作完成，届时 `sql.DB` 将创建另一个连接。默认情况下，`sql.DB` 会在需要连接时，如果所有现有连接都在使用中，就创建一个新连接。

请记住，设置限制会使数据库使用类似于获取锁或信号量，其结果是您的应用程序可能在等待新的数据库连接时发生死锁。

#### 设置最大空闲连接数 {#max_idle_connections}

[`DB.SetMaxIdleConns`](https://pkg.go.dev/database/sql#DB.SetMaxIdleConns) 会改变 `sql.DB` 所维护的最大空闲连接数限制。

当一个 SQL 操作在某个数据库连接上完成时，该连接通常不会立即关闭：应用程序可能很快会再次需要它，而保留打开的连接可以避免为下一次操作重新连接到数据库。默认情况下，`sql.DB` 在任何时刻保持两个空闲连接。提高此限制可以避免在并发性显著的程序中频繁重连。

#### 设置连接的最大空闲时间 {#max_idle_time}

[`DB.SetConnMaxIdleTime`](https://pkg.go.dev/database/sql#DB.SetConnMaxIdleTime) 设置了连接在被关闭前可以保持空闲的最长时间。这会导致 `sql.DB` 关闭空闲时间超过指定时长的连接。

默认情况下，当一个空闲连接被添加到连接池时，它会一直保留在那里直到再次被需要。当使用 `DB.SetMaxIdleConns` 在并发活动高峰期增加允许的空闲连接数时，同时使用 `DB.SetConnMaxIdleTime` 可以安排在系统安静时稍后释放这些连接。

#### 设置连接的最大生命周期 {#max_connection_lifetime}

使用 [`DB.SetConnMaxLifetime`](https://pkg.go.dev/database/sql#DB.SetConnMaxLifetime) 设置连接在关闭前可以保持打开的最长时间。

默认情况下，一个连接可以被使用和复用任意长的时间，但受上述描述的限制。在某些系统中，例如使用负载均衡数据库服务器的系统，确保应用程序不会长时间使用某个特定连接而不重新连接，可能会有所帮助。

### 使用专用连接 {#dedicated_connections}

`database/sql` 包包含一些函数，您可以在数据库可能对在特定连接上执行的一系列操作赋予隐含意义时使用它们。

最常见的例子是事务，它通常以 `BEGIN` 命令开始，以 `COMMIT` 或 `ROLLBACK` 命令结束，并包含这两个命令之间在该连接上发出的所有命令。对于此用例，请使用 `sql` 包的事务支持。参见[执行事务](/doc/database/execute-transactions)。

对于其他需要一系列独立操作必须在同一个连接上全部执行的用例，`sql` 包提供了专用连接。[`DB.Conn`](https://pkg.go.dev/database/sql#DB.Conn) 获取一个专用连接，即 [`sql.Conn`](https://pkg.go.dev/database/sql#Conn)。`sql.Conn` 具有 `BeginTx`、`ExecContext`、`PingContext`、`PrepareContext`、`QueryContext` 和 `QueryRowContext` 方法，它们的行为与 DB 上的等效方法类似，但仅使用专用连接。当使用完专用连接后，您的代码必须使用 `Conn.Close` 来释放它。