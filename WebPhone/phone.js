const socket = io();
let isCalling = false;
let currentBuffer = "";
let phoneNumber = ""
let waitHash = false;
let clientNumber = '0551785753';

// פונקציה להפעלה וניתוק השיחה
function toggleCall() {
    const btn = document.getElementById('call-trigger');
    const screen = document.getElementById('phone-screen');

    if (!isCalling) {
        isCalling = true;
        currentBuffer = "";
        btn.classList.remove('btn-success');
        btn.classList.add('btn-danger');
        btn.innerText = "🛑 נתק שיחה";
        screen.innerHTML = "<div>🕳️ מחייג למערכת...</div>";
        socket.emit('start_call', phoneNumber, clientNumber);
    } else {
        isCalling = false;
        phoneNumber = ""
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-success');
        btn.innerText = "📞 התחל שיחה";
        screen.innerHTML = "<div>הטלפון מנותק</div>";
        updateBufferDisplay();
        socket.emit('stop_playlist');
    }
}


// שליחת מקש שהוקש לשרת (מדמה אירוע DTMF)
function sendDigit(digit) {
    if (!isCalling) {
        phoneNumber += digit;
        const screen = document.getElementById('phone-screen');
        screen.innerHTML = `
        <div>💬 הודעת המערכת:</div>
        <div style="color: #fff; font-size:0.85rem; margin-top:5px; font-weight: bold;">${phoneNumber}</div>
        <div style="font-size: 0.75rem; color: #aaa; margin-top: 5px;" id="buffer-screen"></div>
    `;
        return;
    };

    if (waitHash){
        if (digit === '#' || digit === '*') {
            currentBuffer = "";
        }
        else{
            currentBuffer += digit;
        }
    }
    updateBufferDisplay();

    // שליחת המקש לשרת ה-Node.js
    socket.emit('dtmf_digit', digit);
}

// עדכון תצוגת המקשים שהוקשו על המסך
function updateBufferDisplay() {
    const bufferScreen = document.getElementById('buffer-screen');
    if (bufferScreen) {
        bufferScreen.innerText = currentBuffer ? `הוקש: ${currentBuffer}` : "";
    }
}

// קבלת פקודת שמע מהשרת והצגתה כטקסט על המסך בלבד (ללא קול)
socket.on('play_audio', (text, hash = false) => {
    waitHash = hash ? true : false;
    const screen = document.getElementById('phone-screen');
    screen.innerHTML = `
        <div>💬 הודעת המערכת:</div>
        <div style="color: #fff; font-size:0.85rem; margin-top:5px; font-weight: bold;">${text}</div>
        <div style="font-size: 0.75rem; color: #aaa; margin-top: 5px;" id="buffer-screen"></div>
    `;
    // currentBuffer = hash && digit !== '#' ? currentBuffer += digit : "";
    // updateBufferDisplay();
});

socket.on('hung_up', (msg) => {
    const screen = document.getElementById('phone-screen');
    screen.innerHTML = `
        <div>💬 הודעת המערכת:</div>
        <div style="color: #fff; font-size:0.85rem; margin-top:5px; font-weight: bold;">${msg}</div>
        <div style="font-size: 0.75rem; color: #aaa; margin-top: 5px;" id="buffer-screen"></div>
    `;
    setTimeout(() => {
        toggleCall();
    }, 2000);
    
}) 
