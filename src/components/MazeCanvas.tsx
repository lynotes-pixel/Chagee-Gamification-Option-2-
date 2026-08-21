import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BallColor, PhysicsBall, ScorePopup } from '../types';
import { BALL_TYPES } from '../utils/constants';
import { soundManager } from '../utils/audio';
import { RotateCcw, RotateCw, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface MazeCanvasProps {
  isPlaying: boolean;
  onBallEscaped: (ball: PhysicsBall, newTotalEscaped: number, newScore: number) => void;
  onGameComplete?: () => void;
}

interface WallArc {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
}

interface RadialSpoke {
  rMin: number;
  rMax: number;
  angle: number;
  thickness: number;
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  isPlaying,
  onBallEscaped,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Maze state
  const rotationAngleRef = useRef<number>(0);
  const rotationVelocityRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastDragAngleRef = useRef<number>(0);
  const dragTimeRef = useRef<number>(0);

  // Physics simulation
  const ballsRef = useRef<PhysicsBall[]>([]);
  const escapedCountRef = useRef<number>(0);
  const currentScoreRef = useRef<number>(0);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const lastClinkTimeRef = useRef<number>(0);

  // UI state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [shakeCooldown, setShakeCooldown] = useState(false);
  const [rotDirection, setRotDirection] = useState<'left' | 'right' | null>(null);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setEnabled(next);
  };

  // Initialize balls in the center flask
  const initBalls = useCallback(() => {
    const newBalls: PhysicsBall[] = [];
    let idCounter = 1;

    const colors: BallColor[] = ['green', 'yellow', 'red', 'purple', 'gold'];

    colors.forEach((col) => {
      const config = BALL_TYPES[col];
      for (let i = 0; i < config.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 24;
        newBalls.push({
          id: idCounter++,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist + 8,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          radius: col === 'gold' ? 6.5 : col === 'purple' ? 6 : 5.5,
          colorType: col,
          points: config.points,
          escaped: false,
          alpha: 1,
        });
      }
    });

    ballsRef.current = newBalls;
    escapedCountRef.current = 0;
    currentScoreRef.current = 0;
    scorePopupsRef.current = [];
    rotationAngleRef.current = 0;
    rotationVelocityRef.current = 0;
  }, []);

  useEffect(() => {
    initBalls();
  }, [initBalls]);

  // Shake feature to unstick balls
  const handleShake = () => {
    if (shakeCooldown || !isPlaying) return;
    setShakeCooldown(true);
    soundManager.playRotate();

    ballsRef.current.forEach((b) => {
      if (!b.escaped) {
        b.vx += (Math.random() - 0.5) * 220;
        b.vy -= Math.random() * 200 + 100;
      }
    });

    setTimeout(() => {
      setShakeCooldown(false);
    }, 4000);
  };

  // Setup Touch / Pointer drag rotation
  const getAngleFromPointer = (e: MouseEvent | TouchEvent, rect: DOMRect) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.44;
    return Math.atan2(clientY - cy, clientX - cx);
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaying || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentAngle = getAngleFromPointer(e.nativeEvent, rect);
    isDraggingRef.current = true;
    lastDragAngleRef.current = currentAngle;
    dragTimeRef.current = performance.now();
    rotationVelocityRef.current = 0;
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const currentAngle = getAngleFromPointer(e, rect);
      
      let delta = currentAngle - lastDragAngleRef.current;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;

      rotationAngleRef.current += delta;
      
      const now = performance.now();
      const dt = (now - dragTimeRef.current) / 1000;
      if (dt > 0.01) {
        rotationVelocityRef.current = delta / dt;
        dragTimeRef.current = now;
      }

      lastDragAngleRef.current = currentAngle;
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        rotationVelocityRef.current = Math.max(-12, Math.min(12, rotationVelocityRef.current));
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        rotationVelocityRef.current = -3.8;
        setRotDirection('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rotationVelocityRef.current = 3.8;
        setRotDirection('right');
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        handleShake();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) {
        setRotDirection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, shakeCooldown]);

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = containerRef.current?.clientWidth || 380;
      const height = Math.min(520, window.innerHeight * 0.62);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const R0 = 38;  // Center reservoir
    const R1 = 76;  // Inner ring
    const R2 = 118; // Middle ring
    const R3 = 158; // Outer ring
    const WALL_THICKNESS = 9;

    const ringArcs: WallArc[] = [
      { innerRadius: R1 - WALL_THICKNESS / 2, outerRadius: R1 + WALL_THICKNESS / 2, startAngle: 0.8, endAngle: 3.2 },
      { innerRadius: R1 - WALL_THICKNESS / 2, outerRadius: R1 + WALL_THICKNESS / 2, startAngle: 3.8, endAngle: 6.2 },
      { innerRadius: R2 - WALL_THICKNESS / 2, outerRadius: R2 + WALL_THICKNESS / 2, startAngle: -0.3, endAngle: 1.5 },
      { innerRadius: R2 - WALL_THICKNESS / 2, outerRadius: R2 + WALL_THICKNESS / 2, startAngle: 2.1, endAngle: 4.2 },
      { innerRadius: R2 - WALL_THICKNESS / 2, outerRadius: R2 + WALL_THICKNESS / 2, startAngle: 4.8, endAngle: 5.7 },
      { innerRadius: R3 - WALL_THICKNESS / 2, outerRadius: R3 + WALL_THICKNESS / 2, startAngle: 0.65, endAngle: 2.6 },
      { innerRadius: R3 - WALL_THICKNESS / 2, outerRadius: R3 + WALL_THICKNESS / 2, startAngle: 3.4, endAngle: 5.4 },
      { innerRadius: R3 - WALL_THICKNESS / 2, outerRadius: R3 + WALL_THICKNESS / 2, startAngle: 5.9, endAngle: 6.8 },
    ];

    const radialSpokes: RadialSpoke[] = [
      { rMin: R0, rMax: R1, angle: -Math.PI * 0.65, thickness: 8 },
      { rMin: R0, rMax: R1, angle: -Math.PI * 0.35, thickness: 8 },
      { rMin: R1, rMax: R2, angle: 0.7, thickness: 8 },
      { rMin: R1, rMax: R2, angle: 3.7, thickness: 8 },
      { rMin: R1, rMax: R2, angle: 5.2, thickness: 8 },
      { rMin: R2, rMax: R3, angle: 1.6, thickness: 8 },
      { rMin: R2, rMax: R3, angle: 4.3, thickness: 8 },
      { rMin: R2, rMax: R3, angle: -0.4, thickness: 8 },
    ];

    const renderLoop = (timestamp: number) => {
      const dt = Math.min(0.04, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height * 0.43;

      if (rotDirection === 'left') {
        rotationVelocityRef.current = -3.5;
      } else if (rotDirection === 'right') {
        rotationVelocityRef.current = 3.5;
      }

      if (!isDraggingRef.current) {
        rotationAngleRef.current += rotationVelocityRef.current * dt;
        rotationVelocityRef.current *= 0.94;
      }

      const SUB_STEPS = 4;
      const subDt = dt / SUB_STEPS;
      const GRAVITY = 720;

      for (let step = 0; step < SUB_STEPS; step++) {
        const theta = rotationAngleRef.current;

        ballsRef.current.forEach((ball) => {
          if (ball.escaped) {
            ball.vy += GRAVITY * 1.2 * subDt;
            ball.x += ball.vx * subDt;
            ball.y += ball.vy * subDt;

            const cupBottom = height - 25;
            if (ball.y > cupBottom - ball.radius) {
              ball.y = cupBottom - ball.radius;
              ball.vy = -ball.vy * 0.25;
              ball.vx *= 0.7;
            }
            return;
          }

          ball.vy += GRAVITY * subDt;

          let nextX = ball.x + ball.vx * subDt;
          let nextY = ball.y + ball.vy * subDt;

          const r = Math.hypot(nextX, nextY);
          let worldAngle = Math.atan2(nextY, nextX);
          let localAngle = (worldAngle - theta) % (Math.PI * 2);
          if (localAngle < 0) localAngle += Math.PI * 2;

          if (r > R3 + ball.radius + 2) {
            ball.escaped = true;
            ball.escapeTime = timestamp;
            escapedCountRef.current += 1;
            currentScoreRef.current += ball.points;

            soundManager.playBallEscape(ball.points);
            onBallEscaped(ball, escapedCountRef.current, currentScoreRef.current);

            scorePopupsRef.current.push({
              id: Math.random().toString(),
              x: centerX + nextX,
              y: centerY + nextY,
              points: ball.points,
              color: BALL_TYPES[ball.colorType].color,
              text: `+${ball.points}`,
              opacity: 1,
              createdAt: timestamp,
            });
            return;
          }

          const flaskOpeningStart = 4.15;
          const flaskOpeningEnd = 5.25;
          const isFlaskOpening = localAngle >= flaskOpeningStart && localAngle <= flaskOpeningEnd;

          if (r < R0 - ball.radius) {
            // inside flask
          } else if (r >= R0 - ball.radius && r <= R0 + ball.radius && !isFlaskOpening) {
            const pushDist = (R0 - ball.radius);
            nextX = Math.cos(worldAngle) * pushDist;
            nextY = Math.sin(worldAngle) * pushDist;
            const normalX = Math.cos(worldAngle);
            const normalY = Math.sin(worldAngle);
            const dot = ball.vx * normalX + ball.vy * normalY;
            if (dot > 0) {
              ball.vx = (ball.vx - 1.4 * dot * normalX) * 0.6;
              ball.vy = (ball.vy - 1.4 * dot * normalY) * 0.6;
            }
          }

          for (const arc of ringArcs) {
            let inArcAngle = false;
            if (arc.startAngle <= arc.endAngle) {
              inArcAngle = localAngle >= arc.startAngle && localAngle <= arc.endAngle;
            } else {
              inArcAngle = localAngle >= arc.startAngle || localAngle <= arc.endAngle;
            }

            if (inArcAngle) {
              if (r >= arc.innerRadius - ball.radius && r < (arc.innerRadius + arc.outerRadius) / 2) {
                const targetR = arc.innerRadius - ball.radius;
                nextX = Math.cos(worldAngle) * targetR;
                nextY = Math.sin(worldAngle) * targetR;
                const normalX = Math.cos(worldAngle);
                const normalY = Math.sin(worldAngle);
                const dot = ball.vx * normalX + ball.vy * normalY;
                if (dot > 0) {
                  ball.vx = (ball.vx - 1.4 * dot * normalX) * 0.65;
                  ball.vy = (ball.vy - 1.4 * dot * normalY) * 0.65;
                }
              } else if (r <= arc.outerRadius + ball.radius && r >= (arc.innerRadius + arc.outerRadius) / 2) {
                const targetR = arc.outerRadius + ball.radius;
                nextX = Math.cos(worldAngle) * targetR;
                nextY = Math.sin(worldAngle) * targetR;
                const normalX = -Math.cos(worldAngle);
                const normalY = -Math.sin(worldAngle);
                const dot = ball.vx * normalX + ball.vy * normalY;
                if (dot > 0) {
                  ball.vx = (ball.vx - 1.4 * dot * normalX) * 0.65;
                  ball.vy = (ball.vy - 1.4 * dot * normalY) * 0.65;
                }
              }
            }
          }

          for (const spoke of radialSpokes) {
            if (r >= spoke.rMin - ball.radius && r <= spoke.rMax + ball.radius) {
              let angleDiff = localAngle - spoke.angle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

              const linearDist = Math.abs(angleDiff) * r;
              const threshold = spoke.thickness / 2 + ball.radius;

              if (linearDist < threshold) {
                const sign = angleDiff > 0 ? 1 : -1;
                const correctedAngle = spoke.angle + (sign * threshold) / r + theta;
                nextX = Math.cos(correctedAngle) * r;
                nextY = Math.sin(correctedAngle) * r;

                const tangentX = -Math.sin(correctedAngle);
                const tangentY = Math.cos(correctedAngle);
                const dot = ball.vx * tangentX + ball.vy * tangentY;
                ball.vx = (ball.vx - 1.4 * dot * tangentX) * 0.6;
                ball.vy = (ball.vy - 1.4 * dot * tangentY) * 0.6;

                if (timestamp - lastClinkTimeRef.current > 180 && Math.hypot(ball.vx, ball.vy) > 80) {
                  soundManager.playClink(0.8);
                  lastClinkTimeRef.current = timestamp;
                }
              }
            }
          }

          if (Math.abs(rotationVelocityRef.current) > 0.05) {
            const tangVel = rotationVelocityRef.current * r;
            const tangX = -Math.sin(worldAngle) * tangVel * 0.08;
            const tangY = Math.cos(worldAngle) * tangVel * 0.08;
            ball.vx += tangX;
            ball.vy += tangY;
          }

          ball.vx *= 0.985;
          ball.vy *= 0.985;

          ball.x = nextX;
          ball.y = nextY;
        });

        const unescapedBalls = ballsRef.current.filter((b) => !b.escaped);
        for (let i = 0; i < unescapedBalls.length; i++) {
          for (let j = i + 1; j < unescapedBalls.length; j++) {
            const b1 = unescapedBalls[i];
            const b2 = unescapedBalls[j];
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = b1.radius + b2.radius;

            if (dist < minDist && dist > 0.001) {
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const ny = dy / dist;

              b1.x -= nx * overlap;
              b1.y -= ny * overlap;
              b2.x += nx * overlap;
              b2.y += ny * overlap;

              const dvx = b1.vx - b2.vx;
              const dvy = b1.vy - b2.vy;
              const impulse = (dvx * nx + dvy * ny) * 0.45;
              b1.vx -= impulse * nx;
              b1.vy -= impulse * ny;
              b2.vx += impulse * nx;
              b2.vy += impulse * ny;
            }
          }
        }
      }

      // Drawing
      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createRadialGradient(
        centerX, centerY, 20,
        centerX, centerY, Math.max(width, height)
      );
      bgGradient.addColorStop(0, '#0E244D');
      bgGradient.addColorStop(0.65, '#08162E');
      bgGradient.addColorStop(1, '#040B17');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.fillStyle = 'rgba(255, 223, 128, 0.15)';
      for (let s = 0; s < 18; s++) {
        const sx = (s * 47) % width;
        const sy = (s * 39) % height;
        const sz = (s % 3) + 1;
        ctx.beginPath();
        ctx.arc(sx, sy, sz * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(centerX, centerY);

      const mazeAura = ctx.createRadialGradient(0, 0, R3 - 10, 0, 0, R3 + 28);
      mazeAura.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
      mazeAura.addColorStop(0.7, 'rgba(212, 175, 55, 0.08)');
      mazeAura.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = mazeAura;
      ctx.beginPath();
      ctx.arc(0, 0, R3 + 28, 0, Math.PI * 2);
      ctx.fill();

      const plateGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, R3);
      plateGrad.addColorStop(0, '#0C2044');
      plateGrad.addColorStop(0.7, '#07152B');
      plateGrad.addColorStop(1, '#050E1F');
      ctx.fillStyle = plateGrad;
      ctx.beginPath();
      ctx.arc(0, 0, R3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(14, 38, 77, 0.9)';
      ctx.lineWidth = WALL_THICKNESS + 6;
      [R1, R2, R3].forEach((r) => {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.rotate(rotationAngleRef.current);

      const draw3DGoldArc = (r: number, startA: number, endA: number, thick = WALL_THICKNESS) => {
        ctx.save();
        ctx.strokeStyle = '#5E420C';
        ctx.lineWidth = thick + 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, r + 1, startA, endA);
        ctx.stroke();

        const goldGrad = ctx.createLinearGradient(-r, -r, r, r);
        goldGrad.addColorStop(0, '#FDF3C7');
        goldGrad.addColorStop(0.25, '#F59E0B');
        goldGrad.addColorStop(0.5, '#D97706');
        goldGrad.addColorStop(0.75, '#FDE68A');
        goldGrad.addColorStop(1, '#B45309');

        ctx.strokeStyle = goldGrad;
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.arc(0, 0, r, startA, endA);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r - thick * 0.25, startA + 0.05, endA - 0.05);
        ctx.stroke();
        ctx.restore();
      };

      const draw3DGoldSpoke = (spoke: RadialSpoke) => {
        ctx.save();
        ctx.rotate(spoke.angle);

        ctx.fillStyle = '#6B4A0E';
        ctx.fillRect(spoke.rMin, -spoke.thickness / 2 + 1, spoke.rMax - spoke.rMin, spoke.thickness);

        const spokeGrad = ctx.createLinearGradient(spoke.rMin, 0, spoke.rMax, 0);
        spokeGrad.addColorStop(0, '#F59E0B');
        spokeGrad.addColorStop(0.5, '#FDE68A');
        spokeGrad.addColorStop(1, '#D97706');

        ctx.fillStyle = spokeGrad;
        ctx.fillRect(spoke.rMin, -spoke.thickness / 2, spoke.rMax - spoke.rMin, spoke.thickness);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(spoke.rMin + 2, -spoke.thickness / 2 + 1, spoke.rMax - spoke.rMin - 4, 1.5);

        ctx.restore();
      };

      const flaskGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, R0);
      flaskGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
      flaskGrad.addColorStop(0.8, 'rgba(180, 83, 9, 0.15)');
      flaskGrad.addColorStop(1, 'rgba(217, 119, 6, 0.4)');
      ctx.fillStyle = flaskGrad;
      ctx.beginPath();
      ctx.arc(0, 0, R0, 0, Math.PI * 2);
      ctx.fill();

      draw3DGoldArc(R0, 5.3, 4.1, 8);

      const neckAngle1 = 4.15;
      const neckAngle2 = 5.25;
      [neckAngle1, neckAngle2].forEach((ang) => {
        ctx.save();
        ctx.rotate(ang);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(R0 - 4, -4, 22, 8);
        ctx.restore();
      });

      ringArcs.forEach((arc) => {
        draw3DGoldArc((arc.innerRadius + arc.outerRadius) / 2, arc.startAngle, arc.endAngle, WALL_THICKNESS);
      });

      radialSpokes.forEach((spoke) => {
        draw3DGoldSpoke(spoke);
      });

      ctx.save();
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FEF3C7';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('茶', 0, 0.5);
      ctx.restore();

      ctx.restore();

      ballsRef.current.forEach((ball) => {
        const bx = centerX + ball.x;
        const by = centerY + ball.y;
        const config = BALL_TYPES[ball.colorType];

        ctx.save();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(bx + 1.5, by + 2.5, ball.radius * 0.9, ball.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        const ballGrad = ctx.createRadialGradient(
          bx - ball.radius * 0.35,
          by - ball.radius * 0.35,
          ball.radius * 0.1,
          bx,
          by,
          ball.radius
        );
        ballGrad.addColorStop(0, config.highlightColor);
        ballGrad.addColorStop(0.4, config.color);
        ballGrad.addColorStop(1, config.shadowColor);

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(bx, by, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(bx - ball.radius * 0.3, by - ball.radius * 0.3, ball.radius * 0.26, 0, Math.PI * 2);
        ctx.fill();

        if (ball.colorType === 'gold') {
          ctx.strokeStyle = 'rgba(255, 223, 0, 0.6)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bx, by, ball.radius + 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      });

      const cupX = centerX;
      const cupY = height - 16;
      const cupW = 160;
      const cupH = 46;

      ctx.save();
      const cupGlow = ctx.createRadialGradient(cupX, cupY, 10, cupX, cupY, 80);
      cupGlow.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
      cupGlow.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = cupGlow;
      ctx.fillRect(cupX - 90, cupY - 50, 180, 70);

      ctx.fillStyle = 'rgba(14, 33, 67, 0.85)';
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.roundRect(cupX - cupW / 2, cupY - cupH, cupW, cupH, [10, 10, 22, 22]);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cupX - cupW / 2 + 10, cupY - cupH + 8);
      ctx.lineTo(cupX + cupW / 2 - 10, cupY - cupH + 8);
      ctx.stroke();

      ctx.fillStyle = '#FDE68A';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🍵 ESCAPED PEARLS: ${escapedCountRef.current}`, cupX, cupY - cupH / 2 + 4);

      ctx.restore();

      const now = timestamp;
      scorePopupsRef.current = scorePopupsRef.current.filter((popup) => {
        const age = (now - popup.createdAt) / 1000;
        if (age > 1.2) return false;

        const alpha = Math.max(0, 1 - age / 1.2);
        const yOffset = age * 45;

        ctx.save();
        ctx.fillStyle = popup.color;
        ctx.shadowColor = popup.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(popup.text, popup.x, popup.y - yOffset);
        ctx.restore();

        return true;
      });

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, onBallEscaped, rotDirection]);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex flex-col items-center select-none touch-none overflow-hidden"
    >
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
        <button
          id="sound-toggle-btn"
          onClick={toggleSound}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-slate-800 transition-all shadow-md active:scale-95"
          title="Toggle Sound Effects"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          <span>{soundEnabled ? 'Audio ON' : 'Audio OFF'}</span>
        </button>

        <button
          id="shake-maze-btn"
          onClick={handleShake}
          disabled={shakeCooldown || !isPlaying}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-md active:scale-95 ${
            shakeCooldown || !isPlaying
              ? 'bg-slate-800/60 border border-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-400 text-amber-200 hover:from-amber-500/30 hover:to-amber-600/40 hover:border-amber-300'
          }`}
          title="Shake maze to free stuck pearls"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>{shakeCooldown ? 'Cooldown...' : '✨ Shake Pearls'}</span>
        </button>
      </div>

      <canvas
        id="3d-maze-canvas"
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        className="w-full cursor-grab active:cursor-grabbing rounded-2xl shadow-inner border border-amber-500/20"
      />

      <div className="flex items-center justify-center gap-2 mt-2 text-xs text-amber-200/80 font-medium">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        <span>Swipe or drag the 3D wheel to rotate and roll pearls out!</span>
      </div>

      <div className="w-full flex items-center justify-center gap-4 mt-3 px-4">
        <button
          id="spin-left-btn"
          onMouseDown={() => {
            soundManager.playRotate();
            setRotDirection('left');
          }}
          onMouseUp={() => setRotDirection(null)}
          onMouseLeave={() => setRotDirection(null)}
          onTouchStart={() => {
            soundManager.playRotate();
            setRotDirection('left');
          }}
          onTouchEnd={() => setRotDirection(null)}
          disabled={!isPlaying}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-b from-[#132A54] to-[#0A1832] border border-amber-500/40 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:border-amber-400 active:scale-95 transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-5 h-5 text-amber-400" />
          <span>Spin Left</span>
        </button>

        <button
          id="spin-right-btn"
          onMouseDown={() => {
            soundManager.playRotate();
            setRotDirection('right');
          }}
          onMouseUp={() => setRotDirection(null)}
          onMouseLeave={() => setRotDirection(null)}
          onTouchStart={() => {
            soundManager.playRotate();
            setRotDirection('right');
          }}
          onTouchEnd={() => setRotDirection(null)}
          disabled={!isPlaying}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-b from-[#132A54] to-[#0A1832] border border-amber-500/40 text-amber-200 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg hover:border-amber-400 active:scale-95 transition-all disabled:opacity-50"
        >
          <span>Spin Right</span>
          <RotateCw className="w-5 h-5 text-amber-400" />
        </button>
      </div>
    </div>
  );
};
