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

// KORJATTU: Jaksonapin kuuntelija
markPeriodBtn.addEventListener('click', () => {
    logEvent("Jakson vaihtuminen merkitty");
    markPeriodBtn.classList.add('marked');
    markPeriodBtn.disabled = true; // Poistetaan käytöstä heti
    const originalText = markPeriodBtn.textContent;
    markPeriodBtn.textContent = 'Merkitty!';

    setTimeout(() => {
        markPeriodBtn.textContent = originalText;
        markPeriodBtn.classList.remove('marked');
        // Tarkistetaan TÄMÄN HETKINEN pelin tila ENNEN enablointia
        // Peli on käynnissä, jos Aloita-nappi ON disabled.
        const isGameStillRunning = startGameBtn.disabled;
        if (isGameStillRunning) {
            markPeriodBtn.disabled = false; // Enabloidaan vain jos peli yhä käy
        }
        // Jos peli lopetettiin timeoutin aikana, nappi jää disabled-tilaan (koska updateButtonStates(false) on kutsuttu)
    }, 1500);
});


copyHistoryBtn.addEventListener('click', () => {
    // (Kopiointilogiikka pysyy samana)
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
  clearHistory();
});


// --- Pelaajien renderöinti ---
function renderPlayers() {
  playerList.innerHTML = '';
  const sortedPlayers = [...players].sort((a, b) => parseInt(a.number) - parseInt(b.number));
  sortedPlayers.forEach(p => {
    const div = document.createElement('div');
    const isOnCourt = p.onCourt;
    const hasMaxFouls = p.fouls >= 5;
    const canScore = isOnCourt && !hasMaxFouls; // Voiko pelaaja tehdä pisteitä/saada virheitä

    div.className = `player ${isOnCourt ? 'on-court' : 'bench'}`;
    if (hasMaxFouls) { div.className = `player player-five-fouls`; }

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

// KORJATTU/TARKISTETTU: Pisteiden muutos
function changePoints(id, amount) {
  const player = players.find(p => p.id === id);
  // Varmistetaan vielä funktiossa, vaikka napin pitäisi olla disabled
  if (!player || player.fouls >= 5 || !player.onCourt) {
    console.warn(`changePoints blocked: Player ${id} not on court or has max fouls.`);
    return;
  }
  // Lisäksi tarkistus miinukselle
  if (amount < 0 && player.points <= 0) {
      console.warn(`changePoints blocked: Player ${id} has 0 points, cannot decrease.`);
      return; // Estetään turha ajo, jos pisteitä ei voi vähentää
  }

  const oldPoints = player.points;
  player.points = Math.max(0, player.points + amount); // Math.max estää negatiiviset

  if (player.points !== oldPoints) {
    logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'teki pisteen' : 'piste poistettu'} (Yht: ${player.points})`);
  }
  renderPlayers(); // Päivitetään pelaajanäkymä heti
}

// KORJATTU/TARKISTETTU: Virheiden muutos
function changeFouls(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player) return;

  // Estä virheen lisääminen, jos pelaaja ei ole kentällä TAI virheet täynnä
  if (amount > 0 && (!player.onCourt || player.fouls >= 5)) {
      console.warn(`changeFouls (+1) blocked: Player ${id} not on court or already has max fouls.`);
      return;
  }
   // Estä virheen vähentäminen, jos virheitä on 0
   if (amount < 0 && player.fouls <= 0) {
       console.warn(`changeFouls (-1) blocked: Player ${id} has 0 fouls.`);
       return;
   }


  const previousFouls = player.fouls;
  const newFouls = Math.max(0, player.fouls + amount); // Math.max estää negatiiviset

  if (newFouls !== previousFouls) {
      player.fouls = newFouls;
       logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'sai virheen' : 'virhe poistettu'} (Yht: ${player.fouls})`);

      // Tarkistetaan, tulivatko virheet juuri täyteen
      if (player.fouls >= 5 && previousFouls < 5) {
          logEvent(`#${player.number} ${player.name} – VIRHEET TÄYNNÄ!`);
          // Automaattinen vaihto penkille, jos oli kentällä
          if(player.onCourt) {
              player.onCourt = false; // Muuta tila
              logEvent(`#${player.number} ${player.name} automaattisesti penkille (5 virhettä)`);
              // Ei tarvitse kutsua renderPlayers tässä, koska se kutsutaan lopuksi
          }
      }
  }
  renderPlayers(); // Päivitetään pelaajanäkymä aina lopuksi
}

function toggleCourt(id) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5) return; // Estetään vaihto jos virheet täynnä

  const currentlyOnCourt = players.filter(p => p.onCourt).length;

  // Estä yli 5 pelaajaa kentälle, kun ollaan laittamassa pelaajaa kentälle
  if (!player.onCourt && currentlyOnCourt >= 5) {
    alert('Kentällä voi olla enintään 5 pelaajaa kerrallaan!');
    return;
  }

  player.onCourt = !player.onCourt;
  logEvent(`#${player.number} ${player.name} ${player.onCourt ? 'kentälle' : 'penkille'}`);
  renderPlayers(); // Päivitä näkymä heti vaihdon jälkeen
}

function removePlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  if (confirm(`Oletko varma että haluat poistaa pelaajan #${player.number} ${player.name}? Tämä poistaa pelaajan pysyvästi.`)) {
    logEvent(`Pelaaja #${player.number} ${player.name} poistettu`); // Logataan ensin
    players = players.filter(p => p.id !== id);
    saveData(); // Tallennetaan muuttunut pelaajalista heti
    renderPlayers(); // Päivitetään näkymä
  }
}

// --- Historian renderöinti ---
function renderHistory() {
  historyList.innerHTML = '';
  historyEntries.forEach(entry => { const li = document.createElement('li'); li.textContent = entry; historyList.appendChild(li); });
  // Päivitetään aina nappien tila historiaa renderöidessä
  const historyIsEmpty = historyEntries.length === 0;
  clearHistoryBtn.disabled = historyIsEmpty;
  copyHistoryBtn.disabled = historyIsEmpty;
}

// --- Datan tallennus ja nollaus ---
function saveData() {
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('history', JSON.stringify(historyEntries));
   // console.log("Data saved:", { players, historyEntries }); // Voi auttaa debuggauksessa
}

// KORJATTU: Funktio vain historian tyhjentämiseen
function clearHistory() {
    if (historyEntries.length === 0) {
        //alert("Historia on jo tyhjä."); // Ehkä turha alert, nappi on jo disabled
        return;
    }
    if (confirm('Haluatko varmasti tyhjentää VAIN historian? Pelaajat siirretään samalla penkille.')) {
        historyEntries = []; // Tyhjennä historia

        let playersMoved = 0;
        players.forEach(p => {
            if (p.onCourt) {
                p.onCourt = false;
                playersMoved++;
            }
        });
        if (playersMoved > 0) {
            console.log(`Siirretty ${playersMoved} pelaajaa penkille.`);
        }

        saveData(); // Tallenna tyhjä historia ja päivitetyt pelaajat

        renderHistory(); // Päivitä tyhjä historia (ja nappien tila)
        renderPlayers(); // Näytä kaikki penkillä

        // ASETA PELINAPIT ALKUTILANTEESEEN
        updateButtonStates(false); // Peli ei ole käynnissä

        alert('Historia tyhjennetty ja pelaajat siirretty penkille. Voit aloittaa uuden pelin.');
    }
}


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
    // Varmistetaan vielä, ettei jaksonappi jää jumiin "Merkitty!"-tilaan, jos peli loppuu
    if (!isGameRunning) {
        markPeriodBtn.classList.remove('marked');
        markPeriodBtn.textContent = '⏱️ Merkitse Jakso'; // Palauta alkuperäinen teksti
    }
}

// --- Alustus sivun latautuessa ---
function initializeApp() {
    renderPlayers();
    renderHistory(); // Tämä asettaa myös clear/copy-nappien tilan

    // Päätellään pelin tila viimeisimmästä relevantista tapahtumasta
    const lastGameEvent = historyEntries.find(entry => entry.includes('Peli alkoi') || entry.includes('Peli päättyi'));
    let gameIsRunning = false;
    if (lastGameEvent && lastGameEvent.includes('Peli alkoi')) {
        gameIsRunning = true;
    }
    // Jos historia on tyhjä, peli ei voi olla käynnissä
    if (historyEntries.length === 0) {
        gameIsRunning = false;
    }

    updateButtonStates(gameIsRunning); // Asetetaan nappien tila alussa

    console.log(`Sovellus alustettu. Peli ${gameIsRunning ? 'on' : 'ei ole'} käynnissä.`);
}

// Käynnistetään sovellus
initializeApp();
