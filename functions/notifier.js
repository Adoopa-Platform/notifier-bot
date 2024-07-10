const { CORS_HEADERS } = require('../config');

exports.handler = async function() {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: 'Event listener is running.'
    };
};
