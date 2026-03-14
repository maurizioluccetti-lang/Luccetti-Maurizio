import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function parseVoiceInput(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analizza il seguente testo e estrai i dati per una registrazione di cassa di una tabaccheria.
    Testo: "${text}"
    
    Restituisci un oggetto JSON con i seguenti campi:
    - category: una tra ["Mooney", "Lotto", "Gratta e Vinci", "Sisal", "4%", "10%", "22%", "Altro"]
    - type: "Agio" (per Mooney, Lotto, Gratta e Vinci, Servizi) o "Corrispettivo" (per Bar, Cartoleria, Articoli Vari)
    - grossAmount: numero (l'importo totale citato)
    - netAmount: numero (opzionale, se citato un agio netto)
    - ivaRate: numero (opzionale, es. 22, 10, 4)
    - isArt74: boolean (true se è un agio escluso art. 74 come tabacchi o giochi)
    - isVentilato: boolean (true se citato come ventilato)
    - notes: string (eventuali note aggiuntive)
    
    Se non riesci a determinare un campo, lascialo null.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          type: { type: Type.STRING },
          grossAmount: { type: Type.NUMBER },
          netAmount: { type: Type.NUMBER },
          ivaRate: { type: Type.NUMBER },
          isArt74: { type: Type.BOOLEAN },
          isVentilato: { type: Type.BOOLEAN },
          notes: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Error parsing Gemini response", e);
    return null;
  }
}
