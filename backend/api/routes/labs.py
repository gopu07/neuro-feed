from config import settings
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import groq
from api.deps import get_current_user, check_rate_limit
from typing import List

router = APIRouter()

def _get_groq_client():
    api_key = (
        settings.groq_api_key or 
        settings.groq_news_api_key or 
        settings.groq_daily_challenge_api_key
    )
    if api_key:
        try:
            return groq.Groq(api_key=api_key)
        except Exception as e:
            print(f"[labs] Error initializing Groq: {e}")
    return None

class ChatRequest(BaseModel):
    message: str

class SummarizeRequest(BaseModel):
    url_or_text: str

class ExplainRequest(BaseModel):
    concept: str

class RoadmapRequest(BaseModel):
    skill: str
    level: str = "beginner"

@router.post("/chat")
def labs_chat(req: ChatRequest, current_user = Depends(get_current_user)):
    check_rate_limit("labs_chat", limit=10, window_seconds=60, identifier=str(current_user.id))
    client = _get_groq_client()
    if not client:
        raise HTTPException(status_code=503, detail="Groq AI service is currently unavailable.")
        
    try:
        prompt = (
            "You are a helpful, expert AI and Machine Learning co-pilot for NeuroFeed, "
            "an advanced micro-learning platform. Assist the user with their conceptual "
            "queries regarding deep learning, transformer architectures, system scaling, or algorithms. "
            "Keep your response concise, educational, and structured using clean markdown. Max 200 words."
        )
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": req.message}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=300
        )
        response_text = completion.choices[0].message.content.strip()
        return {"response": response_text}
    except Exception as e:
        print(f"[labs] Chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

import re
import urllib.request
import xml.etree.ElementTree as ET

def _parse_arxiv_id(url_or_text: str) -> str:
    # Match standard newer IDs e.g. 2103.00020 or 2103.00020v1
    # Match older style IDs e.g. cond-mat/0102030 or quant-ph/9912001
    pattern = r'(?:arxiv\.org/(?:abs|pdf)/|arxiv:)?(\d{4}\.\d{4,5}(?:v\d+)?|[a-zA-Z\-]+(?:\.[A-Z]+)?/\d{7}(?:v\d+)?)'
    match = re.search(pattern, url_or_text, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

import time

_arxiv_cache = {}

def _fetch_arxiv_metadata(paper_id: str):
    # Check cache first
    if paper_id in _arxiv_cache:
        print(f"[arxiv] Cache hit for paper ID {paper_id}")
        return _arxiv_cache[paper_id]

    url = f"http://export.arxiv.org/api/query?id_list={paper_id}"
    
    max_retries = 3
    retry_delay = 1.0
    timeout_seconds = 5
    
    xml_data = None
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (NeuroFeed/1.0)'})
            with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
                xml_data = response.read()
            break # Successful fetch
        except Exception as e:
            print(f"[arxiv] Attempt {attempt}/{max_retries} failed to fetch ID {paper_id}: {e}")
            if attempt == max_retries:
                return None
            time.sleep(retry_delay * attempt) # Linear backoff

    if not xml_data:
        return None

    try:
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entry = root.find('atom:entry', ns)
        if entry is None:
            return None
            
        # Check if entry is empty or represents a failed query
        title_elem = entry.find('atom:title', ns)
        summary_elem = entry.find('atom:summary', ns)
        published_elem = entry.find('atom:published', ns)
        
        if title_elem is None or summary_elem is None or "Error" in title_elem.text:
            return None
            
        title = title_elem.text.strip().replace('\n', ' ')
        summary = summary_elem.text.strip().replace('\n', ' ')
        pub_date = published_elem.text.strip() if published_elem is not None else "Unknown"
        
        authors = []
        for author in entry.findall('atom:author', ns):
            name_elem = author.find('atom:name', ns)
            if name_elem is not None:
                authors.append(name_elem.text.strip())
                
        categories = []
        for cat in entry.findall('atom:category', ns):
            term = cat.attrib.get('term')
            if term:
                categories.append(term)
                
        metadata = {
            "title": title,
            "abstract": summary,
            "authors": authors,
            "categories": categories,
            "publication_date": pub_date,
            "id": paper_id
        }
        
        # Store in cache
        _arxiv_cache[paper_id] = metadata
        return metadata
    except Exception as e:
        print(f"[arxiv] Failed to parse metadata for {paper_id}: {e}")
        return None

@router.post("/summarize")
def labs_summarize(req: SummarizeRequest, current_user = Depends(get_current_user)):
    check_rate_limit("labs_summarize", limit=5, window_seconds=60, identifier=str(current_user.id))
    client = _get_groq_client()
    if not client:
        raise HTTPException(status_code=503, detail="Groq AI service is currently unavailable.")
        
    content = req.url_or_text.strip()
    
    # Identify if input is an arXiv URL/ID or raw text abstract
    arxiv_id = _parse_arxiv_id(content)
    if arxiv_id:
        print(f"[arxiv] Identified arXiv ID: {arxiv_id}. Fetching metadata...")
        metadata = _fetch_arxiv_metadata(arxiv_id)
        if not metadata:
            # Strictly return "Unable to retrieve paper metadata." as required
            raise HTTPException(
                status_code=400, 
                detail="Unable to retrieve paper metadata."
            )
        
        # Construct content for LLM strictly from verified arXiv metadata to eliminate hallucinations
        content = (
            f"Paper Title: {metadata['title']}\n"
            f"Authors: {', '.join(metadata['authors'])}\n"
            f"Categories: {', '.join(metadata['categories'])}\n"
            f"Publication Date: {metadata['publication_date']}\n"
            f"Abstract: {metadata['abstract']}"
        )
    elif content.startswith("http"):
        # If it is a URL but not arXiv, reject it
        raise HTTPException(
            status_code=400,
            detail="Unable to retrieve paper metadata."
        )

    try:
        prompt = (
            "You are a Senior ML Research Scientist. Generate a high-fidelity technical summary "
            "for the provided paper abstract or text content. Highlight: "
            "1. The Core Objective (1 sentence) "
            "2. Architectural Insights (3 concise bullet points) "
            "3. Key Takeaway for developers (1 sentence). "
            "Avoid fluff, use strict backticks for technical concepts, and render as clean markdown. Max 150 words."
        )
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": content}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=250
        )
        response_text = completion.choices[0].message.content.strip()
        return {"summary": response_text}
    except Exception as e:
        print(f"[labs] Summarize failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI summarization failed: {str(e)}")

@router.post("/explain")
def labs_explain(req: ExplainRequest, current_user = Depends(get_current_user)):
    check_rate_limit("labs_explain", limit=5, window_seconds=60, identifier=str(current_user.id))
    client = _get_groq_client()
    if not client:
        raise HTTPException(status_code=503, detail="Groq AI service is currently unavailable.")
        
    try:
        prompt = (
            "Explain the following AI/ML concept in extremely simple, intuitive layman terms (ELI5 style) "
            "for a beginner student. Connect it to a real-world analogical intuition (e.g. comparing attention mechanism "
            "to looking at highlighted words in a text). Avoid technical jargon, keep it structured, and use bold "
            "fonts for primary entities. Max 150 words."
        )
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Concept: {req.concept}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=250
        )
        response_text = completion.choices[0].message.content.strip()
        return {"explanation": response_text}
    except Exception as e:
        print(f"[labs] Explain failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI explanation failed: {str(e)}")

@router.post("/roadmap")
def labs_roadmap(req: RoadmapRequest, current_user = Depends(get_current_user)):
    check_rate_limit("labs_roadmap", limit=5, window_seconds=60, identifier=str(current_user.id))
    client = _get_groq_client()
    if not client:
        raise HTTPException(status_code=503, detail="Groq AI service is currently unavailable.")
        
    try:
        prompt = (
            "Generate a structured, sequential learning roadmap for learning a specific ML skill. "
            "Provide exactly 4 distinct chronological steps. "
            "Respond ONLY as a valid JSON object matching this schema. Do not write markdown blocks: "
            "{\n"
            "  \"steps\": [\n"
            "    {\"title\": \"Step 1 Title\", \"desc\": \"1-sentence focus explanation\", \"time\": \"Week 1-2\"},\n"
            "    ...\n"
            "  ]\n"
            "}"
        )
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Skill: {req.skill}, Skill level: {req.level}"}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.6,
            max_tokens=500
        )
        import json
        response_text = completion.choices[0].message.content.strip()
        
        # Clean potential markdown wraps safely
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        roadmap_data = json.loads(response_text)
        return roadmap_data
    except Exception as e:
        print(f"[labs] Roadmap failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI roadmap generation failed: {str(e)}")
