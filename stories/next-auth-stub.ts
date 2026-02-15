type NextAuthHandlers = {
  GET: (request?: Request) => Promise<Response>;
  POST: (request?: Request) => Promise<Response>;
};

const handlers: NextAuthHandlers = {
  GET: async () => new Response('OK'),
  POST: async () => new Response('OK')
};

export async function signIn() {
  return { ok: true };
}

export async function signOut() {
  return { ok: true };
}

export async function auth() {
  return null;
}

export { handlers };

export default function NextAuth() {
  return {
    handlers,
    signIn,
    signOut,
    auth
  };
}
