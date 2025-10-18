from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Depends, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, Set
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import base64
import json
import asyncio
import requests
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
supabase: Client = create_client(supabase_url, supabase_key)
JWT_SECRET = os.environ.get('JWT_SECRET', 'seva-setu-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DAYS = 7
STRIPE_API_KEY = os.environ['STRIPE_API_KEY']
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
app = FastAPI()
api_router = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
async def call_groq_ai(prompt: str, model: str = "llama3-8b-8192") -> str:
    """Call Groq AI API with the given prompt"""
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Groq AI API error: {str(e)}")
        return f"AI service temporarily unavailable: {str(e)}"
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> set of connection_ids
    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        try:
            supabase.table('user_presence').upsert({
                'user_id': user_id,
                'status': 'online',
                'last_seen': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Error updating presence: {e}")
    def disconnect(self, connection_id: str, user_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                try:
                    supabase.table('user_presence').upsert({
                        'user_id': user_id,
                        'status': 'offline',
                        'last_seen': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }).execute()
                except Exception as e:
                    logger.error(f"Error updating presence: {e}")
    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to all connections of a specific user"""
        if user_id in self.user_connections:
            for connection_id in list(self.user_connections[user_id]):
                if connection_id in self.active_connections:
                    try:
                        await self.active_connections[connection_id].send_json(message)
                    except Exception as e:
                        logger.error(f"Error sending message to {connection_id}: {e}")
                        self.disconnect(connection_id, user_id)
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        for connection_id in list(self.active_connections.keys()):
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_id}: {e}")
manager = ConnectionManager()
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time updates"""
    connection_id = str(uuid.uuid4())
    await manager.connect(websocket, user_id, connection_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get('type')
            if message_type == 'ping':
                await websocket.send_json({'type': 'pong'})
            elif message_type == 'typing':
                conversation_id = message.get('conversation_id')
                is_typing = message.get('is_typing', False)
                try:
                    participants = supabase.table('conversation_participants').select('user_id').eq('conversation_id', conversation_id).execute()
                    for participant in participants.data:
                        if participant['user_id'] != user_id:
                            await manager.send_personal_message({
                                'type': 'typing',
                                'conversation_id': conversation_id,
                                'user_id': user_id,
                                'is_typing': is_typing
                            }, participant['user_id'])
                except Exception as e:
                    logger.error(f"Error handling typing indicator: {e}")
            elif message_type == 'presence':
                status = message.get('status', 'online')
                try:
                    supabase.table('user_presence').upsert({
                        'user_id': user_id,
                        'status': status,
                        'last_seen': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }).execute()
                except Exception as e:
                    logger.error(f"Error updating presence: {e}")
    except WebSocketDisconnect:
        manager.disconnect(connection_id, user_id)
        logger.info(f"Client {user_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(connection_id, user_id)
async def notify_user(user_id: str, notification_type: str, data: dict):
    """Helper function to send notification via WebSocket"""
    await manager.send_personal_message({
        'type': 'notification',
        'notification_type': notification_type,
        'data': data,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }, user_id)
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    user_type: str = "volunteer"
class UserLogin(BaseModel):
    email: str
    password: str
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    user_type: str
    bio: Optional[str] = None
    avatar: Optional[str] = None
    cover_photo: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    social_links: Dict[str, str] = {}
    skills: List[str] = []
    interests: List[str] = []
    followers_count: int = 0
    following_count: int = 0
    is_private: bool = False
    email_notifications: bool = True
    created_at: str
class NGOCreate(BaseModel):
    name: str
    description: str
    category: str
    founded_year: Optional[int] = None
    website: Optional[str] = None
    location: Optional[str] = None
class NGOUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    founded_year: Optional[int] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    gallery: Optional[List[str]] = None
    location: Optional[str] = None
class NGOTeamMember(BaseModel):
    user_id: str
    role: str = "member"
class PostCreate(BaseModel):
    content: str
    images: List[str] = []
    poll: Optional[Dict[str, Any]] = None
class PostUpdate(BaseModel):
    content: Optional[str] = None
    images: Optional[List[str]] = None
class CommentCreate(BaseModel):
    content: str
class EventCreate(BaseModel):
    title: str
    description: str
    location: str
    location_details: Optional[Dict[str, str]] = {}
    theme: Optional[str] = None
    date: str
    end_date: Optional[str] = None
    images: List[str] = []
    volunteers_needed: int = 10
    category: str = "general"
    requires_application: bool = False
class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    location_details: Optional[Dict[str, str]] = None
    theme: Optional[str] = None
    date: Optional[str] = None
    end_date: Optional[str] = None
    images: Optional[List[str]] = None
    volunteers_needed: Optional[int] = None
    category: Optional[str] = None
class EventTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    default_volunteers_needed: int = 10
    template_data: Dict[str, Any] = {}
class VolunteerApplicationCreate(BaseModel):
    event_id: str
    skills: List[str] = []
    interests: List[str] = []
    experience: Optional[str] = None
    availability: Dict[str, Any] = {}
    motivation: Optional[str] = None
class VolunteerApplicationReview(BaseModel):
    status: str  # approved, rejected
class VolunteerShiftCreate(BaseModel):
    event_id: str
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    volunteers_needed: int = 1
class VolunteerTrainingCreate(BaseModel):
    event_id: str
    title: str
    description: Optional[str] = None
    type: str = "online"
    content_url: Optional[str] = None
    duration_minutes: Optional[int] = None
    required: bool = False
class VolunteerHoursCreate(BaseModel):
    event_id: str
    shift_id: Optional[str] = None
    hours: float
    date: str
    notes: Optional[str] = None
class VolunteerHoursVerify(BaseModel):
    verified: bool
class EventFeedbackCreate(BaseModel):
    event_id: str
    rating: int  # 1-5
    feedback: Optional[str] = None
    suggestions: Optional[str] = None
    would_volunteer_again: Optional[bool] = None
class ConversationCreate(BaseModel):
    participant_ids: List[str]
    name: Optional[str] = None  # For group chats
    type: str = "direct"
class MessageCreate(BaseModel):
    conversation_id: str
    content: str
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    reply_to_id: Optional[str] = None
class MessageUpdate(BaseModel):
    content: str
class MessageReactionCreate(BaseModel):
    reaction: str  # emoji
class PresenceUpdate(BaseModel):
    status: str  # online, offline, away
class TypingIndicator(BaseModel):
    conversation_id: str
    is_typing: bool
class DonationRequest(BaseModel):
    ngo_id: str
    amount: float
    currency: str = "USD"
class ImpactMetricCreate(BaseModel):
    ngo_id: Optional[str] = None
    event_id: Optional[str] = None
    metric_type: str  # volunteer_hours, donations, people_helped, projects_completed
    value: float
    unit: str  # hours, dollars, people, projects
    date: str
    description: Optional[str] = None
class SuccessStoryCreate(BaseModel):
    title: str
    content: str
    ngo_id: Optional[str] = None
    event_id: Optional[str] = None
    category: Optional[str] = None
    images: List[str] = []
    video_url: Optional[str] = None
    impact_numbers: Dict[str, Any] = {}
    tags: List[str] = []
    published: bool = True
class SuccessStoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    images: Optional[List[str]] = None
    video_url: Optional[str] = None
    impact_numbers: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None
    featured: Optional[bool] = None
class TestimonialCreate(BaseModel):
    ngo_id: Optional[str] = None
    event_id: Optional[str] = None
    testimonial: str
    rating: int  # 1-5
    role: str  # volunteer, beneficiary, donor, partner
    location: Optional[str] = None
    name: str
class CaseStudyCreate(BaseModel):
    title: str
    summary: str
    full_content: str
    ngo_id: Optional[str] = None
    event_id: Optional[str] = None
    problem_statement: Optional[str] = None
    solution: Optional[str] = None
    approach: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    beneficiaries_count: Optional[int] = None
    volunteers_involved: Optional[int] = None
    funds_utilized: Optional[float] = None
    outcomes: Dict[str, Any] = {}
    challenges: Optional[str] = None
    learnings: Optional[str] = None
    images: List[str] = []
    documents: List[str] = []
    category: Optional[str] = None
    tags: List[str] = []
    published: bool = True
class OutcomeTrackingCreate(BaseModel):
    ngo_id: str
    event_id: Optional[str] = None
    case_study_id: Optional[str] = None
    outcome_title: str
    outcome_description: Optional[str] = None
    target_metric: str
    baseline_value: float
    target_value: float
    current_value: float
    unit: str
    start_date: str
    target_date: Optional[str] = None
class OutcomeUpdate(BaseModel):
    current_value: float
    last_measured_date: str
    status: str  # in_progress, achieved, at_risk, delayed
    notes: Optional[str] = None
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
def create_jwt_token(user_id: str, email: str) -> str:
    """Create a JWT token"""
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> Optional[Dict]:
    """Get current user from JWT token"""
    if not session_token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            session_token = auth_header.split(' ')[1]
    if not session_token:
        return None
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            return None
        user_result = supabase.table('users').select('*').eq('id', user_id).execute()
        if not user_result.data or len(user_result.data) == 0:
            return None
        user = user_result.data[0]
        try:
            supabase.table('presence').upsert({
                'user_id': user_id,
                'status': 'online',
                'last_seen': datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Could not update presence: {str(e)}")
        return user
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token expired")
        return None
    except jwt.InvalidTokenError:
        logger.warning("Invalid JWT token")
        return None
    except Exception as e:
        logger.error(f"Error getting current user: {str(e)}")
        return None
async def ai_match_volunteer(application: Dict, event: Dict) -> float:
    """Use Gemini AI to match volunteer to event based on skills, interests, and experience"""
    try:
        prompt = f"""
        You are an AI assistant helping to match volunteers with events.
        Event Details:
        - Title: {event.get('title')}
        - Description: {event.get('description')}
        - Category: {event.get('category')}
        Volunteer Application:
        - Skills: {', '.join(application.get('skills', []))}
        - Interests: {', '.join(application.get('interests', []))}
        - Experience: {application.get('experience', 'None provided')}
        - Motivation: {application.get('motivation', 'None provided')}
        Based on this information, provide a matching score between 0 and 1 (where 1 is perfect match).
        Only respond with a single number between 0 and 1.
        """
        ai_response_text = await call_groq_ai(prompt)
        score_text = ai_response_text.strip()
        try:
            score = float(score_text)
            return max(0.0, min(1.0, score))  # Ensure between 0 and 1
        except (ValueError, TypeError):
            return 0.5
    except Exception as e:
        logger.error(f"Error in AI matching: {str(e)}")
        return 0.5  # Return moderate score on error
@api_router.post("/auth/register")
async def register(user: UserRegister):
    """Register a new user"""
    try:
        existing = supabase.table('users').select('*').eq('email', user.email).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed_password = hash_password(user.password)
        user_id = str(uuid.uuid4())
        user_data = {
            'id': user_id,
            'name': user.name,
            'email': user.email,
            'password_hash': hashed_password,
            'user_type': user.user_type,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('users').insert(user_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create user")
        session_token = create_jwt_token(user_id, user.email)
        created_user = result.data[0]
        del created_user['password_hash']
        normalized_user = {
            **created_user,
            'name': created_user.get('name', ''),
            'user_type': created_user.get('user_type', 'volunteer')
        }
        return {
            'user': normalized_user,
            'token': session_token
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user"""
    try:
        result = supabase.table('users').select('*').eq('email', credentials.email).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        user = result.data[0]
        if not verify_password(credentials.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        session_token = create_jwt_token(user['id'], user['email'])
        del user['password_hash']
        normalized_user = {
            **user,
            'name': user.get('name', ''),
            'user_type': user.get('user_type', 'volunteer')
        }
        return {
            'user': normalized_user,
            'token': session_token
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/auth/me")
async def get_me(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    del user['password_hash']
    normalized_user = {
        **user,
        'name': user.get('name', ''),
        'user_type': user.get('user_type', 'volunteer')
    }
    return {'user': normalized_user}
@api_router.post("/auth/logout")
async def logout(response: Response, request: Request, session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    user = await get_current_user(request, session_token)
    if user:
        try:
            supabase.table('presence').upsert({
                'user_id': user['id'],
                'status': 'offline',
                'last_seen': datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.warning(f"Could not update presence on logout: {str(e)}")
    response.delete_cookie('session_token')
    return {'message': 'Logged out successfully'}
@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), request: Request = None, session_token: Optional[str] = Cookie(None)):
    """Upload an image and return the URL"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        contents = await file.read()
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        file_name = f"{uuid.uuid4()}.{file_ext}"
        bucket_name = "images"
        result = supabase.storage.from_(bucket_name).upload(
            file_name,
            contents,
            file_options={"content-type": file.content_type}
        )
        public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
        return {'url': public_url}
    except Exception as e:
        logger.error(f"Image upload error: {str(e)}")
        try:
            base64_image = base64.b64encode(contents).decode()
            data_url = f"data:{file.content_type};base64,{base64_image}"
            return {'url': data_url}
        except:
            raise HTTPException(status_code=500, detail="Failed to upload image")
@api_router.post("/posts")
async def create_post(post: PostCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a new post"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        post_data = {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'content': post.content,
            'images': post.images or [],
            'poll': post.poll,
            'likes_count': 0,
            'comments_count': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('posts').insert(post_data).execute()
        post_response = result.data[0]
        post_response['author_name'] = user['name']
        post_response['author_avatar'] = user.get('avatar')
        post_response['author_type'] = 'user'
        return {'post': post_response}
    except Exception as e:
        logger.error(f"Create post error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/posts")
async def get_posts(limit: int = 50):
    """Get all posts"""
    try:
        result = supabase.table('posts').select('*, users!posts_user_id_fkey(name, avatar)').order('created_at', desc=True).limit(limit).execute()
        posts = []
        for post in result.data:
            post_data = {**post}
            if post.get('users'):
                post_data['author_name'] = post['users'].get('name', 'Unknown')
                post_data['author_avatar'] = post['users'].get('avatar')
                post_data['author_type'] = 'user'
                del post_data['users']
            else:
                post_data['author_name'] = 'Unknown'
                post_data['author_avatar'] = None
                post_data['author_type'] = 'user'
            posts.append(post_data)
        return {'posts': posts}
    except Exception as e:
        logger.error(f"Get posts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Like/unlike a post"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        existing = supabase.table('post_likes').select('*').eq('post_id', post_id).eq('user_id', user['id']).execute()
        if existing.data and len(existing.data) > 0:
            supabase.table('post_likes').delete().eq('post_id', post_id).eq('user_id', user['id']).execute()
            post = supabase.table('posts').select('*').eq('id', post_id).execute()
            if post.data:
                new_count = max(0, post.data[0]['likes_count'] - 1)
                supabase.table('posts').update({'likes_count': new_count}).eq('id', post_id).execute()
            return {'liked': False}
        else:
            like_data = {
                'post_id': post_id,
                'user_id': user['id'],
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('post_likes').insert(like_data).execute()
            post = supabase.table('posts').select('*').eq('id', post_id).execute()
            if post.data:
                new_count = post.data[0]['likes_count'] + 1
                supabase.table('posts').update({'likes_count': new_count}).eq('id', post_id).execute()
                if post.data[0].get('user_id') != user['id']:
                    notification_data = {
                        'id': str(uuid.uuid4()),
                        'user_id': post.data[0]['user_id'],
                        'type': 'post_like',
                        'title': 'New Like',
                        'message': f"{user['name']} liked your post",
                        'link': f"/post/{post_id}",
                        'data': {'post_id': post_id, 'liker_id': user['id']},
                        'read': False,
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                    supabase.table('notifications').insert(notification_data).execute()
                    await notify_user(post.data[0]['user_id'], 'post_like', {
                        'id': notification_data['id'],
                        'title': notification_data['title'],
                        'message': notification_data['message'],
                        'link': notification_data['link']
                    })
            return {'liked': True}
    except Exception as e:
        logger.error(f"Like post error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/posts/{post_id}/poll/vote")
async def vote_on_poll(post_id: str, vote_data: dict, request: Request, session_token: Optional[str] = Cookie(None)):
    """Vote on a poll"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        option_index = vote_data.get('option_index')
        if option_index is None:
            raise HTTPException(status_code=400, detail="option_index is required")
        post = supabase.table('posts').select('*').eq('id', post_id).execute()
        if not post.data or not post.data[0].get('poll'):
            raise HTTPException(status_code=404, detail="Poll not found")
        poll = post.data[0]['poll']
        existing_vote = supabase.table('poll_votes').select('*').eq('post_id', post_id).eq('user_id', user['id']).execute()
        if existing_vote.data and len(existing_vote.data) > 0:
            old_option = existing_vote.data[0]['option_index']
            if old_option != option_index:
                if 0 <= old_option < len(poll['options']):
                    poll['options'][old_option]['votes'] = max(0, poll['options'][old_option]['votes'] - 1)
                if 0 <= option_index < len(poll['options']):
                    poll['options'][option_index]['votes'] = poll['options'][option_index]['votes'] + 1
                supabase.table('poll_votes').update({'option_index': option_index}).eq('post_id', post_id).eq('user_id', user['id']).execute()
        else:
            if 0 <= option_index < len(poll['options']):
                poll['options'][option_index]['votes'] = poll['options'][option_index]['votes'] + 1
            vote_record = {
                'post_id': post_id,
                'user_id': user['id'],
                'option_index': option_index,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('poll_votes').insert(vote_record).execute()
        supabase.table('posts').update({'poll': poll}).eq('id', post_id).execute()
        return {'success': True, 'poll': poll}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vote on poll error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, comment: CommentCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a comment on a post"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        comment_data = {
            'id': str(uuid.uuid4()),
            'post_id': post_id,
            'user_id': user['id'],
            'content': comment.content,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('post_comments').insert(comment_data).execute()
        post = supabase.table('posts').select('*').eq('id', post_id).execute()
        if post.data:
            new_count = post.data[0]['comments_count'] + 1
            supabase.table('posts').update({'comments_count': new_count}).eq('id', post_id).execute()
            if post.data[0].get('user_id') != user['id']:
                notification_data = {
                    'id': str(uuid.uuid4()),
                    'user_id': post.data[0]['user_id'],
                    'type': 'post_comment',
                    'title': 'New Comment',
                    'message': f"{user['name']} commented on your post",
                    'link': f"/post/{post_id}",
                    'data': {'post_id': post_id, 'commenter_id': user['id']},
                    'read': False,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                supabase.table('notifications').insert(notification_data).execute()
                await notify_user(post.data[0]['user_id'], 'post_comment', {
                    'id': notification_data['id'],
                    'title': notification_data['title'],
                    'message': notification_data['message'],
                    'link': notification_data['link']
                })
        return {'comment': result.data[0]}
    except Exception as e:
        logger.error(f"Create comment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str):
    """Get all comments for a post"""
    try:
        result = supabase.table('comments').select('*').eq('post_id', post_id).order('created_at', desc=False).execute()
        return {'comments': result.data}
    except Exception as e:
        logger.error(f"Get comments error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/ngos")
async def create_ngo(ngo: NGOCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a new NGO"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        ngo_id = str(uuid.uuid4())
        ngo_data = {
            'id': ngo_id,
            'name': ngo.name,
            'description': ngo.description,
            'category': ngo.category,
            'founded_year': ngo.founded_year,
            'website': ngo.website,
            'location': ngo.location,
            'owner_id': user['id'],
            'followers_count': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('ngos').insert(ngo_data).execute()
        team_member_data = {
            'ngo_id': ngo_id,
            'user_id': user['id'],
            'role': 'owner',
            'name': user['name'],
            'avatar': user.get('avatar')
        }
        supabase.table('ngo_team_members').insert(team_member_data).execute()
        return {'ngo': result.data[0]}
    except Exception as e:
        logger.error(f"Create NGO error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/ngos")
async def get_ngos(limit: int = 50):
    """Get all NGOs"""
    try:
        result = supabase.table('ngos').select('*').order('created_at', desc=True).limit(limit).execute()
        return {'ngos': result.data}
    except Exception as e:
        logger.error(f"Get NGOs error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/ngos/{ngo_id}")
async def get_ngo(ngo_id: str):
    """Get NGO by ID"""
    try:
        result = supabase.table('ngos').select('*').eq('id', ngo_id).execute()
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="NGO not found")
        team_result = supabase.table('ngo_team_members').select('*').eq('ngo_id', ngo_id).execute()
        ngo_data = result.data[0]
        ngo_data['team_members'] = team_result.data
        return {'ngo': ngo_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get NGO error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/events")
async def create_event(event: EventCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a new event"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        event_data = {
            'id': str(uuid.uuid4()),
            'ngo_id': user['id'],
            'ngo_name': user['name'],
            'title': event.title,
            'description': event.description,
            'location': event.location,
            'location_details': event.location_details,
            'theme': event.theme,
            'date': event.date,
            'end_date': event.end_date,
            'images': event.images,
            'volunteers_needed': event.volunteers_needed,
            'volunteers_registered': 0,
            'category': event.category,
            'requires_application': event.requires_application,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('events').insert(event_data).execute()
        return {'event': result.data[0]}
    except Exception as e:
        logger.error(f"Create event error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/events")
async def get_events(limit: int = 50):
    """Get all events"""
    try:
        result = supabase.table('events').select('*').order('date', desc=False).limit(limit).execute()
        return {'events': result.data}
    except Exception as e:
        logger.error(f"Get events error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/events/{event_id}/attendees")
async def get_event_attendees(event_id: str):
    """Get all attendees for an event"""
    try:
        result = supabase.table('event_attendees').select('*, users!event_attendees_user_id_fkey(name, avatar)').eq('event_id', event_id).execute()
        return result.data
    except Exception as e:
        logger.error(f"Get attendees error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/events/{event_id}/rsvp")
async def rsvp_event(event_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """RSVP to an event"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        existing = supabase.table('event_attendees').select('*').eq('event_id', event_id).eq('user_id', user['id']).execute()
        if existing.data and len(existing.data) > 0:
            supabase.table('event_attendees').delete().eq('event_id', event_id).eq('user_id', user['id']).execute()
            event = supabase.table('events').select('*').eq('id', event_id).execute()
            if event.data:
                new_count = max(0, event.data[0]['volunteers_registered'] - 1)
                supabase.table('events').update({'volunteers_registered': new_count}).eq('id', event_id).execute()
            return {'registered': False}
        else:
            attendee_data = {
                'event_id': event_id,
                'user_id': user['id'],
                'user_name': user['name'],
                'user_avatar': user.get('avatar'),
                'status': 'registered',
                'registered_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('event_attendees').insert(attendee_data).execute()
            event = supabase.table('events').select('*').eq('id', event_id).execute()
            if event.data:
                new_count = event.data[0]['volunteers_registered'] + 1
                supabase.table('events').update({'volunteers_registered': new_count}).eq('id', event_id).execute()
            return {'registered': True}
    except Exception as e:
        logger.error(f"RSVP event error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/events/{event_id}/checkin")
async def checkin_event(event_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Check in to an event"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        attendee = supabase.table('event_attendees').select('*').eq('event_id', event_id).eq('user_id', user['id']).execute()
        if not attendee.data or len(attendee.data) == 0:
            raise HTTPException(status_code=400, detail="Not registered for this event")
        supabase.table('event_attendees').update({
            'status': 'checked_in',
            'checked_in_at': datetime.now(timezone.utc).isoformat()
        }).eq('event_id', event_id).eq('user_id', user['id']).execute()
        return {'message': 'Checked in successfully', 'checked_in': True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check-in event error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/volunteer/apply")
async def apply_volunteer(application: VolunteerApplicationCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Submit volunteer application for an event"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        existing = supabase.table('volunteer_applications').select('*').eq('event_id', application.event_id).eq('user_id', user['id']).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Already applied to this event")
        event_result = supabase.table('events').select('*').eq('id', application.event_id).execute()
        if not event_result.data:
            raise HTTPException(status_code=404, detail="Event not found")
        event = event_result.data[0]
        app_dict = application.dict()
        matched_score = await ai_match_volunteer(app_dict, event)
        app_data = {
            'id': str(uuid.uuid4()),
            'event_id': application.event_id,
            'user_id': user['id'],
            'status': 'pending',
            'skills': application.skills,
            'interests': application.interests,
            'experience': application.experience,
            'availability': application.availability,
            'motivation': application.motivation,
            'matched_score': matched_score,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('volunteer_applications').insert(app_data).execute()
        return {'application': result.data[0], 'matched_score': matched_score}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Volunteer application error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/volunteer/applications")
async def get_my_applications(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user's volunteer applications"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        result = supabase.table('volunteer_applications').select('*').eq('user_id', user['id']).order('created_at', desc=True).execute()
        return {'applications': result.data}
    except Exception as e:
        logger.error(f"Get applications error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/events/{event_id}/applications")
async def get_event_applications(event_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Get all applications for an event (event organizer only)"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        result = supabase.table('volunteer_applications').select('*').eq('event_id', event_id).order('matched_score', desc=True).execute()
        return {'applications': result.data}
    except Exception as e:
        logger.error(f"Get event applications error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/volunteer/applications/{application_id}/review")
async def review_application(application_id: str, review: VolunteerApplicationReview, request: Request, session_token: Optional[str] = Cookie(None)):
    """Review volunteer application (approve/reject)"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        update_data = {
            'status': review.status,
            'reviewed_at': datetime.now(timezone.utc).isoformat(),
            'reviewed_by': user['id']
        }
        result = supabase.table('volunteer_applications').update(update_data).eq('id', application_id).execute()
        return {'application': result.data[0]}
    except Exception as e:
        logger.error(f"Review application error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/volunteer/shifts")
async def create_shift(shift: VolunteerShiftCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a volunteer shift"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        shift_data = {
            'id': str(uuid.uuid4()),
            'event_id': shift.event_id,
            'title': shift.title,
            'description': shift.description,
            'start_time': shift.start_time,
            'end_time': shift.end_time,
            'volunteers_needed': shift.volunteers_needed,
            'volunteers_assigned': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('volunteer_shifts').insert(shift_data).execute()
        return {'shift': result.data[0]}
    except Exception as e:
        logger.error(f"Create shift error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/events/{event_id}/shifts")
async def get_event_shifts(event_id: str):
    """Get all shifts for an event"""
    try:
        result = supabase.table('volunteer_shifts').select('*').eq('event_id', event_id).order('start_time', desc=False).execute()
        return {'shifts': result.data}
    except Exception as e:
        logger.error(f"Get shifts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/volunteer/shifts/{shift_id}/assign")
async def assign_to_shift(shift_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Assign volunteer to a shift"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        existing = supabase.table('volunteer_shift_assignments').select('*').eq('shift_id', shift_id).eq('user_id', user['id']).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Already assigned to this shift")
        assignment_data = {
            'shift_id': shift_id,
            'user_id': user['id'],
            'status': 'assigned',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('volunteer_shift_assignments').insert(assignment_data).execute()
        shift = supabase.table('volunteer_shifts').select('*').eq('id', shift_id).execute()
        if shift.data:
            new_count = shift.data[0]['volunteers_assigned'] + 1
            supabase.table('volunteer_shifts').update({'volunteers_assigned': new_count}).eq('id', shift_id).execute()
        return {'assignment': result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assign shift error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/volunteer/training")
async def create_training(training: VolunteerTrainingCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a training module"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        training_data = {
            'id': str(uuid.uuid4()),
            'event_id': training.event_id,
            'title': training.title,
            'description': training.description,
            'type': training.type,
            'content_url': training.content_url,
            'duration_minutes': training.duration_minutes,
            'required': training.required,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('volunteer_training').insert(training_data).execute()
        return {'training': result.data[0]}
    except Exception as e:
        logger.error(f"Create training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/events/{event_id}/training")
async def get_event_training(event_id: str):
    """Get all training modules for an event"""
    try:
        result = supabase.table('volunteer_training').select('*').eq('event_id', event_id).execute()
        return {'training': result.data}
    except Exception as e:
        logger.error(f"Get training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/volunteer/training/{training_id}/complete")
async def complete_training(training_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Mark training as completed"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        completion_data = {
            'training_id': training_id,
            'user_id': user['id'],
            'completed_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('volunteer_training_completion').insert(completion_data).execute()
        return {'completion': result.data[0]}
    except Exception as e:
        logger.error(f"Complete training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/volunteer/hours")
async def log_hours(hours: VolunteerHoursCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Log volunteer hours"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        hours_data = {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'event_id': hours.event_id,
            'shift_id': hours.shift_id,
            'hours': hours.hours,
            'date': hours.date,
            'notes': hours.notes,
            'verified': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('volunteer_hours').insert(hours_data).execute()
        return {'hours': result.data[0]}
    except Exception as e:
        logger.error(f"Log hours error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/volunteer/hours")
async def get_my_hours(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user's volunteer hours"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        result = supabase.table('volunteer_hours').select('*').eq('user_id', user['id']).order('date', desc=True).execute()
        total_hours = sum(h['hours'] for h in result.data)
        verified_hours = sum(h['hours'] for h in result.data if h.get('verified'))
        return {
            'hours': result.data,
            'total_hours': total_hours,
            'verified_hours': verified_hours
        }
    except Exception as e:
        logger.error(f"Get hours error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/volunteer/hours/{hours_id}/verify")
async def verify_hours(hours_id: str, verify: VolunteerHoursVerify, request: Request, session_token: Optional[str] = Cookie(None)):
    """Verify volunteer hours"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        update_data = {
            'verified': verify.verified,
            'verified_by': user['id'],
            'verified_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('volunteer_hours').update(update_data).eq('id', hours_id).execute()
        return {'hours': result.data[0]}
    except Exception as e:
        logger.error(f"Verify hours error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/volunteer/badges")
async def get_my_badges(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get current user's badges and recognition"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        result = supabase.table('volunteer_recognition').select('*').eq('user_id', user['id']).order('awarded_at', desc=True).execute()
        return {'badges': result.data}
    except Exception as e:
        logger.error(f"Get badges error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/events/feedback")
async def submit_feedback(feedback: EventFeedbackCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Submit feedback for an event"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        feedback_data = {
            'id': str(uuid.uuid4()),
            'event_id': feedback.event_id,
            'user_id': user['id'],
            'rating': feedback.rating,
            'feedback': feedback.feedback,
            'suggestions': feedback.suggestions,
            'would_volunteer_again': feedback.would_volunteer_again,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('event_feedback').insert(feedback_data).execute()
        return {'feedback': result.data[0]}
    except Exception as e:
        logger.error(f"Submit feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/events/{event_id}/feedback")
async def get_event_feedback(event_id: str):
    """Get all feedback for an event"""
    try:
        result = supabase.table('event_feedback').select('*').eq('event_id', event_id).order('created_at', desc=True).execute()
        if result.data:
            avg_rating = sum(f['rating'] for f in result.data) / len(result.data)
        else:
            avg_rating = 0
        return {
            'feedback': result.data,
            'average_rating': avg_rating,
            'total_responses': len(result.data)
        }
    except Exception as e:
        logger.error(f"Get event feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/conversations")
async def create_conversation(conversation: ConversationCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a new conversation (direct or group)"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        if conversation.type == "direct" and len(conversation.participant_ids) == 1:
            other_user_id = conversation.participant_ids[0]
            existing_convs = supabase.table('conversation_participants').select('conversation_id').eq('user_id', user['id']).execute()
            if existing_convs.data:
                for conv in existing_convs.data:
                    other_participants = supabase.table('conversation_participants').select('*').eq('conversation_id', conv['conversation_id']).execute()
                    if len(other_participants.data) == 2:
                        participant_ids = [p['user_id'] for p in other_participants.data]
                        if other_user_id in participant_ids:
                            conv_result = supabase.table('conversations').select('*').eq('id', conv['conversation_id']).execute()
                            return {'conversation': conv_result.data[0], 'existed': True}
        conv_id = str(uuid.uuid4())
        conv_data = {
            'id': conv_id,
            'name': conversation.name,
            'type': conversation.type,
            'created_by': user['id'],
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('conversations').insert(conv_data).execute()
        all_participant_ids = list(set([user['id']] + conversation.participant_ids))
        for participant_id in all_participant_ids:
            participant_data = {
                'conversation_id': conv_id,
                'user_id': participant_id,
                'role': 'admin' if participant_id == user['id'] else 'member',
                'joined_at': datetime.now(timezone.utc).isoformat(),
                'last_read_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('conversation_participants').insert(participant_data).execute()
        return {'conversation': result.data[0], 'existed': False}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create conversation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/conversations")
async def get_conversations(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get all conversations for current user"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        participant_result = supabase.table('conversation_participants').select('conversation_id, last_read_at').eq('user_id', user['id']).execute()
        if not participant_result.data:
            return {'conversations': []}
        conv_ids = [p['conversation_id'] for p in participant_result.data]
        last_read_map = {p['conversation_id']: p['last_read_at'] for p in participant_result.data}
        conversations = []
        for conv_id in conv_ids:
            conv_result = supabase.table('conversations').select('*').eq('id', conv_id).execute()
            if conv_result.data:
                conv = conv_result.data[0]
                last_msg_result = supabase.table('messages').select('*').eq('conversation_id', conv_id).order('created_at', desc=True).limit(1).execute()
                if last_msg_result.data:
                    conv['last_message'] = last_msg_result.data[0]
                else:
                    conv['last_message'] = None
                participants_result = supabase.table('conversation_participants').select('user_id').eq('conversation_id', conv_id).execute()
                participant_ids = [p['user_id'] for p in participants_result.data]
                if conv['type'] == 'direct':
                    other_user_id = [uid for uid in participant_ids if uid != user['id']][0]
                    other_user_result = supabase.table('users').select('id, name, avatar').eq('id', other_user_id).execute()
                    if other_user_result.data:
                        conv['other_user'] = other_user_result.data[0]
                        presence_result = supabase.table('presence').select('*').eq('user_id', other_user_id).execute()
                        if presence_result.data:
                            conv['other_user']['presence'] = presence_result.data[0]
                last_read_at = last_read_map.get(conv_id)
                if last_read_at:
                    unread_result = supabase.table('messages').select('id', count='exact').eq('conversation_id', conv_id).gt('created_at', last_read_at).execute()
                    conv['unread_count'] = unread_result.count if unread_result.count else 0
                else:
                    conv['unread_count'] = 0
                conversations.append(conv)
        conversations.sort(key=lambda c: c.get('last_message', {}).get('created_at', ''), reverse=True)
        return {'conversations': conversations}
    except Exception as e:
        logger.error(f"Get conversations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, limit: int = 50, before: Optional[str] = None, request: Request = None, session_token: Optional[str] = Cookie(None)):
    """Get messages in a conversation"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        participant = supabase.table('conversation_participants').select('*').eq('conversation_id', conversation_id).eq('user_id', user['id']).execute()
        if not participant.data:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        query = supabase.table('messages').select('*').eq('conversation_id', conversation_id).eq('deleted', False)
        if before:
            query = query.lt('created_at', before)
        result = query.order('created_at', desc=True).limit(limit).execute()
        messages = list(reversed(result.data))
        for message in messages:
            reactions_result = supabase.table('message_reactions').select('*').eq('message_id', message['id']).execute()
            message['reactions'] = reactions_result.data
            receipts_result = supabase.table('message_read_receipts').select('*').eq('message_id', message['id']).execute()
            message['read_by'] = receipts_result.data
        supabase.table('conversation_participants').update({
            'last_read_at': datetime.now(timezone.utc).isoformat()
        }).eq('conversation_id', conversation_id).eq('user_id', user['id']).execute()
        return {'messages': messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/messages")
async def send_message(message: MessageCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Send a message in a conversation"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        participant = supabase.table('conversation_participants').select('*').eq('conversation_id', message.conversation_id).eq('user_id', user['id']).execute()
        if not participant.data:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        message_data = {
            'id': str(uuid.uuid4()),
            'conversation_id': message.conversation_id,
            'sender_id': user['id'],
            'sender_name': user['name'],
            'sender_avatar': user.get('avatar'),
            'content': message.content,
            'message_type': message.message_type,
            'file_url': message.file_url,
            'file_name': message.file_name,
            'file_size': message.file_size,
            'reply_to_id': message.reply_to_id,
            'edited': False,
            'deleted': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('messages').insert(message_data).execute()
        supabase.table('conversations').update({
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', message.conversation_id).execute()
        receipt_data = {
            'message_id': result.data[0]['id'],
            'user_id': user['id'],
            'read_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('message_read_receipts').insert(receipt_data).execute()
        participants = supabase.table('conversation_participants').select('user_id').eq('conversation_id', message.conversation_id).execute()
        for participant in participants.data:
            if participant['user_id'] != user['id']:
                await notify_user(participant['user_id'], 'new_message', {
                    'conversation_id': message.conversation_id,
                    'message': result.data[0],
                    'sender': {
                        'id': user['id'],
                        'name': user['name'],
                        'avatar': user.get('avatar')
                    }
                })
                notification_data = {
                    'id': str(uuid.uuid4()),
                    'user_id': participant['user_id'],
                    'type': 'new_message',
                    'title': 'New Message',
                    'message': f"{user['name']} sent you a message",
                    'link': f"/messages?conversation={message.conversation_id}",
                    'data': {'conversation_id': message.conversation_id, 'sender_id': user['id']},
                    'read': False,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                supabase.table('notifications').insert(notification_data).execute()
        return {'message': result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send message error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/messages/{message_id}")
async def edit_message(message_id: str, message_update: MessageUpdate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Edit a message"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        msg_result = supabase.table('messages').select('*').eq('id', message_id).eq('sender_id', user['id']).execute()
        if not msg_result.data:
            raise HTTPException(status_code=403, detail="Cannot edit this message")
        update_data = {
            'content': message_update.content,
            'edited': True,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('messages').update(update_data).eq('id', message_id).execute()
        return {'message': result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Edit message error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Delete a message"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        msg_result = supabase.table('messages').select('*').eq('id', message_id).eq('sender_id', user['id']).execute()
        if not msg_result.data:
            raise HTTPException(status_code=403, detail="Cannot delete this message")
        update_data = {
            'deleted': True,
            'content': 'Message deleted',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('messages').update(update_data).eq('id', message_id).execute()
        return {'success': True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete message error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/messages/{message_id}/react")
async def react_to_message(message_id: str, reaction: MessageReactionCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Add or remove a reaction to a message"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        existing = supabase.table('message_reactions').select('*').eq('message_id', message_id).eq('user_id', user['id']).eq('reaction', reaction.reaction).execute()
        if existing.data:
            supabase.table('message_reactions').delete().eq('message_id', message_id).eq('user_id', user['id']).eq('reaction', reaction.reaction).execute()
            return {'added': False}
        else:
            reaction_data = {
                'message_id': message_id,
                'user_id': user['id'],
                'reaction': reaction.reaction,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('message_reactions').insert(reaction_data).execute()
            return {'added': True}
    except Exception as e:
        logger.error(f"React to message error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/messages/{message_id}/read")
async def mark_message_read(message_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Mark a message as read"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        existing = supabase.table('message_read_receipts').select('*').eq('message_id', message_id).eq('user_id', user['id']).execute()
        if not existing.data:
            receipt_data = {
                'message_id': message_id,
                'user_id': user['id'],
                'read_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('message_read_receipts').insert(receipt_data).execute()
        return {'success': True}
    except Exception as e:
        logger.error(f"Mark read error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/conversations/{conversation_id}/typing")
async def update_typing(conversation_id: str, typing: TypingIndicator, request: Request, session_token: Optional[str] = Cookie(None)):
    """Update typing indicator"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        if typing.is_typing:
            typing_data = {
                'conversation_id': conversation_id,
                'user_id': user['id'],
                'is_typing': True,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('typing_indicators').upsert(typing_data).execute()
        else:
            supabase.table('typing_indicators').delete().eq('conversation_id', conversation_id).eq('user_id', user['id']).execute()
        return {'success': True}
    except Exception as e:
        logger.error(f"Update typing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/conversations/{conversation_id}/typing")
async def get_typing_users(conversation_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Get users currently typing in conversation"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        five_seconds_ago = (datetime.now(timezone.utc) - timedelta(seconds=5)).isoformat()
        result = supabase.table('typing_indicators').select('user_id').eq('conversation_id', conversation_id).eq('is_typing', True).gt('updated_at', five_seconds_ago).execute()
        typing_users = []
        for indicator in result.data:
            if indicator['user_id'] != user['id']:
                user_result = supabase.table('users').select('id, name, avatar').eq('id', indicator['user_id']).execute()
                if user_result.data:
                    typing_users.append(user_result.data[0])
        return {'typing_users': typing_users}
    except Exception as e:
        logger.error(f"Get typing users error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/presence")
async def update_presence(presence: PresenceUpdate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Update user presence status"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        presence_data = {
            'user_id': user['id'],
            'status': presence.status,
            'last_seen': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('presence').upsert(presence_data).execute()
        return {'success': True}
    except Exception as e:
        logger.error(f"Update presence error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/presence/{user_id}")
async def get_user_presence(user_id: str):
    """Get user presence status"""
    try:
        result = supabase.table('presence').select('*').eq('user_id', user_id).execute()
        if result.data:
            return {'presence': result.data[0]}
        else:
            return {'presence': {'status': 'offline', 'last_seen': None}}
    except Exception as e:
        logger.error(f"Get presence error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/messages/search")
async def search_messages(query: str, conversation_id: Optional[str] = None, request: Request = None, session_token: Optional[str] = Cookie(None)):
    """Search messages"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        participant_result = supabase.table('conversation_participants').select('conversation_id').eq('user_id', user['id']).execute()
        conv_ids = [p['conversation_id'] for p in participant_result.data]
        if not conv_ids:
            return {'messages': []}
        search_query = supabase.table('messages').select('*').in_('conversation_id', conv_ids).eq('deleted', False).ilike('content', f'%{query}%')
        if conversation_id:
            search_query = search_query.eq('conversation_id', conversation_id)
        result = search_query.order('created_at', desc=True).limit(50).execute()
        return {'messages': result.data}
    except Exception as e:
        logger.error(f"Search messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), request: Request = None, session_token: Optional[str] = Cookie(None)):
    """Upload a file"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        content = await file.read()
        base64_content = base64.b64encode(content).decode('utf-8')
        file_type = file.content_type or 'application/octet-stream'
        data_url = f"data:{file_type};base64,{base64_content}"
        return {
            'url': data_url,
            'filename': file.filename,
            'size': len(content),
            'type': file_type
        }
    except Exception as e:
        logger.error(f"Upload file error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/donations/packages")
async def get_donation_packages():
    """Get donation packages"""
    packages = [
        {"id": "small", "amount": 10, "title": "Support Meals", "description": "Provide meals for 5 people"},
        {"id": "medium", "amount": 50, "title": "Educational Supplies", "description": "School supplies for 10 children"},
        {"id": "large", "amount": 100, "title": "Community Development", "description": "Support community programs"},
        {"id": "premium", "amount": 500, "title": "Major Impact", "description": "Make a significant difference"}
    ]
    return {"packages": packages}
@api_router.post("/donations/checkout")
async def create_donation_checkout(donation: DonationRequest, request: Request):
    """Create donation checkout session"""
    try:
        if not STRIPE_API_KEY or STRIPE_API_KEY == "your_stripe_api_key_here":
            raise HTTPException(
                status_code=503, 
                detail="Donation service is currently unavailable. Please contact administrator to configure Stripe API key."
            )
        ngo_result = supabase.table('ngos').select('*').eq('id', donation.ngo_id).execute()
        if not ngo_result.data:
            raise HTTPException(status_code=404, detail="NGO not found")
        ngo = ngo_result.data[0]
        mock_session_id = f"mock_session_{uuid.uuid4()}"
        response = type('MockResponse', (), {
            'session_id': mock_session_id,
            'url': f"https://checkout.stripe.com/mock/{mock_session_id}"
        })()
        donation_data = {
            'id': str(uuid.uuid4()),
            'ngo_id': donation.ngo_id,
            'amount': donation.amount,
            'currency': donation.currency,
            'stripe_session_id': response.session_id,
            'status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('donations').insert(donation_data).execute()
        return {"checkout_url": response.url, "session_id": response.session_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/donations/status/{session_id}")
async def get_donation_status(session_id: str):
    """Get donation status"""
    try:
        status = type('MockStatus', (), {'payment_status': 'paid'})()
        if status.payment_status == "paid":
            supabase.table('donations').update({
                'status': 'completed',
                'completed_at': datetime.now(timezone.utc).isoformat()
            }).eq('stripe_session_id', session_id).execute()
        return {"status": status.payment_status}
    except Exception as e:
        logger.error(f"Get donation status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/impact/metrics")
async def create_impact_metric(metric: ImpactMetricCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create an impact metric"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        metric_data = {
            'id': str(uuid.uuid4()),
            'ngo_id': metric.ngo_id,
            'event_id': metric.event_id,
            'metric_type': metric.metric_type,
            'value': metric.value,
            'unit': metric.unit,
            'date': metric.date,
            'description': metric.description,
            'verified': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('impact_metrics').insert(metric_data).execute()
        return {'metric': result.data[0]}
    except Exception as e:
        logger.error(f"Create impact metric error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/metrics")
async def get_impact_metrics(ngo_id: Optional[str] = None, event_id: Optional[str] = None, metric_type: Optional[str] = None):
    """Get impact metrics with optional filters"""
    try:
        query = supabase.table('impact_metrics').select('*')
        if ngo_id:
            query = query.eq('ngo_id', ngo_id)
        if event_id:
            query = query.eq('event_id', event_id)
        if metric_type:
            query = query.eq('metric_type', metric_type)
        result = query.order('date', desc=True).execute()
        return {'metrics': result.data}
    except Exception as e:
        logger.error(f"Get impact metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/dashboard/{ngo_id}")
async def get_impact_dashboard(ngo_id: str):
    """Get comprehensive impact dashboard for an NGO"""
    try:
        metrics_result = supabase.table('impact_metrics').select('*').eq('ngo_id', ngo_id).execute()
        aggregated = {}
        for metric in metrics_result.data:
            metric_type = metric['metric_type']
            if metric_type not in aggregated:
                aggregated[metric_type] = {'total': 0, 'unit': metric['unit'], 'count': 0}
            aggregated[metric_type]['total'] += float(metric['value'])
            aggregated[metric_type]['count'] += 1
        try:
            hours_result = supabase.table('volunteer_hours').select('hours').eq('verified', True).execute()
            total_volunteer_hours = sum(h['hours'] for h in hours_result.data) if hours_result.data else 0
        except Exception as e:
            logger.warning(f"Verified column not found in volunteer_hours, using all hours: {str(e)}")
            hours_result = supabase.table('volunteer_hours').select('hours').execute()
            total_volunteer_hours = sum(h['hours'] for h in hours_result.data) if hours_result.data else 0
        donations_result = supabase.table('donations').select('amount').eq('ngo_id', ngo_id).eq('status', 'completed').execute()
        total_donations = sum(d['amount'] for d in donations_result.data) if donations_result.data else 0
        events_result = supabase.table('events').select('id', count='exact').eq('ngo_id', ngo_id).execute()
        total_events = events_result.count if events_result.count else 0
        stories_result = supabase.table('success_stories').select('id', count='exact').eq('ngo_id', ngo_id).eq('published', True).execute()
        total_stories = stories_result.count if stories_result.count else 0
        return {
            'ngo_id': ngo_id,
            'total_volunteer_hours': total_volunteer_hours,
            'total_donations': total_donations,
            'total_events': total_events,
            'total_stories': total_stories,
            'metrics_by_type': aggregated,
            'detailed_metrics': metrics_result.data
        }
    except Exception as e:
        logger.error(f"Get impact dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/impact/stories")
async def create_success_story(story: SuccessStoryCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a success story"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        story_data = {
            'id': str(uuid.uuid4()),
            'title': story.title,
            'content': story.content,
            'author_id': user['id'],
            'ngo_id': story.ngo_id,
            'event_id': story.event_id,
            'category': story.category,
            'images': story.images,
            'video_url': story.video_url,
            'impact_numbers': story.impact_numbers,
            'tags': story.tags,
            'published': story.published,
            'featured': False,
            'views_count': 0,
            'likes_count': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('success_stories').insert(story_data).execute()
        return {'story': result.data[0]}
    except Exception as e:
        logger.error(f"Create success story error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/stories")
async def get_success_stories(ngo_id: Optional[str] = None, featured: Optional[bool] = None, limit: int = 20):
    """Get success stories"""
    try:
        query = supabase.table('success_stories').select('*').eq('published', True)
        if ngo_id:
            query = query.eq('ngo_id', ngo_id)
        if featured is not None:
            query = query.eq('featured', featured)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return {'stories': result.data}
    except Exception as e:
        logger.error(f"Get success stories error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/stories/{story_id}")
async def get_success_story(story_id: str):
    """Get a single success story"""
    try:
        result = supabase.table('success_stories').select('*').eq('id', story_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Story not found")
        story = result.data[0]
        supabase.table('success_stories').update({
            'views_count': story['views_count'] + 1
        }).eq('id', story_id).execute()
        author_result = supabase.table('users').select('id, name, avatar').eq('id', story['author_id']).execute()
        if author_result.data:
            story['author'] = author_result.data[0]
        comments_result = supabase.table('story_comments').select('*').eq('story_id', story_id).order('created_at', desc=False).execute()
        story['comments'] = comments_result.data
        return {'story': story}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get success story error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/impact/stories/{story_id}")
async def update_success_story(story_id: str, story_update: SuccessStoryUpdate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Update a success story"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        story_result = supabase.table('success_stories').select('*').eq('id', story_id).eq('author_id', user['id']).execute()
        if not story_result.data:
            raise HTTPException(status_code=403, detail="Not authorized to update this story")
        update_data = {k: v for k, v in story_update.dict().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        result = supabase.table('success_stories').update(update_data).eq('id', story_id).execute()
        return {'story': result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update success story error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/impact/stories/{story_id}/like")
async def like_success_story(story_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Like/unlike a success story"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        existing = supabase.table('story_likes').select('*').eq('story_id', story_id).eq('user_id', user['id']).execute()
        if existing.data:
            supabase.table('story_likes').delete().eq('story_id', story_id).eq('user_id', user['id']).execute()
            story = supabase.table('success_stories').select('*').eq('id', story_id).execute()
            if story.data:
                new_count = max(0, story.data[0]['likes_count'] - 1)
                supabase.table('success_stories').update({'likes_count': new_count}).eq('id', story_id).execute()
            return {'liked': False}
        else:
            like_data = {
                'story_id': story_id,
                'user_id': user['id'],
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('story_likes').insert(like_data).execute()
            story = supabase.table('success_stories').select('*').eq('id', story_id).execute()
            if story.data:
                new_count = story.data[0]['likes_count'] + 1
                supabase.table('success_stories').update({'likes_count': new_count}).eq('id', story_id).execute()
            return {'liked': True}
    except Exception as e:
        logger.error(f"Like story error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/impact/stories/{story_id}/comments")
async def add_story_comment(story_id: str, content: str = Form(...), request: Request = None, session_token: Optional[str] = Cookie(None)):
    """Add a comment to a success story"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        comment_data = {
            'id': str(uuid.uuid4()),
            'story_id': story_id,
            'user_id': user['id'],
            'user_name': user['name'],
            'user_avatar': user.get('avatar'),
            'content': content,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('story_comments').insert(comment_data).execute()
        return {'comment': result.data[0]}
    except Exception as e:
        logger.error(f"Add story comment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/impact/testimonials")
async def create_testimonial(testimonial: TestimonialCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a testimonial"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        testimonial_data = {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'ngo_id': testimonial.ngo_id,
            'event_id': testimonial.event_id,
            'testimonial': testimonial.testimonial,
            'rating': testimonial.rating,
            'role': testimonial.role,
            'location': testimonial.location,
            'avatar': user.get('avatar'),
            'name': testimonial.name,
            'verified': False,
            'featured': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('impact_testimonials').insert(testimonial_data).execute()
        return {'testimonial': result.data[0]}
    except Exception as e:
        logger.error(f"Create testimonial error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/testimonials")
async def get_testimonials(ngo_id: Optional[str] = None, event_id: Optional[str] = None, featured: Optional[bool] = None):
    """Get testimonials"""
    try:
        query = supabase.table('impact_testimonials').select('*')
        if ngo_id:
            query = query.eq('ngo_id', ngo_id)
        if event_id:
            query = query.eq('event_id', event_id)
        if featured is not None:
            query = query.eq('featured', featured)
        result = query.order('created_at', desc=True).execute()
        return {'testimonials': result.data}
    except Exception as e:
        logger.error(f"Get testimonials error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/impact/case-studies")
async def create_case_study(case_study: CaseStudyCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create a case study"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        case_study_data = {
            'id': str(uuid.uuid4()),
            'title': case_study.title,
            'summary': case_study.summary,
            'full_content': case_study.full_content,
            'ngo_id': case_study.ngo_id,
            'event_id': case_study.event_id,
            'author_id': user['id'],
            'problem_statement': case_study.problem_statement,
            'solution': case_study.solution,
            'approach': case_study.approach,
            'start_date': case_study.start_date,
            'end_date': case_study.end_date,
            'beneficiaries_count': case_study.beneficiaries_count,
            'volunteers_involved': case_study.volunteers_involved,
            'funds_utilized': case_study.funds_utilized,
            'outcomes': case_study.outcomes,
            'challenges': case_study.challenges,
            'learnings': case_study.learnings,
            'images': case_study.images,
            'documents': case_study.documents,
            'category': case_study.category,
            'tags': case_study.tags,
            'published': case_study.published,
            'featured': False,
            'views_count': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('case_studies').insert(case_study_data).execute()
        return {'case_study': result.data[0]}
    except Exception as e:
        logger.error(f"Create case study error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/case-studies")
async def get_case_studies(ngo_id: Optional[str] = None, featured: Optional[bool] = None, limit: int = 20):
    """Get case studies"""
    try:
        query = supabase.table('case_studies').select('*').eq('published', True)
        if ngo_id:
            query = query.eq('ngo_id', ngo_id)
        if featured is not None:
            query = query.eq('featured', featured)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return {'case_studies': result.data}
    except Exception as e:
        logger.error(f"Get case studies error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/case-studies/{case_study_id}")
async def get_case_study(case_study_id: str):
    """Get a single case study"""
    try:
        result = supabase.table('case_studies').select('*').eq('id', case_study_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Case study not found")
        case_study = result.data[0]
        supabase.table('case_studies').update({
            'views_count': case_study['views_count'] + 1
        }).eq('id', case_study_id).execute()
        return {'case_study': case_study}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get case study error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/impact/outcomes")
async def create_outcome_tracking(outcome: OutcomeTrackingCreate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Create outcome tracking"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        if outcome.target_value != 0:
            progress = ((outcome.current_value - outcome.baseline_value) / (outcome.target_value - outcome.baseline_value)) * 100
        else:
            progress = 0
        outcome_data = {
            'id': str(uuid.uuid4()),
            'ngo_id': outcome.ngo_id,
            'event_id': outcome.event_id,
            'case_study_id': outcome.case_study_id,
            'outcome_title': outcome.outcome_title,
            'outcome_description': outcome.outcome_description,
            'target_metric': outcome.target_metric,
            'baseline_value': outcome.baseline_value,
            'target_value': outcome.target_value,
            'current_value': outcome.current_value,
            'unit': outcome.unit,
            'start_date': outcome.start_date,
            'target_date': outcome.target_date,
            'last_measured_date': datetime.now(timezone.utc).date().isoformat(),
            'status': 'in_progress',
            'progress_percentage': round(progress, 2),
            'updates': [],
            'created_by': user['id'],
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('outcome_tracking').insert(outcome_data).execute()
        return {'outcome': result.data[0]}
    except Exception as e:
        logger.error(f"Create outcome tracking error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/impact/outcomes/{outcome_id}")
async def update_outcome_tracking(outcome_id: str, update: OutcomeUpdate, request: Request, session_token: Optional[str] = Cookie(None)):
    """Update outcome tracking"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        outcome_result = supabase.table('outcome_tracking').select('*').eq('id', outcome_id).execute()
        if not outcome_result.data:
            raise HTTPException(status_code=404, detail="Outcome not found")
        outcome = outcome_result.data[0]
        if outcome['target_value'] != 0:
            progress = ((update.current_value - outcome['baseline_value']) / (outcome['target_value'] - outcome['baseline_value'])) * 100
        else:
            progress = 0
        updates = outcome.get('updates', [])
        updates.append({
            'date': update.last_measured_date,
            'value': update.current_value,
            'notes': update.notes,
            'updated_by': user['id']
        })
        update_data = {
            'current_value': update.current_value,
            'last_measured_date': update.last_measured_date,
            'status': update.status,
            'progress_percentage': round(progress, 2),
            'updates': updates,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('outcome_tracking').update(update_data).eq('id', outcome_id).execute()
        return {'outcome': result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update outcome tracking error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/impact/outcomes")
async def get_outcomes(ngo_id: Optional[str] = None, status: Optional[str] = None):
    """Get outcome tracking"""
    try:
        query = supabase.table('outcome_tracking').select('*')
        if ngo_id:
            query = query.eq('ngo_id', ngo_id)
        if status:
            query = query.eq('status', status)
        result = query.order('created_at', desc=True).execute()
        return {'outcomes': result.data}
    except Exception as e:
        logger.error(f"Get outcomes error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/search")
async def global_search(
    q: str,
    type: str = "all",
    location: str = "",
    category: str = "",
    dateRange: str = "all",
    limit: int = 5
):
    """Global search across NGOs, events, posts, and people"""
    try:
        results = {
            'ngos': [],
            'people': [],
            'events': [],
            'posts': []
        }
        search_term = f"%{q.lower()}%"
        if type in ['all', 'ngos']:
            ngo_query = supabase.table('ngos').select('*')
            ngo_query = ngo_query.or_(f"name.ilike.{search_term},description.ilike.{search_term},category.ilike.{search_term}")
            if location:
                ngo_query = ngo_query.ilike('location', f"%{location}%")
            if category:
                ngo_query = ngo_query.ilike('category', f"%{category}%")
            ngo_result = ngo_query.limit(limit).execute()
            results['ngos'] = ngo_result.data
        if type in ['all', 'events']:
            event_query = supabase.table('events').select('*')
            event_query = event_query.or_(f"title.ilike.{search_term},description.ilike.{search_term},category.ilike.{search_term}")
            if location:
                event_query = event_query.ilike('location', f"%{location}%")
            if category:
                event_query = event_query.ilike('category', f"%{category}%")
            if dateRange != 'all':
                now = datetime.now(timezone.utc)
                if dateRange == 'today':
                    start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                elif dateRange == 'week':
                    start_date = now - timedelta(days=7)
                elif dateRange == 'month':
                    start_date = now - timedelta(days=30)
                else:
                    start_date = None
                if start_date:
                    event_query = event_query.gte('date', start_date.isoformat())
            event_result = event_query.limit(limit).execute()
            results['events'] = event_result.data
        if type in ['all', 'posts']:
            post_query = supabase.table('posts').select('*, users!posts_user_id_fkey(name)')
            post_query = post_query.ilike('content', search_term)
            if dateRange != 'all':
                now = datetime.now(timezone.utc)
                if dateRange == 'today':
                    start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                elif dateRange == 'week':
                    start_date = now - timedelta(days=7)
                elif dateRange == 'month':
                    start_date = now - timedelta(days=30)
                else:
                    start_date = None
                if start_date:
                    post_query = post_query.gte('created_at', start_date.isoformat())
            post_result = post_query.limit(limit).execute()
            for post in post_result.data:
                if post.get('users'):
                    post['author_name'] = post['users'].get('name', 'Unknown')
            results['posts'] = post_result.data
        if type in ['all', 'people']:
            user_query = supabase.table('users').select('id, name, email, avatar, bio, location, user_type')
            user_query = user_query.or_(f"name.ilike.{search_term},bio.ilike.{search_term}")
            if location:
                user_query = user_query.ilike('location', f"%{location}%")
            user_result = user_query.limit(limit).execute()
            results['people'] = user_result.data
        return results
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return {
            'ngos': [],
            'people': [],
            'events': [],
            'posts': []
        }
@api_router.post("/analytics/search")
async def track_search_analytics(request: Request):
    """Track search analytics"""
    try:
        data = await request.json()
        analytics_data = {
            'id': str(uuid.uuid4()),
            'query': data.get('query', ''),
            'filters': data.get('filters', {}),
            'results_count': data.get('results_count', 0),
            'timestamp': data.get('timestamp', datetime.now(timezone.utc).isoformat()),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        try:
            supabase.table('search_analytics').insert(analytics_data).execute()
        except Exception:
            pass
        return {'status': 'success'}
    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        return {'status': 'error'}
@api_router.post("/ngos/{ngo_id}/follow")
async def follow_ngo(ngo_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Follow an NGO"""
    try:
        user_data = await get_current_user(request, session_token)
        user_id = user_data['id']
        existing = supabase.table('ngo_follows').select('*').eq('ngo_id', ngo_id).eq('user_id', user_id).execute()
        if existing.data:
            return {'message': 'Already following', 'following': True}
        follow_data = {
            'id': str(uuid.uuid4()),
            'ngo_id': ngo_id,
            'user_id': user_id,
            'followed_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('ngo_follows').insert(follow_data).execute()
        ngo = supabase.table('ngos').select('followers_count').eq('id', ngo_id).execute()
        if ngo.data:
            new_count = ngo.data[0].get('followers_count', 0) + 1
            supabase.table('ngos').update({'followers_count': new_count}).eq('id', ngo_id).execute()
        ngo_data = supabase.table('ngos').select('owner_id, name').eq('id', ngo_id).execute()
        if ngo_data.data and ngo_data.data[0].get('owner_id'):
            notification_data = {
                'id': str(uuid.uuid4()),
                'user_id': ngo_data.data[0]['owner_id'],
                'type': 'ngo_follow',
                'title': 'New Follower',
                'message': f"{user_data['name']} started following {ngo_data.data[0]['name']}",
                'link': f"/ngo/{ngo_id}",
                'data': {'ngo_id': ngo_id, 'follower_id': user_id},
                'read': False,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('notifications').insert(notification_data).execute()
        return {'message': 'Following NGO', 'following': True}
    except Exception as e:
        logger.error(f"Follow NGO error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.delete("/ngos/{ngo_id}/follow")
async def unfollow_ngo(ngo_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Unfollow an NGO"""
    try:
        user_data = await get_current_user(request, session_token)
        user_id = user_data['id']
        supabase.table('ngo_follows').delete().eq('ngo_id', ngo_id).eq('user_id', user_id).execute()
        ngo = supabase.table('ngos').select('followers_count').eq('id', ngo_id).execute()
        if ngo.data:
            new_count = max(0, ngo.data[0].get('followers_count', 0) - 1)
            supabase.table('ngos').update({'followers_count': new_count}).eq('id', ngo_id).execute()
        return {'message': 'Unfollowed NGO', 'following': False}
    except Exception as e:
        logger.error(f"Unfollow NGO error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/ngos/{ngo_id}/followers")
async def get_ngo_followers(ngo_id: str, limit: int = 50):
    """Get followers of an NGO"""
    try:
        follows = supabase.table('ngo_follows').select('*, users!ngo_follows_user_id_fkey(id, name, avatar, bio)').eq('ngo_id', ngo_id).order('followed_at', desc=True).limit(limit).execute()
        followers = []
        for follow in follows.data:
            if follow.get('users'):
                follower = follow['users']
                follower['followed_at'] = follow['followed_at']
                followers.append(follower)
        return followers
    except Exception as e:
        logger.error(f"Get followers error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/ngos/{ngo_id}/is-following")
async def check_if_following(ngo_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Check if current user is following an NGO"""
    try:
        user_data = await get_current_user(request, session_token)
        user_id = user_data['id']
        follow = supabase.table('ngo_follows').select('*').eq('ngo_id', ngo_id).eq('user_id', user_id).execute()
        return {'following': len(follow.data) > 0}
    except Exception as e:
        return {'following': False}
@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile by ID"""
    try:
        result = supabase.table('users').select('*').eq('id', user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        user = result.data[0]
        user.pop('password', None)
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.patch("/users/{user_id}")
async def update_user_profile(user_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Update user profile"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user['id'] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")
    try:
        body = await request.json()
        body.pop('id', None)
        body.pop('email', None)
        body.pop('password', None)
        body.pop('created_at', None)
        result = supabase.table('users').update(body).eq('id', user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        updated_user = result.data[0]
        updated_user.pop('password', None)
        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/users/{user_id}/stats")
async def get_user_stats(user_id: str):
    """Get user statistics"""
    try:
        posts = supabase.table('posts').select('id', count='exact').eq('author_id', user_id).execute()
        posts_count = posts.count if posts.count else 0
        events = supabase.table('event_attendees').select('id', count='exact').eq('user_id', user_id).execute()
        events_count = events.count if events.count else 0
        hours = supabase.table('volunteer_hours').select('hours').eq('volunteer_id', user_id).execute()
        total_hours = sum(h.get('hours', 0) for h in (hours.data or []))
        followers = supabase.table('user_follows').select('id', count='exact').eq('following_id', user_id).execute()
        followers_count = followers.count if followers.count else 0
        following = supabase.table('user_follows').select('id', count='exact').eq('follower_id', user_id).execute()
        following_count = following.count if following.count else 0
        return {
            'posts': posts_count,
            'events': events_count,
            'volunteer_hours': total_hours,
            'followers': followers_count,
            'following': following_count
        }
    except Exception as e:
        logger.error(f"Get user stats error: {str(e)}")
        return {'posts': 0, 'events': 0, 'volunteer_hours': 0, 'followers': 0, 'following': 0}
@api_router.get("/users/{user_id}/liked-posts")
async def get_user_liked_posts(user_id: str):
    """Get posts liked by user"""
    try:
        liked_posts = supabase.table('post_likes').select('post_id').eq('user_id', user_id).execute()
        post_ids = [like['post_id'] for like in (liked_posts.data or [])]
        return {
            'post_ids': post_ids
        }
    except Exception as e:
        logger.error(f"Get user liked posts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/users/{user_id}/activities")
async def get_user_activities(user_id: str, limit: int = 20):
    """Get user recent activities"""
    try:
        activities = []
        posts = supabase.table('posts').select('*').eq('author_id', user_id).order('created_at', desc=True).limit(10).execute()
        for post in (posts.data or []):
            activities.append({
                'type': 'post',
                'data': post,
                'timestamp': post.get('created_at')
            })
        events = supabase.table('event_attendees').select('*, events(*)').eq('user_id', user_id).order('registered_at', desc=True).limit(10).execute()
        for event in (events.data or []):
            activities.append({
                'type': 'event',
                'data': event,
                'timestamp': event.get('registered_at')
            })
        activities.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return activities[:limit]
    except Exception as e:
        logger.error(f"Get user activities error: {str(e)}")
        return []
@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Follow or unfollow a user"""
    user = await get_current_user(request, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if user['id'] == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    try:
        existing = supabase.table('user_follows').select('*').eq('follower_id', user['id']).eq('following_id', user_id).execute()
        if existing.data and len(existing.data) > 0:
            supabase.table('user_follows').delete().eq('follower_id', user['id']).eq('following_id', user_id).execute()
            return {'following': False}
        else:
            follow_data = {
                'follower_id': user['id'],
                'following_id': user_id,
                'followed_at': datetime.now(timezone.utc).isoformat()
            }
            supabase.table('user_follows').insert(follow_data).execute()
            return {'following': True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Follow user error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/users/{user_id}/followers")
async def get_user_followers(user_id: str):
    """Get user followers"""
    try:
        followers = supabase.table('user_follows').select('*, users!follower_id(*)').eq('following_id', user_id).execute()
        result = []
        for follow in (followers.data or []):
            if follow.get('users'):
                follower = follow['users']
                follower.pop('password', None)
                follower['followed_at'] = follow.get('followed_at')
                result.append(follower)
        return result
    except Exception as e:
        logger.error(f"Get followers error: {str(e)}")
        return []
@api_router.get("/users/{user_id}/following")
async def get_user_following_users(user_id: str):
    """Get users that this user follows"""
    try:
        following = supabase.table('user_follows').select('*, users!following_id(*)').eq('follower_id', user_id).execute()
        result = []
        for follow in (following.data or []):
            if follow.get('users'):
                followed_user = follow['users']
                followed_user.pop('password', None)
                followed_user['followed_at'] = follow.get('followed_at')
                result.append(followed_user)
        return result
    except Exception as e:
        logger.error(f"Get following users error: {str(e)}")
        return []
@api_router.get("/users/{user_id}/following")
async def get_user_following(user_id: str, limit: int = 50):
    """Get NGOs that a user follows"""
    try:
        follows = supabase.table('ngo_follows').select('*, ngos(*)').eq('user_id', user_id).order('followed_at', desc=True).limit(limit).execute()
        following = []
        for follow in follows.data:
            if follow.get('ngos'):
                ngo = follow['ngos']
                ngo['followed_at'] = follow['followed_at']
                following.append(ngo)
        return following
    except Exception as e:
        logger.error(f"Get following error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/posts/{post_id}/share")
async def share_post(post_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Share a post"""
    try:
        user_data = await get_current_user(session_token)
        user_id = user_data['id']
        body = await request.json()
        share_text = body.get('share_text', '')
        share_data = {
            'id': str(uuid.uuid4()),
            'post_id': post_id,
            'user_id': user_id,
            'share_text': share_text,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('post_shares').insert(share_data).execute()
        post = supabase.table('posts').select('shares_count, user_id').eq('id', post_id).execute()
        if post.data:
            new_count = post.data[0].get('shares_count', 0) + 1
            supabase.table('posts').update({'shares_count': new_count}).eq('id', post_id).execute()
            if post.data[0].get('user_id') != user_id:
                notification_data = {
                    'id': str(uuid.uuid4()),
                    'user_id': post.data[0]['user_id'],
                    'type': 'post_share',
                    'title': 'Post Shared',
                    'message': f"{user_data['name']} shared your post",
                    'link': f"/post/{post_id}",
                    'data': {'post_id': post_id, 'sharer_id': user_id},
                    'read': False,
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                supabase.table('notifications').insert(notification_data).execute()
        return {'message': 'Post shared successfully', 'share_id': share_data['id']}
    except Exception as e:
        logger.error(f"Share post error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/posts/{post_id}/shares")
async def get_post_shares(post_id: str, limit: int = 50):
    """Get shares of a post"""
    try:
        shares = supabase.table('post_shares').select('*, users!post_shares_user_id_fkey(id, name, avatar)').eq('post_id', post_id).order('created_at', desc=True).limit(limit).execute()
        return shares.data
    except Exception as e:
        logger.error(f"Get shares error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/notifications")
async def get_notifications(request: Request, session_token: Optional[str] = Cookie(None), limit: int = 50, unread_only: bool = False):
    """Get user notifications"""
    try:
        user_data = await get_current_user(session_token)
        user_id = user_data['id']
        query = supabase.table('notifications').select('*').eq('user_id', user_id)
        if unread_only:
            query = query.eq('read', False)
        notifications = query.order('created_at', desc=True).limit(limit).execute()
        return notifications.data
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Mark a notification as read"""
    try:
        user_data = await get_current_user(session_token)
        supabase.table('notifications').update({'read': True}).eq('id', notification_id).eq('user_id', user_data['id']).execute()
        return {'message': 'Notification marked as read'}
    except Exception as e:
        logger.error(f"Mark notification read error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(request: Request, session_token: Optional[str] = Cookie(None)):
    """Mark all notifications as read"""
    try:
        user_data = await get_current_user(session_token)
        user_id = user_data['id']
        supabase.table('notifications').update({'read': True}).eq('user_id', user_id).eq('read', False).execute()
        return {'message': 'All notifications marked as read'}
    except Exception as e:
        logger.error(f"Mark all read error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/notifications/unread-count")
async def get_unread_count(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get count of unread notifications"""
    try:
        user_data = await get_current_user(session_token)
        user_id = user_data['id']
        result = supabase.table('notifications').select('id', count='exact').eq('user_id', user_id).eq('read', False).execute()
        return {'count': result.count if result.count else 0}
    except Exception as e:
        logger.error(f"Get unread count error: {str(e)}")
        return {'count': 0}
@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Delete a notification"""
    try:
        user_data = await get_current_user(session_token)
        supabase.table('notifications').delete().eq('id', notification_id).eq('user_id', user_data['id']).execute()
        return {'message': 'Notification deleted'}
    except Exception as e:
        logger.error(f"Delete notification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/trending/posts")
async def get_trending_posts(limit: int = 20):
    """Get trending posts"""
    try:
        trending = supabase.table('trending_posts').select('post_id, score').order('score', desc=True).limit(limit).execute()
        if not trending.data:
            posts = supabase.table('posts').select('*, users!posts_user_id_fkey(name, avatar)').eq('is_flagged', False).order('likes_count', desc=True).order('created_at', desc=True).limit(limit).execute()
            return posts.data
        post_ids = [t['post_id'] for t in trending.data]
        posts = supabase.table('posts').select('*, users!posts_user_id_fkey(name, avatar)').in_('id', post_ids).execute()
        posts_dict = {p['id']: p for p in posts.data}
        sorted_posts = []
        for trend in trending.data:
            if trend['post_id'] in posts_dict:
                post = posts_dict[trend['post_id']]
                post['trending_score'] = trend['score']
                sorted_posts.append(post)
        return sorted_posts
    except Exception as e:
        logger.error(f"Get trending posts error: {str(e)}")
        try:
            posts = supabase.table('posts').select('*, users!posts_user_id_fkey(name, avatar)').order('created_at', desc=True).limit(limit).execute()
            return posts.data
        except:
            return []
@api_router.post("/trending/update")
async def update_trending(request: Request, session_token: Optional[str] = Cookie(None)):
    """Update trending posts (admin only)"""
    try:
        user_data = await get_current_user(session_token)
        user = supabase.table('users').select('is_admin').eq('id', user_data['id']).execute()
        if not user.data or not user.data[0].get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        posts = supabase.table('posts').select('*').eq('is_flagged', False).gte('created_at', seven_days_ago).execute()
        trending_data = []
        for post in posts.data:
            likes = post.get('likes_count', 0)
            comments = post.get('comments_count', 0)
            shares = post.get('shares_count', 0)
            views = post.get('views_count', 0)
            created_at = datetime.fromisoformat(post['created_at'].replace('Z', '+00:00'))
            hours_old = (datetime.now(timezone.utc) - created_at).total_seconds() / 3600
            score = (likes + comments * 2 + shares * 3 + views * 0.1) / ((hours_old + 2) ** 1.5)
            trending_data.append({
                'id': str(uuid.uuid4()),
                'post_id': post['id'],
                'score': score,
                'calculated_at': datetime.now(timezone.utc).isoformat()
            })
        trending_data.sort(key=lambda x: x['score'], reverse=True)
        trending_data = trending_data[:100]
        supabase.table('trending_posts').delete().neq('id', '').execute()
        if trending_data:
            supabase.table('trending_posts').insert(trending_data).execute()
        return {'message': 'Trending posts updated', 'count': len(trending_data)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update trending error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/trending/ngos")
async def get_trending_ngos(limit: int = 10):
    """Get trending NGOs based on followers and activity"""
    try:
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        ngos = supabase.table('ngos').select('*, posts(id, created_at)').eq('is_verified', True).order('followers_count', desc=True).limit(limit * 2).execute()
        ngo_scores = []
        for ngo in ngos.data:
            recent_posts = 0
            if ngo.get('posts'):
                for post in ngo['posts']:
                    if post.get('created_at', '') >= thirty_days_ago:
                        recent_posts += 1
            score = ngo.get('followers_count', 0) * 1.0 + recent_posts * 5.0
            ngo['trending_score'] = score
            ngo_scores.append(ngo)
        ngo_scores.sort(key=lambda x: x.get('trending_score', 0), reverse=True)
        for ngo in ngo_scores[:limit]:
            ngo.pop('posts', None)
        return ngo_scores[:limit]
    except Exception as e:
        logger.error(f"Get trending NGOs error: {str(e)}")
        try:
            ngos = supabase.table('ngos').select('*').order('followers_count', desc=True).limit(limit).execute()
            return ngos.data
        except:
            return []
@api_router.post("/admin/reports")
async def report_content(request: Request, session_token: Optional[str] = Cookie(None)):
    """Report content for moderation"""
    try:
        user_data = await get_current_user(session_token)
        body = await request.json()
        report_data = {
            'id': str(uuid.uuid4()),
            'reporter_id': user_data['id'],
            'content_type': body.get('content_type'),
            'content_id': body.get('content_id'),
            'reason': body.get('reason'),
            'description': body.get('description', ''),
            'status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('content_reports').insert(report_data).execute()
        return {'message': 'Content reported successfully', 'report_id': report_data['id']}
    except Exception as e:
        logger.error(f"Report content error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/admin/reports")
async def get_reports(request: Request, session_token: Optional[str] = Cookie(None), status: str = 'pending', limit: int = 50):
    """Get content reports (admin only)"""
    try:
        user_data = await get_current_user(session_token)
        user = supabase.table('users').select('is_admin').eq('id', user_data['id']).execute()
        if not user.data or not user.data[0].get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        query = supabase.table('content_reports').select('*, users!content_reports_reporter_id_fkey(name, email)')
        if status != 'all':
            query = query.eq('status', status)
        reports = query.order('created_at', desc=True).limit(limit).execute()
        return reports.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get reports error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/admin/reports/{report_id}")
async def review_report(report_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Review a content report (admin only)"""
    try:
        user_data = await get_current_user(session_token)
        user = supabase.table('users').select('is_admin').eq('id', user_data['id']).execute()
        if not user.data or not user.data[0].get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        body = await request.json()
        update_data = {
            'status': body.get('status', 'reviewed'),
            'action_taken': body.get('action_taken', ''),
            'reviewed_by': user_data['id'],
            'reviewed_at': datetime.now(timezone.utc).isoformat()
        }
        supabase.table('content_reports').update(update_data).eq('id', report_id).execute()
        if body.get('flag_content'):
            report = supabase.table('content_reports').select('content_type, content_id').eq('id', report_id).execute()
            if report.data:
                content_type = report.data[0]['content_type']
                content_id = report.data[0]['content_id']
                if content_type == 'post':
                    supabase.table('posts').update({'is_flagged': True}).eq('id', content_id).execute()
        return {'message': 'Report reviewed successfully'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Review report error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/admin/users")
async def get_all_users(request: Request, session_token: Optional[str] = Cookie(None), limit: int = 50, search: str = ''):
    """Get all users (admin only)"""
    try:
        user_data = await get_current_user(session_token)
        user = supabase.table('users').select('is_admin').eq('id', user_data['id']).execute()
        if not user.data or not user.data[0].get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        query = supabase.table('users').select('id, name, email, user_type, created_at, is_banned, is_admin')
        if search:
            query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%")
        users = query.order('created_at', desc=True).limit(limit).execute()
        return users.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.put("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, request: Request, session_token: Optional[str] = Cookie(None)):
    """Ban/unban a user (admin only)"""
    try:
        user_data = await get_current_user(session_token)
        user = supabase.table('users').select('is_admin').eq('id', user_data['id']).execute()
        if not user.data or not user.data[0].get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        body = await request.json()
        is_banned = body.get('is_banned', True)
        supabase.table('users').update({'is_banned': is_banned}).eq('id', user_id).execute()
        action = 'banned' if is_banned else 'unbanned'
        return {'message': f'User {action} successfully'}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ban user error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/admin/stats")
async def get_admin_stats(request: Request, session_token: Optional[str] = Cookie(None)):
    """Get platform statistics (admin only)"""
    try:
        user_data = await get_current_user(session_token)
        user = supabase.table('users').select('is_admin').eq('id', user_data['id']).execute()
        if not user.data or not user.data[0].get('is_admin', False):
            raise HTTPException(status_code=403, detail="Admin access required")
        users_count = supabase.table('users').select('id', count='exact').execute()
        ngos_count = supabase.table('ngos').select('id', count='exact').execute()
        posts_count = supabase.table('posts').select('id', count='exact').execute()
        events_count = supabase.table('events').select('id', count='exact').execute()
        reports_pending = supabase.table('content_reports').select('id', count='exact').eq('status', 'pending').execute()
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        new_users = supabase.table('users').select('id', count='exact').gte('created_at', thirty_days_ago).execute()
        new_posts = supabase.table('posts').select('id', count='exact').gte('created_at', thirty_days_ago).execute()
        return {
            'total_users': users_count.count or 0,
            'total_ngos': ngos_count.count or 0,
            'total_posts': posts_count.count or 0,
            'total_events': events_count.count or 0,
            'pending_reports': reports_pending.count or 0,
            'new_users_30d': new_users.count or 0,
            'new_posts_30d': new_posts.count or 0
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get admin stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/posts/filter")
async def get_filtered_posts(
    post_type: str = 'all',
    limit: int = 50
):
    """Get posts filtered by type"""
    try:
        query = supabase.table('posts').select('*, users!posts_user_id_fkey(name, avatar), ngos(name, logo)')
        if post_type == 'ngo':
            query = query.not_.is_('ngo_id', 'null')
        elif post_type == 'user':
            query = query.is_('ngo_id', 'null')
        elif post_type == 'event':
            query = query.like('content', '%event%')
        elif post_type == 'fundraiser':
            query = query.or_('content.ilike.%donate%,content.ilike.%fundrais%')
        posts = query.eq('is_flagged', False).order('created_at', desc=True).limit(limit).execute()
        return posts.data
    except Exception as e:
        logger.error(f"Filter posts error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/ai/volunteer-matching")
async def ai_volunteer_matching(request: Request, session_token: Optional[str] = Cookie(None)):
    """AI-powered volunteer matching for events"""
    try:
        user_data = await get_current_user(session_token)
        body = await request.json()
        event_id = body.get('event_id')
        if not event_id:
            raise HTTPException(status_code=400, detail="Event ID required")
        event = supabase.table('events').select('*').eq('id', event_id).execute()
        if not event.data:
            raise HTTPException(status_code=404, detail="Event not found")
        event_data = event.data[0]
        volunteers = supabase.table('users').select('id, name, email, skills, interests, bio, location').eq('user_type', 'volunteer').execute()
        applications = supabase.table('volunteer_applications').select('user_id').eq('event_id', event_id).execute()
        applied_user_ids = [app['user_id'] for app in applications.data] if applications.data else []
        available_volunteers = [v for v in volunteers.data if v['id'] not in applied_user_ids]
        if not available_volunteers:
            return {'matches': [], 'message': 'No available volunteers found'}
        prompt = f"""
        Event Details:
        - Title: {event_data['title']}
        - Description: {event_data['description']}
        - Category: {event_data.get('category', 'general')}
        - Location: {event_data['location']}
        - Date: {event_data['date']}
        Available Volunteers (first 10):
        {json.dumps(available_volunteers[:10], indent=2)}
        Task: Analyze and rank the top 5 most suitable volunteers for this event based on:
        1. Skills matching event requirements
        2. Interests alignment with event category
        3. Location proximity
        4. Bio relevance
        Return ONLY a JSON array with the volunteer IDs in ranked order (best match first), along with a brief reason for each match.
        Format: [{{"id": "volunteer_id", "match_score": 0-100, "reason": "brief reason"}}]
        """
        try:
            ai_response_text = await call_groq_ai(prompt)
            if '```json' in ai_response_text:
                ai_response = ai_response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in ai_response_text:
                ai_response = ai_response_text.split('```')[1].strip()
            else:
                ai_response = ai_response_text.strip()
            matches = json.loads(ai_response)
            enriched_matches = []
            for match in matches[:5]:
                volunteer = next((v for v in available_volunteers if v['id'] == match['id']), None)
                if volunteer:
                    enriched_matches.append({
                        **volunteer,
                        'match_score': match.get('match_score', 80),
                        'match_reason': match.get('reason', 'Good fit based on profile')
                    })
            return {'matches': enriched_matches, 'total_available': len(available_volunteers)}
        except json.JSONDecodeError:
            return {'matches': available_volunteers[:5], 'total_available': len(available_volunteers)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI volunteer matching error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/ai/impact-prediction")
async def ai_impact_prediction(request: Request, session_token: Optional[str] = Cookie(None)):
    """AI predicts project/event success based on team composition"""
    try:
        user_data = await get_current_user(session_token)
        body = await request.json()
        event_id = body.get('event_id')
        if not event_id:
            raise HTTPException(status_code=400, detail="Event ID required")
        event = supabase.table('events').select('*').eq('id', event_id).execute()
        if not event.data:
            raise HTTPException(status_code=404, detail="Event not found")
        event_data = event.data[0]
        rsvps = supabase.table('event_rsvps').select('user_id').eq('event_id', event_id).execute()
        volunteer_ids = [rsvp['user_id'] for rsvp in rsvps.data] if rsvps.data else []
        if not volunteer_ids:
            return {
                'prediction': {
                    'success_probability': 50,
                    'confidence': 'low',
                    'factors': ['No volunteers registered yet'],
                    'recommendations': ['Recruit volunteers with relevant skills', 'Set up volunteer training', 'Create clear role descriptions']
                }
            }
        volunteers = supabase.table('users').select('id, name, skills, interests, location').in_('id', volunteer_ids).execute()
        past_events = supabase.table('events').select('*, event_feedback(rating)').eq('category', event_data.get('category', 'general')).limit(10).execute()
        prompt = f"""
        Analyze the following event and predict its success probability:
        Event:
        - Title: {event_data['title']}
        - Description: {event_data['description']}
        - Category: {event_data.get('category', 'general')}
        - Volunteers Needed: {event_data.get('volunteers_needed', 10)}
        - Volunteers Registered: {len(volunteer_ids)}
        Team Composition:
        {json.dumps(volunteers.data, indent=2)}
        Analyze:
        1. Team skill diversity and coverage
        2. Volunteer-to-need ratio
        3. Experience indicators from skills
        4. Location diversity for local events
        Return a JSON object with:
        {{
            "success_probability": 0-100,
            "confidence": "low|medium|high",
            "key_strengths": ["strength1", "strength2"],
            "potential_risks": ["risk1", "risk2"],
            "recommendations": ["rec1", "rec2", "rec3"]
        }}
        """
        try:
            ai_response_text = await call_groq_ai(prompt)
            if '```json' in ai_response_text:
                ai_response = ai_response_text.split('```json')[1].split('```')[0].strip()
            elif '```' in ai_response_text:
                ai_response = ai_response_text.split('```')[1].strip()
            else:
                ai_response = ai_response_text.strip()
            prediction = json.loads(ai_response)
            return {
                'prediction': prediction,
                'team_size': len(volunteer_ids),
                'volunteers_needed': event_data.get('volunteers_needed', 10)
            }
        except json.JSONDecodeError:
            registration_rate = len(volunteer_ids) / event_data.get('volunteers_needed', 10)
            success_prob = min(100, int(registration_rate * 80 + 20))
            return {
                'prediction': {
                    'success_probability': success_prob,
                    'confidence': 'medium',
                    'key_strengths': ['Good volunteer turnout'],
                    'potential_risks': ['Team composition unknown'],
                    'recommendations': ['Monitor volunteer engagement', 'Provide adequate training']
                },
                'team_size': len(volunteer_ids)
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI impact prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/ai/recommendations")
async def ai_content_recommendations(request: Request, session_token: Optional[str] = Cookie(None), type: str = 'all', limit: int = 10):
    """AI-powered content recommendations based on user interests"""
    try:
        user_data = await get_current_user(session_token)
        user_id = user_data['id']
        user = supabase.table('users').select('skills, interests, location').eq('id', user_id).execute()
        user_profile = user.data[0] if user.data else {}
        recent_posts = supabase.table('post_likes').select('posts(*)').eq('user_id', user_id).order('created_at', desc=True).limit(10).execute()
        recent_events = supabase.table('event_rsvps').select('events(*)').eq('user_id', user_id).order('created_at', desc=True).limit(10).execute()
        followed_ngos = supabase.table('ngo_follows').select('ngos(*)').eq('user_id', user_id).execute()
        recommendations = {
            'posts': [],
            'events': [],
            'ngos': []
        }
        if type in ['all', 'posts']:
            posts = supabase.table('posts').select('*, users!posts_user_id_fkey(name, avatar)').eq('is_flagged', False).order('created_at', desc=True).limit(50).execute()
            recommendations['posts'] = posts.data[:limit]
        if type in ['all', 'events']:
            events = supabase.table('events').select('*').gte('date', datetime.now(timezone.utc).isoformat()).order('date', desc=False).limit(50).execute()
            recommendations['events'] = events.data[:limit]
        if type in ['all', 'ngos']:
            followed_ngo_ids = [f['ngos']['id'] for f in followed_ngos.data if f.get('ngos')] if followed_ngos.data else []
            ngos = supabase.table('ngos').select('*').order('followers_count', desc=True).limit(50).execute()
            recommendations['ngos'] = [ngo for ngo in ngos.data if ngo['id'] not in followed_ngo_ids][:limit]
        if user_profile.get('skills') or user_profile.get('interests'):
            prompt = f"""
            User Profile:
            - Skills: {user_profile.get('skills', [])}
            - Interests: {user_profile.get('interests', [])}
            - Location: {user_profile.get('location', 'Not specified')}
            Available Content:
            Posts: {len(recommendations.get('posts', []))} posts
            Events: {len(recommendations.get('events', []))} events
            NGOs: {len(recommendations.get('ngos', []))} ngos
            Task: Rank the most relevant content for this user based on their profile.
            Return a brief explanation of why these recommendations match the user's interests.
            """
            try:
                recommendation_reasoning = await call_groq_ai(prompt)
                recommendations['ai_reasoning'] = recommendation_reasoning.strip()
            except:
                pass
        return recommendations
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI recommendations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/ai/generate-impact-story")
async def ai_generate_impact_story(request: Request, session_token: Optional[str] = Cookie(None)):
    """AI generates impact story from event/project data"""
    try:
        user_data = await get_current_user(session_token)
        body = await request.json()
        source_type = body.get('source_type')
        source_id = body.get('source_id')
        if not source_type or not source_id:
            raise HTTPException(status_code=400, detail="Source type and ID required")
        story_data = {}
        if source_type == 'event':
            event = supabase.table('events').select('*').eq('id', source_id).execute()
            if not event.data:
                raise HTTPException(status_code=404, detail="Event not found")
            event_data = event.data[0]
            rsvps = supabase.table('event_rsvps').select('user_id').eq('event_id', source_id).execute()
            volunteer_count = len(rsvps.data) if rsvps.data else 0
            hours = supabase.table('volunteer_hours').select('hours').eq('event_id', source_id).execute()
            total_hours = sum([h['hours'] for h in hours.data]) if hours.data else 0
            feedback = supabase.table('event_feedback').select('rating, feedback').eq('event_id', source_id).execute()
            avg_rating = sum([f['rating'] for f in feedback.data]) / len(feedback.data) if feedback.data else 0
            story_data = {
                'title': event_data['title'],
                'description': event_data['description'],
                'category': event_data.get('category', 'general'),
                'location': event_data['location'],
                'volunteer_count': volunteer_count,
                'total_hours': total_hours,
                'average_rating': round(avg_rating, 1),
                'feedback_count': len(feedback.data) if feedback.data else 0
            }
        elif source_type == 'ngo':
            ngo = supabase.table('ngos').select('*').eq('id', source_id).execute()
            if not ngo.data:
                raise HTTPException(status_code=404, detail="NGO not found")
            ngo_data = ngo.data[0]
            metrics = supabase.table('impact_metrics').select('*').eq('ngo_id', source_id).execute()
            events = supabase.table('events').select('id').eq('ngo_id', source_id).execute()
            event_count = len(events.data) if events.data else 0
            donations = supabase.table('donations').select('amount').eq('ngo_id', source_id).eq('status', 'completed').execute()
            total_donations = sum([d['amount'] for d in donations.data]) if donations.data else 0
            story_data = {
                'name': ngo_data['name'],
                'description': ngo_data['description'],
                'category': ngo_data['category'],
                'followers': ngo_data.get('followers_count', 0),
                'events_organized': event_count,
                'total_donations': total_donations,
                'metrics_count': len(metrics.data) if metrics.data else 0
            }
        prompt = f"""
        Create an inspiring impact story based on the following data:
        Data:
        {json.dumps(story_data, indent=2)}
        Generate a compelling impact story with:
        1. An engaging title (max 100 characters)
        2. A 2-3 paragraph narrative highlighting the impact
        3. Key statistics presented in an engaging way
        4. A call-to-action for readers
        Return as JSON:
        {{
            "title": "Generated title",
            "content": "Full story content with paragraphs",
            "key_stats": [
                {{"label": "Volunteers", "value": "50+"}},
                {{"label": "Hours", "value": "200"}}
            ],
            "call_to_action": "Get involved text"
        }}
        Keep the tone inspiring, human, and authentic. Focus on real impact.
        """
        try:
            ai_response_text = await call_groq_ai(prompt)
            ai_response = ai_response_text.strip()
            if '```json' in ai_response:
                ai_response = ai_response.split('```json')[1].split('```')[0].strip()
            elif '```' in ai_response:
                ai_response = ai_response.split('```')[1].split('```')[0].strip()
            generated_story = json.loads(ai_response)
            generated_story['source_type'] = source_type
            generated_story['source_id'] = source_id
            generated_story['generated_at'] = datetime.now(timezone.utc).isoformat()
            generated_story['raw_data'] = story_data
            return generated_story
        except json.JSONDecodeError:
            if source_type == 'event':
                return {
                    'title': f"Impact Story: {story_data['title']}",
                    'content': f"Our {story_data['category']} event brought together {story_data['volunteer_count']} dedicated volunteers who contributed {story_data['total_hours']} hours of service. Together, we made a real difference in {story_data['location']}.",
                    'key_stats': [
                        {'label': 'Volunteers', 'value': str(story_data['volunteer_count'])},
                        {'label': 'Hours Contributed', 'value': str(story_data['total_hours'])},
                        {'label': 'Average Rating', 'value': f"{story_data['average_rating']}/5"}
                    ],
                    'call_to_action': 'Join us in making a difference!'
                }
            else:
                return {
                    'title': f"Impact Story: {story_data['name']}",
                    'content': f"{story_data['name']} continues to make a difference in {story_data['category']}. With {story_data['followers']} supporters and {story_data['events_organized']} events organized, we're creating lasting change in our community.",
                    'key_stats': [
                        {'label': 'Followers', 'value': str(story_data['followers'])},
                        {'label': 'Events', 'value': str(story_data['events_organized'])},
                        {'label': 'Total Raised', 'value': f"${story_data['total_donations']}"}
                    ],
                    'call_to_action': 'Support our mission!'
                }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI story generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/ai/smart-search")
async def ai_smart_search(request: Request, session_token: Optional[str] = Cookie(None)):
    """AI-powered semantic search across platform"""
    try:
        user_data = await get_current_user(session_token)
        body = await request.json()
        query = body.get('query', '')
        if not query:
            raise HTTPException(status_code=400, detail="Search query required")
        posts = supabase.table('posts').select('*, users!posts_user_id_fkey(name)').eq('is_flagged', False).order('created_at', desc=True).limit(20).execute()
        events = supabase.table('events').select('*').order('date', desc=False).limit(20).execute()
        ngos = supabase.table('ngos').select('*').order('followers_count', desc=True).limit(20).execute()
        prompt = f"""
        User Search Query: "{query}"
        Available Content:
        Posts: {json.dumps([{'id': p['id'], 'content': p['content'][:200]} for p in posts.data], indent=2)}
        Events: {json.dumps([{'id': e['id'], 'title': e['title'], 'description': e['description'][:200]} for e in events.data], indent=2)}
        NGOs: {json.dumps([{'id': n['id'], 'name': n['name'], 'description': n['description'][:200]} for n in ngos.data], indent=2)}
        Task: Understand the user's search intent and return the most relevant content IDs.
        Return JSON:
        {{
            "intent": "What the user is looking for",
            "relevant_posts": ["post_id1", "post_id2"],
            "relevant_events": ["event_id1", "event_id2"],
            "relevant_ngos": ["ngo_id1", "ngo_id2"],
            "explanation": "Why these results match"
        }}
        """
        try:
            ai_response_text = await call_groq_ai(prompt)
            ai_response = ai_response_text.strip()
            if '```json' in ai_response:
                ai_response = ai_response.split('```json')[1].split('```')[0].strip()
            elif '```' in ai_response:
                ai_response = ai_response.split('```')[1].split('```')[0].strip()
            search_results = json.loads(ai_response)
            result_posts = [p for p in posts.data if p['id'] in search_results.get('relevant_posts', [])]
            result_events = [e for e in events.data if e['id'] in search_results.get('relevant_events', [])]
            result_ngos = [n for n in ngos.data if n['id'] in search_results.get('relevant_ngos', [])]
            return {
                'query': query,
                'intent': search_results.get('intent', 'General search'),
                'explanation': search_results.get('explanation', 'Results based on relevance'),
                'results': {
                    'posts': result_posts[:5],
                    'events': result_events[:5],
                    'ngos': result_ngos[:5]
                }
            }
        except json.JSONDecodeError:
            query_lower = query.lower()
            result_posts = [p for p in posts.data if query_lower in p['content'].lower()][:5]
            result_events = [e for e in events.data if query_lower in e['title'].lower() or query_lower in e['description'].lower()][:5]
            result_ngos = [n for n in ngos.data if query_lower in n['name'].lower() or query_lower in n['description'].lower()][:5]
            return {
                'query': query,
                'intent': 'Text search',
                'results': {
                    'posts': result_posts,
                    'events': result_events,
                    'ngos': result_ngos
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI smart search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/gamification/leaderboards")
async def get_leaderboards(
    category: str = 'volunteer',
    metric_type: str = 'hours',
    limit: int = 50,
    request: Request = None,
    session_token: Optional[str] = Cookie(None)
):
    """Get leaderboard rankings"""
    try:
        query = supabase.table('leaderboards').select('*')
        if category:
            query = query.eq('category', category)
        if metric_type:
            query = query.eq('metric_type', metric_type)
        result = query.order('rank_position').limit(limit).execute()
        enriched_data = []
        for entry in result.data:
            if entry.get('user_id'):
                user_result = supabase.table('users').select('id, name, avatar, location').eq('id', entry['user_id']).execute()
                if user_result.data:
                    entry['user'] = user_result.data[0]
            elif entry.get('ngo_id'):
                ngo_result = supabase.table('ngos').select('id, name, logo, category').eq('id', entry['ngo_id']).execute()
                if ngo_result.data:
                    entry['ngo'] = ngo_result.data[0]
            enriched_data.append(entry)
        return {'leaderboard': enriched_data, 'category': category, 'metric_type': metric_type}
    except Exception as e:
        logger.error(f"Get leaderboards error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/gamification/leaderboards/update")
async def update_leaderboard(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Recalculate and update leaderboard rankings"""
    try:
        current_user = await get_current_user(session_token)
        hours_result = supabase.table('volunteer_hours').select('user_id, hours').execute()
        user_hours = {}
        for record in hours_result.data:
            user_id = record['user_id']
            user_hours[user_id] = user_hours.get(user_id, 0) + float(record.get('hours', 0))
        for user_id, total_hours in user_hours.items():
            supabase.table('leaderboards').upsert({
                'user_id': user_id,
                'category': 'volunteer',
                'metric_type': 'hours',
                'total_value': total_hours,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }, on_conflict='user_id,category,metric_type').execute()
        donations_result = supabase.table('donations').select('user_id, amount').eq('status', 'succeeded').execute()
        user_donations = {}
        for record in donations_result.data:
            user_id = record['user_id']
            user_donations[user_id] = user_donations.get(user_id, 0) + float(record.get('amount', 0))
        for user_id, total_amount in user_donations.items():
            supabase.table('leaderboards').upsert({
                'user_id': user_id,
                'category': 'donor',
                'metric_type': 'donations',
                'total_value': total_amount,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }, on_conflict='user_id,category,metric_type').execute()
        return {'success': True, 'message': 'Leaderboards updated'}
    except Exception as e:
        logger.error(f"Update leaderboards error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/gamification/badges")
async def get_all_badges():
    """Get all available badges"""
    try:
        result = supabase.table('badges').select('*').order('points').execute()
        return {'badges': result.data}
    except Exception as e:
        logger.error(f"Get badges error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/gamification/user-badges/{user_id}")
async def get_user_badges(user_id: str):
    """Get badges earned by a user"""
    try:
        result = supabase.table('user_badges').select('*, badge:badges(*)').eq('user_id', user_id).execute()
        return {'user_badges': result.data}
    except Exception as e:
        logger.error(f"Get user badges error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/gamification/award-badge")
async def award_badge(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Award a badge to a user"""
    try:
        current_user = await get_current_user(session_token)
        data = await request.json()
        user_id = data.get('user_id')
        badge_id = data.get('badge_id')
        existing = supabase.table('user_badges').select('*').eq('user_id', user_id).eq('badge_id', badge_id).execute()
        if existing.data:
            return {'success': False, 'message': 'Badge already earned'}
        result = supabase.table('user_badges').insert({
            'user_id': user_id,
            'badge_id': badge_id,
            'earned_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        await notify_user(user_id, 'badge_earned', {'badge_id': badge_id})
        return {'success': True, 'user_badge': result.data[0]}
    except Exception as e:
        logger.error(f"Award badge error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/gamification/challenges")
async def get_challenges(
    status: str = 'active',
    is_global: Optional[bool] = None,
    limit: int = 20
):
    """Get challenges"""
    try:
        query = supabase.table('challenges').select('*')
        if status:
            query = query.eq('status', status)
        if is_global is not None:
            query = query.eq('is_global', is_global)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return {'challenges': result.data}
    except Exception as e:
        logger.error(f"Get challenges error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/gamification/challenges")
async def create_challenge(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create a new challenge"""
    try:
        current_user = await get_current_user(session_token)
        data = await request.json()
        challenge_data = {
            'id': str(uuid.uuid4()),
            'title': data['title'],
            'description': data.get('description'),
            'challenge_type': data['challenge_type'],
            'target_value': data['target_value'],
            'unit': data.get('unit'),
            'start_date': data['start_date'],
            'end_date': data['end_date'],
            'created_by': current_user['id'],
            'ngo_id': data.get('ngo_id'),
            'is_global': data.get('is_global', True),
            'reward_points': data.get('reward_points', 0),
            'image_url': data.get('image_url'),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('challenges').insert(challenge_data).execute()
        await manager.broadcast({
            'type': 'new_challenge',
            'challenge': result.data[0]
        })
        return {'success': True, 'challenge': result.data[0]}
    except Exception as e:
        logger.error(f"Create challenge error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/gamification/challenges/{challenge_id}/join")
async def join_challenge(
    challenge_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Join a challenge"""
    try:
        current_user = await get_current_user(session_token)
        existing = supabase.table('challenge_participants').select('*').eq('challenge_id', challenge_id).eq('user_id', current_user['id']).execute()
        if existing.data:
            return {'success': False, 'message': 'Already joined this challenge'}
        result = supabase.table('challenge_participants').insert({
            'id': str(uuid.uuid4()),
            'challenge_id': challenge_id,
            'user_id': current_user['id'],
            'joined_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        supabase.rpc('increment_challenge_participants', {'challenge_id': challenge_id}).execute()
        return {'success': True, 'participation': result.data[0]}
    except Exception as e:
        logger.error(f"Join challenge error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/gamification/challenges/{challenge_id}/progress")
async def update_challenge_progress(
    challenge_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Update user's progress in a challenge"""
    try:
        current_user = await get_current_user(session_token)
        data = await request.json()
        contribution = data.get('contribution', 0)
        supabase.table('challenge_participants').update({
            'contribution': contribution
        }).eq('challenge_id', challenge_id).eq('user_id', current_user['id']).execute()
        participants = supabase.table('challenge_participants').select('contribution').eq('challenge_id', challenge_id).execute()
        total_contribution = sum(float(p.get('contribution', 0)) for p in participants.data)
        challenge_result = supabase.table('challenges').update({
            'current_value': total_contribution
        }).eq('id', challenge_id).execute()
        challenge = challenge_result.data[0] if challenge_result.data else {}
        if total_contribution >= float(challenge.get('target_value', 0)):
            supabase.table('challenges').update({
                'status': 'completed'
            }).eq('id', challenge_id).execute()
            await manager.broadcast({
                'type': 'challenge_completed',
                'challenge_id': challenge_id
            })
        return {'success': True, 'current_value': total_contribution}
    except Exception as e:
        logger.error(f"Update challenge progress error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/gamification/streaks/{user_id}")
async def get_user_streak(user_id: str):
    """Get user's activity streak"""
    try:
        result = supabase.table('activity_streaks').select('*').eq('user_id', user_id).execute()
        if not result.data:
            return {
                'current_streak': 0,
                'longest_streak': 0,
                'last_activity_date': None,
                'total_checkins': 0
            }
        return result.data[0]
    except Exception as e:
        logger.error(f"Get streak error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/gamification/streaks/checkin")
async def checkin_streak(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Check in for daily streak"""
    try:
        current_user = await get_current_user(session_token)
        today = datetime.now(timezone.utc).date()
        result = supabase.table('activity_streaks').select('*').eq('user_id', current_user['id']).execute()
        if not result.data:
            new_streak = {
                'id': str(uuid.uuid4()),
                'user_id': current_user['id'],
                'current_streak': 1,
                'longest_streak': 1,
                'last_activity_date': today.isoformat(),
                'total_checkins': 1,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            result = supabase.table('activity_streaks').insert(new_streak).execute()
            return {'success': True, 'streak': result.data[0]}
        streak_data = result.data[0]
        last_date = datetime.fromisoformat(streak_data['last_activity_date']).date()
        if last_date == today:
            return {'success': False, 'message': 'Already checked in today', 'streak': streak_data}
        days_diff = (today - last_date).days
        if days_diff == 1:
            new_current = streak_data['current_streak'] + 1
        else:
            new_current = 1
        new_longest = max(new_current, streak_data['longest_streak'])
        updated = supabase.table('activity_streaks').update({
            'current_streak': new_current,
            'longest_streak': new_longest,
            'last_activity_date': today.isoformat(),
            'total_checkins': streak_data['total_checkins'] + 1,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('user_id', current_user['id']).execute()
        if new_current == 7:
            await award_badge_by_name(current_user['id'], 'Week Warrior')
        elif new_current == 30:
            await award_badge_by_name(current_user['id'], 'Month Master')
        return {'success': True, 'streak': updated.data[0]}
    except Exception as e:
        logger.error(f"Checkin streak error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/gamification/community-score")
async def get_community_scores(
    entity_type: str = 'user',
    limit: int = 20
):
    """Get community scores leaderboard"""
    try:
        result = supabase.table('community_scores').select('*').eq('entity_type', entity_type).order('total_score', desc=True).limit(limit).execute()
        enriched_data = []
        for score in result.data:
            if entity_type == 'user' and score.get('user_id'):
                user_result = supabase.table('users').select('id, name, avatar').eq('id', score['user_id']).execute()
                if user_result.data:
                    score['user'] = user_result.data[0]
            elif entity_type == 'ngo' and score.get('ngo_id'):
                ngo_result = supabase.table('ngos').select('id, name, logo').eq('id', score['ngo_id']).execute()
                if ngo_result.data:
                    score['ngo'] = ngo_result.data[0]
            enriched_data.append(score)
        return {'community_scores': enriched_data}
    except Exception as e:
        logger.error(f"Get community scores error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/realtime/counters")
async def get_live_counters():
    """Get live impact counters"""
    try:
        result = supabase.table('live_counters').select('*').execute()
        counters = {}
        for counter in result.data:
            counters[counter['counter_name']] = {
                'value': counter['counter_value'],
                'type': counter['counter_type'],
                'last_updated': counter['last_updated']
            }
        return {'counters': counters}
    except Exception as e:
        logger.error(f"Get live counters error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/realtime/counters/increment")
async def increment_counter(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Increment a live counter"""
    try:
        data = await request.json()
        counter_name = data['counter_name']
        increment_by = data.get('increment_by', 1)
        result = supabase.table('live_counters').select('*').eq('counter_name', counter_name).execute()
        if result.data:
            current_value = int(result.data[0]['counter_value'])
            new_value = current_value + increment_by
            supabase.table('live_counters').update({
                'counter_value': new_value,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }).eq('counter_name', counter_name).execute()
        else:
            new_value = increment_by
            supabase.table('live_counters').insert({
                'counter_name': counter_name,
                'counter_value': new_value,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }).execute()
        await manager.broadcast({
            'type': 'counter_update',
            'counter_name': counter_name,
            'value': new_value
        })
        return {'success': True, 'counter_name': counter_name, 'value': new_value}
    except Exception as e:
        logger.error(f"Increment counter error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/realtime/impact-map")
async def get_impact_map_data():
    """Get data for interactive impact map"""
    try:
        result = supabase.table('impact_events').select('*').not_.is_('location_lat', 'null').not_.is_('location_lng', 'null').order('created_at', desc=True).limit(500).execute()
        return {'impact_events': result.data}
    except Exception as e:
        logger.error(f"Get impact map data error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/realtime/heatmap")
async def get_impact_heatmap():
    """Get impact heatmap data"""
    try:
        result = supabase.table('impact_heatmap').select('*').order('intensity', desc=True).limit(200).execute()
        return {'heatmap_data': result.data}
    except Exception as e:
        logger.error(f"Get heatmap error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/realtime/donation-ticker")
async def get_donation_ticker(limit: int = 20):
    """Get recent donations for live ticker"""
    try:
        result = supabase.table('donations').select('*, user:users(name, avatar), ngo:ngos(name)').eq('status', 'succeeded').order('created_at', desc=True).limit(limit).execute()
        ticker_items = []
        for donation in result.data:
            ticker_items.append({
                'id': donation['id'],
                'amount': donation['amount'],
                'currency': donation.get('currency', 'USD'),
                'donor_name': donation.get('user', {}).get('name', 'Anonymous'),
                'ngo_name': donation.get('ngo', {}).get('name', 'Unknown'),
                'timestamp': donation['created_at']
            })
        return {'donations': ticker_items}
    except Exception as e:
        logger.error(f"Get donation ticker error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/realtime/timeline")
async def get_impact_timeline(
    limit: int = 50,
    event_type: Optional[str] = None
):
    """Get impact timeline events"""
    try:
        query = supabase.table('impact_events').select('*, user:users(name, avatar), ngo:ngos(name, logo)')
        if event_type:
            query = query.eq('event_type', event_type)
        result = query.eq('is_public', True).order('created_at', desc=True).limit(limit).execute()
        return {'timeline_events': result.data}
    except Exception as e:
        logger.error(f"Get timeline error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/realtime/impact-event")
async def create_impact_event(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Create an impact event for timeline/map"""
    try:
        current_user = await get_current_user(session_token)
        data = await request.json()
        event_data = {
            'id': str(uuid.uuid4()),
            'event_type': data['event_type'],
            'title': data['title'],
            'description': data.get('description'),
            'user_id': current_user['id'],
            'ngo_id': data.get('ngo_id'),
            'event_id': data.get('event_id'),
            'impact_value': data.get('impact_value'),
            'impact_unit': data.get('impact_unit'),
            'location_lat': data.get('location_lat'),
            'location_lng': data.get('location_lng'),
            'location_name': data.get('location_name'),
            'country': data.get('country'),
            'metadata': data.get('metadata', {}),
            'is_public': data.get('is_public', True),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table('impact_events').insert(event_data).execute()
        await manager.broadcast({
            'type': 'new_impact_event',
            'event': result.data[0]
        })
        if data.get('location_lat') and data.get('location_lng'):
            await update_heatmap(data['location_lat'], data['location_lng'], data.get('impact_value', 1))
        return {'success': True, 'impact_event': result.data[0]}
    except Exception as e:
        logger.error(f"Create impact event error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/analytics/roi-calculator")
async def calculate_roi(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Calculate ROI for an event or NGO"""
    try:
        current_user = await get_current_user(session_token)
        data = await request.json()
        calculation_type = data['calculation_type']
        entity_id = data.get('ngo_id') or data.get('event_id')
        investment_amount = float(data['investment_amount'])
        if calculation_type == 'event':
            event_result = supabase.table('events').select('*').eq('id', entity_id).execute()
            event = event_result.data[0] if event_result.data else {}
            hours_result = supabase.table('volunteer_hours').select('hours').eq('event_id', entity_id).execute()
            total_hours = sum(float(h.get('hours', 0)) for h in hours_result.data)
            volunteer_value = total_hours * 25
            metrics_result = supabase.table('impact_metrics').select('value').eq('event_id', entity_id).eq('metric_type', 'people_helped').execute()
            people_impacted = sum(float(m.get('value', 0)) for m in metrics_result.data)
            direct_impact_value = volunteer_value
            indirect_impact_value = people_impacted * 10  # Estimated value per person helped
        else:
            donations_result = supabase.table('donations').select('amount').eq('ngo_id', entity_id).eq('status', 'succeeded').execute()
            total_donations = sum(float(d.get('amount', 0)) for d in donations_result.data)
            hours_result = supabase.table('volunteer_hours').select('hours').execute()
            total_hours = sum(float(h.get('hours', 0)) for h in hours_result.data)
            volunteer_value = total_hours * 25
            metrics_result = supabase.table('impact_metrics').select('value').eq('ngo_id', entity_id).eq('metric_type', 'people_helped').execute()
            people_impacted = sum(float(m.get('value', 0)) for m in metrics_result.data)
            direct_impact_value = volunteer_value + total_donations
            indirect_impact_value = people_impacted * 10
        total_impact_value = direct_impact_value + indirect_impact_value
        roi_percentage = ((total_impact_value - investment_amount) / investment_amount) * 100 if investment_amount > 0 else 0
        cost_per_person = investment_amount / people_impacted if people_impacted > 0 else 0
        roi_data = {
            'id': str(uuid.uuid4()),
            'ngo_id': data.get('ngo_id'),
            'event_id': data.get('event_id'),
            'calculation_type': calculation_type,
            'investment_amount': investment_amount,
            'direct_impact_value': direct_impact_value,
            'indirect_impact_value': indirect_impact_value,
            'total_roi': roi_percentage,
            'people_impacted': int(people_impacted),
            'cost_per_person': cost_per_person,
            'calculation_date': datetime.now(timezone.utc).isoformat(),
            'methodology': 'Volunteer hours valued at $25/hour, indirect impact at $10/person'
        }
        result = supabase.table('impact_roi').insert(roi_data).execute()
        return {
            'success': True,
            'roi': {
                'roi_percentage': round(roi_percentage, 2),
                'total_impact_value': round(total_impact_value, 2),
                'direct_impact': round(direct_impact_value, 2),
                'indirect_impact': round(indirect_impact_value, 2),
                'people_impacted': int(people_impacted),
                'cost_per_person': round(cost_per_person, 2),
                'investment': investment_amount
            }
        }
    except Exception as e:
        logger.error(f"Calculate ROI error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/analytics/predictions")
async def get_predictions(
    prediction_type: Optional[str] = None,
    entity_id: Optional[str] = None
):
    """Get predictive analytics"""
    try:
        query = supabase.table('analytics_predictions').select('*')
        if prediction_type:
            query = query.eq('prediction_type', prediction_type)
        if entity_id:
            query = query.eq('entity_id', entity_id)
        query = query.gte('valid_until', datetime.now(timezone.utc).isoformat())
        result = query.order('created_at', desc=True).execute()
        return {'predictions': result.data}
    except Exception as e:
        logger.error(f"Get predictions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.post("/analytics/predictions/generate")
async def generate_prediction(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Generate AI-powered predictions"""
    try:
        current_user = await get_current_user(session_token)
        data = await request.json()
        prediction_type = data['prediction_type']
        entity_id = data.get('entity_id')
        if prediction_type == 'volunteer_need':
            events_result = supabase.table('events').select('*').eq('ngo_id', entity_id).execute()
            prompt = f"Based on historical event data, predict volunteer needs for the next month. Historical events: {len(events_result.data)}"
            ai_response_text = await call_groq_ai(prompt)
            prediction_text = ai_response_text
            predicted_value = len(events_result.data) * 1.2  # 20% growth prediction
        elif prediction_type == 'donation_trend':
            donations_result = supabase.table('donations').select('amount, created_at').eq('ngo_id', entity_id).eq('status', 'succeeded').execute()
            if donations_result.data:
                recent_avg = sum(float(d['amount']) for d in donations_result.data[-10:]) / min(10, len(donations_result.data))
                predicted_value = recent_avg * 1.1  # 10% growth
            else:
                predicted_value = 0
        else:
            predicted_value = 0
        prediction_data = {
            'id': str(uuid.uuid4()),
            'prediction_type': prediction_type,
            'entity_id': entity_id,
            'entity_type': data.get('entity_type', 'ngo'),
            'predicted_value': predicted_value,
            'confidence_score': 75.0,
            'prediction_period': 'next_month',
            'factors': {'historical_data': True, 'ai_analysis': True},
            'created_at': datetime.now(timezone.utc).isoformat(),
            'valid_until': (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }
        result = supabase.table('analytics_predictions').insert(prediction_data).execute()
        return {'success': True, 'prediction': result.data[0]}
    except Exception as e:
        logger.error(f"Generate prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/analytics/comparative")
async def get_comparative_analytics(ngo_id: str):
    """Get comparative analytics for an NGO"""
    try:
        ngo_metrics = supabase.table('comparative_metrics').select('*').eq('ngo_id', ngo_id).execute()
        comparisons = []
        for metric in ngo_metrics.data:
            comparison = {
                'metric_name': metric['metric_name'],
                'your_value': metric['metric_value'],
                'average': metric['benchmark_average'],
                'percentile': metric['percentile'],
                'performance': 'above_average' if metric['metric_value'] > metric['benchmark_average'] else 'below_average'
            }
            comparisons.append(comparison)
        return {'comparisons': comparisons}
    except Exception as e:
        logger.error(f"Get comparative analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/analytics/impact-multiplier")
async def get_impact_multipliers(
    source_event_id: Optional[str] = None,
    limit: int = 20
):
    """Get impact multiplier data"""
    try:
        query = supabase.table('impact_multipliers').select('*')
        if source_event_id:
            query = query.eq('source_event_id', source_event_id)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return {'multipliers': result.data}
    except Exception as e:
        logger.error(f"Get impact multipliers error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@api_router.get("/analytics/sustainability")
async def get_sustainability_metrics(
    ngo_id: Optional[str] = None,
    metric_type: Optional[str] = None
):
    """Get sustainability metrics"""
    try:
        query = supabase.table('sustainability_metrics').select('*')
        if ngo_id:
            query = query.eq('ngo_id', ngo_id)
        if metric_type:
            query = query.eq('metric_type', metric_type)
        result = query.order('date_measured', desc=True).execute()
        aggregated = {}
        for metric in result.data:
            mtype = metric['metric_type']
            if mtype not in aggregated:
                aggregated[mtype] = {'total': 0, 'unit': metric['unit'], 'count': 0}
            aggregated[mtype]['total'] += float(metric['value'])
            aggregated[mtype]['count'] += 1
        return {
            'metrics': result.data,
            'aggregated': aggregated
        }
    except Exception as e:
        logger.error(f"Get sustainability metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
async def award_badge_by_name(user_id: str, badge_name: str):
    """Award a badge by name"""
    try:
        badge_result = supabase.table('badges').select('*').eq('badge_name', badge_name).execute()
        if not badge_result.data:
            return False
        badge = badge_result.data[0]
        existing = supabase.table('user_badges').select('*').eq('user_id', user_id).eq('badge_id', badge['id']).execute()
        if existing.data:
            return False
        supabase.table('user_badges').insert({
            'user_id': user_id,
            'badge_id': badge['id'],
            'earned_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        await notify_user(user_id, 'badge_earned', {'badge': badge})
        return True
    except Exception as e:
        logger.error(f"Award badge by name error: {str(e)}")
        return False
async def update_heatmap(lat: float, lng: float, intensity: float = 1):
    """Update heatmap data"""
    try:
        grid_lat = round(lat, 2)
        grid_lng = round(lng, 2)
        existing = supabase.table('impact_heatmap').select('*').eq('location_lat', grid_lat).eq('location_lng', grid_lng).execute()
        if existing.data:
            current = existing.data[0]
            supabase.table('impact_heatmap').update({
                'activity_count': current['activity_count'] + 1,
                'intensity': min(100, current['intensity'] + intensity),
                'last_updated': datetime.now(timezone.utc).isoformat()
            }).eq('id', current['id']).execute()
        else:
            supabase.table('impact_heatmap').insert({
                'id': str(uuid.uuid4()),
                'location_lat': grid_lat,
                'location_lng': grid_lng,
                'activity_count': 1,
                'intensity': intensity,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }).execute()
    except Exception as e:
        logger.error(f"Update heatmap error: {str(e)}")
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "supabase"}
app.include_router(api_router)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)