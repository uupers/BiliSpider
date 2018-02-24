var MongoClient = require('mongodb').MongoClient
  , assert = require('assert');


var vm = new Vue({
el: '#data-html',
data: {
   url : 'mongodb://spiderrd:spiderrd@45.32.68.44:37017/bilibili_spider',
   loaded: "loaded",
   dataStats: ""
   },
   mounted: function () {
      this.loaded = "loaded database";
   },
   methods: {
      getDbStats: function(db, callback) {
      db.command({'dbStats': 1},
      function(err, results) {
         console.log(results);
         callback();
         return results;
      }
      );
      }
   },
   computed: {
      dataStats: MongoClient.connect(url, function (err, client) {
         assert.equal(null, err);
   
         var db = client.db('bilibili_spider');
   
            stats = getDbStats(db, function() {
               client.close();
            }).objects;

            return stats
         })
   }
})