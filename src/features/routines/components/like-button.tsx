'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/ui/button';
import type { ActionResult } from '@/shared/types/actionResult';
import type { ToggleLikePayload } from '@/features/routines/actions/routines';

type LikeButtonProps = {
  routineId: string;
  userId: string;
  initialLikes: number;
  initialLiked: boolean;
  action: (payload: ToggleLikePayload) => Promise<ActionResult<{ liked: boolean; likes: number }>>;
};

export function LikeButton({ routineId, userId, initialLikes, initialLiked, action }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [pending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const result = await action({ routineId, userId });
      if (result.ok && result.data) {
        setLiked(result.data.liked);
        setLikes(result.data.likes);
      }
    });
  };

  return (
    <Button
      type="button"
      variant={liked ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={pending}
      className="gap-2"
    >
      <svg
        className={`h-4 w-4 ${liked ? 'fill-current' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      <span>{likes}</span>
    </Button>
  );
}
