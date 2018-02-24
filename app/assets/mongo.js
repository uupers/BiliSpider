var msg;
// get database stats
var getDbStats = function(db, callback) {
db.command({'dbStats': 1},
function(err, results) {
   console.log(results);
   callback();
   return results;
}
);
};

var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');



// Connection URL
var url = 'mongodb://spiderrd:spiderrd@45.32.68.44:37017/bilibili_spider';


MongoClient.connect(url, function (err, client) {
  assert.equal(null, err);

  var db = client.db('bilibili_spider');

    msg = getDbStats(db, function() {
      client.close();
     });
}); 


console.log("msg")
console.log(msg.objects)
console.log("msg 2")
console.log(msg)



