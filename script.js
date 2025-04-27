// === Globaalit muuttujat ja elementtiviittaukset ===
let players = JSON.parse(localStorage.getItem('players')) || [];
let historyEntries = JSON.parse(localStorage.getItem('history')) || [];

const playerForm = document.getElementById('playerForm');
const playerList = document.getElementById('playerList');
const historyList = document.getElementById('historyList');
const startGameBtn = document.getElementById('startGameBtn');
const endGameBtn = document.getElementById('endGameBtn');
const copyHistoryBtn = document.getElementById('copyHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn'); // UUSI NAPPI

// --- Helper-funktio historian päivitykseen ja tallennukseen ---
function logEvent(message) {
  const time = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = `${time} – ${message}`;
  historyEntries.unshift(entry); // Lisätään uusin tapahtuma listan alkuun
  renderHistory();
  saveData(); // Tallennetaan sekä pelaajat että historia aina tapahtuman jälkeen
}

// --- Tapahtumankäsittelijät ---

playerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const number = document.getElementById('playerNumber').value.trim();
  if (!name || !number) return;

  // Tarkistetaan, onko pelaaja samalla numerolla jo olemassa
  if (players.some(p => p.number === number)) {
      alert(`Pelaaja numerolla ${number} on jo olemassa!`);
      return;
  }

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
  saveData(); // Vain pelaajat tallennetaan tässä, ei logata tapahtumaa
  playerForm.reset();
});

startGameBtn.addEventListener('click', () => {
  logEvent('Peli alkoi');
  startGameBtn.disabled = true;
  endGameBtn.disabled = false;
});

endGameBtn.addEventListener('click', () => {
  logEvent('Peli päättyi');
  // Mahdollistetaan pelin lopettaminen, vaikka aloitusnappia ei olisi painettu (jos sivu ladattu uudelleen)
  startGameBtn.disabled = false; // Sallitaan uuden pelin aloitus
  endGameBtn.disabled = true;
});

copyHistoryBtn.addEventListener('click', () => {
  if (historyEntries.length === 0) {
      alert("Historia on tyhjä, ei kopioitavaa.");
      return;
  }
  // Muodostetaan kopioitava teksti (uusin ensin)
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
      // Yritetään vanhempaa tapaa, jos moderni API epäonnistuu
      try {
          const textArea = document.createElement("textarea");
          textArea.value = historyText;
          textArea.style.position = "fixed"; // Estää scrollauksen
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);

          // Palaute käyttäjälle
          const originalText = copyHistoryBtn.textContent;
          copyHistoryBtn.textContent = 'Kopioitu!';
          copyHistoryBtn.disabled = true;
          setTimeout(() => {
            copyHistoryBtn.textContent = originalText;
            copyHistoryBtn.disabled = false;
          }, 1500);

      } catch (fallbackErr) {
          console.error('Varamenetelmä kopiointiin epäonnistui myös:', fallbackErr);
          alert('Kopiointi epäonnistui. Yritä kopioida manuaalisesti.');
      }
    });
});

// UUSI: Historian tyhjennysnapin kuuntelija
clearHistoryBtn.addEventListener('click', () => {
  clearHistory(); // Kutsutaan erillistä funktiota
});


// --- Pelaajien renderöinti ---
function renderPlayers() {
  playerList.innerHTML = '';
  const sortedPlayers = [...players].sort((a, b) => parseInt(a.number) - parseInt(b.number));

  sortedPlayers.forEach(p => {
    const div = document.createElement('div');
    div.className = `player ${p.onCourt ? 'on-court' : 'bench'}`;

    if (Number(p.fouls) >= 5) {
      div.className = `player player-five-fouls`;
    }

    div.innerHTML = `
      <h3>#${p.number} ${p.name}</h3>
      <div class="player-layout">
        <div class="stat-block">
          <div class="icon">🏀</div>
          <div class="big-number">${p.points}</div>
          <div class="buttons-vertical">
            <button onclick="changePoints(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button>
            <button onclick="changePoints(${p.id}, -1)" ${p.fouls >= 5 || !p.onCourt || p.points <= 0 ? 'disabled' : ''}>－</button>
          </div>
        </div>
        <div class="stat-block">
          <div class="icon">🚫</div>
          <div class="big-number">${p.fouls}</div>
          <div class="buttons-vertical">
            <button onclick="changeFouls(${p.id}, 1)" ${p.fouls >= 5 || !p.onCourt ? 'disabled' : ''}>＋</button>
            <button onclick="changeFouls(${p.id}, -1)" ${p.fouls <= 0 ? 'disabled' : ''}>－</button>
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
    removeButton.style.cssText = `
        position: absolute;
        top: 5px;
        right: 10px;
        background: transparent;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    `; // Asetetaan tyylit suoraan JS:ssä
    removeButton.onclick = () => removePlayer(p.id);

    div.appendChild(removeButton);
    playerList.appendChild(div);
  });
}

// --- Muut toiminnot (pisteet, virheet, vaihdot) ---

function changePoints(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5 || !player.onCourt) return;

  const oldPoints = player.points;
  player.points = Math.max(0, player.points + amount);

  if (player.points !== oldPoints) {
    logEvent(`#${player.number} ${player.name} ${amount > 0 ? 'teki pisteen' : 'piste poistettu'} (Yht: ${player.points})`);
  }
  renderPlayers(); // Päivitetään pelaajanäkymä heti
  // logEvent hoitaa tallennuksen ja historian renderöinnin
}

function changeFouls(id, amount) {
  const player = players.find(p => p.id === id);
  if (!player) return;

  // Estä virheen lisääminen, jos pelaaja ei ole kentällä (paitsi jos vähennetään)
  if (amount > 0 && !player.onCourt) {
      console.log("Virhettä ei voi lisätä penkillä olevalle pelaajalle.");
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
  renderPlayers(); // Päivitetään pelaajanäkymä heti
  // logEvent hoitaa tallennuksen ja historian renderöinnin
}

function toggleCourt(id) {
  const player = players.find(p => p.id === id);
  if (!player || player.fouls >= 5) return;

  const currentlyOnCourt = players.filter(p => p.onCourt).length;

  // Estä yli 5 pelaajaa kentälle
  if (!player.onCourt && currentlyOnCourt >= 5) {
    alert('Kentällä voi olla enintään 5 pelaajaa kerrallaan!');
    return;
  }


  player.onCourt = !player.onCourt;
  logEvent(`#${player.number} ${player.name} ${player.onCourt ? 'kentälle' : 'penkille'}`);
  renderPlayers();
  // logEvent hoitaa tallennuksen ja historian renderöinnin
}

function removePlayer(id) {
  const player = players.find(p => p.id === id);
  if (!player) return;
  if (confirm(`Oletko varma että haluat poistaa pelaajan #${player.number} ${player.name}? Tämä poistaa pelaajan pysyvästi.`)) {
    // Logataan poisto ENNEN kuin pelaaja poistetaan listalta
    logEvent(`Pelaaja #${player.number} ${player.name} poistettu`);
    players = players.filter(p => p.id !== id);
    renderPlayers(); // Päivitetään pelaajalista
    saveData(); // Tallennetaan muuttunut pelaajalista (logEvent tallensi jo historian)
  }
}

// --- Historian renderöinti ---
function renderHistory() {
  historyList.innerHTML = '';
  historyEntries.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = entry;
    historyList.appendChild(li);
  });
  // Päivitetään historian tyhjennysnapin tila
  clearHistoryBtn.disabled = historyEntries.length === 0;
  copyHistoryBtn.disabled = historyEntries.length === 0; // Päivitetään myös kopiointinappi
}

// --- Datan tallennus ja nollaus ---
function saveData() {
  localStorage.setItem('players', JSON.stringify(players));
  localStorage.setItem('history', JSON.stringify(historyEntries));
  console.log("Data saved to localStorage"); // Lisätty debug-loki
}

// UUSI: Funktio vain historian tyhjentämiseen
function clearHistory() {
    if (historyEntries.length === 0) {
        alert("Historia on jo tyhjä.");
        return;
    }
    if (confirm('Haluatko varmasti tyhjentää VAIN historian? Pelaajat säilyvät.')) {
        historyEntries = [];
        saveData(); // Tallennetaan tyhjä historia (ja nykyiset pelaajat)
        renderHistory(); // Päivitetään näyttö
        // Ei nollata pelin tila -nappeja, koska peli voi jatkua vanhoilla pelaajilla
        console.log('Historia tyhjennetty.');
    }
}

// Vanha kaiken nollaava funktio
function resetData() {
  if (confirm('Haluatko varmasti tyhjentää KAIKKI tiedot (pelaajat ja historian)? Tätä ei voi perua.')) {
    players = [];
    historyEntries = [];
    saveData();
    renderPlayers();
    renderHistory();
    // Palautetaan pelinapit alkutilaan
    startGameBtn.disabled = false;
    endGameBtn.disabled = true;
    console.log('Kaikki data nollattu.');
  }
}

// --- Alustus sivun latautuessa ---
function initializeApp() {
    renderPlayers();
    renderHistory(); // Tämä kutsu asettaa myös clearHistoryBtn:n tilan

    // Asetetaan pelin aloitus/lopetusnappien tila historian perusteella
    // Etsitään viimeisin relevantti tapahtuma ("Peli alkoi" tai "Peli päättyi")
    const lastGameEvent = historyEntries.find(entry => entry.includes('Peli alkoi') || entry.includes('Peli päättyi'));

    if (lastGameEvent && lastGameEvent.includes('Peli alkoi')) {
        // Viimeisin tapahtuma oli pelin aloitus -> peli on käynnissä
        startGameBtn.disabled = true;
        endGameBtn.disabled = false;
    } else {
        // Joko historia on tyhjä, ei pelitapahtumia, tai viimeisin oli "Peli päättyi"
        startGameBtn.disabled = false;
        endGameBtn.disabled = true;
    }
     // Varmistus: Jos historia on tyhjä, napit ovat oletustilassa
     if (historyEntries.length === 0) {
        startGameBtn.disabled = false;
        endGameBtn.disabled = true;
     }

    console.log("Sovellus alustettu.");
}

// Käynnistetään sovellus kun sivu on latautunut
initializeApp();
