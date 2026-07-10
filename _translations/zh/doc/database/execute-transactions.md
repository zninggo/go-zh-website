<!--{
  "Title": "执行事务"
}-->

你可以使用表示事务的 [`sql.Tx,`](https://pkg.go.dev/database/sql#Tx) 来执行数据库事务。除了表示事务特定语义的 `Commit` 和 `Rollback` 方法外，`sql.Tx` 还包含你用来执行常见数据库操作的所有方法。要获取 `sql.Tx`，你需要调用 `DB.Begin` 或 `DB.BeginTx`。

[数据库事务](https://en.wikipedia.org/wiki/Database_transaction) 将多个操作分组为一个更大目标的一部分。所有操作要么全部成功，要么全部失败，并且在这两种情况下都能保证数据的完整性。通常，事务工作流包括：

1.  开始事务。
2.  执行一组数据库操作。
3.  如果没有发生错误，提交事务以使数据库更改生效。
4.  如果发生错误，回滚事务以保持数据库不变。

`sql` 包提供了开始和结束事务的方法，以及执行中间数据库操作的方法。这些方法对应于上述工作流的四个步骤。

*   **开始事务。**
    [`DB.Begin`](https://pkg.go.dev/database/sql#DB.Begin) 或 [`DB.BeginTx`](https://pkg.go.dev/database/sql#DB.BeginTx) 开始一个新的数据库事务，并返回一个表示该事务的 `sql.Tx`。
*   **执行数据库操作。**
    使用 `sql.Tx`，你可以在使用单一连接的一系列操作中查询或更新数据库。为了支持这一点，`Tx` 导出了以下方法：

    *   [`Exec`](https://pkg.go.dev/database/sql#Tx.Exec) 和 [`ExecContext`](https://pkg.go.dev/database/sql#Tx.ExecContext) 用于通过 `INSERT`、`UPDATE` 和 `DELETE` 等 SQL 语句执行数据库更改。
        更多信息，请参阅[执行不返回数据的 SQL 语句](/doc/database/change-data)。

    *   [`Query`](https://pkg.go.dev/database/sql#Tx.Query)、[`QueryContext`](https://pkg.go.dev/database/sql#Tx.QueryContext)、[`QueryRow`](https://pkg.go.dev/database/sql#Tx.QueryRow) 和 [`QueryRowContext`](https://pkg.go.dev/database/sql#Tx.QueryRowContext) 用于返回行的操作。
        更多信息，请参阅[查询数据](/doc/database/querying)。

    *   [`Prepare`](https://pkg.go.dev/database/sql#Tx.Prepare)、[`PrepareContext`](https://pkg.go.dev/database/sql#Tx.PrepareContext)、[`Stmt`](https://pkg.go.dev/database/sql#Tx.Stmt) 和 [`StmtContext`](https://pkg.go.dev/database/sql#Tx.StmtContext) 用于预定义预编译语句。
        更多信息，请参阅[使用预编译语句](/doc/database/prepared-statements)。

*   **使用以下方法之一结束事务：**
    *   使用 [`Tx.Commit`](https://pkg.go.dev/database/sql#Tx.Commit) 提交事务。
        如果 `Commit` 成功（返回 `nil` 错误），则所有查询结果都被确认为有效，并且所有已执行的更新都作为一个单一的原子更改应用到数据库。如果 `Commit` 失败，则应丢弃该 `Tx` 上 `Query` 和 `Exec` 的所有结果，因为它们是无效的。
    *   使用 [`Tx.Rollback`](https://pkg.go.dev/database/sql#Tx.Rollback) 回滚事务。
        即使 `Tx.Rollback` 失败，该事务也不再有效，并且它也未被提交到数据库。

### 最佳实践 {#best_practices}

遵循以下最佳实践，以更好地处理事务有时需要的复杂语义和连接管理。

*   使用本节描述的 API 来管理事务。**不要** 直接使用 `BEGIN` 和 `COMMIT` 等事务相关 SQL 语句——这样做可能会使你的数据库处于不可预测的状态，尤其是在并发程序中。
*   使用事务时，注意也不要直接调用非事务的 `sql.DB` 方法，因为这些方法将在事务之外执行，给你的代码提供数据库状态的不一致视图，甚至可能导致死锁。

### 示例 {#example}

以下示例中的代码使用事务为一张专辑创建新的客户订单。在此过程中，代码将会：

1.  开始一个事务。
2.  延迟执行事务的回滚。如果事务成功，它将在函数退出前被提交，使延迟的回滚调用变为空操作。如果事务失败，它将不会被提交，这意味着回滚将在函数退出时被调用。
3.  确认客户订购的专辑是否有足够的库存。
4.  如果库存充足，则更新库存数量，将其减少所订购的专辑数量。
5.  创建一个新订单，并为客户端检索新订单生成的 ID。
6.  提交事务并返回 ID。

此示例使用接受 `context.Context` 参数的 `Tx` 方法。这使得函数的执行（包括数据库操作）在运行时间过长或客户端连接关闭时可以被取消。更多信息，请参阅[取消进行中的操作](/doc/database/cancel-operations)。```
// [待翻译: CreateOrder creates an order for an album and returns the new order ID.]
func CreateOrder(ctx context.Context, albumID, quantity, custID int) (orderID int64, err error) {

	// [待翻译: Create a helper function for preparing failure results.]
	fail := func(err error) (int64, error) {
		return 0, fmt.Errorf("CreateOrder: %v", err)
	}

	// [待翻译: Get a Tx for making transaction requests.]
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fail(err)
	}
	// [待翻译: Defer a rollback in case anything fails.]
	defer tx.Rollback()

	// [待翻译: Confirm that album inventory is enough for the order.]
	var enough bool
	if err = tx.QueryRowContext(ctx, "SELECT (quantity >= ?) from album where id = ?",
		quantity, albumID).Scan(&enough); err != nil {
		if err == sql.ErrNoRows {
			return fail(fmt.Errorf("no such album"))
		}
		return fail(err)
	}
	if !enough {
		return fail(fmt.Errorf("not enough inventory"))
	}

	// [待翻译: Update the album inventory to remove the quantity in the order.]
	_, err = tx.ExecContext(ctx, "UPDATE album SET quantity = quantity - ? WHERE id = ?",
		quantity, albumID)
	if err != nil {
		return fail(err)
	}

	// [待翻译: Create a new row in the album_order table.]
	result, err := tx.ExecContext(ctx, "INSERT INTO album_order (album_id, cust_id, quantity, date) VALUES (?, ?, ?, ?)",
		albumID, custID, quantity, time.Now())
	if err != nil {
		return fail(err)
	}
	// [待翻译: Get the ID of the order item just created.]
	orderID, err = result.LastInsertId()
	if err != nil {
		return fail(err)
	}

	// [待翻译: Commit the transaction.]
	if err = tx.Commit(); err != nil {
		return fail(err)
	}

	// [待翻译: Return the order ID.]
	return orderID, nil
}
```

```
// 为专辑创建订单并返回新订单的ID。
func CreateOrder(ctx context.Context, albumID, quantity, custID int) (orderID int64, err error) {

	// 创建一个用于准备失败结果的辅助函数。
	fail := func(err error) (int64, error) {
		return 0, fmt.Errorf("CreateOrder: %v", err)
	}

	// 获取一个用于发起事务请求的Tx。
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fail(err)
	}
	// 延迟回滚以防任何失败。
	defer tx.Rollback()

	// 确认专辑库存是否足够满足订单。
	var enough bool
	if err = tx.QueryRowContext(ctx, "SELECT (quantity >= ?) from album where id = ?",
		quantity, albumID).Scan(&enough); err != nil {
		if err == sql.ErrNoRows {
			return fail(fmt.Errorf("no such album"))
		}
		return fail(err)
	}
	if !enough {
		return fail(fmt.Errorf("not enough inventory"))
	}

	// 更新专辑库存以扣除订单中的数量。
	_, err = tx.ExecContext(ctx, "UPDATE album SET quantity = quantity - ? WHERE id = ?",
		quantity, albumID)
	if err != nil {
		return fail(err)
	}

	// 在album_order表中创建一个新行。
	result, err := tx.ExecContext(ctx, "INSERT INTO album_order (album_id, cust_id, quantity, date) VALUES (?, ?, ?, ?)",
		albumID, custID, quantity, time.Now())
	if err != nil {
		return fail(err)
	}
	// 获取刚创建的订单项的ID。
	orderID, err = result.LastInsertId()
	if err != nil {
		return fail(err)
	}

	// 提交事务。
	if err = tx.Commit(); err != nil {
		return fail(err)
	}

	// 返回订单ID。
	return orderID, nil
}
```