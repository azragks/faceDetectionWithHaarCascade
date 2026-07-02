# Face & Eye Detection with Haar Cascade (Browser Demo)

A fully client-side face and eye detection demo that runs entirely in the browser using **OpenCV.js** and Haar Cascade classifiers — no backend or server required.

## Features
- Real-time face and eye detection from your webcam
- Runs 100% in-browser (OpenCV.js loaded from CDN)
- Haar Cascade XML models loaded directly into OpenCV.js's virtual filesystem via `fetch`

## How It Works
1. `index.html` loads OpenCV.js and `app.js`
2. Once OpenCV.js is ready, `app.js` fetches the cascade XML files from `models/` and writes them into OpenCV.js's virtual filesystem
3. Camera access is requested via `getUserMedia`
4. Each video frame is drawn to a canvas, converted to grayscale, and passed through `CascadeClassifier.detectMultiScale` to detect faces (red boxes) and eyes within each face region (green boxes)

---

# Haarcascade ile Yüz ve Göz Tespiti (Tarayıcı Demosu)

**OpenCV.js** ve Haarcascade sınıflandırıcıları kullanılarak tamamen tarayıcıda çalışan, sunucu gerektirmeyen bir yüz ve göz tespiti demosu.

## Özellikler
- Web kamerasından gerçek zamanlı yüz ve göz tespiti
- Tamamen tarayıcıda çalışır (OpenCV.js CDN üzerinden yüklenir)
- Haarcascade XML modelleri `fetch` ile indirilip OpenCV.js'in sanal dosya sistemine yazılır

## Nasıl Çalışır
1. `index.html`, OpenCV.js'i ve `app.js`'i yükler
2. OpenCV.js hazır olduğunda `app.js`, `models/` klasöründeki cascade XML dosyalarını indirip OpenCV.js'in sanal dosya sistemine yazar
3. `getUserMedia` ile kamera erişimi istenir
4. Her video karesi canvas'a çizilir, gri tona çevrilir ve `CascadeClassifier.detectMultiScale` ile yüzler (kırmızı kutu) ve yüz bölgesindeki gözler (yeşil kutu) tespit edilir

