import { supabase } from '../lib/supabase.js';

const supportedCounts = new Set([5, 10, 15, 20]);
const deckColumns = 'id,user_id,subject_id,title,source_text,created_at';

async function functionErrorMessage(error) {
  const response = error?.context;
  const status = response?.status;
  let body = null;
  try {
    if (response && typeof response.clone === 'function') body = await response.clone().json();
  } catch {
    // Non-JSON function errors are handled with status-specific copy below.
  }
  const detail = typeof body?.error === 'string' ? body.error : typeof body?.message === 'string' ? body.message : '';
  if (status === 401 || status === 403) throw new Error('Your sign-in may have expired. Log in again, then retry.');
  if (status === 429) throw new Error('The flashcard service is busy. Wait a moment and try again.');
  if (status === 400) throw new Error(detail || 'The notes could not be processed. Check them and try again.');
  if (status >= 500) throw new Error('The flashcard service is temporarily unavailable. Try again shortly.');
  if (/fetch|network|connection/i.test(error?.message || '')) throw new Error('Could not reach the flashcard service. Check your connection and try again.');
  throw new Error(detail || 'Could not generate flashcards. Please try again.');
}

export async function generateFlashcards(notes, count) {
  const content = String(notes ?? '').trim();
  const cardCount = Number(count);
  if (!content) throw new Error('Paste your study notes before generating flashcards.');
  if (content.length > 50000) throw new Error('These notes are too long. Keep them under 50,000 characters.');
  if (!supportedCounts.has(cardCount)) throw new Error('Choose 5, 10, 15, or 20 flashcards.');

  let result;
  try {
    result = await supabase.functions.invoke('generate-flashcards', {
      body: { content, count: cardCount },
    });
  } catch (error) {
    if (/fetch|network|connection/i.test(error?.message || '')) throw new Error('Could not reach the flashcard service. Check your connection and try again.');
    throw error;
  }

  const { data, error } = result;
  if (error) return functionErrorMessage(error);
  if (!Array.isArray(data?.flashcards) || data.flashcards.length === 0 || data.flashcards.length > cardCount) {
    throw new Error('The flashcard service returned an unexpected response. Please try generating the cards again.');
  }

  const cards = data.flashcards.map(card => ({
    question: typeof card?.question === 'string' ? card.question.trim() : '',
    answer: typeof card?.answer === 'string' ? card.answer.trim() : '',
  }));
  if (cards.some(card => !card.question || !card.answer)) {
    throw new Error('Some generated cards were incomplete. Please try generating them again.');
  }
  return cards;
}

export async function fetchFlashcardDecks(userId) {
  const { data: decks, error: deckError } = await supabase
    .from('flashcard_decks')
    .select(deckColumns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (deckError) throw deckError;
  if (!decks?.length) return [];

  const { data: cards, error: cardError } = await supabase
    .from('flashcards')
    .select('id,deck_id,question,answer,position,created_at')
    .in('deck_id', decks.map(deck => deck.id))
    .order('position', { ascending: true });
  if (cardError) throw cardError;

  const byDeck = new Map(decks.map(deck => [deck.id, []]));
  for (const card of cards ?? []) byDeck.get(card.deck_id)?.push(card);
  return decks.map(deck => ({ ...deck, cards: byDeck.get(deck.id) ?? [] }));
}

export async function saveFlashcardDeck({ subjectId, title, sourceText, cards }) {
  const content = String(sourceText ?? '').trim();
  const deckTitle = String(title ?? '').trim();
  if (!deckTitle || !content || !Array.isArray(cards) || !cards.length) {
    throw new Error('Add a deck title and study notes, then generate cards before saving.');
  }
  if (cards.some(card => !String(card?.question ?? '').trim() || !String(card?.answer ?? '').trim())) {
    throw new Error('This deck has an incomplete card. Generate the cards again before saving.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error('We could not verify your sign-in. Please log in again and retry.');
  const user = authData?.user;
  if (!user) throw new Error('Please log in again before saving a deck.');

  const { data: deck, error: deckError } = await supabase
    .from('flashcard_decks')
    .insert({
      user_id: user.id,
      subject_id: subjectId || null,
      title: deckTitle,
      source_text: content,
    })
    .select(deckColumns)
    .single();
  if (deckError) throw deckError;

  const rows = cards.map((card, position) => ({
    deck_id: deck.id,
    question: card.question.trim(),
    answer: card.answer.trim(),
    position,
  }));
  const { error: cardsError } = await supabase.from('flashcards').insert(rows);
  if (cardsError) {
    const { error: rollbackError } = await supabase.from('flashcard_decks')
      .delete().eq('id', deck.id).eq('user_id', user.id);
    if (rollbackError) {
      throw new Error(`The cards could not be saved, and the incomplete deck could not be removed. ${cardsError.message}`);
    }
    throw new Error(`The flashcards could not be saved. Your incomplete deck was removed so you can retry. ${cardsError.message}`);
  }

  return { ...deck, cards: rows };
}

export async function deleteFlashcardDeck({ userId, id }) {
  const { data, error } = await supabase.from('flashcard_decks').delete()
    .eq('id', id).eq('user_id', userId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This deck is no longer available in your account. Refresh and try again.');
}
