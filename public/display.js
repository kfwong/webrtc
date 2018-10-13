class SumoDisplay {
    constructor(roomKey) {
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

        // Initialize a hashmap to keep track of connected players
        this.players = {}

        this.roomKey = roomKey;
    }

    createRoom() {
        console.log(`Creating Room with key: ${this.roomKey}.`);
        this.db.collection('rooms').doc(this.roomKey).set({
            createTime: Date.now()
        });
    }

    // playerDoc: the document snapshot in firestore that represents the player.
    // return: SimplePeer object that represents the player.
    createPlayer(playerDoc) {
        console.log(`Creating player with name: ${playerDoc.id}.`);
        var player = new SimplePeer({ initiator: true, trickle: false });

        this.players[playerDoc.id] = player;

        return player;
    }

    // playerDoc: the document snapshot in firestore that represents the player.
    // data: data param from SimplePeer.on('signal').
    sendOffer(playerDoc, data) {
        if (!playerDoc.exists) {
            console.log("Player does not exists.");
            return;
        }

        console.log(`Sending offer to ${playerDoc.id}.`);
        playerDoc.ref.set({
            offer: data
        }, { merge: true });
    }

    // playerDoc: the document snapshot in firestore that represents the player.
    receiveAnswer(playerDoc) {
        var answer = playerDoc.data().answer
        if (answer) {
            console.log(`Received ${playerDoc.id}'s answer.`)
            this.players[playerDoc.id].signal(answer);
        }
    }

    handleError(error) {
        console.log(error);
    }

    // playerDoc: the document snapshot in firestore that represents the player.
    handleConnect(playerDoc) {
        console.log(`Connected to ${playerDoc.id}`);
    }

    // playerDoc: the document snapshot in firestore that represents the player.
    handleDisconnect(playerDoc) {
        console.log(`Disconnected from ${playerDoc.id}`);
        this.players[playerDoc.id].destroy();
        delete this.players[playerDoc.id];
        if(playerDoc.exists) playerDoc.ref.delete();
    }

    // data: data param from SimplePeer.on('data').
    handleData(data) {
        var d = JSON.parse(String.fromCharCode.apply(null, data));

        if (d.type === 'fireworks') {
            window.human = true;
            window.render.play();
            window.animateParticules(d.x, d.y);
        }

    }

    start() {
        this.createRoom();

        this.detachListener = this.db.collection(`rooms/${this.roomKey}/players`).onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                // new player joined
                if (change.type === 'added') {
                    var player = display.createPlayer(change.doc);

                    player.on('signal', data => this.sendOffer(change.doc, data));
                    player.on('error', error => this.handleError(error));
                    player.on('connect', () => this.handleConnect(change.doc));
                    player.on('close', () => this.handleDisconnect(change.doc));
                    player.on('data', data => this.handleData(data));
                }

                // player answer to offer
                if (change.type === 'modified') {
                    display.receiveAnswer(change.doc);
                }

                // player left
                if (change.type === 'removed') {
                    this.handleDisconnect(change.doc);
                }
            });
        });
    }

    close() {
        console.log(`Closing room "${this.roomKey}".`);
        this.db.collection('rooms').doc(this.roomKey).delete();
        this.detachListener();

        return "Room closed."
    }
}

while (true) {
    var roomKey = prompt("Enter your room key.");
    if (roomKey.trim() === "") continue;

    if (roomKey) break;
}

var display = new SumoDisplay(roomKey);
display.start();

onbeforeunload = () => display.close();

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

setCanvasSize();
window.addEventListener('resize', setCanvasSize, false);