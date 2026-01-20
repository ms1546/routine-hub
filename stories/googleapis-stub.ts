// Storybook用のモック: googleapis
// ブラウザ環境では使用できないため、モックに置き換える

export const google = {
  auth: {
    OAuth2: class {
      constructor(
        public clientId?: string,
        public clientSecret?: string,
        public redirectUri?: string
      ) {}
      setCredentials(_credentials: any) {}
    }
  },
  options(_options: any) {},
  calendar(_options: any) {
    return {
      events: {
        list: async () => ({ data: { items: [] } }),
        insert: async () => ({ data: { id: 'mock-event-id' } }),
        delete: async () => ({ data: {} })
      }
    };
  }
};

export const calendar_v3 = {
  Calendar: class {},
  Schema: {
    Event: {}
  }
};
