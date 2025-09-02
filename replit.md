# Overview

This is a comprehensive access control middleware system that integrates Dahua face recognition devices with Microsoft Outlook calendar bookings. The system processes face recognition events from Dahua devices, validates user access against Microsoft Graph calendar bookings, and controls door access based on room reservations. It features a React-based dashboard for monitoring access logs, managing user/room mappings, and system configuration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with custom CSS variables for theming, dark mode support

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Microsoft MSAL (Microsoft Authentication Library) for Azure AD integration
- **API Design**: RESTful endpoints with structured error handling and request logging middleware

## Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema**: Drizzle ORM schema definitions with the following core tables:
  - `users`: System users with authentication
  - `user_mappings`: Links Dahua user IDs to email addresses
  - `room_mappings`: Maps door channels to room email addresses
  - `access_logs`: Records all access attempts with outcomes
  - `system_health`: Monitors service status and connectivity
- **Migrations**: Drizzle Kit for database schema management

## Authentication and Authorization
- **Microsoft Graph Integration**: Uses client credentials flow for service-to-service authentication
- **Azure Configuration**: Configured with client ID, tenant ID, and client secret
- **Access Control Logic**: Validates user access by checking calendar bookings in real-time

## External Service Integrations
- **Dahua Device Integration**: 
  - Receives webhook events from face recognition devices
  - Supports digest authentication for device API communication
  - Handles door control operations via REST API
- **Microsoft Graph API**:
  - Calendar booking validation
  - Room availability checking
  - Auto check-in functionality for valid bookings
- **Real-time Monitoring**: Dashboard updates with 30-second polling intervals for live data

## Core Workflow
1. **Event Reception**: Webhook endpoint receives face recognition events from Dahua devices
2. **User Resolution**: Maps Dahua user ID to email address using stored mappings
3. **Room Resolution**: Maps door channel to room email address
4. **Calendar Validation**: Queries Microsoft Graph to verify active booking with user as attendee
5. **Access Decision**: Grants or denies access based on booking validation
6. **Door Control**: Sends unlock command to Dahua device for approved access
7. **Logging**: Records all events with detailed metadata for audit trails

## Development and Testing Features
- **Test Interface**: Built-in endpoints for simulating webhook events and testing integrations
- **Health Monitoring**: Real-time system health checks for all external services
- **Configuration Management**: Environment-based configuration with fallback defaults
- **Error Handling**: Comprehensive error tracking and user-friendly error messages