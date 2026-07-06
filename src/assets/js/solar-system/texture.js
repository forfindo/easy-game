import * as THREE from "three";

export function createSunTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // 底色：参考标准太阳纹理配色（核心白黄 → 中层金黄 → 边缘橙红）
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#fff5c0');
  gradient.addColorStop(0.2, '#ffdd00');
  gradient.addColorStop(0.5, '#ff8800');
  gradient.addColorStop(0.8, '#ffdd00');
  gradient.addColorStop(1, '#fff5c0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 添加暗斑（太阳黑子效果）
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 20 + 5;
    const alpha = Math.random() * 0.3 + 0.05;

    const spotGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    spotGradient.addColorStop(0, `rgba(160, 60, 10, ${alpha})`);
    spotGradient.addColorStop(0.5, `rgba(180, 80, 30, ${alpha * 0.5})`);
    spotGradient.addColorStop(1, 'rgba(220, 120, 40, 0)');
    ctx.fillStyle = spotGradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 添加亮斑
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = Math.random() * 15 + 3;
    const brightGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    brightGradient.addColorStop(0, 'rgba(255, 255, 200, 0.35)');
    brightGradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = brightGradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}