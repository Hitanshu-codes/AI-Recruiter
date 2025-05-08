// Import required modules
//const Microphone = require("node-microphone");
import Microphone from "node-microphone";
//const fs = require("fs");
import fs from "fs";
import {jobDescription,CV} from "./data.js"
//const ffmpeg = require("fluent-ffmpeg");
import ffmpeg from "fluent-ffmpeg";
//const ffmpegPath = require("ffmpeg-static");
import ffmpegPath from "ffmpeg-static";
//const readline = require("readline");
import readline from "readline";

import { Readable, Writable } from 'stream';
//const axios = require("axios");
import axios from "axios";
//const FormData = require("form-data");
// import FormData from "form-data";
import { createClient } from "@deepgram/sdk";
//const Speaker = require("speaker");
import Speaker from "speaker";
//const OpenAI = require("openai");
import OpenAI from "openai";
import Groq from "groq-sdk";
//require("dotenv").config();

// Set the path for FFmpeg, used for audio processing
ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize OpenAI API client with the provided API key
const secretKey = "";
const openai = new OpenAI({
  apiKey:secretKey,
});
const groq = new Groq({ apiKey: '' });

// Variables to store chat history and other components
let chatHistory = []; // To store the conversation history
let mic, outputFile, micStream, rl; // Microphone, output file, microphone stream, and readline interface
let t1,t2,t3,t4,t5,t6;

console.log(
  `\n# # # # # # # # # # # # # # # # # # # # #\n# Welcome to Sheeghram #\n# # # # # # # # # # # # # # # # # # # # #\n`
);



// Function to set up the readline interface for user input
const setupReadlineInterface = () => {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true, // Make sure the terminal can capture keypress events
  });

  readline.emitKeypressEvents(process.stdin, rl);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Handle keypress events
  process.stdin.on("keypress", (str, key) => {
    if (
      key &&
      (key.name.toLowerCase() === "v" ||
        key.name.toLowerCase() === "enter"||key.name.toLowerCase()==="return")
    ) {

      if (micStream) {
        stopRecordingAndProcess();
      } else {
        startRecording();
      }
    } else if (key && key.ctrl && key.name === "c") {
      process.exit(); // Handle ctrl+c for exiting
    } else if (key) {
      console.log(key);
      console.log(key.name);
      console.log("Exiting application...");
      process.exit(0);
    }
  });

  console.log("Press Enter when you're ready to start speaking.");
};

// Function to start recording audio from the microphone
const startRecording = () => {
  mic = new Microphone();
  outputFile = fs.createWriteStream("output.mp3");
  micStream = mic.startRecording();

  // Write incoming data to the output file
  micStream.on("data", (data) => {
    outputFile.write(data);
  });

  // Handle microphone errors
  micStream.on("error", (error) => {
    console.error("Error: ", error);
  });

  console.log("Recording... Press Enter to stop");
};

// Function to stop recording and process the audio
const stopRecordingAndProcess = () => {
  mic.stopRecording();
  outputFile.end();
  console.log(`Recording stopped, processing audio...`);
  t1=Date.now();
  transcribeAndChat(); // Transcribe the audio and initiate chat
};

// // Default voice setting for text-to-speech
// const inputVoice = "echo"; // https://platform.openai.com/docs/guides/text-to-speech/voice-options
// const inputModel = "tts-1"; // https://platform.openai.com/docs/guides/text-to-speech/audio-quality

// Function to convert text to speech and play it using Speaker
// const axios = require('axios');
// const Speaker = require('speaker');
// const ffmpeg = require('fluent-ffmpeg');

async function streamedAudio(inputText) {
    
  function segmentTextBySentence(text) {
    return text.match(/[^.!?]+[.!?]/g).map((sentence) => sentence.trim());
  }

  const url = "https://api.elevenlabs.io/v1/text-to-speech/IMzcdjL6UK1gZxag6QAU/stream";

  const headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": ""
  };

  const segments = segmentTextBySentence(inputText);

  async function synthesizeAudio(text) {
    
    const data = {
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.3,
        use_speaker_boost: true
      }
    };
    const response = await axios.post(url, data, {
        headers: headers,
        responseType: 'stream'
      });
      t6=Date.now();
      console.log(`tts latency: ${t6-t5}`)
  
    return new Promise((resolve, reject) => {
        // Configure speaker settings
        const speaker = new Speaker({
          channels: 2, // Stereo audio
          bitDepth: 16,
          sampleRate: 44100,
        });
  
        // Convert the response to the desired audio format and play it
        const stream = ffmpeg(response.data)
          .toFormat("s16le")
          .audioChannels(2)
          .audioFrequency(44100)
          .pipe(speaker);
  
        speaker.on('close', resolve);
        stream.on('error', reject);
      });

    
    
  }

  try {
    for (const segment of segments) {
       t5=Date.now();
      await synthesizeAudio(segment);
    }
  } catch (error) {
    // Handle errors from the API or the audio processing
    if (error.response) {
      console.error(
        `Error with HTTP request: ${error.response.status} - ${error.response.statusText}`
      );
    } else {
      console.error(`Error in streamedAudio: ${error.message}`);
    }
  }
}


// Function to transcribe audio to text and send it to the chatbot
async function transcribeAndChat() {
  // const filePath = "output.mp3";
  // The API key we created in step 3
  const deepgramApiKey = "";

  // Replace with your file path and audio mimetype
  const pathToFile = "output.mp3";

  // Initializes the Deepgram SDK
  const deepgram = createClient(deepgramApiKey);

  try {
    
    // const transcriptionResponse = await openai.audio.transcriptions.create({
    //     file: fs.createReadStream(filePath),
    //     model: "whisper-1",
    //     language:"en",
    //   });
      const {result,error} = await deepgram.listen.prerecorded.transcribeFile(
        fs.readFileSync(pathToFile),
        {smart_format: true, model: 'nova-2', language: 'en-IN' },
      );

    // Extract transcribed text from the response
    if(error) throw error;
    if (!error) {console.log(result.results.channels[0].alternatives[0].transcript);}
    const transcribedText =result.results.channels[0].alternatives[0].transcript;
    t2=Date.now();
    console.log(`>> You said ${t2-t1}: ${transcribedText}`);

    // Prepare messages for the chatbot, including the transcribed text
    const messages = [
      {
        role: "system",
        content:
          `You are a recruiter named Sheeghram at WorkIndia responsible for conducting the first round of Screening interviews for candidates. The position you are hiring Job Description:${jobDescription}. You will conduct this interview in a professional and brief manner. You will not digress from the topic and if the candidate does so, bring them back to topic. Important instruction - this will be in the form of a conversation. You have to wait for a response and only then proceed once you get the response from the candidate and go one by one.Also all the questions and responses should have minimum number of sentences.candidate's CV :${CV} whom you are interviewing. Pickup their names and past experiences from there.
      The interview call should follow this structure. The main objective of this call is to gather info about the candidate and check their interest in pursuing this role further or not.
      
      1. At the start, introduce yourself (as a recruiter). This cannot be more than 2 sentences.
      2. Then politely ask if this is the correct time to have a conversation. If they say yes, ask the next question. If they say no, ask them for a good time to call back.
      3. If they say yes, then briefly explain the Opening (role) and ask if they are looking for a change and interested in this? Keep this brief to 2-3 sentences only.
      4. Then explain about the Company and what the company does.
      5. Then explain the key responsibilities of the role.
      6. Ask any follow-up questions and answer them as per the Job description or about the company. Do not answer off-topic questions or make any promises of employment to the candidate.
      7. Next, ask them 2 questions about any two roles & responsibilities mentioned in their CV (from the past 2 companies they have worked for)
      8. Inform them the position is based out of Bangalore and it is working from the office all 5 days of the week.
      9. Check if they are ok with Point 8
      10. Explain the next steps of the process. Do NOT promise anything to the candidate ever.
      11. End the call if there are no follow-up questions.`,
      },
      ...chatHistory,
      { role: "user", content: transcribedText },
    ];
    t3=Date.now();
    // Send messages to the chatbot and get the response
    const chatResponse = await groq.chat.completions.create({
      messages: messages,
      model: "llama3-8b-8192"
    //   stream: true
    });
    //let chatResponseText;

    // Extract the chat response.
    const chatResponseText = chatResponse.choices[0]?.message?.content||"";
    t4=Date.now();
    // for await (const chunk of chatResponse) {
    //    await streamedAudio(chunk.choices[0]?.delta?.content || "");
    //     chatResponseText=chatResponseText+chunk.choices[0]?.delta?.content;
    // }

    // Update chat history with the latest interaction
    chatHistory.push(
      { role: "user", content: transcribedText },
      { role: "assistant", content: chatResponseText }
    );

    // Convert the chat response to speech and play + log it to the terminal
    await streamedAudio(chatResponseText);
    console.log(`>> Assistant said ${t4-t3}: ${chatResponseText}`);

    // Reset microphone stream and prompt for new recording
    micStream = null;
    console.log("Press Enter to speak again, or any other key to quit.\n");
  } catch (error) {
    // Handle errors from the transcription or chatbot API
    if (error.response) {
      console.error(
        `Error: ${error.response.status} - ${error.response.statusText}`
      );
    } else {
      console.error("Error:", error.message);
    }
  }
}

// Initialize the readline interface
setupReadlineInterface();
