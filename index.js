"use strict";

const dotenv = require("dotenv");
const Hapi = require("@hapi/hapi");
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Joi = require('@hapi/joi');
const sql = require("./sql");
const Pack = require('./package');
const JWT = require('jsonwebtoken');
const lib = require('./lib');
const secret = 'NeverShareYourSecret';

// our "users database"
const people = { 
    1: {
        id: 1,
        name: 'Jen Jones',
        scope: 'admin'
    },
    2: {
        id: 2,
        name: 'Cena Jones',
        scope: 'superadmin'
    }
};
const token = JWT.sign(people[1], secret);
const token2 = JWT.sign(people[2], secret);
console.log(token, people[1]);
console.log(token2, people[2]);

const redisClient = require('redis-connection')();
const bcrypt = require('bcrypt');
const Uuid = require('uuid');

/*validate people for task authentication on hapi js
const validate = async function (decoded, request, h) {

    // do your checks to see if the person is valid
    if (!people[decoded.id]) {
      return { isValid: false };
    }
    else {
      return { isValid: true };
    }
}; 
*/

global.decodeSID = "";

const validate = async function (decoded, options, request, h) {

    console.log(decoded);
    const redisReturn = await redisClient.get(decoded.session_id);
    console.log(decoded.session_id)
    decodeSID = decoded.session_id;//to pass to /loginVerify
    if (redisReturn == true) {
        redisClient.get(decoded.session_id, function (error, result) {
            if (error) {
                console.log(error);
                throw error;
            }
            const redisStr = JSON.stringify(result);
            const redisObj = JSON.parse(redisStr);
            const redisObjs = JSON.parse(redisObj);//double parse to get object 
            console.log("Redis Str: " + redisObjs.session_id);
        });

        return { isValid: true }//TO-DO: credential
    } else {
        console.log(false);
        return { isValid: false }
    }

};

const createServer = async () => {

    const server = Hapi.server({
        port: process.env.PORT || 8080,
        host: process.env.HOST || "localhost"
    });

    return server;
};

const init = async () => {

    dotenv.config();

    const server = await createServer();

    const swaggerOptions = {
        info: {
            title: `Test API Documentation`,
            version: Pack.version,
        },
    };

    await server.register([
        sql,
        Inert,
        Vision,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
        , lib
    ]);

    server.auth.strategy('jwt', 'jwt',
        {
            key: 'NeverShareYourSecret', // Never Share your secret key
            validate, // validate function defined above
            verifyOptions: { algorithms: ['HS256'] }
        });

    server.auth.default('jwt');

    await server.start();
    console.log("Server running on %s", server.info.uri);

    //task 1
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

    //select 
    server.route({
        method: "GET",
        path: "/getOrder",
        handler: async (request, h) => {
            try {
                const allOrder = await h.sql`SELECT * FROM public.orders`;
                return allOrder;
            } catch (err) {
                console.log(err);
                return "order(s) fail to display";
            }
        }, options: {
            description: 'Display All Orders',
            notes: 'Display all order details',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
                access: [{
                    scope: 'superadmin'
                }]
            }
        }
    });

    //select by order id
    server.route({
        method: "GET",
        path: "/getOrder/{orderid}",
        handler: async (request, h) => {
            try {
                const orderByID = await h.sql`SELECT * FROM public.orders where order_id = ${request.params.orderid}`;
                return orderByID;
            } catch (err) {
                console.log(err);
                return "order entered not found";
            }
        },
        options: {
            description: 'Display Specific Order Details',
            notes: 'Display order details by getting order id from url',
            tags: ['api'],
            auth: {
                scope: [`admin`, `superadmin`]
            }
        }
    });


    //PUT function 
    server.route({
        method: "PUT",
        path: "/addOrder",
        handler: async (request, h) => {
            try {
                const { orderID, start, end } = request.payload;
                const addOrder = await h.sql`INSERT INTO orders 
                                            (order_id,start_date,end_date)
                                            VALUES 
                                            (${ orderID},${start},${end} )`;
                return addOrder;
            } catch (err) {
                console.log(err, sql);
                return `Add order fail`;
            }
        }, options: {
            description: 'Add Order',
            notes: 'Add order with start date and end date',
            tags: ['api'],
            auth: {
                mode: 'optional'
            }
        }
    });

    //POST function
    server.route({
        method: "POST",
        path: "/updateOrder",
        handler: async (request, h) => {
            try {
                const { start, end, orderID } = request.payload;
                const updateOrder = await h.sql`UPDATE orders 
                                                SET start_date = ${ start} , end_date = ${end}
                                                WHERE order_id = ${ orderID}`;
                return updateOrder;
            } catch (err) {
                console.log(err);
                return `update order fail`;
            }
        }, options: {
            description: 'Update Order',
            notes: 'Update order by order id to update start date and end date',
            tags: ['api'],
            auth: {
                mode: `optional`
            }
        }
    });

    //Delete function
    server.route({
        method: "DELETE",
        path: "/deleteOrder/{orderid}",
        handler: async (request, h) => {
            try {
                const deleteOrder = await h.sql`DELETE FROM public.orders WHERE order_id= ${request.params.orderid}`;
                return `Delete Order ${request.params.orderid} sucess`;
            } catch (err) {
                console.log(err);
                return "delete order fail";
            }
        },
        options: {
            description: 'Delete Order',
            notes: 'Delete order by getting order id from url',
            tags: ['api'],
            auth: {
                strategy: 'jwt',
                scope: ['superadmin']
            }
        }
    });

    //register function for task add register/login 
    server.route({
        method: 'POST',
        path: '/register',
        handler: async (request, h) => {
            try {
                const { id, email, pw } = request.payload;
                escape({ id, email, pw });
                const saltRounds = 12;
                const salt = bcrypt.genSaltSync(saltRounds);
                const hash = bcrypt.hashSync(pw, salt);
                const insert = await h.sql
                    `INSERT INTO users 
                                (user_id,email,password)VALUES 
                                (${ id},${email},${hash})`;
                escape(insert);
                return insert;
            } catch (err) {
                console.log(err);
                return "register fail";
            }
        }, options: {
            auth: {
                strategy: 'jwt',
                mode: 'optional'
            }
        }
    });

    //login function for task add register/login 
    server.route({
        method: 'POST',
        path: '/login',
        handler: async (request, h) => {
            try {
                let loginMsg = "";
                const { email, pw } = request.payload;
                const e_mail = escape(`${email}`);
                const getPW = await h.sql`SELECT password FROM users where email =${e_mail}`;
                escape(getPW);
                if (getPW == false) {
                    return "Invalid Combination of Email and Password";
                } else {
                    const password = escape(`${pw}`);
                    console.log("Password" + password)
                    const hash = getPW[0].password;
                    const checkPW = bcrypt.compareSync(password, hash);
                    if (checkPW == true) {
                        const getQuery = await h.sql`SELECT user_id,roles FROM users where email = ${e_mail} `;
                        const uid = getQuery[0].user_id;
                        const role = getQuery[0].roles;
                        const sid = Uuid.v4();
                        const exp = "100";

                        let sessionRedisObj = {
                            session_id: `${sid}`,
                            uid: `${uid}`,
                            role: `${role}`,
                            expiry: exp + "s"
                        };

                        let sessionObj = {
                            session_id: `${sid}`,
                            expiry: exp + "s"
                        };

                        const insert = await h.sql
                            `INSERT INTO sessions 
                                        ( session_id, user_id , roles , expire )
                                        VALUES 
                                        (${ sid} , ${uid} , ${role} , ${uid} )`;
                        const session = JSON.stringify(sessionRedisObj);
                        const JWTSession = JSON.stringify(sessionObj);
                        const JWTSign = JWT.sign(JWTSession, secret);
                        console.log("JWTSign =" + JWTSign);
                        try {
                            const redisIn = await redisClient.set(sid, session);
                            console.log("Redis" + redisIn);
                            return "loginSuccesful";
                        } catch (err) {
                            console.log(err);
                            return err;
                        }
                    } else {
                        loginMsg = "Invalid Combination of Email and Password";
                    }
                    return loginMsg;
                }
            } catch (err) {
                console.log(err);
                return "login function error";
            }

        }, options: {
            auth: {
                mode: "optional"
            }
        }
    });

    //verify token and display user info
    server.route({
        method: 'GET',
        path: '/loginVerify',
        handler: async (request, h) => {
            console.log("Redis Str from under the sea: " + decodeSID);//TO-DO show user different output by their role
            return "hi";
        }, options: {
            auth: {
                mode: "required"
            }
        }
    });

};

process.on("unhandledRejection", (err) => {
    console.log(err);
    process.exit(1);
});

init();