```html
<!--
  "Title": "执行不返回数据的 SQL 语句"
-->

当执行不返回数据的数据库操作时，请使用 `database/sql` 包中的 `Exec` 或 `ExecContext` 方法。可以通过这种方式执行的 SQL 语句包括 `INSERT`、`DELETE` 和 `UPDATE`。

当查询可能返回行数据时，应改用 `Query` 或 `QueryContext` 方法。更多信息请参阅[查询数据库](/doc/database/querying)。

`ExecContext` 方法与 `Exec` 方法功能相同，但额外接收一个 `context.Context` 参数，具体说明参见[取消正在进行的操作](/doc/database/cancel-operations)。

以下示例代码使用 [`DB.Exec`](https://pkg.go.dev/database/sql#DB.Exec) 执行一条语句，向 `album` 表中添加新的专辑记录。
``````go
func AddAlbum(alb Album) (int64, error) {
	result, err := db.Exec("INSERT INTO album (title, artist) VALUES (?, ?)", alb.Title, alb.Artist)
	if err != nil {
		return 0, fmt.Errorf("AddAlbum: %v", err)
	}

	// 获取客户端新增专辑的生成ID。
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("AddAlbum: %v", err)
	}
	// 返回新增专辑的ID。
	return id, nil
}
````DB.Exec` 返回两个值：一个 [`sql.Result`](https://pkg.go.dev/database/sql#Result) 和一个错误。当错误为 `nil` 时，你可以使用 `Result` 来获取最后插入项的 ID（如示例所示）或检索受操作影响的行数。

**注意：** 预处理语句中的参数占位符会因你使用的 DBMS 和驱动程序而异。例如，Postgres 的 [pq driver](https://pkg.go.dev/github.com/lib/pq) 需要使用 `$1` 这样的占位符，而不是 `?`。

如果你的代码会重复执行相同的 SQL 语句，考虑使用 `sql.Stmt` 从该 SQL 语句创建一个可重用的预处理语句。更多信息，请参阅 [使用预处理语句](/doc/database/prepared-statements)。

**警告：** 不要使用 `fmt.Sprintf` 等字符串格式化函数来组装 SQL 语句！这可能会引入 SQL 注入风险。更多信息，请参阅 [避免 SQL 注入风险](/doc/database/sql-injection)。

#### 用于执行不返回行的 SQL 语句的函数 {#no_rows_functions}

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
      <td class="DocTable-cell">独立执行单条 SQL 语句。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Tx.Exec">Tx.Exec</a></code><br/>
        <code><a href="https://pkg.go.dev/database/sql#Tx.ExecContext">Tx.ExecContext</a></code>
      </td>
      <td class="DocTable-cell">在更大的事务中执行 SQL 语句。更多信息，请参阅
          <a href="/doc/database/execute-transactions">执行事务</a>。
      </td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.Exec">Stmt.Exec</a></code><br/>
        <code><a href="https://pkg.go.dev/database/sql#Stmt.ExecContext">Stmt.ExecContext</a></code>
      </td>
      <td class="DocTable-cell">执行已准备好的 SQL 语句。更多信息，请参阅
          <a href="/doc/database/prepared-statements">使用预处理语句</a>。
      </td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Conn.ExecContext">Conn.ExecContext</a></code>
      </td>
      <td class="DocTable-cell">用于保留连接。更多信息，请参阅
          <a href="/doc/database/manage-connections">管理连接</a>。
      </td>
    </tr>
  </tbody>
</table>