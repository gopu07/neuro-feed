/**
 * Content Quality Sanitizer & Parser Pipeline
 * Cleans AI content, removes redundant tags, leaks, and extracts structured items
 */

export interface SanitizedContent {
  cleanBody: string;
  codeBlocks: { code: string; language: string }[];
  tradeoffs: { type: 'pro' | 'con' | 'neutral'; title: string; desc: string }[];
  stages: { step: number; title: string; desc: string }[];
  analogy: { concept: string; comparison: string } | null;
}

export function sanitizeAndParse(title: string, body: string, tldr?: string): SanitizedContent {
  if (!body) {
    return { cleanBody: '', codeBlocks: [], tradeoffs: [], stages: [], analogy: null };
  }

  // 1. Markdown Sanitization (Format Leaks & Redundancies)
  let clean = body
    // Remove leaked redundant titles/headers
    .replace(new RegExp(`^#*\\s*${escapeRegExp(title)}`, 'i'), '')
    // Remove duplicate header tags
    .replace(/\*\*Why it matters:\*\*/gi, '')
    .replace(/💡\s*\*Why it matters:\*/gi, '')
    .replace(/💡\s*Why it matters:/gi, '')
    .replace(/\*\*TL;DR:\*\*/gi, '')
    .replace(/🎯\s*\*Key Takeaways:\*/gi, '')
    .replace(/🎯\s*Key Takeaways:/gi, '')
    // Clean up empty lines or double bold stars
    .replace(/\*\*\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 2. Extract Code Blocks
  const codeBlocks: { code: string; language: string }[] = [];
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;
  while ((match = codeRegex.exec(clean)) !== null) {
    codeBlocks.push({
      language: match[1] || 'typescript',
      code: match[2].trim()
    });
  }
  
  // Clean text from raw code blocks for other layouts if there are other sections
  const textWithoutCode = clean.replace(codeRegex, '').trim();

  // 3. Parse Tradeoffs (Pros & Cons)
  const tradeoffs: { type: 'pro' | 'con' | 'neutral'; title: string; desc: string }[] = [];
  
  // Look for Pro/Con patterns in text
  const proConRegex = /(?:^|\n)(?:[•\-\*]\s*)?\*\*?(Pros|Cons|Advantages|Tradeoffs|Benefits|Drawbacks|Alternative|Alternative A|Alternative B)\*\*?:?\s*(.*)/gi;
  let pcMatch;
  while ((pcMatch = proConRegex.exec(textWithoutCode)) !== null) {
    const sectionName = pcMatch[1].toLowerCase();
    const content = pcMatch[2].trim();
    
    let type: 'pro' | 'con' | 'neutral' = 'neutral';
    if (['pros', 'advantages', 'benefits'].some(k => sectionName.includes(k))) {
      type = 'pro';
    } else if (['cons', 'tradeoffs', 'drawbacks'].some(k => sectionName.includes(k))) {
      type = 'con';
    }

    // Split title and explanation if colon is present
    const colonIndex = content.indexOf(':');
    let titleText = pcMatch[1];
    let descText = content;
    
    if (colonIndex > 0 && colonIndex < 40) {
      titleText = content.substring(0, colonIndex).replace(/\*\*|\*/g, '').trim();
      descText = content.substring(colonIndex + 1).trim();
    } else {
      // Clean up bold markings
      titleText = titleText.replace(/\*\*|\*/g, '').trim();
      descText = descText.replace(/\*\*|\*/g, '').trim();
    }

    tradeoffs.push({ type, title: titleText, desc: descText });
  }

  // 4. Parse Stages / Pipelines (Architecture steps)
  const stages: { step: number; title: string; desc: string }[] = [];
  const stageRegex = /(?:^|\n)(\d+)\.\s+\*\*?([^\*:]+)\*\*?:?\s*(.*)/g;
  let stMatch;
  let stepCounter = 1;
  while ((stMatch = stageRegex.exec(textWithoutCode)) !== null) {
    stages.push({
      step: stepCounter++,
      title: stMatch[2].trim(),
      desc: stMatch[3].trim()
    });
  }

  // 5. Parse Mental Model Analogies
  let analogy: { concept: string; comparison: string } | null = null;
  const analogyRegex = /(?:Analogy|Imagine|Like a|Metaphor):\s*\*\*?([^\*:\n]+)\*\*?:?\s*([^\n]+)/i;
  const anMatch = analogyRegex.exec(textWithoutCode);
  if (anMatch) {
    analogy = {
      concept: anMatch[1].trim(),
      comparison: anMatch[2].trim()
    };
  } else if (textWithoutCode.toLowerCase().includes('analogy:') || textWithoutCode.toLowerCase().includes('metaphor:')) {
    // Fallback extraction
    const lines = textWithoutCode.split('\n');
    const analogyLine = lines.find(l => l.toLowerCase().includes('analogy:') || l.toLowerCase().includes('metaphor:'));
    if (analogyLine) {
      const parts = analogyLine.split(/analogy:|metaphor:/i);
      if (parts[1]) {
        analogy = {
          concept: 'Intuitive Analogy',
          comparison: parts[1].replace(/\*\*|\*/g, '').trim()
        };
      }
    }
  }

  // Provide general clean-up to the cleanBody to remove leftover headings that look like raw text
  // We keep markdown formatting parsed properly but stripped of double headers
  const finalClean = clean
    .replace(/(?:^|\n)(💡\s*)?\*\*?Why it matters:\*\*?/gi, '\n💡 **Why it matters:**')
    .replace(/(?:^|\n)(🎯\s*)?\*\*?Key Takeaways:\*\*?/gi, '\n🎯 **Key Takeaways:**')
    .trim();

  return {
    cleanBody: finalClean,
    codeBlocks,
    tradeoffs: tradeoffs.slice(0, 4), // Limit to top 4 for layout elegance
    stages: stages.slice(0, 5),       // Limit to top 5 stages
    analogy
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
