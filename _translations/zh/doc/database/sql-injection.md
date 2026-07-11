<!--{
  "Title": "规避 SQL 注入风险"
}-->

您可以通过将 SQL 参数值作为 `sql` 包的函数参数来规避 SQL 注入风险。`sql` 包中的许多函数提供了用于 SQL 语句的参数，以及用于该语句参数中实际数值的参数（部分函数则提供预处理语句参数及相关参数）。

以下示例代码使用 `?` 符号作为 `id` 参数的占位符，并将其作为函数参数传入：```go
// 执行带参数SQL语句的正确格式
rows, err := db.Query("SELECT * FROM user WHERE id = ?", id)
````sql` 包中执行数据库操作的函数会根据你提供的参数创建预处理语句。在运行时，`sql` 包会将 SQL 语句转换为预处理语句，并将其与参数分开发送。

**注意：** 参数占位符的形式取决于你使用的数据库管理系统（DBMS）和驱动程序。例如，Postgres 的 [pq 驱动程序](https://pkg.go.dev/github.com/lib/pq) 接受类似 `$1` 的占位符形式，而非 `?`。

你可能倾向于使用 `fmt` 包中的函数来拼接包含参数的 SQL 语句字符串——像这样：```
// 安全风险！
rows, err := db.Query(fmt.Sprintf("SELECT * FROM user WHERE id = %s", id))
```这绝对不安全！当你这样做时，Go 会在将完整的 SQL 语句发送给数据库管理系统（DBMS）之前，用参数值替换 `%s` 格式化动词，从而组装出完整的 SQL 语句。这会带来 [SQL 注入](https://en.wikipedia.org/wiki/SQL_injection) 风险，因为代码的调用者可能会将一段意外的 SQL 片段作为 `id` 参数传递进来。该片段可能会以不可预测的方式补全 SQL 语句，从而对你的应用程序构成危险。

例如，通过传递特定的 `%v` 值，你最终可能会得到类似下面这样的语句，它可能会返回你数据库中的所有用户记录：```
SELECT * FROM user WHERE id = 1 OR 1=1;
```