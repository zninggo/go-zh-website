#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', '_content');
const TRANSLATIONS_DIR = path.join(__dirname, '..', '_translations', 'zh');
const GLOSSARY_FILE = path.join(__dirname, '..', 'glossary', 'go-terms.json');

// Directories to verify
const DOC_PATHS = ['doc', 'learn'];

async function loadJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function loadGlossary() {
  try {
    return require(GLOSSARY_FILE);
  } catch {
    return {};
  }
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

function extractCodeBlocks(content) {
  const blocks = [];
  // HTML code blocks
  const htmlRegex = /<pre><code>([\s\S]*?)<\/code><\/pre>/g;
  let match;
  while ((match = htmlRegex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  // Markdown code blocks
  const mdRegex = /```[\s\S]*?```/g;
  while ((match = mdRegex.exec(content)) !== null) {
    blocks.push(match[0]);
  }
  return blocks;
}

function stripCodeBlocks(content) {
  return content
    .replace(/<pre><code>[\s\S]*?<\/code><\/pre>/g, '<!-- CODE_BLOCK -->')
    .replace(/```[\s\S]*??```/g, '<!-- CODE_BLOCK -->');
}

function countChineseChars(text) {
  return (text.match(/[一-鿿]/g) || []).length;
}

function countEnglishWords(text) {
  return (text.match(/[a-zA-Z]+/g) || []).length;
}

async function verifyFile(file, glossary, config) {
  const sourcePath = path.join(CONTENT_DIR, file);
  const transPath = path.join(TRANSLATIONS_DIR, file);

  const issues = [];

  // Check if translation exists
  try {
    await fs.access(transPath);
  } catch {
    issues.push({ type: 'missing', message: '翻译文件不存在' });
    return { file, issues };
  }

  const sourceContent = await fs.readFile(sourcePath, 'utf-8');
  const transContent = await fs.readFile(transPath, 'utf-8');

  // Check 1: Translation is too short (likely truncated)
  const sourceText = stripCodeBlocks(sourceContent);
  const transText = stripCodeBlocks(transContent);
  const sourceLength = sourceText.length;
  const transLength = transText.length;

  if (transLength < sourceLength * 0.3) {
    issues.push({
      type: 'truncated',
      message: `翻译内容过短: 源 ${sourceLength} 字符, 译 ${transLength} 字符 (${Math.round(transLength/sourceLength*100)}%)`
    });
  }

  // Check 2: Code blocks preserved
  const sourceCodeBlocks = extractCodeBlocks(sourceContent);
  const transCodeBlocks = extractCodeBlocks(transContent);

  if (sourceCodeBlocks.length > 0 && transCodeBlocks.length === 0) {
    issues.push({
      type: 'code_missing',
      message: `源文件有 ${sourceCodeBlocks.length} 个代码块，翻译中没有代码块`
    });
  }

  // Check 3: Untranslated English paragraphs (heuristic)
  const transParagraphs = transText.split(/\n\n+/).filter(p => p.trim().length > 50);
  const untranslated = transParagraphs.filter(p => {
    const chinese = countChineseChars(p);
    const english = countEnglishWords(p);
    // If a paragraph has mostly English and very little Chinese, it might be untranslated
    return english > 30 && chinese < 5 && !p.includes('<!-- CODE_BLOCK -->');
  });

  if (untranslated.length > 0) {
    issues.push({
      type: 'untranslated',
      message: `疑似未翻译段落: ${untranslated.length} 个`,
      details: untranslated.slice(0, 3).map(p => p.slice(0, 80) + '...')
    });
  }

  // Check 4: HTML structure preserved (for HTML files)
  if (file.endsWith('.html')) {
    const sourceTags = (sourceContent.match(/<(h[1-6]|p|div|ul|ol|table|pre)[^>]*>/g) || []).length;
    const transTags = (transContent.match(/<(h[1-6]|p|div|ul|ol|table|pre)[^>]*>/g) || []).length;

    if (Math.abs(sourceTags - transTags) > sourceTags * 0.2) {
      issues.push({
        type: 'structure',
        message: `HTML 结构差异较大: 源 ${sourceTags} 个标签, 译 ${transTags} 个标签`
      });
    }
  }

  // Check 5: Glossary terms consistency
  const glossaryIssues = [];
  for (const [en, zh] of Object.entries(glossary)) {
    const enLower = en.toLowerCase();
    const sourceHasTerm = sourceContent.toLowerCase().includes(enLower);
    const transHasTerm = transContent.includes(zh);

    if (sourceHasTerm && !transHasTerm) {
      glossaryIssues.push(`${en} -> ${zh}`);
    }
  }

  if (glossaryIssues.length > 0) {
    issues.push({
      type: 'glossary',
      message: `术语表不一致: ${glossaryIssues.slice(0, 5).join(', ')}${glossaryIssues.length > 5 ? '...' : ''}`
    });
  }

  // Check 6: AI verification (if config available)
  if (config.translation && config.translation.api_url) {
    try {
      const aiResult = await callVerifyAPI(sourceContent, transContent, glossary, config);
      if (aiResult && !aiResult.includes('PASS')) {
        issues.push({
          type: 'ai_review',
          message: `AI 审核问题: ${aiResult.slice(0, 200)}`
        });
      }
    } catch (error) {
      // AI verification is optional, don't fail on error
      console.log(`    AI 审核跳过: ${error.message}`);
    }
  }

  return { file, issues };
}

async function callVerifyAPI(original, translated, glossary, config) {
  const { api_url, api_key, model, timeout, max_retries } = config.translation;

  const glossaryPrompt = Object.entries(glossary)
    .map(([en, zh]) => `${en} -> ${zh}`)
    .join('\n');

  const systemPrompt = `你是一个专业的技术文档翻译审核专家。你的任务是检查中文翻译的准确性。

审核规则：
1. 对比英文原文和中文翻译
2. 检查是否有漏译、错译、过度意译
3. 检查专业术语是否准确
4. 检查代码块是否被错误翻译
5. 检查格式是否完整保留
6. 只报告问题，如果翻译正确则返回 "PASS"

术语表：
${glossaryPrompt}

返回格式：
- 如果翻译正确：PASS
- 如果有问题：列出具体问题（最多3个）`;

  const userPrompt = `请审核以下翻译：

【英文原文】
${original.slice(0, 3000)}

【中文翻译】
${translated.slice(0, 3000)}`;

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
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 500
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices[0].message.content;
      if (!result) continue;
      return result;
    } catch (error) {
      if (attempt === max_retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function main() {
  try {
    console.log('=== 开始翻译验证 ===\n');

    const config = await loadJSON(path.join(__dirname, '..', 'config.json'));
    const glossary = loadGlossary();

    // Scan all source files
    const allFiles = [];
    for (const docPath of DOC_PATHS) {
      const dir = path.join(CONTENT_DIR, docPath);
      const files = await scanFiles(dir, docPath);
      allFiles.push(...files);
    }

    console.log(`找到 ${allFiles.length} 个源文件\n`);

    // Scan translated files
    const transFiles = [];
    for (const docPath of DOC_PATHS) {
      const dir = path.join(TRANSLATIONS_DIR, docPath);
      const files = await scanFiles(dir, docPath);
      transFiles.push(...files);
    }

    console.log(`找到 ${transFiles.length} 个翻译文件\n`);

    // Find missing translations
    const missingFiles = allFiles.filter(f => !transFiles.includes(f));
    if (missingFiles.length > 0) {
      console.log(`⚠️  ${missingFiles.length} 个文件未翻译:`);
      missingFiles.forEach(f => console.log(`   - ${f}`));
      console.log('');
    }

    // Find extra translations (files that don't have source)
    const extraFiles = transFiles.filter(f => !allFiles.includes(f));
    if (extraFiles.length > 0) {
      console.log(`⚠️  ${extraFiles.length} 个翻译文件无对应源文件:`);
      extraFiles.forEach(f => console.log(`   - ${f}`));
      console.log('');
    }

    // Verify each translated file
    const results = { pass: 0, fail: 0, issues: [] };

    for (const file of transFiles) {
      if (!allFiles.includes(file)) continue; // Skip extra files

      console.log(`验证: ${file}`);
      const result = await verifyFile(file, glossary, config);

      if (result.issues.length === 0) {
        console.log('  ✓ 通过');
        results.pass++;
      } else {
        console.log(`  ✗ ${result.issues.length} 个问题:`);
        result.issues.forEach(issue => {
          console.log(`    - [${issue.type}] ${issue.message}`);
        });
        results.fail++;
        results.issues.push(result);
      }
    }

    // Summary
    console.log('\n=== 验证完成 ===');
    console.log(`通过: ${results.pass} 个`);
    console.log(`有问题: ${results.fail} 个`);
    console.log(`未翻译: ${missingFiles.length} 个`);

    if (results.issues.length > 0) {
      console.log('\n问题详情:');
      for (const result of results.issues) {
        console.log(`\n  ${result.file}:`);
        for (const issue of result.issues) {
          console.log(`    - [${issue.type}] ${issue.message}`);
          if (issue.details) {
            issue.details.forEach(d => console.log(`      ${d}`));
          }
        }
      }
    }

    // Exit with error if there are issues
    if (results.fail > 0 || missingFiles.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('验证失败:', error.message);
    process.exit(1);
  }
}

main();
