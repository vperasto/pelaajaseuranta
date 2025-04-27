let players = JSON.parse(localStorage.getItem('players')) || [];
let historyEntries = JSON.parse(localStorage.getItem('history')) || [];

const playerForm = document.getElementById('playerForm');
const playerList = document.getElementById('playerList');
const historyList = document.getElementById('historyList');
// Uudet nappi-elementit
const startGameBtn = document.getElementById('startGameBtn');
const endGameBtn = document.getElementById('endGameBtn');
const copyHistoryBtn = document.getElementById('copyHistoryBtn');

// --- Helper-funktio historian päivitykseen ja tallennukseen ---
function logEvent(message) {
  const time = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = `${time} – ${message}`;
  historyEntries.unshift(entry); // Lisätään uusin tapahtuma listan alkuun
  renderHistory();
  saveData();
}

// --- Tapahtumankäsittelijät ---

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
  // Ei lisätä pelaajan lisäystä suoraan historiaan, ellei haluta
  renderPlayers();
  saveData(); // Tallennetaan pelaajalista
  playerForm.reset();
});

startGameBtn.addEventListener('click', () => {
  logEvent('Peli alkoi');
  startGameBtn.disabled = true;
  endGameBtn.disabled = false;
});

endGameBtn.addEventListener('click', () => {
  logEvent('Peli päättyi');
  startGameBtn.disabled = false; // Sallitaan uuden pelin aloitus
  endGameBtn.disabled = true;
});

copyHistoryBtn.addEventListener('click', () => {
  // Muodostetaan kopioitava teksti historian merkinnöistä (uusin ensin)
  // Jos halutaan vanhin ensin: historyEntries.slice().reverse().join('\n')
  const historyText = historyEntries.join('\n');

  navigator.clipboard.writeText(historyText)
    .then(() => {
      // Annetaan käyttäjälle palautetta onnistumisesta
      const originalText = copyHistoryBtn.textContent;
      copyHistoryBtn.textContent = 'Kopioitu!';
      copyHistoryBtn.disabled = true; // Estetään turhat tuplaklikkaukset
      setTimeout(() => {
        copyHistoryBtn.textContent = originalText;
        copyHistoryBtn.disabled = false;
      }, 1500); // Palautetaan teksti 1.5 sekunnin kuluttua
    })
    .catch(err => {
      console.error('Historian kopiointi epäonnistui: ', err);
      alert('Kopiointi epäonnistui. Tarkista selaimen oikeudet.');
    });
});

// --- Pelaajien renderöinti (ennallaan, mutta käyttää logEventia) ---

function renderPlayers() {
  playerList.innerHTML = '';
  // Järjestetään pelaajat numerojärjestykseen ennen renderöintiä
  const sortedPlayers = [...players].sort((a, b) => parseInt(a.number) - parseInt(b.number));

  sortedPlayers.forEach(p => {
    const div = document.createElement('div');
    div.className = `player ${p.onCourt ? 'on-court' : 'bench'}`;
    div.style.position = 'relative';

    if (Number(p.fouls) >= 5) {
      div.className = `player player-five-fouls`;
      // Ei enää opacityä, koska värit vaihdettu
      // div.style.opacity = '0.5';
    }

    div.innerHTML = `
      <h3>#${p.number} ${p.name}</h3>
      <div class="player-layout">
        <div class="stat-block">
          <div class="icon">🏀</div>
          <div class="big-number">${p.points}</div>
          <div class="buttons-vertical">
            <button onclick="changePoints(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button>
            <button onclick="changePoints(${p.id}, -1)" ${p.fouls >= 5 || !p.onCourt || p.points <= 0 ? 'disabled' : ''}>－</button> <!-- Lisätty ehto: pisteitä oltava > 0 -->
          </div>
        </div>
        <div class="stat-block">
          <div class="icon">🚫</div>
          <div class="big-number">${p.fouls}</div>
          <div class="buttons-vertical">
            <button onclick="changeFouls(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button>
            <button onclick="changeFouls(${p.id}, -1)" ${p.fouls <= 0 ? 'disabled' : ''}>－</button> <!-- Lisätty ehto: virheitä oltava > 0 -->
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
      padding: '0', // Poistetaan ylimääräinen padding
      lineHeight: '1' // Varmistetaan, ettei korkeus kasva
    });

    div.appendChild(removeButton);
    playerList.appendChild(div);
  });
}

// --- Muut toiminnot (käyttävät logEventia) ---

function changePoints(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5 || !player.onCourt) return;

  const oldPoints = player.points;
  player.points = Math.max(0, player.points + amount);

  // Lisätään tapahtuma historiaan VAIN jos pisteet muuttuivat
  if (player.points !== oldPoints) {
    logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'teki pisteen' : 'piste poistettu'} (Yht: ${player.points})`);
  }

  renderPlayers(); // logEvent hoitaa tallennuksen ja historian renderöinnin
  // Ei tarvita saveData()-kutsua tässä, koska logEvent tekee sen
}

function changeFouls(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player) return;

  const previousFouls = player.fouls;
  const newFouls = Math.max(0, player.fouls + amount);

  // Lisätään tapahtuma historiaan VAIN jos virheet muuttuivat
  if (newFouls !== previousFouls) {
      player.fouls = newFouls; // Päivitetään virheet vasta tässä

      // Logataan virheen lisäys/poisto
       logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'sai virheen' : 'virhe poistettu'} (Yht: ${player.fouls})`);

      // Tarkistetaan ja logataan, jos virheet tulivat täyteen
      if (player.fouls >= 5 && previousFouls < 5) {
          logEvent(`#${player.number} ${player.name} – VIRHEET TÄYNNÄ!`);
          // Automaattinen vaihto penkille, jos oli kentällä
          if(player.onCourt) {
              player.onCourt = false;
              logEvent(`#${player.number} ${player.name} automaattisesti penkille (5 virhettä)`);
          }
      }
  }

  renderPlayers(); // logEvent hoitaa tallennuksen ja historian renderöinnin
  // Ei tarvita saveData()-kutsua tässä, koska logEvent tekee sen
  // renderHistory() kutsutaan logEventin sisällä
}

function toggleCourt(id) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5) return;
  player.onCourt = !player.onCourt;
  // Käytetään logEvent-funktiota
  logEvent(`#${player.number} ${player.name} ${player.onCourt ? 'kentälle' : 'penkille'}`);
  renderPlayers();
  // Ei tarvita renderHistory() tai saveData() tässä, logEvent hoitaa ne
}

function removePlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  if (confirm(`Oletko varma että haluat poistaa pelaajan #${player.number} ${player.name}? Tämä poistaa pelaajan pysyvästi.`)) {
    logEvent(`Pelaaja #${player.number} ${player.name} poistettu`); // Logataan poisto
    players = players.filter(p => p.id !== id);
    renderPlayers();
    // Ei tarvita saveData() tässä, logEvent hoitaa sen
  }
}

function renderHistory() {
  historyList.innerHTML = '';
  // Näytetään historia aikajärjestyksessä (uusin ylinnä, koska lisätään unshiftillä)
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
  if (confirm('Haluatko varmasti tyhjentää KAIKKI tiedot (pelaajat ja historian)? Tätä ei voi perua.')) {
    players = [];
    historyEntries = [];
    saveData();
    renderPlayers();
    renderHistory();
    // Palautetaan nappien tila alkutilaan
    startGameBtn.disabled = false;
    endGameBtn.disabled = true;
    console.log('Kaikki data nollattu.');
  }
}

// --- Alustus sivun latautuessa ---
function initializeApp() {
    renderPlayers();
    renderHistory();

    // Asetetaan nappien tila sen mukaan, onko peli jo käynnissä historian perusteella
    const gameStarted = historyEntries.some(entry => entry.includes('Peli alkoi'));
    const gameEnded = historyEntries.some(entry => entry.includes('Peli päättyi'));

    if (gameStarted && !gameEnded) {
        // Peli on käynnissä
        startGameBtn.disabled = true;
        endGameBtn.disabled = false;
    } else {
        // Peli ei ole käynnissä (joko ei aloitettu tai jo lopetettu)
        startGameBtn.disabled = false;
        endGameBtn.disabled = true;
    }
     // Jos viimeisin tapahtuma on "Peli päättyi", pidetään aloitusnappi aktiivisena.
    if (historyEntries.length > 0 && historyEntries[0].includes('Peli päättyi')) {
        startGameBtn.disabled = false;
        endGameBtn.disabled = true;
    }

}

// Käynnistetään sovellus
initializeApp();
