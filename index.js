'use strict';

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');
const Joi = require('@hapi/joi');

const init = async () => {

    const server = Hapi.server({
        port: 3000,
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
        },
        options:{
            tags: ['api']
        }
        
    });

    //to test JOI
    server.route({
        method: 'POST',
        path: '/post',
        handler: function (request, h) {
            var text = request.payload.post;
            return 'Blog post ' + text + ' added';
        },
        options: {
            tags: ['api'],
            validate: {
                payload: Joi.object({
                    post: Joi.number()
                    .integer()
                    .min(1900)
                    .max(2013)
                })
            }
        }
    });

    const swaggerOptions = {
        info: {
                title: 'Test API Documentation',
                version: Pack.version,
            },
        };

    await server.register([
        Inert,
        Vision,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
    ]);


    try {
        await server.start();
        console.log('Server running at:', server.info.uri);
    } catch(err) {
        console.log(err);
    }

    const schema = Joi.object({
        username: Joi.string()
            .alphanum()
            .min(3)
            .max(30)
            .required(),
    
        password: Joi.string()
            .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
    
        repeat_password: Joi.ref('password'),
    
        access_token: [
            Joi.string(),
            Joi.number()
        ],
    
        birth_year: Joi.number()
            .integer()
            .min(1900)
            .max(2013),
    
        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
    })
        .with('username', 'birth_year')
        .xor('password', 'access_token')
        .with('password', 'repeat_password');
    
    
    schema.validate({ username: 'abc', birth_year: 1994 });
    // -> { value: { username: 'abc', birth_year: 1994 } }
    
    schema.validate({});
    // -> { value: {}, error: '"username" is required' }
    
    // Also -
    
    try {
        const value = await schema.validateAsync({ username: 'abc', birth_year: 1994 });
    }
    catch (err) { }
    
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();