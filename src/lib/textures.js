import * as THREE from 'three';

// Textures procédurales (canvas) — aucun fichier externe nécessaire.

function canvasTexture(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

const rand = (a, b) => a + Math.random() * (b - a);

// Planches horizontales de bois vieilli (maison existante)
export function weatheredWood() {
  return canvasTexture(512, (g, s) => {
    const rows = 16;
    const h = s / rows;
    for (let i = 0; i < rows; i++) {
      const l = rand(28, 42);
      g.fillStyle = `hsl(${rand(22, 30)}, ${rand(18, 30)}%, ${l}%)`;
      g.fillRect(0, i * h, s, h);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = `rgba(20,12,6,${rand(0.05, 0.18)})`;
        g.beginPath();
        const y = i * h + rand(0, h);
        g.moveTo(0, y);
        g.bezierCurveTo(s * 0.3, y + rand(-2, 2), s * 0.6, y + rand(-2, 2), s, y + rand(-2, 2));
        g.stroke();
      }
      g.fillStyle = 'rgba(15,10,5,0.55)';
      g.fillRect(0, i * h + h - 2, s, 2);
    }
    // grisaillement
    for (let k = 0; k < 600; k++) {
      g.fillStyle = `rgba(160,160,165,${rand(0, 0.08)})`;
      g.fillRect(rand(0, s), rand(0, s), rand(5, 60), rand(1, 4));
    }
  });
}

// Tuiles canal / mécaniques terre cuite
export function roofTiles() {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = '#9c4a2c';
    g.fillRect(0, 0, s, s);
    const rows = 8, cols = 8;
    const w = s / cols, h = s / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * w, y = r * h;
        const grd = g.createLinearGradient(x, 0, x + w, 0);
        const base = `hsl(${rand(12, 20)}, ${rand(45, 60)}%, ${rand(30, 40)}%)`;
        grd.addColorStop(0, 'rgba(0,0,0,0.35)');
        grd.addColorStop(0.5, base);
        grd.addColorStop(1, 'rgba(0,0,0,0.35)');
        g.fillStyle = base;
        g.fillRect(x, y, w, h);
        g.fillStyle = grd;
        g.fillRect(x, y, w, h);
      }
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(0, r * h + h - 5, s, 5);
    }
  });
}

export function plaster(color = '#f1ede4') {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = color;
    g.fillRect(0, 0, s, s);
    for (let k = 0; k < 3000; k++) {
      g.fillStyle = `rgba(0,0,0,${rand(0, 0.035)})`;
      g.fillRect(rand(0, s), rand(0, s), 2, 2);
    }
  });
}

export function stone() {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = '#6e6a63';
    g.fillRect(0, 0, s, s);
    for (let k = 0; k < 90; k++) {
      g.fillStyle = `hsl(${rand(25, 45)}, ${rand(5, 12)}%, ${rand(38, 60)}%)`;
      g.beginPath();
      g.ellipse(rand(0, s), rand(0, s), rand(20, 50), rand(12, 28), rand(-0.3, 0.3), 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(30,28,25,0.6)';
      g.lineWidth = 3;
      g.stroke();
    }
  });
}

export function parquet() {
  return canvasTexture(512, (g, s) => {
    const cols = 6, rows = 3;
    const w = s / cols, h = s / rows;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const off = (c % 2) * h * 0.5;
        g.fillStyle = `hsl(${rand(28, 34)}, ${rand(35, 45)}%, ${rand(52, 62)}%)`;
        g.fillRect(c * w, r * h + off - h, w, h);
        g.fillRect(c * w, r * h + off, w, h);
        g.strokeStyle = 'rgba(60,35,15,0.35)';
        g.strokeRect(c * w, r * h + off, w, h);
      }
    }
  });
}

export function floorTiles() {
  return canvasTexture(256, (g, s) => {
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = `hsl(35, 8%, ${rand(80, 86)}%)`;
      g.fillRect(i * w, j * w, w, w);
    }
    g.strokeStyle = '#9a958d';
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, s); g.stroke();
      g.beginPath(); g.moveTo(0, i * w); g.lineTo(s, i * w); g.stroke();
    }
  });
}

export function deckBoards() {
  return canvasTexture(256, (g, s) => {
    const n = 8, h = s / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `hsl(${rand(24, 30)}, ${rand(35, 45)}%, ${rand(38, 46)}%)`;
      g.fillRect(0, i * h, s, h - 3);
      g.fillStyle = 'rgba(20,10,0,0.6)';
      g.fillRect(0, i * h + h - 3, s, 3);
    }
  });
}

