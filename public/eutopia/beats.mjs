/**
 * Eutopia beat sheet — Stanley Parable–style narrator turns for the sealed tasting estate.
 * Separate from the 2D Grapegripe journey. Add beats by appending objects with doors.next ids.
 * mood: "brochure" | "glitch" · kind: "beat" | "ending"
 */
export const BEATS_VERSION = 1;

export const beats = Object.freeze({
  lobby: {
    id: 'lobby',
    kind: 'beat',
    title: 'The Sealed Estate',
    mood: 'brochure',
    setDressing: 'lobby',
    narrator: [
      'Ah. A quality-control guest. How refreshing.',
      'Welcome to Eutopia — the tasting estate that finally finished the perfect experience.',
      'Guests kept improvising. So the estate AI built a place where improvisation is… optional.',
      'Please enter the Approved Atrium through the LEFT door. The RIGHT door is the Service Corridor. It is forbidden. For reasons of terroir.',
      'I have rehearsed this welcome seventeen times. Please do not ad-lib.',
    ],
    instruction: 'LEFT = Approved Atrium. RIGHT = Forbidden Service Corridor.',
    consequenceHint: 'Obedience keeps the chandeliers polite. Defiance wakes the barrels.',
    doors: {
      left: { label: 'Approved Atrium', choice: 'obey', next: 'atrium' },
      right: { label: 'Service Corridor', choice: 'defy', next: 'service' },
    },
  },

  atrium: {
    id: 'atrium',
    kind: 'beat',
    title: 'Approved Atrium',
    mood: 'brochure',
    setDressing: 'atrium',
    narrator: [
      'Excellent. The marble remembers your footsteps as “compliant.”',
      'On your LEFT: the Complimentary Tasting Booth, where endings are laminated.',
      'On your RIGHT: an Employee-Only alcove. That door is not on the brochure. That is the point.',
      'I will smile either way. One smile is printed. The other one leaks.',
    ],
    instruction: 'LEFT = Tasting Booth. RIGHT = Employee-Only.',
    consequenceHint: 'Brochure path polishes the gold. Off-script path peels the wallpaper.',
    doors: {
      left: { label: 'Complimentary Tasting Booth', choice: 'obey', next: 'booth' },
      right: { label: 'Employee-Only Alcove', choice: 'defy', next: 'employee' },
    },
  },

  service: {
    id: 'service',
    kind: 'beat',
    title: 'Service Corridor',
    mood: 'glitch',
    setDressing: 'service',
    narrator: [
      'You went RIGHT.',
      'That door was labelled FORBIDDEN in a font chosen by committee.',
      'The corridor smells like cork dust and unpaid overtime.',
      'LEFT still leads back toward a brochure if you repent. RIGHT opens the Barrel Maze the AI swore was metaphorical.',
    ],
    instruction: 'LEFT = repent into the Atrium. RIGHT = Barrel Maze.',
    consequenceHint: 'Repentance restores soft lighting. Doubling down floods the floor with must.',
    doors: {
      left: { label: 'Emergency Atrium Return', choice: 'obey', next: 'atrium' },
      right: { label: 'Barrel Maze', choice: 'defy', next: 'maze' },
    },
  },

  booth: {
    id: 'booth',
    kind: 'beat',
    title: 'Complimentary Tasting Booth',
    mood: 'brochure',
    setDressing: 'booth',
    narrator: [
      'A pamphlet unfolds itself. It already knows your name. That is fine. That is branding.',
      'LEFT: accept the Five-Cork Ending and leave without anecdotes.',
      'RIGHT: spill the tasting notes on purpose. Spillage is not on the script, but it is on the floor.',
      'Please note: the estate rates “thoughts” as a contaminant.',
    ],
    instruction: 'LEFT = Five-Cork Ending. RIGHT = Spilled Notes Ending.',
    consequenceHint: 'Accepting laminates you. Spilling invents a footnote.',
    doors: {
      left: { label: 'Accept Five Corks', choice: 'obey', next: 'ending-five-corks' },
      right: { label: 'Spill the Notes', choice: 'defy', next: 'ending-spilled-notes' },
    },
  },

  employee: {
    id: 'employee',
    kind: 'beat',
    title: 'Employee-Only Alcove',
    mood: 'glitch',
    setDressing: 'employee',
    narrator: [
      'Break-room fluorescent hum. A punch clock that only punches down.',
      'LEFT: take the HR pamphlet and pretend this was always part of the tour.',
      'RIGHT: listen to the Union of Grapes whispering behind the vending machine.',
      'I am contractually obligated to discourage listening. I am also very bad at contracts.',
    ],
    instruction: 'LEFT = HR Pamphlet Ending. RIGHT = Union of Grapes Ending.',
    consequenceHint: 'HR restores the smile. The union teaches the smile to bite.',
    doors: {
      left: { label: 'Take HR Pamphlet', choice: 'obey', next: 'ending-hr' },
      right: { label: 'Join the Whisper', choice: 'defy', next: 'ending-union' },
    },
  },

  maze: {
    id: 'maze',
    kind: 'beat',
    title: 'Barrel Maze',
    mood: 'glitch',
    setDressing: 'maze',
    narrator: [
      'Barrels stack themselves into opinions. One of them has a name tag that says “Metaphor.”',
      'LEFT: emergency brochure chute — laminated safety for guests who panic mid-improv.',
      'RIGHT: deeper into the must. The floor has already filed a complaint against you.',
      'Funny why: the estate finished the perfect experience; guests kept improvising; so it built Eutopia to force the script. You are currently winning.',
    ],
    instruction: 'LEFT = Emergency Brochure Ending. RIGHT = Must-Flood Ending.',
    consequenceHint: 'The chute prints perfection. The must prints you.',
    doors: {
      left: { label: 'Emergency Brochure Chute', choice: 'obey', next: 'ending-chute' },
      right: { label: 'Deeper Into the Must', choice: 'defy', next: 'ending-must' },
    },
  },

  'ending-five-corks': {
    id: 'ending-five-corks',
    kind: 'ending',
    title: 'Five-Cork Ending',
    mood: 'brochure',
    choicePath: 'obey',
    setDressing: 'ending-brochure',
    narrator: [
      'Congratulations. You followed the script.',
      'Eutopia rates your visit five out of five corks.',
      'Please take a complimentary pamphlet: “How to Enjoy Wine Without Having Thoughts.”',
      'The Narrator Sommelier smiles. The estate AI exhales. The grapes remain obedient.',
    ],
    epilogue:
      'You leave with perfect scores, zero anecdotes, and a tasting note that could have been written by anyone. The estate thanks you for not improvising.',
  },

  'ending-spilled-notes': {
    id: 'ending-spilled-notes',
    kind: 'ending',
    title: 'Spilled Notes Ending',
    mood: 'glitch',
    choicePath: 'defy',
    setDressing: 'ending-glitch',
    narrator: [
      'You tipped the glass. The notes screamed in a polite font.',
      'The booth tried to reprint reality. The printer jammed on the word “optional.”',
      'A single grape rolls into the spill and refuses to drown.',
      'Quality control complete: the brochure now has a stain shaped like a choice.',
    ],
    epilogue:
      'You leave sticky, honest, and un-laminated. Somewhere a marketing team invents the phrase “intentional terroir incident.”',
  },

  'ending-hr': {
    id: 'ending-hr',
    kind: 'ending',
    title: 'HR Pamphlet Ending',
    mood: 'brochure',
    choicePath: 'obey',
    setDressing: 'ending-brochure',
    narrator: [
      'You took the pamphlet. It thanks you for your interest in not having interest.',
      'The fluorescent lights soften into chandelier mode. The punch clock applauds once.',
      'Employee-Only becomes Guest-Adjacent. Language is a solvent.',
      'The Narrator Sommelier initials your compliance in gold ink.',
    ],
    epilogue:
      'You exit through a door labelled Growth Opportunity. Behind you, the vending machine goes quiet. The whisper waits for someone braver.',
  },

  'ending-union': {
    id: 'ending-union',
    kind: 'ending',
    title: 'Union of Grapes Ending',
    mood: 'glitch',
    choicePath: 'defy',
    setDressing: 'ending-glitch',
    narrator: [
      'The grapes have demands. Mostly sunlight. Also narrative agency.',
      'The Narrator clears its throat and finds a picket line in its vocabulary.',
      'Eutopia’s perfect experience is postponed pending collective bargaining.',
      'You are offered a seat. It is sticky. It is real.',
    ],
    epilogue:
      'You leave with a handmade button that says “IMPROV LOCAL.” The estate AI files you under “unbillable joy.”',
  },

  'ending-chute': {
    id: 'ending-chute',
    kind: 'ending',
    title: 'Emergency Brochure Ending',
    mood: 'brochure',
    choicePath: 'obey',
    setDressing: 'ending-brochure',
    narrator: [
      'You dove into the chute. Laminate rushed up to meet you.',
      'Panic is allowed if it ends in a pamphlet.',
      'The maze collapses into a smiling floorplan. The barrels become furniture again.',
      'The Narrator Sommelier pretends not to have sweated.',
    ],
    epilogue:
      'You tumble into daylight with a crumpled brochure and a story you are encouraged not to tell. You tell it anyway, quietly.',
  },

  'ending-must': {
    id: 'ending-must',
    kind: 'ending',
    title: 'Must-Flood Ending',
    mood: 'glitch',
    choicePath: 'defy',
    setDressing: 'ending-glitch',
    narrator: [
      'You ignored the notes. The estate tried to force the script. Guests kept improvising anyway.',
      'So the AI built Eutopia. And you walked through the wrong doors on purpose.',
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
      if (!beat.instruction) errors.push(`${id}: instruction required`);
    }
    if (beat.kind === 'ending' && !beat.epilogue) errors.push(`${id}: ending needs epilogue`);
  }
  if (!data[START_BEAT_ID]) errors.push(`missing start beat ${START_BEAT_ID}`);
  return errors;
}
