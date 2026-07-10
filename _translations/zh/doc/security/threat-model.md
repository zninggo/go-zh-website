---
title: Go 威胁模型
layout: article
breadcrumb: true
---

## 概述

本文档定义了 Go 工具链和标准库的通用威胁模型。如果某个包的文档未单独定义威胁模型，则应假设本文档描述的模型适用于标准库中的所有包。

### 威胁模型

#### 构建安全性

构建 Go 代码的过程被认为是安全的，不应产生副作用，例如意外执行。

#### 运行时执行

我们通常不将恶意代码的执行视为相关的安全问题。熟悉 Go 的用户应能理解他们正在执行的代码。

#### 内存安全

假设在不使用 `unsafe` 包的情况下，运行时能保证内存安全。

#### 信任边界

那些预期可能会接受任意用户提供的输入的 API，应具备防御恐慌和任意资源消耗的能力。

将无效数据传递给 API 导致意外输出，不被视为安全问题。

#### 环境控制

假设本地系统是安全的。依赖于操作系统已被攻破的攻击不被认为与我们相关。例如，我们认为攻击者对文件系统、环境变量（如 PATH）或内存的访问或控制不在我们模型的考虑范围内。

### 有独立威胁模型的包

* [encoding/json](/pkg/encoding/json/#hdr-Security_Considerations)
* [encoding/json/v2](/pkg/encoding/json/v2/#hdr-Security_Considerations)
* [encoding/json/jsontext](/pkg/encoding/json/jsontext/#hdr-Security_Considerations)
* [encoding/gob](/pkg/encoding/gob/#hdr-Security)
* [html/template](/pkg/html/template/#hdr-Security_Model)
* [image](/pkg/image/#hdr-Security_Considerations)
* [debug/pe](/pkg/debug/pe/#hdr-Security)
* [debug/macho](/pkg/debug/macho/#hdr-Security)
* [debug/dwarf](/pkg/debug/dwarf/#hdr-Security)
* [debug/plan9obj](/pkg/debug/plan9obj/#hdr-Security)
* [debug/elf](/pkg/debug/elf/#hdr-Security)