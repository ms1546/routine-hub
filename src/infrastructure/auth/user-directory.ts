export type MockUserRole = 'admin' | 'member';

type MockDirectoryEntry = {
  id: string;
  displayName: string;
  email: string;
  role: MockUserRole;
};

const mockDirectory: Record<string, MockDirectoryEntry> = {
  'routunehub.dev@gmail.com': {
    id: 'account-ops',
    displayName: 'Ops Team',
    email: 'routunehub.dev@gmail.com',
    role: 'admin'
  },
  'owner@example.com': {
    id: 'account-owner',
    displayName: 'Owner Example',
    email: 'owner@example.com',
    role: 'member'
  }
};

export type MockUserProfile = {
  id: string;
  displayName: string;
  email: string;
  role: MockUserRole;
};

export function getMockUserProfile(identifier: string): MockUserProfile {
  const profile = mockDirectory[identifier as keyof typeof mockDirectory];
  if (profile) return profile;
  const displayName = identifier.includes('@') ? identifier.split('@')[0] ?? identifier : identifier;
  return {
    id: identifier,
    displayName,
    email: identifier,
    role: 'member'
  };
}
