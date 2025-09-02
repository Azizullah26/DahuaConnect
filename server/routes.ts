import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { MicrosoftGraphService } from "./services/microsoft-graph";
import { DahuaService } from "./services/dahua";
import { 
  insertUserMappingSchema, 
  insertRoomMappingSchema, 
  insertAccessLogSchema,
  type DahuaEventData,
  type AccessControlResponse,
  type TestEvent
} from "@shared/schema";

// Initialize services
const graphService = new MicrosoftGraphService({
  clientId: process.env.AZURE_CLIENT_ID || '206217f2-eb5f-46f5-aa7e-f246c2a97ef5',
  tenantId: process.env.AZURE_TENANT_ID || '14a72467-3f25-4572-a535-3d5eddb00cc5',
  clientSecret: process.env.AZURE_CLIENT_SECRET || '4pT8Q~zhZE_PFKf9nnZCrLNJqqZpYaotFqebTcPu'
});

const dahuaService = new DahuaService({
  host: process.env.DAHUA_HOST || '10.255.254.11',
  port: parseInt(process.env.DAHUA_PORT || '80'),
  username: process.env.DAHUA_USER || 'admin',
  password: process.env.DAHUA_PASS || 'P@ssw0rd@247#'
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const systemHealth = await storage.getSystemHealth();
      const healthMap = systemHealth.reduce((acc, health) => {
        acc[health.service] = {
          status: health.status,
          lastCheck: health.lastCheck,
          details: health.details
        };
        return acc;
      }, {} as any);

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: healthMap,
        environment: {
          node_env: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 5000
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // User mappings endpoints
  app.get("/api/user-mappings", async (req, res) => {
    try {
      const mappings = await storage.getUserMappings();
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/user-mappings", async (req, res) => {
    try {
      const validatedData = insertUserMappingSchema.parse(req.body);
      const mapping = await storage.createUserMapping(validatedData);
      res.json(mapping);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
  });

  app.delete("/api/user-mappings/:id", async (req, res) => {
    try {
      const success = await storage.deleteUserMapping(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'User mapping not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Room mappings endpoints
  app.get("/api/room-mappings", async (req, res) => {
    try {
      const mappings = await storage.getRoomMappings();
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/room-mappings", async (req, res) => {
    try {
      const validatedData = insertRoomMappingSchema.parse(req.body);
      const mapping = await storage.createRoomMapping(validatedData);
      res.json(mapping);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid data' });
    }
  });

  app.delete("/api/room-mappings/:id", async (req, res) => {
    try {
      const success = await storage.deleteRoomMapping(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'Room mapping not found' });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Access logs endpoint
  app.get("/api/access-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getAccessLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // System health endpoint
  app.get("/api/system-health", async (req, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const logs = await storage.getAccessLogs(1000); // Get more logs for metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayLogs = logs.filter(log => 
        log.timestamp && new Date(log.timestamp) >= today
      );

      const totalAttempts = todayLogs.length;
      const successfulAccess = todayLogs.filter(log => log.accessGranted).length;
      const deniedAccess = totalAttempts - successfulAccess;
      const successRate = totalAttempts > 0 ? (successfulAccess / totalAttempts) * 100 : 0;

      const roomMappings = await storage.getRoomMappings();
      const activeRooms = roomMappings.filter(room => room.isActive).length;

      res.json({
        totalAttempts,
        successfulAccess,
        deniedAccess,
        successRate: Math.round(successRate * 10) / 10,
        activeRooms,
        totalRooms: roomMappings.length
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Main Dahua webhook endpoint
  app.post("/api/dahua-webhook", async (req, res) => {
    try {
      console.log(`\n🔔 Dahua webhook event received:`);
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);

      const eventData: DahuaEventData = req.body;
      const code = eventData.AlarmType || eventData.code || 'FaceRecognition';
      const action = eventData.Action || eventData.action || 'Start';
      const index = eventData.ChannelID || eventData.index || eventData.door || 1;
      const data = eventData.Data || eventData;

      const response: AccessControlResponse = {
        success: true,
        accessGranted: false,
        reason: 'Event processed',
        timestamp: new Date().toISOString()
      };

      if (action === 'Start' && (code === 'FaceRecognition' || code === 'AccessControl')) {
        console.log(`Code: ${code}, Action: ${action}, Index: ${index}`);

        // Extract user ID and door information
        const userId = data?.UserID || data?.userId || data?.PersonID || index.toString();
        const door = data?.Door || data?.door || data?.ChannelID || index;
        
        console.log(`Extracted - UserID: ${userId}, Door: ${door}`);

        // Look up user and room mappings
        const userMapping = await storage.getUserMapping(userId);
        const roomMapping = await storage.getRoomMapping(door);

        if (!userMapping) {
          console.log(`⚠️ User ID ${userId} not mapped to any email address`);
          response.reason = 'User not mapped';
          
          await storage.createAccessLog({
            dahuaUserId: userId,
            doorChannel: door,
            eventType: code,
            accessGranted: false,
            reason: 'user-not-mapped',
            metadata: { eventData }
          });

          return res.json(response);
        }

        if (!roomMapping) {
          console.log(`⚠️ Door ${door} not mapped to any room email`);
          response.reason = 'Room not mapped';
          
          await storage.createAccessLog({
            dahuaUserId: userId,
            userEmail: userMapping.email,
            doorChannel: door,
            eventType: code,
            accessGranted: false,
            reason: 'room-not-mapped',
            metadata: { eventData }
          });

          return res.json(response);
        }

        // Check Microsoft Graph for booking
        const calendarResult = await graphService.checkExistingBooking(
          userMapping.email, 
          roomMapping.roomEmail
        );

        response.userEmail = userMapping.email;
        response.roomEmail = roomMapping.roomEmail;

        if (calendarResult.success && calendarResult.action === 'check-in') {
          // User has valid booking - open door
          const doorResult = await dahuaService.openDoor(door);
          
          response.accessGranted = true;
          response.reason = 'Valid booking found - access granted';
          response.eventId = calendarResult.eventId;

          console.log(`✅ Access granted for ${userMapping.email} to ${roomMapping.roomEmail}`);
          
          await storage.createAccessLog({
            dahuaUserId: userId,
            userEmail: userMapping.email,
            doorChannel: door,
            roomEmail: roomMapping.roomEmail,
            eventType: code,
            accessGranted: true,
            reason: 'valid-booking',
            eventId: calendarResult.eventId,
            metadata: { eventData, calendarResult, doorResult }
          });

        } else {
          // No valid booking or user not authorized - deny access
          response.accessGranted = false;
          response.reason = calendarResult.reason || 'Access denied';

          console.log(`❌ Access denied for ${userMapping.email} to ${roomMapping.roomEmail}: ${response.reason}`);
          
          await storage.createAccessLog({
            dahuaUserId: userId,
            userEmail: userMapping.email,
            doorChannel: door,
            roomEmail: roomMapping.roomEmail,
            eventType: code,
            accessGranted: false,
            reason: calendarResult.action || 'access-denied',
            metadata: { eventData, calendarResult }
          });
        }

        console.log(`📊 Result:`, response);
        console.log(`=== End processing ===\n`);
      }

      res.json(response);
    } catch (error) {
      console.error('Error processing Dahua webhook:', error);
      const errorResponse: AccessControlResponse = {
        success: false,
        accessGranted: false,
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
      res.status(500).json(errorResponse);
    }
  });

  // Test endpoints
  app.post("/api/test/event", async (req, res) => {
    try {
      const { 
        code = 'FaceRecognition', 
        action = 'Start', 
        index = 1, 
        data = {} 
      } = req.body as TestEvent;

      console.log('📧 Manual test event received:', { code, action, index, data });

      // Simulate the webhook call internally
      const simulatedEvent: DahuaEventData = {
        AlarmType: code,
        Action: action,
        ChannelID: index,
        Data: data
      };

      // Process the same way as webhook
      if (action === 'Start' && (code === 'FaceRecognition' || code === 'AccessControl')) {
        const userId = data?.UserID || index.toString();
        const door = data?.Door || index;
        
        const userMapping = await storage.getUserMapping(userId);
        const roomMapping = await storage.getRoomMapping(door);

        if (!userMapping || !roomMapping) {
          return res.json({ 
            success: false, 
            error: 'User or room not mapped',
            userMapping: userMapping ? 'found' : 'not found',
            roomMapping: roomMapping ? 'found' : 'not found'
          });
        }

        const calendarResult = await graphService.checkExistingBooking(
          userMapping.email, 
          roomMapping.roomEmail
        );
        
        res.json({ 
          success: true, 
          message: 'Test event processed successfully',
          event: { code, action, index, data },
          result: {
            userEmail: userMapping.email,
            roomEmail: roomMapping.roomEmail,
            calendarResult
          }
        });
      } else {
        res.json({ 
          success: true, 
          message: 'Test event received but ignored (not a face recognition start event)',
          event: { code, action, index, data }
        });
      }
    } catch (error) {
      console.error('Error in test endpoint:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.post("/api/test/calendar", async (req, res) => {
    try {
      const {
        userEmail = 'aziz@elrace.com',
        roomEmail = 'Room1@elrace.com'
      } = req.body;

      console.log('📅 Direct calendar test requested:', { userEmail, roomEmail });

      const result = await graphService.checkExistingBooking(userEmail, roomEmail);

      res.json({
        success: true,
        result: result
      });

    } catch (error) {
      console.error('Error in calendar test:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/test/connection", async (req, res) => {
    try {
      const [dahuaTest, graphTest] = await Promise.all([
        dahuaService.testConnection(),
        graphService.testConnection()
      ]);

      // Update system health
      await storage.updateSystemHealth('dahua', dahuaTest.success ? 'online' : 'offline', dahuaTest.message);
      await storage.updateSystemHealth('microsoft-graph', graphTest.success ? 'online' : 'offline', graphTest.message);
      await storage.updateSystemHealth('server', 'online', 'Server operational');

      res.json({
        success: dahuaTest.success && graphTest.success,
        results: {
          dahua: dahuaTest,
          microsoftGraph: graphTest,
          server: { success: true, message: 'Server healthy' }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/test/door", async (req, res) => {
    try {
      const { channel, action = 'open' } = req.body;
      
      let result;
      if (action === 'open') {
        result = await dahuaService.openDoor(channel);
      } else if (action === 'close') {
        result = await dahuaService.closeDoor(channel);
      } else if (action === 'status') {
        result = await dahuaService.getDoorStatus(channel);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use: open, close, or status' });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
