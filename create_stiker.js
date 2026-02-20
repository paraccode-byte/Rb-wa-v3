import sharp from "sharp";
import create_img from "./create_img.js";

async function create_stiker(text) {
    const buffer = await create_img(text);

    const webpBuffer = await sharp(buffer)
        .resize(512, 512) 
        .webp({ quality: 75 })
        .toBuffer();

    return webpBuffer;
}
export default create_stiker;