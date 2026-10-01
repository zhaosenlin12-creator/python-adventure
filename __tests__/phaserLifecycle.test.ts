import { destroyPhaserGameSafely } from '@/lib/game/phaserLifecycle';

type TestChild = { parentNode: unknown };
type TestContainer = {
  childNodes: TestChild[];
  removeChild: (child: TestChild) => TestChild;
};

function createContainer() {
  const parent = {} as TestContainer;
  parent.childNodes = [];
  parent.removeChild = (child: TestChild) => {
      if (child.parentNode !== parent) {
        throw new Error('stale child');
      }

      child.parentNode = null;
      parent.childNodes = parent.childNodes.filter((candidate) => candidate !== child);
      return child;
  };

  return parent;
}

describe('destroyPhaserGameSafely', () => {
  it('destroys without asking Phaser to remove the React-owned canvas', () => {
    const parent = createContainer();
    const activeChild = { parentNode: parent };
    const staleChild = { parentNode: null };
    parent.childNodes.push(activeChild, staleChild);
    const game = { destroy: jest.fn() };

    expect(() => destroyPhaserGameSafely(game, parent as unknown as HTMLElement)).not.toThrow();

    expect(game.destroy).toHaveBeenCalledWith(false);
    expect(parent.childNodes).toEqual([staleChild]);
  });

  it('is safe when called repeatedly or when Phaser destroy throws', () => {
    const parent = createContainer();
    const child = { parentNode: parent };
    parent.childNodes.push(child);
    const game = {
      destroy: jest.fn(() => {
        throw new Error('already destroyed');
      }),
    };
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => destroyPhaserGameSafely(game, parent as unknown as HTMLElement)).not.toThrow();
    expect(() => destroyPhaserGameSafely(game, parent as unknown as HTMLElement)).not.toThrow();
    expect(parent.childNodes).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
