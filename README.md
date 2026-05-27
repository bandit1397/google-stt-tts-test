# ngrok 사용하면
https://xxxx.ngrok-free.app 같은 주소 생성




# 프로그램이 실행되려면
# 1. ngrok 실행
  - cmd  
  - ngrok 폴더로 이동 <C:~\ngrok\>
  - ngrok http 3000
1-1 vscode 터미널에서 
- npm install -g ngrok 을 작동시킨다
- ngrok http 3000 이어서 작동시킨다
- 결과 로 나오는 Forwarding                   
   https://b3b0-39-120-89-77.ngrok-free.app -> http://localhost:3000   
   에서 https://b3b0-39-120-89-77.ngrok-free.app 을 휴대폰에 연결시킨다

# cmd 에서 
(참고) npx kill-port 3000 (ngrok 실행과 별도의 cmd 에서 실행)
(or)  taskkill /F /IM node.exe


# 2. server 실행
  - node server.js


  
