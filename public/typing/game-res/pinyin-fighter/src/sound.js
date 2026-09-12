const SOUND_EXTENSIONS = ['mp3', 'ogg', 'wav', 'm4a'];

const SOUND_DEFINITIONS = {
    bgm: {names: ['fighter_bgm', 'bgm', 'music', 'background'], volume: 0.35, loop: true},
    fire: {names: ['fire', 'shoot', 'shot', 'attack'], volume: 0.8},
    hit: {names: ['hit', 'hurt', 'impact'], volume: 0.75},
    explosion: {names: ['explosion', 'boom', 'destroy', 'die'], volume: 0.85},
    error: {names: ['error', 'wrong', 'miss'], volume: 0.8},
    shield: {names: ['shield', 'protect', 'clear'], volume: 0.85},
    pause: {names: ['pause'], volume: 0.8},
    resume: {names: ['resume', 'start'], volume: 0.8},
    restart: {names: ['restart', 'reset'], volume: 0.85},
    gameover: {names: ['gameover', 'lost', 'fail'], volume: 0.9},
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
        sources: generateSources(definition.names),
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
