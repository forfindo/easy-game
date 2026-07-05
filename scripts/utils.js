import fs from "node:fs";
import Htmlminifier from "html-minifier-terser";
import esbuild from "esbuild";

const jsOptions = {
  "base-sw.js": {
    format: "esm"
  },
  "solar-system.js": {
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
  ],
  "sw.js": {
    entryPoints: (origin) => origin.map(filePath => filePath.replace(/.js$/, ".esm.js"))
  }
}

/** HTML: 压缩 */
export function compileHTML(filePath) {
  const htmlContent = fs.readFileSync(filePath, 'utf8');
  return Htmlminifier.minify(htmlContent, {
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
}

/** CSS: esbuild 压缩 */
export async function compileCSS(filePath) {
  const cssContent = fs.readFileSync(filePath, 'utf8');
  return await esbuild.transform(cssContent, {
    loader: 'css',
    minify: true,
    sourcemap: false
  });
}

/** JS: esbuild 打包 + 压缩 */
export function compileJS(fileName, filePath, distFilePath, mode) {
  const options = Array.isArray(jsOptions[fileName]) ? jsOptions[fileName] : [jsOptions[fileName]];
  const promiseList = [];
  const outfile = [];
  options.forEach(o => {
    if (mode === 'dev' && o?.outfile) {
      return;
    }
    const initOption = {
      entryPoints: [filePath],
      bundle: true,
      minify: true,
      platform: 'browser',
      format: 'iife',
      sourcemap: mode === 'dev',
      write: mode !== 'dev',
      outfile: distFilePath
    };
    for (const k in o) {
      if (typeof o[k] === 'function') {
        initOption[k] = o[k](initOption[k]);
      } else {
        initOption[k] = o[k];
      }
    }
    promiseList.push(esbuild.build(initOption));
    outfile.push(initOption.outfile);
  })
  return Promise.allSettled(promiseList)
    .then(resultList => resultList
      .map((item, index) => ({
        ...item,
        outfile: outfile[index]
      }))
    );
}