# Moataz Kobry — React + Three.js Portfolio

V10 is a source-controlled **React + TypeScript + Vite** single-page portfolio.

**Site technologies:** React 19, Vite 7, TypeScript 5, Motion for React, Three.js, React Three Fiber, Drei and Lucide icons.

## Start development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The build output is `dist/` and deploys automatically through `.github/workflows/deploy-pages.yml` in the repository root.

### Structure

- `src/App.tsx` — page architecture, interactions, navigation, project presentation.
- `src/components/CyberScene.tsx` — standalone WebGL / R3F scene.
- `src/data/portfolio.ts` — professional details, stack, links and interactive content.
- `src/styles.css` — responsive design system and component styles.
- `public/moataz-photo.png` — the original portrait, used once in the webpage.

### Customize the published base URL

`vite.config.ts` has `base: '/kobrymoataz/'`, for `https://kobrymoataz.github.io/kobrymoataz/`.
If you deploy the site to a different repository or domain, adjust this base path.

### Email functionality

The Request CV link opens an email draft addressed to `president@mycdic.org` using a `mailto:` URL. It does not send mail without confirmation.
