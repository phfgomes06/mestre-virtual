let audioContext;
let isPlaying = false;
let bpm = 120;
let nextNoteTime = 0.0;
let timerID;

let currentBeat = 0;
let notesInQueue = [];

const btnPlay = document.getElementById("btn-play");
const velInput = document.getElementById("vel");
const beats = document.querySelectorAll(".beat");

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
  if (beatNumber === 0) {
    osc.frequency.value = 1000;
  } else {
    osc.frequency.value = 800;
  }

  envelope.gain.setValueAtTime(1, time);
  envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  osc.start(time);
  osc.stop(time + 0.05);

  notesInQueue.push({ note: beatNumber, time: time });
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
    let currentNote = notesInQueue[0].note;
    beats.forEach(b => b.classList.remove('active'));
    beats[currentNote].classList.add('active');
    notesInQueue.splice(0, 1);
  }

  if (isPlaying) {
    requestAnimationFrame(draw);
  }
}

btnPlay.addEventListener('click', (e) => {
  e.preventDefault();

  if (!isPlaying) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    isPlaying = true;
    btnPlay.innerText = "Parar";
    currentBeat = 0;
    nextNoteTime = audioContext.currentTime + 0.05;

    scheduler(); 
    requestAnimationFrame(draw);
  } else {
    isPlaying = false;
    btnPlay.innerText = "Iniciar";
    clearTimeout(timerID);
    notesInQueue = [];
    beats.forEach(b => b.classList.remove('active'));
  }
});
