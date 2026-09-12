import fs from 'node:fs';
import path from 'node:path';

describe('auth modal hydration stability', () => {
  test('does not use render-time randomness for platform animation', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'components', 'auth', 'AuthModal.tsx'),
      'utf8',
    );

    expect(source).not.toContain('Math.random()');
  });
});
