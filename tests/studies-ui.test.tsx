import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React from 'react';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLDialogElement',
  'localStorage',
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const { render, screen, fireEvent, waitFor, cleanup, act } = await import('@testing-library/react');
const { default: App } = await import('../src/App');
const { default: ChatComposer } = await import('../src/components/ChatComposer');
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const saved = (input: any) => ({
  ...input,
  category: 'Personal',
  sources: 0,
  date: '2026-09-25',
  updatedAt: '2026-09-25T12:00:00Z',
});
const originalFetch = globalThis.fetch;

// Each scenario mounts a new app and controls only its HTTP boundary.
test('Study online UI', async (t) => {
  try {
    await t.test(
      'loading disables creation and removes legacy cache without importing it',
      async () => {
        let resolve!: (value: Response) => void;
        const requests: string[] = [];
        globalThis.fetch = async (url) => {
          requests.push(String(url));
          return new Promise((done) => {
            resolve = done;
          });
        };
        localStorage.setItem(
          'athena-studies',
          JSON.stringify([{ id: 'old', title: 'Example', notes: 'Old' }]),
        );
        render(<App />);
        assert.equal(
          (screen.getByRole('button', { name: 'New study' }) as HTMLButtonElement).disabled,
          true,
        );
        assert.ok(screen.getByText('Loading studies...'));
        assert.equal(localStorage.getItem('athena-studies'), null);
        await act(async () => resolve(json([])));
        assert.ok(
          await screen.findByText('No studies yet. Create your first study to get started.'),
        );
        assert.deepEqual(requests, ['/api/studies']);
        cleanup();
      },
    );
    await t.test('load failure blocks creation and offers recovery', async () => {
      globalThis.fetch = async () => {
        throw new TypeError('offline');
      };
      render(<App />);
      await screen.findByRole('alert');
      assert.equal(
        (screen.getByRole('button', { name: 'New study' }) as HTMLButtonElement).disabled,
        true,
      );
      globalThis.fetch = async () => json([]);
      fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
      await screen.findByText('No studies yet. Create your first study to get started.');
      assert.equal(
        (screen.getByRole('button', { name: 'New study' }) as HTMLButtonElement).disabled,
        false,
      );
      cleanup();
    });
    await t.test(
      'creation awaits confirmation, prevents duplicate submits, and removes notes',
      async () => {
        let resolve!: (value: Response) => void;
        let payload: any;
        let posts = 0;
        globalThis.fetch = async (_url, init) => {
          if (init?.method !== 'POST') return json([]);
          posts++;
          payload = JSON.parse(String(init.body));
          return new Promise((done) => {
            resolve = done;
          });
        };
        render(<App />);
        await screen.findByText('No studies yet. Create your first study to get started.');
        fireEvent.click(screen.getByRole('button', { name: 'New study' }));
        fireEvent.change(screen.getByLabelText('Study name'), { target: { value: 'Biology' } });
        const submit = screen.getByRole('button', { name: 'Create study' });
        fireEvent.click(submit);
        fireEvent.click(submit);
        assert.equal(posts, 1);
        assert.equal(
          (screen.getByRole('button', { name: 'Close dialog' }) as HTMLButtonElement).disabled,
          true,
        );
        assert.equal(screen.queryByRole('heading', { name: 'Biology' }), null);
        await act(async () => resolve(json(saved(payload), 201)));
        await screen.findByRole('heading', { name: 'Biology' });
        assert.equal(document.querySelector('dialog')?.open, false);
        fireEvent.click(screen.getByRole('button', { name: /Personal Biology/ }));
        assert.equal(screen.queryByLabelText('Your notes'), null);
        assert.equal(document.querySelector('dialog textarea'), null);
        cleanup();
      },
    );
    await t.test(
      'uncertain failure retains exact request and retry does not duplicate a confirmed record',
      async () => {
        const payloads: any[] = [];
        globalThis.fetch = async (_url, init) => {
          if (init?.method !== 'POST') return json(payloads.length ? [saved(payloads[0])] : []);
          payloads.push(JSON.parse(String(init.body)));
          if (payloads.length === 1) throw new TypeError('response lost');
          return json(saved(payloads[0]), 201);
        };
        render(<App />);
        await screen.findByText('No studies yet. Create your first study to get started.');
        fireEvent.click(screen.getByRole('button', { name: 'New study' }));
        fireEvent.change(screen.getByLabelText('Study name'), { target: { value: 'Retry study' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create study' }));
        await screen.findByText(
          'The save could not be confirmed. Reconnect, then retry this study.',
        );
        assert.equal(
          (screen.getByLabelText('Study name') as HTMLInputElement).value,
          'Retry study',
        );
        assert.equal(
          (screen.getByRole('button', { name: 'Retry create' }) as HTMLButtonElement).disabled,
          true,
        );
        fireEvent.click(screen.getAllByRole('button', { name: 'Retry connection' }).at(-1)!);
        await waitFor(() =>
          assert.equal(
            (screen.getByRole('button', { name: 'Retry create' }) as HTMLButtonElement).disabled,
            false,
          ),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Retry create' }));
        await waitFor(() => assert.equal(document.querySelector('dialog')?.open, false));
        assert.deepEqual(payloads[1], payloads[0]);
        assert.equal(screen.getAllByRole('heading', { name: 'Retry study' }).length, 1);
        cleanup();
      },
    );
    await t.test('offline event disables mutations and reconnect reloads', async () => {
      globalThis.fetch = async () => json([]);
      render(<App />);
      await screen.findByText('No studies yet. Create your first study to get started.');
      act(() => window.dispatchEvent(new dom.window.Event('offline')));
      assert.equal(
        (screen.getByRole('button', { name: 'New study' }) as HTMLButtonElement).disabled,
        true,
      );
      await act(async () => {
        window.dispatchEvent(new dom.window.Event('online'));
      });
      await waitFor(() =>
        assert.equal(
          (screen.getByRole('button', { name: 'New study' }) as HTMLButtonElement).disabled,
          false,
        ),
      );
      cleanup();
    });
    await t.test(
      'chat hides navigation and study details, and back restores the library',
      async () => {
        globalThis.fetch = async () =>
          json([
            saved({
              id: 'focus',
              title: 'Focused study',
              description: 'Library description',
              color: 'blue',
            }),
          ]);
        render(<App />);
        await screen.findByRole('heading', { name: 'Focused study' });
        fireEvent.click(screen.getByRole('button', { name: /Personal Focused study/ }));
        assert.equal(screen.queryByRole('navigation', { name: 'Main sections' }), null);
        assert.equal(screen.queryByText('Library description'), null);
        assert.equal(screen.queryByText(/PERSONAL.*STUDY SPACE/i), null);
        assert.ok(screen.getByRole('heading', { name: 'Focused study' }));
        assert.ok(screen.getByRole('textbox', { name: 'Message this study' }));
        fireEvent.click(screen.getByRole('button', { name: 'All studies' }));
        assert.ok(screen.getByRole('navigation', { name: 'Main sections' }));
        assert.ok(screen.getByRole('heading', { name: 'Your studies' }));
        cleanup();
      },
    );
    await t.test('composer sends with Enter, preserves multiline and IME input, and resets', () => {
      const sent: string[] = [];
      const onSend = (text: string) => {
        sent.push(text);
      };
      const view = render(<ChatComposer onSend={onSend} isThinking={false} />);
      const input = screen.getByRole('textbox', {
        name: 'Message this study',
      }) as HTMLTextAreaElement;
      assert.equal(
        (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
        true,
      );
      fireEvent.change(input, { target: { value: '  First line\nSecond line  ' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
      fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
      assert.deepEqual(sent, []);
      fireEvent.keyDown(input, { key: 'Enter' });
      assert.deepEqual(sent, ['First line\nSecond line']);
      assert.equal(input.value, '');
      assert.equal(document.activeElement, input);
      view.rerender(<ChatComposer onSend={onSend} isThinking={true} />);
      fireEvent.change(input, { target: { value: 'Next question' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      assert.equal(sent.length, 1);
      assert.equal(input.value, 'Next question');
      cleanup();
    });
    await t.test('touch keyboards keep Enter for newlines and send using the button', () => {
      const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) => ({ matches: query === '(pointer: coarse)' }),
      });
      try {
        const sent: string[] = [];
        render(
          <ChatComposer
            onSend={(text) => {
              sent.push(text);
            }}
            isThinking={false}
          />,
        );
        const input = screen.getByRole('textbox', { name: 'Message this study' });
        fireEvent.change(input, { target: { value: 'Mobile question' } });
        const defaultAllowed = fireEvent.keyDown(input, { key: 'Enter' });
        assert.equal(defaultAllowed, true);
        assert.deepEqual(sent, []);
        fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
        assert.deepEqual(sent, ['Mobile question']);
      } finally {
        cleanup();
        if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
        else Reflect.deleteProperty(window, 'matchMedia');
      }
    });
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    dom.window.close();
  }
});
