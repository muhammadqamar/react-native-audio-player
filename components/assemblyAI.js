import axios from 'axios';

const apiKey = process.env.REACT_APP_ASSEMBLYAI_API_KEY

async function transcribeAudioOrVideo(fileUri) {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'audio/mp3', // Change the content type based on your file format
      name: 'audio.mp3', // Change the filename accordingly
    });
    console.log(fileUri);
    const response = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      formData,
      {
        headers: {
          authorization: apiKey,
          'content-type': 'multipart/form-data',
        },
      },
    );
    console.log(response);
    const {upload_url} = response.data;

    // Once the file is uploaded, you can create a transcription job
    const transcriptionResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: upload_url,
      },
      {
        headers: {
          authorization: apiKey,
          'content-type': 'application/json',
        },
      },
    );
    console.log(transcriptionResponse);
    const {id} = transcriptionResponse.data;

    // Now, you can periodically check the transcription status or retrieve the result
    // using the ID. You may want to implement polling or a webhook for this part.
    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${id}`;

    // Poll the transcription API until the transcript is ready
    while (true) {
      // Send a GET request to the polling endpoint to retrieve the status of the transcript
      const pollingResponse = await fetch(pollingEndpoint, {
        headers: {
          authorization: apiKey,
          'content-type': 'application/json',
        },
      });
      const transcriptionResult = await pollingResponse.json();

      // If the transcription is complete, return the transcript object
      if (transcriptionResult.status === 'completed') {
        return transcriptionResult;
      }
      // If the transcription has failed, throw an error with the error message
      else if (transcriptionResult.status === 'error') {
        throw new Error(`Transcription failed: ${transcriptionResult.error}`);
      }
      // If the transcription is still in progress, wait for a few seconds before polling again
      else {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } catch (error) {
    console.error('Error transcribing audio/video:', error);
    throw error;
  }
}

export {transcribeAudioOrVideo};
