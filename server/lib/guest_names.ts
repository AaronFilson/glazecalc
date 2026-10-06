// Friendly three-word names for trial ("guest") accounts, such as "speckled
// quiet kilns": two describing words and a plural noun, some from the pottery
// studio. The lists are written by hand so every combination stays kind.
// 102 x 101 x 90, about 930,000 names; uniqueness itself comes from
// the unique email index (the name is also the guest's placeholder email).
import crypto from 'node:crypto';

// prettier-ignore
export const ADJECTIVES = [
  'amber', 'ample', 'ashen', 'balmy', 'bold', 'bright', 'brisk', 'calm', 'candid', 'cheerful', 'chunky', 'clever',
  'cobalt', 'cozy', 'crackled', 'creamy', 'crisp', 'curious', 'dappled', 'daring', 'dewy', 'dusky', 'dusty', 'eager',
  'earthy', 'easy', 'fair', 'fancy', 'fiery', 'fleet', 'fluffy', 'fond', 'frosty', 'gentle', 'gilded', 'glassy',
  'glossy', 'golden', 'grand', 'gritty', 'hardy', 'hazy', 'hearty', 'honest', 'humble', 'jolly', 'keen', 'kind',
  'lively', 'lucky', 'lunar', 'matte', 'mellow', 'merry', 'misty', 'molten', 'mossy', 'nimble', 'noble', 'oaken',
  'ochre', 'opal', 'patient', 'peppy', 'placid', 'plucky', 'polished', 'proud', 'quick', 'quiet', 'rapid', 'rosy',
  'rustic', 'rusty', 'sandy', 'satin', 'silky', 'silver', 'smoky', 'snappy', 'snowy', 'sparkly', 'speckled', 'spry',
  'steady', 'stony', 'sturdy', 'sunny', 'swift', 'tidy', 'toasty', 'tranquil', 'trusty', 'velvet', 'vivid', 'warm',
  'wavy', 'wild', 'windy', 'witty', 'woolly', 'zesty'
];

// prettier-ignore
export const NOUNS = [
  'anvils', 'aprons', 'basins', 'beakers', 'bowls', 'brushes', 'buckets', 'calipers', 'candles', 'carafes', 'castles',
  'chalices', 'clouds', 'comets', 'cones', 'crocks', 'cups', 'dippers', 'ewers', 'feathers', 'ferns', 'flagons',
  'flasks', 'foxes', 'gardens', 'goblets', 'harbors', 'hearths', 'herons', 'jars', 'jugs', 'kettles', 'kilns', 'ladles',
  'lanterns', 'lids', 'lizards', 'machines', 'maples', 'meadows', 'mugs', 'newts', 'oceans', 'otters', 'owls',
  'pebbles', 'pitchers', 'planets', 'plates', 'platters', 'ponds', 'potters', 'puddles', 'quarries', 'rabbits',
  'ravens', 'rivers', 'robins', 'saggars', 'saucers', 'shards', 'shelves', 'sieves', 'slabs', 'sparrows', 'spirals',
  'sponges', 'spouts', 'stars', 'stools', 'streams', 'studios', 'sunsets', 'teacups', 'teapots', 'thimbles', 'tiles',
  'trees', 'trivets', 'tumblers', 'turtles', 'urns', 'vases', 'vessels', 'wheels', 'whisks', 'willows', 'wrens',
  'yarrows', 'zebras'
];

export interface GuestName {
  /** As shown: 'speckled quiet kilns'. */
  name: string;
  /** For the placeholder email: 'speckled-quiet-kilns'. */
  slug: string;
}

const pick = (list: readonly string[]): string => list[crypto.randomInt(list.length)]!;

/** A random name: two different describing words and a plural noun. */
export const randomName = (): GuestName => {
  const first = pick(ADJECTIVES);
  let second = pick(ADJECTIVES);
  while (second === first) second = pick(ADJECTIVES);
  const words = [first, second, pick(NOUNS)];
  return { name: words.join(' '), slug: words.join('-') };
};

/** Where the trial routes get names; tests replace draw to force a clash. */
export const names = { draw: randomName };
