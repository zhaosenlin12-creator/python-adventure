"use client";

import { useEffect } from 'react';
import { useAudioStore } from '@/store/audioStore';

export function useSound() {
    const { play, stop, toggleMute, isMuted, isReady, init } = useAudioStore();

    useEffect(() => {
        init();
    }, []);

    return { play, stop, toggleMute, isMuted, isReady };
}
