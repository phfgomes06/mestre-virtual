let audioContext;
let isPlaying = false;
let bpm = 120;
let nextNoteTime = 0.0;
let timerID;
let estadoMestre = "livre";
let comandoAtual = null;
let chanceDeComando = 0.1;
let ultimoComando = { nome: "null" };
let compassosViradaDe3 = 0;

let currentBeat = 0;
let notesInQueue = [];

const viradaDe2 = { nome: "Virada de 2", sinal: "✌️" };
const viradaDe2NotaExtra = {
  nome: "Virada de 2 com nota extra",
  sinal: "✌️👉",
};
const viradaDe2Cortada = { nome: "Virada de 2 cortada", sinal: "✌️✂" };
const viradaDe3 = { nome: "Virada de 3", sinal: "🤟" };
const ondinha = { nome: "Ondinha - Retomada", sinal: "🌊" };
const joinha = { nome: "Retomada", sinal: "👍" };

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

const btnPlay = document.getElementById("btn-play");
const velInput = document.getElementById("vel");
const beats = document.querySelectorAll(".beat");
const inputchance = document.getElementById("chance");

inputchance.addEventListener("input", (e) => {
  chanceDeComando = e.target.value / 100;
});

velInput.addEventListener("input", (e) => {
  bpm = parseInt(e.target.value) || 120;
});

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
    osc.frequency.value = 1000;
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
      acaoVisualMestre = "contar";
      if (comandoAtual === viradaDe3) compassosViradaDe3 = 3;
    } else if (estadoMestre === "contagem") {
      estadoMestre = "executando";
      acaoVisualMestre = "executar";
      if (comandoAtual === joinha) bpm = bpm * 2;
    } else if (estadoMestre === "executando") {
      estadoMestre = "livre";
      ultimoComando = comandoAtual;
      acaoVisualMestre = "limpar";
      if (comandoAtual === viradaDe2Cortada) bpm /= 2;
      comandoAtual = null;
    }
    console.log("Comando atual:", comandoAtual);
    console.log("Acao Visual do Mestre:", acaoVisualMestre);
  } else {
    osc.frequency.value = 800;
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
