import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(), // We use the unique task ID generated on client or server
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  deadline: text('deadline').notNull(),
  difficulty: text('difficulty').notNull(),
  estimatedHours: integer('estimated_hours').notNull(),
  priorityScore: integer('priority_score'),
  riskLevel: text('risk_level'),
  riskProbability: integer('risk_probability'),
  riskReason: text('risk_reason'),
  subtasksJson: text('subtasks_json'), // JSON stringified subtasks list
  scheduleJson: text('schedule_json'), // JSON stringified smart daily schedule
  recoveryPlanJson: text('recovery_plan_json'), // JSON stringified recovery plan
  recommendationsJson: text('recommendations_json'), // JSON stringified context-aware recommendations
  syncedToCalendar: boolean('synced_to_calendar').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));
