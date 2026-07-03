let faceCascade, eyeCascade, profileCascade;
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let statusEl = document.getElementById('status');
let startBtn = document.getElementById('startBtn');
let stopBtn = document.getElementById('stopBtn');
let streaming = false;

startBtn.addEventListener('click', () => {
  startBtn.disabled = true;
  startCamera();
});

stopBtn.addEventListener('click', () => {
  stopCamera();
});

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
    loadCascadeFile('haarcascade_eye.xml'),
    loadCascadeFile('haarcascade_profileface.xml')
  ]).then(() => {
    faceCascade = new cv.CascadeClassifier();
    faceCascade.load('haarcascade_frontalface_default.xml');
    eyeCascade = new cv.CascadeClassifier();
    eyeCascade.load('haarcascade_eye.xml');
    profileCascade = new cv.CascadeClassifier();
    profileCascade.load('haarcascade_profileface.xml');
    statusEl.innerText = "Modeller yüklendi. Kamerayı başlatabilirsiniz.";
    startBtn.disabled = false;
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
      stopBtn.disabled = false;
      statusEl.innerText = "Çalışıyor.";
      requestAnimationFrame(processVideo);
    })
    .catch(err => {
      startBtn.disabled = false;
      statusEl.innerText = "Kameraya erişilemedi: " + err.message;
    });
}

function stopCamera() {
  streaming = false;
  let stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.innerText = "Durduruldu.";
}

function processVideo() {
  if (!streaming) return;

  ctx.drawImage(video, 0, 0, 640, 480);
  let src = cv.imread(canvas);
  let gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  let minSize = new cv.Size(30, 30);
  let maxSize = new cv.Size(0, 0); // 0,0 = üst sınır yok

  // Önden yüz tespiti
  let faces = new cv.RectVector();
  faceCascade.detectMultiScale(gray, faces, 1.1, 4, 0, minSize, maxSize);

  // Sağa bakan yan profil
  let profilesRight = new cv.RectVector();
  profileCascade.detectMultiScale(gray, profilesRight, 1.1, 4, 0, minSize, maxSize);

  // Sola bakan yan profil: görüntüyü yatayda çevirip aynı cascade ile tespit edip
  // koordinatları geri çeviriyoruz (profil cascade'i sadece tek yöne bakıyor)
  let grayFlipped = new cv.Mat();
  cv.flip(gray, grayFlipped, 1);
  let profilesLeftFlipped = new cv.RectVector();
  profileCascade.detectMultiScale(grayFlipped, profilesLeftFlipped, 1.1, 4, 0, minSize, maxSize);

  let allFaces = [];
  for (let i = 0; i < faces.size(); i++) allFaces.push(faces.get(i));
  for (let i = 0; i < profilesRight.size(); i++) allFaces.push(profilesRight.get(i));
  for (let i = 0; i < profilesLeftFlipped.size(); i++) {
    let p = profilesLeftFlipped.get(i);
    allFaces.push({ x: gray.cols - p.x - p.width, y: p.y, width: p.width, height: p.height });
  }
  allFaces = mergeOverlappingRects(allFaces);

  for (let i = 0; i < allFaces.length; i++) {
    let face = allFaces[i];
    let point1 = new cv.Point(face.x, face.y);
    let point2 = new cv.Point(face.x + face.width, face.y + face.height);
    cv.rectangle(src, point1, point2, [255, 0, 0, 255], 2);
    cv.putText(src, 'Yuz', new cv.Point(face.x, face.y - 8), cv.FONT_HERSHEY_SIMPLEX, 0.6, [255, 0, 0, 255], 2);

    let faceRect = new cv.Rect(face.x, face.y, face.width, face.height);
    let roiGray = gray.roi(faceRect);
    let eyes = new cv.RectVector();
    eyeCascade.detectMultiScale(roiGray, eyes, 1.1, 4, 0, minSize, maxSize);
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
  grayFlipped.delete();
  faces.delete();
  profilesRight.delete();
  profilesLeftFlipped.delete();

  requestAnimationFrame(processVideo);
}

// Frontal ve profil cascade'lerinden gelen çakışan kutucukları tekilleştirir
// (aynı yüzü iki cascade birden yakaladığında çift kutu çizmemek için)
function mergeOverlappingRects(rects) {
  let result = [];
  for (let rect of rects) {
    let overlapsExisting = result.some(r => rectOverlap(r, rect) > 0.3);
    if (!overlapsExisting) result.push(rect);
  }
  return result;
}

function rectOverlap(a, b) {
  let x1 = Math.max(a.x, b.x);
  let y1 = Math.max(a.y, b.y);
  let x2 = Math.min(a.x + a.width, b.x + b.width);
  let y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  let intersection = (x2 - x1) * (y2 - y1);
  let smaller = Math.min(a.width * a.height, b.width * b.height);
  return intersection / smaller;
}
