import { Ball, CameraMode, CLUBS, ClubId, Particle, Player, StadiumTheme } from '../types/game';
import { GameEngine, PITCH_CONFIG, PITCH_MARGIN } from './physics';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;

  // Viewport dimensions in CSS pixels
  private viewportWidth: number = 1100;
  private viewportHeight: number = 660;

  // Camera State
  public cameraMode: CameraMode = 'dynamic';
  private camX: number = 550;
  private camY: number = 330;
  private camZoom: number = 1;
  private isCameraInitialized: boolean = false;

  // Preloaded Club Character Disc Images
  private clubCharacterImages: Partial<Record<ClubId, HTMLImageElement>> = {};

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.engine = engine;
    this.cameraMode = engine.settings.cameraMode || 'dynamic';
    this.preloadCharacterImages();
  }

  private preloadCharacterImages() {
    (Object.keys(CLUBS) as ClubId[]).forEach((clubId) => {
      const src = CLUBS[clubId].characterImage;
      if (!src) return;
      const img = new Image();
      img.src = src;
      this.clubCharacterImages[clubId] = img;
    });
  }

  public setEngine(engine: GameEngine) {
    this.engine = engine;
    if (engine.settings.cameraMode) {
      this.cameraMode = engine.settings.cameraMode;
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    this.engine.settings.cameraMode = mode;
  }

  public toggleCameraMode(): CameraMode {
    const nextMode: CameraMode = this.cameraMode === 'dynamic' ? 'overview' : 'dynamic';
    this.setCameraMode(nextMode);
    return nextMode;
  }

  public resize(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = Math.max(320, viewportWidth);
    this.viewportHeight = Math.max(240, viewportHeight);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.viewportWidth * dpr;
    this.canvas.height = this.viewportHeight * dpr;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  public render() {
    const ctx = this.ctx;
    const engine = this.engine;
    const pitch = engine.pitchConfig;
    const margin = engine.pitchMargin;
    const isOlympic = engine.settings.stadiumType === 'olympic';
    const isGrand = engine.settings.stadiumType === 'grand_stadium';

    const vw = this.viewportWidth;
    const vh = this.viewportHeight;

    // Clear whole screen with stadium background
    ctx.save();
    ctx.fillStyle = isOlympic ? '#02040a' : isGrand ? '#030508' : '#05070a';
    ctx.fillRect(0, 0, vw, vh);

    // Calculate overview scale to fit the entire pitch comfortably
    const overviewScale = Math.min(vw / pitch.width, vh / pitch.height) * (isOlympic ? 0.90 : isGrand ? 0.92 : 0.95);

    // Initialize camera position on first frame or if stadium changed
    if (!this.isCameraInitialized) {
      this.camX = pitch.width / 2;
      this.camY = pitch.height / 2;
      this.camZoom = overviewScale;
      this.isCameraInitialized = true;
    }

    // Determine target camera focal point and zoom
    let targetX = pitch.width / 2;
    let targetY = pitch.height / 2;
    let targetZoom = overviewScale;

    const activePlayers = engine.getActivePlayers();

    if (this.cameraMode === 'dynamic') {
      // Calculate center of mass of all active players
      let pXSum = 0;
      let pYSum = 0;
      for (const p of activePlayers) {
        pXSum += p.x;
        pYSum += p.y;
      }
      const avgPlayerX = pXSum / activePlayers.length;
      const avgPlayerY = pYSum / activePlayers.length;

      // Weight target: 58% Ball, 42% Active Players average
      targetX = engine.ball.x * 0.58 + avgPlayerX * 0.42;
      targetY = engine.ball.y * 0.58 + avgPlayerY * 0.42;

      // Substantially closer in-game dynamic camera zoom for immersive broadcast action
      const dynamicBaseZoom = isOlympic ? overviewScale * 2.35 : isGrand ? overviewScale * 2.15 : overviewScale * 1.75;

      // When ball flies fast (long shots / super shots), smoothly reveal target trajectory
      const ballSpeed = Math.hypot(engine.ball.vx, engine.ball.vy);
      const speedOutFactor = Math.max(0.82, 1 - (ballSpeed / 2000) * 0.18);
      targetZoom = dynamicBaseZoom * speedOutFactor;

      // Clamp camera view within stadium bounds so empty void is never shown
      const halfVisibleW = (vw / 2) / targetZoom;
      const halfVisibleH = (vh / 2) / targetZoom;

      const minCamX = halfVisibleW;
      const maxCamX = pitch.width - halfVisibleW;
      const minCamY = halfVisibleH;
      const maxCamY = pitch.height - halfVisibleH;

      if (minCamX < maxCamX) {
        targetX = Math.max(minCamX, Math.min(maxCamX, targetX));
      } else {
        targetX = pitch.width / 2;
      }

      if (minCamY < maxCamY) {
        targetY = Math.max(minCamY, Math.min(maxCamY, targetY));
      } else {
        targetY = pitch.height / 2;
      }

      // Smooth camera lerp
      this.camX += (targetX - this.camX) * 0.085;
      this.camY += (targetY - this.camY) * 0.085;
      this.camZoom += (targetZoom - this.camZoom) * 0.06;
    } else {
      // Overview mode: smoothly glide back to center and full stadium overview
      targetX = pitch.width / 2;
      targetY = pitch.height / 2;
      targetZoom = overviewScale;

      this.camX += (targetX - this.camX) * 0.1;
      this.camY += (targetY - this.camY) * 0.1;
      this.camZoom += (targetZoom - this.camZoom) * 0.08;
    }

    // Apply Camera Shake
    let shakeX = 0;
    let shakeY = 0;
    if (engine.cameraShake > 0) {
      shakeX = (Math.random() - 0.5) * engine.cameraShake;
      shakeY = (Math.random() - 0.5) * engine.cameraShake;
    }

    // Transform World Coordinates to Screen Coordinates
    ctx.translate(vw / 2 + shakeX, vh / 2 + shakeY);
    ctx.scale(this.camZoom, this.camZoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. Draw Stadium Surroundings & Architecture
    if (isOlympic) {
      this.drawOlympicStadiumArchitecture();
    } else if (isGrand) {
      this.drawGrandStadiumArchitecture();
    } else {
      this.drawClassicStadiumSurround();
    }

    // 2. Draw Pitch Turf Grass
    this.drawPitchGrass();

    // 3. Draw Scaled Pitch Markings
    this.drawPitchMarkings();

    // 3b. Draw Active Set-Piece Indicator (Taç / Korner / Aut)
    if (engine.setPiece.active) {
      this.drawSetPieceOverlay();
    }

    // 4. Draw Goal Nets & Posts
    this.drawGoalNets();
    this.drawGoalPosts();

    // 5. Draw Dugout Benches and Corner Flags
    if (isOlympic || isGrand) {
      this.drawGrandStadiumDetails();
    }

    // 6. Draw Entities (Shadows, Players, Ball)
    this.drawBallShadow(engine.ball);
    for (const player of activePlayers) {
      this.drawPlayer(player);
    }
    this.drawBall(engine.ball);

    // 7. Draw Particles
    this.drawParticles(engine.particles);

    // 8. Draw Floodlight Volumetric Cones
    if (isOlympic || isGrand) {
      this.drawStadiumFloodlightGlows();
    }

    // 9. Draw in-world kick guides / hints
    this.drawInWorldHints();

    ctx.restore();
  }

  // ----------------------------------------------------
  // OLİMPİK STAD ARCHITECTURE (TARTAN TRACK & OLYMPIC FLAME)
  // ----------------------------------------------------
  private drawOlympicStadiumArchitecture() {
    const ctx = this.ctx;
    const pitch = this.engine.pitchConfig;
    const margin = this.engine.pitchMargin;
    const pw = pitch.width;
    const ph = pitch.height;
    const centerX = pw / 2;

    // 1. Massive Colosseum / Olympic Outer Hull
    ctx.fillStyle = '#050811';
    ctx.beginPath();
    ctx.roundRect(-95, -85, pw + 190, ph + 170, 60);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 2. Colossal Grandstand Tier 3 & Tier 2 Seating
    ctx.fillStyle = '#0c1322';
    ctx.beginPath();
    ctx.roundRect(-75, -68, pw + 150, ph + 136, 48);
    ctx.fill();

    const rowColors = ['#152033', '#1e293b', '#17253a', '#1e293b'];
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = rowColors[r];
      const inset = 60 - r * 10;
      ctx.fillRect(-inset, -inset, pw + inset * 2, 8);
      ctx.fillRect(-inset, ph + inset - 8, pw + inset * 2, 8);
    }

    // 3. Cheering Olympic Crowd with Flag Silhouettes
    const stepX = 26;
    for (let x = -40; x < pw + 40; x += stepX) {
      const isLeftSide = x < pw * 0.45;
      const isRightSide = x > pw * 0.55;
      const crowdColor = isLeftSide ? '#ef4444' : isRightSide ? '#3b82f6' : '#f8fafc';

      ctx.fillStyle = crowdColor;
      ctx.beginPath();
      ctx.arc(x + 5, -34, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x + 5, ph + 34, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Authentic 8-Lane Tartan Athletic Running Track (Brick-Red / Terracotta)
    const trackOuterInsetX = margin.x - 145;
    const trackOuterInsetY = margin.y - 100;
    const trackW = pw - 2 * trackOuterInsetX;
    const trackH = ph - 2 * trackOuterInsetY;

    // Tartan Track Base Surface
    ctx.fillStyle = '#881337'; // Deep athletic terracotta red
    ctx.beginPath();
    ctx.roundRect(trackOuterInsetX, trackOuterInsetY, trackW, trackH, 65);
    ctx.fill();

    // Track Inner Curb Inset (Lawn transition)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(margin.x - 14, margin.y - 12, pw - 2 * (margin.x - 14), ph - 2 * (margin.y - 12), 26);
    ctx.fill();

    // 8 Concentric Running Lanes
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    const totalTrackLanes = 8;
    const laneWidth = (145 - 14) / totalTrackLanes;

    for (let lane = 0; lane <= totalTrackLanes; lane++) {
      const curInsetX = trackOuterInsetX + lane * laneWidth;
      const curInsetY = trackOuterInsetY + lane * laneWidth * 0.7;
      const curW = pw - 2 * curInsetX;
      const curH = ph - 2 * curInsetY;
      const curRadius = Math.max(15, 65 - lane * 5);

      ctx.beginPath();
      ctx.roundRect(curInsetX, curInsetY, curW, curH, curRadius);
      ctx.stroke();
    }

    // Lane Numbers 1-8 on the bottom finish straightaway
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 11px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let lane = 1; lane <= totalTrackLanes; lane++) {
      const laneY = ph - margin.y + 16 + (lane - 1) * (laneWidth * 0.7) + (laneWidth * 0.35);
      ctx.fillText(`${lane}`, centerX - 180, laneY);
    }

    // 5. Olympic Rings (5 Interlocking Rings) on top grass apron
    this.drawOlympicRings(centerX, margin.y - 48, 14);

    // 6. Olympic Flame Cauldron with flickering fire at top center
    this.drawOlympicCauldron(centerX, -52);

    // 7. Electronic Olympic LED Banner
    ctx.fillStyle = '#020617';
    ctx.fillRect(margin.x - 8, margin.y - 16, pw - 2 * (margin.x - 8), 12);
    ctx.fillRect(margin.x - 8, ph - margin.y + 4, pw - 2 * (margin.x - 8), 12);

    ctx.font = 'bold 9px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const olyAds = ['🏛️ OLİMPİK STAD ARENA 🏛️', 'CITIUS • ALTIUS • FORTIUS', '🌟 FAIR PLAY & RESPECT 🌟', '🏆 GOLD MEDAL MATCH 🏆'];
    const adStep = (pw - 2 * margin.x) / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#ffffff';
      ctx.fillText(olyAds[i], margin.x + adStep * (i + 0.5), margin.y - 10);
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ffffff';
      ctx.fillText(olyAds[3 - i], margin.x + adStep * (i + 0.5), ph - margin.y + 10);
    }
  }

  // Draw 5 Olympic Intertwined Rings
  private drawOlympicRings(cx: number, cy: number, ringR: number) {
    const ctx = this.ctx;
    const ringColors = ['#0284c7', '#0f172a', '#dc2626', '#eab308', '#16a34a']; // Blue, Black, Red, Yellow, Green
    const spacing = ringR * 1.6;

    ctx.save();
    ctx.lineWidth = 3;

    // Top 3 rings: Blue, Black, Red
    const topPositions = [
      { x: cx - spacing, y: cy - ringR * 0.4, color: ringColors[0] },
      { x: cx, y: cy - ringR * 0.4, color: ringColors[1] },
      { x: cx + spacing, y: cy - ringR * 0.4, color: ringColors[2] },
    ];
    for (const r of topPositions) {
      ctx.strokeStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bottom 2 rings: Yellow, Green
    const botPositions = [
      { x: cx - spacing / 2, y: cy + ringR * 0.4, color: ringColors[3] },
      { x: cx + spacing / 2, y: cy + ringR * 0.4, color: ringColors[4] },
    ];
    for (const r of botPositions) {
      ctx.strokeStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw Olympic Cauldron & Animated Golden/Orange Flame
  private drawOlympicCauldron(cx: number, cy: number) {
    const ctx = this.ctx;

    ctx.save();
    const pedestalGrad = ctx.createLinearGradient(cx - 24, cy, cx + 24, cy);
    pedestalGrad.addColorStop(0, '#78350f');
    pedestalGrad.addColorStop(0.5, '#fbbf24');
    pedestalGrad.addColorStop(1, '#92400e');
    ctx.fillStyle = pedestalGrad;

    // Cauldron bowl
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy);
    ctx.lineTo(cx + 22, cy);
    ctx.lineTo(cx + 14, cy + 12);
    ctx.lineTo(cx - 14, cy + 12);
    ctx.closePath();
    ctx.fill();

    // Stand
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 5, cy + 12, 10, 8);
    ctx.fillRect(cx - 12, cy + 18, 24, 4);

    // Warm radial glow radiating down into stadium
    const flameGlow = ctx.createRadialGradient(cx, cy - 8, 4, cx, cy - 8, 90);
    flameGlow.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
    flameGlow.addColorStop(0.5, 'rgba(239, 68, 68, 0.15)');
    flameGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = flameGlow;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 90, 0, Math.PI * 2);
    ctx.fill();

    // Animated flame tongues
    const time = Date.now() / 90;
    const flameH1 = 18 + Math.sin(time) * 4;
    const flameH2 = 22 + Math.cos(time * 1.3) * 5;
    const flameH3 = 16 + Math.sin(time * 1.7) * 4;

    // Inner bright yellow flame
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.quadraticCurveTo(cx - 8, cy - flameH1, cx - 4, cy - flameH1 * 0.9);
    ctx.quadraticCurveTo(cx, cy - flameH2, cx + 4, cy - flameH2 * 0.9);
    ctx.quadraticCurveTo(cx + 8, cy - flameH3, cx + 12, cy);
    ctx.closePath();
    ctx.fill();

    // Outer orange flame fringe
    ctx.fillStyle = 'rgba(249, 115, 22, 0.8)';
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy);
    ctx.quadraticCurveTo(cx - 10, cy - flameH1 * 1.15, cx, cy - flameH2 * 1.25);
    ctx.quadraticCurveTo(cx + 10, cy - flameH3 * 1.15, cx + 15, cy);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ----------------------------------------------------
  // GRAND STADIUM ARCHITECTURE (SEATING, TRIBUNES, LEDS)
  // ----------------------------------------------------
  private drawGrandStadiumArchitecture() {
    const ctx = this.ctx;
    const pitch = this.engine.pitchConfig;
    const pw = pitch.width;
    const ph = pitch.height;

    // Massive Stadium Outer Hull
    ctx.fillStyle = '#080c14';
    ctx.beginPath();
    ctx.roundRect(-70, -65, pw + 140, ph + 130, 48);
    ctx.fill();

    // Stadium Outer Wall Rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Upper Grandstands (Tier 2 Seating)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-45, -42, pw + 90, ph + 84, 34);
    ctx.fill();

    // Lower Grandstands (Tier 1 Seating Rows)
    const rowColors = ['#1e293b', '#1e2433', '#1e293b', '#1e2433'];
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = rowColors[r];
      const inset = 36 - r * 8;
      ctx.fillRect(-inset, -inset, pw + inset * 2, 7);
      ctx.fillRect(-inset, ph + inset - 7, pw + inset * 2, 7);
    }

    // Crowd Silhouettes & Scarf Colors (Red on left, Blue on right)
    const stepX = 24;
    for (let x = -20; x < pw + 20; x += stepX) {
      const isLeftSide = x < pw * 0.45;
      const isRightSide = x > pw * 0.55;
      const crowdColor = isLeftSide ? '#ef4444' : isRightSide ? '#3b82f6' : '#94a3b8';

      // Top row fans
      ctx.fillStyle = crowdColor;
      ctx.beginPath();
      ctx.arc(x + 5, -20, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Bottom row fans
      ctx.beginPath();
      ctx.arc(x + 5, ph + 20, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Professional Running Track / Turf Perimeter
    ctx.fillStyle = '#0a0e17';
    ctx.beginPath();
    ctx.roundRect(-8, -8, pw + 16, ph + 16, 20);
    ctx.fill();

    // Electronic Perimeter LED Ad Boards
    const adHeight = 22;
    const margin = this.engine.pitchMargin;
    const adWidth = pw - 2 * margin.x + 120;
    const adLeft = margin.x - 60;

    // Top & Bottom LED Ribbon
    ctx.fillStyle = '#020408';
    ctx.fillRect(adLeft, margin.y - adHeight - 8, adWidth, adHeight);
    ctx.fillRect(adLeft, ph - margin.y + 8, adWidth, adHeight);

    // Glowing LED Border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(adLeft, margin.y - adHeight - 8, adWidth, adHeight);
    ctx.strokeRect(adLeft, ph - margin.y + 8, adWidth, adHeight);

    // LED Billboard Text
    ctx.font = 'bold 11px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const grandAds = [
      '★ OLYMPIC GRAND STADIUM ★',
      '⚡ 2D FOOTBALL WORLD CUP ⚡',
      '★ RESPECT & FAIR PLAY ★',
      '🔥 ULTRA SUPER SHOT ARENA 🔥',
      '★ RED BULLS VS BLUE STARS ★',
    ];

    const slotWidth = adWidth / 5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ffffff';
      ctx.fillText(grandAds[i], adLeft + slotWidth * (i + 0.5), margin.y - adHeight / 2 - 8);
      ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#e2e8f0';
      ctx.fillText(grandAds[4 - i], adLeft + slotWidth * (i + 0.5), ph - margin.y + adHeight / 2 + 8);
    }
  }

  // ----------------------------------------------------
  // CLASSIC STADIUM SURROUND (COMPACT HAXBALL ARENA)
  // ----------------------------------------------------
  private drawClassicStadiumSurround() {
    const ctx = this.ctx;
    const pw = this.engine.pitchConfig.width;
    const ph = this.engine.pitchConfig.height;
    const margin = this.engine.pitchMargin;

    // Outer running track / stadium border (Clean Haxball Dark)
    ctx.fillStyle = '#090b10';
    ctx.beginPath();
    ctx.roundRect(-20, -20, pw + 40, ph + 40, 24);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Minimalist LED advertising boards
    const adHeight = 16;
    ctx.fillStyle = '#020305';
    ctx.fillRect(margin.x - 40, margin.y - adHeight - 4, pw - 2 * margin.x + 80, adHeight);
    ctx.fillRect(margin.x - 40, ph - margin.y + 4, pw - 2 * margin.x + 80, adHeight);

    // LED Ad board text in high-contrast white
    ctx.font = 'bold 9px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const ads = ['⚽ HAXBALL 2D ARENA ⚽', '★ RED VS BLUE ★', '⚡ FAIR PLAY ⚡', '★ RESPECT ★'];
    const step = (pw - 2 * margin.x) / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#94a3b8';
      ctx.fillText(ads[i], margin.x + step * (i + 0.5), margin.y - adHeight / 2 - 4);
      ctx.fillStyle = i % 2 === 0 ? '#94a3b8' : '#ffffff';
      ctx.fillText(ads[3 - i], margin.x + step * (i + 0.5), ph - margin.y + adHeight / 2 + 4);
    }
  }

  // ----------------------------------------------------
  // PITCH TURF & STRIPES (HAXBALL BLACK & CHARCOAL)
  // ----------------------------------------------------
  private drawPitchGrass() {
    const ctx = this.ctx;
    const pitch = this.engine.pitchConfig;
    const margin = this.engine.pitchMargin;
    const isOlympic = this.engine.settings.stadiumType === 'olympic';
    const isGrand = this.engine.settings.stadiumType === 'grand_stadium';

    const left = margin.x;
    const top = margin.y;
    const width = pitch.width - 2 * margin.x;
    const height = pitch.height - 2 * margin.y;

    // Pitch turf base
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, top, width, height, isOlympic ? 32 : isGrand ? 24 : 18);
    ctx.clip();

    // Haxball style: alternating dark charcoal & black stripes
    const stripeCount = isOlympic ? 22 : isGrand ? 18 : 12;
    const stripeWidth = width / stripeCount;

    const c1 = '#0e1014';
    const c2 = '#161920';

    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? c1 : c2;
      ctx.fillRect(left + i * stripeWidth, top, stripeWidth + 0.5, height);
    }

    // Subtle pitch vignette
    const grad = ctx.createRadialGradient(
      pitch.width / 2,
      pitch.height / 2,
      isOlympic ? 220 : isGrand ? 160 : 90,
      pitch.width / 2,
      pitch.height / 2,
      width * 0.72
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(left, top, width, height);

    ctx.restore();
  }

  // ----------------------------------------------------
  // PITCH MARKINGS (SCALED FOR EACH STADIUM)
  // ----------------------------------------------------
  private drawPitchMarkings() {
    const ctx = this.ctx;
    const pitch = this.engine.pitchConfig;
    const margin = this.engine.pitchMargin;
    const isOlympic = this.engine.settings.stadiumType === 'olympic';
    const isGrand = this.engine.settings.stadiumType === 'grand_stadium';

    const left = margin.x;
    const top = margin.y;
    const width = pitch.width - 2 * margin.x;
    const height = pitch.height - 2 * margin.y;
    const centerX = pitch.width / 2;
    const centerY = pitch.height / 2;

    // Crisp high-contrast pure white markings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = pitch.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer boundary line
    ctx.beginPath();
    ctx.roundRect(left, top, width, height, isOlympic ? 32 : isGrand ? 24 : 18);
    ctx.stroke();

    // Center halfway line
    ctx.beginPath();
    ctx.moveTo(centerX, top);
    ctx.lineTo(centerX, top + height);
    ctx.stroke();

    // Center circle
    const centerRadius = isOlympic ? 160 : isGrand ? 125 : 80;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Center kick-off spot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, isOlympic ? 7.5 : isGrand ? 6.5 : 5, 0, Math.PI * 2);
    ctx.fill();

    // Corner arcs
    const cornerR = isOlympic ? 36 : isGrand ? 30 : 20;
    // Top-left
    ctx.beginPath();
    ctx.arc(left, top, cornerR, 0, Math.PI / 2);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.arc(left, top + height, cornerR, -Math.PI / 2, 0);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.arc(left + width, top, cornerR, Math.PI / 2, Math.PI);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.arc(left + width, top + height, cornerR, Math.PI, -Math.PI / 2);
    ctx.stroke();

    // Penalty Boxes (18-yard box)
    const penBoxW = isOlympic ? 310 : isGrand ? 240 : 140;
    const penBoxH = isOlympic ? 540 : isGrand ? 420 : 240;
    const penBoxTop = centerY - penBoxH / 2;

    ctx.strokeRect(left, penBoxTop, penBoxW, penBoxH);
    ctx.strokeRect(left + width - penBoxW, penBoxTop, penBoxW, penBoxH);

    // Goal area (6-yard box)
    const goalAreaW = isOlympic ? 115 : isGrand ? 95 : 55;
    const goalAreaH = isOlympic ? 280 : isGrand ? 220 : 140;
    const goalAreaTop = centerY - goalAreaH / 2;

    ctx.strokeRect(left, goalAreaTop, goalAreaW, goalAreaH);
    ctx.strokeRect(left + width - goalAreaW, goalAreaTop, goalAreaW, goalAreaH);

    // Penalty spots
    const penSpotDist = isOlympic ? 200 : isGrand ? 160 : 95;
    ctx.beginPath();
    ctx.arc(left + penSpotDist, centerY, isOlympic ? 6.5 : isGrand ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(left + width - penSpotDist, centerY, isOlympic ? 6.5 : isGrand ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();

    // Penalty box D-arcs
    const dArcRadius = isOlympic ? 100 : isGrand ? 80 : 50;
    ctx.beginPath();
    ctx.arc(left + penSpotDist, centerY, dArcRadius, -0.68, 0.68);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(left + width - penSpotDist, centerY, dArcRadius, Math.PI - 0.68, Math.PI + 0.68);
    ctx.stroke();

    // Technical Areas (Coach Dugout Box) along the top touchline
    if (isGrand) {
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      const techBoxW = 180;
      const techBoxH = 26;
      // Red team coach box
      ctx.strokeRect(centerX - techBoxW - 40, top - techBoxH - 6, techBoxW, techBoxH);
      // Blue team coach box
      ctx.strokeRect(centerX + 40, top - techBoxH - 6, techBoxW, techBoxH);
      ctx.setLineDash([]); // Reset line dash
    }
  }

  private drawSetPieceOverlay() {
    const ctx = this.ctx;
    const sp = this.engine.setPiece;
    if (!sp.active) return;

    const homeClubId = this.engine.settings.homeClub || 'liverpool';
    const awayClubId = this.engine.settings.awayClub || 'ipswich';
    const takingClub = CLUBS[sp.team === 'red' ? homeClubId : awayClubId] || CLUBS.liverpool;
    const pulse = (Math.sin(Date.now() / 160) + 1) * 0.5;

    ctx.save();

    // Soft barrier zone fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.beginPath();
    ctx.arc(sp.spotX, sp.spotY, sp.barrierRadius, 0, Math.PI * 2);
    ctx.fill();

    // Dashed opposition exclusion ring
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 + pulse * 0.14})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(sp.spotX, sp.spotY, sp.barrierRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pulsing ball spot ring in taking club's color
    const ballR = this.engine.ball.radius;
    ctx.strokeStyle = takingClub.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sp.spotX, sp.spotY, ballR + 8 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle white inner ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sp.spotX, sp.spotY, ballR + 4, 0, Math.PI * 2);
    ctx.stroke();

    // Set piece type micro-label directly above/below spot
    const label = sp.type === 'throw_in' ? 'TAÇ' : sp.type === 'corner' ? 'KORNER' : 'AUT';
    const pitch = this.engine.pitchConfig;
    const labelOffsetY = sp.spotY < pitch.height / 2 ? ballR + 26 : -(ballR + 26);
    ctx.font = 'bold 10px "Geist Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`${label} · ${takingClub.code}`, sp.spotX, sp.spotY + labelOffsetY);

    ctx.restore();
  }

  // ----------------------------------------------------
  // GRAND STADIUM DETAILS (DUGOUTS & CORNER FLAGS)
  // ----------------------------------------------------
  private drawGrandStadiumDetails() {
    const ctx = this.ctx;
    const pitch = this.engine.pitchConfig;
    const margin = this.engine.pitchMargin;
    const centerX = pitch.width / 2;
    const top = margin.y;

    // Dugout Benches (Yedek Kulübeleri)
    const dugoutW = 120;
    const dugoutH = 18;

    // Red Dugout (Left)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(centerX - dugoutW - 70, top - 38, dugoutW, dugoutH, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔴 KIRMIZI KULÜBE', centerX - dugoutW / 2 - 70, top - 28);

    // Blue Dugout (Right)
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(centerX + 70, top - 38, dugoutW, dugoutH, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔵 MAVİ KULÜBE', centerX + dugoutW / 2 + 70, top - 28);

    // Corner Flags with subtle flutter animation
    const corners = [
      { x: margin.x, y: margin.y, side: 'red' },
      { x: margin.x, y: pitch.height - margin.y, side: 'red' },
      { x: pitch.width - margin.x, y: margin.y, side: 'blue' },
      { x: pitch.width - margin.x, y: pitch.height - margin.y, side: 'blue' },
    ];

    const flutter = Math.sin(Date.now() / 200) * 3;
    corners.forEach((c) => {
      // Flag pole
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x, c.y - 18);
      ctx.stroke();

      // Flag cloth triangle
      ctx.fillStyle = c.side === 'red' ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 18);
      ctx.lineTo(c.x + (c.side === 'red' ? 12 + flutter : -12 - flutter), c.y - 13);
      ctx.lineTo(c.x, c.y - 8);
      ctx.closePath();
      ctx.fill();
    });
  }

  // ----------------------------------------------------
  // GOAL NETS
  // ----------------------------------------------------
  private drawGoalNets() {
    const pitch = this.engine.pitchConfig;
    const margin = this.engine.pitchMargin;
    const pitchLeft = margin.x;
    const pitchRight = pitch.width - margin.x;
    const centerY = pitch.height / 2;
    const goalHalf = pitch.goalWidth / 2;
    const goalTop = centerY - goalHalf;
    const depth = pitch.goalDepth;

    // Draw Left Net
    this.renderSingleGoalNet(pitchLeft - depth, goalTop, depth, pitch.goalWidth, 'left');

    // Draw Right Net
    this.renderSingleGoalNet(pitchRight, goalTop, depth, pitch.goalWidth, 'right');
  }

  private renderSingleGoalNet(x: number, y: number, w: number, h: number, side: 'left' | 'right') {
    const ctx = this.ctx;
    const isGrand = this.engine.settings.stadiumType === 'grand_stadium';

    // Net interior dark ground
    ctx.fillStyle = isGrand ? 'rgba(8, 18, 12, 0.92)' : 'rgba(10, 25, 15, 0.85)';
    ctx.fillRect(x, y, w, h);

    // Mesh lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    // Horizontal grid
    const hSteps = isGrand ? 12 : 9;
    for (let i = 0; i <= hSteps; i++) {
      const lineY = y + (h / hSteps) * i;
      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + w, lineY);
      ctx.stroke();
    }

    // Vertical grid
    const vSteps = isGrand ? 7 : 5;
    for (let i = 0; i <= vSteps; i++) {
      const lineX = x + (w / vSteps) * i;
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(lineX, y + h);
      ctx.stroke();
    }

    // Net outer boundary pipe frame
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = isGrand ? 4 : 3;
    ctx.strokeRect(x, y, w, h);
  }

  // ----------------------------------------------------
  // GOAL POSTS
  // ----------------------------------------------------
  private drawGoalPosts() {
    const ctx = this.ctx;
    const pitch = this.engine.pitchConfig;
    const margin = this.engine.pitchMargin;
    const pitchLeft = margin.x;
    const pitchRight = pitch.width - margin.x;
    const centerY = pitch.height / 2;
    const goalHalf = pitch.goalWidth / 2;
    const goalTop = centerY - goalHalf;
    const goalBottom = centerY + goalHalf;
    const r = pitch.postRadius;

    const posts = [
      { x: pitchLeft, y: goalTop },
      { x: pitchLeft, y: goalBottom },
      { x: pitchRight, y: goalTop },
      { x: pitchRight, y: goalBottom },
    ];

    posts.forEach((post) => {
      // Post shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(post.x + 3, post.y + 4, r, 0, Math.PI * 2);
      ctx.fill();

      // Shiny metallic post gradient
      const grad = ctx.createRadialGradient(post.x - 3, post.y - 3, 1, post.x, post.y, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#e2e8f0');
      grad.addColorStop(1, '#64748b');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(post.x, post.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // ----------------------------------------------------
  // FLOODLIGHT VOLUMETRIC GLOWS (GRAND STADIUM ONLY)
  // ----------------------------------------------------
  private drawStadiumFloodlightGlows() {
    const ctx = this.ctx;
    const pitch = this.engine.pitchConfig;
    const pw = pitch.width;
    const ph = pitch.height;

    const floodlights = [
      { x: -30, y: -25, angle: Math.PI / 4 },
      { x: pw + 30, y: -25, angle: (3 * Math.PI) / 4 },
      { x: -30, y: ph + 25, angle: -Math.PI / 4 },
      { x: pw + 30, y: ph + 25, angle: -(3 * Math.PI) / 4 },
    ];

    for (const light of floodlights) {
      // Tower base
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(light.x, light.y, 11, 0, Math.PI * 2);
      ctx.fill();

      // Tower light cluster lamps
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(light.x, light.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Subtle atmospheric light beam onto field
      const lightGrad = ctx.createRadialGradient(light.x, light.y, 10, light.x, light.y, 380);
      lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      lightGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.03)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 380, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ----------------------------------------------------
  // ENTITY RENDERING (PLAYERS & BALL)
  // ----------------------------------------------------
  private drawBallShadow(ball: Ball) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(ball.x + 3, ball.y + 5, ball.radius * 1.05, ball.radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBall(ball: Ball) {
    const ctx = this.ctx;
    const r = ball.radius;

    // Draw speed trail if exists
    for (const trail of ball.speedTrail) {
      if (trail.isSuper) {
        // Blazing fiery super shot trail
        ctx.fillStyle = `rgba(245, 158, 11, ${trail.alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, r * 1.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(239, 68, 68, ${trail.alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, r * 0.95, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${trail.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    // Super Shot flaming aura around ball
    if (ball.isSuperShot) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ball 3D sphere gradient
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    if (ball.isSuperShot) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#fed7aa');
      grad.addColorStop(1, '#f97316');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#f1f5f9');
      grad.addColorStop(1, '#94a3b8');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Classic football patches
    ctx.fillStyle = ball.isSuperShot ? '#7c2d12' : '#0f172a';
    ctx.beginPath();
    const pentagonR = r * 0.38;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * pentagonR;
      const py = Math.sin(angle) * pentagonR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Black outer pentagon patches at edges
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const spokeX = Math.cos(angle) * (r * 0.85);
      const spokeY = Math.sin(angle) * (r * 0.85);
      ctx.beginPath();
      ctx.arc(spokeX, spokeY, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer seam outline
    ctx.strokeStyle = ball.isSuperShot ? '#ea580c' : '#334155';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  private drawPlayer(player: Player) {
    const ctx = this.ctx;
    const r = player.radius;

    // Player ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x + 2, player.y + 4, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Super shot charging aura
    if (player.isSuperShot) {
      ctx.save();
      const pulse = Math.sin(Date.now() / 80) * 4;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r + 6 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r + 11 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Determine active club for this player
    const homeClubId = this.engine.settings.homeClub || 'liverpool';
    const awayClubId = this.engine.settings.awayClub || 'ipswich';
    const activeClubId: ClubId = player.id === 'red' ? homeClubId : awayClubId;
    const activeClub = CLUBS[activeClubId] || CLUBS.liverpool;
    const charImg = this.clubCharacterImages[activeClubId];
    const hasLoadedSprite = !!(charImg && charImg.complete && charImg.naturalWidth > 0);

    if (hasLoadedSprite && charImg) {
      // Clip cleanly to circular player disc & render custom club character artwork
      ctx.save();
      ctx.beginPath();
      ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Slight overscan (2.05x radius) trims outer square corners/checkerboard cleanly
      const drawSize = r * 2.05;
      ctx.drawImage(
        charImg,
        player.x - drawSize / 2,
        player.y - drawSize / 2,
        drawSize,
        drawSize
      );
      ctx.restore();

      // Subtle rim highlight & kick flash border
      ctx.strokeStyle = player.isKicking ? '#fef08a' : 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = player.isKicking ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Fallback 3D Disc Gradient while image loads
      const grad = ctx.createRadialGradient(player.x - r * 0.35, player.y - r * 0.35, r * 0.1, player.x, player.y, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, player.color);
      grad.addColorStop(1, player.accentColor);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = player.isKicking ? '#fef08a' : '#ffffff';
      ctx.lineWidth = player.isKicking ? 3.5 : 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${r > 26 ? 15 : 13}px "Geist", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${player.number}`, player.x, player.y - 1.5);

      ctx.fillStyle = activeClub.secondaryColor || '#ffffff';
      ctx.font = `bold ${r > 26 ? 8.5 : 7.5}px "Geist Mono", monospace`;
      ctx.fillText(activeClub.code, player.x, player.y + (r > 26 ? 10.5 : 9));
    }

    // Kick visual ring feedback
    if (player.kickCooldown > 0) {
      const progress = player.kickCooldown / 0.22;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r + 3, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }

    // Movement direction indicator pip
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 30) {
      const angle = Math.atan2(player.vy, player.vx);
      const pipX = player.x + Math.cos(angle) * (r - 2);
      const pipY = player.y + Math.sin(angle) * (r - 2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pipX, pipY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx;
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'confetti') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 6);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawInWorldHints() {
    const ctx = this.ctx;
    const engine = this.engine;
    const margin = engine.pitchMargin;

    // REPLAY MODE TV BROADCAST WATERMARK
    if (engine.gameState === 'replay') {
      ctx.save();
      const badgeX = margin.x + 20;
      const badgeY = margin.y + 20;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, 190, 34, 10);
      ctx.fill();

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Blinking Red Recording Dot
      const blink = Math.floor(Date.now() / 400) % 2 === 0;
      ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(badgeX + 18, badgeY + 17, 6, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Chakra Petch", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('GOL TEKRARI', badgeX + 32, badgeY + 17);

      ctx.font = 'bold 10px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('SLOW-MO', badgeX + 126, badgeY + 17);

      ctx.restore();
      return;
    }

    if (engine.gameState !== 'playing' && engine.gameState !== 'countdown') return;

    // Subtly label player controls near their starting areas during countdown or play
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Red tag
    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    const redLabel = engine.playerRed.isAi ? 'BOT (AI)' : 'WASD + BOŞLUK (3x SÜPER)';
    ctx.fillText(redLabel, engine.playerRed.x, engine.playerRed.y + engine.playerRed.radius + 18);

    // Blue tag
    ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
    const blueLabel = engine.playerBlue.isAi ? 'BOT (AI)' : 'YÖNLER + P (3x SÜPER)';
    ctx.fillText(blueLabel, engine.playerBlue.x, engine.playerBlue.y + engine.playerBlue.radius + 18);
  }
}
