<!--{
  "Title": "取消进行中的操作"
}-->

你可以通过使用 Go 的 [`context.Context`](https://pkg.go.dev/context#Context) 来管理进行中的操作。`Context` 是一个标准的 Go 数据值，可以报告它所代表的整体操作是否已被取消且不再需要。通过在应用中的函数调用和服务间传递 `context.Context`，当其处理不再需要时，这些操作可以提前停止工作并返回一个错误。关于 `Context` 的更多信息，请参阅 [Go 并发模式：Context](/blog/context)。

例如，你可能想要：

*   结束长时间运行的操作，包括那些耗时过长的数据库操作。
*   传播来自其他地方的取消请求，例如当客户端关闭连接时。

面向 Go 开发者的许多 API 都包含接受 `Context` 参数的方法，这使得在你的整个应用中使用 `Context` 更加容易。

### 在超时后取消数据库操作 {#timeout_cancel}

你可以使用 `Context` 来设置一个超时或截止期限，超过此期限后操作将被取消。要派生一个具有超时或截止期限的 `Context`，请调用 [`context.WithTimeout`](https://pkg.go.dev/context#WithTimeout) 或 [`context.WithDeadline`](https://pkg.go.dev/context#WithDeadline)。

下面超时示例中的代码派生了一个 `Context` 并将其传递给 `sql.DB` 的 [`QueryContext`](https://pkg.go.dev/database/sql#DB.QueryContext) 方法。```go
func QueryWithTimeout(ctx context.Context) {
	// 创建一个带有超时的Context。
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 将超时Context与查询一起传递。
	rows, err := db.QueryContext(queryCtx, "SELECT * FROM album")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// 处理返回的行。
}
```当一个上下文从外部上下文派生时，正如本例中 `queryCtx` 派生自 `ctx`，若外部上下文被取消，派生的上下文也会自动取消。例如在HTTP服务器中，`http.Request.Context` 方法返回与该请求关联的上下文。当HTTP客户端断开连接或取消HTTP请求（HTTP/2协议中可能出现）时，该上下文会被取消。将HTTP请求的上下文传递给上述的 `QueryWithTimeout` 函数时，数据库查询会在两种情况下提前终止：当整体HTTP请求被取消，或当查询执行时间超过五秒。

**注意：** 当您使用超时或截止时间创建新上下文时，请务必使用 `defer` 延迟执行返回的 `cancel` 函数。这会在包含函数退出时释放新上下文持有的资源。该操作同样会取消 `queryCtx`，但到函数返回时，应该已无任何代码在使用 `queryCtx`。