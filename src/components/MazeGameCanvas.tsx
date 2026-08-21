import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsBall, ScorePopup, BallColor } from '../types';
import { BALL_TYPES } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { Zap, RotateCcw, RotateCw } from 'lucide-react';

interface MazeGameCanvasProps {
  isPlaying: boolean;
  onBallEscaped: (ballType: BallColor, points: number, totalEscaped: number) => void;
  onBombDetonated?: () => void;
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

interface WallPin {
  x: number; // in normalized maze coords [-1, 1]
  y: number;
  r: number;
}

export const MazeGameCanvas: React.FC<MazeGameCanvasProps> = ({
  isPlaying,
  onBallEscaped,
  onBombDetonated,
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
  const shakeEffectRef = useRef<number>(0);

  // Explosion effect state
  const explosionRef = useRef<{
    active: boolean;
    startTime: number;
    x: number;
    y: number;
    particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
    }>;
  }>({
    active: false,
    startTime: 0,
    x: 0,
    y: 0,
    particles: [],
  });

  // Rotation button press states for continuous rotation
  const rotateLeftPressed = useRef<boolean>(false);
  const rotateRightPressed = useRef<boolean>(false);

  // Dimensions
  const [canvasSize, setCanvasSize] = useState<number>(440);

  // Intricate multi-tier maze geometry (proportional to maze outer radius R = 1.0)
  const getMazeGeometry = useCallback(() => {
    const arcs: WallArc[] = [
      // 1. Central Jar (r = 0.20): Narrow keyhole gate at top-right (-1.1 to -0.6 rad)
      { r: 0.20, startAngle: -0.60, endAngle: Math.PI * 2 - 1.15, thickness: 0.034 },

      // 2. Ring 1 (r = 0.35): 4-quadrant segmented labyrinth gates
      { r: 0.35, startAngle: 0.25, endAngle: Math.PI * 0.48, thickness: 0.032 },
      { r: 0.35, startAngle: Math.PI * 0.65, endAngle: Math.PI * 1.15, thickness: 0.032 },
      { r: 0.35, startAngle: Math.PI * 1.30, endAngle: Math.PI * 1.72, thickness: 0.032 },
      { r: 0.35, startAngle: Math.PI * 1.85, endAngle: Math.PI * 2 + 0.10, thickness: 0.032 },

      // 3. Ring 2 (r = 0.50): Staggered chicane corridors with trap pockets
      { r: 0.50, startAngle: -0.35, endAngle: Math.PI * 0.38, thickness: 0.032 },
      { r: 0.50, startAngle: Math.PI * 0.55, endAngle: Math.PI * 0.95, thickness: 0.032 },
      { r: 0.50, startAngle: Math.PI * 1.12, endAngle: Math.PI * 1.55, thickness: 0.032 },
      { r: 0.50, startAngle: Math.PI * 1.70, endAngle: Math.PI * 2 - 0.55, thickness: 0.032 },

      // 4. Ring 3 (r = 0.65): Complex hairpin routing
      { r: 0.65, startAngle: 0.10, endAngle: Math.PI * 0.42, thickness: 0.034 },
      { r: 0.65, startAngle: Math.PI * 0.58, endAngle: Math.PI * 1.05, thickness: 0.034 },
      { r: 0.65, startAngle: Math.PI * 1.22, endAngle: Math.PI * 1.62, thickness: 0.034 },
      { r: 0.65, startAngle: Math.PI * 1.78, endAngle: Math.PI * 2 - 0.15, thickness: 0.034 },

      // 5. Ring 4 (r = 0.80): Outer defensive labyrinth ring
      { r: 0.80, startAngle: -0.45, endAngle: Math.PI * 0.32, thickness: 0.034 },
      { r: 0.80, startAngle: Math.PI * 0.48, endAngle: Math.PI * 0.92, thickness: 0.034 },
      { r: 0.80, startAngle: Math.PI * 1.08, endAngle: Math.PI * 1.48, thickness: 0.034 },
      { r: 0.80, startAngle: Math.PI * 1.68, endAngle: Math.PI * 2 - 0.70, thickness: 0.034 },

      // 6. Outer Casing (r = 0.94): Precision exit channel opening at top (-PI/2)
      { r: 0.94, startAngle: -1.25, endAngle: Math.PI * 2 - 1.88, thickness: 0.042 },
    ];

    const spokes: WallSpoke[] = [
      // Central jar neck guide wings
      { r1: 0.20, r2: 0.35, angle: -1.15, thickness: 0.032 },
      { r1: 0.20, r2: 0.35, angle: -0.60, thickness: 0.032 },

      // Radial baffles Ring 1 -> Ring 2 (forces clockwise / counter-clockwise steering)
      { r1: 0.35, r2: 0.50, angle: Math.PI * 0.48, thickness: 0.030 },
      { r1: 0.35, r2: 0.50, angle: Math.PI * 1.15, thickness: 0.030 },
      { r1: 0.35, r2: 0.50, angle: Math.PI * 1.72, thickness: 0.030 },

      // Radial baffles Ring 2 -> Ring 3 (dead-end pockets & chicanes)
      { r1: 0.50, r2: 0.65, angle: 0.38, thickness: 0.032 },
      { r1: 0.50, r2: 0.65, angle: Math.PI * 0.95, thickness: 0.032 },
      { r1: 0.50, r2: 0.65, angle: Math.PI * 1.55, thickness: 0.032 },
      { r1: 0.50, r2: 0.65, angle: -0.35, thickness: 0.032 },

      // Radial baffles Ring 3 -> Ring 4 (switchbacks)
      { r1: 0.65, r2: 0.80, angle: Math.PI * 0.42, thickness: 0.032 },
      { r1: 0.65, r2: 0.80, angle: Math.PI * 1.05, thickness: 0.032 },
      { r1: 0.65, r2: 0.80, angle: Math.PI * 1.62, thickness: 0.032 },
      { r1: 0.65, r2: 0.80, angle: -0.15, thickness: 0.032 },

      // Radial baffles Ring 4 -> Outer Chute (Funnel jaws)
      { r1: 0.80, r2: 0.94, angle: 0.32, thickness: 0.034 },
      { r1: 0.80, r2: 0.94, angle: Math.PI * 0.92, thickness: 0.034 },
      { r1: 0.80, r2: 0.94, angle: Math.PI * 1.48, thickness: 0.034 },
      { r1: 0.80, r2: 0.94, angle: -1.88, thickness: 0.036 },
      { r1: 0.80, r2: 0.94, angle: -1.25, thickness: 0.036 },
    ];

    // Obstacle deflection pins (fixed relative to maze coordinate frame)
    const pins: WallPin[] = [
      { x: 0.42 * Math.cos(0.8), y: 0.42 * Math.sin(0.8), r: 0.022 },
      { x: 0.42 * Math.cos(2.4), y: 0.42 * Math.sin(2.4), r: 0.022 },
      { x: 0.42 * Math.cos(4.2), y: 0.42 * Math.sin(4.2), r: 0.022 },
      { x: 0.58 * Math.cos(1.8), y: 0.58 * Math.sin(1.8), r: 0.022 },
      { x: 0.58 * Math.cos(3.8), y: 0.58 * Math.sin(3.8), r: 0.022 },
      { x: 0.72 * Math.cos(0.0), y: 0.72 * Math.sin(0.0), r: 0.024 },
      { x: 0.72 * Math.cos(2.0), y: 0.72 * Math.sin(2.0), r: 0.024 },
      { x: 0.72 * Math.cos(3.4), y: 0.72 * Math.sin(3.4), r: 0.024 },
      { x: 0.87 * Math.cos(1.2), y: 0.87 * Math.sin(1.2), r: 0.024 },
      { x: 0.87 * Math.cos(4.5), y: 0.87 * Math.sin(4.5), r: 0.024 },
    ];

    return { arcs, spokes, pins };
  }, []);

  // Initialize balls
  const initBalls = useCallback(() => {
    const newBalls: PhysicsBall[] = [];
    let idCounter = 1;

    Object.values(BALL_TYPES).forEach((typeConfig) => {
      for (let i = 0; i < typeConfig.count; i++) {
        const rad = Math.random() * 0.12;
        const ang = Math.random() * Math.PI * 2;
        newBalls.push({
          id: idCounter++,
          x: Math.cos(ang) * rad,
          y: Math.sin(ang) * rad + 0.03,
          vx: (Math.random() - 0.5) * 0.002,
          vy: (Math.random() - 0.5) * 0.002,
          radius: typeConfig.id === 'bomb' ? 0.025 : 0.022,
          colorType: typeConfig.id,
          points: typeConfig.points,
          escaped: false,
          alpha: 1.0,
          isBomb: typeConfig.isBomb || typeConfig.id === 'bomb',
        });
      }
    });

    ballsRef.current = newBalls;
    escapedCountRef.current = 0;
    scorePopupsRef.current = [];
    angleRef.current = 0;
    angularVelocityRef.current = 0;
    shakeEffectRef.current = 0;
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

  // Shake action (dislodge balls)
  const triggerShake = useCallback(() => {
    if (!isPlaying) return;
    soundManager.playRotate();
    shakeEffectRef.current = 10;

    // Apply random kick impulses
    ballsRef.current.forEach((b) => {
      if (!b.escaped) {
        b.vx += (Math.random() - 0.5) * 0.012;
        b.vy += -0.008 - Math.random() * 0.008;
      }
    });
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        rotateLeftPressed.current = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rotateRightPressed.current = true;
      }
      if (e.code === 'Space' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        triggerShake();
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
  }, [triggerShake]);

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
    angularVelocityRef.current = deltaAngle * 0.85;
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

    const { arcs, spokes, pins } = getMazeGeometry();

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

      // 1. Process rotation button inputs (tuned for 20s agile gameplay)
      if (rotateLeftPressed.current) {
        angularVelocityRef.current = -0.065;
        soundManager.playRotate();
      } else if (rotateRightPressed.current) {
        angularVelocityRef.current = 0.065;
        soundManager.playRotate();
      } else if (!isDraggingRef.current) {
        angleRef.current += angularVelocityRef.current;
        angularVelocityRef.current *= 0.93;
        if (Math.abs(angularVelocityRef.current) < 0.0001) {
          angularVelocityRef.current = 0;
        }
      }

      // Decay shake effect
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (shakeEffectRef.current > 0) {
        shakeOffsetX = (Math.random() - 0.5) * shakeEffectRef.current;
        shakeOffsetY = (Math.random() - 0.5) * shakeEffectRef.current;
        shakeEffectRef.current = Math.max(0, shakeEffectRef.current - 0.6);
      }

      const mazeAngle = angleRef.current;

      // 2. Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Radial ambient glow behind maze
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, mazeR * 1.15);
      bgGrad.addColorStop(0, 'rgba(0, 43, 84, 0.7)');
      bgGrad.addColorStop(0.6, 'rgba(0, 27, 58, 0.45)');
      bgGrad.addColorStop(1, 'rgba(0, 19, 43, 0)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, mazeR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Outer glow boundary ring
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, mazeR * 1.05, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Update Ball Physics
      const balls = ballsRef.current;
      const gravityMag = isPlaying ? 0.00095 : 0.00045;

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];

        if (b.escaped) {
          b.vy += 0.0018;
          b.y += b.vy;
          b.x += b.vx;
          b.alpha = Math.max(0, b.alpha - 0.025);
          continue;
        }

        b.vy += gravityMag;

        // Maze rotational centripetal push
        const dTheta = angularVelocityRef.current;
        if (Math.abs(dTheta) > 0.001) {
          const rFromCenter = Math.sqrt(b.x * b.x + b.y * b.y);
          if (rFromCenter > 0.04) {
            const tangentX = -b.y / rFromCenter;
            const tangentY = b.x / rFromCenter;
            b.vx += tangentX * dTheta * 0.18;
            b.vy += tangentY * dTheta * 0.18;
          }
        }

        b.x += b.vx;
        b.y += b.vy;

        b.vx *= 0.982;
        b.vy *= 0.982;

        // Local Maze Space transformation
        const cosA = Math.cos(-mazeAngle);
        const sinA = Math.sin(-mazeAngle);
        const lx = b.x * cosA - b.y * sinA;
        const ly = b.x * sinA + b.y * cosA;
        const lr = Math.sqrt(lx * lx + ly * ly);
        let lAngle = Math.atan2(ly, lx);
        if (lAngle < 0) lAngle += Math.PI * 2;

        // Collision with Arcs
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
                b.vx = (b.vx - 1.45 * dot * nx) * 0.68;
                b.vy = (b.vy - 1.45 * dot * ny) * 0.68;

                const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                if (speed > 0.003 && Date.now() - lastClinkTimeRef.current > 35) {
                  soundManager.playClink(Math.min(1, speed * 110));
                  lastClinkTimeRef.current = Date.now();
                }
              }
            }
          }
        }

        // Collision with Spokes
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
                b.vx = (b.vx - 1.45 * dot * nx) * 0.68;
                b.vy = (b.vy - 1.45 * dot * ny) * 0.68;
              }
            }
          }
        }

        // Collision with Obstacle Pins
        for (const pin of pins) {
          const pdx = lx - pin.x;
          const pdy = ly - pin.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          const minPinDist = b.radius + pin.r;

          if (pdist < minPinDist && pdist > 0.0001) {
            const pinNx = pdx / pdist;
            const pinNy = pdy / pdist;
            const newLocalX = pin.x + pinNx * (minPinDist + 0.001);
            const newLocalY = pin.y + pinNy * (minPinDist + 0.001);

            const cosW = Math.cos(mazeAngle);
            const sinW = Math.sin(mazeAngle);
            b.x = newLocalX * cosW - newLocalY * sinW;
            b.y = newLocalX * sinW + newLocalY * cosW;

            // Rotate pin normal into world space
            const worldNx = pinNx * cosW - pinNy * sinW;
            const worldNy = pinNx * sinW + pinNy * cosW;
            const dot = b.vx * worldNx + b.vy * worldNy;
            if (dot < 0) {
              b.vx = (b.vx - 1.5 * dot * worldNx) * 0.72;
              b.vy = (b.vy - 1.5 * dot * worldNy) * 0.72;

              if (Date.now() - lastClinkTimeRef.current > 35) {
                soundManager.playClink(0.8);
                lastClinkTimeRef.current = Date.now();
              }
            }
          }
        }

        // Escape check (r > 0.94)
        if (lr > 0.94) {
          const screenX = cx + b.x * mazeR;
          const screenY = cy + b.y * mazeR;

          if (b.isBomb || b.colorType === 'bomb') {
            // === HAZARD BOMB DETONATION: RESETS EVERYTHING ===
            soundManager.playBombExplosion();
            shakeEffectRef.current = 28;

            // Spawn explosion particles
            const parts: Array<{
              x: number;
              y: number;
              vx: number;
              vy: number;
              size: number;
              color: string;
              alpha: number;
            }> = [];
            for (let p = 0; p < 45; p++) {
              const pAng = Math.random() * Math.PI * 2;
              const pSpeed = 2 + Math.random() * 7;
              parts.push({
                x: screenX,
                y: screenY,
                vx: Math.cos(pAng) * pSpeed,
                vy: Math.sin(pAng) * pSpeed,
                size: 3 + Math.random() * 6,
                color: ['#ef4444', '#f97316', '#eab308', '#ffffff', '#7f1d1d'][Math.floor(Math.random() * 5)],
                alpha: 1.0,
              });
            }

            explosionRef.current = {
              active: true,
              startTime: Date.now(),
              x: screenX,
              y: screenY,
              particles: parts,
            };

            // Reset all balls back into the center flask
            balls.forEach((ball) => {
              const rad = Math.random() * 0.12;
              const ang = Math.random() * Math.PI * 2;
              ball.x = Math.cos(ang) * rad;
              ball.y = Math.sin(ang) * rad + 0.03;
              ball.vx = (Math.random() - 0.5) * 0.003;
              ball.vy = (Math.random() - 0.5) * 0.003;
              ball.escaped = false;
              ball.alpha = 1.0;
            });

            escapedCountRef.current = 0;

            // Notify parent App state
            if (onBombDetonated) {
              onBombDetonated();
            }

            // Big warning score popup
            scorePopupsRef.current.push({
              id: Math.random().toString(),
              x: cx,
              y: cy - 25,
              points: 0,
              color: '#ef4444',
              text: '💥 BOMB DETONATED! RESET! 💥',
              opacity: 1.0,
              createdAt: Date.now(),
            });

            break; // Stop processing remaining balls for this frame
          } else {
            // === NORMAL TEA PEARL ESCAPE ===
            b.escaped = true;
            b.escapeTime = Date.now();
            b.vx = (Math.random() - 0.5) * 0.005;
            b.vy = 0.005 + Math.random() * 0.004;

            escapedCountRef.current += 1;
            onBallEscaped(b.colorType, b.points, escapedCountRef.current);
            soundManager.playBallEscape(b.points);

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
              const impulse = sepVel * 0.42;
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
      ctx.translate(cx + shakeOffsetX, cy + shakeOffsetY);
      ctx.rotate(mazeAngle);

      const drawMazeGeometry = (offsetX: number, offsetY: number, isShadow: boolean, isHighlight: boolean) => {
        // Draw Arcs
        for (const arc of arcs) {
          ctx.beginPath();
          ctx.arc(offsetX, offsetY, arc.r * mazeR, arc.startAngle, arc.endAngle);
          ctx.lineWidth = arc.thickness * mazeR;
          ctx.lineCap = 'round';
          if (isShadow) {
            ctx.strokeStyle = 'rgba(0, 10, 24, 0.65)';
          } else if (isHighlight) {
            ctx.strokeStyle = '#FFF3C4';
          } else {
            const goldGrad = ctx.createLinearGradient(-mazeR, -mazeR, mazeR, mazeR);
            goldGrad.addColorStop(0, '#FFE885');
            goldGrad.addColorStop(0.3, '#D4AF37');
            goldGrad.addColorStop(0.7, '#997A15');
            goldGrad.addColorStop(1, '#FFE066');
            ctx.strokeStyle = goldGrad;
          }
          ctx.stroke();
        }

        // Draw Spokes
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
            ctx.strokeStyle = 'rgba(0, 10, 24, 0.65)';
          } else if (isHighlight) {
            ctx.strokeStyle = '#FFF3C4';
          } else {
            const goldGrad = ctx.createLinearGradient(x1, y1, x2, y2);
            goldGrad.addColorStop(0, '#FFE885');
            goldGrad.addColorStop(0.5, '#D4AF37');
            goldGrad.addColorStop(1, '#8B6A08');
            ctx.strokeStyle = goldGrad;
          }
          ctx.stroke();
        }

        // Draw Obstacle Pins
        for (const pin of pins) {
          const px = pin.x * mazeR + offsetX;
          const py = pin.y * mazeR + offsetY;
          const pr = pin.r * mazeR;

          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          if (isShadow) {
            ctx.fillStyle = 'rgba(0, 10, 24, 0.65)';
          } else if (isHighlight) {
            ctx.fillStyle = '#FFF8DB';
          } else {
            const pinGrad = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr);
            pinGrad.addColorStop(0, '#FFF5BA');
            pinGrad.addColorStop(0.5, '#D4AF37');
            pinGrad.addColorStop(1, '#664D00');
            ctx.fillStyle = pinGrad;
          }
          ctx.fill();
        }
      };

      // 4a. Shadow
      drawMazeGeometry(3, 4, true, false);

      // 4b. Gold Wall
      drawMazeGeometry(0, 0, false, false);

      // 4c. Highlight
      ctx.shadowColor = 'rgba(255, 235, 150, 0.45)';
      ctx.shadowBlur = 4;
      drawMazeGeometry(-0.8, -0.8, false, true);
      ctx.shadowBlur = 0;

      // Draw Center Flask Glass
      ctx.beginPath();
      ctx.arc(0, 0, 0.20 * mazeR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 43, 84, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top Exit Arrow Marker
      const exitAngle = -Math.PI / 2;
      const exitR = 0.98 * mazeR;
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(
        Math.cos(exitAngle) * exitR,
        Math.sin(exitAngle) * exitR,
        9,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();

      // 5. DRAW BALLS
      for (const b of balls) {
        if (b.alpha <= 0) continue;

        const bx = cx + b.x * mazeR + shakeOffsetX;
        const by = cy + b.y * mazeR + shakeOffsetY;
        const bRad = b.radius * mazeR;
        const typeConf = BALL_TYPES[b.colorType];

        ctx.save();
        ctx.globalAlpha = b.alpha;

        // Shadow
        ctx.beginPath();
        ctx.arc(bx + 1.5, by + 2, bRad, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 10, 20, 0.5)';
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();

        if (b.colorType === 'gold') {
          ctx.beginPath();
          ctx.arc(bx, by, bRad * 1.3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 220, 100, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (b.colorType === 'bomb' || b.isBomb) {
          // Hazard Pulsing Glow Halo
          const pulse = Math.sin(Date.now() * 0.012);
          ctx.beginPath();
          ctx.arc(bx, by, bRad * (1.35 + 0.25 * pulse), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + 0.35 * pulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Burning fuse spark on top-right of the bomb ball
          ctx.beginPath();
          ctx.arc(bx + bRad * 0.45, by - bRad * 0.45, bRad * 0.28, 0, Math.PI * 2);
          ctx.fillStyle = '#ff4500';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner mini fuse glow
          ctx.beginPath();
          ctx.arc(bx + bRad * 0.45, by - bRad * 0.45, bRad * 0.12, 0, Math.PI * 2);
          ctx.fillStyle = '#ffedd5';
          ctx.fill();

          // Bomb icon / cross marking on the sphere
          ctx.font = 'bold 8px sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', bx, by + 1);
        }

        ctx.restore();
      }

      const now = Date.now();

      // 6. DRAW EXPLOSION DETONATION EFFECT IF ACTIVE
      if (explosionRef.current.active) {
        const exp = explosionRef.current;
        const elapsed = now - exp.startTime;
        if (elapsed > 1100) {
          exp.active = false;
        } else {
          const progress = elapsed / 1100;
          const blastRadius = progress * mazeR * 1.5;
          const blastAlpha = Math.max(0, 1 - progress);

          ctx.save();

          // Red screen flash
          ctx.fillStyle = `rgba(239, 68, 68, ${blastAlpha * 0.28})`;
          ctx.fillRect(0, 0, width, height);

          // Outer shockwave wave
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, blastRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${blastAlpha * 0.9})`;
          ctx.lineWidth = Math.max(2, 14 * (1 - progress));
          ctx.stroke();

          // Inner shockwave wave
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, blastRadius * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(251, 146, 60, ${blastAlpha * 0.75})`;
          ctx.lineWidth = Math.max(1.5, 8 * (1 - progress));
          ctx.stroke();

          // Explosion particles
          for (const p of exp.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.93;
            p.vy *= 0.93;
            p.alpha = Math.max(0, 1 - progress * 1.15);

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          ctx.restore();
        }
      }

      // 7. DRAW FLOATING SCORE POPUPS
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
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
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
  }, [canvasSize, getMazeGeometry, isPlaying, onBallEscaped, onBombDetonated]);

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
      <div className="mt-2 flex items-center space-x-3 sm:space-x-4 z-10">
        {/* Rotate Left */}
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
          className="w-12 h-12 rounded-full border-2 border-[#D4AF37] flex items-center justify-center bg-[#001B3A] text-[#D4AF37] shadow-lg shadow-black/40 hover:bg-[#D4AF37] hover:text-[#001B3A] active:scale-95 transition-all duration-150 cursor-pointer"
          title="Rotate Left (or press Left Arrow / A)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Shake / Jiggle Button */}
        <button
          id="btn-shake-maze"
          onClick={triggerShake}
          disabled={!isPlaying}
          className="px-3.5 py-2.5 rounded-full border border-[#D4AF37]/50 bg-[#002B54] text-[#FFE885] hover:bg-[#D4AF37] hover:text-[#001B3A] active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          title="Dislodge stuck pearls (or press Spacebar)"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span className="text-xs font-bold uppercase tracking-wider">Shake</span>
        </button>

        {/* Rotate Right */}
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
          className="w-12 h-12 rounded-full border-2 border-[#D4AF37] flex items-center justify-center bg-[#001B3A] text-[#D4AF37] shadow-lg shadow-black/40 hover:bg-[#D4AF37] hover:text-[#001B3A] active:scale-95 transition-all duration-150 cursor-pointer"
          title="Rotate Right (or press Right Arrow / D)"
        >
          <RotateCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center space-x-2 mt-1">
        <span className="text-[10px] text-[#D4AF37]/80 font-semibold uppercase tracking-wider">
          Drag / Arrows to Rotate
        </span>
        <span className="text-[10px] text-white/40">•</span>
        <span className="text-[10px] text-white/60">Spacebar to Shake</span>
      </div>
    </div>
  );
};
