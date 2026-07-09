#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const CONTENT_DIR = path.join(__dirname, '..', '_content');
const TRANSLATIONS_DIR = path.join(__dirname, '..', '_translations', 'zh');
const HASH_FILE = path.join(__dirname, '..', '.file-hashes.json');
const QUEUE_FILE = path.join(__dirname, '..', 'translation-queue.json');
const GLOSSARY_FILE = path.join(__dirname, '..', 'glossary', 'go-terms.json');

// Directories to translate
const DOC_PATHS = ['doc', 'learn'];

async function loadJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
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
      }
    }
  }

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

function splitTextBlocks(text, maxChunkSize = 8000) {
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

async function translateText(text, glossary, config) {
  const { api_url, api_key, model, timeout, max_retries } = config.translation;

  const glossaryPrompt = Object.entries(glossary)
    .map(([en, zh]) => `${en} -> ${zh}`)
    .join('\n');

  const systemPrompt = `你是一个专业的技术文档翻译专家。你的任务是将英文技术文档翻译成中文。

翻译规则：
1. 保持专业术语的准确性，参考术语表
2. 保持代码块不翻译，只翻译注释
3. 保持Markdown/HTML格式不变
4. 保持链接和引用不变
5. 翻译要自然流畅，符合中文表达习惯
6. 保留frontmatter格式，只翻译Title/title字段

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
          'Authorization': `Bearer ${api_key}`
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
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt === max_retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function translateFile(file, glossary, config) {
  const sourcePath = path.join(CONTENT_DIR, file);
  const targetPath = path.join(TRANSLATIONS_DIR, file);
  const ext = path.extname(file);

  console.log(`  翻译: ${file}`);

  const content = await fs.readFile(sourcePath, 'utf-8');
  const blocks = splitContent(content, ext);

  let translatedContent = '';
  let blockIndex = 0;

  for (const block of blocks) {
    if (block.type === 'code') {
      translatedContent += block.content;
    } else {
      const chunks = splitTextBlocks(block.content);
      for (const chunk of chunks) {
        blockIndex++;
        console.log(`    文本块 ${blockIndex}: ${chunk.length} 字符`);
        const translated = await translateText(chunk, glossary, config);
        translatedContent += translated;
      }
    }
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, translatedContent);
  console.log(`    完成: ${file}`);
}

async function main() {
  try {
    console.log('=== 开始翻译 ===\n');

    const config = await loadJSON(path.join(__dirname, '..', 'config.json'));
    if (!config.translation) {
      console.error('错误: config.json 中缺少 translation 配置');
      process.exit(1);
    }

    const glossary = loadGlossary();

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
      } catch (error) {
        console.error(`  失败: ${file.source} - ${error.message}`);
        file.status = 'failed';
        file.error = error.message;
        failCount++;
      }
    }

    await saveJSON(QUEUE_FILE, queue);

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
