<!--{
  "Title": "使用预处理语句"
}-->

您可以定义一个预处理语句以供重复使用。这有助于避免每次执行数据库操作时重新创建语句的开销，从而使代码运行得更快一些。

**注意：** 预处理语句中的参数占位符形式取决于您使用的数据库管理系统和驱动程序。例如，用于Postgres的[pq驱动](https://pkg.go.dev/github.com/lib/pq)要求使用类似`$1`的占位符，而不是`?`。

### 什么是预处理语句？ {#what_prepared_statement}

预处理语句是由数据库管理系统解析并保存的SQL语句，通常包含占位符但不含实际的参数值。之后，该语句可以使用一组参数值来执行。

### 如何使用预处理语句 {#use_prepared_statement}

当您预期需要重复执行相同的SQL语句时，可以使用`sql.Stmt`提前准备SQL语句，然后按需执行。

以下示例创建了一个用于从数据库中选择特定专辑的预处理语句。[`DB.Prepare`](https://pkg.go.dev/database/sql#DB.Prepare)返回一个[`sql.Stmt`](https://pkg.go.dev/database/sql#Stmt)，它代表针对给定SQL文本的预处理语句。您可以将SQL语句的参数传递给`Stmt.Exec`、`Stmt.QueryRow`或`Stmt.Query`来运行该语句。```go
// AlbumByID retrieves the specified album.
func AlbumByID(id int) (Album, error) {
	// Define a prepared statement. You'd typically define the statement
	// elsewhere and save it for use in functions such as this one.
	stmt, err := db.Prepare("SELECT * FROM album WHERE id = ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	var album Album

	// Execute the prepared statement, passing in an id value for the
	// parameter whose placeholder is ?
	err := stmt.QueryRow(id).Scan(&album.ID, &album.Title, &album.Artist, &album.Price, &album.Quantity)
	if err != nil {
		if err == sql.ErrNoRows {
			// Handle the case of no rows returned.
		}
		return album, err
	}
	return album, nil
}
```### 预编译语句行为 {#behavior}

预编译的 [`sql.Stmt`](https://pkg.go.dev/database/sql#Stmt) 提供了常规的 `Exec`、`QueryRow` 和 `Query` 方法来执行语句。有关如何使用这些方法的更多信息，请参阅[查询数据](/doc/database/querying)和[执行不返回数据的 SQL 语句](/doc/database/change-data)。

然而，由于 `sql.Stmt` 已经代表一个预设的 SQL 语句，其 `Exec`、`QueryRow` 和 `Query` 方法只需接收与占位符对应的 SQL 参数值，而无需包含 SQL 文本本身。

你可以通过不同方式定义一个新的 `sql.Stmt`，具体取决于你将如何使用它。

*   `DB.Prepare` 和 `DB.PrepareContext` 创建一个预编译语句，该语句可以在事务之外独立执行，类似于 `DB.Exec` 和 `DB.Query` 的使用方式。
*   `Tx.Prepare`、`Tx.PrepareContext`、`Tx.Stmt` 和 `Tx.StmtContext` 创建一个用于特定事务的预编译语句。`Prepare` 和 `PrepareContext` 使用 SQL 文本来定义语句。`Stmt` 和 `StmtContext` 使用 `DB.Prepare` 或 `DB.PrepareContext` 返回的结果。也就是说，它们将一个非事务性的 `sql.Stmt` 转换为一个用于该特定事务的 `sql.Stmt`。
*   `Conn.PrepareContext` 从一个代表预留连接的 `sql.Conn` 创建预编译语句。

请确保在你的代码完成使用语句后调用 `stmt.Close`。这将释放可能与其关联的所有数据库资源（例如底层连接）。对于仅在函数中作为局部变量存在的语句，只需 `defer stmt.Close()` 即可。

#### 用于创建预编译语句的函数 {#prepared_statement_functions}

<table id="prepared-statement-functions-list" class="DocTable">
    <thead>
        <tr class="DocTable-head">
            <th class="DocTable-cell" width="20%">函数</th>
            <th class="DocTable-cell">描述</th>
        </tr>
    </thead>
    <tbody>
        <tr class="DocTable-row">
            <td class="DocTable-cell">
                <code><a href="https://pkg.go.dev/database/sql#DB.Prepare">DB.Prepare</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#DB.PrepareContext">DB.PrepareContext</a></code>
            </td>
            <td class="DocTable-cell">准备一个用于独立执行的语句，或一个将使用 Tx.Stmt 转换为事务内预编译语句的语句。</td>
        </tr>
        <tr class="DocTable-row">
            <td class="DocTable-cell">
                <code><a href="https://pkg.go.dev/database/sql#Tx.Prepare">Tx.Prepare</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.PrepareContext">Tx.PrepareContext</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.Stmt">Tx.Stmt</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.StmtContext">Tx.StmtContext</a></code>
            </td>
            <td class="DocTable-cell">准备一个用于特定事务的语句。更多信息，请参阅<a href="/doc/database/execute-transactions">执行事务</a>。</td>
        </tr>
        <tr class="DocTable-row">
            <td class="DocTable-cell">
                <code><a href="https://pkg.go.dev/database/sql#Conn.PrepareContext">Conn.PrepareContext</a></code>
            </td>
            <td class="DocTable-cell">用于预留连接。更多信息，请参阅<a href="/doc/database/manage-connections">管理连接</a>。</td>
        </tr>
    </tbody>
</table>