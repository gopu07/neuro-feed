from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import uuid as uuid_lib
from typing import List, Optional
from datetime import datetime

from db.database import get_db
from db.models import User, Guild, GuildMember, GuildMessage
from api.deps import get_current_user
from api.routes.user import _get_or_create_user

router = APIRouter()

def _resolve_user(current_user, db: Session) -> User:
    try:
        user_uuid = uuid_lib.UUID(str(current_user.id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    db_user = db.query(User).filter(User.id == user_uuid).first()
    if not db_user:
        db_user = _get_or_create_user(current_user, db)
    return db_user

@router.get("/my")
def get_my_guild(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve details of the active user's guild, member roster, and dynamic XP aggregates."""
    db_user = _resolve_user(current_user, db)
    
    # Check if user is in a guild
    membership = db.query(GuildMember).filter(GuildMember.user_id == db_user.id).first()
    if not membership:
        return {"in_guild": False, "guild": None}
        
    guild = db.query(Guild).filter(Guild.id == membership.guild_id).first()
    if not guild:
        # Roster cleanup in case of dangling references
        db.delete(membership)
        db.commit()
        return {"in_guild": False, "guild": None}
        
    # Get all members of the guild
    memberships = db.query(GuildMember, User).join(User, GuildMember.user_id == User.id).filter(
        GuildMember.guild_id == guild.id
    ).all()
    
    member_list = []
    total_guild_xp = 0
    for mem, u in memberships:
        total_guild_xp += (u.xp or 0)
        member_list.append({
            "user_id": str(u.id),
            "username": u.username or "Anonymous",
            "xp": u.xp or 0,
            "role": mem.role,
            "joined_at": mem.joined_at
        })
        
    # Sync calculated guild XP
    if guild.xp != total_guild_xp:
        guild.xp = total_guild_xp
        db.commit()
        
    # Get recent messages (limit to 50)
    messages = db.query(GuildMessage).filter(GuildMessage.guild_id == guild.id).order_by(
        desc(GuildMessage.created_at)
    ).limit(50).all()
    
    # Reverse so they are in chronological order
    chat_history = []
    for msg in reversed(messages):
        chat_history.append({
            "id": str(msg.id),
            "user_id": str(msg.user_id),
            "username": msg.username,
            "content": msg.content,
            "created_at": msg.created_at
        })
        
    return {
        "in_guild": True,
        "role": membership.role,
        "guild": {
            "id": str(guild.id),
            "name": guild.name,
            "description": guild.description,
            "xp": total_guild_xp,
            "creator_id": str(guild.creator_id) if guild.creator_id else None,
            "created_at": guild.created_at,
            "members": member_list,
            "chat": chat_history
        }
    }

@router.get("/leaderboard")
def get_guild_leaderboard(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Rank guilds globally by summing all active members' current XP levels."""
    # Group and sum XP to ensure zero mismatch
    results = db.query(
        Guild,
        func.sum(User.xp).label("calculated_xp"),
        func.count(GuildMember.user_id).label("member_count")
    ).outerjoin(GuildMember, Guild.id == GuildMember.guild_id)\
     .outerjoin(User, GuildMember.user_id == User.id)\
     .group_by(Guild.id)\
     .order_by(desc("calculated_xp"))\
     .limit(limit)\
     .all()
     
    leaderboard = []
    for rank, (guild, calc_xp, m_count) in enumerate(results, 1):
        actual_xp = calc_xp or 0
        
        # Keep DB guild XP caches updated on queries
        if guild.xp != actual_xp:
            guild.xp = actual_xp
            db.commit()
            
        leaderboard.append({
            "rank": rank,
            "guild_id": str(guild.id),
            "name": guild.name,
            "description": guild.description,
            "xp": actual_xp,
            "member_count": m_count,
            "created_at": guild.created_at
        })
        
    return leaderboard

@router.post("/create")
def create_guild(
    name: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new Guild. The creator automatically joins as the 'owner'."""
    db_user = _resolve_user(current_user, db)
    
    # Check if name is clean and non-empty
    name_clean = name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Guild name cannot be blank")
        
    # Check if user is already in a guild
    existing_membership = db.query(GuildMember).filter(GuildMember.user_id == db_user.id).first()
    if existing_membership:
        raise HTTPException(status_code=400, detail="You are already a member of a guild. Leave it first.")
        
    # Check if guild name is unique
    duplicate = db.query(Guild).filter(func.lower(Guild.name) == func.lower(name_clean)).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="A guild with this name already exists")
        
    # Create guild
    new_guild = Guild(
        name=name_clean,
        description=description.strip() if description else None,
        xp=db_user.xp or 0,
        creator_id=db_user.id
    )
    db.add(new_guild)
    db.flush()
    
    # Add creator as owner
    member = GuildMember(
        guild_id=new_guild.id,
        user_id=db_user.id,
        role="owner"
    )
    db.add(member)
    db.commit()
    
    return {
        "success": True,
        "guild_id": str(new_guild.id),
        "name": new_guild.name,
        "role": "owner"
    }

@router.post("/join")
def join_guild(
    guild_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Join a learning guild using its UUID."""
    db_user = _resolve_user(current_user, db)
    
    try:
        guild_uuid = uuid_lib.UUID(guild_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Guild ID format")
        
    # Verify guild exists
    guild = db.query(Guild).filter(Guild.id == guild_uuid).first()
    if not guild:
        raise HTTPException(status_code=404, detail="Guild not found")
        
    # Check if user is already in a guild
    existing_membership = db.query(GuildMember).filter(GuildMember.user_id == db_user.id).first()
    if existing_membership:
        raise HTTPException(status_code=400, detail="You are already a member of a guild")
        
    # Check current member count (capped to 20 for optimal study cohort sizes)
    count = db.query(GuildMember).filter(GuildMember.guild_id == guild_uuid).count()
    if count >= 20:
        raise HTTPException(status_code=400, detail="Guild cohort is full (max 20 members)")
        
    # Join guild
    member = GuildMember(
        guild_id=guild.id,
        user_id=db_user.id,
        role="member"
    )
    db.add(member)
    
    # Update guild cached XP
    guild.xp = (guild.xp or 0) + (db_user.xp or 0)
    db.commit()
    
    return {
        "success": True,
        "guild_id": str(guild.id),
        "name": guild.name,
        "role": "member"
    }

@router.post("/leave")
def leave_guild(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Leave the current guild. If owner, ownership is transferred or guild dissolved."""
    db_user = _resolve_user(current_user, db)
    
    membership = db.query(GuildMember).filter(GuildMember.user_id == db_user.id).first()
    if not membership:
        raise HTTPException(status_code=400, detail="You are not in any guild")
        
    guild_id = membership.guild_id
    guild = db.query(Guild).filter(Guild.id == guild_id).first()
    
    # If the user is the owner, check if there are other members
    if membership.role == "owner":
        other_members = db.query(GuildMember).filter(
            GuildMember.guild_id == guild_id,
            GuildMember.user_id != db_user.id
        ).order_by(GuildMember.joined_at).all()
        
        if other_members:
            # Transfer ownership to the next oldest member
            next_owner = other_members[0]
            next_owner.role = "owner"
            if guild:
                guild.creator_id = next_owner.user_id
            print(f"Transferred ownership of guild {guild_id} to user {next_owner.user_id}")
        else:
            # Dissolve guild completely
            if guild:
                db.delete(guild)
            db.delete(membership)
            db.commit()
            return {"success": True, "dissolved": True, "detail": "Guild dissolved as the last member left"}
            
    # Regular leave
    db.delete(membership)
    db.commit()
    
    # Re-calculate XP for remaining members
    if guild:
        new_xp = db.query(func.sum(User.xp)).join(GuildMember).filter(GuildMember.guild_id == guild.id).scalar() or 0
        guild.xp = new_xp
        db.commit()
        
    return {"success": True, "dissolved": False, "detail": "Successfully left the guild"}

@router.post("/chat")
def send_guild_message(
    content: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Post an educational post or question to the team chat log."""
    db_user = _resolve_user(current_user, db)
    
    msg_content = content.strip()
    if not msg_content:
        raise HTTPException(status_code=400, detail="Message content cannot be blank")
        
    # Check if user is in a guild
    membership = db.query(GuildMember).filter(GuildMember.user_id == db_user.id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You must be a member of a guild to chat")
        
    new_message = GuildMessage(
        guild_id=membership.guild_id,
        user_id=db_user.id,
        username=db_user.username or "Anonymous Learner",
        content=msg_content
    )
    db.add(new_message)
    db.commit()
    
    return {
        "success": True,
        "message": {
            "id": str(new_message.id),
            "username": new_message.username,
            "content": new_message.content,
            "created_at": new_message.created_at
        }
    }

@router.get("/explore")
def explore_guilds(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """List outstanding study guilds with active vacancies."""
    # Find guilds and member counts
    results = db.query(
        Guild,
        func.count(GuildMember.user_id).label("member_count")
    ).outerjoin(GuildMember, Guild.id == GuildMember.guild_id)\
     .group_by(Guild.id)\
     .order_by(desc(Guild.xp))\
     .limit(limit)\
     .all()
     
    explore_list = []
    for guild, m_count in results:
        explore_list.append({
            "guild_id": str(guild.id),
            "name": guild.name,
            "description": guild.description,
            "xp": guild.xp or 0,
            "member_count": m_count,
            "is_full": m_count >= 20,
            "created_at": guild.created_at
        })
        
    return explore_list
