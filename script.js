// === Globaalit muuttujat ja elementtiviittaukset ===
let players = JSON.parse(localStorage.getItem('players')) || [];
let historyEntries = JSON.parse(localStorage.getItem('history')) || [];

const playerForm = document.getElementById('playerForm');
const playerList = document.getElementById('playerList');
const historyList = document.getElementById('historyList');
const startGameBtn = document.getElementById('startGameBtn');
const endGameBtn = document.getElementById('endGameBtn');
const markPeriodBtn = document.getElementById('markPeriodBtn');
const copyHistoryBtn = document.getElementById('copyHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// --- Helper-funktio historian päivitykseen ja tallennukseen ---
function logEvent(message) {
  const time = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = `${time} – ${message}`;
  historyEntries.unshift(entry);
  renderHistory(); // Päivittää myös nappien tiloja (clear/copy)
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
  saveData(); // Tallennetaan vain pelaajat ja historia (joka ei muuttunut)
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

markPeriodBtn.addEventListener('click', () => {
    logEvent("Jakson vaihtuminen merkitty");
    markPeriodBtn.classList.add('marked');
    markPeriodBtn.disabled = true; // Poistetaan käytöstä heti
    const originalText = markPeriodBtn.textContent;
    markPeriodBtn.textContent = 'Merkitty!';

    setTimeout(() => {
        markPeriodBtn.textContent = originalText;
        markPeriodBtn.classList.remove('marked');
        const isGameStillRunning = startGameBtn.disabled;
        if (isGameStillRunning) {
            markPeriodBtn.disabled = false; // Enabloidaan vain jos peli yhä käy
        }
    }, 1500);
});


copyHistoryBtn.addEventListener('click', () => {
    if (historyEntries.length === 0) {
      alert("Historia on tyhjä, ei kopioitavaa.");
      return;
    }
    const historyText = historyEntries.join('\n');
    navigator.clipboard.writeText(historyText)
      .then(() => {
        const originalText = copyHistoryBtn.textContent;
        copyHistoryBtn.textContent = 'Kopioitu!'; copyHistoryBtn.disabled = true;
        setTimeout(() => { copyHistoryBtn.textContent = originalText; copyHistoryBtn.disabled = false; }, 1500);
      })
      .catch(err => {
        console.error('Kopiointi epäonnistui (clipboard API): ', err);
        try {
            const textArea = document.createElement("textarea");
            textArea.value = historyText; textArea.style.position = "fixed"; document.body.appendChild(textArea);
            textArea.focus(); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);
            const originalText = copyHistoryBtn.textContent;
            copyHistoryBtn.textContent = 'Kopioitu!'; copyHistoryBtn.disabled = true;
            setTimeout(() => { copyHistoryBtn.textContent = originalText; copyHistoryBtn.disabled = false; }, 1500);
        } catch (fallbackErr) {
            console.error('Kopiointi epäonnistui (execCommand):', fallbackErr);
            alert('Kopiointi epäonnistui. Yritä kopioida manuaalisesti.');
        }
      });
});

clearHistoryBtn.addEventListener('click', () => {
  clearHistory(); // Kutsuu alla olevaa päivitettyä funktiota
});


// --- Pelaajien renderöinti ---
function renderPlayers() {
  playerList.innerHTML = '';
  const sortedPlayers = [...players].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  sortedPlayers.forEach(p => {
    const div = document.createElement('div');
    const isOnCourt = p.onCourt;
    const hasMaxFouls = p.fouls >= 5;
    const canScore = isOnCourt && !hasMaxFouls;

    div.className = `player ${isOnCourt ? 'on-court' : 'bench'}`;
    if (hasMaxFouls) {
        div.className = `player player-five-fouls`;
    }

    div.innerHTML = `
      <h3>#${p.number} ${p.name}</h3>
      <div class="player-layout">
        <div class="stat-block">
          <div class="icon">🏀</div>
          <div class="big-number">${p.points}</div>
          <div class="buttons-vertical">
            <button onclick="changePoints(${p.id}, 1)" ${!canScore ? 'disabled' : ''} title="${!canScore ? 'Pelaaja ei kentällä tai virheet täynnä' : 'Lisää piste'}">＋</button>
            <button onclick="changePoints(${p.id}, -1)" ${!canScore || p.points <= 0 ? 'disabled' : ''} title="${!canScore || p.points <= 0 ? 'Pelaaja ei kentällä, virheet täynnä tai pisteitä ei ole' : 'Vähennä piste'}">－</button>
          </div>
        </div>
        <div class="stat-block">
          <div class="icon">🚫</div>
          <div class="big-number">${p.fouls}</div>
          <div class="buttons-vertical">
            <button onclick="changeFouls(${p.id}, 1)" ${!canScore ? 'disabled' : ''} title="${!canScore ? 'Pelaaja ei kentällä tai virheet täynnä' : 'Lisää virhe'}">＋</button>
            <button onclick="changeFouls(${p.id}, -1)" ${p.fouls <= 0 ? 'disabled' : ''} title="${p.fouls <= 0 ? 'Ei poistettavia virheitä' : 'Vähennä virhe'}">－</button>
          </div>
        </div>
        <div class="substitute-block">
          <div class="icon"
               style="cursor: ${hasMaxFouls ? 'not-allowed' : 'pointer'}; color: ${isOnCourt ? '#2196f3' : '#e53935'}"
               title="${hasMaxFouls ? 'Pelaajalla virheet täynnä' : isOnCourt ? 'Laita vaihtoon' : 'Laita kentälle'}"
               onclick="${hasMaxFouls ? '' : `toggleCourt(${p.id})`}">🔁</div>
        </div>
      </div>`;

    const removeButton = document.createElement('button');
    removeButton.innerHTML = '❌'; removeButton.title = 'Poista pelaaja';
    removeButton.style.cssText = `position: absolute; top: 5px; right: 10px; background: transparent; border: none; color: white; font-size: 1.2rem; cursor: pointer; padding: 0; line-height: 1;`;
    removeButton.onclick = () => removePlayer(p.id);
    div.appendChild(removeButton);
    playerList.appendChild(div);
  });
}

// --- Muut toiminnot ---

function changePoints(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5 || !player.onCourt) {
    console.warn(`changePoints blocked: Player ${id} not on court or has max fouls.`);
    return;
  }
  if (amount < 0 && player.points <= 0) {
      console.warn(`changePoints blocked: Player ${id} has 0 points, cannot decrease.`);
      return;
  }

  const oldPoints = player.points;
  player.points = Math.max(0, player.points + amount);

  if (player.points !== oldPoints) {
    logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'teki pisteen' : 'piste poistettu'} (Yht: ${player.points})`);
  }
  renderPlayers();
}

function changeFouls(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player) return;

  if (amount > 0 && (!player.onCourt || player.fouls >= 5)) {
      console.warn(`changeFouls (+1) blocked: Player ${id} not on court or already has max fouls.`);
      return;
  }
   if (amount < 0 && player.fouls <= 0) {
       console.warn(`changeFouls (-1) blocked: Player ${id} has 0 fouls.`);
       return;
   }

  const previousFouls = player.fouls;
  const newFouls = Math.max(0, player.fouls + amount);

  if (newFouls !== previousFouls) {
      player.fouls = newFouls;
       logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'sai virheen' : 'virhe poistettu'} (Yht: ${player.fouls})`);

      if (player.fouls >= 5 && previousFouls < 5) {
          logEvent(`#${player.number} ${player.name} – VIRHEET TÄYNNÄ!`);
          if(player.onCourt) {
              player.onCourt = false;
              logEvent(`#${player.number} ${player.name} automaattisesti penkille (5 virhettä)`);
          }
      }
  }
  renderPlayers();
}

function toggleCourt(id) {
  const player = players.find(p => p.id === id);
  if (!player) return; // Lisätty tarkistus, jos pelaajaa ei löydy
  if (player.fouls >= 5) {
      // Estetään kentälle meno, jos virheet täynnä
      if (!player.onCourt) { // Vain jos yritetään laittaa kentälle
         alert(`Pelaajalla #${player.number} ${player.name} on virheet täynnä, ei voi laittaa kentälle.`);
         return;
      }
      // Penkille voi mennä vaikka virheet olisivat täynnä
  }

  const currentlyOnCourt = players.filter(p => p.onCourt).length;
  if (!player.onCourt && currentlyOnCourt >= 5) {
    alert('Kentällä voi olla enintään 5 pelaajaa kerrallaan!');
    return;
  }

  player.onCourt = !player.onCourt;
  logEvent(`#${player.number} ${player.name} ${player.onCourt ? 'kentälle' : 'penkille'}`);
  renderPlayers();
}

function removePlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  if (confirm(`Oletko varma että haluat poistaa pelaajan #${player.number} ${player.name}? Tämä poistaa pelaajan pysyvästi.`)) {
    logEvent(`Pelaaja #${player.number} ${player.name} poistettu`);
    players = players.filter(p => p.id !== id);
    saveData();
    renderPlayers();
  }
}

// --- Historian renderöinti ---
function renderHistory() {
  historyList.innerHTML = '';
  historyEntries.forEach(entry => { const li = document.createElement('li'); li.textContent = entry; historyList.appendChild(li); });
  const historyIsEmpty = historyEntries.length === 0;
  clearHistoryBtn.disabled = historyIsEmpty;
  copyHistoryBtn.disabled = historyIsEmpty;
}

// --- Datan tallennus ja nollaus ---
function saveData() {
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('history', JSON.stringify(historyEntries));
}

// KORJATTU JA LAAJENNETTU: Funktio vain historian tyhjentämiseen (nollaa virheet JA pisteet)
function clearHistory() {
    if (historyEntries.length === 0) {
        return; // Ei tehdä mitään, jos historia on jo tyhjä
    }
    // Päivitetään vahvistuskysymys kertomaan myös pisteiden nollauksesta
    if (confirm('Haluatko varmasti tyhjentää VAIN historian? Pelaajat siirretään penkille, ja heidän virheensä sekä pisteensä nollataan.')) {
        historyEntries = []; // Tyhjennä historia-array

        let playersMoved = 0;
        let foulsWereReset = false;
        let pointsWereReset = false; // Lisätty seuranta pisteille

        // Käy läpi KAIKKI pelaajat
        players.forEach(p => {
            // 1. Siirrä pelaaja penkille, jos oli kentällä
            if (p.onCourt) {
                p.onCourt = false;
                playersMoved++;
            }
            // 2. NOLLAA VIRHEET
            if (p.fouls > 0) {
                p.fouls = 0;
                foulsWereReset = true;
            }
            // 3. NOLLAA PISTEET <<< LISÄTTY TÄMÄ
            if (p.points > 0) {
                p.points = 0;
                pointsWereReset = true;
            }
        });

        // Tulostetaan konsoliin tietoa tehdyistä muutoksista
        if (playersMoved > 0) { console.log(`Siirretty ${playersMoved} pelaajaa penkille.`); }
        if (foulsWereReset) { console.log(`Kaikkien pelaajien virheet nollattu.`); }
        if (pointsWereReset) { console.log(`Kaikkien pelaajien pisteet nollattu.`); } // Lisätty loki

        // Tallenna muutokset (tyhjä historia ja päivitetyt pelaajatiedot: penkillä, 0 virhettä, 0 pistettä)
        saveData();

        // Päivitä käyttöliittymä
        renderHistory();
        renderPlayers(); // Näyttää kaikki pelaajat penkillä, 0 virhettä JA 0 pistettä

        // Aseta pelinapit alkutilanteeseen
        updateButtonStates(false);

        // Päivitetään alert-viesti
        alert('Historia tyhjennetty, pelaajat siirretty penkille, virheet ja pisteet nollattu. Voit aloittaa uuden pelin.');
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
    updateButtonStates(false); // Aseta napit alkutilaan
    console.log('Kaikki data nollattu.');
  }
}

// Funktio pelinappien tilan päivitykseen
function updateButtonStates(isGameRunning) {
    startGameBtn.disabled = isGameRunning;
    endGameBtn.disabled = !isGameRunning;
    markPeriodBtn.disabled = !isGameRunning;
    if (!isGameRunning) {
        markPeriodBtn.classList.remove('marked');
        markPeriodBtn.textContent = '⏱️ Merkitse Jakso';
    }
}

// --- Alustus sivun latautuessa ---
function initializeApp() {
    renderPlayers();
    renderHistory(); // Tämä asettaa myös clear/copy-nappien tilan

    const lastGameEvent = historyEntries.find(entry => entry.includes('Peli alkoi') || entry.includes('Peli päättyi'));
    let gameIsRunning = false;
    if (lastGameEvent && lastGameEvent.includes('Peli alkoi')) {
        gameIsRunning = true;
    }
    if (historyEntries.length === 0) {
        gameIsRunning = false;
    }

    updateButtonStates(gameIsRunning); // Asetetaan nappien tila alussa

    console.log(`Sovellus alustettu. Peli ${gameIsRunning ? 'on' : 'ei ole'} käynnissä.`);
}

// Käynnistetään sovellus
initializeApp();
