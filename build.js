import fs from "node:fs";
import path from "node:path";
import Htmlminifier from "html-minifier-terser";
import CleanCss from "clean-css";
import * as Terser from "terser";

// 定义要处理的目录（根目录下的所有静态文件）
const srcDir = './src';
// 创建压缩后的输出目录
const distDir = './dist';
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// 递归遍历文件的函数
async function processFiles(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        const relativePath = path.relative(srcDir, filePath);
        const distFilePath = path.join(distDir, relativePath);
        // 如果是目录，递归处理
        if (file.isDirectory()) {
            if (!fs.existsSync(distFilePath)) fs.mkdirSync(distFilePath, { recursive: true });
            await processFiles(filePath);
            continue;
        }
        // 处理HTML文件
        if (path.extname(file.name) === '.html') {
            const htmlContent = fs.readFileSync(filePath, 'utf8');
            const minifiedHtml = await Htmlminifier.minify(htmlContent, {
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
            });
            fs.writeFileSync(distFilePath, minifiedHtml, 'utf8');
            console.log(`Compressed HTML: ${filePath}`);
        }
        // 处理CSS文件
        else if (path.extname(file.name) === '.css') {
            const cssContent = fs.readFileSync(filePath, 'utf8');
            const minifiedCss = new CleanCss({
                // 最高压缩级别
                level: 2,
                // 移除注释
                removeComments: true
            }).minify(cssContent).styles;
            fs.writeFileSync(distFilePath, minifiedCss, 'utf8');
            console.log(`Compressed CSS: ${filePath}`);
        }
        // 处理JS文件（混淆+压缩）
        else if (path.extname(file.name) === '.js') {
            const jsContent = fs.readFileSync(filePath, 'utf8');
            const minifiedJs = await Terser.minify(jsContent, {
                // 混淆顶级变量名
                mangle: { toplevel: true },
                // 移除console.log（可选）
                compress: { drop_console: true },
                // 移除注释
                format: { comments: false }
            });
            fs.writeFileSync(distFilePath, minifiedJs.code, 'utf8');
            console.log(`Obfuscated and compressed JS: ${filePath}`);
        }
        // 其他文件（图片、字体等）直接复制
        else {
            fs.copyFileSync(filePath, distFilePath);
            console.log(`Copied non-code file: ${filePath}`);
        }
    }
}

// 执行文件处理
processFiles(srcDir).catch(err => {
    console.error('Compression failed:', err);
    process.exit(1);
});