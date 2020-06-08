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
  constructor(lvlID) {
    this.playerName = '';
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

/* -------------- GLOBAL PARAMETERS -------------- */

// local storage keys
const keyRoot = 'plusminus_grid_puzzle_';
const colorThemeKey = keyRoot + 'color_theme';
const userNameKey = keyRoot + 'username';
const currentLvlKey = keyRoot + 'current_lvl';

// theme
let colorTheme

// leaderboard
// const api = 'http://localhost:27017';
const api = 'https://plus-minus-grid-puzzle.herokuapp.com';
let leaderboardMin;
const maxEntriesLeaderboard = 10;

// game parameters
const nLevels = 10;
const gridSize = 6;
const maxTileVal = 7;
const minTileVal = 1;

// 2D array that stores tile objects
const tiles = new Array(gridSize);
for (let iRow = 0; iRow < gridSize; iRow++) {
  tiles[iRow] = new Array(gridSize);
}

// current level and current game record
let lvl_id;
let thisGame;

/* -------------- CORE FUNCTIONS -------------- */

function getRandomIntIncl(min, max, randFunc = Math.random) {
  return Math.floor(randFunc() * (max - min + 1)) + min;
}

/* -------------- LOCAL STORAGE -------------- */

function getFromLocalStorage(key, defaultValue = '0') {
  if (!(key in localStorage)) return defaultValue;
  else return localStorage.getItem(key);
}

function setToLocalStorage(key, value) {
  localStorage.setItem(key, value);
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

/*--------------CREATE GRID--------------*/

document.documentElement.style.setProperty('--grid_size', gridSize);

function createGrid() {
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

/* -------------- GENERATE LEVEL -------------- */

// load level: add values to tiles, according to puzzle ID
function loadLevel(lvlID) {
  // create random number generator for this level
  let lvlRNG = new Math.seedrandom(lvlID);

  // add values to tiles
  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {
      // obtain random integer in range [minTileVal, maxTileVal]
      const val = getRandomIntIncl(minTileVal, maxTileVal, lvlRNG);
      // add tile object to 2D array
      tiles[iRow][iCol] = new TileTemplate(val);
    }
  }

  // store current level ID in local storage
  // to allow continue playing same level after browser refresh
  setToLocalStorage(currentLvlKey, lvlID);

  // show level ID
  document.getElementById('lvlText').innerHTML = `Puzzle ID: ${lvlID}`;

  // get level high score from local storage (defaults to -inf), and show it
  const highScoreKey = getHighScoreKey(lvlID);
  const highScore = +getFromLocalStorage(highScoreKey,
    Number.NEGATIVE_INFINITY);
  updateHighScoreDisplay(highScore);

  // retrieve leaderboard data from server and show
  makeLeaderboard();
}

/* -------------- NEW GAME -------------- */

function resetGame() {
  // show and enable tiles
  resetLevel();

  // reset game record
  thisGame = new GameRecord(lvl_id);

  // disable button to post scores to leaderboard
  hideLeaderboardPost();

  // reset score indicator to 0
  updateScoreDisplay(thisGame.score);

  // remove colors and focus borders from sign boxes
  resetSignBoxColors();
  resetPlusMinusBorders();
}

function resetLevel() {
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
}

/* -------------- KEYBOARD INPUT -------------- */

// prevent scrolling from arrow keys
window.onkeydown = (event) => {
  if([37, 38, 39, 40].indexOf(event.keyCode) > -1) {
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

      // disable posting to the leaderboard
      hideLeaderboardPost();

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
    checkForHighScore(thisGame.lvlID);
  }

  updateScoreDisplay(thisGame.score);
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

/* -------------- SHOW SCORE AND HIGHSCORE -------------- */

// display game score
function updateScoreDisplay(score) {
  document
    .getElementById('scoreDisplay')
    .innerHTML = `Score: ${score}`;
}

// display high score
function updateHighScoreDisplay(highScore) {
  const highScoreString =
    highScore === Number.NEGATIVE_INFINITY ? '--' : highScore;
  document
    .getElementById('highScoreDisplay')
    .innerHTML = `Highscore: ${highScoreString}`;
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

/* -------------- BUTTONS -------------- */

function toggleLevel() {
  // set input field to current puzzle id
  document.getElementById('lvl_id_input_field').value = lvl_id;
  document.getElementById('new_lvl_box').classList.toggle('hidden');
}

function toggleLeaderb() {
  document.getElementById('leaderboard_box').classList.toggle('hidden');
}

function toggleInfo() {
  document.getElementById('info_text').classList.toggle('hidden');
}

document.getElementById('new_lvl_btn').addEventListener('click', toggleLevel);
document.getElementById('leaderb_btn').addEventListener('click', toggleLeaderb);
document.getElementById('info_btn').addEventListener('click', toggleInfo);
document.getElementById('restart_btn').addEventListener('click', resetGame);
document.getElementById('undo_btn').addEventListener('click', undoMove);
document.getElementById('redo_btn').addEventListener('click', redoMove);

/* -------------- CHANGE LEVEL -------------- */

// set maximum allowed puzzle ID in text and input field
document.getElementById('max_lvl_text').innerHTML = nLevels;
document.getElementById('lvl_id_input_field').max = nLevels;

function changeLevel() {
  const inputField = document.getElementById('lvl_id_input_field');
  const lvl_id_input = parseInt(inputField.value);
  if (lvl_id_input >= 1 && lvl_id_input <= nLevels) {
    lvl_id = lvl_id_input;
    toggleLevel();
    loadLevel(lvl_id);
    resetGame();
  } else alert(`Puzzle ID should be between 1 and ${nLevels}.`);
}

document
  .getElementById('new_lvl_cancel')
  .addEventListener('click', toggleLevel);

document
  .getElementById('new_lvl_submit')
  .addEventListener('click', changeLevel);

document
  .getElementById('lvl_id_input_field')
  .addEventListener('keydown', (event) => {
    if (event.keyCode === 13) changeLevel();
  });

/* -------------- HIGH SCORE -------------- */

function getHighScoreKey(lvlID) {
  return `${keyRoot}highscore_lvl_A${lvlID}`;
}

function checkForHighScore(lvlID) {
  const highScoreKey = getHighScoreKey(lvlID);
  let highScore = +getFromLocalStorage(highScoreKey, Number.NEGATIVE_INFINITY);

  if (thisGame.score > highScore) {
    highScore = thisGame.score;
    updateHighScoreDisplay(highScore);
    setToLocalStorage(highScoreKey, highScore);
  }

  if (thisGame.score >= leaderboardMin) showLeaderboardPost();
}

/* -------------- GENERATE LEADERBOARD -------------- */

// wrapper function calling subroutines to generate the leaderboard
async function makeLeaderboard() {
  const leaderboardBox = document.getElementById('leaderboard_box');
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
  const route = `${api}/highscores/lvl/${lvl_id}`;

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
      let names = [];
      let entryWithContent = false;
      for (const game of leaderboardData) {
        // also check if player is already listed with better score
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
    
      // check if player is already lister with better score
      if (entryWithContent) {
        leaderboardList.push({
          score: score,
          moves: moves,
          names: names
        });
        nEntries++;
      }
    }
    if (nEntries == maxEntriesLeaderboard) break;
  }

  return leaderboardList;
}

// render HTML for leaderboard
function renderLeaderboard(leaderboardList) {
  return `
    <div class= "leaderboard_list_item">
      <span><u>Score</u></span>
      <span><u>Moves</u></span>
      <span class="leaderboard_names"><u>Players</u></span>
    </div>
    ` + leaderboardList.reduce((acc, current) =>
        (acc += `
          <div class="leaderboard_list_item">
            <span>${current.score}</span>
            <span>${current.moves}</span>
            <span class="leaderboard_names">${current.names.join(', ')}</span>
          </div>
        `),
      '');
}

/* -------------- POST TO LEADERBOARD -------------- */

// reveal button to post score to the leaderboard
function showLeaderboardPost() {
  document
    .getElementById('leaderboard_post_box')
    .classList.remove('hidden');

  // retrieve username from local storage, defaults to empty string
  const userName = getFromLocalStorage(userNameKey, '');

  // show username in input text field
  document.getElementById('username_input_field').value = userName;

  // put cursor in input field
  document.getElementById('username_input_field').focus();
}

// hide button to post score to the leaderboard
function hideLeaderboardPost() {
  // showLeaderboardPost();
  document
    .getElementById('leaderboard_post_box')
    .classList.add('hidden');
}

// post current score to the database
async function postToLeaderboard() {
  // get username from user
  const userName = getUsername();

  // break out of posting function if username is invalid
  if (userName === null) return;

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

document
  .getElementById('leaderboard_post_cancel')
  .addEventListener('click', hideLeaderboardPost);

document
  .getElementById('leaderboard_post_submit')
  .addEventListener('click', postToLeaderboard);

document
  .getElementById('username_input_field')
  .addEventListener('keydown', (event) => {
    if (event.keyCode === 13) postToLeaderboard();
  });

/* -------------- STARTUP -------------- */

// set color theme
colorTheme = getFromLocalStorage(colorThemeKey, 'dark');
setColorTheme();

// construct grid of tiles
createGrid();

// get current level ID from local storage, defaults to level 1
lvl_id = +getFromLocalStorage(currentLvlKey, 1);

// generate level and start game
loadLevel(lvl_id);
resetGame();
