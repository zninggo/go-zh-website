<!--{
  "Title": "数据查询"
}-->

当执行返回数据的SQL语句时，请使用`database/sql`包中提供的`Query`方法之一。这些方法会返回`Row`或`Rows`对象，您可以通过`Scan`方法将数据复制到变量中。例如，这些方法可用于执行`SELECT`语句。

当执行不返回数据的语句时，可以改用`Exec`或`ExecContext`方法。更多信息请参阅[执行不返回数据的语句](/doc/database/change-data)。

`database/sql`包提供了两种执行查询以获取结果的方式：

*   **查询单行数据** – `QueryRow`最多从数据库返回单行数据。更多信息请参阅[查询单行数据](#single_row)。
*   **查询多行数据** – `Query`将所有匹配的行作为`Rows`结构体返回，您的代码可对其循环遍历。更多信息请参阅[查询多行数据](#multiple_rows)。

如果您的代码需要重复执行相同的SQL语句，请考虑使用预处理语句。更多信息请参阅[使用预处理语句](/doc/database/prepared-statements)。

**注意：** 不要使用`fmt.Sprintf`等字符串格式化函数来拼接SQL语句！这可能导致SQL注入风险。更多信息请参阅[避免SQL注入风险](/doc/database/sql-injection)。

### 查询单行数据 {#single_row}

`QueryRow`最多检索单行数据库数据，例如当您需要通过唯一ID查找数据时。如果查询返回多行结果，`Scan`方法将仅保留第一行结果，其余数据将被丢弃。

`QueryRowContext`功能与`QueryRow`类似，但额外接受`context.Context`参数。更多信息请参阅[取消正在进行的操作](/doc/database/cancel-operations)。

以下示例使用查询来判断库存是否足以支持购买。SQL语句在库存充足时返回`true`，不足时返回`false`。[`Row.Scan`](https://pkg.go.dev/database/sql#Row.Scan)通过指针将布尔返回值复制到`enough`变量中。```go
func canPurchase(id int, quantity int) (bool, error) {
	var enough bool
	// 基于单行记录查询数值
	if err := db.QueryRow("SELECT (quantity >= ?) from album where id = ?",
		quantity, id).Scan(&enough); err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("canPurchase %d: 未知专辑", id)
		}
		return false, fmt.Errorf("canPurchase %d: %v", id, err)
	}
	return enough, nil
}
```**注意：** 预编译语句中的参数占位符会因您使用的数据库管理系统和驱动程序而异。例如，PostgreSQL 的 [pq 驱动程序](https://pkg.go.dev/github.com/lib/pq) 需要使用 `$1` 这样的占位符，而不是 `?`。

#### 处理错误 {#single_row_errors}

`QueryRow` 本身不返回错误。相反，`Scan` 会报告合并查找和扫描过程中的任何错误。当查询未找到任何行时，它会返回 [`sql.ErrNoRows`](https://pkg.go.dev/database/sql#ErrNoRows)。

#### 返回单行的函数 {#single_row_functions}

<table id="single-row-functions-list" class="DocTable">
  <thead>
    <tr class="DocTable-head">
      <th class="DocTable-cell" width="20%">函数</th>
      <th class="DocTable-cell">描述</th>
    </tr>
  </thead>
  <tbody>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#DB.QueryRow">DB.QueryRow</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#DB.QueryRowContext">DB.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">独立运行单行查询。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Tx.QueryRow">Tx.QueryRow</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Tx.QueryRowContext">Tx.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">在更大的事务内部运行单行查询。更多信息，请参阅 <a href="/doc/database/execute-transactions">执行事务</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryRow">Stmt.QueryRow</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryRowContext">Stmt.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">使用已预编译的语句运行单行查询。更多信息，请参阅 <a href="/doc/database/prepared-statements">使用预编译语句</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Conn.QueryRowContext">Conn.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">用于保留的连接。更多信息，请参阅 <a href="/doc/database/manage-connections">管理连接</a>。</td>
    </tr>
  </tbody>
</table>

### 查询多行数据 {#multiple_rows}

您可以使用 `Query` 或 `QueryContext` 来查询多行数据，它们会返回一个代表查询结果的 `Rows`。您的代码使用 [`Rows.Next`](https://pkg.go.dev/database/sql#Rows.Next) 遍历返回的行。每次迭代都会调用 `Scan` 将列值复制到变量中。

`QueryContext` 的工作方式与 `Query` 类似，但多了一个 `context.Context` 参数。更多信息，请参阅[取消进行中的操作](/doc/database/cancel-operations)。

以下示例执行一个查询，返回指定艺术家的专辑。这些专辑以 `sql.Rows` 形式返回。代码使用 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 将列值复制到由指针表示的变量中。```go
func albumsByArtist(artist string) ([]Album, error) {
	rows, err := db.Query("SELECT * FROM album WHERE artist = ?", artist)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 用于存储返回行数据的专辑切片。
	var albums []Album

	// 遍历各行，使用Scan将列数据赋值给结构体字段。
	for rows.Next() {
		var alb Album
		if err := rows.Scan(&alb.ID, &alb.Title, &alb.Artist,
			&alb.Price, &alb.Quantity); err != nil {
			return albums, err
		}
		albums = append(albums, alb)
	}
	if err = rows.Err(); err != nil {
		return albums, err
	}
	return albums, nil
}
```请注意这里使用了延迟调用 [`rows.Close`](https://pkg.go.dev/database/sql#Rows.Close)。无论函数以何种方式返回，这都会释放rows所持有的任何资源。遍历完所有行也会隐式关闭rows，但使用`defer`能确保无论发生什么情况`rows`都会被关闭。

**注意：** 预置语句中的参数占位符因使用的数据库管理系统和驱动而异。例如，PostgreSQL的 [pq驱动](https://pkg.go.dev/github.com/lib/pq) 需要使用类似 `$1` 的占位符，而不是 `?`。

#### 处理错误 {#multiple_rows_errors}

在循环遍历查询结果后，请务必检查 `sql.Rows` 是否返回错误。如果查询失败，这是代码检测错误的方式。

#### 返回多行的函数 {#multiple_rows_functions}

<table id="multiple-row-functions-list" class="DocTable">
  <thead>
    <tr class="DocTable-head">
      <th class="DocTable-cell" width="20%">函数</th>
      <th class="DocTable-cell">描述</th>
    </tr>
  </thead>
  <tbody>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#DB.Query">DB.Query</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#DB.QueryContext">DB.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">在独立会话中运行查询。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Tx.Query">Tx.Query</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Tx.QueryContext">Tx.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">在更大的事务中运行查询。更多信息请参阅<a href="/doc/database/execute-transactions">执行事务</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.Query">Stmt.Query</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryContext">Stmt.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">使用已准备好的语句运行查询。更多信息请参阅<a href="/doc/database/prepared-statements">使用预置语句</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Conn.QueryContext">Conn.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">用于预留连接。更多信息请参阅<a href="/doc/database/manage-connections">管理连接</a>。</td>
    </tr>
  </tbody>
</table>

### 处理可空列值 {#nullable_columns}

当列值可能为null时，`database/sql` 包提供了几种特殊类型，可以作为 `Scan` 函数的参数使用。每个类型都包含一个 `Valid` 字段（用于报告值是否非空），以及一个在值非空时存储该值的字段。

以下示例中的代码查询客户姓名。如果姓名值为null，代码会替换另一个值供应用程序使用。```go
var s sql.NullString
err := db.QueryRow("SELECT name FROM customer WHERE id = ?", id).Scan(&s)
if err != nil {
	log.Fatal(err)
}

// 获取客户姓名，如果为空则使用占位值。
name := "尊敬的客户"
if s.Valid {
	name = s.String
}
```有关每种类型的更多信息，请参阅 `sql` 包参考文档：

*    [`NullBool`](https://pkg.go.dev/database/sql#NullBool)
*    [`NullFloat64`](https://pkg.go.dev/database/sql#NullFloat64)
*    [`NullInt32`](https://pkg.go.dev/database/sql#NullInt32)
*    [`NullInt64`](https://pkg.go.dev/database/sql#NullInt64)
*    [`NullString`](https://pkg.go.dev/database/sql#NullString)
*    [`NullTime`](https://pkg.go.dev/database/sql#NullTime)

### 从列获取数据 {#column_data}

当遍历查询返回的行时，您可以使用 `Scan` 将行中的列值复制到 Go 语言的值中，如 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 参考文档所述。

所有驱动程序都支持一组基本的数据类型转换，例如将 SQL 的 `INT` 转换为 Go 的 `int`。一些驱动程序扩展了这组转换；有关详细信息，请参阅各个驱动程序的文档。

正如您所预料的那样，`Scan` 会将列类型转换为相似的 Go 类型。例如，`Scan` 会将 SQL 的 `CHAR`、`VARCHAR` 和 `TEXT` 转换为 Go 的 `string`。然而，`Scan` 也会执行到另一种更适合该列值的 Go 类型的转换。例如，如果某列是 `VARCHAR` 且始终包含一个数字，您可以指定一个数值型的 Go 类型（如 `int`）来接收该值，`Scan` 会为您使用 `strconv.Atoi` 进行转换。

有关 `Scan` 函数执行转换的更多详细信息，请参阅 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 参考文档。

### 处理多个结果集 {#multiple_result_sets}

当您的数据库操作可能返回多个结果集时，您可以使用 [`Rows.NextResultSet`](https://pkg.go.dev/database/sql#Rows.NextResultSet) 来检索它们。例如，当您发送的 SQL 分别查询多个表，为每个表返回一个结果集时，这会很有用。

`Rows.NextResultSet` 会准备下一个结果集，以便调用 `Rows.Next` 可以从下一个结果集中检索第一行。它返回一个布尔值，指示是否存在下一个结果集。

下面的示例代码使用 `DB.Query` 执行两条 SQL 语句。第一个结果集来自存储过程中的第一个查询，检索 `album` 表中的所有行。下一个结果集来自第二个查询，检索 `song` 表中的行。```go
rows, err := db.Query("SELECT * from album; SELECT * from song;")
if err != nil {
	log.Fatal(err)
}
defer rows.Close()

// 循环遍历第一个结果集。
for rows.Next() {
	// 处理结果集。
}

// 移动到下一个结果集。
rows.NextResultSet()

// 循环遍历第二个结果集。
for rows.Next() {
	// 处理第二个结果集。
}

// 检查结果集中的任何错误。
if err := rows.Err(); err != nil {
	log.Fatal(err)
}
```