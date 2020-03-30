"use strict";

const dotenv = require( "dotenv" );
const Hapi = require( "@hapi/hapi" );
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Joi = require('@hapi/joi');
const sql = require( "./sql" );
const Pack = require('./package');
const JWT = require('jsonwebtoken'); 
const boom = require(`@hapi/boom`);


//003
const lib = require('./lib');
const secret = 'NeverShareYourSecret';
const people = { // our "users database"
    1: {
      id: 1,
      name: 'Jen Jones',
      scope:'admin'
    },
    2: {
        id: 2,
        name: 'Cena Jones',
        scope:'superadmin'
      }
};
const token = JWT.sign(people[1], secret); 
const token2 = JWT.sign(people[2], secret);
console.log(token,people[1]);
console.log(token2,people[2]);

//04 
const redisClient = require('redis-connection')();
const bcrypt = require('bcrypt');
const Uuid = require('uuid');
const validate = async function (decoded, request, h) {
  console.log(" - - - - - - - decoded token:");
  console.log(decoded);
  console.log(" - - - - - - - request info:");
  console.log(request.info);
  console.log(" - - - - - - - user agent:");
  console.log(request.headers['user-agent']);
  const message = "";
  redisClient.get(decoded.session_id, function (rediserror, reply) {
    if(rediserror) {
    console.log(rediserror+"GG");
    return {isValid: false};
    }
    console.log(reply.toString()+"!!!");
    message = message + reply;
    
    return {isValid: true};
}); 
    

};

 
const createServer = async () => {
  const server = Hapi.server( {
    port: process.env.PORT || 8080,
    host: process.env.HOST || "localhost"
  } );


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
        //003
        ,lib 
    ]);
    
    //003
    server.auth.strategy('jwt', 'jwt',
    { key: 'NeverShareYourSecret', // Never Share your secret key
      validate, // validate function defined above
      verifyOptions: { algorithms: [ 'HS256' ] }
    });

    server.auth.default('jwt');

    
    
    await server.start();
    console.log( "Server running on %s", server.info.uri );


    //select 
    server.route({
        method: "GET",
        path: "/getOrder",
        handler: async ( request, h ) => {
            try {
                const allOrder = await h.sql`SELECT * FROM public.orders`;
                return allOrder;
            } catch ( err ) {
                console.log( err );
                return "order(s) fail to display";
            }
        },options: {
            description: 'Display All Orders',
            notes: 'Display all order details',
            tags: ['api'],
            auth:{
                strategy: 'jwt',
                access: [{         // you can configure different access for each route
                    scope: 'superadmin' // each access can define a set of scopes with type prefix ('+','-' or empty)
                  }]
            }
        }
    });

     //select by order id
     server.route({
        method: "GET",
        path: "/getOrder/{orderid}",
        handler: async ( request, h ) => {
            try {
                const orderByID = await h.sql`SELECT * FROM public.orders where order_id = ${request.params.orderid}`;
                return orderByID;
            } catch ( err ) {
                console.log( err );
                return "order entered not found";
            }
        },   
        options: {
            description: 'Display Specific Order Details',
            notes: 'Display order details by getting order id from url',
            tags: ['api'],
            auth:{
                scope:[`admin`,`superadmin`]
            }
        }
    });


    //PUT
    server.route({
        method: "PUT",
        path: "/addOrder",
        handler: async ( request, h ) => {
            try {
                const {orderID, start, end } = request.payload;
                const addOrder = await h.sql`INSERT INTO orders 
                (order_id,start_date,end_date)
                VALUES 
                (${ orderID },${ start },${ end} )`;
                return addOrder;
            } catch ( err ) {
                console.log( err , sql );
                return `Add order fail`;
            }
        },options: {
            description: 'Add Order',
            notes: 'Add order with start date and end date',
            tags: ['api'],
            auth:{
                mode:'optional'
            }
        }
    });

    //POST
    server.route({
        method: "POST",
        path: "/updateOrder",
        handler: async ( request, h ) => {
            try {
                const {start,end,orderID} = request.payload;
                const updateOrder = await h.sql`UPDATE orders 
                SET start_date = ${ start } , end_date = ${ end }
                WHERE order_id = ${ orderID }`;
                return updateOrder;
            } catch ( err ) {
                console.log( err );
                return `update order fail`;
            }
        },options: {
            description: 'Update Order',
            notes: 'Update order by order id to update start date and end date',
            tags: ['api'],
            auth: {
                mode:`optional`
            }
        }
    });

    //delete
    server.route({
        method: "DELETE",
        path: "/deleteOrder/{orderid}",
        handler: async ( request, h ) => {
            try {
                const deleteOrder = await h.sql`DELETE FROM public.orders WHERE order_id= ${ request.params.orderid }` ;
                return `Delete Order ${ request.params.orderid } sucess`;
            } catch ( err ) {
                console.log( err );
                return "delete order fail";
            }
        },
        options: {
            description: 'Delete Order',
            notes: 'Delete order by getting order id from url',
            tags: ['api'],
            auth:{
                strategy: 'jwt',
                scope:['superadmin']
            }
        }
    });

    //003
    server.route([
        {
          method: "GET", path: "/", config: { auth: false },
          handler: function(request, h) {
            return 'Welcome';
          }
        },
        {
          method: 'GET', path: '/restricted', config: { auth: 'jwt' },
          handler: function(request, h) {
            const response = h.response({text: 'You used a Token!'});
            response.header("Authorization", request.headers.authorization);
            return response;
          }
        }
      ]);

    server.route({
        method: 'POST',
        path: '/register',
        handler: async ( request, h ) => {
            try{
                const { id,  email, pw } = request.payload;
                escape({id, email, pw});
                const saltRounds =12;
                const salt = bcrypt.genSaltSync(saltRounds);
                const hash = bcrypt.hashSync(pw, salt);
                const insert = await h.sql`INSERT INTO users 
                (user_id,email,password)
                 VALUES 
                (${ id },${ email },${ hash })`;
                escape(insert);
                return insert;
            }catch ( err ) {
                console.log( err );
                return "register fail";
            }
        },options:{
            auth:{
                strategy: 'jwt',
                mode:'optional'
            }
        }
      });


      server.route({
        method: 'POST',
        path: '/login',
        handler: async ( request, h ) => {
            try{
                const { email, pw } = request.payload;
                console.log("Email"+email);
                const e_mail = escape(`${ email }`);
                const getPW = await h.sql`SELECT password FROM users where email =${e_mail}`;4
                escape(getPW);
                if(getPW==false){
                    return "Invalid Combination of Email and Password";
                }else{
                    const password = escape(`${ pw }`);
                    console.log("Password"+password)
                    const hash = getPW[0].password;
                    const checkPW = bcrypt.compareSync(password, hash);
                    if(checkPW==true){
                        const getQuery = await h.sql`SELECT user_id,roles FROM users where email = ${e_mail}`;
                        const uid = getQuery[0].user_id;
                        const role = getQuery[0].roles;
                        const sid = Uuid.v4();
                        console.log("sid= "+sid+",uid="+uid+",role="+role);
                        let sessionRedisObj = {
                            session_id : `${sid}`,
                            uid : `${uid}`,
                            role : `${role}`,
                            expiry : "1"
                        };
                        let sessionObj = {
                            session_id : `${sid}`,
                            expiry : `100s`
                        };
                        const insert = await h.sql`INSERT INTO sessions 
                        (session_id,user_id,roles,expire)
                        VALUES 
                        (${ sid },${ uid },${ role },${uid})`;
                        const session= JSON.stringify(sessionRedisObj);
                        const JWTSession= JSON.stringify(sessionObj);
                        const JWTSign = JWT.sign(JWTSession,secret);
                        console.log("JWTSign ="+JWTSign);
                        try{
                        const redisIn = redisClient.set(sid,session);
                        console.log("Redis"+redisIn);
                            return "loginSuccesful";
                        }catch(err){
                            console.log(err);
                            return err;
                        }
                    }else{
                        loginMsg = "Invalid Combination of Email and Password";
                    }
                    return loginMsg;
                }
            }catch ( err ) {
                console.log( err );
                return "login function error";
            }
                
        },options:{
            auth:{
                mode:"optional"
            }
        }
      });
      server.route({
        method: 'POST',
        path: '/loginVerify',
        handler: async ( request, h ) => {
            try{
                const inToken = request.payload;
                console.log(`${inToken.inToken}`);
            var decoded = JWT.verify(`${inToken.inToken}`, secret);
            console.log(decoded.session_id);
            redisClient.get(decoded.session_id, function (rediserror, reply) {
                if(rediserror) {
                console.log(rediserror+"GG");
                message = "welcome users";
                return {isValid: false};
                }
                console.log(reply.toString()+"!!!");
                message = message + reply;
                
                return {isValid: true};
            });
            return message;
            }catch(err){
                return err;
            }
        },options:{
            auth:{
                mode:"required"
            }
        }
      });
      
};
  

process.on( "unhandledRejection", ( err ) => {
  console.log( err );
  process.exit( 1 );
} );

init();