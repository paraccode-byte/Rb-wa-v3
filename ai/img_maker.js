import 'dotenv/config';

const ACCOUNT_ID = process.env.CLAUDFLARE_ID;
const API_TOKEN = process.env.CLAUDFLARE_API;

export default async function generateImage(prompt) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    }
  );

  if (!response.ok) {
    throw new Error("Gagal membuat gambar");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log("Gambar berhasil disimpan sebagai hasil-gambar.png");

  return buffer;
}
