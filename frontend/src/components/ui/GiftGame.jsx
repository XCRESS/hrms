import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Play, RotateCcw, Pause, Star, ChevronUp, X } from 'lucide-react';

// Game Constants
const ROWS = 20;
const COLS = 10;
const SPEED_CURVE = [800, 720, 630, 550, 470, 380, 300, 220, 150, 110];
const LINES_PER_LEVEL = 3;

// Tetromino shapes with gradient colors
const TETROMINOS = {
  I: { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], colorFrom: 'from-cyan-400', colorTo: 'to-cyan-600' },
  J: { shape: [[1,0,0], [1,1,1], [0,0,0]], colorFrom: 'from-blue-500', colorTo: 'to-blue-700' },
  L: { shape: [[0,0,1], [1,1,1], [0,0,0]], colorFrom: 'from-orange-400', colorTo: 'to-orange-600' },
  O: { shape: [[1,1], [1,1]], colorFrom: 'from-yellow-300', colorTo: 'to-yellow-500' },
  S: { shape: [[0,1,1], [1,1,0], [0,0,0]], colorFrom: 'from-green-400', colorTo: 'to-green-600' },
  T: { shape: [[0,1,0], [1,1,1], [0,0,0]], colorFrom: 'from-purple-400', colorTo: 'to-purple-600' },
  Z: { shape: [[1,1,0], [0,1,1], [0,0,0]], colorFrom: 'from-red-400', colorTo: 'to-red-600' },
};

const SHAPE_KEYS = Object.keys(TETROMINOS);
const createEmptyGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// 7-Bag Randomizer
const generateBag = () => {
  const bag = [...SHAPE_KEYS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

const INITIAL_LEADERBOARD = [
  { name: 'Santa', score: 15000, level: 8 },
  { name: 'Rudolph', score: 8500, level: 5 },
  { name: 'Elf Buddy', score: 4200, level: 3 },
];

const GiftGame = ({ username = 'Player' }) => {
  // Game State
  const [grid, setGrid] = useState(createEmptyGrid());
  const [activePiece, setActivePiece] = useState(null);
  const [bag, setBag] = useState([]);
  const [nextQueue, setNextQueue] = useState([]);

  // Stats
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // App State
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Mobile controls - Enhanced gesture tracking
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const touchStartRef = useRef(null);
  const lastTouchRef = useRef(null);
  const isTapRef = useRef(false);
  const gameAreaRef = useRef(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState(() => {
    const saved = localStorage.getItem('christmas_tetris_arcade_scores');
    return saved ? JSON.parse(saved) : INITIAL_LEADERBOARD;
  });
  const [playerName, setPlayerName] = useState(username || 'Player');
  const [hasSavedScore, setHasSavedScore] = useState(false);

  // Update player name when username prop changes
  useEffect(() => {
    if (username) {
      setPlayerName(username);
    }
  }, [username]);

  // Loop Refs
  const requestRef = useRef(0);
  const lastTimeRef = useRef(0);

  // Detect mobile on mount
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    setShowMobileControls(isMobile);
  }, []);

  // Helper Functions
  const getNewPiece = (currentBag, currentQueue) => {
    let newBag = [...currentBag];
    let newQueue = [...currentQueue];

    while (newQueue.length < 4) {
      if (newBag.length === 0) newBag = generateBag();
      newQueue.push(newBag.pop());
    }

    const type = newQueue.shift();
    const { shape, colorFrom, colorTo } = TETROMINOS[type];

    const piece = {
      type,
      shape,
      colorFrom,
      colorTo,
      x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
      y: 0
    };

    return { piece, newBag, newQueue };
  };

  const checkCollision = (piece, gridCheck, moveX, moveY, candidateShape) => {
    const shape = candidateShape || piece.shape;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = piece.x + x + moveX;
          const newY = piece.y + y + moveY;

          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && gridCheck[newY][newX] !== null) return true;
        }
      }
    }
    return false;
  };

  const tryRotate = () => {
    if (!activePiece) return;
    const newShape = activePiece.shape[0].map((_, index) =>
      activePiece.shape.map(row => row[index]).reverse()
    );

    if (!checkCollision(activePiece, grid, 0, 0, newShape)) {
      setActivePiece({ ...activePiece, shape: newShape });
      return;
    }
    if (!checkCollision(activePiece, grid, 1, 0, newShape)) {
      setActivePiece({ ...activePiece, x: activePiece.x + 1, shape: newShape });
      return;
    }
    if (!checkCollision(activePiece, grid, -1, 0, newShape)) {
      setActivePiece({ ...activePiece, x: activePiece.x - 1, shape: newShape });
    }
  };

  const getGhostY = () => {
    if (!activePiece) return 0;
    let ghostY = activePiece.y;
    while (!checkCollision(activePiece, grid, 0, ghostY - activePiece.y + 1)) {
      ghostY++;
    }
    return ghostY;
  };

  const lockPiece = () => {
    if (!activePiece) return;

    const newGrid = grid.map(row => [...row]);
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          if (activePiece.y + y < 0) {
            setGameOver(true);
            setIsPlaying(false);
            return;
          }
          if (activePiece.y + y < ROWS) {
            newGrid[activePiece.y + y][activePiece.x + x] = `${activePiece.colorFrom} ${activePiece.colorTo}`;
          }
        }
      });
    });

    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (newGrid[y].every(cell => cell !== null)) {
        newGrid.splice(y, 1);
        newGrid.unshift(Array(COLS).fill(null));
        linesCleared++;
        y++;
      }
    }

    if (linesCleared > 0) {
      const basePoints = [0, 100, 300, 500, 800];
      const points = basePoints[linesCleared] * level;
      setScore(prev => prev + points);

      const newLines = lines + linesCleared;
      setLines(newLines);

      const newLevel = Math.floor(newLines / LINES_PER_LEVEL) + 1;
      if (newLevel > level && newLevel <= SPEED_CURVE.length) {
        setLevel(newLevel);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
      }
    }

    setGrid(newGrid);

    if (activePiece.y < 0) {
      setGameOver(true);
      setIsPlaying(false);
    } else {
      const { piece, newBag, newQueue } = getNewPiece(bag, nextQueue);
      if (checkCollision(piece, newGrid, 0, 0)) {
        setGameOver(true);
        setIsPlaying(false);
      } else {
        setActivePiece(piece);
        setBag(newBag);
        setNextQueue(newQueue);
      }
    }
  };

  const move = useCallback((dirX, dirY) => {
    if (!activePiece || gameOver || isPaused) return;

    if (!checkCollision(activePiece, grid, dirX, dirY)) {
      setActivePiece(prev => prev ? ({ ...prev, x: prev.x + dirX, y: prev.y + dirY }) : null);
      return true;
    }

    if (dirY > 0) {
      lockPiece();
      return false;
    }
    return false;
  }, [activePiece, grid, gameOver, isPaused]);

  // Enhanced Touch Controls for Mobile - Continuous tracking
  const handleTouchStart = (e) => {
    if (gameOver || isPaused) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    isTapRef.current = true;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || !lastTouchRef.current || gameOver || isPaused) return;
    const touch = e.touches[0];
    const dx = touch.clientX - lastTouchRef.current.x;
    const dy = touch.clientY - lastTouchRef.current.y;

    const threshold = 25; // Sensitivity for continuous movement

    // Horizontal movement
    if (Math.abs(dx) > threshold) {
      isTapRef.current = false;
      const steps = Math.floor(Math.abs(dx) / threshold);
      if (steps > 0) {
        const dir = dx > 0 ? 1 : -1;
        move(dir, 0);
        // Update lastTouch to prevent erratic jumping
        lastTouchRef.current.x += steps * threshold * dir;
      }
    }

    // Vertical movement (Soft Drop)
    if (dy > threshold) {
      isTapRef.current = false;
      const steps = Math.floor(dy / threshold);
      if (steps > 0) {
        move(0, 1);
        lastTouchRef.current.y += steps * threshold;
      }
    }
  };

  const handleTouchEnd = () => {
    // If movement was minimal, treat as Tap -> Rotate
    if (isTapRef.current && !gameOver && !isPaused) {
      tryRotate();
    }
    touchStartRef.current = null;
    lastTouchRef.current = null;
    isTapRef.current = false;
  };

  // Game Loop
  const tick = (time) => {
    if (!isPlaying || isPaused || gameOver) {
      requestRef.current = requestAnimationFrame(tick);
      return;
    }

    const speed = SPEED_CURVE[Math.min(level - 1, SPEED_CURVE.length - 1)];

    if (time - lastTimeRef.current > speed) {
      if (activePiece) {
        move(0, 1);
      }
      lastTimeRef.current = time;
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, gameOver, activePiece, level]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || isPaused || gameOver) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft': move(-1, 0); break;
        case 'ArrowRight': move(1, 0); break;
        case 'ArrowDown': move(0, 1); break;
        case 'ArrowUp': tryRotate(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, gameOver, move, tryRotate]);

  const startGame = () => {
    setGrid(createEmptyGrid());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPlaying(true);
    setIsPaused(false);
    setHasSavedScore(false);
    setShowLevelUp(false);

    let b = generateBag();
    const q = [];
    for(let i=0; i<4; i++) q.push(b.pop());

    const firstType = q.shift();
    const { shape, colorFrom, colorTo } = TETROMINOS[firstType];
    const firstPiece = { type: firstType, shape, colorFrom, colorTo, x: 3, y: 0 };

    if (b.length === 0) b = generateBag();
    q.push(b.pop());

    setActivePiece(firstPiece);
    setBag(b);
    setNextQueue(q);
  };

  const saveScore = () => {
    if (!playerName.trim()) return;
    const newEntry = { name: playerName, score: score, level: level };
    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setLeaderboard(newLeaderboard);
    localStorage.setItem('christmas_tetris_arcade_scores', JSON.stringify(newLeaderboard));
    setHasSavedScore(true);
  };

  // Render Helpers
  const renderMiniPiece = (type) => {
    if (!type) return <div className="w-full h-full"></div>;
    const { shape, colorFrom, colorTo } = TETROMINOS[type];
    return (
      <div className="grid gap-0.5 md:gap-1" style={{ gridTemplateColumns: `repeat(${shape[0].length}, 1fr)`}}>
        {shape.map((row, y) => row.map((val, x) => (
          <div key={`${y}-${x}`} className={`w-2 h-2 md:w-3 md:h-3 rounded-[1px] ${val ? `bg-gradient-to-br ${colorFrom} ${colorTo} shadow-sm` : 'bg-transparent'}`}></div>
        )))}
      </div>
    );
  };

  // Merged Grid Rendering
  const renderGrid = grid.map(row => [...row]);
  const ghostY = getGhostY();

  if (activePiece && isPlaying && !isPaused) {
    // Ghost piece
    activePiece.shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val !== 0) {
          const py = ghostY + y;
          const px = activePiece.x + x;
          if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
            if (!renderGrid[py][px]) renderGrid[py][px] = 'ghost';
          }
        }
      });
    });
    // Active piece
    activePiece.shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val !== 0) {
          const py = activePiece.y + y;
          const px = activePiece.x + x;
          if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
            renderGrid[py][px] = `${activePiece.colorFrom} ${activePiece.colorTo}`;
          }
        }
      });
    });
  }

  return (
    <div className="flex flex-col h-full w-full select-none">

      {/* MOBILE LAYOUT */}
      <div className="md:hidden flex flex-col h-full w-full relative">

        {/* Top Stats Bar - Floating Overlay */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-white/10 backdrop-blur-md">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Score</span>
            <span className="text-2xl font-mono font-bold text-yellow-400 leading-none">{score}</span>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Lvl</span>
              <span className="font-bold text-white leading-none">{level}</span>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded border border-slate-700 flex items-center justify-center">
              {nextQueue[0] && renderMiniPiece(nextQueue[0])}
            </div>
            <button
              onClick={() => isPlaying && !gameOver && setIsPaused(!isPaused)}
              className="text-white/50 hover:text-white p-1"
            >
              {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Game Board - Full Screen Mobile */}
        <div
          ref={gameAreaRef}
          className="w-full h-full relative bg-slate-950 overflow-hidden touch-none outline-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          {/* CRT Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]"></div>

          {/* Game Grid - Fullscreen aspect-ratio maintained */}
          <div className="grid grid-cols-10 grid-rows-20 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            {renderGrid.map((row, y) => (
              row.map((val, x) => {
                let cellClass = "rounded-[1px] transition-all duration-75 ";

                if (val === 'ghost') {
                  cellClass += "border-[1.5px] border-white/20 border-dashed bg-transparent";
                } else if (val) {
                  cellClass += `bg-gradient-to-br ${val} shadow-[inset_0_2px_0_rgba(255,255,255,0.4)] border border-black/10`;
                } else {
                  cellClass += "border border-white/5";
                }
                return <div key={`${y}-${x}`} className={cellClass}></div>;
              })
            ))}
          </div>

          {/* Touch Instructions Overlay - Show on first play */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm z-20">
              <div className="animate-bounce mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl rotate-12 flex items-center justify-center shadow-lg border border-white/20">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </div>
              <h3 className="text-3xl font-christmas text-yellow-300 drop-shadow-md mb-2">Block Party</h3>
              <div className="text-xs text-slate-300 mb-6 max-w-[200px]">
                Drag to move • Tap to rotate • Drag down to drop
              </div>
              <button
                onClick={startGame}
                className="bg-red-600 hover:bg-red-500 active:bg-red-500 text-white font-bold py-3 px-8 rounded-full shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
              >
                PLAY
              </button>
            </div>
          )}

          {/* Paused */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
              <h2 className="text-3xl font-bold text-white tracking-widest animate-pulse">PAUSED</h2>
            </div>
          )}

          {/* Level Up */}
          {showLevelUp && (
            <div className="absolute top-1/3 left-0 right-0 flex justify-center z-30 animate-bounce">
              <div className="bg-yellow-400 text-red-900 font-black text-xl px-6 py-2 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.6)] border-2 border-white">
                LEVEL {level}!
              </div>
            </div>
          )}

          {/* Game Over */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-md z-20">
              <h3 className="text-4xl font-christmas text-red-500 mb-4 drop-shadow-md">Game Over</h3>
              <div className="bg-slate-800/80 p-4 rounded-lg border border-white/10 mb-6 w-full text-center">
                <div className="text-xs text-slate-400 uppercase">Final Score</div>
                <div className="text-3xl font-bold text-yellow-400">{score}</div>
              </div>

              {!hasSavedScore ? (
                <div className="w-full mb-6">
                  <label className="block text-xs text-slate-400 mb-2 text-center">Save your highscore</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm flex-grow focus:outline-none focus:border-yellow-400"
                      placeholder="Your Name"
                    />
                    <button
                      onClick={saveScore}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-green-400 text-sm mb-6 font-bold flex items-center gap-2 justify-center">
                  <Trophy className="w-4 h-4" /> Saved to Leaderboard
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-full transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>

                <button
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-colors text-sm"
                >
                  <Trophy className="w-4 h-4" /> {showLeaderboard ? 'Hide' : 'View'} Leaderboard
                </button>
              </div>
            </div>
          )}

          {/* Mobile Leaderboard Slide-up */}
          {gameOver && showLeaderboard && (
            <div className="absolute inset-x-0 bottom-0 bg-slate-900/95 backdrop-blur-md rounded-t-3xl border-t-2 border-yellow-500/30 z-30 animate-slide-in-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[60%] overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-christmas text-white">Top Scores</h3>
                  </div>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2 overflow-y-auto max-h-[40vh]">
                  {leaderboard.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold text-lg w-6 text-center ${idx===0?'text-yellow-400':idx===1?'text-slate-300':'text-orange-400'}`}>
                          {idx+1}
                        </span>
                        <div>
                          <div className="text-white font-semibold truncate max-w-[150px]">{entry.name}</div>
                          <div className="text-xs text-slate-400">Level {entry.level}</div>
                        </div>
                      </div>
                      <span className="font-mono text-yellow-400 font-bold text-lg">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP LAYOUT - Original Design */}
      <div className="hidden md:flex md:flex-row gap-0 md:gap-6 h-full select-none justify-center items-center md:items-start w-full md:max-w-[800px] relative">

        {/* Game Board with Cabinet */}
        <div className="relative flex-grow md:flex-grow-0 flex items-center justify-center w-full h-full md:h-auto overflow-hidden outline-none touch-none">
          {/* Desktop Premium Cabinet Shell - Hidden on Mobile */}
          <div className="hidden md:block absolute -inset-6 rounded-2xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            {/* Inner Frame */}
            <div className="absolute inset-3 rounded-xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-4 border-yellow-600/30 shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)]">
              {/* Decorative Corners */}
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-yellow-500/50"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-yellow-500/50"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-yellow-500/50"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-yellow-500/50"></div>
            </div>
            {/* Side Glow Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent"></div>
          </div>

          <div className="relative z-10 bg-slate-950 md:border-2 md:border-slate-700 md:rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] aspect-[1/2] h-full max-h-full md:h-[560px] md:max-h-[560px] w-auto"
               style={{ width: '280px', height: '560px' }}>

            {/* CRT Scanline Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]"></div>

            {/* Grid */}
            <div className="grid grid-cols-10 grid-rows-20 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
              {renderGrid.map((row, y) => (
                row.map((val, x) => {
                  let cellClass = "rounded-[2px] transition-all duration-75 ";

                  if (val === 'ghost') {
                    cellClass += "border-2 border-white/20 border-dashed bg-transparent";
                  } else if (val) {
                    cellClass += `bg-gradient-to-br ${val} shadow-[inset_0_2px_0_rgba(255,255,255,0.4)] border border-black/10`;
                  } else {
                    cellClass += "border border-white/5";
                  }
                  return <div key={`${y}-${x}`} className={cellClass}></div>;
                })
              ))}
            </div>

            {/* Level Up */}
            {showLevelUp && (
              <div className="absolute top-1/3 left-0 right-0 flex justify-center z-30 animate-bounce">
                <div className="bg-yellow-400 text-red-900 font-black text-2xl px-6 py-2 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.6)] border-2 border-white rotate-[-5deg]">
                  LEVEL UP!
                </div>
              </div>
            )}

            {/* Start Screen */}
            {!isPlaying && !gameOver && !isPaused && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm z-20">
                <div className="animate-bounce mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl rotate-12 flex items-center justify-center shadow-lg border border-white/20">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
                <h3 className="text-3xl font-christmas text-yellow-300 drop-shadow-md mb-2">Block Party</h3>
                <button
                  onClick={startGame}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
                >
                  PLAY
                </button>
              </div>
            )}

            {/* Paused */}
            {isPaused && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
                <h2 className="text-3xl font-bold text-white tracking-widest animate-pulse">PAUSED</h2>
              </div>
            )}

            {/* Game Over */}
            {gameOver && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-md z-20">
                <h3 className="text-4xl font-bold text-red-500 mb-4 drop-shadow-md">Game Over</h3>
                <div className="bg-slate-800/80 p-4 rounded-lg border border-white/10 mb-6 w-full text-center">
                  <div className="text-xs text-slate-400 uppercase">Final Score</div>
                  <div className="text-3xl font-bold text-yellow-400">{score}</div>
                </div>

                {!hasSavedScore ? (
                  <div className="w-full mb-6">
                    <label className="block text-xs text-slate-400 mb-2 text-center">Save your highscore</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm flex-grow focus:outline-none focus:border-yellow-400"
                        placeholder="Your Name"
                      />
                      <button
                        onClick={saveScore}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-green-400 text-sm mb-6 font-bold flex items-center gap-2 justify-center">
                    <Trophy className="w-4 h-4" /> Saved to Leaderboard
                  </div>
                )}

                <button
                  onClick={startGame}
                  className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
              </div>
            )}

            {/* Desktop Pause Btn (Hidden Mobile) */}
            <button
              onClick={() => isPlaying && !gameOver && setIsPaused(!isPaused)}
              className="hidden md:block absolute top-3 right-3 text-white/30 hover:text-white z-30 transition-opacity"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Sidebar (Hidden on Mobile) */}
        <div className="hidden md:flex flex-col gap-4 w-64 h-[560px]">

          {/* Stats */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="w-16 h-16 text-yellow-500" /></div>

            <div className="mb-4 relative z-10">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Score</div>
              <div className="text-4xl font-mono font-bold text-yellow-400 drop-shadow-sm">{score}</div>
            </div>

            <div className="flex gap-4 relative z-10">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Level</div>
                <div className="text-xl font-bold text-white">{level}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Lines</div>
                <div className="text-xl font-bold text-white">{lines}</div>
              </div>
            </div>
          </div>

          {/* Next Piece */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-xl flex flex-col items-center">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 w-full text-center border-b border-white/5 pb-2">Next Up</div>
            <div className="flex gap-4 justify-center items-center h-16">
              {nextQueue.slice(0, 2).map((type, i) => (
                <div key={i} className={`transform ${i === 0 ? 'scale-100 opacity-100' : 'scale-75 opacity-50'}`}>
                  {renderMiniPiece(type)}
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl flex-grow flex flex-col overflow-hidden min-h-[150px]">
            <div className="p-3 bg-red-900/20 border-b border-white/5 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-white">Top Players</span>
            </div>
            <div className="p-2 space-y-1 overflow-y-auto">
              {leaderboard.map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-white/5 hover:bg-white/10 transition-colors text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold w-4 text-center ${idx===0?'text-yellow-400':idx===1?'text-slate-300':'text-orange-400'}`}>{idx+1}</span>
                    <span className="text-slate-200 truncate max-w-[80px]">{entry.name}</span>
                  </div>
                  <span className="font-mono text-yellow-100/80">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GiftGame;
