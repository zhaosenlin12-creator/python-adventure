"use client";

import { useEffect } from "react";
import { loader } from "@monaco-editor/react";

/**
 * Preload Monaco editor to improve loading speed
 * This component should be included in the app layout
 */
export default function MonacoPreloader() {
    useEffect(() => {
        // Preload Monaco in the background
        loader.init().then(() => {
            console.log('[MonacoPreloader] Monaco editor preloaded successfully');
        }).catch((error) => {
            console.warn('[MonacoPreloader] Failed to preload Monaco:', error);
        });
    }, []);

    return null; // This component doesn't render anything
}
