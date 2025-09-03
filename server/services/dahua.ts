import crypto from 'crypto';

interface DahuaConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface DahuaDeviceConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  roomEmail: string;
}

interface DoorControlResult {
  success: boolean;
  message: string;
  action?: string;
}

export class DahuaService {
  private config: DahuaConfig;
  private devices: Map<string, DahuaDeviceConfig>; // Map room email to device config

  constructor(config: DahuaConfig, deviceConfigs: DahuaDeviceConfig[] = []) {
    this.config = config;
    this.devices = new Map();
    
    // Set up device mappings
    deviceConfigs.forEach(device => {
      this.devices.set(device.roomEmail, device);
    });
  }

  private generateDigestAuth(username: string, password: string, realm: string, uri: string, nonce: string, method: string = 'GET'): string {
    const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
    const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    
    return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  }

  private async makeRequest(path: string, method: string = 'GET', deviceHost?: string, devicePort?: number): Promise<any> {
    const host = deviceHost || this.config.host;
    const port = devicePort || this.config.port;
    const url = `http://${host}:${port}${path}`;
    
    try {
      // First request to get authentication challenge
      const initialResponse = await fetch(url, { method });
      
      if (initialResponse.status === 401) {
        const wwwAuth = initialResponse.headers.get('WWW-Authenticate');
        if (wwwAuth && wwwAuth.includes('Digest')) {
          // Parse digest challenge
          const realm = wwwAuth.match(/realm="([^"]+)"/)?.[1] || '';
          const nonce = wwwAuth.match(/nonce="([^"]+)"/)?.[1] || '';
          
          // Create digest auth header
          const authHeader = this.generateDigestAuth(
            this.config.username,
            this.config.password,
            realm,
            path,
            nonce,
            method
          );
          
          // Retry with authentication
          const authResponse = await fetch(url, {
            method,
            headers: {
              'Authorization': authHeader
            }
          });
          
          if (authResponse.ok) {
            const text = await authResponse.text();
            return { success: true, data: text };
          } else {
            return { success: false, error: `HTTP ${authResponse.status}: ${authResponse.statusText}` };
          }
        }
      } else if (initialResponse.ok) {
        const text = await initialResponse.text();
        return { success: true, data: text };
      }
      
      return { success: false, error: `HTTP ${initialResponse.status}: ${initialResponse.statusText}` };
    } catch (error) {
      return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async openDoor(channel: number, roomEmail?: string): Promise<DoorControlResult> {
    console.log(`Attempting to open door on channel ${channel} for room ${roomEmail || 'default'}`);
    
    let deviceHost, devicePort;
    if (roomEmail && this.devices.has(roomEmail)) {
      const device = this.devices.get(roomEmail)!;
      deviceHost = device.host;
      devicePort = device.port;
      console.log(`Using device ${deviceHost}:${devicePort} for room ${roomEmail}`);
    }
    
    const result = await this.makeRequest(
      `/cgi-bin/accessControl.cgi?action=openDoor&channel=${channel}&Type=Remote`,
      'GET',
      deviceHost,
      devicePort
    );
    
    if (result.success) {
      console.log(`✓ Door ${channel} opened successfully on ${deviceHost || this.config.host}`);
      return {
        success: true,
        message: `Door ${channel} opened successfully`,
        action: 'open'
      };
    } else {
      console.error(`Failed to open door ${channel}:`, result.error);
      return {
        success: false,
        message: `Failed to open door ${channel}: ${result.error}`
      };
    }
  }

  async closeDoor(channel: number, roomEmail?: string): Promise<DoorControlResult> {
    console.log(`Attempting to close door on channel ${channel} for room ${roomEmail || 'default'}`);
    
    let deviceHost, devicePort;
    if (roomEmail && this.devices.has(roomEmail)) {
      const device = this.devices.get(roomEmail)!;
      deviceHost = device.host;
      devicePort = device.port;
      console.log(`Using device ${deviceHost}:${devicePort} for room ${roomEmail}`);
    }
    
    const result = await this.makeRequest(
      `/cgi-bin/accessControl.cgi?action=closeDoor&channel=${channel}&Type=Remote`,
      'GET',
      deviceHost,
      devicePort
    );
    
    if (result.success) {
      console.log(`✓ Door ${channel} closed successfully on ${deviceHost || this.config.host}`);
      return {
        success: true,
        message: `Door ${channel} closed successfully`,
        action: 'close'
      };
    } else {
      console.error(`Failed to close door ${channel}:`, result.error);
      return {
        success: false,
        message: `Failed to close door ${channel}: ${result.error}`
      };
    }
  }

  async getDoorStatus(channel: number, roomEmail?: string): Promise<DoorControlResult> {
    console.log(`Checking door status for channel ${channel} for room ${roomEmail || 'default'}`);
    
    let deviceHost, devicePort;
    if (roomEmail && this.devices.has(roomEmail)) {
      const device = this.devices.get(roomEmail)!;
      deviceHost = device.host;
      devicePort = device.port;
      console.log(`Using device ${deviceHost}:${devicePort} for room ${roomEmail}`);
    }
    
    const result = await this.makeRequest(
      `/cgi-bin/accessControl.cgi?action=getDoorStatus&channel=${channel}`,
      'GET',
      deviceHost,
      devicePort
    );
    
    if (result.success) {
      console.log(`✓ Door ${channel} status retrieved successfully from ${deviceHost || this.config.host}`);
      return {
        success: true,
        message: `Door ${channel} status: ${result.data}`,
        action: 'status'
      };
    } else {
      console.error(`Failed to get door ${channel} status:`, result.error);
      return {
        success: false,
        message: `Failed to get door ${channel} status: ${result.error}`
      };
    }
  }

  async getUnlockRecords(): Promise<DoorControlResult> {
    console.log('Retrieving unlock records from Dahua device');
    
    const result = await this.makeRequest('/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec');
    
    if (result.success) {
      console.log('✓ Unlock records retrieved successfully');
      return {
        success: true,
        message: 'Unlock records retrieved successfully',
        action: 'records'
      };
    } else {
      console.error('Failed to get unlock records:', result.error);
      return {
        success: false,
        message: `Failed to get unlock records: ${result.error}`
      };
    }
  }

  async captureFaceForUser(userId: string): Promise<DoorControlResult> {
    console.log(`Capturing face for user ${userId}`);
    
    const result = await this.makeRequest(`/cgi-bin/accessControl.cgi?action=captureCmd&type=1&UserID=${userId}&heartbeat=5&timeout=10`);
    
    if (result.success) {
      console.log(`✓ Face capture initiated for user ${userId}`);
      return {
        success: true,
        message: `Face capture initiated for user ${userId}`,
        action: 'capture'
      };
    } else {
      console.error(`Failed to capture face for user ${userId}:`, result.error);
      return {
        success: false,
        message: `Failed to capture face for user ${userId}: ${result.error}`
      };
    }
  }

  async setFaceRecognitionThreshold(threshold: number = 90): Promise<DoorControlResult> {
    console.log(`Setting face recognition threshold to ${threshold}%`);
    
    const result = await this.makeRequest(`/cgi-bin/faceRecognitionServer.cgi?action=modifyGroup&groupID=10000&Similarity=${threshold}`);
    
    if (result.success) {
      console.log(`✓ Face recognition threshold set to ${threshold}%`);
      return {
        success: true,
        message: `Face recognition threshold set to ${threshold}%`,
        action: 'threshold'
      };
    } else {
      console.error(`Failed to set threshold to ${threshold}%:`, result.error);
      return {
        success: false,
        message: `Failed to set threshold to ${threshold}%: ${result.error}`
      };
    }
  }

  async enableLivenessDetection(): Promise<DoorControlResult> {
    console.log('Enabling liveness detection (anti-spoof)');
    
    const result = await this.makeRequest('/cgi-bin/configManager.cgi?action=setConfig&VideoAnalyseRule[0].Enable=true');
    
    if (result.success) {
      console.log('✓ Liveness detection enabled successfully');
      return {
        success: true,
        message: 'Liveness detection enabled successfully',
        action: 'liveness'
      };
    } else {
      console.error('Failed to enable liveness detection:', result.error);
      return {
        success: false,
        message: `Failed to enable liveness detection: ${result.error}`
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    console.log(`Testing connection to primary Dahua device at ${this.config.host}:${this.config.port}`);
    
    const result = await this.makeRequest('/cgi-bin/magicBox.cgi?action=getDeviceType');
    
    if (result.success) {
      return { success: true, message: 'Dahua connection successful' };
    } else {
      return { success: false, message: `Dahua connection failed: ${result.error}` };
    }
  }

  async testAllDevices(): Promise<{ success: boolean; message: string; deviceResults: any[] }> {
    console.log('Testing connections to all configured Dahua devices...');
    
    const results = [];
    let allSuccessful = true;

    // Test each configured device
    for (const [roomEmail, device] of this.devices.entries()) {
      console.log(`Testing device ${device.host}:${device.port || 80} for room ${roomEmail}`);
      
      const result = await this.makeRequest(
        '/cgi-bin/magicBox.cgi?action=getDeviceType',
        'GET',
        device.host,
        device.port || 80
      );
      
      const deviceResult = {
        roomEmail,
        host: device.host,
        port: device.port || 80,
        success: result.success,
        message: result.success ? 'Connected' : result.error
      };
      
      results.push(deviceResult);
      if (!result.success) allSuccessful = false;
    }
    
    return {
      success: allSuccessful,
      message: allSuccessful ? 'All devices connected' : 'Some devices failed',
      deviceResults: results
    };
  }
}
