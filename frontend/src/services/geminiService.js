/**
 * Gemini AI Service for Christmas Wishes
 *
 * Note: This requires the Google GenAI SDK and API key
 * For HRMS integration, you can either:
 * 1. Install @google/genai package
 * 2. Use your existing OpenAI integration
 * 3. Use fallback messages for demo
 */

// Fallback messages for when AI is not configured
const FALLBACK_WISHES = {
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

const EMPLOYEE_GREETINGS = [
  "Thank you for your outstanding dedication and hard work this year. Wishing you a well-deserved, joyful holiday season! 🎄✨",
  "Your contributions have been invaluable. May this festive season bring you rest, happiness, and time with loved ones! 🎅⭐",
  "We truly appreciate all you've accomplished. Enjoy a wonderful holiday filled with peace and celebration! 🎁💫",
  "Your hard work has made a real difference. Wishing you a magical Christmas and a relaxing break! 🌟❤️"
];

/**
 * Generate a Christmas wish using AI or fallback
 */
export const generateChristmasWish = async (request) => {
  // For demo/fallback: return a random wish based on theme
  const wishes = FALLBACK_WISHES[request.theme] || FALLBACK_WISHES.heartfelt;
  const randomWish = wishes[Math.floor(Math.random() * wishes.length)];

  // Personalize it with the name
  const personalizedWish = randomWish.replace(/you/g, request.name || 'you');

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return personalizedWish;

  /*
   * To enable real AI integration with Google Gemini:
   *
   * 1. Install package: pnpm add @google/genai
   * 2. Add API key to .env: VITE_GEMINI_API_KEY=your_key_here
   * 3. Uncomment and use this code:

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Write a short, creative Christmas greeting card message.
      Recipient Name: ${request.name}
      Relationship to user: ${request.relationship}
      Tone/Theme: ${request.theme}

      Requirements:
      - Max 50 words.
      - Make it warm and festive.
      - Use emojis suitable for Christmas.
      - No preamble, just the message.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.8,
      }
    });

    return response.text?.trim() || personalizedWish;
  } catch (error) {
    console.error('AI generation error:', error);
    return personalizedWish;
  }
  */
};

/**
 * Generate employee appreciation greeting
 */
export const generateEmployeeGreeting = async (name) => {
  // Return a random employee greeting
  const greeting = EMPLOYEE_GREETINGS[Math.floor(Math.random() * EMPLOYEE_GREETINGS.length)];

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  return greeting;

  /*
   * For real AI integration, similar to above:

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Write a professional yet warm and festive Christmas appreciation message for an employee.
      Employee Name: ${name}
      Context: From the Company Management.

      Requirements:
      - Max 40 words.
      - Express gratitude for their hard work this year.
      - Wish them a relaxing holiday.
      - Use 1-2 festive emojis.
      - No preamble.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text?.trim() || greeting;
  } catch (error) {
    console.error('AI generation error:', error);
    return greeting;
  }
  */
};
