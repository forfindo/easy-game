// ========== 移动端检测 ==========
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const isPWA = navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;

// ========== Service Worker 注册 ==========
function onSuccessRegistry(reg) {
  console.log('[PWA] Service Worker 注册成功:', reg.scope);
  // 监听安装提示
  reg.addEventListener('updatefound', function () {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', function () {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('[PWA] 新版本已就绪，刷新页面即可更新');
      }
    });
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.esm.js', {type: 'module'})
    .then(onSuccessRegistry)
    .catch(() => {
      // 兼容不支持esm
      navigator.serviceWorker.register("./sw.js")
        .then(onSuccessRegistry)
        .catch((err) => {
          console.warn('[PWA] Service Worker 注册失败:', err);
        })
    });
}

function hiddenBackLink() {
  const standaloneEl = document.querySelector(".back-link");
  if (standaloneEl) standaloneEl.style.display = 'none';
}

if (isPWA) {
  hiddenBackLink();
}

// ========== PWA 手动安装 ==========
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] beforeinstallprompt 触发，PWA可安装');
  // 只有移动端才显示安装按钮, 如果已经以PWA模式运行，不显示按钮
  if (!isMobile || isPWA) return;

  // 阻止浏览器默认的安装提示
  e.preventDefault();
  installEvent = e;

  // 避免重复创建按钮
  if (document.getElementById('pwa-install-btn')) return;

  // 创建安装按钮
  const installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.textContent = '📱 安装到桌面';
  installBtn.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 16px 40px;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    margin-top: 15px;
    width: 100%;
    display: block;
  `;

  async function onClickInstall() {
    if (!installEvent) return;

    // 显示安装提示
    installEvent.prompt();

    // 等待用户选择
    const { outcome } = await installEvent.userChoice;
    console.log('[PWA] 用户安装选择:', outcome);

    if (outcome === 'accepted') {
      installBtn.remove();
      installBtn.removeEventListener("click", onClickInstall);
      hiddenBackLink();
    }

    installEvent = null;
  }

  installBtn.addEventListener('click', onClickInstall);

  // 将按钮插入到 resetBtn 后面
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.insertAdjacentElement('afterend', installBtn);
  } else {
    // fallback: 添加到 container 末尾
    const container = document.querySelector('.container');
    if (container) {
      container.appendChild(installBtn);
    }
  }
});