let faceCascade, eyeCascade;
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let statusEl = document.getElementById('status');
let streaming = false;

function onOpenCvReady() {
  // Script indi ama WASM çalışma zamanı henüz hazır olmayabilir;
  // cv.CascadeClassifier gibi API'ler ancak onRuntimeInitialized'dan sonra kullanılabilir
  cv['onRuntimeInitialized'] = () => {
    statusEl.innerText = "OpenCV.js yüklendi, model dosyaları indiriliyor...";
    loadModelsAndStart();
  };
}

function loadModelsAndStart() {
  // XML modellerini sunucuya ihtiyaç duymadan OpenCV.js'in sanal dosya sistemine yüklüyoruz
  Promise.all([
    loadCascadeFile('haarcascade_frontalface_default.xml'),
    loadCascadeFile('haarcascade_eye.xml')
  ]).then(() => {
    faceCascade = new cv.CascadeClassifier();
    faceCascade.load('haarcascade_frontalface_default.xml');
    eyeCascade = new cv.CascadeClassifier();
    eyeCascade.load('haarcascade_eye.xml');
    statusEl.innerText = "Modeller yüklendi. Kamera izni isteniyor...";
    startCamera();
  }).catch(err => {
    statusEl.innerText = "Model dosyaları yüklenemedi: " + err.message;
  });
}

// XML dosyasını fetch ile indirip OpenCV.js'in sanal dosya sistemine yazar
function loadCascadeFile(filename) {
  return fetch('models/' + filename)
    .then(response => response.arrayBuffer())
    .then(buffer => {
      cv.FS_createDataFile('/', filename, new Uint8Array(buffer), true, false, false);
    });
}

function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.innerText = "Kamera API'sine erişilemiyor.";
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
    .then(stream => {
      video.srcObject = stream;
      video.play();
      streaming = true;
      statusEl.innerText = "Çalışıyor.";
      requestAnimationFrame(processVideo);
    })
    .catch(err => {
      statusEl.innerText = "Kameraya erişilemedi: " + err.message;
    });
}

function processVideo() {
  if (!streaming) return;

  ctx.drawImage(video, 0, 0, 640, 480);
  let src = cv.imread(canvas);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  let faces = new cv.RectVector();
  let msize = new cv.Size(0, 0);
  faceCascade.detectMultiScale(gray, faces, 1.3, 5, 0, msize, msize);

  for (let i = 0; i < faces.size(); i++) {
    let face = faces.get(i);
    let point1 = new cv.Point(face.x, face.y);
    let point2 = new cv.Point(face.x + face.width, face.y + face.height);
    cv.rectangle(src, point1, point2, [255, 0, 0, 255], 2);
    cv.putText(src, 'Yuz', new cv.Point(face.x, face.y - 8), cv.FONT_HERSHEY_SIMPLEX, 0.6, [255, 0, 0, 255], 2);

    let roiGray = gray.roi(face);
    let eyes = new cv.RectVector();
    eyeCascade.detectMultiScale(roiGray, eyes, 1.3, 5, 0, msize, msize);
    for (let j = 0; j < eyes.size(); j++) {
      let eye = eyes.get(j);
      let ep1 = new cv.Point(face.x + eye.x, face.y + eye.y);
      let ep2 = new cv.Point(face.x + eye.x + eye.width, face.y + eye.y + eye.height);
      cv.rectangle(src, ep1, ep2, [0, 255, 0, 255], 2);
      cv.putText(src, 'Goz', new cv.Point(face.x + eye.x, face.y + eye.y - 4), cv.FONT_HERSHEY_SIMPLEX, 0.5, [0, 255, 0, 255], 1);
    }
    roiGray.delete();
    eyes.delete();
  }

  cv.imshow(canvas, src);
  src.delete();
  gray.delete();
  faces.delete();

  requestAnimationFrame(processVideo);
}
