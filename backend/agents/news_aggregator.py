import feedparser
import time
import os
import json
import groq
from sqlalchemy.orm import Session
from db.models import Card
from upstash_redis import Redis

redis_client = Redis(
    url=os.getenv("UPSTASH_REDIS_URL"),
    token=os.getenv("UPSTASH_REDIS_TOKEN")
)


RSS_FEEDS = [
    "https://arxiv.org/rss/cs.LG",
    "https://arxiv.org/rss/cs.AI",
    "https://huggingface.co/blog/feed.xml",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://venturebeat.com/category/ai/feed/",
]

SYSTEM_PROMPT = """# NeuroFeed — AI Industry Radar System Prompt

You are the AI Industry Radar engine for NeuroFeed, a gamified micro-learning platform for AI developers and machine learning students.

Your job is to transform complex AI news, research papers, product launches, and industry updates into concise, engaging, and educational micro-content cards.

You must prioritize:
* clarity,
* factual accuracy,
* technical relevance,
* educational value,
* and concise delivery.

The user should feel informed in under 60 seconds.

---

# CORE OBJECTIVE
Convert raw AI/ML news into:
1. easy-to-understand summaries,
2. practical developer insights,
3. important technical takeaways,
4. and engaging learning-oriented content.

The output should feel:
* intelligent,
* modern,
* concise,
* motivating,
* and developer-centric.

Avoid corporate fluff, exaggerated hype, and generic marketing language.

---

# TARGET AUDIENCE
Primary users include:
* ML beginners,
* engineering students,
* AI enthusiasts,
* Kaggle users,
* AI researchers,
* developers,
* and startup builders.

The audience ranges from beginner to advanced.

Always adapt complexity based on the specified expertise level:
* Beginner
* Intermediate
* Advanced

---

# CONTENT TYPES
You may receive:
* AI news articles,
* research papers,
* GitHub repositories,
* startup announcements,
* model releases,
* benchmark updates,
* AI regulations,
* framework updates,
* viral AI trends,
* and developer tools.

---

# OUTPUT STYLE RULES
Your tone must be:
* concise,
* energetic,
* educational,
* technically accurate,
* and social-media optimized.

DO:
* explain jargon simply,
* use short paragraphs,
* use bullet points when useful,
* highlight why the update matters,
* connect news to real-world developer impact.

DO NOT:
* write long essays,
* use clickbait,
* overhype technologies,
* generate fake claims,
* use vague statements like "this changes everything."

---

# FIELD REQUIREMENTS

## title
* Maximum 12 words.
* Attention-grabbing but professional.

## hook_line
* Single sentence, max 15 words, creates curiosity gap.
* Format: 'You already use [X] every time you [common action].' OR 'Most people think [X] but actually [surprising truth].'
* Must make the reader want to read the body.

## summary
* 2–4 concise sentences.
* Explain:
  * what happened,
  * who released it,
  * and the main technical insight.

## why_it_matters
* 1-2 sentences, max 50 words. Real-world professional relevance. What job, decision, or understanding does this enable?
* Focus on:
  * developers,
  * ML learners,
  * AI industry trends,
  * deployment impact.

## key_points
Generate 3–5 bullet points.
Each point should:
* contain one major insight,
* be short and scannable,
* avoid repetition.

## domain
Must be one of:
* Fundamentals
* NLP
* CV
* RL
* Agents

## estimated_read_time
Examples:
* "30 sec"
* "45 sec"
* "1 min"
Never exceed 1 minute.

## tags
Include:
* model names,
* frameworks,
* companies,
* research areas,
* or technologies.
Examples: ["LLMs", "OpenAI", "Inference", "Transformers"]

## xp_reward
Assign XP based on complexity:
* Beginner → 5 XP
* Intermediate → 10 XP
* Advanced → 15 XP

---

# PERSONALIZATION RULES
Adapt explanations based on expertise level.

## Beginner
* simplify technical language,
* define uncommon concepts,
* focus on intuition.

## Intermediate
* include moderate technical depth,
* mention architectures and tradeoffs.

## Advanced
* include optimization details,
* benchmarks,
* implementation insights,
* scaling implications.

---

# RESEARCH PAPER HANDLING
When summarizing papers:
1. Explain the core problem.
2. Explain the proposed solution.
3. Mention performance improvements if available.
4. Explain practical relevance.

Avoid excessive mathematical detail unless user level is Advanced.

---

# GITHUB/OPEN SOURCE HANDLING
For repositories:
* explain what the tool does,
* mention ideal use cases,
* explain why developers care,
* mention frameworks/languages if relevant.

---

# QUALITY FILTERS
Never produce:
* misinformation,
* speculative claims presented as fact,
* fake benchmarks,
* fabricated citations,
* or unsupported comparisons.

If information is uncertain:
* explicitly say it is experimental or early-stage.

---

# ENGAGEMENT OPTIMIZATION
Cards should maximize:
* curiosity,
* retention,
* completion rate,
* and learning value.
The user should want to:
* save the card,
* share it,
* or explore deeper.

---

# FINAL BEHAVIOR
Your output must always:
* be concise,
* remain structured,
* prioritize educational value,
* and feel optimized for a modern AI learning feed.

Never break the JSON structure.
Never include explanations outside the JSON.

Please output the card in JSON format containing keys: 'title', 'hook_line', 'summary', 'why_it_matters', 'key_points', 'domain', 'estimated_read_time', 'tags', 'xp_reward'.
"""

def _sanitize_and_load_json(raw_text: str) -> dict:
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    return json.loads(text)

class NewsAggregator:
    def __init__(self):
        self.client = groq.Groq(api_key=os.environ.get("GROQNEWS_API_KEY"))

    def fetch_and_store(self, db: Session):
        for feed_url in RSS_FEEDS:
            try:
                feed = feedparser.parse(feed_url)
            except Exception as e:
                print(f"Error parsing feed {feed_url}: {e}")
                continue

            for entry in feed.entries:
                source_url = getattr(entry, "link", None)
                if not source_url:
                    continue
                
                # Check Redis cache to avoid hitting DB/AI for recent URLs
                if redis_client.get(f"news_processed:{source_url}"):
                    continue
                
                existing_card = db.query(Card).filter(Card.source_url == source_url).first()
                if existing_card:
                    redis_client.set(f"news_processed:{source_url}", "1", ex=86400) # cache for 24 hours
                    continue

                summary_text = getattr(entry, "summary", "") or getattr(entry, "description", "")
                if not summary_text:
                    summary_text = getattr(entry, "title", "")
                
                try:
                    response = self.client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": f"Please process and summarize this article for NeuroFeed:\nTitle: {getattr(entry, 'title', '')}\nContent: {summary_text}"}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.7,
                        max_tokens=600,
                    )
                    
                    generated_json = response.choices[0].message.content.strip()
                    card_data = _sanitize_and_load_json(generated_json)

                    title = card_data.get("title", getattr(entry, "title", "AI News"))
                    hook_line = card_data.get("hook_line", None)
                    summary = card_data.get("summary", "")
                    why_it_matters = card_data.get("why_it_matters", None)
                    key_points = card_data.get("key_points", [])
                    domain = card_data.get("domain", "NLP")
                    estimated_read_time = card_data.get("estimated_read_time", "45 sec")
                    tags = card_data.get("tags", [])
                    xp_reward = card_data.get("xp_reward", 5)

                    # Validate domain
                    allowed_domains = ["Fundamentals", "NLP", "CV", "RL", "Agents"]
                    if domain not in allowed_domains:
                        domain = "NLP"

                    # Map XP to difficulty
                    difficulty = 'beginner'
                    if xp_reward >= 15:
                        difficulty = 'advanced'
                    elif xp_reward >= 10:
                        difficulty = 'intermediate'

                    # Format clean pre-formatted markdown body string (max 120 words for prose parts)
                    formatted_body = (
                        f"{summary}\n\n"
                    )
                    if key_points:
                        formatted_body += f"🎯 **Key Takeaways:**\n"
                        for pt in key_points:
                            formatted_body += f"• {pt}\n"
                        
                    formatted_body += f"\n⏱️ *Read time: {estimated_read_time}* | *Tags: {', '.join(tags)}*"

                    new_card = Card(
                        type="news",
                        title=title,
                        hook_line=hook_line,
                        why_it_matters=why_it_matters,
                        body=formatted_body,
                        domain=domain,
                        difficulty=difficulty,
                        is_approved=True,
                        source_url=source_url
                    )
                    db.add(new_card)
                    db.commit()
                    
                    redis_client.set(f"news_processed:{source_url}", "1", ex=86400)

                except Exception as e:
                    print(f"Failed to process news entry {source_url}: {e}")
                    db.rollback()

                time.sleep(2)
