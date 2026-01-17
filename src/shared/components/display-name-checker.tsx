'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { DisplayNameModal } from './display-name-modal';
import { getUserSettingsAction } from '@/app/actions/user-settings';

export function DisplayNameChecker() {
  const { data: session, status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialDisplayName, setInitialDisplayName] = useState<string | undefined>(undefined);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const checkDisplayName = async () => {
        try {
          const result = await getUserSettingsAction();
          if (result.ok && result.data) {
            const settings = result.data;
            // displayNameが未設定またはデフォルト値（emailの@の前の部分）の場合はモーダルを表示
            const emailPrefix = session.user?.email?.split('@')[0] ?? '';
            const isDefaultDisplayName = !settings.displayName || settings.displayName === emailPrefix || settings.displayName === 'User';

            if (isDefaultDisplayName) {
              setUserId(session.user.id);
              setInitialDisplayName(session.user?.name ?? emailPrefix);
              setShowModal(true);
            }
          }
        } catch (error) {
          console.error('Failed to check display name:', error);
        } finally {
          setChecking(false);
        }
      };

      checkDisplayName();
    } else if (status === 'unauthenticated') {
      setChecking(false);
    }
  }, [status, session]);

  if (checking || !userId) {
    return null;
  }

  return (
    <DisplayNameModal
      open={showModal}
      userId={userId}
      initialDisplayName={initialDisplayName}
      onComplete={() => {
        setShowModal(false);
        // ページをリロードして更新されたdisplayNameを反映
        window.location.reload();
      }}
    />
  );
}
