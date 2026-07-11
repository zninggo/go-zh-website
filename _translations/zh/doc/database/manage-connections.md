<!--{
  "Title": "管理连接"
}-->

对于绝大多数程序，你无需调整 `sql.DB` 连接池的默认配置。但对于某些高级程序，你可能需要调整连接池参数或显式操作连接。本主题将说明如何实现。

[`sql.DB`](https://pkg.go.dev/database/sql#DB) 数据库句柄支持多 goroutine 并发使用（即该句柄在其他语言中通常被称为"线程安全"）。其他一些数据库访问库基于连接实现，每个连接一次只能执行一个操作。为解决这个问题，每个 `sql.DB` 都会管理一个到基础数据库的活动连接池，并根据程序并行需求按需创建新连接。

连接池适用于大多数数据访问场景。当你调用 `sql.DB` 的 `Query` 或 `Exec` 方法时，`sql.DB` 实现会从池中获取可用连接，若需要则创建新连接。当连接不再需要时，包会将其返回连接池。这为数据库访问提供了高并行性支持。

### 设置连接池属性 {#connection_pool_properties}

你可以设置属性来指导 `sql` 包如何管理连接池。要查看这些属性的效果统计信息，可使用 [`DB.Stats`](https://pkg.go.dev/database/sql#DB.Stats)。

#### 设置最大打开连接数 {#max_open_connections}

[`DB.SetMaxOpenConns`](https://pkg.go.dev/database/sql#DB.SetMaxOpenConns) 对打开的连接数量施加限制。超过此限制后，新的数据库操作将等待现有操作完成，此时 `sql.DB` 会创建另一个连接。默认情况下，当需要连接且所有现有连接都处于使用中时，`sql.DB` 会创建新连接。

请注意，设置限制会使数据库使用类似于获取锁或信号量，这可能导致应用程序在等待新数据库连接时发生死锁。

#### 设置最大空闲连接数 {#max_idle_connections}

[`DB.SetMaxIdleConns`](https://pkg.go.dev/database/sql#DB.SetMaxIdleConns) 更改 `sql.DB` 维护的最大空闲连接数限制。

当 SQL 操作在特定数据库连接上完成时，该连接通常不会立即关闭：应用程序可能很快又需要它，保持连接打开可以避免为下一个操作重新连接数据库。默认情况下，`sql.DB` 在任何时刻会保留两个空闲连接。提高此限制可以避免在并行度较高的程序中频繁重新连接。

#### 设置连接最大空闲时间 {#max_idle_time}

[`DB.SetConnMaxIdleTime`](https://pkg.go.dev/database/sql#DB.SetConnMaxIdleTime) 设置连接在被关闭前可以保持空闲的最长时间。这会导致 `sql.DB` 关闭空闲时间超过给定时长的连接。

默认情况下，当空闲连接添加到连接池时，它会一直保留直到再次被需要。当使用 `DB.SetMaxIdleConns` 在并发活动突发期间增加允许的空闲连接数时，同时使用 `DB.SetConnMaxIdleTime` 可以安排在系统空闲时释放这些连接。

#### 设置连接最大生命周期 {#max_connection_lifetime}

使用 [`DB.SetConnMaxLifetime`](https://pkg.go.dev/database/sql#DB.SetConnMaxLifetime) 设置连接在被关闭前可以保持打开的最长时间。

默认情况下，连接可以任意长时间地使用和重复使用，但受上述限制的约束。在某些系统中（例如使用负载均衡数据库服务器的系统），确保应用程序不会长时间使用特定连接而不重新连接可能是有益的。

### 使用专用连接 {#dedicated_connections}

`database/sql` 包包含一些函数，当数据库可能对特定连接上执行的操作序列分配隐式含义时可以使用这些函数。

最常见的例子是事务，它们通常以 `BEGIN` 命令开始，以 `COMMIT` 或 `ROLLBACK` 命令结束，并包含这两个命令之间在连接上发出的所有命令，这些命令共同构成一个完整的事务。对于此用例，请使用 `sql` 包的事务支持。请参阅[执行事务](/doc/database/execute-transactions)。

对于其他需要在同一连接上执行一系列单独操作的用例，`sql` 包提供了专用连接。[`DB.Conn`](https://pkg.go.dev/database/sql#DB.Conn) 获取一个专用连接，即 [`sql.Conn`](https://pkg.go.dev/database/sql#Conn)。`sql.Conn` 具有 `BeginTx`、`ExecContext`、`PingContext`、`PrepareContext`、`QueryContext` 和 `QueryRowContext` 方法，这些方法的行为与 DB 上的等效方法相同，但仅使用专用连接。当完成专用连接的使用后，你的代码必须使用 `Conn.Close` 释放它。