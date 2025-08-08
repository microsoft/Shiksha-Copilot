# Shiksha Co-Pilot Backend

_The Node.js (Express + MongoDB) backend for the **Shiksha Co-Pilot** — a generative AI assistant that helps teachers with lesson planning, classroom activities, and transforming classroom experiences._

---

## Overview

This backend powers the [Shiksha Co-Pilot Angular Frontend] and acts as the bridge to the **Co-Pilot LLM APIs** developed by Microsoft Research India.

It handles:

- API endpoints consumed by the frontend  
- User authentication and authorization  
- Data aggregation and processing  
- Communication with Co-Pilot LLM APIs  
- MongoDB-based data storage and retrieval  

---

## Project Structure

```
shiksha-backend/
├── aggregation/           # Logic to aggregate and process data
├── config/                # App and MongoDB configuration 
├── controllers/           # Route controllers (handle business logic)
├── dao/                   # Data Access Objects (MongoDB queries, abstractions)
├── helper/                # Utility functions and helper logic
├── managers/              # Business logic layer (orchestrates services and DAOs)
├── middlewares/           # Express middlewares (auth, logging, error handling)
├── migrations/            # MongoDB migration scripts
├── models/                # Mongoose models and schemas
├── public/                # Public static files
├── routes/                # API route definitions and route handlers
├── services/              # Integration with external services
├── uploads/               # File upload directory
├── validations/           # Payload validators
├── worker/                # Background workers
├── .env.example           # Example environment variable configuration
├── .gitignore             # Files and directories to ignore in Git
├── README.md              # Project documentation
├── app.js                 # Express app initialization
├── package-lock.json      # Auto-generated dependency lock file
├── package.json           # Project metadata, scripts, dependencies
```
---

## Prerequisites

Ensure the following are installed on your system:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- [MongoDB](https://www.mongodb.com/) (local or cloud instance)

---

## Installation

Clone the repository and install dependencies:

```bash
cd shiksha-backend
npm install
```

---

### Environment Setup

Create a `.env` file in the root directory and populate it with the variables from .env.example, replacing the values with your own.

---

### Running the Server

To start the development server with **auto-reloading**, use:

```bash
nodemon app.js
```

> **This uses [nodemon](https://www.npmjs.com/package/nodemon) for hot-reloading.**  
> If you don't have it installed globally, run:

```bash
npm install -g nodemon
```

By default, the server runs at:  
[http://localhost:8000]


## API Endpoints

The backend exposes several endpoints for interacting with the Shiksha Co-Pilot assistant. Below is an example of one such endpoint.

### POST `/api/chat/message`

Sends a user message to the Co-Pilot AI assistant and returns a generated response.

---

### **Example Usage**

**Request:**

```bash
curl -X POST http://localhost:8000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer <your_jwt_token>" \
  -d '{"message": "Give me 5 mcqs on solar system"}'
```

**Request Body:**

```json
{
  "message": "Give me 5 mcqs on solar system"
}
```

**Response:**

```json
{
  "message": "Response from copilot",
  "data": "Here are five multiple-choice questions (MCQs) on the solar system suitable for middle school students:..."
}
```