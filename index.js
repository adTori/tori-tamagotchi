// ===== KONFIGURATION ===========

const MAX_PETS = 4;
const TIMER_INTERVAL = 10000;
const STAT_DECAY = 10;

const DEFAULT_STATS = {
    energy: 50,
    fullness: 50,
    happiness: 50
};

const PET_TYPES = ['parrot', 'owl', 'crow', 'bird'];

const FALLBACK_NAMES = [
    'Bella','Max','Luna','Charlie','Lucy','Cooper','Daisy',
    'Milo','Nala','Oliver','Buddy','Bailey','Sadie','Rocky',
    'Molly','Tucker','Lola','Bear','Sophie','Duke'
];


// ===== TAMAGOTCHI KLASS ========

class Tamagotchi {

    constructor(name, animalType, id) {
        this.id = id;
        this.name = name;
        this.animalType = animalType;

        this.energy = DEFAULT_STATS.energy;
        this.fullness = DEFAULT_STATS.fullness;
        this.happiness = DEFAULT_STATS.happiness;

        this.timer = null;
        this.startTimer();
    }

    clamp(value) {
        return Math.max(0, Math.min(100, value));
    }

    updateStats(changes) {
        Object.keys(changes).forEach(stat => {
            this[stat] = this.clamp(this[stat] + changes[stat]);
        });
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.updateStats({
                energy: -STAT_DECAY,
                fullness: -STAT_DECAY,
                happiness: -STAT_DECAY
            });

            updatePetUI(this.id);
            checkIfPetRunsAway(this.id);

        }, TIMER_INTERVAL);
    }

    stopTimer() {
        if (this.timer) clearInterval(this.timer);
    }

    nap() {
        this.updateStats({
            energy: +40,
            happiness: -10,
            fullness: -10
        });
        addToHistory(`You took a nap with ${this.name}!`);
    }

    play() {
        this.updateStats({
            happiness: +30,
            fullness: -10,
            energy: -10
        });
        addToHistory(`You played with ${this.name}!`);
    }

    eat() {
        this.updateStats({
            fullness: +30,
            happiness: +5,
            energy: -15
        });
        addToHistory(`You fed ${this.name}!`);
    }

    getImage() {
        const images = { parrot: '🦜', owl: '🦉', crow: '🐦‍⬛', bird: '🐦' };
        return images[this.animalType] || '🐾';
    }
}


// ===== GLOBAL STATE ============

let pets = [];
let nextPetId = 0;

// ===== API & HJÄLPFUNKTIONER ===

async function getRandomName() {
    try {
        const response = await axios.get('https://randomuser.me/api/0.8', {
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 200 && response.data.results) {
            const user = response.data.results[0].user;
            let firstName = user.name.first;
            return firstName.charAt(0).toUpperCase() + firstName.slice(1);
        }

    } catch (error) {
        console.log('API inte tillgängligt, använder fallback-namn.');
    }

    return FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)];
}

function getRandomAnimalType() {
    return PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
}


// ===== SKAPA DJUR ==============

async function createNewPet() {

    if (pets.length >= MAX_PETS) return;

    let name = document.getElementById('petName').value.trim();
    let animalType = document.getElementById('animalType').value;

    if (!name) name = await getRandomName();
    if (!animalType) animalType = getRandomAnimalType();

    const pet = new Tamagotchi(name, animalType, nextPetId++);
    pets.push(pet);

    addToHistory(`${pet.name} the ${pet.animalType} joined you! 💚`);

    document.getElementById('petName').value = '';
    document.getElementById('animalType').value = '';

    renderPets();
    updatePetCount();
}

// ===== RENDERING ===============

function renderPets() {
    const grid = document.getElementById('petsGrid');
    grid.innerHTML = '';

    pets.forEach(pet => {
        const card = document.createElement('div');
        card.className = 'pet-card';
        card.id = `pet-${pet.id}`;

        card.innerHTML = `
            <div class="pet-display">
                <div class="pet-name">${pet.name}</div>
                <div class="pet-image">${pet.getImage()}</div>
                <div class="pet-type">${capitalize(pet.animalType)}</div>
            </div>
            <div class="stats">
                ${createStatHTML('energy', '⚡ Energy', pet)}
                ${createStatHTML('fullness', '🍽️ Fullness', pet)}
                ${createStatHTML('happiness', '😊 Happiness', pet)}
            </div>
            <div class="actions">
                <button onclick="performActivity(${pet.id}, 'nap')">💤 <br> Nap</button>
                <button onclick="performActivity(${pet.id}, 'eat')">🌽 <br> Eat</button>
                <button onclick="performActivity(${pet.id}, 'play')">♕ <br> Play</button>
            </div>
        `;

        grid.appendChild(card);
    });
}

function createStatHTML(stat, label, pet) {
    return `
        <div class="stat">
            <div class="stat-label">
                <span>${label}</span>
                <span id="${stat}-${pet.id}">${pet[stat]}</span>
            </div>
            <div class="stat-bar">
                <div class="stat-fill ${stat}" 
                     id="${stat}-bar-${pet.id}" 
                     style="width: ${pet[stat]}%">
                </div>
            </div>
        </div>
    `;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

// ===== AKTIVITETER =============

function performActivity(petId, activity) {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    pet[activity]();
    updatePetUI(petId);
    checkIfPetRunsAway(petId);
}

// ===== UI-UPPDATERING =========

function updatePetUI(petId) {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    ['energy', 'fullness', 'happiness'].forEach(stat => {
        document.getElementById(`${stat}-${petId}`).textContent = pet[stat];
        document.getElementById(`${stat}-bar-${petId}`).style.width = pet[stat] + '%';
    });
}

// ===== TA BORT DJUR ============

function checkIfPetRunsAway(petId) {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    if (pet.energy === 0 || pet.fullness === 0 || pet.happiness === 0) {
        removePet(petId);
    }
}

function removePet(petId) {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;

    pet.stopTimer();

    addToHistory(`${pet.name} flew away due to neglect... 💔`, true);

    pets = pets.filter(p => p.id !== petId);

    const card = document.getElementById(`pet-${petId}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        card.style.transition = 'all 0.5s ease';

        setTimeout(() => {
            card.remove();
            updatePetCount();
        }, 500);
    }
}

// ===== HISTORIK ================

function addToHistory(message, isFlewAway = false) {
    const historyLog = document.getElementById('historyLog');
    const noHistory = historyLog.querySelector('.no-history');
    if (noHistory) noHistory.remove();

    const item = document.createElement('div');
    item.className = 'history-item' + (isFlewAway ? ' flew-away' : '');

    const timestamp = new Date().toLocaleTimeString('sv-SE');
    item.textContent = `[${timestamp}] ${message}`;

    historyLog.insertBefore(item, historyLog.firstChild);
}

// ===== DJURRÄKNARE =============

function updatePetCount() {
    document.getElementById('petCount').textContent = pets.length;

    const createBtn = document.getElementById('createBtn');

    if (pets.length >= MAX_PETS) {
        createBtn.disabled = true;
        createBtn.textContent = `Max Amount Reached (${MAX_PETS}/${MAX_PETS})`;
    } else {
        createBtn.disabled = false;
        createBtn.textContent = 'Adopt ✨';
    }
}


updatePetCount();