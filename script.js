// === Globaalit muuttujat ja elementtiviittaukset ===
let players = JSON.parse(localStorage.getItem('players')) || [];
let historyEntries = JSON.parse(localStorage.getItem('history')) || [];

const playerForm = document.getElementById('playerForm');
const playerList = document.getElementById('playerList');
const historyList = document.getElementById('historyList');
const startGameBtn = document.getElementById('startGameBtn');
const endGameBtn = document.getElementById('endGameBtn');
const markPeriodBtn = document.getElementById('markPeriodBtn'); // UUSI NAPPI
const copyHistoryBtn = document.getElementById('copyHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// --- Helper-funktio historian päivitykseen ja tallennukseen ---
function logEvent(message) {
  const time = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = `${time} – ${message}`;
  historyEntries.unshift(entry);
  renderHistory();
  saveData();
}

// --- Tapahtumankäsittelijät ---

playerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const number = document.getElementById('playerNumber').value.trim();
  if (!name || !number) return;
  if (players.some(p => p.number === number)) {
      alert(`Pelaaja numerolla ${number} on jo olemassa!`);
      return;
  }
  const player = { id: Date.now(), name, number, points: 0, fouls: 0, onCourt: false };
  players.push(player);
  renderPlayers();
  saveData();
  playerForm.reset();
});

startGameBtn.addEventListener('click', () => {
  logEvent('Peli alkoi');
  updateButtonStates(true); // Peli käynnissä
});

endGameBtn.addEventListener('click', () => {
  logEvent('Peli päättyi');
  updateButtonStates(false); // Peli ei käynnissä
});

// UUSI: Jaksonapin kuuntelija
markPeriodBtn.addEventListener('click', () => {
    logEvent("Jakson vaihtuminen merkitty");
    // Anna visuaalinen palaute
    markPeriodBtn.classList.add('marked'); // Lisää CSS-luokka
    markPeriodBtn.disabled = true;
    const originalText = markPeriodBtn.textContent;
    markPeriodBtn.textContent = 'Merkitty!';

    setTimeout(() => {
        markPeriodBtn.textContent = originalText;
        markPeriodBtn.classList.remove('marked'); // Poista CSS-luokka
        // Enabloi uudelleen VAIN jos peli on yhä käynnissä
        const gameIsRunning = !startGameBtn.disabled;
        if (gameIsRunning) {
            markPeriodBtn.disabled = false;
        }
    }, 1500); // 1.5 sekunnin palaute
});


copyHistoryBtn.addEventListener('click', () => {
    // (Kopiointilogiikka pysyy samana kuin edellisessä versiossa)
    if (historyEntries.length === 0) {
      alert("Historia on tyhjä, ei kopioitavaa.");
      return;
    }
    const historyText = historyEntries.join('\n');
    navigator.clipboard.writeText(historyText)
      .then(() => {
        const originalText = copyHistoryBtn.textContent;
        copyHistoryBtn.textContent = 'Kopioitu!';
        copyHistoryBtn.disabled = true;
        setTimeout(() => {
          copyHistoryBtn.textContent = originalText;
          copyHistoryBtn.disabled = false;
        }, 1500);
      })
      .catch(err => {
        console.error('Historian kopiointi epäonnistui: ', err);
        try {
            const textArea = document.createElement("textarea");
            textArea.value = historyText;
            textArea.style.position = "fixed"; document.body.appendChild(textArea);
            textArea.focus(); textArea.select(); document.execCommand('copy');
            document.body.removeChild(textArea);
            const originalText = copyHistoryBtn.textContent;
            copyHistoryBtn.textContent = 'Kopioitu!'; copyHistoryBtn.disabled = true;
            setTimeout(() => { copyHistoryBtn.textContent = originalText; copyHistoryBtn.disabled = false; }, 1500);
        } catch (fallbackErr) {
            console.error('Varamenetelmä kopiointiin epäonnistui myös:', fallbackErr);
            alert('Kopiointi epäonnistui. Yritä kopioida manuaalisesti.');
        }
      });
});

clearHistoryBtn.addEventListener('click', () => {
  clearHistory(); // Kutsutaan muokattua funktiota
});


// --- Pelaajien renderöinti (pysyy ennallaan) ---
function renderPlayers() {
  playerList.innerHTML = '';
  const sortedPlayers = [...players].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  sortedPlayers.forEach(p => {
    const div = document.createElement('div');
    div.className = `player ${p.onCourt ? 'on-court' : 'bench'}`;
    if (Number(p.fouls) >= 5) { div.className = `player player-five-fouls`; }
    div.innerHTML = `<h3>#${p.number} ${p.name}</h3><div class="player-layout"><div class="stat-block"><div class="icon">🏀</div><div class="big-number">${p.points}</div><div class="buttons-vertical"><button onclick="changePoints(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button><button onclick="changePoints(${p.id}, -1)" ${p.fouls >= 5 || !p.onCourt || p.points <= 0 ? 'disabled' : ''}>－</button></div></div><div class="stat-block"><div class="icon">🚫</div><div class="big-number">${p.fouls}</div><div class="buttons-vertical"><button onclick="changeFouls(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button><button onclick="changeFouls(${p.id}, -1)" ${p.fouls <= 0 ? 'disabled' : ''}>－</button></div></div><div class="substitute-block"><div class="icon" style="cursor: ${p.fouls >= 5 ? 'not-allowed' : 'pointer'}; color: ${p.onCourt ? '#2196f3' : '#e53935'}" title="${p.fouls >= 5 ? 'Pelaajalla virheet täynnä' : p.onCourt ? 'Laita vaihtoon' : 'Laita kentälle'}" onclick="${p.fouls >= 5 ? '' : `toggleCourt(${p.id})`}">🔁</div></div></div>`;
    const removeButton = document.createElement('button');
    removeButton.innerHTML = '❌'; removeButton.title = 'Poista pelaaja';
    removeButton.style.cssText = `position: absolute; top: 5px; right: 10px; background: transparent; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0; line-height: 1;`;
    removeButton.onclick = () => removePlayer(p.id);
    div.appendChild(removeButton); playerList.appendChild(div);
  });
}

// --- Muut toiminnot (pisteet, virheet, vaihdot, poisto - pysyvät ennallaan) ---
function changePoints(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5 || !p.onCourt) return;
  const oldPoints = player.points;
  player.points = Math.max(0, player.points + amount);
  if (player.points !== oldPoints) { logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'teki pisteen' : 'piste poistettu'} (Yht: ${player.points})`); }
  renderPlayers();
}
function changeFouls(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  if (amount > 0 && !player.onCourt) { console.log("Virhettä ei voi lisätä penkillä olevalle pelaajalle."); return; }
  const previousFouls = player.fouls;
  const newFouls = Math.max(0, player.fouls + amount);
  if (newFouls !== previousFouls) {
      player.fouls = newFouls;
       logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'sai virheen' : 'virhe poistettu'} (Yht: ${player.fouls})`);
      if (player.fouls >= 5 && previousFouls < 5) {
          logEvent(`#${player.number} ${player.name} – VIRHEET TÄYNNÄ!`);
          if(player.onCourt) { player.onCourt = false; logEvent(`#${player.number} ${player.name} automaattisesti penkille (5 virhettä)`); }
      }
  }
  renderPlayers();
}
function toggleCourt(id) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5) return;
  const currentlyOnCourt = players.filter(p => p.onCourt).length;
  if (!player.onCourt && currentlyOnCourt >= 5) { alert('Kentällä voi olla enintään 5 pelaajaa kerrallaan!'); return; }
  player.onCourt = !player.onCourt;
  logEvent(`#${player.number} ${player.name} ${player.onCourt ? 'kentälle' : 'penkille'}`);
  renderPlayers();
}
function removePlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  if (confirm(`Oletko varma että haluat poistaa pelaajan #${player.number} ${player.name}? Tämä poistaa pelaajan pysyvästi.`)) {
    logEvent(`Pelaaja #${player.number} ${player.name} poistettu`); // Logataan ensin
    players = players.filter(p => p.id !== id);
    saveData(); // Tallennetaan muutos heti logguksen jälkeen
    renderPlayers();
  }
}

// --- Historian renderöinti (pysyy ennallaan) ---
function renderHistory() {
  historyList.innerHTML = '';
  historyEntries.forEach(entry => { const li = document.createElement('li'); li.textContent = entry; historyList.appendChild(li); });
  clearHistoryBtn.disabled = historyEntries.length === 0;
  copyHistoryBtn.disabled = historyEntries.length === 0;
}

// --- Datan tallennus ja nollaus ---
function saveData() {
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('history', JSON.stringify(historyEntries));
}

// MUOKATTU: Funktio vain historian tyhjentämiseen
function clearHistory() {
    if (historyEntries.length === 0) {
        alert("Historia on jo tyhjä.");
        return;
    }
    if (confirm('Haluatko varmasti tyhjentää VAIN historian? Pelaajat siirretään samalla penkille.')) {
        historyEntries = []; // Tyhjennä historia-array

        let playersMoved = 0;
        // Siirrä kaikki pelaajat penkille
        players.forEach(p => {
            if (p.onCourt) {
                p.onCourt = false;
                playersMoved++;
            }
        });

        console.log(`Siirretty ${playersMoved} pelaajaa penkille.`);

        // Tallenna muutokset (tyhjä historia ja päivitetyt pelaajatiedot)
        saveData();

        // Päivitä käyttöliittymä
        renderHistory(); // Näyttää tyhjän historian
        renderPlayers(); // Näyttää kaikki pelaajat penkillä

        // Ilmoita käyttäjälle
        alert('Historia tyhjennetty ja kaikki pelaajat siirretty penkille.');

        // Huom: Ei muuteta pelin tila -nappeja (startGameBtn, endGameBtn, markPeriodBtn)
        // Käyttäjä voi halutessaan aloittaa uuden pelin tai jakson seurannan.
    }
}


// Kaiken nollaava funktio
function resetData() {
  if (confirm('Haluatko varmasti tyhjentää KAIKKI tiedot (pelaajat ja historian)? Tätä ei voi perua.')) {
    players = [];
    historyEntries = [];
    saveData();
    renderPlayers();
    renderHistory();
    updateButtonStates(false); // Aseta napit alkutilaan (peli ei käynnissä)
    console.log('Kaikki data nollattu.');
  }
}

// UUSI: Funktio pelinappien tilan päivitykseen
function updateButtonStates(isGameRunning) {
    startGameBtn.disabled = isGameRunning;
    endGameBtn.disabled = !isGameRunning;
    markPeriodBtn.disabled = !isGameRunning; // Jaksonappi käytössä vain kun peli käy
}

// --- Alustus sivun latautuessa ---
function initializeApp() {
    renderPlayers();
    renderHistory();

    // Päätellään pelin tila viimeisimmästä tapahtumasta
    const lastGameEvent = historyEntries.find(entry => entry.includes('Peli alkoi') || entry.includes('Peli päättyi'));
    let gameIsRunning = false;
    if (lastGameEvent && lastGameEvent.includes('Peli alkoi')) {
        gameIsRunning = true;
    }

    updateButtonStates(gameIsRunning); // Asetetaan nappien tila

    console.log(`Sovellus alustettu. Peli ${gameIsRunning ? 'on' : 'ei ole'} käynnissä.`);
}

// Käynnistetään sovellus
initializeApp();
