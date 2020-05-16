const gridSize = 6;
const maxVal = 7;
const minVal = 1;

document.documentElement.style.setProperty('--cell_size', 100/gridSize + "%");

grid();

document.addEventListener('keydown', () => keyDownHandler(event), false);

localStorage.setItem("highScore", 0);
let highScore = localStorage.getItem("highScore");
if (highScore == null) {
  highScore = 0;
}
document.getElementById('highScoreText').innerHTML = `Highscore: ${highScore}`;

let nLevels = 100;
let score = 0;
let currentSign = 1;
let prestart = true;
let sumText = '';

let iRowCur, iColCur;

let lvl_id = 1;
resetGame(lvl_id);


// Creating the grid
function grid() {
    let grid = document.getElementById('grid');

    for (let iRow = 0; iRow < gridSize; iRow += 1) {
        let row = document.createElement('div');
        row.className = 'row';

        for (let iCol = 0; iCol < gridSize; iCol += 1) {
            let btn = document.createElement('button');
            btn.className = 'btn';
            btn.id = `btn${iRow}${iCol}`;
            btn.addEventListener('click', () => btnClick([iRow, iCol]));
            row.appendChild(btn);
        };

        grid.appendChild(row);
    };
};


function resetGame(lvl_id) {

  showSign();
  showScore();
  showLevel();

  // Seed PRNG
  let lvlRNG = new Math.seedrandom(lvl_id);

  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {

      let val = Math.floor(lvlRNG() * (maxVal - minVal + 1)) + minVal;

      let btn = document.getElementById(`btn${iRow}${iCol}`);
      btn.disabled = false;
      btn.innerHTML = val;
      btn.style.setProperty('color', 'tomato');
      btn.style.setProperty('opacity', 1);

    }
  }
}


function checkMove([iRow, iCol]) {
  if (iRow >= 0 && iRow < gridSize && iCol >= 0 && iCol < gridSize) {
    let btn = document.getElementById(`btn${iRow}${iCol}`);
    if (btn.innerHTML > 0) {
      btnClick([iRow, iCol]);
    }
  }
}


function btnClick([iRow, iCol]) {
  if (prestart) {
    prestart = false;
  }
  else {
    let btnOrigin = document.getElementById(`btn${iRowCur}${iColCur}`);
    btnOrigin.innerHTML = '\&nbsp;';
    btnOrigin.style.setProperty('opacity', 0.5);
  }
  let btnDestin = document.getElementById(`btn${iRow}${iCol}`);
  btnDestin.style.setProperty('color', 'white');
  let val = btnDestin.innerHTML;
  [iRowCur, iColCur] = [iRow, iCol];

  score += currentSign * val;
  showScore();
  showResult(val);
  currentSign *= -1;
  showSign();

  disableButtons();

  let btn = document.getElementById(`btn${iRow}${iCol}`);
  btnDestin.innerHTML = '&#9787;';
  btnDestin.disabled = true;

  let nOptions = enableButtons([iRow, iCol]);
  if (nOptions == 0) {
    btnDestin.style.setProperty('opacity', 0.5);
    endGame();
  }
}


function onPressRestart() {
  score = 0;
  currentSign = 1;
  prestart = true;
  sumText = '';
  document.getElementById('resultText').innerHTML = '\&nbsp;';
  resetGame(lvl_id);
}


function onPressNewLevel() {
  highScore = 0;
  lvl_id = Math.ceil(Math.random() * nLevels);
  onPressRestart();
}


function endGame() {
  if (score > highScore) {
    highScore = score;
    document.getElementById('highScoreText').innerHTML = `Highscore: ${highScore}`;
    localStorage.setItem("highScore", highScore);
  }
}


function keyDownHandler(event) {
  if (!prestart) {
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


function enableButtons([iRowNow, iColNow]) {
  let nOptions = 0;

  for (const iRow of [iRowNow + 1, iRowNow - 1]) {
    nOptions += toggleButton([iRow, iColNow]);
  }
  for (const iCol of [iColNow + 1, iColNow - 1]) {
    nOptions += toggleButton([iRowNow, iCol]);
  }

  return nOptions;
}

function toggleButton([iRow, iCol]) {
  let enabledButton = 0;
  if (iRow >= 0 && iRow < gridSize && iCol >= 0 && iCol < gridSize) {
    let btn = document.getElementById(`btn${iRow}${iCol}`);
    if (btn.innerHTML > 0) {
      btn.disabled = false;
      enabledButton = 1;
    }
    else {
      btn.disabled = true;
    }
  }
  return enabledButton;
}


function disableButtons() {
  for (let iRow = 0; iRow < gridSize; iRow++) {
    for (let iCol = 0; iCol < gridSize; iCol++) {
      let btn = document.getElementById(`btn${iRow}${iCol}`);
      btn.disabled = true;
    }
  }
}


function showResult(val) {
  if (sumText == '') {
    sumText += `${val} `;
    document.getElementById('resultText').innerHTML = `Score = ${score}`;
  }
  else {
    sumText += `${currentSign == -1 ? '-' : '+'} ${val} `;
    document.getElementById('resultText').innerHTML = `Score = ${sumText} = ${score}`;
  }
}


function showScore() {
  document.getElementById('scoreText').innerHTML = `Score: ${score.toString().padStart(3, ' ')}`;
}


function showSign() {
  document.getElementById('signText').innerHTML = `Next sign: ${currentSign == -1 ? '-' : '+'}`;
}


function showLevel() {
  document.getElementById('lvlText').innerHTML = `Puzzle ID: ${lvl_id}`;
}
