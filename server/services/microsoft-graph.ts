import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';

interface MicrosoftGraphConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

interface CalendarCheckResult {
  success: boolean;
  action: 'check-in' | 'no-booking' | 'unauthorized' | 'error';
  reason: string;
  eventId?: string;
  eventSubject?: string;
}

export class MicrosoftGraphService {
  private cca: ConfidentialClientApplication;
  private graphScopes = ['https://graph.microsoft.com/.default'];

  constructor(config: MicrosoftGraphConfig) {
    const msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret
      }
    };

    this.cca = new ConfidentialClientApplication(msalConfig);
  }

  private async getAccessToken(): Promise<string> {
    try {
      const tokenResponse = await this.cca.acquireTokenByClientCredential({ 
        scopes: this.graphScopes 
      });
      return tokenResponse.accessToken;
    } catch (error) {
      console.error('Failed to acquire access token:', error);
      throw new Error('Microsoft Graph authentication failed');
    }
  }

  private async getGraphClient(): Promise<Client> {
    const accessToken = await this.getAccessToken();
    return Client.init({
      authProvider: {
        getAccessToken: async () => accessToken
      }
    });
  }

  async checkExistingBooking(userEmail: string, roomEmail: string): Promise<CalendarCheckResult> {
    try {
      const graphClient = await this.getGraphClient();
      const now = new Date();
      const startTime = new Date(now.getTime() - 15 * 60 * 1000).toISOString(); // 15 minutes before
      const endTime = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minutes after

      console.log(`Checking for existing bookings for ${userEmail} in ${roomEmail} between ${startTime} and ${endTime}`);

      const events = await graphClient
        .api(`/users/${roomEmail}/calendar/events`)
        .filter(`start/dateTime le '${endTime}' and end/dateTime ge '${startTime}'`)
        .select('id,subject,start,end,attendees,body')
        .get();

      if (events.value && events.value.length > 0) {
        console.log(`Found ${events.value.length} overlapping events`);
        
        for (const event of events.value) {
          const isUserAttendee = event.attendees.some(
            (att: any) => att.emailAddress.address.toLowerCase() === userEmail.toLowerCase()
          );

          if (isUserAttendee) {
            // Auto check-in: Update event body with check-in information
            const checkInTime = new Date().toISOString();
            const updatedBody = {
              contentType: 'text',
              content: `${event.body?.content || ''}\n\n✓ Auto check-in via face recognition at ${checkInTime} for ${userEmail}`
            };

            await graphClient
              .api(`/users/${roomEmail}/calendar/events/${event.id}`)
              .patch({ body: updatedBody });

            console.log(`✓ Auto check-in successful for ${userEmail} in ${roomEmail} (Event: ${event.subject})`);
            return { 
              success: true, 
              action: 'check-in', 
              eventId: event.id, 
              eventSubject: event.subject,
              reason: 'User authorized for existing booking'
            };
          }
        }

        console.log(`User ${userEmail} not found as attendee in any overlapping booking for ${roomEmail}`);
        return { 
          success: false, 
          action: 'unauthorized', 
          reason: 'User not authorized for existing booking' 
        };
      }

      console.log(`No existing bookings found for ${roomEmail} in the current time window`);
      return { 
        success: false, 
        action: 'no-booking', 
        reason: 'No existing booking found' 
      };

    } catch (error) {
      console.error('Error checking existing bookings:', error);
      return {
        success: false,
        action: 'error',
        reason: `Error checking calendar: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const accessToken = await this.getAccessToken();
      return { success: true, message: 'Microsoft Graph connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: `Microsoft Graph connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}
