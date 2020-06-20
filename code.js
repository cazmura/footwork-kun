/* eslint-disable no-undef, no-unused-vars */
let servo;
obniz = new Obniz("OBNIZ_ID_HERE");

obniz.onconnect = async () => {
  obniz.display.print("ready");
  let usb = obniz.wired("USB", { gnd: 11, vcc: 8 });
  usb.on();
  servo = obniz.wired("ServoMotor", { signal: 0, vcc: 1, gnd: 2 });
};
let utils = new Utils("errorMessage");
let faceCascadeFile = "haarcascade_frontalface_default.xml";
utils.createFileFromUrl(
  faceCascadeFile,
  "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml",
  () => {
    startAndStop.removeAttribute("disabled");
  }
);
let streaming = false;
let videoInput = document.getElementById("videoInput");
let startAndStop = document.getElementById("startAndStop");
let canvasOutput = document.getElementById("canvasOutput");
let canvasContext = canvasOutput.getContext("2d");
startAndStop.addEventListener("click", () => {
  if (!streaming) {
    utils.clearError();
    navigator.mediaDevices =
      navigator.mediaDevices ||
      (navigator.mozGetUserMedia || navigator.webkitGetUserMedia
        ? {
            getUserMedia: function(c) {
              return new Promise(function(y, n) {
                (
                  navigator.mozGetUserMedia || navigator.webkitGetUserMedia
                ).call(navigator, c, y, n);
              });
            }
          }
        : null);
    if (!navigator.mediaDevices) {
      console.log("getUserMedia() not supported.");
      return;
    }
    const medias = { audio: false, video: { facingMode: "user" } };
    navigator.mediaDevices
      .getUserMedia(medias)
      .then(function(stream) {
        streaming = true;
        var video = document.getElementById("videoInput");
        video.src = window.URL.createObjectURL(stream);
        video.onloadedmetadata = function(e) {
          video.play();
          onVideoStarted();
        };
      })
      .catch(function(err) {
        console.error(
          "mediaDevice.getUserMedia() error:" + (error.message || error)
        );
      });
  } else {
    utils.stopCamera();
    onVideoStopped();
  }
});
function onVideoStarted() {
  startAndStop.innerText = "Stop";
  start();
}
function onVideoStopped() {
  streaming = false;
  canvasContext.clearRect(0, 0, canvasOutput.width, canvasOutput.height);
  startAndStop.innerText = "Start";
}
async function start() {
  let video = document.getElementById("videoInput");
  let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  let dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  let gray = new cv.Mat();
  let cap = new cv.VideoCapture(video);
  let faces = new cv.RectVector();
  let classifier = new cv.CascadeClassifier();
  let result = classifier.load("haarcascade_frontalface_default.xml");
  const FPS = 30;
  function processVideo() {
    try {
      if (!streaming) {
        // clean and stop.
        src.delete();
        dst.delete();
        gray.delete();
        faces.delete();
        classifier.delete();
        return;
      }
      let begin = Date.now(); // start processing.
      cap.read(src);
      src.copyTo(dst);
      cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0); // detect faces.
      classifier.detectMultiScale(gray, faces, 1.1, 3, 0); // draw faces.
      for (let i = 0; i < faces.size(); ++i) {
        let face = faces.get(i);
        let point1 = new cv.Point(face.x, face.y);
        let point2 = new cv.Point(face.x + face.width, face.y + face.height);
        cv.rectangle(dst, point1, point2, [255, 0, 0, 255]);
      }
      cv.imshow("canvasOutput", dst);
      if (servo && faces.size() > 0) {
        let face = faces.get(0);
        servo.angle(((320 - (face.x + face.width / 2)) * 180) / 320);
      } // schedule the next one.
      let delay = 1000 / FPS - (Date.now() - begin);
      setTimeout(processVideo, delay);
    } catch (err) {
      console.error(err);
    }
  } // schedule the first one.
  setTimeout(processVideo, 0);
}
