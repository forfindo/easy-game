import fs from "node:fs";
import path from "node:path";
import Htmlminifier from "html-minifier-terser";
import esbuild from "esbuild";
import picocolors from "picocolors";

// 定义要处理的目录（根目录下的所有静态文件）
const srcDir = './src';
// 创建压缩后的输出目录
const distDir = './dist';
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

const jsOptions = {
  "base-sw.js": {
    format: "esm"
  },
  "sw.esm.js": [
    {
      bundle: false,
      format: "esm"
    },
    {
      outfile: (origin) => origin.replace(".esm", '')
    }
  ]
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
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      Htmlminifier.minify(htmlContent, {
        // 折叠空白字符
        collapseWhitespace: true,
        // 移除注释
        removeComments: true,
        // 压缩HTML内联CSS
        minifyCSS: true,
        // 压缩HTML内联JS
        minifyJS: true,
        // 移除空属性
        removeEmptyAttributes: true,
        // 使用短的DOCTYPE
        useShortDoctype: true
      }).then(minifiedHtml => {
        fs.writeFileSync(distFilePath, minifiedHtml, 'utf8');
        console.log(picocolors.bgGreen('SUCCESS ✔'), `Compressed HTML: ${filePath}`);
      });
    }
    // 处理CSS文件
    else if (path.extname(file.name) === '.css') {
      const cssContent = fs.readFileSync(filePath, 'utf8');
      esbuild.transform(cssContent, {
        loader: 'css',
        minify: true,
        sourcemap: false
      }).then(cleanCss => {
        fs.writeFileSync(distFilePath, cleanCss.code, 'utf8');
        console.log(picocolors.bgGreen('SUCCESS ✔'), `Compressed CSS: ${filePath}`);
      });
    }
    // 处理JS文件（混淆+压缩）
    else if (path.extname(file.name) === '.js') {
      const options = Array.isArray(jsOptions[file.name]) ? jsOptions[file.name] : [jsOptions[file.name]];
      options.forEach(o => {
        const initOption = {
          entryPoints: [filePath],
          bundle: true,
          minify: true,
          platform: 'browser',
          format: 'iife',
          sourcemap: false,
          outfile: distFilePath
        };
        for (const k in o) {
          if (typeof o[k] === 'function') {
            initOption[k] = o[k](initOption[k]);
          } else {
            initOption[k] = o[k];
          }
        }
        esbuild.build(initOption).then(result => {
          if (result.errors.length) {
            console.log(picocolors.bgRed('ERROR ×'), `Compressed JS error: ${result.errors[0].text}`);
          } else {
            console.log(picocolors.bgGreen('SUCCESS ✔'), `Compressed JS to ${initOption.format.toUpperCase()}: ${filePath}`);
          }
        })
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