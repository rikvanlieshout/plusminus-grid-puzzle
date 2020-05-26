import {
  getFromLocalStorage,
  setToLocalStorage,
} from "./localStorageHandler.js";

const UI_MODES = {
  light: 0,
  dark: 1,
};

const defaultTheme = UI_MODES.light;

const THEME_KEY = "plusminus_grid_puzzle_color_theme";

let theme = +getFromLocalStorage(THEME_KEY, defaultTheme);

const body = document.body;
const toggle = document.querySelector('#theme_toggle_icon');

const determineBodyClass = () => {
  if (theme == UI_MODES.dark) {
    body.classList.remove("light");
    body.classList.add("dark");
    toggle.classList.add('mdi-toggle-switch-outline');
    toggle.classList.remove('mdi-toggle-switch-off-outline');
  } else {
    body.classList.add("light");
    body.classList.remove("dark");
    toggle.classList.add('mdi-toggle-switch-off-outline');
    toggle.classList.remove('mdi-toggle-switch-outline');
  }
};

export const toggleTheme = () => {
  theme = theme === UI_MODES.dark ? UI_MODES.light : UI_MODES.dark;
  setToLocalStorage(THEME_KEY, theme);
  determineBodyClass();
};

determineBodyClass();
