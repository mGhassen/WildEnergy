# Wild Energy Gym Management System

## Overview

Wild Energy is a comprehensive gym management system built as a full-stack web application. It provides separate interfaces for administrators and members, featuring class scheduling, subscription management, check-in systems with QR codes, and a mobile-optimized member experience.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Mobile Support**: Responsive design with mobile-first approach

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Authentication**: Better-Auth with support for email/password and social providers (Google, Apple)
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful APIs with JSON responses

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema**: Type-safe schema definitions with Zod validation
- **Migrations**: Drizzle Kit for database migrations
- **Connection**: Neon Database serverless driver with WebSocket support

## Key Components

### Authentication System
- **Provider**: Better-Auth with multiple authentication methods
- **Social Login**: Google and Apple OAuth integration
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Role-based Access**: Admin and member role separation
- **Security**: HTTP-only cookies, CSRF protection

### User Management
- **Admin Interface**: Full CRUD operations for users, members, and trainers
- **Member Profiles**: Personal information, subscription status, class history
- **Trainer Management**: Trainer assignments and class scheduling

### Class Management
- **Class Types**: Different fitness class categories with capacity limits
- **Scheduling**: Flexible scheduling system with recurring and one-time classes
- **Registration**: Member class booking with capacity management
- **Check-in System**: QR code-based attendance tracking

### Subscription System
- **Plans**: Multiple membership plan types with different access levels
- **Billing**: Subscription tracking with expiration dates
- **Access Control**: Plan-based feature restrictions

### QR Code System
- **Generation**: Dynamic QR codes for class registrations
- **Scanning**: Camera-based QR scanning with manual entry fallback
- **Validation**: Server-side QR code validation and attendance marking

### Mobile Experience
- **Progressive Web App**: Mobile-optimized interface
- **Offline Support**: Basic offline functionality for viewing schedules
- **Touch-friendly**: Optimized touch interactions and gestures

## Data Flow

### Authentication Flow
1. User submits credentials via login form
2. Better-Auth validates credentials against database
3. Session created and stored in PostgreSQL
4. Client receives session cookie for subsequent requests
5. Protected routes validate session on each request

### Class Registration Flow
1. Member browses available classes in calendar view
2. System checks subscription validity and class capacity
3. Registration created with unique QR code generation
4. Member receives confirmation with QR code for check-in
5. Check-in validates QR code and marks attendance

### Admin Dashboard Flow
1. Admin accesses protected admin routes
2. Real-time data fetched via TanStack Query
3. CRUD operations update database via API endpoints
4. Client state automatically revalidated and updated

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **better-auth**: Authentication framework
- **drizzle-orm**: Type-safe ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **TypeScript**: Type safety across the stack
- **Vite**: Fast build tool and dev server
- **ESBuild**: Fast JavaScript bundler for production
- **Drizzle Kit**: Database migration tool

### QR Code Libraries
- **qrcode**: QR code generation
- **jsqr**: Client-side QR code scanning

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: ESBuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied before deployment
4. **Assets**: Static assets served from build directory

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Session encryption key
- **GOOGLE_CLIENT_ID/SECRET**: OAuth credentials
- **APPLE_CLIENT_ID/SECRET**: Apple OAuth credentials
- **NODE_ENV**: Environment mode (development/production)

### Production Considerations
- **Session Storage**: PostgreSQL-backed session store for scalability
- **Static Assets**: Served efficiently with proper caching headers
- **Security**: HTTPS enforcement, secure cookies, CSRF protection
- **Performance**: Query optimization, connection pooling

## Changelog
- June 29, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
Date format: French format (DD/MM/YYYY) throughout the application.
Language: French labels and text for calendar and schedule displays.
Weekly calendar view: Day cards must take full vertical space for better layout.

Schedule Repetition Logic:
- "once": Show only on the exact selected date
- "weekly": Repeat on the same day of week from start date to end date
- "daily": Repeat every day from start date to end date
- All schedules created as individual database entries with specific dates