const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
    apiKey: "AIzaSyCwsUgjOL08tNrAZ_Mq012YmrUWZ5Z1NAk",
    authDomain: "fomosumos.firebaseapp.com",
    databaseURL: "https://fomosumos.firebaseio.com",
    projectId: "fomosumos",
    storageBucket: "fomosumos.appspot.com",
    messagingSenderId: "903886436512"
});

const db = admin.firestore();

// Disable deprecated features
db.settings({
    timestampsInSnapshots: true
});

exports.purgeInactiveRooms = functions.https.onRequest((req, res) => {
    const readTime = Date.now();
    //const aDayInMillis = 24 * 60 * 60 * 1000;
    const aDayInMillis = 30 * 60 * 1000;
    var count = 0;

    // Date object stored in milliseconds format since 01 Jan 1970. 
    // so, all expired rooms = (readtime - aDayInMillis) >= createTime
    return db.collection('rooms').where('createTime', '<=', readTime - aDayInMillis)
        .get()
        .then(querySnapshot => {
            console.log("Running purge query...");

            querySnapshot.forEach(doc => {
                console.log(`Removed ${doc.id}`);
                doc.ref.delete();
                count++;
            })

            console.log("Purge completed.");

            res.send(JSON.stringify({
                id: "purgeInactiveRooms",
                message: `Purge completed. ${count} room(s) purged.`
            }));
        });
});