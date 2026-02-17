const CONFIG = {
  valorKm: 1.9,
  taxaMinima: 8,
  taxaBase: 4,
  adicionalPesoPorKg: 0.6,
  limiteDescontoKm: 15,
};

const STORAGE_KEYS = {
  clientes: "clientes",
  historico: "historico",
};

let valorFinal = 0;
let ultimoCalculo = null;

let clientes = JSON.parse(localStorage.getItem(STORAGE_KEYS.clientes)) || {};
let historico = JSON.parse(localStorage.getItem(STORAGE_KEYS.historico)) || [];

const elements = {
  cep: document.getElementById("cep"),
  logradouro: document.getElementById("logradouro"),
  bairro: document.getElementById("bairro"),
  cidade: document.getElementById("cidade"),
  estado: document.getElementById("estado"),
  origem: document.getElementById("origem"),
  destino: document.getElementById("destino"),
  km: document.getElementById("km"),
  peso: document.getElementById("peso"),
  resultado: document.getElementById("resultado"),
  aviso: document.getElementById("aviso"),
  cliente: document.getElementById("cliente"),
  historico: document.getElementById("historico"),
  nomeCliente: document.getElementById("nomeCliente"),
  numeroCliente: document.getElementById("numeroCliente"),
  btnConsultarCep: document.getElementById("btnConsultarCep"),
  btnMapaCep: document.getElementById("btnMapaCep"),
  btnAbrirRota: document.getElementById("btnAbrirRota"),
  btnCalcular: document.getElementById("btnCalcular"),
  btnEnviar: document.getElementById("btnEnviar"),
  btnSalvarCliente: document.getElementById("btnSalvarCliente"),
};

function formatCep(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function formatAddress(data) {
  return `${data.logradouro || ""}, ${data.bairro || ""} - ${data.localidade || ""}/${data.uf || ""}`.replace(/^,\s*/, "");
}

function openGoogleMapsSearch(address) {
  const query = (address || "").trim();

  if (!query) {
    alert("Informe um endereço para pesquisar no Google Maps.");
    return;
  }

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, "_blank");
}

function openGoogleMapsRoute(origin, destination) {
  const origem = (origin || "").trim();
  const destino = (destination || "").trim();

  if (!origem || !destino) {
    alert("Informe origem e destino para abrir a rota no Google Maps.");
    return;
  }

  const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destino)}&travelmode=driving`;
  window.open(url, "_blank");
}

function getResolvedAddress() {
  const enderecoViaCep = formatAddress({
    logradouro: elements.logradouro.value,
    bairro: elements.bairro.value,
    localidade: elements.cidade.value,
    uf: elements.estado.value,
  }).trim();

  return elements.destino.value.trim() || enderecoViaCep;
}

async function consultarCep() {
  const cep = elements.cep.value.replace(/\D/g, "");

  if (cep.length !== 8) {
    alert("Informe um CEP válido com 8 dígitos.");
    return;
  }

  try {
    elements.btnConsultarCep.disabled = true;
    elements.btnConsultarCep.textContent = "Consultando...";

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert("CEP não encontrado.");
      return;
    }

    elements.logradouro.value = data.logradouro || "";
    elements.bairro.value = data.bairro || "";
    elements.cidade.value = data.localidade || "";
    elements.estado.value = data.uf || "";

    const enderecoCompleto = formatAddress(data);
    if (enderecoCompleto) {
      elements.destino.value = enderecoCompleto;
    }
  } catch (error) {
    alert("Falha ao consultar CEP. Verifique sua conexão.");
  } finally {
    elements.btnConsultarCep.disabled = false;
    elements.btnConsultarCep.textContent = "Consultar";
  }
}

function calcularFrete() {
  const km = parseFloat(elements.km.value);
  const peso = parseFloat(elements.peso.value) || 0;

  elements.aviso.innerText = "";

  if (!km || km <= 0) {
    alert("Informe uma distância válida.");
    return;
  }

  let componenteKm;
  if (km <= CONFIG.limiteDescontoKm) {
    componenteKm = km * CONFIG.valorKm;
  } else {
    componenteKm = (CONFIG.limiteDescontoKm * CONFIG.valorKm) + ((km - CONFIG.limiteDescontoKm) * (0.5 * CONFIG.valorKm));
  }

  const componentePeso = peso * CONFIG.adicionalPesoPorKg;
  let valor = CONFIG.taxaBase + componenteKm + componentePeso;

  if (valor < CONFIG.taxaMinima) {
    valor = CONFIG.taxaMinima;
    elements.aviso.innerText = "⚠️ Taxa mínima aplicada";
  }

  valorFinal = Number(valor.toFixed(2));
  ultimoCalculo = {
    km,
    peso,
    valor: valorFinal,
    endereco: getResolvedAddress(),
    data: new Date().toLocaleString("pt-BR"),
  };

  elements.resultado.innerText = `💰 Valor do frete: R$ ${valorFinal.toFixed(2)}`;
}

function carregarClientes() {
  elements.cliente.innerHTML = `<option value="">Selecione o cliente</option>`;

  Object.keys(clientes)
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach((nome) => {
      elements.cliente.innerHTML += `<option value="${nome}">${nome}</option>`;
    });
}

function adicionarCliente() {
  const nome = elements.nomeCliente.value.trim();
  const numero = elements.numeroCliente.value.replace(/\D/g, "");

  if (!nome || numero.length < 10) {
    alert("Preencha corretamente nome e número.");
    return;
  }

  clientes[nome] = `55${numero}`;
  localStorage.setItem(STORAGE_KEYS.clientes, JSON.stringify(clientes));

  elements.nomeCliente.value = "";
  elements.numeroCliente.value = "";
  carregarClientes();
  alert("Cliente salvo com sucesso!");
}

async function enviarWhatsApp() {
  const clienteSelecionado = elements.cliente.value;

  if (!clienteSelecionado || !ultimoCalculo || valorFinal <= 0) {
    alert("Selecione o cliente e calcule o frete antes de enviar.");
    return;
  }

  const numero = clientes[clienteSelecionado];
  const mensagem =
`🏍️ *ALENCAR FRETES*
👤 Cliente: ${clienteSelecionado}
📍 Endereço: ${ultimoCalculo.endereco || "Não informado"}
📏 Distância: ${ultimoCalculo.km} km
⚖️ Peso: ${ultimoCalculo.peso} kg
💰 Valor: R$ ${ultimoCalculo.valor.toFixed(2)}
📅 ${ultimoCalculo.data}`;

  try {
    await navigator.clipboard.writeText(mensagem);
  } catch (_) {
    // Alguns navegadores bloqueiam clipboard sem gesto direto.
  }

  historico.push(mensagem);
  localStorage.setItem(STORAGE_KEYS.historico, JSON.stringify(historico));
  atualizarHistorico();

  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, "_blank");
}

function atualizarHistorico() {
  elements.historico.innerHTML = "";

  historico.slice().reverse().forEach((msg) => {
    const bloco = document.createElement("p");
    bloco.innerHTML = `${msg.replace(/\n/g, "<br>")}<hr>`;
    elements.historico.appendChild(bloco);
  });
}

function bindEvents() {
  elements.cep.addEventListener("input", (event) => {
    event.target.value = formatCep(event.target.value);
  });

  elements.btnConsultarCep.addEventListener("click", consultarCep);
  elements.btnMapaCep.addEventListener("click", () => {
    const address = getResolvedAddress() || elements.cep.value;
    openGoogleMapsSearch(address);
  });

  elements.btnAbrirRota.addEventListener("click", () => {
    openGoogleMapsRoute(elements.origem.value, getResolvedAddress());
  });

  elements.btnCalcular.addEventListener("click", calcularFrete);
  elements.btnEnviar.addEventListener("click", enviarWhatsApp);
  elements.btnSalvarCliente.addEventListener("click", adicionarCliente);
}

function init() {
  carregarClientes();
  atualizarHistorico();
  bindEvents();
}

init();
