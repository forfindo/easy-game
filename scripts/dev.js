import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import picocolors from "picocolors";
import {compileCSS, compileHTML, compileJS} from "./utils.js";

// ── 配置 ──────────────────────────────────────────────
const srcDir = path.resolve(import.meta.dirname, "../src");
const PORT = 3000;
const DEBOUNCE_MS = 1000;

// ── SSE 客户端 ────────────────────────────────────────
/** @type {Set<http.ServerResponse>} */
const clients = new Set();

// ── MIME ──────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  '.map': 'application/json; charset=utf-8',
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

const asyncResourceResolveMap = new Map();

const log = {
  ok: (m) => console.log(picocolors.green(" ✓ "), m),
  err: (m) => console.log(picocolors.red(" ✗ "), m),
  info: (m) => console.log(picocolors.blue(" ● "), m),
  watch: (m) => console.log(picocolors.yellow(" 👀 "), m),
};

// ── 注入 HTML 的 SSE 客户端脚本 ───────────────────────
// TODO: 更新哪个加载哪个
const SSE_SNIPPET = `
<script>(function(){
  const es=new EventSource("/__livereload");es.onmessage=(e)=>{e.data==='reload'&&location.reload()};es.onerror=()=>{es.close();};
})()</script>
</body>`;

// ── 内存缓存：key = 文件路径 → { code, mtime } ────────
const cache = new Map();

function getCache(filePath) {
  const entry = cache.get(filePath);
  if (!entry) return null;
  // 源文件没变就命中
  if (fs.statSync(entry.sourceFile).mtimeMs === entry.mtime) return entry.code;
  cache.delete(filePath);
  return null;
}

function setCache(filePath, sourceFile, code) {
  cache.set(filePath, {code, sourceFile, mtime: fs.statSync(sourceFile).mtimeMs});
}

// ── 编译入口（带缓存）─────────────────────────────────
async function getCompiledContent(filePath, ext) {
  const cached = getCache(filePath);
  if (cached !== null) return cached;

  // 非代码文件不加缓存
  if (![".html", ".css", ".js"].includes(ext)) {
    return fs.readFileSync(filePath);
  }

  let code;
  const fileName = path.basename(filePath);
  if (ext === ".html") {
    const oCode = await compileHTML(filePath);
    code = oCode.replace("</body>", SSE_SNIPPET);
    setCache(filePath, filePath, code);
  } else if (ext === ".css") {
    const {code: oCode} = await compileCSS(filePath, 'dev');
    code = oCode;
    setCache(filePath, filePath, code);
  } else if (ext === ".js") {
    const {status, value} = (await compileJS(fileName, filePath, filePath, 'dev'))?.[0];
    if (status === 'fulfilled') {
      const files = value.outputFiles;
      for (const file of files) {
        const text = file.text;
        setCache(file.path, filePath, text);
        if (file.path.endsWith(".js")) {
          code = text;
        } else if (file.path.endsWith(".map")) {
          const handle = asyncResourceResolveMap.get(file.path);
          if (handle) {
            asyncResourceResolveMap.delete(file.path);
            handle.resolve(text);
            clearTimeout(handle.timer);
          }
        }
      }
    }
  }
  return code;
}

// ── 广播 reload ───────────────────────────────────────
function broadcast() {
  for (const res of clients) {
    res.write("data: reload\n\n");
  }
  log.watch(`reload → ${clients.size} client${clients.size !== 1 ? "s" : ""}`);
}

// ── 解析请求文件路径 ─────────────────────────────────
function resolveFile(urlPath) {
  const clean = urlPath.split("?")[0];
  let fp = path.join(srcDir, decodeURIComponent(clean));
  if (!path.resolve(fp).startsWith(path.resolve(srcDir))) return null;

  if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
    fp = path.join(fp, "index.html");
  }

  return fp;
}

function _404Page(res, content) {
  res.writeHead(404, {"Content-Type": "text/html; charset=utf-8"});
  res.end(`<h1>404 Not Found</h1><p>${content || ''}</p>`);
}

// ── HTTP 服务器 ───────────────────────────────────────
function createServer() {
  return http.createServer(async (req, res) => {
    // --- SSE 端点 ---
    if (req.url === "/__livereload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("data: connected\n\n");
      clients.add(res);
      // FIXME: client没有正常删除
      req.on("close", () => {
        clients.delete(res)
      });
      return;
    }

    // --- 静态文件 ---
    const filePath = resolveFile(req.url);
    if (!filePath) {
      res.writeHead(403);
      res.end("403");
      return;
    }
    const ext = path.extname(filePath);

    // sourcemap返回
    if (ext === '.map') {
      const code = await new Promise(resolve => {
        const cached = getCache(filePath);
        if (cached) {
          resolve(cached);
          return;
        }
        const timer = setTimeout(() => {
          resolve('');
          asyncResourceResolveMap.delete(filePath);
        }, 3000);
        asyncResourceResolveMap.set(filePath, {resolve, timer});
      })
      if (code) {
        res.writeHead(200, {"Content-Type": MIME[ext] || "application/octet-stream"});
        return res.end(code);
      } else {
        return _404Page(res);
      }
    }

    try {
      const content = await getCompiledContent(filePath, ext);
      res.writeHead(200, {"Content-Type": MIME[ext] || "application/octet-stream"});
      res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        _404Page(res, err.message);
      } else {
        res.writeHead(500, {"Content-Type": "text/html; charset=utf-8"});
        res.end(`Internal Server Error<p>${err.stack}</p>`);
      }
    }
  });
}

// ── 文件监听（防抖）───────────────────────────────────
function startWatcher() {
  let timer;
  let pending = new Set();

  try {
    // FIXME: 文件未修改误报
    fs.watch(srcDir, {recursive: true}, (type, filename) => {
      if (!filename || type !== 'change' || filename.endsWith("~")) return;
      const full = path.join(srcDir, filename);
      try {
        if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) return;
      } catch {
        return;
      }

      pending.add(filename);
      clearTimeout(timer);
      timer = setTimeout(() => {
        const files = [...pending];
        pending.clear();
        log.watch(`${files.length} file(s) changed: ${files.toString()}`);
        // TODO: 更新的文件可能和当前打开的页面无关
        broadcast();
      }, DEBOUNCE_MS);
    });
    log.watch(`Watching "${srcDir}" for changes...\n`);
  } catch {
    log.info("fs.watch 不可用，降级到轮询 (1s)");
    const mtimes = new Map();
    setInterval(() => {
      const changed = [];
      const walk = (dir) => {
        for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
          const fp = path.join(dir, e.name);
          if (e.isDirectory()) {
            walk(fp);
            continue;
          }
          const m = fs.statSync(fp).mtimeMs;
          const prev = mtimes.get(fp);
          mtimes.set(fp, m);
          if (prev && m > prev) changed.push(fp);
        }
      };
      walk(srcDir);
      if (changed.length) {
        broadcast();
      }
    }, 1000);
  }
}

// ── 主入口 ────────────────────────────────────────────
const server = createServer();
server.listen(PORT, () => {
  console.log(picocolors.bgMagenta(" easy-game dev "), "\n");
  console.log(picocolors.bgCyan(" READY "), `http://localhost:${PORT}`);
  console.log(picocolors.gray("Serving from memory — no disk writes"));
  console.log(picocolors.gray("HTML → minify + SSE inject"));
  console.log(picocolors.gray("CSS  → esbuild minify"));
  console.log(picocolors.gray("JS   → esbuild bundle + minify (write:false)"));
  console.log(picocolors.gray("Press Ctrl+C to stop\n"));
});

startWatcher();

const shutdown = () => {
  console.log(picocolors.gray("\nShutting down..."));
  clients.forEach((res) => {
    try {
      res.end();
    } catch {
    }
  });
  server.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
