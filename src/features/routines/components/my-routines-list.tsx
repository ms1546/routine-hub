'use client';

import { useState, useTransition } from 'react';
import { AppLink } from '@/shared/components/app-link';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card';
import { Modal } from '@/shared/ui/modal';
import type { RoutineListItem } from '@/features/routines';
import type { VisibilityTogglePayload, DeleteRoutinePayload } from '@/features/routines/actions/routines';
import type { ActionResult } from '@/shared/types/actionResult';
import { updateRoutineVisibilityAction, deleteRoutineAction } from '@/features/routines/actions/routines';
import { RoutineScheduleVisualizationCompact } from './routine-schedule-visualization-compact';
import { VisibilityToggleButton } from './visibility-toggle-button';
import { RoutineComposer } from './routine-composer';
import { createRoutineAction } from '@/features/routines/actions/routines';

type SortOption = 'createdAt' | 'updatedAt' | 'popularity';

type MyRoutinesListProps = {
  routines: RoutineListItem[];
  userId: string;
  userEmail: string;
};

export function MyRoutinesList({ routines, userId, userEmail }: MyRoutinesListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ソート（フィルタリングは不要）
  const filtered = routines;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'createdAt') {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    }
    if (sortBy === 'updatedAt') {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    }
    if (sortBy === 'popularity') {
      return b.stats.likes - a.stats.likes;
    }
    return 0;
  });

  const handleDelete = (routineId: string) => {
    setDeletingId(routineId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!deletingId) return;

    startTransition(async () => {
      const result = await deleteRoutineAction({ routineId: deletingId });
      if (result.ok) {
        setStatus('Routineを削除しました');
        setShowDeleteConfirm(false);
        setDeletingId(null);
        // ページをリロードして最新の状態を取得
        window.location.reload();
      } else {
        setStatus(`エラー: ${result.error}`);
      }
    });
  };

  const handleToggleVisibility = async (payload: VisibilityTogglePayload) => {
    return await updateRoutineVisibilityAction(payload);
  };

  return (
    <div className="space-y-6">
      {/* Routine作成ボタン */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)}>
          新しいRoutineを作成
        </Button>
      </div>

      {/* Routine作成モーダル */}
      <RoutineComposer
        action={createRoutineAction}
        asModal={true}
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        userEmail={userEmail}
      />

      {/* 並び順 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">並び順</label>
            <select
              className="h-10 rounded-lg border-2 border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="updatedAt">更新日順</option>
              <option value="createdAt">作成日順</option>
              <option value="popularity">人気順</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Routine一覧 */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-muted-foreground">Routineが見つかりません</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {sorted.length}件のRoutine
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((routine) => (
              <Card key={routine.id} className="flex h-full flex-col hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {routine.durationType === 'normal' ? 'Day' : routine.durationType === 'weekly' ? 'Weekly' : routine.durationType}
                      </Badge>
                      <Badge variant={routine.visibility === 'public' ? 'primary' : 'outline'} className="text-xs">
                        {routine.visibility === 'public' ? '公開' : '非公開'}
                      </Badge>
                    </div>
                    <VisibilityToggleButton
                      routineId={routine.id}
                      visibility={routine.visibility}
                      action={handleToggleVisibility}
                    />
                  </div>
                  <div className="mt-2">
                    <CardTitle>{routine.name}</CardTitle>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{routine.purpose}</p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {routine.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {routine.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {routine.timeBlocks && routine.timeBlocks.length > 0 && (
                    <div className="py-2 border-t border-border/50 pt-4">
                      <RoutineScheduleVisualizationCompact
                        timeBlocks={routine.timeBlocks}
                        durationType={routine.durationType}
                      />
                    </div>
                  )}

                  {routine.createdAt && routine.updatedAt && (
                    <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                      <div>
                        <dt className="text-muted-foreground">作成日</dt>
                        <dd className="font-medium">{new Date(routine.createdAt).toLocaleDateString('ja-JP')}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">更新日</dt>
                        <dd className="font-medium">{new Date(routine.updatedAt).toLocaleDateString('ja-JP')}</dd>
                      </div>
                    </dl>
                  )}

                  <dl className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50 text-xs">
                    <div className="text-center">
                      <dt className="text-muted-foreground">Clone</dt>
                      <dd className="font-semibold">{routine.stats.clones}</dd>
                    </div>
                    <div className="text-center">
                      <dt className="text-muted-foreground">適用</dt>
                      <dd className="font-semibold">{routine.stats.applications}</dd>
                    </div>
                    <div className="text-center">
                      <dt className="text-muted-foreground">Like</dt>
                      <dd className="font-semibold">{routine.stats.likes}</dd>
                    </div>
                    <div className="text-center">
                      <dt className="text-muted-foreground">Hours</dt>
                      <dd className="font-semibold">{routine.totalHours}h</dd>
                    </div>
                  </dl>
                </CardContent>
                <CardFooter className="gap-2">
                  <AppLink
                    href={`/routines/${routine.id}`}
                    className="flex-1"
                  >
                    <Button variant="default" size="sm" className="w-full">
                      詳細・編集
                    </Button>
                  </AppLink>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(routine.id)}
                  >
                    削除
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ステータス表示 */}
      {status && (
        <div className={`p-4 rounded-lg ${status.includes('エラー') ? 'bg-destructive/10 border border-destructive/20' : 'bg-success/10 border border-success/20'}`}>
          <p className={`text-sm ${status.includes('エラー') ? 'text-destructive' : 'text-success'}`}>
            {status}
          </p>
        </div>
      )}

      {/* 削除確認モーダル */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingId(null);
        }}
        title="Routine削除の確認"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingId(null);
              }}
              disabled={pending}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? '削除中...' : '削除'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          このRoutineを削除しますか？この操作は取り消せません。
        </p>
      </Modal>
    </div>
  );
}
