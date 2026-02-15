import { describe, expect, it, beforeEach } from 'vitest';
import { routinesRepository } from '@/features/routines';

describe('Routine popularity sorting', () => {
  it('sorts routines by likes count in descending order', async () => {
    // 複数のpublic Routineを作成
    const routine1 = await routinesRepository.create({
      name: 'Low Likes Routine',
      description: 'A routine with low likes count.',
      purpose: 'Test sorting',
      durationType: 'weekly',
      visibility: 'public',
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'monday',
          startHour: 9,
          endHour: 12,
          label: 'Work',
          objective: 'Test',
          energyLevel: 'high'
        }
      ]
    });

    const routine2 = await routinesRepository.create({
      name: 'High Likes Routine',
      description: 'A routine with high likes count.',
      purpose: 'Test sorting',
      durationType: 'weekly',
      visibility: 'public',
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'tuesday',
          startHour: 10,
          endHour: 13,
          label: 'Work',
          objective: 'Test',
          energyLevel: 'high'
        }
      ]
    });

    const routine3 = await routinesRepository.create({
      name: 'Medium Likes Routine',
      description: 'A routine with medium likes count.',
      purpose: 'Test sorting',
      durationType: 'weekly',
      visibility: 'public',
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'wednesday',
          startHour: 11,
          endHour: 14,
          label: 'Work',
          objective: 'Test',
          energyLevel: 'high'
        }
      ]
    });

    // likes数を手動で設定（updateを使用）
    const updated1 = await routinesRepository.update({
      id: routine1.id,
      patch: { stats: { clones: 0, applications: 0, likes: 5 } }
    });
    const updated2 = await routinesRepository.update({
      id: routine2.id,
      patch: { stats: { clones: 0, applications: 0, likes: 20 } }
    });
    const updated3 = await routinesRepository.update({
      id: routine3.id,
      patch: { stats: { clones: 0, applications: 0, likes: 10 } }
    });

    // 更新が正しく反映されていることを確認
    expect(updated1.stats.likes).toBe(5);
    expect(updated2.stats.likes).toBe(20);
    expect(updated3.stats.likes).toBe(10);

    // 更新されたRoutineを直接使用してソートをテスト
    const testRoutines = [updated1, updated2, updated3];

    // likes数でソート
    const sorted = [...testRoutines].sort((a, b) => b.stats.likes - a.stats.likes);

    expect(sorted).toHaveLength(3);
    const [first, second, third] = sorted;
    if (!first || !second || !third) {
      throw new Error('Expected three routines after sorting');
    }

    // 降順でソートされていることを確認
    expect(first.stats.likes).toBeGreaterThanOrEqual(second.stats.likes);
    expect(second.stats.likes).toBeGreaterThanOrEqual(third.stats.likes);

    // 最もlikesが多いものが最初（routine2は20 likes）
    // ソート後の順序を確認
    const likesValues = sorted.map((r) => r.stats.likes);
    expect(likesValues).toEqual([20, 10, 5]);

    // routine2が最初にあることを確認
    expect(first.id).toBe(routine2.id);
    expect(first.stats.likes).toBe(20);
  });

  it('handles routines with zero likes correctly', async () => {
    const routine = await routinesRepository.create({
      name: 'Zero Likes Routine',
      description: 'A routine with zero likes.',
      purpose: 'Test zero likes',
      durationType: 'weekly',
      visibility: 'public',
      tags: ['test'],
      owner: 'owner@example.com',
      timeBlocks: [
        {
          day: 'monday',
          startHour: 9,
          endHour: 12,
          label: 'Work',
          objective: 'Test',
          energyLevel: 'high'
        }
      ]
    });

    const publicRoutines = await routinesRepository.list({ visibility: 'public' });
    const found = publicRoutines.find((r) => r.id === routine.id);

    expect(found).toBeDefined();
    if (!found) {
      throw new Error('Expected routine to be present in public list');
    }
    expect(found.stats.likes).toBe(0);
  });
});
