const redis = require('redis');
const client = redis.createClient();

client.on('connect',function(){
    console.log("Connect");
});

client.on('error',function(err){
    console.log("You GG"+err);
});

client.set('my test key', 'aaaa', redis.print);
client.get('my test key', function (error, result) {
    if (error) {
        console.log(error);
        throw error;
    }
    console.log('GET result ->' + result);
});