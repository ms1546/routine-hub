'use client';

import { useState, useTransition, FormEvent } from 'react';
import { useSession } from '@/shared/hooks/use-session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Button } from '@/shared/ui/button';
import type { UserSettings } from '@/features/users';
import type { ActionResult } from '@/shared/types/actionResult';
import type { UpdateUserSettingsPayload } from '@/app/actions/user-settings';

type UserSettingsFormProps = {
  userId: string;
  initialSettings: UserSettings;
  action: (payload: UpdateUserSettingsPayload) => Promise<ActionResult<UserSettings>>;
};

export function UserSettingsForm({ userId, initialSettings, action }: UserSettingsFormProps) {
  const [displayName, setDisplayName] = useState(initialSettings.displayName ?? '');
  const [timezone, setTimezone] = useState(initialSettings.timezone);
  const [requiredSleepHours, setRequiredSleepHours] = useState(initialSettings.requiredSleepHours);
  const [priorities, setPriorities] = useState(initialSettings.priorities.join('\n'));
  const [constraints, setConstraints] = useState(initialSettings.constraints.join('\n'));
  const [energyLevel, setEnergyLevel] = useState(initialSettings.energyLevel);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { update: updateSession } = useSession();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const result = await action({
          displayName: displayName || undefined,
          timezone,
          requiredSleepHours,
          priorities: priorities
            .split('\n')
            .map((p) => p.trim())
            .filter((p) => p.length > 0),
          constraints: constraints
            .split('\n')
            .map((c) => c.trim())
            .filter((c) => c.length > 0),
          energyLevel
        });
        if (result.ok) {
          // displayNameが変更された場合はセッションを更新
          if (displayName && displayName !== initialSettings.displayName) {
            await updateSession();
          }
          setStatus('設定を保存しました');
        } else {
          setStatus(`エラー: ${result.error}`);
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : '設定の保存に失敗しました');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ユーザー設定</CardTitle>
        <CardDescription>アカウント情報とAI最適化の基本設定を管理します</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="displayName">表示名</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="あなたの表示名"
              maxLength={80}
              required
            />
            <p className="text-xs text-muted-foreground">他のユーザーに表示される名前です</p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="timezone">タイムゾーン</Label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="relative h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/60"
            >
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="requiredSleepHours">必要睡眠時間（時間）</Label>
            <Input
              id="requiredSleepHours"
              type="number"
              min={4}
              max={12}
              value={requiredSleepHours}
              onChange={(e) => setRequiredSleepHours(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">AIがスケジュール最適化時に考慮する睡眠時間です</p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="priorities">優先順位（1行に1つ）</Label>
            <Textarea
              id="priorities"
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
              placeholder="集中時間を守る&#10;カレンダーの権威を尊重"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">AIが最適化時に優先すべき事項を記述してください</p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="constraints">制約（1行に1つ）</Label>
            <Textarea
              id="constraints"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="手動確認を好む&#10;午後は会議が多い"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">AIが考慮すべき制約を記述してください</p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="energyLevel">デフォルトエネルギーレベル</Label>
            <select
              id="energyLevel"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value as 'low' | 'medium' | 'high')}
              className="relative h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/60"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={pending}>
              {pending ? '保存中...' : '設定を保存'}
            </Button>
            {status && (
              <p className={`text-sm ${status.includes('エラー') ? 'text-destructive' : 'text-success'}`}>
                {status}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
