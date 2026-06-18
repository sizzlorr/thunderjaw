const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));
const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/').pop()
  : packageJson.name;
const baseHref = process.env.GITHUB_PAGES_BASE_HREF || `/${repoName}/`;
const distBrowserDir = path.join(projectRoot, 'dist', packageJson.name, 'browser');
const docsDir = path.join(projectRoot, 'docs');

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

console.log(`Building GitHub Pages site with base href: ${baseHref}`);
execFileSync(
  path.join(projectRoot, 'node_modules', '.bin', 'ng'),
  ['build', '--base-href', baseHref],
  { cwd: projectRoot, stdio: 'inherit' }
);

fs.rmSync(docsDir, { recursive: true, force: true });
copyDirectory(distBrowserDir, docsDir);
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');

console.log(`GitHub Pages files are ready in: ${docsDir}`);

