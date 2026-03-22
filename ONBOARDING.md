# TFGF Web - Developer Onboarding Guide

Welcome to the TFGF Web project! This guide will help you get started with the codebase and understand how to work with our modern Electron + React + Vite + TypeScript stack.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **Git**: For version control

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/cs2ag6swe1isatu/tfgf-web.git
   cd tfgf-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run package
   ```

## 🏗️ Project Architecture

### Tech Stack Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Desktop Framework** | Electron 33.0.2 | Cross-platform desktop app |
| **Frontend** | React 18 + TypeScript | User interface |
| **Build Tool** | Vite 5 | Fast development and build |
| **Package Manager** | npm | Dependencies |
| **Code Quality** | ESLint + TypeScript | Code linting and type checking |

### Project Structure

```
tfgf-web/
├── src/                    # Source code
│   ├── main.ts            # Electron main process
│   ├── preload.ts         # Preload script (security bridge)
│   ├── renderer.tsx       # React application entry
│   └── index.css          # Global styles
├── index.html             # HTML template
├── forge.config.ts        # Electron Forge configuration
├── vite.*.config.mts      # Vite build configurations
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## 🛠️ Development Workflow

### Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start development server with hot reload |
| `npm run package` | Package app for current platform |
| `npm run make` | Create distributable packages |
| `npm run lint` | Run ESLint code quality checks |
| `npm run publish` | Publish to distribution channels |

### Development Tips

- **Hot Reload**: Changes to React components are reflected instantly
- **DevTools**: Electron opens with developer tools by default
- **TypeScript**: Full type checking and IntelliSense support
- **ESLint**: Automatic code formatting and quality checks

## 📚 For Vanilla HTML/CSS/JS Developers

### Key Differences from Vanilla Web Development

#### 1. **Component-Based Architecture**

**Vanilla JS:**
```javascript
// index.html
<div id="app"></div>

// app.js
document.getElementById('app').innerHTML = `
  <h1>Hello World</h1>
  <button onclick="handleClick()">Click me</button>
`;

function handleClick() {
  alert('Button clicked!');
}
```

**React (Our Approach):**
```tsx
// src/components/App.tsx
import React, { useState } from 'react';

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Hello World</h1>
      <button onClick={() => setCount(count + 1)}>
        Click me ({count})
      </button>
    </div>
  );
};

export default App;
```

#### 2. **State Management**

**Vanilla JS:**
```javascript
// Global variables and manual DOM updates
let counter = 0;
const counterElement = document.getElementById('counter');

function increment() {
  counter++;
  counterElement.textContent = counter;
}
```

**React:**
```tsx
import React, { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};
```

#### 3. **Styling Approach**

**Vanilla CSS:**
```css
/* styles.css */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
}
```

**Our CSS-in-JS Approach:**
```css
/* src/index.css - Global styles */
.app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.primary-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.primary-button:hover {
  background-color: #0056b3;
}
```

#### 4. **File Organization**

**Vanilla Project Structure:**
```
project/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   └── utils.js
└── images/
```

**Our React Structure:**
```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Header.tsx
│   └── Modal.tsx
├── pages/              # Page-level components
│   ├── HomePage.tsx
│   └── SettingsPage.tsx
├── utils/              # Helper functions
│   ├── api.ts
│   └── helpers.ts
├── types/              # TypeScript type definitions
│   └── interfaces.ts
├── renderer.tsx        # App entry point
└── index.css           # Global styles
```

### Learning Resources

#### Essential React Concepts
1. **Components**: Reusable UI building blocks
2. **Props**: Data passed between components
3. **State**: Component-specific data that changes over time
4. **Hooks**: Functions that let you use React features (useState, useEffect, etc.)
5. **JSX**: JavaScript syntax extension for writing HTML-like code

#### Recommended Learning Path
1. **React Basics**: [React Official Tutorial](https://react.dev/learn/tutorial-tic-tac-toe)
2. **TypeScript**: [TypeScript Handbook](https://www.typescriptlang.org/docs/)
3. **Vite**: [Vite Documentation](https://vitejs.dev/guide/)
4. **Electron**: [Electron Quick Start](https://www.electronjs.org/docs/latest/tutorial/quick-start)

### Common Patterns

#### Creating a New Component

1. **Create the component file:**
```tsx
// src/components/WelcomeCard.tsx
import React from 'react';
import './WelcomeCard.css';

interface WelcomeCardProps {
  title: string;
  subtitle?: string;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ title, subtitle }) => {
  return (
    <div className="welcome-card">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
};

export default WelcomeCard;
```

2. **Add component styles:**
```css
/* src/components/WelcomeCard.css */
.welcome-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.welcome-card h2 {
  margin: 0 0 8px 0;
  color: #333;
}

.welcome-card p {
  margin: 0;
  color: #666;
}
```

3. **Use the component:**
```tsx
// src/renderer.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import WelcomeCard from './components/WelcomeCard';
import './index.css';

const App = () => {
  return (
    <div className="app-container">
      <WelcomeCard 
        title="Welcome to TFGF Web" 
        subtitle="Built with React and Electron" 
      />
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. **Dependencies Not Installing**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 2. **TypeScript Errors**
- Check `tsconfig.json` for proper configuration
- Ensure all dependencies have TypeScript types
- Use `npm install @types/package-name` for missing types

#### 3. **Electron Not Starting**
- Verify Node.js version compatibility
- Check `forge.config.ts` for correct paths
- Ensure `main.ts` exports are correct

#### 4. **Build Failures**
```bash
# Clean build artifacts
rm -rf .vite
npm run package
```

### Getting Help

1. **Check the console**: Electron DevTools show detailed error messages
2. **Review logs**: `npm start` outputs helpful debugging information
3. **Search issues**: Check GitHub for similar problems
4. **Ask the team**: Use team communication channels

## 📋 Code Style Guidelines

### ESLint Rules
- Use TypeScript for all new code
- Follow React best practices
- Import statements should be organized
- Use consistent naming conventions

### Git Workflow
1. Create feature branches: `git checkout -b feature/your-feature`
2. Commit with clear messages: `git commit -m "Add user authentication"`
3. Push to remote: `git push origin feature/your-feature`
4. Create pull request for review

## 🎯 Next Steps

1. **Explore the codebase**: Look at existing components in `src/components/`
2. **Run the app**: `npm start` and experiment with changes
3. **Read documentation**: Check out the official docs for each technology
4. **Start small**: Create a simple component to get familiar with the patterns
5. **Ask questions**: Don't hesitate to reach out for help

Welcome to the team! 🎉