import { expect, test, type TestBody } from 'claude-code/testing'

const ANSWER = 'Wir legen dafür eine Migration an und prüfen die RLS-Regeln, bevor der Deploy läuft.'
const TURN = { answer: ANSWER, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' } as const

/** Stands in for the engine under the plugin; records what the plugin asked for. */
function engine(on: Parameters<TestBody>[1]) {
  const seen = { system: '', writes: [] as { path: string; text: string }[] }
  on('turn.complete', () => ({ text: '' }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: Date.parse('2026-10-30T12:00:00Z') }))
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? '/Users/oli' : '/Users/oli/Documents/kochbuch' }))
  on('fs.exists', () => ({ value: false }))
  on('fs.write', (_, e) => {
    seen.writes.push({ path: e.path, text: e.text })
    return { value: undefined }
  })
  on('model.complete', (_, e) => {
    seen.system = e.system ?? ''
    return {
      value: {
        isAnswered: true,
        text: '[{"begriff": "Migration", "erklaerung": "Eine Änderung am Aufbau der Datenbank."}]',
        usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    }
  })
  return seen
}

test('the profile setting reaches the term finder', { options: { profil: 'Koch, liebt Rezepte, programmiert nicht' } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(TURN)
  expect(seen.system).toContain('Koch, liebt Rezepte, programmiert nicht')
})

test('by default new terms go to ~/.claude/glossar.md', async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(TURN)
  expect(seen.writes.map(w => w.path)).toEqual(['/Users/oli/.claude/glossar.md'])
  expect(seen.writes[0]?.text).toContain('- **Migration** — Eine Änderung am Aufbau der Datenbank. · kochbuch · 2026-10-30')
})

test('an empty file setting writes no file', { options: { datei: '' } }, async ($, on) => {
  const seen = engine(on)
  await $.turn.complete(TURN)
  expect(seen.writes).toEqual([])
})
