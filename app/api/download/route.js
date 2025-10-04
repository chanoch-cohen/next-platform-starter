import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';
import { Readable } from 'stream';

// Helper function to stream Node.js readable stream to a Web Stream
async function* nodeStreamToIterator(stream) {
  for await (const chunk of stream) {
    yield new Uint8Array(chunk);
  }
}

function iteratorToStream(iterator) {
    return new ReadableStream({
        async pull(controller) {
            const { value, done } = await iterator.next();
            if (done) {
                controller.close();
            } else {
                controller.enqueue(value);
            }
        },
    });
}


export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || !ytdl.validateURL(url)) {
      return NextResponse.json({ error: 'כתובת URL לא תקינה.' }, { status: 400 });
    }

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioandvideo' });
    
    if (!format) {
        return NextResponse.json({ error: 'לא נמצא פורמט וידאו מתאים.' }, { status: 404 });
    }
    
    const videoStream = ytdl(url, { format });
    const iterator = nodeStreamToIterator(videoStream);
    const stream = iteratorToStream(iterator);

    // Sanitize title to create a valid filename
    const filename = `${info.videoDetails.title.replace(/[<>:"/\\|?*]+/g, '')}.mp4`;
    
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    return new Response(stream, { headers });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'שגיאה פנימית בשרת.' }, { status: 500 });
  }
}
