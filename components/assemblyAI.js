import axios from 'axios';
import {REACT_APP_ASSEMBLY_API_KEY} from '@env';
async function transcribeAudioOrVideo(fileUri, code) {
  console.log('assembly', REACT_APP_ASSEMBLY_API_KEY)
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
          authorization: REACT_APP_ASSEMBLY_API_KEY,
          'content-type': 'multipart/form-data',
        },
      },
    );

    const {upload_url} = response.data;

    // Once the file is uploaded, you can create a transcription job
    const transcriptionResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url:
          upload_url ||
          'https://coqui-prod-creator-app-synthesized-samples.s3.amazonaws.com/editor_takes/8ee84cdbf0a20450e53600621e6c0b3d7c77211567507031c5dd7b70b6594197.wav',
        language_code: code,
      },
      {
        headers: {
          authorization: REACT_APP_ASSEMBLY_API_KEY,
          'content-type': 'application/json',
        },
      },
    );
    console.log(transcriptionResponse?.data.id);
    const {id} = transcriptionResponse.data;

    // Now, you can periodically check the transcription status or retrieve the result
    // using the ID. You may want to implement polling or a webhook for this part.
    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${id}`;

    // Poll the transcription API until the transcript is ready
    while (true) {
      // Send a GET request to the polling endpoint to retrieve the status of the transcript
      const pollingResponse = await fetch(pollingEndpoint, {
        headers: {
          authorization: REACT_APP_ASSEMBLY_API_KEY,
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Error transcribing audio/video:', error);
    throw error;
  }
}

export {transcribeAudioOrVideo};
