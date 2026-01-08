# Vibe 🎵

A modern, cross-platform desktop music player built with Tauri, React, and TypeScript.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **Desktop Runtime**: Tauri v2
- **Build Tool**: Vite 7
- **UI Components**: Radix UI, Lucide React icons
- **Styling**: Tailwind CSS v4 with CSS-first configuration

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd vibemusic
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run in development mode**

   ```bash
   # Web only
   npm run dev

   # Desktop app with Tauri
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

## Available Scripts

| Command               | Description                   |
| --------------------- | ----------------------------- |
| `npm run dev`         | Start Vite dev server         |
| `npm run build`       | Build for production          |
| `npm run preview`     | Preview production build      |
| `npm run tauri dev`   | Run Tauri in development mode |
| `npm run tauri build` | Build Tauri application       |
| `npm run lint`        | Run ESLint and Stylelint      |
| `npm run lint:fix`    | Auto-fix linting issues       |

## Project Structure

```
vibemusic/
├── src/                    # React frontend source
│   ├── components/         # UI components
│   │   └── ui/             # shadcn/ui components
│   ├── lib/                # Utility functions
│   ├── styles/             # Global styles
│   └── App.tsx             # Main application
├── src-tauri/              # Tauri backend (Rust)
├── public/                 # Static assets
└── package.json
```

## Code Quality

This project uses:

- **ESLint** for TypeScript/React linting
- **Stylelint** for CSS linting
- **Husky** for pre-commit hooks
- **lint-staged** to run linters on staged files

Pre-commit hooks automatically lint your code before each commit.

## Recommended VS Code Extensions

- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## License

MIT
