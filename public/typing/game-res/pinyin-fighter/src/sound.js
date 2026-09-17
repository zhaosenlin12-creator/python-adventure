const SOUND_EXTENSIONS = ['mp3', 'ogg', 'wav', 'm4a'];

const SOUND_DEFINITIONS = {
    bgm: {sources: ['../virus-battle/assets/bgm.ogg'], volume: 0.28, loop: true},
    fire: {sources: ['../defend-earth/shoot.mp3'], volume: 0.65},
    hit: {sources: ['../defend-earth/hit.mp3'], volume: 0.6},
    explosion: {sources: ['../virus-battle/assets/explosion.flac'], volume: 0.75},
    error: {sources: ['../whac-a-mole/assets/miss.mp3'], volume: 0.7},
    shield: {sources: ['../whac-a-mole/assets/hit.mp3'], volume: 0.65},
    pause: {sources: [], volume: 0.8},
    resume: {sources: [], volume: 0.8},
    restart: {sources: [], volume: 0.85},
    gameover: {sources: ['../car-racing/sounds/lost.wav'], volume: 0.8},
};

const SoundSlots = {};
let isAudioUnlocked = false;
let hasInit = false;

function generateSources (names) {
    const sources = [];
    names.forEach(function (name) {
        SOUND_EXTENSIONS.forEach(function (ext) {
            sources.push('./sounds/' + name + '.' + ext);
        });
    });
    return sources;
}

function buildSoundSlot (definition) {
    return {
        sources: definition.sources || generateSources(definition.names || []),
        sourceIndex: 0,
        audio: null,
        volume: definition.volume ?? 1,
        loop: definition.loop ?? false,
    };
}

function stepToNextSource (slot) {
    slot.sourceIndex++;
    slot.audio = null;
}

function createAudio (name, slot) {
    if (slot.sourceIndex >= slot.sources.length) {
        return null;
    }
    const audio = new Audio(slot.sources[slot.sourceIndex]);
    audio.preload = 'auto';
    audio.loop = slot.loop;
    audio.volume = slot.volume;
    audio.addEventListener('error', function () {
        stepToNextSource(slot);
        playSound(name, false);
    });
    slot.audio = audio;
    return audio;
}

function getAudio (name) {
    const slot = SoundSlots[name];
    if (!slot) {
        return null;
    }
    if (slot.audio == null) {
        return createAudio(name, slot);
    }
    return slot.audio;
}

function unlockAudio () {
    if (isAudioUnlocked) {
        return;
    }
    isAudioUnlocked = true;
    playSound('bgm', false);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
}

export function initSounds () {
    if (hasInit) {
        return;
    }
    hasInit = true;
    Object.keys(SOUND_DEFINITIONS).forEach(function (name) {
        SoundSlots[name] = buildSoundSlot(SOUND_DEFINITIONS[name]);
    });
    window.addEventListener('keydown', unlockAudio, {once: true});
    window.addEventListener('pointerdown', unlockAudio, {once: true});
    window.addEventListener('touchstart', unlockAudio, {once: true});
}

export function playSound (name, restart = true) {
    if (!hasInit) {
        return;
    }
    const audio = getAudio(name);
    if (audio == null) {
        return;
    }
    if (restart) {
        audio.currentTime = 0;
    }
    const result = audio.play();
    if (result && result.catch) {
        result.catch(function () {});
    }
}

export function pauseSound (name) {
    const audio = getAudio(name);
    if (audio != null) {
        audio.pause();
    }
}
