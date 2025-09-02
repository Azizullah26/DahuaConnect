import { 
  type User, 
  type InsertUser,
  type UserMapping,
  type InsertUserMapping,
  type RoomMapping,
  type InsertRoomMapping,
  type AccessLog,
  type InsertAccessLog,
  type SystemHealth,
  type InsertSystemHealth
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // User mapping operations
  getUserMappings(): Promise<UserMapping[]>;
  getUserMapping(dahuaUserId: string): Promise<UserMapping | undefined>;
  createUserMapping(mapping: InsertUserMapping): Promise<UserMapping>;
  deleteUserMapping(id: string): Promise<boolean>;

  // Room mapping operations
  getRoomMappings(): Promise<RoomMapping[]>;
  getRoomMapping(doorChannel: number): Promise<RoomMapping | undefined>;
  createRoomMapping(mapping: InsertRoomMapping): Promise<RoomMapping>;
  deleteRoomMapping(id: string): Promise<boolean>;

  // Access log operations
  getAccessLogs(limit?: number): Promise<AccessLog[]>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;

  // System health operations
  getSystemHealth(): Promise<SystemHealth[]>;
  updateSystemHealth(service: string, status: string, details?: string): Promise<SystemHealth>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userMappings: Map<string, UserMapping>;
  private roomMappings: Map<string, RoomMapping>;
  private accessLogs: AccessLog[];
  private systemHealth: Map<string, SystemHealth>;

  constructor() {
    this.users = new Map();
    this.userMappings = new Map();
    this.roomMappings = new Map();
    this.accessLogs = [];
    this.systemHealth = new Map();

    // Initialize with default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Default user mapping - based on your requirements
    const defaultUserMapping: UserMapping = {
      id: randomUUID(),
      dahuaUserId: "12345",
      email: "aziz@elrace.com", 
      name: "Aziz",
      createdAt: new Date(),
      isActive: true,
    };
    this.userMappings.set(defaultUserMapping.id, defaultUserMapping);

    // Default room mappings
    const defaultRooms = [
      { doorChannel: 1, roomEmail: "Room1@elrace.com", roomName: "Conference Room 1" },
      { doorChannel: 2, roomEmail: "Room2@elrace.com", roomName: "Conference Room 2" },
      { doorChannel: 3, roomEmail: "Room3@elrace.com", roomName: "Conference Room 3" },
      { doorChannel: 4, roomEmail: "Room4@elrace.com", roomName: "Conference Room 4" },
    ];

    defaultRooms.forEach(room => {
      const roomMapping: RoomMapping = {
        id: randomUUID(),
        doorChannel: room.doorChannel,
        roomEmail: room.roomEmail,
        roomName: room.roomName,
        createdAt: new Date(),
        isActive: true,
      };
      this.roomMappings.set(roomMapping.id, roomMapping);
    });

    // Default system health
    const services = ['dahua', 'microsoft-graph', 'server'];
    services.forEach(service => {
      const health: SystemHealth = {
        id: randomUUID(),
        service,
        status: 'online',
        lastCheck: new Date(),
        details: 'Service operational',
      };
      this.systemHealth.set(service, health);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUserMappings(): Promise<UserMapping[]> {
    return Array.from(this.userMappings.values()).filter(mapping => mapping.isActive);
  }

  async getUserMapping(dahuaUserId: string): Promise<UserMapping | undefined> {
    return Array.from(this.userMappings.values()).find(
      mapping => mapping.dahuaUserId === dahuaUserId && mapping.isActive
    );
  }

  async createUserMapping(mapping: InsertUserMapping): Promise<UserMapping> {
    const id = randomUUID();
    const userMapping: UserMapping = {
      ...mapping,
      id,
      createdAt: new Date(),
    };
    this.userMappings.set(id, userMapping);
    return userMapping;
  }

  async deleteUserMapping(id: string): Promise<boolean> {
    const mapping = this.userMappings.get(id);
    if (mapping) {
      mapping.isActive = false;
      return true;
    }
    return false;
  }

  async getRoomMappings(): Promise<RoomMapping[]> {
    return Array.from(this.roomMappings.values()).filter(mapping => mapping.isActive);
  }

  async getRoomMapping(doorChannel: number): Promise<RoomMapping | undefined> {
    return Array.from(this.roomMappings.values()).find(
      mapping => mapping.doorChannel === doorChannel && mapping.isActive
    );
  }

  async createRoomMapping(mapping: InsertRoomMapping): Promise<RoomMapping> {
    const id = randomUUID();
    const roomMapping: RoomMapping = {
      ...mapping,
      id,
      createdAt: new Date(),
    };
    this.roomMappings.set(id, roomMapping);
    return roomMapping;
  }

  async deleteRoomMapping(id: string): Promise<boolean> {
    const mapping = this.roomMappings.get(id);
    if (mapping) {
      mapping.isActive = false;
      return true;
    }
    return false;
  }

  async getAccessLogs(limit: number = 50): Promise<AccessLog[]> {
    return this.accessLogs
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
  }

  async createAccessLog(log: InsertAccessLog): Promise<AccessLog> {
    const id = randomUUID();
    const accessLog: AccessLog = {
      ...log,
      id,
      timestamp: new Date(),
    };
    this.accessLogs.push(accessLog);
    return accessLog;
  }

  async getSystemHealth(): Promise<SystemHealth[]> {
    return Array.from(this.systemHealth.values());
  }

  async updateSystemHealth(service: string, status: string, details?: string): Promise<SystemHealth> {
    let health = this.systemHealth.get(service);
    if (!health) {
      health = {
        id: randomUUID(),
        service,
        status,
        lastCheck: new Date(),
        details: details || '',
      };
    } else {
      health.status = status;
      health.lastCheck = new Date();
      health.details = details || health.details;
    }
    this.systemHealth.set(service, health);
    return health;
  }
}

export const storage = new MemStorage();
