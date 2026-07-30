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

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    if (document.execCommand("copy")) {
      document.body.removeChild(textarea);
      resolve();
    } else {
      document.body.removeChild(textarea);
      reject();
    }
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

function computeCrc16(text) {
  let crc = 0xFFFF;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildTag(id, value) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function createPixPayload(amount) {
  const formatted = parseAmount(amount).toFixed(2);
  const amountTag = buildTag("54", formatted);
  const merchantAccountInfo = buildTag("00", "BR.GOV.BCB.PIX") + buildTag("01", pixKey);
  const merchantAccountInfoTag = buildTag("26", merchantAccountInfo);
  const merchantName = buildTag("59", "SEU NOME");
  const merchantCity = buildTag("60", "SAO PAULO");
  const payloadWithoutCrc = `000201${merchantAccountInfoTag}520400005303986${amountTag}5802BR${merchantName}${merchantCity}6304`;
  const crc = computeCrc16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
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
    <button type="button" class="donate-btn" ${isReserved ? 'disabled' : ''}>${isReserved ? 'Reservado' : 'Dar esse presente'}</button>
    <button type="button" class="toggle-qr" ${isReserved ? 'disabled' : ''}>${isReserved ? 'Reservado' : 'Mostrar QR Code'}</button>
    <div class="qrcode"></div>
  `;

  const qrButton = card.querySelector(".toggle-qr");
  const donateButton = card.querySelector(".donate-btn");
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

  donateButton.onclick = () => {
    if (isReserved) {
      return;
    }

    const pixText = createPixPayload(item.Valor || item.valor || '0');
    copyToClipboard(pixText)
      .then(() => {
        donateButton.innerText = "Copiado!";
        setTimeout(() => {
          donateButton.innerText = "Dar esse presente";
        }, 1800);
      })
      .catch(() => {
        donateButton.innerText = "Copiar manualmente";
        setTimeout(() => {
          donateButton.innerText = "Dar esse presente";
        }, 1800);
      });
  };

  qrButton.onclick = () => {
    if (isReserved) {
      return;
    }

    if (!criado) {
      new QRCode(qrDiv, {
        text: createPixPayload(item.Valor || item.valor || '0'),
        width: 180,
        height: 180
      });
      criado = true;
      visivel = true;
      qrDiv.style.display = "flex";
      qrButton.innerText = "Ocultar QR Code";
      return;
    }

    visivel = !visivel;
    qrDiv.style.display = visivel ? "flex" : "none";
    qrButton.innerText = visivel ? "Ocultar QR Code" : "Mostrar QR Code";
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