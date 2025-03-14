let port;  // Web Serial 객체 - 시리얼 통신을 위한 포트
let brightness = 0;  // 현재 LED 밝기 값
let mode = "NORMAL";  // 현재 신호등 모드 - NORMAL, Red Mode, Blink Mode, Power OFF 등
let ledState = "None";  // 현재 LED 상태 저장 - Red, Yellow, Green, ALL, None 등
let redTime = 2000, yellowTime = 500, greenTime = 2000; // 각 LED가 켜지는 시간

// 초기 설정을 수행하는 함수
function setup() {
  createCanvas(400, 300); // 400x300 크기의 캔버스를 생성
  port = createSerial();  // 시리얼 객체 생성

  let usedPorts = usedSerialPorts(); // 사용 가능한 시리얼 포트 목록을 가져옴
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], 9600); // 첫 번째 시리얼 포트를 9600 보드레이트로 염
  }

  // 시리얼 연결 버튼 생성 및 클릭 이벤트 설정
  let connectBtn = createButton("Connect Serial");
  connectBtn.position(20, 20);
  connectBtn.mousePressed(connectBtnClick);

  // 시리얼 연결 해제 버튼 생성 및 클릭 이벤트 설정
  let disconnectBtn = createButton("Disconnect Serial");
  disconnectBtn.position(140, 20);
  disconnectBtn.mousePressed(() => {
    if (port.opened()) {
      port.close();
      console.log("Serial Disconnected"); // 시리얼 연결이 해제되었음을 출력
    } else {
      console.log("Serial is already closed"); // 이미 연결이 해제된 상태임을 출력
    }
  });

  // 슬라이더 UI 요소 생성 - 각 신호등의 지속 시간을 조절
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

// 시리얼 연결 버튼을 클릭할 때 실행되는 함수
function connectBtnClick() {
  if (!port.opened()) {
    port.open(9600); // 시리얼 포트가 열려 있지 않으면 9600 보드레이트로 연결
  } else {
    port.close(); // 이미 열려 있으면 닫기
  }
}

// 슬라이더 값이 변경될 때 해당 값을 아두이노로 전송하는 함수
function changeSlider() {
  if (port.opened()) {
    let redValue = redSlider.value();
    let yellowValue = yellowSlider.value();
    let greenValue = greenSlider.value();
    
    let data = `RED:${redValue}\nYELLOW:${yellowValue}\nGREEN:${greenValue}\n`;
    port.write(data); // 아두이노로 데이터 전송
    console.log("Sent to Arduino:", data);
  } else {
    console.log("Serial Port is not open"); // 시리얼 포트가 열려 있지 않으면 메시지 출력
  }
}

// 아두이노에서 시리얼 데이터를 읽어오는 함수
function readSerialData() {
  if (port.available() > 0) {
    let data = port.readUntil("\n");  // 개행 문자("\n")가 올 때까지 데이터 읽기
    data = data.trim();  // 불필요한 공백 제거
    if (data.length > 0) {
      console.log("Received from Arduino:", data); // 아두이노에서 받은 데이터를 콘솔에 출력

      let parts = data.split(", "); // ","를 기준으로 데이터 분리
      if (parts.length >= 3) {
        mode = parts[0].split(":")[1] || mode; // 모드 정보 저장
        let detectedLedState = parts[1].split(":")[1] || ledState;  // LED 상태 저장
        brightness = parseInt(parts[2].split(":")[1]) || brightness; // 밝기 값 저장

        // 🔹 모드에 따른 LED 상태 강제 설정
        if (mode === "Red Mode") {
          ledState = "Red";  // Red Mode에서는 항상 Red로 고정
        } else if (mode === "Blink Mode") {
          ledState = "ALL";  // Blink Mode에서는 모든 LED가 깜빡이도록 설정
        } else if (mode === "Power OFF") {
          ledState = "None"; // Power OFF 모드에서는 모든 LED를 끔
        } else {
          ledState = detectedLedState;  // 일반 모드에서는 아두이노에서 받은 상태 유지
        }
      }
    }
  }
}

//화면을 지속적으로 업데이트하는 함수
function draw() {
  background(220); // 배경을 밝은 회색(220)으로 설정
  
  //아두이노에서 온 데이터를 지속적으로 읽어 화면에 반영
  readSerialData();

  fill(0);
  textSize(16);
  text("Traffic Light Mode: " + mode, 20, 70); // 현재 모드 출력
  text("Current LED: " + ledState, 20, 110); // 현재 LED 상태 출력
  text("Brightness: " + brightness, 20, 150); // 현재 밝기 값 출력

  let alphaValue = map(brightness, 0, 255, 50, 255); // 밝기 값을 투명도(alpha) 값으로 변환
  let blinkEffect = (frameCount % 30 < 15) ? alphaValue : 0; // 깜빡이는 효과

  noStroke();

  //Red LED 표시
  if (mode === "Blink Mode") {
    fill(255, 0, 0, blinkEffect);  // Blink Mode에서는 빨간색이 깜빡임
  } else if (mode === "Red Mode" || ledState === "Red") {
    fill(255, 0, 0, alphaValue); // Red Mode 또는 Red 상태일 때 빨간 LED 점등
  } else {
    fill(100, 0, 0, 50); // 꺼진 상태일 때 흐리게 표시
  }
  circle(100, 200, 50);

  //Yellow LED 표시
  if (mode === "Blink Mode") {
    fill(255, 255, 0, blinkEffect);  // Blink Mode에서는 노란색이 깜빡임
  } else if (ledState === "Yellow") {
    fill(255, 255, 0, alphaValue); // Yellow 상태일 때 노란 LED 점등
  } else {
    fill(100, 100, 0, 50); // 꺼진 상태일 때 흐리게 표시
  }
  circle(200, 200, 50);

  //Green LED 표시
  if (mode === "Blink Mode") {
    fill(0, 255, 0, blinkEffect);  // Blink Mode에서는 초록색이 깜빡임
  } else if (ledState === "Green") {
    fill(0, 255, 0, alphaValue); // Green 상태일 때 초록 LED 점등
  } else {
    fill(0, 100, 0, 50); // 꺼진 상태일 때 흐리게 표시
  }
  circle(300, 200, 50);
}
