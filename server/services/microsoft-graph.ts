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
    
    const authProvider = {
      getAccessToken: async () => {
        return accessToken;
      }
    };
    
    return Client.init({
      authProvider: authProvider
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

  async checkActiveMeeting(userEmail: string, roomEmail: string): Promise<{hasActiveMeeting: boolean, meetingEnd?: string, meetingSubject?: string, eventId?: string}> {
    try {
      console.log(`🔍 Checking active meeting for ${userEmail} in room ${roomEmail}`);
      
      const graphClient = await this.getGraphClient();
      const now = new Date();
      const endTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // Next 8 hours
      
      // Format times for Graph API
      const startTimeStr = now.toISOString();
      const endTimeStr = endTime.toISOString();
      
      console.log(`📅 Checking active meetings from: ${startTimeStr} to ${endTimeStr}`);
      
      // Check room's calendar for current meetings using direct API call
      const accessToken = await this.getAccessToken();
      const filter = `start/dateTime le '${endTimeStr}' and end/dateTime ge '${startTimeStr}'`;
      const select = 'id,subject,start,end,attendees,organizer';
      const url = `https://graph.microsoft.com/v1.0/users/${roomEmail}/calendar/events?$filter=${encodeURIComponent(filter)}&$select=${select}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Graph API error: ${response.status} ${response.statusText}`);
        return { hasActiveMeeting: false };
      }

      const roomEvents = await response.json();
      
      console.log(`📋 Found ${roomEvents.value?.length || 0} events in room ${roomEmail}`);
      
      // Find currently active meeting where user is organizer or attendee
      const activeMeeting = roomEvents.value?.find((event: any) => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        const isCurrentlyActive = now >= eventStart && now <= eventEnd;
        
        if (!isCurrentlyActive) return false;
        
        // Check if user is organizer
        const isUserOrganizer = event.organizer?.emailAddress?.address?.toLowerCase() === userEmail.toLowerCase();
        
        // Check if user is attendee
        const isUserAttendee = event.attendees?.some((attendee: any) => 
          attendee.emailAddress?.address?.toLowerCase() === userEmail.toLowerCase()
        );
        
        return isUserOrganizer || isUserAttendee;
      });
      
      if (activeMeeting) {
        const meetingEnd = new Date(activeMeeting.end.dateTime).toLocaleString();
        console.log(`✅ Found active meeting for ${userEmail}: ${activeMeeting.subject} until ${meetingEnd}`);
        
        // Auto check-in: Update event body with check-in information
        try {
          const checkInTime = new Date().toISOString();
          const updatedBody = {
            contentType: 'text',
            content: `${activeMeeting.body?.content || ''}\n\n✓ Auto check-in via face recognition at ${checkInTime} for ${userEmail}`
          };

          const patchResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${roomEmail}/calendar/events/${activeMeeting.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: updatedBody })
          });

          console.log(`✓ Auto check-in successful for ${userEmail} in active meeting`);
        } catch (checkInError) {
          console.error('❌ Auto check-in failed:', checkInError);
        }
        
        return {
          hasActiveMeeting: true,
          meetingEnd,
          meetingSubject: activeMeeting.subject,
          eventId: activeMeeting.id
        };
      } else {
        console.log(`❌ No active meeting found for ${userEmail} in room ${roomEmail}`);
        return { hasActiveMeeting: false };
      }
      
    } catch (error) {
      console.error('❌ Error checking active meeting:', error);
      return { hasActiveMeeting: false };
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
