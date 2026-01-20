export function randomUUID() {
    // Storybook 用。十分ユニークならOK
    return `storybook-${Math.random().toString(36).slice(2)}`;
  }
