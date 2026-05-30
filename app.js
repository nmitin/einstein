const categories = [
  {
    id: "color",
    title: "Цвет",
    items: [
      { id: "red", label: "Красный", symbol: "■", color: "#e34848" },
      { id: "green", label: "Зеленый", symbol: "■", color: "#2fa66a" },
      { id: "white", label: "Белый", symbol: "□" },
      { id: "yellow", label: "Желтый", symbol: "■", color: "#e3b52d" },
      { id: "blue", label: "Синий", symbol: "■", color: "#356fe8" },
    ],
  },
  {
    id: "nation",
    title: "Житель",
    items: [
      { id: "brit", label: "Англичанин", symbol: "A" },
      { id: "swede", label: "Швед", symbol: "Ш" },
      { id: "dane", label: "Датчанин", symbol: "Д" },
      { id: "norwegian", label: "Норвежец", symbol: "Н" },
      { id: "german", label: "Немец", symbol: "Г" },
    ],
  },
  {
    id: "drink",
    title: "Напиток",
    items: [
      { id: "tea", label: "Чай", symbol: "Ч" },
      { id: "coffee", label: "Кофе", symbol: "К" },
      { id: "milk", label: "Молоко", symbol: "М" },
      { id: "beer", label: "Пиво", symbol: "П" },
      { id: "water", label: "Вода", symbol: "В" },
    ],
  },
  {
    id: "smoke",
    title: "Сигареты",
    items: [
      { id: "pallmall", label: "Pall Mall", symbol: "PM" },
      { id: "dunhill", label: "Dunhill", symbol: "D" },
      { id: "blend", label: "Blend", symbol: "B" },
      { id: "bluemaster", label: "BlueMaster", symbol: "BM" },
      { id: "prince", label: "Prince", symbol: "P" },
    ],
  },
  {
    id: "pet",
    title: "Питомец",
    items: [
      { id: "dogs", label: "Собаки", symbol: "С" },
      { id: "birds", label: "Птицы", symbol: "Пт" },
      { id: "cats", label: "Кошки", symbol: "Кш" },
      { id: "horses", label: "Лошади", symbol: "Л" },
      { id: "fish", label: "Рыбки", symbol: "Р" },
    ],
  },
];

const categoryIds = categories.map((category) => category.id);
const storageKey = "einstein-web-puzzle-state-v2";
const legacyStorageKey = "einstein-web-puzzle-state";
const maxGeneratorAttempts = 80;
const maxSolverSolutions = 2;

const state = {
  selected: null,
  activeHouse: 0,
  paused: false,
  seconds: 0,
  board: {},
  notes: {},
  revealedHints: new Set(),
  puzzle: null,
};

const palette = document.querySelector("#palette");
const board = document.querySelector("#board");
const cluesList = document.querySelector("#clues");
const houseTabs = document.querySelector("#houseTabs");
const timer = document.querySelector("#timer");
const pauseButton = document.querySelector("#pauseButton");
const resetButton = document.querySelector("#resetButton");
const clearButton = document.querySelector("#clearButton");
const hintButton = document.querySelector("#hintButton");
const statusPill = document.querySelector("#statusPill");
const logicGrid = document.querySelector("#logicGrid");
const resultModal = document.querySelector("#resultModal");
const modalTitle = document.querySelector("#modalTitle");
const modalText = document.querySelector("#modalText");

function itemById(id) {
  return categories.flatMap((category) => category.items).find((item) => item.id === id);
}

function categoryById(id) {
  return categories.find((category) => category.id === id);
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function sample(values, count) {
  return shuffle(values).slice(0, count);
}

function makeRandomSolution() {
  const solution = Array.from({ length: 5 }, () => ({}));
  categories.forEach((category) => {
    shuffle(category.items).forEach((item, houseIndex) => {
      solution[houseIndex][category.id] = item.id;
    });
  });
  return solution;
}

function posOf(solution, itemId) {
  return solution.findIndex((house) => Object.values(house).includes(itemId));
}

function itemCategory(itemId) {
  return categoryIds.find((id) => categoryById(id).items.some((item) => item.id === itemId));
}

function itemText(itemId) {
  return itemById(itemId)?.label || itemId;
}

function clueText(clue) {
  if (clue.type === "same") return `${itemText(clue.a)} связан с ${itemText(clue.b)}.`;
  if (clue.type === "position") return `${itemText(clue.a)} находится в доме №${clue.pos + 1}.`;
  if (clue.type === "leftOf") return `${itemText(clue.a)} стоит сразу слева от ${itemText(clue.b)}.`;
  if (clue.type === "rightOf") return `${itemText(clue.a)} стоит сразу справа от ${itemText(clue.b)}.`;
  if (clue.type === "nextTo") return `${itemText(clue.a)} живет рядом с ${itemText(clue.b)}.`;
  return "Условие.";
}

function clueKey(clue) {
  return [clue.type, clue.a, clue.b, clue.pos].filter((value) => value !== undefined).join(":");
}

function createCandidateClues(solution) {
  const clues = [];
  const allItems = categories.flatMap((category) => category.items.map((item) => item.id));

  for (let i = 0; i < allItems.length; i += 1) {
    for (let j = i + 1; j < allItems.length; j += 1) {
      const a = allItems[i];
      const b = allItems[j];
      if (itemCategory(a) === itemCategory(b)) continue;

      const posA = posOf(solution, a);
      const posB = posOf(solution, b);
      if (posA === posB) clues.push({ type: "same", a, b });
      if (posA + 1 === posB) clues.push({ type: "leftOf", a, b });
      if (posA - 1 === posB) clues.push({ type: "rightOf", a, b });
      if (Math.abs(posA - posB) === 1) clues.push({ type: "nextTo", a, b });
    }
  }

  allItems.forEach((itemId) => {
    clues.push({ type: "position", a: itemId, pos: posOf(solution, itemId) });
  });

  return clues.map((clue) => ({ ...clue, text: clueText(clue) }));
}

function buildItemPositionMap(solution) {
  const map = new Map();
  solution.forEach((house, index) => {
    Object.values(house).forEach((itemId) => map.set(itemId, index));
  });
  return map;
}

function matchesClue(positionMap, clue) {
  const posA = positionMap.get(clue.a);
  const posB = clue.b ? positionMap.get(clue.b) : undefined;

  if (clue.type === "same") return posA === posB;
  if (clue.type === "position") return posA === clue.pos;
  if (clue.type === "leftOf") return posA + 1 === posB;
  if (clue.type === "rightOf") return posA - 1 === posB;
  if (clue.type === "nextTo") return Math.abs(posA - posB) === 1;
  return true;
}

function solutionMatches(solution, clues) {
  const positionMap = buildItemPositionMap(solution);
  return clues.every((clue) => matchesClue(positionMap, clue));
}

function permutations(values) {
  const result = [];
  const used = new Array(values.length).fill(false);
  const current = [];

  function walk() {
    if (current.length === values.length) {
      result.push([...current]);
      return;
    }

    values.forEach((value, index) => {
      if (used[index]) return;
      used[index] = true;
      current.push(value);
      walk();
      current.pop();
      used[index] = false;
    });
  }

  walk();
  return result;
}

const categoryPermutations = Object.fromEntries(
  categories.map((category) => [category.id, permutations(category.items.map((item) => item.id))]),
);

function canStillMatch(partial, clues) {
  const map = new Map();
  partial.forEach((house, index) => {
    Object.values(house).forEach((itemId) => map.set(itemId, index));
  });

  return clues.every((clue) => {
    const hasA = map.has(clue.a);
    const hasB = !clue.b || map.has(clue.b);
    if (hasA && hasB) return matchesClue(map, clue);
    if (clue.type === "position" && hasA) return map.get(clue.a) === clue.pos;
    return true;
  });
}

function solvePuzzle(clues, limit = maxSolverSolutions) {
  const fixedCategory = categories[0];
  const fixedPermutations = categoryPermutations[fixedCategory.id];
  const otherCategories = categories.slice(1);
  const solutions = [];

  function walk(categoryIndex, partial) {
    if (solutions.length >= limit) return;
    if (categoryIndex === otherCategories.length) {
      if (solutionMatches(partial, clues)) solutions.push(partial.map((house) => ({ ...house })));
      return;
    }

    const category = otherCategories[categoryIndex];
    for (const permutation of categoryPermutations[category.id]) {
      const candidate = partial.map((house, houseIndex) => ({
        ...house,
        [category.id]: permutation[houseIndex],
      }));
      if (canStillMatch(candidate, clues)) walk(categoryIndex + 1, candidate);
      if (solutions.length >= limit) return;
    }
  }

  for (const permutation of fixedPermutations) {
    const partial = Array.from({ length: 5 }, (_, houseIndex) => ({ [fixedCategory.id]: permutation[houseIndex] }));
    if (canStillMatch(partial, clues)) walk(0, partial);
    if (solutions.length >= limit) break;
  }

  return solutions;
}

function minimizeClues(clues) {
  let working = [...clues];
  for (const clue of shuffle(working)) {
    if (working.length <= 9) break;
    const candidate = working.filter((item) => clueKey(item) !== clueKey(clue));
    if (solvePuzzle(candidate).length === 1) working = candidate;
  }
  return working;
}

function generatePuzzle() {
  const solution = makeRandomSolution();
  const clues = [];

  solution.forEach((house, houseIndex) => {
    clues.push({ type: "position", a: house.color, pos: houseIndex });
  });

  categories
    .filter((category) => category.id !== "color")
    .forEach((category) => {
      solution.forEach((house) => {
        clues.push({ type: "same", a: house[category.id], b: house.color });
      });
    });

  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    solution,
    clues: shuffle(clues.map((clue) => ({ ...clue, text: clueText(clue) }))),
  };
}


function fallbackPuzzle() {
  const solution = [
    { color: "yellow", nation: "norwegian", drink: "water", smoke: "dunhill", pet: "cats" },
    { color: "blue", nation: "dane", drink: "tea", smoke: "blend", pet: "horses" },
    { color: "red", nation: "brit", drink: "milk", smoke: "pallmall", pet: "birds" },
    { color: "green", nation: "german", drink: "coffee", smoke: "prince", pet: "fish" },
    { color: "white", nation: "swede", drink: "beer", smoke: "bluemaster", pet: "dogs" },
  ];

  const clueData = [
    { type: "same", a: "brit", b: "red" },
    { type: "same", a: "swede", b: "dogs" },
    { type: "same", a: "dane", b: "tea" },
    { type: "leftOf", a: "green", b: "white" },
    { type: "same", a: "green", b: "coffee" },
    { type: "same", a: "pallmall", b: "birds" },
    { type: "same", a: "yellow", b: "dunhill" },
    { type: "position", a: "milk", pos: 2 },
    { type: "position", a: "norwegian", pos: 0 },
    { type: "nextTo", a: "blend", b: "cats" },
    { type: "nextTo", a: "horses", b: "dunhill" },
    { type: "same", a: "bluemaster", b: "beer" },
    { type: "same", a: "german", b: "prince" },
    { type: "nextTo", a: "norwegian", b: "blue" },
    { type: "nextTo", a: "blend", b: "water" },
  ];

  return {
    id: "classic",
    solution,
    clues: clueData.map((clue) => ({ ...clue, text: clueText(clue) })),
  };
}

function resetProgress(keepPuzzle = false) {
  state.seconds = 0;
  state.board = {};
  state.notes = {};
  state.revealedHints = new Set();
  state.selected = null;
  if (!keepPuzzle) state.puzzle = generatePuzzle();
  save();
  render();
  updateStatus();
}

function save() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      seconds: state.seconds,
      board: state.board,
      notes: state.notes,
      puzzle: state.puzzle,
      revealedHints: Array.from(state.revealedHints),
    }),
  );
}

function load() {
  const raw = localStorage.getItem(storageKey);
  localStorage.removeItem(legacyStorageKey);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    state.seconds = Number(data.seconds) || 0;
    state.board = data.board || {};
    state.notes = data.notes || {};
    state.puzzle = data.puzzle || null;
    state.revealedHints = new Set(data.revealedHints || []);
    return Boolean(state.puzzle?.solution?.length && state.puzzle?.clues?.length);
  } catch {
    localStorage.removeItem(storageKey);
    return false;
  }
}

function renderTile(item, categoryId, used = false) {
  const button = document.createElement("button");
  button.className = "tile";
  button.type = "button";
  button.title = item.label;
  button.setAttribute("aria-label", item.label);
  button.dataset.item = item.id;
  button.dataset.category = categoryId;
  button.draggable = true;
  button.innerHTML = item.symbol.length > 1 ? `<span class="mini">${item.symbol}</span>` : item.symbol;
  if (item.color) button.style.color = item.color;
  if (state.selected?.itemId === item.id) button.classList.add("selected");
  if (used) button.classList.add("used");

  button.addEventListener("click", () => {
    state.selected = { categoryId, itemId: item.id };
    statusPill.textContent = categoryById(categoryId).title + ": " + item.label;
    render();
  });

  button.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", JSON.stringify({ categoryId, itemId: item.id }));
  });

  return button;
}

function renderPalette() {
  palette.innerHTML = "";
  const usedItems = new Set(Object.values(state.board).flatMap((house) => Object.values(house || {})));

  categories.forEach((category) => {
    const group = document.createElement("section");
    group.className = "palette-group";

    const title = document.createElement("div");
    title.className = "palette-title";
    title.textContent = category.title;
    group.append(title);

    const row = document.createElement("div");
    row.className = "tile-row";
    category.items.forEach((item) => row.append(renderTile(item, category.id, usedItems.has(item.id))));
    group.append(row);
    palette.append(group);
  });
}

function placeItem(houseIndex, categoryId, itemId) {
  const category = categoryById(categoryId);
  if (!category?.items.some((item) => item.id === itemId)) return;

  for (const key of Object.keys(state.board)) {
    if (state.board[key]?.[categoryId] === itemId) {
      delete state.board[key][categoryId];
    }
  }

  state.board[houseIndex] ||= {};
  state.board[houseIndex][categoryId] = itemId;
  state.activeHouse = houseIndex;
  state.selected = null;
  save();
  render();
  updateStatus();
}

function clearCell(houseIndex, categoryId) {
  if (state.board[houseIndex]?.[categoryId]) {
    delete state.board[houseIndex][categoryId];
    save();
    render();
    updateStatus();
  }
}

function renderHouseTabs() {
  houseTabs.innerHTML = "";
  for (let index = 0; index < 5; index += 1) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `house-tab${state.activeHouse === index ? " active" : ""}`;
    tab.textContent = `Дом ${index + 1}`;
    tab.addEventListener("click", () => {
      state.activeHouse = index;
      render();
    });
    houseTabs.append(tab);
  }
}

function renderBoard() {
  board.innerHTML = "";
  const corner = document.createElement("div");
  corner.className = "board-head";
  corner.textContent = "Дом";
  board.append(corner);

  for (let index = 0; index < 5; index += 1) {
    const head = document.createElement("div");
    head.className = "board-head";
    head.textContent = `${index + 1}`;
    board.append(head);
  }

  categories.forEach((category) => {
    const label = document.createElement("div");
    label.className = "board-label";
    label.textContent = category.title;
    board.append(label);

    for (let houseIndex = 0; houseIndex < 5; houseIndex += 1) {
      const slot = document.createElement("div");
      slot.className = "cell-slot";
      slot.addEventListener("dragover", (event) => event.preventDefault());
      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));
        placeItem(houseIndex, data.categoryId, data.itemId);
      });

      const itemId = state.board[houseIndex]?.[category.id];
      const item = itemById(itemId);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `cell${item ? "" : " empty"}`;
      cell.title = item ? item.label : `Поставить ${category.title.toLowerCase()} в дом ${houseIndex + 1}`;
      cell.innerHTML = item
        ? item.symbol.length > 1
          ? `<span class="mini">${item.symbol}</span>`
          : item.symbol
        : "+";
      if (item?.color) cell.style.color = item.color;
      cell.addEventListener("click", () => {
        if (state.selected) {
          placeItem(houseIndex, state.selected.categoryId, state.selected.itemId);
        } else {
          clearCell(houseIndex, category.id);
        }
      });
      slot.append(cell);
      board.append(slot);
    }
  });
}

function renderClues() {
  cluesList.innerHTML = "";
  state.puzzle.clues.forEach((clue, index) => {
    const item = document.createElement("li");
    item.textContent = clue.text;
    if (state.revealedHints.has(index)) item.classList.add("revealed");
    cluesList.append(item);
  });
}

function renderLogicGrid() {
  logicGrid.innerHTML = "";
  const drink = categoryById("drink");
  const pet = categoryById("pet");

  logicGrid.append(noteHead(""));
  pet.items.forEach((item) => logicGrid.append(noteHead(item.symbol, item.label)));

  drink.items.forEach((rowItem) => {
    const rowHead = document.createElement("div");
    rowHead.className = "note-row-head";
    rowHead.textContent = rowItem.label;
    logicGrid.append(rowHead);

    pet.items.forEach((colItem) => {
      const key = `${rowItem.id}:${colItem.id}`;
      const button = document.createElement("button");
      const value = state.notes[key] || "unknown";
      button.type = "button";
      button.className = `note-cell ${value}`;
      button.textContent = value === "yes" ? "●" : value === "no" ? "×" : "·";
      button.title = `${rowItem.label} и ${colItem.label}`;
      button.addEventListener("click", () => {
        state.notes[key] = value === "unknown" ? "no" : value === "no" ? "yes" : "unknown";
        save();
        renderLogicGrid();
      });
      logicGrid.append(button);
    });
  });
}

function noteHead(text, title = "") {
  const head = document.createElement("div");
  head.className = "note-head";
  head.textContent = text;
  head.title = title;
  return head;
}

function validate(markCells = false) {
  const wrong = [];
  let filled = 0;

  categories.forEach((category) => {
    for (let houseIndex = 0; houseIndex < 5; houseIndex += 1) {
      const value = state.board[houseIndex]?.[category.id];
      if (value) filled += 1;
      if (value && state.puzzle.solution[houseIndex][category.id] !== value) {
        wrong.push({ houseIndex, categoryId: category.id });
      }
    }
  });

  if (markCells) {
    document.querySelectorAll(".cell").forEach((cell) => {
      cell.classList.remove("correct", "wrong");
    });

    categories.forEach((category, rowIndex) => {
      for (let houseIndex = 0; houseIndex < 5; houseIndex += 1) {
        const value = state.board[houseIndex]?.[category.id];
        if (!value) continue;
        const cellIndex = rowIndex * 5 + houseIndex;
        const cell = document.querySelectorAll(".cell")[cellIndex];
        cell.classList.add(state.puzzle.solution[houseIndex][category.id] === value ? "correct" : "wrong");
      }
    });
  }

  return { filled, wrong };
}

function updateStatus() {
  const { filled, wrong } = validate(true);
  statusPill.classList.remove("good", "bad");

  if (wrong.length) {
    statusPill.textContent = `Ошибок: ${wrong.length}`;
    statusPill.classList.add("bad");
    return;
  }

  if (filled === 25) {
    statusPill.textContent = "Решено";
    statusPill.classList.add("good");
    showResult("Решено!", `Все дома заполнены верно. Время: ${formatTime(state.seconds)}.`);
    return;
  }

  statusPill.textContent = `${filled}/25`;
}

function showResult(title, text) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  if (!resultModal.open) resultModal.showModal();
}

function revealHint() {
  const openCells = [];
  categories.forEach((category) => {
    for (let houseIndex = 0; houseIndex < 5; houseIndex += 1) {
      if (!state.board[houseIndex]?.[category.id]) {
        openCells.push({ categoryId: category.id, houseIndex });
      }
    }
  });

  if (!openCells.length) {
    updateStatus();
    return;
  }

  const hint = openCells[0];
  const value = state.puzzle.solution[hint.houseIndex][hint.categoryId];
  placeItem(hint.houseIndex, hint.categoryId, value);

  const clueIndex = Math.min(state.revealedHints.size, state.puzzle.clues.length - 1);
  state.revealedHints.add(clueIndex);
  save();
  render();
}

function render() {
  timer.textContent = formatTime(state.seconds);
  pauseButton.textContent = state.paused ? "▶" : "II";
  renderHouseTabs();
  renderPalette();
  renderBoard();
  renderClues();
  renderLogicGrid();
}

pauseButton.addEventListener("click", () => {
  state.paused = !state.paused;
  render();
});

resetButton.addEventListener("click", () => {
  resetProgress(false);
});

clearButton.addEventListener("click", () => {
  state.board = {};
  state.selected = null;
  save();
  render();
  updateStatus();
});

hintButton.addEventListener("click", revealHint);

setInterval(() => {
  if (!state.paused) {
    state.seconds += 1;
    timer.textContent = formatTime(state.seconds);
    save();
  }
}, 1000);

if (!load()) {
  state.puzzle = generatePuzzle();
  save();
}
render();
updateStatus();
