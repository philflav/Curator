import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const readmePath = path.join(rootDir, 'README.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

if (!version) {
  console.error('Error: No version field found in package.json');
  process.exit(1);
}

console.log(`Current package.json version: v${version}`);

if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');

  // 1. Ensure dynamic badge is configured
  const badgeRegex = /\[!\[Version\]\(https:\/\/img\.shields\.io\/[^\)]+\)\]\([^\)]+\)/g;
  const targetBadge = `[![Version](https://img.shields.io/github/package-json/v/philflav/Curator?color=amber&label=version)](https://github.com/philflav/Curator/blob/main/package.json)`;
  
  if (badgeRegex.test(readme)) {
    readme = readme.replace(badgeRegex, targetBadge);
  }

  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('README.md version badge verified & synchronized with package.json.');
}
