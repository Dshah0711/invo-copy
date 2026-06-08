const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Parse a vendor invoice file (PDF or Image) using Gemini 1.5 Flash
 * @param {string} filePath - Absolute path to the uploaded file
 * @param {string} fileType - 'pdf' or 'image'
 * @returns {object} Parsed invoice data as JSON
 */
const parseVendorInvoice = async (filePath, fileType) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  // Determine MIME type
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.pdf') mimeType = 'application/pdf';
  else if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

  const prompt = `You are an expert invoice parser. Analyze this vendor invoice document carefully.

Extract ALL of the following information and return ONLY a valid JSON object with NO markdown, NO code blocks, NO extra text — just pure JSON:

{
  "vendorName": "company or person name on the invoice",
  "vendorEmail": "vendor email if present, else empty string",
  "vendorPhone": "vendor phone number if present, else empty string",
  "vendorAddress": "vendor full address if present, else empty string",
  "vendorGst": "GST/VAT/Tax registration number if present, else empty string",
  "vendorBankDetails": {
    "bankName": "bank name if present, else empty string",
    "accountNumber": "account number if present, else empty string",
    "ifsc": "IFSC/routing code if present, else empty string",
    "upiId": "UPI ID if present, else empty string"
  },
  "invoiceNumber": "invoice number or reference if present, else empty string",
  "issueDate": "invoice date in ISO format YYYY-MM-DD, else null",
  "dueDate": "payment due date in ISO format YYYY-MM-DD, else null",
  "lineItems": [
    {
      "description": "item or service description",
      "quantity": numeric_quantity_as_number,
      "rate": numeric_rate_as_number,
      "amount": numeric_amount_as_number
    }
  ],
  "subtotal": numeric_subtotal_as_number,
  "taxAmount": numeric_tax_amount_as_number,
  "total": numeric_total_amount_as_number,
  "currency": "currency code like INR, USD, EUR",
  "confidence": confidence_score_0_to_100_as_number
}

Rules:
- All numeric values must be actual numbers, NOT strings
- If a value cannot be found, use empty string "" for strings, 0 for numbers, null for dates, and [] for arrays
- Do NOT guess or hallucinate values — only extract what is explicitly on the document
- confidence should reflect how clearly readable the document is (0-100)`;

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = await result.response;
  const text = response.text();

  // Clean and parse JSON response
  let cleanText = text.trim();
  // Remove any markdown code blocks if Gemini wraps in them
  cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (e) {
    // Try to extract JSON from the text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Gemini could not extract structured data from this document. Please check the file quality.');
    }
  }

  return parsed;
};

module.exports = { parseVendorInvoice };
