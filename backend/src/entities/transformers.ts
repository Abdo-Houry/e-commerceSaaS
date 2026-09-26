import type { ValueTransformer } from 'typeorm';

/** Postgres `bigint` comes back as a string; money stays well inside Number.MAX_SAFE_INTEGER. */
export const bigintToNumber: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
