import { payload as pixPayload } from "https://esm.sh/pix-payload@1.0.4";

const pixKey = "14841499636";
const qrContainer = document.getElementById("paymentQr");
const pixCodeElement = document.getElementById("pixCode");
const copyButton = document.getElementById("copyButton");
const paymentNote = document.getElementById("paymentNote");

function parseQueryString() {
  const params = new URLSearchParams(window.location.search);
  return {
    name: params.get("name") || "Presente",
    amount: params.get("amount") || "R$ 0,00"
  };
}

function normalizeAmount(value) {
  const normalized = String(value)
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();

  const amount = parseFloat(normalized);
  return Number.isNaN(amount) ? 0 : amount;
}

function formatAmount(value) {
  return normalizeAmount(value).toFixed(2);
}

function createPixPayload(amount) {
  return pixPayload({
    key: pixKey,
    amount: formatAmount(amount),
    name: "SIMONE E JOSÉ",
    city: "SAO PAULO",
    transactionId: "00"
  });
}

function renderPayment() {
  const { name, amount } = parseQueryString();
  const pixPayload = createPixPayload(amount);

  document.getElementById("presentName").textContent = name;
  document.getElementById("paymentAmount").textContent = `R$ ${formatAmount(amount)}`;

  pixCodeElement.textContent = pixPayload;
  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: pixPayload,
    width: 248,
    height: 248,
    colorDark: "#1d1d3a",
    colorLight: "#f5f5ff",
    correctLevel: QRCode.CorrectLevel.H
  });

  copyButton.addEventListener("click", () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pixPayload).then(() => {
        copyButton.textContent = "Código copiado";
        setTimeout(() => {
          copyButton.textContent = "Copiar código PIX";
        }, 1800);
      });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = pixPayload;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      if (document.execCommand("copy")) {
        copyButton.textContent = "Código copiado";
        setTimeout(() => {
          copyButton.textContent = "Copiar código PIX";
        }, 1800);
      }
      document.body.removeChild(textarea);
    }
  });

  paymentNote.textContent = `Abra o aplicativo do seu banco, selecione PIX e cole o código acima para pagar ${name} no valor de R$ ${formatAmount(amount)}.`;
}

renderPayment();
