# Backend Setup and Startup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start the Backend Server

```bash
npm run dev
```

You should see:

```
Server listening on port 5000
API available at http://localhost:5000
Animals API: http://localhost:5000/api/animals
```

### 3. Test the Connection

#### Test Animals API (Works without MongoDB)

```bash
curl http://localhost:5000/api/animals
```

#### Test in Browser

Visit: http://localhost:5000/api/animals

### MongoDB Setup (Optional for AI Chat)

If you want the AI Chat and booking features to work with persistent data:

1. **Install MongoDB Community Edition**
   - Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
   - Mac: `brew tap mongodb/brew && brew install mongodb-community`
   - Linux: Follow official MongoDB docs

2. **Start MongoDB**

   ```bash
   # Windows (after installation)
   mongod

   # Mac
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

3. **Seed the Database**
   ```bash
   npm run seed
   ```

### Available Endpoints

- `GET /api/animals` - Get all animals (works without MongoDB)
- `GET /api/animals/tags` - Get all tags
- `GET /api/animals/:id` - Get specific animal
- `GET /api/animals/search/:term` - Search animals
- `GET /api/animals/tag/:tag` - Filter by tag
- `POST /api/ai/chat` - Chat with AI (requires MongoDB)
- `GET /api/ai/memory/:userId/:animalId` - Get chat history (requires MongoDB)
- `DELETE /api/ai/memory/:userId/:animalId` - Clear chat history (requires MongoDB)

### Troubleshooting

**Issue: "Network Error" in frontend**

- Make sure backend is running on port 5000
- Check if terminal shows `Server listening on port 5000`

**Issue: MongoDB connection errors but still works**

- This is OK! Server will continue without MongoDB
- Animals API will work, but AI Chat won't persist data

**Issue: "Cannot find module" errors**

- Run `npm install` in the backend directory again

### Frontend Connection

Frontend is configured to connect to:

- Development: `http://localhost:5000`
- Production: `/` (same domain)

Start frontend in separate terminal:

```bash
cd frontend
npm install
npm start
```

Frontend will run on: http://localhost:3000
