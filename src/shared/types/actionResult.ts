export type ActionResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};
