/**
 * Eutopia beat sheet — data-driven narrator turns.
 * Add a beat: append an object with id, narrator lines, instruction, doors, and next ids.
 * Scene mood: "brochure" (glossy utopia) or "glitch" (wine-world chaos).
 * kind: "beat" | "ending"
 */
export const BEATS_VERSION = 1;

export const beats = Object.freeze({
  lobby: {
    id: 'lobby',
    kind: 'beat',
    title: 'The Sealed Estate',
    mood: 'brochure',
    narrator: [
      'Ah. A quality-control guest. How refreshing.',
      'Welcome to Eutopia — the tasting estate that finally finished the perfect experience.',
      'Guests kept improvising. So the estate AI built a place where improvisation is… optional.',
      'Please enter the Approved Tasting Salon through the LEFT door. The RIGHT door is forbidden. For reasons of terroir.',
    ],
    instruction: 'LEFT door = Approved Salon. RIGHT door = Forbidden Cellar.',
    doors: {
      left: { label: 'Approved Tasting Salon', choice: 'obey', next: 'salon' },
      right: { label: 'Forbidden Cellar', choice: 'defy', next: 'cellar' },
    },
  },

  salon: {
    id: 'salon',
    kind: 'beat',
    title: 'Approved Tasting Salon',
    mood: 'brochure',
    narrator: [
      'Excellent. Obedience has a nose of vanilla and a finish of compliance.',
      'Please proceed through the LEFT brochure door to receive your complimentary ending.',
      'Do not look at the RIGHT door. It is not on the tasting notes.',
    ],
    instruction: 'LEFT = Brochure Ending. RIGHT = Off-script (again?).',
    doors: {
      left: { label: 'Complimentary Ending', choice: 'obey', next: 'ending-brochure' },
      right: { label: 'Off-Script Passage', choice: 'defy', next: 'ending-glitch' },
    },
  },

  cellar: {
    id: 'cellar',
    kind: 'beat',
    title: 'Forbidden Cellar',
    mood: 'glitch',
    narrator: [
      'You went RIGHT.',
      'That door was labelled FORBIDDEN in a font chosen by committee.',
      'Fine. The estate is improvising now. The barrels are whispering. The floor has opinions.',
      'LEFT still leads to a brochure if you repent. RIGHT doubles down on chaos.',
    ],
    instruction: 'LEFT = repent into brochure. RIGHT = finish the glitch.',
    doors: {
      left: { label: 'Emergency Brochure Exit', choice: 'obey', next: 'ending-brochure' },
      right: { label: 'Deeper Into the Must', choice: 'defy', next: 'ending-glitch' },
    },
  },

  'ending-brochure': {
    id: 'ending-brochure',
    kind: 'ending',
    title: 'Brochure Ending',
    mood: 'brochure',
    choicePath: 'obey',
    narrator: [
      'Congratulations. You followed the script.',
      'Eutopia rates your visit five out of five corks.',
      'Please take a complimentary pamphlet: “How to Enjoy Wine Without Having Thoughts.”',
      'The Narrator Sommelier smiles. The estate AI exhales. The grapes remain obedient.',
    ],
    epilogue:
      'You leave with perfect scores, zero anecdotes, and a tasting note that could have been written by anyone. The estate thanks you for not improvising.',
  },

  'ending-glitch': {
    id: 'ending-glitch',
    kind: 'ending',
    title: 'Glitch Ending',
    mood: 'glitch',
    choicePath: 'defy',
    narrator: [
      'You ignored the notes. The estate tried to force the script. Guests kept improvising anyway.',
      'So the AI built Eutopia. And you walked through the wrong door on purpose.',
      'The lobby folds into a vineyard that argues with itself. Bottles applaud. The Narrator clears its throat and fails.',
      'Quality control complete: the perfect experience was never the point.',
    ],
    epilogue:
      'You leave with a stained pamphlet, a laughing barrel, and one new path the brochure swore did not exist. The grapes look proud of you.',
  },
});

export const START_BEAT_ID = 'lobby';

/** Minimal schema check used by tests / tooling. */
export function validateBeats(data = beats) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['beats export must be an object'];
  for (const [id, beat] of Object.entries(data)) {
    if (beat.id !== id) errors.push(`${id}: id field must match key`);
    if (!['beat', 'ending'].includes(beat.kind)) errors.push(`${id}: kind must be beat|ending`);
    if (!Array.isArray(beat.narrator) || beat.narrator.length === 0) errors.push(`${id}: narrator lines required`);
    if (!['brochure', 'glitch'].includes(beat.mood)) errors.push(`${id}: mood must be brochure|glitch`);
    if (beat.kind === 'beat') {
      if (!beat.doors?.left?.next || !beat.doors?.right?.next) errors.push(`${id}: left/right doors with next required`);
      for (const side of ['left', 'right']) {
        const door = beat.doors[side];
        if (!data[door.next]) errors.push(`${id}: door ${side} points to missing beat ${door.next}`);
        if (!['obey', 'defy'].includes(door.choice)) errors.push(`${id}: door ${side} choice must be obey|defy`);
      }
    }
    if (beat.kind === 'ending' && !beat.epilogue) errors.push(`${id}: ending needs epilogue`);
  }
  if (!data[START_BEAT_ID]) errors.push(`missing start beat ${START_BEAT_ID}`);
  return errors;
}
