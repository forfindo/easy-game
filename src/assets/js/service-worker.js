// ========== 设备检测 ==========
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isPWA = navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;

// ========== PWA 手动安装（IOS） ==========
function createIOSGuide() {
  if (document.getElementById('pwa-ios-guide')) return;
  const guide = document.createElement('div');
  guide.id = 'pwa-ios-guide';
  guide.style.cssText = `
    background: rgba(255,255,255,0.95);
    color: #333;
    border-radius: 16px;
    padding: 16px 20px;
    margin-top: 15px;
    font-size: 0.95rem;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    line-height: 1.6;
  `;
  guide.innerHTML = '📌 点击下方 <b>分享按钮</b> → 选择 <b>「添加到主屏幕」</b> 即可安装到桌面';
  document.querySelector('.container')?.appendChild(guide);
}

// iOS 不支持 beforeinstallprompt，显示安装引导
if (isIOS && !isPWA) {
  createIOSGuide();
}

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