<!--{
  "Title": "取消正在进行的操作"
}-->

您可以通过使用Go语言的[`context.Context`](https://pkg.go.dev/context#Context)来管理正在进行的操作。`Context`是Go语言中的一种标准数据值，可以报告其代表的整体操作是否已被取消且不再需要。通过在应用程序的函数调用和服务中传递`context.Context`，当不再需要处理时，这些调用和服务可以提前停止工作并返回错误。有关`Context`的更多信息，请参阅[Go并发模式：上下文](/blog/context)。

例如，您可能希望：

*   结束长时间运行的操作，包括完成时间过长的数据库操作。
*   从其他位置传播取消请求，例如当客户端关闭连接时。

许多面向Go开发者的API都包含接受`Context`参数的方法，使您更轻松地在整个应用程序中使用`Context`。

### 在超时后取消数据库操作 {#timeout_cancel}

您可以使用`Context`来设置超时或截止时间，超过该时间后操作将被取消。要派生带有超时或截止时间的`Context`，请调用[`context.WithTimeout`](https://pkg.go.dev/context#WithTimeout)或[`context.WithDeadline`](https://pkg.go.dev/context#WithDeadline)。

以下超时示例中的代码派生了一个`Context`，并将其传递给`sql.DB`的[`QueryContext`](https://pkg.go.dev/database/sql#DB.QueryContext)方法。```go
func QueryWithTimeout(ctx context.Context) {
	// 创建一个带有超时的Context。
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// 将超时Context传递给查询。
	rows, err := db.QueryContext(queryCtx, "SELECT * FROM album")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	// 处理返回的行。
}
```当一个context从外部context派生而来时——例如本例中`queryCtx`派生自`ctx`——如果外部context被取消，派生context也会自动被取消。在HTTP服务器中，`http.Request.Context`方法会返回与请求关联的context。若HTTP客户端断开连接或取消HTTP请求（HTTP/2协议中可能发生），该context会被取消。将HTTP请求的context传递给上述`QueryWithTimeout`函数，会导致数据库查询提前停止——无论是因为整体HTTP请求被取消，还是因为查询耗时超过五秒。

**注意：** 当您使用超时或截止时间创建新`Context`时，务必延迟执行`cancel`函数的调用。这样当包含该`Context`的函数退出时，能释放新`Context`占用的资源。虽然这也会取消`queryCtx`，但当函数返回时，理论上不应再有其他代码使用该`queryCtx`。