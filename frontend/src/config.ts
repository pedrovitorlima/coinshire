export type Mode = 'user_1' | 'user_2';

export const USER1_ID = 'u1';
export const USER2_ID = 'u2';

export const USER1_NAME = (import.meta.env.VITE_USER1_NAME as string | undefined) ?? 'You';
export const USER2_NAME = (import.meta.env.VITE_USER2_NAME as string | undefined) ?? 'Alex';

export function nameFor(mode: Mode): string {
  return mode === 'user_1' ? USER1_NAME : USER2_NAME;
}

export function userIdFor(mode: Mode): string {
  return mode === 'user_1' ? USER1_ID : USER2_ID;
}
