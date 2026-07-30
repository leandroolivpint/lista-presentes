const lista = document.getElementById("lista");

presentes.forEach(item => {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img src="${item.imagem}" alt="Imagem de ${item.nome}">
    <h2>${item.nome}</h2>
    <p class="valor">${item.valor}</p>
    <button>Mostrar QR Code</button>
    <div class="qrcode"></div>
  `;

  const botao = card.querySelector("button");
  const qrDiv = card.querySelector(".qrcode");

  let criado = false;
  let visivel = false;

  botao.onclick = () => {
    if (!criado) {
      new QRCode(qrDiv, {
        text: item.pix,
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
});