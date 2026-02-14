import { AppLink } from '@/shared/components/app-link';
import { AppShell } from '@/shared/components/app-shell';
import { RoutineList } from '@/features/routines/components/routine-list';
import { buttonVariants } from '@/shared/ui/button-variants';
import { routinesRepository, toRoutineListItem } from '@/features/routines';
import { getCurrentUser } from '@/infrastructure/auth/session';

export default async function HomePage() {
  const currentUser = await getCurrentUser();

  // 公開されているRoutineのみを取得し、人気順（likes数）でソート
  const publicRoutines = await routinesRepository.list({ visibility: 'public' });
  const sortedByPopularity = publicRoutines
    .sort((a, b) => b.stats.likes - a.stats.likes)
    .slice(0, 6); // トップ6を表示

  const highlighted = sortedByPopularity.map(toRoutineListItem);

  return (
    <AppShell
      title="Routune Hub"
      description="人気のRoutineを発見し、あなたの生活に取り入れましょう"
      actions={
        <AppLink href="/routines" className={buttonVariants()}>
          ライブラリを探索
        </AppLink>
      }
    >
      <div className="space-y-8">
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-2">人気のRoutine</h2>
            <p className="text-muted-foreground">コミュニティで最も評価されているRoutineです</p>
          </div>
          <RoutineList routines={highlighted} userEmail={currentUser.email} />
        </section>

        <div className="text-center pt-8">
          <AppLink href="/routines" className={buttonVariants({ variant: 'outline' })}>
            すべてのRoutineを見る
          </AppLink>
        </div>
      </div>
    </AppShell>
  );
}
