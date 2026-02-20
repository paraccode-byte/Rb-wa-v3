import { Canvas } from 'skia-canvas';

async function create_img(teksInput) {
    const width = 500;
    const height = 500;
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    let fontSize = 140; 
    let x = 10;
    let y = 20;
    
    let lines = teksInput.split('/'); 

    while (fontSize * lines.length > (height - 40) && fontSize > 20) {
        fontSize -= 10; 
    }

    const lineHeight = fontSize; 
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'black';
    ctx.font = `${fontSize}px Arial`; 
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    lines.forEach((line, index) => {
        ctx.fillText(line, x, y + (index * lineHeight));
    });

    return await canvas.toBuffer('png');
}
export default create_img;