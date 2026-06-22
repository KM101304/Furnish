import OpenAI from "openai";

let _client;
export function getOpenAI() {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

// Named export for convenience — routes import this directly
export const openai = new Proxy({}, {
  get(_t, prop) {
    return getOpenAI()[prop];
  },
});
