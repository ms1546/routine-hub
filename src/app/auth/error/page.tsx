import { AppShell } from '@/shared/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { AppLink } from '@/shared/components/app-link';

export default function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AppShell title="認証エラー" description="ログイン中にエラーが発生しました">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>認証エラー</CardTitle>
            <CardDescription>ログイン中にエラーが発生しました</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ログイン処理中に問題が発生しました。もう一度お試しください。
            </p>
            <div className="flex gap-3">
              <AppLink href="/auth/signin">
                <Button>再度ログイン</Button>
              </AppLink>
              <AppLink href="/">
                <Button variant="outline">ホームに戻る</Button>
              </AppLink>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
