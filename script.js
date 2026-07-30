const lista = document.getElementById("lista");
const sheetCSVUrl = "https://docs.google.com/spreadsheets/d/1uT-vwbjaJS2iP_H3J_gBFvkObGwucRMOx1B7qZaRXT4/export?format=csv&gid=0";
const pixKey = "14841499636";
const pixPayload = `00020126580014BR.GOV.BCB.PIX0114${pixKey}5204000053039865406450.005802BR5910SEU NOME6009SAO PAULO62070503***6304ABCD`;

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

function createCard(item) {
  const status = item.Status || item.status || "LIVRE";
  const reservadoPor = item.ReservadoPor || item.reservadopor || "";
  const isReserved = status.toLowerCase() !== "livre" && status !== "";
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img src="${item.Foto || item.Foto || item.imagem || item.imagem || 'https://picsum.photos/500/300?random'}" alt="Imagem de ${item.Nome || item.nome || 'Presente'}">
    <div class="status-tag ${isReserved ? 'reserved' : ''}">${status}${reservadoPor ? ` · ${reservadoPor}` : ''}</div>
    <h2>${item.Nome || item.nome || 'Presente'}</h2>
    <p class="valor">${item.Valor || item.valor || 'R$ 0,00'}</p>
    <div class="pix-copy-group">
      <span class="pix-label">PIX:</span>
      <span class="pix-value">${pixKey}</span>
      <button type="button" class="copy-pix">Copiar chave</button>
    </div>
    <button ${isReserved ? 'disabled' : ''}>${isReserved ? 'Reservado' : 'Mostrar QR Code'}</button>
    <div class="qrcode"></div>
  `;

  const botao = card.querySelector("button");
  const qrDiv = card.querySelector(".qrcode");
  const copyButton = card.querySelector(".copy-pix");

  let criado = false;
  let visivel = false;

  copyButton.onclick = () => {
    copyToClipboard(pixKey)
      .then(() => {
        copyButton.innerText = "Copiado!";
        setTimeout(() => {
          copyButton.innerText = "Copiar chave";
        }, 1600);
      })
      .catch(() => {
        copyButton.innerText = "Copiar manualmente";
        setTimeout(() => {
          copyButton.innerText = "Copiar chave";
        }, 1600);
      });
  };

  botao.onclick = () => {
    if (isReserved) {
      return;
    }

    if (!criado) {
      new QRCode(qrDiv, {
        text: pixPayload,
        width: 180,
        height: 180
      });
      criado = true;
      visivel = true;
      qrDiv.style.display = "flex";
      botao.innerText = "Ocultar QR Code";
      return;
    }

    visivel = !visivel;
    qrDiv.style.display = visivel ? "flex" : "none";
    botao.innerText = visivel ? "Ocultar QR Code" : "Mostrar QR Code";
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