import { expect, test } from 'claude-code/testing'
import { DEFAULT_PROFILE, glossaryPath, systemPrompt } from './prompt'

test('without a profile the prompt describes a neutral reader', async () => {
  const text = systemPrompt({ profile: '', language: 'Deutsch' })
  expect(text).toContain(DEFAULT_PROFILE)
  expect(text).not.toContain('n8n')
  expect(text).not.toContain('Gerrit')
})

test('a profile from the settings replaces the default', async () => {
  const text = systemPrompt({ profile: 'Projektleiterin im Marketing, kennt Excel gut', language: 'Deutsch' })
  expect(text).toContain('Projektleiterin im Marketing, kennt Excel gut')
  expect(text).not.toContain(DEFAULT_PROFILE)
})

test('the language setting decides the language of the explanations', async () => {
  expect(systemPrompt({ profile: '', language: 'Deutsch' })).toContain('auf Deutsch, Du-Form')
  expect(systemPrompt({ profile: '', language: 'English' })).toContain('in English')
})

test('the glossary file sits in the home folder unless switched off', async () => {
  expect(glossaryPath('/Users/oli', '.claude/glossar.md')).toBe('/Users/oli/.claude/glossar.md')
  expect(glossaryPath('/Users/oli', '~/Notizen/begriffe.md')).toBe('/Users/oli/Notizen/begriffe.md')
  expect(glossaryPath('/Users/oli', '/tmp/g.md')).toBe('/tmp/g.md')
  expect(glossaryPath('/Users/oli', '')).toBeNull()
  expect(glossaryPath('', '.claude/glossar.md')).toBeNull()
})

test('a bare ~ is no file, Windows paths count as absolute', async () => {
  expect(glossaryPath('/Users/oli', '~')).toBeNull()
  expect(glossaryPath('/Users/oli', '~/')).toBeNull()
  expect(glossaryPath('', 'C:\\Users\\oli\\glossar.md')).toBe('C:\\Users\\oli\\glossar.md')
})
