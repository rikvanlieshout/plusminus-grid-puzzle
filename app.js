let color_theme = 'light';

const nLevels = 100;

const gridSize = 6;
const nTiles = gridSize * gridSize;
const maxTileVal = 7;
const minTileVal = 1;

class TileTemplate {
  constructor(value) {
    this.value = value;
    this.taken = false;
  }
}

const tiles = new Array(gridSize);
for (let iRow = 0; iRow < gridSize; iRow++) {
  tiles[iRow] = new Array(gridSize);
}


class GameRecord {
  constructor(lvlID) {
    this.lvlID = lvlID;
    this.coords = [];
    this.vals = [];
    this.iMoveCur = -1;
    this.nMoves = 0;
    this.score = 0;
    this.sign = 1;
    this.finished = false;
  }
}

let lvl_id = 1;

let thisGame = new GameRecord(lvl_id);

document.documentElement.style.setProperty('--cell_size', 100/gridSize + '%');

grid();

document.addEventListener('keydown', () => keyDownHandler(event), false);

resetGame(lvl_id);


// creating the grid
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


// add values to tiles
function resetGame(lvlID) {

  let highScore = +getHighScoreFromLocalStorage(lvlID);
  document.getElementById('highScoreText')
    .innerHTML = `Highscore: ${highScore}`;

  document.getElementById('lvlText').innerHTML = `Puzzle ID: ${lvlID}`;
  thisGame = new GameRecord(lvlID);
  showGameSpecs();

  // Create random number generator for this level
  let lvlRNG = new Math.seedrandom(lvlID);

  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {

      let val =
        Math.floor(lvlRNG() * (maxTileVal - minTileVal + 1)) + minTileVal;

      tiles[iRow][iCol] = new TileTemplate(val);

      showTile([iRow, iCol]);

      // enable all tiles
      let tile = document.getElementById(`tile${iRow}${iCol}`);
      tile.disabled = false;
    }
  }
}


function keyDownHandler(event) {
  if (thisGame.iMoveCur >= 0) {
    let [iRowCur, iColCur] = thisGame.coords[thisGame.iMoveCur];
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


function checkMove([iRow, iCol]) {
  if (iRow >= 0 && iRow < gridSize && iCol >= 0 && iCol < gridSize) {
    if (!tiles[iRow][iCol].taken) newMove([iRow, iCol]);
  }
}


function newMove([iRow, iCol]) {

  // remove player token from previous tile, if game started
  if (thisGame.iMoveCur >= 0) hideTile(thisGame.coords[thisGame.iMoveCur]);

  tiles[iRow][iCol].taken = true;

  let val = tiles[iRow][iCol].value;

  thisGame.iMoveCur++;
  thisGame.vals.splice(thisGame.iMoveCur, nTiles, val);
  thisGame.coords.splice(thisGame.iMoveCur, nTiles, [iRow, iCol]);
  thisGame.nMoves = thisGame.iMoveCur + 1;

  thisGame.score += thisGame.sign * val;
  thisGame.sign *= -1;

  showGameSpecs();

  doMove([iRow, iCol]);
}


function onPressUndo() {
  if (thisGame.iMoveCur <= 0) resetGame(lvl_id);
  else {
    undoVal = thisGame.vals[thisGame.iMoveCur];
    const [iRowUndo, iColUndo] = thisGame.coords[thisGame.iMoveCur];
    thisGame.sign *= -1;
    thisGame.score -= thisGame.sign * undoVal;
    thisGame.iMoveCur--;

    showGameSpecs();

    // restore tile
    tiles[iRowUndo][iColUndo].taken = false;
    showTile([iRowUndo, iColUndo]);

    doMove(thisGame.coords[thisGame.iMoveCur]);

    // undo end-of-game state
    if (thisGame.finished) thisGame.finished = false;
  }
}


function onPressRedo() {
  if (thisGame.iMoveCur >= 0 && thisGame.iMoveCur < thisGame.nMoves - 1) {
    thisGame.iMoveCur++;
    redoVal = thisGame.vals[thisGame.iMoveCur];
    const [iRowRedo, iColRedo] = thisGame.coords[thisGame.iMoveCur - 1];
    thisGame.score += thisGame.sign * redoVal;
    thisGame.sign *= -1;

    showGameSpecs();

    // remove tile
    tiles[iRowRedo][iColRedo].taken = true;
    hideTile([iRowRedo, iColRedo]);

    doMove(thisGame.coords[thisGame.iMoveCur]);
  }
}


function doMove([iRow, iCol]) {

  showPlayer([iRow, iCol]);

  disableAllTiles();

  const optionsLeft = enableAdjacentTiles([iRow, iCol]);

  // check for game end
  if (!optionsLeft) {
    thisGame.finished = true;
    dimTile([iRow, iCol]);
    checkForHighScore(thisGame.lvlID);
  }
}


function showTile([iRow, iCol]) {
  let tile = document.getElementById(`tile${iRow}${iCol}`);
  tile.innerHTML = tiles[iRow][iCol].value;
  tile.style.setProperty('opacity', 1);
}


function hideTile([iRow, iCol]) {
  document.getElementById(`tile${iRow}${iCol}`).innerHTML = '&nbsp;';
  dimTile([iRow, iCol]);
}


function dimTile([iRow, iCol]) {
  document.getElementById(`tile${iRow}${iCol}`)
    .style.setProperty('opacity', 0.5);
}


function showPlayer([iRow, iCol]) {
  let tileCur = document.getElementById(`tile${iRow}${iCol}`);
  tileCur.innerHTML = '<span class="player_token">&#9787;</span>';
  tileCur.style.setProperty('opacity', 1);
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
    if (!tiles[iRow][iCol].taken) {
      document.getElementById(`tile${iRow}${iCol}`).disabled = false;
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


function showGameSpecs() {
  let scoreString = thisGame.score.toString().padStart(3, ' ');
  document.getElementById('scoreText').innerHTML = `Score: ${scoreString}`;
  let signString = thisGame.sign == 1 ? '+' : '-';
  document.getElementById('signText').innerHTML = `Next sign: ${signString}`;
}


function onPressRestart() {
  resetGame(lvl_id);
}


function onPressPrevLevel() {
  lvl_id = (lvl_id - nLevels - 1) % nLevels + nLevels;
  resetGame(lvl_id);
}


function onPressNextLevel() {
  lvl_id = lvl_id % nLevels + 1;
  resetGame(lvl_id);
}


function onPressToggleColors() {
  const body = document.body;
  if (color_theme == 'dark') {
    body.classList.remove('dark');
    body.classList.add('light');
    color_theme = 'light';
  } else {
    body.classList.remove('light');
    body.classList.add('dark');
    color_theme = 'dark';
  }
}


function checkForHighScore(lvlID) {
  let highScore = +getHighScoreFromLocalStorage(lvlID);

  if (thisGame.score > highScore) {
    highScore = thisGame.score;
    document.getElementById('highScoreText')
      .innerHTML = `Highscore: ${highScore}`;
    setHighScoreToLocalStorage(lvlID, highScore);
  }
}


function getHighScoreFromLocalStorage(lvlID) {
  let key = localStorageKeyString(lvlID);
  if (!(key in localStorage)) return 0;
  else return localStorage.getItem(key);
}


function setHighScoreToLocalStorage(lvlID, highScore) {
  let key = localStorageKeyString(lvlID);
  localStorage.setItem(key, highScore);
}


function localStorageKeyString(lvlID) {
  return `plusminus_grid_puzzle_highscore_lvl${lvlID}`;
}
