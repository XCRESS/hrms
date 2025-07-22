import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Epic404Page() {
  // Refs for animation elements
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State for interactive elements
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isGlitching, setIsGlitching] = useState(false);
  const [showPortal, setShowPortal] = useState(false);
  const particlesRef = useRef([]);
  
  // Handle canvas and animation setup
  useEffect(() => {
    // Show elements with staggered timing for dramatic entry
    setTimeout(() => setShowPortal(true), 300);
    
    // Set up the particle system
    const initialParticles = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: (Math.random() - 0.5) * 0.8,
      opacity: Math.random() * 0.5 + 0.2,
      hue: Math.floor(Math.random() * 60) + 220 // Blue to purple hues
    }));
    particlesRef.current = initialParticles;
    
    // Set up canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let hueRotation = 0;
    
    // Handle resizing
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Main animation loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw ambient particles
      particlesRef.current.forEach((particle, i) => {
        // Update particle positions with slight turbulence
        particle.x += particle.speedX + Math.sin(Date.now() * 0.001 + i) * 0.1;
        particle.y += particle.speedY + Math.cos(Date.now() * 0.001 + i) * 0.1;
        
        // Wrap particles around screen edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Draw the particle with a glow effect
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = `hsla(${particle.hue}, 80%, 60%, ${particle.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${particle.hue}, 80%, 60%, 0.8)`;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
      });
      
      // Create a radial background glow that pulses
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const outerRadius = Math.min(canvas.width, canvas.height) * 0.8;
      const pulseIntensity = 0.1 * Math.sin(Date.now() * 0.001) + 0.9;
      
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, outerRadius
      );
      
      // Subtle color shift with time
      hueRotation = (hueRotation + 0.03) % 360;
      
      gradient.addColorStop(0, `hsla(${240 + hueRotation * 0.1}, 80%, 15%, ${0.6 * pulseIntensity})`);
      gradient.addColorStop(0.6, `hsla(${260 + hueRotation * 0.1}, 70%, 8%, ${0.4 * pulseIntensity})`);
      gradient.addColorStop(1, 'hsla(280, 80%, 5%, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw connection lines between nearby particles
      ctx.strokeStyle = 'rgba(120, 140, 255, 0.15)';
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x;
          const dy = particlesRef.current[i].y - particlesRef.current[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y);
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y);
            ctx.stroke();
          }
        }
      }
      
      // Draw cursor-following glow if cursor has moved
      if (cursorPosition.x !== 0 && cursorPosition.y !== 0) {
        const cursorGlow = ctx.createRadialGradient(
          cursorPosition.x, cursorPosition.y, 0,
          cursorPosition.x, cursorPosition.y, 150
        );
        
        cursorGlow.addColorStop(0, 'rgba(110, 120, 255, 0.08)');
        cursorGlow.addColorStop(1, 'rgba(110, 120, 255, 0)');
        
        ctx.fillStyle = cursorGlow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      animationFrameId = window.requestAnimationFrame(render);
    };
    
    render();
    
    // Clean up
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [cursorPosition.x, cursorPosition.y]);
  
  // Track cursor position for interactive elements
  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      
      // Calculate distance from center for parallax
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (e.clientX - centerX) / 40;
        const deltaY = (e.clientY - centerY) / 40;
        
        // Apply subtle parallax to text element
        if (textRef.current) {
          textRef.current.style.transform = `translate(${-deltaX * 0.5}px, ${-deltaY * 0.5}px)`;
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Trigger glitch effect on certain intervals or interactions
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 5000);
    
    return () => clearInterval(glitchInterval);
  }, []);
  
  // Create glitch effect function for text
  const triggerManualGlitch = () => {
    if (!isGlitching) {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 300);
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gray-950 font-sans text-white"
    >
      {/* Canvas background for particle system and effects */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 h-full w-full"
      />
      
      {/* Full-page grid overlay for design structure */}
      <div className="absolute inset-0 z-10 opacity-15">
        <div className="h-full w-full bg-[radial-gradient(circle_at_center,_rgba(60,60,140,0.08)_1px,_transparent_1px)] bg-[size:30px_30px]" />
      </div>
      
      {/* Subtle vignette effect */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]" />
      
      {/* Main content container with entrance animation */}
      <div 
        className={`relative z-20 flex flex-col items-center justify-center px-6 transition-all duration-1000 ${
          showPortal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Central portal effect */}
        <div className="relative mb-8">
          {/* Circular gradient rings */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/10 via-violet-600/10 to-indigo-500/10 blur-xl animate-[spin_20s_linear_infinite]" style={{ width: '350px', height: '350px' }} />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/20 via-violet-500/20 to-fuchsia-500/20 blur-lg animate-[spin_16s_linear_reverse_infinite]" style={{ width: '300px', height: '300px', margin: '25px' }} />
          
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-900/40 to-fuchsia-900/40" style={{ width: '250px', height: '250px', margin: '50px' }} />
          
          {/* Core with 404 text */}
          <div 
            ref={textRef}
            className="relative flex h-64 w-64 flex-col items-center justify-center rounded-full bg-gray-950 text-center"
            onClick={triggerManualGlitch}
          >
            {/* Main 404 text with advanced styling */}
            <div 
              className={`relative z-30 transition-all duration-300 ${isGlitching ? 'skew-x-3 translate-x-1' : ''}`}
            >
              <h1 className="text-7xl font-black tracking-tighter text-transparent">
                {/* Layered text for glow effect */}
                <span className="absolute blur-sm text-blue-500/60">404</span>
                <span className="absolute blur-xs text-indigo-400/90">404</span>
                <span className="relative bg-gradient-to-b from-white via-blue-100 to-blue-200 bg-clip-text">404</span>
              </h1>
              
              {/* Animated underline */}
              <div className="mx-auto mt-1 h-px w-20 bg-gradient-to-r from-transparent via-blue-400 to-transparent">
                <div className={`h-full w-full bg-blue-300 ${isGlitching ? 'animate-pulse' : ''}`} style={{ width: '30%' }} />
              </div>
              
              {/* Subtitle with staggered letter animation */}
              <p className={`mt-3 text-sm font-light tracking-widest text-blue-200/70 ${isGlitching ? 'skew-x-2' : ''}`} 
                style={{ letterSpacing: '0.2em' }}>
                DIMENSION LOST
              </p>
            </div>
          </div>
        </div>
        
        {/* Message with sophisticated typography */}
        <div className="relative mb-10 max-w-md text-center">
          <p className="text-md font-light leading-relaxed text-blue-100/80" style={{ letterSpacing: '0.05em' }}>
            The digital coordinates you're looking for have
            <span className="relative mx-1 inline-block">
              <span className={`relative z-10 ${isGlitching ? 'text-red-300' : 'text-blue-200'}`}>disconnected</span>
              <span className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"></span>
            </span>
            from our reality.
          </p>
        </div>
        
        {/* Return button with sophisticated hover effects */}
        <button  className="group relative overflow-hidden rounded-full bg-gray-900 px-8 py-3 font-medium text-white transition-all duration-300">
          {/* Button background layers */}
          <span className="absolute inset-0 z-0 bg-gradient-to-r from-blue-800/30 to-indigo-800/30 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
          <span className="absolute inset-0 z-0 translate-y-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-transform duration-500 group-hover:translate-y-0"></span>
          
          {/* Button content with icon */}
          <span className="relative z-10 flex items-center space-x-2">
            <ArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" />
            <Link to="/">RETURN TO HOMEPAGE</Link>
          </span>
          
          {/* Light reflection effect */}
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100"></span>
        </button>
        
        {/* Visual composition elements */}
        <div className="absolute -left-20 top-20 h-40 w-1 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent"></div>
        <div className="absolute -right-20 bottom-20 h-40 w-1 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent"></div>
        
        {/* Design flourish */}
        <div className="absolute bottom-12 right-12 flex items-center space-x-2 text-xs font-light text-blue-500/30">
          <div className="h-px w-10 bg-blue-500/20"></div>
          <span>SYSTEM ERROR</span>
        </div>
      </div>
      
      {/* CSS to handle custom styling and animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .blur-xs {
          filter: blur(1px);
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin_reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}