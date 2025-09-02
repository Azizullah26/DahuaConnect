import crypto from 'crypto';

interface DahuaConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface DoorControlResult {
  success: boolean;
  message: string;
  action?: string;
}

export class DahuaService {
  private config: DahuaConfig;

  constructor(config: DahuaConfig) {
    this.config = config;
  }

  private generateDigestAuth(username: string, password: string, realm: string, uri: string, nonce: string, method: string = 'GET'): string {
    const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
    const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    
    return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  }

  private async makeRequest(path: string, method: string = 'GET'): Promise<any> {
    const url = `http://${this.config.host}:${this.config.port}${path}`;
    
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

  async openDoor(channel: number): Promise<DoorControlResult> {
    console.log(`Attempting to open door on channel ${channel}`);
    
    const result = await this.makeRequest(`/cgi-bin/accessControl.cgi?action=openDoor&channel=${channel}&Type=Remote`);
    
    if (result.success) {
      console.log(`✓ Door ${channel} opened successfully`);
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

  async closeDoor(channel: number): Promise<DoorControlResult> {
    console.log(`Attempting to close door on channel ${channel}`);
    
    const result = await this.makeRequest(`/cgi-bin/accessControl.cgi?action=closeDoor&channel=${channel}&Type=Remote`);
    
    if (result.success) {
      console.log(`✓ Door ${channel} closed successfully`);
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

  async getDoorStatus(channel: number): Promise<DoorControlResult> {
    console.log(`Checking door status for channel ${channel}`);
    
    const result = await this.makeRequest(`/cgi-bin/accessControl.cgi?action=getDoorStatus&channel=${channel}`);
    
    if (result.success) {
      console.log(`✓ Door ${channel} status retrieved successfully`);
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

  async testConnection(): Promise<{ success: boolean; message: string }> {
    console.log(`Testing connection to Dahua device at ${this.config.host}:${this.config.port}`);
    
    const result = await this.makeRequest('/cgi-bin/magicBox.cgi?action=getDeviceType');
    
    if (result.success) {
      return { success: true, message: 'Dahua connection successful' };
    } else {
      return { success: false, message: `Dahua connection failed: ${result.error}` };
    }
  }
}
