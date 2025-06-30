import React, { useEffect, useState } from "react";
import clsx from "clsx";

const combinations = [
  { configuration: 1, roundness: 1 },
  { configuration: 1, roundness: 2 },
  { configuration: 1, roundness: 4 },
  { configuration: 2, roundness: 2 },
  { configuration: 2, roundness: 3 },
  { configuration: 3, roundness: 3 },
];

const getRandomIndex = (prev) => {
  let next = prev;
  while (next === prev) {
    next = Math.floor(Math.random() * combinations.length);
  }
  return next;
};

const shapeBase = "absolute transition-all duration-[750ms] ease-in-out";

const shapeColors = [
  "bg-[rgb(176,190,197)] z-[2]", // Shape 1: light gray-blue
  "bg-[rgb(245,245,245)] z-[2]", // Shape 2: very light gray/white
  "bg-[rgb(155,93,229)] z-[1]",  // Shape 3: purple
  "bg-[rgb(241,91,181)] z-[2]",  // Shape 4: pink
  "bg-[rgb(254,228,64)] z-[2]",  // Shape 5: yellow
  "bg-[rgb(0,187,249)] z-[2]",   // Shape 6: blue
  "bg-[rgb(0,245,212)] z-[2]",   // Shape 7: teal/cyan
];

const LoaderGate = ({ serverUrl, children }) => {
  const [isReady, setIsReady] = useState(false);
  const [config, setConfig] = useState(combinations[0]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Animate
  useEffect(() => {
    let prev = 0;
    const interval = setInterval(() => {
      const index = getRandomIndex(prev);
      setConfig(combinations[index]);
      prev = index;
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  // Ping with enhanced production server handling
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 30; // Allow up to 1 minute of retries for cold start
    const isProduction = !serverUrl.includes('localhost') && !serverUrl.includes('127.0.0.1');
    
    const pingServer = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Use a health check endpoint or fallback to base URL
        const healthCheckUrl = `${serverUrl}/health`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), isProduction ? 15000 : 5000);
        
        const res = await fetch(healthCheckUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          setConnectionStatus('connected');
          setTimeout(() => setIsReady(true), 500);
          return;
        } else if (res.status === 404) {
          // Health check endpoint doesn't exist, try base URL
          const baseRes = await fetch(serverUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (baseRes.ok || baseRes.status === 404) {
            // Server is responding, even if with 404
            setConnectionStatus('connected');
            setTimeout(() => setIsReady(true), 500);
            return;
          }
        }
        
        throw new Error(`Server responded with status: ${res.status}`);
      } catch (error) {
        retryCount++;
        console.log(`Connection attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          setConnectionStatus('failed');
          // Still allow app to load after max retries
          setTimeout(() => setIsReady(true), 2000);
          return;
        }
        
        setConnectionStatus(isProduction ? 'cold-start' : 'retrying');
        
        // Exponential backoff with jitter for production
        const baseDelay = isProduction ? 3000 : 2000;
        const backoffMultiplier = Math.min(1.5 ** retryCount, 4);
        const jitter = Math.random() * 1000;
        const delay = baseDelay * backoffMultiplier + jitter;
        
        setTimeout(pingServer, delay);
      }
    };
    
    pingServer();
  }, [serverUrl]);

  // Return app
  if (isReady) {
    return children;
  }

  return (
    <div className="h-screen w-screen grid place-items-center bg-[rgb(19,19,19)] overflow-hidden">
      <div className="relative w-[90vmin] aspect-[1.618] max-w-md">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={clsx(
              shapeBase,
              shapeColors[i],
              getShapeStyles(config.configuration, i + 1),
              getRoundnessStyles(config.roundness, i + 1)
            )}
          ></div>
        ))}
        
        {/* Status indicator */}
        <div className="absolute bottom-[-4rem] left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-white text-lg font-medium mb-2">
            {connectionStatus === 'connecting' && 'Connecting to server...'}
            {connectionStatus === 'retrying' && 'Server starting up...'}
            {connectionStatus === 'cold-start' && 'Server waking up...'}
            {connectionStatus === 'failed' && 'Connection timeout - Loading anyway...'}
            {connectionStatus === 'connected' && 'Connected!'}
          </div>
          <div className="text-gray-300 text-sm">
            {connectionStatus === 'cold-start' && 'Production server is starting, this may take up to a minute...'}
            {connectionStatus === 'failed' && 'Unable to reach server, but the app will still work...'}
            {connectionStatus === 'connecting' && 'Please wait while we connect...'}
            {connectionStatus === 'retrying' && 'Please wait while we connect...'}
            {connectionStatus === 'connected' && 'Ready to go!'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Dynamic layout (instead of CSS data attributes)
const getShapeStyles = (config, index) => {
  const styles = {
    1: [
      "left-0 top-0 h-1/2 w-[20%]",
      "left-[20%] top-0 h-1/2 w-[30%]",
      "left-[50%] top-0 h-full w-1/2",
      "left-0 top-1/2 h-1/2 w-[30%]",
      "left-[30%] top-1/2 h-1/2 w-[20%]",
      "left-[70%] top-1/2 h-1/2 w-[30%]",
      "left-[85%] top-[75%] h-[25%] w-[15%]",
    ],
    2: [
      "left-[25%] top-[20%] h-[80%] w-[15%]",
      "left-[40%] top-[20%] h-1/2 w-[10%]",
      "left-[50%] top-0 h-full w-[25%]",
      "left-0 top-0 h-1/2 w-[10%]",
      "left-[10%] top-0 h-[70%] w-[15%]",
      "left-[75%] top-[10%] h-[80%] w-[15%]",
      "left-[90%] top-[40%] h-[60%] w-[10%]",
    ],
    3: [
      "left-0 top-[16.5%] h-[32%] w-[20%]",
      "left-[20%] top-[2.7%] h-[55%] w-[34%]",
      "left-[38%] top-0 h-full w-[62%]",
      "left-0 top-[47.3%] h-[55%] w-[34%]",
      "left-[34%] top-[56.4%] h-[32%] w-[20%]",
      "left-[66%] top-[45%] h-[55%] w-[34%]",
      "left-[80%] top-[68%] h-[32%] w-[20%]",
    ],
  };

  return styles[config]?.[index - 1] || "";
};

// Roundness styles
const getRoundnessStyles = (roundness, index) => {
  const base = {
    1: "rounded-[6rem]",
    2: "rounded-none",
    3: "rounded-[30rem]",
    4: {
      1: "rounded-bl-[10rem]",
      2: "rounded-[20rem]",
      3: "rounded-tr-[12rem]",
      4: "rounded-tr-[10rem] rounded-br-[10rem]",
      5: "rounded-bl-[10rem]",
      6: "rounded-tl-[16rem]",
      7: "rounded-tl-[10rem]",
    },
  };

  if (roundness === 4) return base[4][index] || "";
  return base[roundness] || "";
};

export default LoaderGate;
