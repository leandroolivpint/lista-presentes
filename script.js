const lista = document.getElementById("lista");
const sheetCSVUrl = "https://docs.google.com/spreadsheets/d/1uT-vwbjaJS2iP_H3J_gBFvkObGwucRMOx1B7qZaRXT4/export?format=csv&gid=0";
const presenceWebAppUrl = "https://script.google.com/macros/s/AKfycbxv0UN_1JnyEI1ITuOxixJGl7m4Rje7p-4kr0RSaUQs9OEdekRGox4EZBYQ9LMWrW58Vw/exec";
const pixKey = "14841499636";

function setFormStatus(message, isError = false) {
  const status = document.getElementById("form-status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("error", isError);
  status.classList.toggle("success", !isError && message.length > 0);
}

const presenceForm = document.getElementById("presence-form");

if (presenceForm) {
  presenceForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const guestNameInput = document.getElementById("guest-name");
    const guestName = guestNameInput.value.trim();
    const selectedAnswer = document.querySelector('input[name="presence"]:checked');

    if (!guestName) {
      setFormStatus("Informe o nome dos convidados antes de confirmar.", true);
      guestNameInput.focus();
      return;
    }

    if (!selectedAnswer) {
      setFormStatus("Selecione se você irá ou não ao evento.", true);
      return;
    }

    if (!presenceWebAppUrl || presenceWebAppUrl.includes("COLOQUE_A_URL_DO_WEB_APP_AQUI")) {
      setFormStatus("Configure a URL do Web App do Google antes de enviar a confirmação.", true);
      return;
    }

    const submitButton = presenceForm.querySelector("button[type='submit']");
    const payload = {
      nome: guestName,
      confirmacao: selectedAnswer.value,
      data: new Date().toISOString()
    };

    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";
    setFormStatus("Enviando confirmação...");

    try {
      await fetch(presenceWebAppUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      presenceForm.reset();
      setFormStatus("Confirmação enviada com sucesso! Obrigado por responder.", false);
      const firstRadio = document.querySelector('input[name="presence"][value="sim"]');
      if (firstRadio) {
        firstRadio.checked = true;
      }
    } catch (error) {
      setFormStatus(error.message || "Não foi possível enviar a confirmação. Tente novamente.", true);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Confirmar presença";
    }
  });
}

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

const loadingState = document.getElementById("loading");

function renderItems(items) {
  lista.innerHTML = "";
  items
    .filter(item => (item.Nome || item.nome) && (item.Foto || item.imagem))
    .forEach(createCard);
}

function showLoading() {
  loadingState.classList.remove("hidden");
  lista.classList.add("hidden");
}

function hideLoading() {
  loadingState.classList.add("hidden");
  lista.classList.remove("hidden");
}

let sheetCache = null;
let updateInterval = null;

function loadFromSheet() {
  showLoading();
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
        hideLoading();
        return;
      }

      sheetCache = text;
      const data = parseCSV(text);
      if (!data.length) {
        throw new Error("Planilha vazia ou sem dados válidos.");
      }
      renderItems(data);
      hideLoading();
    })
    .catch(() => {
      if (!sheetCache) {
        renderItems(presentes);
      }
      hideLoading();
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