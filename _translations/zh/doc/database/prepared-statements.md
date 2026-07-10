<!--{
  "Title": "使用预编译语句"
}-->

您可以定义预编译语句以便重复使用。这有助于提升代码性能，因为避免了每次执行数据库操作时重新创建语句的开销。

**注意：** 预编译语句中的参数占位符会因您使用的数据库管理系统（DBMS）和驱动程序而异。例如，PostgreSQL 的 [pq 驱动程序](https://pkg.go.dev/github.com/lib/pq) 使用类似 `$1` 的占位符，而不是 `?`。

### 什么是预编译语句？ {#what_prepared_statement}

预编译语句是由数据库管理系统解析并保存的 SQL 语句，通常包含占位符但没有实际的参数值。之后，可以使用一组参数值来执行该语句。

### 如何使用预编译语句 {#use_prepared_statement}

当您预期会多次执行相同的 SQL 语句时，可以使用 `sql.Stmt` 来预先准备 SQL 语句，然后根据需要执行。

以下示例创建了一个预编译语句，用于从数据库中查询特定的专辑信息。[`DB.Prepare`](https://pkg.go.dev/database/sql#DB.Prepare) 返回一个 [`sql.Stmt`](https://pkg.go.dev/database/sql#Stmt)，它代表给定 SQL 文本的预编译语句。您可以将 SQL 语句的参数传递给 `Stmt.Exec`、`Stmt.QueryRow` 或 `Stmt.Query` 来执行该语句。```go
// AlbumByID 根据 ID 检索指定的专辑信息
func AlbumByID(id int) (Album, error) {
	// 定义预编译语句。通常可以在其他地方定义语句
	// 并将其保存起来，供类似本函数的场景使用。
	stmt, err := db.Prepare("SELECT * FROM album WHERE id = ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	var album Album

	// 执行预编译语句，为占位符 ? 对应的参数传入 id 值
	err := stmt.QueryRow(id).Scan(&album.ID, &album.Title, &album.Artist, &album.Price, &album.Quantity)
	if err != nil {
		if err == sql.ErrNoRows {
			// 处理未找到任何记录的情况
		}
		return album, err
	}
	return album, nil
}
```### 预编译语句行为 {#behavior}

一个预编译的 [`sql.Stmt`](https://pkg.go.dev/database/sql#Stmt) 提供了常用的 `Exec`、`QueryRow` 和 `Query` 方法来执行该语句。关于如何使用这些方法的更多信息，请参阅[查询数据](/doc/database/querying)和[执行不返回数据的SQL语句](/doc/database/change-data)。

然而，由于 `sql.Stmt` 已经代表一个预设的 SQL 语句，它的 `Exec`、`QueryRow` 和 `Query` 方法只接受与占位符对应的 SQL 参数值，而省略 SQL 文本。

你可以通过不同方式定义一个新的 `sql.Stmt`，具体取决于你将如何使用它。

*   `DB.Prepare` 和 `DB.PrepareContext` 创建一个可以在事务外独立执行的预编译语句，就像 `DB.Exec` 和 `DB.Query` 一样。
*   `Tx.Prepare`、`Tx.PrepareContext`、`Tx.Stmt` 和 `Tx.StmtContext` 创建一个用于特定事务的预编译语句。`Prepare` 和 `PrepareContext` 使用 SQL 文本来定义语句。`Stmt` 和 `StmtContext` 则使用 `DB.Prepare` 或 `DB.PrepareContext` 的结果。也就是说，它们将一个非事务性的 `sql.Stmt` 转换为一个针对当前事务的 `sql.Stmt`。
*   `Conn.PrepareContext` 从一个 `sql.Conn`（代表一个保留的连接）创建一个预编译语句。

请确保在你的代码使用完语句后调用 `stmt.Close`。这将释放任何可能与之关联的数据库资源（例如底层连接）。对于仅作为函数局部变量的语句，使用 `defer stmt.Close()` 就足够了。

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
            <td class="DocTable-cell">准备一个语句，用于独立执行，或者将通过 Tx.Stmt 转换为事务内的预编译语句。</td>
        </tr>
        <tr class="DocTable-row">
            <td class="DocTable-cell">
                <code><a href="https://pkg.go.dev/database/sql#Tx.Prepare">Tx.Prepare</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.PrepareContext">Tx.PrepareContext</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.Stmt">Tx.Stmt</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.StmtContext">Tx.StmtContext</a></code>
            </td>
            <td class="DocTable-cell">准备一个语句，用于特定事务。更多信息，请参阅<a href="/doc/database/execute-transactions">执行事务</a>。
            </td>
        </tr>
        <tr class="DocTable-row">
            <td class="DocTable-cell">
                <code><a href="https://pkg.go.dev/database/sql#Conn.PrepareContext">Conn.PrepareContext</a></code>
            </td>
            <td class="DocTable-cell">用于与保留的连接配合使用。更多信息，请参阅<a href="/doc/database/manage-connections">管理连接</a>。
            </td>
        </tr>
    </tbody>
</table>