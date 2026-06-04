const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const targets = [
  'app',
  'components',
  'src',
  'Plan',
  'app.json',
  'package.json',
  'tsconfig.json',
  '.vscode/settings.json',
  '.editorconfig',
  '.gitattributes',
];

const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.txt',
  '.html',
  '.css',
  '.svg',
]);

const skipFiles = new Set(['package-lock.json']);
const stringLiteralPattern = /'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|`([^`\\]*(?:\\.[^`]*)*)`/g;
const mojibakePattern = /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00C4[\u0080-\u00BF]|\u00EF\u00BF[\u0080-\u00BD])/u;
const letterPattern = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/u;

function collectFiles(entryPath, acc) {
  if (!fs.existsSync(entryPath)) return;

  const stats = fs.statSync(entryPath);
  if (stats.isDirectory()) {
    for (const child of fs.readdirSync(entryPath)) {
      collectFiles(path.join(entryPath, child), acc);
    }
    return;
  }

  if (skipFiles.has(path.basename(entryPath))) return;
  if (!textExtensions.has(path.extname(entryPath)) && !path.basename(entryPath).startsWith('.')) return;

  acc.push(entryPath);
}

function isLikelyUrl(content) {
  return /^(https?:|mailto:|tel:|\/)/.test(content) || (content.includes('=') && content.includes('&'));
}

function isSuspiciousQuestion(content) {
  const normalized = content.replace(/\$\{[^}]*\}/g, '');

  if (!normalized.includes('?') || isLikelyUrl(normalized)) return false;

  const trimmed = normalized.trim();
  const first = trimmed.indexOf('?');
  const last = trimmed.lastIndexOf('?');
  if (first === last && last === trimmed.length - 1) return false;

  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index] !== '?') continue;

    const prev = normalized[index - 1] || '';
    const next = normalized[index + 1] || '';
    if (letterPattern.test(prev) || letterPattern.test(next)) return true;
    if (index !== trimmed.length - 1) return true;
  }

  return false;
}

function inspectFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const replacementLines = [];
  const mojibakeLines = [];
  const suspiciousQuestionLines = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (line.includes('\uFFFD')) {
      replacementLines.push(lineNumber);
    }

    if (mojibakePattern.test(line)) {
      mojibakeLines.push(lineNumber);
    }

    for (const match of line.matchAll(stringLiteralPattern)) {
      const content = match[1] ?? match[2] ?? match[3] ?? '';
      if (isSuspiciousQuestion(content)) {
        suspiciousQuestionLines.push(lineNumber);
        break;
      }
    }
  });

  if (replacementLines.length || suspiciousQuestionLines.length) {
    return {
      classification: 'manual-repair-required',
      issues: {
        replacementLines,
        suspiciousQuestionLines,
      },
    };
  }

  if (mojibakeLines.length) {
    return {
      classification: 'reversible-mojibake',
      issues: {
        mojibakeLines,
      },
    };
  }

  return {
    classification: 'clean',
    issues: {},
  };
}

function formatLineNumbers(lineNumbers) {
  return lineNumbers.slice(0, 8).join(', ');
}

const files = [];
for (const target of targets) {
  collectFiles(path.join(repoRoot, target), files);
}

files.sort((left, right) => left.localeCompare(right));

const report = files.map((filePath) => {
  const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  return {
    file: relativePath,
    ...inspectFile(filePath),
  };
});

const failing = report.filter((entry) => entry.classification !== 'clean');

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(failing.length === 0 ? 0 : 1);
}

if (failing.length === 0) {
  console.log(`Encoding check passed. Scanned ${report.length} files with 0 suspect files.`);
  process.exit(0);
}

console.error(`Encoding check failed. Scanned ${report.length} files and found ${failing.length} suspect files.`);

for (const classification of ['manual-repair-required', 'reversible-mojibake']) {
  const entries = failing.filter((entry) => entry.classification === classification);
  if (entries.length === 0) continue;

  console.error(`\n${classification}:`);
  for (const entry of entries) {
    const details = [];
    if (entry.issues.replacementLines?.length) {
      details.push(`replacement lines ${formatLineNumbers(entry.issues.replacementLines)}`);
    }
    if (entry.issues.suspiciousQuestionLines?.length) {
      details.push(`suspicious strings at ${formatLineNumbers(entry.issues.suspiciousQuestionLines)}`);
    }
    if (entry.issues.mojibakeLines?.length) {
      details.push(`mojibake lines ${formatLineNumbers(entry.issues.mojibakeLines)}`);
    }

    console.error(`- ${entry.file}${details.length ? ` (${details.join('; ')})` : ''}`);
  }
}

process.exit(1);
