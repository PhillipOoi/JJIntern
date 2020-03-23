'use strict';

const Hapi = require('@hapi/hapi');
//removessssgt
const init = async () => {

    const server = Hapi.server({
        port: 8000,
        host: 'localhost'
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {

            return 'Hello World!!!!!';
        }
    });

    server.route({
        method: 'POST',
        path: '/hello',
        handler: function (request, h) {
    
            const payload = request.payload;
    
            return `Welcome ${payload.username}!!`;
        }
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();