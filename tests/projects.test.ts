import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { sanitizeProjectName } from '../src/projects.js';

describe('projects', () => {
  describe('sanitizeProjectName', () => {
    it('removes Claude: prefix', () => {
      expect(sanitizeProjectName('Claude: my-app')).toBe('my-app');
    });

    it('trims whitespace', () => {
      expect(sanitizeProjectName('Claude:   spaced  ')).toBe('spaced');
    });

    it('replaces spaces with dashes', () => {
      expect(sanitizeProjectName('Claude: my cool app')).toBe('my-cool-app');
    });

    it('removes special characters', () => {
      expect(sanitizeProjectName('Claude: My App!')).toBe('My-App');
    });

    it('preserves dashes and underscores', () => {
      expect(sanitizeProjectName('Claude: my-app_v2')).toBe('my-app_v2');
    });

    it('collapses multiple dashes', () => {
      expect(sanitizeProjectName('Claude: my--app')).toBe('my-app');
    });

    it('removes leading and trailing dashes', () => {
      expect(sanitizeProjectName('Claude: -app-')).toBe('app');
    });

    it('handles empty prefix', () => {
      expect(sanitizeProjectName('Claude:')).toBe('');
    });
  });
});
