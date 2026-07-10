<!--{
  "Title": "模块版本号"
}-->

模块开发者使用版本号的各个部分来标识版本的稳定性和向后兼容性。对于每次新发布，模块的发布版本号会具体反映自上一版本以来模块变更的性质。

当您开发使用外部模块的代码时，可以通过版本号来了解外部模块在考虑升级时的稳定性。当您开发自己的模块时，版本号将向其他开发者表明模块的稳定性和向后兼容性。

本主题描述模块版本号的含义。

**另请参阅**

* 在代码中使用外部包时，您可以使用Go工具管理这些依赖项。更多信息请参见[管理依赖项](managing-dependencies)。
* 如果您开发的模块供他人使用，可以在发布模块时应用版本号，在代码仓库中标记模块。更多信息请参见[发布模块](publishing)。

已发布的模块使用语义化版本模型中的版本号进行发布，如下图所示：

<img src="images/version-number.png"
     alt="图示说明语义化版本号，显示主版本1、次版本4、修订版本0和预发布版本beta 2"
     style="width: 300px;" />

下表描述版本号各部分如何表示模块的稳定性和向后兼容性。

<table class="DocTable">
  <thead>
    <tr class="DocTable-head">
      <th class="DocTable-cell" width="20%">版本阶段</th>
      <th class="DocTable-cell">示例</th>
      <th class="DocTable-cell">向开发者传达的信息</th>
    </tr>
  </thead>
  <tbody>
    <tr class="DocTable-row">
      <td class="DocTable-cell"><a href="#in-development">开发中</a></td>
      <td class="DocTable-cell">自动生成的伪版本号
      <p>v<strong>0</strong>.x.x</td>
      <td class="DocTable-cell">表示模块仍<strong>处于开发中且不稳定</strong>。此版本不提供向后兼容性或稳定性保证。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell"><a href="#major">主版本</a></td>
      <td class="DocTable-cell">v<strong>1</strong>.x.x</td>
      <td class="DocTable-cell">表示<strong>向后不兼容的公共API变更</strong>。此版本不保证与之前的主版本向后兼容。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell"><a href="#minor">次版本</a></td>
      <td class="DocTable-cell">vx.<strong>4</strong>.x</td>
      <td class="DocTable-cell">表示<strong>向后兼容的公共API变更</strong>。此版本保证向后兼容性和稳定性。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell"><a href="#patch">修订版本</a></td>
      <td class="DocTable-cell">vx.x.<strong>1</strong></td>
      <td class="DocTable-cell">表示<strong>不影响模块公共API或其依赖项的变更</strong>。此版本保证向后兼容性和稳定性。</td>
    </tr>
    <tr class="DocTable-row">
      <td class="DocTable-cell"><a href="#pre-release">预发布版本</a></td>
      <td class="DocTable-cell">vx.x.x-<strong>beta.2</strong></td>
      <td class="DocTable-cell">表示这是一个<strong>预发布里程碑，例如alpha或beta版本</strong>。此版本不提供稳定性保证。</td>
    </tr>
  </tbody>
</table>

<a id="in-development" ></a>
## 开发中

表示模块仍在开发中且**不稳定**。此版本不提供向后兼容性或稳定性保证。

版本号可以采用以下形式之一：

**伪版本号**

> v0.0.0-20170915032832-14c0d48ead0c

**v0版本号**

> v0.x.x

<a id="pseudo" ></a>
### 伪版本号

当模块未在代码仓库中打标签时，Go工具会为调用该模块函数的代码的go.mod文件生成伪版本号。

**注意：** 最佳实践是始终允许Go工具生成伪版本号，而不是自行创建。

当使用模块函数的开发者需要基于尚未标记语义化版本标签的提交进行开发时，伪版本号非常有用。

伪版本号由三部分组成，用连字符分隔，如下所示：

#### 语法

_baseVersionPrefix_-_timestamp_-_revisionIdentifier_

#### 部分说明

* **baseVersionPrefix**（vX.0.0或vX.Y.Z-0）是从之前的语义化版本标签派生的值，如果不存在此类标签则为vX.0.0。

* **timestamp**（yymmddhhmmss）是修订创建的UTC时间。在Git中，这是提交时间，而非作者时间。

* **revisionIdentifier**（abcdefabcdef）是提交哈希的12字符前缀，或在Subversion中是补零的修订号。

<a id="v0" ></a>
### v0版本号

使用v0版本号发布的模块将具有正式的语义化版本号，包含主版本、次版本和修订版本部分，以及可选的预发布标识符。

虽然v0版本可以在生产环境中使用，但它不提供稳定性或向后兼容性保证。此外，v1及更高版本允许破坏使用v0版本代码的向后兼容性。因此，使用v0模块中函数的开发者有责任适应不兼容的更改，直到v1版本发布。

<a id="pre-release" ></a>
## 预发布版本

表示这是一个预发布里程碑，例如alpha或beta版本。此版本不提供稳定性保证。

#### 示例```
vx.x.x-beta.2
```模块开发者可以在任意major.minor.patch组合后附加连字符和预发布标识符来添加预发布版本标记。

<a id="minor" ></a>
## 次版本号

标识对模块公共API的向后兼容性更改。此版本保证向后兼容性和稳定性。

#### 示例```
vx.4.x
```该版本更改了模块的公共API，但不会破坏调用代码。这可能包括对模块自身依赖项的更改，或新增函数、方法、结构体字段或类型。

换言之，此版本可能通过新增函数引入增强功能，其他开发者或许希望使用这些新函数。然而，使用先前次版本的开发者无需修改其代码。

<a id="patch" ></a>
## 补丁版本号

表示不影响模块公共API或其依赖项的更改。此版本保证向后兼容性和稳定性。

#### 示例```
vx.x.1
```递增该版本号的更新仅用于小型变更，例如错误修复。使用该模块的开发者可以安全地升级到此版本，而无需修改其代码。

<a id="major" ></a>
## 主版本号

表示模块的公共API中存在向后不兼容的变更。此版本不保证与之前的主版本向后兼容。

#### 示例
v1.x.x

版本号v1或更高表示该模块可稳定使用（预发布版本除外）。

请注意，由于v0版本不提供稳定性或向后兼容性的保证，开发者将模块从v0升级到v1时，有责任自行适应破坏向后兼容性的变更。

模块开发者仅在必要时才应将此版本号递增到v1以上，因为版本升级会对使用该模块中函数的开发者造成显著影响。这种影响包括对公共API的向后不兼容性变更，以及使用该模块的开发者需要更新所有从该模块导入包的路径。

升级到高于v1的主版本时，模块路径也将是全新的。这是因为模块路径会附加主版本号，如下例所示：```
module example.com/mymodule/v2 v2.0.0
```主版本更新会使其成为一个与模块前版本历史独立的新模块。如果您正在开发供他人使用的模块，请参阅[模块发布与版本控制流程](release-workflow)中的"发布破坏性API变更"部分。

关于模块指令的更多信息，请参阅 [go.mod 参考文档](gomod-ref)。