type GoogleProviderOptions = {
  clientId?: string;
  clientSecret?: string;
  authorization?: {
    params?: Record<string, string>;
  };
};

export default function GoogleProvider(_options: GoogleProviderOptions = {}) {
  return {
    id: 'google',
    name: 'Google',
    type: 'oauth'
  };
}
