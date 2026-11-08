#!/usr/bin/env node
/**
 * Lightweight pre-publication check.
 *
 * This is not a replacement for gitleaks or a human review. It catches the
 * mistakes that are easy to make in a portfolio repo: local absolute paths,
 * accidental key material, credential-bearing Mongo URIs and tracked runtime
 * files.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const findings = [];

const skippedExtensions = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.zip', '.gz',
]);

const sensitiveFilePattern =
  /(^|\/)(\.env(\.|$)|uploads\/|\.cache\/|node_modules\/|dist\/|coverage\/|credentials\.json$|.*\.(pem|key|p12|pfx)$)/i;

const patterns = [
  { name: 'local Windows path', regex: /C:\\Users\\/i },
  { name: 'local macOS home path', regex: /\/Users\/[A-Za-z0-9._-]+\// },
  { name: 'Downloads path', regex: /\bDownloads[\\/]/i },
  { name: 'private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Hugging Face token', regex: /\bhf_[A-Za-z0-9]{30,}\b/ },
  { name: 'Stripe live key', regex: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: 'GitHub token', regex: /\bghp_[A-Za-z0-9]{30,}\b/ },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'credential URI', regex: /mongodb(?:\+srv)?:\/\/[^\s"'`]+:[^\s@/"'`]+@[^\s"'`]+/ },
  { name: 'hard-coded signing secret', regex: /\b(?:JWT_SECRET|SESSION_SECRET|SIGNING_SECRET)\s*[:=]\s*["']?(?!process\.env|import\.meta|\$\{)[A-Za-z0-9_\-./+=]{16,}/ },
];

function allowed(line, patternName) {
  if (line.includes('pawcompanion-local-mongo-password')) return true;
  if (line.includes('pawcompanion-local-demo-only')) return true;
  if (patternName === 'credential URI' && /example\.com|127\.0\.0\.1|localhost/i.test(line)) return true;
  return false;
}

let files;
try {
  files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
} catch {
  console.error('privacy check: run this from a Git checkout with git installed.');
  process.exit(2);
}

for (const file of files) {
  const absolute = path.join(root, file);

  if (sensitiveFilePattern.test(file) && !file.endsWith('.env.example')) {
    findings.push({ file, line: 0, pattern: 'sensitive path is tracked', excerpt: file });
    continue;
  }

  const extension = path.extname(file).toLowerCase();
  if (skippedExtensions.has(extension)) continue;

  let content;
  try {
    content = readFileSync(absolute);
  } catch {
    continue;
  }
  if (content.length > 512 * 1024) continue;
  if (content.includes(0)) continue;
  const text = content.toString('utf8');

  text.split(/\r?\n/).forEach((line, index) => {
    for (const pattern of patterns) {
      if (!pattern.regex.test(line)) continue;
      if (allowed(line, pattern.name)) continue;
      findings.push({
        file,
        line: index + 1,
        pattern: pattern.name,
        excerpt: line.trim().slice(0, 140),
      });
      break;
    }
  });
}

console.log(`PawCompanion privacy check — scanned ${files.length} tracked files.`);

if (findings.length === 0) {
  console.log('✓ no local paths, key material or tracked runtime files found.');
  process.exit(0);
}

for (const finding of findings) {
  console.error(`✗ ${finding.file}${finding.line ? `:${finding.line}` : ''} — ${finding.pattern}`);
  console.error(`  ${finding.excerpt}`);
}
console.error(`\n${findings.length} finding(s). Remove or allowlist them before publishing.`);
process.exit(1);
