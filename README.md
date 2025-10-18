# Seva Setu - A Bridge of Goodness

A comprehensive volunteer management platform built with React.js frontend and FastAPI backend, featuring real-time messaging, gamification, AI-powered features, and impact measurement.

## Features

- **User Management**: Registration, authentication, and profile management
- **NGO Management**: NGO registration, profile management, and event organization
- **Event Management**: Create, manage, and track volunteer events
- **Real-time Messaging**: WebSocket-based messaging system
- **Gamification**: Badges, leaderboards, and achievement tracking
- **AI Features**: AI-powered content generation and recommendations
- **Impact Measurement**: Track and visualize volunteer impact
- **Donations**: Integrated donation system with Stripe
- **Analytics**: Comprehensive analytics and reporting

## Tech Stack

### Frontend
- React.js 18
- Tailwind CSS
- Framer Motion (animations)
- Axios (HTTP client)
- React Router

### Backend
- FastAPI (Python)
- Supabase (PostgreSQL database)
- JWT authentication
- WebSocket support
- Groq AI integration

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/codewithayuu/seva-setu
   cd seva-setu
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   # Configure your environment variables
   python server.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Environment Variables

Create a `.env` file in the backend directory with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
STRIPE_API_KEY=your_stripe_api_key
GROQ_API_KEY=your_groq_api_key
```

## Database Setup

The application uses Supabase (PostgreSQL). 

### Backend
- Deploy using Docker or any Python hosting service
- Ensure environment variables are properly configured
- Use a production-ready database (PostgreSQL recommended)

### Frontend
- Build the production version: `npm run build`
- Deploy the `build/` folder to any static hosting service
- Configure API endpoints for production

## Project Structure

```
sevatsetu/
├── backend/           # FastAPI backend
│   ├── server.py     # Main application
│   ├── seed.py       # Database seeding
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/         # Source code
│   ├── public/      # Static assets
│   └── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
