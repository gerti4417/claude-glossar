// A term the session has met: what it is called, its explanation in two sentences,
// a slug that names its hover group (chips under the chat and the pane row share it),
// and where it first appeared: the transcript id of that response block and the
// start of its text, so the chip is drawn under that block alone.
export type Term = { term: string; explanation: string; slug: string; firstIn: string; firstText: string }

// A response block of the main conversation, as it was appended: its id and its text.
export type Block = { id: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    glossar: {
      terms: Shaped<Term[]>
      blocks: Shaped<Block[]>
      selected: string | null
      isBusy: boolean
    }
  }
}
