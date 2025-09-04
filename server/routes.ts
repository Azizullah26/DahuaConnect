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
  type TestEvent,
} from "@shared/schema";

// Initialize services
const graphService = new MicrosoftGraphService({
  clientId:
    process.env.AZURE_CLIENT_ID || "206217f2-eb5f-46f5-aa7e-f246c2a97ef5",
  tenantId:
    process.env.AZURE_TENANT_ID || "14a72467-3f25-4572-a535-3d5eddb00cc5",
  clientSecret:
    process.env.AZURE_CLIENT_SECRET ||
    "4pT8Q~zhZE_PFKf9nnZCrLNJqqZpYaotFqebTcPu",
});

// Configure all Dahua devices for different rooms
// 
// IMPORTANT: To enable door control from cloud:
// 1. Set up port forwarding on your router:
//    - Forward external port 8443 → 10.255.254.8:443 (Room 1)
//    - Forward external port 8444 → 10.255.254.9:443 (Room 2)  
//    - Forward external port 8445 → 10.255.254.10:443 (Room 3)
//    - Forward external port 8446 → 10.255.254.11:443 (Room 4)
// 2. Get your public IP: https://whatismyipaddress.com
// 3. Replace the host IPs below with your public IP
// 4. Update the ports to match your forwarded ports
//
// Option A: Local network access (current - won't work from cloud)
// const dahuaDeviceConfigs = [
//   { host: "10.255.254.8", port: 443, roomEmail: "room1@elrace.com" },
//   { host: "10.255.254.9", port: 443, roomEmail: "room2@elrace.com" },
//   { host: "10.255.254.10", port: 443, roomEmail: "room3@elrace.com" },
//   { host: "10.255.254.11", port: 443, roomEmail: "room4@elrace.com" },
// ];

// Option B: Public IP with port forwarding (ACTIVE)
// Using your office public IP for door control
const PUBLIC_IP = "2.50.131.77"; // Your office public IP

const dahuaDeviceConfigs = [
  { host: PUBLIC_IP, port: 8443, roomEmail: "room1@elrace.com" },
  { host: PUBLIC_IP, port: 8444, roomEmail: "room2@elrace.com" },
  { host: PUBLIC_IP, port: 8445, roomEmail: "room3@elrace.com" },
  { host: PUBLIC_IP, port: 8446, roomEmail: "room4@elrace.com" },
];

// Option C: Using Tailscale (DISABLED - Replit can't access Tailscale network)
// const TAILSCALE_PC_IP = "100.101.26.30";
// const dahuaDeviceConfigs = [
//   { host: TAILSCALE_PC_IP, port: 8443, roomEmail: "room1@elrace.com" },
//   { host: TAILSCALE_PC_IP, port: 8444, roomEmail: "room2@elrace.com" },
//   { host: TAILSCALE_PC_IP, port: 8445, roomEmail: "room3@elrace.com" },
//   { host: TAILSCALE_PC_IP, port: 8446, roomEmail: "room4@elrace.com" },
// ];

const dahuaService = new DahuaService(
  {
    host: process.env.DAHUA_HOST || "10.255.254.8",
    port: parseInt(process.env.DAHUA_PORT || "443"),
    username: process.env.DAHUA_USER || "admin",
    password: process.env.DAHUA_PASS || "P@ssw0rd@247#",
  },
  dahuaDeviceConfigs,
);

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const systemHealth = await storage.getSystemHealth();
      const healthMap = systemHealth.reduce((acc, health) => {
        acc[health.service] = {
          status: health.status,
          lastCheck: health.lastCheck,
          details: health.details,
        };
        return acc;
      }, {} as any);

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: healthMap,
        environment: {
          node_env: process.env.NODE_ENV || "development",
          port: process.env.PORT || 5000,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // User mappings endpoints
  app.get("/api/user-mappings", async (req, res) => {
    try {
      const mappings = await storage.getUserMappings();
      res.json(mappings);
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  app.post("/api/user-mappings", async (req, res) => {
    try {
      const validatedData = insertUserMappingSchema.parse(req.body);
      const mapping = await storage.createUserMapping(validatedData);
      res.json(mapping);
    } catch (error) {
      res
        .status(400)
        .json({
          error: error instanceof Error ? error.message : "Invalid data",
        });
    }
  });

  app.delete("/api/user-mappings/:id", async (req, res) => {
    try {
      const success = await storage.deleteUserMapping(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "User mapping not found" });
      }
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  // Room mappings endpoints
  app.get("/api/room-mappings", async (req, res) => {
    try {
      const mappings = await storage.getRoomMappings();
      res.json(mappings);
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  app.post("/api/room-mappings", async (req, res) => {
    try {
      const validatedData = insertRoomMappingSchema.parse(req.body);
      const mapping = await storage.createRoomMapping(validatedData);
      res.json(mapping);
    } catch (error) {
      res
        .status(400)
        .json({
          error: error instanceof Error ? error.message : "Invalid data",
        });
    }
  });

  app.delete("/api/room-mappings/:id", async (req, res) => {
    try {
      const success = await storage.deleteRoomMapping(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Room mapping not found" });
      }
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  // Access logs endpoint
  app.get("/api/access-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getAccessLogs(limit);
      res.json(logs);
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  // System health endpoint
  app.get("/api/system-health", async (req, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const logs = await storage.getAccessLogs(1000); // Get more logs for metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLogs = logs.filter(
        (log) => log.timestamp && new Date(log.timestamp) >= today,
      );

      const totalAttempts = todayLogs.length;
      const successfulAccess = todayLogs.filter(
        (log) => log.accessGranted,
      ).length;
      const deniedAccess = totalAttempts - successfulAccess;
      const successRate =
        totalAttempts > 0 ? (successfulAccess / totalAttempts) * 100 : 0;

      const roomMappings = await storage.getRoomMappings();
      const activeRooms = roomMappings.filter((room) => room.isActive).length;

      res.json({
        totalAttempts,
        successfulAccess,
        deniedAccess,
        successRate: Math.round(successRate * 10) / 10,
        activeRooms,
        totalRooms: roomMappings.length,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  // Main Dahua webhook endpoint
  app.post("/api/dahua-webhook", async (req, res) => {
    try {
      console.log(`\n🔔 Dahua webhook event received:`);
      console.log("Headers:", req.headers);
      
      // Handle multipart/compressed data from Dahua
      let eventData: DahuaEventData;
      
      // Handle different content types from Dahua devices
      if (Buffer.isBuffer(req.body)) {
        // Raw buffer data - try to parse it
        try {
          const bodyString = req.body.toString('utf8');
          // Try to find JSON data in the payload
          const jsonMatch = bodyString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            eventData = JSON.parse(jsonMatch[0]);
          } else {
            // If no JSON found, use defaults with UserID 1
            console.log("No JSON found in buffer, using default event data");
            eventData = {
              code: "FaceRecognition",
              action: "Start", 
              index: 1,
              data: { UserID: "1" }
            };
          }
        } catch (error) {
          console.log("Error parsing buffer data:", error);
          // Fallback for any parsing errors
          eventData = {
            code: "FaceRecognition",
            action: "Start",
            index: 1, 
            data: { UserID: "1" }
          };
        }
      } else if (typeof req.body === 'object' && req.body !== null) {
        // Already parsed JSON
        eventData = req.body;
      } else {
        // Default fallback
        console.log("Unrecognized body type, using defaults");
        eventData = {
          code: "FaceRecognition",
          action: "Start",
          index: 1,
          data: { UserID: "1" }
        };
      }
      
      console.log("Processed Body:", eventData);
      const code = eventData.AlarmType || eventData.code || "FaceRecognition";
      const action = eventData.Action || eventData.action || "Start";
      const index =
        eventData.ChannelID || eventData.index || eventData.door || 1;
      const data = eventData.Data || eventData;

      const response: AccessControlResponse = {
        success: true,
        accessGranted: false,
        reason: "Event processed",
        timestamp: new Date().toISOString(),
      };

      if (
        action === "Start" &&
        (code === "FaceRecognition" || code === "AccessControl")
      ) {
        console.log(`Code: ${code}, Action: ${action}, Index: ${index}`);

        // Extract user ID and door information
        const userId =
          (data as any)?.data?.UserID ||
          (data as any)?.UserID ||
          (data as any)?.userId ||
          (data as any)?.PersonID ||
          index.toString();
        const door =
          (data as any)?.Door ||
          (data as any)?.door ||
          (data as any)?.ChannelID ||
          index;

        console.log(`Extracted - UserID: ${userId}, Door: ${door}`);

        // Look up user and room mappings
        const userMapping = await storage.getUserMapping(userId);
        const roomMapping = await storage.getRoomMapping(door);

        if (!userMapping) {
          console.log(`⚠️ User ID ${userId} not mapped to any email address`);
          response.reason = "User not mapped";

          await storage.createAccessLog({
            dahuaUserId: userId,
            doorChannel: door,
            eventType: code,
            accessGranted: false,
            reason: "user-not-mapped",
            metadata: { eventData },
          });

          return res.json(response);
        }

        if (!roomMapping) {
          console.log(`⚠️ Door ${door} not mapped to any room email`);
          response.reason = "Room not mapped";

          await storage.createAccessLog({
            dahuaUserId: userId,
            userEmail: userMapping.email,
            doorChannel: door,
            eventType: code,
            accessGranted: false,
            reason: "room-not-mapped",
            metadata: { eventData },
          });

          return res.json(response);
        }

        // Check for active meeting where user is authorized
        const activeMeeting = await graphService.checkActiveMeeting(
          userMapping.email,
          roomMapping.roomEmail,
        );

        response.userEmail = userMapping.email;
        response.roomEmail = roomMapping.roomEmail;

        if (activeMeeting.hasActiveMeeting) {
          // User has active meeting - keep door open during meeting time
          const doorResult = await dahuaService.openDoor(
            door,
            roomMapping.roomEmail,
          );

          response.accessGranted = true;
          response.reason = `Active meeting access - door open until ${activeMeeting.meetingEnd}`;
          response.eventId = activeMeeting.eventId;
          response.meetingDetails = activeMeeting;

          console.log(
            `✅ Meeting access granted for ${userMapping.email} - ${activeMeeting.meetingSubject} until ${activeMeeting.meetingEnd}`,
          );

          await storage.createAccessLog({
            dahuaUserId: userId,
            userEmail: userMapping.email,
            doorChannel: door,
            roomEmail: roomMapping.roomEmail,
            eventType: code,
            accessGranted: true,
            reason: "active-meeting-access",
            eventId: activeMeeting.eventId,
            metadata: { eventData, activeMeeting, doorResult },
          });
        } else {
          // No active meeting for this user - deny access (even if they're registered in Dahua)
          response.accessGranted = false;
          response.reason = `No active meeting found for ${userMapping.email} in ${roomMapping.roomEmail}`;

          console.log(
            `❌ Meeting access denied for ${userMapping.email} - no active meeting in ${roomMapping.roomEmail}`,
          );

          await storage.createAccessLog({
            dahuaUserId: userId,
            userEmail: userMapping.email,
            doorChannel: door,
            roomEmail: roomMapping.roomEmail,
            eventType: code,
            accessGranted: false,
            reason: "no-active-meeting",
            metadata: { eventData, activeMeeting },
          });
        }

        console.log(`📊 Result:`, response);
        console.log(`=== End processing ===\n`);
      }

      res.json(response);
    } catch (error) {
      console.error("Error processing Dahua webhook:", error);
      const errorResponse: AccessControlResponse = {
        success: false,
        accessGranted: false,
        reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(errorResponse);
    }
  });

  // Test endpoints
  app.post("/api/test/event", async (req, res) => {
    try {
      const {
        code = "FaceRecognition",
        action = "Start",
        index = 1,
        data = {},
      } = req.body as TestEvent;

      console.log("📧 Manual test event received:", {
        code,
        action,
        index,
        data,
      });

      // Simulate the webhook call internally
      const simulatedEvent: DahuaEventData = {
        AlarmType: code,
        Action: action,
        ChannelID: index,
        Data: data,
      };

      // Process the same way as webhook
      if (
        action === "Start" &&
        (code === "FaceRecognition" || code === "AccessControl")
      ) {
        const userId = data?.UserID || index.toString();
        const door = data?.Door || index;

        const userMapping = await storage.getUserMapping(userId);
        const roomMapping = await storage.getRoomMapping(door);

        if (!userMapping || !roomMapping) {
          return res.json({
            success: false,
            error: "User or room not mapped",
            userMapping: userMapping ? "found" : "not found",
            roomMapping: roomMapping ? "found" : "not found",
          });
        }

        const activeMeeting = await graphService.checkActiveMeeting(
          userMapping.email,
          roomMapping.roomEmail,
        );

        res.json({
          success: true,
          message: "Test event processed successfully",
          event: { code, action, index, data },
          result: {
            userEmail: userMapping.email,
            roomEmail: roomMapping.roomEmail,
            activeMeeting,
          },
        });
      } else {
        res.json({
          success: true,
          message:
            "Test event received but ignored (not a face recognition start event)",
          event: { code, action, index, data },
        });
      }
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/test/calendar", async (req, res) => {
    try {
      const { userEmail = "aziz@elrace.com", roomEmail = "Room1@elrace.com" } =
        req.body;

      console.log("📅 Direct calendar test requested:", {
        userEmail,
        roomEmail,
      });

      const result = await graphService.checkActiveMeeting(
        userEmail,
        roomEmail,
      );

      res.json({
        success: true,
        result: result,
      });
    } catch (error) {
      console.error("Error in calendar test:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/test/connection", async (req, res) => {
    try {
      console.log("🧪 Testing Microsoft Graph API connection...");

      const [dahuaTest, graphTest] = await Promise.all([
        dahuaService.testConnection(),
        graphService.testConnection(),
      ]);

      console.log("📊 Microsoft Graph API Response:", {
        success: graphTest.success,
        message: graphTest.message,
        timestamp: new Date().toISOString(),
      });

      // Update system health
      await storage.updateSystemHealth(
        "dahua",
        dahuaTest.success ? "online" : "offline",
        dahuaTest.message,
      );
      await storage.updateSystemHealth(
        "microsoft-graph",
        graphTest.success ? "online" : "offline",
        graphTest.message,
      );
      await storage.updateSystemHealth(
        "server",
        "online",
        "Server operational",
      );

      res.json({
        success: dahuaTest.success && graphTest.success,
        results: {
          dahua: dahuaTest,
          microsoftGraph: graphTest,
          server: { success: true, message: "Server healthy" },
        },
      });
    } catch (error) {
      console.error("❌ Connection test failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/test/door", async (req, res) => {
    try {
      const { channel, action = "open", roomEmail } = req.body;

      let result;
      if (action === "open") {
        result = await dahuaService.openDoor(channel, roomEmail);
      } else if (action === "close") {
        result = await dahuaService.closeDoor(channel, roomEmail);
      } else if (action === "status") {
        result = await dahuaService.getDoorStatus(channel, roomEmail);
      } else {
        return res
          .status(400)
          .json({ error: "Invalid action. Use: open, close, or status" });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Test all device connections
  app.post("/api/test/all-devices", async (req, res) => {
    try {
      console.log("🧪 Testing all Dahua device connections...");

      const result = await dahuaService.testAllDevices();

      res.json({
        success: result.success,
        message: result.message,
        devices: result.deviceResults,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ All devices test failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Advanced Dahua operations endpoint
  app.post("/api/test/dahua-advanced", async (req, res) => {
    try {
      const { action, userId, threshold, startTime, endTime, count } = req.body;

      let result;
      switch (action) {
        case "records":
          result = await dahuaService.getUnlockRecords(
            startTime,
            endTime,
            count,
          );
          break;
        case "capture":
          if (!userId) {
            return res
              .status(400)
              .json({ error: "userId required for capture action" });
          }
          result = await dahuaService.captureFaceForUser(userId);
          break;
        case "threshold":
          result = await dahuaService.setFaceRecognitionThreshold(
            threshold || 90,
          );
          break;
        case "liveness":
          result = await dahuaService.enableLivenessDetection();
          break;
        default:
          return res
            .status(400)
            .json({
              error:
                "Invalid action. Use: records, capture, threshold, or liveness",
            });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Enhanced device information endpoint
  app.get("/api/test/device-info/:roomEmail?", async (req, res) => {
    try {
      const { roomEmail } = req.params;
      console.log(
        `🔍 Getting device information for room: ${roomEmail || "default"}`,
      );

      let deviceHost, devicePort;
      if (roomEmail) {
        const deviceConfig = dahuaService.getDeviceByRoom(roomEmail);
        if (deviceConfig) {
          deviceHost = deviceConfig.host;
          devicePort = deviceConfig.port;
        }
      }

      const result = await dahuaService.getDeviceInfo(deviceHost, devicePort);
      res.json(result);
    } catch (error) {
      console.error("Error getting device info:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error getting device info",
      });
    }
  });

  // User management endpoints
  app.post("/api/test/add-user", async (req, res) => {
    try {
      const { userID, userName, doors, validFrom, validTo } = req.body;
      console.log(`👤 Adding user ${userName} with ID ${userID}...`);

      const result = await dahuaService.addUser({
        userID,
        userName,
        doors,
        validFrom,
        validTo,
      });

      res.json(result);
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error adding user",
      });
    }
  });

  // User search endpoint
  app.get("/api/test/search-users", async (req, res) => {
    try {
      const { userID, userName } = req.query;
      console.log("🔍 Searching for users...");

      const result = await dahuaService.searchUsers(
        userID as string,
        userName as string,
      );

      res.json(result);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error searching users",
      });
    }
  });

  // Enhanced door control with duration
  app.post("/api/test/door-control-enhanced", async (req, res) => {
    try {
      const { action, channel, roomEmail, duration } = req.body;
      console.log(
        `🚪 ${action} door ${channel} for room ${roomEmail}${duration ? ` for ${duration}s` : ""}...`,
      );

      let result;
      if (action === "open") {
        result = await dahuaService.openDoor(channel, roomEmail, duration);
      } else if (action === "close") {
        result = await dahuaService.closeDoor(channel, roomEmail);
      } else if (action === "status") {
        result = await dahuaService.getDoorStatus(channel, roomEmail);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid action. Use: open, close, or status",
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error controlling door:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error controlling door",
      });
    }
  });

  // Access control configuration endpoint
  app.get("/api/test/config", async (req, res) => {
    try {
      console.log("⚙️ Getting access control configuration...");

      const result = await dahuaService.getAccessControlConfig();
      res.json(result);
    } catch (error) {
      console.error("Error getting configuration:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error getting configuration",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
