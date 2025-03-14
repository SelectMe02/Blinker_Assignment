#include <Arduino.h>
#include <TaskScheduler.h>
#include <PinChangeInterrupt.h>

// 신호등 LED 핀 번호 정의
const int red = 11;    
const int yellow = 10;  
const int green = 9;     

// 스위치 핀 번호 정의
const int switch1 = 3;    // 스위치 1 (Red Mode 토글)
const int switch2 = 4;    // 스위치 2 (Blink Mode 토글)
const int switch3 = 5;    // 스위치 3 (Power OFF 토글)

// 가변 저항 핀 번호
const int potentiometer = A0;

// TaskScheduler 객체 생성
Scheduler ts;

// 신호등 상태를 관리하는 함수 선언
void taskRed();      
void taskYellow();   
void taskGreen();    
void blinkGreen();   
void finishGreen();  
void taskYellow2();  
void blinkAll();     
void adjustBrightness(); 


void switch1_ISR();   // Red Mode 토글 스위치 인터럽트
void switch2_ISR();   // Blink Mode 토글 스위치 인터럽트
void switch3_ISR();   // Power OFF 토글 스위치 인터럽트


void sendStatusToWeb(); // 현재 LED 상태 및 모드 정보를 시리얼 출력
void serialReceive();  // 시리얼 데이터 수신 함수

// 신호등 모드 및 LED 상태 변수
bool redMode = false;      
bool blinkMode = false;    
bool powerOff = false;     

bool stateRed = false;    
bool stateYellow = false; 
bool stateGreen = false;  
bool stateYellow2 = false;
bool stateblinkGreen = false;

// 신호등 지속 시간 및 밝기 설정
int redDuration = 2000;     // 빨간불 지속 시간 
int yellowDuration = 500;   // 노란불 지속 시간
int greenDuration = 2000;   // 초록불 지속 시간
int brightness = 255;       // LED 밝기 (0~255)

// TaskScheduler를 이용한 Task 생성 - 각 신호 변경 작업 관리
Task tRed(0, TASK_ONCE, &taskRed, &ts, false);
Task tYellow(0, TASK_ONCE, &taskYellow, &ts, false);
Task tGreen(0, TASK_ONCE, &taskGreen, &ts, false);
Task tBlinkGreen(300, 6, &blinkGreen, &ts, false);
Task tFinishGreen(100, TASK_ONCE, &finishGreen, &ts, false);
Task tYellow2(0, TASK_ONCE, &taskYellow2, &ts, false);
Task tBlinkAll(500, TASK_FOREVER, &blinkAll, &ts, false);
Task tAdjustBrightness(200, TASK_FOREVER, &adjustBrightness, &ts, true);
Task tSendStatus(500, TASK_FOREVER, &sendStatusToWeb, &ts, true);

void setup() {
    pinMode(red, OUTPUT);
    pinMode(yellow, OUTPUT);
    pinMode(green, OUTPUT);
    pinMode(switch1, INPUT_PULLUP);
    pinMode(switch2, INPUT_PULLUP);
    pinMode(switch3, INPUT_PULLUP);

    // 핀 변경 인터럽트 설정 - 스위치 입력 감지
    attachPCINT(digitalPinToPCINT(switch1), switch1_ISR, FALLING);
    attachPCINT(digitalPinToPCINT(switch2), switch2_ISR, FALLING);
    attachPCINT(digitalPinToPCINT(switch3), switch3_ISR, FALLING);

    Serial.begin(9600);

    tRed.setInterval(redDuration);
    tRed.enable();
}

void loop() {
    ts.execute();  // TaskScheduler 실행
    serialReceive();  // 시리얼 데이터 수신
}

void sendStatusToWeb() {
    // 현재 LED의 동작 모드를 웹으로 전송하는 함수
    Serial.print("MODE:");
    
    if (redMode) {
        Serial.print("Red Mode"); // 빨간색 모드
    } else if (blinkMode) {
        Serial.print("Blink Mode"); // 깜빡임 모드
    } else if (powerOff) {
        Serial.print("Power OFF"); // 전원 꺼짐 모드
    } else {
        Serial.print("NORMAL"); // 일반 모드
    }

    Serial.print(", LED:");

    // 현재 켜져 있는 LED 색상 전송
    if (stateRed) {
        Serial.print("Red");
    } else if (stateYellow || stateYellow2) {
        Serial.print("Yellow");
    } else if (stateGreen || stateblinkGreen) {
        Serial.print("Green");
    } else if (blinkMode) {
        Serial.print("Blinking");
    } else {
        Serial.print("OFF"); // 모든 LED가 꺼진 상태
    }

    Serial.print(", Brightness:");
    Serial.println(brightness); // 현재 밝기 값 전송
}

void serialReceive() {
    // 시리얼 통신을 통해 명령을 수신하는 함수
    if (Serial.available()) {
        String command = Serial.readStringUntil('\n'); // 명령어 읽기
        
        // "RED:시간" 형태의 명령을 수신했을 때
        if (command.startsWith("RED:")) {
            redDuration = command.substring(4).toInt(); // 빨간색 LED 지속 시간 설정
            tRed.setInterval(redDuration); // 타이머 설정
            tRed.enable(); // 타이머 활성화
        }

        // "YELLOW:시간" 형태의 명령을 수신했을 때
        if (command.startsWith("YELLOW:")) {
            yellowDuration = command.substring(7).toInt(); // 노란색 LED 지속 시간 설정
            tYellow.setInterval(yellowDuration);
            tYellow2.setInterval(yellowDuration);
            tYellow.enable();
            tYellow2.enable();
        }

        // "GREEN:시간" 형태의 명령을 수신했을 때
        if (command.startsWith("GREEN:")) {
            greenDuration = command.substring(6).toInt(); // 초록색 LED 지속 시간 설정
            tGreen.setInterval(greenDuration);
            tGreen.enable();
        }
    }
}

void taskRed() {
    // 빨간색 LED를 켜는 함수
    if (redMode || blinkMode || powerOff) return; // 특정 모드에서는 동작하지 않음
    analogWrite(red, 255);
    analogWrite(yellow, 0);
    analogWrite(green, 0);
    stateYellow2 = false;
    stateRed = true;

    // 노란색 LED의 타이머를 설정하여 다음 동작을 예약
    tYellow.setInterval(yellowDuration);
    tYellow.restartDelayed(redDuration - 100);
    Serial.println("Red is running...");
}

void taskYellow() {
    // 노란색 LED를 켜는 함수
    if (redMode || blinkMode || powerOff) return;
    analogWrite(red, 0);
    analogWrite(yellow, 255);
    analogWrite(green, 0);
    stateRed = false;
    stateYellow = true;

    // 초록색 LED의 타이머를 설정하여 다음 동작을 예약
    tGreen.setInterval(greenDuration);
    tGreen.restartDelayed(yellowDuration - 10);
    Serial.println("Yellow is running...");
}

void taskGreen() {
    // 초록색 LED를 켜는 함수
    if (redMode || blinkMode || powerOff) return;
    analogWrite(red, 0);
    analogWrite(yellow, 0);
    analogWrite(green, 255);
    stateYellow = false;
    stateGreen = true;

    // 깜빡이는 초록색 LED의 타이머를 설정
    tBlinkGreen.restartDelayed(greenDuration - 100);
    Serial.println("Green is running...");
}

void blinkGreen() {
    // 초록색 LED가 깜빡이는 함수
    if (redMode || blinkMode || powerOff) return;
    stateGreen = false;
    stateblinkGreen = true;

    static bool isOn = true;
    isOn = !isOn; // ON/OFF 전환
    analogWrite(green, isOn ? 255 : 0);

    Serial.println(isOn ? "Green Blinking: ON" : "Green Blinking: OFF");

    // 깜빡임이 끝나면 종료 타이머 설정
    if (tBlinkGreen.isLastIteration()) {
        tFinishGreen.restartDelayed(90);
    }
}

void finishGreen() {
    // 초록색 LED가 꺼지고 빨간색 LED로 전환되는 함수
    if (redMode || blinkMode || powerOff) return;
    Serial.println("Green OFF, switching to Red");
    analogWrite(green, 0);

    tYellow2.restartDelayed(90);
}

void taskYellow2() {
    // 두 번째 노란색 LED 단계 실행
    if (redMode || blinkMode || powerOff) return;
    analogWrite(red, 0);
    analogWrite(yellow, 255);    
    analogWrite(green, 0);
    stateblinkGreen = false;
    stateYellow2 = true;

    // 빨간색 LED의 타이머를 설정하여 다음 동작을 예약
    tRed.restartDelayed(yellowDuration - 10);
    Serial.println("Yellow2 is running...");
}

void blinkAll() {
    // 모든 LED를 동시에 깜빡이게 하는 함수
    static bool isOn = true;
    isOn = !isOn; // 현재 상태를 반전하여 ON/OFF 전환

    // 모든 LED를 같은 상태로 변경
    analogWrite(red, isOn ? 255 : 0);
    analogWrite(yellow, isOn ? 255 : 0);
    analogWrite(green, isOn ? 255 : 0);

    Serial.println(isOn ? "Blink Mode: ON" : "Blink Mode: OFF"); // 현재 상태 출력
}

void adjustBrightness() {
    // 가변 저항 값을 읽어 LED 밝기를 조절하는 함수
    int potValue = analogRead(potentiometer); // 가변 저항에서 아날로그 값을 읽음
    brightness = map(potValue, 0, 1023, 0, 255); // 0~1023 범위를 0~255로 매핑

    // 특정 모드가 아닐 때 현재 활성화된 LED의 밝기를 조절
    if (!redMode && !blinkMode && !powerOff) {
        if (stateRed) {
            analogWrite(red, brightness);
        } else if (stateYellow || stateYellow2) {
            analogWrite(yellow, brightness);
        } else if (stateGreen || stateblinkGreen) {
            analogWrite(green, brightness);
        }
    }
    // 빨간색 모드일 경우 빨간색 LED만 밝기 조절
    else if (redMode) {
        analogWrite(red, brightness);
        analogWrite(yellow, 0);
        analogWrite(green, 0);
    } 
    // 깜빡임 모드일 경우 모든 LED가 같은 밝기로 점멸
    else if (blinkMode) {
        analogWrite(red, brightness);
        analogWrite(yellow, brightness);
        analogWrite(green, brightness);
    }
    // 전원이 꺼진 상태라면 모든 LED를 OFF
    else if (powerOff) {
        analogWrite(red, 0);
        analogWrite(yellow, 0);
        analogWrite(green, 0);
    }

    sendStatusToWeb(); // 현재 상태를 웹으로 전송
}

// 스위치 1 - 인터럽트 서비스 루틴 (ISR)
// redMode(Emergency Mode) 활성화
void switch1_ISR() {
    if (!redMode) { // 현재 redMode가 비활성화되어 있다면
        redMode = true;  // redMode 활성화
        blinkMode = false;  // blinkMode 비활성화
        powerOff = false;  // 전원 OFF 모드 비활성화

        // blinkMode가 실행 중일 수 있으므로 blink 타이머 비활성화
        tBlinkAll.disable();
    } else { 
        redMode = false; // redMode가 활성화 상태였다면 비활성화
    }
    
    Serial.println(redMode ? "Red Mode: ON" : "Red Mode: OFF");

    if (redMode) { 
        // redMode가 활성화되었을 때 LED 설정
        analogWrite(red, 255);   // 빨간색 LED 켜기 (최대 밝기)
        analogWrite(yellow, 0);  // 노란색 LED 끄기
        analogWrite(green, 0);   // 초록색 LED 끄기
    } else { 
        
        tRed.restart();
    }

    // 웹으로 현재 상태 전송
    sendStatusToWeb();
}

// 스위치 2 - 인터럽트 서비스 루틴 (ISR)
// blinkMode(깜빡임 모드) 활성화화
void switch2_ISR() {
    if (!blinkMode) { // 현재 blinkMode가 비활성화되어 있다면
        blinkMode = true;  // blinkMode 활성화
        redMode = false;  // redMode 비활성화
        powerOff = false;  // 전원 OFF 모드 비활성화

        // redMode가 실행 중일 수 있으므로 redMode 타이머 비활성화
        tRed.disable();
    } else { 
        blinkMode = false; // blinkMode가 활성화 상태였다면 비활성화
    }
    
    Serial.println(blinkMode ? "Blink Mode: ON" : "Blink Mode: OFF");

    if (blinkMode) { 
        // blinkMode가 활성화되었을 때 모든 LED 끄기
        analogWrite(red, 0);
        analogWrite(yellow, 0);
        analogWrite(green, 0);
        
        tBlinkAll.enable();
    } else { 
        
        tBlinkAll.disable();
        tRed.restart();
    }

    // 웹으로 현재 상태 전송
    sendStatusToWeb();
}

// 스위치 3 - 인터럽트 서비스 루틴 (ISR)
// 전원을 끄고(powerOff Mode) 활성화
void switch3_ISR() {
    if (!powerOff) { // 현재 powerOff가 비활성화되어 있다면
        powerOff = true;  // 전원 OFF 모드 활성화
        redMode = false;  // redMode 비활성화
        blinkMode = false;  // blinkMode 비활성화

        
        tRed.disable();
        tBlinkAll.disable();
    } else { 
        powerOff = false; // powerOff가 활성화 상태였다면 다시 켜기
    }
    // 현재 전원 상태를 출력
    Serial.println(powerOff ? "Power OFF" : "Power ON");

    if (powerOff) { 
        // powerOff가 활성화되었을 때 모든 LED 끄기
        analogWrite(red, 0);
        analogWrite(yellow, 0);
        analogWrite(green, 0);
    } else { 
        
        tRed.restart();
    }

    // 웹으로 현재 상태 전송
    sendStatusToWeb();
}
