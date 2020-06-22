'use strict';

/* -------------- CLASSES -------------- */

// class to store values of tiles and booleans of whether they're taken
class TileTemplate {
  constructor(value) {
    this.value = value;
    this.taken = false;
  }
}

// class to record details of a game
class GameRecord {
  constructor() {
    this.playerName = '';
    this.lvlID = getLvlID();
    this.gridSize = gridSize;
    this.lvlNumber = lvlNumber;
    this.coords = [];
    this.vals = [];
    this.iMoveCur = -1;
    this.nMoves = 0;
    this.score = 0;
    this.sign = 1;
    this.finished = false;
  }
}

/* -------------- GLOBAL PARAMETERS -------------- */

// local storage keys
const keyRoot = 'plusminus_grid_puzzle_';
const colorThemeKey = keyRoot + 'color_theme';
const userNameKey = keyRoot + 'username';
const currentLvlKey = keyRoot + 'current_lvl';
const currentGridSizeKey = keyRoot + 'current_gridsize';

// theme
let colorTheme

// leaderboard
const api = 'http://localhost:27017';
// const api = 'https://plus-minus-grid-puzzle.herokuapp.com';
let leaderboardMin;
const maxEntriesLeaderboard = 10;

// level solutions
// const optimalScore = [29, 29, 30, 28, 28, 22, 23, 31, 27, 28];
// const optimalMoves = [19, 17, 23, 21, 23, 23, 23, 19, 19, 25];

// game parameters
const minTileVal = 1;
const maxTileVal = 7;
const nLevels = 10;
const possibleGridSizes = [4, 6, 8];
const leaderboardGridSize = 8;

// current grid size, current level, and current game record
let gridSize;
let lvlNumber;
let thisGame;

// 2D array that stores tile objects
let tiles;

/* -------------- CORE FUNCTIONS -------------- */

// random integer within range (min and max both included)
function getRandomIntIncl(min, max, randFunc = Math.random) {
  return Math.floor(randFunc() * (max - min + 1)) + min;
}

// shuffle function (Durstenfeld shuffle, randomizes positions of array elements)
function shuffleArray(array, randFunc = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(randFunc() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
}

// hash function (MurmurHash3's mixing function)
function xmur3(str) {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
    h = h << 13 | h >>> 19;
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
}

// seeded pseuso random number generator (Mulberry32)
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/* -------------- LOCAL STORAGE -------------- */

function getFromLocalStorage(key, defaultValue = '0') {
  if (!(key in localStorage)) return defaultValue;
  else return localStorage.getItem(key);
}

function setToLocalStorage(key, value) {
  localStorage.setItem(key, value);
}

// generate local storage key for high score of this level
function getLocalBestScoreKey() {
  const lvlID = getLvlID();
  return `${keyRoot}localbestscore_lvl_${lvlID}`;
}

// generate local storage key for lowest number of moves for this level
function getLocalBestMovesKey() {
  const lvlID = getLvlID();
  return `${keyRoot}localbestmoves_lvl_${lvlID}`;
}

// level indentifier from grid size and level number
function getLvlID() {
  return `${gridSize}x${gridSize}_nr${lvlNumber}`;
}

/* -------------- THEME -------------- */

function setColorTheme() {
  const themeToggleIcon = document.getElementById('theme_toggle_icon');
  if (colorTheme == 'dark') {
    document.body.classList.remove('light');
    document.body.classList.add('dark');
    themeToggleIcon.classList.add('mdi-toggle-switch-outline');
    themeToggleIcon.classList.remove('mdi-toggle-switch-off-outline');
  } else {
    document.body.classList.add('light');
    document.body.classList.remove('dark');
    themeToggleIcon.classList.add('mdi-toggle-switch-off-outline');
    themeToggleIcon.classList.remove('mdi-toggle-switch-outline');
  }
}

function toggleTheme() {
  colorTheme = colorTheme === 'dark' ? 'light' : 'dark';
  setToLocalStorage(colorThemeKey, colorTheme);
  setColorTheme();
}

document
  .getElementById('theme_toggler')
  .addEventListener('click', toggleTheme);

/* -------------- MAKE LEVEL -------------- */

// wrapper function calling subroutines to load level
function loadLevel() {
  // make grid of tiles (buttons) in HTML
  createGrid();

  // make 2D array that holds tile objects
  tiles = new Array(gridSize);
  for (let iRow = 0; iRow < gridSize; iRow++) {
    tiles[iRow] = new Array(gridSize);
  }

  // generate random tile values and add values to HTML tiles
  generateLevel();

  // store current grid size and level ID in local storage
  // to allow continue playing same level after browser refresh
  setToLocalStorage(currentGridSizeKey, gridSize);
  setToLocalStorage(currentLvlKey, lvlNumber);

  // show level ID
  document.getElementById('lvlText').innerHTML = `Puzzle number ${lvlNumber}`;
    // .innerHTML = `Puzzle ID: ${gridSize}x${gridSize} nr. ${lvlNumber}`;

  // show optimal score and nr. of moves for level
  showOptimalResult();

  // get level high score from local storage (defaults to -inf), and show it
  const localBestScoreKey = getLocalBestScoreKey();
  const localBestMovesKey = getLocalBestMovesKey();
  const localBestScore = +getFromLocalStorage(localBestScoreKey,
    Number.NEGATIVE_INFINITY);
  const localBestMoves = +getFromLocalStorage(localBestMovesKey,
    Number.POSITIVE_INFINITY);
  updateLocalBestDisplay(localBestScore, localBestMoves);

  // retrieve leaderboard data from server and show
  document.getElementById('leaderboard_box').innerHTML = '';
  if (gridSize >= leaderboardGridSize) makeLeaderboard();
}

// make grid of tiles (buttons) in HTML
function createGrid() {
  // set CSS properties
  document.documentElement.style.setProperty('--grid_size', gridSize);
  document.documentElement.style
    .setProperty('--font_size_tile', `${6 - gridSize/3}vh`);

  // get grid HTML element and empty its content from previous grid
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let iRow = 0; iRow < gridSize; iRow += 1) {
    const row = document.createElement('div');
    row.className = 'row';

    for (let iCol = 0; iCol < gridSize; iCol += 1) {
      const tile = document.createElement('button');
      tile.disabled = true;
      tile.className = 'tile';
      tile.id = `tile${iRow}${iCol}`;
      tile.addEventListener('click', () => newMove([iRow, iCol]));
      row.appendChild(tile);
    }

    grid.appendChild(row);
  }
}

// generate tile values, add values to HTML tiles, according to puzzle ID
function generateLevel() {
  // create random number generator for this level
  const lvlID = getLvlID();
  const seed = xmur3(lvlID);
  const lvlRNG = mulberry32(seed());

  // generate random values for tiles
  const tileVals = new Array(gridSize * gridSize);
  for (let i = 0; i < gridSize * gridSize; i++) {
    tileVals[i] = getRandomIntIncl(minTileVal, maxTileVal, lvlRNG);
  }

  // sort tile values
  tileVals.sort((a, b) => b - a);

  // pick values for odd and even-indexed tiles following ABBA scheme
  const tileValsEven = new Array();
  const tileValsOdd = new Array();
  for (let i = 0; i < gridSize * gridSize; i += 4) {
    tileValsEven.push(tileVals[i])
  }
  for (let i = 1; i < gridSize * gridSize; i += 4) {
    tileValsOdd.push(tileVals[i])
  }
  for (let i = 2; i < gridSize * gridSize; i += 4) {
    tileValsOdd.push(tileVals[i])
  }
  for (let i = 3; i < gridSize * gridSize; i += 4) {
    tileValsEven.push(tileVals[i])
  }

  // shuffle values in both arrays
  shuffleArray(tileValsEven, lvlRNG);
  shuffleArray(tileValsOdd, lvlRNG);

  // add values to tiles
  let iTileEven = 0;
  let iTileOdd = 0;
  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {
      // obtain tile value from array (even or odd) of tile values
      let val;
      if ((iRow + iCol) % 2 == 0) {
        val = tileValsEven[iTileEven];
        iTileEven++;
      } else {
        val = tileValsOdd[iTileOdd];
        iTileOdd++;
      }

      // add tile object to 2D array
      tiles[iRow][iCol] = new TileTemplate(val);
    }
  }
}

// // generate tile values, add values to HTML tiles, according to puzzle ID
// function generateLevel() {
//   // create random number generator for this level
//   const lvlID = getLvlID();
//   const seed = xmur3(lvlID);
//   const lvlRNG = mulberry32(seed());

//   // add values to tiles
//   for (let iRow = 0; iRow < gridSize; iRow++) {
//     for (let iCol = 0; iCol < gridSize; iCol++) {
//       // obtain random integers in range [minTileVal, maxTileVal]
//       let val = getRandomIntIncl(minTileVal, maxTileVal, lvlRNG);

//       // add tile object to 2D array
//       tiles[iRow][iCol] = new TileTemplate(val);
//     }
//   }
// }

// // generate tile values, add values to HTML tiles, according to puzzle ID
// function generateLevel() {
//   // create random number generator for this level
//   const lvlID = getLvlID();
//   const seed = xmur3(lvlID);
//   const lvlRNG = mulberry32(seed());

//   // number of tiles per parity; minimum and maximum tile values
//   const nHalfTiles = gridSize * gridSize / 2;

//   // generate random values for even-indexed tiles
//   // by obtaining random integers in range [minTileVal, maxTileVal]
//   const tileValsEven = new Array(nHalfTiles);
//   for (let i = 0; i < nHalfTiles; i++) {
//     tileValsEven[i] = getRandomIntIncl(minTileVal, maxTileVal, lvlRNG);
//   }

//   // duplicate and shuffle values for odd-indexed tiles
//   const tileValsOdd = Array.from(tileValsEven);
//   shuffleArray(tileValsOdd, lvlRNG);

//   // add values to tiles
//   let iTileEven = 0;
//   let iTileOdd = 0;
//   for (let iRow = 0; iRow < gridSize; iRow++) {
//     for (let iCol = 0; iCol < gridSize; iCol++) {
//       // obtain tile value from array (even or odd) of tile values
//       let val;
//       if ((iRow + iCol) % 2 == 0) {
//         val = tileValsEven[iTileEven];
//         iTileEven++;
//       } else {
//         val = tileValsOdd[iTileOdd];
//         iTileOdd++;
//       }

//       // add tile object to 2D array
//       tiles[iRow][iCol] = new TileTemplate(val);
//     }
//   }
// }

function showOptimalResult() {
  const optimalScoreDisplay = document.getElementById('optimalScore');
  const optimalMovesDisplay = document.getElementById('optimalMoves');
  optimalScoreDisplay.innerHTML = '--';
  optimalMovesDisplay.innerHTML = '--';
  if (gridSize >= leaderboardGridSize)
    document.getElementById('optimalBox').classList.add('hidden');
  else if (gridSize == 6) {
    document.getElementById('optimalBox').classList.remove('hidden');
    // optimalScoreDisplay.innerHTML = optimalScore[lvlNumber-1];
    // optimalMovesDisplay.innerHTML = optimalMoves[lvlNumber-1];
  } else {
    document.getElementById('optimalBox').classList.remove('hidden');
  }
}

/* -------------- NEW GAME -------------- */

function resetGame() {
  // show and enable tiles
  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {
      // mark all tiles as available
      tiles[iRow][iCol].taken = false;
      // show tile values in UI
      showTile([iRow, iCol]);
      // enable all tile buttons
      const tile = document.getElementById(`tile${iRow}${iCol}`);
      tile.disabled = false;
    }
  }

  // reset game record
  thisGame = new GameRecord();

  // reset score indicator to 0
  updateScoreDisplay(0, 0);

  // remove colors and focus borders from sign boxes
  resetSignBoxColors();
  resetPlusMinusBorders();
}

/* -------------- KEYBOARD INPUT -------------- */

// prevent scrolling from arrow keys
window.onkeydown = (event) => {
  if([38, 40].indexOf(event.keyCode) > -1) {
    event.preventDefault();
  }
};

document.onkeydown = (event) => {
  // no keyboard input allowed before first tile is selected
  if (thisGame.iMoveCur < 0) return;

  // get keycode from keydown event and select coords of move accordingly
  let [iRowCur, iColCur] = thisGame.coords[thisGame.iMoveCur];
  let keyCode = event.keyCode;
  if (keyCode == 37) checkMove([iRowCur, iColCur - 1]); // left
  else if (keyCode == 38) checkMove([iRowCur - 1, iColCur]); // up
  else if (keyCode == 39) checkMove([iRowCur, iColCur + 1]); // right
  else if (keyCode == 40) checkMove([iRowCur + 1, iColCur]); // down
};

// allow move if destination tile is not beyond edge and not taken
function checkMove([iRow, iCol]) {
  if (
    iRow >= 0 &&
    iRow < gridSize &&
    iCol >= 0 &&
    iCol < gridSize &&
    !tiles[iRow][iCol].taken
  ) newMove([iRow, iCol]);
}

/* -------------- MOVING -------------- */

function newMove([iRow, iCol]) {
  // on first move, set colors of sign boxes
  if (thisGame.iMoveCur < 0) setSignBoxColors([iRow, iCol]);

  // remove player token from previous tile, if game started
  if (thisGame.iMoveCur >= 0) hideTile(thisGame.coords[thisGame.iMoveCur]);

  // mark tile as taken
  tiles[iRow][iCol].taken = true;

  const val = tiles[iRow][iCol].value;

  // insert new move into stack, deleting move stack beyond current move
  const maxMoves = gridSize * gridSize;
  thisGame.iMoveCur++;
  thisGame.vals.splice(thisGame.iMoveCur, maxMoves, val);
  thisGame.coords.splice(thisGame.iMoveCur, maxMoves, [iRow, iCol]);
  thisGame.nMoves = thisGame.iMoveCur + 1;

  // update score and flip sign for next move
  thisGame.score += thisGame.sign * val;
  thisGame.sign *= -1;

  doMove([iRow, iCol]);
}

function undoMove() {
  // if first move - reset game
  if (thisGame.iMoveCur <= 0) resetGame();
  else {
    const undoVal = thisGame.vals[thisGame.iMoveCur];
    const [iRowUndo, iColUndo] = thisGame.coords[thisGame.iMoveCur];
    thisGame.sign *= -1;
    thisGame.score -= thisGame.sign * undoVal;
    thisGame.iMoveCur--;

    // restore tile
    tiles[iRowUndo][iColUndo].taken = false;
    showTile([iRowUndo, iColUndo]);

    if (thisGame.finished) {
      // undo end-of-game state
      thisGame.finished = false;

      // undo removal of sign box borders
      if (thisGame.sign == 1)
        document.getElementById('minus_box').classList.add('current_sign');
      else
        document.getElementById('plus_box').classList.add('current_sign');
    }

    doMove(thisGame.coords[thisGame.iMoveCur]);
  }
}

function redoMove() {
  // only redo if not first move, and if current move is less than number
  // of moves made (nothing to redo)
  if (
    thisGame.iMoveCur < 0 ||
    thisGame.iMoveCur == thisGame.nMoves - 1
  ) return;

  thisGame.iMoveCur++;
  const redoVal = thisGame.vals[thisGame.iMoveCur];
  const [iRowRedo, iColRedo] = thisGame.coords[thisGame.iMoveCur];
  thisGame.score += thisGame.sign * redoVal;
  thisGame.sign *= -1;

  // remove tile
  tiles[iRowRedo][iColRedo].taken = true;
  hideTile(thisGame.coords[thisGame.iMoveCur - 1]);

  doMove(thisGame.coords[thisGame.iMoveCur]);
}

// move functionality common for new move, undo, and redo
function doMove([iRow, iCol]) {
  //show icon on new tile coords
  showPlayer([iRow, iCol]);

  disableAllTiles();

  //enables adjacent tiles, and returns boolean of whether any moves are left
  const optionsLeft = enableAdjacentTiles([iRow, iCol]);

  // check for game end
  if (optionsLeft) {
    // change plus-minus style
    togglePlusMinusBorders();
  } else {
    thisGame.finished = true;
    // changes opacity of current tile
    document
      .getElementById(`tile${iRow}${iCol}`)
      .classList.add('tile_dimmed');
    resetPlusMinusBorders();
    checkForHighScore();
  }

  updateScoreDisplay(thisGame.score, thisGame.iMoveCur + 1);
}

/* -------------- ENABLING AND DISABLING TILES -------------- */

function disableAllTiles () {
  [...document.getElementsByClassName('tile')].forEach(
    (tile, index, array) => { tile.disabled = true; }
  );
}

// enable tile adjacent to new player position, if available
// returns boolean of whether any tiles were in fact enabaled
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

// enable tile if not beyond edge and not taken
// return true if tile enabled
function enableTileIfPresent([iRow, iCol]) {
  if (
    iRow < 0 ||
    iRow >= gridSize ||
    iCol < 0 ||
    iCol >= gridSize ||
    tiles[iRow][iCol].taken
  ) return false;
  else {
    document.getElementById(`tile${iRow}${iCol}`).disabled = false;
    return true;
  }
}

/* -------------- TILES APPEARANCE -------------- */

// add number and opacity 1
function showTile([iRow, iCol]) {
  const tile = document.getElementById(`tile${iRow}${iCol}`);
  tile.innerHTML = tiles[iRow][iCol].value;
  tile.classList.remove('tile_dimmed');
}

// remove number and decrease opacity
function hideTile([iRow, iCol]) {
  const tile = document.getElementById(`tile${iRow}${iCol}`);
  tile.innerHTML = '';
  tile.classList.add('tile_dimmed');
}

// add icon of player, and sets opacity to 1 (for undoMove)
function showPlayer([iRow, iCol]) {
  let tileCur = document.getElementById(`tile${iRow}${iCol}`);
  let emoji;
  // happy/neutral/sad depending on score
  if (thisGame.score > 0) emoji = 'happy';
  else if (thisGame.score == 0) emoji = 'neutral';
  else emoji = 'sad';
  tileCur.innerHTML =
    `<span class='mdi mdi-emoticon-${emoji}-outline player_token'></span>`;
  tileCur.classList.remove('tile_dimmed');
}

/* -------------- SHOW SCORE AND MOVES -------------- */

// display game score
function updateScoreDisplay(score, moves) {
  document.getElementById('scoreDisplay').innerHTML = `${score}`;
  document.getElementById('movesDisplay').innerHTML = `${moves}`;
}

/* -------------- CHANGE SIGN BOXES DISPLAY -------------- */

function resetSignBoxColors() {
  const plusMinusPair = document.getElementById('plusminus_pair');
  const plusBox = document.getElementById('plus_box');
  const minusBox = document.getElementById('minus_box');

  plusMinusPair.classList.add('plusminus_pair_pregame');
  plusMinusPair.classList.remove('plusminus_pair_in_game');

  plusBox.classList.remove('plusminus_box_bg');
  minusBox.classList.remove('plusminus_box_bg');
}

function setSignBoxColors([iRow, iCol]) {
  const plusMinusPair = document.getElementById('plusminus_pair');
  const plusBox = document.getElementById('plus_box');
  const minusBox = document.getElementById('minus_box');

  plusMinusPair.classList.remove('plusminus_pair_pregame');
  plusMinusPair.classList.add('plusminus_pair_in_game');

  if ((iRow + iCol) % 2 == 0) plusBox.classList.add('plusminus_box_bg');
  else minusBox.classList.add('plusminus_box_bg');

  plusBox.classList.add('current_sign');
}

function togglePlusMinusBorders() {
  const plusBox = document.getElementById('plus_box');
  const minusBox = document.getElementById('minus_box');

  plusBox.classList.toggle('current_sign');
  minusBox.classList.toggle('current_sign');
}

function resetPlusMinusBorders() {
  const plusBox = document.getElementById('plus_box');
  const minusBox = document.getElementById('minus_box');

  plusBox.classList.remove('current_sign');
  minusBox.classList.remove('current_sign');
}

/* -------------- CHANGE LEVEL -------------- */

function toggleLevelBox() {
  // show current gridsize using active CSS class for relevant button
  const gridsize_btn_id = `gridsize${gridSize}_btn`;
  document.getElementById(gridsize_btn_id).classList.add('active');

  // set input field to current level number
  document.getElementById('lvl_nr_input_field').value = lvlNumber;

  document.getElementById('popup_backdrop').classList.toggle('hidden');
  document.getElementById('new_lvl_box').classList.toggle('hidden');
}

// change the grid size and show
function changeGridSize(newGridSize) {
  const cur_gridsize_btn_id = `gridsize${gridSize}_btn`;
  const new_gridsize_btn_id = `gridsize${newGridSize}_btn`;
  document
    .getElementById(cur_gridsize_btn_id)
    .classList.remove('active');
  document
    .getElementById(new_gridsize_btn_id)
    .classList.add('active');
  gridSize = newGridSize;
}

for (const gridSizeVal of possibleGridSizes) {
  document
    .getElementById(`gridsize${gridSizeVal}_btn`)
    .addEventListener('click', () => changeGridSize(gridSizeVal));
}

function changeLevel() {
  const inputFieldLvlNr = document.getElementById('lvl_nr_input_field');
  const lvl_nr_input = parseInt(inputFieldLvlNr.value);
  if (lvl_nr_input >= 1 && lvl_nr_input <= nLevels) {
    lvlNumber = lvl_nr_input;
    toggleLevelBox();
    loadLevel();
    resetGame();
  } else alert(`Puzzle number should be between 1 and ${nLevels}.`);
}

// set maximum allowed level number in text and input field
document.getElementById('max_lvl_text').innerHTML = nLevels;
document.getElementById('lvl_nr_input_field').max = nLevels;

// cancel and ok button functionality,
// cancel on press escape, submit on press enter
document
  .getElementById('new_lvl_cancel')
  .addEventListener('click', toggleLevelBox);
document
  .getElementById('new_lvl_submit')
  .addEventListener('click', changeLevel);
document
  .getElementById('lvl_nr_input_field')
  .addEventListener('keydown', (event) => {
    if (event.keyCode === 27) toggleLevelBox(); // escape
    else if (event.keyCode === 13) changeLevel(); // enter
  });

/* -------------- LOCAL BEST RESULT -------------- */

// display high score
function updateLocalBestDisplay(localBestScore, localBestMoves) {
  const localBestScoreString =
    localBestScore === Number.NEGATIVE_INFINITY ? '--' : localBestScore;
  const localBestMovesString =
    localBestMoves === Number.POSITIVE_INFINITY ? '--' : localBestMoves;
  document
    .getElementById('localBestScore')
    .innerHTML = `${localBestScoreString}`;
  document
    .getElementById('localBestMoves')
    .innerHTML = `${localBestMovesString}`;
}

function checkForHighScore() {
  // retrieve best result of this level from local storage to compare against
  const localBestScoreKey = getLocalBestScoreKey();
  const localBestMovesKey = getLocalBestMovesKey();
  let localBestScore = +getFromLocalStorage(localBestScoreKey,
    Number.NEGATIVE_INFINITY);
  let localBestMoves = +getFromLocalStorage(localBestMovesKey,
    Number.POSITIVE_INFINITY);

  // replace best result with new result if latter is better
  if (thisGame.score > localBestScore) {
    localBestScore = thisGame.score;
    localBestMoves = thisGame.nMoves;
    updateLocalBestDisplay(localBestScore, localBestMoves);
    setToLocalStorage(localBestScoreKey, localBestScore);
    setToLocalStorage(localBestMovesKey, localBestMoves);
  } else if (
    thisGame.score == localBestScore &&
    thisGame.nMoves < localBestMoves
  ) {
    localBestMoves = thisGame.nMoves;
    updateLocalBestDisplay(localBestScore, localBestMoves);
    setToLocalStorage(localBestMovesKey, localBestMoves);
  }

  if (gridSize >= leaderboardGridSize && thisGame.score >= leaderboardMin)
    showLeaderboardPost();
}

/* -------------- GENERATE LEADERBOARD -------------- */

// wrapper function calling subroutines to generate the leaderboard
async function makeLeaderboard() {
  const leaderboardBox = document.getElementById('leaderboard_box');

  // set leaderboard posting treshold to infinity to temporarily disable
  // posting while the leaderboard is retrieved from the database
  leaderboardMin = Number.POSITIVE_INFINITY;
  leaderboardBox.innerHTML = 'Loading leaderboard...';

  // get leaderboard data from database
  const leaderboardData = await getLeaderboardData();

  // create HTML for leaderboard depending on data returned by database
  // and set minimum value needed to post score to leaderboard
  if (leaderboardData === null) {
    // error with database request
    leaderboardBox.innerHTML = 'Problem retrieving leaderboard data';
    leaderboardMin = Number.POSITIVE_INFINITY;
  } else if (leaderboardData.length === 0) {
    // leaderboard empty
    leaderboardBox.innerHTML = 'No scores yet';
    leaderboardMin = Number.NEGATIVE_INFINITY;
  } else {
    // leaderboard with content
    const leaderboardList = processLeaderboardData(leaderboardData);
    leaderboardBox.innerHTML = renderLeaderboard(leaderboardList);
    if (leaderboardList.length == maxEntriesLeaderboard)
      leaderboardMin = leaderboardList[maxEntriesLeaderboard-1].score;
    else leaderboardMin = Number.NEGATIVE_INFINITY;
  }
}

// get raw array of game results from database
async function getLeaderboardData() {
  const lvlID = getLvlID();
  const route = `${api}/highscores/lvl/${lvlID}`;

  try {
    const response = await fetch(route);
    return await response.json();
  } catch (err) {
    console.log(err);
    return null;
  }
}

// process raw array of game results to create array of scores with
// all player names that achieved that score
function processLeaderboardData(leaderboardData) {
  // find unique scores
  const allScores = leaderboardData.map(game => game.score);
  const uniqueScores = [...new Set(allScores)];

  let leaderboardList = [];
  let namesDone = [];
  let nEntries = 0;
  for (const score of uniqueScores) {
    // find uniques number of moves for each score
    let allMoves = [];
    for (const game of leaderboardData) {
      if (game.score == score) allMoves.push(game.nMoves);
    }
    const uniqueMoves = [...new Set(allMoves)];

    for (const moves of uniqueMoves) {
      // collect player names for each unique score-moves combination
      // also check if player is already listed with better score
      let names = [];
      let entryWithContent = false;
      for (const game of leaderboardData) {
        if (
            game.score == score &&
            game.nMoves == moves &&
            !(namesDone.includes(game.playerName))
          ) {
            names.push(game.playerName);
            namesDone.push(game.playerName);
            entryWithContent = true;
          }
      }
    
      // add entry unless all players in entry are already listed
      // in earlier entries (with better score)
      if (entryWithContent) {
        leaderboardList.push({
          score: score,
          moves: moves,
          names: names
        });
        nEntries++;
      }
    }

    // stop if leaderboard reaches its maximum allowed length
    if (nEntries == maxEntriesLeaderboard) break;
  }

  return leaderboardList;
}

// render HTML for leaderboard
function renderLeaderboard(leaderboardList) {
  return `
    <div class= "leaderboard_list_item">
      <span class="center_text"><u>Score</u></span>
      <span class="center_text"><u>Moves</u></span>
      <span><u>Leaderboard</u></span>
    </div>
    ` + leaderboardList.reduce((acc, current) =>
        (acc += `
          <div class="leaderboard_list_item">
            <span class="center_text">${current.score}</span>
            <span class="center_text">${current.moves}</span>
            <span>${current.names.join(', ')}</span>
          </div>
        `),
      '');
}

/* -------------- POST TO LEADERBOARD -------------- */

// reveal button to post score to the leaderboard
function showLeaderboardPost() {
  document
    .getElementById('popup_backdrop')
    .classList.remove('hidden');
  document
    .getElementById('leaderboard_post_box')
    .classList.remove('hidden');

  // show score and moves
  document.getElementById('leaderboard_post_score').innerHTML = thisGame.score;
  document.getElementById('leaderboard_post_moves').innerHTML = thisGame.nMoves;

  // retrieve username from local storage, defaults to null
  const userName = getFromLocalStorage(userNameKey, null);

  // show username in input text field
  document.getElementById('username_input_field').value = userName;

  // if there is no username yet, put cursor in input field
  if (userName === null)
    document.getElementById('username_input_field').focus();
}

// hide button to post score to the leaderboard
function hideLeaderboardPost() {
  document
    .getElementById('popup_backdrop')
    .classList.add('hidden');
  document
    .getElementById('leaderboard_post_box')
    .classList.add('hidden');
}

// post current score to the database
async function postToLeaderboard() {
  // get username from user
  const userName = getUsername();

  // if username is invalid, break out of posting function
  // and put cursor back to input field
  if (userName === null) {
    document.getElementById('username_input_field').focus();
    return;
  }

  // remove box for posting to leaderboard
  hideLeaderboardPost();

  // add username to game record, which is sent to database
  thisGame.playerName = userName;

  // send game record to API
  const route = api + '/submitScore';
  const response = await fetch(route, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(thisGame),
  });

  // handle errors
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // refresh leaderboard to show new entry
  makeLeaderboard();
}

// get username from text input field
// return true if success, return false if username suppplied is invalid
function getUsername() {
  let userName = document.getElementById('username_input_field').value;

  // if username supplied is invalid, alert user, and return null
  const validUsernameRegExp = new RegExp('^([a-zA-Z0-9_-]{3,16})$');
  if (!validUsernameRegExp.test(userName)) {
    alert('Your username can only contain alphanumeric, '
      + ' underscore, and hyphen characters (a-z A-Z 0-9 _ -). '
      + 'It should be at least 3 characters long.');
    return null;
  }

  // store username for next time
  setToLocalStorage(userNameKey, userName);

  return userName;
}

// cancel and ok button functionality,
// cancel on press escape, submit on press enter
document
  .getElementById('leaderboard_post_cancel')
  .addEventListener('click', hideLeaderboardPost);
document
  .getElementById('leaderboard_post_submit')
  .addEventListener('click', postToLeaderboard);
document
  .getElementById('username_input_field')
  .addEventListener('keydown', (event) => {
    if (event.keyCode === 27) hideLeaderboardPost(); // escape
    else if (event.keyCode === 13) postToLeaderboard(); // enter
  });

/* -------------- MAIN UI BUTTONS -------------- */

document
  .getElementById('new_lvl_btn')
  .addEventListener('click', toggleLevelBox);
document
  .getElementById('restart_btn')
  .addEventListener('click', resetGame);
document
  .getElementById('undo_btn')
  .addEventListener('click', undoMove);
document
  .getElementById('redo_btn')
  .addEventListener('click', redoMove);

/* -------------- STARTUP -------------- */

(function startup() {
  // set color theme, defaults to dark
  colorTheme = getFromLocalStorage(colorThemeKey, 'dark');
  setColorTheme();
  
  // get current grid size from local storage, defaults to 6x6
  gridSize = +getFromLocalStorage(currentGridSizeKey, 6);
  
  // get current level ID from local storage, defaults to level 1
  lvlNumber = +getFromLocalStorage(currentLvlKey, 1);
  
  // generate level and start game
  loadLevel();
  resetGame();
})();
