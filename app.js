let color_theme = 'light';

const nLevels = 10;

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

document.documentElement.style.setProperty('--grid_size', gridSize);

grid();

resetGame(lvl_id);

document.addEventListener('keydown', () => keyDownHandler(event), false);

// creating the grid
function grid() {
  const grid = document.getElementById('grid');

  for (let iRow = 0; iRow < gridSize; iRow += 1) {
    const row = document.createElement('div');
    row.className = 'row';

    for (let iCol = 0; iCol < gridSize; iCol += 1) {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.id = `tile${iRow}${iCol}`;
      tile.addEventListener('click', () => newMove([iRow, iCol]));
      row.appendChild(tile);
    }

    grid.appendChild(row);
  }
}

// add values to tiles
function resetGame(lvlID) {
  resetSignBoxColors();

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
    if (keyCode == 37) {
      // left
      checkMove([iRowCur, iColCur - 1]);
    } else if (keyCode == 38) {
      // up
      checkMove([iRowCur - 1, iColCur]);
    } else if (keyCode == 39) {
      // right
      checkMove([iRowCur, iColCur + 1]);
    } else if (keyCode == 40) {
      // down
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
  if (thisGame.iMoveCur < 0) setSignBoxColors([iRow, iCol]);

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

  doMove([iRow, iCol]);
}

function onPressUndo() {
  //If first move - reset game
  if (thisGame.iMoveCur <= 0) resetGame(lvl_id);
  else {
    undoVal = thisGame.vals[thisGame.iMoveCur];
    const [iRowUndo, iColUndo] = thisGame.coords[thisGame.iMoveCur];
    thisGame.sign *= -1;
    thisGame.score -= thisGame.sign * undoVal;
    thisGame.iMoveCur--;

    // restore tile
    tiles[iRowUndo][iColUndo].taken = false;
    showTile([iRowUndo, iColUndo]);

    doMove(thisGame.coords[thisGame.iMoveCur]);

    // undo end-of-game state
    if (thisGame.finished) thisGame.finished = false;
  }
}

function onPressRedo() {
  // only redo if not first move, and if current move is less than number
  // of moves made (nothing to redo)
  if (thisGame.iMoveCur >= 0 && thisGame.iMoveCur < thisGame.nMoves - 1) {
    thisGame.iMoveCur++;
    redoVal = thisGame.vals[thisGame.iMoveCur];
    const [iRowRedo, iColRedo] = thisGame.coords[thisGame.iMoveCur - 1];
    thisGame.score += thisGame.sign * redoVal;
    thisGame.sign *= -1;

    // remove tile
    tiles[iRowRedo][iColRedo].taken = true;
    hideTile([iRowRedo, iColRedo]);

    doMove(thisGame.coords[thisGame.iMoveCur]);
  }
}

function doMove([iRow, iCol]) {
  //show icon on new tile coords
  showPlayer([iRow, iCol]);

  disableAllTiles();

  //enables adjacent tiles, and returns boolean of whether any moves are left
  const optionsLeft = enableAdjacentTiles([iRow, iCol]);

  // check for game end
  if (!optionsLeft) {
    thisGame.finished = true;
    //changes opacity of current tile
    dimTile([iRow, iCol]);
    checkForHighScore(thisGame.lvlID);
  }

  showGameSpecs();
  
}

// 4 FUNCTIONS TO CONTROL TILES APPEARANCE

//add number and opacity 1
function showTile([iRow, iCol]) {
  let tile = document.getElementById(`tile${iRow}${iCol}`);
  tile.innerHTML = tiles[iRow][iCol].value;
  tile.style.setProperty('opacity', 1);
}

//remove number and decreases opacity
function hideTile([iRow, iCol]) {
  document.getElementById(`tile${iRow}${iCol}`).innerHTML = '';
  dimTile([iRow, iCol]);
}

//decreases opacity to .5
function dimTile([iRow, iCol]) {
  document
    .getElementById(`tile${iRow}${iCol}`)
    .style.setProperty('opacity', 0.5);
}

//add icon of player, and sets opacity to 1 (for undoMove)
function showPlayer([iRow, iCol]) {
  let tileCur = document.getElementById(`tile${iRow}${iCol}`);
  //happy smiley if score higher or equal to 0, sad if less than 0
  let emoji = thisGame.score >= 0 ? 'happy' : 'sad';
  tileCur.innerHTML =
    `<span class="mdi mdi-emoticon-${emoji}-outline player_token"></span>`;
  tileCur.style.setProperty('opacity', 1);
}

//3 FUNCTIONS FOR ENABLING AND DISABLING TILES

function disableAllTiles() {
  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {
      let tile = document.getElementById(`tile${iRow}${iCol}`);
      tile.disabled = true;
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
  //enable tiles if not beyond edge and not taken return if tile enabled
  if (iRow >= 0 && iRow < gridSize && iCol >= 0 && iCol < gridSize) {
    if (!tiles[iRow][iCol].taken) {
      document.getElementById(`tile${iRow}${iCol}`).disabled = false;
      enabledTile = true;
    }
  }
  return enabledTile;
}

function showGameSpecs() {
  // let scoreString = thisGame.score.toString().padStart(3, ' ');
  let scoreString = thisGame.score.toString();
  document.getElementById("scoreText").innerHTML = `Score: ${scoreString}`;
  // let signString = thisGame.sign == 1 ? '+' : '-';
  // document.getElementById('signText').innerHTML = `Next sign: ${signString}`;
}

function resetSignBoxColors() {
  const plusBox = document.getElementById('plus_box');
  const minusBox = document.getElementById('minus_box');

  plusBox.style.setProperty('background-color', 'var(--col_bg1)');
  plusBox.style.setProperty('color', 'var(--col_game_text)');
  minusBox.style.setProperty('background-color', 'var(--col_bg1)');
  minusBox.style.setProperty('color', 'var(--col_game_text)');
}

function setSignBoxColors([iRow, iCol]) {
  const signIndex = (iRow + iCol) % 2;
  const plusBox = document.getElementById('plus_box');
  const minusBox = document.getElementById('minus_box');

  if (signIndex == 1) {
    plusBox.style.setProperty('background-color', 'var(--col_grid_bg1)');
    minusBox.style.setProperty('background-color', 'var(--col_grid_bg2)');
  } else {
    plusBox.style.setProperty('background-color', 'var(--col_grid_bg2)');
    minusBox.style.setProperty('background-color', 'var(--col_grid_bg1)');
  }

  plusBox.style.setProperty('color', 'var(--col_grid_text)');
  minusBox.style.setProperty('color', 'var(--col_grid_text)');
}

function onPressRestart() {
  resetGame(lvl_id);
}

function onPressPrevLevel() {
  lvl_id = ((lvl_id - nLevels - 1) % nLevels) + nLevels;
  resetGame(lvl_id);
}

function onPressNextLevel() {
  lvl_id = (lvl_id % nLevels) + 1;
  resetGame(lvl_id);
}

function onPressToggleColors() {
  const body = document.body;
  const toggle = document.getElementById('col_tog');
  if (color_theme == 'dark') {
    color_theme = 'light';
    body.classList.remove('dark');
    body.classList.add('light');
    toggle.classList.remove('mdi-toggle-switch-outline');
    toggle.classList.add('mdi-toggle-switch-off-outline');
  } else {
    color_theme = 'dark';
    body.classList.remove('light');
    body.classList.add('dark');
    toggle.classList.remove('mdi-toggle-switch-off-outline');
    toggle.classList.add('mdi-toggle-switch-outline');
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
