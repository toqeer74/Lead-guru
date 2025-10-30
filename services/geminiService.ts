import { GoogleGenAI } from "@google/genai";
import { Lead, GroundingChunk } from '../types';

if (!process.env.API_KEY) {
  // This is a placeholder check. In a real environment, the key would be set.
  // We'll proceed assuming it's available, as per the instructions.
  console.warn("API_KEY environment variable not set. Using a placeholder.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateEmailPatterns = async (firstName: string, lastName: string, domain: string): Promise<string[]> => {
  const prompt = `Generate a list of common email patterns for a person named ${firstName} ${lastName} at the domain ${domain}. Return only a JSON array of strings. For example: ["f.last@domain.com", "first.last@domain.com"].`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    const jsonString = response.text.trim().replace(/```json|```/g, '');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error generating email patterns:", error);
    return [`${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`];
  }
};

export const fetchCompanyInfo = async (domain: string): Promise<{info: string, sources: GroundingChunk[]}> => {
  const prompt = `Provide a concise summary of the company at the domain ${domain}. Include its primary industry, a brief description, and its headquarters location.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { info: response.text, sources: sources as GroundingChunk[] };
  } catch (error) {
    console.error("Error fetching company info:", error);
    return { info: "Could not fetch company information.", sources: [] };
  }
};

export const getStrategicAnalysis = async (leadName: string, companyName: string, role: string): Promise<string> => {
  const prompt = `
    Analyze the following lead and generate a detailed, multi-point outreach strategy.
    - Lead Name: ${leadName}
    - Company: ${companyName}
    - Role: ${role}

    The strategy should include:
    1.  Potential pain points for someone in this role at this type of company.
    2.  Customized value propositions that align our solution (a lead generation tool) with their needs.
    3.  A suggested 3-step email sequence outline (just the key message for each email, not the full text).
    4.  Conversation starters for a cold call.

    Think deeply about this and provide actionable, specific advice.
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      },
    });
    return response.text;
  } catch (error) {
    console.error("Error getting strategic analysis:", error);
    return "Failed to generate strategic analysis.";
  }
};

export const findCompanyLocation = async (companyName: string, userLocation: { latitude: number, longitude: number }): Promise<{info: string, sources: GroundingChunk[]}> => {
    const prompt = `Find the headquarters location for the company named "${companyName}". Provide the address and a link to its location on a map.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: {
                        latLng: userLocation
                    }
                }
            },
        });
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { info: response.text, sources: sources as GroundingChunk[] };
    } catch (error) {
        console.error("Error finding company location:", error);
        return { info: "Could not find company location information.", sources: [] };
    }
};

export const generateSubjectLines = async (templateBody: string): Promise<string[]> => {
  const prompt = `Based on the following email body, generate 5 compelling and professional B2B email subject lines designed to maximize open rates for lead generation. Return only a JSON array of strings.

Email Body:
"${templateBody}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    const jsonString = response.text.trim().replace(/```json|```/g, '');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error generating subject lines:", error);
    alert("Failed to generate subject lines. Please check the console for details.");
    return [];
  }
};

export const generateEmailBody = async (prompt: string): Promise<string> => {
  const fullPrompt = `Based on the following prompt, generate a compelling and professional B2B email body for a lead generation campaign. The tone should be helpful and not overly "salesy".
  
Make sure to include placeholders like {firstName}, {lastName}, and {companyName} for personalization. The goal is to start a conversation.
  
User Prompt: "${prompt}"
  
Generated Email Body:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating email body:", error);
    alert("Failed to generate email body. Please check the console for details.");
    return "";
  }
};

export const personalizeEmailBody = async (lead: Lead, baseBody: string): Promise<string> => {
  const prompt = `You are an expert B2B sales development representative. Your task is to personalize a given email template for a specific lead.
    
Lead Information:
- Name: ${lead.firstName} ${lead.lastName}
- Role: ${lead.role}
- Company: ${lead.companyName}
- Company Description: ${lead.companyInfo?.description || 'Not available.'}

Base Email Body (use this as a starting point):
---
${baseBody}
---

Instructions:
1. Rewrite the base email body to be highly personalized for the lead.
2. Reference their specific role and company.
3. If company information is available, connect our product's value proposition (a lead generation toolkit) to a potential pain point their company might face.
4. Maintain the original placeholders like {firstName}.
5. The tone should be professional, concise, and engaging.
6. Return ONLY the personalized email body text. Do not include any preamble or explanation.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error personalizing email body:", error);
    alert("Failed to personalize email. Please check the console for details.");
    return baseBody;
  }
};