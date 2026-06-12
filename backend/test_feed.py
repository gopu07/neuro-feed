import sys
sys.path.append('.')
from db.database import SessionLocal
from api.routes.feed import get_feed

class MockUser:
    id = 'f7de91b7-8277-40d4-b23b-00ae8503217a'

db = SessionLocal()
res = get_feed(limit=10, offset=0, current_user=MockUser(), db=db)
quiz_cards = [c for c in res if c['type'] == 'quiz']
print("Quiz cards found:", len(quiz_cards))
if quiz_cards:
    print("Has options?", 'options' in quiz_cards[0])
    if 'options' in quiz_cards[0]:
        print("Options length:", len(quiz_cards[0]['options']))
