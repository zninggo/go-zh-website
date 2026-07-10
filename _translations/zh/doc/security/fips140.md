---
title: FIPS 140-3 合规性
layout: article
---

从 Go 1.24 开始，Go 二进制文件可以原生地以一种便于实现 FIPS 140-3 合规性的模式运行。此外，工具链可以基于构成 Go 加密模块的加密包的冻结版本进行构建。

## FIPS 140-3

NIST FIPS 140-3 是美国政府针对加密应用程序的合规性要求，其中包括要求使用一套批准的算法，以及使用在目标操作环境中测试过的、经过 [CMVP](https://csrc.nist.gov/projects/cryptographic-module-validation-program) 验证的加密模块。

本页描述的机制有助于 Go 应用程序实现合规性。

不需要 FIPS 140-3 合规性的应用程序可以安全地忽略它们，并且不应启用 FIPS 140-3 模式。

**注意：** 仅仅使用一个符合 FIPS 140-3 且经过验证的加密模块，可能本身并不能满足所有相关的监管要求。Go 团队无法就所提供的 FIPS 140-3 模式的使用如何（或不能）满足特定用户的特定监管要求提供任何保证或支持。在确定使用此模块是否满足您的特定要求时应谨慎行事。

## Go 加密模块

Go 加密模块是位于 `crypto/internal/fips140/...` 下的一组标准库 Go 包，它们实现了 FIPS 140-3 批准的算法。

诸如 `crypto/ecdsa` 和 `crypto/rand` 之类的公共 API 包会透明地使用 Go 加密模块来实现 FIPS 140-3 算法。

## FIPS 140-3 模式

在 FIPS 140-3 模式下运行时：

 - Go 加密模块会在 `init` 时自动执行完整性自检，将构建时计算的模块目标文件的校验和与内存中加载的符号进行比较。

 - 所有算法都会根据相关的 FIPS 140-3 实施指南，在 `init` 时或首次使用时执行已知答案自测。

 - 会针对生成的加密密钥执行成对一致性测试。请注意，这可能会导致某些密钥类型的速度下降高达 2 倍，这与临时密钥尤其相关。

 - [`crypto/rand.Reader`](/pkg/crypto/rand/#Reader) 是基于 NIST SP 800-90A DRBG 实现的。为了保证与非 FIPS 140-3 模式运行的程序具有相同的安全级别，每次 `Read` 也会从平台的 CSPRNG 获取随机字节，并将其作为未计入的附加数据混入输出中。

 - [`crypto/tls`](/pkg/crypto/tls/) 包将忽略且不协商任何未经 FIPS 140-3 批准的协议版本、密码套件、签名算法或密钥交换机制。（这相当于传统的选择性启用 `crypto/tls/fipsonly` Go+BoringCrypto 机制。）

 - 使用 [`PSSSaltLengthAuto`](/pkg/crypto/rsa/#PSSSaltLengthAuto) 的 [`crypto/rsa.SignPSS`](/pkg/crypto/rsa/#SignPSS) 会将盐的长度限制为哈希函数的长度。

FIPS 140-3 模式在 OpenBSD、Wasm、AIX 和 32 位 Windows 上不受支持。

## `crypto/fips140` 包

[`crypto/fips140.Enabled`](/pkg/crypto/fips140/#Enabled) 函数报告 FIPS 140-3 模式是否处于活动状态。

[`crypto/fips140.Version`](/pkg/crypto/fips140/#Version) 函数返回正在使用的 Go 加密模块的版本。

## `GOFIPS140` 环境变量

`GOFIPS140` 环境变量可以与 `go build`、`go install` 和 `go test` 一起使用，以选择要链接到可执行程序中的 Go 加密模块版本，并默认启用 FIPS 140-3 模式。

 - `off` 是默认值，使用正在使用的标准库树中的 `crypto/internal/fips140/...` 包。

 - `latest` 类似于 `off`，但默认启用 FIPS 140-3 模式。

 - `v1.0.0` 或 `v1.26.0` 选择特定的 Go 加密模块版本。它们默认启用 FIPS 140-3 模式。

 - `inprocess` 和 `certified` 分别等同于指定已达到 [CMVP Modules In Process List][] 的最新版本和已获得 [CMVP validation certificate][] 的最新版本。

[CMVP Modules In Process List]: https://csrc.nist.gov/Projects/cryptographic-module-validation-program/modules-in-process/modules-in-process-list
[CMVP validation certificate]: https://csrc.nist.gov/projects/cryptographic-module-validation-program/validated-modules/search?SearchMode=Basic&ModuleName=Go+Cryptographic+Module&CertificateStatus=Active&ValidationYear=0

## `fips140` GODEBUG 选项

运行时的 `fips140` [GODEBUG](/doc/godebug) 选项控制 Go 加密模块是否在 FIPS 140-3 模式下运行。程序启动后无法更改此选项。

除非在构建时设置了 `GOFIPS140`，否则其默认为 `off`。

如果设置为 `on`，则启用 FIPS 140-3 模式。即使构建时未设置 `GOFIPS140`，也可以这样做。

如果设置为 `only`，不符合 FIPS 140-3 规范的加密算法将返回错误或引发 panic。请注意，这是一种尽力而为的模式，旨在用于测试、评估和调试。*不建议在生产环境中使用*，安全策略不要求使用它，它有意引入崩溃和潜在的未处理错误，并且可能存在误报或漏报。

大多数程序不应直接设置此选项，而应在构建时使用 `GOFIPS140`。

## 模块版本、验证和兼容性

Google 目前与 [Geomys](https://geomys.org/) 有合同关系，以促进 Go 加密模块至少每年进行一次 CMVP 验证。在验证时，我们将冻结 Go 加密模块并创建一个新的模块版本用于提交。

这些验证在全面的操作环境组合上进行测试，支持许多流行的操作系统和硬件平台组合。只要更新版本尚未获得CMVP验证证书，旧版Go加密模块将继续得到支持并保持可用。一旦更新版本获得了CMVP验证证书，旧版本将被移除。

如果使用从旧版Go冻结的Go加密模块，某些标准库功能可能不可用并会返回错误。

### Go加密模块 v1.26.0

Go加密模块v1.26.0于2026年初从Go 1.26冻结而来。

该版本在Go 1.26及更高版本中可用。

截至2026年4月28日，该版本在CMVP模块处理列表中处于待审状态。
它受[CAVP证书A8028](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/details?validation=40638)覆盖。

#### 相较于v1.0.0的变更

  - 实现了ML-DSA算法。

  - 现已支持[testing/cryptotest.SetGlobalRandom](/pkg/testing/cryptotest#SetGlobalRandom)。

  - 引入了新的AES-GCM合规性API，供`crypto/hpke`及未来公开的API使用。

  - Go加密模块现在使用CPU抖动熵源，其相关证书为[ESV证书 #E318](https://csrc.nist.gov/projects/cryptographic-module-validation-program/entropy-validations/certificate/318)和[CAVP证书A7715](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/details?product=20498)。
  （平台密码学安全伪随机数生成器仍作为所有随机字节的未认证附加数据源使用。）

  - 多项安全性与性能改进。

### Go加密模块 v1.0.0

Go加密模块v1.0.0于2024年初从Go 1.24冻结而来。

该版本在Go 1.24及更高版本中可用。

它受[CMVP证书 #5247](https://csrc.nist.gov/projects/cryptographic-module-validation-program/certificate/5247)和[CAVP证书A6650](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/details?product=19371)覆盖。

## Go+BoringCrypto

此前用于使BoringCrypto模块支持部分FIPS 140-3批准算法的、不受支持的机制目前仍可用，但预计将在未来的版本中移除，并被本页面描述的机制所取代。

Go+BoringCrypto与原生FIPS 140-3模式不兼容。