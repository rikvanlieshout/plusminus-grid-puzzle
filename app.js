const gridSize = 6;
const maxTileVal = 7;
const minTileVal = 1;

const maxMoves = gridSize * gridSize;

let nLevels = 100;
// let sumText = '';

class gameRecord {
  constructor(lvlID) {
    this.lvlID = lvlID;
    this.coords = [];
    this.vals = [];
    this.iMoveCur = -1;
    this.nMoves = 0;
    this.score = 0;
    this.sign = 1;
    this.started = false;
  }
}

let lvl_id = 1;

let thisGame = new gameRecord(lvl_id);

let iRowCur, iColCur;

document.documentElement.style.setProperty('--cell_size', 100/gridSize + '%');

grid();

document.addEventListener('keydown', () => keyDownHandler(event), false);

localStorage.setItem("highScore", 0);
let highScore = localStorage.getItem("highScore");
if (highScore == null) {
  highScore = 0;
}
document.getElementById('highScoreText').innerHTML = `Highscore: ${highScore}`;

resetGame(lvl_id);




// Creating the grid
function grid() {
    let grid = document.getElementById('grid');

    for (let iRow = 0; iRow < gridSize; iRow += 1) {
        let row = document.createElement('div');
        row.className = 'row';

        for (let iCol = 0; iCol < gridSize; iCol += 1) {
            let tile = document.createElement('button');
            tile.className = 'tile';
            tile.id = `tile${iRow}${iCol}`;
            tile.addEventListener('click', () => newMove([iRow, iCol]));
            row.appendChild(tile);
        };

        grid.appendChild(row);
    };
};


function onPressRestart() {
  resetGame(lvl_id);
}


function resetGame(lvl_id) {

  thisGame = new gameRecord(lvl_id);
  // sumText = '';
  // document.getElementById('resultText').innerHTML = '\&nbsp;';


  showSign(thisGame.sign);
  showScore(thisGame.score);
  showLevel(lvl_id);

  // Seed PRNG
  let lvlRNG = new Math.seedrandom(lvl_id);

  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {

      let val = Math.floor(lvlRNG() * (maxTileVal - minTileVal + 1)) + minTileVal;

      let tile = document.getElementById(`tile${iRow}${iCol}`);
      tile.disabled = false;
      tile.innerHTML = val;
      tile.style.setProperty('color', 'tomato');
      tile.style.setProperty('opacity', 1);

    }
  }
}


function checkMove([iRow, iCol]) {
  if (iRow >= 0 && iRow < gridSize && iCol >= 0 && iCol < gridSize) {
    let tile = document.getElementById(`tile${iRow}${iCol}`);
    if (tile.innerHTML > 0) {
      newMove([iRow, iCol]);
    }
  }
}


function newMove([iRow, iCol]) {
  if (!thisGame.started) thisGame.started = true;
  else {
    let tileOrigin = document.getElementById(`tile${iRowCur}${iColCur}`);
    tileOrigin.innerHTML = '\&nbsp;';
    tileOrigin.style.setProperty('opacity', 0.5);
  }
  let tileDestin = document.getElementById(`tile${iRow}${iCol}`);
  tileDestin.style.setProperty('color', 'white');
  let val = tileDestin.innerHTML;
  [iRowCur, iColCur] = [iRow, iCol];

  thisGame.iMoveCur++;
  thisGame.vals.splice(thisGame.iMoveCur, maxMoves, val);
  thisGame.coords.splice(thisGame.iMoveCur, maxMoves, [iRowCur, iColCur]);
  thisGame.nMoves = thisGame.iMoveCur;

  thisGame.score += thisGame.sign * val;
  showScore(thisGame.score);
  // showResult(val);
  thisGame.sign *= -1;
  showSign(thisGame.sign);

  // move player marker
  let tile = document.getElementById(`tile${iRow}${iCol}`);
  tileDestin.innerHTML = '&#9787;';
  tileDestin.disabled = true;

  disableAllTiles();

  // check for game end
  if (!enableAdjacentTiles([iRow, iCol])) {
    tileDestin.style.setProperty('opacity', 0.5);
    checkForHighScore();
  }
}


function onPressUndo() {
  if (thisGame.iMoveCur <= 0) resetGame(lvl_id);
  else {
    undoVal = thisGame.vals[thisGame.iMoveCur];
    [iRowUndo, iColUndo] = thisGame.coords[thisGame.iMoveCur];
    thisGame.sign *= -1;
    thisGame.score -= thisGame.sign * undoVal;
    thisGame.iMoveCur--;
    showScore(thisGame.score);
    showSign(thisGame.sign);

    // restore tiles
    let tileLast = document.getElementById(`tile${iRowUndo}${iColUndo}`);
    tileLast.disabled = false;
    tileLast.innerHTML = undoVal;
    tileLast.style.setProperty('color', 'tomato');
    tileLast.style.setProperty('opacity', 1);

    // move back player marker
    [iRowCur, iColCur] = thisGame.coords[thisGame.iMoveCur];
    let tileBack = document.getElementById(`tile${iRowCur}${iColCur}`);
    tileBack.innerHTML = '&#9787;';
    tileBack.style.setProperty('color', 'white');
    tileBack.style.setProperty('opacity', 1);

    disableAllTiles();

    enableAdjacentTiles([iRowCur, iColCur]);
  }
}


function onPressRedo() {
  if (thisGame.started && thisGame.iMoveCur < thisGame.nMoves) {
    thisGame.iMoveCur++;
    redoVal = thisGame.vals[thisGame.iMoveCur];
    [iRowRedo, iColRedo] = thisGame.coords[thisGame.iMoveCur - 1];
    thisGame.score += thisGame.sign * redoVal;
    thisGame.sign *= -1;
    showScore(thisGame.score);
    showSign(thisGame.sign);

    // remove tile
    let tilePrev = document.getElementById(`tile${iRowRedo}${iColRedo}`);
    tilePrev.innerHTML = '\&nbsp;';
    tilePrev.style.setProperty('opacity', 0.5);

    // move forward player marker
    [iRowCur, iColCur] = thisGame.coords[thisGame.iMoveCur];
    let tileBack = document.getElementById(`tile${iRowCur}${iColCur}`);
    tileBack.innerHTML = '&#9787;';
    tileBack.style.setProperty('color', 'white');
    tileBack.style.setProperty('opacity', 1);

    disableAllTiles();

    enableAdjacentTiles([iRowCur, iColCur]);
  }
}


function onPressPrevLevel() {
  highScore = 0;
  document.getElementById('highScoreText').innerHTML = `Highscore: ${highScore}`;
  lvl_id = Math.max(lvl_id - 1, 1);
  onPressRestart();
}


function onPressNextLevel() {
  highScore = 0;
  document.getElementById('highScoreText').innerHTML = `Highscore: ${highScore}`;
  lvl_id = Math.min(lvl_id + 1, nLevels);
  onPressRestart();
}


function checkForHighScore() {
  if (thisGame.score > highScore) {
    highScore = thisGame.score;
    document.getElementById('highScoreText').innerHTML = `Highscore: ${highScore}`;
    localStorage.setItem("highScore", highScore);
  }
}


function keyDownHandler(event) {
  if (thisGame.started) {
    let keyCode = event.keyCode;
    if (keyCode == 37) { // left
      checkMove([iRowCur, iColCur - 1]);
    }
    else if (keyCode == 38) { // up
      checkMove([iRowCur - 1, iColCur]);
    }
    else if (keyCode == 39) { // right
      checkMove([iRowCur, iColCur + 1]);
    }
    else if (keyCode == 40) { // down
      checkMove([iRowCur + 1, iColCur]);
    }
  }
}


function enableAdjacentTiles([iRowNow, iColNow]) {
  let enabledTiles = false;

  for (const iRow of [iRowNow + 1, iRowNow - 1]) {
    if (enableTileIfPresent([iRow, iColNow])) enabledTiles = true;
  }
  for (const iCol of [iColNow + 1, iColNow - 1]) {
    if (enableTileIfPresent([iRowNow, iCol])) enabledTiles = true;
  }

  return enabledTiles;
}


function enableTileIfPresent([iRow, iCol]) {
  let enabledTile = false;
  if (iRow >= 0 && iRow < gridSize && iCol >= 0 && iCol < gridSize) {
    let tile = document.getElementById(`tile${iRow}${iCol}`);
    if (tile.innerHTML > 0) {
      tile.disabled = false;
      enabledTile = true;
    }
  }
  return enabledTile;
}


function disableAllTiles() {
  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {
      let tile = document.getElementById(`tile${iRow}${iCol}`);
      tile.disabled = true;
    }
  }
}


// function showResult(val) {
//   if (sumText == '') {
//     sumText += `${val} `;
//     document.getElementById('resultText').innerHTML = `Score = ${score}`;
//   }
//   else {
//     sumText += `${currentSign == -1 ? '-' : '+'} ${val} `;
//     document.getElementById('resultText').innerHTML = `Score = ${sumText} = ${score}`;
//   }
// }


function showScore(score) {
  document.getElementById('scoreText').innerHTML = `Score: ${score.toString().padStart(3, ' ')}`;
}


function showSign(sign) {
  document.getElementById('signText').innerHTML = `Next sign: ${sign == 1 ? '+' : '-'}`;
}


function showLevel(lvl_id) {
  document.getElementById('lvlText').innerHTML = `Puzzle ID: ${lvl_id}`;
}
