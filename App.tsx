import React, {useState, useEffect} from 'react';
import {
  Dimensions,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  View,
} from 'react-native';
import {Buffer} from 'buffer';
import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
// import RNFetchBlob from 'rn-fetch-blob';
import axios from 'axios';
import Button from './components/uis/Button';
import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
const API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions'; // Replace with your API endpoint
import {transcribeAudioOrVideo} from './components/assemblyAI';
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#455A64',
    flexDirection: 'column',
    alignItems: 'center',
  },
  titleTxt: {
    marginTop: 50,
    color: 'white',
    fontSize: 28,
  },
  txtRecordCounter: {
    marginTop: 20,
    color: 'white',
    fontSize: 20,
    textAlignVertical: 'center',
    fontWeight: '200',
    fontFamily: 'Helvetica Neue',
    letterSpacing: 3,
  },
  btn: {
    borderColor: 'white',
    borderWidth: 1,
  },
  txt: {
    color: 'white',
    fontSize: 14,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  recordBtnWrapper: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 20,
  },

  final: {
    // padding:'4px',
    color: 'white',
    border: '1px solid #fff',
    marginTop: 22,
    padding: 10,
  },
  chatContainer: {
    // overflow: 'hidden',
    // flex: 1,
    flexDirection: 'column',
    // justifyContent: 'space-between',
    padding: 5,
    // backgroundColor: '#808080',
    width: '100%',
    height: '65%',
  },
  personContainer: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    marginVertical: 8,
  },

  person1Text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'blue',
    // justifyContent: 'flex-end'
  },
  person2Text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
  },
  scrollViewContent: {
    padding: 16,
  },
});
// const ASSEMBLYAI_API_KEY = 'a2bf8820eed141afac65ef44493a6657';

const screenWidth = Dimensions.get('screen').width;
const dirs = RNFetchBlob.fs.dirs;
const Page = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [finalAudio, setFinalAudio] = useState();
  const [finalText, setFinalText] = useState();
  const [loader, setLoader] = useState(false);
  const [audioRecorderPlayer] = useState(new AudioRecorderPlayer());
  const openAI = process.env.REACT_APP_OPENAI_KEY;
  const conqui = process.env.REACT_APP_COQUI_KEY;
  const firstText = [
    'Hello, how are you?',
    "I'm doing great, thanks for asking!",
    "Let's catch up soon.",
  ];
  const secondText = [
    "Hey, I'm good. How about you?",
    "I'm good too, thanks!",
    "Sure, let's plan a meetup.",
  ];
  const [path, setPath] = useState(
    Platform.select({
      ios: undefined,
      // android: undefined,
      android: `${dirs.CacheDir}/hello.mp3`,
    }),
  );

  useEffect(() => {
    audioRecorderPlayer.setSubscriptionDuration(0.1);
  }, []);

  useEffect(() => {
    if (finalAudio) {
      playAudio();
    }
  }, [finalAudio]);

  const onStartRecord = async () => {
    setFinalAudio();
    setFinalText();
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        console.log('write external storage', grants);

        if (
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.READ_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.RECORD_AUDIO'] ===
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('permissions granted');
        } else {
          console.log('All required permissions not granted');
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    const audioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
      AVNumberOfChannelsKeyIOS: 2,
      AVFormatIDKeyIOS: AVEncodingOption.aac,
      OutputFormatAndroid: OutputFormatAndroidType.AAC_ADTS,
    };

    console.log('audioSet', audioSet);

    const uri = await audioRecorderPlayer.startRecorder(path, audioSet);

    audioRecorderPlayer.addRecordBackListener(e => {
      setRecordSecs(e.currentPosition);
      setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
    });

    console.log(`uri: ${uri}`);
  };

  const onStopRecord = async () => {
    const result = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    setRecordSecs(0);
    setLoader(true);
    const transcription = await transcribeAudioOrVideo(result);

    if (transcription.text) {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      myHeaders.append('Authorization', `Bearer ${openAI}`);
      const raw = JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `${transcription.text}. please answer should be less then 500 characters and as short as possible. thanks `,
          },
        ],
      });
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };
      console.log(transcription.text);
      fetch('https://api.openai.com/v1/chat/completions', requestOptions)
        .then(response => response.text())
        .then(result => {
          setFinalText(JSON.parse(result));
          if (JSON.parse(result).choices?.length) {
            const myHeaders = new Headers();
            myHeaders.append('Content-Type', 'application/json');
            myHeaders.append('Authorization', `Bearer ${conqui}`);

            fetch('https://app.coqui.ai/api/v2/samples', {
              method: 'POST',
              headers: myHeaders,
              body: JSON.stringify({
                voice_id: 'd2bd7ccb-1b65-4005-9578-32c4e02d8ddf',
                text: JSON.parse(result).choices?.[0].message.content,
              }),
            })
              .then(response => response.text())
              .then(result => {
                setLoader(false);

                setFinalAudio(JSON.parse(result));
                // Handle the audio result as needed
              })
              .catch(error => console.log('error', error));
          }
        })
        .catch(error => console.log('error', error));
    }
  };

  const playAudio = async () => {
    console.log(finalAudio);
    try {
      const audioInfo = await audioRecorderPlayer.startPlayer(
        finalAudio?.audio_url,
      );
      console.log('Audio Info:', audioInfo);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };
  const personContainers = Array.from({length: 20}, (item, index) => (
    <View key={index}>
      <Text style={styles.person1Text}>
        {firstText[index % firstText.length]}
      </Text>
      <Text style={styles.person2Text}>
        {secondText[index % secondText.length]}
      </Text>
    </View>
  ));

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titleTxt}>AI Powered Snak</Text>
      <Text style={styles.txtRecordCounter}>{recordTime}</Text>

      <View style={styles.recordBtnWrapper}>
        <Button
          style={styles.btn}
          // onPress={onStartRecord}
          textStyle={styles.txt}>
          Record
        </Button>

        <Button
          style={[styles.btn, {marginLeft: 12}]}
          // onPress={onStopRecord}
          textStyle={styles.txt}>
          Stop
        </Button>
        {finalAudio && (
          <Button
            textStyle={styles.txt}
            style={[styles.btn, {marginLeft: 12}]}
            // onPress={playAudio}
          >
            Play Audio
          </Button>
        )}
      </View>

      <View style={styles.chatContainer}>
        <ScrollView style={styles.scrollViewContent}>
          {personContainers}
        </ScrollView>
      </View>

      {!!loader && <Text>loading ...</Text>}
      <DelayedText text={finalText?.choices?.[0].message.content} delay={50} />
    </SafeAreaView>
  );
};

const DelayedText = ({text, delay}) => {
  const [displayedText, setDisplayedText] = useState('');

  // useEffect(() => {
  //   let currentIndex = 0;
  //   const intervalId = setInterval(() => {
  //     if (currentIndex < text?.length) {
  //       setDisplayedText((prevText) => prevText + text[currentIndex]);
  //       currentIndex++;
  //     } else {
  //       clearInterval(intervalId);
  //     }
  //   }, .0000001);

  //   return () => {
  //     clearInterval(intervalId); // Clean up the interval on unmount
  //   };
  // }, [text, delay]);

  return (
    <View>
      <Text style={styles.final}>{text}</Text>
    </View>
  );
};

export default Page;
