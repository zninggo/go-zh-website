<!--{
  "Title": "数据查询"
}-->

当执行返回数据的SQL语句时，应使用`database/sql`包提供的`Query`方法之一。这些方法会返回`Row`或`Rows`对象，您可以通过`Scan`方法将其数据复制到变量中。例如，在执行`SELECT`语句时会使用这些方法。

若执行不返回数据的语句，可改用`Exec`或`ExecContext`方法。详情请参阅[执行不返回数据的语句](/doc/database/change-data)。

`database/sql`包提供两种执行查询以获取结果的方式：

*   **查询单行数据** – `QueryRow`从数据库最多返回单个`Row`。详见[查询单行数据](#single_row)。
*   **查询多行数据** – `Query`返回所有匹配的行作为`Rows`结构体，您的代码可对其进行遍历。详见[查询多行数据](#multiple_rows)。

如果您的代码需要重复执行相同的SQL语句，建议使用预编译语句。详情请参阅[使用预编译语句](/doc/database/prepared-statements)。

**注意：** 切勿使用`fmt.Sprintf`等字符串格式化函数拼接SQL语句！这可能导致SQL注入风险。详情请参阅[避免SQL注入风险](/doc/database/sql-injection)。

### 查询单行数据 {#single_row}

`QueryRow`最多检索单个数据库行，适用于通过唯一ID查询数据的场景。若查询返回多行结果，`Scan`方法将只取首行并丢弃其余数据。

`QueryRowContext`与`QueryRow`功能相同，但支持传入`context.Context`参数。详情请参阅[取消进行中的操作](/doc/database/cancel-operations)。

以下示例通过查询判断库存是否充足以支持采购。SQL语句返回`true`表示充足，`false`表示不足。[`Row.Scan`](https://pkg.go.dev/database/sql#Row.Scan)通过指针将布尔返回值复制到`enough`变量中。```go
func canPurchase(id int, quantity int) (bool, error) {
	var enough bool
	// 基于单行查询一个值。
	if err := db.QueryRow("SELECT (quantity >= ?) from album where id = ?",
		quantity, id).Scan(&enough); err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("canPurchase %d: unknown album", id)
		}
		return false, fmt.Errorf("canPurchase %d: %v", id, err)
	}
	return enough, nil
}
```**注意：** 预编译语句中的参数占位符会因你使用的数据库管理系统（DBMS）和驱动而异。例如，用于 PostgreSQL 的 [pq 驱动](https://pkg.go.dev/github.com/lib/pq) 要求使用 `$1` 这样的占位符，而不是 `?`。

#### 处理错误 {#single_row_errors}

`QueryRow` 本身不返回错误。相反，`Scan` 会报告组合查询和扫描过程中的任何错误。当查询未找到任何行时，它会返回 [`sql.ErrNoRows`](https://pkg.go.dev/database/sql#ErrNoRows)。

#### 返回单行数据的函数 {#single_row_functions}

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
      <td class="DocTable-cell">独立执行一个单行查询。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Tx.QueryRow">Tx.QueryRow</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Tx.QueryRowContext">Tx.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">在一个更大的事务中执行单行查询。更多详情，请参阅<a href="/doc/database/execute-transactions">执行事务</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryRow">Stmt.QueryRow</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryRowContext">Stmt.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">使用已准备好的语句执行单行查询。更多详情，请参阅<a href="/doc/database/prepared-statements">使用预编译语句</a>。</td>
    </tr>
    <tr class="DocTable-row">
        <td class="DocTable-cell">
  <code><a href="https://pkg.go.dev/database/sql#Conn.QueryRowContext">Conn.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">用于预留连接。更多详情，请参阅<a href="/doc/database/manage-connections">管理连接</a>。</td>
    </tr>
  </tbody>
</table>

### 查询多行数据 {#multiple_rows}

你可以使用 `Query` 或 `QueryContext` 来查询多行数据，它们会返回一个代表查询结果的 `Rows`。你的代码使用 [`Rows.Next`](https://pkg.go.dev/database/sql#Rows.Next) 来迭代返回的行。每次迭代都会调用 `Scan` 来将列值复制到变量中。

`QueryContext` 的工作方式与 `Query` 类似，但带有一个 `context.Context` 参数。更多详情，请参阅[取消正在进行的操作](/doc/database/cancel-operations)。

以下示例执行一个查询，返回指定艺术家的专辑。这些专辑以 `sql.Rows` 的形式返回。代码使用 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 将列值复制到指针所指向的变量中。```go
func albumsByArtist(artist string) ([]Album, error) {
	rows, err := db.Query("SELECT * FROM album WHERE artist = ?", artist)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 用于存储返回行数据的Album切片
	var albums []Album

	// 循环遍历行，使用Scan将列数据分配到结构体字段中
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
```请注意对 [`rows.Close`](https://pkg.go.dev/database/sql#Rows.Close) 的延迟调用。无论函数以何种方式返回，这都会释放行所持有的任何资源。虽然完整遍历行后也会隐式关闭行，但最好使用 `defer` 来确保无论如何 `rows` 都会被关闭。

**注意：** 预编译语句中的参数占位符会因您使用的数据库管理系统（DBMS）和驱动程序而异。例如，PostgreSQL 的 [pq 驱动程序](https://pkg.go.dev/github.com/lib/pq) 要求使用 `$1` 这样的占位符，而不是 `?`。

#### 处理错误 {#multiple_rows_errors}

在循环遍历查询结果后，请务必检查 `sql.Rows` 的错误。如果查询失败，代码可以通过这种方式发现问题。

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
      <td class="DocTable-cell">独立运行查询。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Tx.Query">Tx.Query</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Tx.QueryContext">Tx.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">在一个更大的事务中运行查询。更多信息请参阅<a href="/doc/database/execute-transactions">执行事务</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.Query">Stmt.Query</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryContext">Stmt.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">使用已预编译的语句运行查询。更多信息请参阅<a href="/doc/database/prepared-statements">使用预编译语句</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Conn.QueryContext">Conn.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">用于保留连接。更多信息请参阅<a href="/doc/database/manage-connections">管理连接</a>。</td>
    </tr>
  </tbody>
</table>

### 处理可为空的列值 {#nullable_columns}

当列的值可能为空时，`database/sql` 包提供了几个特殊的类型，可以用作 `Scan` 函数的参数。每个类型都包含一个 `Valid` 字段，用于报告值是否为非空，如果非空，则包含一个持有该值的字段。

以下示例中的代码查询客户姓名。如果姓名值为空，则代码会使用另一个值替代，以便在应用程序中使用。```go
var s sql.NullString
err := db.QueryRow("SELECT name FROM customer WHERE id = ?", id).Scan(&s)
if err != nil {
	log.Fatal(err)
}

// 查询客户姓名，如果不存在则使用占位符。
name := "尊敬的客户"
if s.Valid {
	name = s.String
}
```以下是文档内容的翻译：

查阅 `sql` 包参考文档以了解各类型详情：

*    [`NullBool`](https://pkg.go.dev/database/sql#NullBool)
*    [`NullFloat64`](https://pkg.go.dev/database/sql#NullFloat64)
*    [`NullInt32`](https://pkg.go.dev/database/sql#NullInt32)
*    [`NullInt64`](https://pkg.go.dev/database/sql#NullInt64)
*    [`NullString`](https://pkg.go.dev/database/sql#NullString)
*    [`NullTime`](https://pkg.go.dev/database/sql#NullTime)

### 从列中获取数据 {#column_data}

在循环处理查询返回的行时，您需要使用 `Scan` 将行中的列值复制到 Go 语言变量中，具体操作请参阅 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 参考文档。

所有驱动程序都支持一组基础的数据转换，例如将 SQL 的 `INT` 转换为 Go 的 `int`。部分驱动程序会扩展此转换集；有关详情，请参阅各驱动程序的具体文档。

如您所料，`Scan` 会将列类型转换为与之相似的 Go 类型。例如，`Scan` 会将 SQL 的 `CHAR`、`VARCHAR` 和 `TEXT` 转换为 Go 的 `string`。然而，`Scan` 也会将值转换为更适合该列值的其他 Go 类型。例如，如果某个 `VARCHAR` 列始终包含数字，您可以指定一个数值类型（如 `int`）来接收该值，`Scan` 会为您使用 `strconv.Atoi` 进行转换。

有关 `Scan` 函数进行的转换的更多详情，请参阅 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 参考文档。

### 处理多个结果集 {#multiple_result_sets}

当您的数据库操作可能返回多个结果集时，可以使用 [`Rows.NextResultSet`](https://pkg.go.dev/database/sql#Rows.NextResultSet) 来获取它们。例如，当您执行的 SQL 语句分别查询多个表，并为每个表返回一个结果集时，此方法就很有用。

`Rows.NextResultSet` 会准备好下一个结果集，以便调用 `Rows.Next` 时可以获取该结果集中的第一行。它返回一个布尔值，指示是否存在下一个结果集。

以下示例中的代码使用 `DB.Query` 执行了两条 SQL 语句。第一个结果集来自存储过程中的第一个查询，它检索 `album` 表中的所有行。下一个结果集来自第二个查询，它检索 `song` 表中的行。```
rows, err := db.Query("SELECT * from album; SELECT * from song;")
if err != nil {
	log.Fatal(err)
}
defer rows.Close()

// 遍历第一个结果集。
for rows.Next() {
	// 处理结果集。
}

// 前进到下一个结果集。
rows.NextResultSet()

// 遍历第二个结果集。
for rows.Next() {
	// 处理第二个结果集。
}

// 检查两个结果集是否出错。
if err := rows.Err(); err != nil {
	log.Fatal(err)
}
```