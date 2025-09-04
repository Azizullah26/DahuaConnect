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

  // Helper method to get device configuration by room email
  getDeviceByRoom(roomEmail: string): DahuaDeviceConfig | undefined {
    return this.devices.get(roomEmail);
  }

  private generateDigestAuth(username: string, password: string, realm: string, uri: string, nonce: string, method: string = 'GET', qop?: string, nc?: string, cnonce?: string): string {
    const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
    
    let response: string;
    let authString = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}"`;
    
    if (qop) {
      // RFC 2617 with qop
      const responseHash = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
      response = responseHash;
      authString += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
    } else {
      // RFC 2069 basic digest
      response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
      authString += `, response="${response}"`;
    }
    
    return authString;
  }

  private async makeRequest(path: string, method: string = 'GET', deviceHost?: string, devicePort?: number, body?: string, contentType?: string): Promise<any> {
    const host = deviceHost || this.config.host;
    const port = devicePort || this.config.port;
    
    // Handle Tailscale funnel URLs with paths
    let url: string;
    let isHttps = false;
    if (host && host.includes('.ts.net') && host.includes('/room')) {
      // Tailscale funnel URL with path - use HTTPS and don't add port
      url = `https://${host}${path}`;
      isHttps = true;
    } else {
      // Regular URL construction
      const protocol = port === 443 ? 'https' : 'http';
      url = `${protocol}://${host}:${port}${path}`;
      isHttps = protocol === 'https';
    }
    
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Dahua/3.0'
      };
      
      if (contentType) {
        headers['Content-Type'] = contentType;
      }
      
      // First request to get authentication challenge
      const fetchOptions: any = {
        method,
        headers: body ? headers : undefined,
        body
      };
      
      // Handle HTTPS with self-signed certificates
      if (isHttps) {
        const { Agent } = await import('https');
        fetchOptions.agent = new Agent({
          rejectUnauthorized: false
        });
      }
      
      const initialResponse = await fetch(url, fetchOptions);
      
      if (initialResponse.status === 401) {
        const wwwAuth = initialResponse.headers.get('WWW-Authenticate');
        if (wwwAuth && wwwAuth.includes('Digest')) {
          // Parse digest challenge with enhanced parsing
          const realm = wwwAuth.match(/realm="([^"]+)"/)?.[1] || '';
          const nonce = wwwAuth.match(/nonce="([^"]+)"/)?.[1] || '';
          const qop = wwwAuth.match(/qop="([^"]+)"/)?.[1];
          const opaque = wwwAuth.match(/opaque="([^"]+)"/)?.[1];
          
          let authHeader: string;
          
          if (qop) {
            // Enhanced auth with qop
            const nc = '00000001';
            const cnonce = crypto.randomBytes(8).toString('hex');
            authHeader = this.generateDigestAuth(
              this.config.username,
              this.config.password,
              realm,
              path,
              nonce,
              method,
              qop,
              nc,
              cnonce
            );
            
            if (opaque) {
              authHeader += `, opaque="${opaque}"`;
            }
          } else {
            // Basic digest auth
            authHeader = this.generateDigestAuth(
              this.config.username,
              this.config.password,
              realm,
              path,
              nonce,
              method
            );
          }
          
          // Retry with authentication
          const authFetchOptions: any = {
            method,
            headers: {
              ...headers,
              'Authorization': authHeader
            },
            body
          };
          
          // Handle HTTPS with self-signed certificates
          if (isHttps) {
            const { Agent } = await import('https');
            authFetchOptions.agent = new Agent({
              rejectUnauthorized: false
            });
          }
          
          const authResponse = await fetch(url, authFetchOptions);
          
          if (authResponse.ok) {
            const text = await authResponse.text();
            return { success: true, data: text, status: authResponse.status };
          } else {
            const errorText = await authResponse.text().catch(() => 'Unknown error');
            return { success: false, error: `HTTP ${authResponse.status}: ${authResponse.statusText}`, details: errorText };
          }
        }
      } else if (initialResponse.ok) {
        const text = await initialResponse.text();
        return { success: true, data: text, status: initialResponse.status };
      }
      
      const errorText = await initialResponse.text().catch(() => 'Unknown error');
      return { success: false, error: `HTTP ${initialResponse.status}: ${initialResponse.statusText}`, details: errorText };
    } catch (error) {
      return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async openDoor(channel: number, roomEmail?: string, duration?: number): Promise<DoorControlResult> {
    console.log(`Attempting to open door on channel ${channel} for room ${roomEmail || 'default'}`);
    
    let deviceHost, devicePort;
    if (roomEmail && this.devices.has(roomEmail)) {
      const device = this.devices.get(roomEmail)!;
      deviceHost = device.host;
      devicePort = device.port;
      console.log(`Using device ${deviceHost}:${devicePort} for room ${roomEmail}`);
    }
    
    // Enhanced door control with optional duration parameter
    let endpoint = `/cgi-bin/accessControl.cgi?action=openDoor&channel=${channel}&Type=Remote`;
    if (duration) {
      endpoint += `&time=${duration}`; // Duration in seconds
    }
    
    const result = await this.makeRequest(endpoint, 'GET', deviceHost, devicePort);
    
    if (result.success) {
      // Parse response for enhanced feedback
      const isSuccess = result.data.includes('OK') || result.data.includes('success') || result.status === 200;
      
      if (isSuccess) {
        console.log(`✓ Door ${channel} opened successfully on ${deviceHost || this.config.host}`);
        return {
          success: true,
          message: `Door ${channel} opened successfully${duration ? ` for ${duration} seconds` : ''}`,
          action: 'open'
        };
      } else {
        console.error(`Door ${channel} operation returned unexpected response:`, result.data);
        return {
          success: false,
          message: `Door ${channel} command sent but response unclear: ${result.data}`
        };
      }
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
      const isSuccess = result.data.includes('OK') || result.data.includes('success') || result.status === 200;
      
      if (isSuccess) {
        console.log(`✓ Door ${channel} closed successfully on ${deviceHost || this.config.host}`);
        return {
          success: true,
          message: `Door ${channel} closed successfully`,
          action: 'close'
        };
      } else {
        console.error(`Door ${channel} close operation returned unexpected response:`, result.data);
        return {
          success: false,
          message: `Door ${channel} close command sent but response unclear: ${result.data}`
        };
      }
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

  async getUnlockRecords(startTime?: string, endTime?: string, count: number = 100): Promise<DoorControlResult & { records?: any[] }> {
    console.log('Retrieving unlock records from Dahua device');
    
    // Enhanced record retrieval with time filtering
    let endpoint = '/cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec';
    
    if (startTime) {
      endpoint += `&StartTime=${encodeURIComponent(startTime)}`;
    }
    if (endTime) {
      endpoint += `&EndTime=${encodeURIComponent(endTime)}`;
    }
    endpoint += `&count=${count}`;
    
    const result = await this.makeRequest(endpoint);
    
    if (result.success) {
      console.log('✓ Unlock records retrieved successfully');
      
      // Parse response data into structured format
      const records = this.parseUnlockRecords(result.data);
      
      return {
        success: true,
        message: `Retrieved ${records.length} unlock records`,
        action: 'records',
        records
      };
    } else {
      console.error('Failed to get unlock records:', result.error);
      return {
        success: false,
        message: `Failed to get unlock records: ${result.error}`
      };
    }
  }

  private parseUnlockRecords(data: string): any[] {
    const records: any[] = [];
    
    try {
      // Parse Dahua response format
      const lines = data.split('\n');
      let currentRecord: any = {};
      
      for (const line of lines) {
        if (line.startsWith('records[')) {
          const match = line.match(/records\[(\d+)\]\.(\w+)=(.+)/);
          if (match) {
            const [, index, field, value] = match;
            const recordIndex = parseInt(index);
            
            if (!records[recordIndex]) {
              records[recordIndex] = {};
            }
            
            records[recordIndex][field] = value;
          }
        }
      }
      
      return records.filter(record => record && Object.keys(record).length > 0);
    } catch (error) {
      console.error('Failed to parse unlock records:', error);
      return [];
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

  async getDeviceInfo(deviceHost?: string, devicePort?: number): Promise<DoorControlResult & { deviceInfo?: any }> {
    console.log(`Getting device information from ${deviceHost || this.config.host}:${devicePort || this.config.port}`);
    
    const endpoints = [
      '/cgi-bin/magicBox.cgi?action=getDeviceType',
      '/cgi-bin/magicBox.cgi?action=getSystemInfo',
      '/cgi-bin/magicBox.cgi?action=getSoftwareVersion',
      '/cgi-bin/magicBox.cgi?action=getHardwareVersion'
    ];
    
    const deviceInfo: any = {};
    let successCount = 0;
    
    for (const endpoint of endpoints) {
      const result = await this.makeRequest(endpoint, 'GET', deviceHost, devicePort);
      if (result.success) {
        const key = endpoint.split('=')[1]; // Extract action name
        deviceInfo[key] = this.parseDeviceResponse(result.data);
        successCount++;
      }
    }
    
    if (successCount > 0) {
      return {
        success: true,
        message: `Retrieved device information (${successCount}/${endpoints.length} endpoints)`,
        action: 'deviceInfo',
        deviceInfo
      };
    } else {
      return {
        success: false,
        message: 'Failed to retrieve device information'
      };
    }
  }

  private parseDeviceResponse(data: string): any {
    const info: any = {};
    
    try {
      const lines = data.split('\n');
      for (const line of lines) {
        const [key, value] = line.split('=');
        if (key && value) {
          info[key.trim()] = value.trim();
        }
      }
    } catch (error) {
      console.error('Failed to parse device response:', error);
    }
    
    return info;
  }

  async addUser(userInfo: { userID: string; userName: string; doors?: number[]; validFrom?: string; validTo?: string }): Promise<DoorControlResult> {
    console.log(`Adding user ${userInfo.userName} with ID ${userInfo.userID}`);
    
    const postData = JSON.stringify({
      Users: [{
        UserID: userInfo.userID,
        UserName: userInfo.userName,
        UserType: 0, // Normal user
        Doors: userInfo.doors || [0], // Default to door 0
        ValidFrom: userInfo.validFrom || new Date().toISOString().split('T')[0],
        ValidTo: userInfo.validTo || '2099-12-31'
      }]
    });
    
    const result = await this.makeRequest(
      '/cgi-bin/AccessUser.cgi?action=insertMulti',
      'POST',
      undefined,
      undefined,
      postData,
      'application/json'
    );
    
    if (result.success) {
      console.log(`✓ User ${userInfo.userName} added successfully`);
      return {
        success: true,
        message: `User ${userInfo.userName} added successfully`,
        action: 'addUser'
      };
    } else {
      console.error(`Failed to add user ${userInfo.userName}:`, result.error);
      return {
        success: false,
        message: `Failed to add user ${userInfo.userName}: ${result.error}`
      };
    }
  }

  async searchUsers(userID?: string, userName?: string): Promise<DoorControlResult & { users?: any[] }> {
    console.log('Searching for users on Dahua device');
    
    let endpoint = '/cgi-bin/AccessUser.cgi?action=list';
    
    if (userID) {
      endpoint += `&UserIDList[0]=${encodeURIComponent(userID)}`;
    }
    
    const result = await this.makeRequest(endpoint);
    
    if (result.success) {
      const users = this.parseUsersResponse(result.data);
      console.log(`✓ Found ${users.length} users`);
      
      return {
        success: true,
        message: `Found ${users.length} users`,
        action: 'searchUsers',
        users
      };
    } else {
      console.error('Failed to search users:', result.error);
      return {
        success: false,
        message: `Failed to search users: ${result.error}`
      };
    }
  }

  private parseUsersResponse(data: string): any[] {
    const users: any[] = [];
    
    try {
      const lines = data.split('\n');
      let currentUser: any = {};
      let userIndex = -1;
      
      for (const line of lines) {
        if (line.startsWith('Users[')) {
          const match = line.match(/Users\[(\d+)\]\.(\w+)=(.+)/);
          if (match) {
            const [, index, field, value] = match;
            const idx = parseInt(index);
            
            if (idx !== userIndex) {
              if (userIndex >= 0) {
                users.push(currentUser);
              }
              currentUser = {};
              userIndex = idx;
            }
            
            currentUser[field] = value;
          }
        }
      }
      
      if (userIndex >= 0) {
        users.push(currentUser);
      }
    } catch (error) {
      console.error('Failed to parse users response:', error);
    }
    
    return users;
  }

  async testAllDevices(): Promise<{ success: boolean; message: string; deviceResults: any[] }> {
    console.log('Testing connections to all configured Dahua devices...');
    
    const results = [];
    let allSuccessful = true;

    // Test each configured device
    for (const [roomEmail, device] of Array.from(this.devices.entries())) {
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

  // Webhook event parsing and validation
  parseWebhookEvent(eventData: any): { isValid: boolean; eventType?: string; userInfo?: any; deviceInfo?: any } {
    try {
      // Enhanced webhook parsing based on Dahua specifications
      if (!eventData || typeof eventData !== 'object') {
        return { isValid: false };
      }

      // Common Dahua webhook fields
      const eventType = eventData.Code || eventData.Action || 'unknown';
      const userInfo = {
        userID: eventData.UserID || eventData.PersonID,
        userName: eventData.UserName || eventData.PersonName,
        cardNo: eventData.CardNo,
        method: eventData.Method // Face, Card, Password, etc.
      };

      const deviceInfo = {
        channel: eventData.Channel || eventData.DoorNo,
        deviceIP: eventData.DeviceIP,
        serialNumber: eventData.SerialNumber,
        timestamp: eventData.UTC || eventData.LocalTime
      };

      return {
        isValid: true,
        eventType,
        userInfo,
        deviceInfo
      };
    } catch (error) {
      console.error('Failed to parse webhook event:', error);
      return { isValid: false };
    }
  }

  // Enhanced configuration management
  async getAccessControlConfig(): Promise<DoorControlResult & { config?: any }> {
    console.log('Getting access control configuration');
    
    const result = await this.makeRequest('/cgi-bin/configManager.cgi?action=getConfig&name=AccessControl');
    
    if (result.success) {
      const config = this.parseConfigResponse(result.data);
      return {
        success: true,
        message: 'Access control configuration retrieved',
        action: 'getConfig',
        config
      };
    } else {
      return {
        success: false,
        message: `Failed to get configuration: ${result.error}`
      };
    }
  }

  private parseConfigResponse(data: string): any {
    const config: any = {};
    
    try {
      const lines = data.split('\n');
      for (const line of lines) {
        if (line.includes('=')) {
          const [key, value] = line.split('=');
          if (key && value) {
            // Handle nested configuration keys like AccessControl[0].DoorHoldTime
            const cleanKey = key.trim();
            const cleanValue = value.trim();
            
            if (cleanKey.includes('[')) {
              // Parse array-style configuration
              const match = cleanKey.match(/(\w+)\[(\d+)\]\.(\w+)/);
              if (match) {
                const [, section, index, field] = match;
                if (!config[section]) config[section] = [];
                if (!config[section][parseInt(index)]) config[section][parseInt(index)] = {};
                config[section][parseInt(index)][field] = cleanValue;
              }
            } else {
              config[cleanKey] = cleanValue;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse config response:', error);
    }
    
    return config;
  }
}
