import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  CreateRoutineInput,
  Routine,
  RoutineBlock,
  RoutineBlockInput,
  RoutineFilter,
  RoutineVisibility,
  createRoutineSchema,
  normalizeTags,
  routineBlockInputSchema,
  routineSchema,
  updateRoutineSchema
} from './models';

const routineStore = new Map<string, Routine>();

const clone = <T>(value: T): T => structuredClone(value);

type SeedRoutine = CreateRoutineInput & {
  stats?: Routine['stats'];
  id?: string;
};

const seedRoutines: SeedRoutine[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Deep Focus Reset',
    description:
      '月曜午前に深い集中ブロック、午後に振り返りを置き、火曜は低刺激タスクで体力を戻す 4 ブロック構成。',
    purpose:
      'ハードな開発サイクルで疲弊する個人開発者が、ペースを崩さず成果物を届けられるよう支援する。',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['集中', '休息', 'リズム'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 32, applications: 141, likes: 15 },
    timeBlocks: [
      {
        id: '11111111-aaaa-4111-8111-aaaaaaaaaaaa',
        day: 'monday',
        startHour: 8,
        endHour: 12,
        label: '高精度ビルド',
        objective: '午前中のスタンドアップ前に主要成果物を仕上げる。',
        energyLevel: 'high'
      },
      {
        id: '11111111-bbbb-4111-8111-aaaaaaaaaaaa',
        day: 'monday',
        startHour: 14,
        endHour: 18,
        label: '制約ふりかえり',
        objective: '阻害要因を洗い出して非同期で共有し、翌日の準備を整える。',
        energyLevel: 'medium'
      },
      {
        id: '11111111-cccc-4111-8111-aaaaaaaaaaaa',
        day: 'tuesday',
        startHour: 9,
        endHour: 12,
        label: 'スロースタート回復',
        objective: '低刺激の事務処理とバックログ整理で脳の緊張をほどく。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Product Lead Syncopation',
    description:
      '意思決定とコーチングを週内で揺らぎなく配置し、突発案件のための遊びも残すリズム。',
    purpose:
      'ロードマップ・採用・育成を同時進行するリードが、齟齬なく意思決定できる状態を守る。',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['プロダクト', 'リーダーシップ'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 54, applications: 212, likes: 28 },
    timeBlocks: [
      {
        id: '22222222-aaaa-4222-8222-bbbbbbbbbbbb',
        day: 'wednesday',
        startHour: 9,
        endHour: 12,
        label: 'ロードマップ調律',
        objective: 'PM/Eng との優先順位すり合わせをまとめて実施。',
        energyLevel: 'high'
      },
      {
        id: '22222222-bbbb-4222-8222-bbbbbbbbbbbb',
        day: 'thursday',
        startHour: 13,
        endHour: 17,
        label: 'メンバーコーチング',
        objective: '1on1 と成長レビューを塊で行い、文脈切替を減らす。',
        energyLevel: 'medium'
      }
    ]
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Sabbatical Landing Gear',
    description:
      '長期休暇前の引き継ぎと心身の減速を 1 日でやり切るための 2 ブロック構成。',
    purpose:
      '休暇前後のギャップを軽減し、関係者の権限や期待を明文化しておく。',
    durationType: 'half-day',
    visibility: 'private',
    tags: ['休暇準備', '引き継ぎ'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 5, applications: 18, likes: 3 },
    timeBlocks: [
      {
        id: '33333333-aaaa-4333-8333-cccccccccccc',
        day: 'friday',
        startHour: 9,
        endHour: 12,
        label: '期待値すり合わせ',
        objective: '担当範囲と意思決定の委譲ラインを明確にする。',
        energyLevel: 'medium'
      },
      {
        id: '33333333-bbbb-4333-8333-cccccccccccc',
        day: 'friday',
        startHour: 13,
        endHour: 17,
        label: '知識ダンプ',
        objective: '業務ノウハウ・定例・依存関係をまとめて書き出す。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: '週末リセット',
    description: '週末に心身をリセットし、翌週に向けた準備を行う2ブロック構成。',
    purpose: '週末を有効活用し、月曜からのスタートをスムーズにする。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['週末', 'リセット', '準備'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 12, applications: 45, likes: 8 },
    timeBlocks: [
      {
        id: '44444444-aaaa-4444-8444-dddddddddddd',
        day: 'saturday',
        startHour: 9,
        endHour: 12,
        label: '週次レビュー',
        objective: '今週の成果と課題を振り返り、来週の優先順位を整理する。',
        energyLevel: 'medium'
      },
      {
        id: '44444444-bbbb-4444-8444-dddddddddddd',
        day: 'sunday',
        startHour: 14,
        endHour: 17,
        label: '翌週準備',
        objective: '来週のスケジュールを確認し、必要な準備を整える。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '55555555-5555-5555-8555-555555555555',
    name: 'リモートワーク集中',
    description: 'リモートワーク環境で集中力を最大化するための1日構成。',
    purpose: '在宅勤務でも高い生産性を維持し、ワークライフバランスを保つ。',
    durationType: 'full-day',
    visibility: 'public',
    tags: ['リモートワーク', '集中', '生産性'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 28, applications: 98, likes: 22 },
    timeBlocks: [
      {
        id: '55555555-aaaa-5555-8555-eeeeeeeeeeee',
        day: 'monday',
        startHour: 8,
        endHour: 12,
        label: '朝の集中セッション',
        objective: '最も重要なタスクを午前中に完了させる。',
        energyLevel: 'high'
      },
      {
        id: '55555555-bbbb-5555-8555-eeeeeeeeeeee',
        day: 'monday',
        startHour: 13,
        endHour: 16,
        label: '午後の協働時間',
        objective: 'チームとの連携やミーティングに充てる。',
        energyLevel: 'medium'
      },
      {
        id: '55555555-cccc-5555-8555-eeeeeeeeeeee',
        day: 'monday',
        startHour: 16,
        endHour: 19,
        label: '振り返りと整理',
        objective: '1日の成果を整理し、翌日の準備を行う。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: '朝の生産性ルーティン',
    description: '朝の時間を最大限活用するための半日構成。午前中の集中力を高める。',
    purpose: '朝の時間を有効活用し、1日の生産性を最大化する。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['朝活', '生産性', '集中'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 18, applications: 67, likes: 12 },
    timeBlocks: [
      {
        id: '66666666-aaaa-4666-8666-999999999999',
        day: 'monday',
        startHour: 6,
        endHour: 9,
        label: '朝の準備と計画',
        objective: '1日のタスクを整理し、優先順位を明確にする。',
        energyLevel: 'medium'
      },
      {
        id: '66666666-bbbb-4666-8666-aaaaaaaaaaaa',
        day: 'monday',
        startHour: 9,
        endHour: 12,
        label: '深い集中作業',
        objective: '最も重要なタスクに集中し、午前中に成果を出す。',
        energyLevel: 'high'
      }
    ]
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    name: '午後の協働時間',
    description: '午後の時間をチーム連携と調整に充てる半日構成。',
    purpose: '午後の時間を効果的に使い、チームとの連携を強化する。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['午後', '協働', '連携'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 14, applications: 52, likes: 9 },
    timeBlocks: [
      {
        id: '77777777-aaaa-4777-8777-cccccccccccc',
        day: 'tuesday',
        startHour: 13,
        endHour: 16,
        label: 'チームミーティング',
        objective: '定例ミーティングと1on1をまとめて実施する。',
        energyLevel: 'medium'
      },
      {
        id: '77777777-bbbb-4777-8777-dddddddddddd',
        day: 'tuesday',
        startHour: 16,
        endHour: 19,
        label: '調整とレビュー',
        objective: '進捗を確認し、翌日の準備を行う。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    name: '学習と成長の1日',
    description: '学習と実践を組み合わせた1日構成。新しいスキルを身につけながら成果も出す。',
    purpose: '継続的な学習と実践を両立し、スキルアップを加速する。',
    durationType: 'full-day',
    visibility: 'public',
    tags: ['学習', '成長', 'スキルアップ'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 22, applications: 89, likes: 17 },
    timeBlocks: [
      {
        id: '88888888-aaaa-4888-8888-eeeeeeeeeeee',
        day: 'wednesday',
        startHour: 8,
        endHour: 11,
        label: '学習時間',
        objective: '新しい技術や知識を学ぶ時間を確保する。',
        energyLevel: 'high'
      },
      {
        id: '88888888-bbbb-4888-8888-999999999999',
        day: 'wednesday',
        startHour: 11,
        endHour: 14,
        label: '実践と応用',
        objective: '学んだことを実際のプロジェクトに適用する。',
        energyLevel: 'high'
      },
      {
        id: '88888888-cccc-4888-8888-aaaaaaaaaaaa',
        day: 'wednesday',
        startHour: 15,
        endHour: 18,
        label: '振り返りと整理',
        objective: '学習内容を整理し、次回への準備を行う。',
        energyLevel: 'medium'
      }
    ]
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    name: '週次レビューと計画',
    description: '週の振り返りと次週の計画を立てる週次ルーティン。',
    purpose: '週単位で成果を振り返り、継続的な改善を実現する。',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['週次', 'レビュー', '計画'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 31, applications: 124, likes: 20 },
    timeBlocks: [
      {
        id: '99999999-aaaa-4999-8999-111111111111',
        day: 'friday',
        startHour: 14,
        endHour: 17,
        label: '週次振り返り',
        objective: '今週の成果と課題を振り返り、改善点を洗い出す。',
        energyLevel: 'medium'
      },
      {
        id: '99999999-bbbb-4999-8999-222222222222',
        day: 'friday',
        startHour: 17,
        endHour: 21,
        label: '次週計画',
        objective: '来週の目標とタスクを明確にし、優先順位を設定する。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: '早朝スタート',
    description: '早朝から始める半日ルーティン。朝の静けさを活用して集中作業を行う。',
    purpose: '早朝の時間を活用し、1日の生産性を高める。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['早朝', '集中', '生産性'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 9, applications: 34, likes: 6 },
    timeBlocks: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-333333333333',
        day: 'thursday',
        startHour: 5,
        endHour: 8,
        label: '早朝作業',
        objective: '静かな環境で集中が必要な作業を行う。',
        energyLevel: 'high'
      },
      {
        id: 'aaaaaaaa-bbbb-4aaa-8aaa-444444444444',
        day: 'thursday',
        startHour: 8,
        endHour: 11,
        label: '朝の整理',
        objective: '1日の準備を整え、優先タスクを明確にする。',
        energyLevel: 'medium'
      }
    ]
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: '朝型エナジー',
    description: '早朝から午前中にかけて最大の集中力を発揮する半日ルーチン。',
    purpose: '朝の高い集中力を活用し、重要なタスクを午前中に完了させる。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['朝型', '集中', '生産性'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 18, applications: 67, likes: 12 },
    timeBlocks: [
      {
        id: '66666666-aaaa-4666-8666-bbbbbbbbbbbb',
        day: 'monday',
        startHour: 6,
        endHour: 9,
        label: '早朝集中',
        objective: '最も重要なタスクを朝一番に取り組む。',
        energyLevel: 'high'
      },
      {
        id: '66666666-bbbb-4666-8666-cccccccccccc',
        day: 'monday',
        startHour: 9,
        endHour: 12,
        label: '午前セッション',
        objective: '続く重要なタスクを午前中に完了させる。',
        energyLevel: 'high'
      }
    ]
  },
  {
    id: '77777777-7777-4777-8777-777777777778',
    name: '午後集中モード',
    description: '午後から夕方にかけて集中力を高める半日ルーチン。',
    purpose: '午後の時間を有効活用し、創造的な作業や深い思考に充てる。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['午後', '集中', '創造性'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 14, applications: 52, likes: 9 },
    timeBlocks: [
      {
        id: '77777777-aaaa-4777-8777-999999999999',
        day: 'tuesday',
        startHour: 13,
        endHour: 16,
        label: '午後ディープワーク',
        objective: '集中が必要な作業に没頭する。',
        energyLevel: 'high'
      },
      {
        id: '77777777-bbbb-4777-8777-aaaaaaaaaaaa',
        day: 'tuesday',
        startHour: 16,
        endHour: 19,
        label: '振り返りと整理',
        objective: '1日の成果を整理し、翌日の準備を行う。',
        energyLevel: 'medium'
      }
    ]
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    name: '1日完結ルーチン',
    description: '朝から夜まで1日を通してバランス良く活動するフルデイルーチン。',
    purpose: '1日の時間を効率的に使い、ワークライフバランスを保つ。',
    durationType: 'full-day',
    visibility: 'public',
    tags: ['1日', 'バランス', '効率'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 35, applications: 128, likes: 31 },
    timeBlocks: [
      {
        id: '88888888-aaaa-4888-8888-999999999999',
        day: 'wednesday',
        startHour: 7,
        endHour: 10,
        label: '朝の準備',
        objective: '1日の計画を立て、重要なタスクを確認する。',
        energyLevel: 'medium'
      },
      {
        id: '88888888-bbbb-4888-8888-aaaaaaaaaaaa',
        day: 'wednesday',
        startHour: 10,
        endHour: 13,
        label: '午前集中',
        objective: '最も重要なタスクに集中する。',
        energyLevel: 'high'
      },
      {
        id: '88888888-cccc-4888-8888-bbbbbbbbbbbb',
        day: 'wednesday',
        startHour: 14,
        endHour: 17,
        label: '午後協働',
        objective: 'チームとの連携やミーティングに充てる。',
        energyLevel: 'medium'
      },
      {
        id: '88888888-dddd-4888-8888-cccccccccccc',
        day: 'wednesday',
        startHour: 18,
        endHour: 21,
        label: '夜の振り返り',
        objective: '1日の成果を振り返り、翌日の準備を行う。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    name: '週次学習ルーチン',
    description: '週を通して継続的に学習と実践を組み合わせる週次ルーチン。',
    purpose: '新しいスキルや知識を体系的に習得し、実践を通じて定着させる。',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['学習', 'スキルアップ', '継続'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 42, applications: 156, likes: 38 },
    timeBlocks: [
      {
        id: '99999999-aaaa-4999-8999-iiiiiiiiiiii',
        day: 'monday',
        startHour: 9,
        endHour: 12,
        label: '学習計画',
        objective: '今週の学習目標と計画を立てる。',
        energyLevel: 'medium'
      },
      {
        id: '99999999-bbbb-4999-8999-iiiiiiiiiiii',
        day: 'wednesday',
        startHour: 14,
        endHour: 17,
        label: '実践セッション',
        objective: '学んだ内容を実際に試してみる。',
        energyLevel: 'high'
      },
      {
        id: '99999999-cccc-4999-8999-iiiiiiiiiiii',
        day: 'friday',
        startHour: 15,
        endHour: 18,
        label: '振り返り',
        objective: '今週の学習を振り返り、次週の計画を立てる。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: '週末充電',
    description: '週末の朝と午後を活用して心身をリフレッシュする半日ルーチン。',
    purpose: '週末を有効活用し、来週に向けてエネルギーをチャージする。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['週末', 'リフレッシュ', '充電'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 25, applications: 89, likes: 19 },
    timeBlocks: [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-jjjjjjjjjjjj',
        day: 'saturday',
        startHour: 8,
        endHour: 11,
        label: '朝のリフレッシュ',
        objective: '運動や散歩で体を動かし、心身をリフレッシュする。',
        energyLevel: 'medium'
      },
      {
        id: 'aaaaaaaa-bbbb-4aaa-8aaa-jjjjjjjjjjjj',
        day: 'saturday',
        startHour: 14,
        endHour: 17,
        label: '午後の充電',
        objective: '読書や趣味の時間を楽しみ、創造性を高める。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: '夜型集中モード',
    description: '夕方から夜にかけて集中力を発揮する半日ルーチン。',
    purpose: '夜の静けさを活用し、深い思考や創造的な作業に集中する。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['夜型', '集中', '創造性'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 16, applications: 58, likes: 11 },
    timeBlocks: [
      {
        id: 'bbbbbbbb-aaaa-4bbb-8bbb-kkkkkkkkkkkk',
        day: 'thursday',
        startHour: 18,
        endHour: 21,
        label: '夜の集中作業',
        objective: '静かな環境で深い思考が必要な作業に取り組む。',
        energyLevel: 'high'
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-llllllllllll',
        day: 'thursday',
        startHour: 21,
        endHour: 24,
        label: '振り返りと整理',
        objective: '1日の成果を整理し、翌日の準備を行う。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: '週次バランス',
    description: '週を通してバランス良く活動する週次ルーティン。',
    purpose: '週全体を通して効率的に活動し、ワークライフバランスを保つ。',
    durationType: 'weekly',
    visibility: 'public',
    tags: ['週次', 'バランス', '効率'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 28, applications: 102, likes: 24 },
    timeBlocks: [
      {
        id: 'cccccccc-aaaa-4ccc-8ccc-mmmmmmmmmmmm',
        day: 'monday',
        startHour: 9,
        endHour: 12,
        label: '週のスタート',
        objective: '今週の目標を設定し、重要なタスクを確認する。',
        energyLevel: 'high'
      },
      {
        id: 'cccccccc-bbbb-4ccc-8ccc-nnnnnnnnnnnn',
        day: 'wednesday',
        startHour: 14,
        endHour: 17,
        label: '中間チェック',
        objective: '週の中間地点で進捗を確認し、調整を行う。',
        energyLevel: 'medium'
      },
      {
        id: 'cccccccc-cccc-4ccc-8ccc-999999999999',
        day: 'friday',
        startHour: 15,
        endHour: 18,
        label: '週の締め',
        objective: '今週の成果を振り返り、来週の準備を行う。',
        energyLevel: 'low'
      }
    ]
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    name: '朝活ルーティン',
    description: '早朝から午前中にかけて活動する半日ルーチン。',
    purpose: '朝の時間を最大限活用し、1日の生産性を高める。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['朝活', '生産性', '習慣'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 33, applications: 125, likes: 29 },
    timeBlocks: [
      {
        id: 'dddddddd-aaaa-4ddd-8ddd-pppppppppppp',
        day: 'tuesday',
        startHour: 6,
        endHour: 9,
        label: '早朝セッション',
        objective: '朝一番に最も重要なタスクに取り組む。',
        energyLevel: 'high'
      },
      {
        id: 'dddddddd-bbbb-4ddd-8ddd-qqqqqqqqqqqq',
        day: 'tuesday',
        startHour: 9,
        endHour: 12,
        label: '午前集中',
        objective: '続く重要なタスクを午前中に完了させる。',
        energyLevel: 'high'
      }
    ]
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: '午後イノベーション',
    description: '午後から夕方にかけて創造的な作業に集中する半日ルーチン。',
    purpose: '午後の時間を活用し、創造性を高める作業に集中する。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['午後', '創造性', 'イノベーション'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 19, applications: 71, likes: 15 },
    timeBlocks: [
      {
        id: 'eeeeeeee-aaaa-4eee-8eee-rrrrrrrrrrrr',
        day: 'friday',
        startHour: 13,
        endHour: 16,
        label: '創造的作業',
        objective: '新しいアイデアを考え、プロトタイプを作成する。',
        energyLevel: 'high'
      },
      {
        id: 'eeeeeeee-bbbb-4eee-8eee-ssssssssssss',
        day: 'friday',
        startHour: 16,
        endHour: 19,
        label: '実験と検証',
        objective: '新しいアプローチを試し、結果を検証する。',
        energyLevel: 'medium'
      }
    ]
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    name: '週末充実',
    description: '週末の朝と午後を活用して充実した時間を過ごす半日ルーチン。',
    purpose: '週末を有効活用し、心身をリフレッシュしながら成長する。',
    durationType: 'half-day',
    visibility: 'public',
    tags: ['週末', '充実', 'リフレッシュ'],
    owner: 'routinehub.dev@gmail.com',
    stats: { forks: 27, applications: 95, likes: 22 },
    timeBlocks: [
      {
        id: 'ffffffff-aaaa-4fff-8fff-999999999999',
        day: 'sunday',
        startHour: 8,
        endHour: 11,
        label: '朝のリフレッシュ',
        objective: '運動や散歩で体を動かし、心身をリフレッシュする。',
        energyLevel: 'medium'
      },
      {
        id: 'ffffffff-bbbb-4fff-8fff-aaaaaaaaaaaa',
        day: 'sunday',
        startHour: 14,
        endHour: 17,
        label: '学習と成長',
        objective: '新しいスキルを学んだり、趣味の時間を楽しむ。',
        energyLevel: 'low'
      }
    ]
  }
];

const hydrateRoutine = (input: SeedRoutine): Routine => {
  try {
    // シードデータのtimeBlocksからidを削除して、自動生成されるようにする
    const inputWithoutIds = {
      ...input,
      timeBlocks: input.timeBlocks.map(({ id, ...block }) => block)
    };
    const parsed = createRoutineSchema.parse(inputWithoutIds);
    const now = new Date();
    const routine: Routine = {
      id: input.id ?? randomUUID(),
      name: parsed.name,
      description: parsed.description,
      purpose: parsed.purpose,
      durationType: parsed.durationType,
      visibility: parsed.visibility,
      tags: normalizeTags(parsed.tags),
      owner: parsed.owner,
      createdAt: now,
      updatedAt: now,
      version: 1,
      timeBlocks: parsed.timeBlocks.map((block) => ({
        ...block,
        id: randomUUID()
      })),
      stats: input.stats ?? { forks: 0, applications: 0, likes: 0 }
    };

    routineSchema.parse(routine);
    return routine;
  } catch (error) {
    console.error(`Error hydrating routine "${input.name}":`, error);
    throw error;
  }
};

let loadedCount = 0;
let errorCount = 0;
seedRoutines.forEach((seed) => {
  try {
    const routine = hydrateRoutine(seed);
    routineStore.set(routine.id, routine);
    loadedCount++;
  } catch (error) {
    errorCount++;
    console.error(`Failed to hydrate routine "${seed.name}":`, error);
    // エラーが発生しても続行する
  }
});

// デバッグ: 読み込まれたRoutine数を確認
if (typeof window === 'undefined') {
  console.log(`[Routine Store] Seed data: total=${seedRoutines.length}, loaded=${loadedCount}, errors=${errorCount}, store size=${routineStore.size}`);
}

const applyFilter = (routine: Routine, filter?: RoutineFilter, currentUserId?: string): boolean => {
  if (!filter) {
    // フィルターがない場合、privateのRoutineは所有者のみ見える
    if (routine.visibility === 'private' && routine.owner !== currentUserId) {
      return false;
    }
    return true;
  }
  if (filter.visibility && routine.visibility !== filter.visibility) return false;
  if (filter.duration && routine.durationType !== filter.duration) return false;
  if (filter.tag && !routine.tags.includes(filter.tag.toLowerCase())) return false;

  // visibilityフィルターが'public'の場合、privateは除外
  // visibilityフィルターがない場合、privateは所有者のみ見える
  if (filter.visibility === 'public' && routine.visibility === 'private') {
    return false;
  }
  if (!filter.visibility && routine.visibility === 'private' && routine.owner !== currentUserId) {
    return false;
  }

  return true;
};

const list = async (filter?: RoutineFilter, currentUserId?: string): Promise<Routine[]> => {
  const allRoutines = Array.from(routineStore.values());
  const filtered = allRoutines.filter((routine) => applyFilter(routine, filter, currentUserId));
  if (typeof window === 'undefined') {
    console.log(`[Routine Store] list() called: total=${allRoutines.length}, filtered=${filtered.length}, filter=`, filter, `currentUserId=${currentUserId}`);
  }
  return filtered.map((routine) => clone(routine));
};

const get = async (id: string, currentUserId?: string): Promise<Routine | null> => {
  const routine = routineStore.get(id);
  if (!routine) return null;

  // privateのRoutineは所有者のみアクセス可能
  if (routine.visibility === 'private' && routine.owner !== currentUserId) {
    return null;
  }

  return clone(routine);
};

const create = async (input: CreateRoutineInput): Promise<Routine> => {
  const payload = createRoutineSchema.parse({ ...input, tags: normalizeTags(input.tags) });
  const now = new Date();
  const routine: Routine = {
    id: randomUUID(),
    version: 1,
    createdAt: now,
    updatedAt: now,
    stats: { forks: 0, applications: 0, likes: 0 },
    ...payload,
    tags: normalizeTags(payload.tags),
    timeBlocks: payload.timeBlocks.map((block) => ({
      ...block,
      id: block.id ?? randomUUID()
    }))
  };

  routineSchema.parse(routine);
  routineStore.set(routine.id, routine);
  return clone(routine);
};

const update = async (input: z.infer<typeof updateRoutineSchema>): Promise<Routine> => {
  const parsed = updateRoutineSchema.parse(input);
  const current = routineStore.get(parsed.id);

  if (!current) {
    throw new Error(`Routine ${parsed.id} not found`);
  }

  const patch = { ...parsed.patch } as Partial<Routine>;
  // statsを先に処理してから、patchの他のプロパティを適用
  const { stats: patchStats, ...restPatch } = patch;
  const next: Routine = {
    ...current,
    ...restPatch,
    tags: patch.tags ? normalizeTags(patch.tags) : current.tags,
    timeBlocks: patch.timeBlocks
      ? patch.timeBlocks.map((block) => ({
          ...block,
          id: block.id ?? randomUUID()
        }))
      : current.timeBlocks,
    stats: patchStats ? { ...current.stats, ...patchStats } : current.stats,
    updatedAt: new Date(),
    version: current.version + 1
  };

  routineSchema.parse(next);
  routineStore.set(next.id, next);
  return clone(next);
};

const addBlock = async (routineId: string, blockInput: RoutineBlockInput): Promise<RoutineBlock> => {
  const parsedBlock = routineBlockInputSchema.parse(blockInput);
  const routine = routineStore.get(routineId);
  if (!routine) {
    throw new Error(`Routine ${routineId} not found`);
  }

  const block: RoutineBlock = {
    ...parsedBlock,
    id: parsedBlock.id ?? randomUUID()
  };

  const next: Routine = {
    ...routine,
    timeBlocks: [...routine.timeBlocks, block],
    updatedAt: new Date(),
    version: routine.version + 1
  };

  routineSchema.parse(next);
  routineStore.set(next.id, next);
  return clone(block);
};

const fork = async (
  routineId: string,
  overrides: Partial<CreateRoutineInput> & { owner: string }
): Promise<Routine> => {
  const source = routineStore.get(routineId);
  if (!source) {
    throw new Error(`Routine ${routineId} not found`);
  }

  const forkInput: CreateRoutineInput = {
    name: overrides.name ?? `${source.name} (Fork)`,
    description: overrides.description ?? source.description,
    purpose: overrides.purpose ?? source.purpose,
    durationType: overrides.durationType ?? source.durationType,
    visibility: overrides.visibility ?? 'private',
    tags: overrides.tags ?? source.tags,
    owner: overrides.owner,
    timeBlocks: overrides.timeBlocks ?? source.timeBlocks.map((block) => ({
      ...block,
      id: randomUUID()
    }))
  };

  const forked = await create(forkInput);
  const sourceRoutine = routineStore.get(routineId);
  if (sourceRoutine) {
    routineStore.set(routineId, {
      ...sourceRoutine,
      stats: {
        ...sourceRoutine.stats,
        forks: sourceRoutine.stats.forks + 1
      }
    });
  }
  return forked;
};

const recordApplication = async (routineId: string): Promise<Routine | null> => {
  const routine = routineStore.get(routineId);
  if (!routine) return null;
  const next: Routine = {
    ...routine,
    stats: {
      ...routine.stats,
      applications: routine.stats.applications + 1
    },
    updatedAt: new Date(),
    version: routine.version + 1
  };
  routineStore.set(next.id, next);
  return clone(next);
};

// ユーザーごとのLike状態を管理（routineId -> Set<userId>）
const routineLikesStore = new Map<string, Set<string>>();

const toggleLike = async (routineId: string, userId: string): Promise<{ liked: boolean; likes: number }> => {
  const routine = routineStore.get(routineId);
  if (!routine) {
    throw new Error(`Routine ${routineId} not found`);
  }

  const likes = routineLikesStore.get(routineId) ?? new Set<string>();
  const isLiked = likes.has(userId);

  if (isLiked) {
    // Unlike
    likes.delete(userId);
    routineLikesStore.set(routineId, likes);
    const updatedLikes = Math.max(0, routine.stats.likes - 1);
    const updated: Routine = {
      ...routine,
      stats: {
        ...routine.stats,
        likes: updatedLikes
      },
      updatedAt: new Date(),
      version: routine.version + 1
    };
    routineSchema.parse(updated);
    routineStore.set(routineId, updated);
    return { liked: false, likes: updatedLikes };
  } else {
    // Like
    likes.add(userId);
    routineLikesStore.set(routineId, likes);
    const updatedLikes = routine.stats.likes + 1;
    const updated: Routine = {
      ...routine,
      stats: {
        ...routine.stats,
        likes: updatedLikes
      },
      updatedAt: new Date(),
      version: routine.version + 1
    };
    routineSchema.parse(updated);
    routineStore.set(routineId, updated);
    return { liked: true, likes: updatedLikes };
  }
};

const isLikedByUser = (routineId: string, userId: string): boolean => {
  const likes = routineLikesStore.get(routineId);
  return likes?.has(userId) ?? false;
};

export const routinesRepository = {
  list,
  get,
  create,
  update,
  addBlock,
  fork,
  recordApplication,
  toggleLike,
  isLikedByUser
};
