<h1 align="center">Soulbound Studio App</h1>

<br />

This Manifold Studio app allows you to deploy soulbound (non-transferrable) tokens and collections on an existing ERC-721 contract

<br />

# 🚀 Available Scripts

In the project directory, you can run:

<br />

## ⚡️ start

```
npm start
```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

<br />

# 🧬 Project structure

This is the structure of the files in the project:

```sh
    │
    ├── public                  # public files (favicon, .htaccess, manifest, ...)
    ├── src                     # source files
    │   ├── contracts           # contract bytecode
    │   ├── lib                 # abis
    │   ├── pages               
    │   ├── styles
    │   ├── types               # data interfaces
    │   ├── utility             # utilities functions and custom components
    │   ├── App.tsx
    │   ├── index.tsx
    │   ├── react-app-env.d.ts
    │   ├── RootComponent.tsx   # React component with all the routes
    │   ├── serviceWorker.ts
    │   ├── setupTests.ts
    │   └── types.ts            # Data interfaces
    ├── .eslintrc.js
    ├── .gitignore
    ├── .prettierrc
    ├── package.json
    ├── README.md
    └── tsconfig.json
```

# 📖 Types

- `AttachmentInfo` - Instance associating creator contract with extension
- `Collection` - Instance of a soulbound collection
-- Keeps track of `edition`: the total number of editions in the collection
- `AirDroppedToken` - Instance of an asset to a collection
-- Keeps track of `gifted`: whether or not the token is minted to receiver
