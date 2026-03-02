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
import { emailToAccountName, routineSchema } from '../src/features/routines/domain/models';

/** 本番デプロイで使用しているテーブル名（固定） */
const ROUTINES_TABLE = 'routune-hub-production-routines';

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'routunehub.dev@gmail.com';

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type BlockWithoutDay = {
  startHour: number;
  endHour: number;
  label: string;
  objective: string;
  energyLevel: 'low' | 'medium' | 'high';
};

/** Day中心: 曜日ごとにブロックをまとめて定義 */
type DaySchedule = Partial<Record<Weekday, BlockWithoutDay[]>>;

type RoutineInput = {
  name: string;
  description: string;
  purpose: string;
  durationType: 'weekly' | 'normal';
  visibility: 'public' | 'private';
  tags: string[];
  schedule: DaySchedule;
  normalStartHour?: number;
  normalEndHour?: number;
};

/** 同じブロックを複数曜日に配置するヘルパー */
function onDays(days: Weekday[], block: BlockWithoutDay): DaySchedule {
  return Object.fromEntries(days.map((d) => [d, [block]])) as DaySchedule;
}

/** schedule を timeBlocks に変換 */
function scheduleToTimeBlocks(schedule: DaySchedule): Array<BlockWithoutDay & { day: Weekday }> {
  const weekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const blocks: Array<BlockWithoutDay & { day: Weekday }> = [];
  for (const day of weekdays) {
    const dayBlocks = schedule[day];
    if (!dayBlocks) continue;
    for (const b of dayBlocks) {
      blocks.push({ ...b, day });
    }
  }
  return blocks;
}

/** Day タイプ（normal）のルーチンを多数投入。各ルーチンは 1 日の時間範囲（normalStartHour〜normalEndHour）内にブロックを持つ */
const SEED_ROUTINES: RoutineInput[] = [
  {
    name: '朝の集中ルーティン',
    description: '午前中の集中ブロックで深い作業を行う。文献テスト・衝突テストの両方に使える。',
    purpose: '集中力の維持と朝の生産性向上',
    durationType: 'normal',
    visibility: 'private',
    tags: ['集中', '朝活'],
    normalStartHour: 9,
    normalEndHour: 12,
    schedule: {
      monday: [{ startHour: 9, endHour: 12, label: '集中ブロック', objective: 'ディープワーク・資料作成', energyLevel: 'medium' }]
    }
  },
  {
    name: '睡眠ルーティン',
    description: '就寝前の習慣。同種（睡眠）との重なりで「調整不要」を試す用。',
    purpose: '睡眠の質の向上と就寝前のリラックス',
    durationType: 'normal',
    visibility: 'private',
    tags: ['睡眠', '夜間'],
    normalStartHour: 21,
    normalEndHour: 24,
    schedule: onDays(['monday', 'wednesday', 'friday'], {
      startHour: 22,
      endHour: 23,
      label: '就寝準備',
      objective: '読書・ストレッチでリラックス',
      energyLevel: 'low'
    })
  },
  {
    name: '午前フロー（複数ブロック）',
    description: '月・水・金の午前ブロック。プレビュー件数が多くカスタマイズ結果を確認しやすい。',
    purpose: '週を通した生産性と習慣の定着',
    durationType: 'normal',
    visibility: 'private',
    tags: ['週間', '習慣'],
    normalStartHour: 9,
    normalEndHour: 12,
    schedule: {
      monday: [{ startHour: 9, endHour: 12, label: '月曜ブロック', objective: '週初めの計画', energyLevel: 'medium' }],
      wednesday: [{ startHour: 9, endHour: 12, label: '水曜ブロック', objective: '中間レビュー', energyLevel: 'medium' }],
      friday: [{ startHour: 9, endHour: 12, label: '金曜ブロック', objective: '週末振り返り', energyLevel: 'medium' }]
    }
  },
  {
    name: 'エンジニア修行',
    description: 'コード・設計・振り返りの時間を週で確保する。',
    purpose: '継続的な技術力向上と実践的なスキル習得',
    durationType: 'normal',
    visibility: 'private',
    tags: ['エンジニア', '学習'],
    normalStartHour: 9,
    normalEndHour: 16,
    schedule: {
      monday: [{ startHour: 10, endHour: 12, label: 'コード読書', objective: 'OSSや社内コードを読む', energyLevel: 'medium' }],
      wednesday: [{ startHour: 14, endHour: 16, label: '実装ブロック', objective: '小さな機能を実装する', energyLevel: 'high' }],
      friday: [{ startHour: 9, endHour: 10, label: '週次振り返り', objective: '学びをメモ・共有', energyLevel: 'low' }]
    }
  },
  {
    name: '朝活読書',
    description: '朝の30分で読書習慣をつける。',
    purpose: '読書習慣の定着とインプットの確保',
    durationType: 'normal',
    visibility: 'private',
    tags: ['読書', '朝活'],
    normalStartHour: 6,
    normalEndHour: 9,
    schedule: onDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], {
      startHour: 6,
      endHour: 6.5,
      label: '朝読',
      objective: '技術書またはビジネス書',
      energyLevel: 'low'
    })
  },
  {
    name: '運動習慣',
    description: '週3回の運動で体調を整える。',
    purpose: '運動習慣の定着と健康維持',
    durationType: 'normal',
    visibility: 'private',
    tags: ['運動', '健康'],
    normalStartHour: 7,
    normalEndHour: 10,
    schedule: {
      tuesday: [{ startHour: 7, endHour: 8, label: 'ランニング', objective: '30分走＋ストレッチ', energyLevel: 'high' }],
      thursday: [{ startHour: 7, endHour: 8, label: 'ランニング', objective: '30分走＋ストレッチ', energyLevel: 'high' }],
      saturday: [{ startHour: 9, endHour: 10, label: '筋トレ', objective: '自宅またはジム', energyLevel: 'medium' }]
    }
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
    schedule: onDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], {
      startHour: 17,
      endHour: 17.5,
      label: '振り返り',
      objective: '今日の3行メモ',
      energyLevel: 'low'
    })
  },
  // ブロック数が多いルーチン
  {
    name: '週間マルチブロック',
    description: '毎日2ブロックで朝と昼の習慣を確保。ブロック数14。',
    purpose: '朝・昼の習慣を週7日で定着させる',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['習慣', '週間'],
    schedule: {
      monday: [
        { startHour: 7, endHour: 8, label: '朝の運動', objective: '軽いストレッチ・散歩', energyLevel: 'medium' },
        { startHour: 12, endHour: 13, label: '昼休み読書', objective: '30分読書', energyLevel: 'low' }
      ],
      tuesday: [
        { startHour: 7, endHour: 8, label: '朝の運動', objective: '軽いストレッチ・散歩', energyLevel: 'medium' },
        { startHour: 12, endHour: 13, label: '昼休み読書', objective: '30分読書', energyLevel: 'low' }
      ],
      wednesday: [
        { startHour: 7, endHour: 8, label: '朝の運動', objective: '軽いストレッチ・散歩', energyLevel: 'medium' },
        { startHour: 12, endHour: 13, label: '昼休み読書', objective: '30分読書', energyLevel: 'low' }
      ],
      thursday: [
        { startHour: 7, endHour: 8, label: '朝の運動', objective: '軽いストレッチ・散歩', energyLevel: 'medium' },
        { startHour: 12, endHour: 13, label: '昼休み読書', objective: '30分読書', energyLevel: 'low' }
      ],
      friday: [
        { startHour: 7, endHour: 8, label: '朝の運動', objective: '軽いストレッチ・散歩', energyLevel: 'medium' },
        { startHour: 12, endHour: 13, label: '昼休み読書', objective: '30分読書', energyLevel: 'low' }
      ],
      saturday: [
        { startHour: 8, endHour: 9, label: '朝の運動', objective: '週末はゆっくり', energyLevel: 'medium' },
        { startHour: 14, endHour: 15, label: '午後読書', objective: 'まとめて読書', energyLevel: 'low' }
      ],
      sunday: [
        { startHour: 8, endHour: 9, label: '朝の運動', objective: '週末はゆっくり', energyLevel: 'medium' },
        { startHour: 14, endHour: 15, label: '午後読書', objective: 'まとめて読書', energyLevel: 'low' }
      ]
    }
  },
  {
    name: '毎日3セッション',
    description: '朝・昼・夕の3ブロックを毎日。ブロック数21。',
    purpose: '1日を3つのセッションに分けて集中力を維持',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['集中', '生産性'],
    schedule: {
      monday: [
        { startHour: 7, endHour: 9, label: '朝セッション', objective: 'ディープワーク・計画', energyLevel: 'high' },
        { startHour: 12, endHour: 14, label: '昼セッション', objective: 'ミーティング・軽作業', energyLevel: 'medium' },
        { startHour: 18, endHour: 20, label: '夕セッション', objective: '学習・副業', energyLevel: 'medium' }
      ],
      tuesday: [
        { startHour: 7, endHour: 9, label: '朝セッション', objective: 'ディープワーク・計画', energyLevel: 'high' },
        { startHour: 12, endHour: 14, label: '昼セッション', objective: 'ミーティング・軽作業', energyLevel: 'medium' },
        { startHour: 18, endHour: 20, label: '夕セッション', objective: '学習・副業', energyLevel: 'medium' }
      ],
      wednesday: [
        { startHour: 7, endHour: 9, label: '朝セッション', objective: 'ディープワーク・計画', energyLevel: 'high' },
        { startHour: 12, endHour: 14, label: '昼セッション', objective: 'ミーティング・軽作業', energyLevel: 'medium' },
        { startHour: 18, endHour: 20, label: '夕セッション', objective: '学習・副業', energyLevel: 'medium' }
      ],
      thursday: [
        { startHour: 7, endHour: 9, label: '朝セッション', objective: 'ディープワーク・計画', energyLevel: 'high' },
        { startHour: 12, endHour: 14, label: '昼セッション', objective: 'ミーティング・軽作業', energyLevel: 'medium' },
        { startHour: 18, endHour: 20, label: '夕セッション', objective: '学習・副業', energyLevel: 'medium' }
      ],
      friday: [
        { startHour: 7, endHour: 9, label: '朝セッション', objective: 'ディープワーク・計画', energyLevel: 'high' },
        { startHour: 12, endHour: 14, label: '昼セッション', objective: 'ミーティング・軽作業', energyLevel: 'medium' },
        { startHour: 18, endHour: 20, label: '夕セッション', objective: '学習・副業', energyLevel: 'medium' }
      ],
      saturday: [
        { startHour: 8, endHour: 10, label: '朝セッション', objective: '週末プロジェクト', energyLevel: 'high' },
        { startHour: 13, endHour: 15, label: '昼セッション', objective: '趣味・読書', energyLevel: 'low' },
        { startHour: 18, endHour: 19, label: '夕セッション', objective: '振り返り', energyLevel: 'low' }
      ],
      sunday: [
        { startHour: 8, endHour: 10, label: '朝セッション', objective: '週末プロジェクト', energyLevel: 'high' },
        { startHour: 13, endHour: 15, label: '昼セッション', objective: '趣味・読書', energyLevel: 'low' },
        { startHour: 18, endHour: 19, label: '夕セッション', objective: '振り返り', energyLevel: 'low' }
      ]
    }
  },
  {
    name: 'フルデイ・ワークデイ',
    description: '平日5日間で朝・昼の2ブロック。ブロック数10。',
    purpose: '平日の習慣を朝昼で区切って管理',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['平日', '習慣'],
    schedule: {
      monday: [
        { startHour: 8, endHour: 10, label: '朝ブロック', objective: 'メール・計画', energyLevel: 'medium' },
        { startHour: 14, endHour: 16, label: '午後ブロック', objective: '集中作業', energyLevel: 'high' }
      ],
      tuesday: [
        { startHour: 8, endHour: 10, label: '朝ブロック', objective: 'メール・計画', energyLevel: 'medium' },
        { startHour: 14, endHour: 16, label: '午後ブロック', objective: '集中作業', energyLevel: 'high' }
      ],
      wednesday: [
        { startHour: 8, endHour: 10, label: '朝ブロック', objective: 'メール・計画', energyLevel: 'medium' },
        { startHour: 14, endHour: 16, label: '午後ブロック', objective: '集中作業', energyLevel: 'high' }
      ],
      thursday: [
        { startHour: 8, endHour: 10, label: '朝ブロック', objective: 'メール・計画', energyLevel: 'medium' },
        { startHour: 14, endHour: 16, label: '午後ブロック', objective: '集中作業', energyLevel: 'high' }
      ],
      friday: [
        { startHour: 8, endHour: 10, label: '朝ブロック', objective: 'メール・計画', energyLevel: 'medium' },
        { startHour: 14, endHour: 16, label: '午後ブロック', objective: '集中作業・週次振り返り', energyLevel: 'high' }
      ]
    }
  }
];

async function seedRoutines() {
  const now = new Date();
  const nowStr = now.toISOString();
  for (const input of SEED_ROUTINES) {
    const routineId = randomUUID();
    const timeBlocks = scheduleToTimeBlocks(input.schedule).map((b) => ({
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
      owner: emailToAccountName(OWNER_EMAIL),
      ownerId: OWNER_EMAIL,
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
      ownerId: item.ownerId,
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
