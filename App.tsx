import React, {useState, useEffect} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  Text,
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
} from 'react-native';

import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
import Button from './components/uis/Button';
import RNFetchBlob from 'rn-fetch-blob';
import Langdropdown from './components/languageSelect';
import {transcribeAudioOrVideo} from './components/assemblyAI';

import {REACT_APP_OPENAI_KEY, REACT_APP_COQUI_KEY} from '@env';

// const ASSEMBLYAI_API_KEY = 'a2bf8820eed141afac65ef44493a6657';
interface Coverstation {
  id: any;
  text: string;
  audio?: string;
}

const dirs = RNFetchBlob.fs.dirs;
const Page = () => {
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [activeLanguage, setActiveLanguage] = useState<any>('');
  const [activeDefaultLang, setActiveDefaultLang] = useState();
  const [userChat, setUserChat] = useState<Coverstation[]>([]);
  const [aiChat, setAiChat] = useState<Coverstation[]>([]);
  const [userText, setUserText] = useState<string>('');
  const [aiText, setAiText] = useState<string>('');
  const [aiVoice, setAiVoice] = useState();
  const [activeSession, setActiveSession] = useState<number>();
  const [audioRecorderPlayer] = useState(new AudioRecorderPlayer());

  useEffect(() => {
    audioRecorderPlayer.setSubscriptionDuration(0.1);
  }, []);

  const onStartRecord = async () => {
    setActiveSession(Date.now());

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

    const path = Platform.select({
      ios: `${Date.now()}.m4a`,

      android: `${dirs.CacheDir}/${Date.now()}.mp3`,
    });

    const uri = await audioRecorderPlayer.startRecorder(path, audioSet);

    audioRecorderPlayer.addRecordBackListener(e => {
      setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
    });

    console.log(`uri: ${uri}`);
  };

  useEffect(() => {
    setUserChat(
      userChat.map(data => {
        if (data.id === activeSession) {
          return {
            ...data,

            text: userText,
          };
        } else {
          return data;
        }
      }),
    );
  }, [userText]);
  useEffect(() => {
    console.log(aiText);
    setAiChat(
      aiChat.map(data => {
        if (data.id === activeSession) {
          return {
            ...data,

            text: aiText,
          };
        } else {
          return data;
        }
      }),
    );
  }, [aiText]);

  useEffect(() => {
    console.log(aiVoice);
    setAiChat(
      aiChat.map(data => {
        if (data.id === activeSession) {
          return {
            ...data,
            audio: aiVoice,
          };
        } else {
          return data;
        }
      }),
    );
  }, [aiVoice]);

  // useEffect(() => {
  //   console.log(userChat, aiChat);
  // }, [userChat, aiChat]);
  const onStopRecord = async () => {
    const result = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();

    setUserChat([
      ...userChat,
      {
        id: activeSession,
        text: '',
        audio: result,
      },
    ]);
    setAiChat([
      ...aiChat,
      {
        id: activeSession,
        text: '',
        audio: '',
      },
    ]);
    const transcription = await transcribeAudioOrVideo(
      result,
      activeLanguage.code,
    );

    if (true) {
      const ttl =
        transcription.text ||
        `Sorry, I tried my best to undertand but not able to trnslate. can you try once more with different sentence.`;

      setUserText(ttl);

      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');
      myHeaders.append('Authorization', `Bearer ${REACT_APP_OPENAI_KEY}`);
      const raw = JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `${ttl}. ${
              transcription.text
                ? 'please answer should be less then 500 characters and keep it short atleast 5 to 6 words minmum. thanks'
                : `kindly translate this to ${activeDefaultLang}`
            } `,
          },
        ],
      });
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch('https://api.openai.com/v1/chat/completions', requestOptions)
        .then(response => response.text())
        .then(result => {
          console.log(JSON.parse(result).choices?.[0].message.content);
          setAiText(JSON.parse(result).choices?.[0].message.content);
          if (JSON.parse(result).choices?.length) {
            const myHeaders = new Headers();
            myHeaders.append('Content-Type', 'application/json');
            myHeaders.append('Authorization', `Bearer ${REACT_APP_COQUI_KEY}`);

            fetch('https://app.coqui.ai/api/v2/samples', {
              method: 'POST',
              headers: myHeaders,
              body: JSON.stringify({
                voice_id: 'd2bd7ccb-1b65-4005-9578-32c4e02d8ddf',
                text: JSON.parse(result).choices?.[0].message.content,
              }),
            })
              .then(response => response.text())
              .then(async result => {
                // const downloadPath = await downloadFile(
                //  JSON.parse(result).audio_url,
                //);
                //console.log(downloadPath);
                //if (downloadPath) {
                setAiVoice(JSON.parse(result).audio_url);
                playAudio(JSON.parse(result).audio_url);
                //}
              })
              .catch(error => console.log('error', error));
          }
        })
        .catch(error => console.log('error', error));
    }
  };

  const playAudio = async (finalAudio: any) => {
    console.log(finalAudio);
    try {
      const audioInfo = await audioRecorderPlayer.startPlayer(finalAudio);
      console.log('Audio Info:', audioInfo);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titleTxt}>AI Powered Snak</Text>
      <View style={{flex: 1, flexDirection: 'row'}}>
        <View>
          <Text>Select Language:</Text>
          <Langdropdown setActiveLanguage={setActiveLanguage} />
        </View>

        <View>
          <Text>Select default Language:</Text>
          <Langdropdown setActiveLanguage={setActiveDefaultLang} defaultLang />
        </View>
      </View>
      <Text style={styles.txtRecordCounter}>{recordTime}</Text>

      <View style={styles.recordBtnWrapper}>
        <Button
          style={styles.btn}
          onPress={onStartRecord}
          textStyle={styles.txt}
          isDisabled={!activeLanguage}>
          Record
        </Button>

        <Button
          style={[styles.btn, {marginLeft: 12}]}
          onPress={onStopRecord}
          textStyle={styles.txt}>
          Stop
        </Button>
      </View>

      {/*
      {!!loader && (
        <View>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )} */}

      <ScrollView>
        {userChat?.map((convo: Coverstation, index: number) => {
          return (
            <View key={index}>
              <TouchableOpacity
                onPress={() => {
                  playAudio(convo.audio);
                }}>
                <Text style={{color: 'white', textAlign: 'left'}}>
                  {convo.text || 'Typing...'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  playAudio(aiChat[index]?.audio);
                }}>
                <Text style={{color: 'red', textAlign: 'right'}}>
                  {aiChat[index]?.text || 'Typing ...'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Page;

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
