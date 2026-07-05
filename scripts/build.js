import fs from "node:fs";
import path from "node:path";
import picocolors from "picocolors";
import {compileCSS, compileHTML, compileJS} from "./utils.js";

// 定义要处理的目录（根目录下的所有静态文件）
const srcDir = './src';
// 创建压缩后的输出目录
const distDir = './dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// 递归遍历文件的函数
function processFiles(dir) {
  const files = fs.readdirSync(dir, {withFileTypes: true});
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    const relativePath = path.relative(srcDir, filePath);
    const distFilePath = path.join(distDir, relativePath);
    // 如果是目录，递归处理
    if (file.isDirectory()) {
      if (!fs.existsSync(distFilePath)) fs.mkdirSync(distFilePath, {recursive: true});
      processFiles(filePath);
      continue;
    }
    // 处理HTML文件
    if (path.extname(file.name) === '.html') {
      compileHTML(filePath).then(minifiedHtml => {
        fs.writeFileSync(distFilePath, minifiedHtml, 'utf8');
        console.log(picocolors.bgGreen('SUCCESS ✔'), `Compressed HTML: ${filePath}`);
      });
    }
    // 处理CSS文件
    else if (path.extname(file.name) === '.css') {
      compileCSS(filePath).then(({code}) => {
        fs.writeFileSync(distFilePath, code, 'utf8');
        console.log(picocolors.bgGreen('SUCCESS ✔'), `Compressed CSS: ${filePath}`);
      });
    }
    // 处理JS文件（混淆+压缩）
    else if (path.extname(file.name) === '.js') {
      compileJS(file.name, filePath, distFilePath).then(resultList => {
        for (const {status, value: result, outfile} of resultList) {
          if (status !== 'fulfilled') {
            return;
          }
          if (result.errors.length) {
            console.log(picocolors.bgRed('ERROR ×'), `Compressed JS error: ${result.errors[0].text}`);
          } else {
            console.log(picocolors.bgGreen('SUCCESS ✔'), `Compressed JS ${filePath} to ${outfile}`);
          }
        }
      })
    }
    // 其他文件（图片、字体等）直接复制
    else {
      fs.copyFileSync(filePath, distFilePath);
      console.log(picocolors.bgGreen('SUCCESS ✔'), `Copied non-code file: ${filePath}`);
    }
  }
}

// 执行文件处理
try {
  processFiles(srcDir)
} catch (err) {
  console.error('Compression failed:', err);
  process.exit(1);
}