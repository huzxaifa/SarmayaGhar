import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist');

function getAllJsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files = getAllJsFiles(distDir);
let fixedCount = 0;

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  const originalContent = content;
  
  // Replace @shared/* imports with relative paths
  content = content.replace(
    /from ['"]@shared\/([^'"]+)['"]/g,
    (match, module) => {
      const fileDir = dirname(file);
      const sharedFile = join(distDir, 'shared', `${module}.js`);
      const relativePath = relative(fileDir, sharedFile).replace(/\\/g, '/');
      return `from "${relativePath}"`;
    }
  );
  
  if (content !== originalContent) {
    writeFileSync(file, content, 'utf-8');
    fixedCount++;
    console.log(`Fixed imports in: ${relative(distDir, file)}`);
  }
});

if (fixedCount > 0) {
  console.log(`\nFixed ${fixedCount} file(s).`);
} else {
  console.log('No files needed fixing.');
}

