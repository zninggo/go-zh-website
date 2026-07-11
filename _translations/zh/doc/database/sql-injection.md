<!--{
  "Title": "避免 SQL 注入风险"
}-->

通过将 SQL 参数值作为 `sql` 包的函数参数提供，可以避免 SQL 注入风险。`sql` 包中的许多函数都提供了用于 SQL 语句的参数，以及用于该语句中所使用参数的数值的参数（其他函数则提供用于预编译语句的参数和参数值）。

以下示例中的代码使用 `?` 符号作为 `id` 参数的占位符，该参数作为函数参数提供：
```go
// 使用参数执行SQL语句的正确格式。
rows, err := db.Query("SELECT * FROM user WHERE id = ?", id)
```
执行数据库操作的 `sql` 包函数会根据你提供的参数创建预编译语句。在运行时，`sql` 包会将 SQL 语句转换为预编译语句，并将其与参数一起发送，参数是单独传递的。

**注意：** 参数占位符的形式取决于你使用的数据库管理系统和驱动程序。例如，用于 Postgres 的 [pq 驱动程序](https://pkg.go.dev/github.com/lib/pq) 接受像 `$1` 这样的占位符形式，而不是 `?`。

你可能会想使用 `fmt` 包中的函数，将 SQL 语句和参数拼接成一个字符串——就像这样：
// [待翻译: 安全风险！]
rows, err := db.Query(fmt.Sprintf("SELECT * FROM user WHERE id = %s", id))
```
这并不安全！当你这样做时，Go 会在将完整的 SQL 语句发送到数据库管理系统之前，将整个语句组装完成，并用参数值替换 `%s` 格式化动词。这构成了一个 [SQL 注入](https://en.wikipedia.org/wiki/SQL_injection) 风险，因为代码的调用方可能会将意想不到的 SQL 片段作为 `id` 参数发送。该片段可能会以对你的应用程序有害的、不可预测的方式完成这条 SQL 语句。

例如，通过传递某个特定的 `%s` 值，你可能会得到类似下面这样的语句，它可能会返回你数据库中的所有用户记录：

```go
rows, err := db.Query(fmt.Sprintf("SELECT * FROM user WHERE id = %s", id))
```
```
SELECT * FROM user WHERE id = 1 OR 1=1;
```