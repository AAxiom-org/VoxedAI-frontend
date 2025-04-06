# VoxAI

## Physical Project code located [here](https://github.com/aidanandrews22/VoxAI-physical)

## Features

- **Space Management**: Create and manage spaces for organizing your files and conversations
- **File Upload**: Upload various file types to your spaces
- **AI Chat**: Interact with your files using Gemini AI with streaming responses
- **Authentication**: Secure authentication with Clerk

## AI Integration

VoxAI uses Google's Gemini 1.5 Flash 8B model for AI chat functionality. The integration features:

- Real-time streaming responses
- Context-aware conversations
- Efficient processing of various file types

To use the Gemini integration:

1. Get an API key from [Google AI Studio](https://makersuite.google.com/)
2. Add your API key to the `.env` file as `VITE_GEMINI_API_KEY`

## Environment Setup

Copy the `.env.example` file to `.env` and fill in the required values:

```
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON=your_supabase_anon_key

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Gemini
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from "eslint-plugin-react";

export default tseslint.config({
  // Set the react version
  settings: { react: { version: "18.3" } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs["jsx-runtime"].rules,
  },
});
```
