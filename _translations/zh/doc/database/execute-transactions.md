<!--{
  "Title": "执行事务"
}-->

你可以使用代表事务的 [`sql.Tx`](https://pkg.go.dev/database/sql#Tx) 来执行数据库事务。除了代表事务特定语义的 `Commit` 和 `Rollback` 方法外，`sql.Tx` 还拥有你用来执行常见数据库操作的所有方法。要获取 `sql.Tx`，你可以调用 `DB.Begin` 或 `DB.BeginTx`。

[数据库事务](https://en.wikipedia.org/wiki/Database_transaction) 将多个操作组合为一个更大目标的一部分。所有操作要么全部成功，要么全部失败，并且在这两种情况下都能保持数据的完整性。通常，事务工作流程包括：

1.  开始事务。
2.  执行一组数据库操作。
3.  如果没有发生错误，则提交事务以使数据库更改生效。
4.  如果发生错误，则回滚事务以使数据库保持不变。

`sql` 包提供了开始和结束事务的方法，以及执行中间数据库操作的方法。这些方法对应于上述工作流程中的四个步骤。

*   开始事务。

    [`DB.Begin`](https://pkg.go.dev/database/sql#DB.Begin) 或 [`DB.BeginTx`](https://pkg.go.dev/database/sql#DB.BeginTx) 开始一个新的数据库事务，返回一个代表它的 `sql.Tx`。
*   执行数据库操作。

    使用 `sql.Tx`，你可以在一系列操作中使用单个连接来查询或更新数据库。为此，`Tx` 导出了以下方法：

    *   [`Exec`](https://pkg.go.dev/database/sql#Tx.Exec) 和 [`ExecContext`](https://pkg.go.dev/database/sql#Tx.ExecContext) 用于通过 SQL 语句（如 `INSERT`、`UPDATE` 和 `DELETE`）进行数据库更改。

        更多信息，请参阅[执行不返回数据的 SQL 语句](/doc/database/change-data)。

    *   [`Query`](https://pkg.go.dev/database/sql#Tx.Query)、[`QueryContext`](https://pkg.go.dev/database/sql#Tx.QueryContext)、[`QueryRow`](https://pkg.go.dev/database/sql#Tx.QueryRow) 和 [`QueryRowContext`](https://pkg.go.dev/database/sql#Tx.QueryRowContext) 用于返回行的操作。

        更多信息，请参阅[查询数据](/doc/database/querying)。

    *   [`Prepare`](https://pkg.go.dev/database/sql#Tx.Prepare)、[`PrepareContext`](https://pkg.go.dev/database/sql#Tx.PrepareContext)、[`Stmt`](https://pkg.go.dev/database/sql#Tx.Stmt) 和 [`StmtContext`](https://pkg.go.dev/database/sql#Tx.StmtContext) 用于预定义预置语句。

        更多信息，请参阅[使用预置语句](/doc/database/prepared-statements)。

*   使用以下方法_之一_结束事务：
    *   使用 [`Tx.Commit`](https://pkg.go.dev/database/sql#Tx.Commit) 提交事务。

        如果 `Commit` 成功（返回 `nil` 错误），则所有查询结果都被确认为有效，并且所有已执行的更新都作为单个原子更改应用到数据库。如果 `Commit` 失败，则 `Tx` 上的 `Query` 和 `Exec` 的所有结果都应被视为无效而丢弃。
    *   使用 [`Tx.Rollback`](https://pkg.go.dev/database/sql#Tx.Rollback) 回滚事务。

        即使 `Tx.Rollback` 失败，该事务也将不再有效，并且不会被提交到数据库。

### 最佳实践 {#best_practices}

遵循以下最佳实践，以便更好地应对事务有时需要的复杂语义和连接管理。

*   使用本节描述的 API 来管理事务。_不要_ 直接使用事务相关的 SQL 语句，如 `BEGIN` 和 `COMMIT` —— 这样做可能会使你的数据库处于不可预测的状态，尤其是在并发程序中。
*   使用事务时，请注意也不要直接调用非事务的 `sql.DB` 方法，因为这些方法将在事务之外执行，给你的代码提供不一致的数据库状态视图，甚至可能导致死锁。

### 示例 {#example}

以下示例中的代码使用事务为相册创建新的客户订单。在此过程中，代码将会：

1.  开始一个事务。
2.  延迟（defer）事务的回滚。如果事务成功，它将在函数退出前被提交，使得延迟的回滚调用作为空操作（no-op）。如果事务失败，它将不会被提交，意味着回滚将在函数退出时被调用。
3.  确认客户订购的相册有足够的库存。
4.  如果库存足够，则更新库存数量，将订购的相册数量减去。
5.  创建一个新订单，并为客户端检索新生成的订单 ID。
6.  提交事务并返回 ID。

此示例使用接受 `context.Context` 参数的 `Tx` 方法。这使得函数的执行（包括数据库操作）如果运行时间过长或客户端连接关闭时可以被取消。更多信息，请参阅[取消进行中的操作](/doc/database/cancel-operations)。```
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
// CreateOrder 为相册创建订单并返回新订单ID。
func CreateOrder(ctx context.Context, albumID, quantity, custID int) (orderID int64, err error) {

	// 创建一个辅助函数，用于准备失败结果。
	fail := func(err error) (int64, error) {
		return 0, fmt.Errorf("CreateOrder: %v", err)
	}

	// 获取一个Tx用于执行事务请求。
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fail(err)
	}
	// 延迟执行回滚，以防任何操作失败。
	defer tx.Rollback()

	// 确认相册库存是否足够满足订单。
	var enough bool
	if err = tx.QueryRowContext(ctx, "SELECT (quantity >= ?) from album where id = ?",
		quantity, albumID).Scan(&enough); err != nil {
		if err == sql.ErrNoRows {
			return fail(fmt.Errorf("相册不存在"))
		}
		return fail(err)
	}
	if !enough {
		return fail(fmt.Errorf("库存不足"))
	}

	// 更新相册库存，减去订单中的数量。
	_, err = tx.ExecContext(ctx, "UPDATE album SET quantity = quantity - ? WHERE id = ?",
		quantity, albumID)
	if err != nil {
		return fail(err)
	}

	// 在album_order表中创建新行。
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