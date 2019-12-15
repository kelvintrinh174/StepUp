const lo = require('lodash');

const db = require('../base/db');
const challenges = db.collection('Challenges');
const userProfile = db.collection('UserProfile');

const middleware = require('../helpers/middleware');
const { attachCommon, attachErrorHandlers } = middleware;
const extractEmail = middleware.extractEmail();

const express = require('express');
const route = attachCommon( express() );

route.get('/available', (_, res) => {
    
    let query = challenges.where('active', '==', true);

    let available = [];

    query.get().then(snap => {
        snap.docs.forEach(doc => {
            let data = doc.data();
            data.id = doc.id;
            available.push(data);
        });

        res.json(available);
    });
});



route.put('/join/:id', extractEmail, async (req, res, next) => {
    
    let email = req.email, id = req.params.id;
    let userRef = userProfile.doc(email);
    let joined = userRef.collection('JoinedChallenges');
    
    let challengeRef = challenges.doc(id);
    
    let snap = await challengeRef.get().catch(next);

    if (!snap.exists) {
        return next(new Error(`Challenge ${id} doesn't exist.`));
    }


    let challenge = snap.data();

    let data = {
        joinedAt: Date.now(),
        distance: challenge.distance,
        progress: 0
    };

    joined.doc(id).set(data).then(() => {
        res.json({ msg: `${email} joined ${id}`, data });
    });

});



route.put('/leave/:id', extractEmail, (req, res, next) => {

    let email = req.email, id = req.params.id;

    let userRef = userProfile.doc(email),
    joined = userRef.collection('JoinedChallenges');

    joined.doc(id).delete().then(() => {
        res.json({ msg: `${email} left ${id}` });
    }).catch(next);
});



route.get('/joined', extractEmail, async (req, res, next) => {
    let email = req.email, userRef = userProfile.doc(email),
    joinedChallenges = userRef.collection('JoinedChallenges');

    let snap = await joinedChallenges.get().catch(next);

    let promises = [];

    const mergeChallengeData = async doc => {
        let data = doc.data();
        data.id = doc.id;
        let docRef = challenges.doc(doc.id);
        let ch = await docRef.get();
        return lo.merge(data, ch.data());
    };

    snap.docs.forEach(doc => {
        promises.push( mergeChallengeData(doc) );
    });

    Promise.all(promises).then(joined => {
        res.json(joined);
    }).catch(next);

});



route.get([
    '/get/:id',
    '/:id'
], (req, res) => {

    let id = req.params.id;

    let ref = challenges.doc(id);

    ref.get().then(snap => {
        res.json(snap.data() || {});
    });

});


module.exports = attachErrorHandlers( route );
