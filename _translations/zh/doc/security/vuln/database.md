---
title: Go 漏洞数据库
layout: article
---

[返回 Go 漏洞管理](/security/vuln)

## 概述

Go 漏洞数据库 ([https://vuln.go.dev](https://vuln.go.dev)) 以[开源漏洞 (OSV) 模式](https://ossf.github.io/osv-schema/) 提供 Go 漏洞信息。

您也可以在 [pkg.go.dev/vuln](https://pkg.go.dev/vuln) 浏览数据库中的漏洞。

**不要** 依赖 x/vulndb Git 仓库中的内容。该仓库中的 YAML 文件使用一种内部格式维护，该格式可能会在不另行通知的情况下更改。

## 贡献

我们非常希望所有 Go 包维护者能够[贡献](/s/vulndb-report-new)关于其自身项目中公开漏洞的信息，并[更新](/s/vulndb-report-feedback)其 Go 包中已有的漏洞信息。

我们的目标是让报告成为一项低阻力的流程，因此请随时[向我们发送您的建议](/s/vuln-feedback)。

请**不要**使用上述表单来报告 Go 标准库或子仓库中的漏洞。对于 Go 项目相关的漏洞，请遵循 [go.dev/security/policy](/security/policy) 中的流程。

## API

权威的 Go 漏洞数据库 [https://vuln.go.dev](https://vuln.go.dev) 是一个 HTTP 服务器，可以响应以下指定端点的 GET 请求。

这些端点没有查询参数，也不需要特定的头部信息。因此，即使是提供固定文件系统服务的站点（包括 `file://` URL）也可以实现此 API。

每个端点都返回一个 JSON 编码的响应，可以是未压缩的（如果请求为 `.json`）或 gzip 压缩格式（如果请求为 `.json.gz`）。

端点如下：

- `/index/db.json[.gz]`

  返回数据库的元数据：```json
  {
    // 数据库应视为最近一次修改的时间，
    // 采用RFC3339格式的UTC时间戳，
    // 并以"Z"结尾。
    "modified": string
  }
  ```请注意，*不应*将修改时间与系统时钟时间进行比较（例如用于缓存失效目的），因为数据库修改生效可能存在延迟。

实际示例请参阅 [/index/db.json](https://vuln.go.dev/index/db.json)。

- `/index/modules.json[.gz]`

  返回包含数据库中每个模块元数据的列表：```json
  [ {
    // 模块路径。
    "path": string,
    // 影响该模块的漏洞。
    "vulns":
      [ {
        // 漏洞标识符。
        "id": string,
        // 该漏洞应视为最近一次修改的时间，
        // 采用RFC3339格式的UTC时间戳，
        // 并以"Z"结尾。
        "modified": string,
        // （可选）包含该漏洞最新修复的模块版本
        // （采用SemVer 2.0.0格式）。
        // 若未知或不可用，则应省略此字段。
        "fixed": string,
      } ]
  } ]
  ```参见 [/index/modules.json](https://vuln.go.dev/index/modules.json) 获取实际示例。

- `/index/vulns.json[.gz]`

  返回数据库中每个漏洞的元数据列表：```json
   [ {
       // 漏洞ID。
       "id": string,
       // 该漏洞应被视为最后被修改的时间，
       // 采用RFC3339格式的UTC时间戳，
       // 并以"Z"结尾。
       "modified": string,
       // 同一漏洞在其他数据库中的ID列表。
       "aliases": [ string ]
   } ]
  ```- `/index/vulns.json[.gz]`

  返回数据库中每个漏洞的元数据列表：```json
   [ {
       // 漏洞ID。
       "id": string,
       // 该漏洞应被视为最后被修改的时间，
       // 采用RFC3339格式的UTC时间戳，
       // 并以"Z"结尾。
       "modified": string,
       // 同一漏洞在其他数据库中的ID列表。
       "aliases": [ string ]
   } ]
  ```
  实时示例请参见 [/index/vulns.json](https://vuln.go.dev/index/vulns.json)。

- `/ID/$id.json[.gz]`

  返回ID为 `$id` 的漏洞的独立报告，
  报告采用OSV格式（下文[Schema](#schema)部分将进行说明）。

  实时示例请参见 [/ID/GO-2022-0191.json](https://vuln.go.dev/ID/GO-2022-0191.json)。

### 批量下载

为便于下载整个Go漏洞数据库，
我们提供了一个包含所有索引和OSV文件的压缩包，可在此处获取：
[vuln.go.dev/vulndb.zip](https://vuln.go.dev/vulndb.zip)。

### 在 `govulncheck` 中使用

默认情况下，`govulncheck` 使用的是位于 [vuln.go.dev](https://vuln.go.dev) 的规范Go漏洞数据库。

可以通过 `-db` 标志将该命令配置为访问其他漏洞数据库，该标志接受一个漏洞数据库URL，其协议可为 `http://`、`https://` 或 `file://`。

为确保 `govulncheck` 正常工作，指定的漏洞数据库必须实现上述API。当从http(s)源读取时，`govulncheck` 命令使用压缩的 ".json.gz" 端点；当从文件源读取时，则使用 ".json" 端点。

### 旧版API

规范数据库包含一些属于旧版API的附加端点。
我们计划很快移除对这些端点的支持。如果您依赖旧版API
并需要更多时间迁移，[请告知我们](/s/govulncheck-feedback)。

## 数据模式（Schema）

报告采用
[开源漏洞（OSV）数据模式](https://ossf.github.io/osv-schema/)。
Go漏洞数据库为各字段赋予以下含义：

### id

`id` 字段是漏洞条目的唯一标识符。其格式为字符串 GO-\<YEAR>-\<ENTRYID>。

### affected

[affected](https://ossf.github.io/osv-schema/#affected-fields) 字段是一个JSON数组，包含描述受影响模块版本的对象。

#### affected[].package

[affected[].package](https://ossf.github.io/osv-schema/#affectedpackage-field) 字段是一个JSON对象，用于标识受影响的*模块*。该对象有两个必填字段：

- **ecosystem**: 此值将始终为 "Go"
- **name**: 此值为Go模块路径
  - 标准库中可导入的包（package）其名称将为 _stdlib_。
  - go命令的名称将为 _toolchain_。

#### affected[].ecosystem_specific

[affected[].ecosystem_specific](https://ossf.github.io/osv-schema/#affectedecosystem_specific-field) 字段是一个JSON对象，包含关于该漏洞的附加信息，由Go的漏洞检测工具使用。

目前，ecosystem_specific 将始终是一个仅包含单个字段 `imports` 的对象。

##### affected[].ecosystem_specific.imports

`affected[].ecosystem_specific.imports` 字段是一个JSON数组，包含受漏洞影响的包和符号。数组中的每个对象将包含以下两个字段：

- **path：** 一个字符串，表示包含漏洞的包的导入路径。
- **symbols：** 一个字符串数组，包含包含漏洞的符号（函数或方法）的名称。
- **goos**： 一个字符串数组，表示符号出现的操作系统环境（如已知）。
- **goarch**： 一个字符串数组，表示符号出现的系统架构（如已知）。

### database_specific

`database_specific` 字段包含Go漏洞数据库特有的自定义字段。

#### database_specific.url

`database_specific.url` 字段是一个字符串，表示Go漏洞报告的完整URL，例如 "https://pkg.go.dev/vuln/GO-2023-1621"。

#### database_specific.review_status

`database_specific.review_status` 字段是一个字符串，表示漏洞报告的审阅状态。如果不存在，应将该报告视为 `REVIEWED`。可能的值有：

- `UNREVIEWED`：该报告是基于其他来源（如CVE或GHSA）自动生成的。其数据可能有限且未经Go团队验证。
- `REVIEWED`：该报告源自Go团队，或基于外部来源生成。Go团队成员已审阅该报告，并在适当情况下补充了额外数据。

有关数据模式中其他字段的信息，请参阅 [OSV规范](https://ossf.github.io/osv-schema)。

## 关于版本的说明

我们的工具链会尝试根据标准的[Go模块版本号](/doc/modules/version-numbers)，自动将源安全公告中的模块和版本映射到规范的Go模块和版本。像 `govulncheck` 这样的工具被设计为依赖这些标准版本来判断Go项目是否受其依赖项中某个漏洞的影响。

在某些情况下，例如当Go项目使用自己的版本控制方案时，映射到标准Go版本可能会失败。发生这种情况时，Go漏洞数据库报告可能会保守地将所有Go版本列为受影响。这确保了像 `govulncheck` 这样的工具不会因为无法识别版本范围（假阴性）而未能报告漏洞。
然而，保守地将所有版本列为受影响可能会导致工具错误地将模块的已修复版本报告为包含漏洞（假阳性）。

如果您认为 `govulncheck` 错误地报告（或未能报告）了某个漏洞，请
[建议编辑](https://github.com/golang/vulndb/issues/new?assignees=&labels=Needs+Triage%2CSuggested+Edit&template=suggest_edit.yaml&title=x%2Fvulndb%3A+suggestion+regarding+GO-2024-2965&report=GO-XXXX-YYYY)
该漏洞报告，我们将进行审阅。

## 示例

Go漏洞数据库中的所有漏洞都使用上述OSV数据模式。

不同Go漏洞的示例请参见以下链接：- **Go 标准库漏洞** (GO-2022-0191):
  [JSON](https://vuln.go.dev/ID/GO-2022-0191.json),
  [HTML](https://pkg.go.dev/vuln/GO-2022-0191)
- **Go 工具链漏洞** (GO-2022-0189):
  [JSON](https://vuln.go.dev/ID/GO-2022-0189.json),
  [HTML](https://pkg.go.dev/vuln/GO-2022-0189)
- **Go 模块中的漏洞** (GO-2020-0015):
  [JSON](https://vuln.go.dev/ID/GO-2020-0015.json),
  [HTML](https://pkg.go.dev/vuln/GO-2020-0015)

## 已排除的报告

Go 漏洞数据库中的报告收集自不同来源，并由 Go 安全团队进行筛选。我们可能会遇到某个漏洞公告（例如，CVE 或 GHSA），并出于各种原因选择将其排除。在这种情况下，会在 x/vulndb 代码仓库中的 [x/vulndb/data/excluded](https://github.com/golang/vulndb/tree/master/data/excluded) 目录下创建一个简要报告。

报告可能基于以下原因被排除：

- `NOT_GO_CODE`（非Go代码）：该漏洞并非存在于 Go 包中，但它被其他来源标记为 Go 生态系统的安全公告。此漏洞不会影响任何 Go 包。（例如，一个存在于 C++ 库中的漏洞。）
- `NOT_IMPORTABLE`（不可导入）：该漏洞出现在 `main` 包中、一个仅被 `main` 包导入的 `internal/` 包中，或任何其他无法被另一个模块导入的位置。
- `EFFECTIVELY_PRIVATE`（实质私有）：虽然该漏洞出现在一个可以被其他模块导入的 Go 包中，但该包并非设计为外部使用，且不太可能被定义它的模块之外的其他模块导入。
- `DEPENDENT_VULNERABILITY`（依赖性漏洞）：此漏洞是数据库中另一个漏洞的子集。例如，如果包 A 包含一个漏洞，包 B 依赖于包 A，并且包 A 和包 B 有各自的 CVE ID，我们可能会将 B 的报告标记为被 A 的报告完全涵盖的依赖性漏洞。
- `NOT_A_VULNERABILITY`（非漏洞）：虽然分配了 CVE ID 或 GHSA，但没有已知的与之关联的漏洞。
- `WITHDRAWN`（已撤回）：该漏洞已被其来源撤回。

目前，被排除的报告不会通过 [vuln.go.dev](https://vuln.go.dev) 的 API 提供。但是，如果您有特定的使用场景，并且认为通过 API 访问这些信息会有所帮助，[请告知我们](/s/govulncheck-feedback)。