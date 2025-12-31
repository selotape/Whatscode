import { describe, it, expect } from 'vitest';
import { expandHome } from '../src/config.js';
import { homedir } from 'os';

describe('config', () => {
  describe('expandHome', () => {
    it('expands ~ to home directory', () => {
      const result = expandHome('~/test');
      expect(result).toBe(`${homedir()}/test`);
    });

    it('leaves absolute paths unchanged', () => {
      const path = '/absolute/path';
      expect(expandHome(path)).toBe(path);
    });

    it('leaves relative paths unchanged', () => {
      const path = 'relative/path';
      expect(expandHome(path)).toBe(path);
    });

    it('handles ~ at start only', () => {
      const path = 'some~path';
      expect(expandHome(path)).toBe(path);
    });
  });
});
