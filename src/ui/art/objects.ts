import type Phaser from 'phaser';
import { drawTexture } from './canvas';

/** In-game objects: decoy bubble, stain enemy and the Colgate basket. */
export function makeObjects(scene: Phaser.Scene): void {
  // Decoy: glassy red-pink bubble with a white rim (150x150).
  drawTexture(scene, 'decoy', 150, 150, (ctx) => {
    const body = ctx.createRadialGradient(75, 80, 8, 75, 75, 68);
    body.addColorStop(0, 'rgba(255,215,220,0.18)');
    body.addColorStop(0.7, 'rgba(255,90,110,0.5)');
    body.addColorStop(1, 'rgba(255,60,90,0.85)');
    ctx.save();
    ctx.shadowColor = 'rgba(255,140,150,0.7)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(75, 75, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(75, 75, 62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(52, 46, 20, 11, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Stain: dark spiky ball with a mischievous face (190x190).
  drawTexture(scene, 'stain', 190, 190, (ctx) => {
    const cx = 95;
    const cy = 95;
    const spikes = 16;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (Math.PI * i) / spikes;
      const radius = i % 2 === 0 ? 88 : 58;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const body = ctx.createRadialGradient(cx - 18, cy - 22, 6, cx, cy, 90);
    body.addColorStop(0, '#5B5B5B');
    body.addColorStop(0.55, '#242424');
    body.addColorStop(1, '#0A0A0A');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = body;
    ctx.fill();
    ctx.restore();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.stroke();

    // Eyes and grin.
    for (const dx of [-20, 20]) {
      ctx.fillStyle = '#F2F2F2';
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy - 8, 11, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(cx + dx + 2, cy - 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#F2F2F2';
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 20, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  });

  // Basket: glossy red bowl carrying the white Colgate wordmark (340x220).
  drawTexture(scene, 'basket', 340, 220, (ctx) => {
    const cx = 170;

    // Warm glow on the floor under the bowl.
    const glow = ctx.createRadialGradient(cx, 198, 4, cx, 198, 150);
    glow.addColorStop(0, 'rgba(255,200,110,0.95)');
    glow.addColorStop(0.5, 'rgba(255,130,50,0.4)');
    glow.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, 198, 160, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back of the opening (dark inside).
    ctx.fillStyle = '#7C0710';
    ctx.beginPath();
    ctx.ellipse(cx, 34, 160, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body.
    const body = ctx.createLinearGradient(0, 34, 0, 190);
    body.addColorStop(0, '#F0343A');
    body.addColorStop(0.55, '#D1121D');
    body.addColorStop(1, '#8F0912');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(10, 36);
    ctx.lineTo(330, 36);
    ctx.bezierCurveTo(314, 128, 262, 188, cx, 188);
    ctx.bezierCurveTo(78, 188, 26, 128, 10, 36);
    ctx.closePath();
    ctx.fill();

    // Front lip highlight.
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,170,160,0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, 34, 160, 30, 0, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.stroke();

    // Side shine.
    const shine = ctx.createLinearGradient(40, 0, 120, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0.28)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.moveTo(38, 70);
    ctx.quadraticCurveTo(54, 130, 100, 170);
    ctx.lineTo(120, 160);
    ctx.quadraticCurveTo(84, 120, 76, 70);
    ctx.closePath();
    ctx.fill();

    // Wordmark.
    const logo = scene.textures.get('logo-colgate').getSourceImage() as CanvasImageSource;
    const logoW = 200;
    const logoH = (logoW * 167) / 781;
    ctx.drawImage(logo, cx - logoW / 2, 96 - logoH / 2 + 8, logoW, logoH);
  });
}
