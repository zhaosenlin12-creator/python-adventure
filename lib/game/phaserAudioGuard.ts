"use client";

type AudioContextCtor = typeof AudioContext;
type WindowWithWebAudio = Window &
    typeof globalThis & {
        webkitAudioContext?: AudioContextCtor;
        __phaserAudioGuardInstalled?: boolean;
    };

function guardAudioContextCtor(Ctor: AudioContextCtor | undefined) {
    if (!Ctor?.prototype) {
        return;
    }

    const proto = Ctor.prototype as AudioContext & {
        __phaserClosedStateGuarded?: boolean;
    };

    if (proto.__phaserClosedStateGuarded) {
        return;
    }

    const originalSuspend = proto.suspend;
    const originalResume = proto.resume;

    proto.suspend = function suspendWithClosedGuard(this: AudioContext) {
        if (this.state === "closed") {
            return Promise.resolve();
        }
        return originalSuspend.call(this);
    };

    proto.resume = function resumeWithClosedGuard(this: AudioContext) {
        if (this.state === "closed") {
            return Promise.resolve();
        }
        return originalResume.call(this);
    };

    proto.__phaserClosedStateGuarded = true;
}

export function installPhaserAudioGuard() {
    if (typeof window === "undefined") {
        return;
    }

    const win = window as WindowWithWebAudio;
    if (win.__phaserAudioGuardInstalled) {
        return;
    }

    guardAudioContextCtor(win.AudioContext);
    guardAudioContextCtor(win.webkitAudioContext);
    win.__phaserAudioGuardInstalled = true;
}
