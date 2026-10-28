/**
 * Festive message generator (seasonal UI only).
 *
 * NOTE: this module contains no AI integration. It was previously named
 * `geminiService` but never called Google Gemini — every function returns a
 * randomly chosen hardcoded message behind a simulated delay. Kept as-is
 * because the seasonal UI only needs canned greetings.
 *
 * If real generation is ever wanted, route it through the existing
 * server-side OpenAI chatbot endpoint rather than calling a model from the
 * browser (a browser-held API key is public).
 */

export type WishTheme = 'heartfelt' | 'funny' | 'religious' | 'poetic';

export interface ChristmasWishRequest {
  name?: string;
  relationship?: string;
  theme?: WishTheme;
}

const FALLBACK_WISHES: Record<WishTheme, readonly string[]> = {
  heartfelt: [
    "May this festive season fill your heart with warmth, joy, and cherished memories. Wishing you peace and happiness throughout the holidays! 🎄✨",
    "Sending you warm wishes for a magical holiday season filled with love, laughter, and everything that brings you joy! 🎅❤️",
    "May the spirit of Christmas bring you closer to those you love and fill your days with wonder and delight! 🌟🎁"
  ],
  funny: [
    "Hope Santa brings you everything on your list... except those extra holiday pounds! 😄🎅 Merry Christmas!",
    "Wishing you a holiday season filled with good food, great company, and zero fruitcake! 🎄😂",
    "May your Christmas be merry, your eggnog be strong, and your relatives be... tolerable! 🥃😅"
  ],
  religious: [
    "May the birth of our Savior fill your heart with peace, love, and divine blessings this Christmas season. 🙏✨",
    "Wishing you the joy and peace of Christ's love this holy season. May God bless you abundantly! 🕊️⛪",
    "May the light of Christ shine upon you and your family this Christmas. Blessed holidays! 🌟🙏"
  ],
  poetic: [
    "As snowflakes dance and stars shine bright, may your heart be filled with pure delight. Wishing you a Christmas wrapped in wonder! ❄️✨",
    "Through winter's whisper and candle's glow, may joy and magic overflow. A season of dreams and memories to treasure! 🕯️🎄",
    "In this season of silver and gold, may warmth embrace your heart and soul. Merry Christmas, dear friend! 🌟💫"
  ]
};

const EMPLOYEE_GREETINGS: readonly string[] = [
  "Thank you for your outstanding dedication and hard work this year. Wishing you a well-deserved, joyful holiday season! 🎄✨",
  "Your contributions have been invaluable. May this festive season bring you rest, happiness, and time with loved ones! 🎅⭐",
  "We truly appreciate all you've accomplished. Enjoy a wonderful holiday filled with peace and celebration! 🎁💫",
  "Your hard work has made a real difference. Wishing you a magical Christmas and a relaxing break! 🌟❤️"
];

const NEW_YEAR_RESOLUTIONS: readonly string[] = [
  "This year, I will master a new coding language and drink 20% more water! 💧💻",
  "My goal: Fix more bugs than I create, and take more scenic walks. 🐛🚶",
  "To optimize my workflow and finally organize my desktop icons! 📂✨",
  "I resolve to comment my code better and automate the boring stuff. 🤖📝",
  "This year, I'll balance high-performance coding with high-quality sleep! 😴⚡"
];

/** Pick a random entry from a non-empty list. */
const pickRandom = (items: readonly string[], fallback = ''): string =>
  items[Math.floor(Math.random() * items.length)] ?? fallback;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate a Christmas wish.
 */
export const generateChristmasWish = async (
  request: ChristmasWishRequest
): Promise<string> => {
  const wishes = (request.theme && FALLBACK_WISHES[request.theme]) || FALLBACK_WISHES.heartfelt;
  const randomWish = pickRandom(wishes);

  // Personalize it with the name
  const personalizedWish = randomWish.replace(/you/g, request.name || 'you');

  await delay(1500);

  return personalizedWish;
};

/**
 * Generate an employee appreciation greeting.
 */
export const generateEmployeeGreeting = async (_name?: string): Promise<string> => {
  const greeting = pickRandom(EMPLOYEE_GREETINGS);

  await delay(1200);

  return greeting;
};

/**
 * Generate a New Year resolution.
 */
export const generateNewYearResolution = async (_name?: string): Promise<string> => {
  const resolution = pickRandom(NEW_YEAR_RESOLUTIONS);

  await delay(1000);

  return resolution;
};
