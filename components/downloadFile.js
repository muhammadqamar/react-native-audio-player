import RNFetchBlob from 'rn-fetch-blob';
export const downloadFile = async (url) => {

  //  const filePath = path; // Path where the file will be saved
    const { dirs } = RNFetchBlob.fs;
    const filePath = `${dirs.DownloadDir}/${Date.now()}.mp3`; // Path where the file will be saved

    try {
      const response = await RNFetchBlob.config({
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: 'Downloading File',
          description: 'Please wait while the file is downloading...',
          path: filePath,
        },
      }).fetch('GET', url);

      console.log('File downloaded to:', response.path());
      return response.path
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };