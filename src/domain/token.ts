// Generates a best-effort-unique 4-digit token. rng is injectable for tests.
export function generateToken(takenActiveTokens: Set<string>, rng: () => number = Math.random): string {
  const make = () => String(1000 + Math.floor(rng() * 9000));
  let token = make();
  let attempts = 0;
  while (takenActiveTokens.has(token) && attempts < 50) {
    token = make();
    attempts++;
  }
  return token;
}
