<!--{
  "Title": "使用预处理语句"
}-->

您可以定义一个预处理语句以供重复使用。这可以通过避免每次执行数据库操作时重新创建语句的开销，帮助您的代码运行得更快一些。

**注意：** 预处理语句中的参数占位符因您使用的数据库管理系统和驱动而异。例如，Postgres 的 [pq 驱动](https://pkg.go.dev/github.com/lib/pq) 需要使用 `$1` 这样的占位符，而不是 `?`。

### 什么是预处理语句？ {#what_prepared_statement}

预处理语句是由数据库管理系统解析并保存的 SQL 语句，它通常包含占位符，但不包含实际的参数值。稍后，可以使用一组参数值来执行该语句。

### 如何使用预处理语句 {#use_prepared_statement}

当您预期会反复执行相同的 SQL 语句时，可以使用 `sql.Stmt` 来预先准备 SQL 语句，然后根据需要执行它。

以下示例创建了一个用于从数据库中查询特定专辑的预处理语句。[`DB.Prepare`](https://pkg.go.dev/database/sql#DB.Prepare) 返回一个 [`sql.Stmt`](https://pkg.go.dev/database/sql#Stmt)，它代表了给定 SQL 文本的预处理语句。您可以将 SQL 语句的参数传递给 `Stmt.Exec`、`Stmt.QueryRow` 或 `Stmt.Query` 来运行该语句。```
// AlbumByID 函数用于检索指定的专辑。
func AlbumByID(id int) (Album, error) {
	// 定义一个预处理语句。通常会在其他地方定义该语句，并保存起来以供此类函数使用。
	stmt, err := db.Prepare("SELECT * FROM album WHERE id = ?")
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	var album Album

	// 执行预处理语句，为占位符 ? 对应的参数传入一个 id 值。
	err := stmt.QueryRow(id).Scan(&album.ID, &album.Title, &album.Artist, &album.Price, &album.Quantity)
	if err != nil {
		if err == sql.ErrNoRows {
			// 处理没有返回行的情况。
		}
		return album, err
	}
	return album, nil
}
```### 预处理语句行为 {#behavior}

预处理的 [`sql.Stmt`](https://pkg.go.dev/database/sql#Stmt) 提供了常用的 `Exec`、`QueryRow` 和 `Query` 方法用于执行语句。关于使用这些方法的更多信息，请参见[查询数据](/doc/database/querying)和[执行不返回数据的SQL语句](/doc/database/change-data)。

然而，由于 `sql.Stmt` 已经代表了一个预设的SQL语句，其 `Exec`、`QueryRow` 和 `Query` 方法仅接受对应占位符的SQL参数值，省略了SQL文本本身。

你可以通过不同方式定义新的 `sql.Stmt`，具体取决于其使用场景。

*   `DB.Prepare` 和 `DB.PrepareContext` 创建一个可独立执行的预处理语句，可在事务外部单独使用，类似于 `DB.Exec` 和 `DB.Query`。
*   `Tx.Prepare`、`Tx.PrepareContext`、`Tx.Stmt` 和 `Tx.StmtContext` 为特定事务创建预处理语句。`Prepare` 和 `PrepareContext` 使用SQL文本来定义语句。`Stmt` 和 `StmtContext` 则使用 `DB.Prepare` 或 `DB.PrepareContext` 返回的结果。也就是说，它们将一个非事务性的 `sql.Stmt` 转换为针对当前事务的 `sql.Stmt`。
*   `Conn.PrepareContext` 从代表保留连接的 `sql.Conn` 创建预处理语句。

请确保在代码使用完语句后调用 `stmt.Close`。这将释放可能与其关联的数据库资源（如底层连接）。对于仅在函数内作为局部变量的语句，使用 `defer stmt.Close()` 即可。

#### 创建预处理语句的函数 {#prepared_statement_functions}

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
            <td class="DocTable-cell">准备一个用于独立执行的语句，或准备一个可通过 Tx.Stmt 转换为事务内预处理语句的语句。</td>
        </tr>
        <tr class="DocTable-row">
            <td class="DocTable-cell">
                <code><a href="https://pkg.go.dev/database/sql#Tx.Prepare">Tx.Prepare</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.PrepareContext">Tx.PrepareContext</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.Stmt">Tx.Stmt</a></code><br />
                <code><a href="https://pkg.go.dev/database/sql#Tx.StmtContext">Tx.StmtContext</a></code>
            </td>
            <td class="DocTable-cell">为特定事务准备语句。更多信息请参见
                <a href="/doc/database/execute-transactions">执行事务</a>。
            </td>
        </tr>
        <tr class="DocTable-row">
            <td class="DocTable-cell">
                <code><a href="https://pkg.go.dev/database/sql#Conn.PrepareContext">Conn.PrepareContext</a></code>
            </td>
            <td class="DocTable-cell">用于保留连接。更多信息请参见
                <a href="/doc/database/manage-connections">管理连接</a>。
            </td>
        </tr>
    </tbody>
</table>