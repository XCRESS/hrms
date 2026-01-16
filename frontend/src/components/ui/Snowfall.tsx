import { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
}

interface SnowfallProps {
  className?: string;
}

/**
 * Canvas-based Snowfall Component
 *
 * Performance-optimized snowfall effect using HTML5 Canvas
 * - 60fps target with requestAnimationFrame
 * - Adaptive particle count based on container size
 * - Respects prefers-reduced-motion
 * - Auto-cleanup on unmount
 */
const Snowfall = ({ className = "absolute inset-0 pointer-events-none" }: SnowfallProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update canvas size to match parent container
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    updateSize();

    // Create snowflakes array - EXACT match to reference
    const snowflakes: Snowflake[] = [];
    const count = canvas.height < 200 ? 30 : 100;

    for (let i = 0; i < count; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 0.5, // Smaller flakes for banner
        speed: Math.random() * 1 + 0.5, // EXACT: 0.5-1.5px per frame
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    // Animation loop - EXACT match to reference
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';

      snowflakes.forEach((flake) => {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        ctx.fill();

        flake.y += flake.speed;
        flake.x += Math.sin(flake.y * 0.05) * 0.2;

        if (flake.y > canvas.height) {
          flake.y = -5;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) {
          flake.x = 0;
        } else if (flake.x < 0) {
          flake.x = canvas.width;
        }
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Handle window resize
    const handleResize = () => {
      updateSize();
    };

    window.addEventListener('resize', handleResize);
    animationFrameRef.current = requestAnimationFrame(draw);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
};

export default Snowfall;
