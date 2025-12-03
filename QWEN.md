# Okey AI - Project Documentation

## Project Overview
Okey AI is a cross-platform desktop application built using Tauri, React, and TypeScript. The project leverages modern web technologies to create a native desktop experience with access to system-level features through Tauri plugins.

## Important Note for Development
⚠️ **CRITICAL**: This project uses **Tauri 2.0**. When writing code for this project, always use Tauri 2.0 APIs and syntax. Do NOT use Tauri 1.0 code patterns, as they are incompatible with Tauri 2.0. Pay special attention to:
- API differences between Tauri 1.x and 2.x
- Updated plugin interfaces
- New event system and command handlers
- Updated configuration options

## Technology Stack
- **Frontend**: React 19 with TypeScript
- **Backend**: Rust (Tauri 2.0)
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS
- **State Management**: TanStack Store (optional, as per documentation)
- **Build Tool**: Vite
- **Linting/Formatting**: Biome
- **Testing**: Vitest
- **UI Components**: Radix UI with Lucide React icons

## Project Structure
```
okey_ai/
├── package.json              # Node.js dependencies and scripts
├── vite.config.ts           # Vite build configuration
├── tsconfig.json            # TypeScript configuration
├── biome.json               # Biome linting and formatting config
├── README.md                # Project documentation
├── index.html               # HTML entry point
├── src/                     # Frontend source code
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   ├── routes/              # Route components (TanStack Router)
│   ├── main.tsx             # Application entry point
│   ├── routeTree.gen.ts     # Generated route tree
│   ├── styles.css           # Global styles
│   └── reportWebVitals.ts   # Performance reporting
└── src-tauri/               # Tauri backend source code
    ├── Cargo.toml           # Rust dependencies
    ├── tauri.conf.json      # Tauri configuration
    ├── src/                 # Rust source files
    ├── capabilities/        # Tauri capabilities
    └── icons/               # Application icons
```

## Key Features
- Cross-platform desktop application (Windows, macOS, Linux)
- System tray integration
- Global keyboard shortcuts
- HTTP client capabilities
- File-based routing with TanStack Router
- Tailwind CSS for styling with responsive design
- Modern React with TypeScript type safety
- Integrated development tools and dev server

## Development Scripts
- `pnpm dev` - Start development server on port 3000
- `pnpm build` - Build for production
- `pnpm serve` - Preview production build
- `pnpm test` - Run unit tests
- `pnpm format` - Format code with Biome
- `pnpm lint` - Lint code with Biome
- `pnpm check` - Run Biome check

## Tauri Plugins
- `@tauri-apps/plugin-global-shortcut` - For global keyboard shortcuts
- `@tauri-apps/plugin-http` - For HTTP requests
- `@tauri-apps/api` - Core Tauri API functionality
- Tray icon support

## Routing System
The application uses TanStack Router with a file-based routing system. Routes are defined in the `src/routes/` directory and automatically converted to the route tree in `src/routeTree.gen.ts`.

## Styling
- Tailwind CSS v4 for utility-first CSS framework
- Custom CSS in `src/styles.css` for global styles
- Responsive design capabilities
- Component styling using class-variance-authority and tailwind-merge

## State Management
The project is set up to use TanStack Store for state management (as mentioned in documentation), though other state management solutions can be integrated as needed.

## Data Fetching
- Route-based data loading with TanStack Router's loader functionality
- HTTP plugin for backend communication
- Capability to integrate TanStack Query for advanced data fetching

## Development Tools
- Hot Module Replacement (HMR) during development
- React DevTools and TanStack Router DevTools
- TypeScript type checking
- Biome for consistent code formatting and linting
- Vitest for testing

## Build and Deployment
- Vite for fast builds and development
- Tauri builds desktop applications for multiple platforms
- Automatic bundling of frontend and backend
- Pre-configured build commands in package.json

## Testing
- Vitest for unit testing
- React Testing Library for component testing
- Easy test running with npm scripts

## Additional Notes
- Uses alias `@` for `src` directory imports
- Follows modern React best practices
- Tauri provides secure access to system-level functionality
- Configured with strict TypeScript settings
- Includes performance monitoring capabilities