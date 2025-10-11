# Overview

SarmayaGhar is an AI-powered real estate investment platform specifically designed for the Pakistani market. The application provides intelligent property valuation, market analysis, portfolio management, and investment insights using machine learning models. It integrates React frontend with Express/Node.js backend, featuring property listings, AI chatbot assistance, interactive heatmaps, and comprehensive investment analytics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client application is built with React and TypeScript, utilizing a component-based architecture with shadcn/ui for consistent design patterns. The UI follows the "new-york" style variant with Tailwind CSS for styling and responsive design. Key architectural decisions include:

- **State Management**: Uses React Query (@tanstack/react-query) for server state management and caching, with React hooks for local state
- **Routing**: Implements wouter for lightweight client-side routing
- **Form Handling**: Leverages react-hook-form with Zod validation for type-safe form management
- **Component Structure**: Organized with reusable UI components in /components/ui and feature-specific components at the root level
- **Data Visualization**: Integrates Chart.js for property analytics and portfolio visualization

## Backend Architecture
The server follows an Express.js architecture with TypeScript, implementing RESTful API patterns:

- **API Design**: Centralized route registration with middleware for logging and error handling
- **Data Layer**: Uses in-memory storage (MemStorage) as the primary data store with interfaces designed for easy database migration
- **ML Integration**: Simulates machine learning models for property valuation, market predictions, and ROI calculations
- **AI Services**: Integrates OpenAI GPT-5 for chatbot functionality and market analysis

## Database Design
Currently uses in-memory storage with a schema defined for PostgreSQL migration:

- **Schema Management**: Drizzle ORM with TypeScript for type-safe database operations
- **Data Models**: Comprehensive schemas for properties, valuations, portfolio tracking, and chat messages
- **Migration Ready**: Configured for PostgreSQL with Neon Database serverless connection

## Authentication & Session Management
The application includes session management infrastructure:

- **Session Storage**: Configured for PostgreSQL session storage using connect-pg-simple
- **Security**: Implements proper CORS and session handling middleware

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL serverless database with connection pooling
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL operations

## AI & Machine Learning
- **OpenAI API**: GPT-5 integration for chatbot functionality and market analysis
- **Chart.js**: Client-side data visualization for property analytics

## UI & Styling
- **shadcn/ui**: Component library with Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Accessible component primitives for complex UI patterns

## Development Tools
- **Vite**: Build tool and development server with React plugin
- **TypeScript**: Type safety across frontend and backend
- **Replit Integration**: Development environment with cartographer and error overlay plugins

## Pakistani Market Specific
- **Currency**: PKR formatting and Pakistani city/area databases
- **Property Types**: Local property categories (marla, kanal measurements)
- **Market Data**: Simulated ML models for Pakistani real estate trends