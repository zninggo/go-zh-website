#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const zlib = require('zlib');

const CONTENT_DIR = path.join(__dirname, '..', '_content');
const TRANSLATIONS_DIR = path.join(__dirname, '..', '_translations', 'zh');
const HASH_FILE = path.join(__dirname, '..', '.file-hashes.json');
const QUEUE_FILE = path.join(__dirname, '..', 'translation-queue.json');
const GLOSSARY_FILE = path.join(__dirname, '..', 'glossary', 'go-terms.json');

// Directories to translate
// 需要翻译的子目录（递归扫描）
const DOC_PATHS = ['doc', 'learn', 'ref', 'solutions', 'gopls'];

// 需要翻译的根目录文件
const ROOT_FILES = [
  'index.md',
  'about.md',
  'project.html',
  'conduct.html',
  'copyright.md',
  'tos.md',
  'help.md',
];

async function loadJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function resolveEnvVars(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const envVar = value.slice(2, -1);
      result[key] = process.env[envVar] || '';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = resolveEnvVars(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function saveJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function loadGlossary() {
  try {
    return require(GLOSSARY_FILE);
  } catch {
    return {};
  }
}

function md5(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function scanFiles(dir, basePath = '') {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await scanFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.html'))) {
        files.push(relativePath);
      }
    }
  } catch {}
  return files;
}

async function detectChanges() {
  const forceTranslate = process.env.FORCE_TRANSLATE === 'true';
  const oldHashes = await loadJSON(HASH_FILE);
  const newHashes = {};
  const changedFiles = [];

  console.log(`[DEBUG] hash 条目数: ${Object.keys(oldHashes).length}, forceTranslate: ${forceTranslate}`);

  // 扫描子目录
  for (const docPath of DOC_PATHS) {
    const dir = path.join(CONTENT_DIR, docPath);
    const files = await scanFiles(dir, docPath);

    for (const file of files) {
      const fullPath = path.join(CONTENT_DIR, file);
      const content = await fs.readFile(fullPath, 'utf-8');
      const hash = md5(content);
      newHashes[file] = hash;

      if (forceTranslate || oldHashes[file] !== hash) {
        changedFiles.push(file);
      } else {
        newHashes[file] = hash;
      }
    }
  }

  // 扫描根目录文件
  for (const file of ROOT_FILES) {
    const fullPath = path.join(CONTENT_DIR, file);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const hash = md5(content);
      newHashes[file] = hash;

      if (forceTranslate || oldHashes[file] !== hash) {
        changedFiles.push(file);
      } else {
        newHashes[file] = hash;
      }
    } catch {
      // 文件不存在，跳过
    }
  }

  // 保存未变更文件的 hash，成功翻译的文件在 main() 中单独保存
  await saveJSON(HASH_FILE, newHashes);
  return changedFiles;
}

function splitContent(content, ext) {
  const blocks = [];
  let currentText = '';

  if (ext === '.html') {
    const codeRegex = /<pre><code>[\s\S]*?<\/code><\/pre>/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        currentText += content.slice(lastIndex, match.index);
      }
      if (currentText.trim()) {
        blocks.push({ type: 'text', content: currentText });
        currentText = '';
      }
      blocks.push({ type: 'code', content: match[0] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      currentText = content.slice(lastIndex);
      if (currentText.trim()) {
        blocks.push({ type: 'text', content: currentText });
      }
    }
  } else {
    const codeRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        currentText += content.slice(lastIndex, match.index);
      }
      if (currentText.trim()) {
        blocks.push({ type: 'text', content: currentText });
        currentText = '';
      }
      blocks.push({ type: 'code', content: match[0] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      currentText = content.slice(lastIndex);
      if (currentText.trim()) {
        blocks.push({ type: 'text', content: currentText });
      }
    }
  }

  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: 'text', content });
  }

  return blocks;
}

function extractTitle(content) {
  // 从 frontmatter 提取标题
  const fmMatch = content.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (fmMatch) {
    try {
      const fm = JSON.parse(fmMatch[1]);
      return fm.Title || fm.title || '';
    } catch {}
  }
  const mdTitle = content.match(/^#\s+(.+)$/m);
  if (mdTitle) return mdTitle[1];
  const htmlTitle = content.match(/<title>([^<]+)<\/title>/i) || content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (htmlTitle) return htmlTitle[1];
  return '';
}

function splitTextBlocks(text, maxChunkSize = 6000) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function translateCodeComments(code) {
  // 翻译代码块中的注释，保留代码本身
  // 支持 Go/C/JS 风格的 // 和 /* */ 注释，以及 # 注释（shell/python）
  return code.replace(/(\/\/\s*)(.+)$/gm, (match, prefix, comment) => {
    // 跳过 URL 注释和编译器指令
    if (comment.match(/^http|^nolint|^go:|^noinspection|^TODO|^FIXME|^HACK/)) {
      return match;
    }
    return prefix + `[待翻译: ${comment}]`;
  }).replace(/(\/\*\s*)([\s\S]*?)(\s*\*\/)/g, (match, open, comment, close) => {
    return open + `[待翻译: ${comment}]` + close;
  });
}

async function decompressResponse(response) {
  const buffer = Buffer.from(await response.arrayBuffer());
  // gzip 魔术字节: 0x1f 0x8b
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return zlib.gunzipSync(buffer).toString('utf-8');
  }
  return buffer.toString('utf-8');
}

async function translateText(text, glossary, config, context = {}) {
  const { api_url, api_key, model, timeout, max_retries } = config.translation;

  const glossaryPrompt = Object.entries(glossary)
    .map(([en, zh]) => `${en} -> ${zh}`)
    .join('\n');

  const contextInfo = [];
  if (context.title) contextInfo.push(`文档标题: ${context.title}`);
  if (context.before) contextInfo.push(`前文摘要: ${context.before.slice(-300)}`);
  if (context.after) contextInfo.push(`后文摘要: ${context.after.slice(0, 300)}`);

  const systemPrompt = `你是一个专业的技术文档翻译专家。你的任务是将英文技术文档翻译成中文。

当前翻译上下文：
${contextInfo.length > 0 ? contextInfo.join('\n') : '(无额外上下文)'}

翻译规则：
1. 保持专业术语的准确性，参考术语表
2. 保持Markdown/HTML格式不变
3. 保持链接和引用不变
4. 翻译要自然流畅，符合中文表达习惯
5. 保留frontmatter格式，只翻译Title/title字段
6. 根据上下文保持翻译的一致性和连贯性
7. 标记为 [待翻译: ...] 的代码注释需要翻译为中文，去掉 [待翻译: ] 标记

术语表：
${glossaryPrompt}`;

  for (let attempt = 1; attempt <= max_retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${api_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
          'Accept-Encoding': 'identity'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `请翻译以下文档内容：\n\n${text}` }
          ],
          temperature: 0.3,
          max_tokens: 4096
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await decompressResponse(response);
        const reqUrl = `${api_url}/chat/completions`;
        console.log(`    [DEBUG] 请求URL: ${reqUrl}`);
        console.log(`    [DEBUG] Model: ${model}`);
        throw new Error(`API 请求失败: ${response.status} - ${errorBody}`);
      }

      const body = await decompressResponse(response);
      const data = JSON.parse(body);
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt === max_retries) throw error;
      const delay = error.message.includes('503') ? 5000 * attempt : 1000 * attempt;
      console.log(`    重试 ${attempt}/${max_retries} (${delay}ms): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function translateFile(file, glossary, config) {
  const sourcePath = path.join(CONTENT_DIR, file);
  const targetPath = path.join(TRANSLATIONS_DIR, file);
  const ext = path.extname(file);

  console.log(`  翻译: ${file}`);

  const content = await fs.readFile(sourcePath, 'utf-8');
  const title = extractTitle(content);
  const blocks = splitContent(content, ext);

  console.log(`    [DEBUG] 总块数: ${blocks.length}, 文本块: ${blocks.filter(b=>b.type==='text').length}, 代码块: ${blocks.filter(b=>b.type==='code').length}`);

  // 收集所有文本块用于上下文
  const allTextParts = blocks.filter(b => b.type === 'text').map(b => b.content);

  let translatedContent = '';
  let blockIndex = 0;
  let textPartIndex = 0;

  for (const block of blocks) {
    if (block.type === 'code') {
      // 代码块：翻译注释，保留代码
      const hasComments = block.content.match(/\/\/\s*\S/) || block.content.match(/\/\*[\s\S]*?\*\//);
      if (hasComments) {
        const markedCode = translateCodeComments(block.content);
        blockIndex++;
        console.log(`    代码块 ${blockIndex}: 翻译注释`);
        const context = {
          title,
          before: translatedContent.slice(-500),
          after: ''
        };
        const translated = await translateText(markedCode, glossary, config, context);
        // 确保代码块前后有换行分隔
        if (translatedContent && !translatedContent.endsWith('\n\n')) translatedContent += '\n\n';
        translatedContent += translated;
        if (!translated.endsWith('\n')) translatedContent += '\n';
      } else {
        // 确保代码块前后有换行分隔
        if (translatedContent && !translatedContent.endsWith('\n\n')) translatedContent += '\n\n';
        translatedContent += block.content;
        if (!block.content.endsWith('\n')) translatedContent += '\n';
      }
    } else {
      // 文本块：带上下文翻译
      const chunks = splitTextBlocks(block.content);
      console.log(`    [DEBUG] 文本块分 ${chunks.length} 个chunk`);
      for (const chunk of chunks) {
        blockIndex++;
        console.log(`    文本块 ${blockIndex}: ${chunk.length} 字符`);
        const context = {
          title,
          before: translatedContent.slice(-500),
          after: allTextParts[textPartIndex + 1] ? allTextParts[textPartIndex + 1].slice(0, 300) : ''
        };
        const translated = await translateText(chunk, glossary, config, context);
        console.log(`    [DEBUG] 翻译结果: ${translated.length} 字符 (源${chunk.length}→译${translated.length})`);
        // 确保文本块之间有换行分隔
        if (translatedContent && !translatedContent.endsWith('\n\n') && !translated.startsWith('\n')) translatedContent += '\n';
        translatedContent += translated;
      }
      textPartIndex++;
    }
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, translatedContent);
  console.log(`    完成: ${file}`);
}

async function main() {
  try {
    console.log('=== 开始翻译 ===\n');

    const rawConfig = await loadJSON(path.join(__dirname, '..', 'config.json'));
    const config = resolveEnvVars(rawConfig);
    if (!config.translation) {
      console.error('错误: config.json 中缺少 translation 配置');
      process.exit(1);
    }

    const glossary = loadGlossary();

    // 调试：打印 API 配置（不暴露完整密钥）
    console.log('API 配置:');
    console.log(`  URL: ${config.translation.api_url}`);
    console.log(`  Model: ${config.translation.model}`);
    console.log(`  Key: ${config.translation.api_key ? config.translation.api_key.slice(0, 8) + '...' : '(空)'}`);

    console.log('检测变更文件...');
    const changedFiles = await detectChanges();
    console.log(`发现 ${changedFiles.length} 个变更文件\n`);

    if (changedFiles.length === 0) {
      console.log('没有需要翻译的文件，退出');
      return;
    }

    const queue = {
      timestamp: new Date().toISOString(),
      files: changedFiles.map(f => ({
        source: f,
        target: f.replace(/\.html$/, '.md'),
        type: path.extname(f) === '.md' ? 'markdown' : 'html',
        status: 'pending'
      }))
    };

    let successCount = 0;
    let failCount = 0;

    for (const file of queue.files) {
      try {
        await translateFile(file.source, glossary, config);
        file.status = 'completed';
        file.translatedAt = new Date().toISOString();
        successCount++;

        // 翻译成功后保存该文件的 hash，这样失败的文件下次会自动重试
        const translatedContent = await fs.readFile(path.join(CONTENT_DIR, file.source), 'utf-8');
        const currentHashes = await loadJSON(HASH_FILE);
        currentHashes[file.source] = md5(translatedContent);
        await saveJSON(HASH_FILE, currentHashes);

        // 每翻译完一个文件就 commit，防止超时丢进度
        try {
          await saveJSON(QUEUE_FILE, queue);
          execSync('git add _translations/ translation-queue.json .file-hashes.json 2>/dev/null || true');
          execSync(`git diff --staged --quiet || git commit -m "chore: translate ${file.source} [skip ci]"`);
          execSync('git push || true');
          console.log(`    ✓ 已提交`);
        } catch (e) {
          console.log(`    ⚠ 提交失败: ${e.message}`);
        }
      } catch (error) {
        console.error(`  失败: ${file.source} - ${error.message}`);
        file.status = 'failed';
        file.error = error.message;
        failCount++;
      }
    }

    console.log('\n=== 翻译完成 ===');
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${failCount} 个`);

    if (failCount > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('翻译失败:', error.message);
    process.exit(1);
  }
}

main();







