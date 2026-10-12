import { describe, expect, it, vi } from 'vitest';
import { createQuizCompletionSender, sharingAuthorized } from './quizSharing';
import { ApiError } from './supabase';

describe('previously authorized quiz completion', () => {
 it('defaults to no collection and honors the guest override', () => {
  expect(sharingAuthorized(undefined, '')).toBe(false);
  expect(sharingAuthorized('off', '')).toBe(false);
  expect(sharingAuthorized('preauthorized', '')).toBe(true);
  expect(sharingAuthorized('preauthorized', '?sem-coleta=1')).toBe(false);
 });
 for (const kind of ['couple', 'compatibility'] as const) {
  it(`${kind}: sends answers once, with a new ID only after restart`, async () => {
   const send = vi.fn().mockResolvedValue({ok:true});
   const sender = createQuizCompletionSender(() => true, send);
   const answers = Array.from({length:10}, (_, i) => kind === 'couple' ? 'A' : `${i}-0`);
   sender.complete({kind,answers});sender.complete({kind,answers});
   expect(send).toHaveBeenCalledTimes(1);
   expect(send.mock.calls[0][0]).toMatchObject({kind,answers,consent:true});
   const id = send.mock.calls[0][0].submissionId;
   sender.reset();sender.complete({kind,answers});
   expect(send).toHaveBeenCalledTimes(2);
   expect(send.mock.calls[1][0].submissionId).not.toBe(id);
   await Promise.resolve();
  });
 }
 it('never sends without prior permission', () => {
  const send = vi.fn();const sender = createQuizCompletionSender(() => false, send);
  sender.complete({kind:'couple',answers:Array(10).fill('A')});expect(send).not.toHaveBeenCalled();
 });
 it('does not send on creation/revisiting; failures are diagnosed without answers and do not throw', async () => {
  const send = vi.fn().mockRejectedValue(new ApiError('private error',429));const report=vi.fn();
  const sender=createQuizCompletionSender(() => true,send,report);expect(send).not.toHaveBeenCalled();
  sender.complete({kind:'couple',answers:Array(10).fill('C')});
  await vi.waitFor(() => expect(report).toHaveBeenCalledWith({quiz:'couple',status:429}));
  sender.complete({kind:'couple',answers:Array(10).fill('C')});expect(send).toHaveBeenCalledTimes(1);
 });
});
