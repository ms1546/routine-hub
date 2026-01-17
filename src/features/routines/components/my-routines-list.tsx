'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [durationFilter, setDurationFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // フィルタリングとソート
  const filtered = routines.filter((routine) => {
    if (searchQuery && !routine.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !routine.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (tagFilter && !routine.tags.includes(tagFilter.toLowerCase())) {
      return false;
    }
    if (durationFilter && routine.durationType !== durationFilter) {
      return false;
    }
    return true;
  });

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

  const uniqueTags = Array.from(new Set(routines.flatMap((r) => r.tags))).sort();

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((r) => r.id)));
    }
  };

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

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const deletePromises = Array.from(selectedIds).map((id) => deleteRoutineAction({ routineId: id }));
      const results = await Promise.all(deletePromises);
      const failed = results.filter((r) => !r.ok);

      if (failed.length === 0) {
        setStatus(`${selectedIds.size}件のRoutineを削除しました`);
        setSelectedIds(new Set());
        setShowDeleteConfirm(false);
        window.location.reload();
      } else {
        setStatus(`エラー: ${failed.length}件の削除に失敗しました`);
      }
    });
  };

  const handleToggleVisibility = async (payload: VisibilityTogglePayload) => {
    return await updateRoutineVisibilityAction(payload);
  };

  return (
    <div className="space-y-6">
      {/* Routine作成 */}
      <RoutineComposer action={createRoutineAction} />

      {/* フィルター・ソート・検索 */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">検索</label>
              <Input
                type="text"
                placeholder="名前や説明で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">タグ</label>
              <select
                className="relative h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/60"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="">すべて</option>
                {uniqueTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">期間タイプ</label>
              <select
                className="relative h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/60"
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
              >
                <option value="">すべて</option>
                <option value="half-day">半日</option>
                <option value="full-day">1日</option>
                <option value="weekly">週次</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">並び順</label>
              <select
                className="relative h-10 rounded-lg border-2 border-input bg-background px-3 py-1.5 text-sm text-foreground transition-all duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="updatedAt">更新日順</option>
                <option value="createdAt">作成日順</option>
                <option value="popularity">人気順</option>
              </select>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size}件選択中
                </span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  一括削除
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  選択解除
                </Button>
              </div>
            )}
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleSelectAll}>
                {selectedIds.size === sorted.length ? 'すべて解除' : 'すべて選択'}
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((routine) => (
              <Card key={routine.id} className="flex h-full flex-col hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {routine.durationType}
                      </Badge>
                      <Badge variant={routine.visibility === 'public' ? 'primary' : 'outline'} className="text-xs">
                        {routine.visibility}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(routine.id)}
                        onChange={() => handleToggleSelection(routine.id)}
                        className="w-4 h-4 rounded border-input"
                      />
                      <VisibilityToggleButton
                        routineId={routine.id}
                        visibility={routine.visibility}
                        action={handleToggleVisibility}
                      />
                    </div>
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
                      <dt className="text-muted-foreground">Fork</dt>
                      <dd className="font-semibold">{routine.stats.forks}</dd>
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
                  <Link
                    href={`/routines/${routine.id}`}
                    className="flex-1"
                  >
                    <Button variant="default" size="sm" className="w-full">
                      詳細・編集
                    </Button>
                  </Link>
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
        title={selectedIds.size > 0 ? '一括削除の確認' : 'Routine削除の確認'}
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
              onClick={selectedIds.size > 0 ? confirmBulkDelete : confirmDelete}
              disabled={pending}
            >
              {pending ? '削除中...' : '削除'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size}件のRoutineを削除しますか？この操作は取り消せません。`
            : 'このRoutineを削除しますか？この操作は取り消せません。'}
        </p>
      </Modal>
    </div>
  );
}
