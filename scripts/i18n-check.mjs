#!/usr/bin/env node
// Tarjimalar to'liqligini tekshirish: koddagi tr('…'), tx('…') va t('…') matnlari src/lib/locales jadvallarida bormi.
//   node scripts/i18n-check.mjs            — qisqa hisobot (yetishmasa chiqish kodi 1)
//   node scripts/i18n-check.mjs --list     — yetishmayotgan matnlar (jadvalga qo'shish uchun qolip)
//   node scripts/i18n-check.mjs --unused   — kodda ishlatilmaydigan tarjimalar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(SRC, 'lib/locales');
// admin panel faqat o'zbek tilida
const SKIP = ['site/app/admin', 'site/components/admin', 'lib/locales'].map(p => path.join(SRC, p));

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some(s => p.startsWith(s))) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(e.name)) files.push(p);
  }
})(SRC);

const parse = f => ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const literal = n => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);
// platforma qobig'i kalitlari (tab.home …) — ular src/lib/i18n.ts da
const isShellKey = s => /^[a-z]+\.[A-Za-z]+$/.test(s);

/** Koddagi matnlar: matn → qayerda ishlatilgani */
const used = new Map();
const dynamic = [];
for (const f of files) {
  const sf = parse(f);
  (function visit(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['tr', 'tx', 't'].includes(n.expression.text) && n.arguments.length) {
      const s = literal(n.arguments[0]);
      const where = `${path.relative(ROOT, f)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
      if (s != null) {
        if (!(n.expression.text === 't' && isShellKey(s))) {
          if (!used.has(s)) used.set(s, []);
          used.get(s).push(where);
        }
      } else if (n.expression.text !== 't') dynamic.push(where);
    }
    ts.forEachChild(n, visit);
  })(sf);
}

/** Jadvallar: matn → [ru, en, tg, ar] */
const table = new Map();
const problems = [];
for (const name of fs.readdirSync(LOCALES)) {
  if (name === 'index.ts' || !name.endsWith('.ts')) continue;
  const f = path.join(LOCALES, name);
  const sf = parse(f);
  (function visit(n) {
    if (ts.isPropertyAssignment(n) && ts.isArrayLiteralExpression(n.initializer)) {
      const key = ts.isIdentifier(n.name) ? n.name.text : literal(n.name);
      const row = n.initializer.elements.map(literal);
      const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      if (key == null) problems.push(`${name}:${line} — kalit satr emas`);
      else if (row.length !== 4 || row.some(x => x == null || !x.trim())) problems.push(`${name}:${line} — 4 ta tarjima kerak: ${key}`);
      else if (table.has(key)) problems.push(`${name}:${line} — takroriy kalit (${table.get(key).file}): ${key}`);
      else {
        const vars = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
        if (row.some(x => vars(x) !== vars(key))) problems.push(`${name}:${line} — {o'zgaruvchilar} mos emas: ${key}`);
        table.set(key, { row, file: name });
      }
    }
    ts.forEachChild(n, visit);
  })(sf);
}

const missing = [...used.keys()].filter(k => !table.has(k));
const unused = [...table.keys()].filter(k => !used.has(k));

if (args.includes('--list')) {
  const q = s => JSON.stringify(s);
  for (const k of missing) console.log(`  ${q(k)}: ['', '', '', ''], // ${used.get(k)[0]}`);
} else if (args.includes('--unused')) {
  for (const k of unused) console.log(`${table.get(k).file}: ${k}`);
} else {
  console.log(`Koddagi matnlar: ${used.size} · tarjima qilingan: ${used.size - missing.length} · yetishmaydi: ${missing.length} · ishlatilmaydi: ${unused.length}`);
  if (dynamic.length) console.log(`O'zgaruvchi bilan chaqirilgan tr(): ${dynamic.length} ta (matnlari tx('…') bilan belgilanadi)`);
  for (const p of problems) console.log('XATO ' + p);
  for (const k of missing.slice(0, 40)) console.log(`yo'q: ${k}  (${used.get(k)[0]})`);
  if (missing.length > 40) console.log(`… yana ${missing.length - 40} ta (--list)`);
}
process.exit(missing.length || problems.length ? 1 : 0);
