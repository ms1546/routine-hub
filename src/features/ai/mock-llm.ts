const seededWords = ['deliberate', 'grounded', 'traceable', 'calm', 'auditable'];

export type MockLlmOptions = {
  topic: string;
  temperature?: number;
};

export async function mockLlmGenerate(
  prompt: string,
  options: MockLlmOptions = { topic: 'general', temperature: 0.2 }
): Promise<string> {
  const hash = Array.from(prompt).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const word = seededWords[hash % seededWords.length];
  const intensity = options.temperature && options.temperature > 0.5 ? 'expansive' : 'succinct';
  return `${options.topic.toUpperCase()} | ${intensity} | ${word}`;
}
