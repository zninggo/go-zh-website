<!--{
  "Title": "执行不返回数据的SQL语句"
}-->

当您执行不返回数据的数据库操作时，请使用 `database/sql` 包中的 `Exec` 或 `ExecContext` 方法。您可以通过这种方式执行的 SQL 语句包括 `INSERT`、`DELETE` 和 `UPDATE`。

当您的查询可能返回行数据时，请改用 `Query` 或 `QueryContext` 方法。更多信息，请参阅[查询数据库](/doc/database/querying)。

`ExecContext` 方法的工作方式与 `Exec` 方法相同，但增加了一个 `context.Context` 参数，如[取消正在进行的操作](/doc/database/cancel-operations)中所述。

以下示例代码使用 [`DB.Exec`](https://pkg.go.dev/database/sql#DB.Exec) 执行一条语句，将新的唱片记录添加到 `album` 表中。```go
func AddAlbum(alb Album) (int64, error) {
	result, err := db.Exec("INSERT INTO album (title, artist) VALUES (?, ?)", alb.Title, alb.Artist)
	if err != nil {
		return 0, fmt.Errorf("AddAlbum: %v", err)
	}

	// 获取客户端新生成的专辑ID。
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("AddAlbum: %v", err)
	}
	// 返回新专辑的ID。
	return id, nil
}
````DB.Exec` 返回两个值：一个 [`sql.Result`](https://pkg.go.dev/database/sql#Result) 类型的结果和一个 error 错误。当 error 为 `nil` 时，你可以使用该 `Result` 来获取最后插入项的 ID（如示例所示）或获取受操作影响的行数。

**注意：** 预编译语句中的参数占位符因你使用的数据库管理系统（DBMS）和驱动程序而异。例如，Postgres 的 [pq 驱动程序](https://pkg.go.dev/github.com/lib/pq) 需要使用像 `$1` 这样的占位符，而不是 `?`。

如果你的代码将重复执行相同的 SQL 语句，考虑使用 `sql.Stmt` 从该 SQL 语句创建一个可重用的预编译语句。更多信息，请参阅[使用预编译语句](/doc/database/prepared-statements)。

**警告：** 不要使用诸如 `fmt.Sprintf` 之类的字符串格式化函数来组装 SQL 语句！这可能会引入 SQL 注入风险。更多信息，请参阅[规避 SQL 注入风险](/doc/database/sql-injection)。

#### 执行不返回行的 SQL 语句的函数 {#no_rows_functions}

<table id="no-rows-functions-list" class="DocTable">
  <thead>
    <tr class="DocTable-head">
      <th class="DocTable-cell" width="20%">函数</th>
      <th class="DocTable-cell">描述</th>
    </tr>
  </thead>
  <tbody>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#DB.Exec">DB.Exec</a></code><br/>
        <code><a href="https://pkg.go.dev/database/sql#DB.ExecContext">DB.ExecContext</a></code>
      </td>
      <td class="DocTable-cell">单独执行单个 SQL 语句。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Tx.Exec">Tx.Exec</a></code><br/>
        <code><a href="https://pkg.go.dev/database/sql#Tx.ExecContext">Tx.ExecContext</a></code>
      </td>
      <td class="DocTable-cell">在一个更大的事务内执行 SQL 语句。更多信息，请参阅<a href="/doc/database/execute-transactions">执行事务</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.Exec">Stmt.Exec</a></code><br/>
        <code><a href="https://pkg.go.dev/database/sql#Stmt.ExecContext">Stmt.ExecContext</a></code>
      </td>
      <td class="DocTable-cell">执行一个已经准备好的 SQL 语句。更多信息，请参阅<a href="/doc/database/prepared-statements">使用预编译语句</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Conn.ExecContext">Conn.ExecContext</a></code>
      </td>
      <td class="DocTable-cell">用于保留的连接。更多信息，请参阅<a href="/doc/database/manage-connections">管理连接</a>。</td>
    </tr>
  </tbody>
</table>