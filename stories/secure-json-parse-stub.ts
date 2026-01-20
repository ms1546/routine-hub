// Storybook用のモック: secure-json-parse
// ブラウザ環境では使用できないため、モックに置き換える

export function parse(text: string, reviver?: (key: string, value: any) => any): any {
  return JSON.parse(text, reviver);
}

export function safeParse(text: string, reviver?: (key: string, value: any) => any): { value?: any; error?: Error } {
  try {
    return { value: JSON.parse(text, reviver) };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
}

// default exportも提供
export default {
  parse,
  safeParse
};
