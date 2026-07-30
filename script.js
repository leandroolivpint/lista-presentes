const lista = document.getElementById("lista");
const sheetCSVUrl = "https://docs.google.com/spreadsheets/d/1uT-vwbjaJS2iP_H3J_gBFvkObGwucRMOx1B7qZaRXT4/export?format=csv&gid=0";
const pixKey = "14841499636";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (insideQuote) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          insideQuote = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuote = true;
      continue;
    }

    if (char === ',') {
      row.push(value.trim());
      value = "";
      continue;
    }

    if (char === '\n') {
      row.push(value.trim());
      value = "";
      if (row.some(cell => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    if (char === '\r') {
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length) {
    row.push(value.trim());
    if (row.some(cell => cell !== "")) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map(cell => cell.trim());
  return rows.slice(1).map(record => {
    const item = {};
    header.forEach((key, index) => {
      item[key] = record[index] ? record[index].trim() : "";
    });
    return item;
  });
}

function parseAmount(value) {
  if (!value) {
    return 0;
  }

  const normalized = String(value)
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();

  const amount = parseFloat(normalized);
  return Number.isNaN(amount) ? 0 : amount;
}

function createCard(item) {
  const statusRaw = item.Status || item.status || "";
  const status = statusRaw.trim();
  const reservadoPor = item.ReservadoPor || item.reservadopor || "";
  const isReserved = status !== "" && status.toLowerCase() !== "livre";
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img src="${item.Foto || item.Foto || item.imagem || item.imagem || 'https://picsum.photos/500/300?random'}" alt="Imagem de ${item.Nome || item.nome || 'Presente'}">
    ${status ? `<div class="status-tag ${isReserved ? 'reserved' : ''}">${status}${reservadoPor ? ` · ${reservadoPor}` : ''}</div>` : ''}
    <h2>${item.Nome || item.nome || 'Presente'}</h2>
    <p class="valor">${item.Valor || item.valor || 'R$ 0,00'}</p>
    <button type="button" class="donate-btn" ${isReserved ? 'disabled' : ''}>${isReserved ? 'Reservado' : 'Dar esse presente'}</button>
  `;

  const donateButton = card.querySelector(".donate-btn");

  donateButton.onclick = () => {
    if (isReserved) {
      return;
    }

    const name = encodeURIComponent(item.Nome || item.nome || 'Presente');
    const amount = encodeURIComponent(item.Valor || item.valor || 'R$ 0,00');
    window.location.href = `payment.html?name=${name}&amount=${amount}`;
  };

  lista.appendChild(card);
}

function renderItems(items) {
  lista.innerHTML = "";
  items
    .filter(item => (item.Nome || item.nome) && (item.Foto || item.imagem))
    .forEach(createCard);
}

let sheetCache = null;
let updateInterval = null;

function loadFromSheet() {
  const url = `${sheetCSVUrl}&cacheBust=${Date.now()}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error("Não foi possível carregar a planilha.");
      }
      return response.text();
    })
    .then(text => {
      if (text === sheetCache) {
        return;
      }

      sheetCache = text;
      const data = parseCSV(text);
      if (!data.length) {
        throw new Error("Planilha vazia ou sem dados válidos.");
      }
      renderItems(data);
    })
    .catch(() => {
      if (!sheetCache) {
        renderItems(presentes);
      }
    });
}

function startAutoRefresh() {
  loadFromSheet();

  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(() => {
    loadFromSheet();
  }, 1000 * 60 * 1); // atualiza a cada 1 minuto
}

startAutoRefresh();