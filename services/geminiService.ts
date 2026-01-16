
// @google/genai guidelines followed:
// - Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// - Create a new GoogleGenAI instance right before making an API call.
// - Use gemini-2.5-flash-image for general image generation.
// - Iterate through response parts to find the image data.

import { GoogleGenAI, Type } from "@google/genai";
import { UserPersona, Bucket, BudgetPlan, UserProfile, AISuggestion, AIPlanResponse, Currency } from "../types";

/**
 * Helper to handle API calls with exponential backoff for 429/5xx errors.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.message?.includes('429') || error?.message?.includes('500') || error?.message?.includes('quota');
    if (isRetryable && retries > 0) {
      console.warn(`Gemini API error (retryable). Retrying in ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const generateGoalImage = async (prompt: string): Promise<string | null> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A high-quality, cinematic 3D render representing this financial goal: ${prompt}. Professional lighting, minimalist design, emerald and gold accents.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  }).catch(error => {
    console.error("Error generating image:", error);
    return null;
  });
};

export const getBudgetPlans = async (
  profile: UserProfile, 
  salary: number, 
  currency: Currency,
  lang: 'en' | 'ar',
  isInitial: boolean,
  oldSalary?: number
): Promise<AIPlanResponse> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const count = isInitial ? 3 : 1;
    const salaryStatus = oldSalary 
      ? (salary > oldSalary ? "ازداد" : salary < oldSalary ? "نقص" : "تغير")
      : "تم تحديده";

    const prompt = `أنت مستشار مالي خبير لموقع "رفيقي - Rafiqe". 
    البيانات الاقتصادية والشخصية:
    - العملة: ${currency.name} (${currency.code}).
    - تنبيه هام: يجب عليك إدراك القيمة الشرائية لهذه العملة. (مثلاً: إذا كانت الليرة السورية SYP، فإن مبالغ مثل المليون تعتبر دخلاً عادياً وليست ثروة ضخمة بسبب التضخم وانخفاض القيمة). حلل الراتب "${salary}" بناءً على واقع هذه العملة الحقيقي.
    - العمر: ${profile.age} سنة.
    - الهوية المالية: ${profile.persona}.
    - الحالة الاجتماعية: ${profile.status}.
    - عدد الأطفال: ${profile.childrenCount}.
    - هيكل العائلة (إذا كان يعيش مع أهله): ${profile.familyStructure || 'غير محدد'}.
    - الراتب الحالي: ${salary} ${currency.code}.
    - الأولويات المالية: "${profile.priorities}".
    ${oldSalary ? `الراتب السابق كان: ${oldSalary} (الراتب ${salaryStatus}).` : ''}
    اللغة المطلوبة للرد: ${lang === 'ar' ? 'العربية' : 'English'}.
    
    مهمتك:
    1. تقديم تعليق ذكي ومختصر جداً حول كفاية الراتب "${salary} ${currency.code}" لمتطلبات الحياة الحقيقية في ظل قيمة هذه العملة الحالية.
    2. تصميم عدد (${count}) من خطط الميزانية.
    
    قواعد هامة جداً لضبط الأقسام (Buckets):
    - عدد الأقسام يجب أن يتناسب مع مسؤوليات المستخدم: 
      * إذا كان "Family Head" أو لديه أطفال، زد عدد الأقسام لتشمل التعليم، الصحة، الطوارئ، والديون.
      * إذا كان يعيش مع أهله، قد تكون أقسام السكن أقل أو تشمل "مساعدة الأهل".
    - الحد الأدنى للأقسام هو 5.
    - يجب أن يكون لكل قسم (bucket) أيقونة (emoji) معبرة جداً عنه.
    - مجموع نسب الأقسام في كل خطة يجب أن يساوي 100% تماماً.

    أجب بتنسيق JSON object حصراً يحتوي على حقلين:
    - feedback (نص التحليل الاقتصادي للراتب والعملة)
    - plans (مصفوفة الخطط)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: { type: Type.STRING },
            plans: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  buckets: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        icon: { type: Type.STRING },
                        percent: { type: Type.NUMBER }
                      },
                      required: ["id", "name", "icon", "percent"]
                    }
                  }
                },
                required: ["id", "title", "description", "buckets"]
              }
            }
          },
          required: ["feedback", "plans"]
        }
      }
    });

    return JSON.parse(response.text || '{"feedback": "", "plans": []}');
  }).catch(error => {
    console.error("Final error fetching budget plans after retries:", error);
    return { 
      feedback: error?.message?.includes('429') ? "QUOTA_EXCEEDED" : "API_ERROR", 
      plans: [] 
    };
  });
};

export const getPostTransactionSuggestions = async (
  transaction: any, 
  buckets: Bucket[], 
  salary: number,
  profile: UserProfile,
  currency: Currency,
  lang: 'en' | 'ar'
): Promise<AISuggestion[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `أنت خبير مالي لموقع رفيقي. تم صرف ${transaction.amount} ${currency.code} على "${transaction.description}". 
    خذ بعين الاعتبار قيمة العملة ${currency.name} عند تقديم النصيحة. 
    قدم 3 اقتراحات ذكية باللغة العربية. أجب بتنسيق JSON array.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              action: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  fromId: { type: Type.STRING },
                  toId: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  newTarget: { type: Type.NUMBER },
                  targetBucketId: { type: Type.STRING }
                }
              }
            },
            required: ["text"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  }).catch(() => []);
};

export const getFinancialAdvice = async (
  profile: UserProfile, 
  salary: number, 
  buckets: Bucket[], 
  currency: Currency,
  lang: 'en' | 'ar'
): Promise<string[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `قدم 3 نصائح مالية لمستخدم موقع رفيقي باللغة العربية بناءً على صرفه الحالي وراتبه ${salary} ${currency.code}.
    هام: العملة هي ${currency.name}، يرجى مراعاة قيمتها الحقيقية وقدرتها الشرائية في السوق.
    أجب بتنسيق JSON array.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  }).catch(() => []);
};
