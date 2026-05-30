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

const solution = [
  { color: "yellow", nation: "norwegian", drink: "water", smoke: "dunhill", pet: "cats" },
  { color: "blue", nation: "dane", drink: "tea", smoke: "blend", pet: "horses" },
  { color: "red", nation: "brit", drink: "milk", smoke: "pallmall", pet: "birds" },
  { color: "green", nation: "german", drink: "coffee", smoke: "prince", pet: "fish" },
  { color: "white", nation: "swede", drink: "beer", smoke: "bluemaster", pet: "dogs" },
];

const clues = [
  "Англичанин живет в красном доме.",
  "У шведа есть собаки.",
  "Датчанин пьет чай.",
  "Зеленый дом стоит сразу слева от белого.",
  "В зеленом доме пьют кофе.",
  "Тот, кто курит Pall Mall, держит птиц.",
  "В желтом доме курят Dunhill.",
  "В среднем доме пьют молоко.",
  "Норвежец живет в первом доме.",
  "Курящий Blend живет рядом с тем, у кого кошки.",
  "У владельца лошадей сосед курит Dunhill.",
  "Курящий BlueMaster пьет пиво.",
  "Немец курит Prince.",
  "Норвежец живет рядом с синим домом.",
  "Курящий Blend живет рядом с тем, кто пьет воду.",
];

const state = {
  selected: null,
  activeHouse: 0,
  paused: false,
  seconds: 0,
  board: {},
  notes: {},
  revealedHints: new Set(),
};

const storageKey = "einstein-web-puzzle-state";
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

function save() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      seconds: state.seconds,
      board: state.board,
      notes: state.notes,
      revealedHints: Array.from(state.revealedHints),
    }),
  );
}

function load() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    state.seconds = Number(data.seconds) || 0;
    state.board = data.board || {};
    state.notes = data.notes || {};
    state.revealedHints = new Set(data.revealedHints || []);
  } catch {
    localStorage.removeItem(storageKey);
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
  clues.forEach((text, index) => {
    const item = document.createElement("li");
    item.textContent = text;
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
      if (value && solution[houseIndex][category.id] !== value) {
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
        cell.classList.add(solution[houseIndex][category.id] === value ? "correct" : "wrong");
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
  const value = solution[hint.houseIndex][hint.categoryId];
  placeItem(hint.houseIndex, hint.categoryId, value);

  const clueIndex = Math.min(state.revealedHints.size, clues.length - 1);
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
  state.seconds = 0;
  state.board = {};
  state.notes = {};
  state.revealedHints = new Set();
  state.selected = null;
  localStorage.removeItem(storageKey);
  render();
  updateStatus();
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

load();
render();
updateStatus();
