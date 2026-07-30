const lista=document.getElementById("lista");

presentes.forEach(item=>{

const card=document.createElement("div");

card.className="card";

card.innerHTML=`

<img src="${item.imagem}">

<h2>${item.nome}</h2>

<p class="valor">${item.valor}</p>

<button>Mostrar QR Code</button>

<div class="qrcode"></div>

`;

const botao=card.querySelector("button");

const qrDiv=card.querySelector(".qrcode");

let criado=false;

botao.onclick=()=>{

if(criado)return;

new QRCode(qrDiv,{
text:item.pix,
width:180,
height:180
});

criado=true;

botao.innerText="QR Code Gerado";

}

lista.appendChild(card);

});