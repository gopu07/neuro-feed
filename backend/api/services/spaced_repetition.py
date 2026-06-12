"""
Ebbinghaus SM-2 Spaced Repetition Algorithm Service Layer
----------------------------------------------------------
Implements the SM-2 algorithm used by Anki and SuperMemo.

References:
    https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
"""
from datetime import date, timedelta
from dataclasses import dataclass
from typing import Optional

# XP award tables: difficulty → rating_key → base XP
XP_TABLE = {
    'beginner':     {'again': 5,  'good': 10, 'easy': 12},
    'intermediate': {'again': 8,  'good': 15, 'easy': 18},
    'advanced':     {'again': 10, 'good': 20, 'easy': 25},
}


@dataclass
class SM2State:
    """Current SM-2 state read from the database."""
    repetitions: int = 0
    interval_days: int = 0
    ease_factor: float = 2.5


@dataclass
class SM2Result:
    """Computed SM-2 state to write back to the database."""
    repetitions: int
    interval_days: int
    ease_factor: float
    next_review_date: date


def compute_next_review(rating: int, current: Optional[SM2State] = None) -> SM2Result:
    """
    Apply a single SM-2 review step and return the updated state.

    Args:
        rating:  User confidence rating, 1–4 (1=Again, 2=Hard, 3=Good, 4=Easy).
        current: Current card SM-2 state from the database.
                 If None, treated as a brand-new card.

    Returns:
        SM2Result with updated repetitions, interval_days, ease_factor, and next_review_date.

    Rating interpretation:
        1 = Again  → reset repetitions, interval back to 1 day
        2 = Hard   → same as Again per simple SM-2 threshold (rating < 3)
        3 = Good   → advance through normal SM-2 schedule
        4 = Easy   → advance + bigger interval multiplier bonus
    """
    if current is None:
        current = SM2State()

    cur_reps = current.repetitions
    cur_interval = current.interval_days
    cur_ease = current.ease_factor

    # --- Repetitions & interval ---
    if rating < 3:
        # Failed recall: start over
        new_reps = 0
        new_interval = 1
    else:
        if cur_reps == 0:
            new_interval = 1
        elif cur_reps == 1:
            new_interval = 6
        else:
            new_interval = round(cur_interval * cur_ease)
        new_reps = cur_reps + 1

    # --- Ease factor update (bounded at minimum 1.3) ---
    new_ease = cur_ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    new_ease = max(1.3, new_ease)

    next_review = date.today() + timedelta(days=new_interval)

    return SM2Result(
        repetitions=new_reps,
        interval_days=new_interval,
        ease_factor=new_ease,
        next_review_date=next_review,
    )


def compute_xp_award(
    rating: int,
    difficulty: str,
    streak_days: int = 0,
) -> int:
    """
    Compute the XP to award for a first-time card completion.

    Args:
        rating:      SM-2 user rating (1–4).
        difficulty:  Card difficulty string: 'beginner', 'intermediate', or 'advanced'.
        streak_days: User's current login streak for streak multiplier bonuses.

    Returns:
        Integer XP amount (already multiplied by variable reward and streak bonus).
    """
    import random

    if rating == 1:
        r_key = 'again'
    elif rating == 4:
        r_key = 'easy'
    else:
        r_key = 'good'

    difficulty = difficulty or 'beginner'
    base_xp = XP_TABLE.get(difficulty, XP_TABLE['beginner']).get(r_key, 5)

    # Variable reward schedule: 1×, 1.5×, or 2× (Skinner-box dopamine loop)
    multiplier = random.choice([1.0, 1.5, 2.0])
    xp = int(base_xp * multiplier)

    # Streak bonus on top
    if streak_days >= 7:
        xp = int(xp * 1.5)
    elif streak_days >= 3:
        xp = int(xp * 1.2)

    return xp
