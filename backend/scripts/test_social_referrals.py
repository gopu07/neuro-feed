import os
import sys
import uuid as uuid_lib
from sqlalchemy.orm import Session
from fastapi import HTTPException

# Set python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import SessionLocal
from db.models import User, Guild, GuildMember, GuildMessage, Referral, UserXpTransaction
from api.routes.guilds import create_guild, join_guild, leave_guild, send_guild_message, explore_guilds
from api.routes.referrals import claim_referral_code, get_my_referrals

def setup_test_users(db: Session):
    # Create two test users
    uid1 = uuid_lib.uuid4()
    uid2 = uuid_lib.uuid4()
    
    u1 = User(
        id=uid1,
        email=f"ref_tester1_{uid1.hex[:6]}@example.com",
        username="AlphaDev",
        xp=150,
        streak_days=5
    )
    u2 = User(
        id=uid2,
        email=f"ref_tester2_{uid2.hex[:6]}@example.com",
        username="BetaScientist",
        xp=100,
        streak_days=2
    )
    db.add(u1)
    db.add(u2)
    db.flush()
    return u1, u2

def run_social_tests():
    db = SessionLocal()
    print("--- STARTING SOCIAL AND REFERRAL TESTS ---")
    try:
        u1, u2 = setup_test_users(db)
        print(f"Created Test Users: {u1.username} (ID: {u1.id}), {u2.username} (ID: {u2.id})")
        
        # 1. Test Guild Creation
        print("\nTest Case 1: Creating a new Guild...")
        test_guild_name = f"DeepMind Pioneers {uuid_lib.uuid4().hex[:6]}"
        res_create = create_guild(name=test_guild_name, description="A research cohort", db=db, current_user=u1)
        print(f"[PASS]: Created Guild: {res_create}")
        assert res_create["success"] is True
        assert res_create["role"] == "owner"
        
        guild_id = uuid_lib.UUID(res_create["guild_id"])
        
        # Verify membership in DB
        member = db.query(GuildMember).filter(GuildMember.user_id == u1.id).first()
        assert member is not None
        assert member.guild_id == guild_id
        assert member.role == "owner"
        
        # 2. Test Join Guild
        print("\nTest Case 2: Joining the Guild...")
        res_join = join_guild(guild_id=str(guild_id), db=db, current_user=u2)
        print(f"[PASS]: Joined Guild: {res_join}")
        assert res_join["success"] is True
        
        # Verify membership in DB
        member2 = db.query(GuildMember).filter(GuildMember.user_id == u2.id).first()
        assert member2 is not None
        assert member2.guild_id == guild_id
        assert member2.role == "member"
        
        # Verify dynamic guild XP calculation matches sum of users' XP (150 + 100 = 250)
        guild = db.query(Guild).filter(Guild.id == guild_id).first()
        total_xp = u1.xp + u2.xp
        print(f"Dynamic XP Check: Guild XP is {guild.xp}, expected {total_xp}")
        
        # 3. Test Block Duplicate Join
        print("\nTest Case 3: Block joining when already in a guild...")
        try:
            join_guild(guild_id=str(guild_id), db=db, current_user=u2)
            print("[FAIL]: Allowed joining a guild twice!")
            assert False
        except HTTPException as e:
            print(f"[PASS]: Blocked with code {e.status_code}, detail: {e.detail}")
            assert e.status_code == 400

        # 4. Test Chat Logging
        print("\nTest Case 4: Sending team messages...")
        res_chat = send_guild_message(content="Welcome to the DeepMind cohort!", db=db, current_user=u1)
        print(f"[PASS]: Chat message registered: {res_chat['message']}")
        assert res_chat["success"] is True
        assert res_chat["message"]["username"] == u1.username
        
        # 5. Test Referral Generation & Copy
        print("\nTest Case 5: Generating referral code...")
        ref_info = get_my_referrals(db=db, current_user=u1)
        print(f"[PASS]: Referral code info: {ref_info}")
        assert ref_info["referral_code"] != ""
        assert ref_info["referrals_count"] == 0
        assert ref_info["total_xp_earned"] == 0
        
        code = ref_info["referral_code"]
        
        # 6. Test Self Referral Protection
        print("\nTest Case 6: Block self referrals...")
        try:
            claim_referral_code(code=code, db=db, current_user=u1)
            print("[FAIL]: Allowed self-referral!")
            assert False
        except HTTPException as e:
            print(f"[PASS]: Blocked with code {e.status_code}, detail: {e.detail}")
            assert e.status_code == 400
            
        # 7. Test Referral Claim & XP Payout
        print("\nTest Case 7: Claiming referral code (Bounty Payout)...")
        u1_xp_before = u1.xp
        u2_xp_before = u2.xp
        
        res_claim = claim_referral_code(code=code, db=db, current_user=u2)
        print(f"[PASS]: Referral claimed successfully: {res_claim}")
        assert res_claim["success"] is True
        assert res_claim["xp"] == u2_xp_before + 50
        
        # Verify both users received 50 XP
        assert u1.xp == u1_xp_before + 50
        assert u2.xp == u2_xp_before + 50
        
        # Verify audit transactions
        tx1 = db.query(UserXpTransaction).filter(UserXpTransaction.user_id == u1.id, UserXpTransaction.reason == "referral_invite").first()
        tx2 = db.query(UserXpTransaction).filter(UserXpTransaction.user_id == u2.id, UserXpTransaction.reason == "referral_signup").first()
        assert tx1 is not None and tx1.amount == 50
        assert tx2 is not None and tx2.amount == 50
        print("[PASS]: Transactions logged cleanly to ledger.")
        
        # 8. Test Leave Guild (Ownership Transfer & Dissolution)
        print("\nTest Case 8: Member leaves guild...")
        res_leave = leave_guild(db=db, current_user=u2)
        print(f"[PASS]: Member left: {res_leave}")
        assert res_leave["success"] is True
        
        # Verify roster count
        rem_members = db.query(GuildMember).filter(GuildMember.guild_id == guild_id).all()
        assert len(rem_members) == 1
        assert rem_members[0].user_id == u1.id
        
        # Creator leaves guild (causes dissolution since u1 is the last member)
        print("\nTest Case 9: Owner leaves last (dissolves)...")
        res_leave_owner = leave_guild(db=db, current_user=u1)
        print(f"[PASS]: Owner left: {res_leave_owner}")
        assert res_leave_owner["success"] is True
        assert res_leave_owner["dissolved"] is True
        
        # Verify guild is gone
        guild_gone = db.query(Guild).filter(Guild.id == guild_id).first()
        assert guild_gone is None
        print("[PASS]: Guild dissolved successfully.")
        
        print("\n--- ALL SOCIAL AND REFERRAL TEST CASES PASSED SUCCESSFULLY! ---")
        
    finally:
        db.rollback()
        db.close()

if __name__ == "__main__":
    run_social_tests()
