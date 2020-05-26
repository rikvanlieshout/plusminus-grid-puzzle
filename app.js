// --- import modules ---
import {
  setToLocalStorage,
  getFromLocalStorage,
} from './modules/localStorageHandler.js';
import { toggleTheme } from './modules/themeHandling.js';

// --- main ---
(function() {

  // --- some global game parameters ---

  const nLevels = 10;

  const gridSize = 6;

  const maxTileVal = 7;
  const minTileVal = 1;

  const maxMoves = gridSize * gridSize;

  let lvl_id;

  /*--------------THEME--------------*/

  document
    .querySelector('#theme_toggler')
    .addEventListener('click', toggleTheme);

  /*--------------CREATE GRID--------------*/

  document.documentElement.style.setProperty('--grid_size', gridSize);

  const createGrid = () => {
    const grid = document.querySelector('#grid');

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
  };

  /* -------------- GENERATE LEVEL -------------- */

  // class to store values of tiles and booleans of whether they're taken
  class TileTemplate {
    constructor(value) {
      this.value = value;
      this.taken = false;
    }
  }

  // 2D array that stores tile objects
  const tiles = new Array(gridSize);
  for (let iRow = 0; iRow < gridSize; iRow++) {
    tiles[iRow] = new Array(gridSize);
  }

  const loadLevel = (lvlID) => {
    // create random number generator for this level
    let lvlRNG = new Math.seedrandom(lvlID);

    // add values to tiles
    for (let iRow = 0; iRow < gridSize; iRow++) {
      for (let iCol = 0; iCol < gridSize; iCol++) {
        // obtain random integer in range [minTileVal, maxTileVal]
        const val =
          Math.floor(lvlRNG() * (maxTileVal - minTileVal + 1)) + minTileVal;

        // add tile object to 2D array
        tiles[iRow][iCol] = new TileTemplate(val);

        // show tile values in UI
        showTile([iRow, iCol]);

        // enable all tiles
        const tile = document.getElementById(`tile${iRow}${iCol}`);
        tile.disabled = false;
      }
    }

    // store current level ID in local storage
    // to allow continue playing same level after browser refresh
    setToLocalStorage('plusminus_current_lvl', lvl_id);

    // show level ID
    document.getElementById('lvlText').innerHTML = `Puzzle ID: ${lvlID}`;

    // get level high score from local storage (defaults to -inf), and show it
    const highScoreKey = getHighScoreKey(lvlID);
    const highScore =
      +getFromLocalStorage(highScoreKey, Number.NEGATIVE_INFINITY);
    updateHighScoreDisplay(highScore);
  };

  /* -------------- NEW GAME -------------- */

  // class to record details of a game
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

  let thisGame = new GameRecord(lvl_id);

  const resetGame = (lvlID) => {
    // load level: add values to tiles, according to puzzle ID
    loadLevel(lvlID);

    // reset game record
    thisGame = new GameRecord(lvlID);

    // reset score indicator to 0
    updateScoreDisplay(thisGame.score);

    // remove colors and focus borders from sign boxes
    resetSignBoxColors();
    resetPlusMinusBorders();
  };

  /* -------------- KEYBOARD INPUT -------------- */

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
  const checkMove = ([iRow, iCol]) => {
    if (
      iRow >= 0 && iRow < gridSize && iCol >= 0 && iCol < gridSize &&
      !tiles[iRow][iCol].taken
    )
      newMove([iRow, iCol]);
  };

  /* -------------- MOVING -------------- */

  // --- new move ---
  const newMove = ([iRow, iCol]) => {
    // on first move, set colors of sign boxes
    if (thisGame.iMoveCur < 0) setSignBoxColors([iRow, iCol]);

    // remove player token from previous tile, if game started
    if (thisGame.iMoveCur >= 0) hideTile(thisGame.coords[thisGame.iMoveCur]);

    // mark tile as taken
    tiles[iRow][iCol].taken = true;

    const val = tiles[iRow][iCol].value;

    // insert new move into stack, deleting move stack beyond current move
    thisGame.iMoveCur++;
    thisGame.vals.splice(thisGame.iMoveCur, maxMoves, val);
    thisGame.coords.splice(thisGame.iMoveCur, maxMoves, [iRow, iCol]);
    thisGame.nMoves = thisGame.iMoveCur + 1;

    // update score and flip sign for next move
    thisGame.score += thisGame.sign * val;
    thisGame.sign *= -1;

    doMove([iRow, iCol]);
  };

  // --- undo move ---
  document.querySelector('#undo_button').addEventListener('click', () => {
    // if first move - reset game
    if (thisGame.iMoveCur <= 0) resetGame(lvl_id);
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
  });

  // --- redo move ---
  document.querySelector('#redo_button').addEventListener('click', () => {
    // only redo if not first move, and if current move is less than number
    // of moves made (nothing to redo)
    if (
      thisGame.iMoveCur < 0 ||
      thisGame.iMoveCur == thisGame.nMoves - 1
    ) return;

    thisGame.iMoveCur++;
    const redoVal = thisGame.vals[thisGame.iMoveCur];
    const [iRowRedo, iColRedo] = thisGame.coords[thisGame.iMoveCur - 1];
    thisGame.score += thisGame.sign * redoVal;
    thisGame.sign *= -1;

    // remove tile
    tiles[iRowRedo][iColRedo].taken = true;
    hideTile([iRowRedo, iColRedo]);

    doMove(thisGame.coords[thisGame.iMoveCur]);
  });

  // move functionality common for new move, undo, and redo
  const doMove = ([iRow, iCol]) => {
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

  const disableAllTiles = () => {
    [...document.getElementsByClassName('tile')].forEach(
      (tile, index, array) => { tile.disabled = true; }
    );
  };

  // enable tile adjacent to new player position, if available
  // returns boolean of whether any tiles were in fact enabaled
  const enableAdjacentTiles = ([iRowNow, iColNow]) => {
    let enabledTiles = false;

    for (const iRow of [iRowNow + 1, iRowNow - 1]) {
      if (enableTileIfPresent([iRow, iColNow])) enabledTiles = true;
    }
    for (const iCol of [iColNow + 1, iColNow - 1]) {
      if (enableTileIfPresent([iRowNow, iCol])) enabledTiles = true;
    }

    return enabledTiles;
  };

  // enable tile if not beyond edge and not taken
  // return true if tile enabled
  const enableTileIfPresent = ([iRow, iCol]) => {
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
  };

  /* -------------- TILES APPEARANCE -------------- */

  // add number and opacity 1
  const showTile = ([iRow, iCol]) => {
    const tile = document.getElementById(`tile${iRow}${iCol}`);
    tile.innerHTML = tiles[iRow][iCol].value;
    tile.classList.remove('tile_dimmed');
  };

  // remove number and decrease opacity
  const hideTile = ([iRow, iCol]) => {
    const tile = document.getElementById(`tile${iRow}${iCol}`);
    tile.innerHTML = '';
    tile.classList.add('tile_dimmed');
  };

  // add icon of player, and sets opacity to 1 (for undoMove)
  const showPlayer = ([iRow, iCol]) => {
    let tileCur = document.getElementById(`tile${iRow}${iCol}`);
    let emoji;
    // happy/neutral/sad depending on score
    if (thisGame.score > 0) emoji = 'happy';
    else if (thisGame.score == 0) emoji = 'neutral';
    else emoji = 'sad';
    tileCur.innerHTML =
      `<span class='mdi mdi-emoticon-${emoji}-outline player_token'></span>`;
    tileCur.classList.remove('tile_dimmed');
  };

  /* -------------- SHOW SCORE AND HIGHSCORE -------------- */

  // display game score
  const updateScoreDisplay = (score) => {
    document
      .getElementById('scoreDisplay')
      .innerHTML = `Score: ${score}`;
  };

  // display high score
  const updateHighScoreDisplay = (highScore) => {
    const highScoreString =
      highScore === Number.NEGATIVE_INFINITY ? '--' : highScore;
    document
      .getElementById('highScoreDisplay')
      .innerHTML = `Highscore: ${highScoreString}`;
  };

  /* -------------- CHANGE SIGN BOXES DISPLAY -------------- */

  const plusMinusPair = document.getElementById('plusminus_pair');
  const plusBox = document.getElementById('plus_box');
  const minusBox = document.getElementById('minus_box');

  const resetSignBoxColors = () => {
    plusMinusPair.classList.add('plusminus_pair_pregame');
    plusMinusPair.classList.remove('plusminus_pair_in_game');

    plusBox.classList.remove('plusminus_box_bg');
    minusBox.classList.remove('plusminus_box_bg');
  };

  const setSignBoxColors = ([iRow, iCol]) => {
    plusMinusPair.classList.remove('plusminus_pair_pregame');
    plusMinusPair.classList.add('plusminus_pair_in_game');

    if ((iRow + iCol) % 2 == 0) plusBox.classList.add('plusminus_box_bg');
    else minusBox.classList.add('plusminus_box_bg');

    plusBox.classList.add('current_sign');
  };

  const togglePlusMinusBorders = () => {
    plusBox.classList.toggle('current_sign');
    minusBox.classList.toggle('current_sign');
  };

  const resetPlusMinusBorders = () => {
    plusBox.classList.remove('current_sign');
    minusBox.classList.remove('current_sign');
  };

  // BUTTON FUNCTIONS

  document.querySelector('#restart_button').addEventListener('click', () => {
    resetGame(lvl_id);
  });

  document.querySelector('#prev_lvl_button').addEventListener('click', () => {
    lvl_id = ((lvl_id - nLevels - 1) % nLevels) + nLevels;
    resetGame(lvl_id);
  });

  document.querySelector('#next_lvl_button').addEventListener('click', () => {
    lvl_id = (lvl_id % nLevels) + 1;
    resetGame(lvl_id);
  });

  document.querySelector('#info_button').addEventListener('click', () => {
    document.getElementById('info_text').classList.toggle('hidden');
  });

  /* -------------- HIGH SCORE FUNCTIONS -------------- */

  const checkForHighScore = (lvlID) => {
    const key = getHighScoreKey(lvlID);
    let highScore = +getFromLocalStorage(key, Number.NEGATIVE_INFINITY);

    if (thisGame.score > highScore) {
      highScore = thisGame.score;
      updateHighScoreDisplay(highScore);
      setToLocalStorage(key, highScore);
    }
  };

  const getHighScoreKey = (lvlID) => {
    return `plusminus_highscore_lvl_a${lvlID}`;
  };

  /* -------------- STARTUP METHODS -------------- */

  const startupMethods = () => {
    // construct grid of tiles
    createGrid();
    // get current level ID from local storage, defaults to level 1
    lvl_id = +getFromLocalStorage('plusminus_current_lvl', 1);
    // generate level and start game
    resetGame(lvl_id);
  };

  startupMethods();

})();
