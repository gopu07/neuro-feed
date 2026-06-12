import os
import json
import time
from groq import Groq
from dotenv import load_dotenv
import sys

# Add parent directory to path so we can import from db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.database import SessionLocal
from db.models import Card

load_dotenv()

# Initialize Groq
groq_api_key = os.getenv("GROQ_API_KEY")

if not groq_api_key:
    print("WARNING: GROQ_API_KEY is not set.")

groq_client = Groq(api_key=groq_api_key) if groq_api_key else None

CURRICULUM = {
    "Fundamentals": [
        "What is Machine Learning?", "Supervised vs Unsupervised Learning",
        "Train/Val/Test Split", "Overfitting and Underfitting",
        "Bias-Variance Tradeoff", "Gradient Descent", "Backpropagation",
        "Loss Functions", "Activation Functions", "Regularization (L1/L2)"
    ],
    "NLP": [
        "Tokenization", "Word Embeddings", "Word2Vec", "Attention Mechanism",
        "The Transformer Architecture", "BERT", "GPT and Autoregressive Models",
        "Fine-tuning vs Prompting", "RAG (Retrieval Augmented Generation)",
        "Prompt Engineering"
    ],
    "CV": [
        "Convolution Operation", "CNNs", "Pooling Layers",
        "Transfer Learning", "Object Detection (YOLO)", "Image Segmentation",
        "Vision Transformers (ViT)", "Diffusion Models"
    ],
    "RL": [
        "Markov Decision Processes", "Q-Learning", "Policy Gradients",
        "RLHF (RL from Human Feedback)", "PPO Algorithm"
    ],
    "Agents": [
        "What is an AI Agent?", "Tool Use in LLMs", "ReAct Framework",
        "Multi-Agent Systems", "Planning and Memory in Agents",
        "Agentic Loops", "MCP (Model Context Protocol)"
    ]
}

CARD_PROMPT = """
Generate an educational card about: "{topic}" for ML learners.

Return ONLY valid JSON (no markdown, no backticks, no comments). The output must be parsable by json.loads():
{{
  "title": "engaging title (max 60 chars, can be a question)",
  "hook_line": "Single sentence, max 15 words, creates curiosity gap. Format: 'You already use [X] every time you [common action].' OR 'Most people think [X] but actually [surprising truth].' Must make the reader want to read the body.",
  "why_it_matters": "1-2 sentences, max 50 words. Real-world professional relevance. What job, decision, or understanding does this enable?",
  "body": "Prose only. Max 120 words. No bullet points. Bold key terms using **term** markdown syntax (max 3 per card). Include one concrete analogy or real-world example.",
  "tldr": "one sentence summary (max 80 chars)",
  "difficulty": "beginner",
  "domain": "{domain}"
}}
"""

def generate_card(topic, domain):
    prompt = CARD_PROMPT.format(topic=topic, domain=domain)
    
    # Try multiple times in case of JSON parse errors or quota issues
    for attempt in range(3):
        text = ""
        try:
            if groq_client:
                chat_completion = groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": prompt,
                        }
                    ],
                    model="llama-3.3-70b-versatile",
                    temperature=0.7,
                    response_format={"type": "json_object"}
                )
                text = chat_completion.choices[0].message.content.strip()
            else:
                raise ValueError("No API clients configured")
            
            # Clean up markdown if the model accidentally included it
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
                
            text = text.strip()
            data = json.loads(text)
            
            # Validate required fields
            required_keys = ["title", "hook_line", "why_it_matters", "body", "tldr", "difficulty", "domain"]
            if all(k in data for k in required_keys):
                return data
            else:
                print(f"  Attempt {attempt+1}: Missing keys in JSON")
                
        except Exception as e:
            print(f"  Attempt {attempt+1} failed completely: {e}")
            time.sleep(3) # Wait before retry
            
    return None

def main():
    print("Starting Card Seeding Process...")
    db = SessionLocal()
    
    total_topics = sum(len(topics) for topics in CURRICULUM.values())
    processed = 0
    
    for domain, topics in CURRICULUM.items():
        for topic in topics:
            processed += 1
            print(f"[{processed}/{total_topics}] Generating card for: {topic} ({domain})")
            
            # Check if card already exists (by title roughly, but we can just insert)
            # To be safe, we'll check if any card contains this topic in its title.
            # But the generated title is unknown. We can check if a card exists with the same domain and we already reached our quota.
            # Actually, to prevent dupes, let's just check if we have enough cards in this domain. 
            # Better check if we have a card whose title somewhat matches.
            existing = db.query(Card).filter(Card.domain == domain).all()
            if any(topic.lower() in str(c.title).lower() or topic.lower() in str(c.body).lower() for c in existing):
                print(f"  -> Skipping {topic}, already seeded.")
                continue
            
            card_data = generate_card(topic, domain)
            
            if card_data:
                try:
                    # Default difficulty mapping or fallback
                    diff = card_data.get("difficulty", "beginner").lower()
                    if diff not in ['beginner', 'intermediate', 'advanced']:
                        diff = 'beginner'
                        
                    card = Card(
                        type='concept',
                        title=card_data['title'],
                        hook_line=card_data.get('hook_line'),
                        why_it_matters=card_data.get('why_it_matters'),
                        body=card_data['body'],
                        tldr=card_data['tldr'],
                        domain=domain,
                        difficulty=diff,
                    )
                    db.add(card)
                    db.commit()
                    print(f"  -> Successfully saved: {card.title}")
                except Exception as e:
                    db.rollback()
                    print(f"  -> DB Error saving card: {e}")
            else:
                print(f"  -> Failed to generate card for {topic}")
                
            # Rate limit delay
            print("  Sleeping for 2 seconds to respect rate limits...")
            time.sleep(2)
            
    db.close()
    print("Seeding complete!")

if __name__ == "__main__":
    main()
