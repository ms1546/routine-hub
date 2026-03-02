/**
 * DynamoDB にルーチンを直接投入するスクリプト（本番テーブル固定）
 *
 * 使い方:
 *   OWNER_EMAIL=your@email.com npm run seed:dynamodb
 *
 * 環境変数:
 *   OWNER_EMAIL - ルーチンの owner（省略時: routunehub.dev@gmail.com）
 *   AWS_REGION / DYNAMODB_ENDPOINT - 通常の DynamoDB 接続に使用
 */

import { randomUUID } from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocumentClient } from '../src/infrastructure/db/dynamodb-client';
import { routineSchema } from '../src/features/routines/domain/models';

/** 本番デプロイで使用しているテーブル名（固定） */
const ROUTINES_TABLE = 'routune-hub-production-routines';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'routunehub.dev@gmail.com';

type BlockInput = {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startHour: number;
  endHour: number;
  label: string;
  objective: string;
  energyLevel: 'low' | 'medium' | 'high';
};

type RoutineInput = {
  name: string;
  description: string;
  purpose: string;
  durationType: 'weekly' | 'normal';
  visibility: 'public' | 'private';
  tags: string[];
  timeBlocks: BlockInput[];
  normalStartHour?: number;
  normalEndHour?: number;
};

const SEED_ROUTINES: RoutineInput[] = [
  {
    name: '朝の集中ルーティン',
    description: '午前中の集中ブロックで深い作業を行う。文献テスト・衝突テストの両方に使える。',
    purpose: '集中力の維持と朝の生産性向上',
    durationType: 'weekly',
    visibility: 'private',
    tags: ['集中', '朝活'],
    timeBlocks: [
      { day: 'monday', startHour: 9, endHour: 12, label: '集中ブロック', objective: 'ディープワーク・資料作成', energyLevel: 'medium' }
    ]
  },
  {
    name: '睡眠ルーティン',
    description: '就寝前の習慣。同種（睡眠）との重なりで「調整不要」を試す用。',
    purpose: '睡眠の質の向上と就寝前のリラックス',
    durationType: 'weekly',
    visibility: 'private',
    tags: ['睡眠', '夜間'],
    timeBlocks: [
      { day: 'monday', startHour: 22, endHour: 23, label: '就寝準備', objective: '読書・ストレッチでリラックス', energyLevel: 'low' },
      { day: 'wednesday', startHour: 22, endHour: 23, label: '就寝準備', objective: '読書・ストレッチでリラックス', energyLevel: 'low' },
      { day: 'friday', startHour: 22, endHour: 23, label: '就寝準備', objective: '読書・ストレッチでリラックス', energyLevel: 'low' }
    ]
  },
  {
    name: '週間フロー（複数ブロック）',
    description: '月・水・金の午前ブロック。プレビュー件数が多くカスタマイズ結果を確認しやすい。',
    purpose: '週を通した生産性と習慣の定着',
    durationType: 'weekly',
    visibility: 'private',
    tags: ['週間', '習慣'],
    timeBlocks: [
      { day: 'monday', startHour: 9, endHour: 12, label: '月曜ブロック', objective: '週初めの計画', energyLevel: 'medium' },
      { day: 'wednesday', startHour: 9, endHour: 12, label: '水曜ブロック', objective: '中間レビュー', energyLevel: 'medium' },
      { day: 'friday', startHour: 9, endHour: 12, label: '金曜ブロック', objective: '週末振り返り', energyLevel: 'medium' }
    ]
  },
  {
    name: 'エンジニア修行',
    description: 'コード・設計・振り返りの時間を週で確保する。',
    purpose: '継続的な技術力向上と実践的なスキル習得',
    durationType: 'weekly',
    visibility: 'private',
    tags: ['エンジニア', '学習'],
    timeBlocks: [
      { day: 'monday', startHour: 10, endHour: 12, label: 'コード読書', objective: 'OSSや社内コードを読む', energyLevel: 'medium' },
      { day: 'wednesday', startHour: 14, endHour: 16, label: '実装ブロック', objective: '小さな機能を実装する', energyLevel: 'high' },
      { day: 'friday', startHour: 9, endHour: 10, label: '週次振り返り', objective: '学びをメモ・共有', energyLevel: 'low' }
    ]
  },
  {
    name: '朝活読書',
    description: '朝の30分で読書習慣をつける。',
    purpose: '読書習慣の定着とインプットの確保',
    durationType: 'weekly',
    visibility: 'private',
    tags: ['読書', '朝活'],
    timeBlocks: [
      { day: 'monday', startHour: 6, endHour: 6.5, label: '朝読', objective: '技術書またはビジネス書', energyLevel: 'low' },
      { day: 'tuesday', startHour: 6, endHour: 6.5, label: '朝読', objective: '技術書またはビジネス書', energyLevel: 'low' },
      { day: 'wednesday', startHour: 6, endHour: 6.5, label: '朝読', objective: '技術書またはビジネス書', energyLevel: 'low' },
      { day: 'thursday', startHour: 6, endHour: 6.5, label: '朝読', objective: '技術書またはビジネス書', energyLevel: 'low' },
      { day: 'friday', startHour: 6, endHour: 6.5, label: '朝読', objective: '技術書またはビジネス書', energyLevel: 'low' },
      { day: 'saturday', startHour: 6, endHour: 6.5, label: '朝読', objective: '技術書またはビジネス書', energyLevel: 'low' }
    ]
  },
  {
    name: '運動習慣',
    description: '週3回の運動で体調を整える。',
    purpose: '運動習慣の定着と健康維持',
    durationType: 'weekly',
    visibility: 'private',
    tags: ['運動', '健康'],
    timeBlocks: [
      { day: 'tuesday', startHour: 7, endHour: 8, label: 'ランニング', objective: '30分走＋ストレッチ', energyLevel: 'high' },
      { day: 'thursday', startHour: 7, endHour: 8, label: 'ランニング', objective: '30分走＋ストレッチ', energyLevel: 'high' },
      { day: 'saturday', startHour: 9, endHour: 10, label: '筋トレ', objective: '自宅またはジム', energyLevel: 'medium' }
    ]
  },
  {
    name: 'デイリーレビュー',
    description: '毎日夕方に短い振り返りを入れる。',
    purpose: '日次の振り返りで改善サイクルを回す',
    durationType: 'normal',
    visibility: 'private',
    tags: ['振り返り', '習慣'],
    normalStartHour: 17,
    normalEndHour: 20,
    timeBlocks: [
      { day: 'monday', startHour: 17, endHour: 17.5, label: '振り返り', objective: '今日の3行メモ', energyLevel: 'low' },
      { day: 'tuesday', startHour: 17, endHour: 17.5, label: '振り返り', objective: '今日の3行メモ', energyLevel: 'low' },
      { day: 'wednesday', startHour: 17, endHour: 17.5, label: '振り返り', objective: '今日の3行メモ', energyLevel: 'low' },
      { day: 'thursday', startHour: 17, endHour: 17.5, label: '振り返り', objective: '今日の3行メモ', energyLevel: 'low' },
      { day: 'friday', startHour: 17, endHour: 17.5, label: '振り返り', objective: '今日の3行メモ', energyLevel: 'low' },
      { day: 'saturday', startHour: 17, endHour: 17.5, label: '振り返り', objective: '今日の3行メモ', energyLevel: 'low' },
      { day: 'sunday', startHour: 17, endHour: 17.5, label: '振り返り', objective: '今日の3行メモ', energyLevel: 'low' }
    ]
  }
];

async function seedRoutines() {
  const now = new Date();
  const nowStr = now.toISOString();
  for (const input of SEED_ROUTINES) {
    const routineId = randomUUID();
    const timeBlocks = input.timeBlocks.map((b) => ({
      ...b,
      id: randomUUID()
    }));
    const item = {
      routineId,
      name: input.name,
      description: input.description,
      purpose: input.purpose,
      durationType: input.durationType,
      visibility: input.visibility,
      tags: input.tags,
      owner: OWNER_EMAIL,
      createdAt: nowStr,
      updatedAt: nowStr,
      version: 1,
      timeBlocks,
      ...(input.normalStartHour != null && { normalStartHour: input.normalStartHour }),
      ...(input.normalEndHour != null && { normalEndHour: input.normalEndHour }),
      stats: { clones: 0, applications: 0, likes: 0 }
    };
    // 本番の fromRoutineRecord → routineSchema.parse と同じ形にして検証（投入前にスキーマ違反を検出）
    const forValidation = {
      id: routineId,
      name: item.name,
      description: item.description,
      purpose: item.purpose,
      durationType: item.durationType,
      visibility: item.visibility,
      tags: item.tags ?? [],
      owner: item.owner,
      createdAt: now,
      updatedAt: now,
      version: item.version,
      timeBlocks: item.timeBlocks,
      normalStartHour: item.normalStartHour,
      normalEndHour: item.normalEndHour,
      stats: item.stats
    };
    routineSchema.parse(forValidation);

    await dynamoDBDocumentClient.send(
      new PutCommand({
        TableName: ROUTINES_TABLE,
        Item: item
      })
    );
    console.log(`[OK] Routine: ${input.name} (${routineId})`);
  }
}

async function main() {
  console.log(`Owner: ${OWNER_EMAIL}`);
  console.log(`Table: ${ROUTINES_TABLE}`);
  await seedRoutines();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
