let players = JSON.parse(localStorage.getItem('players')) || [];
let historyEntries = JSON.parse(localStorage.getItem('history')) || [];

const playerForm = document.getElementById('playerForm');
const playerList = document.getElementById('playerList');
const historyList = document.getElementById('historyList');
const totalPoints = players.reduce((sum, p) => sum + p.points, 0);
document.getElementById('totalPoints').textContent = `Joukkueen pisteet: ${totalPoints}`;


playerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const number = document.getElementById('playerNumber').value.trim();
  if (!name || !number) return;

  const player = {
    id: Date.now(),
    name,
    number,
    points: 0,
    fouls: 0,
    onCourt: false
  };
  players.push(player);
  renderPlayers();
  saveData();
  playerForm.reset();
});

function renderPlayers() {
  playerList.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = `player ${p.onCourt ? 'on-court' : 'bench'}`;
    div.innerHTML = `
      <h3>#${p.number} ${p.name}</h3>
      <p>Pisteet: ${p.points}</p>
      <p>Virheet: ${p.fouls}</p>
      <div class="buttons">
        <button onclick="changePoints(${p.id}, 1)">+1</button>
        <button onclick="changePoints(${p.id}, -1)">-1</button>
        <button onclick="changeFouls(${p.id}, 1)">F+1</button>
        <button onclick="changeFouls(${p.id}, -1)">F-1</button>
        <button onclick="toggleCourt(${p.id})">${p.onCourt ? 'Vaihda pois' : 'Vaihda kentälle'}</button>
      </div>
    `;
    playerList.appendChild(div);
  });
}

function changePoints(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  player.points = Math.max(0, player.points + amount);
  renderPlayers();
  saveData();
}

function changeFouls(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  player.fouls = Math.max(0, player.fouls + amount);
  renderPlayers();
  saveData();
}

function toggleCourt(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  player.onCourt = !player.onCourt;
  const time = new Date().toLocaleTimeString();
  const log = `${time} – #${player.number} ${player.name} ${player.onCourt ? 'kentälle' : 'penkille'}`;
  historyEntries.unshift(log);
  renderHistory();
  renderPlayers();
  saveData();
}

function renderHistory() {
  historyList.innerHTML = '';
  historyEntries.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = entry;
    historyList.appendChild(li);
  });
}

function saveData() {
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('history', JSON.stringify(historyEntries));
}

function resetData() {
  if (confirm('Haluatko varmasti tyhjentää kaikki tiedot?')) {
    players = [];
    historyEntries = [];
    saveData();
    renderPlayers();
    renderHistory();
  }
}

renderPlayers();
renderHistory();
