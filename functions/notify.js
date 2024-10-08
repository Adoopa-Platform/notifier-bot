require('dotenv').config();

const { NeynarAPIClient } = require('@neynar/nodejs-sdk');
const { CORS_HEADERS, ABI_FRAGMENT } = require('../config');
const { ethers } = require('ethers');

const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);

const contractInterface = new ethers.Interface(JSON.stringify(ABI_FRAGMENT));

exports.handler = async function(event, context, callback) {
    const resp = JSON.parse(event.body);

    if (resp.abi.length === 0 && resp.logs.length === 0 || !resp.confirmed) {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Empty' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    const log = resp.logs[0];

    // Decoding the log data
    const decodedLog = contractInterface.parseLog({
        data: log.data,
        topics: [
            log.topic0,
            log.topic1,
            log.topic2,
            log.topic3
        ]
    });

    const { offerId, offerer, receiver, price, token, duration, castURL, castType } = decodedLog.args;

    console.log(`Event caught: offerId=${offerId}, offerer=${offerer}, receiver=${receiver}, price=${price}, token=${token}, duration=${duration}, castURL=${castURL}, castType=${castType}`);

    try {
        if (!process.env.SIGNER_UUID) {
            throw new Error("SIGNER_UUID is not provided");
        }

        const receiverData = await client.lookupUserByCustodyAddress(receiver);
        const lastCasts = await client.fetchAllCastsCreatedByUser(receiverData.user.fid);

        return lastCasts.result.casts.length === 0
            ? await publishCast(receiverData.user.username)
            : await publishCast(receiverData.user.username, lastCasts.result.casts.at(0).hash);
    } catch (e) {
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: e.message }),
        };
    }
};

const publishCast = async (username, replyToHash = null) => {
    try {
        const message = `Hey @${username}! You just received an ad offer, check it out here: ${process.env.OFFERS_PAGE_URL}`;
        const options = replyToHash ? { replyTo: replyToHash } : {};

        const cast = await client.publishCast(process.env.SIGNER_UUID, message, options);

        if (cast) {
            console.log(JSON.stringify(cast));
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Cast published successfully' }),
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Failed to publish cast' }),
        };
    }
};
