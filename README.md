# Algolia Front End Validator

A Chrome DevTools extension that monitors and validates Algolia Search and Insights API calls in real-time.

## What it does

- Captures Algolia search requests and insights events
- Validates proper linking between queries and events
- Shows real-time traffic in a DevTools panel
- Detects common configuration issues

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the extension**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

1. Open DevTools (F12)
2. Go to "Algolia Validator" tab
3. Click "Start Capture"
4. Use the website to generate Algolia traffic
5. View results in the panel

## Development

```bash
# Watch mode
npm run dev

# Clean build
npm run clean && npm run build
```

## Project Structure

```
src/
├── background/          # Network interception
├── devtools/           # DevTools panel
│   ├── components/     # UI components
│   ├── pages/          # Main views
│   ├── utils/          # Helpers
│   └── types.ts        # TypeScript types
└── store/              # State management
```
