export const MITHAI_IDS = [
  'dry-fruit-box',
  'gulab-jamun',
  'jalebi',
  'kaju-katli',
  'motichoor-laddoo',
  'pista-barfi',
  'rasmalai',
  'soan-papdi',
] as const;

export type MithaiId = (typeof MITHAI_IDS)[number];

export const MITHAI_LABELS: Record<MithaiId, string> = {
  'dry-fruit-box': 'Dry Fruit Box',
  'gulab-jamun': 'Gulab Jamun',
  jalebi: 'Jalebi',
  'kaju-katli': 'Kaju Katli',
  'motichoor-laddoo': 'Motichoor Laddoo',
  'pista-barfi': 'Pista Barfi',
  rasmalai: 'Rasmalai',
  'soan-papdi': 'Soan Papdi',
};

export interface MatchCard {
  id: number;
  mithai: MithaiId;
  state: 'down' | 'up' | 'matched';
}

export interface MatchState {
  cards: MatchCard[];
  moves: number;
  locked: boolean;
}

export type MatchAction = { type: 'flip'; id: number } | { type: 'resolve' };

export const MISMATCH_DELAY_MS = 800;

export function createDeck(random: () => number = Math.random): MatchState {
  const deck = [...MITHAI_IDS, ...MITHAI_IDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { cards: deck.map((mithai, id) => ({ id, mithai, state: 'down' })), moves: 0, locked: false };
}

/** Ignored actions return the same state object, so callers can detect a no-op by identity. */
export function matchReducer(s: MatchState, a: MatchAction): MatchState {
  if (a.type === 'resolve') {
    if (!s.locked) return s;
    return { ...s, locked: false, cards: s.cards.map((c) => (c.state === 'up' ? { ...c, state: 'down' } : c)) };
  }

  const target = s.cards.find((c) => c.id === a.id);
  if (s.locked || !target || target.state !== 'down') return s;

  const open = s.cards.find((c) => c.state === 'up');
  if (!open) {
    return { ...s, cards: s.cards.map((c) => (c.id === a.id ? { ...c, state: 'up' } : c)) };
  }

  const isMatch = open.mithai === target.mithai;
  return {
    moves: s.moves + 1,
    locked: !isMatch,
    cards: s.cards.map((c) =>
      c.id === a.id || c.id === open.id ? { ...c, state: isMatch ? 'matched' : 'up' } : c
    ),
  };
}

/** Screen-reader text for a flip, or null when the action changed nothing. */
export function describeFlip(prev: MatchState, next: MatchState, id: number): string | null {
  if (next === prev) return null;
  const card = next.cards.find((c) => c.id === id);
  if (!card) return null;
  const label = MITHAI_LABELS[card.mithai];
  if (next.moves === prev.moves) return label;
  return next.locked ? `${label}. Not a match` : `Match! ${label}`;
}

export const isComplete =(s: MatchState) => s.cards.every((c) => c.state === 'matched');

export function cardSrcSet(id: MithaiId | 'card-back'): string {
  const base = `/games/mithai-match/${id}`;
  return `${base}-256.webp 256w, ${base}-512.webp 512w`;
}
