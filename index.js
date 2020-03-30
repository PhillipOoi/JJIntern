<<<<<<< HEAD
"use strict";

const redis = require('redis');
const dotenv = require( "dotenv" );
const Hapi = require( "@hapi/hapi" );
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Joi = require('@hapi/joi');
const sql = require( "./sql" );
const Pack = require('./package');
const JWT = require('jsonwebtoken'); 
var Hoek = require('hoek'); 

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

var custom_fields = {
    email     : Joi.string().email().required(), // Required
    firstname : Joi.string()                     // Optional field
}
var opts = { fields: custom_fields };       // set options when registering the plugin
var Boom        = require('@hapi/boom');
var bcrypt      = require('bcrypt'); // see: https://github.com/nelsonic/bcrypt
var redisClient = require('redis-connection')();
function custom_handler(request, reply){
  redisClient.get(request.payload.email, function (err, reply) {
    if(err) { // error when if not already registered, register the person:
      bcrypt.genSalt(12, function(err, salt) {
        bcrypt.hash(req.payload.password, salt, function(err, hash) {
          request.payload.password = hash; // save the password's hash
          redisClient.set(request.payload.email, JSON.stringify(request.payload));
          return reply('Success')
        }); // end bcrypt.hash
      }); // end bcrypt.genSalt
    }
    else {
      return reply(Boom.badRequest('Already Registered'));
    }
  });
}

var options = {
    fields: fields,
    handler: handler,
    loginPath: "/api/login"
  }
// include the custom_handler in your otps object:
opts.handler = custom_handler;
const token = JWT.sign(people[1], secret); 
const token2 = JWT.sign(people[2], secret);
console.log(token,people[1]);
console.log(token2,people[2]);
//003
const validate = async function (decoded, request, h) {
    console.log(" - - - - - - - decoded token:");
  console.log(decoded);
  console.log(" - - - - - - - request info:");
  console.log(request.info);
  console.log(" - - - - - - - user agent:");
  console.log(request.headers['user-agent']);

    // do your checks to see if the person is valid
    if (!people[decoded.id]) {
      return { isValid: false };
    }
    else {
      return { isValid: true };
    }
};

 
/*const createServer = async () => {
  const server = Hapi.server( {
    port: process.env.PORT || 8080,
    host: process.env.HOST || "localhost"
  } );


  return server;
};
*/
const init = async () => {
    dotenv.config();
    //const server = await createServer();

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

    var server = new Hapi.Server({ debug: false })
server.connection({ port: 8080 });
server.register([{ register: require('hapi-register'), options:opts,sql }], function (err) {
  if (err) { console.error('Failed to load plugin:', err); }
});

    
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
        path: "/getOrder",//change to orders
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
                const allOrderSQL = esacpe(`SELECT * FROM public.orders where order_id = ${request.params.orderid}`);
                const orderByID = await h.sql(allOrderSQL);
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
                scope:['superadmin'],
                mode:'optional'
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
        path: '/gettt',
        handler: function(request, reply) {
            try{
                const {getEmail, getPW } = request.payload;
                var email = getEmail;
                var password = getPW;
                bcrypt.genSalt(12, function(err, salt) {  // encrypt the password:
                    bcrypt.hash(password, salt, function(err, hash) {
                      var insertSql = `INSERT INTO %s (email, password) VALUES ( %L, %L)`;
                      var insert = escape(insertSql, 'user', email, hash);
                      request.pg.client.query(insert, function(err, result) {
                        // at this point we should not be getting an error...
                        Hoek.assert(!err, 'ERROR: inserting data into Postgres', err);
                        return reply.view('success', {
                          email : email // also escaped
                        });
                      });
                    }); // end bcrypt.hash
                  }); // end bcrypt.genSalt
            }catch ( err ) {
                console.log( err );
                return "register fail";
            }
          },options:{
            auth:{
                mode:'optional'
            }
        }

      });
};
  

process.on( "unhandledRejection", ( err ) => {
  console.log( err );
  process.exit( 1 );
} );

=======
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
        },options:{
            description: 'Display Message',
            notes: 'Display Hello World',
            tags: ['api']
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
            description: 'Display Wellcome User',
            notes: 'Display username by getting it from URL',
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
            description: 'Display Blog Post',
            notes: 'Display blod post added ',
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

>>>>>>> 01575d2064e2833f7fef29e854f144c31f4a5e5a
init();