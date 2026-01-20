// Storybook用のモック: routines/domain/store
// node:cryptoを使用するため、モックに置き換える

export function createRoutine(input: any) {
  return {
    id: `mock-${Date.now()}`,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function hydrateRoutine(data: any) {
  return data;
}

export function validateRoutine(routine: any) {
  return { success: true, data: routine };
}

// その他の必要な関数をエクスポート
export const store = {
  createRoutine,
  hydrateRoutine,
  validateRoutine
};
