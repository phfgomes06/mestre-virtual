// VARIÁVEIS GLOBAIS

let audioContext;
let isPlaying = false;
let bpm = 120;
let bpmDefault = bpm;
let nextNoteTime = 0.0;
let timerID;
let estadoMestre = "livre";
let comandoAtual = null;
let chanceDeComando = 0.1;
let ultimoComando = { nome: "null" };
let compassosViradaDe3 = 0;
let wakeLock = null;

let currentBeat = 0;
let notesInQueue = [];

// WAKE LOCK:

const requestWakeLock = async () => {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("A tela não vai apagar!");

    wakeLock.addEventListener("release", () => {
      console.log("Wake Lock liberado");
    });
  } catch (err) {
    console.error(`${err.name}, ${err.message}`);
  }
};

// COMANDOS

const viradaDe2 = { nome: "Virada de 2", sinal: "✌️" };
const viradaDe2NotaExtra = {
  nome: "Virada de 2 com nota extra",
  sinal: "✌️👉",
};
const viradaDe2Cortada = { nome: "Virada de 2 cortada", sinal: "✌️✂" };
const viradaDe3 = { nome: "Virada de 3", sinal: "🤟" };
const ondinha = { nome: "Ondinha - Retomada", sinal: "🌊" };
const joinha = { nome: "Retomada", sinal: "👍" };

// ESCOLHA DE COMANDO DO MESTRE

function sortearComando() {
  const ativos = [];
  if (document.getElementById("vd2").checked) ativos.push(viradaDe2);
  if (document.getElementById("vd2n").checked) ativos.push(viradaDe2NotaExtra);
  if (document.getElementById("vd2c").checked) ativos.push(viradaDe2Cortada);
  if (document.getElementById("vd3").checked) ativos.push(viradaDe3);
  if (document.getElementById("ond").checked) ativos.push(ondinha);

  if (ativos.length === 0) return null;

  if (ultimoComando.nome === "Virada de 2 com nota extra") return ondinha;
  if (ultimoComando.nome === "Virada de 2 cortada") return joinha;

  const index = Math.floor(Math.random() * ativos.length);
  return ativos[index];
}

// BOTOES

const btnPlay = document.getElementById("btn-play");
const velInput = document.getElementById("vel");
const beats = document.querySelectorAll(".beat");
const inputchance = document.getElementById("chance");

// CONFIGURAÇÕES

inputchance.addEventListener("input", (e) => {
  chanceDeComando = e.target.value / 100 || 0.1;
});

velInput.addEventListener("input", (e) => {
  bpmDefault = parseInt(e.target.value) || 120;
  bpm = bpmDefault;
});

// FUNCIONAMENTO DO MESTRE E METRÔNOMO

function nextNote() {
  const secondsPerBeat = 60.0 / bpm;
  nextNoteTime += secondsPerBeat;
  currentBeat = (currentBeat + 1) % 4;
}

function playNote(time, beatNumber) {
  const osc = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  osc.connect(envelope);
  envelope.connect(audioContext.destination);

  let acaoVisualMestre = "nenhuma";

  if (beatNumber === 0) {
    if (estadoMestre === "livre") {
      if (compassosViradaDe3 === 0) {
        if (Math.random() < chanceDeComando) {
          comandoAtual = sortearComando();
          if (comandoAtual) {
            estadoMestre = "preparando";
            acaoVisualMestre = "mostrar-sinal";
          }
        }
      } else compassosViradaDe3--;
    } else if (estadoMestre === "preparando") {
      estadoMestre = "contagem";
      if (comandoAtual === viradaDe3) compassosViradaDe3 = 3;
    } else if (estadoMestre === "contagem") {
      estadoMestre = "executando";
      acaoVisualMestre = "executar";
      if (comandoAtual === joinha) bpm = bpmDefault;
    } else if (estadoMestre === "executando") {
      estadoMestre = "livre";
      ultimoComando = comandoAtual;
      acaoVisualMestre = "limpar";
      if (comandoAtual === viradaDe2Cortada) bpm /= 2;
      comandoAtual = null;
    }
  }

  if (estadoMestre === "contagem") {
    acaoVisualMestre = "contar";

    osc.type = "square";
    osc.frequency.value = 2500;
  } else {
    osc.type = "sine";
    osc.frequency.value = beatNumber === 0 ? 1000 : 800;
  }

  envelope.gain.setValueAtTime(1, time);
  envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.start(time);
  osc.stop(time + 0.05);

  notesInQueue.push({
    note: beatNumber,
    time: time,
    acaoMestre: acaoVisualMestre,
    dadosComando: comandoAtual,
  });
}

function scheduler() {
  while (nextNoteTime < audioContext.currentTime + 0.1) {
    playNote(nextNoteTime, currentBeat);
    nextNote();
  }
  timerID = setTimeout(scheduler, 25);
}

function draw() {
  let currentTime = audioContext.currentTime;

  while (notesInQueue.length && notesInQueue[0].time < currentTime) {
    let eventoAtual = notesInQueue[0];
    beats.forEach((b) => b.classList.remove("active"));
    beats[eventoAtual.note].classList.add("active");

    const displaySinal = document.getElementById("sinal-emoji");
    const displayTexto = document.getElementById("comando-texto");
    const containerMestre = document.querySelector(".sinal-container");
    const ocultarTexto = document.getElementById("ocultar-texto").checked;

    if (eventoAtual.acaoMestre === "mostrar-sinal") {
      displaySinal.innerText = eventoAtual.dadosComando.sinal;
      displayTexto.innerText = ocultarTexto
        ? ""
        : eventoAtual.dadosComando.nome;

      containerMestre.classList.add("comando-destaque");
      setTimeout(
        () => containerMestre.classList.remove("comando-destaque"),
        600,
      );
    } else if (eventoAtual.acaoMestre === "contar") {
      displayTexto.innerText = ocultarTexto ? "" : "SE PREPARE!";
      containerMestre.classList.add("alerta-contagem");
      setTimeout(
        () => containerMestre.classList.remove("alerta-contagem"),
        150,
      );
    } else if (eventoAtual.acaoMestre === "executar") {
      displaySinal.innerText = "💥";
      displayTexto.innerText = ocultarTexto ? "" : "EXECUTANDO!";
    } else if (eventoAtual.acaoMestre === "limpar") {
      displaySinal.innerText = "";
      displayTexto.innerText = "";
    }

    notesInQueue.splice(0, 1);
  }

  if (isPlaying) {
    requestAnimationFrame(draw);
  }
}

// AO CLICAR INICIAR

btnPlay.addEventListener("click", (e) => {
  e.preventDefault();

  if (!isPlaying) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    isPlaying = true;
    btnPlay.innerText = "Parar";
    currentBeat = 0;
    nextNoteTime = audioContext.currentTime + 0.05;

    scheduler();
    requestAnimationFrame(draw);
    requestWakeLock();
  } else {
    estadoMestre = "livre";
    comandoAtual = null;
    document.getElementById("sinal-emoji").innerText = "";
    document.getElementById("comando-texto").innerText = "";
    isPlaying = false;
    btnPlay.innerText = "Iniciar";
    clearTimeout(timerID);
    notesInQueue = [];
    beats.forEach((b) => b.classList.remove("active"));
  }
});

// WAKE LOCK : TELA CONTINUA LIGADA AO VOLTAR PARA O SITE

document.addEventListener("visibilitychange", async () => {
  if (wakeLock !== null && document.visibilityState === "visible") {
    await requestWakeLock();
  }
});

// RECARREGAR PÁGINA

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("vel").value = 120;
  document.getElementById("chance").value = 10;
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.checked = false;
  });
  document.getElementById("sinal-emoji").innerText = "";
  document.getElementById("comando-texto").innerText = "";
});
