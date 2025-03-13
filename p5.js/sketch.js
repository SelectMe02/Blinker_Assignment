let port;  // 시리얼 통신을 위한 포트 객체 생성
let brightness = 0;  // 현재 밝기 값 (0~255 범위)
let mode = "NORMAL";  // 현재 모드 - 기본적으로 "NORMAL" 모드
let ledState = "None";  // 현재 LED 상태 저장 - 초기값: "None"
let redTime = 2000, yellowTime = 500, greenTime = 2000;  // 기본 신호등 시간 설정. 빨간색 - 2초, 노랜색 - 0.5초, 초록색 2초

function setup() {
  createCanvas(400, 300);
  port = createSerial();  // 시리얼 통신 객체 생성

  let usedPorts = usedSerialPorts();  // 사용 가능한 시리얼 포트 목록 가져오기
  if (usedPorts.length > 0) {  
    port.open(usedPorts[0], 9600);  // 첫 번째 포트로 9600bps 속도로 연결
  }

  // "Connect Serial" 버튼 생성 및 이벤트 설정
  let connectBtn = createButton("Connect Serial");
  connectBtn.position(20, 20);
  connectBtn.mousePressed(connectBtnClick);

  // "Disconnect Serial" 버튼 생성 및 이벤트 설정
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

  // 신호등 색상별 지속시간 슬라이더 생성
  createP("Red Duration:");  // 빨간불 지속 시간 조절
  redSlider = createSlider(500, 5000, 2000);
  redSlider.mouseReleased(changeSlider);

  createP("Yellow Duration:");  // 노란불 지속 시간 조절
  yellowSlider = createSlider(200, 2000, 500);
  yellowSlider.mouseReleased(changeSlider);

  createP("Green Duration:");  // 초록불 지속 시간 조절
  greenSlider = createSlider(500, 5000, 2000);
  greenSlider.mouseReleased(changeSlider);
}

// 시리얼 연결 및 해제 버튼 클릭 시 동작
function connectBtnClick() {
  if (!port.opened()) {
    port.open(9600);  // 시리얼 포트 열기
  } else {
    port.close();  // 시리얼 포트 닫기
  }
}

// 슬라이더 값 변경 시 아두이노로 새로운 지속 시간 전송
function changeSlider() {
  if (port.opened()) {
    let redValue = redSlider.value();  // 빨간불 지속 시간
    let yellowValue = yellowSlider.value();  // 노란불 지속 시간
    let greenValue = greenSlider.value();  // 초록불 지속 시간
    
    let data = `RED:${redValue}\nYELLOW:${yellowValue}\nGREEN:${greenValue}\n`;
    port.write(data);  // 데이터를 아두이노로 전송
    console.log("Sent to Arduino:", data);
  } else {
    console.log("Serial Port is not open");
  }
}

// 시리얼 데이터 수신 및 처리
function readSerialData() {
  if (port.available() > 0) {
    let data = port.readUntil("\n");  // 개행 문자('\n')까지 읽기
    data = data.trim();  // 불필요한 공백 제거
    if (data.length > 0) {
      console.log("Received from Arduino:", data);

      let parts = data.split(", ");  // 데이터 구분
      if (parts.length >= 3) {
        mode = parts[0].split(":")[1] || mode;  // 현재 모드 업데이트
        let detectedLedState = parts[1].split(":")[1] || ledState;  
        brightness = parseInt(parts[2].split(":")[1]) || brightness;  // 밝기 값 업데이트

        // 모드에 따른 LED 상태 강제 설정
        if (mode === "Red Mode") {
          ledState = "Red";  // Red Mode에서는 항상 Red 고정
        } else if (mode === "Blink Mode") {
          ledState = "ALL";  // Blink Mode에서는 "ALL" 상태
        } else if (mode === "Power OFF") {
          ledState = "None"; // Power OFF 상태에서는 "None"
        } else {
          ledState = detectedLedState;  // 일반 모드에서는 수신된 값 반영
        }
      }
    }
  }
}

function draw() {
  background(220);  // 배경색 설정 (회색)

  // 아두이노로부터 지속적으로 데이터 수신
  readSerialData();

  fill(0);
  textSize(16);
  text("Traffic Light Mode: " + mode, 20, 70);  // 현재 모드 표시
  text("Current LED: " + ledState, 20, 110);  // 현재 LED 상태 표시
  text("Brightness: " + brightness, 20, 150);  // 현재 밝기 표시
 
  let alphaValue = map(brightness, 0, 255, 50, 255);  // 밝기 값을 투명도 값으로 변환

  // LED 모드에 따른 색상 및 투명도 적용
  if (mode === "Red Mode") {
    fill(255, 0, 0, alphaValue);  // 빨간색 LED
  } else if (mode === "Blink Mode") {
    fill(255, 255, 0, frameCount % 30 < 15 ? alphaValue : 0);  // 깜빡이는 효과
  } else if (mode === "Power OFF") {
    fill(0, 0, 0, 255);  // LED 꺼짐
  } else {
    fill(
      ledState === "Red" ? [255, 0, 0, alphaValue] :  // 빨간색
      ledState === "Yellow" ? [255, 255, 0, alphaValue] :  // 노란색
      ledState === "Green" ? [0, 255, 0, alphaValue] :  // 초록색
      ledState === "Blinking" ? [255, 255, 255, frameCount % 30 < 15 ? alphaValue : 0] :  // 깜빡이는 상태
      [0, 0, 0, 255]  // LED OFF 상태
    );
  }

  circle(200, 200, 50);  // LED를 표현하는 원 그리기
}
