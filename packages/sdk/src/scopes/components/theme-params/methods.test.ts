import { beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { emitEvent } from '@telegram-apps/bridge';

import { mockPostEvent } from '@test-utils/mockPostEvent.js';
import { resetPackageState } from '@test-utils/resetPackageState.js';
import { setMaxVersion } from '@test-utils/setMaxVersion.js';
import { mockMiniAppsEnv } from '@test-utils/mockMiniAppsEnv.js';

import { bindCssVars, mount } from './methods.js';
import { _isMounted, _state } from './signals.js';
import { testSafety } from '@test-utils/predefined/testSafety.js';

beforeEach(() => {
  resetPackageState();
  vi.restoreAllMocks();
  mockPostEvent();
});

describe.each([
  ['bindCssVars', bindCssVars, _isMounted],
  ['mount', mount, undefined],
] as const)('%s', (name, fn, isMounted) => {
  testSafety(fn, name, {
    component: 'themeParams',
    isMounted,
  });
});

describe('bindCssVars', () => {
  type SetPropertyFn = typeof document.documentElement.style.setProperty;
  let setSpy: MockInstance<SetPropertyFn>;

  beforeEach(() => {
    setMaxVersion();
    mockMiniAppsEnv();
    mount();
    setSpy = vi
      .spyOn(document.documentElement.style, 'setProperty')
      .mockImplementation(() => null);
  });

  it('should set --tg-theme-{key} CSS vars, where key is kebab-cased theme keys', () => {
    _state.set({
      bg_color: '#abcdef',
      accent_text_color: '#000011',
    });
    bindCssVars();
    expect(setSpy).toHaveBeenCalledTimes(2);
    expect(setSpy).toHaveBeenCalledWith('--tg-theme-bg-color', '#abcdef');
    expect(setSpy).toHaveBeenCalledWith('--tg-theme-accent-text-color', '#000011');
  });

  it('should update --tg-theme-{key} variables to the values, received in theme_changed event', () => {
    _state.set({
      bg_color: '#abcdef',
      accent_text_color: '#000011',
    });
    bindCssVars();

    setSpy.mockClear();
    emitEvent('theme_changed', {
      theme_params: {
        bg_color: '#111111',
        accent_text_color: '#222222',
        text_color: '#333333',
      },
    });

    expect(setSpy).toHaveBeenCalledTimes(3);
    expect(setSpy).toHaveBeenCalledWith('--tg-theme-bg-color', '#111111');
    expect(setSpy).toHaveBeenCalledWith('--tg-theme-accent-text-color', '#222222');
    expect(setSpy).toHaveBeenCalledWith('--tg-theme-text-color', '#333333');
  });

  it('should set CSS variable using custom function', () => {
    _state.set({
      bg_color: '#abcdef',
      accent_text_color: '#000011',
    });
    bindCssVars((property) => `--my-${property}`);

    expect(setSpy).toHaveBeenCalledTimes(2);
    expect(setSpy).toHaveBeenCalledWith('--my-bg_color', '#abcdef');
    expect(setSpy).toHaveBeenCalledWith('--my-accent_text_color', '#000011');
  });

  it('should stop updating variables, if returned function was called', () => {
    _state.set({
      bg_color: '#abcdef',
      accent_text_color: '#000011',
    });
    const cleanup = bindCssVars();

    setSpy.mockClear();
    emitEvent('theme_changed', {
      theme_params: {
        bg_color: '#111111',
        accent_text_color: '#222222',
        text_color: '#333333',
      },
    });

    expect(setSpy).toHaveBeenCalledTimes(3);

    cleanup();
    emitEvent('theme_changed', {
      theme_params: {
        bg_color: '#222222',
      },
    });
    expect(setSpy).toHaveBeenCalledTimes(3);
  });
});