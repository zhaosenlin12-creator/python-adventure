import type * as Phaser from 'phaser';

type PhaserGameHandle = Pick<Phaser.Game, 'destroy'>;

function clearPhaserContainer(parent: HTMLElement | null | undefined): void {
  if (!parent) {
    return;
  }

  for (const child of Array.from(parent.childNodes)) {
    if (child.parentNode !== parent) {
      continue;
    }

    try {
      parent.removeChild(child);
    } catch (error) {
      if (
        typeof DOMException !== 'undefined' &&
        error instanceof DOMException &&
        error.name === 'NotFoundError'
      ) {
        continue;
      }

      console.warn('[PhaserLifecycle] Failed to clear Phaser container child:', error);
    }
  }
}

export function destroyPhaserGameSafely(
  game: PhaserGameHandle | null | undefined,
  parent?: HTMLElement | null,
): void {
  try {
    game?.destroy(false);
  } catch (error) {
    console.warn('[PhaserLifecycle] Phaser game destroy failed:', error);
  } finally {
    clearPhaserContainer(parent);
  }
}

export function schedulePhaserDestroy(
  game: PhaserGameHandle,
  onDestroyed: () => void,
  parent?: HTMLElement | null,
): number {
  return window.setTimeout(() => {
    try {
      destroyPhaserGameSafely(game, parent);
    } finally {
      onDestroyed();
    }
  }, 0);
}
