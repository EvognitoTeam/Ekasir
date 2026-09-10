import {
  bigint,
  datetime,
  index,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

import { sql } from 'drizzle-orm';

/**
 * Disimpan terpisah dari users supaya:
 * - token reset dapat dibuat berkali-kali tanpa mengubah schema users;
 * - token dapat dibuat one-time;
 * - token dapat memiliki expiry;
 * - raw token TIDAK pernah disimpan di database.
 */
export const passwordResetTokens =
  mysqlTable(
    'password_reset_tokens',
    {
      id: bigint(
        'id',
        {
          mode: 'number',
          unsigned: true,
        },
      )
        .primaryKey()
        .autoincrement(),

      userId: bigint(
        'user_id',
        {
          mode: 'number',
          unsigned: true,
        },
      ).notNull(),

      tokenHash: varchar(
        'token_hash',
        {
          length: 64,
        },
      ).notNull(),

      expiresAt: datetime(
        'expires_at',
        {
          mode: 'date',
        },
      ).notNull(),

      usedAt: datetime(
        'used_at',
        {
          mode: 'date',
        },
      ),

      createdAt: datetime(
        'created_at',
        {
          mode: 'date',
        },
      )
        .notNull()
        .default(
          sql`CURRENT_TIMESTAMP`,
        ),

      updatedAt: datetime(
        'updated_at',
        {
          mode: 'date',
        },
      )
        .notNull()
        .default(
          sql`CURRENT_TIMESTAMP`,
        ),
    },
    (table) => ({
      tokenHashUnique:
        uniqueIndex(
          'uq_password_reset_token_hash',
        ).on(
          table.tokenHash,
        ),

      userIndex:
        index(
          'idx_password_reset_user',
        ).on(
          table.userId,
        ),

      expiryIndex:
        index(
          'idx_password_reset_expiry',
        ).on(
          table.expiresAt,
        ),
    }),
  );
