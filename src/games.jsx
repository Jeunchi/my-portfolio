import { useState, useEffect, useCallback, useRef } from "react";

/* ─────────────────────────────────────────────────────────────
   SHARED ANIMATION STYLES (injected once into <head>)
───────────────────────────────────────────────────────────── */
const GAME_STYLES = `
/* ── Sudoku ─────────────────────────────────────── */
@keyframes sudokuPop {
  0%   { transform: scale(0.3) rotate(-10deg); opacity: 0; }
  55%  { transform: scale(1.2) rotate(2deg);   opacity: 1; }
  80%  { transform: scale(0.93) rotate(-1deg); }
  100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
}
@keyframes sudokuErr {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-6px); }
  40%     { transform: translateX(6px); }
  60%     { transform: translateX(-4px); }
  80%     { transform: translateX(4px); }
}
@keyframes sudokuErase {
  0%   { transform: scale(1);   opacity: 1; }
  40%  { transform: scale(1.3); opacity: 0.4; }
  100% { transform: scale(0);   opacity: 0; }
}
@keyframes sudokuCursorPulse {
  0%,100% { box-shadow: inset 0 0 0 3px #7c3aed; }
  50%     { box-shadow: inset 0 0 0 3px #c9a8e8, 0 0 12px rgba(124,58,237,0.35); }
}
@keyframes sudokuWin {
  0%   { transform: scale(1)    rotate(0deg); }
  30%  { transform: scale(1.14) rotate(3deg); }
  60%  { transform: scale(0.96) rotate(-2deg); }
  100% { transform: scale(1)    rotate(0deg); }
}
@keyframes puzzleSwap {
  0%   { opacity: 1; transform: scale(1); }
  40%  { opacity: 0; transform: scale(0.85); }
  60%  { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.sudoku-cell-val               { display: inline-block; line-height: 1; }
.sudoku-cell-val.anim-pop      { animation: sudokuPop   0.32s cubic-bezier(0.22,1,0.36,1) both; }
.sudoku-cell-val.anim-err      { animation: sudokuErr   0.35s ease both; }
.sudoku-cell-val.anim-erase    { animation: sudokuErase 0.22s ease both; }
.sudoku-sel                    { animation: sudokuCursorPulse 1.4s ease-in-out infinite !important; }
.sudoku-win-cell               { animation: sudokuWin   0.5s ease both; }
.sudoku-puzzle-swap            { animation: puzzleSwap  0.5s ease both; }

/* ── 2048 ────────────────────────────────────────── */
@keyframes tileAppear {
  0%   { transform: scale(0);    opacity: 0; }
  60%  { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
@keyframes tileMerge {
  0%   { transform: scale(1);    }
  35%  { transform: scale(1.25); }
  65%  { transform: scale(0.95); }
  100% { transform: scale(1);    }
}
@keyframes boardShake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-5px); }
  45%     { transform: translateX(5px); }
  65%     { transform: translateX(-3px); }
  82%     { transform: translateX(3px); }
}
.tile-appear { animation: tileAppear 0.2s  cubic-bezier(0.22,1,0.36,1) both; }
.tile-merge  { animation: tileMerge  0.22s cubic-bezier(0.22,1,0.36,1) both; }
.board-shake { animation: boardShake 0.3s  ease both; }

/* ── Minesweeper ─────────────────────────────────── */
@keyframes cellReveal {
  0%   { transform: scale(0.55) rotateY(90deg); opacity: 0; }
  60%  { transform: scale(1.06) rotateY(-4deg); opacity: 1; }
  100% { transform: scale(1)    rotateY(0deg);  opacity: 1; }
}
@keyframes flagPlace {
  0%   { transform: scale(0)   rotate(-20deg); opacity: 0; }
  60%  { transform: scale(1.3) rotate(5deg);   opacity: 1; }
  100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
}
@keyframes flagRemove {
  0%   { transform: scale(1)  rotate(0deg);  opacity: 1; }
  100% { transform: scale(0)  rotate(20deg); opacity: 0; }
}
@keyframes mineExplode {
  0%   { transform: scale(1);    background: #fde8e8; }
  30%  { transform: scale(1.4);  background: #fca5a5; }
  60%  { transform: scale(0.9);  background: #fde8e8; }
  100% { transform: scale(1);    background: #fde8e8; }
}
@keyframes winPulse {
  0%,100% { background: #c9a8e8; }
  50%     { background: #a78bfa; }
}
.ms-cell-inner { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.anim-reveal   { animation: cellReveal  0.28s cubic-bezier(0.22,1,0.36,1) both; }
.anim-flag     { animation: flagPlace   0.22s cubic-bezier(0.22,1,0.36,1) both; }
.anim-unflag   { animation: flagRemove  0.18s ease both; }
.anim-explode  { animation: mineExplode 0.42s ease both; }
.ms-win-cell   { animation: winPulse    0.9s  ease-in-out infinite; }
`;

function injectStyles() {
  if (document.getElementById("game-styles")) return;
  const el = document.createElement("style");
  el.id = "game-styles";
  el.textContent = GAME_STYLES;
  document.head.appendChild(el);
}

/* ═══════════════════════════════════════════════════════════
   SUDOKU — multiple puzzles, picks a new one on every reset
═══════════════════════════════════════════════════════════ */

// Each entry: [puzzle, solution]  (0 = empty cell)
const SUDOKU_BANK = [
  // Puzzle 1
  [
    [[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],
     [8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],
     [0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],
    [[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
     [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
     [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]],
  ],
  // Puzzle 2
  [
    [[0,0,0,2,6,0,7,0,1],[6,8,0,0,7,0,0,9,0],[1,9,0,0,0,4,5,0,0],
     [8,2,0,1,0,0,0,4,0],[0,0,4,6,0,2,9,0,0],[0,5,0,0,0,3,0,2,8],
     [0,0,9,3,0,0,0,7,4],[0,4,0,0,5,0,0,3,6],[7,0,3,0,1,8,0,0,0]],
    [[4,3,5,2,6,9,7,8,1],[6,8,2,5,7,1,4,9,3],[1,9,7,8,3,4,5,6,2],
     [8,2,6,1,9,5,3,4,7],[3,7,4,6,8,2,9,1,5],[9,5,1,7,4,3,6,2,8],
     [5,1,9,3,2,6,8,7,4],[2,4,8,9,5,7,1,3,6],[7,6,3,4,1,8,2,5,9]],
  ],
  // Puzzle 3
  [
    [[0,2,0,6,0,8,0,0,0],[5,8,0,0,0,9,7,0,0],[0,0,0,0,4,0,0,0,0],
     [3,7,0,0,0,0,5,0,0],[6,0,0,0,0,0,0,0,4],[0,0,8,0,0,0,0,1,3],
     [0,0,0,0,2,0,0,0,0],[0,0,9,8,0,0,0,3,6],[0,0,0,3,0,6,0,9,0]],
    [[1,2,3,6,7,8,9,4,5],[5,8,4,2,3,9,7,6,1],[9,6,7,1,4,5,3,2,8],
     [3,7,2,4,6,1,5,8,9],[6,9,1,5,8,3,2,7,4],[4,5,8,7,9,2,6,1,3],
     [8,3,6,9,2,4,1,5,7],[2,1,9,8,5,7,4,3,6],[7,4,5,3,1,6,8,9,2]],
  ],
  // Puzzle 4
  [
    [[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,3,0,8,5],[0,0,1,0,2,0,0,0,0],
     [0,0,0,5,0,7,0,0,0],[0,0,4,0,0,0,1,0,0],[0,9,0,0,0,0,0,0,0],
     [5,0,0,0,0,0,0,7,3],[0,0,2,0,1,0,0,0,0],[0,0,0,0,4,0,0,0,9]],
    [[9,8,7,6,5,4,3,2,1],[2,4,6,1,7,3,9,8,5],[3,5,1,9,2,8,7,4,6],
     [1,2,8,5,3,7,6,9,4],[6,3,4,8,9,2,1,5,7],[7,9,5,4,6,1,8,3,2],
     [5,1,9,2,8,6,4,7,3],[4,7,2,3,1,9,5,6,8],[8,6,3,7,4,5,2,1,9]],
  ],
  // Puzzle 5
  [
    [[1,0,0,4,8,9,0,0,6],[7,3,0,0,0,0,0,4,0],[0,0,0,0,0,1,2,9,5],
     [0,0,7,1,2,0,6,0,0],[5,0,0,7,0,3,0,0,8],[0,0,6,0,9,5,7,0,0],
     [9,1,4,6,0,0,0,0,0],[0,2,0,0,0,0,0,3,7],[8,0,0,5,1,2,0,0,4]],
    [[1,5,2,4,8,9,3,7,6],[7,3,9,2,5,6,8,4,1],[4,6,8,3,7,1,2,9,5],
     [3,8,7,1,2,4,6,5,9],[5,9,1,7,6,3,4,2,8],[2,4,6,8,9,5,7,1,3],
     [9,1,4,6,3,7,5,8,2],[6,2,5,9,4,8,1,3,7],[8,7,3,5,1,2,9,6,4]],
  ],
];

function pickPuzzle(excludeIdx = -1) {
  let idx;
  do { idx = Math.floor(Math.random() * SUDOKU_BANK.length); }
  while (SUDOKU_BANK.length > 1 && idx === excludeIdx);
  return idx;
}

function Sudoku() {
  const [puzzleIdx, setPuzzleIdx] = useState(() => pickPuzzle());
  const [board,     setBoard]     = useState(() => SUDOKU_BANK[0][0].map(r => [...r]));
  const [selected,  setSelected]  = useState([0, 0]);
  const [errors,    setErrors]    = useState({});
  const [anims,     setAnims]     = useState({});
  const [won,       setWon]       = useState(false);
  const [winCells,  setWinCells]  = useState({});
  const [swapping,  setSwapping]  = useState(false);
  const wrapRef = useRef(null);

  // Initialize from chosen puzzle
  useEffect(() => {
    const [puzzle] = SUDOKU_BANK[puzzleIdx];
    setBoard(puzzle.map(r => [...r]));
    setErrors({});
    setAnims({});
    setWon(false);
    setWinCells({});
    setSelected([0, 0]);
  }, [puzzleIdx]);

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => { wrapRef.current?.focus(); }, []);

  const puzzle   = SUDOKU_BANK[puzzleIdx][0];
  const solution = SUDOKU_BANK[puzzleIdx][1];

  function triggerAnim(r, c, type) {
    const key = `${r}-${c}`;
    setAnims(prev => ({ ...prev, [key]: type }));
    setTimeout(() => setAnims(prev => { const n = { ...prev }; delete n[key]; return n; }), 420);
  }

  function select(r, c) {
    setSelected([r, c]);
    wrapRef.current?.focus();
  }

  function inputNum(num) {
    if (!selected || won) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== 0) return;

    if (num === 0) {
      triggerAnim(r, c, "erase");
      setTimeout(() => {
        setBoard(prev => { const nb = prev.map(row => [...row]); nb[r][c] = 0; return nb; });
        setErrors(prev => { const n = { ...prev }; delete n[`${r}-${c}`]; return n; });
      }, 160);
      return;
    }

    const correct = num === solution[r][c];
    triggerAnim(r, c, correct ? "pop" : "err");

    setBoard(prev => {
      const nb = prev.map(row => [...row]);
      nb[r][c] = num;
      const complete = nb.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]));
      if (complete) {
        setWon(true);
        const wc = {};
        for (let wr = 0; wr < 9; wr++)
          for (let wc2 = 0; wc2 < 9; wc2++)
            wc[`${wr}-${wc2}`] = (wr * 9 + wc2) * 18;
        setWinCells(wc);
      }
      return nb;
    });

    setErrors(prev => {
      const n = { ...prev };
      if (!correct) n[`${r}-${c}`] = true;
      else delete n[`${r}-${c}`];
      return n;
    });
  }

  function handleKey(e) {
    if (won) return;
    const [r, c] = selected || [0, 0];
    const moves = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      setSelected([Math.max(0, Math.min(8, r + dr)), Math.max(0, Math.min(8, c + dc))]);
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { inputNum(0); return; }
    const n = parseInt(e.key);
    if (n >= 1 && n <= 9) inputNum(n);
  }

  function newPuzzle() {
    // Animate the board out, swap puzzle, animate back in
    setSwapping(true);
    setTimeout(() => {
      setPuzzleIdx(prev => pickPuzzle(prev));
      setSwapping(false);
      wrapRef.current?.focus();
    }, 280);
  }

  return (
    <div
      className="game-wrap"
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={handleKey}
      style={{ outline: "none" }}
    >
      <h3 className="game-title">SUDOKU</h3>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap", justifyContent:"center" }}>
        {won && <div className="game-win">🎉 Solved!</div>}
        <span style={{ fontFamily:"'Special Elite',cursive", fontSize:"0.68rem", color:"#999" }}>
          Puzzle {puzzleIdx + 1} of {SUDOKU_BANK.length}
        </span>
      </div>
      <p style={{ fontFamily:"'Special Elite',cursive", fontSize:"0.7rem", color:"#aaa", marginTop:"-4px" }}>
        Arrow keys to move · 1–9 to fill · Backspace to erase
      </p>

      <div className={`sudoku-grid ${swapping ? "sudoku-puzzle-swap" : ""}`}>
        {board.map((row, r) =>
          row.map((val, c) => {
            const key     = `${r}-${c}`;
            const fixed   = puzzle[r][c] !== 0;
            const isSel   = selected && selected[0] === r && selected[1] === c;
            const sameRow = selected && selected[0] === r;
            const sameCol = selected && selected[1] === c;
            const sameBox = selected &&
              Math.floor(selected[0]/3) === Math.floor(r/3) &&
              Math.floor(selected[1]/3) === Math.floor(c/3);
            const isErr   = errors[key];
            const anim    = anims[key];
            const isWin   = winCells[key] !== undefined;

            const hlClass = isSel ? "sudoku-sel"
              : (sameRow || sameCol || sameBox) ? "sudoku-hl" : "";
            const brR = (c+1)%3===0 && c!==8 ? "sudoku-border-r" : "";
            const brB = (r+1)%3===0 && r!==8 ? "sudoku-border-b" : "";

            return (
              <div
                key={key}
                className={`sudoku-cell ${fixed?"sudoku-fixed":""} ${hlClass} ${isErr?"sudoku-err":""} ${brR} ${brB} ${isWin&&!fixed?"sudoku-win-cell":""}`}
                style={isWin && !fixed ? { animationDelay:`${winCells[key]}ms` } : {}}
                onClick={() => select(r, c)}
              >
                {val !== 0 ? (
                  <span
                    key={`${key}-${val}-${anim||"idle"}`}
                    className={`sudoku-cell-val ${anim ? `anim-${anim}` : ""}`}
                  >
                    {val}
                  </span>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="sudoku-numpad">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="sudoku-num" onClick={() => inputNum(n)}>{n}</button>
        ))}
        <button className="sudoku-num sudoku-erase" onClick={() => inputNum(0)}>✕</button>
      </div>

      <button className="game-btn" onClick={newPuzzle}>NEW PUZZLE ↺</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   2048 — tiles are absolutely positioned objects with ids,
   so we can animate them sliding to their new positions.
═══════════════════════════════════════════════════════════ */

// Each tile is { id, value, r, c, merging, isNew }
let _nextId = 1;
function uid() { return _nextId++; }

function makeInitialTiles() {
  const empties = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) empties.push([r, c]);
  shuffle(empties);
  return [
    { id: uid(), value: Math.random()<0.9?2:4, r: empties[0][0], c: empties[0][1], merging:false, isNew:true },
    { id: uid(), value: Math.random()<0.9?2:4, r: empties[1][0], c: empties[1][1], merging:false, isNew:true },
  ];
}

function shuffle(arr) {
  for (let i = arr.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// Returns new tile list after applying a move direction.
// Each tile gets its destination r/c set; merging tiles are flagged.
function moveTiles(tiles, dir) {
  // Build a 4x4 grid of tile ids
  const grid = Array.from({length:4}, () => Array(4).fill(null));
  tiles.forEach(t => { if (!t.merging) grid[t.r][t.c] = t.id; });

  const byId = {};
  tiles.forEach(t => { byId[t.id] = { ...t, merging:false, isNew:false }; });

  let moved = false;
  let score = 0;
  const newTiles = [];
  const consumed = new Set(); // ids that got merged into another tile

  // Vectors and iteration order for each direction
  const vectors = {
    left:  { dr:0,  dc:-1, rs:[0,1,2,3], cs:[0,1,2,3] },
    right: { dr:0,  dc:1,  rs:[0,1,2,3], cs:[3,2,1,0] },
    up:    { dr:-1, dc:0,  rs:[0,1,2,3], cs:[0,1,2,3] },
    down:  { dr:1,  dc:0,  rs:[3,2,1,0], cs:[0,1,2,3] },
  };
  const { dr, dc, rs, cs } = vectors[dir];

  // Track which cells are now occupied and whether they've been merged this turn
  const occupied = Array.from({length:4}, () => Array(4).fill(null)); // null or {id, merged}
  tiles.forEach(t => { occupied[t.r][t.c] = { id:t.id, merged:false }; });

  // Clear occupied grid — we'll rebuild it
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) occupied[r][c] = null;

  for (const r of rs) {
    for (const c of cs) {
      const id = grid[r][c];
      if (!id) continue;
      const tile = byId[id];

      let tr = r, tc = c;
      // Slide as far as possible
      while (true) {
        const nr = tr + dr, nc = tc + dc;
        if (nr < 0 || nr > 3 || nc < 0 || nc > 3) break;
        if (occupied[nr][nc]) break;
        tr = nr; tc = nc;
      }

      // Check if we can merge with the tile already at (tr+dr, tc+dc)
      const nr = tr + dr, nc = tc + dc;
      if (
        nr >= 0 && nr <= 3 && nc >= 0 && nc <= 3 &&
        occupied[nr][nc] &&
        !occupied[nr][nc].merged &&
        byId[occupied[nr][nc].id].value === tile.value
      ) {
        // Merge: move this tile to (nr,nc), mark the target consumed
        const targetId = occupied[nr][nc].id;
        const newVal   = tile.value * 2;
        score += newVal;
        if (r !== nr || c !== nc) moved = true;

        // The tile that was already there becomes the merge destination
        byId[targetId] = { ...byId[targetId], r:nr, c:nc, value:newVal, merging:true };
        occupied[nr][nc] = { id:targetId, merged:true };

        // This tile moves to (nr,nc) too but will be consumed (hidden after anim)
        byId[id] = { ...tile, r:nr, c:nc, merging:false };
        consumed.add(id);
        moved = true;
      } else {
        // Just slide
        if (tr !== r || tc !== c) moved = true;
        byId[id] = { ...tile, r:tr, c:tc };
        occupied[tr][tc] = { id, merged:false };
      }
    }
  }

  if (!moved) return { tiles, score:0, moved:false };

  // Build final tile list (exclude consumed tiles after they've animated)
  const result = Object.values(byId).filter(t => !consumed.has(t.id) || t.merging === false);
  // Actually keep consumed for the slide animation, mark them consumed
  const allTiles = Object.values(byId).map(t => ({ ...t, consumed: consumed.has(t.id) }));

  return { tiles: allTiles, score, moved };
}

function addRandomTile(tiles) {
  const occupied = new Set(tiles.filter(t=>!t.consumed).map(t=>`${t.r}-${t.c}`));
  const empties = [];
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) if (!occupied.has(`${r}-${c}`)) empties.push([r,c]);
  if (!empties.length) return tiles;
  const [r,c] = empties[Math.floor(Math.random()*empties.length)];
  return [...tiles, { id:uid(), value:Math.random()<0.9?2:4, r, c, merging:false, isNew:true, consumed:false }];
}

function hasAnyMove(tiles) {
  const grid = Array.from({length:4},()=>Array(4).fill(0));
  tiles.filter(t=>!t.consumed).forEach(t=>{ grid[t.r][t.c]=t.value; });
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
    if (!grid[r][c]) return true;
    if (c<3 && grid[r][c]===grid[r][c+1]) return true;
    if (r<3 && grid[r][c]===grid[r+1][c]) return true;
  }
  return false;
}

const TILE_COLORS = {
  0:"#efefef",    2:"#f5f0e8",    4:"#ede8d0",    8:"#c9a8e8",
  16:"#b090d8",   32:"#9878c8",   64:"#7c60b8",   128:"#f9c74f",
  256:"#f8961e",  512:"#f3722c",  1024:"#ef4444", 2048:"#1a1a1a",
};

const DIR_NUDGE = {
  up:    {x:0,  y:-5},
  down:  {x:0,  y:5 },
  left:  {x:-5, y:0 },
  right: {x:5,  y:0 },
};

// TILE_SIZE + GAP must match the CSS grid
const CELL = 72; // px per cell including gap — must match CSS .g2048-grid
const GAP  = 6;

function Game2048() {
  const [tiles,      setTiles]      = useState(makeInitialTiles);
  const [score,      setScore]      = useState(0);
  const [best,       setBest]       = useState(0);
  const [over,       setOver]       = useState(false);
  const [won,        setWon]        = useState(false);
  const [shaking,    setShaking]    = useState(false);
  const [pressedDir, setPressedDir] = useState(null);
  // Track which tile ids are "sliding" so we can apply the transition
  const [sliding,    setSliding]    = useState(false);
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  useEffect(() => { injectStyles(); }, []);

  const move = useCallback((dir) => {
    if (over) return;

    setPressedDir(dir);
    setTimeout(() => setPressedDir(null), 200);

    const { tiles: movedTiles, score:s, moved } = moveTiles(tilesRef.current, dir);

    if (!moved) {
      setShaking(true);
      setTimeout(() => setShaking(false), 320);
      return;
    }

    // Phase 1: apply positions with CSS transition ON so tiles slide
    setSliding(true);
    setTiles(movedTiles);

    // Phase 2: after slide anim (~120ms), remove consumed tiles + add new tile
    setTimeout(() => {
      const cleaned = movedTiles
        .filter(t => !t.consumed)
        .map(t => ({ ...t, merging:false, isNew:false }));
      const withNew = addRandomTile(cleaned);
      setTiles(withNew);

      setScore(prev => {
        const ns = prev + s;
        setBest(b => Math.max(b, ns));
        return ns;
      });

      if (withNew.some(t => t.value === 2048)) setWon(true);
      if (!hasAnyMove(withNew)) setOver(true);

      // Turn transitions back off briefly so next move starts clean
      setTimeout(() => setSliding(false), 60);
    }, 130);
  }, [over]);

  useEffect(() => {
    const map = { ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down" };
    function onKey(e) { if (map[e.key]) { e.preventDefault(); move(map[e.key]); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  function reset() {
    setTiles(makeInitialTiles());
    setScore(0); setOver(false); setWon(false);
    setSliding(false); setShaking(false);
  }

  const arrows = [
    { dir:"up",    label:"▲", row:1, col:2 },
    { dir:"left",  label:"◄", row:2, col:1 },
    { dir:"down",  label:"▼", row:2, col:2 },
    { dir:"right", label:"►", row:2, col:3 },
  ];

  // Grid size in px (4 cells + 5 gaps on each side + outer padding of 6px each side)
  const BOARD_SIZE = 4 * CELL + 5 * GAP;

  return (
    <div className="game-wrap">
      <h3 className="game-title">2048</h3>
      <div className="g2048-scores">
        <div className="g2048-score"><span>SCORE</span><strong>{score}</strong></div>
        <div className="g2048-score"><span>BEST</span><strong>{best}</strong></div>
      </div>
      {(over || won) && (
        <div className="game-win">{won ? "🎉 2048!" : "💀 Game Over"}</div>
      )}

      {/* Board: fixed-size container, tiles are absolutely positioned */}
      <div
        className={`g2048-board ${shaking ? "board-shake" : ""}`}
        style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
      >
        {/* Ghost cells (background grid) */}
        {Array.from({length:16}).map((_,i) => (
          <div key={`ghost-${i}`} className="g2048-ghost" style={{
            left:  GAP + (i%4)  * (CELL+GAP),
            top:   GAP + Math.floor(i/4) * (CELL+GAP),
            width: CELL, height: CELL,
          }} />
        ))}

        {/* Live tiles */}
        {tiles.map(tile => {
          const x = GAP + tile.c * (CELL + GAP);
          const y = GAP + tile.r * (CELL + GAP);
          const color = TILE_COLORS[tile.value] || "#111";
          const textColor = tile.value > 4 ? "#fff" : "#333";
          const fontSize = tile.value >= 1024 ? "1rem" : tile.value >= 100 ? "1.2rem" : "1.5rem";

          let animClass = "";
          if (tile.isNew)     animClass = "tile-appear";
          if (tile.merging)   animClass = "tile-merge";

          return (
            <div
              key={tile.id}
              className={`g2048-tile-abs ${animClass}`}
              style={{
                left:       x,
                top:        y,
                width:      CELL,
                height:     CELL,
                background: color,
                color:      textColor,
                fontSize,
                // CSS transition drives the slide
                transition: sliding
                  ? "left 0.12s cubic-bezier(0.25,0.1,0.25,1), top 0.12s cubic-bezier(0.25,0.1,0.25,1)"
                  : "none",
                zIndex: tile.merging ? 2 : 1,
                opacity: tile.consumed ? 0 : 1,
              }}
            >
              {tile.value}
            </div>
          );
        })}
      </div>

      {/* Arrow buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,44px)", gridTemplateRows:"repeat(2,44px)", gap:"4px" }}>
        {arrows.map(({ dir, label, row, col }) => {
          const pressed = pressedDir === dir;
          const nudge   = DIR_NUDGE[dir];
          return (
            <button
              key={dir}
              className="arrow-btn"
              style={{
                gridRow: row, gridColumn: col,
                transform:  pressed ? `scale(0.86) translate(${nudge.x}px,${nudge.y}px)` : "scale(1)",
                background: pressed ? "#c9a8e8" : "",
                transition: pressed
                  ? "transform 0.08s ease, background 0.08s ease"
                  : "transform 0.16s ease, background 0.16s ease",
              }}
              onClick={() => move(dir)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button className="game-btn" onClick={reset}>NEW GAME</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MINESWEEPER  (unchanged from previous version)
═══════════════════════════════════════════════════════════ */
const ROWS = 9, COLS = 9, MINES = 10;
const ADJ_COLORS = ["","#2563eb","#16a34a","#dc2626","#7c3aed","#b91c1c","#0891b2","#111","#555"];

function buildBoard() {
  const cells = Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => ({ mine:false, revealed:false, flagged:false, adj:0 }))
  );
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random()*ROWS), c = Math.floor(Math.random()*COLS);
    if (!cells[r][c].mine) { cells[r][c].mine = true; placed++; }
  }
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
    if (cells[r][c].mine) continue;
    let n=0;
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
      const nr=r+dr,nc=c+dc;
      if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&cells[nr][nc].mine) n++;
    }
    cells[r][c].adj=n;
  }
  return cells;
}

function floodReveal(board, startR, startC) {
  const queue=[[startR,startC]], visited=new Set(), order=[];
  let delay=0;
  while (queue.length) {
    const [r,c]=queue.shift(), key=`${r}-${c}`;
    if (visited.has(key)) continue;
    if (r<0||r>=ROWS||c<0||c>=COLS) continue;
    if (board[r][c].revealed||board[r][c].flagged) continue;
    visited.add(key);
    order.push([r,c,delay]);
    delay+=28;
    board[r][c].revealed=true;
    if (board[r][c].adj===0&&!board[r][c].mine)
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) queue.push([r+dr,c+dc]);
  }
  return order;
}

function Minesweeper() {
  const [board,       setBoard]       = useState(buildBoard);
  const [status,      setStatus]      = useState("playing");
  const [flags,       setFlags]       = useState(0);
  const [revealAnims, setRevealAnims] = useState({});
  const [flagAnims,   setFlagAnims]   = useState({});
  const [exploding,   setExploding]   = useState(null);

  useEffect(() => { injectStyles(); }, []);

  function reveal(r, c) {
    if (status!=="playing") return;
    if (board[r][c].flagged||board[r][c].revealed) return;
    const nb = board.map(row => row.map(cell => ({...cell})));
    if (nb[r][c].mine) {
      setExploding(`${r}-${c}`);
      nb[r][c].revealed=true;
      setBoard(nb);
      setTimeout(() => {
        const nb2=nb.map(row=>row.map(cell=>({...cell})));
        const mineAnims={};
        let d=80;
        nb2.forEach((row,ri)=>row.forEach((cell,ci)=>{
          if (cell.mine&&!(ri===r&&ci===c)) { cell.revealed=true; mineAnims[`${ri}-${ci}`]=d; d+=45; }
        }));
        setBoard(nb2); setRevealAnims(mineAnims); setStatus("lost");
        setTimeout(()=>setRevealAnims({}), d+400);
      }, 260);
      return;
    }
    const order=floodReveal(nb,r,c);
    const anims={};
    order.forEach(([or,oc,delay])=>{ anims[`${or}-${oc}`]=delay; });
    setRevealAnims(anims); setBoard(nb);
    if (nb.flat().filter(cell=>!cell.revealed&&!cell.mine).length===0) {
      setStatus("won");
      const celebAnims={};
      nb.forEach((row,ri)=>row.forEach((cell,ci)=>{ if (!cell.mine) celebAnims[`${ri}-${ci}`]=(ri*COLS+ci)*15; }));
      setTimeout(()=>{ setRevealAnims(celebAnims); }, 300);
    }
    setTimeout(()=>setRevealAnims({}), order.length*28+400);
  }

  function flag(e, r, c) {
    e.preventDefault();
    if (status!=="playing"||board[r][c].revealed) return;
    const nb=board.map(row=>row.map(cell=>({...cell})));
    const wasFlag=nb[r][c].flagged;
    nb[r][c].flagged=!wasFlag;
    setFlags(f=>wasFlag?f-1:f+1);
    setBoard(nb);
    const key=`${r}-${c}`;
    setFlagAnims(prev=>({...prev,[key]:wasFlag?"unflag":"flag"}));
    setTimeout(()=>setFlagAnims(prev=>{const n={...prev};delete n[key];return n;}),300);
  }

  function reset() { setBoard(buildBoard()); setStatus("playing"); setFlags(0); setRevealAnims({}); setFlagAnims({}); setExploding(null); }

  return (
    <div className="game-wrap">
      <h3 className="game-title">MINESWEEPER</h3>
      <div className="ms-header">
        <span className="ms-counter">🚩 {flags}/{MINES}</span>
        {status==="won"  && <span className="game-win">🎉 Clear!</span>}
        {status==="lost" && <span className="game-win" style={{color:"#dc2626"}}>💥 Boom!</span>}
        <button className="game-btn ms-reset" onClick={reset}>↺</button>
      </div>
      <div className="ms-grid" style={{gridTemplateColumns:`repeat(${COLS},1fr)`}}>
        {board.map((row,r)=>row.map((cell,c)=>{
          const key=`${r}-${c}`, revDelay=revealAnims[key], flagAnim=flagAnims[key];
          const isExpl=exploding===key, isWon=status==="won"&&cell.revealed&&!cell.mine;
          let cls="ms-cell", content=null;
          if (cell.revealed) {
            cls+=" ms-revealed";
            if (cell.mine) {
              cls+=isExpl?" anim-explode":" ms-mine";
              content=<span className={!isExpl&&revDelay!==undefined?"anim-reveal":""} style={{animationDelay:revDelay?`${revDelay}ms`:"0ms"}}>💣</span>;
            } else {
              content=<span className={`ms-cell-inner ${revDelay!==undefined?"anim-reveal":""} ${isWon?"ms-win-cell":""}`}
                style={{animationDelay:revDelay!==undefined?`${revDelay}ms`:"0ms",color:ADJ_COLORS[cell.adj],fontFamily:"'Permanent Marker',cursive",fontSize:"0.78rem"}}>
                {cell.adj>0?cell.adj:""}
              </span>;
            }
          } else {
            content=<span className={`ms-cell-inner ${flagAnim?`anim-${flagAnim}`:""}`} style={{fontSize:"0.9rem"}}>{cell.flagged?"🚩":""}</span>;
          }
          return (
            <div key={key} className={cls} onClick={()=>reveal(r,c)} onContextMenu={e=>flag(e,r,c)}>
              {content}
            </div>
          );
        }))}
      </div>
      <p className="ms-hint">Click to reveal · Right-click to flag</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GAMES CONTAINER
═══════════════════════════════════════════════════════════ */
export default function Games() {
  const [active, setActive] = useState("sudoku");
  const tabs = [
    { id:"sudoku",      label:"SUDOKU"      },
    { id:"2048",        label:"2048"        },
    { id:"minesweeper", label:"MINESWEEPER" },
  ];
  return (
    <div className="games-container">
      <div className="games-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`games-tab${active===t.id?" games-tab-active":""}`} onClick={()=>setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="games-panel">
        {active==="sudoku"      && <Sudoku />}
        {active==="2048"        && <Game2048 />}
        {active==="minesweeper" && <Minesweeper />}
      </div>
    </div>
  );
}