class SumoClient {
    constructor(playerName, roomKey) {
        // Initialize Firebase
        firebase.initializeApp({
            apiKey: "AIzaSyCwsUgjOL08tNrAZ_Mq012YmrUWZ5Z1NAk",
            authDomain: "fomosumos.firebaseapp.com",
            databaseURL: "https://fomosumos.firebaseio.com",
            projectId: "fomosumos",
            storageBucket: "fomosumos.appspot.com",
            messagingSenderId: "903886436512"
        });

        // Initialize Cloud Firestore through Firebase
        this.db = firebase.firestore();

        // Disable deprecated features
        this.db.settings({
            timestampsInSnapshots: true
        });

        this.playerName = playerName;
        this.roomKey = roomKey;
    }

    joinRoom() {
        console.log(`${this.playerName} joined the room "${this.roomKey}".`)
        return this.db.collection(`rooms/${this.roomKey}/players`).doc(this.playerName).set({
            uid: firebase.auth().currentUser.uid
        });
    }

    sendAnswer(playerDoc, data) {
        console.log(`Sending answer to room "${this.roomKey}".`);
        return playerDoc.ref.set({
            answer: data,
            answerUid: firebase.auth().currentUser.uid
        }, { merge: true });
    }

    receiveOffer(playerDoc) {
        var offer = playerDoc.data().offer;
        if (offer) {
            console.log(`Received offer from room "${this.roomKey}."`);
            this.player.signal(offer);
        }
    }

    handleError(error) {
        console.log(error);
    }

    // playerDoc: the document snapshot in firestore that represents the player.
    handleConnect() {
        console.log(`Connected to ${this.roomKey}`);
    }

    // playerDoc: the document snapshot in firestore that represents the player.
    handleDisconnect() {
        console.log(`Disconnected from ${this.roomKey}`);
        this.player.destroy();
        return this.db.collection(`rooms/${this.roomKey}/players`).doc(this.playerName).delete();
    }

    handleListener(snapshot) {
        this.player = new SimplePeer({ initator: false, trickle: false });

        this.receiveOffer(snapshot);

        this.player.on('error', error => this.handleError(error));
        this.player.on('connect', () => this.handleConnect());
        this.player.on('close', () => this.handleDisconnect(change.doc));
        this.player.on('signal', data => {
            this.sendAnswer(snapshot, data);
            this.detachListener();
        });
    }

    start() {

        firebase.auth().signInAnonymously().catch(error => {
            console.error("Fail to initialize player.");
            console.log(error);
        });

        firebase.auth().onAuthStateChanged(player => {
            if (player) {
                console.log(`Initialized player "${playerName}:${player.uid}".`);

                this.joinRoom().then(() => {
                    this.detachListener = this.db.collection(`rooms/${this.roomKey}/players`).doc(this.playerName)
                        .onSnapshot(snapshot => this.handleListener(snapshot));
                });

            } else {
                console.log(`Player has been decommissioned.`);
            }
        })
    }

    close() {
        this.db.collection(`rooms/${this.roomKey}/players`).doc(this.playerName).delete();

        return "Player left."
    }

}

while (true) {
    var playerName = prompt("Enter your name.");
    if (playerName.trim() === "") continue;

    if (playerName) break;
}

while (true) {
    var roomKey = prompt("Enter room key.");
    if (roomKey.trim() === "") continue;

    if (roomKey) break;
}

var client = new SumoClient(playerName, roomKey);
client.start();

onbeforeunload = () => client.close();

//// fireworks  ========================================
window.human = false;

var canvasEl = document.querySelector('.fireworks');
var ctx = canvasEl.getContext('2d');
var numberOfParticules = 30;
var pointerX = 0;
var pointerY = 0;
var tap = ('ontouchstart' in window || navigator.msMaxTouchPoints) ? 'touchstart' : 'mousedown';
var colors = ['#FF1461', '#18FF92', '#5A87FF', '#FBF38C'];

function setCanvasSize() {
    canvasEl.width = window.innerWidth * 2;
    canvasEl.height = window.innerHeight * 2;
    canvasEl.style.width = window.innerWidth + 'px';
    canvasEl.style.height = window.innerHeight + 'px';
    canvasEl.getContext('2d').scale(2, 2);
}

function updateCoords(e) {
    pointerX = e.clientX || e.touches[0].clientX;
    pointerY = e.clientY || e.touches[0].clientY;
}

function setParticuleDirection(p) {
    var angle = anime.random(0, 360) * Math.PI / 180;
    var value = anime.random(50, 180);
    var radius = [-1, 1][anime.random(0, 1)] * value;
    return {
        x: p.x + radius * Math.cos(angle),
        y: p.y + radius * Math.sin(angle)
    }
}

function createParticule(x, y) {
    var p = {};
    p.x = x;
    p.y = y;
    p.color = colors[anime.random(0, colors.length - 1)];
    p.radius = anime.random(16, 32);
    p.endPos = setParticuleDirection(p);
    p.draw = function () {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, true);
        ctx.fillStyle = p.color;
        ctx.fill();
    }
    return p;
}

function createCircle(x, y) {
    var p = {};
    p.x = x;
    p.y = y;
    p.color = '#FFF';
    p.radius = 0.1;
    p.alpha = .5;
    p.lineWidth = 6;
    p.draw = function () {
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI, true);
        ctx.lineWidth = p.lineWidth;
        ctx.strokeStyle = p.color;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    return p;
}

function renderParticule(anim) {
    for (var i = 0; i < anim.animatables.length; i++) {
        anim.animatables[i].target.draw();
    }
}

function animateParticules(x, y) {
    var circle = createCircle(x, y);
    var particules = [];
    for (var i = 0; i < numberOfParticules; i++) {
        particules.push(createParticule(x, y));
    }
    anime.timeline().add({
        targets: particules,
        x: function (p) { return p.endPos.x; },
        y: function (p) { return p.endPos.y; },
        radius: 0.1,
        duration: anime.random(1200, 1800),
        easing: 'easeOutExpo',
        update: renderParticule
    })
        .add({
            targets: circle,
            radius: anime.random(80, 160),
            lineWidth: 0,
            alpha: {
                value: 0,
                easing: 'linear',
                duration: anime.random(600, 800),
            },
            duration: anime.random(1200, 1800),
            easing: 'easeOutExpo',
            update: renderParticule,
            offset: 0
        });
}

var render = anime({
    duration: Infinity,
    update: function () {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
});

document.addEventListener(tap, function (e) {
    window.human = true;
    render.play();
    updateCoords(e);
    animateParticules(pointerX, pointerY);

    // broadcast to all peers
    console.log("sending coordinates via webrtc");
    client.player.send(JSON.stringify({ type: "fireworks", x: pointerX, y: pointerY }));

}, false);

setCanvasSize();
window.addEventListener('resize', setCanvasSize, false);
