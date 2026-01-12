const mockDirectory = {
  'ops@routinehub.dev': {
    id: 'account-ops',
    displayName: 'Ops Team',
    email: 'ops@routinehub.dev'
  },
  'owner@example.com': {
    id: 'account-owner',
    displayName: 'Owner Example',
    email: 'owner@example.com'
  }
};

export type MockUserProfile = {
  id: string;
  displayName: string;
  email: string;
};

export function getMockUserProfile(identifier: string): MockUserProfile {
  const profile = mockDirectory[identifier as keyof typeof mockDirectory];
  if (profile) return profile;
  const displayName = identifier.includes('@') ? identifier.split('@')[0] ?? identifier : identifier;
  return {
    id: identifier,
    displayName,
    email: identifier
  };
}
