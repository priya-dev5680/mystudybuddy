/**
 * Client-side demo adapters for AI features.
 * Replace these local heuristics with calls to your own server routes when ready.
 * Keep provider credentials on the server; never place an AI key in this app.
 */
export function generateSummary(material, style = 'Quick revision') {
  const points = material.trim().split(/[.!?\n]+/).filter(Boolean).slice(0, style === 'Detailed summary' ? 8 : 5);
  if (!points.length) return 'Add some study material first, then I’ll turn it into clear revision notes.';
  const heading = style === 'Exam-focused notes' ? 'Exam cues' : style === 'Detailed summary' ? 'Detailed notes' : 'Quick revision';
  return `${heading}\n\n${points.map((point, index) => `${index + 1}. ${point.trim()}.`).join('\n\n')}\n\nKey takeaway\nReview the core ideas above, then test your understanding with a short recall session.`;
}

export function generateFlashcards(material) {
  const points = material.split(/[.!?\n]+/).map(text => text.trim()).filter(text => text.length > 18);
  const fallback = material.split(',').map(text => text.trim()).filter(Boolean);
  return (points.length ? points : fallback).slice(0, 6).map(point => ({
    question: `What should you remember about ${point.split(' ').slice(0, 3).join(' ')}?`,
    answer: point,
  }));
}

export function generateStudyPlan(plan, focus = 'Probability practice') {
  return [...plan, { time: '20:00', subject: 'Mathematics', topic: focus, mins: 25, emoji: '∑', color: 'lavender' }];
}

export function generateRecommendation(subject = 'Probability') {
  return `You haven’t revisited ${subject} in 4 days. A 25-minute session today could help those ideas stick.`;
}
