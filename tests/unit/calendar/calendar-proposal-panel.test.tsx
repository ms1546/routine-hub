import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CalendarProposalPanel } from '@/components/routines/calendar-proposal-panel';

vi.mock('@/app/actions/calendar', () => ({
  confirmProposedEventsAction: vi.fn(() => Promise.resolve([]))
}));

describe('CalendarProposalPanel', () => {
  it('confirms proposals when button is clicked', async () => {
    const { confirmProposedEventsAction } = await import('@/app/actions/calendar');
    render(
      <CalendarProposalPanel
        routineId="test"
        proposedEvents={[
          {
            proposalId: 'proposal-1',
            routineId: 'test',
            blockId: 'block-1',
            title: '集中ブロック',
            description: '資料作成',
            start: '2025-02-01T09:00:00.000Z',
            end: '2025-02-01T12:00:00.000Z',
            status: 'pending'
          }
        ]}
        existingEvents={[]}
      />
    );

    const button = screen.getByRole('button', { name: /confirm and insert/i });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(confirmProposedEventsAction).toHaveBeenCalledWith({
      routineId: 'test',
      proposalIds: ['proposal-1']
    });
  });
});
