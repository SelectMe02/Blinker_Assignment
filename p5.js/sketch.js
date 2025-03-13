let port;  // Web Serial 객체
let brightness = 0;
let mode = "NORMAL";
let ledState = "None";  // 현재 LED 상태 저장
let redTime = 2000, yellowTime = 500, greenTime = 2000;

function setup() {
  createCanvas(400, 300);
  port = createSerial();

  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], 9600);
  }

  let connectBtn = createButton("Connect Serial");
  connectBtn.position(20, 20);
  connectBtn.mousePressed(connectBtnClick);

  let disconnectBtn = createButton("Disconnect Serial");
  disconnectBtn.position(140, 20);
  disconnectBtn.mousePressed(() => {
    if (port.opened()) {
      port.close();
      console.log("Serial Disconnected");
    } else {
      console.log("Serial is already closed");
    }
  });

  createP("Red Duration:");
  redSlider = createSlider(500, 5000, 2000);
  redSlider.mouseReleased(changeSlider);

  createP("Yellow Duration:");
  yellowSlider = createSlider(200, 2000, 500);
  yellowSlider.mouseReleased(changeSlider);

  createP("Green Duration:");
  greenSlider = createSlider(500, 5000, 2000);
  greenSlider.mouseReleased(changeSlider);
}

function connectBtnClick() {
  if (!port.opened()) {
    port.open(9600);
  } else {
    port.close();
  }
}

// 🔹 슬라이더 값이 변경될 때 아두이노로 전송
function changeSlider() {
  if (port.opened()) {
    let redValue = redSlider.value();
    let yellowValue = yellowSlider.value();
    let greenValue = greenSlider.value();
    
    let data = `RED:${redValue}\nYELLOW:${yellowValue}\nGREEN:${greenValue}\n`;
    port.write(data);
    console.log("Sent to Arduino:", data);
  } else {
    console.log("Serial Port is not open");
  }
}


function readSerialData() {
  if (port.available() > 0) {
    let data = port.readUntil("\n");  // 개행 문자까지 읽기
    data = data.trim();  // 불필요한 공백 제거
    if (data.length > 0) {
      console.log("Received from Arduino:", data);

      let parts = data.split(", ");
      if (parts.length >= 3) {
        mode = parts[0].split(":")[1] || mode;
        let detectedLedState = parts[1].split(":")[1] || ledState;  
        brightness = parseInt(parts[2].split(":")[1]) || brightness;

        // 🔹 모드에 따른 Current LED 값을 강제로 설정
        if (mode === "Red Mode") {
          ledState = "Red";  // Red Mode에선 항상 Red로 고정
        } else if (mode === "Blink Mode") {
          ledState = "ALL";  // Blink Mode에선 "ALL"
        } else if (mode === "Power OFF") {
          ledState = "None"; // Power OFF에선 "None"
        } else {
          ledState = detectedLedState;  // 정상적인 동작 루틴 유지
        }
      }
    }
  }
}

function draw() {
  background(220);
  
  // 🔹 아두이노에서 온 데이터를 지속적으로 읽어 화면에 반영
  readSerialData();

  fill(0);
  textSize(16);
  text("Traffic Light Mode: " + mode, 20, 70);
  text("Current LED: " + ledState, 20, 110);
  text("Brightness: " + brightness, 20, 150);
 
  let alphaValue = map(brightness, 0, 255, 50, 255); // 🔹 brightness 값을 투명도(alpha)로 변환하여 반영

  // 🔹 LED 모드에 따른 색상 반영 (투명도 적용)
  if (mode === "Red Mode") {
    fill(255, 0, 0, alphaValue);
  } else if (mode === "Blink Mode") {
    fill(255, 255, 0, frameCount % 30 < 15 ? alphaValue : 0);  // 깜빡이는 효과
  } else if (mode === "Power OFF") {
    fill(0, 0, 0, 255);
  } else {
    fill(
      ledState === "Red" ? [255, 0, 0, alphaValue] :
      ledState === "Yellow" ? [255, 255, 0, alphaValue] :
      ledState === "Green" ? [0, 255, 0, alphaValue] :
      ledState === "Blinking" ? [255, 255, 255, frameCount % 30 < 15 ? alphaValue : 0] :
      [0, 0, 0, 255] // LED OFF 상태
    );
  }

  circle(200, 200, 50);
}
