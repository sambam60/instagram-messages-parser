import { NextResponse } from 'next/server';
import AdmZip, { IZipEntry } from 'adm-zip';
import { Conversation, Message } from '../../types';

export const config = {
  api: {
    bodyParser: false, 
  },
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    console.log('File received:', file);
    console.log('File type:', file.type);
    console.log('File name:', file.name);

    if (!file || !file.name.endsWith('.zip')) {
      console.error("Invalid file type or missing file.");
      return NextResponse.json({ error: 'Please upload a valid ZIP file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = new AdmZip(Buffer.from(arrayBuffer));
    const zipEntries: IZipEntry[] = zip.getEntries();

    const conversations: Conversation[] = [];
    const MAX_CONVERSATIONS = 1000; 
    const MAX_MESSAGES_PER_CONVERSATION = 50000; 

    const mediaFiles: { [filename: string]: { uri: string; type: 'photo' | 'video' | 'audio' } } = {};

    zipEntries.forEach((entry: IZipEntry) => {
      const pathParts = entry.entryName.split('/');
      if (pathParts.length < 2) {
        return;
      }

      const fileName = pathParts[pathParts.length - 1];
      const lowerParts = pathParts.map(p => p.toLowerCase());
      const mediaTypeFolder = lowerParts.find(p => ['photos', 'videos', 'audio'].includes(p));

      if (mediaTypeFolder && fileName) {
        const mediaType: 'photo' | 'video' | 'audio' =
          mediaTypeFolder === 'photos' ? 'photo' :
          mediaTypeFolder === 'videos' ? 'video' :
          'audio';

        const mediaBuffer = zip.readFile(entry);
        if (mediaBuffer) {
          let mimeType: string;
          if (mediaType === 'photo') {
            if (fileName.toLowerCase().endsWith('.png')) {
              mimeType = 'image/png';
            } else {
              mimeType = 'image/jpeg'; 
            }
          } else if (mediaType === 'video') {
            mimeType = 'video/mp4';
          } else { // audio
            mimeType = 'audio/mpeg';
          }
          const mediaUri = `data:${mimeType};base64,${mediaBuffer.toString('base64')}`;
          mediaFiles[fileName] = { uri: mediaUri, type: mediaType };
          console.log(`Stored media file: ${fileName} as ${mediaType}`);
        } else {
          console.warn(`Failed to read media file: ${fileName}`);
        }
      }
    });

    zipEntries.forEach((entry: IZipEntry) => {
      if (conversations.length >= MAX_CONVERSATIONS) {
        console.warn(`Maximum number of conversations (${MAX_CONVERSATIONS}) reached. Skipping remaining entries.`);
        return;
      }

      console.log(`Processing entry: ${entry.entryName}`);
      const pathParts = entry.entryName.split('/');
      const inboxIndex = pathParts.findIndex(part => part.toLowerCase() === 'inbox');
      if (inboxIndex === -1 || inboxIndex + 1 >= pathParts.length) {
        console.warn(`Skipping entry not in 'inbox/' folder: ${entry.entryName}`);
        return;
      }

      const conversationFolder = pathParts[inboxIndex + 1];
      const fileName = pathParts[pathParts.length - 1];
      const subPath = pathParts.slice(inboxIndex + 2);

      if (fileName.startsWith('message') && fileName.endsWith('.json')) {
        let conversation = conversations.find(conv => conv.thread_path === conversationFolder);
        if (!conversation) {
          console.log(`Creating new conversation for folder: ${conversationFolder}`);
          conversation = {
            participants: [],
            messages: [],
            title: '',
            thread_path: conversationFolder,
            is_still_participant: true,
            magic_words: [],
          };
          conversations.push(conversation);
        }

        const jsonData = entry.getData().toString('utf-8');
        try {
          console.log(`Parsing JSON message file: ${fileName}`);
          const parsed: Conversation = JSON.parse(jsonData);

          if (parsed.title) {
            conversation.title = parsed.title;
          }

          if (conversation.participants.length === 0 && parsed.participants) {
            conversation.participants = parsed.participants;
            console.log(`Participants set for conversation "${conversation.title}":`, conversation.participants);
          }

          if (parsed.messages && Array.isArray(parsed.messages)) {
            const availableSlots = MAX_MESSAGES_PER_CONVERSATION - conversation.messages.length;
            if (availableSlots > 0) {
              const messagesToAdd = parsed.messages.slice(0, availableSlots);
              messagesToAdd.forEach((msg: Message) => {
                if (msg.photos && Array.isArray(msg.photos)) {
                  msg.photos = msg.photos.map(photo => {
                    const mediaFilename = photo.uri.split('/').pop();
                    if (mediaFilename && mediaFiles[mediaFilename]) {
                      return { ...photo, uri: mediaFiles[mediaFilename].uri };
                    }
                    console.warn(`Photo media file "${mediaFilename}" not found for message.`);
                    return photo;
                  });
                }

                if (msg.videos && Array.isArray(msg.videos)) {
                  msg.videos = msg.videos.map(video => {
                    const mediaFilename = video.uri.split('/').pop();
                    if (mediaFilename && mediaFiles[mediaFilename]) {
                      return { ...video, uri: mediaFiles[mediaFilename].uri };
                    }
                    console.warn(`Video media file "${mediaFilename}" not found for message.`);
                    return video;
                  });
                }

                if (msg.audio_files && Array.isArray(msg.audio_files)) {
                  msg.audio_files = msg.audio_files.map(audio => {
                    const mediaFilename = audio.uri.split('/').pop();
                    if (mediaFilename && mediaFiles[mediaFilename]) {
                      return { ...audio, uri: mediaFiles[mediaFilename].uri };
                    }
                    console.warn(`Audio media file "${mediaFilename}" not found for message.`);
                    return audio;
                  });
                }

                conversation.messages.push(msg);
              });

              console.log(`Added ${messagesToAdd.length} messages to conversation "${conversation.title}". Total messages: ${conversation.messages.length}`);
            } else {
              console.warn(`Maximum messages (${MAX_MESSAGES_PER_CONVERSATION}) reached for conversation "${conversation.title}".`);
            }
          } else {
            console.warn(`No messages found in file ${fileName} for conversation "${conversation.title}"`);
          }
        } catch (err) {
          console.error(`Error parsing JSON file ${fileName} in ${conversationFolder}:`, err);
        }
      }
    });

    conversations.forEach(conversation => {
      conversation.messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
      console.log(`Total messages in "${conversation.title}": ${conversation.messages.length}`);
    });

    console.log('Total conversations processed:', conversations.length);

    return NextResponse.json({ success: true, conversations }, { status: 200 });
  } catch (error) {
    console.error('Upload processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
