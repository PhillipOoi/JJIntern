"use strict";

const dotenv = require( "dotenv" );
const Hapi = require( "@hapi/hapi" );
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Inert = require('@hapi/inert');
const Joi = require('@hapi/joi');
const sql = require( "./sql" );
const Pack = require('./package');

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
                title: 'Test API Documentation',
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
    ]);
    
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
            tags: ['api']
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
        },options: {
            description: 'Display Specific Order Details',
            notes: 'Display order details by getting order id from url',
            tags: ['api']
        }
    });


    //PUT
    server.route({
        method: "PUT",
        path: "/addOrder",
        handler: async ( request, h ) => {
            try {
                const startDate = request.startDate;
                const endDate = request.startDate;
                const addOrder = await h.sql (`INSERT INTO "public"."orders" ("start_date","end_date") VALUES ${ startDate },${ endDate } `);
                return addOrder;
            } catch ( err ) {
                console.log( err );
                return "Add order fail";
            }
        },options: {
            description: 'Add Order',
            notes: 'Add order with start date and end date',
            tags: ['api']
        }
    });

    //POST
    server.route({
        method: "POST",
        path: "/updateOrder",
        handler: async ( request, h ) => {
            try {
                const updateOrder = await h.sql`UPDATE public.orders ('start_date','end_date') 
                SET start_date = ${ startDate } , end_date = ${ endDate }
                WHERE order_id = ${ orderID }`;
                return updateOrder;
            } catch ( err ) {
                console.log( err );
                return "update order fail";
            }
        },options: {
            description: 'Update Order',
            notes: 'Update order by order id to update start date and end date',
            tags: ['api']
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
            tags: ['api']
        }
    });
};
  

process.on( "unhandledRejection", ( err ) => {
  console.log( err );
  process.exit( 1 );
} );

init();