require('dotenv').config();

const { CONTRACT_ABI } = require('./config');
const { NeynarAPIClient } = require('@neynar/nodejs-sdk');
const { ethers } = require('ethers');

const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY);
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_ENDPOINT);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const handleEvent = async (offerId, offerer, receiver, price, token, duration, castURL, castType, event) => {
    console.log(`Event caught: offerId=${offerId}, offerer=${offerer}, receiver=${receiver}, price=${price.toString()}, token=${token}, duration=${duration.toString()}, castURL=${castURL}, castType=${castType}`);

    try {
        if (!process.env.SIGNER_UUID) {
            throw new Error("SIGNER_UUID is not provided");
        }

        const receiverData = await client.lookupUserByCustodyAddress(receiver);

        try {
            const cast = await client.publishCast(
                process.env.SIGNER_UUID,
                `Hey @${receiverData.user.username}! You just received an ad offer, check it out here: ${process.env.OFFERS_PAGE_URL}`
            );

            if (cast) {
                console.log(JSON.stringify(cast));
            }
        } catch {
            console.error()
        }

        return new Response();
    } catch (e) {
        return new Response(e.message, { status: 500 });
    }
};

contract.on('NewOfferCreated', handleEvent);
