import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const userMappings = pgTable("user_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dahuaUserId: text("dahua_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const roomMappings = pgTable("room_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  doorChannel: integer("door_channel").notNull().unique(),
  roomEmail: text("room_email").notNull(),
  roomName: text("room_name"),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dahuaUserId: text("dahua_user_id"),
  userEmail: text("user_email"),
  doorChannel: integer("door_channel"),
  roomEmail: text("room_email"),
  eventType: text("event_type").notNull(), // 'FaceRecognition', 'AccessControl'
  accessGranted: boolean("access_granted").notNull(),
  reason: text("reason"), // 'valid-booking', 'no-booking', 'unauthorized', 'error'
  eventId: text("event_id"), // Microsoft Graph event ID if booking found
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"), // Store additional event data
});

export const systemHealth = pgTable("system_health", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: text("service").notNull(), // 'dahua', 'microsoft-graph', 'server'
  status: text("status").notNull(), // 'online', 'offline', 'warning'
  lastCheck: timestamp("last_check").defaultNow(),
  details: text("details"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUserMappingSchema = createInsertSchema(userMappings).omit({
  id: true,
  createdAt: true,
});

export const insertRoomMappingSchema = createInsertSchema(roomMappings).omit({
  id: true,
  createdAt: true,
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSystemHealthSchema = createInsertSchema(systemHealth).omit({
  id: true,
  lastCheck: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserMapping = typeof userMappings.$inferSelect;
export type InsertUserMapping = z.infer<typeof insertUserMappingSchema>;

export type RoomMapping = typeof roomMappings.$inferSelect;
export type InsertRoomMapping = z.infer<typeof insertRoomMappingSchema>;

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;

export type SystemHealth = typeof systemHealth.$inferSelect;
export type InsertSystemHealth = z.infer<typeof insertSystemHealthSchema>;

// API Response Types
export type AccessControlResponse = {
  success: boolean;
  accessGranted: boolean;
  reason: string;
  eventId?: string;
  timestamp: string;
  userEmail?: string;
  roomEmail?: string;
  meetingDetails?: any;
};

export type DahuaEventData = {
  AlarmType?: string;
  code?: string;
  Action?: string;
  action?: string;
  ChannelID?: number;
  index?: number;
  door?: number;
  Data?: {
    UserID?: string;
    userId?: string;
    PersonID?: string;
    Door?: number;
    door?: number;
    ChannelID?: number;
  };
};

export type TestEvent = {
  code: string;
  action: string;
  index: number;
  data: {
    UserID?: string;
    Door?: number;
  };
};
