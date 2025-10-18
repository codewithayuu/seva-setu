import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
async def seed_database():
    print("🌱 Seeding Seva-Setu database...")
    await db.users.delete_many({})
    await db.ngos.delete_many({})
    await db.posts.delete_many({})
    await db.events.delete_many({})
    await db.comments.delete_many({})
    await db.likes.delete_many({})
    await db.event_rsvps.delete_many({})
    print("✅ Cleared existing data")
    password_hash = bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    users = [
        {
            "id": "user1",
            "name": "Sarah Johnson",
            "email": "sarah@example.com",
            "password": password_hash,
            "user_type": "volunteer",
            "bio": "Passionate about education and community development",
            "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Sarah",
            "skills": ["Teaching", "Event Planning", "Social Media"],
            "interests": ["Education", "Environment"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "user2",
            "name": "Hope Foundation",
            "email": "hope@example.com",
            "password": password_hash,
            "user_type": "ngo",
            "bio": "Building a better future through education",
            "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Hope",
            "skills": [],
            "interests": ["Education", "Children"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "user3",
            "name": "Michael Chen",
            "email": "michael@example.com",
            "password": password_hash,
            "user_type": "donor",
            "bio": "Supporting causes that matter",
            "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Michael",
            "skills": [],
            "interests": ["Health", "Environment"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.users.insert_many(users)
    print(f"✅ Created {len(users)} users")
    ngos = [
        {
            "id": "ngo1",
            "name": "Hope Education Foundation",
            "description": "We provide quality education to underprivileged children across 50+ communities. Our mission is to ensure every child has access to learning resources and opportunities.",
            "category": "education",
            "founded_year": 2015,
            "website": "https://hopeedu.org",
            "logo": "https://api.dicebear.com/7.x/initials/svg?seed=Hope",
            "cover_image": "https://images.unsplash.com/photo-1560220604-1985ebfe28b1?q=85&w=1200",
            "location": "Mumbai, India",
            "owner_id": "user2",
            "followers_count": 245,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "ngo2",
            "name": "Green Earth Initiative",
            "description": "Environmental conservation through community action. We organize clean-up drives, tree planting, and awareness campaigns to protect our planet.",
            "category": "environment",
            "founded_year": 2018,
            "website": "https://greenearth.org",
            "logo": "https://api.dicebear.com/7.x/initials/svg?seed=Green",
            "cover_image": "https://images.unsplash.com/photo-1743793174491-bcbdf1882ad5?q=85&w=1200",
            "location": "San Francisco, USA",
            "owner_id": "user2",
            "followers_count": 532,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "ngo3",
            "name": "Health for All",
            "description": "Providing free healthcare services to remote and underserved communities. Join us in making healthcare accessible to everyone.",
            "category": "health",
            "founded_year": 2012,
            "website": "https://healthforall.org",
            "logo": "https://api.dicebear.com/7.x/initials/svg?seed=Health",
            "cover_image": "https://images.pexels.com/photos/6994857/pexels-photo-6994857.jpeg",
            "location": "Nairobi, Kenya",
            "owner_id": "user2",
            "followers_count": 387,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.ngos.insert_many(ngos)
    print(f"✅ Created {len(ngos)} NGOs")
    posts = [
        {
            "id": str(uuid.uuid4()),
            "author_id": "user2",
            "author_name": "Hope Foundation",
            "author_avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Hope",
            "content": "🎓 Exciting news! We just completed our 100th library installation in rural schools. These libraries now serve over 5,000 students, giving them access to books and learning materials they never had before. Thank you to all our volunteers and donors who made this possible! #Education #Impact",
            "image_url": None,
            "likes_count": 42,
            "comments_count": 8,
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "author_id": "user1",
            "author_name": "Sarah Johnson",
            "author_avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Sarah",
            "content": "Had an amazing day volunteering at the community food bank! We packed 500+ meal kits for families in need. It's incredible how much we can accomplish when we come together. Who's joining me next weekend?",
            "image_url": None,
            "likes_count": 28,
            "comments_count": 5,
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "author_id": "user3",
            "author_name": "Michael Chen",
            "author_avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Michael",
            "content": "Just donated to the Green Earth Initiative's tree planting campaign. In just one month, they've planted 10,000 trees! Small actions create big impact. Let's support this incredible work! 🌳",
            "image_url": None,
            "likes_count": 35,
            "comments_count": 12,
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "author_id": "user2",
            "author_name": "Hope Foundation",
            "author_avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Hope",
            "content": "Looking for volunteers with teaching experience! We're launching a new after-school tutoring program for middle school students. If you can spare 2-3 hours per week, you can change a child's life. DM us to get involved!",
            "image_url": None,
            "likes_count": 56,
            "comments_count": 15,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        }
    ]
    await db.posts.insert_many(posts)
    print(f"✅ Created {len(posts)} posts")
    events = [
        {
            "id": "event1",
            "ngo_id": "ngo1",
            "ngo_name": "Hope Education Foundation",
            "title": "Community Book Drive & Reading Session",
            "description": "Join us for a day of book collection and reading with underprivileged children. We'll be collecting books, organizing them, and hosting a fun reading session with games and snacks. Perfect for families and individuals who want to make a difference!",
            "location": "Mumbai Community Center, Mumbai",
            "date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "end_date": None,
            "cover_image": "https://images.unsplash.com/photo-1755718669605-e0c89e2ea60c?q=85&w=1200",
            "volunteers_needed": 20,
            "volunteers_registered": 12,
            "category": "education",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "event2",
            "ngo_id": "ngo2",
            "ngo_name": "Green Earth Initiative",
            "title": "Beach Cleanup & Environmental Awareness",
            "description": "Help us clean up our beaches! We'll provide all equipment including gloves, bags, and refreshments. After the cleanup, join us for a short workshop on ocean conservation and sustainable living. All ages welcome!",
            "location": "Ocean Beach, San Francisco",
            "date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            "end_date": None,
            "cover_image": "https://images.pexels.com/photos/8777886/pexels-photo-8777886.jpeg",
            "volunteers_needed": 50,
            "volunteers_registered": 38,
            "category": "environment",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "event3",
            "ngo_id": "ngo3",
            "ngo_name": "Health for All",
            "title": "Free Health Camp & Medical Checkups",
            "description": "Free health screening and medical consultation for community members. Our team of doctors and nurses will provide basic checkups, blood pressure monitoring, diabetes screening, and health education. Volunteers needed for registration and coordination.",
            "location": "Nairobi Health Center, Nairobi",
            "date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
            "end_date": None,
            "cover_image": "https://images.unsplash.com/photo-1630068846062-3ffe78aa5049?q=85&w=1200",
            "volunteers_needed": 15,
            "volunteers_registered": 7,
            "category": "health",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "event4",
            "ngo_id": "ngo1",
            "ngo_name": "Hope Education Foundation",
            "title": "STEM Workshop for Girls",
            "description": "Empowering young girls through Science, Technology, Engineering, and Math. Interactive workshop with hands-on activities, robotics demo, and career guidance. Looking for mentors and volunteers with STEM background.",
            "location": "Tech Hub, Mumbai",
            "date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            "end_date": None,
            "cover_image": "https://images.unsplash.com/photo-1743793174491-bcbdf1882ad5?q=85&w=1200",
            "volunteers_needed": 12,
            "volunteers_registered": 5,
            "category": "education",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.events.insert_many(events)
    print(f"✅ Created {len(events)} events")
    print("\n🎉 Database seeded successfully!")
    print("\n📧 Test credentials:")
    print("   Email: sarah@example.com")
    print("   Password: password123")
if __name__ == "__main__":
    asyncio.run(seed_database())