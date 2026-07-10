<!--{
  "Title": "取消进行中的操作"
}-->

您可以通过使用 Go 语言的 [`context.Context`](https://pkg.go.dev/context#Context) 来管理进行中的操作。`Context` 是一种标准的 Go 数据值，它可以报告其所代表的整体操作是否已被取消且不再需要。通过在应用程序的函数调用和服务间传递 `context.Context`，这些部分就能在不再需要其处理时提前停止工作并返回错误。关于 `Context` 的更多信息，请参阅 [Go 并发模式：Context](/blog/context)。

例如，您可能希望：

*   结束长时间运行的操作，包括那些耗时过长的数据库操作。
*   传播来自其他地方的取消请求，例如当客户端关闭连接时。

许多面向 Go 开发者的 API 都包含接受 `Context` 参数的方法，这使得您在整个应用程序中更容易使用 `Context`。

### 超时后取消数据库操作 {#timeout_cancel}

您可以使用 `Context` 来设置超时或截止时间，超过该时间操作将被取消。要派生一个带有超时或截止时间的 `Context`，请调用 [`context.WithTimeout`](https://pkg.go.dev/context#WithTimeout) 或 [`context.WithDeadline`](https://pkg.go.dev/context#WithDeadline)。

以下超时示例中的代码派生了一个 `Context` 并将其传递给 `sql.DB` 的 [`QueryContext`](https://pkg.go.dev/database/sql#DB.QueryContext) 方法。```go
func QueryWithTimeout(ctx context.Context) {
	// 创建一个带超时的Context。
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 将带有超时的Context传递给查询。
	rows, err := db.QueryContext(queryCtx, "SELECT * FROM album")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// 处理返回的行。
}
```当一个上下文派生自外部上下文时（例如本例中的 `queryCtx` 派生自 `ctx`），如果外部上下文被取消，那么派生上下文也会自动被取消。例如在 HTTP 服务器中，`http.Request.Context` 方法返回一个与请求关联的上下文。如果 HTTP 客户端断开连接或取消了 HTTP 请求（HTTP/2 中可能发生），该上下文就会被取消。将 HTTP 请求的上下文传递给上述的 `QueryWithTimeout` 会导致数据库查询提前终止——无论是因为整个 HTTP 请求被取消，还是因为查询耗时超过五秒钟。

**注意：** 当你通过超时或截止时间创建新的 `Context` 时，务必延迟调用返回的 `cancel` 函数。这会在包含函数退出时释放新 `Context` 所持有的资源。该操作也会取消 `queryCtx`，但到函数返回时，应该已经没有任何代码在使用 `queryCtx` 了。