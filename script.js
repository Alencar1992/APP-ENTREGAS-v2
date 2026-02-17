const ORIGEM_FIXA = "Av. João Dias, 2074";
const VALOR_POR_KM = 2;
const LUCAS_WHATSAPP = "5511999999999"; // Atualize com o número real do Lucas.

const state = {
  modo: "cep",
  ultimoCalculo: null,
  origemCoords: null,
};

const el = {
  btnModoCep: document.getElementById("btnModoCep"),
  btnModoEndereco: document.getElementById("btnModoEndereco"),
  painelCep: document.getElementById("painelCep"),
  painelEndereco: document.getElementById("painelEndereco"),
  cep: document.getElementById("cep"),
  numero: document.getElementById("numero"),
  enderecoBusca: document.getElementById("enderecoBusca"),
  btnConsultarFrete: document.getElementById("btnConsultarFrete"),
  ruaResultado: document.getElementById("ruaResultado"),
  resultado: document.getElementById("resultado"),
  aviso: document.getElementById("aviso"),
  secaoEntrega: document.getElementById("secaoEntrega"),
  nomeCliente: document.getElementById("nomeCliente"),
  horarioEntrega: document.getElementById("horarioEntrega"),
  pontoReferencia: document.getElementById("pontoReferencia"),
  tipoEndereco: document.getElementById("tipoEndereco"),
  camposApto: document.getElementById("camposApto"),
  bloco: document.getElementById("bloco"),
  apto: document.getElementById("apto"),
  btnEnviarLucas: document.getElementById("btnEnviarLucas"),
};

function formatCep(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${minutes}min`;
}

function setModo(modo) {
  state.modo = modo;

  const isCep = modo === "cep";
  el.btnModoCep.classList.toggle("active", isCep);
  el.btnModoEndereco.classList.toggle("active", !isCep);
  el.painelCep.classList.toggle("active", isCep);
  el.painelEndereco.classList.toggle("active", !isCep);

  el.aviso.textContent = "";
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Falha na requisição");
  }

  return response.json();
}

async function buscarEnderecoPorCep() {
  const cep = el.cep.value.replace(/\D/g, "");
  const numero = el.numero.value.trim();

  if (cep.length !== 8) {
    throw new Error("Informe um CEP válido com 8 dígitos.");
  }

  if (!numero) {
    throw new Error("Informe o número do destino.");
  }

  const data = await fetchJson(`https://viacep.com.br/ws/${cep}/json/`);
  if (data.erro) {
    throw new Error("CEP não encontrado.");
  }

  const rua = data.logradouro || "Rua não identificada";
  const enderecoCompleto = `${rua}, ${numero} - ${data.bairro || ""}, ${data.localidade || ""} - ${data.uf || ""}, Brasil`;

  return { rua, enderecoCompleto };
}

async function buscarEnderecoManual() {
  const enderecoCompleto = el.enderecoBusca.value.trim();

  if (!enderecoCompleto) {
    throw new Error("Informe o endereço de destino.");
  }

  const rua = enderecoCompleto.split(",")[0] || enderecoCompleto;
  return { rua, enderecoCompleto };
}

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const data = await fetchJson(url);

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Endereço não encontrado no mapa: ${address}`);
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
  };
}

async function getOrigemCoords() {
  if (state.origemCoords) {
    return state.origemCoords;
  }

  state.origemCoords = await geocode(ORIGEM_FIXA);
  return state.origemCoords;
}

async function calcularRotaKmTempo(origem, destino) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false`;
  const data = await fetchJson(url);

  const rota = data?.routes?.[0];
  if (!rota) {
    throw new Error("Não foi possível calcular a rota.");
  }

  const km = rota.distance / 1000;
  const tempoEstimado = formatDuration(rota.duration);

  return { km, tempoEstimado };
}

async function consultarFrete() {
  try {
    el.btnConsultarFrete.disabled = true;
    el.btnConsultarFrete.textContent = "Consultando...";
    el.aviso.textContent = "";
    el.resultado.textContent = "";

    const destinoData = state.modo === "cep"
      ? await buscarEnderecoPorCep()
      : await buscarEnderecoManual();

    el.ruaResultado.textContent = `📍 Rua encontrada: ${destinoData.rua}`;

    const origem = await getOrigemCoords();
    const destino = await geocode(destinoData.enderecoCompleto);
    const { km, tempoEstimado } = await calcularRotaKmTempo(origem, destino);

    const valor = km * VALOR_POR_KM;

    state.ultimoCalculo = {
      origem: ORIGEM_FIXA,
      destino: destinoData.enderecoCompleto,
      rua: destinoData.rua,
      km,
      tempoEstimado,
      valor,
    };

    el.resultado.innerHTML = `
      <strong>Resultado:</strong><br>
      Distância: <strong>${km.toFixed(2)} km</strong><br>
      Tempo estimado: <strong>${tempoEstimado}</strong><br>
      Frete: <strong>R$ ${valor.toFixed(2)}</strong>
    `;

    el.secaoEntrega.classList.remove("hidden");
  } catch (error) {
    el.aviso.textContent = `⚠️ ${error.message}`;
  } finally {
    el.btnConsultarFrete.disabled = false;
    el.btnConsultarFrete.textContent = "Consultar frete";
  }
}

function validarDadosEntrega() {
  if (!state.ultimoCalculo) {
    throw new Error("Consulte o frete antes de enviar.");
  }

  const nomeCliente = el.nomeCliente.value.trim();
  const horarioEntrega = el.horarioEntrega.value;
  const pontoReferencia = el.pontoReferencia.value.trim();
  const tipoEndereco = el.tipoEndereco.value;

  if (!nomeCliente || !horarioEntrega || !pontoReferencia) {
    throw new Error("Preencha nome do cliente, horário e ponto de referência.");
  }

  let complemento = "Casa";

  if (tipoEndereco === "apto") {
    const bloco = el.bloco.value.trim();
    const apto = el.apto.value.trim();

    if (!bloco || !apto) {
      throw new Error("Para apartamento, bloco e apto são obrigatórios.");
    }

    complemento = `Apto - Bloco ${bloco}, Apto ${apto}`;
  }

  return {
    nomeCliente,
    horarioEntrega,
    pontoReferencia,
    complemento,
  };
}

async function enviarWhatsAppLucas() {
  try {
    const dadosEntrega = validarDadosEntrega();
    const frete = state.ultimoCalculo;

    const mensagem =
`🏍️ *ALENCAR FRETES*
👤 Cliente: ${dadosEntrega.nomeCliente}
📍 Endereço: ${frete.destino}
🏠 Tipo: ${dadosEntrega.complemento}
🧭 Origem: ${frete.origem}
📌 Referência: ${dadosEntrega.pontoReferencia}
⏰ Entrega: ${new Date(dadosEntrega.horarioEntrega).toLocaleString("pt-BR")}
📏 Distância: ${frete.km.toFixed(2)} km
⌛ Tempo estimado: ${frete.tempoEstimado}
💰 Valor: R$ ${frete.valor.toFixed(2)}`;

    try {
      await navigator.clipboard.writeText(mensagem);
    } catch (_) {
      // Clipboard pode falhar em alguns contextos.
    }

    const url = `https://wa.me/${LUCAS_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  } catch (error) {
    el.aviso.textContent = `⚠️ ${error.message}`;
  }
}

function atualizarCamposApto() {
  const isApto = el.tipoEndereco.value === "apto";
  el.camposApto.classList.toggle("hidden", !isApto);
}

function bindEvents() {
  el.btnModoCep.addEventListener("click", () => setModo("cep"));
  el.btnModoEndereco.addEventListener("click", () => setModo("endereco"));
  el.cep.addEventListener("input", (event) => {
    event.target.value = formatCep(event.target.value);
  });

  el.btnConsultarFrete.addEventListener("click", consultarFrete);
  el.tipoEndereco.addEventListener("change", atualizarCamposApto);
  el.btnEnviarLucas.addEventListener("click", enviarWhatsAppLucas);
}

bindEvents();
