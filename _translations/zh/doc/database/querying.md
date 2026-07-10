```yaml
---
title: "数据查询"
---
```

当执行返回数据的 SQL 语句时，请使用 `database/sql` 包中提供的 `Query` 方法之一。这些方法返回 `Row` 或 `Rows`，你可以使用 `Scan` 方法将其中的数据复制到变量中。例如，你可以使用这些方法来执行 `SELECT` 语句。

当执行不返回数据的语句时，你可以改用 `Exec` 或 `ExecContext` 方法。更多信息，请参阅[执行不返回数据的语句](/doc/database/change-data)。

`database/sql` 包提供了两种执行查询以获取结果的方式。

*   **查询单行数据** – `QueryRow` 从数据库中最多返回一行数据。更多信息，请参阅[查询单行数据](#single_row)。
*   **查询多行数据** – `Query` 以 `Rows` 结构体的形式返回所有匹配的行，你的代码可以对其进行循环遍历。更多信息，请参阅[查询多行数据](#multiple_rows)。

如果你的代码将重复执行相同的 SQL 语句，请考虑使用预编译语句。更多信息，请参阅[使用预编译语句](/doc/database/prepared-statements)。

**注意：** 不要使用 `fmt.Sprintf` 等字符串格式化函数来拼接 SQL 语句！这可能会引入 SQL 注入风险。更多信息，请参阅[规避 SQL 注入风险](/doc/database/sql-injection)。

### 查询单行数据 {#single_row}

`QueryRow` 最多检索一行数据库记录，例如当你想通过唯一 ID 查找数据时。如果查询返回了多行，`Scan` 方法将丢弃除第一行以外的所有数据。

`QueryRowContext` 的工作方式与 `QueryRow` 类似，但它带有一个 `context.Context` 参数。更多信息，请参阅[取消正在进行的操作](/doc/database/cancel-operations)。

以下示例使用查询来确定是否有足够的库存来支持一次购买。如果库存充足，SQL 语句返回 `true`；否则返回 `false`。[`Row.Scan`](https://pkg.go.dev/database/sql#Row.Scan) 通过一个指针将布尔返回值复制到变量 `enough` 中。```go
func canPurchase(id int, quantity int) (bool, error) {
	var enough bool
	// 基于单行查询一个值。
	if err := db.QueryRow("SELECT (quantity >= ?) from album where id = ?",
		quantity, id).Scan(&enough); err != nil {
		if err == sql.ErrNoRows {
			return false, fmt.Errorf("canPurchase %d: 未知专辑", id)
		}
		return false, fmt.Errorf("canPurchase %d: %v", id, err)
	}
	return enough, nil
}
```**注意：** 预处理语句中的参数占位符格式取决于您使用的数据库管理系统（DBMS）及其驱动。例如，PostgreSQL 的 [pq 驱动](https://pkg.go.dev/github.com/lib/pq) 需要使用类似 `$1` 的占位符，而非 `?`。

#### 错误处理 {#single_row_errors}

`QueryRow` 本身不返回错误。相反，`Scan` 会报告来自组合查询和扫描过程的任何错误。当查询未找到任何行时，它将返回 [`sql.ErrNoRows`](https://pkg.go.dev/database/sql#ErrNoRows)。

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
      <td class="DocTable-cell">在较大的事务内部运行单行查询。更多信息请参阅<a href="/doc/database/execute-transactions">执行事务</a>。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryRow">Stmt.QueryRow</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryRowContext">Stmt.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">使用已准备的预处理语句运行单行查询。更多信息请参阅<a href="/doc/database/prepared-statements">使用预处理语句</a>。</td>
    </tr>
    <tr class="DocTable-row">
        <td class="DocTable-cell">
  <code><a href="https://pkg.go.dev/database/sql#Conn.QueryRowContext">Conn.QueryRowContext</a></code>
      </td>
      <td class="DocTable-cell">用于保留连接。更多信息请参阅<a href="/doc/database/manage-connections">管理连接</a>。</td>
    </tr>
  </tbody>
</table>

### 查询多行数据 {#multiple_rows}

您可以使用 `Query` 或 `QueryContext` 查询多行，这两个函数会返回一个代表查询结果的 `Rows`。您的代码使用 [`Rows.Next`](https://pkg.go.dev/database/sql#Rows.Next) 来遍历返回的行集。每次迭代都会调用 `Scan` 将列值复制到变量中。

`QueryContext` 的工作方式与 `Query` 类似，但带有一个 `context.Context` 参数。更多信息请参阅[取消正在进行的操作](/doc/database/cancel-operations)。

以下示例执行一个查询，返回指定艺术家的所有专辑。这些专辑以 `sql.Rows` 形式返回。代码使用 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 将列值复制到由指针表示的变量中。```go
func albumsByArtist(artist string) ([]Album, error) {
	rows, err := db.Query("SELECT * FROM album WHERE artist = ?", artist)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 专辑切片用于存储返回行中的数据。
	var albums []Album

	// 遍历行，使用Scan将列数据赋值给结构体字段。
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
```请注意对 [`rows.Close`](https://pkg.go.dev/database/sql#Rows.Close) 的延迟调用。这会释放行集占用的所有资源，无论函数如何返回。虽然遍历完所有行也会隐式关闭行集，但使用 `defer` 能确保无论如何 `rows` 都会被关闭。

**注意：** 预处理语句中的参数占位符因您使用的数据库管理系统和驱动程序而异。例如，PostgreSQL 的 [pq 驱动程序](https://pkg.go.dev/github.com/lib/pq) 要求使用 `$1` 这样的占位符，而不是 `?`。

#### 处理错误 {#multiple_rows_errors}

务必在遍历查询结果后检查 `sql.Rows` 是否返回错误。如果查询失败，代码将通过此方式获知。

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
      <td class="DocTable-cell">在更大的事务内运行查询。更多信息请参阅
        <a href="/doc/database/execute-transactions">执行事务</a>。
      </td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Stmt.Query">Stmt.Query</a></code><br />
        <code><a href="https://pkg.go.dev/database/sql#Stmt.QueryContext">Stmt.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">使用已准备好的语句运行查询。更多信息请参阅
        <a href="/doc/database/prepared-statements">使用预处理语句</a>。
      </td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell">
        <code><a href="https://pkg.go.dev/database/sql#Conn.QueryContext">Conn.QueryContext</a></code>
      </td>
      <td class="DocTable-cell">用于保留连接。更多信息请参阅
        <a href="/doc/database/manage-connections">管理连接</a>。
      </td>
    </tr>
  </tbody>
</table>

### 处理可空的列值 {#nullable_columns}

当列值可能为空时，`database/sql` 包提供了多种特殊类型，可作为 `Scan` 函数的参数。每种类型都包含一个 `Valid` 字段，用于指示值是否非空，以及一个用于存储该值（若为有效值）的字段。

以下示例代码查询客户姓名。如果姓名值为空，则代码会使用另一个值来替代，以供应用程序使用。```go
var s sql.NullString
err := db.QueryRow("SELECT name FROM customer WHERE id = ?", id).Scan(&s)
if err != nil {
	log.Fatal(err)
}

// 查找客户姓名，如果不存在则使用占位符。
name := "Valued Customer"
if s.Valid {
	name = s.String
}
```关于 `sql` 包中各类型的更多信息，请参考：

*    [`NullBool`](https://pkg.go.dev/database/sql#NullBool)
*    [`NullFloat64`](https://pkg.go.dev/database/sql#NullFloat64)
*    [`NullInt32`](https://pkg.go.dev/database/sql#NullInt32)
*    [`NullInt64`](https://pkg.go.dev/database/sql#NullInt64)
*    [`NullString`](https://pkg.go.dev/database/sql#NullString)
*    [`NullTime`](https://pkg.go.dev/database/sql#NullTime)

### 从列中获取数据 {#column_data}

遍历查询返回的行时，您会使用 `Scan` 将行的列值复制到 Go 的变量中，具体请参阅 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 参考文档。

所有驱动程序都支持一组基本的数据类型转换，例如将 SQL 的 `INT` 转换为 Go 的 `int`。有些驱动程序会扩展这组转换；详情请查阅各个驱动程序的文档。

正如您可能预期的那样，`Scan` 会将列类型转换为相似的 Go 类型。例如，`Scan` 会将 SQL 的 `CHAR`、`VARCHAR` 和 `TEXT` 转换为 Go 的 `string`。然而，`Scan` 也会执行到另一种更适合列值的 Go 类型的转换。例如，如果某个列是 `VARCHAR` 且始终包含数字，您可以指定一个数值类型的 Go 类型（如 `int`）来接收该值，`Scan` 会为您使用 `strconv.Atoi` 进行转换。

有关 `Scan` 函数执行的转换的更多细节，请参阅 [`Rows.Scan`](https://pkg.go.dev/database/sql#Rows.Scan) 参考文档。

### 处理多个结果集 {#multiple_result_sets}

当您的数据库操作可能返回多个结果集时，您可以使用 [`Rows.NextResultSet`](https://pkg.go.dev/database/sql#Rows.NextResultSet) 来检索它们。例如，当您发送分别查询多个表的 SQL 语句，为每个表返回一个结果集时，这会很有用。

`Rows.NextResultSet` 会准备下一个结果集，以便后续调用 `Rows.Next` 可以从该下一个结果集中检索第一行。它返回一个布尔值，指示是否存在下一个结果集。

下面的示例代码使用 `DB.Query` 执行两条 SQL 语句。第一个结果集来自存储过程中的第一个查询，检索 `album` 表中的所有行。下一个结果集来自第二个查询，检索 `song` 表中的行。```go
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

// 检查任一结果集中是否存在错误。
if err := rows.Err(); err != nil {
	log.Fatal(err)
}
```