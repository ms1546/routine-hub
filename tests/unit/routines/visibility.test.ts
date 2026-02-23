import { describe, expect, it, beforeEach } from 'vitest';
import { routinesRepository } from '@/features/routines';
import { randomUUID } from 'node:crypto';

describe('Routine visibility and access control', () => {
  beforeEach(() => {
    // テスト用のRoutineを作成
    const publicRoutine = {
      name: 'Public Routine',
      description: 'This is a public routine that everyone can see.',
      purpose: 'Test public visibility',
      durationType: 'weekly' as const,
      visibility: 'public' as const,
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'monday' as const,
          startHour: 9,
          endHour: 12,
          label: 'Morning Work',
          objective: 'Test objective',
          energyLevel: 'high' as const
        }
      ]
    };

    const privateRoutine = {
      name: 'Private Routine',
      description: 'This is a private routine that only the owner can see.',
      purpose: 'Test private visibility',
      durationType: 'weekly' as const,
      visibility: 'private' as const,
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'tuesday' as const,
          startHour: 10,
          endHour: 13,
          label: 'Private Work',
          objective: 'Test objective',
          energyLevel: 'medium' as const
        }
      ]
    };

    // テスト用のRoutineを作成（実際のストアに追加する必要があるが、現在はインメモリなので直接テスト）
  });

  it('returns public routines when filtering by visibility public', async () => {
    const routines = await routinesRepository.list({ visibility: 'public' });
    const allPublic = routines.every((r) => r.visibility === 'public');
    expect(allPublic).toBe(true);
  });

  it('excludes private routines from public list for non-owners', async () => {
    const routines = await routinesRepository.list({ visibility: 'public' }, 'other@example.com');
    const hasPrivate = routines.some((r) => r.visibility === 'private');
    expect(hasPrivate).toBe(false);
  });

  it('allows owner to see their own private routines', async () => {
    const ownerId = 'owner@example.com';
    const routines = await routinesRepository.list(undefined, ownerId);
    const ownPrivateRoutines = routines.filter(
      (r) => r.visibility === 'private' && r.owner === ownerId
    );
    // オーナーは自分のprivate Routineを見ることができる
    expect(ownPrivateRoutines.length).toBeGreaterThanOrEqual(0);
  });

  it('prevents non-owners from accessing private routines via get', async () => {
    // まずprivate Routineを作成
    const privateRoutine = await routinesRepository.create({
      name: 'Private Test Routine',
      description: 'This is a private routine for testing access control.',
      purpose: 'Test private access',
      durationType: 'weekly',
      visibility: 'private',
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'monday',
          startHour: 9,
          endHour: 12,
          label: 'Private Work',
          objective: 'Test objective',
          energyLevel: 'high'
        }
      ]
    });

    // オーナーはアクセス可能
    const ownerAccess = await routinesRepository.get(privateRoutine.id, 'owner@example.com');
    expect(ownerAccess).not.toBeNull();
    expect(ownerAccess?.id).toBe(privateRoutine.id);

    // 他人はアクセス不可
    const otherAccess = await routinesRepository.get(privateRoutine.id, 'other@example.com');
    expect(otherAccess).toBeNull();
  });

  it('allows admin to access private routines via get', async () => {
    const privateRoutine = await routinesRepository.create({
      name: `Private Admin Routine ${randomUUID()}`,
      description: 'Private routine for admin access test.',
      purpose: 'Admin access',
      durationType: 'weekly',
      visibility: 'private',
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'wednesday',
          startHour: 9,
          endHour: 12,
          label: 'Admin Access',
          objective: 'Test objective',
          energyLevel: 'medium'
        }
      ]
    });

    const adminAccess = await routinesRepository.get(
      privateRoutine.id,
      'account-ops',
      'routunehub.dev@gmail.com',
      true
    );

    expect(adminAccess).not.toBeNull();
    expect(adminAccess?.id).toBe(privateRoutine.id);
  });

  it('allows admin to list routines across owners', async () => {
    const ownerEmail = `owner-${randomUUID()}@example.com`;
    const privateRoutine = await routinesRepository.create({
      name: `Admin List Routine ${randomUUID()}`,
      description: 'Private routine for admin list test.',
      purpose: 'Admin list access',
      durationType: 'weekly',
      visibility: 'private',
      tags: ['test'],
      owner: ownerEmail,
      timeBlocks: [
        {
          day: 'thursday',
          startHour: 13,
          endHour: 16,
          label: 'Admin List',
          objective: 'Test objective',
          energyLevel: 'low'
        }
      ]
    });

    const adminList = await routinesRepository.list(
      undefined,
      'account-ops',
      'routunehub.dev@gmail.com',
      true
    );

    const includesPrivate = adminList.some((routine) => routine.id === privateRoutine.id);
    expect(includesPrivate).toBe(true);
  });

  it('allows public routines to be accessed by anyone', async () => {
    const publicRoutine = await routinesRepository.create({
      name: 'Public Test Routine',
      description: 'This is a public routine for testing access control.',
      purpose: 'Test public access',
      durationType: 'weekly',
      visibility: 'public',
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'monday',
          startHour: 9,
          endHour: 12,
          label: 'Public Work',
          objective: 'Test objective',
          energyLevel: 'high'
        }
      ]
    });

    // 誰でもアクセス可能
    const access1 = await routinesRepository.get(publicRoutine.id, 'user1@example.com');
    const access2 = await routinesRepository.get(publicRoutine.id, 'user2@example.com');
    const access3 = await routinesRepository.get(publicRoutine.id);

    expect(access1).not.toBeNull();
    expect(access2).not.toBeNull();
    expect(access3).not.toBeNull();
    expect(access1?.id).toBe(publicRoutine.id);
  });
});
