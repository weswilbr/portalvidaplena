
import { config } from 'dotenv';
config();

async function testGemini(model, version) {
  const key = process.env.GEMINI_API_KEY;
  const prompt = "Diga apenas 'SISTEMA OK' se você estiver funcionando.";
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    if (response.ok) {
       console.log(`✅ OK: ${model} @ ${version}`);
    } else {
       console.log(`❌ ERROR: ${model} @ ${version} -> ${data?.error?.message}`);
    }
  } catch (error) {
    console.log(`❌ CONEXAO: ${model} @ ${version}`);
  }
}

async function runTests() {
  await testGemini("gemini-flash-latest", "v1beta");
  await testGemini("gemini-flash-lite-latest", "v1beta");
}

runTests();
