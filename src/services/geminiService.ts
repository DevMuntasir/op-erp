import { Proposal } from "../types";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini on the client
// In AI Studio, the platform injects this into the build environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const GEMINI_MODEL = "gemini-3-flash-preview";

export async function generateSmartProposalContent(
  sectionType: 'about' | 'strategy' | 'problem_solution' | 'deliverables' | 'cta',
  proposalData: Partial<Proposal>
) {
  try {
    const { 
      clientName, 
      businessName, 
      industry, 
      businessDescription, 
      goals, 
      targetAudience, 
      services,
      monthlyBudget,
      pricingPlans
    } = proposalData;

    const context = `
      Agency: OP Media Agency (Canada-based digital marketing agency)
      Client: ${clientName} ${businessName ? `(${businessName})` : ''}
      Industry: ${industry || 'Not specified'}
      Business Context: ${businessDescription || 'Not specified'}
      Main Goals: ${Array.isArray(goals) ? goals.join(', ') : (goals || 'Increase sales and growth')}
      Target Audience: ${targetAudience || 'Not specified'}
      Proposed Services: ${services?.join(', ') || 'Social Media, Paid Ads, Content Creation'}
      Estimated Budget: ${monthlyBudget ? `${monthlyBudget}/mo` : 'Competitive'}
      Investment Models: ${pricingPlans?.map((p: any) => `${p.label} (${p.value}/mo): ${p.items.join(', ')}`).join(' | ') || 'Standard packages'}
    `;

    let prompt = "";
    switch (sectionType) {
      case 'about':
        prompt = `${context}\n\nWrite a persuasive "About the Project" section. Explain why OP Media Agency is the perfect partner for ${clientName} in the ${industry} space. Tone: Professional, high-end agency. 2-3 paragraphs.`;
        break;
      case 'strategy':
        prompt = `${context}\n\nDraft a "Strategic Growth Roadmap". Explain how we will use ${services?.join(', ')} to achieve the goals: ${Array.isArray(goals) ? goals.join(', ') : goals}. Focus on ROI and data-driven results.`;
        break;
      case 'problem_solution':
        prompt = `${context}\n\nIdentify the typical digital marketing challenges for a ${industry} business and explain how our solution directly addresses them to drive growth.`;
        break;
      case 'deliverables':
        prompt = `${context}\n\nDetail the monthly deliverables for the selected services (${services?.join(', ')}). Be specific about the impact of each deliverable.`;
        break;
      case 'cta':
        prompt = `${context}\n\nWrite a powerful Closing & Call to Action. Encourage ${clientName} to take the next step to dominate their market with OP Media.`;
        break;
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    return response.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    return "AI generation is currently unavailable. Please try manual entry.";
  }
}

export async function generateProposalSection(
  sectionType: string,
  clientName: string,
  businessDescription: string,
  goals: string | string[]
) {
  try {
    const goalsText = Array.isArray(goals) ? goals.join(', ') : goals;
    let prompt = "";
    
    switch (sectionType) {
      case 'text':
        prompt = `Write a professional executive summary for a digital marketing proposal for a client named "${clientName}". The business description is: "${businessDescription}". The primary goals are: "${goalsText}". Keep it concise and persuasive.`;
        break;
      case 'services':
        prompt = `List recommended digital marketing services for a client named "${clientName}". Business: "${businessDescription}". Goals: "${goalsText}". For each service, provide a brief 2-sentence explanation of why it's needed.`;
        break;
      case 'pricing':
        prompt = `Create a professional pricing table breakdown for a digital marketing package for "${clientName}". Include services like SEO, Content, Ads, etc. Provide realistic estimated monthly costs for a medium-sized business. Format as a scannable list. Business: "${businessDescription}".`;
        break;
      case 'timeline':
        prompt = `Create a 6-month digital marketing roadmap/timeline for "${clientName}". Outline key milestones for Month 1, Month 3, and Month 6. Business: "${businessDescription}". Goals: "${goalsText}".`;
        break;
      default:
        prompt = `Write content for a digital marketing proposal section about "${sectionType}" for client "${clientName}".`;
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    return response.text || "Failed to generate content.";
  } catch (error) {
    console.error("Gemini SDK Error:", error);
    return "AI generation is currently unavailable. Please try manual entry.";
  }
}

export async function suggestProposalTitle(clientName: string, businessDescription: string) {
  try {
    const prompt = `Suggest 3 professional and catchy titles for a digital marketing proposal for "${clientName}". Business context: "${businessDescription}". Return only the best one as a plain string.`;
    
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    return response.text?.trim().replace(/^"|"$/g, '') || `Digital Marketing Proposal: ${clientName}`;
  } catch (error) {
    return `Digital Marketing Proposal: ${clientName}`;
  }
}

export async function generateClientReport(
  images: { data: string; mimeType: string }[],
  notes: string,
  clientName: string,
  projectName: string
) {
  try {
    const fullPrompt = `
      You are a professional client reporting assistant for OP Media Agency (a high-end digital marketing firm). 
      Analyze the attached images and the following notes to generate a professional, visually structured report.
      
      Client: ${clientName || 'Valued Client'}
      Project/Service: ${projectName || 'Agency Services'}
      Employee Notes: ${notes || 'No additional notes provided.'}
      
      INSTRUCTIONS:
      1. Analyze all images carefully.
      2. Identify: Work completed, progress, and quality of work.
      3. Tone: High-end agency, strategic, reassuring, and data-driven.
      
      FORMAT (Strict adherence to Markdown structure):
      
      CRITICAL: Do NOT include fields like "Client:", "Service:", or "Reporting Period:" at the beginning of the report. These are already handled by the application header. Start directly with the Report Overview.

      # 📊 PROJECT PERFORMANCE REPORT
      
      ## 🔍 Report Overview
      A high-level executive summary (2-3 sentences) explaining the current state of the project and the value delivered during this period.
      
      ---
      
      ## 🛠️ Work Summary
      A detailed breakdown of the tasks performed. Use bullet points.
      - **Task A**: Description of result.
      - **Task B**: Description of result.
      
      ## 📈 Observations & Insights
      Deep-dive into what the visual evidence shows. Mention specific highlights from the screenshots.
      
      ## 🚦 Current Status
      **Status:** [Completed / In Progress / Optimized]
      *Brief justification for this status.*
      
      ## 🛡️ Issues & Risk Mitigation
      List any hurdles or write "No major risks identified at this stage" if everything is perfect.
      
      ## 🚀 Roadmap & Next Steps
      Practical action items for the upcoming period to keep momentum high.
      
      ## ✍️ Agency Note to Client
      A personalized closing statement showing commitment to their growth.
      
      ---
      ### 📱 Quick Brief (Shareable Summary)
      *A 3-line summary perfect for a quick update.*
    `;

    const imageParts = images.map((img: any) => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType
      }
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts: [...imageParts, { text: fullPrompt }] }
    });

    return response.text || "Failed to generate report.";
  } catch (error: any) {
    console.error("Gemini SDK Error:", error);
    if (error.message?.includes('413')) {
      return "Error: Payload too large. Try using fewer images or smaller resolutions.";
    }
    return `AI Report Error: ${error.message || 'Unknown error'}. Please ensure your API key is correctly configured.`;
  }
}
