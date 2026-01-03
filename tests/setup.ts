/**
 * Vitestテストセットアップファイル
 * 全テストの前に実行される共通設定
 */

import { vi } from 'vitest';

// Phaserのグローバルモック
global.Phaser = {
    Events: {
        EventEmitter: class MockEventEmitter {
            private listeners: Map<string, Function[]> = new Map();

            on(event: string, fn: Function) {
                if (!this.listeners.has(event)) {
                    this.listeners.set(event, []);
                }
                this.listeners.get(event)!.push(fn);
                return this;
            }

            emit(event: string, ...args: any[]) {
                const listeners = this.listeners.get(event);
                if (listeners) {
                    listeners.forEach(fn => fn(...args));
                }
                return this;
            }

            removeAllListeners() {
                this.listeners.clear();
                return this;
            }

            off(event: string, fn?: Function) {
                if (!fn) {
                    this.listeners.delete(event);
                } else {
                    const listeners = this.listeners.get(event);
                    if (listeners) {
                        const index = listeners.indexOf(fn);
                        if (index > -1) {
                            listeners.splice(index, 1);
                        }
                    }
                }
                return this;
            }
        }
    },
    Scene: class MockScene {
        add = { text: vi.fn(), image: vi.fn(), container: vi.fn(), group: vi.fn() };
        load = { json: vi.fn(), image: vi.fn() };
        input = { on: vi.fn() };
        events = { on: vi.fn(), emit: vi.fn() };
        cameras = { main: { scrollX: 0, scrollY: 0 } };
    }
} as any;
