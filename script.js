let players = JSON.parse(localStorage.getItem('players')) || [];
let historyEntries = JSON.parse(localStorage.getItem('history')) || [];

const playerForm = document.getElementById('playerForm');
const playerList = document.getElementById('playerList');
const historyList = document.getElementById('historyList');

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
    div.style.position = 'relative'; // tarvitaan X-napin asemointiin

    // Lisää opacity jos virheitä 5 tai enemmän
    if (Number(p.fouls) >= 5) {
      div.className = `player player-five-fouls`;
      div.style.opacity = '0.5';
    }

    div.innerHTML = `
      <h3>#${p.number} ${p.name}</h3>
      <div class="player-layout">
        <div class="stat-block">
          <div class="icon">🏀</div>
          <div class="big-number">${p.points}</div>
          <div class="buttons-vertical">
            <button onclick="changePoints(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button>
            <button onclick="changePoints(${p.id}, -1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>－</button>
          </div>
        </div>
        <div class="stat-block">
          <div class="icon">🚫</div>
          <div class="big-number">${p.fouls}</div>
          <div class="buttons-vertical">
            <button onclick="changeFouls(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button>
            <button onclick="changeFouls(${p.id}, -1)">－</button>
          </div>
        </div>
        <div class="substitute-block">
          <div class="icon"
               style="cursor: ${p.fouls >= 5 ? 'not-allowed' : 'pointer'}; color: ${p.onCourt ? '#2196f3' : '#e53935'}"
               title="${p.fouls >= 5 ? 'Pelaajalla virheet täynnä' : p.onCourt ? 'Laita vaihtoon' : 'Laita kentälle'}"
               onclick="${p.fouls >= 5 ? '' : `toggleCourt(${p.id})`}">🔁</div>
        </div>
      </div>
    `;

    // ❌-nappi oikeaan yläkulmaan
    const removeButton = document.createElement('button');
    removeButton.innerHTML = '❌';
    removeButton.title = 'Poista pelaaja';
    removeButton.onclick = () => removePlayer(p.id);
    Object.assign(removeButton.style, {
      position: 'absolute',
      top: '5px',
      right: '10px',
      background: 'transparent',
      border: 'none',
      color: 'white',
      fontSize: '1.2rem',
      cursor: 'pointer',
    });

    div.appendChild(removeButton);
    playerList.appendChild(div);
  });
}

function changePoints(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5 || !player.onCourt) return;
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
  if (!player || player.fouls >= 5) return;
  player.onCourt = !player.onCourt;
  const time = new Date().toLocaleTimeString();
  const log = `${time} – #${player.number} ${player.name} ${player.onCourt ? 'kentälle' : 'penkille'}`;
  historyEntries.unshift(log);
  renderHistory();
  renderPlayers();
  saveData();
}

function removePlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  if (confirm(`Oletko varma että haluat poistaa ${player.name}?`)) {
    players = players.filter(p => p.id !== id);
    renderPlayers();
    saveData();
  }
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
