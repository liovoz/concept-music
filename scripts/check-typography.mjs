import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const PROHIBITED_RULES = [
  {
    name: 'Heavy font weight (700/800/900)',
    regex: /\bfont-(bold|extrabold|black)\b/g,
  },
  {
    name: 'Arbitrary text-[*] font size',
    regex: /\btext-\[[0-9.]+(px|rem|em)\]/g,
  },
  {
    name: 'Uppercase transform class',
    regex: /\buppercase\b/g,
  },
  {
    name: 'Italic emphasis class',
    regex: /\bitalic\b/g,
  },
  {
    name: 'Wide letter spacing utility',
    regex: /\btracking-(wide|wider|widest)\b/g,
  },
  {
    name: 'Small text negative tracking',
    regex: /(?:text-(?:xs|sm|2xs)|type-(?:meta|body)-[a-z]+)[^"'\n]*\btracking-tight(?:er)?\b|\btracking-tight(?:er)?\b[^"'\n]*(?:text-(?:xs|sm|2xs)|type-(?:meta|body)-[a-z]+)/g,
  },
];

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (/\.(vue|js|ts|css)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(SRC_DIR);
const violations = [];

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    // Skip explicit ignore comment
    if (line.includes('typography-ignore')) return;

    for (const rule of PROHIBITED_RULES) {
      rule.regex.lastIndex = 0;
      const match = rule.regex.exec(line);
      if (match) {
        violations.push({
          file: rel,
          line: lineNo,
          rule: rule.name,
          match: match[0],
        });
      }
    }

    // Hardcoded font-family outside src/style.css token definitions
    if (rel !== 'src/style.css' && /font-family\s*:/i.test(line) && !/var\(--font-family-/.test(line)) {
      violations.push({
        file: rel,
        line: lineNo,
        rule: 'Hardcoded font-family (must use var(--font-family-*))',
        match: line.trim(),
      });
    }

    // Hardcoded small px font-size in <style> blocks (< 11px)
    const cssFontMatch = /font-size\s*:\s*([0-9.]+)px/i.exec(line);
    if (cssFontMatch && Number(cssFontMatch[1]) < 11) {
      violations.push({
        file: rel,
        line: lineNo,
        rule: 'CSS font-size below 11px hard floor',
        match: cssFontMatch[0],
      });
    }
  });
}

// Check index.html lang="zh-CN" and CSP font-src
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!/<html[^>]+lang=["']zh-CN["']/i.test(indexHtml)) {
  violations.push({
    file: 'index.html',
    line: 1,
    rule: 'Root html lang must be zh-CN',
    match: 'lang != zh-CN',
  });
}
if (!/font-src[^;]*app:/i.test(indexHtml)) {
  violations.push({
    file: 'index.html',
    line: 8,
    rule: 'CSP font-src must allow app:',
    match: 'font-src missing app:',
  });
}

if (violations.length === 0) {
  console.log(`✅ Typography audit passed (${files.length} files scanned, 0 violations).`);
  process.exit(0);
} else {
  const summary = new Map();
  for (const v of violations) {
    summary.set(v.file, (summary.get(v.file) || 0) + 1);
  }
  console.error(`❌ Typography audit found ${violations.length} violation(s) across ${summary.size} file(s):`);
  for (const v of violations.slice(0, 40)) {
    console.error(`  ${v.file}:${v.line} [${v.rule}] -> ${v.match}`);
  }
  if (violations.length > 40) {
    console.error(`  ... and ${violations.length - 40} more.`);
  }
  process.exit(1);
}
