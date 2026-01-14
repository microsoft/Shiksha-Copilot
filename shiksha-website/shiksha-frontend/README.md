# Shiksha Frontend

_A modern Angular frontend for the Shiksha Co-Pilot — a generative AI assistant designed to support teachers in planning lessons, creating activities, and transforming classroom experiences._

## Description

The **Shiksha Co-Pilot** project is developed by **VeLLM (Microsoft Research India)** in collaboration with the **Shikshana Foundation**. It is a next-generation generative AI tool that empowers **school teachers** by assisting them in:

- Drafting lesson plans  
- Designing interactive classroom activities  
- Enhancing their teaching strategies with AI-driven support  

This repository contains the **Angular-based frontend** of the Shiksha Co-Pilot platform. The frontend offers a clean, intuitive user interface that enables teachers to interact with the AI assistant effectively and efficiently.

---

## Project Structure

```
shiksha-frontend/
├── src/
│   ├── app/
│   │   ├── auth/             # Authentication module
│   │   ├── components/       # General-purpose components
│   │   ├── core/             # Singleton services, interceptors, directives, guards
│   │   ├── layout/           # Layout components (header, sidebar, content layout)
│   │   ├── shared/           # Shared components, pipes, interfaces, utils, services
│   │   ├── types/            # Global TypeScript interfaces and types
│   │   └── view/             # Feature modules
│   │       ├── admin/        # Admin module: components, routes, services
│   │       └── user/         # User module: components, routes, services
│   ├── assets/               # Static assets (images, icons, fonts)
│   ├── environments/
│   │   ├── environment.ts    # Development environment variables
│   │   └── environment.prod.ts # Production environment variables
│   ├── index.html            # Application entry point
│   ├── main.ts               # Main bootstrap file
│   ├── styles.scss           # Global styles
├── angular.json              # Angular CLI configuration
├── package.json              # NPM dependencies and scripts
├── palette.js                # Color palette
├── tailwind.config.js        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

---

## Setup

### Prerequisites

Make sure you have the following installed before starting:

- [Node.js](https://nodejs.org/) (v18 or above recommended)
- [Angular CLI](https://angular.io/cli) (v16)

To install Angular CLI globally:

```bash
npm install -g @angular/cli
```

---

## Installation

Clone the repo and install dependencies:

```bash
cd shiksha-frontend
npm install
```

---

## Environment Setup

After installing dependencies, configure your environment variables.

Open the file:  
`src/environments/environment.dev.ts`
`src/environments/environment.ts`

Update it with your API endpoint and secret values:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://your-api-endpoint.com/api',
  CRYPTO_SECRET: 'your-secure-secret-key'
};
```

---

## Running the Application

```bash
ng serve
```

Then open your browser and navigate to:  
[http://localhost:4200]

