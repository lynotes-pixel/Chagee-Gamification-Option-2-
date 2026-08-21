import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsBall, ScorePopup, BallColor } from '../types';
import { BALL_TYPES } from '../utils/constants';
import { soundManager } from '../utils/audio';

interface MazeGameCanvasProps {
  isPlaying: boolean;
  onBallEscaped: (ballType: BallColor, points: number, totalEscaped: number) => void;
  onGameComplete?: () => void;
  soundEnabled: boolean;
}

interface WallArc {
  r: number;
  startAngle: number;
  endAngle: number;
  thickness: number;
}

interface WallSpoke {
  r1: number;
  r2: number;
  angle: number;
  thickness: number;
}

export const MazeGameCanvas: React.FC<MazeGameCanvasProps> = ({
  isPlaying,
  onBallEscaped,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Rotation state (in radians)
  const angleRef = useRef<number>(0);
  const angularVelocityRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerAngleRef = useRef<number>(0);
  const dragCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Physics state
  const ballsRef = useRef<PhysicsBall[]>([]);
  const escapedCountRef = useRef<number>(0);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastClinkTimeRef = useRef<number>(0);

  // Rotation button press states for continuous rotation
  const rotateLeftPressed = useRef<boolean>(false);
  const rotateRightPressed = useRef<boolean>(false);

  // Dimensions
  const [canvasSize, setCanvasSize] = useState<number>(440);

  // Maze wall geometry (proportional to maze outer radius R = 1.0)
  const getMazeGeometry = useCallback(() => {
    const arcs: WallArc[] = [
      // Central jar (r = 0.26): opening at top between -2.3 and -0.85 (-131° to -48°)
      { r: 0.26, startAngle: -0.85, endAngle: Math.PI * 2 - 2.3, thickness: 0.038 },

      // Ring 1 (r = 0.48): segmented with openings
      { r: 0.48, startAngle: 0.3, endAngle: Math.PI * 0.75, thickness: 0.035 },
      { r: 0.48, startAngle: Math.PI * 0.95, endAngle: Math.PI * 1.45, thickness: 0.035 },
      { r: 0.48, startAngle: Math.PI * 1.65, endAngle: Math.PI * 1.95, thickness: 0.035 },

      // Ring 2 (r = 0.72): complex passages
      { r: 0.72, startAngle: -0.4, endAngle: Math.PI * 0.35, thickness: 0.038 },
      { r: 0.72, startAngle: Math.PI * 0.55, endAngle: Math.PI * 1.15, thickness: 0.038 },
      { r: 0.72, startAngle: Math.PI * 1.35, endAngle: Math.PI * 1.75, thickness: 0.038 },

      // Outer rim (r = 0.94): top exit chute opening at -PI/2 (between -1.8 and -1.34)
      { r: 0.94, startAngle: -1.25, endAngle: Math.PI * 2 - 1.9, thickness: 0.045 },
    ];

    const spokes: WallSpoke[] = [
      // Jar neck guide spokes
      { r1: 0.26, r2: 0.46, angle: -2.3, thickness: 0.035 },
      { r1: 0.26, r2: 0.46, angle: -0.85, thickness: 0.035 },

      // Radial baffles Ring 1 -> Ring 2
      { r1: 0.48, r2: 0.72, angle: Math.PI * 0.35, thickness: 0.035 },
      { r1: 0.48, r2: 0.72, angle: Math.PI * 0.95, thickness: 0.035 },
      { r1: 0.48, r2: 0.72, angle: Math.PI * 1.65, thickness: 0.035 },

      // Radial baffles Ring 2 -> Outer
      { r1: 0.72, r2: 0.94, angle: 0.35, thickness: 0.038 },
      { r1: 0.72, r2: 0.94, angle: Math.PI * 0.55, thickness: 0.038 },
      { r1: 0.72, r2: 0.94, angle: Math.PI * 1.15, thickness: 0.038 },
      { r1: 0.72, r2: 0.94, angle: -1.9, thickness: 0.038 },
      { r1: 0.72, r2: 0.94, angle: -1.25, thickness: 0.038 },
    ];

    return { arcs, spokes };
  }, []);

  // Initialize balls
  const initBalls = useCallback(() => {
    const newBalls: PhysicsBall[] = [];
    let idCounter = 1;

    Object.values(BALL_TYPES).forEach((typeConfig) => {
      for (let i = 0; i < typeConfig.count; i++) {
        const rad = Math.random() * 0.15;
        const ang = Math.random() * Math.PI * 2;
        newBalls.push({
          id: idCounter++,
          x: Math.cos(ang) * rad,
          y: Math.sin(ang) * rad + 0.05,
          vx: (Math.random() - 0.5) * 0.002,
          vy: (Math.random() - 0.5) * 0.002,
          radius: 0.024,
          colorType: typeConfig.id,
          points: typeConfig.points,
          escaped: false,
          alpha: 1.0,
        });
      }
    });

    ballsRef.current = newBalls;
    escapedCountRef.current = 0;
    scorePopupsRef.current = [];
    angleRef.current = 0;
    angularVelocityRef.current = 0;
  }, []);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const size = Math.min(Math.max(width - 16, 280), 480);
        setCanvasSize(size);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset/Init on game start or mount
  useEffect(() => {
    initBalls();
  }, [initBalls, isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        rotateLeftPressed.current = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rotateRightPressed.current = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        rotateLeftPressed.current = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rotateRightPressed.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pointer drag handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    dragCenterRef.current = { x: cx, y: cy };

    const dx = clientX - cx;
    const dy = clientY - cy;
    lastPointerAngleRef.current = Math.atan2(dy, dx);
    isDraggingRef.current = true;
    angularVelocityRef.current = 0;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const { x: cx, y: cy } = dragCenterRef.current;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const currentAngle = Math.atan2(dy, dx);

    let deltaAngle = currentAngle - lastPointerAngleRef.current;
    if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
    if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

    angleRef.current += deltaAngle;
    angularVelocityRef.current = deltaAngle * 0.8;
    lastPointerAngleRef.current = currentAngle;

    if (Math.abs(deltaAngle) > 0.02) {
      soundManager.playRotate();
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Main Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { arcs, spokes } = getMazeGeometry();

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasSize * dpr;
      canvas.height = canvasSize * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      const width = canvasSize;
      const height = canvasSize;
      const cx = width / 2;
      const cy = height / 2;
      const mazeR = (Math.min(width, height) / 2) * 0.9;

      // 1. Process rotation button inputs
      if (rotateLeftPressed.current) {
        angularVelocityRef.current = -0.055;
        soundManager.playRotate();
      } else if (rotateRightPressed.current) {
        angularVelocityRef.current = 0.055;
        soundManager.playRotate();
      } else if (!isDraggingRef.current) {
        angleRef.current += angularVelocityRef.current;
        angularVelocityRef.current *= 0.92;
        if (Math.abs(angularVelocityRef.current) < 0.0001) {
          angularVelocityRef.current = 0;
        }
      }

      const mazeAngle = angleRef.current;

      // 2. Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Radial ambient glow behind maze
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, mazeR * 1.15);
      bgGrad.addColorStop(0, 'rgba(0, 43, 84, 0.6)');
      bgGrad.addColorStop(0.6, 'rgba(0, 27, 58, 0.4)');
      bgGrad.addColorStop(1, 'rgba(0, 19, 43, 0)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, mazeR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Outer glow boundary ring
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, mazeR * 1.05, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Update Ball Physics
      const balls = ballsRef.current;
      const gravityMag = isPlaying ? 0.00085 : 0.0004;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];

        if (b.escaped) {
          b.vy += 0.0015;
          b.y += b.vy;
          b.x += b.vx;
          b.alpha = Math.max(0, b.alpha - 0.02);
          continue;
        }

        b.vy += gravityMag;

        // Maze rotational centripetal push
        const dTheta = angularVelocityRef.current;
        if (Math.abs(dTheta) > 0.001) {
          const rFromCenter = Math.sqrt(b.x * b.x + b.y * b.y);
          if (rFromCenter > 0.05) {
            const tangentX = -b.y / rFromCenter;
            const tangentY = b.x / rFromCenter;
            b.vx += tangentX * dTheta * 0.15;
            b.vy += tangentY * dTheta * 0.15;
          }
        }

        b.x += b.vx;
        b.y += b.vy;

        b.vx *= 0.985;
        b.vy *= 0.985;

        // Local Maze Space transformation
        const cosA = Math.cos(-mazeAngle);
        const sinA = Math.sin(-mazeAngle);
        const lx = b.x * cosA - b.y * sinA;
        const ly = b.x * sinA + b.y * cosA;
        const lr = Math.sqrt(lx * lx + ly * ly);
        let lAngle = Math.atan2(ly, lx);
        if (lAngle < 0) lAngle += Math.PI * 2;

        // Collision with arcs
        for (const arc of arcs) {
          const rWall = arc.r;
          const halfThick = arc.thickness / 2;
          const distToWall = Math.abs(lr - rWall);

          if (distToWall < b.radius + halfThick) {
            let inSpan = false;
            let a1 = arc.startAngle;
            let a2 = arc.endAngle;

            while (a1 < 0) a1 += Math.PI * 2;
            while (a2 < 0) a2 += Math.PI * 2;

            if (a1 < a2) {
              inSpan = lAngle >= a1 && lAngle <= a2;
            } else {
              inSpan = lAngle >= a1 || lAngle <= a2;
            }

            if (inSpan) {
              const pushDir = lr > rWall ? 1 : -1;
              const targetR = rWall + pushDir * (halfThick + b.radius + 0.001);
              const ratio = targetR / (lr || 0.0001);

              const newLx = lx * ratio;
              const newLy = ly * ratio;

              const cosW = Math.cos(mazeAngle);
              const sinW = Math.sin(mazeAngle);
              b.x = newLx * cosW - newLy * sinW;
              b.y = newLx * sinW + newLy * cosW;

              const nx = Math.cos(lAngle + mazeAngle) * pushDir;
              const ny = Math.sin(lAngle + mazeAngle) * pushDir;
              const dot = b.vx * nx + b.vy * ny;
              if (dot < 0) {
                b.vx = (b.vx - 1.4 * dot * nx) * 0.65;
                b.vy = (b.vy - 1.4 * dot * ny) * 0.65;

                const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                if (speed > 0.003 && Date.now() - lastClinkTimeRef.current > 40) {
                  soundManager.playClink(Math.min(1, speed * 100));
                  lastClinkTimeRef.current = Date.now();
                }
              }
            }
          }
        }

        // Collision with spokes
        for (const spoke of spokes) {
          if (lr >= spoke.r1 - b.radius && lr <= spoke.r2 + b.radius) {
            let spokeAngle = spoke.angle;
            while (spokeAngle < 0) spokeAngle += Math.PI * 2;
            while (spokeAngle >= Math.PI * 2) spokeAngle -= Math.PI * 2;

            let angleDiff = lAngle - spokeAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            const arcDist = Math.abs(angleDiff) * lr;
            const halfThick = spoke.thickness / 2;

            if (arcDist < b.radius + halfThick) {
              const pushSign = angleDiff >= 0 ? 1 : -1;
              const targetAngle = spokeAngle + (pushSign * (halfThick + b.radius + 0.001)) / lr;

              const newLx = Math.cos(targetAngle) * lr;
              const newLy = Math.sin(targetAngle) * lr;

              const cosW = Math.cos(mazeAngle);
              const sinW = Math.sin(mazeAngle);
              b.x = newLx * cosW - newLy * sinW;
              b.y = newLx * sinW + newLy * cosW;

              const spokeNormAngle = spokeAngle + mazeAngle + (pushSign > 0 ? -Math.PI / 2 : Math.PI / 2);
              const nx = Math.cos(spokeNormAngle);
              const ny = Math.sin(spokeNormAngle);
              const dot = b.vx * nx + b.vy * ny;
              if (dot < 0) {
                b.vx = (b.vx - 1.4 * dot * nx) * 0.65;
                b.vy = (b.vy - 1.4 * dot * ny) * 0.65;
              }
            }
          }
        }

        // Escape check (r > 0.94)
        if (lr > 0.94) {
          b.escaped = true;
          b.escapeTime = Date.now();
          b.vx = (Math.random() - 0.5) * 0.004;
          b.vy = 0.004 + Math.random() * 0.003;

          escapedCountRef.current += 1;
          onBallEscaped(b.colorType, b.points, escapedCountRef.current);
          soundManager.playBallEscape(b.points);

          const screenX = cx + b.x * mazeR;
          const screenY = cy + b.y * mazeR;
          const conf = BALL_TYPES[b.colorType];

          scorePopupsRef.current.push({
            id: Math.random().toString(),
            x: screenX,
            y: screenY,
            points: b.points,
            color: conf.color,
            text: `+${b.points}`,
            opacity: 1.0,
            createdAt: Date.now(),
          });
        }
      }

      // Ball-to-ball repulsion
      for (let i = 0; i < balls.length; i++) {
        const b1 = balls[i];
        if (b1.escaped) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b2 = balls[j];
          if (b2.escaped) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = b1.radius + b2.radius;

          if (dist < minDist && dist > 0.0001) {
            const overlap = (minDist - dist) * 0.5;
            const nx = dx / dist;
            const ny = dy / dist;

            b1.x -= nx * overlap;
            b1.y -= ny * overlap;
            b2.x += nx * overlap;
            b2.y += ny * overlap;

            const relVx = b2.vx - b1.vx;
            const relVy = b2.vy - b1.vy;
            const sepVel = relVx * nx + relVy * ny;
            if (sepVel < 0) {
              const impulse = sepVel * 0.4;
              b1.vx += impulse * nx;
              b1.vy += impulse * ny;
              b2.vx -= impulse * nx;
              b2.vy -= impulse * ny;
            }
          }
        }
      }

      // 4. DRAW 3D GOLDEN MAZE
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mazeAngle);

      const drawMazeGeometry = (offsetX: number, offsetY: number, isShadow: boolean, isHighlight: boolean) => {
        for (const arc of arcs) {
          ctx.beginPath();
          ctx.arc(offsetX, offsetY, arc.r * mazeR, arc.startAngle, arc.endAngle);
          ctx.lineWidth = arc.thickness * mazeR;
          ctx.lineCap = 'round';
          if (isShadow) {
            ctx.strokeStyle = 'rgba(0, 10, 24, 0.6)';
          } else if (isHighlight) {
            ctx.strokeStyle = '#FBF2C0';
          } else {
            const goldGrad = ctx.createLinearGradient(-mazeR, -mazeR, mazeR, mazeR);
            goldGrad.addColorStop(0, '#FFE885');
            goldGrad.addColorStop(0.3, '#D4AF37');
            goldGrad.addColorStop(0.7, '#AA820A');
            goldGrad.addColorStop(1, '#FFE066');
            ctx.strokeStyle = goldGrad;
          }
          ctx.stroke();
        }

        for (const spoke of spokes) {
          const cos = Math.cos(spoke.angle);
          const sin = Math.sin(spoke.angle);
          const x1 = cos * (spoke.r1 * mazeR) + offsetX;
          const y1 = sin * (spoke.r1 * mazeR) + offsetY;
          const x2 = cos * (spoke.r2 * mazeR) + offsetX;
          const y2 = sin * (spoke.r2 * mazeR) + offsetY;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = spoke.thickness * mazeR;
          ctx.lineCap = 'round';
          if (isShadow) {
            ctx.strokeStyle = 'rgba(0, 10, 24, 0.6)';
          } else if (isHighlight) {
            ctx.strokeStyle = '#FBF2C0';
          } else {
            const goldGrad = ctx.createLinearGradient(x1, y1, x2, y2);
            goldGrad.addColorStop(0, '#FFE885');
            goldGrad.addColorStop(0.5, '#D4AF37');
            goldGrad.addColorStop(1, '#997A15');
            ctx.strokeStyle = goldGrad;
          }
          ctx.stroke();
        }
      };

      // 4a. Shadow
      drawMazeGeometry(3, 4, true, false);

      // 4b. Gold Wall
      drawMazeGeometry(0, 0, false, false);

      // 4c. Highlight
      ctx.shadowColor = 'rgba(255, 235, 150, 0.4)';
      ctx.shadowBlur = 4;
      drawMazeGeometry(-0.8, -0.8, false, true);
      ctx.shadowBlur = 0;

      // Draw Center Flask Glass
      ctx.beginPath();
      ctx.arc(0, 0, 0.26 * mazeR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 43, 84, 0.35)';
      ctx.fill();

      // Top Exit Arrow Marker
      const exitAngle = -Math.PI / 2;
      const exitR = 0.98 * mazeR;
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(
        Math.cos(exitAngle) * exitR,
        Math.sin(exitAngle) * exitR,
        8,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();

      // 5. DRAW BALLS
      for (const b of balls) {
        if (b.alpha <= 0) continue;

        const bx = cx + b.x * mazeR;
        const by = cy + b.y * mazeR;
        const bRad = b.radius * mazeR;
        const typeConf = BALL_TYPES[b.colorType];

        ctx.save();
        ctx.globalAlpha = b.alpha;

        // Shadow
        ctx.beginPath();
        ctx.arc(bx + 1.5, by + 2, bRad, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 10, 20, 0.45)';
        ctx.fill();

        // 3D Spherical gradient
        const sphereGrad = ctx.createRadialGradient(
          bx - bRad * 0.35,
          by - bRad * 0.35,
          bRad * 0.1,
          bx,
          by,
          bRad
        );
        sphereGrad.addColorStop(0, typeConf.highlightColor);
        sphereGrad.addColorStop(0.45, typeConf.color);
        sphereGrad.addColorStop(1, typeConf.shadowColor);

        ctx.beginPath();
        ctx.arc(bx, by, bRad, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        // Specular gleam
        ctx.beginPath();
        ctx.arc(bx - bRad * 0.3, by - bRad * 0.3, bRad * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fill();

        if (b.colorType === 'gold') {
          ctx.beginPath();
          ctx.arc(bx, by, bRad * 1.3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 220, 100, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.restore();
      }

      // 6. DRAW FLOATING SCORE POPUPS
      const now = Date.now();
      scorePopupsRef.current = scorePopupsRef.current.filter((pop) => {
        const elapsed = now - pop.createdAt;
        if (elapsed > 1200) return false;

        const progress = elapsed / 1200;
        const currentY = pop.y - progress * 40;
        const opacity = Math.max(0, 1 - progress);

        ctx.save();
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = pop.color;
        ctx.globalAlpha = opacity;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(pop.text, pop.x - 12, currentY);
        ctx.restore();

        return true;
      });

      // 7. Loop
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasSize, getMazeGeometry, isPlaying, onBallEscaped]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center select-none touch-none"
    >
      {/* Maze Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize, height: canvasSize }}
        className="cursor-grab active:cursor-grabbing rounded-full transition-shadow duration-300"
        onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={handlePointerUp}
      />

      {/* Interactive Controls Overlay at Bottom */}
      <div className="mt-2 flex items-center space-x-5 z-10">
        <button
          id="btn-rotate-left"
          onMouseDown={() => {
            rotateLeftPressed.current = true;
            soundManager.playRotate();
          }}
          onMouseUp={() => (rotateLeftPressed.current = false)}
          onMouseLeave={() => (rotateLeftPressed.current = false)}
          onTouchStart={() => {
            rotateLeftPressed.current = true;
            soundManager.playRotate();
          }}
          onTouchEnd={() => (rotateLeftPressed.current = false)}
          className="w-13 h-13 rounded-full border-2 border-[#D4AF37] flex items-center justify-center bg-[#001B3A] text-[#D4AF37] shadow-lg shadow-black/40 hover:bg-[#D4AF37] hover:text-[#001B3A] active:scale-95 transition-all duration-150 cursor-pointer"
          title="Rotate Left (or press Left Arrow / A)"
        >
          <span className="text-2xl font-bold">↺</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[11px] text-[#D4AF37] font-semibold tracking-wider uppercase">
            Drag to Rotate
          </span>
          <span className="text-[10px] text-white/50">or use Arrow Keys</span>
        </div>

        <button
          id="btn-rotate-right"
          onMouseDown={() => {
            rotateRightPressed.current = true;
            soundManager.playRotate();
          }}
          onMouseUp={() => (rotateRightPressed.current = false)}
          onMouseLeave={() => (rotateRightPressed.current = false)}
          onTouchStart={() => {
            rotateRightPressed.current = true;
            soundManager.playRotate();
          }}
          onTouchEnd={() => (rotateRightPressed.current = false)}
          className="w-13 h-13 rounded-full border-2 border-[#D4AF37] flex items-center justify-center bg-[#001B3A] text-[#D4AF37] shadow-lg shadow-black/40 hover:bg-[#D4AF37] hover:text-[#001B3A] active:scale-95 transition-all duration-150 cursor-pointer"
          title="Rotate Right (or press Right Arrow / D)"
        >
          <span className="text-2xl font-bold">↻</span>
        </button>
      </div>
    </div>
  );
};
