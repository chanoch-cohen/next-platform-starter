import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

// Helper function to convert Node.js stream to a Web Stream
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

async function* nodeStreamToIterator(stream) {
  for await (const chunk of stream) {
    yield new Uint8Array(chunk);
  }
}

export async function POST(request) {
  let url; // Define url here to access it in the catch block
  try {
    const body = await request.json();
    url = body.url;

    if (!url || !ytdl.validateURL(url)) {
      return NextResponse.json({ error: 'כתובת URL לא תקינה.' }, { status: 400 });
    }

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioandvideo' });
    
    if (!format) {
        return NextResponse.json({ error: 'לא נמצא פורמט וידאו מתאים להורדה.' }, { status: 404 });
    }
    
    const videoStream = ytdl(url, { format });
    const iterator = nodeStreamToIterator(videoStream);
    const stream = iteratorToStream(iterator);

    // Sanitize title to create a valid filename
    const filename = `${info.videoDetails.title.replace(/[<>:"/\\|?*]+/g, '')}.mp4`;
    
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    return new Response(stream, { headers });

  } catch (error) {
    // Log the error with more context for easier debugging in Netlify Functions
    console.error(`שגיאה בעיבוד הכתובת: ${url}`, error);
    return NextResponse.json({ error: 'שגיאה בעיבוד הבקשה. ייתכן שהסרטון מוגן או לא זמין.' }, { status: 500 });
  }
}

